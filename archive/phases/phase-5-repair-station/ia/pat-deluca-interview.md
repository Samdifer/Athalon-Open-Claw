# Interview — Patricia "Pat" Deluca
**Senior A&P / IA Holder**  
**Interviewers:** Nadia Solis (PM), Tanya Birch (Mobile/Offline)  
**Format:** 70-minute working session, Cascade Air Maintenance, Bend, OR  
**Date:** 2026-02-22  
**Transcribed and condensed by:** Nadia Solis

---

*Pat came out of the hangar to meet us, wiped her hands on a shop rag, and shook hands. She was working on something and didn't pretend otherwise. She said: "I've got until about three o'clock before I need to get back in there. What do you want to know?"*

*We told her we wanted to understand what it means to sign a maintenance record and what that means for how she needs the software to behave.*

*She nodded once and said, "Good. That's the right question."*

---

**Nadia:** You've been signing maintenance records for thirteen years. When you describe what a signature means to a newer mechanic — someone who's never held an IA — what do you tell them?

**Pat:** I tell them it means you were there, you know what was done, and you're putting your name on it permanently. Not your company's name. Not the shop's name. Your name and your certificate number. That record outlives the work order. It outlives the shop. It outlives you, if you want to get philosophical about it. An FAA inspector can pull that record ten years from now and ask you to explain every word on it. And you will, because your name is on it.

**Nadia:** What does that mean for how you use the software?

**Pat:** It means I treat every sign-off screen as a legal instrument. The same way I would treat signing a contract. I read it before I sign it. Every time. I know some mechanics tab through the summary and just hit the button. I don't. I want to see the aircraft tail number, the work order number, the task description, the reference document, the date, my certificate number — all of it, in one place, before I authenticate. If the system shows me a summary that's incomplete, or that says something different from what I understood the work to be, I stop. I do not proceed until I understand the discrepancy.

**Nadia:** Has the software ever shown you something that wasn't right before you signed?

**Pat:** *(pause)* Once. In EBIS 5. The date on the RTS record was wrong — it was showing the date the work order was opened, not the date the work was completed. I almost signed it. I caught it because I read the whole screen. We corrected it. It was a data entry error, not a malicious change. But it illustrates the point. If you're going to trust a digital record, the digital record has to be exactly right. Because when an inspector asks about that date, "the software put the wrong date there" is not a defense I'm willing to use.

---

**Nadia:** I want to ask about a specific situation. You mentioned an FAA ramp check in 2017 where you had to produce a record within fifteen minutes.

**Pat:** Thirteen minutes. Yes.

**Nadia:** Walk me through what that felt like and what it means for the software.

**Pat:** The inspector called and said he was looking at a logbook entry on a King Air 200 and he had a question about the description of a gear component inspection. He wanted the full work order record — task card, step sign-offs, reference documentation. He said if he couldn't see it, he'd have to consider the record unavailable, which has its own consequences.

I was in the parking lot. The record was in EBIS 5. The work order was about five weeks old, so it had rolled into archive status, which in our system means it takes nine to twelve minutes to restore. I told the inspector I had the record and I was restoring it. He gave me fifteen minutes.

*(She pauses.)*

**Pat:** The record came up at thirteen minutes. It was complete and defensible. But I'll tell you what thirteen minutes feels like when your certificate is implicated. It feels like an eternity. And it focuses your attention on exactly one thing: why does it take thirteen minutes to retrieve a completed record?

**Nadia:** What's the requirement for Athelon based on that experience?

**Pat:** Any closed work order — any signed record — must be accessible within five minutes, from any device, from anywhere. Not from the shop's network. From anywhere with an internet connection. No archive state. No restore process. If I'm at an airshow in Oshkosh and an inspector calls about a record I signed six months ago, I should be able to pull it up on my phone in two minutes.

**Nadia:** Two minutes.

**Pat:** Two minutes. The five-minute number is the outer bound. I'd rather you design for two.

---

**Nadia:** Let's talk about digital signatures specifically. You have strong opinions here.

**Pat:** I do.

**Nadia:** Where do they come from?

**Pat:** From thinking about what happens when the signature is challenged. Not whether it will be challenged — when. Because anything that involves a serious incident — an accident, a near-miss, a major airworthiness finding — will eventually involve someone looking at the maintenance records and asking: "Can we prove this record was not altered after it was signed?" If the answer to that question depends on the software vendor's word, I'm not comfortable with the signature. I need the answer to that question to be evident in the record itself.

**Nadia:** What would make you comfortable?

**Pat:** The record needs to have a cryptographic fingerprint that was created at the moment of signing. If anyone changes even one character of that record — the date, the tail number, the reference — the fingerprint won't match anymore. And that fingerprint needs to be verifiable without needing to log in to the software. I should be able to hand an inspector a printed copy of the record plus the signature verification hash, and they should be able to verify it independently if they want to.

*(She looks at Nadia.)*

**Pat:** I understand that this is technical. I don't need to understand the algorithm. I need to understand the verification path — the steps an inspector would follow to confirm that the record is unaltered — well enough to explain it in plain language while standing in a hangar. If I can't explain it, I can't defend it.

