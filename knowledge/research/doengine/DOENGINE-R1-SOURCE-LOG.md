# DOENGINE R1 — Source Log

Date: 2026-03-06  
Topic: CAMP current handling + Athelon due engine/planning audit

## Confidence rubric used
- **Confirmed**: direct primary evidence in source text/code.
- **Likely**: supported by secondary/partner evidence or strong inference across multiple sources.
- **Unknown**: insufficient evidence in audited scope.

---

## A) Athelon code sources (primary)

1. `apps/athelon-app/convex/dueEngine.ts`  
   - Evidence: deterministic AD due snapshot computation, recompute query, lifecycle transition guards.  
   - Key lines: 35-60, 62-130, 140-175, 185-205.  
   - Reliability: **Confirmed**.

2. `apps/athelon-app/convex/planningFromDueList.ts`  
   - Evidence: due-list workbench, source type enum, maintenance program/event synthesis, AD include path, conflict flags, monthly plan generation to WOs and task cards.  
   - Key lines: 7-24, 53-229, 231-400.  
   - Reliability: **Confirmed**.

3. `apps/athelon-app/convex/adCompliance.ts`  
   - Evidence: signed AD compliance recording controls, live overdue determination against current aircraft hours, aircraft+engine+part aggregation.  
   - Key lines: 135-419, 671-760.  
   - Reliability: **Confirmed**.

4. `apps/athelon-app/convex/schema.ts`  
   - Evidence: `airworthinessDirectives`, `adCompliance`, `complianceLedgerEvents`, `counterReconciliationEvents`, `taskComplianceItems`, `maintenancePrograms`.  
   - Key lines: 1760-1801, 2065-2248, 2258-2283, 5306-5331.  
   - Reliability: **Confirmed**.

5. `apps/athelon-app/convex/maintenancePrograms.ts`  
   - Evidence: CRUD + due projection logic for maintenance programs and ATA chapter fields.  
   - Key lines: 33-184.  
   - Reliability: **Confirmed**.

6. `apps/athelon-app/convex/taskCompliance.ts`  
   - Evidence: task compliance is administrative (not signed operation), transition policy, immutable after task card sign/lock.  
   - Key lines: 6-12, 28-52, 74-83, 92-185.  
   - Reliability: **Confirmed**.

7. `apps/athelon-app/AUDIT-PHASES-1-4.md`  
   - Evidence: previously documented UI gap for AD compliance tab lacking create-task-card action.  
   - Key lines: 98-103.  
   - Reliability: **Confirmed (internal audit artifact)**.

---

## B) CAMP external sources (official/third-party)

1. CAMP MTX Calendar  
   URL: https://www.campsystems.com/mtx-calendar  
   - Evidence captured: task/discrepancy detail, same-date due item grouping by days/hours/cycles/other, recurring task display.  
   - Claim usage: due-list mechanics.  
   - Reliability: **Confirmed** (official source).

2. CAMP eWorkOrder  
   URL: https://www.campsystems.com/eWorkOrder  
   - Evidence captured: monthly plan directly from due list; desktop + iCAMP updates; technician assignment/workflow sync.  
   - Claim usage: due-list-to-planning execution path.  
   - Reliability: **Confirmed** (official source).

3. CAMP AD/SB Manager  
   URL: https://www.campsystems.com/ad-sb-manager  
   - Evidence captured: assess, plan, baseline, apply, report in CAMP; bi-weekly authority/manufacturer report integration statement.  
   - Claim usage: AD/SB lifecycle handling.  
   - Reliability: **Confirmed** (official source).

4. CAMP Training page  
   URL: https://www.campsystems.com/training  
   - Evidence captured: MTX intro mentions next due items, WO creation, task compliance updates; AD/SB portal processing references.  
   - Claim usage: workflow corroboration.  
   - Reliability: **Confirmed** (official source).

5. iCAMP App Store listing  
   URL: https://apps.apple.com/us/app/icamp/id542306737  
   - Evidence captured: airworthiness docs, discrepancies, work cards/procedural text, work orders, digital workflow/e-sign option.  
   - Claim usage: mobile/field capability model.  
   - Reliability: **Confirmed** (official app listing).

6. FL3XX CAMP integration KB  
   URL: https://www.fl3xx.com/kb/camp  
   - Evidence captured: actual times/cycles push, due/work order pull, 3h auto-sync option, setup dependencies and error conditions.  
   - Claim usage: integration and counter-sync model.  
   - Reliability: **Likely** (partner documentation; environment-specific).

---

## C) Existing CAMP corpus consumed (internal research package)

1. `knowledge/research/camp-systems/TEAM-1-CAMP-FEATURE-INVENTORY.md`  
   - Used for: baseline feature taxonomy and cross-validation matrix.  
   - Reliability: mixed by claim; references included in file.

2. `knowledge/research/camp-systems/TEAM-2-WORKFLOW-COMPLIANCE-ANALYSIS.md`  
   - Used for: workflow and compliance interpretation, risk framing.  
   - Reliability: mixed by claim; source-tagged in file.

3. `knowledge/research/camp-systems/CAMP-MAINTENANCE-TRACKING-DEEP-DIVE.md`  
   - Used for: synthesized positioning context.  
   - Reliability: synthesis; dependent on cited team sources.

4. `knowledge/research/camp-systems/TEAM-1-SOURCE-LOG.md`  
   - Used for: provenance and evidence quality notes.  
   - Reliability: meta-source log.

---

## D) Notable unknowns / limits

1. **Unknown**: Full CAMP internal data model for ATA-chapter object structures at field/index level (not publicly documented).  
2. **Unknown**: Exact CAMP per-customer configuration breadth for all Chapter 4/5 due categories without portal access.  
3. **Likely**: CAMP integration behavior varies by partner and aircraft configuration; third-party docs are not universal guarantees.

