# HelpDesk Hub — Enterprise Threat Model (STRIDE)

**Project:** HelpDesk Hub (Enterprise ITSM & SLA Management System)  
**Version:** 1.0.0  
**Evaluated Architecture:** 3-Tier Layered Architecture (React 18 + Vite SPA, Express.js REST API v1, Socket.IO WebSockets, MongoDB 7.x Mongoose Cluster)  
**Standard Framework:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  

---

## 1. Primary Assets

The assets requiring protection within HelpDesk Hub are categorized by confidentiality, integrity, and availability:

1. **User Authentication & Identity Assets:**
   - Password hashes (Bcrypt salts with work factor >= 12).
   - JWT Signing Secret (`JWT_SECRET`) and generated session tokens.
   - User identity profiles (Email, full name, phone, department, assigned role).
2. **Support Ticket & Operational Data:**
   - Ticket records, descriptions, internal diagnostic notes, status transitions.
   - Atomic ticket sequencing numbers (`HD-YYYY-XXXX`).
   - Customer diagnostic attachments (screenshots, system log dumps, configuration dumps).
3. **Internal Intellectual Property & Diagnostics:**
   - Confidential technician notes (`Comment.isInternal = true`) containing internal server IPs, root-cause analyses, infrastructure credentials, or internal topology.
4. **SLA Governance & Audit Records:**
   - SLA policies, thresholds, business hours schedule configs.
   - Historical calculation metrics (first response, resolution elapsed, paused clock states).
   - Immutable audit logs (`AuditLog` collection: user actions, state changes, actor IPs, timestamps).
5. **System Availability & Real-Time Infrastructure:**
   - Socket.IO connection pool and channel brokers.
   - SLA Background Poller Daemon (60-second periodic breach evaluator).
   - MongoDB database connection pool and atomic counter locks.

---

## 2. Trust Boundaries

Trust boundaries delineate zones where data transitions across differing security control levels:

```
[Untrusted: Public Internet / Web Browser]
      │
──────┼───────────────────────── Boundary 1: Perimeter & Gateway (TLS, Helmet, Rate Limiter)
      ▼
[Demilitarized Gateway: Reverse Proxy / Express API Gateway]
      │
──────┼───────────────────────── Boundary 2: Authentication & RBAC Boundary (JWT Guard, Role Check)
      ▼
[Trusted Core: Express Controllers, Domain Services, Socket.IO Rooms]
      │
──────┼───────────────────────── Boundary 3: Privacy & Scrubbing Layer (isInternal Stripper)
      │
──────┼───────────────────────── Boundary 4: Data Persistence & Storage (Mongoose ODM, File System)
      ▼
[Secure Persistence: MongoDB Replica Set, Encrypted Upload Storage]
```

- **Boundary 1 (Client to API Gateway):** Untrusted public web clients communicate over HTTPS and WSS. Zero trust is assumed for client inputs, headers, or query parameters.
- **Boundary 2 (API Gateway to Application Services):** Requests transition from unauthenticated state to verified identity context via HttpOnly JWT cookie verification.
- **Boundary 3 (Technician Domain to Employee Presentation):** A critical internal boundary where private internal notes and technician-only websocket broadcasts are scrubbed before reaching employee clients.
- **Boundary 4 (Application to Database & File Storage):** Express service layer connects to MongoDB through authenticated, scoped connection strings and local storage drivers.

---

## 3. Threat Actors & Personas

| Actor Persona | Skill Level | Access Level | Motivation / Attack Profile |
| :--- | :---: | :---: | :--- |
| **Anonymous External Attacker** | High | None (Unauthenticated) | Credential stuffing, brute-force login, DDoS, exploiting public API endpoints, exploiting file upload vectors. |
| **Malicious Employee (Requester)** | Low - Medium | Authenticated (`Employee`) | Tampering with other users' tickets (BOLA / IDOR), viewing internal tech notes, manipulating SLA clocks, escalating roles to Admin. |
| **Rogue / Compromised Technician** | Medium - High | Authenticated (`Technician`) | Unauthorized ticket status transitions, exfiltrating internal diagnostics, modifying audit logs, denial-of-service via mass reassignment. |
| **System Administrator (Insider)** | High | Authenticated (`Administrator`) | Misconfiguration, credential leakage, abuse of administrative overrides, tampering with categories or SLAs. |

---

## 4. Entry Points & Interfaces

