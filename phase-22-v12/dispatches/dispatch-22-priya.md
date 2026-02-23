# Dispatch No. 22: The One Nobody Called
*by Miles Beaumont*

---

Nobody called Priya Sharma.

That's the part I keep coming back to. The first shop — Skyline, Carla, Columbus — Nadia flew out and pitched her. The second shop — High Desert, Bill, Prescott — Carla called Bill herself. That's how word-of-mouth works: you talk to the person who talks to the next person. You choose your sequence. You control the introduction. You get to tell the story.

Priya found it on her own. At a regional IA renewal seminar in Phoenix, someone had printed out Dispatch-19 and circulated it. A physical printout. Not a link, not a share — someone thought it was worth paper and ink, and passed it around a room of forty aviation maintenance professionals on a Tuesday in February.

Priya read it over lunch. That night, she emailed Nadia directly. She didn't email the general inbox. She found Nadia's name in the dispatch and located her through LinkedIn.

Subject line: *I read the dispatch. Can we talk?*

That's it. Forty-seven words in the email. Just enough.

---

I want to talk about what solo means in aviation maintenance.

Not solo like a first flight, romantic and triumphant. Solo like being the only person in the room who can sign the logbook. Solo like being simultaneously the Inspector, the Director of Maintenance, and the records department — and also the person who answers the phone and orders the parts and files the paperwork and checks the mail. Solo like six years of that.

Priya Sharma is an IA. An Inspection Authorization — not a certificate type the public knows much about, because the public doesn't need to. An IA is a mechanic who has been authorized by the FAA to perform and approve major maintenance and return aircraft to service. Not everyone who holds an A&P certificate holds an IA. You have to work for it, test for it, and re-earn it every two years with a demonstrated record of actual qualifying activity. It is the certificate that means *the aircraft is airworthy because I say so, and I am authorized to say so.*

At a shop with a Director of Maintenance and a Quality Control Manager and multiple IAs, there are layers. If you miss something, someone might catch it. If your paperwork has a gap, someone else might notice before the FSDO does. If you're tired at the end of a long day and you sign something you shouldn't, there's a process — a checklist, a countersignature, a pre-close review — that exists specifically to catch that.

Priya doesn't have layers. She is the layer.

No QCM to catch her mistakes. No DOM to countersign. Just her and the logbook and her IA certificate and, for six years, a folder of printed forms, a shared Google Drive, and a text message thread with the chief pilot.

That last one is the thing she mentioned on the intake call in a tone that I would describe as *resigned honesty.* She knew what her compliance posture was. She'd known it for years. She didn't have a better option.

"I send a text that says something like 'found a shimmy damper issue on 172, can't release, need auth.' He texts back 'ok.' That's my notification record. That's what I'd show an FAA inspector."

She paused.

"I know that's not good. That's why I emailed you."

---

What Athelon gives someone in Priya's position is mostly what it gives everyone: a work order engine that knows what a task card is, an audit trail that can't be edited retroactively, an LLP dashboard that replaces the physical notebook she's been keeping for the Seminole's engine times. The basics. The fundamentals that every shop needs and that most shops, before Athelon, had in some combination of paper, spreadsheet, and memory.

For Priya, specifically, there are two things that matter more than the rest.

The first is the IA expiry notification. She is her own IA. If her authorization lapses and she doesn't notice — because she's busy, because she forgot, because the renewal seminar filled up and she missed the reminder — she is not just non-compliant, she is personally in violation. There is no DOM to catch that for her. The notification goes to her twice: once as IA, once as the DOM of record. She is acknowledging her own alert, which is slightly absurd-looking on screen. But the acknowledgment is timestamped, logged, and immutable. "What I have now is: I know my cert expires in November," she said. This is better.

The second is the audit trail integrity. The photo attachments, the hash verification, the PDF exports that prove they haven't been altered since generation. When you work alone for six years, you have no one to independently verify that your records are what you say they are. An unlinked phone photo is not a maintenance record. A hash-verified photo attached to a maintenance record ID, with your certificate number and a timestamp, is a maintenance record. That distinction is not philosophical. It is the difference between evidence that holds up and evidence that doesn't.

---

What Athelon cannot give her — not yet — is the thing she actually needs most.

Under Part 135, when a discrepancy is found during maintenance, the certificate holder must be notified. Not informed as a courtesy. Notified, in a documented, traceable way that produces a record adequate for the certificate holder to make an informed go/no-go decision. That notification is a regulatory requirement with a specific character. The notification must be adequate. The acknowledgment must be a record.

Priya's current compliance posture for this requirement is a text message thread.

Athelon's customer portal — the discrepancy authorization flow that Danny Osei helped us build, the redesigned email with the N-number in the subject line and the cost range formatted cleanly and the consequence statement right there — does not produce a record that clearly satisfies the Part 135 notification requirement. The portal was built for repair station customers under Part 145. The regulatory surface is different. The acknowledgment structure is different. The record type is different. Using the existing portal for Part 135 operator notifications would technically work and would produce records that are, in important respects, wrong.

Nadia told Priya this before the product demo. On purpose.

"For your Part 135 discrepancy notifications, you'll need to continue your existing process for now. I know what that process looks like. I'm not going to tell you to use a feature that produces a record that doesn't clearly satisfy the requirement. That would be worse than continuing to text."

I've been covering Athelon since the first work order. I've watched Nadia sell this product, pitch it, demo it. I've watched her make the case for why it's better. I have never seen her open a conversation by telling a potential customer what the product can't do.

She led with the gap. Priya noticed. Priya mentioned it again later, unprompted.

---

There's a third thing, though. And this one I didn't see coming.

Toward the end of the onboarding call, Priya raised something nobody had asked about. A feature that didn't exist and hadn't been scoped. A pilot notification log — a structured place in the work order to document that the pilot-in-command was notified of maintenance status before flight. She'd been doing it as a hand-written note in the paper work order file for years. "Notified [name] of maintenance status [date/time]." She thought it was good practice.

Marcus Webb joined the call. He looked it up to cite correctly.

14 CFR §135.65. Mechanical irregularity reports. Paragraph (c): the certificate holder must notify the pilot in command of any deferred items before the first flight after maintenance.

Priya's hand-written note wasn't good practice. It was a regulatory requirement. She'd been complying with it. She just hadn't known the cite.

Marcus said it plainly: "This is not a nice-to-have feature. This is a §135.65 compliance surface that Athelon currently does not address."

It's in the Sprint 3 scope now. A pilot notification log. A structured record — PIC name, maintenance status summary, deferred items, acknowledgment timestamp — that closes a gap that Athelon didn't know it had until a sole-proprietor IA in Scottsdale mentioned it on an onboarding call.

You don't get that from a sales conversation. You get it from someone who has been doing this alone for six years and notices gaps because that's what solo teaches you.

The product just learned something from its third customer that it didn't know to build.

That's the dispatch. That's what nobody called.

---

*Miles Beaumont is an aviation journalist and a private pilot. He has been embedded with the Athelon team since the first live work order. He owns no equity in the company.*
