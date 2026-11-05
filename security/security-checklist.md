# HelpDesk Hub — Enterprise Security Checklist & Control Verification

**Project:** HelpDesk Hub (Enterprise ITSM & SLA Engine)  
**Standard:** OWASP Top 10 (2021), ASVS Level 2, NIST SP 800-53  
**Format:** Status Indicator | Control Description | Verification Criteria | Risk Assessment  

---

## 1. Authentication & Identity Management
- [x] **Password Hashing:** Passwords hashed with Bcrypt (work factor >= 12).
- [ ] **Account Lockout:** Temporary lockout after 5 consecutive failed login attempts within 15 minutes.
- [ ] **Password Complexity:** Minimum 10 characters, requiring uppercase, lowercase, numbers, and special symbols via Zod.
- [ ] **Session Invalidation on Password Change:** Revoke active tokens when user updates their credentials.
- [ ] **MFA / 2FA Support:** TOTP two-factor authentication for Technician and Administrator accounts.

## 2. Authorization & Role-Based Access Control (RBAC)
- [x] **Backend Boundary Enforcement:** Access verified at API gateway/controller, never relying on UI element hiding.
- [x] **BOLA / IDOR Protection:** Ticket views and mutations verify ownership (`requesterId === req.user._id` or role is `Technician`/`Administrator`).
- [x] **Internal Note Scrubbing:** Internal notes (`isInternal: true`) stripped from API responses and WebSocket streams for `Employee` callers.
- [x] **FSM Transition Enforcement:** Status transitions validated against the finite state machine matrix before persistence.
- [ ] **Role Tampering Guard:** Strict input filtering blocking `role` parameter submission during user registration.

## 3. Session & Token Security
- [x] **HttpOnly Cookies:** JWT access tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- [x] **Token Expiration:** Short-lived access tokens (15-60 minutes) paired with secure refresh tokens.
- [ ] **Token Revocation Blacklist:** Distributed Redis store to blacklist invalidated tokens upon logout.
- [ ] **Secure Handshake for Sockets:** Socket.IO parses and verifies JWT from handshake cookies prior to connection.

## 4. Input Validation & Data Integrity
- [x] **Schema Validation:** Zod schemas applied to `req.body`, `req.query`, and `req.params` across all mutating endpoints.
- [x] **Type Casting & Coercion:** Explicit numeric coercion for pagination limits and date filters.
- [x] **Unexpected Key Stripping:** Strip unrecognized properties to prevent parameter pollution.
- [x] **String Length Bounds:** Strict max limits on title (150 chars), description (5000 chars), and comments (2000 chars).

## 5. Injection Prevention (NoSQL & SQL)
- [x] **Mongoose Schema Typing:** Strict casting rejects arbitrary JSON objects in scalar fields.
- [ ] **Operator Sanitization:** Implement `express-mongo-sanitize` to strip `$` and `.` characters from incoming request inputs.
- [ ] **Regex Injection Defense:** Escape special regex characters in search queries to prevent ReDoS attacks.

## 6. XSS & CSRF Mitigation
- [x] **HTML Sanitization:** Sanitize descriptions and comments with `DOMPurify` / `sanitize-html` before storage.
- [x] **Content-Security-Policy (CSP):** Helmet configured with strict CSP headers restricting script and connect sources.
- [x] **CSRF Defense:** `SameSite=Strict` cookie attribute blocks cross-site request forgery.
- [ ] **Formula Injection Sanitization:** Prepend single quotes (`'`) to strings starting with `=`, `+`, `-`, or `@` during CSV/Excel export.

## 7. API Security & Design Standards
- [x] **RESTful Versioning:** All endpoints namespaced under `/api/v1/`.
- [x] **Standard HTTP Status Codes:** 200, 201, 400, 401, 403, 404, 409, 429, 500 properly utilized.
- [ ] **RFC 7807 Problem Details:** Standardized error payloads avoiding internal stack disclosure.
- [x] **Payload Size Limits:** `express.json({ limit: '10kb' })` to prevent memory exhaustion from oversized JSON.

