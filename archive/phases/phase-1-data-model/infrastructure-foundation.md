# Athelon — Infrastructure Foundation
**Author:** Jonas Harker, DevOps / Platform Engineer
**Date:** 2026-02-22
**Phase:** 1 — Foundation
**Status:** Draft — Pending Review

---

> *Standard disclaimer: this is the architecture for the Phase 1 prototype. It is designed to be production-ready in principle so we don't have to rebuild it later, but Phase 1 is not public-facing. I've made conservative choices where FAA retention requirements and SOC 2 readiness intersect. I've made pragmatic choices everywhere else. The SOC 2 gap analysis is honest — we're not there yet, and I'm naming exactly what's missing. — JH*

---

## 1. Deployment Architecture

### 1.1 Overview

Athelon runs on a four-component cloud stack:

```
Convex (backend + database) ← → Vercel (frontend / Next.js) ← → Cloudflare (CDN, WAF, DNS)
                                          ↕
                                    Clerk (authentication)
```

This stack was chosen for: (1) real-time data sync without a custom WebSocket layer, (2) zero-ops deployment for the frontend, (3) a global CDN that doesn't require infra work, and (4) an auth provider that handles compliance-relevant features (MFA, session management, audit logs) out of the box.

### 1.2 Convex — Backend and Database

**Role:** Convex serves as the database, backend functions layer, and real-time subscription engine.

- **Production environment:** Convex Cloud (managed, hosted by Convex Inc.)
- **Development environment:** Separate Convex project per developer (free tier)
- **Staging environment:** Dedicated Convex project, mirrors production schema, seeded with synthetic test data
- **Schema:** Defined in `/convex/schema.ts`. Version-controlled in Git. Migrations managed via Convex's built-in schema migration support.
- **Real-time subscriptions:** Convex's `useQuery` hooks provide reactive data for all live dashboard features. No separate WebSocket infrastructure.
- **Server functions:** Business logic lives in Convex mutations and queries. Direct database access from the Next.js frontend is prohibited by architecture.
- **Backup:** Convex manages automated backups. We supplement with daily export to encrypted S3 (see Section 2).

**Phase 1 environments:**

| Environment | Purpose | Access |
|---|---|---|
| `athelon-dev-[username]` | Individual developer sandbox | Developer only |
| `athelon-staging` | Integration testing, design review | Engineering + Design |
| `athelon-prod` | Production (not yet public in Phase 1) | Engineering only |

### 1.3 Vercel — Frontend Hosting

**Role:** Hosts the Next.js App Router frontend. Provides preview deployments per pull request.

- **Framework:** Next.js 14 (App Router)
- **Build:** Automated on every push to any branch
- **Preview deployments:** Every PR gets a unique preview URL (e.g., `athelon-pr-142.vercel.app`). Used for design review and QA before merge.
- **Production:** `main` branch auto-deploys to production domain (to be set up when we have a domain)
- **Environment variables:** Managed in Vercel project settings. Never committed to the repo. (See Section 4.)
- **Edge functions:** Used sparingly. Auth middleware (Clerk) runs at the edge. No other edge compute in Phase 1.

**Vercel project configuration:**

```
Project: athelon
Framework: Next.js
Root Directory: /
Build Command: pnpm run build
Output Directory: .next
Node.js Version: 20.x
```

### 1.4 Cloudflare — CDN, WAF, and DNS

**Role:** All traffic routes through Cloudflare before reaching Vercel. Provides DDoS protection, WAF (Web Application Firewall), bot mitigation, and global edge caching for static assets.

- **DNS:** Cloudflare manages DNS for the production domain. Proxy mode enabled on all records (traffic goes through Cloudflare, not directly to Vercel).
- **WAF:** OWASP Core Rule Set enabled. Custom rules for: rate limiting on auth endpoints, block known malicious IPs, flag unusual geographic access patterns.
- **Caching:** Static assets (JS, CSS, images) cached at Cloudflare edge. API responses (Convex HTTP actions if applicable) are not cached — real-time data must not be stale.
- **SSL:** Cloudflare manages TLS termination. Full (Strict) mode — traffic is encrypted between browser → Cloudflare AND Cloudflare → Vercel.

**Note on Convex:** Convex has its own endpoint at `convex.cloud`. Traffic from the Next.js frontend to Convex goes directly to Convex's infrastructure (not through Cloudflare). This is expected — Convex's WebSocket connections for real-time subscriptions cannot be proxied through Cloudflare without degrading the subscription experience.

### 1.5 Clerk — Authentication and Session Management

**Role:** All authentication, session management, and user identity is managed by Clerk.

