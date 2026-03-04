# Dispatch No. 15 — From Depth to Breadth
*Filed by Miles Beaumont, 2026-08-15*

---

There's a question that comes up in every business that has found a market and is deciding what to do next. The question is not *what should we build* — there's always a list for that. The question is *what kind of thing are we?*

Are we the best at one thing for one customer, or the right thing for many customers? Are we deep or broad? Are we a specialist or a generalist? These are not rhetorical questions. They have operational consequences. They affect what kind of people you hire, what kind of work you do, and what kind of customer you can honestly say yes to.

For the first four versions of Athelon, the answer was clear without anyone needing to say it: depth. The v1.4 arc was built around a single organizing question: *can a maintenance software platform own the ALS compliance lifecycle end-to-end?* Fourteen phases to get there. Six features. Seven shops. One hundred and forty-eight integration test cases. Zero production incidents. The answer, after all of that, turned out to be yes — but only because the platform was willing to do the hard work of knowing the aircraft, knowing the regulation, and knowing what a real mechanic needs to see when they're standing on the ramp at 7 a.m.

That was the depth work.

v1.5 opens with a different question. The depth succeeded. Now: can the platform reach a shop that doesn't look like the first seven?

---

In early June, a contact form landed in the Athelon inbox from a shop in Pueblo, Colorado. The form had a name — Lorena Vásquez, High Plains Aero & Charter, KPUB — and a note that stopped everyone who read it:

*"Interested in turbine ALS tracking. Not interested in another platform that doesn't understand what a CMR is."*

Marcus Webb read the note in the middle of a meeting. He wrote three words in his notebook: *She's done the reading.* He showed it to Nadia after the meeting ended.

What that note communicated, to anyone familiar with Part 33 aviation regulation, was not simply that Lorena had a turbine operation. It communicated that she knew the distinction between an Airworthiness Directive and a Continued Airworthiness Requirement — a distinction that most maintenance software platforms get wrong, or elide, or collapse into a single compliance bucket. It communicated that she'd shopped for solutions before and been disappointed. It communicated that she was giving the platform exactly one chance to prove it was different.

She'd found Athelon not through a sales call. Not through a conference. Through the aviation community in Colorado — someone in Grand Junction had mentioned that a compliance system had changed the way a turbine shop worked. Lorena had looked it up. She'd read whatever was publicly available. She'd decided the architecture was worth a phone call.

Seven shops, and this was the first one that had come looking for the product.

---

Nadia ran the discovery call. She didn't pitch. She asked questions, and then she listened.

What Lorena described was a system of two spreadsheets, two binders, and — her words — approximately three hundred sticky notes. One spreadsheet per PT6A-42 engine. Fourteen LLP items. Six CMR items per engine. Two King Air B200s, so four engines, so eighty ALS items for the engine fleet alone, before you counted the airframe limitations. She updated the spreadsheets every night after her husband logged the day's flight cycles. She had been doing this for five years.

"It works," she said. "But it doesn't scale."

Then she asked about the Part 135 ops spec integration. Nadia told her the truth: the Part 145 maintenance compliance surface was complete, battle-tested across seven shops. The Part 135 deeper integration — the kind that ties a maintenance release to a charter dispatch authorization — was in the v1.5 backlog. It was a priority. But it hadn't been built yet.

There was a pause.

"That's the most honest thing any software company has said to me in five years of shopping," Lorena said.

Later, Marcus told me that Nadia's candor was not accidental. It was policy. Since Phase 29 — since Dale Renfrow's onboarding — the team's practice has been to name every compliance gap before the shop signs anything. Not after. Not when it comes up in an audit. Before. The DOM should never discover a limitation on Day 1 that the team already knew existed.

It's a simple rule. It turns out to be one of the harder disciplines to maintain.

---

There is a different experience in outbound sales versus inbound demand. Nadia has run both, across eight shops now, and she described the difference to me one afternoon in a way I keep thinking about.

In outbound, you find the shop. You do the research. You call at the right time — not when the DOM is slammed, not on a Monday morning, not when the FSDO just walked out the door. You earn the relationship slowly, by being useful before you ever ask for anything. The goal is to become the person the DOM thinks of when a compliance problem surfaces, because you were there when no one was selling.

In inbound, the shop finds you. The relationship starts at a different temperature. They've already decided you're worth their time. The question isn't whether they'll listen; it's whether you'll live up to what they've heard.

Those are not the same challenge. The outbound challenge is attention. The inbound challenge is trust. You have to justify what you've already been given credit for.

