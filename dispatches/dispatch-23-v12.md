# Dispatch No. 23: The Version They Asked For
*by Miles Beaumont*

---

v1.2 shipped on March 9th. Seven features. Six people who asked for them.

I want to be precise about that. Not six users. Six people — with names and jobs and specific things that weren't working. The version you're reading about exists because those six people said what they needed and the team wrote it down and built it.

---

Here's what shipped.

Photo attachments on maintenance records. Teresa Varga at Skyline in Hickory asked for this because she was writing paragraphs of description around photographs she was already taking anyway. Now the photo is part of the record.

IA expiry push notifications. The alert arrives before the gap — sixty days out, thirty, fourteen, seven, one. The DOM doesn't find out on Monday morning.

DOM personnel compliance dashboard. Carla Ostrowski at Skyline built this in a spreadsheet every Sunday night. She'd pull IA records, cross-reference expiry dates, lay it out in a grid she'd walk into Monday with. She did this for four years. She closed the spreadsheet.

Customer portal polish. Danny Osei at Manassas flagged three specific friction points after v1.1 launched: the status language was confusing, the estimate display made no sense to customers, the message thread was too hard to follow. Three things. All three fixed.

8130-3 OCR for parts receiving. Teresa asked for this too. On the receiving dock, she photographs every 8130-3 tag that comes in. Before v1.2, she typed everything by hand — part number, serial number, description, Block 17 approval reference. She already had the photograph. She was transcribing it. Now she photographs the tag and watches the fields populate. She reviews the values. She confirms them. OCR is an assist. She's still the one who signs off.

Block 17 gets special treatment. Marcus Webb flagged it early: Block 17 is the approval authorization reference — the traceability chain to the approving authority. If the OCR can't read it with high confidence, the form blocks and requires manual entry. It doesn't guess. When the tag is faded or handwritten, it stops and makes the technician read the physical tag and type what they see. Teresa ran a faded international tag through the day before ship. Block 17 blocked. "The system was right to stop me," she said. "That's exactly when it should make me type it in."

---

Pilot notification log. §135.65 requires Part 135 certificate holders to keep a record of mechanical irregularities and notify the pilot in command. Priya Sharma at High Desert Charter Services in Scottsdale asked for this because she had been doing it in a notebook and a text message thread for six years.

On March 9th, Priya ran her first Part 135 work order through Athelon — an oil sump gasket on the left engine of N3347K, a PA-44-180 Seminole. She worked the task card, completed the discrepancy record, reached the close step, and a panel appeared that hadn't been there before.

*Pilot Notification Required — §135.65.*

She entered the pilot's name, his certificate number, the notification method, the time she called, what she found, what she did, the acknowledgment. She confirmed. The RTS button went active.

"I've been doing this in a notebook for six years. Not because it wasn't a requirement — because there was nowhere in any system I used to record it that made any sense. Now it's just in the record. It's part of the work order. It's exactly where it should be."

Then: "Can I show this to Jack? He's been asking me for years why I have to text him from a maintenance system."

---

There's a version of software development that runs in the opposite direction: the builders decide what the product should be, ship it, and listen selectively for validation. The roadmap comes first. The customers come second. This is normal. It's also how you end up with features nobody asked for and missing features everybody needed.

v1.2 is not that version. It is the version Teresa asked for when she said she was typing part numbers off tags she'd already photographed. It is the version Priya asked for when she said her pilot notification process was a text message thread. It is the version Carla asked for when she said she built a compliance grid in a spreadsheet every Sunday night for four years.

The product is now shaped more by its customers than by its builders. That's what v1.2 is. That's what it means.

---

*Miles Beaumont is an independent aviation journalist. He has been embedded with the Athelon team since pre-launch.*
