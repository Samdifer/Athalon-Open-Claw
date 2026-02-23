# WS22 — Phase 22 Master Plan: v1.2 Sprint + Third Shop Cold Inbound
**Phase:** 22  
**Gate Date:** 2026-02-23  
**Phase Owner:** Nadia Solis  
**Status:** 🟡 ACTIVE

---

## Overview

Phase 22 runs two parallel tracks. Track A executes the locked v1.2 sprint backlog across three sprints. Track B processes the first cold inbound — a shop nobody called, an IA who read Dispatch-19 at a seminar and emailed Nadia directly. Both tracks are active simultaneously. No offline work is in scope for either track (P6 offline deployment deferred by operator directive; offline items remain archived and eligible for a future phase).

---

# TRACK A — v1.2 Sprint Cycle

**Phases:** 3 sprints, sequential  
**Sprint discipline:** No offline work. Each sprint delivers shippable features. Cilla signs off every feature before it ships. Marcus reviews every compliance-surface feature.  
**Sprint dates (target):**
- Sprint 1: 2026-03-16 – 2026-03-29 (~2 weeks)
- Sprint 2: 2026-03-30 – 2026-04-19 (~3 weeks, DOM dashboard is the long pole)
- Sprint 3: 2026-04-20 – 2026-05-10 (~3 weeks, OCR is the technical long pole)

---

## Sprint 1: Photo Attachments + IA Expiry Push Notifications

**Target ship:** 2026-03-29  
**Primary owners:** Devraj Anand (backend + mobile) + Chloe Park (UI) + Jonas Harker (notification infra)  
**Parallel track:** Both features share Sprint 1; notification infrastructure is shared between photos (upload success notification) and IA expiry push alerts.

---

### Feature 1A: Photo Attachments on Maintenance Records

**Owner:** Devraj Anand (lead) + Chloe Park (mobile capture UI)

**Spec Summary:**

Allow certificated personnel to attach photographs directly to maintenance records — work orders, task cards, discrepancy reports, and parts receiving entries. Photos are hash-verified at upload and included in the PDF export package (embedded thumbnails). The attachment is part of the record, not a linked external asset.

*Storage architecture:* S3-compatible object storage (AWS S3 or equivalent), keyed by record UUID + attachment UUID. Convex stores the attachment metadata (filename, upload timestamp, uploader certificate number, SHA-256 content hash, record linkage). The photo is not stored in Convex — only the hash and metadata are. The S3 object URL is presigned with a 1-hour expiry for display; the hash in Convex is the permanent audit anchor.

*Mobile capture:* Native camera capture on iOS and Android. File size limit: 10MB per photo, 20 photos per record. JPEG/PNG/HEIC accepted; converted to JPEG on upload. Offline queueing: if the mechanic is offline when they attach a photo, the photo is queued locally (device storage) and uploaded when connectivity returns. The task card signature can proceed without waiting for photo upload to complete — the signature is not blocked by attachment sync. However, the RTS close sequence (pre-close checklist) will flag any queued-but-not-uploaded attachments before the work order can be closed.

*PDF export integration:* Photo thumbnails (max 3 per page, 400px wide) embedded in the maintenance record PDF at the section where the record appears. Full-resolution photos stored in S3 are accessible via a separate QR code per attachment embedded in the PDF — the QR links to a time-unlimited presigned URL valid for 10 years (configurable per shop retention policy).

*Receiving dock (Teresa Varga use case):* Parts receiving entries have their own attachment flow. An 8130-3 photo attached at receiving is displayed in the parts traceability view alongside the manually-entered conformity data. (The OCR extraction of 8130-3 data is Sprint 3; the photo attachment infrastructure is Sprint 1. Sprint 1 allows Teresa to photograph and attach the 8130-3 even before OCR is available.)

*Hash-verify behavior:* SHA-256 computed client-side before upload (Web Crypto API / React Native crypto). Server verifies on ingest. Hash stored in Convex as immutable field. If hash computed at display time does not match stored hash, the photo is flagged as potentially tampered and a warning is shown. Marcus confirmed: a hash-verified photo attached to a maintenance record is admissible evidence in an FAA inquiry. An unlinked phone photo is not.

