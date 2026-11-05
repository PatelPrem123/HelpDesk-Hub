# HelpDesk Hub — System Impact Map (IMPACT-MAP.md)

**System:** HelpDesk Hub (Enterprise ITSM & SLA Orchestration Platform)  
**Evaluated Architecture:** Layered Distributed System (React 18 SPA + Express.js REST API v1 + Socket.IO + MongoDB 7.x)  
**Maintenance Rule:** This document maps verified dependencies and ripples across the codebase. Review this document BEFORE modifying any shared service, controller, model, or socket event.

---

## 1. Purpose

This Impact Map protects HelpDesk Hub against regressions, breaking API contract changes, unauthorized state skipping in the Finite State Machine (FSM), corrupted SLA calculations, data leakage between role boundaries, and unhandled socket disconnection errors.

Whenever an engineer or AI agent modifies a core file or function, this map provides an auditable, pre-verified breakdown of:
- Direct consumers that will break if method signatures change.
- Indirect consumers affected through events, state transitions, or database hooks.
- Security and authorization boundaries that could be invalidated.
- Test suites that must be re-executed before releasing changes.

---

## 2. Component Impact Maps

### Component 1: `server/src/services/ticketService.js` → `transitionStatus()`
- **Role:** Central FSM orchestrator governing valid ticket state transitions across 9 finite statuses (`New`, `Open`, `Assigned`, `In Progress`, `Pending User`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
- **Directly affected:**
  - `server/src/controllers/ticketController.js` (`updateStatus`)
  - `server/src/services/slaEngine.js` (`handleStatusChange`)
  - `server/src/services/auditService.js` (`logStateChange`)
  - `server/src/sockets/ticketSocket.js` (`emitStatusChanged`)
- **Potentially affected:**
  - Technician Kanban board column placement (`client/src/components/tickets/KanbanBoard.jsx`).
  - Active ticket status badges (`client/src/components/common/Badge.jsx`).
  - SLA countdown timer widget (`client/src/components/tickets/SLATimer.jsx`).
- **API impact:** `PATCH /api/v1/tickets/:id/status`. Request body expects `{ "status": "<NextStatus>" }`. Returns updated ticket document with populated requester and assignee.
- **Data impact:** Updates `Ticket.status`, `Ticket.isSlaPaused`, `Ticket.lastPausedAt`, `Ticket.totalPausedDurationMs`, and inserts an immutable record into `AuditLog`.
- **Security impact:** Enforces RBAC permissions. Non-technicians cannot perform intermediate transitions; employees may only transition `Resolved` -> `Closed` or `Reopened`.
- **Runtime impact:** Triggers Socket.IO broadcast `ticket:status_changed` to room `ticket_<ticketId>`. If entering/exiting `Pending User`, dynamically adjusts SLA timer.
- **Frontend impact:** Updates Ticket Detail view, Kanban column, and Employee resolution prompt.
- **Tests to review:** `server/tests/fsm.test.js`, `server/tests/tickets.test.js`.
- **Infrastructure impact:** None.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 4 (FSM State Machine Matrix) and Chapter 10 (Modular Inventory).

---

### Component 2: `server/src/services/slaEngine.js` → `calculateDeadlines()` & `evaluateBreach()`
- **Role:** Mathematical calculation engine for First Response and Resolution deadlines, factoring in 9-to-6 business hours, weekends, holidays, and paused clock durations during `Pending User`.
- **Directly affected:**
  - `server/src/controllers/ticketController.js` (`createTicket`, `updatePriority`)
  - `server/src/services/ticketService.js` (`transitionStatus`)
  - Background SLA Poller Daemon (`server/src/index.js` / `slaPoller.js`)
- **Potentially affected:**
  - Administrative compliance reports (`server/src/controllers/analyticsController.js`).
  - Technician queue priority ordering (`client/src/pages/TechQueue.jsx`).
- **API impact:** Direct output in `Ticket.firstResponseDeadline`, `Ticket.resolutionDeadline`, and `GET /api/v1/analytics/overview` (MTTR and Breach Percentage).
- **Data impact:** Updates `Ticket.isBreached`, `Ticket.firstResponseAt`, `Ticket.resolvedAt`.
- **Security impact:** Ensures accurate compliance metrics; prevents malicious SLA clock tampering.
- **Runtime impact:** 60-second periodic poller daemon performs batch breach evaluations and fires `sla:warning` (at 75%-90% threshold) and `sla:breached` WebSocket events.
- **Frontend impact:** Changes progress bar color (Green -> Yellow -> Red) in `SLATimer.jsx` and triggers sound/badge alerts in `NotificationBell.jsx`.
- **Tests to review:** `server/tests/sla.test.js`, `server/tests/businessHours.test.js`.
- **Infrastructure impact:** Background timer resource utilization in Node.js event loop.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 5 (Mathematical SLA Engine & Business Hours Algorithm).

---

### Component 3: `server/src/services/sequenceService.js` → `getNextTicketNumber()`
- **Role:** Concurrency-safe atomic generation of structured ticket IDs (`HD-YYYY-XXXX`).
- **Directly affected:**
  - `server/src/controllers/ticketController.js` (`createTicket`)
  - `server/src/models/Counter.js`
- **Potentially affected:**
  - Ticket search by ID across all client views.
  - Audit logging of ticket creation.
- **API impact:** Populates `ticketNumber` in `POST /api/v1/tickets` response.
- **Data impact:** Atomically increments `Counter.seq` where `name = 'ticket_HD_<year>'`.
- **Security impact:** Predictable sequence enumeration mitigated by requiring authentication and BOLA ownership checks on all ticket detail endpoints.
- **Runtime impact:** Atomic operation on MongoDB counter collection.
- **Frontend impact:** Displayed as primary title tag on ticket cards, breadcrumbs, and tables.
- **Tests to review:** `server/tests/sequenceConcurrency.test.js`.
- **Infrastructure impact:** Requires unique compound index on `Ticket.ticketNumber`.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 6 (Concurrency-Safe Atomic Ticket Numbering) and Chapter 7 (Counter Model).

---

### Component 4: `server/src/middleware/authMiddleware.js` & `rbacMiddleware.js`
- **Role:** Perimeter authentication guard verifying JWT from HttpOnly cookie and authorizing access based on persona (`Employee`, `Technician`, `Administrator`).
- **Directly affected:**
  - All protected Express routes in `/api/v1/*`.
  - `req.user` context injection across all controllers.
- **Potentially affected:**
  - Socket.IO connection authorization handshake (`server/src/sockets/index.js`).
- **API impact:** Unauthorized requests return `401 Unauthorized`; forbidden role requests return `403 Forbidden`.
- **Data impact:** Injects authenticated `req.user._id` into data mutation payloads.
- **Security impact:** The foundational security boundary of the entire platform. Any failure here compromises all tenant isolation and role restrictions.
- **Runtime impact:** Executed on every incoming HTTP request.
- **Frontend impact:** Client redirects to `/login` on 401; displays "Access Denied" toast on 403.
- **Tests to review:** `server/tests/auth.test.js`, `server/tests/rbac.test.js`.
- **Infrastructure impact:** JWT signing secret validation.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 3 (RBAC Matrix) and Chapter 11 (Security Hardening).

---

### Component 5: `server/src/sockets/ticketSocket.js` → Event Dispatcher
- **Role:** Manages real-time bi-directional WebSocket communication, room memberships (`user_<id>`, `ticket_<id>`, `role_technicians`, `role_admin`), and push notifications.
- **Directly affected:**
  - `server/src/controllers/ticketController.js`
  - `server/src/controllers/commentController.js`
  - `server/src/services/slaEngine.js`
- **Potentially affected:**
  - Client real-time state in `SocketContext.jsx` and `useSocket.js`.
- **API impact:** Complements REST endpoints by pushing live delta events without client polling.
- **Data impact:** None directly on disk; broadcasts in-memory payloads.
- **Security impact:** Must strictly strip `isInternal: true` comments from non-technician socket rooms.
- **Runtime impact:** Socket.IO memory connection management.
- **Frontend impact:** Instantly adds new comments to `CommentThread.jsx`, moves cards in `KanbanBoard.jsx`, updates notification badges.
- **Tests to review:** `server/tests/sockets.test.js`.
- **Infrastructure impact:** Requires sticky sessions or Redis adapter if scaled across multiple container instances.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 8 (Real-Time Event-Driven Architecture).

---

### Component 6: `server/src/controllers/commentController.js` → `createComment()` & `getComments()`
- **Role:** Handles threaded public comments and confidential internal technician notes.
- **Directly affected:**
  - `server/src/models/Comment.js`
  - `server/src/sockets/ticketSocket.js`
  - `server/src/services/auditService.js`
- **Potentially affected:**
  - Requester communication history.
  - Technician diagnostic collaboration.
- **API impact:** `GET /api/v1/tickets/:id/comments` (filters out `isInternal: true` for employees). `POST /api/v1/tickets/:id/comments`.
- **Data impact:** Inserts new documents into `comments` collection.
- **Security impact:** Critical privacy boundary: employees must NEVER receive internal notes.
- **Runtime impact:** Emits `comment:new` socket event.
- **Frontend impact:** Renders public messages in blue/gray and internal notes with distinct yellow/lock styling in `CommentThread.jsx`.
- **Tests to review:** `server/tests/commentPrivacy.test.js`.
- **Infrastructure impact:** None.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 3, 7, and 11.

---

## 3. Critical Change Paths

These are high-risk shared components where even minor modifications propagate widely across the system:

1. **`server/src/models/Ticket.js` Schema Change:**
   - *Affected Areas:* Ticket Controller, SLA Engine, Sequence Service, FSM Service, Frontend Kanban, Dashboard, Analytics, and all test suites.
   - *Reason:* Central data contract for the entire application.
   - *Risk:* **CRITICAL**. A field rename or enum alteration breaks frontend rendering, database indexing, and historical reporting.

2. **`server/src/services/ticketService.js` (FSM Transitions):**
   - *Affected Areas:* Ticket Controller, Technician Kanban Board, SLA Timer Pause/Resume, Audit Logger, Socket Broadcasts.
   - *Reason:* All business workflow rules flow through this state machine.
   - *Risk:* **CRITICAL**. Illegal state transitions allow skipped triage or locked unresolvable tickets.

3. **`server/src/services/slaEngine.js` (Business Hours Math):**
   - *Affected Areas:* Ticket Creation, Priority Adjustment, SLA Background Poller Daemon, SLA Analytics, Admin Reports.
   - *Reason:* Calculates deadlines across calendar logic and paused duration states.
   - *Risk:* **HIGH**. Logic errors produce false SLA breaches, corrupting technician performance metrics and executive SLAs.

4. **`server/src/middleware/authMiddleware.js` (JWT & Cookie Parsing):**
   - *Affected Areas:* Every API route, WebSocket connection handshake, User Session Context.
   - *Reason:* System-wide authentication gatekeeper.
   - *Risk:* **CRITICAL**. A bug causes universal 401 lockout or widespread unauthorized access.

---

## 4. Change-Impact Checklist

Before merging or deploying any change to a mapped component, complete this mandatory verification checklist:

- [ ] **Direct consumers checked:** All functions importing or calling this module have been identified and tested.
- [ ] **Indirect consumers checked:** Event listeners, database hooks, and downstream side-effects verified.
- [ ] **API contracts checked:** Request body validation (Zod) and response JSON formats remain backwards-compatible.
- [ ] **Database/data dependencies checked:** Mongoose schema defaults, enum values, and compound indexes verified.
- [ ] **Authentication/authorization checked:** RBAC boundary matrix strictly verified (Employee vs Tech vs Admin).
- [ ] **Background jobs/events checked:** 60-second SLA poller daemon and WebSocket room broadcasts verified.
- [ ] **Frontend consumers checked:** React views, form inputs, badge components, and Kanban columns verified.
- [ ] **Tests checked:** Unit, integration (Supertest), and concurrency tests executed with 100% pass rate.
- [ ] **Configuration/infrastructure checked:** Environment variable requirements (`.env`) updated and documented.
- [ ] **Critical user/admin workflows checked:** End-to-end flow (Create Ticket -> Assign -> In Progress -> Resolve -> Close) verified manually or via E2E tests.

---

## 5. Unknown & Inferred Dependencies

The following relationships depend on deployment environment choices and require verification during infrastructure setup:

1. **Redis Adapter for Socket.IO:** If deployed to multi-instance container environments (e.g. Kubernetes / AWS ECS), a Redis pub/sub adapter (`@socket.io/redis-adapter`) must be added to sync room broadcasts between servers. *Status: Unknown/Deployment-Dependent.*
2. **Email / SMS Notification Queue:** If email notifications are moved from synchronous handlers to an asynchronous queue (e.g. BullMQ / Redis), the SLA engine must interface with a background worker queue. *Status: Potential / Phase 2 Roadmap.*
3. **S3 / Object Storage vs Local Disk:** File attachments currently map to local server directory with Multer. Production deployment to serverless or ephemeral containers requires switching to AWS S3 or Cloudflare R2 client. *Status: Inferred / Future Infrastructure.*
