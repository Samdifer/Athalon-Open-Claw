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
