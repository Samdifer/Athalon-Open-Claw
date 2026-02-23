# Athelon v1.2 — Release Summary
**Released:** 2026-03-09  
**Version:** 1.2.0  
**Shops live:** 3 (Skyline Aviation Services, High Desert MRO, High Desert Charter Services)  
**Sprint cycle:** 3 sprints over 6 weeks  
**Status: ✅ SHIPPED**

---

## What Shipped

v1.2 is three sprints of work commissioned entirely by the people using the product. Seven features. Six people who asked for them by name.

### Sprint 1 — Shipped 2026-02-22

**Feature 1: Photo Attachments on Maintenance Records**  
*Asked for by:* Teresa Varga (Parts Receiving, Skyline)  
Photos attached directly to task cards, discrepancy records, and work orders. Hash-verified at upload. Included in PDF export. Each attachment carries the IA's certificate number and a timestamp. The written description used to be the only evidence. Now the photo is part of the record.

**Feature 2: IA Expiry Push Notifications**  
*Asked for by:* Renata Vasquez (via DOM dashboard design) — surfaced during Phase 22 planning as the missing alert layer on the qualification grid  
Push notifications at 60, 30, 14, 7, and 1 day before IA certificate expiry. Sent to the IA and to the DOM. No more Monday morning surprises in the compliance grid. The alert arrives before the gap.

### Sprint 2 — Shipped 2026-03-01

**Feature 3: DOM Personnel Compliance Dashboard**  
*Asked for by:* Renata Vasquez (DOM, Wichita) and Carla Ostrowski (DOM, Skyline Columbus)  
Real-time compliance grid across all certificated personnel: IA expiry, medical status, training currency. Monday morning audit in one view. Carla used to build this in a spreadsheet every Sunday night. She closed the spreadsheet.

**Feature 4: Customer Portal UX Polish**  
*Asked for by:* Danny Osei (WO Coordinator, Manassas) — three specific friction points reported post-v1.1 launch  
Status language clarified. Estimate display redesigned. Message thread simplified. The portal is now what Danny said it should be: a window, not a maze.

### Sprint 3 — Shipped 2026-03-09

**Feature 5: 8130-3 OCR for Parts Receiving**  
*Asked for by:* Teresa Varga (Parts Receiving, Skyline)  
Photograph the 8130-3 tag. The system extracts part number, serial number, description, quantity, condition, date, issuing authority, and Block 17 approval reference — with confidence scores. Fields below 0.85 confidence are flagged for manual review. Block 17 below 0.85 blocks receiving until manually confirmed. Tech reviews, edits if needed, confirms. OCR is an assist, not an override.

**Feature 6: Pilot Notification Log (§135.65)**  
*Asked for by:* Priya Sharma (IA/DOM, High Desert Charter Services, Scottsdale)  
For Part 135 work orders, a pilot notification record is required before RTS can be authorized. The log captures pilot name, cert number, notification method, timestamp, maintenance description, and acknowledgment. It's immutable, attributed to the notifying IA, and linked to the work order. For six years, Priya was doing this in a notebook and a text message thread. Now it's in the record.

---

## Who It Was Built For

| Feature | Built for | What it replaced |
|---|---|---|
| Photo Attachments | Teresa Varga's receiving dock | Written description of visible damage |
| IA Expiry Alerts | Renata's Monday audit | Monday morning spreadsheet check |
| DOM Dashboard | Carla's wall calendar | Sunday night spreadsheet build |
| Portal Polish | Danny's email chase | Status calls and inbox archaeology |
| OCR Receiving | Teresa's transcription time | Typing the tag by hand |
| Pilot Notification Log | Priya's text thread with pilots | Paper note cards, text messages |

v1.2 was not designed from the inside out. It was specified from the outside in. Every feature traces to a named person's named problem.

---

## What v1.2 Doesn't Do Yet

### Part 135 Full Compliance

The pilot notification log satisfies the §135.65 recording requirement. It does not satisfy every Part 135 compliance obligation:

