# Phase 2 Gate Review — Athelon
**Reviewer:** Engineering Team Leader / Systems Orchestrator
**Date:** 2026-02-22
**Phase:** 2 — Core Feature Modules
**Gate Decision:** CONDITIONAL PASS

---

## Executive Summary

Phase 2 delivered six workstream artifacts that collectively define the mutation layer, frontend architecture, and compliance enforcement for Athelon's core feature set. The output is substantial: approximately 80 mutation specifications, a complete Next.js App Router structure, a full AD compliance module with supersession chain handling, parts traceability with 8130-3 structured storage, a task card execution engine with dual sign-off modeling, and a sign-off/RTS flow with nine preconditions and typed error codes.

**The gate decision is CONDITIONAL PASS.** The specs are architecturally sound and regulatorily thorough. However, Phase 2 produced three schema extension requests that are not yet in the frozen v2 schema, seven high-priority backlog items that must be resolved before end-to-end smoke tests can pass, and four open regulatory questions awaiting Marcus Webb's determination. None of these are design failures — they are the natural consequence of building mutation-layer specs against a real regulatory domain. The foundation from Phase 1 held. The enforcement layer from Phase 2 is correctly shaped but incomplete in specific, documented areas.

### Top 3 Strengths

1. **Mutation-layer regulatory enforcement is genuine.** Every critical mutation (`completeStep`, `authorizeReturnToService`, `recordAdCompliance`, `installPart`) has explicit guard sequences that map to specific CFR citations. Marcus Webb's inline annotations transform these from code specs into regulatory compliance artifacts. The `signatureAuthEvent` lifecycle — six-check atomic consumption — is the kind of design that survives an FAA digital recordkeeping audit.

2. **The parts traceability chain is complete from origin to installed position.** The `getPartTraceabilityChain` query resolves the full chain: 8130-3 → part record → installation history → work order → maintenance record → technician certificate. The `chainComplete` boolean and `chainGaps` array give both the UI and auditors immediate visibility into documentation gaps. The 8130-3 Block 12 → part life synchronization logic correctly computes accumulated hours from the tag's remaining-life declaration — this is the exact calculation that competitors get wrong.

3. **Frontend architecture is production-ready and convention-enforced.** Chloe Park's Next.js App Router structure, Convex integration patterns, and TypeScript conventions (strict mode, exhaustive status switches, `noUncheckedIndexedAccess`) create a codebase that will catch regulatory status-handling gaps at compile time. The sign-off wizard's six-step linear flow with blocking condition detection at Step 1 prevents wasted IA time — fail fast in the UI, not at the mutation layer.

### Top 3 Risks

1. **Three schema extensions are required but not yet approved.** The task card execution engine requires `taskCardStepCounterSignatures`, `taskCardInterruptions`, and `taskCardStepAssignments` tables. These are documented as Phase 2.1 extension requests. Until they exist, dual sign-off enforcement, interruption tracking, and step-level assignment are implemented via audit log workarounds — not first-class schema constructs. This is technical debt with regulatory exposure.

2. **Cycle tracking is a known gap across multiple modules.** The AD compliance module references cycle-based ADs. The parts traceability module stores cycle fields but cannot compute remaining cycles without an aircraft cycle counter. The work order engine captures `aircraftCyclesAtClose` as optional. For turbine and Part 121 operations, cycle-based limits are primary — not secondary. This gap limits Athelon's addressable market until resolved.

3. **Seven high-priority backlog items (BACK-P2-*) remain unimplemented.** Several are Marcus-flagged: open interruptions blocking WO close (BACK-TC-08), RTS hours verification (BACK-P2-07), and the `submitForInspection` / `flagOpenDiscrepancies` state transitions (BACK-P2-05). These are not deferred features — they are gaps in the state machine that will surface as bugs or compliance failures during smoke testing.

---

## Phase 2 Scorecard

