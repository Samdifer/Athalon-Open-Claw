# UX Evaluation — Settings, Auth, Customer Portal, Onboarding
**Evaluator:** Team 7 (Settings / Auth / Portal)
**Date:** 2026-03-12
**Scope:** 22 pages across 4 feature areas

---

## Settings Pages

---

### `/settings/shop` — Shop Settings
**File:** `app/(app)/settings/shop/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Functional form for primary repair-station data, but mixes unrelated concerns (Demo Apps card) and has several stub sections that reduce trust.

**Issues:**
- The "Demo Apps" card is hardcoded to `localhost:3001` and `localhost:3002` — this is a development artifact that must never reach production. It creates confusion for shop managers who have no concept of "demo skins."
- "Operating Hours" section is entirely read-only with placeholder values (Mon–Fri 7–5, Sat/Sun closed). The note says "Edit via schedule management" but there is no link to that page. This is a dead end.
- The "Branding" section — color inputs are `readOnly` and the logo uploader has no `<input type="file">` wired — the drag-and-drop zone and color pickers are visual-only placeholders. Nothing saves.
- The save button is at the bottom of the page but only saves the top `Repair Station Information` card's fields. The branding card appears visually equivalent but is entirely non-functional — there is no affordance to distinguish live from stubbed sections.
- The `certificateType` field is not passed to `updateShop` (only `createShop` sends it). Once a shop is created, the certificate type cannot be changed through this form.
- The page title says "Shop Settings" but the card says "Repair Station Information" — inconsistent labeling.
- The quick-links card at the bottom renders without a header or context, making it feel orphaned.

**Recommendations:**
- Remove the Demo Apps card entirely from production code, or gate it behind a `VITE_SHOW_DEMO_LINKS=true` env flag.
- Replace the static Operating Hours display with a real link: "Edit in Station Config →" pointing to `/settings/station-config?tab=scheduling`.
- Stub out non-functional sections with a clear "Coming soon" badge rather than rendering them as live form fields. The branding section at minimum needs an explicit `[Not yet configurable]` marker.
- Fix `updateShop` to include `certificateType` in its payload.
- Unify terminology: pick either "Shop Settings" or "Repair Station" and use it throughout the page headers and breadcrumbs.

---

### `/settings/users` — User Management
**File:** `app/(app)/settings/users/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** The most complete settings page — thoughtful dual-identity model (Clerk accounts + technician profiles), good use of tabs, role-guards, and access authorization controls. Minor friction points only.

**Issues:**
- The page is admin-only (wrapped in `RoleGuard allowedRoles={["admin"]}`), which is correct, but non-admin users who navigate here land on a blank guard with no explanation. They should see a "You need admin access" message rather than nothing.
- "Link" vs "Unlink" membership buttons appear on cards with no confirmation dialog. Unlinking a member from their technician profile has downstream effects (assignments, sign-offs) but is presented as a single-click ghost button action.
- Invitation tab shows a raw timestamp column ("Expires At") formatted as `Jan 1, 2026, 12:00 AM` — fine, but the "Invited" / "Revoked" status states are entirely lowercase and inconsistent with the rest of the badge system.
- The access authorization checkboxes (RII, etc.) and role selectors appear inside a modal. With 8 MRO roles and 6+ access authorizations, this modal can become very dense on small screens.
- No search or filter on the technician directory list.

**Recommendations:**
- Add a graceful fallback for non-admin visitors: `<AccessDeniedEmptyState>` component with a link back to dashboard.
- Add a confirmation `AlertDialog` before unlink actions, citing the downstream impact on work order records.
- Standardize badge capitalisation — use the existing `RoleBadge` component pattern everywhere.
- Consider a two-panel layout (directory list on left, profile editor on right) for the linked-accounts workflow instead of a modal, or at minimum paginate the access authorization list with collapsible sections.

---

### `/settings/notifications` — Notification Preferences
**File:** `app/(app)/settings/notifications/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Clean and simple toggle list, but critically limited: preferences are org-wide rather than per-user, there is no delivery channel configuration (email vs. in-app), and the scope of "you" in "notifications you want to receive" is ambiguous.

**Issues:**
- The page heading says "Choose which notifications you want to receive" but the mutation `updatePreferences({ organizationId, disabledTypes })` writes to the org level. If an admin disables "Task Assignments" here, it disables them for every user. This is a fundamental logic error — the copy implies personal preferences but the data model is org-wide.
- No indication of how notifications are delivered — email, push, in-app, or all three?
- No per-role scoping: technicians may not need invoice notifications; billing managers may not need "Task Completed" pings.
- The 11 notification types are displayed as a flat list with no grouping (operational vs. financial vs. compliance).
- No "disable all" / "enable all" quick action.
- The page has a full `max-w-2xl mx-auto p-6` container while other settings pages use `max-w-2xl` without centering — inconsistent layout within the settings section.

**Recommendations:**
- Rename to "Notification Settings" and clarify prominently at the top whether these are personal preferences or org-wide defaults.
- Separate per-user notification preferences from org-wide defaults — at minimum add a header note: "These settings apply to your account only" if the intent is personal, or "These settings apply to all users in your organization" if org-wide.
- Add delivery channel toggles (Email / In-App) per notification type, or at minimum per section.
- Group notification types: Operational (WO, task, RTS), Financial (invoice, quote), System.
- Remove the `p-6` from the container — let the settings layout control padding consistently.

---

### `/settings/locations` — Shop Locations
**File:** `app/(app)/settings/locations/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Functional CRUD for shop locations, but conceptually redundant with Station Config's Facilities & Bays tab. The two pages manage the same `shopLocations` table and confuse administrators.