**Cilla's Test Plan (Sprint 1 — Feature 1A):**

1. *Happy path — mobile capture to RTS PDF:* Mechanic captures a photo of a corrosion finding on a task card using iPhone 14. Photo uploads. Hash is stored. PDF export includes thumbnail with attached SHA-256 hash label. QR code in PDF resolves to photo. Verify: hash in Convex matches hash computed from S3 object.

2. *Offline queue-then-upload:* Mechanic attaches three photos while offline (Galaxy Tab A8, airplane mode). Returns to connectivity. Verify: all three photos upload; hashes verified; task card closure flag clears; work order pre-close checklist shows no pending attachments.

3. *Tamper detection:* Manually replace the S3 object at a known attachment UUID with a different image (simulated tamper). Navigate to the attachment in the record view. Verify: hash mismatch warning displays; tampered flag is set; attachment is not included in PDF export without explicit DOM acknowledgment.

**Marcus compliance note:** Photo attachments on maintenance records constitute supporting documentation under 14 CFR §43.9 (content of maintenance records). Hash verification at upload and at display makes the record defensible against claims of post-facto modification. This is a compliance upgrade for every discrepancy record, parts receiving entry, and findings-documentation use case. Marcus priority: 3rd in the v1.2 backlog, but the compliance gain is substantial. Sign-off required before feature goes live.

---

### Feature 1B: IA Expiry Push Notifications

**Owner:** Devraj Anand (Convex scheduled functions) + Jonas Harker (push notification infra)

**Spec Summary:**

Proactively push notifications to DOM and shop coordinators when an IA's biennial authorization is approaching expiry. Notification schedule: 90 days out (initial warning), 30 days out (urgent), and day-of (critical). Each notification requires DOM acknowledgment in the system (not just read receipt — explicit "I acknowledge this IA's expiry is approaching" action, logged to audit trail). An unacknowledged 30-day alert escalates: if the DOM has not acknowledged within 72 hours, the system sends a secondary notification and flags the personnel record.

