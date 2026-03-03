# Phase 1 Gate Review — Athelon
**Reviewer:** Engineering Team Leader / Systems Orchestrator
**Date:** 2026-02-22
**Phase:** 1 — The Blank Page (Core Data Model & Foundation)
**Gate Decision:** GO WITH CONDITIONS

---

## Executive Summary

Phase 1 delivered a comprehensive foundation across five workstreams: data model, regulatory compliance, authentication/infrastructure, UX, and schema quality. The output is substantively stronger than expected for a team at this stage. The Convex schema captures the full 10-capability scope. The regulatory review is thorough and field-tested. The infrastructure design is production-ready in principle. The UX work is competitor-aware and environment-grounded.

**The gate decision is GO WITH CONDITIONS.** The conditions are specific: 16 blockers (8 regulatory, 8 QA) must be resolved before any mutation or feature code is written. These blockers are real — they represent states where the schema accepts data that would fail an FAA inspection or produce untestable invariants. None are architectural; all are resolvable within the existing design. The foundation is sound. The gaps are at the enforcement layer, not the structural layer.

### Top 3 Strengths

1. **Regulatory depth is genuine.** Marcus Webb and Rosa Eaton produced a regulatory requirements document that reads like an FAA advisory circular, not a software spec. The schema was designed against it. The compliance review found gaps — but the gaps exist because the bar was set correctly, not because it was ignored.

2. **UX is designed for the hangar, not the conference room.** Finn Calloway and Tanya Birch's work — 60px touch targets, glove-mode PIN entry, offline-first design, Zulu time on every signed record — reflects real field conditions. The competitive teardown by Nadia Solis anchors every UX decision in specific competitor failures. This is not theoretical design.

3. **Infrastructure is SOC 2-aware from day one.** Jonas Harker's deployment architecture, secrets management, CI/CD pipeline, and S3 Object Lock retention strategy mean we won't be retroactively rebuilding infrastructure for compliance. The SOC 2 gap analysis is honest about what's missing and sequenced correctly.

### Top 3 Risks

1. **16 unresolved blockers gate all feature development.** Until these are resolved, no mutations can be written and no features can ship. If blocker resolution drags past Day 7, Phase 2 timelines compress dangerously.

2. **Schema-to-mutation enforcement gap.** The schema is structurally sound but relies heavily on mutation-layer validation for compliance invariants (conditional required fields, monotonicity checks, state transition guards). None of this enforcement code exists yet. The gap between "the schema allows it" and "the mutation prevents it" is where compliance failures live.

3. **Offline capability is designed but unscoped for implementation.** Tanya's offline-first requirements are correct and well-specified, but the technical implementation (local cache, queue, conflict resolution, cryptographic local signing) is Phase 2+ work that hasn't been estimated. This is the feature most likely to slip or be descoped under pressure.

---

## Phase 1 Scorecard

| Workstream | Grade | Rationale |
|---|---|---|
| **Data Model** | **A-** | Rafael's architecture is structurally excellent — immutability principles, aircraft-centricity, time-awareness, and the 10-capability coverage are all correct. Devraj's schema translation is clean. Loses the "A" on conditional-required field enforcement gaps and the embedded `steps` array issue. |
| **Regulatory** | **A** | Marcus and Rosa's regulatory requirements document is the strongest artifact in Phase 1. The schema review found 8 blockers — all legitimate, all specific to CFR citations, all resolvable. The EASA forward-look is a bonus. |
| **Auth / Infrastructure** | **A-** | Jonas's Clerk↔Convex auth design is correct and well-documented. The Vercel deployment architecture, CI/CD pipeline, S3 retention, and secrets management are production-grade. Loses the "A" on SOC 2 gaps that must close before public beta (MFA enforcement, developer access controls, monitoring). |
| **UX** | **A** | Finn and Tanya produced a navigation architecture, component library, and information architecture that is directly responsive to competitor failures. The sign-off flow, density modes, and error state taxonomy are best-in-class for the domain. Nadia's competitive teardown is exceptional primary research. |
| **Schema Quality** | **B+** | Devraj's schema is clean and well-indexed. Cilla's QA review exposed real testability gaps: invariants-as-comments, missing indexes for multi-tenant queries, embedded arrays without audit granularity, and boolean+conditional field pairs that accept invalid states. The schema needs a revision pass before mutations are written. |

