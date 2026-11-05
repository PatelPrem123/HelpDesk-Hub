# HelpDesk Hub — Attack Surface & Exposure Analysis

**System:** HelpDesk Hub (Enterprise ITSM Platform)  
**Evaluated Version:** 1.0.0  
**Scope:** Public endpoints, internal routes, authentication mechanisms, input handling, file ingestion, storage subsystems, network protocols, and third-party dependencies.

---

## 1. External & Public Endpoints (Zero Auth Required)

These endpoints are reachable by any external client without credentials. They represent the primary perimeter surface:

| Endpoint | Method | Expected Payload | Rate Limit | Vulnerability Exposure |
| :--- | :---: | :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | `name`, `email`, `password`, `department`, `phone` | 5 req / 15 min | Account enumeration, brute-force spam, role injection. |
| `/api/v1/auth/login` | `POST` | `email`, `password` | 5 req / 15 min | Credential stuffing, password spraying, timing attacks. |
| `/api/v1/auth/logout` | `POST` | None (Cookie check) | Default API Limit | CSRF token invalidation attack. |
| `/api/v1/health` | `GET` | None | None | Information disclosure (database connectivity status, uptime). |

---

## 2. Authenticated Multi-Tier Endpoints

### A. Employee (Requester) Surface
- `GET /api/v1/tickets/my`: Queries tickets created by authenticated requester. *Risk: IDOR / query filter tampering.*
- `POST /api/v1/tickets`: Ingests ticket title, description, category, subcategory, priority, and file attachments. *Risk: Stored XSS, file upload exploit, payload bombing.*
- `GET /api/v1/tickets/:id`: Retrieves ticket detail. *Risk: Broken Object Level Authorization (BOLA/IDOR) if ownership isn't verified against `ticket.requesterId`.*
- `POST /api/v1/tickets/:id/comments`: Appends public comment. *Risk: Stored XSS, privilege escalation via forged `isInternal` flag.*
- `PATCH /api/v1/tickets/:id/status`: Transition between `Resolved` -> `Closed` or `Reopened`. *Risk: Illegal FSM jumps if transition guard is defective.*

### B. Technician (Resolver) Surface
- `GET /api/v1/tickets`: Paginated ticket query across all departments. *Risk: NoSQL injection via sorting/filtering parameters.*
- `GET /api/v1/tickets/unassigned`: Queries unassigned queue.
- `PATCH /api/v1/tickets/:id/claim`: Assigns ticket to caller (`assignedTechnicianId = req.user._id`).
- `PATCH /api/v1/tickets/:id/status`: Transitions ticket (`In Progress`, `Pending User`, `Resolved`). *Risk: SLA clock manipulation via false `Pending User` state.*
- `PATCH /api/v1/tickets/:id/priority`: Adjusts priority and resets SLA targets.
- `POST /api/v1/tickets/:id/comments` (with `isInternal: true`): Appends confidential internal diagnostics.

### C. Administrator Supervisory Surface
- `PATCH /api/v1/tickets/:id/assign`: Reassigns tickets to any technician.
- `GET /api/v1/categories`, `POST`, `PUT`, `DELETE`: Full taxonomy maintenance.
- `GET /api/v1/sla-policies`, `PUT /api/v1/sla-policies/:id`: Configuration of SLA time-to-respond and time-to-resolve rules.
- `GET /api/v1/analytics/overview`, `workload`: High-volume KPI aggregation. *Risk: ReDoS or CPU exhaustion on large datasets without indexing.*
- `GET /api/v1/reports/export/csv`, `xlsx`: File generation and streaming. *Risk: Formula injection (CSV/Excel injection using `=cmd\|' /C calc'!A0`).*
- `GET /api/v1/audit-logs`: Audit trail retrieval. *Risk: Memory exhaustion without cursor pagination.*

---

## 3. Real-Time WebSocket Attack Surface (Socket.IO)

