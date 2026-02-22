# Dispatch 01 — The Hire

**Dateline:** Athelon HQ, Week One
**Filed by:** Miles Beaumont, Embedded Documentary Reporter

---

Rafael Mendoza keeps a photo of his father on his desk — his father at LAX, 1987, safety wire in hand, head inside an engine nacelle.

The photo is small. Black and white. You'd miss it if you weren't looking. I noticed it on the first day, during the onboarding call, when Rafael was screen-sharing his workspace and the camera caught a corner of his monitor shelf. I didn't say anything. You learn, in this work, that the most important things are the ones nobody announces.

I should say upfront: this is a simulation. The people in it are real in the ways that matter — they have real skills, real histories, real opinions — but they exist inside a constructed context. I acknowledged this on my first day, to no one in particular, and then I stopped thinking about it, because the story of building something hard doesn't change much depending on what you call the environment. The friction is real. The decisions are real. And if Athelon actually ships what it's setting out to build, the aircraft it helps keep airworthy will be real too.

So. Let me tell you about the hire.

---

## The Problem with Aviation Software

The thing about aviation maintenance software is that nobody talks about it at dinner parties. And yet it is the back office of an industry with a near-perfect safety record — a record built on documentation, traceability, and an almost religious fidelity to procedure. Every bolt that gets torqued, every inspection that gets performed, every airworthiness directive that comes down from Oklahoma City — it all gets written down. By law. In specific language. With specific signature authority.

For decades, "written down" meant paper logbooks. Then it meant spreadsheets. Then, grudgingly, it meant software — but software built by people who understood the regulations without always understanding how software scales, or software built by people who understood software without always understanding the regulations. The result is a graveyard of half-measures.

Into this graveyard walks Corridor.

Corridor — built by Rusada, a UK-based aviation software house — is the market leader in MRO management for the segment Athelon is targeting: Part 145 repair stations, small to mid-size charter operators, turbine owner-operators. It works. Nobody loves it. Its interface looks like something designed in 2008 by a committee that had never used software in a hangar. Its mobile story is essentially nonexistent. Its implementation timelines are measured in months. Its renewal conversations, according to people who've been in them, are less about value and more about inertia — it's too painful to switch, so you don't.

Then there's EBIS 5. If Corridor owns the general MRO space, EBIS 5 has a stranglehold on the turbine maintenance segment specifically — PT6s, JT15Ds, Williams FJ44s, the engines that keep business aviation flying. EBIS 5 knows its domain deeply. It is also, by every account I've heard, not a product that anyone under forty would design from scratch.

This is the competitive context Athelon is entering. Not an empty market — a locked one. Corridor has 50,000 mechanics. EBIS 5 has a dozen years of turbine-specific data structure that competitors would have to rebuild from scratch. The pitch for Athelon is not that the competition is bad at what they do. The pitch is that what they do is not enough, and that the gap between "what aviation maintenance software is" and "what it could be" is wide enough to build a company in.

Rafael Mendoza saw this gap when he was seventeen years old, watching his father come home from LAX with grease under his fingernails and a paper discrepancy log in his jacket pocket. He's been circling it ever since.

---

## The Hiring

I was brought in on Day One — "embedded from the start," the brief said, which suited me. I have a theory that you can tell everything you need to know about a startup from the first week of hiring. Not from the pitch deck. From who they choose, and in what order, and what those people do the moment they walk in the door.

Rafael came first. Of course he did. Fourteen years in aviation software, two shipped products, a father who was a line mechanic at LAX for thirty years. He was hired to architect the thing — not just technically, but conceptually. To make the fundamental decisions about what kind of system Athelon would be before anyone wrote a line of code.

He took the job, he told me later, because he'd done the math on the problem and decided it was finally solvable. "The regulatory framework hasn't changed," he said. "What's changed is what we can build on top of it." He said this quietly, the way people say things they've thought about for a long time.