- **Auth methods (Phase 1):** Email/password with email verification. Google OAuth (optional for development convenience). MFA (TOTP) available and will be required for DOM and Owner roles in Phase 2.
- **Organizations:** Clerk's organization model maps to Athelon's "shop" concept. Each repair station is a Clerk organization. Users belong to one or more organizations (a DOM may manage multiple locations eventually).
- **Roles:** Clerk's role/permission system maps to Athelon's RBAC: `dom`, `amt`, `parts_manager`, `owner`, `inspector`, `admin`. Roles are stored in Clerk's `publicMetadata` and read at the Convex layer.
- **Session duration:** 8 hours by default (matches a standard work shift). Configurable per organization. MFA re-auth required after session expiry.
- **Audit log:** Clerk logs all authentication events. These are accessible via the Clerk dashboard and webhook (we forward them to our logging infrastructure in Phase 2 for SOC 2 purposes).
- **Webhook:** Clerk → Convex webhook configured for user lifecycle events (created, deleted, organization membership changed). Convex maintains a synchronized user record.

---

## 2. Data Retention Architecture (FAA 2-Year Minimum)

### 2.1 Regulatory Requirement

14 CFR Part 145.221 requires repair stations to retain maintenance records for a minimum of 2 years from the date the maintenance was approved for return to service. Some records (major repair/alteration data) must be retained indefinitely. FAA Advisory Circular AC 120-78B provides guidance on electronic records.

**What this means for the database:**
1. No maintenance record may be deleted before 2 years have elapsed since the associated return-to-service date.
2. Records must be retrievable in a format acceptable to the FAA (readable, printable, complete).
3. If Athelon is discontinued or the customer cancels, the customer must be able to export their records.

### 2.2 Convex Database — Retention Controls

All maintenance records in Convex are tagged with:
- `createdAt` (Convex system field)
- `returnToServiceDate` (when set — only on closed work orders)
- `retentionPolicy`: enum `['standard_2yr', 'permanent', 'customer_directive']`
- `deletionEligibleAfter`: computed field; null until RetentionPolicy allows deletion

**Deletion policy:** No automated deletion is implemented in Phase 1. Records are retained indefinitely by default. A future admin tool will identify records eligible for deletion under the retention policy, require manual DOM confirmation, and log the deletion event.

**Soft delete:** All records use soft delete (`isArchived: boolean`). Hard deletion is a privileged operation (DOM or admin) with a confirmation step and audit trail.

### 2.3 Daily Export to S3 (Disaster Recovery Layer)

In addition to Convex's managed backups, a Convex scheduled function runs daily at 02:00 UTC:

1. Exports all maintenance records (work orders, task cards, parts issues, signatures) as structured JSON
2. Signs the export with a SHA-256 hash (stored alongside the export) to verify integrity
3. Uploads to AWS S3 bucket: `athelon-retention-[shop-id]`
4. S3 bucket configuration:
   - **Versioning:** Enabled. Overwrites produce a new version, not a replacement.
   - **Object Lock:** Enabled in Compliance mode. Retention period: 3 years (exceeds FAA 2-year minimum). Objects cannot be deleted or overwritten during the lock period — not even by the bucket owner.
   - **Encryption:** SSE-S3 at rest. TLS in transit.
   - **Access:** No public access. IAM role with least-privilege access. No developer has direct S3 console access in production (requires break-glass procedure).
   - **Region:** `us-east-1` (primary), replicated to `us-west-2` (cross-region replication enabled).

**Customer data portability:** If a customer terminates their Athelon subscription, their S3 bucket is made available for export for 90 days. They receive a time-limited presigned URL to download their complete maintenance record archive. After 90 days, the bucket enters the Object Lock retention period and is inaccessible to the customer but retained by us per our terms of service (for regulatory compliance purposes).

### 2.4 "Permanent" Record Handling

Major repair and alteration records, 8130-3 documents, and STC data may carry indefinite retention requirements. These are flagged with `retentionPolicy: 'permanent'` and are excluded from any future deletion process entirely. They can only be archived (hidden from operational views) but not deleted.

---

## 3. SOC 2 Gap Analysis

### 3.1 What SOC 2 Requires

SOC 2 Type II certification covers five trust service criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. For Phase 1, we are not SOC 2 certified and are not claiming to be. This gap analysis documents where we are vs. where we need to be.

Target: SOC 2 Type I readiness by end of Phase 3. SOC 2 Type II audit window begins Phase 4.

### 3.2 Current State (Phase 1)

