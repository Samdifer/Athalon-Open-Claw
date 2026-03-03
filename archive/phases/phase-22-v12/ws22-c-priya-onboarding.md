# WS22-C — Priya Sharma Onboarding
**Track:** B — Third Shop Cold Inbound  
**Onboarding Date:** 2026-03-09  
**Onboarding Lead:** Nadia Solis  
**Scope:** Part 91 work only; Part 135 discrepancy notification deferred  
**Status: ✅ ONBOARDING COMPLETE**

---

## Background

Priya Sharma runs maintenance records for High Desert Charter Services, Scottsdale AZ. She is the shop's IA, its DOM-equivalent, and its only records person. She found Miles Beaumont's Dispatch-19 at a regional IA renewal seminar in Phoenix — a printout, not a link — read it over lunch, and emailed Nadia directly that evening. She did not email the Athelon general inbox. She found Nadia's name in the dispatch, located her through LinkedIn, and sent a 47-word email with the subject line: "I read the dispatch. Can we talk?"

The intake call was 2026-02-23. Scope boundary filed same day. Onboarding date set: 2026-03-09, two weeks out. Nadia runs it personally. Rosa Eaton conducts the Day 1 LLP baseline audit — same protocol as High Desert, same non-negotiable discipline.

---

## The Onboarding Call

### Scope Boundaries First

Nadia opened with the limitation. Not after the product demo. Before it.

> "Before I show you anything, I want to tell you what you won't be able to do in Athelon today. Because I think it's the most important thing and I'd rather you hear it upfront than discover it mid-demo."

She laid out the Part 135 discrepancy notification gap — the customer authorization flow was built for Part 145 repair station customers, not for Part 135 certificate-holder operator notification. Different regulatory surface, different record content requirements, different acknowledgment structure. Athelon v1.1 doesn't have the right record type for what Part 135 §135.65 actually requires.

> "For your Part 135 discrepancy notifications, you'll need to continue your existing process for now. I know what that process looks like — you told me. I'm not going to pretend it's good. It's not. But I'm also not going to tell you to use a feature that produces a record that doesn't clearly satisfy the requirement. That would be worse than continuing to text."

Priya listened. She didn't push back.

> "I appreciate that. I've talked to two other aviation software vendors and neither of them told me anything that clearly."

Then: "Okay. Show me the product."

### The Product Walk-Through

Nadia walked Priya through the platform in the following order:

**1. Work order creation and execution**

Priya's four aircraft were pre-loaded into the demo environment before the call: N2841T (C172), N5561R (C172), N3347K (PA-44-180 Seminole), N9142Q (C182RG). She saw them immediately on the aircraft list.

Her first reaction: "Oh, they're already there. I expected to have to type them in."

Nadia, noting this: the ferry information, registration data, and basic airframe specs were auto-populated from FAA registration records at account creation. Priya's role (for each aircraft): IA, DOM-equivalent, and sole certificated records keeper. This is configured in the personnel section.

**2. Task card sign-off and IA re-authentication**

Nadia walked through the re-auth flow on a simulated 100-hour inspection task card. Priya watched the iPad prompt, the re-authentication sequence, the immutable log entry.

> "The re-authentication prompt. Is that every task, or just RTS?"

Nadia: Per-signature on RTS sign-offs and at task card close on safety-critical tasks; configurable by task type for routine maintenance. The baseline is Dale Renfrow's design from WS15-B — deliberate, not trivial.

Priya: "Good. I've had mechanics at contract shops try to batch-sign eight tasks in thirty seconds. I hated that."

**3. LLP dashboard**

Priya looked at the LLP dashboard for the Seminole — the only multi-engine aircraft in her fleet — for about two minutes without speaking. The engine life counts were populated from Rosa's Day 1 baseline audit (conducted earlier that morning, before the onboarding call).

> "This is what I have a notebook for. I have a physical notebook for the Seminole's engine times. I've had that notebook for three years."

She scrolled through the C182RG's propeller and landing gear life counts.

> "The prop governor. I've been tracking that manually. Who else knows this off the top of their head? The mechanic. And if the mechanic isn't me, it's a text thread."

**4. IA expiry notifications (Sprint 1 — available at onboarding date)**

Sprint 1 shipped 2026-03-29 — two weeks after onboarding. At the time of the onboarding call, the feature was in staging. Nadia showed it in the staging environment.

