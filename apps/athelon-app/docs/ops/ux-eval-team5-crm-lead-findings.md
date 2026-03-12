# UX/Usability Evaluation — CRM, Lead Center, and Findings

**Evaluator:** Team 5 — CRM, Lead, Findings Section
**Date:** 2026-03-12
**Scope:** 11 page surfaces across `/crm/*`, `/lead`, and `/findings`

---

## CRM Section

---

### `/crm/dashboard` — CRM Dashboard

**File:** `app/(app)/crm/dashboard/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Clean, data-rich overview dashboard with KPI cards, activity feed, top-customers table, and revenue breakdown by customer type.

**Issues:**

- The "Add Customer" and "Create Quote" quick-action buttons at the bottom link away to `/billing/customers` and `/sales/quotes/new` respectively. They leave the CRM module entirely, breaking context. A user in CRM who wants to add a customer is navigated out of CRM with no breadcrumb back.
- The `healthTrend` indicator on the "Avg Health Score" KPI card is derived purely from the current score value (>=75 = up, >=50 = neutral, <50 = down), not from a period-over-period delta. This means the arrow icon is static and misleading — it signals direction without any actual trend data.
- The "Revenue by Customer Type" section renders a flat horizontal grid of cards at the bottom with no visual weight hierarchy. At small breakpoints (1-2 columns), five type cards wrap erratically.
- The empty-state experience links to `/billing/customers` to add a first customer. This is confusing — a CRM user would expect to add a customer from within CRM, not be routed to billing.

**Recommendations:**

- Replace the "Add Customer" quick action with a deep link into the CRM accounts creation flow (or a modal) so the user stays in CRM context.
- Label the health trend arrow "vs last period" or remove the arrow entirely until a true delta is computed.
- Replace the "Revenue by Customer Type" card grid with a simple horizontal bar chart (or at minimum a progress-bar breakdown) to make segment proportions scannable at a glance.
- For the empty state, offer an inline path to create the first account rather than routing to billing.

---

### `/crm/accounts` — Accounts Directory

**File:** `app/(app)/crm/accounts/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Solid table-and-card directory with responsive layout, four filters (type, health, status, sort), and client-side filtering. Executes the core accounts-list use case well.

**Issues:**

- Four filter dropdowns in a single row create visual clutter on screens narrower than 1024px. They wrap but lose alignment context — there is no label grouping or visual separator between search and filters.
- The "Add Customer" button navigates to `/billing/customers`, not to a CRM-native add flow. A CRM user adding an account should not be redirected to a billing module. This is the same break-out-of-context issue as the dashboard.
- The Status filter (Active/Inactive/All) defaults to "Active," which means inactive accounts are hidden by default with no persistent indicator that accounts are being filtered. A user may incorrectly believe their account list is complete.
- Sort and filter state is not preserved when navigating to an account detail and pressing Back. The user returns to the default state, losing their place.
- No bulk actions (e.g., bulk export, bulk assign health review). At scale this becomes a gap.
- The "Health Score" filter vocabulary ("Excellent/Good/At Risk") does not match the analytics page ("Excellent/Good/At Risk/Critical"). Four buckets on analytics vs. three here creates inconsistency.

**Recommendations:**

- Add an inline "Add Account" dialog or a CRM-native create form to avoid routing users to billing.
- Display an amber filter-active indicator (pill or badge) on the Status filter when set to anything other than "All" so users know they may not be seeing all accounts.
- Persist filter/sort state in URL query parameters so browser Back works as expected.
- Align the health score filter vocabulary (three vs. four buckets) with the Analytics page.

---

### `/crm/accounts/[id]` — Account Detail (7-tab view)