- **Handshake Protocol:** Handshake occurs over HTTP upgrade (`/socket.io/?EIO=4&transport=websocket`).
- **Connection Authentication:** Token parsed from HttpOnly cookie or auth handshake payload.
- **Room Subscriptions:**
  - `user_<userId>`: Private notifications. *Risk: Malicious client subscribing to another user's room to spy on ticket assignments.*
  - `ticket_<ticketId>`: Active ticket discussion.
  - `role_technicians` & `role_admin`: Privileged broadcast streams. *Risk: Privilege escalation if room-join handler does not verify `socket.user.role`.*
- **Event Ingestion:** All socket events emitted from client must be strictly validated; state transitions should occur over REST APIs with full auditing, reserving sockets strictly for unidirectional server push events.

---

## 4. User Input Vectors & Injection Points

1. **Ticket Title (`max: 150`) & Description (`max: 5000`):** Rich text or Markdown input. Vulnerable to Stored Cross-Site Scripting (XSS) if rendered unsanitized on admin or technician dashboards.
2. **Comment Content (`max: 2000`):** Communicated to multiple parties. Vulnerable to XSS.
3. **Search & Filter Query Strings (`status`, `priority`, `category`, `search`):** Passed into MongoDB queries. Vulnerable to regex denial of service (ReDoS) or NoSQL operator injection if passed directly to `find()`.
4. **CSV / Excel Exports:** User-supplied strings (names, titles, comments) exported to spreadsheet formats. Vulnerable to Formula Injection (`=`, `+`, `-`, `@`).

---

## 5. File Upload Attack Surface (Multer Subsystem)

- **Upload Handlers:** `POST /api/v1/tickets` and `POST /api/v1/tickets/:id/attachments`.
- **Intended Purpose:** Diagnostic attachments (screenshots, crash logs, configs).
- **Vulnerabilities Evaluated:**
  - **Executable Upload / Web Shell:** Attacker uploads `.php`, `.jsp`, `.exe`, or `.html` file containing malicious scripts.
  - **Path Traversal:** Upload filenames containing `../../` attempting to overwrite server files.
  - **MIME Sniffing Bypass:** Uploading an executable renamed to `.png`.
  - **Storage Exhaustion (Zip Bombs / Huge Files):** Overwhelming server disk space.
- **Required Controls:**
  - Strictly whitelist MIME types: `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`.
  - Enforce maximum file size: 5MB (Employees), 10MB (Technicians), 25MB (Admins).
  - Strip user-supplied filenames; generate cryptographically secure UUIDs (`uuidv4() + ext`).
  - Store uploads outside the web server document root, or serve with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

---

## 6. Database & Persistence Layer

- **Engine:** MongoDB 7.x with Mongoose ODM.
- **Port:** Default 27017 (must be bound to `127.0.0.1` or internal VPC network, never `0.0.0.0`).
- **Authentication:** Scoped username and password with SCRAM-SHA-256.
- **NoSQL Exposure:**
  - Queries using `req.body` directly in Mongoose functions without schema casting or Zod validation can allow operator injection (e.g. `{"email": {"$gt": ""}}`).
  - Mitigated by strict typing, schema validators, and `express-mongo-sanitize`.

---

## 7. Third-Party Dependencies & Supply Chain

- **Core Dependencies:**
  - `express`: Web server framework.
  - `socket.io`: Real-time WebSocket engine.
  - `mongoose`: MongoDB ODM.
  - `bcrypt` / `bcryptjs`: Password hashing.
  - `jsonwebtoken`: Token signing and verification.
  - `zod`: Schema validation.
  - `multer`: File upload parsing.
  - `helmet`: Security HTTP headers.
  - `cors`: Cross-Origin Resource Sharing.
  - `express-rate-limit`: Rate limiting middleware.
- **Scanning Strategy:**
  - Mandatory `npm audit --omit=dev` in CI/CD pipeline.
  - Lockfile integrity enforced via `package-lock.json`.
  - Automated vulnerability alerts using Dependabot or GitHub Actions security scans.
