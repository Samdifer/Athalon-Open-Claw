# UX Evaluation: Personnel + Training/OJT + My Work
**Evaluator:** Team 3 — UX/Usability Audit
**Date:** 2026-03-12
**Scope:** Personnel section, Training/OJT section, My Work section

---

## Evaluation Index

| # | Route | Page Name | Usability | Logic |
|---|-------|-----------|-----------|-------|
| 1 | `/personnel` | Personnel Command | 3/5 | 4/5 |
| 2 | `/personnel/time-management` | Time Management | 4/5 | 4/5 |
| 3 | `/personnel/training` | Training & Qualifications (Org-Wide) | 2/5 | 2/5 |
| 4 | `/personnel/[id]/training` | Individual Technician Training | 4/5 | 4/5 |
| 5 | `/personnel/[techId]/career` | Career Profile | 3/5 | 4/5 |
| 6 | `/training/ojt` | OJT Dashboard (Curriculum List) | 3/5 | 3/5 |
| 7 | `/training/ojt/[curriculumId]` | Curriculum Detail / Editor | 3/5 | 4/5 |
| 8 | `/training/ojt/jackets` | Training Jackets List | 4/5 | 4/5 |
| 9 | `/training/ojt/jackets/[jacketId]` | Jacket Detail (5-column sign-off) | 4/5 | 5/5 |
| 10 | `/training/ojt/roster` | OJT Enrollment Roster | 3/5 | 3/5 |
| 11 | `/my-work` | My Work | 4/5 | 4/5 |
| 12 | `/my-work/time` | My Time | 4/5 | 5/5 |

---

## Page-by-Page Evaluations

---

### `/personnel` — Personnel Command
**File:** `app/(app)/personnel/page.tsx` + `_components/PersonnelCommandTabs.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Clean four-tab command center for workforce management, but the page title "Personnel Command" is military-sounding jargon that may confuse non-military operators, and the Analysis tab is buried after Holidays.

**Issues:**
- The page title "Personnel Command" is not self-explanatory for a typical MRO shop manager; simpler labels like "Personnel" or "Staff" are more discoverable.
- Tab ordering puts "Holidays" before "Analysis." The analysis/dashboard view is more frequently needed than holiday management; the two tabs should be swapped.
- The URL-persisted `?tab=` parameter is good practice, but the default tab (roster) silently removes the param — a minor inconsistency that could confuse link-sharing.
- The subtitle "X team members · N certificates expiring soon" is useful but only renders after data loads. There is a brief window where the header shows nothing (empty string, not a skeleton), creating a layout shift.
- The Roster tab has search, workload badges, expiry warnings, shift assignment, role editing, archiving, and CSV export all inline. At higher team sizes this becomes cognitively overwhelming in a single scrolling list.
- No visual separation between active and inactive/terminated team members. Terminated profiles appear inline with active staff unless the user knows to filter.
- The Analysis tab (`PersonnelAnalysisTab`) links out to `/personnel/training` for cert details. That link drops the user into the org-wide training page which has 11 tabs — the jump is jarring without context.

**Recommendations:**
- Rename page header to "Personnel" (match sidebar label) or "Workforce" — avoid "Command."
- Reorder tabs: Roster → Teams & Shifts → Analysis → Holidays.
- Add a persistent `active/inactive` toggle at the top of the Roster tab, defaulting to "Active only."
- In the subtitle, render a zero-width placeholder span during load to avoid layout shift (or always show the skeleton until data is fully resolved).
- Consider splitting the Roster tab's inline actions (edit profile, archive, assign shift) into a slide-out detail panel or dedicated `/personnel/[id]` page rather than inline modals.
- The cert-expiry warning link in Analysis should deep-link to the Compliance tab of `/personnel/training?tab=compliance`, not to the generic training page.

---

### `/personnel/time-management` — Time Management
**File:** `app/(app)/personnel/time-management/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Well-structured four-tab layout with correct RBAC scoping (lead techs see only their team). Data is fetched once at the page level and passed down as props — a sound architectural pattern. Minor issues with duplicate loading skeletons and tab naming.