**File:** `app/(app)/crm/accounts/[id]/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Comprehensive account record with seven tabs: Overview, Contacts, Aircraft, Work History, Quotes & Invoices, Interactions, Documents. Information richness is high; cognitive load is also high.

**Issues:**

**Tab count and grouping:**
- Seven tabs is at the upper limit of what users can scan efficiently. Cognitive load research suggests 5 is comfortable; 7 is feasible only if the tab labels are clearly distinct.
- "Work History" and "Quotes & Invoices" cover overlapping territory — both represent the transactional relationship with the customer. Work orders are billing documents in this MRO context. A user looking for billing will scan both tabs.
- "Documents" is low-frequency relative to the other tabs. Elevating it to a top-level tab alongside Contacts and Aircraft inflates the tab bar without proportional value.

**Header action ambiguity:**
- The header has three quick action buttons: "Log Interaction", "Create Quote", and "Edit in Billing." The "Edit in Billing" button explicitly routes users away from the CRM view to `/billing/customers/[id]`. This surfaces the structural friction between CRM accounts and billing customers — they are the same entity viewed from different modules, and the "Edit in Billing" link implicitly admits that CRM cannot edit account data.
- "Create Quote" links to `/sales/quotes/new` without pre-populating the customer. A user who navigates here from an account detail page must re-select the customer in the quote form.

**Tab content issues:**
- The Overview tab shows a "Recent Activity" feed (last 10 interactions). This creates content duplication: the same interactions appear in the Interactions tab. Users may not realize the Interactions tab has more historical data.
- The Contacts tab within this page uses a table without an "Edit Contact" or "View Contact" action per row. Users can add a contact but cannot edit one from this view.
- The Work History tab splits work orders into "Active" and "Completed" sections but uses `ACTIVE_WO_STATUSES` which includes statuses like `open_discrepancies`. The section heading "Active Work Orders" is accurate but may confuse users who see a WO with open discrepancies — they may expect that to be a different category.

**Recommendations:**

- Reduce to 5 tabs by merging: (1) merge "Work History" + "Quotes & Invoices" into a single "Transactions" tab with internal sub-tabs or filters, and (2) move "Documents" into the Overview tab as a collapsible card.
- Pre-populate the customer ID when "Create Quote" is triggered from an account detail page.
- Replace "Edit in Billing" with inline edit capability for core fields (name, type, contact info) directly in CRM, or rename the button to "Full Record in Billing" to set clearer expectations.
- Add an "Edit" action per contact row in the Contacts tab.

---

### `/crm/prospects/intelligence` — Prospect Intelligence

**File:** `app/(app)/crm/prospects/intelligence/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** A large (85KB+), feature-dense page for browsing, filtering, and qualifying Part 145 MRO prospects from a static research corpus. Supports tile/list/expanded view modes and per-prospect qualification assessment with Convex persistence.

**Issues:**

**Differentiation from Part 135 page:**
- At the navigation level, both prospect pages ("Prospect Intelligence" and "Part 135 Intelligence") have nearly identical UI paradigms (filter bar, tile/list/expanded view modes, qualification workflow, Tier A/B/C system). The conceptual difference — one is about competing MRO shops (Part 145), the other is about potential MRO customers (Part 135 air charter operators) — is not surfaced in the page headers, subheadings, or any orienting text beyond the page title.
- A new user looking at the navigation sidebar will see two near-identically structured pages and have no context for when to use which.

**Complexity and cognitive load:**
- The filter bar exposes 6–7 filters simultaneously (assessment status, outreach tier, manual review, contact completeness, source type, plus a search box). This is the maximum productive complexity for an advanced user but overwhelming for an occasional user.
- Three view modes (Tiles, List, Expanded) add value but also add a mode-decision step every time the page loads. The default "tiles" mode shows condensed cards that truncate most fields, so users must switch to "expanded" to see actionable data — creating a common two-click tax.
- The pagination system (page-size 50 with national+enriched record fusion) means the user is working against a very large, static dataset. There is no indication of total record count in the filter bar header.

