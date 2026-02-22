# Technical Requirements 001 — Platform Stack Mandate
**Date:** 2026-02-22  
**Owner:** Athelon Technical Program Lead  
**Status:** Active (Non-Negotiable)

## 1) Non-Negotiable Stack Constraints
Effective immediately, all product and platform work must conform to the following constraints:

1. **Primary application language: TypeScript**
   - All application code (frontend, backend/server functions, shared libraries, test harnesses) must be TypeScript-first.
   - JavaScript-only modules are disallowed unless approved as temporary migration exceptions.
2. **Database + backend platform: Convex**
   - Convex is the canonical backend runtime for data access, business logic, real-time subscriptions, and server-side mutations/queries.
   - New service patterns must assume Convex-first architecture.
3. **Authentication + identity: Clerk**
   - Clerk is the mandatory identity provider for user auth, sessions, organization/tenant context, and role claims integration.
   - No parallel auth stacks may be introduced.
4. **Hosting/deployment: Vercel**
   - Web application hosting, preview environments, and production deployment pipeline are standardized on Vercel.
   - Non-Vercel production hosting for the web app is out-of-scope unless leadership approves an explicit exception.

## 2) Architecture Decisions and Rationale

### Decision A — TypeScript End-to-End
**Decision:** Use a shared TypeScript domain model across UI, Convex functions, validators, and tests.  
**Rationale:** Reduces translation errors, improves refactor safety, and supports regulated-domain traceability through strongly typed contracts.

### Decision B — Convex as System of Record + Execution Layer
**Decision:** Implement domain entities and workflows directly in Convex schema/functions with index-driven query patterns and auditable mutation boundaries.  
**Rationale:** Real-time data sync and a single backend execution model accelerate delivery while minimizing distributed-systems complexity.

### Decision C — Clerk-Centric Identity and Authorization Claims
**Decision:** Clerk manages authentication lifecycle; authorization is enforced in Convex using Clerk identity context plus domain roles.  
**Rationale:** Mature identity capabilities and reduced auth surface area lower security risk and implementation overhead.

### Decision D — Vercel as Delivery Platform for Web
**Decision:** Deploy the web front end and preview branches on Vercel; integrate with repository CI checks as quality gates.  
**Rationale:** Fast developer feedback loops, predictable environments, and standardized deployment operations.

## 3) Platform Implications

### Frontend (TypeScript + Next.js)
- Strictly typed UI state, API contracts, and domain DTOs.
- Shared schema-driven forms and validation adapters.
- Eliminate untyped data flows (`any`, implicit coercion) in mission-critical screens.

### Backend/Data (Convex)
- Schema design must include auditability and retention-aware entity history where required.
- All external integrations pass through typed adapters and validated payload boundaries.
- Query/index strategy must be documented per aggregate root (aircraft, work order, task card, etc.).

### Authentication/Authorization (Clerk)
- Clerk session identity is required on all protected routes and backend operations.
- Role/permission checks executed server-side in Convex; UI gating is secondary UX, not primary control.
- Tenant boundaries and org context must be explicit in function preconditions.

### CI/CD and Delivery (Vercel + GitHub Actions)
- Required checks before merge: typecheck, lint, unit tests, and targeted integration tests.
- Vercel preview deployments required for PR validation.
- Production deployment uses protected branch and explicit release approvals.

### Observability and Operational Readiness
- Standardized error and performance telemetry across web + Convex runtime.
- Structured logging with correlation IDs for user/session/action tracing.
- Alerting thresholds defined for error rate, latency regressions, and auth failure spikes.

## 4) Coding Standards (Mandatory)

### TypeScript Configuration
- `"strict": true` required.
- `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` recommended default.
- Avoid `any`; if unavoidable, isolate with explicit TODO/owner/date for removal.

### Schemas and Validation
- Runtime validation required at trust boundaries (client input, webhooks, imports).
- Convex validators and shared schema definitions must remain synchronized.
- No mutation executes without validated inputs and domain invariants.

### Testing Baseline
- Unit tests for core domain logic and utility transformations.
- Integration tests for Convex mutations/queries and auth-guarded flows.
- End-to-end smoke tests for critical user journeys (login, work order lifecycle, compliance record retrieval).
- Regression tests required for every bug class affecting compliance, data integrity, or authorization.

## 5) Immediate Engineering Directives by Role

### Rafael Mendoza (Product Architect / Tech Lead)
- Publish updated target architecture that explicitly maps TypeScript + Convex + Clerk + Vercel boundaries.
- Freeze cross-service abstractions that imply non-Convex backend patterns.
- Deliver a dependency and module ownership map for Phase 1 implementation.

### Chloe Park (Frontend)
- Establish TypeScript strict-mode frontend conventions and shared UI/domain typing patterns.
- Implement Clerk-aware route protection and typed session/org context usage in UI.
- Define component contracts to consume Convex data without untyped transforms.

### Devraj Anand (Backend / Convex)
- Finalize Convex schema and index plan aligned to required workflows and audit trails.
- Implement authorization middleware/patterns using Clerk identity in Convex functions.
- Set migration/versioning approach for schema evolution with compatibility safeguards.

### Tanya Birch (Mobile/Field Workflow)
- Confirm mobile/web shared TypeScript model boundaries and offline-safe sync assumptions.
- Document required Convex data shapes for offline conflict resolution and replay.
- Validate Clerk token/session handling constraints for field workflows.

### Jonas Harker (DevOps / Platform)
- Implement CI gates (typecheck/lint/test) and enforce branch protections.
- Standardize Vercel preview and production deployment workflows.
- Define secrets management and environment promotion model for Clerk/Convex/Vercel.

### Cilla Oduya (QA)
- Build stack-aligned test strategy: typed contract tests, authz tests, regression matrix.
- Add mandatory test evidence mapping for compliance-critical paths.
- Establish release-blocking criteria for type safety, auth failures, and data integrity defects.

### Marcus Webb (Regulatory / Compliance)
- Translate FAA recordkeeping obligations into explicit data and audit requirements within Convex models.
- Review auth/access model for least privilege and inspection-readiness.
- Sign off on retention, traceability, and retrieval criteria before Phase 2 feature expansion.

## 6) Execution Order (Next 5 Working Days)
1. Architecture alignment session and ownership confirmation.
2. Repo baseline enforcement (`tsconfig`, lint/test rules, CI gates).
3. Convex schema + Clerk auth contract implementation.
4. Vercel preview/production pipeline hardening.
5. Compliance + QA readiness checkpoint and go/no-go for next phase.

---
**Directive classification:** Hard requirement (no discretionary interpretation).  
**Change control:** Any exception requires documented rationale, owner, impact analysis, and explicit approval.
