# CAMP Systems Research Synthesis + Implementation Plan (Athelon)

Date: 2026-03-06  
Owner: Jarvis  
Inputs:
- `knowledge/research/camp-systems/TEAM-1-CAMP-FEATURE-INVENTORY.md`
- `knowledge/research/camp-systems/TEAM-2-WORKFLOW-COMPLIANCE-ANALYSIS.md`
- `knowledge/research/camp-systems/TEAM-3-INTEGRATIONS-AND-DATA-FLOWS.md`
- `knowledge/research/camp-systems/TEAM-4-MARKET-UX-PRICING-INTEL.md`

---

## 1) Executive Summary

CAMP’s differentiator is not just feature count; it is an **operating model**:
1. high-confidence due/compliance tracking,
2. service-heavy analyst support,
3. integration-centric data authority,
4. ecosystem coupling (notably CAMP↔Corridor narratives).

Athelon can compete by delivering:
- stronger execution UX,
- transparent implementation velocity,
- traceable compliance workflows,
- selective integration parity without CAMP lock-in.

This plan defines a two-stage program:
1) **Research completion package** (already delivered in repo),
2) **Implementation roadmap** to convert CAMP intelligence into buildable Athelon features.

---

## 2) CAMP Capability Model (Synthesis)

### A) Core maintenance-tracking strengths to emulate
- Multi-interval due tracking (days/hours/cycles)
- Recurring task visibility and calendarized planning
- Due-list → work-order planning flow
- AD/SB lifecycle handling with compliance state
- Mobile field execution support and discrepancy capture
- Document-backed compliance records traceability

### B) Ecosystem strengths to neutralize
- Integration-driven reduction of duplicate entry
- Operator↔MRO handoff workflow coherence
- Per-aircraft data authority model (counter synchronization rigor)

### C) Common user pain signals to exploit competitively
- Partial-adoption complexity and training burden
- Mobile/web parity inconsistencies in incumbent tools
- Procurement opacity / services-heavy dependency

---

## 3) Athelon Implementation Roadmap (CAMP Parity+)

## Wave C1 — Compliance Data Authority Foundation (P0)
Goal: Make Athelon’s due/compliance state deterministic and audit-traceable.

Build:
1. Unified due-engine policy (hours/cycles/days + recurrence) for aircraft/task/AD lines
2. Compliance event ledger (append-only mutation events for due state transitions)
3. AD/SB state machine hardening (`identified -> assessed -> applicable -> scheduled -> complied -> recurring-next`)
4. Cross-entity “source of truth” policy for counters (airframe/engine/APU)

Artifacts:
- `convex/complianceLedger.ts` (new)
- `convex/dueEngine.ts` (new)
- `knowledge/plans/ops/compliance-state-machine.md` (new)

Acceptance:
- deterministic recompute from event history
- no silent overwrites on counters
- audit replay proves current state

---

## Wave C2 — CAMP-Style Planning Flow (P0)
Goal: Operational parity for planner workflow.

Build:
1. Due-list workbench with grouped events and horizon filters
2. One-click monthly plan generation from due list (draft WOs/task packages)
3. Recurring item projection view with conflict markers
4. Planner “what changed” diff panel (since last plan)

Artifacts:
- `app/(app)/scheduling/due-list/page.tsx` (new)
- `convex/planningFromDueList.ts` (new)

Acceptance:
- planner can go due-list -> plan -> WO package in one flow
- recurring tasks visible with next-run confidence window

---

## Wave C3 — Compliance Records Traceability Upgrade (P0)
Goal: Match CAMP’s records confidence while keeping Athelon UX modern.

Build:
1. Record bundle model per completed task (who/what/when/evidence/hash)
2. AD/SB closure package generation (structured evidence packet)
3. Transfer-ready records export profile (ownership transition bundle)
4. RTS preflight integrity checker (hard blocks + explainable fails)

Artifacts:
- `convex/recordsBundle.ts` (new)
- `app/(app)/compliance/records-bundles/page.tsx` (new)

Acceptance:
- each sign-off has complete, queryable evidence chain
- export package reproducible + hash-verifiable

---

## Wave C4 — Integration Parity Layer (P1)
Goal: Neutralize CAMP ecosystem lock-in pressure.

Build:
1. External sync gateway for counters + due-list exchange contracts
2. Tail-level integration enablement and health dashboard
3. Conflict/reconciliation queue for mismatched counters/IDs
4. Operator-MRO handoff API contract (read-only then bidirectional)

Artifacts:
- `convex/integrations/maintenanceSync.ts` (new)
- `app/(app)/integrations/maintenance-sync/page.tsx` (new)
- `knowledge/plans/integrations/camp-compat-contract.md` (new)

Acceptance:
- no blind sync writes
- every external update has provenance + reconciliation status

---

## Wave C5 — Mobile + Adoption Advantage (P1)
Goal: Win where incumbents get mixed UX feedback.

Build:
1. Task-card mobile execution parity checklist
2. Offline read + deterministic write-guard messaging (already started via PWA wave)
3. Role-specific onboarding pathways (planner, lead tech, qc, parts)
4. Adoption telemetry dashboard (module utilization, friction hotspots)

Acceptance:
- measured reduction in failed/abandoned workflows
- role-path onboarding completion metrics

---

## Wave C6 — Commercial Differentiation Layer (P2)
Goal: Product + go-to-market edge vs quote-heavy incumbents.

Build:
1. Transparent feature-tier matrix tied to delivered modules
2. Migration toolkit (import templates + data quality checks + dry-run reports)
3. Competitive switch playbook support pages for sales/implementation