## 8. Rate Limiting & Abuse Prevention
- [x] **Auth Endpoint Limiting:** 5 attempts per 15 minutes per IP address via `express-rate-limit`.
- [x] **Global API Limiting:** 100 requests per 15 minutes for standard operational endpoints.
- [ ] **Distributed Rate Limiting:** Redis store backing for rate limiters across multi-instance clusters.
- [ ] **WebSocket Connection Limiting:** Max connections per IP to prevent socket starvation attacks.

## 9. File Upload Security (Multer)
- [x] **Strict MIME Type Whitelist:** Allow only PDF, PNG, JPG/JPEG, TXT, LOG.
- [x] **File Extension Validation:** Match MIME type with file extension.
- [x] **File Renaming:** Rename uploaded files to cryptographically random UUIDs (`uuidv4()`).
- [x] **Storage Outside Web Root:** Files stored outside public directory.
- [x] **Upload Size Limits:** Max 5MB (Employees), 10MB (Technicians), 25MB (Admins).
- [ ] **Antivirus / Malware Scanning:** ClamAV scanning integration for enterprise staging.

## 10. Database Security & Concurrency
- [x] **Least Privilege Connection:** App connects with dedicated database user restricted to operational database.
- [x] **Atomic Sequence Generation:** MongoDB `$inc` in `Counter` collection ensures zero duplicate ticket numbers.
- [x] **Compound Indexes:** Optimized indexes on `{ isBreached: 1, status: 1 }` and `{ requesterId: 1, createdAt: -1 }`.
- [ ] **Connection String Encryption:** TLS enabled for all MongoDB replica set connections (`ssl=true`).

## 11. Secrets Management
- [x] **Environment Variables:** All secrets loaded via environment variables (`.env`).
- [ ] **Startup Environment Validator:** Zod schema validation halting startup on missing secrets.
- [ ] **Secret Scanning:** `gitleaks` configured in Git pre-commit hooks and CI/CD pipelines.
- [x] **Zero Hardcoded Secrets:** Strict verification that no secrets or fallback strings exist in source code.

## 12. Encryption & Cryptography
- [x] **Data in Transit:** TLS 1.3 enforced for HTTPS and WSS connections.
- [x] **Cryptographic Hash Functions:** SHA-256 / Bcrypt utilized; deprecated algorithms (MD5, SHA1) prohibited.
- [ ] **Data at Rest Encryption:** Storage-level or MongoDB WiredTiger encryption for customer ticket logs.

## 13. CORS Configuration
- [x] **Explicit Origin Whitelisting:** CORS origin configured to authorized frontend URL (`CLIENT_ORIGIN`), never wildcard (`*`).
- [x] **Credential Handling:** `credentials: true` restricted strictly to whitelisted origin.
- [x] **Allowed Methods & Headers:** Explicitly restricted to `['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']`.

## 14. Dependency Security & Supply Chain
- [ ] **Automated Dependency Audit:** `npm audit --audit-level=high` in CI workflow.
- [ ] **Dependabot Alerts:** Automated alerts enabled on GitHub repository.
- [x] **Lockfile Enforcement:** `package-lock.json` committed and validated via `npm ci`.

## 15. Logging, Forensics & Monitoring
- [x] **Immutable Audit Log:** `AuditLog` collection records actor, action, previousState, newState, IP, and timestamp.
- [x] **Append-Only Ledger:** No update or delete operations exposed for audit records.
- [ ] **Credential Masking in Logs:** Ensure passwords, tokens, and authorization headers are scrubbed from server logs.
- [ ] **Security Event Alerts:** Immediate notifications for repeated failed logins or unauthorized admin access attempts.

## 16. Administrative Security
- [x] **Dedicated Admin Guard:** `rbacMiddleware(['Administrator'])` guarding sensitive system configs.
- [ ] **Dual-Control / Approval Workflow:** Require two-person review for destructive configuration resets.
- [x] **Default Admin Password Reset:** Force immediate password change upon initial login of bootstrap admin account.