**Nadia:** That's a very specific requirement for how we present the cryptographic evidence.

**Pat:** Yes. It's a documentation and UX requirement, not just an engineering requirement.

---

*Tanya enters the conversation.*

---

**Tanya:** Pat, I want to ask about mobile — specifically about signing off an RTS on your phone or tablet, away from the shop's network. Is that a scenario you'd use?

**Pat:** Yes. Absolutely. Half the time I'm approving things from somewhere other than my desk. That's the whole point of having the software.

**Tanya:** What concerns do you have about mobile sign-offs?

**Pat:** The same concerns I have about any sign-off. Show me the complete record before I authenticate. And the authentication has to be real. A 4-digit PIN is not adequate for an IA-level signature. I'm certifying an aircraft's airworthiness. That certification needs more than four digits.

**Tanya:** What authentication method would you accept?

**Pat:** I'd accept Face ID or fingerprint as the primary method — I have no problem with biometrics. I'd accept a 6-digit PIN with a session password as a fallback. I would not accept a 4-digit PIN as the only method. And I would not accept just a session password typed on a touchscreen, because typed passwords on phones are a security disaster.

**Tanya:** What if connectivity drops mid-sign-off? You're in a remote location, you've completed the summary review, you hit authenticate, and the connection drops.

**Pat:** Then I need to know that happened. Not a spinning icon. Not silence. A clear message: "Authentication failed. Connection lost. Your signature was not submitted." And when I reconnect, I should be able to return to exactly where I was — the same summary, the same record — and sign again without re-navigating.

**Tanya:** Should the system allow the sign-off to be queued while offline and submitted when connectivity returns?

**Pat:** *(she takes a breath)* This is one I think about carefully. For a technician signing off a task card step, yes, I'm comfortable with an offline queue — that's a routine operational event and the data model can handle it. For an RTS signature — for the Return to Service, the final certification of airworthiness — I want server confirmation before I consider it done. I'm not willing to have an RTS in a "queued" state. Either it's in the system and confirmed, or it hasn't happened yet.

**Tanya:** The distinction being: task card steps can queue, RTS cannot.

**Pat:** Correct. And the software needs to make that distinction clear to the person signing. Don't let an IA walk away thinking an RTS is done when it's in a queue.

---

*Back to Nadia.*

---

**Nadia:** One thing I want to make sure we cover — the IA expiry on March 31. How do you want the system to handle that?

**Pat:** I want three things. First: notify me at 60 days, 30 days, and 14 days before expiry. Not a banner I might ignore. A notification that requires acknowledgment. Second: when my IA expires, block me from signing inspection records immediately. Not a warning. A block. Because I have seen — in another shop, not mine — an IA holder sign records after expiration without knowing it. That is a real event with real consequences. The software knows my expiry date. It should use that knowledge. Third: show me my IA status on my personnel record so I can confirm what the system thinks my expiry date is before it matters.

**Nadia:** And for other IA holders in the shop?

**Pat:** Same rules. The DOM needs a view that shows every IA holder's expiry status. Not buried in settings somewhere. Visible on the compliance dashboard.

**Nadia:** Last question. Fill in the blank: "I wish the software would..."

**Pat:** *(immediately)* ...understand that when I sign something, I need to be able to prove I signed it without the software's help.

*(She pauses.)*

**Pat:** That sounds like I don't trust software. I don't mean it that way. I mean: the evidence of my signature should be exportable, printable, and self-evidencing. If Athelon goes out of business tomorrow, I should still be able to produce that record and prove it's unaltered. If the answer to "can you prove this record is valid" is "yes, but only if Athelon's servers are running and I have a login" — that's not a defensible record. It's a hostage.

*(She stands.)*

**Pat:** I need to get back in there. Build the thing properly. This is important work.

---

*Interview ended at 2:58 PM.*

---

## Extracted Requirements

| Requirement | Priority | Source |
|---|---|---|
| RTS sign-off screen shows complete pre-auth summary: aircraft, WO number, task list, reference docs, date, cert number | Critical | Pat |
| Cryptographic record fingerprint created at moment of signing; detectable if altered | Critical | Pat |
| Signed record verifiable without software login — printed/exported hash verification path | Critical | Pat |
| Any closed work order retrievable within 2 minutes from any device, no archive state | Critical | Pat |
| IA-level signatures require 6+ digit PIN + session auth or biometric; 4-digit PIN not sufficient | Critical | Pat |
| IA expiry date tracked in personnel record; block inspection sign-offs after expiry (not just warn) | Critical | Pat |
| IA expiry notifications at 60, 30, and 14 days — acknowledgment required | High | Pat |
| DOM compliance dashboard shows all IA holders and their expiry status | High | Pat |
| RTS sign-off cannot be queued offline — requires server confirmation before considered complete | Critical | Pat |
| Task card step sign-offs may queue offline (distinct from RTS — system must communicate this difference) | High | Pat + Tanya |
| Authentication failure mid-sign-off gives explicit failure message; record preserved for re-sign on reconnect | High | Pat + Tanya |
| Audit log exportable to self-evidencing PDF without software login for FAA production | High | Pat |