| Workstream | Owner(s) | Quality | Notes |
|---|---|---|---|
| **Work Order Engine** | Rafael Mendoza, Devraj Anand | **A-** | Complete state machine with 10 states and guard conditions at every transition. Six core mutations fully specified with TypeScript. `closeWorkOrder` precondition set is thorough (14 checks). Loses the A on deferred transitions (`placeOnHold`, `submitForInspection`, `flagOpenDiscrepancies`) and the `cancelWorkOrder` gap. BACK-P2-07 (RTS hours verification) is Marcus-flagged and must not slip. |
| **Frontend Architecture** | Chloe Park, Finn Calloway | **A** | Production-grade Next.js App Router structure. Three-layer auth (Clerk middleware → layout org check → Convex server-side). Convex `useQuery` patterns are correct — reactive subscriptions eliminate polling. Optimistic updates scoped appropriately (time logging yes, sign-off no). Week-by-week sprint plan is realistic. Component priority order (StatusBadge → WO engine → Parts → Compliance) is correct. |
| **AD Compliance Module** | Marcus Webb, Devraj Anand | **A** | The strongest regulatory artifact in Phase 2. AD applicability determination, compliance status definitions, recurring interval computation, supersession chain handling, and RTS blocking logic are all specified to CFR-citation depth. The `checkAdDueForAircraft` query correctly uses live aircraft hours for overdue determination rather than cached fields. Four outstanding items are documented and appropriately scoped. |
| **Parts Traceability** | Devraj Anand, Nadia Solis | **A-** | Complete part lifecycle state machine with six locations and explicit guard sequences on every transition. 8130-3 structured storage (19 blocks mapped to typed fields) is best-in-class. Life-limited part tracking with cross-installation accumulation is correct. Loses the A on four open regulatory questions (Q1–Q4) pending Marcus review, and the cycle tracking gap. The `partMaintenanceLinks` junction table deferred to Phase 3 is a performance risk for high-volume shops. |
| **Task Card Execution** | Rafael Mendoza, Devraj Anand | **B+** | Step-level execution model is architecturally correct — card status derived from steps, not independently set. `completeStep` mutation is the most thoroughly specified mutation in the entire Phase 2 corpus. However, three schema extensions (counter-signatures, interruptions, step assignments) are required but not in v2. Ten backlog items (BACK-TC-01 through BACK-TC-10), six of which are high priority. The `reviewNAStep` and `counterSignStep` mutations are specified but not implemented — these block annual inspection workflows. |
| **Sign-Off / RTS Flow** | Marcus Webb, Chloe Park | **A** | Nine preconditions for `authorizeReturnToService`, each with a typed error code and resolution path. IA vs. A&P authorization distinctions are regulatorily precise (March 31 expiry rule, 24-month recent experience, rating verification). Frontend sign-off wizard is a six-step linear flow with blocking condition surfacing at Step 1. Hash computation for tamper detection. Six open items (OI-01 through OI-06) are documented — OI-02 (Form 337 reference field) requires a schema change. |

---

## Blocker Consolidation

All open questions, schema gaps, backlog items, and Phase 2.1 requirements identified across the six workstream artifacts, consolidated and deduplicated.

### Schema Extension Requests (Phase 2.1 — Gates Dual Sign-Off and Interruption Tracking)

| ID | Table | Source | Owner | Priority |
|---|---|---|---|---|
| **SE-01** | `taskCardStepCounterSignatures` | Task Card Execution §3.1 | Devraj + Cilla | **Critical** — blocks annual inspection dual sign-off |
| **SE-02** | `taskCardInterruptions` | Task Card Execution §3.2 | Devraj + Cilla | **High** — blocks shift-change compliance |
| **SE-03** | `taskCardStepAssignments` | Task Card Execution §2.2 | Devraj | Medium — workaround via audit log exists |

### Unimplemented Mutations (Specified but Not Built)