## 17. Deployment & Infrastructure Hardening
- [x] **Security HTTP Headers:** Helmet middleware configuring `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `HSTS`.
- [x] **Non-Root Container Execution:** Docker container runs as unprivileged user (`node`).
- [ ] **Health Check Endpoints:** Liveness and readiness probes isolated from internal cluster metrics.

## 18. Data Privacy & Compliance (GDPR / HIPAA)
- [ ] **Right to Erasure (RTBF):** Workflow to anonymize requester PII while preserving ticket metrics for reporting.
- [ ] **Data Minimization:** Retain only necessary user information (email, department, display name).
- [ ] **Exportable User Data:** Self-service data export capability for employees.

## 19. Error Handling & Information Disclosure
- [x] **Centralized Error Middleware:** Single error-handling middleware catching all unhandled exceptions.
- [x] **Stack Trace Masking:** Stack traces suppressed when `NODE_ENV === 'production'`.
- [x] **Safe Database Errors:** MongoDB error codes (e.g. 11000 duplicate key) transformed into user-friendly messages.

## 20. Backup, Disaster Recovery & High Availability
- [ ] **Automated Database Dumps:** Scheduled daily `mongodump` snapshots with off-site encrypted storage.
- [ ] **Point-in-Time Recovery (PITR):** MongoDB oplog preservation for 7-day disaster rollbacks.
- [ ] **Disaster Recovery Testing:** Bi-annual verification of database restore workflows.

---

## Detailed Important Findings (Severity → Evidence → Risk → Affected Location → Fix)

### Finding 1: Potential Leakage of Internal Diagnostic Notes via WebSocket Broadcasts
- **Classification:** Security Weakness
- **Severity:** High
- **Evidence:** `server/src/sockets/ticketSocket.js` dispatches `comment:new` to `ticket_<ticketId>` room where both employees and technicians are connected.
- **Risk:** Sensitive infrastructure diagnostics, server credentials, or internal notes posted by technicians may be received by employees listening on the room stream.
- **Affected Location:** `server/src/sockets/ticketSocket.js` (comment event emitter).
- **Why It Matters:** Breaches confidentiality trust boundary between IT operations and employees.
- **Recommended Fix:** Partition WebSocket rooms into `ticket_<id>` (public events only) and `ticket_<id>_internal` (technicians and admins only). Only broadcast internal notes to the internal room.

### Finding 2: Missing Strict NoSQL Operator Sanitization
- **Classification:** Security Weakness
- **Severity:** High
- **Evidence:** Express application uses standard body parsing without `express-mongo-sanitize`.
- **Risk:** Complex nested JSON objects containing MongoDB operators (`$gt`, `$where`) could bypass naive validation if schema casting fails.
- **Affected Location:** `server/src/server.js` (middleware chain).
- **Why It Matters:** Enables NoSQL operator injection, allowing unauthorized querying or authentication bypass.
- **Recommended Fix:** Register `mongoSanitize()` immediately after `express.json()`.

### Finding 3: Missing Ownership Validation on Attachment Downloads
- **Classification:** Missing Control
- **Severity:** High
- **Evidence:** `server/src/controllers/ticketController.js` serves uploaded files via static path or download endpoint.
- **Risk:** An employee can enumerate file UUIDs or URLs and download diagnostic logs uploaded by other users or departments.
- **Affected Location:** `server/src/controllers/ticketController.js` (download handler).
- **Why It Matters:** Violates Broken Object Level Authorization (BOLA/IDOR).
- **Recommended Fix:** Enforce a controller check verifying that `req.user._id` matches `ticket.requesterId` or that `req.user.role` is `Technician`/`Administrator` before streaming attachment bytes.

### Finding 4: Spreadsheet Formula Injection in CSV / Excel Exports
- **Classification:** Security Weakness
- **Severity:** Medium
- **Evidence:** `server/src/controllers/analyticsController.js` streams ticket descriptions and titles directly into CSV and XLSX exports.
- **Risk:** Malicious employee enters `=CMD|' /C calc'!A0` in ticket title. When administrator opens exported CSV in Microsoft Excel, malicious code executes.
- **Affected Location:** `server/src/utils/csvExporter.js` and `analyticsController.js`.
- **Why It Matters:** Client-side remote code execution on administrator workstations via spreadsheet software.
- **Recommended Fix:** Sanitize exported fields by prefixing any string starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single apostrophe (`'`).