---

## Blocker Consolidation

Marcus's 8 regulatory blockers and Cilla's 8 QA blockers are merged below, grouped by theme, deduplicated where overlapping, and prioritized.

### Theme 1: Signing & Identity Integrity (Critical — Day 1–3)

| ID | Description | Source | Owner | Target |
|---|---|---|---|---|
| **B-01** | `signatureAuthEventId` is undefined — no spec for what it contains, how it's generated, or how it's verified. Blocks all signing mutations. | REG-005, QA-007 | Jonas + Devraj | Day 2 |
| **B-02** | `ratingsExercised` missing from `technicianSignature` — no capture of which A&P rating was exercised at signing. Required per 14 CFR 65.85/65.87. | REG-002 | Devraj | Day 2 |
| **B-03** | Correction records can be created without referencing what they correct — all correction fields are `v.optional()` even when `recordType == "correction"`. | REG-001 | Devraj | Day 2 |

### Theme 2: State Transition Guards (Critical — Day 2–4)

| ID | Description | Source | Owner | Target |
|---|---|---|---|---|
| **B-04** | `aircraftTotalTimeAtClose` optional on work orders — WO can close without recording total time. Violates 14 CFR 43.11(a)(2). | REG-006 | Devraj | Day 3 |
| **B-05** | Owner-supplied parts can be marked `installed` without `eightOneThirtyId` — violates 14 CFR 145.201. | REG-007 | Devraj + Marcus | Day 3 |
| **B-06** | `adComplianceReviewed: true` with empty `adComplianceReferenceIds` — inspection record certifies AD review with no ADs referenced. Add `notes` field. | REG-008 | Devraj + Marcus | Day 3 |
| **B-07** | `corrective_action` and `correctiveMaintenanceRecordId` not enforced when `disposition == "corrected"` — phantom corrections. | QA-006 | Devraj | Day 3 |

### Theme 3: Schema Structure (Important — Day 3–5)

| ID | Description | Source | Owner | Target |
|---|---|---|---|---|
| **B-08** | Embedded `steps` array in `taskCards` — inadequate audit granularity. Extract to `taskCardSteps` table. | QA-002 | Devraj + Rafael | Day 4 |
| **B-09** | `taskCards.status` enum disagrees with architecture doc (`voided` vs `incomplete_na_steps`). Blocks task card workflow testing. | QA-001 | Rafael + Devraj | Day 3 |
| **B-10** | `customers.aircraftIds` inverted relationship — will cause write conflicts. Move `customerId` to `aircraft` table. | QA-005 | Devraj | Day 4 |
| **B-11** | `adCompliance` allows orphaned records with no aircraft/engine/part linkage. Mutation must enforce at-least-one. | REG-003 | Devraj | Day 3 |

### Theme 4: Data Integrity & Testability (Important — Day 3–5)

| ID | Description | Source | Owner | Target |
|---|---|---|---|---|
| **B-12** | Three boolean+conditional-required pairs unenforced: `isLifeLimited`, `hasShelfLifeLimit`, `hasIaAuthorization` each allow invalid null states. | QA-003 | Devraj | Day 4 |
| **B-13** | No enforced uniqueness on `workOrders.workOrderNumber` within org. | QA-004 | Devraj | Day 3 |
| **B-14** | `organizations.directorOfMaintenance` and `qualityControlManager` are unverifiable strings — must link to `technicians`. | REG-004 | Devraj + Marcus | Day 5 |
| **B-15** | `melDeferralDate` missing — MEL expiry computation is untestable without source date. | QA-008 | Devraj | Day 4 |

### Non-Blocking but Required Before Phase 2 Feature Work

