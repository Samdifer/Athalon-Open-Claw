# WS33-C — v1.5 Sprint 1: FSDO Audit Export Improvements + Mobile Ramp-View Quick ALS Card
**Workstream:** WS33-C
**Phase:** 33 / v1.5
**Features:** F-1.5-A (FSDO Audit Export Improvements) + F-1.5-B (Mobile Ramp-View Quick ALS Card)
**Owner:** Devraj Anand (engineering lead), Cilla Oduya (QA), Marcus Webb (compliance review), Chloe Park + Finn Calloway (UI)
**Timeline:** 2026-07-21 through 2026-08-11 (Sprint 1 build + test window)
**Release:** v1.5.0-sprint1 (Jonas release gate)
**Status:** ✅ DONE — Shipped. Cilla ✅. Marcus ✅. Jonas ✅. UAT: Frank Nguyen ✅, Dale Renfrow ✅, Curtis Pallant ✅.

---

## §1. Sprint 1 Context

v1.4 was a depth sprint. Six features, all oriented around a single problem: does the platform own the ALS compliance lifecycle? After Phase 32 and the v1.4.0 release, the answer is yes. 148 integration test cases. Seven shops. Zero production incidents.

v1.5 Sprint 1 asks a different question: can the platform reach further — further into the auditor's experience when they walk into a shop, further into the ramp tech's day when they're standing on the flight line with an iPad in 90-degree heat? These are different users than the DOM at the workstation. They have different problems.

F-1.5-A (FSDO Audit Export Improvements) is for the auditor and the DOM preparing for an audit. F-1.5-B (Mobile Ramp-View Quick ALS Card) is for the DOM and mechanic on the ramp.

Both features shipped in parallel. Sprint 1 architecture sprint ran 2026-07-21 through 2026-07-25. Build ran 2026-07-28 through 2026-08-04. UAT and regression ran 2026-08-05 through 2026-08-08. Release gate 2026-08-11.

---

## §2. F-1.5-A — FSDO Audit Export Improvements

**Feature ID:** F-1.5-A
**Feature Owner:** Devraj Anand (backend), Marcus Webb (compliance review), Chloe Park (PDF template)
**Reference:** WS32-E Candidate B; Ranked #2 in v1.5 backlog

---

### §2.1 What the Export Did Before Sprint 1

The FSDO Audit Export was introduced in v1.3 (F-1.3-D, Phase 28). At v1.4.0 baseline, the export produced:
- Maintenance records (work orders, sign-offs, RTS entries) — all closed WOs within the requested date range
- ALS board snapshot (current state of all ALS items per aircraft)
- Repetitive AD compliance status (from F-1.4-A)
- Repair station certificate number on all maintenance release headers (from F-1.4-D)

What it did not produce:
- Personnel certificate section (IA certs, A&P certs, repairman certs)
- Open discrepancy list (work orders in OPEN or PENDING-CLOSE status)
- Procedures manual reference
- A structured cover page

When Frank Nguyen (DOM, Desert Sky Turbine) brought in an FSDO inspector in Phase 27, the inspector asked for the IA certs separately. Frank printed them from his personnel file. He made a note to Marcus afterward: *"The export is great for maintenance records. But the auditor wants to see everything in one bundle. When I'm handing them a folder, I want it to be the whole folder, not most of it."*

That note, plus similar comments from Dale Renfrow and Marcus's own FSDO compliance knowledge, produced the Sprint 1 prioritization.

---

### §2.2 Architecture Sprint (2026-07-21 through 2026-07-25)

**Devraj Anand (architecture notes, 2026-07-21):**

The export is currently a PDF generation pipeline: Convex query → data assembly → PDF rendering via react-pdf. The output is a single document with section breaks. Adding four new sections means extending the data assembly query and the PDF template.

The new sections require:
1. **Personnel cert section:** Query `personnel` collection for all certificated staff attached to the org; include uploaded cert documents if present. Schema already contains this data — it's just not in the export template.
2. **Open discrepancy list:** Query `workOrders` collection for all records with `status: "OPEN" | "PENDING_CLOSE"` at export generation time. This is a live-at-export-time snapshot; it reflects the shop's current open maintenance workload.
3. **Procedures manual reference:** New field on the `repairStation` schema: `proceduresManualLocation` (type: `{type: "document_link" | "file_path_external" | "binder_location_note", value: string}`). Required field for export generation — if not populated, export warns but proceeds with a placeholder.
4. **Cover page:** Assembled from existing org data (shop name, cert numbers, DOM name, IA cert, fleet count, export date, section checklist).

