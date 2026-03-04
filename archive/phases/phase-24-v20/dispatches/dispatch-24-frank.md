# Dispatch No. 24 — The DER
*By Miles Beaumont*
*Filed: 2026-02-23*

---

Frank Nguyen spent six months reading the dispatches before he called.

He didn't reach out after the first one — the work order story, the day Carla Ostrowski signed a return-to-service on a real aircraft in a real shop and Athelon didn't break. He didn't call after the second, or after High Desert MRO came on and Bill Reardon's lead mechanic said the only version that matters is the one in the system. He read the Priya dispatch, the v1.2 ship dispatch, the piece about the pilot notification log. He read them the way someone reads primary sources — not for the story but for the evidence behind the story.

He called when Nate Cordova mentioned the LLP dashboard. Specifically when Nate described the engine mount life count on the Seneca — 4,340 hours in the spreadsheet, 4,412 in the logbook, the error found on Day 1 and locked. Frank is a powerplant specialist. He knows what that discrepancy means. He also knows that finding it on the first day means the system was looking for it, not assuming the spreadsheet was right.

That's when he called.

---

I've written about shops before — about Carla's shop and what the first live work order meant, about Bill Reardon and the twin shop that needed the LLP dashboard before it needed anything else. Those are stories about what the product does for people who already trusted it enough to try it.

Frank Nguyen is a different story. Frank didn't trust it when he called. Frank doesn't extend trust as a starting point. Frank spent 31 years working inside the regulatory system — first as an A&P and IA, then as a Designated Engineering Representative, the FAA's instrument for delegating type certification authority to industry experts. A DER doesn't just know what the regulations require. A DER has approved aircraft designs on behalf of the FAA. A DER has signed off on engineering data that determined whether something flew.

When Frank called Nadia, his first question wasn't about the product. It was about the compliance architecture. Who designed it? What's the IA re-authentication mechanism? Has anyone with FAA experience reviewed it?

He wasn't asking to be difficult. He was asking because those are the questions that matter. The product could have a beautiful UI and a smart LLP dashboard and a clean mobile experience, and none of that would tell Frank whether it was built on a sound regulatory foundation. Frank can learn a UI in an afternoon. He cannot retrofit a sound compliance architecture onto a product that was built without one.

Nadia got Marcus Webb on the call. What followed, by her account, was the most technically substantive conversation Athelon had ever had with a prospective customer. Frank walked through the §43.9 record structure. He asked about amended records and what the audit trail showed. He asked about the Form 337 major/minor classification. He asked what happened to an AD compliance record when an aircraft changed owners.

He asked about ferry permits. Marcus told him the ferry work order type was disabled — that they hadn't designed the guardrails yet. Frank's response was: "Good answer."

A man who spent 31 years approving things for the FAA knows what it looks like when someone refuses to approve something prematurely. That's not a weakness. That's the whole discipline.

---

Frank came on board. Day 1 was a compliance architecture walkthrough, not a product demo. Rosa Eaton walked him through the workflows; Frank printed the regulatory sections and cross-referenced them as she talked. He asked about every edge he could think of. He got answers that satisfied him — not because he was easy to satisfy, but because the answers were right.

The LLP baseline audit came in the afternoon. Seven aircraft. 847 life-limited parts. Four hours. Eleven discrepancies between Frank's own Excel workbook — the one he'd maintained personally for 11 years, the one he trusted because he built it — and the physical logbooks.

The most significant was 37 hours on a PT6A-60A turbine blade set. Frank's workbook had applied a rounding convention he'd established in 2018 and forgotten. The physical logbook showed the unrounded hours. The difference between 143 hours to inspection and 106 hours to inspection.

Frank flagged the aircraft immediately for priority scheduling. He didn't defend the workbook. He said: "This is why I called."

A DER doesn't say "this is why I called" unless the product passed a test he was administering.

---

Athelon has been used by three shops before Frank. Carla Ostrowski, who runs a tight GA shop in Columbus and has been doing this work for 22 years. Bill Reardon in Prescott, who spent two decades maintaining light twins in the desert and knows the difference between a system that tracks LLPs and one that just records numbers. Priya Sharma, who manages Part 135 operations and needed to know that her pilot notification log would survive an FSDO audit.

These are serious people. Their adoption matters. Their trust matters. But none of them had spent years inside the FAA's type certification process, approving aircraft designs, evaluating engineering data, signing off on the compliance basis for things that fly.

Frank has. When he said the IA re-auth mechanism was correct — not good, not useful, correct — it meant something different than when a DOM says it. A DOM knows whether the workflow makes sense. A DER knows whether the mechanism is sound.

What it means that the product passed Frank's review is not that Athelon is now certified or validated or approved in any regulatory sense. It isn't. What it means is that a man who spent 31 years on the inside of the FAA's approval process looked at the compliance architecture and said the right things were built the right way.

That's the review that matters when a real FSDO inspector walks into a shop and pulls maintenance records off the system. Not enthusiasm. Not adoption. Not word of mouth, though all of those matter. The review that matters is: did someone who knows the system at depth look at this and find it sound?

Frank found it sound.

---

He also found one thing to improve.

Frank filed it on Day 7 as formal product feedback. Reference number DST-FB-001. A structured description of a gap in how the AD compliance module documents negative applicability determinations — the basis for marking an AD as not applicable, whether it's a serial number exclusion or an STC configuration exclusion or a DER determination. He described the impact: non-blocking, but the current records are less robust than they could be in an FSDO audit. He included a recommended resolution.

He filed it as formal product feedback because that's what it is. He used the word "formal" in the submission. A 31-year DER doesn't use that word loosely.

At the bottom, he wrote: "If you fix this, tell me when it ships."

That's the review Athelon didn't know it was waiting for. Not the praise — the bug report. A man who spent his career approving things on behalf of the FAA found one thing he'd do differently and filed it with a reference number and a recommended resolution. That's the highest form of technical engagement this product has seen. That's not a customer relationship. That's peer review.

Athelon will fix it. Frank will hear when it ships.

---

*Miles Beaumont is a writer covering aviation maintenance technology. These dispatches are published for the Athelon customer community.*