**Issues:**
- This page and `Station Config > Facilities & Bays` both create/edit/delete `shopLocations`. There is no indication to the user that they are the same data. A shop manager will set up locations here, navigate to Station Config, and find the same locations there, with no explanation.
- The "Map integration coming soon" placeholder card takes prominent vertical space (a `Card` with `p-8 text-center`) and delivers no value.
- Capabilities are entered as a comma-separated text field with no validation, autocomplete, or guidance on valid values. This leads to inconsistent tagging (e.g., "Airframe" vs "airframe" vs "Airframe Maintenance").
- The deactivate action uses the word "Deactivate" in the confirmation but the backend function is `removeLocation` and the UI label shows the red destructive button style — users may believe this is a permanent delete rather than a soft deactivation.
- No way to reactivate a deactivated location from this page (no toggle for inactive locations).

**Recommendations:**
- Consolidate: redirect `/settings/locations` to `/settings/station-config` with the Facilities & Bays tab pre-selected, or clearly document that locations here are the same as in Station Config (add a contextual link).
- Remove or visually downgrade the "Map integration coming soon" card.
- Replace the capabilities free-text field with a multi-select badge input or predefined checkbox list (Airframe, Powerplant, Avionics, Instrument, Radio, Accessory) matching the Capabilities List page options.
- Label the deactivate button "Deactivate" (not destructive red) and add a toggle to show/hide inactive locations with a path to reactivate them.

---

### `/settings/import` — Bulk CSV Import
**File:** `app/(app)/settings/import/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** The best-implemented of the settings tools. Clear 4-step wizard progression, column mapping with auto-detection, per-row validation, preview, and CAMP integration. Minor clarity issues only.

**Issues:**
- The stepped card titles ("1. Select type & upload CSV", "2. Map columns", etc.) only appear after the prior step is completed — this is good progressive disclosure, but users cannot scan ahead to understand what fields will be required before uploading.
- The "mapped object preview" renders raw JSON (`<pre>`) rather than a formatted human-readable table. For non-technical shop managers this is jarring and looks like an error state.
- The CAMP mapping helper (Step 5) appears only for aircraft imports and only when `campAircraftId` is mapped. The label "CAMP mapping helper" will be opaque to users who don't know what CAMP is — no tooltip or explanation is provided.
- Progress bar jumps: 10% on start, then 40% after mapping, then 100% on completion. The gap between 40% and 100% with no incremental feedback will feel like a hang on large imports.
- After a successful import, the CSV preview table and column mapping remain visible with no "Start another import" / "Clear" action other than resetting the type selector.
- Template download only includes one example row — a single populated row is not enough for users to understand column formatting for edge cases.

**Recommendations:**
- Add a collapsible "Required & optional fields" section above the upload button so users can review schema before uploading.
- Replace the raw JSON preview with a proper `<Table>` component showing the first 5 mapped rows with named column headers.
- Add a tooltip on "CAMP" explaining: "CAMP Maintenance is a third-party service. If your data includes CAMP aircraft IDs, use this step to associate them with your fleet records."
- Add a clear "Reset / Import another" button after a completed import run.
- Expand template to include 3–5 example rows with varied data to help users understand expected formats.

---

### `/settings/email-log` — Email Log
**File:** `app/(app)/settings/email-log/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Read-only audit trail for outbound emails. Functionally sound but too limited for production: hardcoded 100-email limit, "Stub" status will confuse non-developers, and there is no filtering or search.

**Issues:**
- The "Stub" badge (shown when `email.stub === true`) is a developer concept leaked into the production UI. Most shop administrators will not understand what "Stub" means.
- Hardcoded `limit: 100` with no pagination — a busy shop sending invoices daily will run out of visible history quickly.
- No date-range filter, recipient search, or status filter (Sent / Failed).
- "Subject" column truncates at ~300px with `truncate` class. Email subjects often contain invoice or work order numbers that are the key identifier — truncation hides the most important data.
- No retry or resend action for failed emails.
- The page is under Settings but it is really an audit/operational log. Placement next to QuickBooks config and shop info feels incorrect.