1. `POST /api/v1/auth/login` & `register`: Public credential exchange.
2. `GET /api/v1/tickets` & `GET /api/v1/tickets/:id`: Ticket retrieval interfaces.
3. `POST /api/v1/tickets`: User ticket creation and file upload payload intake.
4. `PATCH /api/v1/tickets/:id/status`, `assign`, `priority`: State transition and operational modification endpoints.
5. `POST /api/v1/tickets/:id/comments`: Multi-role text and attachment communication channel.
6. `POST /api/v1/tickets/:id/attachments`: Multer-handled binary upload pipeline.
7. `GET /api/v1/reports/export/csv` & `xlsx`: Data streaming report generators.
8. `Socket.IO WSS Connection Endpoint (/socket.io)`: Handshake, authentication, room join/leave protocols.

---

## 5. STRIDE Threat Analysis

### T1: Spoofing (Identity Deception)
- **Threat Scenario 1.1:** Attacker creates forged JWT tokens to impersonate administrators.
  - *Severity:* Critical
  - *Likelihood:* Low (if `JWT_SECRET` is high-entropy and guarded); High (if default secret is used).
  - *Existing Mitigation:* JWT signed with secret, verified in `authMiddleware.js`.
  - *Missing Mitigation:* Asymmetric RSA256 / EdDSA key pair verification with key rotation support; explicit token revocation blocklist / Redis token blacklist on logout.
- **Threat Scenario 1.2:** Attacker falsifies WebSocket handshake identity to join administrative broadcast rooms (`role_admin`).
  - *Severity:* High
  - *Likelihood:* Medium
  - *Existing Mitigation:* Socket.IO auth middleware inspecting handshake cookies.
  - *Missing Mitigation:* Dynamic re-verification of session validity on room join events; strict room-subscription authorization checks.

### T2: Tampering (Unauthorized Modification)
- **Threat Scenario 2.1:** NoSQL Operator Injection via request body (`{"status": {"$ne": "Closed"}}`).
  - *Severity:* High
  - *Likelihood:* Low
  - *Existing Mitigation:* Mongoose schema strict type casting and Zod validation schemas.
  - *Missing Mitigation:* Explicit `express-mongo-sanitize` middleware to strip `$` and `.` operators from incoming `req.body`, `req.query`, and `req.params`.
- **Threat Scenario 2.2:** Unauthorized FSM status skipping (e.g., transitioning `New` directly to `Closed` bypassing triage).
  - *Severity:* High
  - *Likelihood:* Medium
  - *Existing Mitigation:* Hardcoded FSM transition dictionary in `ticketService.js`.
  - *Missing Mitigation:* Pre-save Mongoose hook preventing illegal status transitions at the schema layer as defense-in-depth.
- **Threat Scenario 2.3:** Counter sequencing race conditions causing duplicate ticket numbers.
  - *Severity:* High
  - *Likelihood:* Medium under high concurrency
  - *Existing Mitigation:* MongoDB `findOneAndUpdate({ $inc: { seq: 1 } })` atomic operation in `Counter` collection.
  - *Missing Mitigation:* Compound unique index validation in database with automated retry transaction on duplicate key error (`E11000`).

### T3: Repudiation (Denial of Actions)
- **Threat Scenario 3.1:** Technician denies closing or reassigning a high-profile ticket.
  - *Severity:* Medium
  - *Likelihood:* Low
  - *Existing Mitigation:* `AuditLog` collection records `action`, `performedBy`, `previousState`, `newState`, `ipAddress`, `timestamp`.
  - *Missing Mitigation:* Cryptographic hashing / tamper-evident chaining (HMAC) of audit entries to ensure database administrators cannot alter logs directly.

### T4: Information Disclosure (Data Leakage)
- **Threat Scenario 4.1:** Leakage of private internal notes (`isInternal: true`) to employees via REST API.
  - *Severity:* Critical
  - *Likelihood:* High if projection is missed in any query
  - *Existing Mitigation:* Query filtering `{ isInternal: false }` for non-technicians in `commentController.js`.
  - *Missing Mitigation:* Mongoose query middleware / `toJSON` transform that strips `isInternal` notes globally when user context is not `Technician` or `Administrator`.
- **Threat Scenario 4.2:** Leakage of internal notes via real-time WebSocket broadcast (`comment:new`).
  - *Severity:* Critical
  - *Likelihood:* High
  - *Existing Mitigation:* Room separation and payload stripping before socket dispatch.
  - *Missing Mitigation:* Segregated socket rooms for internal notes (`ticket_<id>_internal`) joined only by verified technicians and admins.