Acceptance:
- migration risk scored before go-live
- implementation timeline predictability artifact produced per customer

---

## 4) Priority Backlog (Immediate)

Top immediate backlog items (next execution sprint):
1. Compliance event ledger + due-engine contract (C1)
2. Due-list workbench + monthly plan generator (C2)
3. Records bundle baseline + AD/SB closure package (C3)

---

## 5) Risks & Mitigations

1. **Regulatory interpretation drift**
   - Mitigation: lock explicit state-machine rules + policy docs in repo.
2. **Integration brittleness from external IDs/counters**
   - Mitigation: reconciliation queue + immutable sync logs.
3. **Adoption failure from role complexity**
   - Mitigation: role-based onboarding + telemetry.
4. **Scope sprawl from “full parity” ambitions**
   - Mitigation: strict wave gates, measurable acceptance per wave.

---

## 6) Definition of Done for CAMP Program

Program complete when:
- C1–C3 pass technical + compliance traceability gates,
- at least one external sync contract operational (C4 MVP),
- mobile/adoption telemetry shows measurable UX advantage (C5),
- migration toolkit + transparent packaging are shippable (C6).

---

## 7) Expanded Regulatory Edge-Case Framework (FAR-Focused)

Primary objective remains AMM Chapter 4/5 DO-item handling (see Section 8), but we will harden for regulatory edge cases across applicable FAA contexts.

### Regulatory lenses to explicitly test against
- **14 CFR Part 43** (maintenance record/sign-off requirements)
- **14 CFR Part 91.417** (maintenance records retention/transfer)
- **14 CFR Part 135.439 / 135.443 / 135.445** (maintenance records and status continuity in ops context)
- **14 CFR Part 145.209 / 145.211 / 145.219** (repair station procedures, manuals, and records)

### FAR edge-case test classes
1. **Deferred vs overdue boundary** (due now, grace logic, no silent auto-compliance)
2. **Counter corrections/reversals** (bad flight-hour uploads, engine swap effects)
3. **Ownership transfer record integrity** (continuing status package completeness)
4. **Sign-off chain integrity** (role/rating/inspection prerequisites)
5. **Document mutation after sign-off** (immutability + supersession policy)
6. **Split responsibility events** (operator-provided data vs shop-entered compliance)

### Required output artifacts
- `knowledge/plans/ops/far-edge-case-matrix-camp.md` (new)
- `knowledge/plans/ops/far-control-mapping-athelon.md` (new)

---

## 8) Primary Core Focus — AMM Chapter 4/5 DO-Item Handling (ATA-Coded)

This is the core research/implementation axis:

### Problem statement
Support simple, reliable handling of a wide variety of **DO items** originating from AMM Chapter 4/5 planning sections, tied to ATA coding and currently tracked in CAMP-style due/compliance systems.

### Canonical DO-item model (Athelon target)
Each DO item should support:
1. `ataChapter` / `ataSubchapter`
2. `sourceRef` (AMM chapter-section-task reference)
3. `intervalType` (hours/cycles/calendar/event)
4. `threshold` + `repeat`
5. `lastDoneAt` + `nextDueAt` + `nextDueCounter`
6. `complianceMethod` (performed/deferred/not-applicable/superseded)
7. `evidenceBundleId` (records and sign-off linkage)
8. `authorityContext` (operator, shop, mixed-source provenance)
9. `status` (`planned`, `due_soon`, `overdue`, `complied`, `blocked`, `deferred`)

### Core workflow to build and validate
1. Import/author ATA-coded DO-item definitions from planning source
2. Normalize into unified due-engine contract
3. Render in due-list workbench grouped by urgency + ATA
4. Generate monthly execution plan and WO/task seeds
5. Execute + sign off with evidence linkage
6. Recompute next due deterministically with full audit trail

### CAMP comparative research objective (targeted)
For each above step, produce:
- what CAMP appears to do,
- what data objects it likely depends on,
- what operator/shop failure modes appear in practice,
- Athelon implementation choice and rationale.

Required artifact:
- `knowledge/research/camp-systems/CAMP-DO-ITEMS-ATA-CH4-CH5-COMPARATIVE.md` (new)

---

## 9) Implementation Addendum — New Waves for DO-Item Parity

### Wave C0-DO (Research-to-spec bridge, immediate)
1. Define DO-item schema extension and ATA normalization rules
2. Build mapping table: AMM Ch4/5 references -> internal DO-item contract
3. Produce CAMP comparative matrix for each lifecycle stage

### Wave C1.5-DO (Engine extension)
1. Add DO-item recurrence evaluator (calendar + usage + mixed)
2. Add supersession/alternate-method handling
3. Add blocked-state reasons (missing evidence, invalid counters, role gate)

### Wave C2.5-DO (Planner UX extension)
1. Due-list filters by ATA and source chapter
2. Bulk-plan by ATA family (e.g., 21/24/27 groups)
3. Conflict heatmap by aircraft + ATA workload density

### Wave C3.5-DO (Records and audit)
1. DO-item closure packet template
2. Continuity report: last-done to next-due evidence chain
3. Exportable DO status report suitable for operator/share context

---

## 10) Updated Immediate Next Steps

1. Execute **C0-DO** as a short research+spec sprint (before broad C4/C5 expansion).
2. Integrate DO-item schema into C1/C2 foundations already underway.
3. Build FAR edge-case matrix in parallel and bind it to CI/regression tests.
4. Prioritize simple, deterministic workflow over advanced automation during initial rollout.