**Detail panel / prospect detail route:**
- The page handles both the directory (`/crm/prospects/intelligence`) and a detail view (`/crm/prospects/intelligence/:prospectId`). The route duality means the URL does not change when viewing a prospect detail — the Back button is a UI element, not the browser's Back. This breaks browser history navigation.

**Recommendations:**

- Add a clear orienting subheadline to each prospect page: e.g., "Part 145 Intelligence — Competing MRO shops you may partner with or sell to" vs. "Part 135 Intelligence — Air operators who need MRO services."
- Collapse the filter bar behind a "Filters" button by default; show only search and the most important primary filter (assessment status) inline. Expand on demand.
- Navigate to `/crm/prospects/intelligence/:id` as a real URL change rather than internal state so browser Back works.
- Show the total filtered count prominently above the prospect list ("Showing 128 of 3,400 prospects").

---

### `/crm/prospects/part135` — Part 135 Operator Intelligence

**File:** `app/(app)/crm/prospects/part135/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Structurally and functionally near-identical to the Part 145 Intelligence page, but sourced from FAA Part 135 air operator registry data. Adds fleet size and turbine filters specific to operators.

**Issues:**

**Near-duplicate UX with no clear differentiation:**
- The page header says "Part 135 Intelligence" but the subtitle and filters don't explain the core distinction to a user who didn't configure this data. Both pages feel like variations of the same tool.
- The Part 135 page has an additional cross-reference feature (it looks up matching Colorado Part 145 research records by name and attaches a "145 shop nearby" badge), but this cross-reference logic is invisible in the UI — it's computed silently with no explanation or toggle.

**Prospect-to-customer conversion flow:**
- Both prospect intelligence pages offer a "Promote to Customer" action within the qualification assessment workflow. However, after promotion, the user is not navigated to the new CRM account record — they stay on the prospects page with no visible confirmation of where the new account lives. The conversion flow drops context.

**Additional filter complexity:**
- The Part 135 page adds "Fleet Size" and "Turbine" filters on top of the shared filters, bringing the total to 8 filter dimensions. This is above the threshold for comfortable ad-hoc exploration.

**Recommendations:**

- Add a brief "What is this data?" tooltip or banner on each prospect page explaining the source (FAA Part 135 registry, enriched with X records) and the intended use case (find air charter operators who need MRO services).
- After "Promote to Customer," navigate to or show a toast with a link to the new account record in CRM: "Account created — View [Company Name] in CRM →".
- Consider merging both intelligence pages into a single "Prospect Intelligence" page with a top-level tab for "Part 145 Shops" vs "Part 135 Operators," so the common filtering infrastructure is shared and the difference is prominently labeled.

---

### `/crm/contacts` — Contacts Directory

**File:** `app/(app)/crm/contacts/page.tsx`
**Usability:** 4/5 | **Logic:** 3/5
**Summary:** Cross-account contacts directory with search, account filter, role filter, and primary-contact toggle. Clean table and responsive card layout.

**Issues:**

**No contact detail view:**
- Contacts are listed with phone, email, role, and last-contacted date, but there is no row-level action to view a contact's full record, edit their information, or log an interaction directly against them. The contact row is a dead end — clicking a row does nothing (there is no `onClick` handler on the table rows, unlike the Accounts table which has cursor-pointer navigation).
- The only CRM-level interaction is with the account, not the individual contact. For MRO sales, the Director of Maintenance or Chief Pilot is often the primary relationship — having no contact-level detail view is a notable gap.

**Account filter UX:**
- The account filter dropdown loads all customers in the system. If an org has 100+ customers, this is a very long dropdown with no search capability. This is a usability regression at scale.
- The account name shown in the Company column links to `/crm/accounts/[customerId]`, which is correct, but there is no visual treatment (underline color, arrow icon) to communicate this is a clickable link — it's just blue text on a table cell background.

**No edit action:**
- There is no way to edit a contact from this page. The only mutation surface is "Add Contact" via dialog. Editing requires navigating to the account detail page's Contacts tab.

**Recommendations:**

- Add click-through to a contact detail view (`/crm/contacts/[id]`) with edit capability and a shortcut to log an interaction against that specific contact.
- Replace the account filter dropdown with a search-and-select combobox that supports filtering by typing.
- Make the Company column link visually unambiguous (underline on hover, external link affordance) or add a small "→" icon.

---

### `/crm/interactions` — Interactions Log

**File:** `app/(app)/crm/interactions/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Organization-wide interaction timeline with type and customer filters, a timeline component, and a "Log Interaction" action. Functionally complete for its scope.

