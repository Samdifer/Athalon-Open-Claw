# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **phase-based simulation project** documenting the full product development lifecycle of **Athelon**, an FAA Part 145-compliant aircraft maintenance MRO SaaS platform. The repo contains 32+ numbered phase directories, each with detailed specs, implementation artifacts, test matrices, and gate reviews — not a single deployable app root.

The mandated production stack lives in `artifacts/technical-requirements-001-platform-stack.md` and is non-negotiable.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode — `"strict": true`, no `any`) |
| Frontend | Next.js (App Router) + React 18 |
| Backend | Convex (serverless functions, schema-driven DB) |
| Auth | Clerk (JWT role claims, multi-tenant org support) |
| Styling | Tailwind CSS |
| Deployment | Vercel (preview per branch, protected main) |

## Project Structure

```
/artifacts/                   — Platform specs and technical requirements
/phase-NN-<name>/             — Sequential development phases (1–32+)
  convex/                     — Backend schema, mutations, queries
  web/                        — Next.js pages and React components
  wsNN-plan.md                — Workstream plan for the phase
  wsNN-{a,b,c,...}.md         — Workstream artifacts (specs, tests, reviews)
/reviews/                     — Phase gate review verdicts
/team/                        — 11-person team member profiles
/dispatches/                  — Field journalist reports (Miles Beaumont)
ORCHESTRATOR-LOG.md           — Master phase log with team roster and summaries
SIMULATION-STATE.md           — Current active phase and live production status
```

The canonical schema is in `phase-5-implementation/convex/schema-v3.ts`. The frozen invariant list is in `phase-1-data-model/convex-schema-v2.md`.

## Build & TypeScript

The implementation files use this tsconfig shape (from `phase-4-implementation/tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "noEmit": true,
    "moduleResolution": "node"
  }
}
```

CI gates (per technical mandate): typecheck → lint → unit/integration tests → Vercel preview → protected branch merge.

## Core Architecture

### Data Integrity Model

Three immutability classes enforced by Convex mutations:

- **Immutable records** (`maintenanceRecords`, `inspectionRecords`, `returnToService`, `auditLog`) — never modified after creation.
- **Append-only history** (`adCompliance`, `discrepancies`) — changes create new records, not updates.
- **Signature binding** — every sign-off creates a `signatureAuthEvent` (5-min TTL, one-time use) that is atomically consumed by the domain mutation. Signature hash is deterministic over canonical JSON.

### Key Invariants (enforced in mutations)

- **INV-01**: Work order status transitions are unidirectional — no backtracking through the lifecycle.
- **INV-05**: `signatureAuthEvent` consumed exactly once, sets both `consumedByTable` and `consumedByRecordId` atomically with audit log entry.
- **INV-06/INV-19**: WO closure requires aircraft hours ≥ at-open hours, all task cards signed, zero open discrepancies, and a valid RTS record.
- **INV-16**: `"corrected"` discrepancy status requires `correctiveAction` text and a linked signed `maintenanceRecord`.
- **INV-17**: MEL expiry is computed from category interval server-side — never accepted from the caller.
- Every signing mutation is atomic with its `auditLog` entry.

### Sign-Off Ceremony (3-phase)

1. User initiates sign-off → PIN authentication challenge
2. Successful PIN auth → creates `signatureAuthEvent` (5-min TTL)
3. Domain mutation consumes auth event + writes domain record + writes audit log (all in one Convex transaction)

### Backend (Convex) Key Tables

`aircraft`, `workOrders`, `taskCards`, `taskCardSteps`, `adCompliance`, `parts`, `discrepancies`, `maintenanceRecords`, `inspectionRecords`, `returnToService`, `technicians`, `certificates`, `auditLog`, `signatureAuthEvents`, `engines`

### Frontend (Next.js) Key Domains

Work Orders, Task Cards, AD Compliance, Discrepancies, Parts Traceability, Return to Service (RTS), Fleet/Aircraft, role-based dashboards (DOM, technician, inspector, QA manager).

## Regulatory Context

This platform targets **FAA 14 CFR Part 145** repair station certification. Every data model decision prioritizes producing records that survive an FAA ramp check or FSDO audit. The guiding principle throughout the codebase: *"The defensible path must be the default path."*

AD (Airworthiness Directive) compliance tracking, MEL (Minimum Equipment List) deferral logic, and Part 8130-3 parts traceability are first-class domain concepts — treat them with corresponding care when making schema or mutation changes.

## Active State

As of Phase 32 (v1.4.0 release), three shops are live (RMTS, LSR, Ridgeline). Seven total in pipeline. See `SIMULATION-STATE.md` for current workstream status and `ORCHESTRATOR-LOG.md` for full phase history.
