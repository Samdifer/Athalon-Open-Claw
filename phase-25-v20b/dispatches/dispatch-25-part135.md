# Dispatch No. 25 — The Portal Link
*by Miles Beaumont*
*Filed: 2026-02-23*

---

Daniel Moya has been flying charter out of the same general aviation airport for eleven years. He knows the smell of avgas the way some people know the smell of coffee — it's just what mornings are. He's flown for three operators. Two are out of business. Priya hired him four years ago and he's been with her since.

Every time he takes one of Priya's aircraft, he gets a text. The text says the aircraft is airworthy. It says maintenance is complete. Sometimes it includes a work order number. He's never asked for more than that, because that's what the standard is. You get the text, you do your walkaround, you go fly.

Last week he got an email instead.

The subject line was "Maintenance records for N44TX — pre-flight access." He clicked it and it opened a page: aircraft registration, make and model, serial number, work order summary, every discrepancy found and resolved with the approved data reference for each fix, the return-to-service statement, the IA's name and certificate number.

He texted Priya: *What is this? This is actually the record.*

He'd never seen the actual record before. Four years of flying her aircraft, and it had lived in a binder in the shop. He trusted the text because he trusted Priya. But the record itself — that was a different thing.

---

This is what Part 135 compliance looks like in the field. Not the way the FAA writes it. The way it actually operates.

§135.65 says the certificate holder shall make maintenance records available. The FAA interprets this to mean the pilot in command should have access before accepting the aircraft for flight. There is a real enforcement history here — not common, but enough to know the FSDO looks for it. And the way operators satisfy it, in practice, is the text message. Sometimes a phone call. Sometimes a handwritten note on a clipboard by the fuel pumps.

The text message is the standard. The text message has been the standard for years. Everyone knows it's the standard. Everyone does it.

The gap between the FAA's requirement and the text message is not small. The text message is someone telling you the maintenance record exists. That is a different thing from the record.

What shipped this week is an IA-issued, time-stamped, cryptographically tokenized link to the actual record. The IA has to sign off on return-to-service before the portal can be issued. The pilot's name and certificate number are logged against the issuance. The timestamp records when the pilot accessed it. If the FSDO asks whether the pilot had access to the maintenance record before flight, the answer is no longer a text thread. The answer is a log entry.

I'm not saying the text message operators are bad operators. I know Priya. She is meticulous. The gap wasn't negligence — it was the absence of infrastructure. You can't log what you don't have a system to log.

---

Sandra Okafor found Athelon because she read dispatch number twenty-four. That dispatch was about Frank Nguyen — a former FAA DER who had been using Athelon for two months at his turbine shop in Scottsdale and filed a formal bug report with a reference number. I wrote about it because I thought it was interesting that a man with thirty-one years of regulatory experience chose to engage with a software product the way he'd engage with a rulemaking docket. Formally. With documented expectations.

Sandra knows Frank from an FSDO liaison committee. She'd heard him mention Athelon. When she read the dispatch, she called.

She's a helicopter DOM in Fort Worth. Robinson R44s, Bell 206s. Nineteen years in the industry. On the pre-onboarding call, Marcus told her — item by item — what Athelon covers for helicopters today and what it doesn't. The AD compliance module has a Bell service instruction gap. The LLP dashboard hasn't been validated against Robinson's Airworthiness Limitations Section. He named the Bell SI gap before she asked about it.

She said it was the first time a vendor had named that gap to her in a pre-sales conversation. Thirty product demonstrations in eight years. Every single one told her they covered everything she needed.

She onboarded anyway — on the administrative side only, with the compliance-surface features disabled until Marcus completes the Robinson validation. Work orders, task cards, parts traceability. That's most of her documentation pain right now. She's keeping the rest in her existing spreadsheet until the validation is done.

The product is reaching people who weren't in the original customer research. The first shops were Part 145 repair stations — general aviation, fixed-wing. Priya was a stretch at onboarding: a Part 135 charter operator with three aircraft. Sandra is a different category entirely. The product will have to grow to serve her fully. Marcus knows that. Sandra knows that.

Daniel Moya got a portal link instead of a text message. Sandra Okafor called because she read a dispatch about a DER writing a bug report.

These are small things. But Priya has been running Part 135 charter flights for six years with Post-It notes on the dispatcher's desk. And Sandra has been doing FSDO audits for nineteen years with a Bell SI gap that every piece of software she's evaluated pretended wasn't there.

Small things, when they change, sometimes mean something.

---

*Miles Beaumont covers aviation technology and maintenance operations. He has been embedded with the Athelon development team since the product's first live work order.*