**Issues:**
- There are two separate loading skeleton renders: one for `!isLoaded` (auth context not ready) and one for `dataLoading` (Convex queries pending). They render the exact same JSX block, which is redundant code duplication. This is a maintenance issue but also means the skeleton renders twice in rapid succession on first page load.
- The tab label "Team Overview" is used for the first tab, but lead technicians see only their own team — not the full organization. For a shop manager the label is correct; for a lead tech who only sees 4 people, "Team Overview" feels like a misnomer vs. "My Team."
- There is no visible indication of which date range the time entries cover (all time? current month?). The Overview tab likely shows all entries; without a date range header or filter, managers reviewing corrections have no temporal frame of reference.
- The "Corrections" tab name is neutral but its function (manager approves/rejects time corrections submitted by techs) is important enough to warrant a visual indicator (e.g., a badge count) if pending corrections exist.
- The "Export" tab is a dead end — if export fails silently, there is no error state visible at the tab level.

**Recommendations:**
- De-duplicate the two identical loading skeleton blocks into a single conditional: `if (!isLoaded || dataLoading)`.
- Add a date-range filter (defaulting to current pay period or current month) visible in the page header, shared across all four tabs.
- Add a pending-count badge on the Corrections tab trigger when `entries.filter(e => e.approvalStatus === "pending").length > 0`.
- For lead technicians, render the page subtitle as "Your team's time data" rather than the generic clock description.
- Consider renaming "Team Overview" to "Overview" to avoid the scoping ambiguity.

---

### `/personnel/training` — Training & Qualifications (Org-Wide)
**File:** `app/(app)/personnel/training/page.tsx`
**Usability:** 2/5 | **Logic:** 2/5
**Summary:** This is the most problematic page in the entire section. It has 11 tabs in a single `<TabsList>` that overflow horizontally on any screen smaller than ~1600px, with no wrapping or overflow handling shown in the tab trigger styles. The tabs mix distinct domains (records, compliance, OKR, efficiency, growth, KPI, run/taxi) into a single mega-page that should be multiple separate pages or a reorganized sub-navigation.

**Issues:**
- **11 tabs in a single TabsList is a critical usability failure.** The tabs include: Records, Compliance, Qualification Requirements, Scheduling Constraints, Sign-Off Queue, OKR Tracking, Trainer Records, Efficiency, Growth, Balanced KPI, Run/Taxi Quals. This conflates training administration with performance analytics and specialized regulatory workflows in a single page.
- The tab list will overflow on standard 1440px displays. The `<TabsList>` has no `flex-wrap` class (unlike the Personnel Command tabs which correctly use `flex-wrap`). On tablet or laptop screens most tabs will be inaccessible without horizontal scrolling — which `<TabsList>` does not scroll by default.
- "Records" tab uses a click-to-expand pattern (click a tech card to reveal their training records inline), rather than navigating to `/personnel/[id]/training`. This means editing a tech's records opens a detail table inside the list, creating an accordion-within-list UX that breaks if the user wants to view two techs simultaneously or share a deep link.
- The "Trainer Records" tab is a separate concept from technician training records but sits in the same tab list with no visual grouping.
- The "OKR Tracking" and "Balanced KPI" tabs appear to be managerial analytics features, not training administration. They belong in a reporting or analytics section, not alongside "Add Training" and "Sign-Off Queue."
- The "Scheduling Constraints" tab in a training page is unexpected. Scheduling belongs under Personnel or a separate scheduling section.
- The `requireCourses` field in the Qualification Requirements form is a comma-separated text input — there is no validation that entered course names match existing training records, increasing data entry errors.
- The "Add Requirement" and "Add Training" buttons in the header are both visible regardless of which tab is active. On the "Run/Taxi Quals" tab these buttons are contextually irrelevant.
- The goal creation dialog (`showGoalDialog`) has no link to any existing goals list on this page. Goals are set via the dialog but viewable only indirectly via the OKR tab.

**Recommendations:**
- Reduce to a maximum of 5 tabs covering the core use cases for a training manager: Records, Compliance, Requirements, Sign-Off Queue, and Run/Taxi Quals.
- Promote analytics (OKR, Efficiency, Growth, Balanced KPI) to a dedicated Analytics sub-section under Training or Personnel, not inline tabs.
- Remove "Scheduling Constraints" from training — it should live in Time Management or a Scheduling page.
- Replace the inline accordion expand pattern with navigation to `/personnel/[id]/training` for individual tech records.
- Add `flex-wrap` to the `<TabsList>` as an immediate bug fix to prevent tab overflow.
- Make the header action buttons context-aware — only show "Add Training" when the Records tab is active, only show "Add Requirement" when the Requirements tab is active.
- Replace the comma-separated course name input in the Requirements form with a multi-select dropdown populated from existing `training.listOrgTraining` course names.