**Issues:**

- The "Log Interaction" dialog at this page level requires the user to select a customer from a dropdown when logging. If the user is looking at the Interactions page (cross-account view), they must remember which customer they intend to log against, which is a working-memory tax.
- There is no date range filter. The timeline shows all interactions chronologically with no ability to scope to "last 30 days" or a custom range. For orgs with high interaction volume, the timeline becomes a scroll-intensive experience.
- The follow-up completion action (`onCompleteFollowUp`) is exposed in the `InteractionTimeline` component but there is no visible indicator of which interactions have a pending follow-up versus none. The affordance to complete a follow-up only appears contextually within timeline items — users must scroll to find them.
- No interaction edit capability. Once logged, an interaction can be completed but not corrected for subject, type, or description.

**Recommendations:**

- Add a date range filter (presets: "Last 7 days", "Last 30 days", "Last 90 days", custom range).
- Add a "Pending Follow-ups" filter badge that highlights interactions flagged for follow-up. This mirrors the attention-management model of other CRM tools.
- Add inline edit for interactions (at minimum: subject, description, outcome).
- Consider whether the standalone Interactions page adds enough over the per-account interactions tab to justify a separate nav entry. It is useful for cross-account views (e.g., "all calls this week") but the two surfaces should be clearly distinguished in their UX — the standalone page should emphasize the cross-account perspective.

---

### `/crm/pipeline` — Sales Pipeline

**File:** `app/(app)/crm/pipeline/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A two-tab pipeline page combining an AI-prediction-driven opportunity list (derived from maintenance predictions) and a manually entered CRM opportunity pipeline. Both have Kanban and table views.

**Issues:**

**Conceptual confusion between the two tabs:**
- "Prediction Pipeline" and "Manual Pipeline" represent fundamentally different data with different origins, stages, and workflows. The prediction tab is powered by maintenance forecasting (work that existing customers are likely to need), while the manual tab is a traditional sales pipeline (new business from prospects). Presenting them as two tabs of the same page implies they are variants of the same workflow — they are not.
- The prediction pipeline uses 5 statuses (new, contacted, quote_sent, won, lost) while the manual pipeline uses 6 stages (prospecting, qualification, proposal, negotiation, won, lost). These are different stage models with overlapping final states. A user moving between tabs will see inconsistent vocabulary.
- The page title is "Sales Pipeline" and the subtitle says "Prediction-driven opportunities from upcoming maintenance demand" — this describes only the Prediction tab and creates a mismatch when the user clicks the Manual tab.

**Status derivation for predictions:**
- Pipeline status for predictions is derived automatically (`deriveStatus`) from the prediction's backend status + whether an open WO exists. The user has no way to manually override a prediction's pipeline status from this page. A prediction that shows "Won" because a WO was opened does not mean the sale is won in the traditional sense.

**Summary cards only reflect prediction tab data:**
- The three KPI summary cards (Total Opportunities, Pipeline Value, Conversion Rate) at the top of the page are computed exclusively from the prediction pipeline, not the manual opportunities. When the user switches to the Manual tab, they see win/loss summary cards below the table instead. This asymmetry of information positioning is confusing.

**Revenue estimate transparency:**
- Pipeline value is estimated using a hardcoded `$185/hr` blended labor rate with a `TODO` comment: "pull from org billing settings once configurable." The footnote states this but the number is prominent — users may anchor on it as authoritative.

**Recommendations:**

- Split the Prediction Pipeline and Manual Pipeline into two separate pages (or at minimum give the page two clearly differentiated sections rather than co-equal tabs with identical visual treatment). Add an explanatory subheadline for each: "Predicted demand from your existing fleet" vs. "Manually tracked sales opportunities."
- Move shared KPI cards above the tabs and show summary metrics for both pipelines in parallel, or show tab-specific metrics only within each tab's content area.
- Allow users to manually override or dismiss a prediction's pipeline status from the prediction table.
- Add a visible disclaimer on the Pipeline Value card: "Estimated at $185/hr — configure in Billing Settings."

---

### `/crm/analytics` — Customer Analytics

**File:** `app/(app)/crm/analytics/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Analytics page covering health score distribution, churn risk distribution, customer lifetime value (top 20 table), revenue by segment, and acquisition/retention counts. Information-dense but well-organized.