When Lorena's contact form came in, the team had been given credit. Someone in the Grand Junction aviation community — Hector Ruiz, a mechanic who grew up in Pueblo and had seen what RMTS was doing with the platform — had told a story that made a shop in Pueblo decide to reach out. The story that made Lorena contact the platform was Marcus's compliance architecture — the CMR/LLP distinction she knew about, the same distinction she'd been unable to find in five years of shopping.

The platform's reputation had preceded it. The only question was whether the platform could honor it.

---

The King Air B200 audit took Marcus three weeks. The PT6A-42 has fourteen life-limited parts per engine and six continued airworthiness requirements per engine. Two engines per aircraft, two aircraft in the fleet — eighty engine ALS items, plus the airframe. He built the seed data from the primary source documents: the TCDS, the ICA, the engine maintenance manual. He flagged service bulletins with conditional applicability. He produced a table that he believed was complete.

Lorena reviewed the table in six hours. She sat in the hangar at KPUB with the actual logbooks for N521HPA on a worktable and compared every row.

She found three discrepancies. The most significant one was a Power Turbine Stator on engine one that had been replaced under a service bulletin — the replacement stator had a different life limit than the standard engine configuration. Marcus's audit had flagged the bulletin as conditionally applicable but couldn't confirm it without the engine serial numbers. Lorena had the engine serial numbers. She had the logbooks. She called Marcus directly.

"The seed data has the wrong life limit for the stator," she said. "The replacement part has a different life. You need to know this before you enter it."

He pulled up his audit notes. The bulletin was there, flagged, waiting for confirmation.

"That's why you're the validator," he said.

"That's why you need a validator who has the actual logbooks in front of them," she said. "That's not a criticism. That's the constraint of building a generic template."

By the end of that afternoon, the corrections were incorporated, both aircraft's ALS boards were live, and the finding had surfaced a second advisory — the same engine's compressor disc, 1,353 cycles to its life limit, a replacement window somewhere in the next eighteen months.

Lorena already knew about the compressor disc. It was in her spreadsheet. Now it was in the system, and Derek could see it too.

"That matters more than I expected," she said.

---

In August, while Lorena was doing her field validation in Pueblo, Devraj was building a home screen widget in Denver.

The widget was Dale Renfrow's idea — or at least his request. Dale had mentioned at the Phase 32 check-in that navigating to the ALS board took three or four taps, and by the time he got there the pilot was already impatient. He wanted red or amber or green from the home screen. He wanted to do the ramp check in four seconds, not forty.

Devraj built it. The widget sits on the iPad home screen and shows, for each pinned aircraft, a colored status card: green for all clear, amber for something coming due, red for overdue. Tap the card to open the full board. The data syncs in the background so it's current when you walk out the door in the morning.

Dale tested it on the RMTS ramp at 7 a.m. He looked at it before he looked at the weather.

"That's the product," he said. In a voicemail, the way he said it — flat, matter-of-fact, the way a mechanic says something that just works — the words landed harder than if he'd been effusive about it.

Devraj thought about Dale standing on that ramp when he built the feature. The feature is for a mechanic at a turbine shop in Grand Junction, Colorado. It was built in an apartment in Denver by an engineer who has never stood on that ramp. That gap — between the person who needed the feature and the person who built it — is where most product failures live. The widget crossed it because Devraj knew the ramp existed and built for the person standing on it.

---

Phase 33 ends with the 8th shop qualified and active — but not fully done. The Part 135 depth work is in the backlog. The Power Turbine Stator finding on N521HPA has opened a procurement window that will need to close before 2028. Lorena's operation is in the system, but the system doesn't yet do everything her operation needs. That's not a failure. That's an honest accounting of where the v1.5 arc sits after its first phase.

The proof case for "from depth to breadth" is not complete after one phase. That's not how proof cases work. You can draw a line from Dale Renfrow calling Lorena "exactly the DOM I wish I'd found when I was starting out" to Lorena's contact form note about CMRs and see the shape of something. But the shape isn't finished yet.

What Phase 33 shows is that the 8th shop wanted to be found — and the platform was worth finding. That's a different kind of signal than the first seven shops. Seven shops earned through outbound work, through relationships built before the product was ready. The eighth shop came because the product's reputation had traveled on its own.

That's the turn. Not from depth to breadth as a simple expansion — more shops, more aircraft types, more feature lines. The turn is from a product that needed to be explained to a product that people talk about in hangars in Pueblo, Colorado, to other DOMs who are tired of platforms that don't know what a CMR is.

Marcus called it, in a note to Nadia after the onboarding was complete: *the platform earned the referral network it's getting.*

Nadia saved the note.

---

*Miles Beaumont is a writer covering operational compliance in general aviation. Dispatch No. 15 was filed 2026-08-15 from Denver, Colorado. The next dispatch will follow Phase 34.*
