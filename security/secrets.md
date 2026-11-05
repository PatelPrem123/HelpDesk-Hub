# HelpDesk Hub — Enterprise Secrets Management & Exposure Audit

**Project:** HelpDesk Hub (Enterprise ITSM System)  
**Security Standard:** OWASP Secrets Management & CWE-798 Hardcoded Credentials Mitigation  
**Evaluated Scope:** Server configuration, environment variables, frontend bundle exposure, database connections, third-party integrations, and logging pipelines.

---

## 1. Secrets Inventory & Expected Locations

The system requires several sensitive credentials to operate securely:

| Secret Identifier | Target Service / Component | Purpose | Expected Environment Variable | Sensitivity Level |
| :--- | :--- | :--- | :--- | :---: |
| **Database Connection URI** | MongoDB Cluster | Primary operational persistence | `MONGODB_URI` | **CRITICAL** |
| **JWT Signing Key** | Authentication Subsystem | Symmetric HMAC-SHA256 signing of auth tokens | `JWT_SECRET` | **CRITICAL** |
| **JWT Refresh Secret** | Session Refresh Subsystem | Independent key for issuing new access tokens | `JWT_REFRESH_SECRET` | **CRITICAL** |
| **Session Cookie Secret** | Express Session / Cookie Parser | Cookie integrity signing | `COOKIE_SECRET` | **HIGH** |
| **SMTP / Mail Credentials** | Notification Daemon | Outbound email alerts for SLA warnings & assignments | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | **HIGH** |
| **Object Storage API Keys** | S3 / MinIO (Optional) | Long-term attachment preservation | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | **HIGH** |
| **Root Admin Seed Credentials** | Database Seeder Script | Initial system bootstrapping | `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | **CRITICAL** |

---

## 2. Environment & Configuration Handling Analysis

### Recommended Loading Pattern
1. Configuration must be loaded at the earliest application bootstrap phase using `dotenv` or native Node.js `--env-file` (Node.js 20+).
2. All environment parameters must be validated at startup using a strict schema (e.g., Zod or Envalid). If any critical secret is absent or has default placeholder values, the process must terminate immediately (`process.exit(1)`).

### Strict Configuration Schema Example:
```javascript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5050),
  MONGODB_URI: z.string().url().startsWith('mongodb'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters high entropy'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_SECRET: z.string().min(32),
  CLIENT_ORIGIN: z.string().url(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100)
});

export const env = envSchema.parse(process.env);
```

---

## 3. Vulnerability Surface & Risk Analysis

### A. Hardcoded-Secret Risks
- **Risk Assessment:** Any hardcoded fallback like `process.env.JWT_SECRET || 'secret123'` or `mongodb://localhost:27017/helpdesk` deployed to staging or production leads to trivial token forgery.
- **Evidence from Architecture:** In production, fallbacks must never exist in `server.js` or `config/db.js`.
- **Policy Rule:** No default string fallbacks allowed for `JWT_SECRET`, `MONGODB_URI`, or `COOKIE_SECRET`.

### B. Client-Side Exposure Risks (Vite / React SPA)
- **Risk Assessment:** Client-side build tools (Vite) bundle any environment variable prefixed with `VITE_` directly into the public JavaScript bundle.
- **Vulnerability Check:**
  - `VITE_API_BASE_URL` is public and acceptable.
  - No secret keys (e.g., `JWT_SECRET`, database strings, API admin keys) may ever be prefixed with `VITE_` or imported inside `client/src`.
- **Mitigation:** Strict ESLint rule banning `process.env` in client code and banning any secret imports inside `client/`.

### C. Git & Version Control Exposure Risks
- **Risk Assessment:** Accidental commits of `.env`, `.env.local`, or test seed files to Git history.
- **Required Baseline `.gitignore` Entries:**
  ```gitignore
  # Environment Variables
  .env
  .env.local
  .env.*.local
  *.env

  # Certificates and Keys
  *.pem
  *.key
  *.cert
  id_rsa

  # Uploaded Media & Attachments
  server/uploads/
  client/dist/
  node_modules/
  ```
- **Pre-commit Safeguard:** Recommended setup of `gitleaks` or `trufflehog` pre-commit hooks to block commits containing high-entropy strings or regex patterns matching tokens and private keys.

### D. Logging & Error Stack Disclosure Risks
- **Risk Assessment:** `console.log(req.body)` or generic error loggers printing user credentials during login/registration, or printing MongoDB connection strings containing passwords.
- **Mitigation Strategy:**
  - Morgan / Winston logging configuration must redact `password`, `token`, `authorization`, `cookie`, and `refreshToken` fields.
  - Database connection errors must sanitize URIs before logging (`uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')`).

### E. Secret Rotation Requirements & Lifecycle
1. **JWT Secret Rotation:** Transition to asymmetric keys (RS256) where public keys are distributed for verification and private keys can be rotated via JWKS endpoints. For symmetric HS256, support primary and secondary secret arrays to allow seamless rolling rotation without logging out active users.
2. **Database Password Rotation:** Database users for the HelpDesk Hub application must follow least-privilege principles (readWrite role on `helpdesk_hub` database only, zero clusterAdmin permissions) and support scheduled 90-day password cycling.
3. **Emergency Secret Invalidation:** If `JWT_SECRET` is compromised, all active user tokens must be immediately invalidated by revoking all refresh tokens and resetting the secret in environment config.

---

## 4. Current Audit Findings & Evidence

| Finding ID | Scope | Description | Evidence / Code Location | Risk Level | Recommended Action |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **SEC-01** | Environment Template | Absence of `.env.example` template leads to ad-hoc configuration and developer mistakes | `server/.env.example` (Missing) | **Medium** | Create documented `.env.example` with sanitized placeholders. |
| **SEC-02** | Git Ignore | Missing root `.gitignore` allows accidental commit of `.env` files | Root directory `.gitignore` | **High** | Create robust `.gitignore` covering all environment patterns. |
| **SEC-03** | Startup Validation | Server initialization must enforce fatal exit if secrets are missing | `server/src/config/env.js` | **High** | Implement Zod environment schema parser during startup. |
| **SEC-04** | Client Bundle Isolation | Frontend must only receive `VITE_API_URL` and `VITE_WS_URL` | `client/vite.config.js` | **Medium** | Enforce linting rules against bundling private env variables. |