*Technical implementation:* Convex scheduled function (cron-style, runs nightly at 02:00 UTC). Queries all active IA personnel records for shops with active subscriptions. Computes days-until-expiry for each IA authorization date. For each IA in the 90-day and 30-day windows (and day-of), fires the notification via the existing notification infrastructure (push notifications to DOM's registered device + in-app notification center). DOM acknowledgment stored as an immutable audit event in the personnel compliance log.

*Shared infrastructure note:* The notification pipeline built for IA expiry is the same pipeline used for LLP life-limit threshold alerts (Bill Reardon's request from his first-week voice memo — alert when a component crosses 80% life). Sprint 1 builds the notification service. The LLP threshold alert configuration UI is Sprint 2 scope (part of DOM compliance dashboard).

*Push channel:* iOS APNs + Android FCM via a thin notification router service (Jonas's scope). In-app notification center is the fallback — if push fails, the in-app bell icon shows an unread count. Email digest is available as an opt-in supplementary channel (weekly summary, not a primary alert path).

*90-day vs. 30-day logic:* The notification system supports per-shop configuration of threshold days (Carla wants 90 days; some DOMs may want 60). Default: 90/30/0. Configurable in shop admin settings. DOM can suppress a specific alert with a documented reason, but suppression is logged and visible in the compliance dashboard.

**Cilla's Test Plan (Sprint 1 — Feature 1B):**

1. *90-day threshold — new IA expiry entry:* Manually set an IA expiry date to 89 days from today. Run the scheduled function manually (test harness). Verify: 90-day push notification fires to DOM device; notification appears in in-app notification center; acknowledgment prompt appears on DOM next login. Verify: after DOM acknowledges, notification marked acknowledged in personnel compliance log with timestamp.

2. *30-day escalation — unacknowledged:* Set expiry to 29 days. Run scheduled function. Do not acknowledge. Wait (simulate) 72 hours. Run again. Verify: secondary notification fires; personnel record shows escalated flag; acknowledgment prompt persists with escalation badge.

3. *Expiry-day critical alert + IA workflow restriction:* Set expiry to today. Run function. Verify: critical notification fires; IA personnel record shows expired status; system prevents new RTS sign-offs by this IA (hard block, same behavior as existing unqualified-IA check); DOM acknowledgment required to see specific restriction message in the work order flow.

**Marcus compliance note:** Under 14 CFR §65.93, an IA authorization expires 24 calendar months after the date of issue or renewal. An expired IA performing a return-to-service determination is a violation. Proactive notification with DOM acknowledgment audit trail demonstrates active oversight — the kind of documented compliance process a FSDO examiner finds credible. This feature closes the gap between "the dashboard shows the expiry date" and "the DOM can demonstrate they were actively managing IA authorization status." Marcus priority: 2nd in the v1.2 backlog. Sign-off required.

---

## Sprint 2: DOM Personnel Compliance Dashboard + Customer Portal UX Polish

**Target ship:** 2026-04-19  
**Primary owners:** Chloe Park + Devraj Anand (DOM dashboard); Chloe Park + Finn Calloway (portal UX polish)  
**Parallel track:** Both features run simultaneously with different owners. DOM dashboard is the long pole (3 weeks). Portal UX polish runs in parallel and should complete in the first week.

---

### Feature 2A: DOM Personnel Compliance Dashboard

**Owner:** Chloe Park (lead UI) + Devraj Anand (data model + Convex queries)

**Spec Summary:**

A single-screen DOM view of all certificated personnel at the shop — mechanics, IAs, and shop coordinators — showing certificate type (A&P, IA, repairman), certificate number, authorization status, IA biennial expiry date (if applicable), 24-month activity requirement status, and any open qualification alerts. Carla's Excel replacement. "I want to close the last spreadsheet."

*Data model:* New `personnelCompliance` table in Convex. Fields: `shopId`, `userId`, `certificateType` (A&P | IA | repairman | coordinator), `certificateNumber`, `iaAuthExpiry` (nullable), `lastIaActivity24mo` (computed from work order sign-off history), `openAlerts` (array of alert refs). `iaAuthExpiry` is writable by DOM only; `lastIaActivity24mo` is computed automatically from the existing work order audit trail.

*Dashboard view:* Table layout, one row per certificated person. Columns: Name | Role | Certificate | IA Status | Expiry | 24mo Activity | Open Alerts. Color-coded: green (current), amber (within 90 days of expiry or activity gap approaching), red (expired or activity lapsed). Sortable by expiry date. Exportable as PDF (matches the audit-ready format of other Athelon exports).

*Integration with Sprint 1 notifications:* The DOM compliance dashboard is the canonical view of the notification state. An unacknowledged 30-day IA expiry alert shows as a red banner on the dashboard row for that IA. The acknowledgment action is available directly from the dashboard row — the DOM doesn't have to navigate to a separate notification screen to acknowledge. The LLP 80% life threshold alerts from Bill's request are also surfaced in a separate "Component Alerts" tab on the same dashboard.

*24-month activity tracking:* 14 CFR §65.93 requires that an IA perform or supervise at least one major inspection, major repair, or return-to-service determination in each 24-calendar-month period to keep the authorization current. Athelon computes this from the existing RTS audit trail — if a user with an IA authorization has signed an RTS in the trailing 24 months, the field shows ✅. If not, it shows a warning. This is a read-only computed field; the DOM cannot override it, but they can add a note (e.g., "Activity performed at another shop — see attached documentation").

**Cilla's Test Plan (Sprint 2 — Feature 2A):**

1. *Full shop roster load:* Create a test shop with 6 personnel (3 A&P/IA, 2 A&P, 1 coordinator). Load the DOM compliance dashboard. Verify: all 6 rows present; certificate types correct; IA expiry dates displayed; 24-month activity status computed correctly from existing RTS audit trail. Sort by expiry date — verify sort order.

2. *Amber-to-red expiry transition:* Set one IA's expiry date to 31 days out (amber). Verify: row shows amber status; 30-day notification badge shows if active. Advance simulated date to 29 days out (crosses 30-day alert threshold). Verify: row transitions to red; unacknowledged alert banner appears; DOM acknowledgment action available inline.

3. *PDF export audit pack:* Export the DOM compliance dashboard as PDF. Verify: all rows present; export timestamp and DOM name included in header; open alerts listed in a separate section; PDF is hash-verified on generation (same mechanism as maintenance record PDFs). Verify: an FAA auditor reading the PDF could confirm the DOM was actively tracking personnel compliance at the export date.

**Marcus compliance note:** DOM oversight documentation is a primary inspection item under Part 145 (14 CFR §145.155 — Personnel). A DOM who can produce a timestamped, hash-verified personnel compliance report from the same system that generated their work orders is in a materially stronger audit posture than one who produces an Excel file. Marcus priority: 1st in the v1.2 backlog by compliance ranking. This was the Nadia/Marcus tension point; the hybrid resolution puts it in Sprint 2, not Sprint 3. Marcus sign-off required.

---

### Feature 2B: Customer Portal Discrepancy Authorization UX Polish

**Owner:** Chloe Park + Finn Calloway

**Spec Summary:**

The discrepancy customer authorization flow is live and functional. Danny Osei's sticky-note replacement works. The problem: the email customers receive when they're asked to authorize a discrepancy repair is generic. Two of Carla's aircraft owners called asking what the email means. "It reads like a system email." This is a one-week polish job with measurable daily impact.

*Email template redesign:* The customer notification email is redesigned to include: (1) the aircraft N-number in the subject line, (2) a plain-language summary of the discrepancy in the first paragraph ("During your annual inspection, we found [description]. This is what it means: [plain language]."), (3) a clear yes/no authorization decision with a brief explanation of what each choice means, (4) the shop's name, address, and direct phone number prominently displayed, (5) a "Questions? Call us" link that pre-populates the shop phone number. The generic "A maintenance decision requires your authorization" subject line is replaced with "[Shop Name]: Action required for N-XXXXX — [discrepancy type]".

*Confirmation flow clarity:* After the customer clicks "Authorize" or "Decline," the confirmation screen currently shows a generic "Your response has been recorded." New behavior: confirmation screen shows the specific decision ("You authorized the repair of [discrepancy] on N-XXXXX"), the timestamp, and a confirmation email is sent to the customer with the same information. This creates a paper trail on the customer side.

*Danny's specific request:* "Customers are confused about what they're being asked to approve." The fix is clarity, not additional features. The authorization workflow does not change — only the communication wrapper around it.

**Cilla's Test Plan (Sprint 2 — Feature 2B):**

1. *Email render test — standard discrepancy:* Create a discrepancy record with a typical finding (e.g., "Nose gear shimmy damper worn beyond service limits"). Trigger customer notification email. Verify: N-number in subject; plain-language description present; shop name and phone prominently displayed; authorize/decline buttons clearly labeled; email renders correctly on iOS Mail, Gmail, and Outlook (desktop and mobile).

2. *Authorization flow — customer side:* As customer, click "Authorize." Verify: confirmation screen shows specific decision text (not generic "response recorded"); timestamp present; confirmation email sent to customer with decision summary. Verify: in the Athelon work order view, authorization status updates in real time and DOM sees the customer's name and timestamp in the authorization record.

3. *Decline flow — shop side:* As customer, click "Decline." Verify: work order flags the discrepancy as declined-by-owner; pre-close checklist blocks RTS until the declined discrepancy is resolved (deferred with DOM acknowledgment or escalated to customer for re-authorization); shop receives in-app alert of customer decline.

**Marcus compliance note:** Customer authorization documentation for discrepancy repairs is a compliance-relevant record under Part 145 quality control requirements. The underlying feature already meets the regulatory requirement — the customer's authorization decision is recorded and timestamped. This polish work improves the probability that customers actually understand what they're authorizing, which reduces the risk of a later claim that the authorization was obtained without adequate disclosure. Marcus priority: 5th by compliance ranking; the polish is not a compliance requirement but reduces liability exposure. Review before ship.

---

## Sprint 3: 8130-3 OCR for Parts Receiving

**Target ship:** 2026-05-10  
**Primary owner:** Devraj Anand  
**SME:** Teresa Varga (parts manager, Hickory NC)

---

### Feature 3A: 8130-3 OCR for Parts Receiving

**Owner:** Devraj Anand (lead — OCR pipeline, receiving workflow integration)

**Spec Summary:**

When Teresa receives a part at the receiving dock, she photographs the FAA Form 8130-3 Authorized Release Certificate (or equivalent conformity document) and attaches it to the receiving entry. Currently, she also manually re-types all the data from the form. Sprint 3 adds OCR extraction: after she attaches the photo (Sprint 1 capability), the system reads the form and pre-populates the receiving entry fields. She reviews and confirms; she does not type.

*OCR pipeline:* Cloud-based ML inference (AWS Textract or equivalent, with custom post-processing for 8130-3 form layouts). The OCR service receives the uploaded image, runs field extraction, and returns structured JSON: part number, serial number, part description, quantity, condition code, release authorization number, authorizing person/organization name, and date. Athelon stores both the raw OCR output (for audit) and the user-confirmed values (for records). If the user modifies a pre-populated field, both the OCR suggestion and the user's correction are stored with timestamps — creating a correction audit trail.

*Form variant handling:* Teresa has 8130-3 forms going back fifteen years — different FAA revision dates, different layouts, some handwritten fields. The OCR model must handle: (1) printed text on typed forms, (2) handwritten entries in standardized fields, (3) older form layouts (pre-2011 revision) with different field positions. Training data: Devraj will work with Teresa to collect a sample of real forms from her receiving dock across format variants. Minimum 50 samples before production deployment. OCR confidence score displayed per field: high-confidence fields pre-populated with green indicator; low-confidence fields flagged amber and require user confirmation before saving.

*Tolerance handling:* A field with OCR confidence below 70% is not pre-populated — it presents as blank with a "OCR could not read this field" note. The user must type it manually. This is the conservative behavior: the system never silently accepts a low-confidence OCR read on a traceability-critical field (part number, serial number).

*Receiving dock integration:* The OCR extraction is initiated from the existing parts receiving entry flow (photo attach → OCR runs in background → fields populate as confidence permits → user reviews → save). No change to the receiving workflow structure; OCR is additive. If OCR fails entirely (network error, unreadable image, unknown form format), the receiving entry falls back to full manual entry — no degraded mode, no partial population from a failed OCR run.

*Non-8130-3 documents:* The first version covers 8130-3 only. EASA Form 1 and other international release documents are deferred to a future sprint. Teresa's shop is domestic.

**Cilla's Test Plan (Sprint 3 — Feature 3A):**

1. *High-confidence happy path:* Upload a clean, printed 8130-3 (current form revision, all fields typed). Verify: OCR extracts all required fields with ≥90% confidence; fields pre-populate correctly; all green indicators. User confirms without modification. Verify: stored record matches OCR output; raw OCR JSON stored in audit log alongside confirmed values.

2. *Low-confidence field handling:* Upload a form with one handwritten field (serial number, handwritten). Verify: serial number field shows amber indicator and "OCR could not read with confidence" message; field is blank, not pre-populated; user types serial number manually. Other high-confidence fields pre-populate normally. Verify: correction audit trail shows which fields were user-entered vs. OCR-populated.

3. *OCR failure fallback:* Upload an unreadable image (intentionally blurry). Verify: OCR service returns failure response; receiving entry presents as full manual entry; no fields pre-populated; no partial population attempted; user can complete entry manually without error. Verify: failure event is logged (for monitoring, not for user alarm).

**Marcus compliance note:** 8130-3 data integrity is directly linked to parts traceability under 14 CFR §145.221 (Maintenance record requirements). Manual re-entry of conformity document data introduces transcription error risk on traceability-critical fields. OCR with human confirmation reduces this risk. The correction audit trail (OCR suggestion + user value + timestamp) is a stronger traceability record than a manually-typed entry with no provenance. The conservative low-confidence behavior (blank field, not pre-populated) is the correct compliance posture — a blank that the user fills in is better than a wrong value the user accepts. Marcus priority: 4th by compliance ranking. Sign-off required before production deployment.

---

# TRACK B — Third Shop Cold Inbound: Priya Sharma

---

## Background: How This Happened

Nobody called Priya Sharma.

At a regional IA renewal seminar in Phoenix — a two-day FAA Wings credit event, forty or so IAs from Arizona, New Mexico, and southern Utah — Miles Beaumont's Dispatch-19 ("The First Work Order") was circulated by one of the presenters. A printout, not a link. Someone had found it and thought it was worth reading.

Priya Sharma read it in the lunch break. She runs maintenance records for a small charter operator — High Desert Charter Services, Scottsdale AZ, four aircraft (two Cessna 172s, a Piper Seminole, and a Cessna 182RG), three pilots who are also certificated mechanics (A&P, one of them IA), operating under both Part 135 (charter) and Part 91 (owner-flown). She is the IA. She is also, effectively, the records department.

She finished the dispatch and went back to the seminar. That night, she emailed Nadia directly. She didn't email the Athelon general inbox. She found Nadia's name in the dispatch and located her through LinkedIn.

Subject line: "I read the dispatch. Can we talk?"

---

## Priya's Background and Pain Point

**Who she is:** Priya Sharma, IA (biennial current through November 2027), A&P (airframe + powerplant). Twelve years in GA, the last six managing maintenance records for High Desert Charter Services. She is simultaneously the shop's IA, its DOM-equivalent, and its records keeper. She has no staff. Her "compliance infrastructure" is a folder of printed forms, a shared Google Drive, and — for Part 135 discrepancy notifications — her personal text message thread with the chief pilot.

**The specific pain point:** Under 14 CFR Part 135, when a discrepancy is found on an aircraft during a maintenance inspection, the certificate holder (the charter operator) must be notified. The notification is an operational requirement — the charter operator needs to know because flight scheduling decisions depend on airworthiness status. Priya is meeting this requirement by texting the chief pilot.

"I send a text that says something like 'found a shimmy damper issue on 172, can't release, need auth.' He texts back 'ok.' That's my notification record. That's what I'd show an FAA inspector."

She paused on the call with Nadia.

"I know that's not good. That's why I emailed you."

The text message thread is not a maintenance record. It is not timestamped in the regulatory sense (no certificate number, no record linkage, no audit trail). If the FSDO showed up tomorrow and asked Priya to produce her discrepancy notification records for the last six months, she would show them a text message thread. That is her current compliance posture.

---

## What's Different: Part 135 Charter vs. Part 145 Repair Station

**Part 145 repair station (Skyline, High Desert MRO):** The shop holds the repair station certificate. The DOM oversees maintenance. Customer authorization for discrepancy repairs is a customer service and liability matter — important, but not a primary regulatory requirement. The RTS is signed by the IA; the record is the IA's record; the regulatory obligation runs to the FAA, not to an operator.

**Part 135 charter operator (Priya's shop):** The charter operator holds the operating certificate. The operator is responsible for the airworthiness of every aircraft in revenue service. When a discrepancy is found, the *operator* (not just the mechanic or IA) must be notified because the operator bears the legal responsibility for the decision to ground or fly the aircraft. The notification is not a customer courtesy — it is a Part 135 regulatory requirement. The operator's acknowledgment of the discrepancy is part of the record.

**Additional complexity — pilot-as-mechanic:** Three of the four people at High Desert Charter Services are pilots who are also certificated mechanics. This creates a layered certification context: the same person who is asking "when will the aircraft be ready to fly?" is also qualified to inspect it and potentially sign it off. The regulatory question of who has independence — the pilot-mechanic who wants to fly tomorrow, or the IA (Priya) who controls the RTS — is a genuine structural tension. Part 135 handles this through the separation of certificate-holder responsibility, but the practical management is complex.

**Owner notification requirements differ:** Under Part 91 (private operation), owner notification of maintenance findings is good practice and often contractually required by repair stations, but is not a standalone regulatory mandate with prescribed notification content. Under Part 135, the certificate holder notification requirement has specific content implications — the notification must be adequate for the certificate holder to make an informed go/no-go decision. A text message saying "shimmy damper issue" does not meet that standard.

---

## Marcus Webb's Assessment: Athelon v1.1 Coverage of Part 135

**Q: Does Athelon v1.1 cover Part 135 operations?**

Marcus's answer: *Partially, by accident.*

The work order engine, task card structure, RTS sign-off logic, and IA re-authentication workflow are all Part 145-designed but Part 91-compatible. A Part 91 aircraft owner who brings their plane to a Part 145 repair station is in Athelon's current design space. Most of Priya's work — routine 100-hour inspections, annual inspections, owner-operator maintenance on the three Part 91 aircraft in her fleet — looks like Part 91 work and would run cleanly in Athelon v1.1.

**What's missing for Part 135:**

1. **Operator notification workflow.** Part 135 requires that the certificate holder be notified of discrepancies in a documented, traceable way. Athelon's customer portal (discrepancy authorization flow) is designed for repair station customers — it's a customer service tool, not a regulatory compliance tool for Part 135 operator notification. The content requirements, the acknowledgment structure, and the record-keeping obligations are different enough that the existing flow should not be repurposed for Part 135 without deliberate redesign. Using the current customer portal for Part 135 operator notifications would technically work but would produce records that don't clearly satisfy the Part 135 notification requirement.

2. **Pilot-mechanic conflict management.** When the same person holds a pilot certificate and a mechanic certificate, Athelon's current qualification check (is this person certificated for this task?) doesn't distinguish between their roles. The independence check — is the person signing off the work appropriately independent from the operational decision to fly the aircraft? — is a Part 135 design question that Athelon v1.1 doesn't address.

3. **Certificate holder acknowledgment record.** Under Part 135, the certificate holder's acknowledgment of a maintenance finding needs to be a record — not just a communication event. The current discrepancy authorization flow produces a customer authorization record, but it's designed around owner convenience (authorize/decline via email), not Part 135 certificate-holder duty documentation.

**Is this a v1.2 item or a v2.0 item?**

Marcus's assessment: *v1.2 partial, v2.0 full.*

The Part 135 operator notification workflow is a meaningful redesign of the discrepancy authorization flow, not a configuration option. It requires: (1) a new record type (certificate holder notification, distinct from customer authorization), (2) content templates that satisfy the regulatory content standard, (3) acknowledgment record structure appropriate for Part 135 documentation, and (4) pilot-mechanic role separation logic. That is a sprint-sized project on its own, with regulatory review by Marcus before any production deployment.

For v1.2, the operator notification redesign *could* be scoped — it's not technically infeasible — but it would compete with the five already-locked features. Marcus's recommendation: defer the Part 135 notification workflow to v1.2 if it can be slotted as a sixth sprint item, or to v2.0 if the existing five features fill the sprint capacity. The decision is Nadia's.

---

## Nadia's Decision: Onboard Priya on Limited Scope

After the intake call with Priya (2026-02-23), Nadia made the following decision:

**Priya is onboarded on a limited basis, effective immediately, with explicit scope boundaries.**

**In scope — Part 91 work only:**
- All four aircraft may be onboarded into Athelon.
- Work orders for Part 91 operations (owner-flown, non-revenue flights) may be created, executed, and closed in Athelon.
- Annual inspections, 100-hour inspections, and other Part 91 maintenance tasks run through the standard work order and task card flow.
- Photo attachments (Sprint 1, releasing 2026-03-29) will be available to Priya's account when they ship.
- IA expiry notifications will cover Priya's own IA authorization (she is the only IA).
- LLP tracking via the dashboard is available for all four aircraft.

**Out of scope — Part 135 discrepancy notification:**
- Priya may not use Athelon's discrepancy authorization flow as the record for Part 135 operator notifications. This is not because the feature doesn't work technically — it's because the current feature does not produce a record that clearly satisfies the Part 135 notification requirement.
- For Part 135 discrepancy notifications, Priya continues her existing process (acknowledged: this process is bad) pending the Part 135 notification workflow feature.
- The Part 135 notification workflow is explicitly deferred to v1.2 Sprint 4 (if sprint capacity permits) or v2.0.
- Priya will be flagged as a v1.2 Part 135 design partner when that feature is specified.

**Why limited onboarding rather than waiting:**

Nadia's reasoning, as told to Priya on the call:

"Most of what you do is Part 91. Four aircraft, routine maintenance, annual inspections, 100-hour cycles. That work will run in Athelon today, and it will be better than your Google Drive folder. The Part 135 notification piece — that's a real gap, and I'm not going to pretend it isn't. We don't have the right record type built yet. But I don't want you to wait six months for us to build one feature when there are ten other things you can do right now. So here's what we do: you get on the platform for the Part 91 work. We draw a clear line around the Part 135 notification workflow. You keep doing that piece the way you're doing it — with the explicit understanding that we're building you a better solution. Deal?"

---

## Priya's Acceptance

Priya's response, same call:

"I understand the limitation. I've been living with text messages for six years. I'm not asking you to solve the Part 135 problem tomorrow. I just want to get off Google Drive for the rest of it. That alone is worth it."

Then: "One question. When you build the Part 135 notification piece — will I be in the room for that? Because I know what the text message version looks like and I can tell you exactly what's wrong with it."

Nadia: "You'll be in the room."

**Scope boundary document (filed 2026-02-23):**

| Function | Status in Priya's Account |
|---|---|
| Work order creation and execution (Part 91) | ✅ IN SCOPE |
| Task card sign-off and IA re-auth | ✅ IN SCOPE |
| LLP dashboard (all 4 aircraft) | ✅ IN SCOPE |
| Photo attachments (Sprint 1 ship) | ✅ IN SCOPE when available |
| IA expiry notifications (Sprint 1 ship) | ✅ IN SCOPE when available |
| Discrepancy authorization — Part 91 customer notification | ✅ IN SCOPE (owner is also Part 91 customer) |
| Part 135 operator discrepancy notification record | ❌ DEFERRED — not available in v1.1 or v1.2 (Sprint 1–3) |
| Pilot-mechanic role separation logic | ❌ DEFERRED — v2.0 |

**Priya's onboarding date:** 2026-03-09 (two weeks after the intake call; Nadia will run the onboarding personally; Rosa Eaton will conduct the Day 1 LLP baseline audit — same protocol as High Desert, same discipline, same non-negotiable).

---

## Marcus's Part 135 Design Note (Filed for v1.2 Sprint 4 / v2.0 Backlog)

> "The Part 135 operator notification requirement is the first compliance surface in Athelon that cannot be addressed by configuration of an existing feature. The customer authorization flow produces a valid record for a Part 91/Part 145 context. It does not produce a valid record for a Part 135 context. The design work needed: a new record type with explicit Part 135 labeling, content fields that map to the regulatory notification content standard, certificate-holder acknowledgment structure (not customer convenience authorization), and pilot-mechanic independence check. I estimate this as a 3-week sprint with mandatory regulatory review before production deployment. It is the right thing to build. It is not a v1.2 sprint item given the existing five features already locked. It should be sprint-zero of v2.0 or an explicit sixth sprint in v1.2 if bandwidth exists. Priya Sharma should be the design partner for this feature. She knows exactly what the wrong version looks like."

---

## Phase 22 Summary

| Track | Feature / Item | Owner | Sprint / Timeline | Status |
|---|---|---|---|---|
| A | Photo attachments on maintenance records | Devraj + Chloe | Sprint 1 (by 2026-03-29) | 🟡 IN PROGRESS |
| A | IA expiry push notifications | Devraj + Jonas | Sprint 1 (by 2026-03-29) | 🟡 IN PROGRESS |
| A | DOM personnel compliance dashboard | Chloe + Devraj | Sprint 2 (by 2026-04-19) | ⬜ NOT STARTED |
| A | Customer portal UX polish (Danny Osei flow) | Chloe + Finn | Sprint 2 (by 2026-04-19) | ⬜ NOT STARTED |
| A | 8130-3 OCR for parts receiving | Devraj | Sprint 3 (by 2026-05-10) | ⬜ NOT STARTED |
| B | Priya Sharma intake + scope boundary | Nadia | Complete 2026-02-23 | ✅ DONE |
| B | Priya Sharma onboarding (Part 91 scope) | Nadia + Rosa | 2026-03-09 | ⬜ SCHEDULED |
| B | Part 135 notification workflow design | Marcus + Priya (design partner) | v1.2 Sprint 4 or v2.0 | ⬜ BACKLOGGED |

**Note:** P6 offline deployment is DEFERRED by operator directive. No offline work appears in any Phase 22 sprint. The offline device matrix artifacts (OFX-001/002/003) are archived and complete. Offline conflict visualization and sync failure retry UI (from Tanya's matrix backlog) are held for the phase in which P6 deferral is lifted.

---

*Plan filed: 2026-02-23T00:56:00Z*  
*Phase 22 authorized by Phase 21 Gate Review Board*