- **Pilot access to records (§135.65(b)):** Pilots cannot yet log in to Athelon to view maintenance records before flight. A read-only pilot portal is needed. v2.0 scope.
- **MEL integration (§135.179):** Deferral decisions and MEL item tracking for certificate holders with approved MELs. v2.0 scope.
- **Certificate holder record separation:** As Part 135 shops grow, cleaner separation between the certificate holder's maintenance records and individual IA attribution will be needed. v1.3 scope.

### v2.0 Scope (Not This Cycle)

- Pilot portal (read-only access to WO records for Part 135 operators)
- MEL item tracking and deferral management
- Multi-IA certificate holder record architecture
- Offline sync for multi-day remote operations (P6 — deferred by operator directive, scope remains pending)
- ASAP / safety reporting integration (large Part 135 operators)

---

## Nadia's Release Note to All Three Shops

*Sent 2026-03-09*

---

**Subject: Athelon v1.2 is live**

Hi all —

v1.2 is deployed to all three shops as of today. Here's what changed:

**For Teresa at Skyline:** Photo attachments now include OCR on 8130-3 tags. Photograph the tag, review the extracted values, confirm. The system reads Block 17 with extra scrutiny — if it can't read the approval reference confidently, it makes you type it. That's intentional.

**For Carla and Renata:** The DOM dashboard is live. Personnel compliance grid, expiry alerts, drill-down to individual records. The thing you built in a spreadsheet is now a page in Athelon. You don't need the spreadsheet anymore.

**For Danny and his customers:** The portal language is cleaner, the estimate display is simpler, the message thread is easier to follow. Three specific things Danny flagged — all three fixed.

**For Priya:** The pilot notification log is live for your Part 135 work orders. It shows up in the close flow. It blocks RTS until you've recorded the notification. Your first Part 135 work order is already logged — WO-HDS-004, N3347K.

A few things v1.2 does not do yet: full pilot access to maintenance records, MEL tracking, and a handful of other Part 135 items Marcus and I have mapped out. We'll tell you when those are ready. We're not going to ship something that looks like a solution but isn't.

As always — if something doesn't work the way you expect, tell me directly.

Nadia

---

## Three Shops: Current Status

### Skyline Aviation Services — Columbus, OH
**DOM:** Carla Ostrowski  
**Status:** v1.2 deployed ✅  

Carla closed the last spreadsheet on 2026-03-02, three days after the DOM dashboard went live. She ran the Monday morning audit entirely in Athelon for the first time on 2026-03-09. She called Nadia afterward: "I didn't build anything last night. First Sunday in four years."

Teresa is running OCR on every 8130-3 tag that comes through the receiving dock. She's already logged three tags without a single manual transcription error in the part number field — the thing she flagged most often before OCR.

### High Desert MRO — Prescott, AZ
**DOM:** Bill Reardon  
**Status:** v1.2 deployed ✅  

Bill is continuing the LLP record migration he started during onboarding. He's moved 847 of the approximately 1,200 legacy records. The LLP dashboard is his primary interface — he checks it before every work order on the turbine fleet. The Seneca II engine mount discrepancy that Rosa found on Day 1 (4,340 hrs corrected to 4,412 hrs) remains the anchor story for why the baseline audit is non-negotiable.

The DOM dashboard is now the Monday standard at High Desert. Bill's technician Marco Estefan: "There's only one version now. There's been only one version since day one."

### High Desert Charter Services — Scottsdale, AZ
**IA/DOM:** Priya Sharma  
**Status:** v1.2 deployed ✅, first Part 135 WO complete  

Priya's first Part 135 work order through Athelon closed 2026-03-09 — WO-HDS-004, N3347K (PA-44-180 Seminole), oil sump gasket replacement. Pilot notification log complete. RTS authorized. The text message thread with Jack Delgado is no longer the record of notification. The work order is.

She has three more Part 135 WOs queued. Part 91 work is running clean. The paper note cards are in a drawer she no longer opens.

---

*v1.2. Three sprints. Seven features. Three shops. Six names. Done.*