**Data model change:**
```typescript
// repairStation schema addition
proceduresManualLocation: v.optional(v.object({
  type: v.union(
    v.literal("document_link"),
    v.literal("file_path_external"),
    v.literal("binder_location_note")
  ),
  value: v.string()
}))
```

**PDF section architecture:**
```
Cover Page
├── Shop name + cert number
├── DOM name + IA cert number  
├── Export date and date range
├── Fleet count
└── Sections included (checklist)

Section 1: Certificated Personnel
├── Name, cert type, cert number, expiry (if applicable)
└── [cert document attachment if uploaded]

Section 2: Maintenance Records
└── [existing — closed WOs in date range]

Section 3: ALS Board Snapshot
└── [existing — current ALS state per aircraft]

Section 4: Repetitive AD Compliance Status
└── [existing — from F-1.4-A]

Section 5: Open Discrepancy List
├── WO number, aircraft tail, work type
├── Open date, assigned mechanic
└── Status (OPEN / PENDING_CLOSE)

Section 6: Procedures Manual Reference
└── "Procedures Manual: [location note]"
```

**Marcus compliance review of architecture (2026-07-23):**

*The section structure is correct for a 14 CFR §145 audit context. FSDO inspectors conducting §145.417 record-keeping audits typically review:*
- *(a) Personnel qualifications (§145.155) — covered by Section 1*
- *(b) Maintenance records (§145.219) — covered by Section 2*
- *(c) Airworthiness requirements compliance (§145.205) — covered by Section 3 + 4*
- *(d) Current maintenance workload (§145.217 maintenance release obligations; implicit) — covered by Section 5*
- *(e) Repair station procedures manual (§145.209(a)) — covered by Section 6*

*The procedures manual location field is important. §145.209(a) requires the repair station to have an approved procedures manual. The FSDO inspector needs to know where it is. The current export had no reference to it at all. Adding even a location note closes a gap that's been in every export we've generated.*

*Compliance clearance: architecture APPROVED.*
**Signed: Marcus Webb, 2026-07-23**

---

### §2.3 Build Execution (2026-07-28 through 2026-08-04)

**Week 1 (2026-07-28 through 2026-08-01):**

Devraj extended the `repairStation` schema with `proceduresManualLocation`. A one-time migration ran against all existing org records, setting the field to `null` with a migration log. The settings UI received a new "Procedures Manual" section on the Org Settings page (Chloe Park built the component — two fields: type selector dropdown + location text input; character limit 200; saves inline with validation).

**Week 1 (continued):**

The export PDF template was restructured. Cover page component built (react-pdf). Personnel cert section built: the query iterates `personnel` records, extracts cert data, and includes cert document URLs where present. The PDF rendering links to cert documents as embedded files or URL footnotes (depending on document size — files over 2MB are referenced by URL rather than embedded to keep export PDF size manageable).