**Recommendations:**
- Rename "Stub" status to "Test Mode" and add a tooltip explaining it was sent in a test environment.
- Add pagination (or infinite scroll) to the email list.
- Add a search bar filtering by recipient address or subject.
- Make the Subject column non-truncating or expand on hover/click.
- Consider moving Email Log to a `Settings > Audit Logs` submenu or to `Billing` since most emails are invoice/quote notifications.

---

### `/settings/quickbooks` — QuickBooks Integration
**File:** `app/(app)/settings/quickbooks/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Well-structured integration page with connection status, sync toggles, stat cards, and sync log. Blocked by an incomplete OAuth flow that puts the configuration burden on the user.

**Issues:**
- The "Not Connected" state shows an amber warning: "Contact your administrator to set up the QuickBooks integration with your company's Intuit Developer credentials." This is a dead end. There is no path to actually connect — no "Connect QuickBooks" button that initiates the OAuth flow.
- The Sync Log table has an "Entity ID" column showing raw Convex document IDs (`font-mono text-xs`). These are internal system identifiers with no meaning to an accountant.
- Sync status summary shows 4 number cards (Total, Pending, Synced, Failed) using `grid-cols-4 gap-4` at all breakpoints — this breaks on narrow screens.
- The "Test Connection" button works before a connection is established, and the test result is shown as plain small text below the button with no styling — success and failure responses look identical at a glance.
- Sync Settings toggles (Invoices, Payments, Customers, Vendors, Auto Sync) are enabled but have no visual feedback when toggled (no "saving..." state, though the mutation is instant via Convex).

**Recommendations:**
- Add a "Connect QuickBooks" button when not connected that either initiates the OAuth flow or links to setup documentation.
- Replace the raw Entity ID column in the sync log with a human-readable label (e.g., "Invoice #INV-2024-001").
- Make the sync status cards responsive: `grid-cols-2 sm:grid-cols-4`.
- Style the test connection result as a `Badge` or inline alert with clear green (success) or red (failure) visual.

---

### `/settings/station-config` — Station Configuration
**File:** `app/(app)/settings/station-config/page.tsx` + `_components/`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** The most architecturally mature settings page. The four-tab layout (Facilities & Bays, Supported Aircraft, Work Stages, Scheduling) maps cleanly to mental model of a shop manager. The auto-bootstrap on first visit is a nice touch.

**Facilities & Bays Tab:**
- Drag-and-drop bay reordering is well-implemented with `draggable` + drop zone. However, there is no visual "drop target" indicator while dragging — the only affordance is the opacity dimming of the dragged card.
- The deactivate/delete button for locations is an icon-only `Trash2` button at the top of the location header with no confirmation dialog. Deleting a location used by active work orders would be destructive.
- Bay status (`available`, `occupied`, `maintenance`) is displayed as a badge but not editable from the bay card — you must open the edit dialog to change it.
- The location dialog re-implements the same form as `/settings/locations` with the same fields — this duplication of 200+ lines of form code across two files creates a maintenance risk.

**Scheduling Preferences Tab:**
- The "Default Efficiency Multiplier" input field (a decimal like `0.92` or `1.0`) has no explanation of what it means or what values are reasonable. For a shop manager, this is opaque.
- Timeline Cursors ("vertical markers on scheduling timelines") are a power-user feature. The color picker is implemented as a custom popover grid of 28 Tailwind color classes — functional but fragile (depends on Tailwind's JIT not purging those specific class names).
- The sticky "unsaved changes" banner at the bottom is excellent UX — one of the best patterns in the codebase.
- Operating hours use a `Switch` that is inverted: `checked={!day.isOpen}` means the switch is ON when the day is closed. This inverted logic will confuse users.

**Recommendations:**
- Add a confirmation dialog before deactivating a location, and cross-check for active work orders at that location.
- Fix the inverted switch logic in Scheduling — `checked={!day.isOpen}` should be `checked={day.isOpen}` with the label changing from "Open"/"Closed" accordingly.
- Add a tooltip for "Default Efficiency Multiplier": "A value of 1.0 means 100% of scheduled hours are available for work. 0.85 reserves 15% for overhead, setup, and interruptions."
- Add a visual drop target indicator (dashed border, background highlight) during bay drag operations.
- Consolidate the location form into a shared `LocationFormDialog` component used by both this tab and the `/settings/locations` page.

---

### `/settings/routing-templates` — Routing Templates
**File:** `app/(app)/settings/routing-templates/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Useful concept (reusable task sequences for common inspection types), well-organized two-panel layout, but templates are stored in `localStorage` rather than the Convex database — they are not shared across users or devices.

