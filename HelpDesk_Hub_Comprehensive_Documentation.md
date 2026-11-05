# 🎫 HELPDESK HUB (ENTERPRISE ITSM)
### Full Stack IT Help Desk, Ticket Lifecycle Orchestration & SLA Management System
**Complete Technical Architecture, Data Models, Real-Time Specifications & Security Manual**  
*Version: 1.0.0 (Enterprise Hardened) | Tech Stack: React 18, Vite, Node.js, Express, MongoDB, Socket.IO, Tailwind CSS*

---

> ### 📌 CORE MISSION & EXECUTIVE STATEMENT
> **HelpDesk Hub** is an enterprise-grade, full-lifecycle IT Help Desk & Service Management platform engineered to replace fragmented support email chains and unmanaged technical requests with an automated, audited, and mathematically accurate SLA ticketing engine. It bridges end-user technical difficulties with Level 1/2/3 technicians and executive oversight through real-time push events, granular role-based authorization (RBAC), strict finite state machine (FSM) transitions, and concurrency-safe data persistence.

---

## 📋 System Metadata & Specifications

| Attribute | System Specification |
| :--- | :--- |
| **Project Name** | HelpDesk Hub (Enterprise Release v1.0.0) |
| **System Architecture** | Distributed 3-Tier Layered Architecture (RESTful API v1 + WebSocket Event Stream) |
| **Frontend Tech Stack** | React 18, Vite, React Router v6, Tailwind CSS, Recharts, Lucide Icons |
| **Backend Tech Stack** | Node.js (LTS), Express.js, Socket.IO, JWT, Bcrypt, Multer, Zod Validation |
| **Database Layer** | MongoDB 7.x with Mongoose ODM (Atomic Counter Collections, Compound Indexes) |
| **Target Capabilities** | Multi-Tier RBAC, Dynamic SLA Engine with Business Hours, Concurrency-Safe Sequences, Audit Trails, Scoped WebSockets |
| **Primary Environments** | Enterprise IT Operations, Managed Service Providers (MSP), Campus Help Desks, Corporate Service Desks |

---

## 📑 Table of Contents

