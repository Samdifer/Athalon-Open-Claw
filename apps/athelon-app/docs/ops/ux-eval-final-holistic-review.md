# Final Holistic Review — Athelon MRO SaaS UX Evaluation
**Reviewer:** Final Holistic Reviewer (Synthesis & Risk Assessment Layer)
**Date:** 2026-03-12
**Inputs:** UX Evaluation Teams 1–7, System-Level Orchestrator Review, AppSidebar.tsx, protectedAppRoutes.tsx, roles.ts
**Method:** Cross-report contradiction detection, implementation risk analysis, missing perspectives audit, FAA domain conflict review, prioritization adjustments, and final distillation

---

## Overview

This document is the final layer of a seven-team parallel evaluation covering ~130+ pages of the Athelon MRO SaaS application. After synthesizing all team findings, the orchestrator's system-level analysis, and the actual application architecture, several patterns emerge that the individual teams — working in parallel without visibility into each other's findings — could not have detected independently. This review focuses exclusively on problems, conflicts, and risks *within the recommendations themselves*, not on repeating problems already well-covered upstream.

---

## Section 1: Contradiction Detection

The following contradictions were identified across team reports where one team's recommendation would directly undermine another team's praised design or would conflict with another team's recommendation for the same or related components.

---

### 1.1 Lead Center vs. Lead Workspace — Contradictory Consolidation vs. Separation Advice

**Conflict:** Team 1 recommends that the `/work-orders/lead` (Lead Workspace) page have a role gate that prevents non-lead users from seeing it in the sidebar and navigating to it. Team 5, reviewing the `/lead` page (Lead Center), recommends moving the "Roster" tab of the Lead Center to the scheduling section and condensing the Lead Center scope. The Orchestrator recommends the two pages be either consolidated or clearly differentiated.

**The real problem the teams missed:** The sidebar currently lists both under different sections. Looking at `AppSidebar.tsx` directly, `Lead Center` (`/lead`) lives as a standalone item under `section: "work-orders"`, and `Work Orders > Lead Workspace` (`/work-orders/lead`) is a child of the Work Orders group — also under `section: "work-orders"`. Both point to the same RBAC section, both serve the lead technician role, and both are independently navigable from the sidebar. A lead technician who opens the sidebar sees **both** entries and must click into each one to understand the difference.

**Risk of naive implementation:** Consolidating them into one page (as the orchestrator suggests) would require migrating the shift-board, task-feed, team-roster, and turnover reporting into the same surface as the WO-scoped lead tooling — a significant rewrite. Separating them further (making one the "shift-level" tool and one the "WO-level" tool) is the safer incremental path but requires clear labeling changes that no team specified precisely enough.

**Recommended resolution:** Rename `/work-orders/lead` to "WO Lead Tools" in the sidebar (scoped to the work order context) and rename `/lead` to "Shift Center" (scoped to daily shift management). Do not consolidate yet — they serve different temporal scopes (per-WO vs. per-shift).

---

### 1.2 Tab Reduction on WO Detail vs. Tab Reduction on CRM Account Detail — Conflicting Merge Targets

**Conflict:** Team 1 recommends merging "Evidence" into "Documents" on the WO Detail tab bar (7→5 tabs). Team 4/Team 5 recommend merging "Work History" + "Quotes & Invoices" on the CRM Account Detail (7→5 tabs). The Orchestrator endorses both. However, these two recommendations share a dependency: the CRM Account Detail "Work History" tab and "Quotes & Invoices" tab surface data that is also visible in the WO Detail. Merging them into a "Transactions" tab in CRM without also ensuring the WO Detail's "Cost Estimate" tab properly links back to the invoice record would break the bidirectional traceability chain.

**Risk:** A billing manager viewing the merged "Transactions" tab in CRM needs to click through to a specific WO. If the WO Detail's "Cost Estimate" (or the recommended "Financials") tab does not contain the invoice number, the bidirectional link is severed. The teams evaluated the two pages independently without considering this cross-module traversal.

**Recommended resolution:** Before merging tabs on either page, ensure the WO→Invoice and Invoice→WO cross-links are intact. The merge targets are correct, but the execution order matters: fix cross-links first, then merge tabs.

---

### 1.3 `/personnel/training` Restructuring Would Break the Career Profile Page

**Conflict:** Team 3 correctly identifies the 11-tab `/personnel/training` page as critically over-complex and recommends reducing to 5 tabs and moving analytics elsewhere. However, the career profile page (`/personnel/[techId]/career`) contains a broken deep-link to `/personnel/training?techId=${techId}&jacketId=${j._id}`. Team 3 recommends fixing this deep-link to go to `/training/ojt/jackets/${id}` instead.

**The problem:** If both changes are implemented in the wrong order (tab restructuring first, deep-link fix second), any code or bookmark that still references the old `/personnel/training?jacketId=...` URL will land on a restructured page that no longer responds to the `jacketId` param. During the transition window, career profile jacket links will be doubly broken.

**Risk:** This is a low-blast-radius issue but illustrates how parallel-team recommendations can create sequencing traps.

**Recommended resolution:** Fix the deep-link on the career profile page first (to `/training/ojt/jackets/${id}`), then restructure the training page tabs. The deep-link fix removes the dependency.