**Issues:**
- Templates are persisted via `loadRoutingTemplatesFromStorage` / `persistRoutingTemplatesToStorage` (localStorage). This means templates created by one user/device are not visible to other team members. For a multi-user MRO shop, this is a critical gap.
- The "Apply Template to WO" button in the header fires `toast.info("Apply from WO creation — coming soon")`. This stub is the primary use-case for the feature — without it, templates cannot actually be used for anything. The entire page exists to serve this not-yet-implemented function.
- Template deletion has no confirmation dialog and no undo. Deleting a template with 20+ task cards is irreversible.
- Aircraft type and inspection type fields are free-text inputs with no validation or standardization, so the filter dropdown will contain inconsistent values ("Cessna 172" vs "C172" vs "cessna172").
- Empty state "Untitled template" is created on "New Template" click with no pre-populated name — the selected template immediately shows a blank editor which could be confusing.

**Recommendations:**
- Migrate template storage from localStorage to Convex (`routingTemplates` table) so they are org-scoped and shared.
- Either implement the "Apply Template to WO" function or remove the button entirely until the feature is built.
- Add a delete confirmation dialog: "This will permanently delete [template name] and its [N] task cards."
- Use a `Select` or autocomplete for aircraft type, drawing from the `stationSupportedAircraft` table.

---

### `/settings/capabilities` — Capabilities List
**File:** `app/(app)/settings/capabilities/page.tsx`
**Usability:** 3/5 | **Logic:** 5/5
**Summary:** Impressive FAA OpSpecs-style ratings register. Functionally correct but carries high cognitive overhead: FAA rating class numbers, section prefix encoding (`ENG`, `INS`, `RAD`, `ACC`), and limitation encoding in series field will alienate non-expert users.

**Issues:**
- The form to add a rating requires users to enter "Rating" text like "Pratt & Whitney PT6A". The `make` is derived from the first word of this text (`words[0]`), and the `model` from the rest. This parsing logic is invisible to the user — if they type "PT6A Pratt & Whitney" they get `make=PT6A`, `model=Pratt & Whitney`.
- Section prefix encoding (entering "Pratt" in Powerplant automatically prepends "ENG ") is not explained anywhere in the UI. The footnote only mentions that "Non-airframe sections are tagged with section prefixes" but doesn't explain why or what happens.
- The `limitation` field encodes into the `series` field with a `[LIM:...]` suffix. This is entirely invisible to the user editing the form, and viewing a row shows the decoded limitation, not the stored value. Any direct database inspection will show confusing values.
- "Class 1 / 2 / 3 / 4" for Airframe ratings maps to aircraft categories (Class 1 = single engine, Class 4 = large jet) but this mapping is not shown in the UI. A new administrator cannot determine the correct class without reading FAA documentation.
- `CapabilitiesListPrint` component renders the full printable output at the top of the page, meaning users must scroll past a full-page print block to reach the edit cards. On a monitor, this is considerable scrolling.

**Recommendations:**
- Add an inline reference table to the "Add Rating" dialog showing the class-to-aircraft-category mapping (e.g., "Class 1 — Single-engine piston / reciprocating").
- Make section prefix behavior explicit: show a preview of the stored value as the user types.
- Move `CapabilitiesListPrint` to a collapsible/expandable section at the bottom, or place it behind a "Preview Print Version" button. The edit section should be primary.
- Add a plain-language description at the top explaining that this page generates the repair station's Operations Specifications capabilities list for FAA compliance.

---

### `/settings/adsb` — ADS-B Settings
**File:** `app/(app)/settings/adsb/page.tsx`
**Usability:** 2/5 | **Logic:** 2/5
**Summary:** A skeleton page. The entire feature is announced as "API integration coming soon." All configuration controls (Enable Sync, Correction Factor, Data Source) are local React state with no persistence — changes are lost on refresh.

**Issues:**
- `configByAircraft` state is entirely local (`useState`). There is no save button and no Convex mutation. Every setting change is ephemeral.
- The "API integration coming soon" banner at the top makes the rest of the page feel pointless — why display non-functional controls?
- "Correction Factor" (0.92 for pistons, 0.98 for turbines) is described in a tiny `text-[11px]` note with no explanation of what the factor adjusts. Users have no basis to change this value.
- The page lacks the `usePagePrereqs` pattern used by all other settings pages, so it has no loading state or missing-org guard.
- Data source selection (FlightAware, ADS-B Exchange, OpenSky) implies credential/API key configuration, but there is no field for API keys.

**Recommendations:**
- Either remove this page from the nav until the API integration is built, or replace it with a single informational "ADS-B Sync — Coming Soon" card that describes what the feature will do.
- If the controls must remain, add a clear "These settings will take effect once ADS-B integration is enabled" disclaimer at the top with a save button backed by a Convex mutation.
- Add `usePagePrereqs` for consistency with all other settings pages.

---

## Onboarding

---

### `/onboarding` — New Organization Setup
**File:** `app/(app)/onboarding/page.tsx`
**Usability:** 2/5 | **Logic:** 2/5
**Summary:** Critically mislabeled and mispositioned. The page is presented as "New Organization" setup for adding additional orgs, but it is also the first-run experience for brand-new users — yet the form is too minimal for either use case.