| ID | Description | Owner | Target |
|---|---|---|---|
| NB-01 | Add missing indexes: `by_engine` and `by_part` on `adCompliance`, `by_org_completion_date` on `maintenanceRecords`, `by_org_mel_expiry` on `discrepancies`, `by_org_next_due_date` on `adCompliance`, `by_org_event_type` on `auditLog`, `by_aircraft_date` on `inspectionRecords` | Devraj | Day 5 |
| NB-02 | Add `iaCurrentOnInspectionDate` to `inspectionRecords`, `dispositionedCertificateNumber` to `discrepancies` | Devraj + Marcus | Day 5 |
| NB-03 | Add `suspectStatus` enum to `eightOneThirtyRecords` | Devraj | Day 5 |
| NB-04 | Add `operatingRegulation: "pending_determination"` enum value to avoid silent null states | Devraj | Day 5 |
| NB-05 | Model squawks as a separate table (not free-text on work orders) | Rafael + Devraj | Day 5 |

---

## Gate Decision

### **GO WITH CONDITIONS**

**Conditions for Phase 2 start:**

1. **Blockers B-01 through B-15 resolved.** Schema revision committed, mutation enforcement documented, test stubs created. Target: Day 5.
2. **`taskCardSteps` extraction complete (B-08).** This is a structural change that becomes exponentially harder to make after mutations are written.
3. **`taskCards.status` enum aligned (B-09).** Rafael and Devraj resolve the discrepancy. One source of truth.
4. **Mutations spec document produced.** Before any mutation code, Devraj produces a mutations spec listing every mutation, its preconditions, its validation rules, and its audit trail writes. Cilla reviews. Target: Day 6.
5. **Non-blocking items (NB-01 through NB-05) tracked in backlog.** Must be complete before any feature touches those entities.

**Phase 2 work may begin on Day 6 if conditions 1–4 are met.** If any blocker from Theme 1 (Signing & Identity) remains open, Phase 2 does not start.

---

## Phase 2 Scope Definition

### What Phase 2 Is

Phase 2 is **Core Feature Build** — the first working mutations, queries, and UI screens that exercise the Phase 1 data model. Phase 2 ends when the five critical paths from the smoke test suite (sign-in, create work order, sign task card, view dashboard, org switch) are functional end-to-end.

### Phase 2 Workstreams and Owners

| Workstream | Owner | Scope | "Done" Looks Like |
|---|---|---|---|
| **Mutations Layer** | Devraj Anand | All CRUD + state transition mutations for: work orders, task cards, maintenance records, parts, discrepancies. Every mutation enforces the invariants documented in the mutations spec. | All mutations pass Cilla's test matrix. No mutation accepts an invalid state. |
| **Auth Integration** | Jonas Harker | Clerk↔Convex webhook live and tested. `requireUser`, `requireOrgContext`, `requireOrgMembership` helpers used in every protected mutation. Pre-action re-auth for signing. | Auth test suite passes: unauthenticated rejection, under-privileged rejection, success with minimum role — for every protected mutation. |
| **Core UI Screens** | Chloe Park + Finn Calloway | Dashboard, Work Order list/detail, Task Card detail, Fleet list/detail. Dark mode. Status badges. Navigation model. Search (basic). | Five smoke test paths pass in preview deployment. Finn signs off on visual fidelity. |
| **Mobile UX** | Tanya Birch | Mobile layout for all Phase 2 screens. 60px touch targets. Bottom tab bar. Sign-off flow (biometric + PIN). | Sign-off flow works on iPhone 15 in Safari. Touch targets verified. |
| **Compliance Validation** | Marcus Webb | Review every mutation for regulatory correctness. Validate that signing produces defensible records. Confirm audit trail completeness. | Marcus signs off that a simulated FAA inspection against Phase 2 data would pass. |
| **QA & Test** | Cilla Oduya | Test matrix for all mutations. Integration tests for critical paths. Schema invariant tests. | 100% of blocker-derived test cases pass. No known-defect exceptions. |

