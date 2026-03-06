# TEAM 1 — CAMP Source Log

**Project:** CAMP product surface + maintenance tracking workflows
**Analyst:** Team 1 subagent
**Date:** 2026-03-06 (UTC)

---

## A) Collection method

1. Queried official CAMP pages first (maintenance, MTX modules, iCAMP, IMS, FS, EHM, training, support).
2. Added secondary industry sources (Aviation Week Marketplace, AviationPros, SoftwareOne vendor listing, FL3XX integration KB).
3. Added real-user signals (Reddit threads, iCAMP App Store listing, G2 presence).
4. Marked claims as:
   - **Confirmed:** direct statement from source text.
   - **Inferred:** derived from multiple sources but not explicitly stated in one place.
   - **Partner/User claim:** verified as being stated publicly, but authored by third party.

---

## B) Source inventory and relevance

## Official CAMP

1. https://www.campsystems.com/maintenance  
   - Evidence: Analyst support model, MTX positioning, AD/SB manager mention in snippet.
   - Usage: Core MTX capability framing.

2. https://www.campsystems.com/mtx-calendar  
   - Evidence: task/discrepancy detail with compliance and time remaining, recurring tasks, grouped due items by interval metric.
   - Usage: Due-list/calendar workflow details.

3. https://www.campsystems.com/eWorkOrder  
   - Evidence: paperless workflow, monthly plan from due list, desktop + iCAMP update path, technician task assignment.
   - Usage: Work-order execution model.

4. https://www.campsystems.com/program-manager  
   - Evidence: maintenance program creation/monitoring/updating; quality-control messaging.
   - Usage: Program governance layer.

5. https://www.campsystems.com/icamp  
   - Evidence: mobile app context + aircraft insights from Garmin operational data.
   - Usage: Mobile/field capabilities.

6. https://www.campsystems.com/inventory  
   - Evidence: shelf-life, OSHA, value, location, reorder levels, purchasing, receiving.
   - Usage: inventory-maintenance coupling.

7. https://www.campsystems.com/flight-scheduling  
   - Evidence: trip logistics and crew/training context.
   - Usage: adjacent module mapping.

8. https://www.campsystems.com/engine-health-monitoring  
   - Evidence: designated EHM provider claims and service scope.
   - Usage: predictive/condition monitoring linkage.

9. https://www.campsystems.com/training  
   - Evidence: module-level training descriptions for MTX, AD/SB portal, iCAMP, IMS, FS, EHM; explicit references to due items, creating WOs, updating complied tasks.
   - Usage: cross-validation and operational workflow evidence.

10. https://www.campsystems.com/support  
   - Evidence: service model and OEM scope narrative.
   - Usage: contextual corroboration.

## Secondary sources

11. https://marketplace.aviationweek.com/suppliers/camp-systems-international/  
   - Evidence: integrated suite statement (maintenance, inventory, flight scheduling).
   - Usage: independent ecosystem corroboration.

12. https://www.aviationpros.com/aircraft-maintenance-technology/mros-repair-shops/maintenance-it/record-keeping/company/10134036/camp-systems-international-inc  
   - Evidence: broad product suite and OEM/provider claims.
   - Usage: independent product-surface corroboration.

13. https://marketplace.aviationweek.com/company/corridor-aviation-service-software-0  
   - Evidence: CORRIDOR claim of bi-directional task-card flow with CAMP.
   - Usage: partner-claimed integration behavior.

14. https://www.fl3xx.com/kb/camp  
   - Evidence: push times/cycles to CAMP, pull due lists/work orders, sync intervals, aircraft-level configuration dependencies, integration error modes.
   - Usage: concrete operational integration mechanics.

15. https://platform.softwareone.com/vendor/camp-systems-international/VND-6218-2451  
   - Evidence: third-party categorization of CAMP modules.
   - Usage: secondary module corroboration.

## Real-user signals

16. https://www.reddit.com/r/aviationmaintenance/comments/1fld0o9/camp_work_ordersinventory/  
   - Evidence: reported usage pattern (discrepancy tool + iCAMP; questions around WO/inventory depth/cost packaging).
   - Usage: workflow friction and module adoption signals.

17. https://www.reddit.com/r/aviationmaintenance/comments/sfb7tg/im_trying_to_select_a_maintenance_tracking/  
   - Evidence: user comment about duplicate times/cycles entry burden in some CAMP workflows.
   - Usage: integration pain point signal.

18. https://www.reddit.com/r/aviationmaintenance/comments/x4ya4d/bizav_folks_anyone_have_intel_on_what_camps_costs/  
   - Evidence: user claim on configuration burden and operational overhead.
   - Usage: implementation complexity signal.

19. https://apps.apple.com/us/app/icamp/id542306737  
   - Evidence: iCAMP feature list (airworthiness docs, discrepancies, work cards/procedural text, WOs, digital workflow/e-sign); rating count.
   - Usage: user-facing capability confirmation.

20. https://www.g2.com/sellers/camp-systems  
   - Evidence: market presence checkpoint (detailed review content not accessible via tool due JS/anti-bot constraints).
   - Usage: source attempted for review triangulation.

---

## C) Claim-to-source cross-validation highlights

- **Due list + compliance/time remaining + recurring tasks:** MTX Calendar + Training page.
- **Work-order planning from due list + paperless flow:** eWorkOrder + Training page + App Store iCAMP features.
- **AD/SB operational behavior:** Training AD/SB module + maintenance page snippets.
- **Mobile discrepancy/work-card support:** App Store + eWorkOrder/iCAMP pages.
- **Inventory lifecycle controls:** IMS page + training module summary + secondary marketplace profile.
- **Flight-data-to-maintenance linkage need:** Reddit duplicate-entry signal + FL3XX push actuals integration details.

---

## D) Data quality notes / limitations

1. Reddit and G2 pages had anti-bot access limits in direct fetch; relied on search-result snippets and alternative user-signal sources where needed.
2. CAMP help-center deep links returned redirect loop in this environment; however, relevant workflow details were recoverable from CAMP public pages and snippets.
3. Some integration claims are **partner-authored** (e.g., FL3XX/CORRIDOR) and should not be treated as universal across all deployments.
4. No private customer portal or paid doc access was used.

---

## E) Confidence rubric used

- **High:** Explicitly stated in official CAMP source and corroborated by another source.
- **Medium:** Explicit in one credible source OR corroborated by partner/secondary source with partial detail.
- **Low:** Sparse evidence or mostly inferred behavior (none used for core claims in final inventory).