**Issues:**
- The "Back to Settings" button at the top links to `/settings/shop` — but for a first-time user who has never set up an org, that page will show the "missing context" empty state. The back button creates a navigation loop.
- The card title is "New Organization" and the description says "Create a new organization to manage a separate repair station." For a first-time user completing initial onboarding, this framing is confusing — it implies they are adding a second org rather than completing initial setup.
- The form collects Organization Name, Legal Name, City, State, Country, and Timezone — but not the FAA certificate number, certificate type, or primary location address. These are the most important identifiers for an MRO operation and must be entered later in Shop Settings. The onboarding does not guide users toward completing those follow-up steps.
- No progress indicator. If this is treated as step 1 of a multi-step setup, the user has no idea there are subsequent required steps.
- Country field is a free-text input defaulting to "US" — this will produce inconsistent data ("US", "USA", "United States", "us").
- There is no post-onboarding checklist or "What to do next" guidance. After submitting, the user is redirected to `/dashboard?setup=complete` with no indication of what "complete" means or what to configure next.
- The "Your Legal Name" field has a fallback to `user?.fullName` but the placeholder is the inferred value — this may cause confusion when the user sees their full name in the placeholder and believes it's already been entered.
- The `AVIATION_TIMEZONES` list here has only 8 options versus the 18-option list in `shop/page.tsx`. Inconsistent coverage.

**Recommendations:**
- Replace the single-form approach with a proper multi-step onboarding wizard (3–5 steps): (1) Org name & location, (2) FAA certificate information, (3) Add first user(s), (4) Configure primary bay/location, (5) Completion checklist.
- After completion, show a "Setup Complete" screen with a checklist of what was configured and what remains (certificate number, branding, staff invitations).
- Fix the "Back to Settings" navigation for new users — it should either not appear on first-run, or link to the dashboard.
- Change the Country field to a `<Select>` component.
- Reconcile the timezone list to match the comprehensive set in `shop/page.tsx`.
- Add a help text callout: "You can update your FAA certificate information after completing setup in Shop Settings."

---

## Auth Pages

---

### `/sign-in` — Staff Sign In
**File:** `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** Clean, minimal, and correctly defers all authentication UI to Clerk's hosted component. The "Customer portal user?" link is a thoughtful disambiguation.

**Issues:**
- The "A" logomark is a plain styled `<div>` — not a proper SVG logo, not an image. At `w-8 h-8` this is barely readable and provides no brand identity.
- The customer portal link (`/portal/sign-in`) is plain text in `text-xs` below the tagline — it is visually subordinate to the tagline itself and may be missed by customers who arrive at this URL by accident.
- There is no "Sign up" link or context on this page. New users who receive an invitation email are redirected here, but the invitation flow is handled inside the Clerk component. New users who navigate directly to `/sign-in` have no visible path to creating an account.
- Post-sign-in redirect to `/dashboard` is hardcoded via `forceRedirectUrl`. If a user has a deep link bookmarked (e.g., a work order), they lose it after sign-in.

**Recommendations:**
- Replace the `<div>` logomark with a proper SVG `<Logo>` component or an `<img>` pointing to the shop's logo (once branding is configurable).
- Promote the customer portal link: consider a dedicated "Are you a customer?" card with more visual weight, positioned below the Clerk sign-in component.
- Investigate Clerk's `redirectUrl` query parameter support to preserve pre-authentication destination URLs.

---

### `/sign-up` — Staff Sign Up
**File:** `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Essentially identical to sign-in but with the `<SignUp>` Clerk component. Missing the customer portal disambiguation link that sign-in has. The conceptual flow is unclear: in an MRO, staff accounts are typically invitation-only — a public sign-up page may be unintended.

**Issues:**
- No customer portal link — if a customer accidentally navigates to `/sign-up`, they will create a staff account.
- No explanation of what happens after signing up: the user is redirected to `/dashboard` which will show the onboarding gate. But for invited users (the primary use case), the onboarding flow creates a new org — which may conflict with their invitation to an existing org.
- The sign-up URL is publicly accessible. For a B2B MRO tool, uncontrolled sign-up creates orphaned accounts with no org association. Consider gating sign-up to invitation-only via Clerk's `restrictedToAllowlistDomains` or by removing the public `/sign-up` route.

**Recommendations:**
- Add the customer portal disambiguation link, matching the sign-in page.
- Consider disabling or hiding the sign-up page if the intended flow is invitation-only. Alternatively, add a banner: "Staff accounts are created by invitation. If you received an email invite, follow the link in that email rather than signing up directly."
- If sign-up is retained, add post-sign-up guidance: "Your account has been created. An administrator will need to add you to an organization before you can access the maintenance app."

---

## Customer Portal

---

### `/portal/sign-in` — Customer Sign In
**File:** `app/(customer)/sign-in/page.tsx`
**Usability:** 5/5 | **Logic:** 5/5
**Summary:** The standout best-designed page in the entire section. Full-bleed dark layout with two-column hero-plus-signin, clear value proposition copy, proper staff sign-in disambiguation. No significant issues.