---

### 1.4 Findings Page as QCM Tool vs. "Management View" — Contradictory Role Assignment

**Conflict:** Team 5 characterizes `/findings` as a QCM management/review tool and recommends repositioning the "Log Finding from Work Order" button to reflect that the page is read-only for finding creation. Team 1, reviewing the WO Detail and Task Card Detail pages, recommends that findings raised from a task card step should preserve scroll position by using scroll restoration or hash anchors rather than navigating to the finding detail page.

**The hidden contradiction:** If the findings page is a management tool (Team 5's framing), then the finding detail page at `/work-orders/[id]/findings/[discrepancyId]` (reached from within a WO) and the standalone `/findings` page serve different audiences. But the finding detail page is the same page reached from both entry points — it has no awareness of whether it was opened by a QCM inspector from `/findings` or by a technician from inside a task card. Team 1's recommendation to add dispositioning controls to the finding detail page would therefore put dispositioning controls in front of technicians who opened the page from a task card, creating an RBAC gap.

**Risk:** Adding dispositioning controls to `/work-orders/[id]/findings/[discrepancyId]` without role-gating them would allow technicians (who should not disposition their own findings under Part 145 independence requirements) to change finding status. Under FAA Part 145 §145.201(b), persons who perform maintenance cannot inspect their own work. Dispositioning is an inspection action.

**Recommended resolution:** The finding detail page must gate dispositioning actions on `qcm_inspector`, `shop_manager`, or `admin` roles. Any technician arriving at this page from their task card should see the finding details read-only with a "QCM Inspector action required" status label.

---

### 1.5 Duplicate Prospect Intelligence Pages — Merge vs. Separate Advice Conflicts

**Conflict:** Team 5 recommends merging Part 145 Intelligence and Part 135 Intelligence into a single "Prospect Intelligence" page with two tabs. The sidebar (`AppSidebar.tsx` lines 186-191 and 228-233) already lists both pages under both the Sales group AND the CRM group — meaning each page appears twice in the sidebar. The Orchestrator flags this as a P2-11 fix (remove duplicate nav entries). Merging the pages into one would resolve both the duplication and the structural confusion.

**Risk of merging:** Part 145 prospects are competing MRO shops (potential partners or acquisition targets); Part 135 operators are potential customers. These are fundamentally different commercial relationships with different qualification workflows, different outreach strategies, and different data sources. Presenting them as two tabs of the same page may create the opposite confusion — users may think both tabs represent the same type of prospect relationship.

**Better resolution:** Keep them as separate pages but consolidate to a single sidebar entry point: a parent "Prospect Intelligence" group with two named children: "MRO Shops (Pt 145)" and "Air Operators (Pt 135)". This eliminates the duplicate nav issue without the cognitive merge risk.

---

### 1.6 Scheduling Page State Explosion Recommendation Conflicts With Scheduling Module Architecture

**Conflict:** Team 6 rates the scheduling page at 2/5 Usability and recommends reducing the 25+ state variables to a simpler workspace model. The Orchestrator raises this as P1-13. However, viewing the `AppSidebar.tsx`, the scheduling section has five children: Due-List Workbench, Roster & Teams, Quote Workspace, Seed Audit, and (via nav) the main Gantt board. The existing sub-pages suggest the architecture is already moving toward decomposition of the monolithic scheduling page. If the team recommendation to simplify the main scheduling page is implemented while the sub-page architecture is also being extended, there is a risk of mid-refactor state where neither the monolithic page nor the decomposed sub-pages are complete.

**Risk:** A half-simplified scheduling page with partially migrated state to sub-pages will be more confusing than either the original monolith or the fully decomposed version.

**Recommended resolution:** Before touching the main scheduling page state, complete the sub-page decomposition (ensure Due-List, Roster, and Quote Workspace are fully self-contained). Only then strip the main page to a coordinator/entry point. This is a "complete before simplifying" pattern.

---

## Section 2: Implementation Risk Assessment

The following P0 and P1 recommendations carry non-obvious implementation risks that the teams did not flag.

---

### 2.1 P0-01: Migrate Parts Requests from localStorage to Convex

**Recommended action:** Correct and necessary.

**What could go wrong:** Parts requests are currently stored locally under a key tied to the work order ID. When migrated to Convex, the `parts` table will need a schema addition. The WO Detail page, Task Card Detail, and the Parts Requests page all consume parts data. The blast radius of this migration touches at minimum 3 pages plus the Convex schema.

**The risk that was missed:** The parts request data in localStorage currently has no created-by, created-at, or status tracking beyond what the UI renders. When migrating to Convex, a minimal schema must be defined upfront — if the first iteration of the Convex `partsRequests` table lacks approval workflow fields, a second migration will be required immediately when the parts clerk approval workflow is built. The teams recommended migrating the data; they did not recommend designing the full parts request schema before migration.

**Recommendation:** Design the `partsRequests` schema to include `requestedBy`, `requestedAt`, `status` (`pending`/`ordered`/`received`/`cancelled`), `technicianId`, `workOrderId`, `taskCardId` (nullable), `partNumber`, `quantity`, and `notes` before starting the migration. A one-time migration from localStorage to Convex is acceptable; schema migrations on Convex tables after go-live are additive but add operational complexity.

**Blast radius:** Schema change → 3+ pages to update → QA for multi-device consistency.

---

### 2.2 P0-08: Migrate Routing Templates from localStorage to Convex

**What could go wrong:** Similar to parts requests. Routing templates are currently per-device. If the migration creates a `routingTemplates` table scoped to `organizationId`, any user who has created templates locally will not see them after migration unless a one-time import utility is provided.

**Risk:** Silently losing template data on migration. Users who built 20-step templates on their device will open the page after the migration and see an empty list. They will assume a bug deleted their templates.

**Recommendation:** Before the migration goes live, build and run a one-time migration utility that reads localStorage keys matching the routing template format and creates Convex records for the templates. Communicate to users that template data has been migrated. The `Apply Template to WO` stub must be implemented before or simultaneously with the Convex migration — migrating templates to the database while keeping the primary use case stubbed out would allow the P0 issue to be resolved on paper while still failing users.

---

### 2.3 P1-06: Add Structured A&P/IA Certification Fields to Technician Schema

**What could go wrong:** The technician schema is a Convex table. Adding `ampCertificateNumber`, `iaCertificateNumber`, `ampExpiry`, `iaExpiry` fields requires a schema migration plus updating the user management forms, career profile page, and any queries/mutations that touch technician records.

**The larger risk the team missed:** The career profile page currently infers A&P/IA status from training record course names. If structured fields are added but not populated for existing technicians, the career profile will show blank certificate numbers for every current technician — visually worse than the heuristic inference the teams criticized. This creates a data completeness gap that will confuse QCM inspectors and could create confusion during an FAA audit if the inspector sees blank certificate number fields.

**Recommendation:** When adding the structured fields, set them as nullable and preserve the heuristic inference as a *fallback display only* (marked with a "(inferred)" label) until the fields are populated. Add an admin tool to bulk-import certificate numbers, or surface them as required fields in the technician edit form with an "Incomplete Profile" badge until filled. Do not remove the heuristic without providing a data completeness path.

---

### 2.4 P1-07: Establish Canonical Account View Merging CRM and Billing

**Blast radius assessment:** This is the highest-blast-radius recommendation in the entire evaluation. The `customers` table is referenced by: billing invoices, billing quotes, work orders, CRM accounts, CRM interactions, CRM pipeline, customer portal auth, parts orders, vendor links, and contact records. Merging the CRM and billing views is not a UI change — it is an architectural unification of two navigation paradigms that share one database entity.

**What could go wrong with naive implementation:**
- If CRM gains inline edit capability for core customer fields (name, type, contact info), there must be a single mutation path. Currently `updateCustomer` exists in the billing context. A second `updateCrmAccount` mutation would create dual write paths that can diverge.
- The CRM "health score" system and the billing "customer type" system use the same `customers` table but different views. Merging the views requires deciding what the canonical page header shows — health score (CRM metric) or account balance (billing metric).
- The customer portal auth links customers to portal users. Any refactoring of the customer entity model that changes the ID structure, merges accounts, or adds CRM-only fields must be validated against the portal auth flow.

**Recommendation:** This change must be treated as a multi-sprint architectural initiative, not a UX polish task. The immediate incremental step is to enable inline editing of non-sensitive fields (name, type, phone, email) from the CRM account detail page using the existing billing mutation, with no new table or mutation. Full canonical view unification should be planned as a separate milestone.

---

### 2.5 P1-12: Multi-Step Onboarding Wizard

**What could go wrong:** The current onboarding page at `/onboarding` and `/settings/new-organization` are the same component. It serves both "first-time user creating their org" and "admin adding a second org." The multi-step wizard recommendation (Team 7) is correct for the first-time use case but could be confusing for the existing-admin second-org use case.

**Risk:** If the wizard is implemented as a single shared page, an admin adding a second repair station location would be shown a 5-step wizard with FAA certificate questions as if setting up from scratch. The wizard's phrasing ("Welcome! Let's set up your repair station") would be contextually wrong for experienced admins.

**Recommendation:** Implement two separate paths: a `FirstRunWizard` that the `OnboardingGate` shows to users with no org, and a simplified `NewOrganizationForm` that admins reach via `Settings > New Organization`. The route `/settings/new-organization` already exists in the router and currently maps to `OnboardingPage` — that separation point is already established and should be used.

---

### 2.6 P0-09: Add `flex-wrap` to Training Page TabsList

**Risk of naive implementation:** This is listed as a P0 layout bug fix (tabs inaccessible on standard displays). However, adding `flex-wrap` to an 11-tab list does not solve the problem — it makes tabs accessible by wrapping to a second line, but the double-line tab bar is a known anti-pattern that breaks the visual tab metaphor. Users cannot intuitively see which tab is active when tabs span two rows.

**The correct fix:** `flex-wrap` is a 5-minute patch that makes the tabs technically accessible but visually broken. The real P0 fix is to implement a scrollable `TabsList` (set `overflow-x-auto` on the container with proper scroll behavior) or, better, immediately begin the tab restructuring (P1-01) since a scrollable 11-tab list is nearly as confusing as an overflowing one.

**Recommendation:** Do not land `flex-wrap` as the "fix" — it creates a false sense of resolution. Either implement a scrollable tab bar immediately as a short-term patch, or prioritize P1-01 (tab restructuring) and do them together. If P0-09 must be a one-line fix today, `overflow-x-auto` on the `TabsList` container is preferable to `flex-wrap`.

---

## Section 3: Missing Perspectives

The evaluation teams conducted thorough code reviews but several perspectives were entirely absent from all seven reports.

---

### 3.1 Performance Implications of "Wire Up Convex Queries" Recommendations

Multiple teams recommended wiring existing UI components to their Convex backend equivalents (vendor services, parts requests, routing templates, compliance items). The CLAUDE.md architecture notes document that the frontend currently uses local `useState` demo data for several features.

**The N+1 query risk the teams missed:** The orchestrator notes 24 of ~55 shared components are Convex-coupled (from the architecture coupling analysis). When the remaining components that use `useState` demo data are wired to Convex, the query subscription count per page will increase. The WO Detail page (the most complex page in the app) already fires 7+ Convex queries at the top level. Adding parts requests, vendor services, and compliance items as additional subscriptions would bring the per-page subscription count to 10–12 simultaneous Convex reactive subscriptions. Convex WebSocket subscriptions are efficient but there is a practical limit to how many real-time subscriptions a single page can maintain before client-side reconciliation becomes visible as latency.

**No team recommended batching or combining these queries.** Before wiring the remaining localStorage features to Convex, the data architecture for the WO Detail page should be reviewed to consolidate the existing 7 queries into 2-3 more comprehensive queries using Convex's `useQueries` parallel execution pattern.

---

### 3.2 Shop-Floor Tablet and Touch Usability — Systematically Underaddressed

This is the most significant gap in the entire evaluation. Only two specific touch concerns were raised across all seven team reports:
- Team 1: Task card drag vs. tap conflict on Kanban (touch events)
- Team 1: PIN entry field should use `inputMode="numeric"`
- Team 3: Drag-and-drop in curriculum editor lacks touch support

**What the teams entirely missed:**

The application is used by technicians on shop-floor tablets. Typical shop-floor conditions include: gloves (reducing fine touch precision), bright overhead lighting creating screen glare, greasy fingers, tablets mounted on carts or walls at arm's length, and work being performed simultaneously. The evaluation was conducted as a static code review with no mention of how these physical conditions affect usability.

Specific issues not flagged:

- **Touch target sizes:** shadcn/ui defaults to `h-8` (32px) or `h-9` (36px) for buttons, which is below the Apple HIG minimum of 44px and Google Material minimum of 48px for touch targets. The application-wide use of these button sizes creates touch inaccuracy issues for gloved hands. No team measured or mentioned touch target sizes.
- **Dialog modals on tablets:** Multiple pages use dialog modals that open inside the current scroll context (e.g., the certificate creation dialog, the template creation modal). On a landscape tablet, a `max-h-[90vh]` modal will typically consume the full viewport, but the virtual keyboard (if opened for a text field inside the modal) will push the content up, potentially hiding the Save button. No team flagged this pattern.
- **Swipe gestures:** There are no swipe gesture affordances anywhere in the application despite the app being used on tablets. Tab navigation on the task card detail page, for example, could benefit from horizontal swipe to switch tabs — a common tablet UX pattern. The app treats touch devices as mouse devices with large cursors.
- **Offline capability:** The MRO context (hangars) often has poor WiFi connectivity. The application has a dashboard-level offline banner but no indication of which pages/operations require connectivity vs. which can operate offline. Technicians stepping into a hangar bay with poor signal should know before navigating to the task card page whether their sign-offs will queue or fail silently. No team addressed this.

---

### 3.3 Accessibility (A11y) — Entirely Absent From All Reports

No team evaluation report contained a single reference to screen reader compatibility, keyboard navigation, ARIA labels, color contrast ratios, or any other accessibility consideration. This is a significant gap for a production SaaS product.

Known issues not flagged:

- **Color-only status encoding:** The Kanban board, findings severity, and WO status use color badges as the primary (and often only) differentiation. A color-blind user cannot distinguish an `in_progress` WO from a `pending_inspection` WO if the badge colors are their primary differentiator. The badges do include text labels, which partially mitigates this, but the progress bar colors used to indicate WIP health (red/amber/green) have no textual fallback.
- **Icon-only buttons:** Multiple toolbar areas and the view-mode toggle on the Work Orders list use icon-only buttons with `title` tooltip text. Screen readers may not announce these correctly, and `title` attributes are not read by all screen reader configurations. These require `aria-label` attributes, which were not present in the code reviewed.
- **Focus management in modals:** Several teams noted keyboard focus trap issues (Team 1 flagged `PartNumberCombobox` inside a `Dialog`). Focus management in modals is a WCAG 2.1 Level A requirement. No team evaluated the general focus management pattern.
- **Skip links:** The sidebar navigation does not include a "Skip to main content" link, which is a standard accessibility requirement for navigation-heavy applications.

---

### 3.4 Data Migration Implications of Schema Changes

The evaluation recommended several schema additions: `ampCertificateNumber`/`iaCertificateNumber` on technicians, `partsRequests` table, `routingTemplates` table, ATA chapter validation on OJT tasks, and structured vendor service agreements. None of the teams discussed:

- **Convex migration strategy:** Convex is schema-driven but uses additive migrations (new fields default to `undefined`). Existing records will have `undefined` for new required fields. UI components that render these fields must handle `undefined` gracefully, or existing records will break.
- **Retroactive data entry burden:** Adding `ampCertificateNumber` as a visible field creates a data completeness gap for every existing technician. Who fills this in? When? Is it a required field on the form? The teams did not address the operational cost of schema additions that require back-filling data for existing organizations.
- **Audit trail implications of deletes:** Team 3 flagged that the "Archive" button on individual training records calls `removeTraining` (a hard delete), with the toast incorrectly saying "archived." The teams did not note that **hard-deleting training records in a Part 145 operation may be a regulatory violation.** FAA Part 145 §145.163(c) requires records of training to be retained for at least two years. Any "delete" action on training records should be a soft-delete that renders the record inactive but preserves it in the database.

---

### 3.5 FAA Audit Trail Implications of UX Simplification

Several recommendations, if implemented naively, could reduce audit trail quality:

- **Team 1 recommends removing the "Days Until RTS" KPI card from WOHeaderKPI** because it duplicates the RTS Date card. While true from a UX density perspective, the Days Until RTS value is a computed time-sensitive metric that shop managers may need to reference for scheduling decisions. Removing it reduces the information density on a page that is already used as a compliance status snapshot. **Recommendation:** Keep the card but reduce it to a badge or inline indicator next to the RTS Date card rather than a standalone KPI card.
- **Team 6 recommends simplifying the compliance/audit-readiness page.** The audit readiness page is specifically designed for FAA audit preparation — its complexity is by design. The "number of items to review" is proportional to regulatory burden, not poor UX. Reducing complexity here risks making the page useless as an audit preparation tool by hiding required checklist items.
- **Team 3 recommends removing the "Scheduling Constraints" tab from the training page.** The scheduling constraints on a technician's training record (which aircraft they are qualified to work on, which inspection types they can perform) are operationally relevant for scheduling and dispatching. Removing this from the training context to a separate scheduling section may reduce discoverability for training managers who need to see qualification-driven scheduling constraints in the same view as the training records that produced them.
- **Team 1 recommends the RTS page URL strip the `?authEventId=` parameter after successful capture.** This is a good security recommendation, but the implementation must ensure the auth event is not consumed before the RTS document is fully generated. If the URL param is stripped by the client before the server confirms the auth event was valid, a race condition could allow the RTS form to appear without a valid auth event.

---

## Section 4: Recommendation Conflicts With FAA Part 145 Domain Requirements

### 4.1 Independent Inspection Principle — Finding Dispositioning RBAC

As noted in Section 1.4, adding dispositioning controls to the finding detail page without RBAC gating violates the FAA Part 145 §145.201(b) independent inspection requirement. The person who performed the work (technician) cannot also inspect and disposition their own findings. This is not a UX concern — it is a regulatory compliance requirement.

**Teams 1 and 5 both recommended adding dispositioning controls or links to the finding detail page without mentioning role gating.** Before implementing either recommendation, the finding detail page must be audited to confirm that dispositioning actions are only available to roles authorized to perform independent inspections: `qcm_inspector`, `shop_manager` (in small shops where QCM functions are combined), and `admin`.

---

### 4.2 Training Record Soft-Delete vs. FAA Retention Requirements

As noted in Section 3.4, Team 3's recommendation to rename the "Archive" button on training records to "Delete" (to match the actual `removeTraining` hard-delete behavior) inadvertently recommends making more visible a hard-delete operation that should not be exposed at all. FAA Part 145 §145.163 requires training records to be retained. **The correct recommendation is to implement true soft-delete (add `archivedAt: v.optional(v.number())` to the training records table) and to never expose a permanent delete of training records in the UI.** Team 3 flagged the label mismatch but recommended "Delete or implement soft-delete" without flagging the regulatory requirement driving the decision.

---

### 4.3 Certificate Page Audit Information — Not Just a UX Issue

Team 1 identified that the certificates list page for FAA 8130-3 and EASA Form 1 certificates does not show who created the certificate or when. The team framed this as a UX gap ("critical audit information"). This understates the severity: under FAA Part 145 §145.221, release documents must be traceable to the authorized release person. The certificate list page's absence of creator/date information is not merely a UX polish item — it is a potential regulatory compliance gap if the only traceability is in the Convex database and not visible in the UI that an FAA inspector would review. This should be elevated from its current P2 framing to P1 or P0.

**Recommendation:** Add `createdBy` (technician name or user display name) and `createdAt` (formatted date) as visible columns in the certificate list and as a header field in the certificate detail view. This should be implemented before the certificates feature is used in any production inspection.

---

### 4.4 Maintenance Records Page — Missing Integration With Compliance Tab Is a Regulatory Gap

Team 1 notes that maintenance records created on `/work-orders/[id]/records` are not reflected in the WO Compliance tab. The recommendation is framed as a usability improvement ("add records to the WO Compliance tab"). In fact, under FAA Part 145 §145.219, maintenance records must be available for each work order. If the WO Compliance tab shows "Maintenance Records: 0" when records actually exist on the records sub-page, a QCM inspector performing the pre-release compliance check could incorrectly conclude the records are missing and delay the release — or, more dangerously, approve release while believing records will be filed when they are actually already filed but invisible to the check. The integration is a compliance workflow requirement, not optional UX polish.

---

### 4.5 WO Templates "Approved Data Source" Field

Team 1 notes that the `approvedDataSource` field is required on WO templates. This field maps to FAA-approved maintenance data (AMM, SRM, CMM, AD, etc.) that authorizes the maintenance being performed. The current implementation as a free-text field creates a risk that technicians enter informal references ("AMM section 5-something") rather than proper references ("AMM Task 25-11-00-910-801-A"). While the teams correctly flagged the `text-destructive` CSS color class naming concern, the more significant risk — that the free-text field will accumulate non-compliant data references that would fail an FAA audit — was not raised by any team.

---

## Section 5: Prioritization Adjustments

### 5.1 Items That Are Over-Prioritized

**P0-03 (`getDiscrepancy(discrepancyId)` backend query)** is listed as P0 due to "compliance page performance risk." However, the actual compliance risk is low for small orgs (< 200 discrepancies, the client-side filter completes in <1ms). The real issue is scalability. This should be P2 — a quality-of-life backend improvement that should be built alongside the finding detail page dispositioning work (P0-04) but does not independently block any compliance workflow today.

**P0-07 (Fix inverted switch logic in Station Config)** is a genuine bug but affects only administrators configuring operating hours — a low-frequency action that most shops perform once at setup. While a real bug, the operational risk is much lower than, for example, the finding dispositioning dead-end (P0-04) or the `flex-wrap` tab overflow (P0-09). Consider P1.

### 5.2 Items That Are Under-Prioritized

**P2 — Certificates page missing creator/date (Team 1):** As argued in Section 4.3, this is a regulatory compliance gap that could affect FAA release authorization traceability. It should be elevated to **P1**.

**P2-11 — Duplicate sidebar entries (Orchestrator):** The Prospect Intelligence and Sales Training entries appear under both the Sales group and the CRM group in `AppSidebar.tsx` (confirmed by direct code review). A user who navigates via Sales and a user who navigates via CRM both land on the same page but may not realize they are the same content. More importantly, the duplicate sidebar entry inflates the perceived scope of the sidebar, which already has 13+ top-level sections. Removing the duplicates is a 5-minute change that meaningfully reduces visual noise. This should be elevated to **P1** (quick win, high ROI).

**P2-13 — WO Template edit/deactivate actions:** Templates without an edit action must be deleted and recreated when errors are found. In the context of FAA-approved maintenance procedures, templates are referenced as the basis for task card steps. A typo in a step procedure requires recreating the entire template. The inability to edit is not just inconvenient — it incentivizes users to work around the template system (creating new templates with minor name variations), polluting the template library. Elevate to **P1**.

**P3 (unlisted) — Voice notes in localStorage:** No team explicitly flagged voice notes stored in localStorage as a separate P0 issue, though the general localStorage pattern was identified. Voice notes attached to task cards are operational records that a QCM inspector or lead technician on a different device cannot hear. If voice notes are used to document work deviations or findings, the inability to access them cross-device has the same regulatory traceability implication as parts requests. This should be tracked as a P1 alongside P0-01 (parts requests migration).

### 5.3 Quick Wins Buried in Lower Priorities

The following P2/P3 items have high ROI and low implementation cost — they should be promoted to immediate execution alongside P0 fixes:

1. **Remove Demo Apps card from `/settings/shop`** (P0-06): This is a single JSX block removal or environment flag check. 30 minutes of work. Do it now.
2. **Fix inverted switch logic in Station Config** (P0-07): A single boolean flip. 5 minutes. Do it now.
3. **Remove duplicate sidebar entries** (P2-11): Remove 2 child entries from `AppSidebar.tsx`. 10 minutes. Do it now.
4. **Add `overflow-x-auto` to training page TabsList** (P0-09 corrected approach): A single CSS class addition. 5 minutes. Do it now.
5. **Fix `type="tel"` on PIN input** (Team 1, Signature page): One line change. Do it now.
6. **Make WO Dashboard status labels human-readable** (P1-09): Use existing `WO_STATUS_LABEL` map already in the codebase. 30 minutes. Do it now.
7. **Add `cursor-pointer` and hover state to CRM Analytics CLV table rows** (Team 5): One CSS class. 5 minutes. Do it now.

### 5.4 Items That Should Be Grouped Into Single Implementation Phases

**Phase: localStorage Migration (do together)**
P0-01 (parts requests), P0-08 (routing templates), and the untracked voice notes issue share the same root cause (localStorage misuse for operational data) and the same solution pattern (Convex table + schema design + one-time migration). Building the migration infrastructure once and applying it to all three reduces total implementation effort by ~40% vs. doing them separately.

**Phase: Navigation & Discoverability (do together)**
P1-02 (add Findings to sidebar), P2-11 (remove duplicate sidebar entries), P1-04 (differentiate Lead Center vs. Lead Workspace labels), and Team 1's recommendation to surface WO sub-views (Handoff, Dashboard) in the sidebar are all sidebar changes. Batch them in a single sidebar refactoring sprint to avoid repeated sidebar regression testing.

**Phase: WO Detail Complexity Reduction (do together)**
P2-08 (cap WO Detail tabs at 5), P2-05 (fix finding detail back navigation), P1-05 (add positive confirmation states to WO flow), and P1-03 (breadcrumbs on WO sub-pages) all touch the same file cluster (`work-orders/[id]` and its sub-pages). Implementing them in the same sprint reduces context-switching overhead.

**Phase: Training Infrastructure (do together)**
P1-06 (structured A&P/IA fields), P1-14 (delete confirmations on curriculum editor), Team 3's `listByTechnician` query fix, and the deep-link fix on career profiles are all training-layer changes. The deep-link fix must come first (see Section 1.3), but the rest can be parallelized.

---

## Section 6: The 10 Most Impactful Changes

After reviewing all 130+ page evaluations, 7 team reports, the orchestrator synthesis, and the application architecture directly, the following 10 changes represent the highest ratio of user impact, compliance risk reduction, and implementation feasibility.

---

### Change 1: Migrate All Operational localStorage Data to Convex
**Scope:** Parts requests, routing templates, voice notes (3 data categories)
**Impact:** Eliminates cross-device data loss for shop-floor MRO operations. A technician requesting a part on their tablet is the minimum viable compliance loop for parts traceability. This single architectural fix unlocks multi-person workflows (parts clerk, lead tech, QCM) that are currently impossible.
**Why #1:** This is the only recommendation that, if not implemented, means a core regulatory workflow (parts ordering tied to a specific task card and work order) is technically broken for multi-device shops. Every other recommendation improves existing functionality; this one enables functionality that does not currently work.

---

### Change 2: Gate Finding Dispositioning to QCM/Manager Roles
**Scope:** `/work-orders/[id]/findings/[discrepancyId]` RBAC + adding dispositioning controls visible only to authorized roles
**Impact:** Closes a regulatory compliance gap (FAA Part 145 §145.201(b) independent inspection requirement) while also fixing the QCM inspector dead-end that Team 1 flagged. Two problems solved in one focused change.
**Why #2:** This is the only P0 item with a direct FAA regulatory violation risk. All other P0 items are data integrity or UX failures; this one is a regulatory architecture failure.

---

### Change 3: Redesign the Personnel Training Page (11 Tabs → 5 + Analytics Split)
**Scope:** `/personnel/training` — reduce to 5 tabs (Records, Compliance, Requirements, Sign-Off Queue, Run/Taxi Quals); move OKR/KPI/efficiency analytics to `/reports` or a dedicated training analytics sub-section
**Impact:** The training page is the worst-usability page in the entire application (2/5 Usability) and is the primary tool for training managers managing regulatory compliance of technician qualifications. The 11-tab overflow makes most of the page inaccessible on standard displays. Training managers are compliance administrators — making their primary tool the worst-rated page in the app is a systemic failure.
**Why #3:** High administrative user impact + regulatory domain + confirmed layout bug (tab overflow) + quickest path to real usability improvement for a user role (training manager) that currently has the worst experience in the app.

---

### Change 4: Implement Multi-Step Onboarding Wizard (First-Run Only)
**Scope:** New `FirstRunWizard` component for new org creation; keep `OnboardingPage` for admin second-org creation; 5-step wizard including FAA certificate capture
**Impact:** New customers who sign up today cannot properly configure their operation. They receive no guidance on FAA certificate numbers, primary location setup, staff invitation, or capability configuration. They reach `/dashboard?setup=complete` with no indication of what "complete" means. Fixing onboarding improves every subsequent user experience because users who complete setup correctly encounter fewer dead ends throughout the app.
**Why #4:** Onboarding is multiplied across every new customer. Every deficiency in onboarding is experienced by 100% of new users and compounds into misconfiguration problems that surface later as confusing behavior.

---

### Change 5: Add Breadcrumb Navigation to All WO Sub-Pages
**Scope:** Add a `<Breadcrumb>` component to all pages under `/work-orders/[id]/*` showing: Work Orders / WO-{number} / {Page Name}
**Impact:** Technicians on shop-floor tablets who navigate directly to a task card (via QR code or bookmark) have no spatial awareness of where they are in the app hierarchy. The WO section creates a 4-level deep navigation path with no visual wayfinding. Breadcrumbs also enable the "raise a finding and return to task card" workflow that currently loses the technician's scroll position.
**Why #5:** This is a single shared component addition that fixes navigation for the entire WO sub-tree — the most-used section of the app for daily operational users (technicians). High ROI per implementation effort.

---

### Change 6: Surface Sidebar Entries for Key Hidden Pages
**Scope:** Add to sidebar: `Findings` (P1-02), deduplicate Prospect Intelligence and Sales Training entries (P2-11), rename Lead Center/Lead Workspace for disambiguation
**Impact:** The QCM inspector's primary tool (`/findings`) has no sidebar entry. The Prospect Intelligence pages appear twice in the sidebar under two different groups. These navigation failures mean that the users who most need certain pages either cannot discover them or see them listed under confusing duplicate entries. Fixing navigation is prerequisite to all other usability improvements.
**Why #6:** Navigation is the frame around all content. Every page-level usability improvement is degraded by navigation that makes the page hard to find or confusingly labeled.

---

### Change 7: Implement Positive Confirmation States in the WO Completion Flow
**Scope:** Green "All checks passed — ready to sign off" banner on WO Detail when `canClose: true`; "All steps complete — sign off this work card" prompt on Task Card Detail; "Proceed to Sign-Off" CTA on RTS checklist all-pass
**Impact:** Safety-critical completion workflows currently have no positive confirmation. In an MRO context, "nothing is wrong" does not communicate "everything is right." Technicians and QCM inspectors need explicit positive signals that work is complete and ready for the next step, not just the absence of amber warnings. This is particularly important for QCM inspectors who may review a WO quickly and need an unambiguous "ready" signal.
**Why #7:** In safety-critical workflows, positive confirmation states are not UX polish — they are procedural safeguards. The absence of "all clear" confirmation is an operational risk in an FAA-regulated maintenance environment.

---

### Change 8: Standardize Tab Counts (Cap at 5 With Overflow)
**Scope:** WO Detail (7→5 tabs), CRM Account Detail (7→5 tabs), Personnel Training (addressed in Change 3)
**Impact:** Tab overflow causes the tab bar to wrap to a second line on screens narrower than 1200px — a layout failure that makes secondary tabs inaccessible without knowing to scroll horizontally. Both affected pages are high-frequency, multi-role pages. Reducing tab counts simplifies cognitive load and fixes the layout on tablet/laptop screens.
**Why #8:** Tab overflow is a hard layout failure (not a soft usability preference) that affects any user on a tablet, a 13" laptop, or a smaller monitor — the most common hardware contexts for both technicians and managers.

---

### Change 9: Fix the CRM/Billing Module Split for Core Account Actions
**Scope:** Enable inline editing of customer name, type, phone, and email from the CRM Account Detail page without routing to `/billing/customers/[id]`; remove the "Edit in Billing" button; pre-populate customer ID when "Create Quote" is triggered from an account
**Impact:** CRM users performing routine account management (updating a customer's contact info after a personnel change, creating a quote from an account) are routed out of the CRM module for both actions. This breaks the CRM user's mental model of "all account information lives here." The fix does not require full canonical view unification — just exposing the existing `updateCustomer` mutation from the CRM view.
**Why #9:** The CRM→Billing round-trip is the most frequently reported workflow friction in the CRM section. Every time a sales or account manager has to click "Edit in Billing" they are reminded that the tool they are in is not the authoritative record, undermining trust in CRM as a system of record.

---

### Change 10: Add Training Record Soft-Delete and Surface Certificate Page Audit Fields
**Scope (combined):** (a) Replace `removeTraining` hard-delete with soft-delete (`archivedAt` field) on training records; add `createdBy`/`createdAt` columns to 8130-3/EASA Form 1 certificate list
**Impact:** These two changes address separate regulatory compliance gaps. Hard-deleting training records may violate FAA retention requirements. Missing creator/date on release certificates creates audit traceability gaps under FAA §145.221. Neither change is complex technically, but both have regulatory implications that elevate their urgency beyond typical UX polish.
**Why #10:** Both are low-implementation-effort, high-regulatory-impact fixes. Soft-deleting instead of hard-deleting training records requires adding one nullable field to the schema and one filter in the list query. Adding `createdBy`/`createdAt` to the certificate list requires adding two columns to an existing table component. The regulatory risk-reduction per hour of engineering is among the highest of any recommendation in the full evaluation.

---

## Final Observations: What the Evaluation Did Well and Where It Has Blind Spots

### Strengths of the Multi-Agent Evaluation Approach
- Comprehensive coverage: 130+ pages across all modules evaluated systematically
- Domain-appropriate scoring: teams correctly identified MRO-specific concerns (AOG sorting, compliance readiness, RTS workflow)
- Consistent issue taxonomy: cross-cutting themes (localStorage, tab overflow, UTC timestamps) were independently identified by multiple teams, providing convergent validation
- The orchestrator synthesis correctly identified the 3 most impactful architectural problems (localStorage, CRM/Billing split, training fragmentation)

### Blind Spots That Future Evaluations Must Address
1. **No live user testing** — all evaluations were static code reviews. Real technician behavior, keyboard navigation paths, and tablet interaction patterns cannot be inferred from JSX.
2. **No accessibility audit** — a formal WCAG 2.1 accessibility audit is needed before any public launch.
3. **No performance profiling** — Convex query subscription counts, bundle sizes, and time-to-interactive for the most complex pages (WO Detail, Scheduling) were not measured.
4. **No cross-browser / cross-device testing** — Safari on iPad, Chrome on Android tablet, and Firefox on desktop may render the same components differently. The tab overflow issues are the most obvious example of viewport-dependent failures.
5. **No FAA-domain-expert review** — the regulatory analysis in this document is based on publicly available FAA Part 145 regulation text, not a review by a Designated Airworthiness Representative (DAR) or FAA-savvy QCM inspector. A compliance expert review of the compliance workflow pages before production launch is strongly recommended.