| Control Area | Status | Gap |
|---|---|---|
| **CC6: Logical Access Controls** | 🟡 Partial | Clerk handles auth. RBAC is designed but not fully tested. No access review process. |
| **CC6.1: MFA** | 🟡 Partial | MFA available in Clerk. Not enforced. Not enforced = not compliant. |
| **CC6.2: Least Privilege** | 🔴 Not met | Developer accounts have broad access. No role separation between developers. |
| **CC6.3: User provisioning/deprovisioning** | 🔴 Not met | No formal process. Manual. Not documented. |
| **CC7: System Operations** | 🔴 Not met | No monitoring, no alerting, no incident response plan. |
| **CC7.2: Anomaly Detection** | 🔴 Not met | No SIEM. No alerting on unusual authentication patterns. |
| **CC8: Change Management** | 🟡 Partial | GitHub PRs provide change review. No change advisory board process. No rollback procedure documented. |
| **CC9: Risk Mitigation** | 🔴 Not met | No formal risk assessment conducted. |
| **A1: Availability** | 🟡 Partial | Convex and Vercel have their own uptime SLAs. We have no defined SLA to customers. No incident communication process. |
| **PI1: Processing Integrity** | 🟡 Partial | Convex's ACID transactions provide some integrity. No automated data integrity checks. |
| **C1: Confidentiality** | 🟡 Partial | S3 encryption in place. Convex encrypts at rest. No DLP controls. No data classification. |
| **P1: Privacy** | 🔴 Not met | No privacy policy. No data processing agreement template. No deletion workflow. |

### 3.3 Priority Gaps (Must Close Before Public Beta)

1. **MFA enforcement for privileged roles (DOM, Owner, Admin):** Clerk configuration change + UI enforcement. Estimated: 2 days.

2. **Developer access controls:** Separate production and staging credentials. No developer has production database access except via the application. Break-glass procedure documented. Estimated: 1 week.

3. **Monitoring and alerting:** Implement Convex + Vercel logging pipeline to a centralized log service (Logtail or similar). Alert on: authentication failures > 5 in 5 minutes, errors > 1% of requests, latency > 3s p95. Estimated: 1 week.

4. **Incident response plan:** Written document. Defines severity levels, escalation path, communication template, and post-mortem process. Not a technical task — a process task. Estimated: 2 days.

5. **Vulnerability management:** Dependabot enabled (already on). Add scheduled SAST scan (GitHub Actions + Semgrep). Add dependency license check. Estimated: 1 day.

6. **Access review process:** Quarterly review of all Clerk users, their roles, and their last-active date. Remove stale accounts. Document in a changelog. Estimated: Process design 1 day; ongoing quarterly.

### 3.4 Gaps That Can Wait Until Phase 3

- SIEM implementation (Splunk, Datadog SIEM, or equivalent)
- Penetration testing (annual; before public launch)
- SOC 2 readiness assessment with external auditor
- DLP controls
- Full privacy policy + DPA templates
- Business continuity plan (beyond what S3 Object Lock provides)

---

## 4. Secrets Management

### 4.1 Principles

- No secrets in the repository. Ever. `.env` files are gitignored and developer-local only.
- No secrets in Slack, email, or any communication channel.
- Production secrets are never known to individual developers.
- Rotation is automated or at minimum proceduralized.

### 4.2 Secret Categories and Storage

| Secret Type | Storage | Access | Rotation |
|---|---|---|---|
| Convex deployment URL + keys | Vercel environment variables (production) | CI/CD pipeline only | Manual; on security event |
| Clerk API keys (secret key) | Vercel environment variables (production) | CI/CD pipeline only | Manual; quarterly |
| Clerk webhook signing secret | Vercel environment variables + Convex env | CI/CD pipeline only | Manual; on rotation |
| AWS S3 credentials (for export) | AWS IAM role (no static key) | Convex scheduled function via OIDC | N/A (IAM role; no static secret) |
| Sentry DSN (error tracking) | Vercel environment variables | CI/CD pipeline only | Not sensitive; rotated on team change |

**AWS access:** The Convex scheduled function that writes to S3 does not use static AWS access keys. It uses OIDC federation — Convex assumes an AWS IAM role via a web identity token. This means there is no AWS access key to rotate or leak.

### 4.3 Developer Local Setup

Developers get a `.env.local.example` file in the repo. They populate it with their own development credentials (Convex dev project, Clerk development instance). Credential provisioning for new developers is documented in the `CONTRIBUTING.md` onboarding guide.

No developer ever has access to production Convex deployment keys, production Clerk keys, or production S3 credentials. The production environment is CI/CD-only.

### 4.4 Secret Rotation Procedure

On any of the following events, all secrets rotate:
- Developer offboarding
- Suspected credential leak
- Annual review (regardless of events)