**Issues:**
- The value proposition copy lists "Track work order progress, review invoices, and approve or decline quotes" — accurate and clear. However "approve or decline quotes" could be reordered to "approve or decline quotes, review invoices" to match the priority a customer actually cares about (pending decisions first).
- The "Athelon" wordmark in the top-left area lacks a logo image — just the text `Athelon` in tracking uppercase. This is fine for early-stage but should eventually use the shop's own branding.
- No "Forgot password?" affordance visible above the fold (this is inside the Clerk component, which is fine, but its placement on the right column may cause it to be cut off on short viewports).

**Recommendations:**
- Reorder the value prop bullet to lead with most urgent customer action: "Approve or decline quotes, track work order progress, and download invoices."
- Consider white-labeling this page eventually: show the MRO shop's name and logo rather than "Athelon."

---

### `/portal` — Customer Dashboard
**File:** `app/(customer)/portal/page.tsx`
**Usability:** 5/5 | **Logic:** 5/5
**Summary:** Excellent customer-facing dashboard. The summary card grid, outstanding balance banner, recent activity timeline, fleet status overview, and quick-action nav bar compose a complete, scannable, and intuitive landing experience.

**Issues:**
- The "No customer account linked" state shows a plain `text-gray-700` heading with no call-to-action. A customer who has authenticated but is not yet associated with a customer record has no path forward — they cannot link themselves; only the shop can do it. The message should explain this clearly.
- The quick-action bar at the bottom duplicates the summary cards above — both provide "Work Orders," "Quotes," "Invoices," and "Fleet" links. This is redundant on a single screen.
- The activity timeline uses a `Clock` icon for every event regardless of type. A WO status change and an invoice payment look identical.
- The fleet status widget is limited to 5 aircraft (`fleet.slice(0, 5)`) with no "View all" count or expansion for fleets larger than 5 — the widget just silently truncates.
- Portal uses inline `text-gray-*` classes throughout (light-mode only) while the staff app uses Tailwind CSS v4 semantic tokens (`text-foreground`, `text-muted-foreground`). The portal is hardcoded to light mode.

**Recommendations:**
- Update the "No customer account linked" state to: "Your portal access is pending. Please contact [shop name] to complete your account setup. Reference your work order number when you call."
- Remove or consolidate the duplicate quick-action bar — the summary cards already serve as navigation links.
- Vary activity timeline icons by type (Wrench for WO, Receipt for invoice, FileText for quote).
- Add "View all [N] aircraft →" link when fleet count exceeds 5.
- Convert hardcoded `text-gray-*` classes to semantic tokens for dark mode support.

---

### `/portal/work-orders` — Customer Work Orders
**File:** `app/(customer)/portal/work-orders/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** One of the strongest customer-facing pages. The `StatusTimeline` component is a well-thought-out 5-step progress tracker. The detail view includes PDF download for RTS documents, task progress, and a timeline of events. Minor issues only.

**Issues:**
- The `StatusTimeline` is rendered in both the list view (on each WO card) and the detail view. On the list, 5 timeline steps on a card that also shows WO number, registration, and dates makes each card quite tall. Customers with 10+ active WOs scroll extensively.
- In the detail view, the "Overall Progress" bar uses `style={{ width: `${detail.progressPercent}%` }}` — this is a direct style injection rather than a CSS variable, which could create hydration or SSR issues.
- `detail.discrepancies ?? []` — if the WO has no discrepancies, the RTS PDF still appears if `detail.hasRts` is true. This is functionally correct but the PDF will have an empty discrepancies section, which may look like a data error.
- Timeline events in the detail view use raw `any` type for event data (`event: any`). This is not a UX issue per se but indicates the timeline data structure is not stable.
- The loading state in `WorkOrderDetail` is a bare spinner with no skeleton — inconsistent with how other pages handle loading.
- No search or filter on the work order list (customers with large fleets and many WOs have no way to find a specific one).

**Recommendations:**
- On the list view, condense the `StatusTimeline` to a single-line progress indicator (e.g., a colored progress pill: `●●●○○ In Progress`) and expand it to full steps only in the detail view.
- Add a search bar to the work orders list filtering by WO number or aircraft tail.
- Add a `<Skeleton>` loading state in `WorkOrderDetail` matching the final card layout.

---

### `/portal/quotes` — Customer Quotes
**File:** `app/(customer)/portal/quotes/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** Strong quote approval workflow. Per-line-item decisions (approve/decline/defer) are a differentiating feature. The decline reason textarea and confirmation flow are well-handled. Minor issues.