Priya's IA authorization is current through November 2027. She saw her own record in the personnel view: cert number, expiry date, days remaining, notification threshold set to TH-60 (60 days out, 30 days, 7 days).

> "Who gets the notification? Just me?"

Nadia: The IA and the DOM of record. Since Priya is both, she gets it twice — once as IA, once as DOM. She can configure the DOM notification to route to a different email if that's useful.

Priya: "I'll take it twice. I don't have anyone else."

**5. Customer portal and discrepancy authorization (Part 91)**

Nadia showed the redesigned customer authorization email (Sprint 2, which had just shipped). Priya saw the N-number in the subject, the cost range, the consequence statement.

She nodded.

> "For Part 91 work — when the aircraft owner isn't a charter customer but just the aircraft owner doing their own flying — this works. This is exactly what I'd want to send them. The text message version is not this."

Then: "For Part 135, though. You said this doesn't produce the right record."

Nadia confirmed. The portal flow produces a customer authorization record, not a certificate-holder notification record. The regulatory surface is different.

> "Right. So for charter discrepancy finds, I keep the text thread." A pause. "For now."

Nadia: "For now. You'll be in the room when we build it."

---

## First Work Order on Athelon

**Work Order: WO-HD-001 (Priya's account)**  
**Aircraft:** N2841T — 1978 Cessna 172N, c/n 17270001  
**Work type:** Annual inspection — Part 91, owner-flown (non-charter flight)  
**Aircraft owner:** David and Sandra Liang, Scottsdale AZ (owners, not charter customers)  
**Work date:** 2026-03-09

The Liangs' C172 was Priya's first scheduled work after onboarding. It was an annual inspection — not a charter flight, not revenue service. David Liang flies it for personal use. He is a private pilot. He is not affiliated with High Desert Charter Services.

Nadia was on the call observing when Priya created the work order. Rosa Eaton had completed the Day 1 LLP baseline audit that morning.

### What Was the Same as Skyline and High Desert

**The task card structure.** Priya opened the annual inspection task set and scrolled through it. "This is the 43 Appendix D format. Okay." The checklist hierarchy was familiar — the same regulatory structure that every A&P learns and every IA knows cold.

**The sign-off flow.** Task-by-task, IA re-auth at RTS. "Same discipline. Good." She noted that the re-authentication prompt used the same biometric + PIN sequence she'd been walked through in the product demo. No surprises.

**The pre-close checklist.** When she ran through the WO close sequence on the test annual (simulated complete), the pre-close checklist flagged one open discrepancy Nadia had inserted: a left main tire worn to the wear indicators. The hard block appeared. Priya read the message. "That's correct. You can't close the annual with an open safety item." She acknowledged the discrepancy (it was a demo — no actual aircraft).

**PDF export.** She generated the test export. "The FAA Form 337 layout. The signature blocks. This is what the paper looks like." She zoomed in on the SHA-256 footer. "I didn't know to ask for that, but it's the right thing to have."

### What Was Different: Single IA, No Separate DOM, Priya Is All Three

This is where the product had to flex, and did.

**Single IA signing everything.** At Skyline, Carla (DOM) oversees multiple IAs. At High Desert, Bill (DOM) has a crew. At Priya's shop, Priya is the IA, the DOM, and the only certificated records person. There is no second pair of eyes from the shop side. The accountability model in Athelon is designed for shops with distinct DOM and IA roles — Priya occupies both.

In the personnel setup, her account reflects this: she is assigned both DOM and IA roles for High Desert Charter Services. Every IA expiry notification goes to her in both capacities. Every DOM acknowledgment action falls to her. This is structurally unusual — the system is built with oversight separation in mind — but it is a real regulatory configuration. A sole-proprietor IA running their own aircraft with their own certificate is Part 65-compliant as long as the work is documented correctly.

Nadia, walking through the dual-role configuration: "The oversight features — IA expiry alerts, DOM acknowledgment of compliance events — you'll be acknowledging your own alerts. That's a little strange to look at. But the record is what matters. The acknowledgment is timestamped, logged, immutable. If the FSDO asks how you track your own IA expiry: here. This."

Priya: "That's actually better than what I have now. What I have now is 'I know my cert expires in November.'"

**No separate DOM workflow.** When the annual inspection's pre-close checklist ran, it required DOM acknowledgment of the open discrepancy. Priya was the DOM. She acknowledged it as DOM. Then she closed the work order as IA. Two separate actions, same person. The audit trail reflects both roles and both timestamps.

> "It's a little strange to click 'acknowledge as DOM' and then 'sign as IA' with the same hand. But I understand why it's two clicks. The record needs to show both."

**Photo attachments (Sprint 1 — available).** Sprint 1 had shipped by the time of the first actual work order (2026-03-29 ship date; Priya's first real annual would begin scheduling in late March). In the demo work order on the onboarding call, Nadia showed the photo attachment flow using the staging feature. Priya attached a photo of the worn tire (a staged finding) and reviewed the PDF export with the thumbnail strip.

Her reaction: "The QR code. My paper records don't have QR codes. But the hash is the thing — the fact that the photo is permanently linked to the record and anyone can verify it hasn't changed."

---

## Priya's Feedback

### What She Likes

**The LLP dashboard.** Without hesitation. "The notebook is gone. I've been carrying that notebook for three years and I can leave it at the shop now. The Seminole's engine times are in a system that doesn't depend on me remembering to update it."

**The audit trail integrity.** "In six years, I've never had an FAA inquiry. I hope I never do. But if I did, my current answer to 'show me your records' is a Google Drive folder and some paper files. This answer is better by an order of magnitude."

**The pre-close checklist hard blocks.** "I know what it's like to close a work order when you're tired and the aircraft is needed for a flight at 6am. The hard block is not a suggestion. It's a wall. I need that wall."

**The onboarding honesty.** She mentioned this twice — once during the call and once in a follow-up email. "You told me what doesn't work before you showed me what does. Every other vendor leads with the good stuff and buries the gap in the fine print. You led with the gap."

### The Part 135 Gap in Practice

Without the Part 135 operator notification workflow, Priya continues to manage charter discrepancy notifications via text message thread. She was asked to describe, specifically, what that costs her.

> "It costs me sleep, honestly. Any time there's a discrepancy on a charter aircraft and I send the notification text, I'm aware that the record I'm creating is a text message. If there's ever a question — an incident, an audit, an insurance claim — that's what I'll produce. A text message that says 'found a shimmy damper issue on 172, can't release, need auth.' That's my Part 135 notification record."

She paused.

> "I know that's not good enough. I knew it six years ago. I kept doing it because I didn't have a better option. My options were: text message, or hand-write a notification form every time I find something, get the chief pilot to sign it, scan it, file it. Which I tried to do for about three months and then stopped because it's a four-aircraft charter operation and I'm the only person doing records."

On the consequences:

> "If we have an incident and the FSDO pulls our records, the Part 135 notification requirement is one of the first things they'd check. The text thread is discoverable. 'I texted the chief pilot' is not a record. I know that. I need something that creates an actual record."

### Design-Partner Contribution: The Pilot Notification Log

Partway through the call, Priya raised something that wasn't on the agenda.

> "One thing I want to see — and I don't know if this exists or if anyone has asked for it — is a place in the work order to document that the pilot-in-command was notified before flight. After a maintenance event. That the PIC was told what was done, what was found, what was deferred."

Nadia: "We don't have that. Walk me through why you need it."

> "Under Part 135, before the first flight after maintenance, the pilot-in-command needs to know the status of the aircraft. Not just 'it's airworthy' — they need to know what was done. If there was a deferred discrepancy, they need to know about it before they fly. That notification — the fact that you told the PIC and the PIC acknowledged it — is a record you need to keep. I've been keeping it in the work order paper file as a hand-written note: 'Notified [name] of maintenance status [date/time].' But that's not tracked anywhere systematically."

Nadia: "Is this a regulatory requirement or good practice?"

Priya: "I thought it was good practice. I've been doing it because it felt right. But I should probably know the cite."

Nadia pulled Marcus into the call at that point.

---

### Marcus's Response to the Pilot Notification Log Request

Marcus Webb, Regulatory Compliance Lead, joined the call on short notice.

Nadia: "Priya has a request for a pilot notification log — documenting that the PIC was notified before flight after maintenance. She's been doing this as a manual note in the paper work order file. Is this a regulatory requirement?"

Marcus, after a pause to look it up (he wanted to cite correctly):

> "It's 14 CFR §135.65. 'Mechanical irregularity reports.' Paragraph (a): each person who takes action to correct a mechanical irregularity described in a logbook shall record the correction in the logbook. Paragraph (b): the certificate holder shall establish a procedure for keeping the pilot in command informed of deferred items. And §135.65(c): the certificate holder must notify the pilot in command of any deferred items before the first flight after maintenance."

He paused.

> "Priya, the hand-written note you've been keeping in your paper file — the 'notified [name] of maintenance status' note — that's not good practice. That's a regulatory requirement. You've been complying with it; you've just been doing it with the least defensible possible documentation format."

Priya: "I thought it might be something like that."

Marcus:

> "This is not a nice-to-have feature. This is a §135.65 compliance surface that Athelon currently does not address. A pilot notification log — a structured place in the work order to record that the PIC was notified of maintenance status before the first flight, with the PIC's acknowledgment and timestamp — that closes a real gap. It should be in the v1.2 Sprint 3 scope."

Nadia, immediately: "Can you add it to the Sprint 3 scope document today?"

Marcus: "I'll file the regulatory memo this afternoon. It belongs in Sprint 3 with the OCR work — both are Part 135 features, same sprint."

> "Priya, you just told us something about our own product that we didn't know to build. Thank you for that."

Priya, dry: "I've been doing this alone for six years. You notice gaps."

**Outcome: Pilot notification log added to v1.2 Sprint 3 scope. Marcus regulatory memo filed 2026-03-09.**

---

## Scope Boundary at Onboarding Completion

| Function | Status in Priya's Account |
|---|---|
| Work order creation and execution (Part 91) | ✅ ACTIVE |
| Task card sign-off and IA re-auth | ✅ ACTIVE |
| LLP dashboard (all 4 aircraft) | ✅ ACTIVE |
| Photo attachments (Sprint 1) | ✅ ACTIVE (sprint shipped 2026-03-29) |
| IA expiry notifications (Sprint 1) | ✅ ACTIVE (sprint shipped 2026-03-29) |
| Discrepancy authorization — Part 91 customer notification | ✅ ACTIVE |
| Part 135 operator discrepancy notification record | ❌ DEFERRED — v1.2 Sprint 4 or v2.0 |
| Pilot-mechanic role separation logic | ❌ DEFERRED — v2.0 |
| **Pilot notification log (§135.65)** | **🟡 ADDED TO SPRINT 3 SCOPE** |

---

## Day 1 LLP Baseline Audit

**Conducted by:** Rosa Eaton  
**Date:** 2026-03-09 (morning, before onboarding call)

Rosa applied the same zero-compromise discipline she brought to High Desert MRO. Every LLP-tracked component on every aircraft against the physical logbooks and maintenance records.

| Aircraft | Items Audited | Discrepancies Found |
|---|---|---|
| N2841T (C172) | 14 | 0 |
| N5561R (C172) | 14 | 1 (see below) |
| N3347K (PA-44 Seminole) | 31 | 0 |
| N9142Q (C182RG) | 18 | 2 (see below) |

**Discrepancy — N5561R:**  
Hobbs time entered at last annual: 1,842.4 hrs. Rosa's tach-time calculation from logbook entries: 1,847.1 hrs. 4.7-hour gap, likely from a ground run not recorded in the log. Entered at 1,847.1. Priya: "I knew that was off. I've been rounding down. I won't do that anymore."

**Discrepancy — N9142Q (C182RG):**  
1. Landing gear actuator life: 821 cycles recorded in Priya's notebook. Logbook review by Rosa yielded 829 cycles. 8-cycle discrepancy; logged at 829.  
2. Propeller governor TBO: Priya had the TBO date wrong by two years (had been using 1994 governor manual; new limits per current MSB set lower TBO). Rosa corrected to current limits. Priya: "I would have caught that at the next annual. Maybe."

Rosa, at the end of the audit:

> "You've been doing this alone for six years. The data is in better shape than I expected. Two gaps in 77 items — both explainable. The important thing is they're corrected now."

**Priya:** "The 8-cycle gap on the gear actuator. That's the one that bothers me. Eight cycles isn't a lot, but it's eight cycles I didn't know about."

Rosa: "That's why we do the baseline audit. Now you know."

---

## Onboarding Completion Summary

High Desert Charter Services is live on Athelon as of 2026-03-09. Four aircraft, Part 91 scope only. Priya Sharma is the sole certificated records person, operating as IA and DOM-equivalent in a dual-role configuration. Part 135 discrepancy notification remains on text-thread pending Sprint 4 / v2.0. Pilot notification log (§135.65) added to Sprint 3 scope as a direct result of Priya's onboarding call.

The product learned something from its third customer. That doesn't happen when you call people. It happens when they call you.