- **Threat Scenario 4.3:** Sensitive error stack traces leaked in API responses.
  - *Severity:* Medium
  - *Likelihood:* Medium in development/staging
  - *Existing Mitigation:* `errorHandler.js` checks `NODE_ENV === 'production'`.
  - *Missing Mitigation:* Standardized RFC 7807 problem detail error format with zero internal stack disclosure.

### T5: Denial of Service (DoS)
- **Threat Scenario 5.1:** Flooding ticket creation or login endpoints causing database resource exhaustion.
  - *Severity:* High
  - *Likelihood:* High
  - *Existing Mitigation:* `express-rate-limit` (5 requests / 15 min for auth, standard API limiter).
  - *Missing Mitigation:* Tiered distributed rate limiting with Redis store; payload size limits (`express.json({ limit: '10kb' })`).
- **Threat Scenario 5.2:** Recursive or non-indexed SLA queries in the 60-second breach poller daemon.
  - *Severity:* High
  - *Likelihood:* Medium
  - *Existing Mitigation:* Compound indexes on `{ isBreached: 1, status: 1, resolutionDeadline: 1 }`.
  - *Missing Mitigation:* Cursor pagination, batch processing (`limit(100)`), and concurrency locking so multiple server instances do not duplicate poller work.

### T6: Elevation of Privilege (Privilege Abuse)
- **Threat Scenario 6.1:** Horizontal Privilege Escalation (BOLA/IDOR): Employee views or closes another employee's ticket.
  - *Severity:* Critical
  - *Likelihood:* High
  - *Existing Mitigation:* `rbacMiddleware.js` and ticket ownership checks in controller (`ticket.requesterId.equals(req.user._id)`).
  - *Missing Mitigation:* Centralized Policy Decision Point (PDP) / ABAC middleware ensuring ownership checks are consistently enforced across all ticket sub-resources (attachments, comments, export).
- **Threat Scenario 6.2:** Vertical Privilege Escalation: Employee modifies their own role to `Administrator` via registration or profile update.
  - *Severity:* Critical
  - *Likelihood:* High if role parameter is accepted from body
  - *Existing Mitigation:* Role field ignored during registration; default to `Employee`.
  - *Missing Mitigation:* Strict Zod schema white-listing that strips `role` from all user-controllable input payloads.

---

## 6. Threat Risk Assessment Matrix

| Threat ID | Threat Name | STRIDE | Likelihood | Impact | Severity Score | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **TH-01** | BOLA / IDOR on Ticket Submissions & Details | E | High | Critical | **CRITICAL** | Mitigated by Controller Logic |
| **TH-02** | Leakage of Internal Diagnostic Notes via Sockets | I | Medium | Critical | **CRITICAL** | Requires Room Scoping Verification |
| **TH-03** | Malicious File Upload (Web Shell Execution) | T / E | Medium | Critical | **CRITICAL** | Mitigated by Multer Whitelist & UUIDs |
| **TH-04** | Authentication Brute-Force & Credential Stuffing | S | High | High | **HIGH** | Mitigated by Rate Limiter |
| **TH-05** | NoSQL Operator Injection | T | Low | High | **HIGH** | Mitigated by Zod & Mongoose Casting |
| **TH-06** | SLA Poller Daemon Denial of Service | D | Medium | Medium | **MEDIUM** | Mitigated by MongoDB Indexes |
| **TH-07** | Stored XSS via Comment / Description Payloads | T | Medium | High | **HIGH** | Mitigated by DOMPurify / Sanitizer |
| **TH-08** | Insecure Direct Object Reference on Attachments | I / E | Medium | High | **HIGH** | Requires Download Ownership Check |

---

## 7. Actionable Security Mitigations Roadmap

1. **Phase 1 (Immediate / Baseline):**
   - Enforce `express-mongo-sanitize` across Express middleware stack.
   - Enforce strict Zod body validation stripping any unexpected keys.
   - Lock down attachment download routes with ticket ownership/role verification.
2. **Phase 2 (Hardening):**
   - Partition WebSocket rooms: public ticket room vs technician internal room.
   - Enforce distributed Redis rate-limiting on sensitive endpoints.
3. **Phase 3 (Enterprise Compliance):**
   - Add HMAC signature verification to the `AuditLog` collection.
   - Implement automated session revocation on password change.