Rotation procedure:
1. New secret generated in the relevant provider
2. Vercel environment variable updated
3. Vercel production deployment triggered (picks up new secret)
4. Old secret revoked
5. Rotation logged in the infrastructure changelog (private repo wiki)

---

## 5. CI/CD Pipeline Design

### 5.1 Overview

All code changes flow through a GitHub Actions pipeline before reaching production. No manual deployments to production.

```
Developer Push → GitHub PR → 
  [CI: lint, type-check, tests, security scan] →
  [Deploy: Vercel preview] →
  [Review: Finn/Chloe/QA approval] →
  Merge to main →
  [Deploy: Vercel production + Convex staging schema migration if applicable]
```

### 5.2 Pipeline Stages

#### Stage 1: Pre-merge checks (runs on every PR)

```yaml
jobs:
  lint:
    - pnpm run lint          # ESLint + Prettier
    - pnpm run typecheck     # tsc --noEmit

  test:
    - pnpm run test          # Vitest unit tests
    - pnpm run test:convex   # Convex function tests (convex-test)

  security:
    - semgrep --config auto  # SAST scan
    - pnpm audit             # Dependency vulnerability check
    - check-licenses         # License compatibility check
```

**Gate:** All checks must pass before PR can be merged. No exceptions without explicit override and documented reason.

#### Stage 2: Preview Deployment (runs on every PR, parallel with Stage 1)

```yaml
jobs:
  preview:
    - Vercel: deploy to preview URL
    - Comment PR with preview URL
    - Comment PR with Convex function diff (if schema changed)
```

Preview deployments use staging Convex project. This means Finn can review designs against real data structures without touching production.

#### Stage 3: Production Deployment (runs on merge to `main`)

```yaml
jobs:
  deploy:
    - Convex: push schema migrations to staging (with dry-run output)
    - Convex: push schema migrations to production (requires confirmation step if breaking migration)
    - Vercel: deploy production build
    - Notify: Slack #deployments with deploy summary and SHA
```

**Breaking migrations:** If a Convex schema migration removes a field or changes a type, the CI job pauses and requires manual approval from Rafael Mendoza or Jonas Harker before proceeding. This prevents accidental data loss in production.

#### Stage 4: Post-deployment validation

```yaml
jobs:
  smoke-test:
    - Run smoke test suite against production (5 critical paths: login, create work order, sign task card, request part, view dashboard)
    - If any smoke test fails: auto-rollback (Vercel rollback to previous deployment; Convex migration rollback if applicable)
    - Notify Slack #incidents if rollback triggered
```

### 5.3 Environment Promotion

| Branch | Convex | Vercel | Purpose |
|---|---|---|---|
| `feat/*`, `fix/*` | Dev (individual) | Preview | Feature development |
| `main` (pre-public) | Staging | Staging | Integration + review |
| `main` (post-public) | Production | Production | Live product |

In Phase 1, "production" is the staging environment — there are no real customers yet. The production Convex project is provisioned and tested but not customer-facing.

### 5.4 Rollback Procedure

**Vercel rollback:** Instantaneous. `vercel rollback` or one-click in Vercel dashboard. Reverts to previous production deployment within 30 seconds.

**Convex rollback:** More complex. Convex does not provide one-click migration rollback. If a schema migration causes problems:
1. Identify the last known good schema state (Git SHA)
2. Apply the inverse migration (manually authored)
3. Redeploy

This is why breaking migrations require manual approval in CI and why we maintain comprehensive schema migration documentation.

**RTO target (Phase 1, internal):** 30 minutes for any production issue.
**RPO target (Phase 1, internal):** 0 — Convex's managed infrastructure has sub-second replication; our daily S3 export provides a fallback with max 24h data loss in catastrophic scenarios.

---

## 6. Phase 1 Infrastructure Checklist

- [ ] Convex projects provisioned: dev, staging, prod
- [ ] Vercel project configured with environment variables for all three environments
- [ ] Cloudflare DNS configured for staging domain
- [ ] Clerk application configured: development instance + production instance
- [ ] Clerk → Convex webhook configured and tested
- [ ] GitHub Actions pipeline: lint, typecheck, test, security scan (all passing)
- [ ] Preview deployment workflow confirmed (PR → preview URL in PR comment)
- [ ] S3 bucket provisioned with Object Lock and cross-region replication
- [ ] Daily Convex export function implemented and tested
- [ ] Smoke test suite written (5 critical paths)
- [ ] Secrets documented in infrastructure changelog (private)
- [ ] `CONTRIBUTING.md` updated with dev onboarding credential instructions

---

*Jonas Harker. Questions via Slack #platform-infra. Do not ask me about things that are in this document — it's all here.*