**Issues:**
- The "Approve Quote" button is full-width green and the "Decline" button is full-width outlined red — these look like equally prominent primary actions. In most quote workflows, approval is the primary action and decline should be visually subordinate (secondary button style).
- The per-line-item decision buttons use raw Unicode characters (`✓` and `✗`) as button labels. These have inconsistent rendering across browsers/OS and lack accessible labels.
- The `quote.status` column shows raw ALL_CAPS values (`SENT`, `APPROVED`, `DECLINED`). Other badge systems in the app use sentence case.
- The quote list has no filter by status — if a customer has many approved and one pending "SENT" quote, they must scan the entire list to find the action-required item.
- No expiry countdown — the quote expiry date is shown only in the detail view as small text. Quotes requiring urgent action have no urgency indicator on the list card.

**Recommendations:**
- Make "Approve Quote" the primary CTA and "Decline" a secondary destructive action (smaller, outlined, lower visual weight).
- Replace raw Unicode check/cross with lucide `Check` and `X` icons and add `aria-label="Approve line item"` / `aria-label="Decline line item"`.
- Convert ALL_CAPS status values to sentence case in the badge display.
- Add a status filter tabs at the top of the quote list: `All | Pending Approval | Approved | Declined`.
- Show expiry countdown on list cards for SENT quotes: e.g., "Expires in 3 days" as a red badge.

---

### `/portal/invoices` — Customer Invoices
**File:** `app/(customer)/portal/invoices/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Clean invoice list and detail with PDF download, payment history, and balance display. Missing a payment action — customers can view invoices but cannot pay them through the portal.

**Issues:**
- There is no "Pay Invoice" button or online payment integration. Customers can see what they owe but have no in-portal path to pay. This is a significant self-service gap for an MRO that wants to reduce AR collection friction.
- The detail view shows both `invoice.status` (SENT/PARTIAL/PAID/VOID) and `invoice.paymentStatus` (paid/partially_paid/unpaid/overdue) as separate badges. These are overlapping signals that can be contradictory-looking (e.g., status=SENT and paymentStatus=unpaid are both visible when a single "Unpaid" badge would suffice).
- No sort or filter on the invoice list — overdue invoices do not sort to the top.
- The `invoice.paymentTerms` renders as a small centered `text-xs text-gray-400` at the bottom of the detail. Payment terms are a primary commercial document field that should be more prominent.
- `invoice.balance > 0 ? "text-red-600" : "text-green-600"` in the balance display — a zero balance shows as green but could also mean voided. Consider `text-green-600` only if `paymentStatus === 'paid'`.

**Recommendations:**
- Add a "Pay Online" button integration (Stripe or similar) with a placeholder state if not yet implemented — at minimum stub out the button with "Coming soon: online payment" to communicate intent.
- Consolidate the two status badges into one: display `paymentStatus` (overdue, partially paid, paid, unpaid) as the primary badge and drop the raw `invoice.status` from customer view.
- Sort the invoice list by due date ascending so overdue items appear first.
- Move payment terms to a more prominent location in the invoice detail — either in the header section alongside the due date, or as a callout card.

---

### `/portal/fleet` — Customer Fleet
**File:** `app/(customer)/portal/fleet/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Good aircraft status view with expandable WO history per aircraft. Clear status badges. Limited depth — customers cannot see maintenance history beyond WO numbers.

**Issues:**
- "Total Time" (`totalTimeAirframeHours`) is fetched but never formatted with a comma separator in the grid — it uses `ac.totalTimeAirframeHours?.toLocaleString()`, which is correct. However there is no unit label ("hours") on some displays.
- The expandable WO history shows a maximum of 10 work orders per aircraft (`acWos.slice(0, 10)`) with no "View all" link. Customers with an aircraft that has been in maintenance many times see a truncated list with no indication of how many are hidden.
- Aircraft cards are in `grid-cols-2` at sm breakpoint — with the aircraft registration as the largest text, two-column layout on a phone can result in very narrow cards.
- No link from the WO entry in the fleet view to the WO detail page (in `/portal/work-orders`). Customers must navigate to the Work Orders section and find the WO manually.
- The `workOrders` query fetches ALL work orders for the customer just to compute per-aircraft history. This will be inefficient for customers with large fleets and long service histories.

**Recommendations:**
- Add "View all [N] work orders →" link at the bottom of the expandable WO history that deep-links to `/portal/work-orders` pre-filtered to that aircraft.
- Make each WO entry in the fleet view a clickable link to the WO detail view.
- Add "hours" unit label wherever airframe hours are displayed.
- Consider narrowing the column breakpoint: `sm:grid-cols-2` → `md:grid-cols-2` to keep cards readable on phone screens.

---