---

### `/personnel/[id]/training` — Individual Technician Training
**File:** `app/(app)/personnel/[id]/training/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A focused, well-scoped single-purpose page for viewing and managing one technician's training records. Clean card list with expiry status, proper RBAC gating, and a simple add/edit dialog. The breadcrumb back-navigation to `/personnel` is clear.

**Issues:**
- The "Training Type" field in the add/edit dialog is a free-text input (`<Input>`) with no autocomplete or standardization. Operators will accumulate slightly different spellings of the same training type ("A&P" vs "A and P" vs "Airframe & Powerplant"), making compliance querying unreliable over time.
- The page uses `api.technicianTraining.listByOrg` to fetch all training for the entire org, then client-side filters to this tech's records (`records = orgTraining.filter(...)`). For large organizations this is an unnecessary data transfer. A `listByTechnician` query would be more efficient.
- The route is `/personnel/[id]/training` but the sibling career profile is at `/personnel/[techId]/career` — two different URL param names (`id` vs `techId`) for functionally equivalent tech-ID params on sibling routes. This is confusing for developers and inconsistent for deep linking.
- The "Archive" label on the delete button is slightly misleading — the function calls `removeTraining` which is a hard delete, not an archive. The toast confirms "Training record archived" but if no soft-delete/audit log exists, calling it an archive sets false expectations about record recovery.
- There is no link from this page back to the technician's full profile, career profile, or other training contexts. The only navigation is "Personnel" (back to roster) — a tech manager cannot jump directly from here to the career profile.

**Recommendations:**
- Replace the free-text "Training Type" input with a combobox that suggests existing training types used by the org, while still allowing custom entry.
- Add a backend query `listTrainingByTechnician` and use it here instead of org-wide fetch.
- Normalize the dynamic segment name: either use `[techId]` consistently across all `/personnel/[techId]/*` routes, or use `[id]` consistently.
- Rename the "Archive" action to "Delete" or implement true soft-delete with recovery to match the label.
- Add a breadcrumb row showing: Personnel → [Tech Name] → Training, with the tech name linking to the tech's detail/career page.

---

### `/personnel/[techId]/career` — Career Profile
**File:** `app/(app)/personnel/[techId]/career/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Provides a solid FAA-oriented view of a technician's certifications, aircraft type experience, ATA chapter proficiency heatmap, OJT jacket history, and employment record. The data model is intelligent. However, the page currently relies entirely on keyword-matching training record course names to infer A&P/IA status, which is fragile, and the Employment History section self-acknowledges it is incomplete.

**Issues:**
- A&P/IA detection uses `courseName.toLowerCase().includes("a&p")` — this is a heuristic that will fail for any course name that doesn't literally contain "a&p," "ia," or "inspection authorization." In a Part 145 shop, certificate numbers and ratings need to be explicit structured fields, not inferred from unstructured text. An FAA auditor reviewing this profile cannot rely on it.
- The Employment History card explicitly notes: "Detailed position timeline is not currently captured in a dedicated history table." This admission is visible to users and undermines trust in the profile as an official record. Either populate this or don't render a section with a disclaimer.
- "Jacket" links in the Training Jackets section navigate to `/personnel/training?techId=${techId}&jacketId=${j._id}`. This sends the user to the 11-tab org-wide training page with query params — but there is no evidence that the training page actually responds to `jacketId` query params to deep-link to the specific jacket. The user would land on the Records tab with no obvious indication of where to find the jacket.
- The page uses `useQueries` with dynamic keys per jacket ID and curriculum ID to batch-load stage events and tasks. This is correct but creates a loading race: the page shows a full skeleton until ALL of `technicians`, `curricula`, `jackets`, and `trainingRecords` have resolved — even though certifications and aircraft experience could render immediately from the first two queries.
- The ATA Chapter Heatmap is visually rich but there is no legend explaining what the stage columns (observe/assist/supervised/evaluated) mean or what the color intensity represents.
- Non-technical roles see a single-card placeholder "non-technical role: A&P/IA certification and technical OJT metrics are suppressed" — a dead end with no links to relevant non-technical profile data such as basic qualifications or certifications.

**Recommendations:**
- Add dedicated structured fields to the technician schema for `ampCertificateNumber`, `iaCertificateNumber`, `ampExpiry`, `iaExpiry` rather than inferring from training text. Surface these as read-only structured fields on the career profile.
- Remove the Employment History section until a proper position history table exists, or replace it with a "Role History" section that at minimum shows role changes tracked via an event log.
- Fix the jacket deep-link: navigate directly to `/training/ojt/jackets/${j._id}` instead of the ambiguous `/personnel/training?techId=...&jacketId=...`.
- Implement progressive loading: show the certifications card as soon as `trainingRecords` resolves, and show aircraft experience as soon as `jackets` and `stageEventsByJacket` resolve — don't block the entire page on all queries.
- Add a visible legend to the ATA heatmap: a small key showing observe=lightest, assist, supervised, evaluated=darkest with a one-line description per stage.
- For non-technical roles, show basic profile info (role, start date, contact) rather than a single dismissive card.

---

### `/training/ojt` — OJT Dashboard (Curriculum List)
**File:** `app/(app)/training/ojt/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A filtered grid of OJT curricula that functions as the entry point for the OJT training module. Card layout is clean and actionable. However, the page conflates two entry points (curriculum management for training managers and jacket access for technicians), and the stat-loading pattern using `useEffect` + `Promise.allSettled` adds complexity and creates a visible "0 tasks / 0 jackets" flash before stats load.

**Issues:**
- Stats (task count, active jacket count) are loaded via a `useEffect` with individual Convex queries per curriculum outside the reactive system. This means on initial render, all curriculum cards briefly show "Task Count: 0 / Active Jackets: 0" before the effect fires. This creates a false-zero state visible to users.
- The "Create Curriculum" button and curriculum-management functionality appears alongside the jacket/roster navigation buttons. A line technician who should only access their own jacket sees the same interface as a curriculum author. There is no RBAC check on the "Create Curriculum" button — any authenticated user can create a curriculum.
- The page description reads "Manage curricula and training jackets for [firstName]." The personalization with `user.firstName` is odd here because curriculum management is an org-wide action, not a personal one. The description implies the page is personal ("for Sam") when it actually manages all of the org's curricula.
- Filtering by aircraft type and active status is useful, but there is no search-by-name filter. An org with 20+ curricula across multiple aircraft types cannot quickly find a specific curriculum by name.
- "View Roster" and "View Jackets" are buttons inside a filter card, visually mixed in with filter controls. Navigation actions belong in the header, not embedded in a filter bar.
- Empty state for no curricula is missing. When `filtered.length === 0` (after filtering) the grid renders nothing — no empty state message. A new org sees a blank grid with no guidance.

**Recommendations:**
- Replace the `useEffect`-based stats loading with a Convex query that returns curriculum stats (task count, active jacket count) in a single query call per org, avoiding the false-zero flash.
- Add RBAC check: only `admin`, `shop_manager`, and `lead_technician` roles should see and use "Create Curriculum." Others should see a read-only or "request access" state.
- Remove the `user.firstName` personalization from the subtitle — replace with "Manage OJT curricula and training progress across your organization."
- Add a text search filter alongside the aircraft type filter.
- Move "View Roster" and "View Jackets" buttons to the page header area, visually separated from filter controls.
- Add an empty state card: "No curricula found. Create the first curriculum to get started." with a conditional direct CTA if the user has curriculum creation permission.

---

### `/training/ojt/[curriculumId]` — Curriculum Detail / Editor
**File:** `app/(app)/training/ojt/[curriculumId]/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** A drag-and-drop curriculum editor for creating sections and tasks. The data model is well-aligned to FAA OJT structure (sections, tasks, ATA chapters, approved data references). Drag-and-drop works but lacks touch support, and several UX issues reduce usability for curriculum authors.

**Issues:**
- The delete section button (trash icon) fires immediately without a confirmation dialog. Deleting a section with 20 tasks destroys all of them instantly. There is no undo, no confirmation, and the toast just says "Section deleted" — this is a destructive data loss vector on a compliance-critical record.
- Similarly, deleting a task has no confirmation prompt — the delete button fires immediately via an inline async IIFE in the JSX `onClick`. For a Part 145 approved training program, accidental task deletion could create compliance gaps.
- The curriculum header card shows description as "No description" with no inline edit affordance. The description can only be changed via a separate edit workflow that doesn't appear to exist (no edit button visible on the curriculum header — only section/task edit buttons are present).
- Section expand/collapse state defaults to `expanded[section._id] ?? true` (all expanded), which means a curriculum with 15 sections all expands simultaneously on page load — overwhelming for review purposes.
- There is no breadcrumb or back navigation. The user arrives at this page from the `/training/ojt` grid but there is no "Back to OJT" link in the rendered output.
- The task form requires ATA chapter as a free-text field. ATA chapter codes have a specific format (e.g., "32-10-01") but there is no format hint, validation, or dropdown. Inconsistent ATA entries (e.g., "32" vs "ATA 32" vs "32-10") will corrupt career profile heatmaps.
- The "Add Task" button in the section header is icon-only on mobile (icon + label on larger screens) but small touch targets may cause misclicks.
- The drag-and-drop uses HTML5 drag events with no fallback. On touch devices or accessibility-focused tools, reordering is impossible.

**Recommendations:**
- Add a confirmation `AlertDialog` before deleting sections (with task count warning: "This section contains N tasks. Deleting it is permanent.") and before deleting tasks.
- Add an edit button on the curriculum header card to update the curriculum name, description, and active status.
- Default sections to collapsed on page load when a curriculum has more than 5 sections, reducing initial cognitive load.
- Add a back link to `/training/ojt` in the curriculum header.
- Add ATA chapter format guidance (placeholder text "e.g. 32-10-01" and a note about the expected format) and consider a validation regex.
- Add a `cursor: grab` visual on section/task rows and a visible handle affordance so drag-reordering is discoverable (the GripVertical icon exists but has no tooltip or label).

---

### `/training/ojt/jackets` — Training Jackets List
**File:** `app/(app)/training/ojt/jackets/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A well-structured table view of all training jackets with multi-dimensional filtering (status, curriculum, technician). The jacket assignment dialog is clean. The `Promise.allSettled` loading pattern with graceful partial failure handling is well-implemented. Small gaps in density and discoverability.

**Issues:**
- The page description reads "Assign and monitor OJT jacket status for [firstName]." Same `user.firstName` personalization issue as the dashboard — this is an org-wide management view, not personal.
- The table renders no column for "Last Activity" or "Progress %," making it impossible to quickly identify stale or near-complete jackets from the list view without clicking into each one.
- The "Assign Jacket" dialog allows assigning the same technician + curriculum combination multiple times with no duplicate check. A tech can end up with duplicate jackets for the same curriculum.
- The table rows are clickable (navigate to jacket detail) but there is no visual hover affordance on the row itself beyond `cursor-pointer` — on a white background, users may not discover that rows are clickable.
- The loading state shows "Loading jackets…" as a plain text cell, which is inconsistent with the skeleton loading pattern used elsewhere in the app.
- No pagination or virtualization — all jackets load in a single table. An org with hundreds of jackets will have performance and scroll issues.

**Recommendations:**
- Change description to "Assign and monitor OJT training jacket progress across your organization."
- Add "Last Activity" and "Progress" (completed tasks / total tasks) columns to the table, or expose them as sortable columns.
- Add a duplicate-check in `onAssign`: query existing jackets for the selected technician/curriculum pair before creating, and show a warning if one already exists.
- Add a subtle row highlight on hover (e.g., `hover:bg-muted/50`) to signal row clickability.
- Replace the "Loading jackets…" text cell with a row of Skeleton cells matching the table column count.
- Add pagination (50 per page) or at minimum a count header: "Showing N of M jackets."

---

### `/training/ojt/jackets/[jacketId]` — Jacket Detail (5-column sign-off)
**File:** `app/(app)/training/ojt/jackets/[jacketId]/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** The strongest page in the Training/OJT section. The 5-column sign-off paradigm is correctly implemented: locked sequential progression, tooltips showing signer name and date, green completion states, and a context-aware `ColumnSignOffDialog`. The three-tab structure (Progress, Activity Log, Scoring) maps cleanly to the three audiences (trainer doing work, trainer reviewing history, QC manager reviewing readiness). The JacketHeaderCard's progress bar gives immediate at-a-glance status.

**Issues:**
- Column 5 is labeled "Auth" in `FiveColumnTaskRow` to distinguish it as an authorization step, but this semantic distinction is not explained anywhere on the page. A trainer seeing five circles labeled "1, 2, 3, 4, Auth" has no documentation of what "Auth" means (final sign-off by an authorized signer vs. a stage-5 trainer observation).
- The `ColumnSignOffDialog` is triggered by clicking any next-available column circle, but there is no way to click a completed circle to view the sign-off detail without using the tooltip (which requires hover). On touch devices, tooltip-on-hover is inaccessible. Sign-off details (signer name + date) should be accessible via tap/click.
- The page renders `JacketHeaderCard` using `lastActivity` computed as `Math.max(...stageEvents.map(e => e.createdAt))`. If `stageEvents` is empty the `Math.max()` call returns `-Infinity`, and `formatDate(-Infinity)` in `JacketHeaderCard` formats to "---" via the `if (!ts)` guard — this edge case is handled but could show an incorrect date if `Infinity` somehow passes the guard on certain JS engines.
- The Progress tab shows sections in order, but the "Authorization capabilities" section (if any) is rendered first, above all curriculum sections. For a tech working through a curriculum sequentially, seeing an authorization block before any tasks is disorienting — authorizations are typically the final step.
- On the Scoring tab, `JacketScoringCard` shows section percentages but the scoring model (1 point per column signed) is not explained. A manager reviewing the scoring tab has no context for what 60% means for compliance readiness.
- The back link goes to `/training/ojt/jackets` (the full jacket list). If the user arrived from a specific technician's career profile or from a curriculum detail, the back link is wrong.

**Recommendations:**
- Add an inline "?" tooltip or info card explaining column semantics: "Columns 1-4 represent trainer observations at increasing proficiency levels. Column 5 (Auth) is the final authorization sign-off."
- Make completed column circles tappable (not just hoverable) to show sign-off details in a small popover or bottom sheet on mobile.
- Move the `AuthorizationSection` to the bottom of the Progress tab, below all curriculum sections, as it represents a terminal step.
- Add a brief scoring methodology note to the Scoring tab: "Score = columns signed / maximum possible columns (5 per task). Scores above 80% indicate readiness for independent work."
- Consider adding a breadcrumb that respects the navigation history (or at minimum offer both "Back to Jackets" and a link to the curriculum).

---

### `/training/ojt/roster` — OJT Enrollment Roster
**File:** `app/(app)/training/ojt/roster/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A read-only table showing which personnel are enrolled in OJT, filtered by category and enrollment status. The data model is sensible for tracking enrollment state. However, the page is read-only with no enrollment management actions, making it an informational dead end.

**Issues:**
- The roster table is entirely read-only. There is no way to enroll or un-enroll a person from this page. The "Enrolled" column shows Yes/No badges but provides no edit affordance. A training manager navigating to this page expecting to manage enrollment finds only a report.
- The columns "OJT Log Version" and "Log Converted" are technical fields (likely for migration tracking from paper logs to digital) that are not meaningful to most end users. They occupy two of seven columns without explanation.
- "Location Code" appears as a column but shows "—" for most entries. Without a legend or location list, this column adds noise.
- The "Last Update" column shows the date of `lastDigitalUpdate` but the column header doesn't clarify what was last updated — it could be enrollment status, log version, or anything else.
- The `techMap.get(entry.technicianId) ?? "Unknown"` pattern means any roster entry without a matching technician record shows "Unknown" with no further explanation or link to fix the orphan record.
- No total counts summary beyond the subtitle ("N of M personnel enrolled"). There is no breakdown by category, no "unenrolled but should be" highlighting.
- The page is reachable only via the `/training/ojt` dashboard "View Roster" button — there is no sidebar entry for it, making it hard to discover.

**Recommendations:**
- Add enrollment toggle actions (enroll/un-enroll) directly on roster rows for users with appropriate permissions.
- Hide or collapse "OJT Log Version" and "Log Converted" columns behind an "Advanced" toggle or remove them from the default view — surface them only for administrators doing a migration audit.
- Add a summary bar above the table: category breakdown counts (e.g., "Mechanic: 12 enrolled / 15 total").
- Rename "Last Update" to "Last Digital Update" and add a tooltip: "Date this person's OJT log was last updated in the digital system."
- Add a "orphan" visual treatment for rows where the tech name shows as "Unknown" — a warning icon and link to the technician management page.
- Consider adding this page to the sidebar navigation or making it accessible from Personnel Roster.

---

### `/my-work` — My Work
**File:** `app/(app)/my-work/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A well-executed technician daily landing page. The risk-first sort order (overdue → at_risk → no_date, then status order) is exactly right for a tech starting a shift. The "Awaiting Sign-Off" badge is a strong UX solution for surfacing blocked cards. The active-only filter toggle is clean. The handoff note preview is a practical touch for shift-change communication.

**Issues:**
- The progress bar label "Steps started/done" (fixed from a prior bug, per the inline comments) is still ambiguous to a non-developer. The actual meaning — "steps no longer in pending state" — is noted in a comment but not surfaced to users. A tech seeing "3/5 steps started/done" on a card they haven't touched yet (where 3 steps were completed by a prior shift) may be confused.
- The stats cards show "Total Assigned," "In Progress," and "Pending Steps" — but no "Overdue" count or "Awaiting Sign-Off" count. These are the highest-urgency items, yet they require scrolling the card list to discover. Adding a fourth stat card for urgent/overdue count would immediately surface risk.
- The filter toggle (`activeOnly`) label changes between states: when false it shows "All cards"; when true it shows "Active only." This inverted label pattern (the button describes the current filter, not the action) can confuse users who expect the button to describe what happens when they click it.
- Cards link to `/work-orders/${card.workOrderId}/tasks/${card._id}` (card detail inside WO). There is no link or navigation affordance to the parent work order from the My Work page without clicking into the card first. Navigating to the WO to check tail/aircraft context requires extra steps.
- The empty state when `activeOnly` is true and all cards are complete shows a "Show all N cards" ghost button — this is good, but the empty state icon (`ClipboardCheck`) and text is identical to the "no cards assigned" state, making it easy to confuse "all done" with "nothing assigned."
- No date-relative grouping of cards (today's work vs. future-dated vs. no date). A tech with 12 assigned cards has no temporal grouping to understand what to work on today vs. what is scheduled for next week.

**Recommendations:**
- Rename progress bar label to "Steps completed" and clarify: a step is "completed" when it has been signed, not just started. If backend cannot distinguish signed vs. started, keep "Steps progressed" as a neutral term.
- Add a fourth summary stat card: "Overdue" (count of cards with `scheduleRisk === "overdue"`), styled in red.
- Fix the filter toggle label: when `activeOnly` is false, button should read "Active only" (the action to apply); when `activeOnly` is true, button should read "Show all" (action to reset). A persistent filter indicator label ("Showing: Active cards only") near the card list can show the current state.
- Add a "WO →" contextual link on each card row showing the work order number as a direct link (the WO number link already exists in row 2 — ensure it is visually prominent).
- Give the "all cards complete, none to show" empty state a distinct icon (e.g., a green checkmark icon) to visually differentiate it from the "nothing assigned" state.
- Group cards by date-status: "Today / Due Soon" → "Upcoming" → "No Date" as section headers, even if all cards remain a flat list within each group.

---

### `/my-work/time` — My Time
**File:** `app/(app)/my-work/time/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** The strongest page in the My Work section and one of the best-executed in the entire evaluated scope. The clock-in flow is logically sequenced (entry type → work order → work card → step), the active timer card with live elapsed display is visually distinctive, the weekly summary grid is scannable, and the history table with approval-status filtering is complete. All edge cases (no technician profile, active timer already running) have graceful states.

**Issues:**
- The cascading select for clock-in context type (`work_order` → `task` → `step`) shows 4 entry types including "Shop / Internal" which produces a shop activity code text input. While correct, the type labels are slightly developer-oriented. A technician may not know the difference between "Work Order" (time logged to the WO level) and "Work Card" (time logged to a specific task card). These distinctions matter for billing but are opaque without tooltips.
- The clock-in form's `Shop / Internal` entry type still appears first in the select list, before `Work Order`. Most clock-in actions for a technician will be against a work order — the most common action should be the first item.
- The weekly summary grid uses `grid-cols-7` with abbreviated day labels (Mon-Sun based on `DAY_LABELS`) but shows durations in "Xh Ym" format which may overflow on narrow viewports (e.g., "12h 45m" in a column that is roughly 1/7 of the screen width on mobile).
- The error state sets `setError(...)` but this state is not cleared on successful navigation away or component remount — if a user encounters an error, navigates away and returns, the error persists from the previous session until they perform another action.
- The time history table shows all entries with no date-range limit. An active tech with 12 months of entries will have a very long table with no pagination. The filters (entry type, approval status) help but don't address the volume problem.
- The "Notes" field for clock-in is optional and placed last — this is good ordering. However, there is no character limit or guidance on what notes should contain (work description? handoff info?).

**Recommendations:**
- Add brief tooltips to each Entry Type option explaining scope: "Work Order — log time to the overall order" / "Work Card — log time to a specific task card" / "Task Step — log time to a single procedure step."
- Reorder entry types to: Work Order (first), Work Card, Task Step, Shop / Internal.
- Cap day label duration display to "12h" without minutes on narrow widths, or use a progress bar per day rather than a text label, to avoid overflow.
- Clear `setError(null)` on component unmount (`useEffect` cleanup) to prevent stale error display on return navigation.
- Add a default date-range filter for the history table (defaulting to "current week" or "last 30 days") with an option to show all, and implement client-side pagination at 50 entries per page.
- Add placeholder guidance to the Notes field: "Optional: describe work performed or leave notes for the next shift."

---

## Section Summary

### Personnel Section Overview
The personnel section is architecturally mature — data flows cleanly from `PersonnelCommandTabs` down to tab components, RBAC is consistently applied, and skeleton loading states are thorough. The main problems are organizational: the `/personnel/training` page has accumulated 11 tabs spanning at least three distinct conceptual domains (records management, regulatory compliance, performance analytics), making it the worst-usability page in the entire audit. The career profile page is data-rich but relies on fragile text heuristics for critical compliance fields (A&P/IA cert detection).

**Priority fixes for personnel:**
1. Split `/personnel/training` into no more than 5 focused tabs; move OKR/KPI/analytics elsewhere.
2. Add `flex-wrap` to the training page `TabsList` immediately (prevents tab overflow on standard displays — a layout bug).
3. Fix the duplicate route param naming (`[id]` vs `[techId]`).
4. Add structured cert number fields to the technician schema for career profile reliability.

### Training/OJT Section Overview
The OJT section is well-designed at the individual jacket level (`/training/ojt/jackets/[jacketId]`) — the 5-column sign-off model is implemented correctly with proper sequential locking, tooltip attribution, and three-tab breakdown. The curriculum editor has good drag-and-drop structure but lacks delete confirmation for compliance-critical content. The dashboard and jacket list pages have cosmetic and discoverability issues (false-zero stats, missing empty states) but are functionally correct.

**Priority fixes for training/OJT:**
1. Add delete confirmation dialogs to section and task deletion in the curriculum editor.
2. Add RBAC check for "Create Curriculum" — not all roles should author curricula.
3. Fix the false-zero stat flash on the OJT dashboard with a batched stat query.
4. Add column semantics explanation (what "Auth" means on the 5th column) on the jacket detail page.
5. Fix the jacket deep-link on the career profile page (`/training/ojt/jackets/${id}` not `/personnel/training?...`).

### My Work Section Overview
The My Work and My Time pages are the most technician-centric pages in the app and represent the daily interface for line techs. Both are well-executed with correct sorting logic, appropriate empty states, and live timer functionality. The main gaps are: (1) the lack of a dedicated overdue stat card in My Work, (2) ambiguous entry-type labels in My Time clock-in, and (3) no date-range grouping in My Work for techs with many assignments.

**Priority fixes for My Work:**
1. Add a fourth "Overdue" stat card to My Work.
2. Fix the filter toggle label to describe the action rather than the current state.
3. Reorder clock-in entry types in My Time to put "Work Order" first.

### Cross-Section Issues: Personnel ↔ Training/OJT Overlap

There is a significant structural overlap between `/personnel/training` and `/training/ojt` that creates user confusion:

- `/personnel/training` manages course records, qualification requirements, and sign-off queues. It also includes an OJT jacket link and trainer records.
- `/training/ojt` manages OJT curricula and jacket execution.
- The `/personnel/[id]/training` page manages individual training records (a third entry point).
- `/personnel/[techId]/career` shows OJT jacket status (a fourth entry point).

A technician or manager trying to understand a colleague's training status must visit at least two of these four surfaces. The correct long-term architecture is:

- **Admin/Manager flow:** `/training` hub → manage curricula, requirements, sign-off queue, compliance reports.
- **Individual record flow:** `/personnel/[id]` profile → training tab (records), OJT tab (jackets), career tab (experience summary).
- **Daily work flow:** `/my-work` → task cards; `/my-work/time` → clock in/out.

The current state conflates admin and record-keeping into a single 11-tab page that serves no single user well.