| ID | Mutation | Source | Priority |
|---|---|---|---|
| **UM-01** | `reviewNAStep` (IA review of N/A-marked steps) | BACK-TC-04 | **High** — blocks `incomplete_na_steps` resolution |
| **UM-02** | `counterSignStep` (dual sign-off execution) | BACK-TC-05 | **High** — blocks annual inspections |
| **UM-03** | `interruptStep` / `resumeStep` (full implementation) | BACK-TC-06 | **High** — blocks shift-change compliance |
| **UM-04** | `voidTaskCard` | BACK-TC-07 | Medium |
| **UM-05** | `placeWorkOrderOnHold` / `releaseWorkOrderHold` | BACK-P2-03 | High |
| **UM-06** | `submitForInspection` / `flagOpenDiscrepancies` | BACK-P2-05 | High |
| **UM-07** | `cancelWorkOrder` | WO Engine §1 | Medium |
| **UM-08** | `createAdCompliance` (full mutation spec) | AD Compliance §Outstanding Item 4 | **High** — entry point for AD compliance chain |

### Open Regulatory Questions (Pending Marcus Webb)

| ID | Question | Source | Impact |
|---|---|---|---|
| **RQ-01** | Shelf-life override policy for installed parts — uniform block vs. category-specific rules | Parts §7 Q1 | Affects `installPart` guard behavior |
| **RQ-02** | Cycle counter requirement timing — when to mandate cycle data entry | Parts §7 Q2 | Affects aircraft creation and LLP workflows |
| **RQ-03** | Multi-tag parts quantity validation — warn vs. hard-block on exceeding 8130-3 quantity | Parts §7 Q3 | Affects `receivePart` bulk mode |
| **RQ-04** | OSP parts with CoC but no 8130-3 — acceptable documentation alternatives | Parts §7 Q4 | Affects INV-07 enforcement for owner-supplied parts |
| **RQ-05** | Ratings-exercised inference — technician choice vs. system-inferred from task type | Sign-Off OI-01 | Affects step sign-off UX |
| **RQ-06** | RTS statement minimum content — keyword check (must contain "14 CFR") vs. character floor only | Sign-Off OI-04 | Affects `authorizeReturnToService` validation |

### High-Priority Backlog Items (Must Resolve Before Smoke Tests)

| ID | Item | Source | Owner |
|---|---|---|---|
| **BP-01** | Open interruptions (resumedAt null) must block `closeWorkOrder` | BACK-TC-08, Marcus-flagged | Devraj |
| **BP-02** | Verify `rts.aircraftHoursAtRts == wo.aircraftTotalTimeAtClose` in `closeWorkOrder` | BACK-P2-07, Marcus-flagged | Devraj |
| **BP-03** | `adComplianceId` field on `taskCards` for AD compliance task tracking | BACK-P2-01 | Devraj |
| **BP-04** | Life-remaining recomputation trigger at WO close | BACK-P2-04 | Devraj |
| **BP-05** | Form 337 reference field — schema does not support major repair/alteration blocking | Sign-Off OI-02 | Devraj |
| **BP-06** | `getTaskCardAuditTrail` query for FAA export | BACK-TC-09 | Devraj |
| **BP-07** | FAA DRS feed integration spec (retry, conflict resolution, confidence queue) | AD Compliance Outstanding Item 2 | Devraj + Marcus |
| **BP-08** | Ferry permit AD exception path design | AD Compliance Outstanding Item 1 | Marcus + Rafael |
| **BP-09** | Re-auth modal Clerk→Convex→frontend push mechanism | Sign-Off OI-03 | Jonas + Chloe |

### Frontend Open Items

| ID | Item | Source | Owner |
|---|---|---|---|
| **FE-01** | Multi-inspector dual sign-off UX — wizard sequence for airframe+powerplant+IA | Sign-Off OI-05 | Chloe |
| **FE-02** | Aircraft record portability on customer change during WO | Sign-Off OI-06 | Marcus + Rafael |
| **FE-03** | "Remove and Red Tag" combined UI action (two mutations in sequence) | Parts §2.4, Nadia note | Chloe + Tanya |
| **FE-04** | Squawk create fast path (≤4 taps) | Frontend §3 Wave 3 | Chloe |

---

## Gate Decision

### **CONDITIONAL PASS**