### `/portal/messages` — Customer Messages & Requests
**File:** `app/(customer)/portal/messages/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** A basic request submission and history view. The category/priority model is sound, but the page is mislabeled — it is a request/ticket system, not a messaging system. There is no back-and-forth chat or read receipts.

**Issues:**
- The page is titled "Messages & Requests" but the functionality is one-way: customers submit requests and can see the shop's response. There is no reply capability on an existing request — to follow up, a customer must submit a new request.
- The shop's response appears in a green callout inside the request card — customers who have unread responses have no notification or visual indicator that their request has been answered. There is no unread/read state.
- The `priority` field (Low/Normal/High) is shown to the customer in the submitted request list. Customers may not know what priority level to select; the field creates a support-ticket mental model while the feature is positioned as a communication channel.
- Listing `priority` in the metadata line of each request (`{req.priority}`) could cause customers to set every request to "High" to get faster service, degrading the field's utility.
- No file attachment support — customers cannot include photos, documents, or references in their request.
- The submit form has a long scrollable layout with Category → Priority → Related WO → Subject → Message. "Subject" and "Message" should be first since those are what the customer knows immediately; category/priority are secondary.

**Recommendations:**
- Rename the page to "Support Requests" to accurately reflect the one-way ticket model.
- Add a green dot / unread count indicator on the Messages nav item when there is an unread shop response.
- Move Category and Priority to the bottom of the form as "optional" fields — Subject and Message should lead.
- Consider hiding the `priority` field from customer view entirely and defaulting all new requests to "normal." Let the shop escalate internally.
- Add a "Reply" affordance inside each request thread, even if only as a nested new submission pre-linked to the parent request.

---

## Not Found

---

### `/not-found` — App Not Found
**File:** `app/(app)/not-found/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Minimal one-liner delegating to `NotFoundCard`. Clean and appropriate. No significant issues — the delegation pattern means any improvements to `NotFoundCard` apply globally.

**Issues:**
- The `NotFoundCard` component content is not visible in this file (it's a shared component). Assuming it contains an appropriate message and back link to `/dashboard`, this is adequate.
- There is no 404 page for the customer portal — a customer navigating to a bad `/portal/*` URL will see the internal app's not-found page if the router falls through, which would expose the internal "Back to dashboard" link.

**Recommendations:**
- Verify `NotFoundCard` includes the correct branded message and that it does not show internal navigation links when rendered in the customer portal context.
- Add a separate `app/(customer)/not-found/page.tsx` that uses portal-appropriate messaging and links back to `/portal`.

---

## Section Summary

### Settings (11 pages)

**Are all 11 settings pages necessary?** Mostly, but with consolidation opportunities:

- **Redundancy:** `/settings/locations` and `/settings/station-config` (Facilities & Bays tab) manage the same `shopLocations` table. One should be removed or merged.
- **Incomplete stubs:** `/settings/adsb` and the Branding/Operating Hours sections of `/settings/shop` are non-functional. They should either be built or removed from the nav.
- **Misplaced:** Email Log is an audit/operational tool — it belongs with the billing section or under a dedicated Audit Logs group, not in Settings.
- **localStorage anti-pattern:** Routing Templates using localStorage is a critical flaw for a multi-user SaaS — templates must be database-backed.

**Suggested settings nav reorganization:**
```
Settings
  ├── General (Shop Info, Branding, Timezone)
  ├── Station Configuration (consolidating Locations + Station Config)
  ├── Capabilities List
  ├── Users & Access
  ├── Notifications
  ├── Routing Templates
  ├── Integrations
  │   ├── QuickBooks
  │   └── ADS-B (when built)
  └── Audit & Logs
      └── Email Log
```

### Onboarding (1 page)

The onboarding page is critically under-designed for its importance. It is the first experience for new organizations and collects only 5 fields before sending users into a complex application with no guidance on what to configure next. A multi-step wizard with a post-completion checklist is the minimum acceptable upgrade.

### Auth Flow (2 pages)

The sign-in → onboarding → dashboard path is structurally sound (Clerk handles auth, onboarding bootstraps the org record, protected routes gate the app). The weak points are:
1. The sign-up page may need to be restricted to invitation-only to prevent orphaned accounts.
2. The post-sign-up → onboarding path conflates "creating a new org" with "joining an existing org via invitation."
3. Deep-link preservation after sign-in is not implemented.

### Customer Portal (7 pages)

The customer portal is the most polished section of the codebase. The sign-in page, dashboard, work order tracker, and quote approval flow are production-quality. The three gaps that stand out:

1. **No online payment path** — customers can see invoices but cannot pay them in-portal.
2. **Hardcoded light mode** — the portal uses `text-gray-*` throughout, not semantic tokens. It will not respect a user's dark mode preference.
3. **Messages page is mislabeled and one-way** — the name implies real-time messaging but it is a ticket submission system with no reply threading or unread indicators.

### Cross-Cutting Observations

| Pattern | Status | Notes |
|---|---|---|
| `usePagePrereqs` loading/empty states | Consistent except `/settings/adsb` | Fix ADS-B page |
| Responsive layout | Generally good | Portal is light-mode-only |
| Form validation | Mostly toast-on-submit | Add inline field errors |
| Confirmation dialogs for destructive actions | Inconsistent | Locations tab, Routing Templates missing confirmations |
| Semantic tokens vs hardcoded colors | Mixed | Portal uses hardcoded gray-* throughout |
| AVIATION_TIMEZONES constant | Duplicated in 5+ files | Extract to `@/lib/timezones.ts` |