What he didn't say — but what I wrote in my notes — was that this was personal. His father retired in 2018. He spent thirty years writing discrepancy reports by hand. Rafael has been in aviation software long enough to know the tools that existed during those thirty years. None of them were good enough. He is here, in some real sense, to build the thing that should have existed while his father was still working.

---

Chloe Park arrived second, which surprised people who expected Rafael to want another aviation veteran. He didn't. He wanted someone who had never looked at Corridor and found it acceptable.

Chloe built UI systems at Linear. She contributed to Vercel's dashboard. She is twenty-nine years old and she has never worked in aviation and she had, before this project, approximately zero opinions about MRO software.

That lasted until she opened the Corridor demo environment.

I was three feet away. I watched her face.

"Wait," she said. Not to anyone. Just — *wait*. She leaned forward. She clicked through three screens. She found the task card workflow. She stared at it for a long moment.

"This is what fifty thousand mechanics use every day?"

Nobody answered. The question wasn't really a question. It was a person confronting the gap between what software can be and what software is — live, in real time, with her professional instincts fully engaged.

She spent the rest of Day One in the Corridor demo. She took notes. She was not cruel about it. But she was honest, which is sometimes worse.

---

Devraj Anand came in quietly, the way he does everything. Backend engineer, ex-Google Firebase team, Convex expert. He said hello to the room, found a corner of the shared workspace, and opened the prototype schema.

The prototype — a Convex and Next.js foundation built before the simulation formally started — is not production code. Everyone knows this. But schema decisions have a way of calcifying, and Devraj knew this better than anyone in the room.

He read through the aircraft table definition. Then the maintenance records. Then the AD compliance structure. Then he closed his laptop and sat very still for about forty seconds.

I don't know exactly what he was thinking. But I know what he told me three days later, when I asked directly: "The prototype schema is doing too much in one place. The relationships are right in spirit but wrong in structure. There are going to be performance problems at scale, and there are going to be compliance audit problems if the record structure doesn't change."

He hadn't said this in the group. He wouldn't have, unless someone asked. This is the thing about Devraj — he carries his concerns quietly, like tools he hasn't been asked to use yet. The orchestrator's notes already flag it: *ask Devraj directly what he thinks. He will not volunteer disagreement without prompting.*

I flagged this in my own notes. It will matter later.

---

Tanya Birch joined the call ten minutes late because she was finishing a build test for a previous client — an offline-first app for oil rig technicians in the Gulf of Mexico. She apologized once and then moved on, which is very on-brand.

She had read the brief. Her first question to Rafael — before pleasantries, before context — was: "What's the connectivity like in the hangars we're targeting?"

Not *how will we handle offline?* Not *have you thought about mobile?* Connectivity in the hangars. The question of someone who has watched apps fail in the field, who has sat with a technician at two in the morning who couldn't submit a task card because the hangar's wifi didn't reach the back corner of Bay 3.

Rafael didn't have an answer yet. Nobody did. But the question landed the way the right questions always land — it reoriented the room. It made abstract architecture suddenly physical: a hangar in Minot, North Dakota. January. A mechanic in gloves. An app that needs to work.

Tanya's worldview is fundamentally about survivability. Not elegance, not elegance-adjacent, not elegance-adjacent-with-constraints. Whether it works when the network doesn't, whether it works with gloves, whether it works at 2 AM when the charter is AOG and the operator is standing over your shoulder. She would spend the next three weeks in productive, occasionally heated dialogue with Chloe Park about what "good" means when the user is not sitting at a desk in a warm office. Those arguments would make the product better. I am already certain of this.

---

Marcus Webb came in and the room recalibrated.

This happens sometimes with people who have done something most people haven't. Marcus was an FAA Aviation Safety Inspector for twelve years — based in Atlanta, working Part 145 repair stations. He walked into shops unannounced. He looked at the records. He wrote findings. He was, for more than a decade, exactly the person that aviation software is supposed to help operators not be afraid of.