- [Chapter 1: Executive Overview & Business Problem Statement](#chapter-1-executive-overview--business-problem-statement)
- [Chapter 2: High-Level System Topology & Architecture](#chapter-2-high-level-system-topology--architecture)
- [Chapter 3: Role-Based Access Control (RBAC) & Boundary Matrix](#chapter-3-role-based-access-control-rbac--boundary-matrix)
- [Chapter 4: Ticket Status Lifecycle & Controlled State Machine](#chapter-4-ticket-status-lifecycle--controlled-state-machine)
- [Chapter 5: Mathematical SLA Engine & Business Hours Algorithm](#chapter-5-mathematical-sla-engine--business-hours-algorithm)
- [Chapter 6: Concurrency-Safe Atomic Ticket Numbering](#chapter-6-concurrency-safe-atomic-ticket-numbering)
- [Chapter 7: Database Architecture & Complete Mongoose Schemas](#chapter-7-database-architecture--complete-mongoose-schemas)
- [Chapter 8: Real-Time Event-Driven Architecture (Socket.IO)](#chapter-8-real-time-event-driven-architecture-socketio)
- [Chapter 9: Complete REST API Specification (/api/v1)](#chapter-9-complete-rest-api-specification-apiv1)
- [Chapter 10: Production Directory Architecture & Modular Inventory](#chapter-10-production-directory-architecture--modular-inventory)
- [Chapter 11: Enterprise Security Hardening & Threat Mitigation](#chapter-11-enterprise-security-hardening--threat-mitigation)
- [Chapter 12: QA Automation & Automated Testing Strategy](#chapter-12-qa-automation--automated-testing-strategy)
- [Chapter 13: 9-Phase Engineering Implementation Roadmap](#chapter-13-9-phase-engineering-implementation-roadmap)

---

## Chapter 1: Executive Overview & Business Problem Statement

In modern corporate and institutional environments, IT support failures are rarely caused by a shortage of skilled personnel; they are driven by fragmented communication channels, untracked informal requests (walk-ups, Slack messages, personal emails), zero visibility into service-level commitments, and an inability to balance technician workloads.

**HelpDesk Hub** delivers an institutionalized IT Service Management (ITSM) system built on modern web engineering standards. It eliminates operational bottlenecks through five core pillars:

1. **Centralized Single Source of Truth:** All hardware breakdowns, software licenses, network interruptions, and access requests are codified into trackable, searchable ticket records.
2. **Mathematical SLA Governance:** Guarantees that urgent production disruptions (P1 Critical) receive rapid response and resolution within agreed timeframes, while accounting for non-working hours and client wait times.
3. **Audited Separation of Concerns:** Strict role-based permissions ensure employees can only view public details, while technicians share confidential diagnostics via internal notes.
4. **Dynamic Real-Time Orchestration:** WebSockets push live status transitions, comments, and assignment alerts instantaneously without requiring manual browser refreshing.
5. **Immutable Forensic Accountability:** Every status change, assignment transfer, priority escalation, and resolution timestamp is indelibly captured in an audit ledger.

---

## Chapter 2: High-Level System Topology & Architecture

HelpDesk Hub implements an enterprise-grade 3-tier decoupled architecture designed for high availability, low latency, and zero cross-module coupling:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT PRESENTATION TIER                                 │
│      React 18 + Vite SPA  •  Tailwind CSS  •  Recharts  •  Socket.IO Client      │
│  [Employee Portal]        [Technician Queue & Kanban]     [Admin Supervisory Hub] │
└────────────────────────┬──────────────────────────────────┬───────────────────────┘
                         │ HTTPS REST Requests (/api/v1)   │ Bi-directional WebSockets
                         ▼                                  ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION, GATEWAY & REAL-TIME TIER                         │
│  Express.js API Gateway  •  Helmet / Rate Limiting  •  JWT Auth  •  Zod Guards   │
│  ├── Ticket Service (FSM Transitions, Sequencing)                                │
│  ├── SLA Engine (Business Hours Math, Paused Clock State)                         │
│  ├── Socket.IO Broker (Scoped Rooms: user_<id>, ticket_<id>, role_technicians)    │
│  └── SLA Poller Daemon (60-second periodic background breach evaluator)           │
└────────────────────────┬──────────────────────────────────────────────────────────┘
                         │ Mongoose ODM Operations (Atomic Operations & Indexing)
                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           DATA PERSISTENCE TIER                                   │
│  MongoDB 7.x Database Cluster                                                    │
│  ├── Users (Auth & RBAC)             ├── Tickets (Lifecycle & SLA Metadata)       │
│  ├── Comments (Public & Internal)    ├── Categories (Taxonomy)                    │
│  ├── SLAPolicies (Thresholds)        ├── AuditLogs (Immutable Forensic Ledger)    │
│  └── Counters (Atomic Sequences: HD-YYYY-XXXX)                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Chapter 3: Role-Based Access Control (RBAC) & Boundary Matrix

Access control in HelpDesk Hub is enforced exclusively at the backend API and database query level. Frontend UI hiding is used solely for ergonomics; unauthorized API requests return strict `HTTP 403 Forbidden` responses.

### Organizational Personas:
1. **Employee (Requester):** Submits tickets, monitors own issues, adds public comments, uploads diagnostic files, confirms or disputes resolution within a 48-hour window.
2. **Technician (IT Staff / Resolver):** Triages unassigned tickets, claims assignments, records diagnostic progress, posts private internal notes, transitions ticket statuses, and submits resolution summaries.
3. **Administrator (IT Supervisor):** Oversees platform-wide operations, manages technician skill pools, configures categories and SLA targets, reassigns tickets, inspects immutable audit logs, and exports compliance reports.

### Detailed RBAC Permission Matrix

| Capability | Employee | Technician | Administrator |
| :--- | :---: | :---: | :---: |
| **Create New Ticket** | ✅ Allowed (Self) | ✅ Allowed (On Behalf) | ✅ Allowed (Full) |
| **View Own Submitted Tickets** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **View All Department Tickets** | ❌ Denied | ✅ Allowed | ✅ Allowed |
| **View Unassigned Queue** | ❌ Denied | ✅ Allowed | ✅ Allowed |
| **Claim / Self-Assign Ticket** | ❌ Denied | ✅ Allowed (Self) | ✅ Allowed (Anyone) |
| **Modify Ticket Priority** | ❌ Denied | ✅ Allowed | ✅ Allowed |
| **Transition Ticket Status** | ⚠️ Restricted* | ✅ Allowed | ✅ Allowed |
| **Add Public Comments** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Add Private Internal Notes** | ❌ Denied | ✅ Allowed | ✅ Allowed |
| **View Private Internal Notes** | ❌ Denied (Stripped) | ✅ Allowed | ✅ Allowed |
| **Download Attachments** | ✅ Allowed (Own) | ✅ Allowed | ✅ Allowed |
| **Upload Attachments** | ✅ Allowed (Max 5MB) | ✅ Allowed (Max 10MB) | ✅ Allowed (Max 25MB) |
| **Reopen Resolved Ticket** | ✅ Allowed (48h Window) | ✅ Allowed | ✅ Allowed |
| **Close Ticket Directly** | ✅ Allowed (Own) | ✅ Allowed | ✅ Allowed |
| **Configure Categories & SLAs** | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Inspect System Audit Logs** | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Export CSV / Excel Reports** | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Manage Users & Roles** | ❌ Denied | ❌ Denied | ✅ Allowed |

*\*Note on Employee status transitions: Employees may only transition a ticket from 'Resolved' to 'Closed' (accept resolution) or from 'Resolved' to 'Reopened' (dispute resolution within 48 hours). All other intermediate state transitions are strictly reserved for Technicians and Administrators.*

---

## Chapter 4: Ticket Status Lifecycle & Controlled State Machine

HelpDesk Hub enforces a strictly governed Finite State Machine (FSM) across 9 distinct states:

```
                  ┌───────────────┐
                  │      NEW      │
                  └───────┬───────┘
                          │ (Triage / System Acknowledge)
                          ▼
                  ┌───────────────┐
         ┌───────►│     OPEN      ├──────────────┐
         │        └───────┬───────┘              │
         │                │ (Claim / Assign)     │
         │                ▼                      │ (Cancel)
         │        ┌───────────────┐              │
         │        │   ASSIGNED    │              │
         │        └───────┬───────┘              │
         │                │ (Start Work)         │
         │                ▼                      │
         │        ┌───────────────┐              │
         │        │  IN PROGRESS  │◄────────┐    │
         │        └───┬───────┬───┘         │    │
         │ (Reopen)   │       │ (Need Info) │    │
         │            │       ▼             │    │
         │            │   ┌──────────────┐  │    │
         │            │   │ PENDING USER ├──┘    │
         │            │   │ (SLA PAUSED) │ (User │
         │            │   └──────────────┘  Rep) │
         │            ▼                          │
         │    ┌───────────────┐                  │
         └────┤   RESOLVED    │                  │
              └───────┬───────┘                  │
                      │ (Confirm / 48h Timeout)  ▼
                      ▼                   ┌───────────────┐
              ┌───────────────┐           │   CANCELLED   │
              │    CLOSED     │           └───────────────┘
              └───────────────┘
```

### State Transition Governance Rules

| Current Status | Allowed Next Statuses | Authorized Roles | Automated System Side-Effects |
| :--- | :--- | :--- | :--- |
| **New** | Open, Assigned, Cancelled | Tech, Admin (Req - Cancel) | Broadcasts to tech pool; activates initial response timer. |
| **Open** | Assigned, In Progress, Cancelled | Technician, Admin | Records assignment; increments technician workload score. |
| **Assigned** | In Progress, Pending User, Reassigned | Assigned Tech, Admin | Dispatches direct notification to employee that engineer is engaged. |
| **In Progress** | Pending User, Resolved, Assigned | Assigned Tech, Admin | Records diagnostic progress; updates ticket activity timeline. |
| **Pending User** | In Progress, Resolved, Cancelled | Assigned Tech, Admin, Req | **PAUSES SLA CLOCK**; resumes clock immediately on employee response. |
| **Resolved** | Closed, Reopened | Requester, Admin | Locks resolution timestamp; initiates 48h auto-close countdown. |
| **Closed** | Reopened (Admin Only) | Administrator | Terminal state. Archival lock applied. Reopening requires admin override. |
| **Reopened** | Assigned, In Progress | Technician, Admin | Increments reopen counter; escalates priority to support lead. |
| **Cancelled** | *None (Terminal)* | Administrator | Marked cancelled; excluded from active technician queues. |

---

## Chapter 5: Mathematical SLA Engine & Business Hours Algorithm

### Default SLA Tier Targets

| Priority Level | Target First Response | Target Resolution | Escalation Threshold | Scenario Example |
| :--- | :--- | :--- | :--- | :--- |
| **P1 - Critical** | 15 - 30 Minutes | 4 Business Hours | 75% elapsed without update | Core network switch down, ERP unavailable, ransomware alarm. |
| **P2 - High** | 1 - 2 Business Hours | 8 Business Hours | 80% elapsed without update | Department printer offline, executive laptop failed, VPN broken. |
| **P3 - Medium** | 4 Business Hours | 24 Business Hours (3 Days) | 85% elapsed without update | Software installation request, secondary display setup, email sync. |
| **P4 - Low** | 8 Business Hours | 48 Business Hours (6 Days) | 90% elapsed without update | New keyboard request, minor documentation error, general inquiry. |

### Business Hours Calculation Engine
1. **Working Schedule:** Monday to Friday, 09:00:00 to 18:00:00 (9 hours/day). Weekends and configured organizational holidays are skipped.
2. **Forward Time Projection:** If a P2 ticket (8 business hours target) is logged at 16:00 on Friday, 2 hours are credited Friday (16:00 to 18:00). The remaining 6 hours resume Monday at 09:00, making the deadline Monday 15:00:00.
3. **Paused Clock Mechanics:**
   - Entering `Pending User`: `ticket.isSlaPaused = true; ticket.lastPausedAt = new Date();`
   - Exiting `Pending User`: `ticket.isSlaPaused = false; const delta = Date.now() - ticket.lastPausedAt; ticket.totalPausedDurationMs += delta;`
   - Effective Deadline: `EffectiveDeadline = OriginalDeadline + ticket.totalPausedDurationMs`
4. **Automated Breach Daemon:** Every 60 seconds, a background worker queries:
   ```javascript
   const now = new Date();
   const breachedTickets = await Ticket.find({
     status: { $nin: ['Resolved', 'Closed', 'Cancelled'] },
     isBreached: false,
     $expr: {
       $gt: [now, { $add: ['$resolutionDeadline', '$totalPausedDurationMs'] }]
     }
   });
   ```
   For each breached ticket, `isBreached: true` is committed, an audit log is written, and real-time alerts are pushed to the Administrator and assigned Technician.

---

## Chapter 6: Concurrency-Safe Atomic Ticket Numbering

Under high concurrent loads (e.g., campus-wide outage), standard `Ticket.countDocuments() + 1` causes race conditions and duplicate ID errors. HelpDesk Hub implements an atomic counter collection:

```javascript
// Dedicated Sequence Schema (models/Counter.js)
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'ticketSeq_2026'
  currentSeq: { type: Number, default: 0 }
});

// Atomic Generator in TicketService
async function generateNextTicketNumber(year = new Date().getFullYear()) {
  const counter = await Counter.findOneAndUpdate(
    { _id: `ticketSeq_${year}` },
    { $inc: { currentSeq: 1 } },
    { new: true, upsert: true }
  );
  return `HD-${year}-${String(counter.currentSeq).padStart(4, '0')}`;
}
```

**Concurrency Guarantee:** Because MongoDB executes `findOneAndUpdate` atomically with document write-locks, 100 simultaneous submissions will reliably produce sequential identifiers (`HD-2026-0001` through `HD-2026-0100`) without collision.

---

## Chapter 7: Database Architecture & Complete Mongoose Schemas

### Mongoose Schemas Overview

```
┌──────────────┐       1:N       ┌──────────────┐       1:N       ┌──────────────┐
│     User     ├────────────────►│    Ticket    ├────────────────►│   Comment    │
└──────┬───────┘ (Requester/Tech)└──────┬───────┘                 └──────────────┘
       │                                │ 
       │ 1:N                            │ N:1
       ▼                                ▼
┌──────────────┐                 ┌──────────────┐
│   AuditLog   │                 │   Category   │
└──────────────┘                 └──────────────┘
```

### 1. User Model Schema (`models/User.js`)
* `name` (String, Required, Max 100) — Full user name.
* `email` (String, Required, Unique, Lowercase, Indexed) — Corporate email.
* `passwordHash` (String, Required, Min 60) — Salted Bcrypt hash (cost 12).
* `role` (String, Enum: `['Employee', 'Technician', 'Admin']`, Indexed).
* `department` (String, Required, Indexed) — Requester's organizational unit.
* `phone` (String, Optional) — Direct contact number.
* `avatarUrl` (String, Optional) — Profile image location.
* `isActive` (Boolean, Default: `true`, Indexed).
* `skills` ([String]) — Category IDs for technician routing.

### 2. Ticket Model Schema (`models/Ticket.js`)
* `ticketNumber` (String, Required, Unique, Indexed) — e.g. `HD-2026-0042`.
* `title` (String, Required, Max 150).
* `description` (String, Required, Max 5000).
* `category` (ObjectId, Ref: `'Category'`, Required, Indexed).
* `subcategory` (String, Required).
* `priority` (String, Enum: `['Critical', 'High', 'Medium', 'Low']`, Indexed).
* `status` (String, Enum: 9 finite statuses, Default: `'New'`, Indexed).
* `requesterId` (ObjectId, Ref: `'User'`, Required, Indexed).
* `assignedTechnicianId` (ObjectId, Ref: `'User'`, Default: `null`, Indexed).
* `attachments` ([FileObject]) — Array of uploaded file descriptors.
* `slaPolicyId` (ObjectId, Ref: `'SLAPolicy'`, Required).
* `firstResponseDeadline` (Date, Required, Indexed).
* `resolutionDeadline` (Date, Required, Indexed).
* `firstResponseAt` (Date, Default: `null`).
* `resolvedAt` (Date, Default: `null`).
* `closedAt` (Date, Default: `null`).
* `isBreached` (Boolean, Default: `false`, Indexed).
* `isSlaPaused` (Boolean, Default: `false`).
* `lastPausedAt` (Date, Default: `null`).
* `totalPausedDurationMs` (Number, Default: `0`).

### 3. Comment Model Schema (`models/Comment.js`)
* `ticketId` (ObjectId, Ref: `'Ticket'`, Required, Indexed).
* `authorId` (ObjectId, Ref: `'User'`, Required, Indexed).
* `content` (String, Required, Max 2000, Sanitized).
* `isInternal` (Boolean, Default: `false`, Indexed) — **Internal notes stripped for non-technicians**.
* `attachments` ([FileObject]) — Attached screenshots or log files.
* `createdAt` (Date, Default: `Date.now`, Indexed).

### 4. AuditLog Model Schema (`models/AuditLog.js`)
* `action` (String, Required, Enum: `['CREATE', 'STATUS_CHANGE', 'ASSIGN', 'PRIORITY_CHANGE', 'COMMENT']`).
* `entityType` (String, Required, Enum: `['Ticket', 'User', 'SLA']`).
* `entityId` (ObjectId, Required, Indexed).
* `performedBy` (ObjectId, Ref: `'User'`, Required, Indexed).
* `previousState` (Mixed, Default: `null`).
* `newState` (Mixed, Default: `null`).
* `ipAddress` (String, Required).
* `userAgent` (String, Optional).
* `timestamp` (Date, Default: `Date.now`, Indexed).

---

## Chapter 8: Real-Time Event-Driven Architecture (Socket.IO)

### Room Topology
* `user_<userId>` — Private user channel for assignments, updates, and resolution alerts.
* `ticket_<ticketId>` — Active workspace room for viewing live comments and status transitions.
* `role_technicians` — Technician broadcast pool for unassigned ticket alerts and SLA breaches.
* `role_admin` — Administrative channel for critical escalations and high-priority outages.

### WebSocket Event Matrix

| Event Name | Emitter | Target Room | Privacy Guard | Payload Description |
| :--- | :--- | :--- | :--- | :--- |
| `ticket:created` | Ticket Service | `role_technicians` | Public to Techs | Ticket summary, priority, department, SLA target. |
| `ticket:assigned` | Assign Service | `user_<reqId>`, `user_<techId>` | Role Scoped | Ticket ID, technician name, assignment time. |
| `ticket:status_changed` | Ticket Service | `ticket_<ticketId>` | Public to Room | Ticket ID, oldStatus, newStatus, changedBy, pausedState. |
| `comment:new` | Comment Service | `ticket_<ticketId>` | **isInternal check** | Stripped from non-tech clients if internal. |
| `sla:warning` | SLA Daemon | `user_<techId>`, `role_admin` | Tech & Admin Only | Ticket number, elapsed %, time remaining. |
| `sla:breached` | SLA Daemon | `user_<techId>`, `role_admin` | Tech & Admin Only | Ticket number, breach timestamp, escalation alert. |
| `ticket:resolved` | Ticket Service | `user_<reqId>` | Requester Direct | Resolution summary, confirmation action links. |

---

## Chapter 9: Complete REST API Specification (/api/v1)

### Authentication & User Endpoints
* `POST /api/v1/auth/register` — Register employee account.
* `POST /api/v1/auth/login` — Authenticate and receive HttpOnly cookie.
* `GET /api/v1/auth/me` — Return current session and role profile.
* `POST /api/v1/auth/logout` — Invalidate session and clear cookie.

### Ticket Lifecycle Endpoints
* `GET /api/v1/tickets` — Paginated ticket list with filters (`status`, `priority`, `category`, `search`).
* `POST /api/v1/tickets` — Create new ticket; assigns atomic `HD-YYYY-XXXX` sequence.
* `GET /api/v1/tickets/:id` — Return full ticket detail and SLA status.
* `PATCH /api/v1/tickets/:id/status` — Execute validated state transition; recalculate SLA clock.
* `PATCH /api/v1/tickets/:id/assign` — Assign or transfer technician; record workload metrics.
* `PATCH /api/v1/tickets/:id/priority` — Adjust priority; recompute target resolution timestamps.

### Comment & Attachment Endpoints
* `GET /api/v1/tickets/:id/comments` — Retrieve comment thread (strips internal notes for employees).
* `POST /api/v1/tickets/:id/comments` — Append public comment or private internal note.
* `POST /api/v1/tickets/:id/attachments` — Upload diagnostic files/screenshots (Multer, max 5MB).

### Administrative & Reporting Endpoints
* `GET /api/v1/categories` & `POST /api/v1/categories` — Taxonomy management.
* `GET /api/v1/sla-policies` & `PUT /api/v1/sla-policies/:id` — SLA threshold configuration.
* `GET /api/v1/analytics/overview` — Aggregated KPIs: ticket volume, breach rate, Mean Time to Resolve (MTTR).
* `GET /api/v1/analytics/workload` — Active workload distribution per technician.
* `GET /api/v1/reports/export/csv` — Stream CSV data export.
* `GET /api/v1/reports/export/xlsx` — Stream multi-sheet formatted Excel workbook.
* `GET /api/v1/audit-logs` — Immutable audit trail with date, actor, and action filters.

---

## Chapter 10: Production Directory Architecture & Modular Inventory

```
helpdesk-hub/
├── server/
│   ├── src/
│   │   ├── config/              # Database connection, env loader, constants
│   │   ├── controllers/         # HTTP request handlers
│   │   │   ├── authController.js
│   │   │   ├── ticketController.js
│   │   │   ├── commentController.js
│   │   │   ├── slaController.js
│   │   │   └── analyticsController.js
│   │   ├── services/            # Domain business logic & calculations
│   │   │   ├── ticketService.js
│   │   │   ├── slaEngine.js
│   │   │   ├── sequenceService.js
│   │   │   └── auditService.js
│   │   ├── models/              # Mongoose data schemas
│   │   │   ├── User.js
│   │   │   ├── Ticket.js
│   │   │   ├── Comment.js
│   │   │   ├── Category.js
│   │   │   ├── SLAPolicy.js
│   │   │   ├── Counter.js
│   │   │   └── AuditLog.js
│   │   ├── middleware/          # Security, auth, and upload filters
│   │   │   ├── authMiddleware.js
│   │   │   ├── rbacMiddleware.js
│   │   │   ├── rateLimiter.js
│   │   │   ├── uploadMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── validators/          # Zod validation schemas
│   │   ├── sockets/             # Socket.IO connection & room handlers
│   │   ├── utils/               # Business hours helpers, CSV streams, logger
│   │   ├── server.js            # Express app initialization
│   │   └── index.js             # HTTP & Socket.IO server entrypoint
│   ├── tests/                   # Vitest & Supertest automated test suites
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Button, Input, Modal, Badge, Toast, Skeleton
│   │   │   ├── layout/          # Sidebar, TopNav, NotificationBell, ThemeToggle
│   │   │   ├── tickets/         # KanbanBoard, TicketTable, CommentThread
│   │   │   └── dashboard/       # MetricCard, SLABarChart, WorkloadHeatmap
│   │   ├── context/             # AuthContext, SocketContext, ThemeContext
│   │   ├── hooks/               # useTickets, useSocket, useDebounce
│   │   ├── services/            # Axios API client & Socket client singleton
│   │   ├── pages/               # EmployeeDashboard, TechQueue, AdminConsole, TicketDetail
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
```

---

## Chapter 11: Enterprise Security Hardening & Threat Mitigation

| Attack Vector | Severity | Hardened Defense Implementation |
| :--- | :---: | :--- |
| **NoSQL Injection** | **CRITICAL** | Mongoose schema casting combined with Zod sanitization strips unauthorized operators (`$gt`, `$where`, `$regex`). |
| **Internal Note Data Leak** | **CRITICAL** | Database queries strictly append `{ isInternal: false }` for employee callers. Internal notes are never broadcasted to employee socket rooms. |
| **Cross-Site Scripting (XSS)** | **HIGH** | All user comments and descriptions are sanitized with DOMPurify / sanitize-html before persistence. |
| **Brute-Force Attacks** | **HIGH** | Express-Rate-Limit throttles authentication endpoints to 5 failed attempts per 15-minute window per IP address. |
| **Malicious File Uploads** | **HIGH** | Multer enforces strict MIME whitelisting (PDF, PNG, JPG, LOG, TXT). Executables (`.exe`, `.bat`, `.sh`, `.js`) are rejected. Files are renamed using UUIDs. |
| **Broken Object Level Auth** | **HIGH** | Ticket endpoints verify caller is ticket owner, assigned technician, or possesses Administrator privileges. |
| **CSRF & Session Theft** | **MEDIUM** | JWTs stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. CORS origin locked to authorized frontend. |
| **Audit Log Tampering** | **MEDIUM** | `AuditLog` collection contains no `UPDATE` or `DELETE` API routes. Ledger is strictly append-only. |

---

## Chapter 12: QA Automation & Automated Testing Strategy

Automated tests are executed using **Vitest** and **Supertest** against an ephemeral MongoDB test instance:

```
Test Suites Summary:
├── Auth & RBAC Suite: Asserts token verification and confirms employees receive 403 on internal routes.
├── State Machine Integrity: Confirms valid transitions succeed and illegal jumps (e.g. Closed -> In Progress) throw 400 Bad Request.
├── Atomic Sequence Concurrency: Simulates 50 simultaneous submissions; asserts exactly 50 consecutive non-colliding IDs.
├── SLA Business Hours Engine: Tests weekend skips, holiday boundaries, and validates clock pause during 'Pending User'.
├── Comment Privacy Test: Submits ticket queries as Employee; asserts zero leakage of records where isInternal === true.
└── File Upload Filter: Uploads prohibited file extensions (.exe); verifies 415 Unsupported Media Type rejection.
```

---

## Chapter 13: 9-Phase Engineering Implementation Roadmap

```
Phase 1: Architecture & Repository Setup (Vite, Express, Tailwind, Vitest harness)
   │
   ▼
Phase 2: Database Models & Authentication (Bcrypt, JWT HttpOnly, RBAC middleware)
   │
   ▼
Phase 3: Ticket Creation & Sequence Engine (Atomic Counter, Zod validation, HD-YYYY-XXXX)
   │
   ▼
Phase 4: Assignment, Workflow & Comments (FSM transitions, public/internal comment threads)
   │
   ▼
Phase 5: SLA Engine & Real-Time WebSockets (Business hours math, pause logic, Socket.IO rooms)
   │
   ▼
Phase 6: Role Dashboards & Ticket Views (Employee portal, Tech Kanban queue, Admin console)
   │
   ▼
Phase 7: Analytics, Reporting & Exports (Recharts metrics, MTTR, streaming CSV/Excel)
   │
   ▼
Phase 8: Security Hardening & QA Audit (Helmet, rate limits, XSS sanitation, Supertest suite)
   │
   ▼
Phase 9: Documentation & Production Release (README, seed accounts, deployment runbook)
```

---

### Definition of Done (DoD)
The system is considered complete when a live end-to-end operational flow is fully executed:
1. Employee submits a ticket via UI → Atomic sequence `HD-2026-0001` generated in MongoDB.
2. Real-time push alert appears in Technician pool.
3. Administrator assigns ticket to Technician → Employee receives live notification.
4. Technician updates status to `In Progress` → SLA resolution countdown starts.
5. Technician flags `Pending User` → SLA clock pauses.
6. Employee provides requested logs → SLA clock automatically resumes.
7. Technician resolves ticket with summary → Employee reviews and closes issue.
8. Entire lifecycle is preserved in MongoDB with an indelible Audit Trail.
