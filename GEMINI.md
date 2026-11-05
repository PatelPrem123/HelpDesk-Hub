# HelpDesk Hub — Autonomous Agent Engineering & Quality Contract (AGENTS.md)

This file governs all autonomous AI coding agents, senior engineers, and code review assistants working on HelpDesk Hub.

---

## 1. Master AI Code Testing & QA Rules

When performing testing, code reviews, or implementing features:
1. **Never Assume Code is Correct:** Inspect actual implementations, verify edge cases, and run tests.
2. **Never Invent Test Results:** Distinguish clearly between code that was manually reviewed and tests that were actually executed. Do not claim tests passed unless executed via terminal with exit code 0.
3. **Comprehensive Review Scope:** Every module must undergo:
   - Code Quality Review (readability, dead code elimination, naming standards).
   - Functional & Logic Verification (state transitions, calculations).
   - Unit & Integration Testing (boundary conditions, Supertest API checks).
   - Edge Case Hardening (null/undefined, empty strings, oversized inputs, race conditions).
   - Security Validation (NoSQL injection, XSS, CSRF, BOLA/IDOR, confidential note leaks).
   - Performance & Concurrency Testing (atomic sequence increments, indexed queries).
4. **Preserve Existing Business Logic:** Never break working functionality or silently alter database schemas, route paths, or expected JSON contracts.

---

## 2. Professional Human-Code Engineering Standards

All code generated, refactored, or reviewed must reflect senior developer standards:
- **Clean Code & SOLID:** Single responsibility per function and module, clean dependency separation.
- **KISS & DRY:** Avoid over-engineering, unnecessary abstractions, and redundant boilerplate.
- **Natural, Professional Style:** Avoid artificial comments explaining obvious syntax; write descriptive, context-rich code.
- **Strict Error Handling:** Centralized async wrappers, meaningful error responses, and zero unhandled promise rejections.
- **Strict Typing & Schema Validation:** Enforce Zod validation on all API boundaries.

---

## 3. Architecture & Decision Governance (DECISIONS.md)

1. **Mandatory Check:** Before making architecture or schema changes, consult `DECISIONS.md`.
2. **Honor Confirmed Decisions:** Decisions marked `CONFIRMED` (such as the 9-State FSM in `DEC-003`, Business Hours SLA Math in `DEC-004`, and Atomic Ticket Sequencing in `DEC-005`) are non-negotiable constraints.
3. **No Unapproved Rewrites:** Never replace an intentional architectural pattern with a generic alternative without human approval.

---

## 4. Impact Mapping Protocol (IMPACT-MAP.md)

Before touching shared services, models, middleware, or socket handlers:
1. Cross-reference `IMPACT-MAP.md` to identify direct and indirect consumers.
2. Verify security boundaries (e.g. `isInternal: true` note scrubbing for employees).
3. Review corresponding test suites in `server/tests/`.

---

## 5. Security & Read-Only Backdoor Audit Protocol

1. **Zero Backdoors:** Strictly prohibit bypass flags (`BYPASS_AUTH`, `DEBUG=true`, `SKIP_AUTH`), hardcoded credentials, mock sessions, or undocumented endpoints in production.
2. **Confidential Note Protection:** Ensure `Comment.isInternal === true` records are NEVER leaked to employees over REST responses or WebSocket broadcasts.
3. **Input Sanitization:** Sanitize descriptions and comments with DOMPurify; validate payloads with Zod.