**Rationale:** The six Phase 2 workstream artifacts collectively define a mutation layer, frontend architecture, and compliance framework that is architecturally sound and regulatorily defensible. The data model from Phase 1 has proven structurally adequate — no fundamental schema redesign was required. The enforcement gap identified in Phase 1 (between "the schema allows it" and "the mutation prevents it") has been substantially closed: guard sequences, typed error codes, and audit trail writes are specified for every critical path.

However, three conditions prevent a clean PASS:

1. **Schema extensions SE-01 through SE-03 are not yet in the frozen schema.** Dual sign-off (annual inspections) and interruption tracking (shift-change compliance) cannot be implemented without them. These must be approved and added before the corresponding mutations can be built.

2. **Eight high-priority unimplemented mutations (UM-01 through UM-08)** leave gaps in the state machine. The work order engine cannot reach `pending_inspection` or `on_hold`. Task cards cannot resolve `incomplete_na_steps`. Annual inspections cannot complete dual sign-off. These gaps will cause smoke test failures on critical paths.

3. **Six open regulatory questions (RQ-01 through RQ-06)** affect mutation guard behavior. Until Marcus rules on these, the affected mutations cannot be finalized. None are architectural — all are policy decisions that translate to boolean flags or threshold values in existing guard sequences.

**Conditions for Phase 3 start:**

1. Schema extensions SE-01 and SE-02 approved by Cilla and added to schema. Target: Phase 3 Day 2.
2. Marcus Webb provides determinations on RQ-01 through RQ-06. Target: Phase 3 Day 3.
3. BP-01 and BP-02 (Marcus-flagged close guards) implemented and tested. Target: Phase 3 Day 5.
4. BP-09 (re-auth modal mechanism) resolved between Jonas and Chloe. Target: Phase 3 Day 3.

Phase 3 work may proceed in parallel with condition resolution — the conditions affect specific workstreams, not the entire phase.

---

## Phase 3 Scope Definition

### What Phase 3 Is

Phase 3 is **Integration & Smoke Testing** — wiring the Phase 2 mutation specs into working Convex mutations, connecting them to the frontend screens, and running the five critical smoke test paths end-to-end. Phase 3 ends when the preview deployment is accessible to the full team and all smoke tests pass.

### Phase 3 Workstreams and Owners

| Workstream | Owner | Scope | "Done" Looks Like |
|---|---|---|---|
| **Schema v2.1 Extension** | Devraj Anand + Cilla Oduya | Add `taskCardStepCounterSignatures`, `taskCardInterruptions`, `taskCardStepAssignments` tables. Add `adComplianceId` to `taskCards`. Add Form 337 reference field. Cilla reviews all extensions against test matrix. | Schema v2.1 committed. All new tables indexed. Cilla signs off on testability. |
| **Mutation Implementation** | Devraj Anand | Implement all specified mutations from Phase 2 specs in Convex. Priority order: WO lifecycle → task card execution → parts → AD compliance → RTS. Include all guard sequences, audit trail writes, and `signatureAuthEvent` consumption. | Every mutation passes Cilla's test matrix. No mutation accepts an invalid state. INV enforcement verified. |
| **Frontend Integration** | Chloe Park + Finn Calloway | Wire Phase 2 frontend architecture to live Convex mutations. Dashboard with real-time subscriptions. WO list/detail. Task card detail with step sign-off. Parts module (receiving, inventory, installation). Sign-off wizard connected to `authorizeReturnToService`. | Five smoke test paths pass in preview deployment. Finn signs off on visual fidelity. |
| **Auth & Platform Wiring** | Jonas Harker | Clerk↔Convex webhook live. `signatureAuthEvent` creation from Clerk re-auth webhook. `requireUser`, `requireOrgContext`, `requireOrgMembership` helpers on every protected mutation. Re-auth modal → Convex push mechanism operational. | Auth test suite passes. Re-auth produces valid `signatureAuthEvent` consumed by signing mutations. |
| **Mobile Adaptation** | Tanya Birch | Mobile layout for all Phase 3 screens. 60px touch targets verified. Sign-off flow on iPhone Safari. Bottom tab bar. Offline detection and `OfflineBanner` wired. | Sign-off flow works on iPhone 15 Safari. Touch target audit passes. |
| **Compliance Validation** | Marcus Webb | Resolve RQ-01 through RQ-06. Review implemented mutations for regulatory correctness. Validate audit trail completeness against simulated FAA inspection scenario. Verify AD compliance blocking logic in RTS flow. | Marcus signs off that a simulated FAA Part 145 surveillance inspection against Phase 3 data would pass. |
| **QA & Smoke Tests** | Cilla Oduya | Implement test matrix from Phase 2 specs (TC-WO-*, TC-TC-*, INV-* tests). Run five critical smoke test paths. Verify schema extension testability. Regression test Phase 1 blocker resolutions. | 100% of blocker-derived and invariant test cases pass. Five smoke test paths green. No known-defect exceptions. |