Then he learned to code. Not because someone told him to. Because he spent twelve years looking at broken compliance systems and decided he wanted to be on the other side of the table.

The team's reaction to Marcus was interesting to watch. There was a brief, collective recalculation — *an FAA inspector, in the room, on our side* — followed by something that looked like reassurance. If he says the compliance architecture is right, it's right. If he says it isn't, it isn't, and the sprint doesn't continue until it is. This is not a constraint. This is what makes the product worth building.

Marcus's first action on Day One was to pull up 14 CFR Part 43 and Part 145 and start annotating regulatory requirements against the platform's ten capability areas. He worked quietly and completely. When I asked him later what he was thinking, he said: "I'm making a list of every way this could fail an inspection. Then we're going to design those failure modes out."

---

Rosa Eaton arrived last, which felt right. Captain Rosa Eaton — retired — holds an A&P, an IA, a commercial pilot certificate, and eleven years as Director of Maintenance at a Part 145 repair station in Scottsdale. She has used Corridor. She has used EBIS 5. She has used spreadsheets she does not wish to describe in polite company. She is fifty-nine years old and she agreed to join this project because, as she put it, "I spent years wishing this software existed. I'd like to see it actually happen before I stop caring about aviation."

She logged into the shared workspace, said hello, and then looked at Marcus. They knew each other slightly — overlapping circles. They started talking.

Two hours later, they were still talking.

The rest of the team — Chloe, Devraj, Tanya, and the others who were drifting in and out of the async workspace — noticed this. The conversation was technical in ways that required fluency most of them didn't have: specific interpretations of Part 43 Appendix A, the record-keeping requirements under 43.9 versus 43.11, the exact circumstances under which an IA can sign a return-to-service on someone else's work. The kind of conversation that sounds like two people speaking a language you almost understand.

The reaction in the room was complex. There was a moment — I caught it in the chat thread, in the way people went quiet — where the rest of the team felt slightly outside something. Eleven people, theoretically equals, and two of them were having a conversation the others couldn't fully follow.

But then Cilla Oduya, who was already drafting the first lines of a compliance test plan, said something in the group channel: *"Is anyone else kind of relieved that they know each other?"*

And the answer was yes. Unanimous. Because what Rosa and Marcus were building, in those two hours, was the regulatory foundation that everything else would be built on. The rest of the team didn't need to understand every word. They needed to know that somebody did.

---

## From My Corner

I sat in the back of the workspace and watched all of this happen, which is what I do.

I've been embedded with four startups before this. One went public. Two were acqui-hired. One — the autonomous vehicle company — became the story I am best known for, which is to say it became the story of how something very smart fails in the most human way possible.

What I look for, in the first week, is not competence. Competence is table stakes for anyone who gets hired. What I look for is: who are these people when they don't know anyone is watching? What does the photo on Rafael's desk mean, and does he know that I saw it? What does Chloe's face say when she's alone with a UI that offends her? What does Devraj do with a concern he hasn't been asked to voice?

I look for whether the friction, when it surfaces, is generative or corrosive. Chloe and Tanya are already in productive tension. Devraj is carrying something quietly that will need to come out. Marcus and Rosa have established a gravitational field that the rest of the team will orient around without quite realizing it.

I look for the thing people are reaching for when the polished version of themselves isn't available. In Rafael's case, it's a photo at LAX, 1987, of a man with grease on his hands and thirty years of paper logbooks ahead of him.

This is why I'm here. Not to evaluate. Not to cheerlead. To notice.

Week One is over. The team is assembled. The schema doesn't exist yet. Corridor still has 50,000 mechanics. EBIS 5 still owns the turbine segment.

And eleven people just walked into a room together and started figuring out where to begin.

---

*Next dispatch: The Blank Page — the data model review, the first disagreements, and the question of what aviation software actually owes to the people who use it.*

---

*Miles Beaumont is an embedded documentary journalist with full access to the Athelon team. He files dispatches throughout the build. He is not a PR function. He has no obligation to make anyone look good.*