**Issues:**

- The "MRO Health Scoring Algorithm" table is surfaced prominently as a full card in the middle of the analytics page. This is documentation embedded in a report view. While transparency about the algorithm is valuable, placing it as a visual peer to actual data metrics (health distribution cards, CLV table) creates a content-type mismatch. It should be behind a "How is this calculated?" disclosure instead.
- The health distribution uses four bucket labels ("Excellent", "Good", "At Risk", "Critical") but the Accounts page filter uses three buckets ("Excellent", "Good", "At Risk"). The vocabulary inconsistency means a user who filters for "At Risk" accounts will not find accounts scored 0–24 (which are labeled "Critical" here but fall under the Accounts page's "At Risk" filter).
- The Customer Lifetime Value table is capped at 20 rows with no pagination or "see all" link. For orgs with more than 20 customers, there is no way to inspect lower-ranked customers from this page.
- The Acquisition & Retention section uses two identical `UserPlus` icons for "New (30 days)" and "New (90 days)" — the visual icon does not differentiate the two metrics.
- Clicking a row in the CLV table navigates to the account detail, but there is no visual affordance (cursor-pointer style on rows, underline, link icon) to communicate that the rows are clickable until the user hovers.

**Recommendations:**

- Move the health scoring algorithm table to a collapsible "How is Health Score calculated?" disclosure section or a tooltip/modal, not a primary card.
- Align health score bucket labels with the Accounts page filter vocabulary (4 buckets everywhere, or 3 everywhere).
- Add a "View All" link below the CLV table that routes to the Accounts page pre-sorted by revenue.
- Add `cursor-pointer` and a hover state on CLV table rows to signal clickability.
- Use distinct icons for 30-day vs. 90-day acquisition metrics.

---

## Lead Section

---

### `/lead` — Lead Center

**File:** `app/(app)/lead/page.tsx` + `_components/`
**Usability:** 3/5 | **Logic:** 5/5
**Summary:** A consolidated lead technician workspace combining shift board, task feed, work order monitor, time/hours overview, roster management, and shift turnover reporting — all behind a 6-tab interface. The consolidation rationale (previously split across multiple pages) is documented in inline comments.

**Issues:**

**Tab count and scope:**
- Six tabs in a single page covers a wide surface area. The tabs range in scope from high-frequency operational actions (Shift Board, Task Feed) to lower-frequency reporting (Turnover) and reference tools (Roster). This breadth means the page serves multiple user intents simultaneously, which can dilute focus.
- The "Roster" tab renders a lazily loaded `SchedulingRosterWorkspace` component that is visually and functionally a full sub-application — embedding a full scheduling workspace as a tab creates a significant scope jump relative to the other tabs.

**Date picker and report context:**
- The report date picker is positioned in the page header and applies to the workspace data globally. Changing the date changes data across multiple tabs. This global state control is not visually prominent — it's a small date input in the header. A user who does not notice they're viewing a past date will see stale data without obvious indication.
- The KPI stat cards below the header show "Report Date" as a card value (which restates what is already in the header input) alongside "Total Applied Hours" and "WO Hours." The Report Date card occupies one of four KPI card slots, displacing a potentially more useful metric (e.g., technician count, task completion rate).

**RBAC gate:**
- The page gates on `ALLOWED_ROLES = new Set(["lead_technician", "shop_manager", "admin"])`. This is correct behavior, but the access-denied state ("Lead Center Access Required") is a full-page block with a "Back to dashboard" link. Users who are not lead technicians but view this via a direct URL may not understand why they are blocked — the message could explain who to contact.

**Turnover status indicator:**
- The "Turnover" tab displays an amber dot if a draft exists and a green dot if submitted. This is a good affordance, but the status is only visible when looking at the tab label. There is no persistent banner or top-of-page indicator of the turnover report status for the selected date.

**Recommendations:**

- Consider moving the Roster tab to a dedicated scheduling section (it already exists at `/scheduling`) and replacing it with a condensed "Team Roster" summary card on the Shift Board tab to reduce scope.
- Make the date picker more visually prominent with a label like "Viewing shift for:" and a visual indicator (e.g., colored border on the input) when a non-today date is selected.
- Replace the "Report Date" KPI card with a more operationally useful metric (e.g., "Technicians On Shift").
- Add a persistent turnover status banner above the tabs when the report for the current date is in draft state.

---

## Findings Section

---

### `/findings` — Findings

**File:** `app/(app)/findings/page.tsx`
**Usability:** 4/5 | **Logic:** 3/5
**Summary:** Cross-organization findings (discrepancies) browser with three KPI cards (Open, Critical, Deferred), a status tab filter, search, a card list, and a disposition action. Well-executed at the component level but raises a structural question.

**Issues:**

**Standalone page vs. work-order integration:**
- Findings/discrepancies are created from within work orders and are fundamentally tied to a specific WO context (aircraft, task, inspector, date). The Findings page presents them decontextualized — the aircraft tail number, associated work order number, and inspection context are buried in the card metadata or absent.
- The primary CTA button says "Log Finding from Work Order" and routes the user to `/work-orders`. This is an admission that findings cannot be created from this page. The button creates navigational friction: the user must leave Findings, find the right work order, navigate into it, and then log the finding there.
- The conceptual model question: is this a "Findings Tracker" (a management view for QC/QCM) or an entry point for logging findings (a technician workflow)? Currently it is the former, but the button treatment implies the latter. Picking one primary user role and designing for it would clarify the page purpose.

**Severity label mismatch:**
- The findings page maps internal `discrepancyType` values to human-readable severity labels: `mandatory` → "Critical", `recommended` → "Major", `customer_information` → "Minor", `ops_check` → "Observation." These labels are a translation of regulatory terms into plain language, but neither the internal values nor the display labels are explained on-screen. A QCM inspector reviewing findings must know what these map to in the FAA-regulated sense.

**Filter simplicity — positive:**
- The four-tab status filter (All/Open/Deferred/Resolved) plus text search is appropriately minimal for a findings list. This is a strength — it does not over-engineer a fundamentally simple filtering need.

**Deferred disposition logic:**
- "Deferred" is filtered by disposition values (`deferred_mel`, `deferred_grounded`), not by a dedicated `deferred` status. This is technically correct but the filter label could be misleading for a QCM inspector who knows "deferred" has specific MEL/CDL regulatory meaning.
- The "Resolved" filter maps to `status === "dispositioned" && disposition !== deferred_*`. This means a finding with disposition "repaired" and status "dispositioned" shows under Resolved — which is correct. But a user does not see these mapping rules; they must trust the filter is correct.

**WO link:**
- The "View WO →" link is shown inline in the finding card metadata when `d.workOrderId` exists. This is good — it provides the path back to context. The inline comment (BUG-LT-HUNT-009) confirms this was a documented UX fix. However, the link appears at the same visual weight as component name and date metadata, making it easy to overlook.

**Recommendations:**

- Add "Aircraft Tail" and "Work Order Number" as primary-level metadata displayed prominently on each finding card (not buried in the secondary metadata row), so QCM inspectors can identify the finding's context without clicking into the WO.
- Replace the "Log Finding from Work Order" button with a more honest "Open Work Orders" button, and add explanatory text: "Findings are created from within Work Order records during inspections." This reframes the page as a management/review view, not an entry point.
- Elevate the "View WO →" link to a standalone button ("Open Work Order") rather than inline text at metadata weight.
- Add a secondary filter for severity (Critical/Major/Minor/Observation) to support QCM use cases where inspectors need to review all Critical findings across all WOs quickly.

---

## Section Summary

### Overall CRM Architecture Observations

**The CRM/Billing account duplication problem is the most significant structural issue in this section.** Accounts in CRM (`/crm/accounts/[id]`) and customers in Billing (`/billing/customers/[id]`) are the same underlying entity (`customers` table). The CRM view adds health scores, interactions, and pipeline data; the billing view adds invoicing and payment data. But users are routed between the two modules via explicit "Edit in Billing" / "Add Customer" cross-links throughout the CRM section. This creates a fragmented user mental model where the "real" record is not clearly owned by one module.

**Recommendation:** Establish a canonical "Account" view that combines billing and CRM fields in one place, with two tab groups: "Relationship" (CRM) and "Billing" (invoices, payments). The current split should be treated as a phase 1 limitation with a clear path to consolidation.

**The prospect intelligence pages are near-duplicate surfaces.** Part 145 Intelligence and Part 135 Intelligence share nearly identical architecture, filter patterns, qualification workflows, and visual design, but represent completely different prospect categories with different strategic purposes. Without a clear orienting explanation in the UI, users who are not deeply familiar with FAA certificate types will treat these as interchangeable.

**Conversion flow is incomplete.** The path from Prospect → Account → Customer → Billing is implied but not guided. A user who qualifies a prospect in the intelligence pages, promotes them to a customer, and wants to begin a sales engagement must navigate manually between Prospects, Accounts, Pipeline, and Contacts with no wizard or guided flow.

### Score Summary

| Page | Usability | Logic |
|---|---|---|
| CRM Dashboard | 4/5 | 4/5 |
| Accounts Directory | 4/5 | 4/5 |
| Account Detail (7 tabs) | 3/5 | 4/5 |
| Prospect Intelligence (Part 145) | 3/5 | 4/5 |
| Prospect Intelligence (Part 135) | 3/5 | 4/5 |
| Contacts Directory | 4/5 | 3/5 |
| Interactions Log | 4/5 | 4/5 |
| Sales Pipeline | 3/5 | 3/5 |
| Customer Analytics | 4/5 | 4/5 |
| Lead Center | 3/5 | 5/5 |
| Findings | 4/5 | 3/5 |

### Top 5 Priority Issues (Highest Impact)

1. **Account detail tab count (7 tabs) — merge "Work History" + "Quotes & Invoices" into "Transactions."** Reduces cognitive load immediately.
2. **Pipeline page conceptual confusion — prediction vs. manual pipelines should be separated.** The mixed vocabulary and asymmetric KPI cards mislead users about what they are looking at.
3. **CRM/Billing module split — "Add Customer" and "Edit in Billing" cross-links break CRM context.** The current design routes users out of CRM for core account management actions.
4. **Prospect intelligence pages have no orienting explanation** — Part 145 vs. Part 135 distinction is not surfaced in the UI, making both pages opaque to new users.
5. **Contacts directory has no click-through or edit path** — contacts are a dead-end list; this is a core CRM gap for relationship management at the individual contact level.