Open discrepancy list section built: live snapshot query at generation time; renders as a table with five columns (WO #, Aircraft, Work Type, Open Date, Mechanic). If no open discrepancies: section renders "No open discrepancies at export date [DATE]." — an affirmative statement, not an empty section.

Procedures manual section: renders the `proceduresManualLocation.type` and value. Three display variants:
- `document_link`: "Procedures Manual: [hyperlink]"
- `file_path_external`: "Procedures Manual: on file at [path/location note]"
- `binder_location_note`: "Procedures Manual: physical binder — [location note]"
- `null` / not configured: "Procedures Manual: LOCATION NOT CONFIGURED — update Org Settings before FSDO audit"

**Week 2 (2026-08-01 through 2026-08-04):**

Cover page rendered with dynamic section checklist: the cover page inspects which sections are present in the specific export run and lists them with checkmarks. If a shop has no open discrepancies, Section 5 still appears with the "no open discrepancies" affirmative statement. Sections that are entirely empty (e.g., no uploaded cert documents for any personnel) render with a note explaining the gap.

Export size optimization: tested export generation for a large shop profile (simulated Desert Sky Turbine with 11 aircraft, 8 personnel, 180 closed WOs, 15 open WOs, 95 ALS items). PDF: 24 pages, 1.8MB. Well within browser-renderable range.

---

### §2.4 Test Cases — F-1.5-A (Cilla Oduya)

**Total TCs: 24**
**Cilla's TC matrix filed:** 2026-08-05

| TC # | Test Description | Expected | Result |
|---|---|---|---|
| TC-A-01 | Export for shop with all personnel cert docs uploaded | Section 1 includes each cert doc (embedded or URL) | ✅ PASS |
| TC-A-02 | Export for shop with some certs missing docs | Section 1 includes cert number; notes missing document | ✅ PASS |
| TC-A-03 | Export for shop with no cert docs uploaded | Section 1 includes cert numbers only; notes no documents | ✅ PASS |
| TC-A-04 | Open discrepancy list with 3 OPEN WOs + 2 PENDING_CLOSE | Section 5 shows 5 items with correct status each | ✅ PASS |
| TC-A-05 | Open discrepancy list with zero open WOs | Section 5 renders "No open discrepancies at export date" | ✅ PASS |
| TC-A-06 | Open discrepancy list with WO opened today (same-day WO) | Section 5 includes same-day WO | ✅ PASS |
| TC-A-07 | Procedures manual: `document_link` type | Section 6 renders hyperlink with label | ✅ PASS |
| TC-A-08 | Procedures manual: `binder_location_note` type | Section 6 renders physical location description | ✅ PASS |
| TC-A-09 | Procedures manual: `file_path_external` type | Section 6 renders file path/location note | ✅ PASS |
| TC-A-10 | Procedures manual: field not configured | Section 6 renders "LOCATION NOT CONFIGURED" warning | ✅ PASS |
| TC-A-11 | Cover page: all sections present | Cover page checklist shows all 6 sections ✅ | ✅ PASS |
| TC-A-12 | Cover page: correct DOM name + IA cert number | DOM name and cert number from org personnel record | ✅ PASS |
| TC-A-13 | Cover page: export date = current date | Date is generation date, not data-as-of date | ✅ PASS |
| TC-A-14 | Cover page: fleet count matches active aircraft | Count is live aircraft count at generation time | ✅ PASS |
| TC-A-15 | Large shop export (11 aircraft, 180 WOs) | PDF generates in <8 seconds, <3MB | ✅ PASS (6.2s, 1.8MB) |
| TC-A-16 | Export PDF opens correctly in Adobe Acrobat (Windows) | Renders without errors; all sections navigable | ✅ PASS |
| TC-A-17 | Export PDF opens correctly in Preview (macOS) | Renders without errors | ✅ PASS |
| TC-A-18 | Regression: existing maintenance records section unchanged | Section 2 output identical to v1.4.0 export baseline | ✅ PASS |
| TC-A-19 | Regression: existing ALS board snapshot section unchanged | Section 3 output identical to v1.4.0 export baseline | ✅ PASS |
| TC-A-20 | Regression: existing AD compliance section unchanged | Section 4 output identical to v1.4.0 export baseline | ✅ PASS |
| TC-A-21 | Personnel with IA cert (Lorena Vásquez profile) | IA cert flagged as IA type, not A&P; correct display | ✅ PASS |
| TC-A-22 | Personnel with repairman cert | Repairman cert type and employer shown | ✅ PASS |
| TC-A-23 | Export requested for date range with no closed WOs | Section 2 renders "No maintenance records in selected date range" | ✅ PASS |
| TC-A-24 | Export for new shop (Day 1 — no closed WOs, no ALS entries yet) | All sections render; appropriate empty-state messages | ✅ PASS |

**TC result: 24/24 PASS**

---

### §2.5 UAT — Frank Nguyen (Desert Sky Turbine, DOM)

**UAT date:** 2026-08-06
**Reviewer:** Frank Nguyen (DOM, Desert Sky Turbine, Scottsdale AZ)
**Method:** Frank generated a test FSDO export for DST using v1.5.0-sprint1 build; reviewed against his memory of the 2026-02 FSDO inspection

**Frank's notes (submitted to Devraj post-UAT):**

> "The cover page is exactly what I needed at the 2026 audit. The inspector spent three minutes reading the cover page and understanding the structure of what I handed them. That time used to be spent with me explaining what was in the folder.
>
> The personnel cert section: I uploaded three cert documents before the UAT — my IA cert, my senior mechanic's A&P, and Marcus's remote compliance authorization letter. All three appeared in Section 1. The IA cert showed the cert type as 'IA' — correct. The authorization letter showed as a reference document, not a cert type — appropriate.
>
> The open discrepancy list: we had two open WOs at the time of the test. Both appeared. The display is clean — WO number, aircraft, work type, opened date, assigned. This is exactly what an auditor needs to see. It answers 'what are you currently working on' without me summarizing it verbally.
>
> The procedures manual location: I used 'binder_location_note' because our PM is in a binder in the supervisor's office. It shows up as: 'Procedures Manual: physical binder — Supervisor's Office, DST South Hangar, Scottsdale AZ.' That's the correct information. The inspector would know exactly where to find it.
>
> One suggestion: the cover page could include the date range of the maintenance records section (e.g., 'records from 2026-01-01 to 2026-06-30'). Right now you have to open Section 2 to see that."

**Marcus logged Frank's suggestion as FR-33-02 (cover page date range display) — added to v1.5 Sprint 2 backlog.**

**Frank UAT sign-off: APPROVED ✅**

---

### §2.6 F-1.5-A Compliance Sign-Off

**Marcus Webb:**
*F-1.5-A FSDO Audit Export Improvements — compliance review COMPLETE.*

*Section 1 (Personnel Certs): covers §145.155 certificated personnel requirements. Cert type, cert number, and document upload all present. FSDO inspector can verify personnel qualifications from export without requesting additional documentation.*

*Section 5 (Open Discrepancy List): covers §145.217 maintenance release obligations (by showing what is NOT yet released — the auditor can assess the shop's current compliance posture). The affirmative "no open discrepancies" statement when the list is empty is correct and preferred over silence.*

*Section 6 (Procedures Manual): closes the most persistent gap in prior export versions. §145.209(a) requires an approved procedures manual; the export now tells the inspector where it is. Three location types cover all real-world scenarios (digital, external server, physical binder).*

*Cover page: correct structure for 14 CFR Part 145 audit context. Shop identity, cert numbers, DOM/IA identification, and section checklist are the right elements. The 30-second test: an FSDO inspector can determine the full contents of the export package within 30 seconds of opening it. Cover page achieves this.*

*Compliance APPROVED. F-1.5-A is ready for production release.*

**Signed: Marcus Webb, Compliance Architect, 2026-08-08**

---

## §3. F-1.5-B — Mobile Ramp-View Quick ALS Card

**Feature ID:** F-1.5-B
**Feature Owner:** Devraj Anand (backend + sync), Chloe Park + Finn Calloway (UI/UX), Marcus Webb (compliance)
**Reference:** WS32-E Candidate F; Ranked #5 in v1.5 backlog; FR-32-03 (Dale Renfrow)
**UAT targets:** Dale Renfrow (RMTS — feature requester), Curtis Pallant (Ridgeline — turbine DOM)

---

### §3.1 The Problem Dale Named

The feature request came from Dale Renfrow in Phase 32, logged as FR-32-03 at the RMTS 30-day check-in:

> *"When I'm on the ramp doing a pre-departure check, I want to see ALS status immediately. Right now I have to open the app, find the aircraft, navigate to the ALS board — that's three or four taps. By the time I get there the pilot is staring at me. I want to see red/amber/green from the home screen."*

Dale is not the only DOM who described this problem. Curtis Pallant mentioned it on his onboarding call: *"I check the TBM before every dispatch. It's a 30-second check. I just want to know if anything changed overnight."* Sandra Okafor at Lone Star Rotorcraft had a similar workflow — a morning walk-around where she wanted a fleet status sweep before the day's work orders were pulled.

The problem is not about data availability. The data exists. The ALS board is in the app. The problem is access path: 3–4 taps from app home to ALS board is 3–4 taps too many for a ramp check. The feature needed to bring the data to the surface.

---

### §3.2 Architecture Sprint (2026-07-21 through 2026-07-25)

**Chloe Park (UX design notes, 2026-07-22):**

The feature has four distinct components that can be designed and built somewhat independently:

1. **Pinned aircraft shortcut cards (mobile home screen)** — the primary feature request. Up to 5 aircraft pinned to the home screen. Each card shows the critical ALS status line at a glance.
2. **ALS status line logic** — the smart summarization that reduces the full ALS board to a single signal: OVERDUE / DUE_SOON / COMPLIANT. This is both UI and backend logic.
3. **Home screen widget (iOS + Android)** — extends the shortcut card concept to a native OS home screen widget that lives outside the app.
4. **Ramp View mode (on the ALS board)** — a full-page, high-contrast, large-text mode for the existing ALS board for outdoor readability.

**Design decisions:**
- Pinned cards are configurable; the DOM drags to reorder. Up to 5 aircraft. The pin state is stored server-side (per-user preference in the `userPrefs` collection) so it persists across devices.
- ALS status line uses a strict priority hierarchy: OVERDUE > DUE_SOON > COMPLIANT. The single worst condition determines the displayed status. If an aircraft has both OVERDUE and DUE_SOON items, it shows OVERDUE. If there are 3 DUE_SOON items, the line shows "⚠️ DUE_SOON — 3 items in ≤30 days."
- Tapping a card navigates directly to the ALS board for that aircraft. No intermediate screens.
- Ramp View is toggle-accessible from the ALS board top-right menu. It is a view-only mode — no editing from Ramp View.

**Finn Calloway (widget design notes, 2026-07-23):**

The iOS widget uses WidgetKit (SwiftUI). The Android widget uses Android App Widget framework. Both display the same data: aircraft tail number, type name, and the ALS status line. Widgets refresh via background app refresh on both platforms (respecting OS battery optimization).

Three widget sizes for iOS (small, medium, large):
- Small: one aircraft card
- Medium: two aircraft cards (stacked)
- Large: up to four aircraft cards

The Android widget adapts to device home screen grid — standard 4×2 grid shows two aircraft cards.

**Devraj Anand (backend architecture notes, 2026-07-24):**

The ALS status line logic runs on the backend as a computed field — `aircraftAlsStatus` — that aggregates the ALS board for a given aircraft and returns the worst-case status:

```typescript
type AlsStatus = {
  level: "OVERDUE" | "DUE_SOON" | "COMPLIANT";
  overdueCount: number;
  dueSoonCount: number;
  nextDueItem: string | null;   // item name of nearest upcoming item (if COMPLIANT)
  nextDueDays: number | null;   // days until nearest upcoming item (if COMPLIANT)
};
```

This computed status is cached per-aircraft with a 15-minute TTL (or invalidated immediately on ALS board mutation). The mobile home screen queries the pinned aircraft list and fetches the cached status for each — fast, no N+1 query per aircraft.

For offline support: the status cache is written to the device's offline store when the app is foregrounded. Widgets read from the last-synced cache. If the device is offline when the widget refreshes, it displays cached status with a last-synced timestamp: "Last updated: 2h ago."

**Marcus compliance review of architecture (2026-07-25):**

*The ALS status line logic is a display feature only — it does not affect the underlying ALS tracking data or compliance records. The computed status is a read-only aggregation. No compliance concerns with the architecture. The Ramp View is view-only; no editing from Ramp View. Both are correct constraints.*

*One note: the "All clear — next due: [item name] in [X] days" display on the COMPLIANT line should show calendar days, not cycle count, if the item has both a calendar and cycle dimension. For cycle-only items, it should show cycles remaining. For items with both (calendar and cycle — like CMR items that have a calendar interval), show whichever limit is closer. This is consistent with how the full ALS board handles dual-dimension items.*

*Architecture APPROVED with the dual-dimension note incorporated.*
**Signed: Marcus Webb, 2026-07-25**

---

### §3.3 Build Execution (2026-07-28 through 2026-08-04)

**Week 1:**

Devraj built the `aircraftAlsStatus` computed query and cache logic. The cache invalidation hook on ALS board mutation was wired in — any write to the `alsItems` collection for a given aircraft clears the status cache for that aircraft and triggers a re-compute. Cache TTL set to 15 minutes for passive refresh; immediate invalidation on writes.

Pinned aircraft preference schema extended on `userPrefs`:
```typescript
pinnedAircraft: v.optional(v.array(v.object({
  aircraftId: v.id("aircraft"),
  pinOrder: v.number()
})))
```

**Week 1 (continued):**

Chloe built the QuickALSCard component (React Native). The card displays:
- Aircraft tail (large, bold)
- Aircraft type name (smaller, secondary)
- Status badge (colored block: red for OVERDUE, amber for DUE_SOON, green for COMPLIANT)
- Status line text
- Last-synced indicator (gray, small, bottom of card)

The home screen "Quick Access" section is a horizontally-scrollable row on mobile home screen. The section header has a "Manage pins" button that opens a drag-to-reorder modal.

Finn built the iOS widget using WidgetKit. Three widget sizes. Medium (2-card) is the recommended size and renders cleanly on both iPhone 14 and iPad home screens. The widget deeplinks to the app's ALS board for the specific aircraft on tap.

**Week 2:**

Android widget built. Devraj extended the background sync service (existing offline sync infrastructure from F-1.1-D) to include the pinned aircraft status cache as a high-priority sync item — the app fetches pinned aircraft statuses first on any background sync event.

Ramp View mode built by Chloe + Finn. Design decisions:
- Large text (all ALS item names at 18pt minimum; status badges at 24pt)
- High contrast (black background, white text, high-saturation color for status badges — tested against a simulated outdoor glare condition)
- Single-column layout (no tables; each ALS item is a full-width row)
- OVERDUE items float to the top, then DUE_SOON, then COMPLIANT
- A "Share / Print" button exports the Ramp View as a PDF snapshot (single-page, print-optimized; useful for paper backup)
- Toggle is a dedicated "Ramp View" icon in the ALS board top-right menu (sunglasses icon — Finn's decision; Marcus approved)

---

### §3.4 Test Cases — F-1.5-B (Cilla Oduya)

**Total TCs: 26**
**Cilla's TC matrix filed:** 2026-08-06

| TC # | Test Description | Expected | Result |
|---|---|---|---|
| TC-B-01 | Pin aircraft to home screen — up to 5 | 5 cards appear in Quick Access row | ✅ PASS |
| TC-B-02 | Attempt to pin 6th aircraft | System prevents; tooltip "Max 5 pinned aircraft" | ✅ PASS |
| TC-B-03 | Drag to reorder pinned aircraft | Order updates in real time; persists on app restart | ✅ PASS |
| TC-B-04 | Unpin aircraft | Card removed from Quick Access row | ✅ PASS |
| TC-B-05 | Status line: aircraft with 1 OVERDUE item | "⛔ OVERDUE — 1 item" (red badge) | ✅ PASS |
| TC-B-06 | Status line: aircraft with 3 OVERDUE items | "⛔ OVERDUE — 3 items" (red badge) | ✅ PASS |
| TC-B-07 | Status line: aircraft with 2 DUE_SOON, 0 OVERDUE | "⚠️ DUE_SOON — 2 items in ≤30 days" (amber) | ✅ PASS |
| TC-B-08 | Status line: aircraft with 1 OVERDUE + 2 DUE_SOON | OVERDUE takes priority: "⛔ OVERDUE — 1 item" | ✅ PASS |
| TC-B-09 | Status line: aircraft all COMPLIANT | "✅ All clear — next due: [item name] in [N] days" (green) | ✅ PASS |
| TC-B-10 | COMPLIANT line — cycle-only item nearest | "✅ All clear — next due: Compressor Disc in 847 cycles" | ✅ PASS |
| TC-B-11 | COMPLIANT line — dual-dimension item nearest (cycle closer) | Shows cycle-based next due (per Marcus's guidance) | ✅ PASS |
| TC-B-12 | COMPLIANT line — dual-dimension item nearest (calendar closer) | Shows calendar-based next due | ✅ PASS |
| TC-B-13 | Tap pinned card → navigates to ALS board | Correct aircraft ALS board opens | ✅ PASS |
| TC-B-14 | Status cache invalidation on ALS write | Pin card refreshes within 1 second of ALS board mutation | ✅ PASS |
| TC-B-15 | Status line passive refresh (15-min TTL) | Status updates on next open after 15 minutes | ✅ PASS |
| TC-B-16 | iOS widget: small size (single aircraft) | Card renders correctly; deeplinks to app | ✅ PASS |
| TC-B-17 | iOS widget: medium size (two aircraft) | Both cards render; correct tails; correct status | ✅ PASS |
| TC-B-18 | Android widget: renders correctly on Samsung Galaxy Tab A8 | Status line visible; colors correct; deeplink works | ✅ PASS |
| TC-B-19 | Offline: widget displays cached status with timestamp | "Last updated: Xm ago" shown on widget | ✅ PASS |
| TC-B-20 | Offline: pinned card shows cached status with offline indicator | Cached data shown; "Offline" badge on card | ✅ PASS |
| TC-B-21 | Ramp View toggle: enables Ramp View mode | High-contrast, large-text layout renders | ✅ PASS |
| TC-B-22 | Ramp View: OVERDUE items float to top | OVERDUE items first; DUE_SOON next; COMPLIANT last | ✅ PASS |
| TC-B-23 | Ramp View: outdoor readability (simulated bright display) | Black bg + high-saturation badges readable | ✅ PASS |
| TC-B-24 | Ramp View: no edit capability | Edit controls hidden; all ALS items view-only | ✅ PASS |
| TC-B-25 | Regression: existing ALS board full functionality unchanged | All prior ALS board features work; no regressions | ✅ PASS |
| TC-B-26 | Regression: mobile home screen unchanged for non-pinned users | Home screen shows default layout when no pins configured | ✅ PASS |

**TC result: 26/26 PASS**

**Platform coverage:** iOS 17 (iPhone 14, iPhone 15, iPad Pro 11"), Android 13 (Samsung Galaxy Tab A8, Pixel 6)

---

### §3.5 UAT — Dale Renfrow (RMTS)

**UAT date:** 2026-08-07
**Reviewer:** Dale Renfrow (DOM, Rocky Mountain Turbine Service, KGJT Grand Junction CO)
**Method:** Dale ran the Sprint 1 build in a test environment pre-loaded with RMTS's production data (3 aircraft: N416AB C208B, N208MP C208, N208TZ C208)

**Dale's notes (voicemail transcribed, 2026-08-07, 07:23 MT):**

> "I tested it this morning on the ramp. I pinned all three aircraft. Status line on N416AB shows green — all clear. N208MP shows one DUE_SOON — that's the prop check, I know about it. N208TZ is green.
>
> The widget is on my iPad home screen now. I checked it before I walked out the hangar door. It took me about four seconds, including looking at the weather. That's the product.
>
> Ramp View — I turned it on while standing outside with the sun directly on the screen. I could read every item. That's the whole point. Previously I'd have to go inside or tilt the screen for two minutes.
>
> One note: the 'manage pins' flow is slightly clunky on the iPad — the drag handles are small for a ramp tech with gloves on. Could make those bigger."

**FR-33-03 logged:** Larger drag handles in pin management modal (Chloe queued for Sprint 2 polish).

**Dale UAT sign-off: APPROVED ✅**

---

### §3.6 UAT — Curtis Pallant (Ridgeline Air Maintenance)

**UAT date:** 2026-08-07
**Reviewer:** Curtis Pallant (DOM, Ridgeline Air Maintenance, KRTS Reno-Stead NV)
**Method:** Curtis ran the Sprint 1 build with Ridgeline's test data (5 aircraft: N88KV C208B, N4421T TBM 850, N97WF Malibu, N3316R Bonanza, N5540C T210N)

**Curtis's notes (email, 2026-08-07):**

> "N4421T is showing DUE_SOON on the pin card — correctly. The PTH is in procurement (WO-RDG-003), and the amber status with the WO link is showing on the card. I didn't expect the WO integration to be visible at the pin card level, but it is. That's excellent.
>
> I checked the widget on my phone before the UAT formally started. It shows N4421T as DUE_SOON and N88KV as all clear. That's the correct status for both aircraft right now. The widget data matches the full ALS board.
>
> Ramp View: I used this on N88KV's ALS board. The Fuel Selector Valve item is at zero cycles now (WO-RDG-002 closed, replacement installed). The Ramp View shows it as COMPLIANT, top of the compliant list, next due 12,000 cycles. That's correct. The display is clean and legible outdoors.
>
> My overall assessment: this is the feature Dale asked for. It's also the feature I've been asking for without knowing it had a name."

**Curtis UAT sign-off: APPROVED ✅**

---

### §3.7 F-1.5-B Compliance Sign-Off

**Marcus Webb:**
*F-1.5-B Mobile Ramp-View Quick ALS Card — compliance review COMPLETE.*

*The feature is display-only: it does not affect ALS tracking data, maintenance records, or compliance records. The ALS status line is a computed aggregation of the underlying ALS board — it does not change the data, it summarizes it.*

*Ramp View mode is view-only — correct architecture. Editing ALS data from the ramp would create risk of incorrect field input in an outdoor environment. The view-only constraint is the right call.*

*The OVERDUE/DUE_SOON priority hierarchy is correct: OVERDUE is a more urgent compliance state than DUE_SOON, and OVERDUE takes display priority. This ensures a mechanic checking the pin card does not see an amber DUE_SOON card and miss a red OVERDUE item on the same aircraft.*

*Compliance APPROVED. F-1.5-B is ready for production release.*

**Signed: Marcus Webb, Compliance Architect, 2026-08-08**

---

## §4. Integration and Release Gate (2026-08-11)

### §4.1 Integration Testing

**Integration scope:**
- F-1.5-A + F-1.5-B both active in Sprint 1 integration build
- Both features tested for cross-feature interference (no shared data paths — no conflicts expected or found)
- Regression suite: v1.4.0 full regression suite executed against Sprint 1 build. 148/148 prior TCs PASS. Zero regressions.

**Combined Sprint 1 TC count:**
- F-1.5-A: 24 TCs
- F-1.5-B: 26 TCs
- Regression (v1.4.0 baseline): 148 TCs
- **Total: 198 TCs — 198/198 PASS**

---

### §4.2 Jonas Release Gate

**Jonas Harker (infrastructure/release, 2026-08-11):**

*Sprint 1 release gate — v1.5.0-sprint1:*

*Deployment checklist:*
- Schema migration (`proceduresManualLocation` field): migration ran clean on staging, zero rollback triggers
- `userPrefs` schema extension (`pinnedAircraft`): backward-compatible addition; no migration required for existing users
- `aircraftAlsStatus` computed query: new endpoint; no breaking changes to existing queries
- iOS widget: WidgetKit extension added to app bundle; requires app store update (TestFlight build pushed for UAT)
- Android widget: AppWidget registered in manifest; requires play store update (internal track pushed for UAT)
- Server-side cache: Redis TTL key pattern `als:status:{aircraftId}` introduced; TTL 15 minutes; existing keys unaffected
- New Convex functions: `generateFsdoExport_v2` (extends v1.3 function; v1.3 function deprecated with 30-day sunset window; existing shops automatically migrated to v2 on first export generation)

*Load test: simulated 15 concurrent export generations at peak — PDF generation queue handled without timeout. Response time P95: 7.8 seconds. Acceptable.*

*Production deployment: 2026-08-11, 22:00 MT (maintenance window). Zero-downtime rolling deploy. All 8 shops (including HPAC newly onboarded) on v1.5.0-sprint1.*

*Release gate: ✅ GO. Signed: Jonas Harker, 2026-08-11*

---

### §4.3 Cilla Final Sign-Off

**Cilla Oduya:**
*v1.5 Sprint 1 — F-1.5-A + F-1.5-B — QA sign-off.*

*F-1.5-A: 24/24 TCs PASS. Frank Nguyen UAT APPROVED. Marcus compliance APPROVED. Zero regressions on existing FSDO export functionality.*

*F-1.5-B: 26/26 TCs PASS. Dale Renfrow UAT APPROVED. Curtis Pallant UAT APPROVED. Marcus compliance APPROVED. Platform coverage: iOS 17 (iPhone 14, iPhone 15, iPad Pro 11") + Android 13 (Samsung Galaxy Tab A8, Pixel 6). Zero regressions on existing ALS board and home screen functionality.*

*Combined Sprint 1 regression: 148/148 prior TCs PASS. Zero regressions against v1.4.0 baseline.*

*Total Sprint 1 TCs: 198/198 PASS.*

*v1.5.0-sprint1: APPROVED FOR PRODUCTION RELEASE.*

**Signed: Cilla Oduya, QA Lead, 2026-08-11**

---

## §5. Open Items from Sprint 1

| ID | Description | Origin | Assigned | Sprint |
|---|---|---|---|---|
| FR-33-01 | Procurement Workflow Status Subfields (inquiry status, PO number, expected delivery on procurement-type WOs) | Marcus (OI-33-01 observation) | Devraj | Sprint 2 |
| FR-33-02 | FSDO Export cover page: add maintenance records date range to cover page | Frank Nguyen (UAT feedback) | Devraj / Chloe | Sprint 2 |
| FR-33-03 | Mobile pin management: larger drag handles for ramp/gloved use | Dale Renfrow (UAT feedback) | Chloe | Sprint 2 polish |

---

## §6. Sprint 1 Summary

Sprint 1 shipped two features that solve two different real problems. F-1.5-A solves an audit preparation problem: the DOM hands the FSDO inspector a complete, organized bundle in thirty seconds instead of assembling it at the audit table. F-1.5-B solves a ramp access problem: the DOM checks ALS status in four seconds instead of navigating three levels deep in the app.

Neither feature is technically complex. Both features are genuinely useful to the people they were built for.

That's a description of good sprint design.

---

*WS33-C complete. v1.5 Sprint 1 shipped — F-1.5-A + F-1.5-B. 198/198 TCs PASS. Cilla ✅. Marcus ✅. Jonas ✅. UAT: Frank Nguyen ✅, Dale Renfrow ✅, Curtis Pallant ✅. Deployed to all 8 shops 2026-08-11.*
