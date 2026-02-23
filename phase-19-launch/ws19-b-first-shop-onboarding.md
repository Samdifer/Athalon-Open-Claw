# WS19-B — First Shop Onboarding: Skyline Aviation Services

**Status: ✅ ONBOARDING COMPLETE**
**Date:** 2026-02-22 (Sunday, by Carla's request — "the shop's quiet Sundays")
**Session Lead:** Nadia Solis
**Aviation Technical Observer:** Rosa Eaton
**Shop DOM/QCM:** Carla Ostrowski
**Format:** Remote (Google Meet), all participants at shop location in Columbus

---

## 1. Pre-Session: Skyline Aviation Services Team Profile

**Shop:** Skyline Aviation Services, Columbus, OH
**Certificate:** Part 145 HRQR920L — Single-engine piston, limited multi-engine
**Size:** 5 personnel

| Name | Role | Athelon Role | Notes |
|------|------|--------------|-------|
| Carla Ostrowski | DOM / QCM | Admin, DOM_QCM | Has been Athelon technical advisor since Phase 5. Knows the product. Her team doesn't. |
| Dave Kowalczyk | A&P Mechanic | Technician | 14 years GA maintenance. Currently on paper logs. Has expressed skepticism about "new software" in the past. |
| Ellen Farris | IA | IA_INSPECTOR | 22 years. Holds IA since 2011. Uses a yellow legal pad for inspection notes. |
| Marcus Villanueva | A&P Mechanic | Technician | 7 years. Carla's newer mechanic. Generally comfortable with software. |
| Tina Boyle | Parts Coordinator | PARTS_COORD | Has managed parts receiving via a shared spreadsheet for 6 years. |

**Pre-session note from Carla (received the morning of):**
> "Dave and Ellen don't know what this is beyond 'new software Carla wants us to look at.' I told them it was a system demo for possible adoption. That's true. Don't oversell. Ellen especially — she's going to ask hard questions. Let her."

Nadia forwarded this to Rosa before the call started. Rosa printed it and taped it to her monitor.

---

## 2. The Onboarding Session

**Session time:** 10:00–12:40 local (14:00–16:40 UTC)
**Attendees:** Carla, Dave, Ellen, Marcus, Tina (all on-site in the shop break room, single laptop + monitor)

Nadia opens the call with no slides. She shares her screen showing the production app at `app.athelon.aero`.

**Nadia:** "I'm going to show you how a work order lives in this system, start to finish. I'll try to do it in order, the same order you'd actually use it. Stop me whenever."

---

### 2.1 Work Order Creation

Nadia creates a test work order: PA-28-181, N-number TBD, work type 100HR.

The form is short: aircraft registration, work type, scheduled date, assigned A&P. No extraneous fields.

**Dave** (immediately): "Where's the aircraft serial number?"

**Nadia:** "Aircraft records are stored separately — you'd link the aircraft record once, and then all future work orders pull from it. We can walk through that. For now I'm showing you the WO shell."

Dave nods but writes something down. (He's keeping notes on paper. Nadia sees this and says nothing.)

**Ellen:** "Who can create a work order?"

**Nadia:** "Anyone with Technician role or above. The DOM can restrict that per your org settings."

**Ellen:** "Can the mechanic doing the work create their own work order?"

**Nadia:** "Yes. Carla can also require DOM approval before a WO is opened. That's a setting."

Ellen looks at Carla. Carla nods: "We'll set it to open. I trust them."

---

### 2.2 Task Card Assignment

Nadia shows the task card list generated from a 100HR template. Fourteen cards loaded automatically.

**Marcus:** "Does the template come from the manufacturer's maintenance manual?"

**Nadia:** "The templates are built from AMM data. Your DOM configures them for your cert scope. You can add shop-specific steps on top of the base template."

**Marcus:** "Can you add steps mid-inspection if you find something?"

**Nadia:** "Yes — discrepancy cards. We'll get to those."

Tina raises her hand: "Are parts attached per task card, or per work order?"

**Nadia:** "Per task card. You receive the part at the WO level, it goes to `pending_inspection`, and then the mechanic links it to the specific task where it was used. Trail goes both ways — work order to part, part to work order."

Tina: "I like that."

---

### 2.3 Step Sign-Off Flow

Nadia assigns a task card to Dave (using a test account) and walks through the sign-off step by step. Each step has: description, reference (AMM section), any required note field, and the sign-off button.

**Dave:** "What happens if you sign a step and then realize you made a mistake?"

**Nadia:** "You can't delete a sign-off. You'd open a discrepancy card for the step and document the error. The audit trail records both — the original sign-off and the corrective action."

Dave stares at the screen. He says nothing for five seconds.

**Dave:** "Okay. That's actually how it should work."

This moment is the first time the energy in the room shifts.

---

### 2.4 Discrepancy Management

Nadia opens a discrepancy card on a step. Title, finding, classification (airworthy/unairworthy/monitor), parts needed, disposition.

**Ellen** leans in: "What triggers an unairworthy finding?"

**Nadia:** "The mechanic classifies it. If they mark unairworthy, the work order cannot close — RTS is blocked — until the discrepancy is dispositioned. It's a hard stop."

**Ellen:** "And the disposition record — what's in it?"

Nadia walks through the disposition form: finding description, corrective action, parts replaced (linked by part number), reference, sign-off.

**Ellen:** "That's a 43.9 record."

**Nadia:** "It generates one. Do you want to see the PDF output?"

**Ellen:** "Not yet. Keep going."

---

### 2.5 Parts Receiving

Nadia switches to the parts receiving view. Shows Tina's workflow: receive part, enter part number, serial number if applicable, form type (8130-3, DA, conformity cert), condition, and link to work order.

**Tina:** "What if the part comes in with a paper 8130-3? Do I have to re-enter everything?"

**Nadia:** "You enter the key fields and can upload a scan of the physical form. The system stores both."

**Tina:** "And the mechanic — they see it's pending when they pull the task card?"

**Nadia:** "Yes. The task card shows part status. If a required part is still in `pending_inspection`, the system flags it. The mechanic can see it before they get to that step."

**Tina** quietly, to herself: "Six years of emailing the mechanic to ask if the part arrived."

Nadia heard this. She does not say anything.

---

### 2.6 Close Readiness Report

Nadia navigates to the close readiness report for the test work order. A green/red checklist: all task cards complete, all steps signed, all discrepancies dispositioned, all parts linked, AD compliance current.

Everything is red in the demo (it's a partial test WO).

**Dave:** "What happens if one of those is red?"

**Nadia:** "You can't generate the maintenance release. The system won't let you. Each red item is a link to the specific thing that's blocking it."

**Ellen:** "What if I think the thing blocking it is wrong?"

**Nadia:** "You'd need to disposition the discrepancy or the missing step. There's no override. The DOM can add an annotation, but the item has to be closed."

**Ellen:** "Good."

---

### 2.7 The IA Re-Auth Encounter

This is the moment Carla has been quietly waiting for.

Nadia has set up Ellen's test account. She walks Ellen through a scenario: a 100HR inspection is complete, all cards signed off, one step is IA-required — the annual inspection sign-off line. Ellen is logged in. She clicks "Sign Off (IA)."

A modal appears. It does not immediately open a signing screen.

It presents a certification statement:

> *"By completing this authentication, you are certifying under 14 CFR §65.95 that the aircraft described in this work order has been inspected in accordance with the inspection procedures and found to be in an airworthy condition, OR that the discrepancies noted on the maintenance record have been provided to the aircraft owner or lessee. Your Inspection Authorization number is on record with this organization. This signature constitutes a legal certification under federal aviation regulations."*

Then: a Clerk re-authentication challenge. Not just a confirmation click — a full credential re-entry.

**Ellen stops.**

She reads the certification statement. She reads it again.

**Ellen:** "It makes you read this?"

**Nadia:** "It makes you read it every time."

**Ellen:** "And then you have to actually re-sign in? Not just click OK?"

**Nadia:** "Full credentials. Password minimum, or biometric if your device supports it. Clerk enforces it. We can't bypass it."

Ellen says nothing for several seconds. Then:

**Ellen:** "I've been signing inspection releases for twenty-two years. It takes me about four seconds. I write my name on a piece of paper and that's it." A pause. "This is longer than four seconds."

She authenticates. The IA sign-off records. The screen shows her IA number, the timestamp, and the certification statement as it will appear in the maintenance record.

**Ellen:** "But I actually read the statement that time."

Another pause.

**Ellen:** "I probably haven't actually read it in ten years."

The room is quiet.

---

### 2.8 RTS Demonstration

Nadia shows the RTS authorization flow, which requires an IA-authenticated signature on the return to service statement. Ellen doesn't say anything this time. She watches the flow.

**Carla:** "Ellen, you okay?"

**Ellen:** "Yeah. I'm okay. I'm thinking."

---

### 2.9 Carla's Close Readiness Moment

For the final demo, Nadia creates a complete test work order — everything closed, all steps signed, all parts linked, no open discrepancies, AD compliance current. She navigates to the close readiness report.

Every item is green.

There's a green banner at the top: **"This work order is ready to close. All required items are complete."**

Carla sees it.

Her expression doesn't change exactly — she doesn't smile, she doesn't make a sound. But anyone watching her would have seen something shift behind her eyes. She's been fighting her shop's paper-and-spreadsheet workflow for seven years. She's been doing pre-close checks manually, which means cross-referencing four different documents against a physical checklist on her clipboard, then going to find the mechanic to ask about the part they forgot to log. The process takes fifteen minutes on a good day. Sometimes it takes forty.

The green checklist takes eleven seconds to load.

She doesn't say anything yet. She just nods once, slowly, like she's confirming something to herself.

---

## 3. What Rosa Said at the End

At 12:37, Nadia wraps the demo. Rosa has been mostly silent, watching. She's made two notes in her notebook. At 12:38 she speaks:

**Rosa:** "I want to say something to you all. I spent twenty years as a DE and DER. I've sat through a lot of demos of MRO systems. Most of them show you the features and tell you it's going to make your life easier. I want to tell you something different.

"The thing that matters about this system isn't that it saves you time, although it will. It's that it forces the paperwork to match the work. Every step that gets signed is the mechanic saying 'I did this, now.' Every IA re-auth is Ellen saying 'I reviewed this aircraft and I'm willing to put my name and certificate number on it.' Not as a habit. As a decision.

"Paper is fast. Paper lets you shortcut. Paper doesn't remember if you forgot to sign something until six months later when there's a question. This system makes it harder to shortcut. That's not a bug. That's the point.

"I've watched this team build this for two years. I've been the person asking the uncomfortable questions. I'm satisfied with what I've seen. That doesn't mean it's perfect. It means it's ready to be used. You'll find the friction. Tell them. They'll fix it."

She closes her notebook.

**Dave, quietly:** "Okay. I'll try it."

---

## 4. Friction Points Identified During Onboarding

### 4.1 Aircraft Record Pre-Population
**Who flagged it:** Dave
**Issue:** When creating a work order, you have to navigate away to first create/find the aircraft record. Dave expected the WO form to have an inline "add aircraft" field.
**Logged as:** Feature request — WO creation inline aircraft registration, or auto-suggest from org aircraft list.

### 4.2 Bulk Task Card Completion on Pre-Op Steps
**Who flagged it:** Marcus
**Issue:** Some pre-op steps (visual inspection items that are clearly OK) require individual sign-offs. Marcus asked if there was a bulk sign-off for adjacent visual items. Currently no.
**Logged as:** Feature request — batch sign-off for sequential visual steps with single confirmation modal.

### 4.3 8130-3 Upload File Size
**Who flagged it:** Tina
**Issue:** Tina uploads scans as high-res PDFs, sometimes 8–12 MB. Current upload limit is 5 MB. She got an error on the demo when she tried a real file.
**Impact:** Immediate. Tina uses her existing scan workflow.
**Resolution needed:** Before first live work order. Devraj notified. Fix deployed within 2 hours (limit raised to 25 MB, matched against Convex file storage limits).

### 4.4 Discrepancy Auto-Block Clarity
**Who flagged it:** Ellen
**Issue:** When a discrepancy is marked unairworthy, the RTS block is immediate and clear. But when a discrepancy is marked "airworthy / monitor," Ellen expected a visible note in the close readiness report explaining the decision. Currently monitor-classified discrepancies appear as "complete" in the readiness report without context.
**Impact:** Regulatory concern. Ellen is correct — a monitor classification should be visible in the close-out documentation.
**Logged as:** Priority item — readiness report to display monitor-classification discrepancies with their notation in a distinct section. Flagged to Jonas same day.

### 4.5 Mobile View (Not Covered in Demo)
**Who flagged it:** Dave
**Issue:** "Do you have an app? Because I'm not signing things on a laptop in the hangar." Current product is web-only with a responsive design.
**Nadia's note:** Mobile app is in the P5–P6 roadmap. Responsive web is usable on tablet. Dave has an iPad he uses for weather. This is a real gap. Not a deal-breaker for Skyline (Carla confirmed she's comfortable requiring technicians to use the shop tablet for sign-offs) but it's a top-two feature request.

---

## 5. Onboarding Completion Sign-Off

**Carla Ostrowski (DOM):**
> "Team completed full product walkthrough. Ready to proceed to first live work order. I'm satisfied with the system's handling of IA certification, discrepancy management, and audit trail. Friction points logged above are real and I expect they'll be addressed. We're proceeding."

**Nadia Solis:**
> "Onboarding complete. 5/5 team members participated. Friction log filed. P1 feature scope demonstrated in full. File upload limit fix deployed same day. Priority item WS19-B-4.4 (monitor discrepancy readiness visibility) escalated to Jonas — this needs a code fix before full production rollout to additional shops."

**Rosa Eaton:**
> "Aviation technical observer attestation: Onboarding session demonstrated regulatory-compliant workflows for 100HR inspection documentation under 14 CFR Part 43. IA re-auth flow demonstrated correctly. Discrepancy disposition workflow demonstrated correctly. Proceeding with first live work order is appropriate."

---

**STATUS: ✅ ONBOARDING COMPLETE**

---
*WS19-B closed. Nadia Solis + Rosa Eaton + Carla Ostrowski. 2026-02-22T16:45:00Z*