### Phase 2 Exit Criteria

- Five smoke test paths pass end-to-end in staging
- Every mutation has auth guard + invariant enforcement + audit trail write
- Marcus compliance sign-off
- Cilla test matrix green
- Preview deployment accessible to full team for review

---

## Team Observations

**Rafael Mendoza (Tech Lead / Architect):** Rafael's architecture document is the intellectual backbone of Phase 1. The design principles — immutable records, aircraft-centricity, time-awareness — are exactly right. His tendency to over-specify is an asset at this stage; the architecture doc will save us months of rework. Watch for: he needs to release control of the schema to Devraj for the revision pass rather than rewriting it himself.

**Devraj Anand (Backend / Convex):** Devraj translated a complex regulatory data model into a clean Convex schema on a compressed timeline. The schema is structurally sound — the issues found are at the enforcement layer, not the design layer. He anticipated several problems (embedded steps, immutability) in his own notes. He needs to be more vocal when he sees issues rather than noting them in comments.

**Marcus Webb (Regulatory):** Marcus's schema review is the most valuable single document in Phase 1. Every blocker is tied to a specific CFR citation. His EASA forward-look shows strategic thinking beyond the immediate sprint. He is exactly the person who should be slowing the team down right now.

**Cilla Oduya (QA):** Cilla found real bugs in a schema document — before any code was written. Her testability lens caught gaps that the regulatory review missed (boolean+conditional pairs, enum disagreements, inverted relationships). Her insistence on "if I can't write a test for it, it doesn't exist" is the right standard.

**Jonas Harker (DevOps / Platform):** Jonas delivered production-grade infrastructure design while everyone else was focused on the data model. The S3 Object Lock retention strategy, OIDC-based AWS access, and CI/CD pipeline are all correct. The Clerk↔Convex auth design is clean and well-documented. His SOC 2 gap analysis is honest.

**Nadia Solis (PM):** The competitive teardown is primary research, not desk research. Nadia's field interviews with DOMs and AMTs ground every product decision in real shop behavior. The PRD correctly scoped Phase 1 as "get the data model right" rather than "ship features."

**Finn Calloway (UX):** Finn's information architecture and component library spec are designed against specific competitor failures, not abstract principles. The density modes, sign-off flow, and error state taxonomy show a designer who understands that aviation software fails in the hangar, not in the Figma review.

**Tanya Birch (Mobile):** Tanya's mobile constraints — 60px targets, one-handed operation, offline-first — are non-negotiable and correct. Her insistence on bottom tab bar over hamburger menu will save us from the EBIS Web failure pattern.

---

## Open Questions

1. **Squawk data model:** Squawks are currently free-text on work orders. Rafael and Devraj must decide whether squawks become a first-class table before Phase 2 feature work on the intake workflow. Recommendation: yes — model them now.

2. **Offline implementation scope for Phase 2:** Tanya's offline design is complete, but the implementation (service worker, local cache, conflict resolution) is unestimated. Must be scoped and either included in Phase 2 or explicitly deferred to Phase 3 with a documented rationale.

3. **`signatureAuthEventId` specification:** Jonas and Devraj must define exactly what this field contains before any signing mutation is written. This is the single highest-priority open question.

4. **EASA support timeline:** Marcus flagged structural schema changes needed for EASA Part-66/Part-145 support. Product (Nadia) must decide whether EASA is Phase 4 or Phase 5 so the schema revision can plan for extensibility without over-engineering.

5. **Customer data migration tooling:** Nadia's competitive teardown identifies data migration as the #1 switching cost. When does Athelon build import tooling for Corridor and EBIS 5 data? This affects schema decisions (field naming, format flexibility).

6. **Pricing model validation:** The per-shop, per-month, all-features-included model from the competitive teardown needs customer validation. Doesn't affect Phase 2 engineering, but affects the `subscriptionTier` schema design.

---

*This document is the canonical record of Phase 1. All Phase 2 work traces back to the decisions and conditions documented here.*