### Phase 3 Exit Criteria

- Five smoke test paths pass end-to-end in staging: (1) sign-in + org switch, (2) create and open work order, (3) add task card + sign steps, (4) parts receive + install, (5) RTS sign-off flow
- Schema v2.1 committed with all Phase 2.1 extensions
- Every mutation has auth guard + invariant enforcement + audit trail write
- Marcus compliance sign-off on implemented mutations
- Cilla test matrix green — no exceptions
- Re-auth → `signatureAuthEvent` → mutation consumption chain works end-to-end
- Preview deployment accessible to full team for review

---

## Team Observations

**Rafael Mendoza:** The work order engine and task card execution specs are Rafael's best work — precise, traceable, and regulatorily grounded. His preambles set the right tone: these are contracts, not suggestions. The state machine diagrams are authoritative. Watch for: the task card execution engine's dependency on three schema extensions creates a critical path through Devraj and Cilla that Rafael cannot unblock alone.

**Chloe Park:** The frontend architecture document demonstrates production-level Next.js expertise applied to a regulatory domain. The three-layer auth model, optimistic update scoping decisions, and TypeScript strictness conventions are all correct choices that will prevent entire categories of bugs. Her sign-off wizard design (blocking conditions surfaced at Step 1) is the right UX pattern for high-stakes flows.

**Devraj Anand:** Devraj carries the heaviest Phase 3 load — every workstream depends on his mutation implementations. The parts traceability module and AD compliance module show his ability to translate regulatory requirements into clean mutation guard sequences. The 8130-3 Block 12 life synchronization logic is particularly well-handled. Risk: he is a single point of failure for the mutation layer.

**Marcus Webb:** Marcus's contributions to Phase 2 are embedded across four of the six workstream artifacts. His regulatory annotations on `completeStep`, `authorizeReturnToService`, and `recordAdCompliance` are what make these specs FAA-defensible rather than merely functional. Six open regulatory questions need his determination before Phase 3 mutations can be finalized — this is the appropriate bottleneck.

**Nadia Solis:** Nadia's product rationale in the parts traceability module grounds every technical decision in shop-floor reality. Her notes on the `removed_pending_disposition` state, the low-remaining-life override, and the bulk receive UX for multi-tag parts are exactly the kind of input that prevents engineers from building paternalistic systems that shops work around.

**Jonas Harker:** The re-auth modal → `signatureAuthEvent` creation mechanism (OI-03 / BP-09) is Jonas's critical deliverable for Phase 3. The current proposal (Clerk webhook → Convex insert → frontend `useQuery` poll) is acceptable but must be proven end-to-end. This is the single piece of platform plumbing that gates the entire sign-off flow.

**Cilla Oduya:** Cilla's influence is visible in the invariant-to-test-case tables across the work order engine (7 test cases) and task card execution engine (17 test cases). These tables are the contract between spec and implementation. Phase 3 QA depends on her test matrix being comprehensive — the Phase 2 specs give her enough to build it.

**Finn Calloway:** Finn's inline annotations in the frontend architecture (`[FC]` blocks) demonstrate a designer who understands the regulatory implications of UI decisions. His note on sign-off confirmation rendering only after server confirmation (not optimistically) is a safety-critical UX decision that most designers would miss.

---

*This document is the canonical record of the Phase 2 gate review. All Phase 3 work traces back to the decisions and conditions documented here.*
