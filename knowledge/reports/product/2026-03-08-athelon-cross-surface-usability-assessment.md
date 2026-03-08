# Athelon Cross-Surface Usability Assessment

**Date:** 2026-03-08  
**Audience:** Product team  
**Scope:** `apps/athelon-app`, customer portal routes inside `apps/athelon-app`, `apps/athelon-demo`, `apps/athelon-ios-demo`, `apps/scheduler`  
**Assessment lenses:** value stream effectiveness, accessibility, UX/UI design quality  
**Best-practice baselines:** WCAG 2.2 AA, current web interface guidelines fetched on 2026-03-08 from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`, and enterprise workflow UX heuristics for operational software

## Executive Summary

Athelon is most credible today as a **desktop-first internal operations platform** for a maintenance shop, not yet as a fully coherent cross-surface product suite. The main application already shows meaningful product maturity: it is broad, domain-specific, visually consistent, and protected by route, empty-state, and smoke-level accessibility checks. It feels like a serious operations tool rather than a generic SaaS shell.

The biggest current risk is **not cosmetic quality**. The biggest risk is that the product promise crosses more workflow boundaries than the implemented experience can yet reliably support. Intake, work execution, parts, customer authorization, billing, and customer communication each have strong pieces, but several handoffs between them remain incomplete or structurally fragile. This creates a gap between a convincing module demo and a trustworthy end-to-end operating system.

Accessibility and UX foundations are better than average for an internal tool, but current verification is still shallow. The app has labeled controls, focus treatments, reduced-motion support, empty-state coverage, a command palette, offline status messaging, and role-aware navigation. However, dense screens, mobile compression, and drag-heavy workflows still need task-based keyboard and screen-reader review before the product can claim strong accessibility maturity.

Cross-surface product packaging is the weakest area:

- The customer portal is visibly partial and only reviewable today through the unlinked-account state.
- `apps/athelon-demo` is gated behind Clerk sign-in before any value is visible.
- `apps/athelon-ios-demo` fails at runtime without a Convex address.
- `apps/scheduler` fails at runtime without Supabase environment variables.

If these surfaces are used in customer, investor, or hiring demos, they reduce trust faster than the main app builds it.

## Current-State Maturity By Surface

| Surface | Current usability read | Notes |
| --- | --- | --- |
| `apps/athelon-app` internal platform | Medium-high | Strongest product surface. Best suited for desktop power users in shop operations, planning, compliance, and billing. |
| Customer portal inside `apps/athelon-app` | Low-medium | Design is simpler and clearer, but current live access is limited to an unlinked-account state and docs still mark the portal as partial. |
| `apps/athelon-demo` | Low | Immediate auth wall prevents easy evaluation and weakens “show me the product” demoability. |
| `apps/athelon-ios-demo` | Low | Runtime blocked by missing Convex configuration; not reviewable as functioning software in the current environment. |
| `apps/scheduler` | Low | Router and marketing narrative exist, but runtime is blocked by missing Supabase variables; first-paint experience is effectively blank in the current state. |

## Current-State Strengths

### 1. The main product feels domain-specific, not template-driven

The internal app uses a clear aviation-operations visual language: dark tactical theme, dense but purposeful tables/cards, real workflow labels, operational alerts, and screens that look designed around hangar work rather than generic “projects.”

**Why this matters:** B2B operations software succeeds when users feel the system understands their work. Athelon already signals that well.

### 2. Information architecture is broad and coherent at the module level

The internal route manifest covers **59 internal routes**, with dedicated areas for work orders, fleet, scheduling, parts, billing, CRM, compliance, reports, settings, personnel, and training. The app shell, top bar, command palette, and role-based route gating create a consistent navigation pattern across this breadth.

**Why this matters:** Many operational products fail by feeling like disconnected sub-tools. Athelon already reads as one large system.

### 3. Guardrails and test scaffolding are ahead of typical prototype maturity

On 2026-03-08, the following local evidence passed:

- `tests/e2e/first-level-major-pages.spec.ts`: **14/14 passed**
- `tests/e2e/wave-critical-path-artifacts.spec.ts`, `tests/e2e/wave3-portal.spec.ts`, `tests/e2e/wave4-accessibility.spec.ts`: **24/24 passed**
- `tests/e2e/wave-empty-state-cta.spec.ts`, `tests/e2e/wave4-responsive.spec.ts`: **8/8 passed**

The existence of route, accessibility, and empty-state coverage is a meaningful product strength.

**Why this matters:** Even when features are incomplete, tested recoverability and route stability increase trust and reduce product drift.

### 4. Several high-stakes workflows show serious backend rigor

Existing audit material shows unusually strong attention to audit logging, return-to-service guards, signature events, and compliance invariants. This is a major differentiator versus polished-but-shallow SaaS.

**Why this matters:** In aviation maintenance, correctness and traceability matter as much as speed.

### 5. Empty states and command/search affordances are good usability investments

The app already includes a command palette, explicit empty-state CTA checks, onboarding guards, location switching, and offline status messaging. Those are the kinds of infrastructural UX features that increase daily usability over time.

**Why this matters:** Operational software wins by reducing friction in repeated use, not only by making first impressions.

## Critical And High-Severity Gaps

| ID | Severity | Impacted users | Current gap | Business/value-stream impact |
| --- | --- | --- | --- | --- |
| GAP-01 | Critical | Shop managers, technicians, billing, customers | Cross-module handoffs remain incomplete across intake, parts, discrepancy, quote, and billing flows | Undermines the product’s claim to be the system of record for the whole shop |
| GAP-02 | High | First-time admins, evaluators, returning users | Dashboard welcome modal and uneven loading states interrupt first-use clarity and at-a-glance control | Reduces trust and slows time-to-value at the most important entry points |
| GAP-03 | High | Dispatchers, coordinators, service advisors | Fleet to work-order intake is visually clean but still under-specifies real induction needs | Early workflow data quality issues cascade into scheduling, compliance, billing, and portal status |
| GAP-04 | Critical | Technicians, parts, compliance | Parts receiving, inspection, inventory, and installation traceability still shows structural gaps in prior audits | Regulatory and operational risk; inventory truth can drift from maintenance truth |
| GAP-05 | High | Billing, customers, leadership | Billing surfaces are usable, but automation under them is still incomplete in the audit corpus | Creates a “looks finished, works manually” risk in financial workflows |
| GAP-06 | High | Customers, account managers | Portal is partial, low-confidence, and visually disconnected from the main app | Customer-facing trust lags internal product maturity |
| GAP-07 | High | Mobile and floor users | Mobile/tablet rendering passes smoke tests, but dense workflows compress poorly in practice | “Responsive” exists at the browser level without being field-usable at the task level |
| GAP-08 | High | Sales, leadership, product marketing | Demo/prototype surfaces are not reliably demo-ready in the current environment | Weakens narrative coherence and external confidence in the product suite |

## Value Stream Findings

### VS-01: First-use onboarding is directionally good, but the default landing experience still competes with itself

- **Severity:** High
- **Impacted users:** First-time admins, returning managers, anyone evaluating the product quickly
- **Business/value-stream impact:** The system needs to establish trust immediately; instead, the dashboard and scheduling entry points still split attention between operational work and setup/promotional overlays.
- **Evidence source:** Live dashboard review on 2026-03-08; `app/(app)/dashboard/_components/WelcomeModal.tsx`; scheduling screenshot and `tests/e2e/wave8-scheduler-seeded-user-stories.spec.ts`
- **Gap versus best practice:** Operational dashboards should default to situational awareness first, with tours and setup help remaining visible but secondary. Auto-playing modal content and heavy setup banners increase friction for repeat users.
- **Specific recommendation:** Move the dashboard welcome video to an explicit “tour” action after first completion, and collapse scheduling setup into a dismissible, progress-aware side panel or compact banner after the first visit.
- **Confidence level:** High

### VS-02: Fleet to work-order creation is one of the cleaner forms in the product, but the intake model is still too thin for real shop induction

- **Severity:** High
- **Impacted users:** Coordinators, leads, service advisors, front-desk staff
- **Business/value-stream impact:** Thin intake data reduces downstream scheduling quality, customer communication accuracy, and compliance traceability.
- **Evidence source:** Live `work-orders/new` review; `docs/ops/TECH-JOURNEY-AUDIT.md`; `docs/qa/AUDIT-PHASES-1-4.md`
- **Gap versus best practice:** Intake should capture customer linkage, structured squawks, induction status, and baseline aircraft state. The current form is clean but optimized for fast record creation more than full operational intake.
- **Specific recommendation:** Keep the current form layout, but add a second “intake readiness” stage for customer linkage, structured squawk capture, induction timestamp, and required baseline aircraft information.
- **Confidence level:** High

### VS-03: Work-order execution looks operationally rich, but the supporting evidence model is still incomplete

- **Severity:** Critical
- **Impacted users:** Technicians, IA/QCM reviewers, compliance stakeholders
- **Business/value-stream impact:** If execution evidence is weak, the system can look polished while still failing the core job of traceable maintenance work.
- **Evidence source:** Live work-orders list review; `docs/qa/AUDIT-PHASES-1-4.md`; `docs/qa/AUDIT-PHASES-5-7.md`
- **Gap versus best practice:** High-trust maintenance execution requires structured capture of measurements, photos, parts actions, step state, and reviewer context. The current UI density suggests a mature execution system, but the audit corpus still identifies data-model and UI gaps in exactly those areas.
- **Specific recommendation:** Prioritize evidence completeness over additional surface expansion. The next wave of execution work should focus on step-level photos, measurements, in-progress states, removed-parts capture, and tighter step-to-discrepancy linkage.
- **Confidence level:** High

### VS-04: Scheduling has strong strategic product value, but the setup dependency is still high

- **Severity:** High
- **Impacted users:** Shop managers, planners, leads
- **Business/value-stream impact:** Scheduling can be a wedge product, but only if the time-to-value from an empty org is short and obvious.
- **Evidence source:** Live scheduling screenshot on 2026-03-08; `tests/e2e/wave8-scheduler-seeded-user-stories.spec.ts`; `tests/e2e/wave-empty-state-cta.spec.ts`
- **Gap versus best practice:** Strong planning tools use progressive disclosure. Athelon’s scheduling surface is powerful, but it assumes a meaningful amount of setup before the board becomes obviously valuable.
- **Specific recommendation:** Add an explicit “starter mode” that shows one idealized example board, one-line setup benefits, and a narrower first-run checklist. Reduce the amount of onboarding chrome shown after the first successful configuration action.
- **Confidence level:** High

### VS-05: Parts is the most material value-stream risk in the current system

- **Severity:** Critical
- **Impacted users:** Parts clerks, technicians, leads, billing, compliance
- **Business/value-stream impact:** A broken parts truth model breaks scheduling, execution, release, and invoicing at once.
- **Evidence source:** Live `parts` and `parts/new` review; `docs/qa/AUDIT-PHASES-1-4.md`; `docs/qa/AUDIT-PHASES-5-7.md`
- **Gap versus best practice:** In a repair station context, receive, inspect, reserve, install, remove, and bill must all reference the same inventory truth. Older audits still identify critical disconnects here, and these are workflow-level issues rather than cosmetic gaps.
- **Specific recommendation:** Treat the receive-inspect-inventory-install chain as a platform hardening program, not as incremental page polish. Close the system-of-record gaps before expanding adjacent feature scope.
- **Confidence level:** High

### VS-06: Billing is one of the cleanest areas visually, but still over-promises if automation is not complete

- **Severity:** High
- **Impacted users:** Billing managers, leadership, customers
- **Business/value-stream impact:** Financial workflows are where apparent completeness matters most; manual backfilling here turns product confidence into distrust.
- **Evidence source:** Live invoice, quote, vendor, pricing, and analytics review; `docs/qa/AUDIT-PHASES-8-10.md`
- **Gap versus best practice:** Billing UIs should reflect real system integration. Clean tabs, filters, and empty states are positive, but if labor, parts, and tax still require manual intervention, the value stream is only partially digitized.
- **Specific recommendation:** Make invoice creation truthfully reflect automation maturity. Prioritize labor-rate application, parts roll-up, and tax application before adding more financial surface area.
- **Confidence level:** High

### VS-07: Customer-facing experience is strategically right but currently underdeveloped

- **Severity:** High
- **Impacted users:** Customers, account managers, sales
- **Business/value-stream impact:** The portal is one of the clearest commercial differentiators in the product story, so partial implementation here creates a noticeable trust gap.
- **Evidence source:** Live unlinked portal state; `app/(customer)/layout.tsx`; `app/(customer)/portal/page.tsx`; docs marking portal capabilities as partial
- **Gap versus best practice:** Customer portals should be low-friction, low-surprise, and visually tied to the core system. The intended portal code is simpler and clearer than the internal app, which is good, but the live-access experience currently stops before any value is shown.
- **Specific recommendation:** Treat the portal as a clearly labeled beta until a linked-customer walkthrough is stable. Align brand language and component styling more closely with the core app while preserving the simpler information model.
- **Confidence level:** Medium, because linked-customer live validation was not available

## Accessibility And UX/UI Findings

### UX-01: The main app has better accessibility foundations than the older audit corpus suggests

- **Severity:** Medium
- **Impacted users:** Keyboard users, low-vision users, general daily users
- **Business/value-stream impact:** Strong foundations lower future remediation cost and reduce day-to-day friction.
- **Evidence source:** `tests/e2e/wave4-accessibility.spec.ts`; UI primitives in `src/shared/components/ui/*`; reduced-motion styles in `app/globals.css`; extensive `aria-label` usage in key components
- **Gap versus best practice:** Foundations are present, but current automated coverage is limited mostly to headings, visible controls, and basic labels rather than full task completion.
- **Specific recommendation:** Preserve the current accessibility baseline and add deeper task-based checks for keyboard flows, modal focus handling, drag-and-drop alternatives, and color contrast on data-dense screens.
- **Confidence level:** High

### UX-02: Navigation breadth is useful for experts but currently too deep for easy discovery

- **Severity:** High
- **Impacted users:** New internal users, infrequent users, evaluators
- **Business/value-stream impact:** Broad capability becomes harder to discover and govern as the sidebar grows.
- **Evidence source:** Live internal app review; `src/shared/components/AppSidebar.tsx`; internal route manifest count
- **Gap versus best practice:** Expert systems still need concise mental models. The sidebar is powerful, but the number of sections and children makes “where do I go for this?” a recurring cost.
- **Specific recommendation:** Introduce role-based nav presets, shorter default menus, and clearer grouping around jobs-to-be-done rather than departments alone. Keep the command palette as the expert escape hatch.
- **Confidence level:** High

### UX-03: Visual consistency is a strength inside the main app and a weakness across surfaces

- **Severity:** High
- **Impacted users:** Customers, prospects, leadership, product reviewers
- **Business/value-stream impact:** Cross-surface inconsistency weakens the story that all of these experiences belong to the same mature platform.
- **Evidence source:** Live internal app review; live portal review; `apps/athelon-demo`; `apps/athelon-ios-demo`; `apps/scheduler`
- **Gap versus best practice:** Product suites can vary by audience, but not by maturity level or environmental fragility. Athelon’s main app feels intentional; the portal is much more generic; the demos/prototypes behave like separate experiments.
- **Specific recommendation:** Define one product architecture: production surfaces, beta surfaces, and internal prototypes. Do not present all four app surfaces as peers until they share a stable brand and readiness threshold.
- **Confidence level:** High

### UX-04: Mobile and tablet support is present, but current proof only shows renderability, not workability

- **Severity:** High
- **Impacted users:** Floor users, supervisors, tablet users, future field workflows
- **Business/value-stream impact:** If “mobile support” is claimed too early, the product creates operational frustration in the field.
- **Evidence source:** `tests/e2e/wave4-responsive.spec.ts`; live mobile screenshot of `work-orders`; live tablet/mobile smoke passes
- **Gap versus best practice:** A dense desktop list compressing into a narrow viewport is not the same as a mobile workflow. The current mobile proof mainly confirms pages do not crash and headings remain visible.
- **Specific recommendation:** Reframe current state as “responsive shell support,” not “mobile-ready operations.” Design explicit mobile task flows for only the highest-value actions instead of shrinking the entire desktop app.
- **Confidence level:** High

### UX-05: Loading, hydration, and setup states are sometimes visually too close to blank states

- **Severity:** High
- **Impacted users:** All users, especially evaluators and low-context first-time users
- **Business/value-stream impact:** Perceived slowness and uncertainty are expensive in operational tools.
- **Evidence source:** Initial critical-path screenshots captured during hydration; live scheduling and dashboard review; `app/(app)/layout.tsx` route fallback
- **Gap versus best practice:** Loading states should communicate what is happening and why. In several screens, skeletons or setup surfaces dominate enough of the viewport that the app can momentarily feel empty or blocked.
- **Specific recommendation:** Replace generic skeleton-only first paints on major control surfaces with clearer status messaging and narrower loading scopes. Avoid full-screen ambiguity where the user cannot tell whether the page is loading, empty, or broken.
- **Confidence level:** High

### UX-06: Demo and prototype surfaces fail graceful degradation expectations

- **Severity:** High
- **Impacted users:** Prospects, reviewers, internal stakeholders
- **Business/value-stream impact:** Demo friction disproportionately damages perceived product maturity.
- **Evidence source:** Live runs on 2026-03-08:
  - `apps/athelon-demo` redirected immediately to Clerk sign-in
  - `apps/athelon-ios-demo` threw `No address provided to ConvexReactClient`
  - `apps/scheduler` threw repeated `Missing Supabase environment variables`
- **Gap versus best practice:** Demo surfaces should fail gracefully, provide setup guidance, or expose a seeded read-only experience. Blank or blocked states undermine product trust.
- **Specific recommendation:** Either harden these surfaces with seeded/demo-safe environments or explicitly classify them as internal prototypes and remove them from outward-facing product narratives.
- **Confidence level:** High

## Prioritized Recommendations

| Priority | Recommendation | Why now | Effort |
| --- | --- | --- | --- |
| Now | Close the intake -> execution -> parts -> billing truth chain before expanding adjacent modules | This is the biggest gap between perceived product completeness and actual operational reliability | L |
| Now | Remove or demote the dashboard welcome modal and reduce high-ambiguity loading states | Improves first-use trust and daily usability immediately | S |
| Now | Repackage cross-surface readiness: define what is production, beta, and prototype | Prevents weaker surfaces from diluting confidence in the strongest one | S |
| Now | Tighten the portal narrative: linked-customer pilot, minimum lovable flow, shared brand language | Portal is one of the clearest commercial differentiators and one of the weakest current experiences | M |
| Now | Start a task-based accessibility audit focused on keyboard flows, drag/drop alternatives, and mobile task viability | Current automation proves a baseline only; the next maturity step needs task realism | M |
| Next | Simplify navigation by role and job-to-be-done | Reduces discovery cost without shrinking capability | M |
| Next | Productize scheduling onboarding with progressive disclosure and starter-mode examples | Improves time-to-value for empty and lightly configured orgs | M |
| Next | Complete billing automation honesty gap: labor pricing, parts roll-up, tax application, work summary | Prevents financial workflows from looking more automated than they are | L |
| Next | Finish compliance-adjacent UI gaps already backed by strong backend logic, especially reviewer workflows and document generation | Converts backend rigor into visible product trust | L |
| Later | Add true offline write queuing and selective mobile-first workflows | Important, but should follow system-of-record hardening and targeted accessibility work | L |

## Audit Reconciliation

The repo contains strong prior audit material, but it should not be treated as a literal current-state inventory. It is now a mix of still-valid structural risk, already-known product debt, and stale findings.

### Still valid or structurally risky

- Intake and induction incompleteness
- Parts receive/install/inventory traceability
- Discrepancy to quote to authorization linkage
- Billing automation gaps
- Portal incompleteness

### Stale or partially resolved since earlier audits

- **Global search:** current app has a command palette and cross-entity navigation support
- **Notifications:** current app has a notification bell and notification queries
- **Offline support:** current app now has service worker registration in production plus offline status messaging and cached read guidance
- **QCM route absence:** the app now routes `compliance/qcm-review`, even if broader workflow completeness still needs review

### Reporting recommendation

Future audits should classify each inherited issue as one of:

- `new`
- `already known`
- `resolved but still structurally risky`
- `stale`

Without that step, the product team will overestimate how much current-state risk is purely missing functionality versus outdated audit carryover.

## Appendices

### Appendix A: Evidence Sources

**Live local review performed on 2026-03-08**

- `apps/athelon-app` internal desktop flows
- `apps/athelon-app` mobile sample on `work-orders`
- `apps/athelon-app` portal unlinked-account state
- `apps/athelon-demo`
- `apps/athelon-ios-demo`
- `apps/scheduler`

**Automated checks run locally on 2026-03-08**

- `apps/athelon-app/tests/e2e/first-level-major-pages.spec.ts`
- `apps/athelon-app/tests/e2e/wave-critical-path-artifacts.spec.ts`
- `apps/athelon-app/tests/e2e/wave3-portal.spec.ts`
- `apps/athelon-app/tests/e2e/wave4-accessibility.spec.ts`
- `apps/athelon-app/tests/e2e/wave-empty-state-cta.spec.ts`
- `apps/athelon-app/tests/e2e/wave4-responsive.spec.ts`

**Code and doc sources reviewed**

- `apps/athelon-app/src/shared/components/AppSidebar.tsx`
- `apps/athelon-app/src/shared/components/TopBar.tsx`
- `apps/athelon-app/app/(app)/layout.tsx`
- `apps/athelon-app/app/(app)/dashboard/_components/WelcomeModal.tsx`
- `apps/athelon-app/app/(customer)/layout.tsx`
- `apps/athelon-app/app/(customer)/portal/page.tsx`
- `apps/athelon-app/docs/ops/TECH-JOURNEY-AUDIT.md`
- `apps/athelon-app/docs/qa/AUDIT-PHASES-1-4.md`
- `apps/athelon-app/docs/qa/AUDIT-PHASES-5-7.md`
- `apps/athelon-app/docs/qa/AUDIT-PHASES-8-10.md`
- `apps/scheduler/USABILITY_IMPROVEMENTS.md`

### Appendix B: Key Limitations

- Customer portal live review was limited to the **unlinked-account state**. Linked-customer flow findings are therefore medium-confidence unless validated later with a real customer-linked persona.
- Demo and prototype appendix findings are **environment-readiness findings**, not deep task-UX audits, because two of the three surfaces were runtime-blocked.
- Accessibility conclusions are **baseline-level**, not a full conformance audit. Current automation proves renderability and some labeling, not end-to-end accessible task completion.
- This report is intentionally weighted toward **interactive software surfaces**. Static marketing assets in `apps/marketing` were excluded.

## Final Assessment

Athelon’s core internal application is already good enough to justify serious continued investment. It is not a vague concept; it is a substantive product with real domain depth, a recognizable design language, and a meaningful amount of workflow intelligence.

The next stage of success will not come from adding more surface area. It will come from making the existing surfaces tell one coherent truth:

1. the intake data is complete,
2. the execution evidence is trustworthy,
3. the parts and billing systems agree with that truth,
4. the customer-facing layer exposes the same truth simply,
5. and secondary demo surfaces stop undermining the strongest product story.

If Athelon focuses on that sequence, it can move from “impressive ambitious platform” to “credible operational system.”
