# Dispatch 06 — The First Session

**Dateline:** Skyline Turbine Services, KMQY / Athelon HQ
**Filed by:** Miles Beaumont, Embedded Documentary Reporter
**Status:** Pre-session — filed before Gary and Linda arrive

---

I am writing this before they get here.

That is not how I usually work. My job is to observe and then describe. But this dispatch is an act of preparation — the kind of observation that happens before the thing you're observing has occurred. I have read Gary's interview twice and Linda's interview twice and Cilla's test plan three times. I have read the MVP scope document with its precise list of deferrals. I have read the Phase 4 architecture, the schema, the nine preconditions of `authorizeReturnToService`. I know this system better than Gary and Linda do, and Gary and Linda know this domain better than I ever will, and in about ninety minutes those two forms of knowledge are going to be in the same room.

What I am doing right now is making predictions. Writing them down so that when the session is over, there is a record of what I expected and a measure of what I missed.

This is Miles Beaumont at his most precise. Not cheerleading. Not catastrophizing. Preparing to observe something that matters.

---

## What Gary Will Check First

The test plan assumes Gary begins with Step 1 — opening a new work order. Nadia will guide him toward that. But before he creates the work order, before he looks at the aircraft record, before he does anything Cilla has scripted, Gary Hutchins is going to do something else.

He is going to look at the default state of the screen.

Gary described his morning routine in the interview with a specific irritation he'd been carrying for years: Corridor defaults to showing everything, including work orders from eighteen months ago, and he has to filter it every single morning to see what's alive. It is a small thing and it happens to him every day. Software defaults are not neutral. They are design decisions about whose time matters and what the system thinks you came here to do. When Gary logs in for the first time, the first thing he will assess — not consciously, not as a test criterion, but as a reflex that comes from the repetition of being disappointed — is whether the work order list shows him what is active right now or shows him everything.

If it shows him Active first, he will not say anything. He will simply proceed.

If it shows him everything, he will pause. He won't say anything about it in the moment — Gary is not a person who leads with complaint — but I will see his expression go briefly flat, and something will shift in how much effort he's willing to give the rest of the session.

The test plan does not include a criterion for this. It is not a mutation. It is not a schema guard. It does not appear in Cilla's known gaps. It is REQ-GH-05, a line item in the extracted requirements from his interview: *the work order dashboard must default to showing Active work orders on first load.* Nadia confirmed it was already designed that way. But there is pre-seeded data in the pilot environment — test records, setup artifacts, equipment entries — and I want to see whether the Active filter is robust or whether it shows Gary a dashboard that looks, at first glance, like exactly the thing he described hating.

I will be watching when he logs in.

---

## After the Dashboard: The AD Compliance View

Here is what Gary will check before he opens a work order.

The Letter of Correction is in his desk drawer. He told Nadia it was there to remind him what the software's job is. He didn't put it there as theater — Gary Hutchins is not a theatrical person. He put it there because in 2019, a template copy function silently re-linked an AD compliance record to the wrong work order, and a surveillance inspector found the broken traceability chain, and the consequence is a document with Gary's name on it in a federal file. He remembers it by year.

When he gets into N1234A's record, Gary will navigate to the AD compliance view before he does anything else. Not the task cards, not the work order timeline. He will be looking for the thing he lost in 2019: the certainty that an AD compliance record, once associated with a work order, is bound permanently and cannot be silently moved.

He won't find that scenario in the demo aircraft. N1234A has been seeded cleanly. But he will look at the structure of the AD compliance view and measure it against his own catastrophe. When he sees that the records are append-only — supersession bidirectional, compliance history uneditable — he will not say anything.

He will write something down.

---

## The Moment the System Earns or Loses Gary's Trust

I know exactly when this will happen. I am specific because the interview was specific.

It will happen at Step 10 of the test plan: the Close Readiness Report.

Gary described his pre-release process to Nadia in precise detail. Five things, four tabs in Corridor, fifteen minutes, checking task card completions by hand because the software's status isn't granular enough. He described what he wanted instead: one screen, one checklist, green or red, clickable through to the blocking record. He asked, when Nadia described what we'd built, the only question that mattered to him: "Does it block closure if anything's red?"

In the interview, that question got him an answer. In the session, it will get him evidence.

The trust moment is not when he sees the green checklist. It is the moment before — when a prerequisite is not yet met and he sees the system surface it. During the walkthrough, there will be a constructed discrepancy: a cracked exhaust gasket, opened and resolved as Troy works through the task cards. Before it's corrected and linked to a maintenance record, the Close Readiness Report will show a red item. When Gary clicks that item and is taken directly to the open discrepancy — not to a filter, not to a list, but to the blocking record itself — that is the moment.

If the navigation works: Gary trusts the list.

If Gary clicks and lands somewhere confusing — a generic audit log, a wrong record, an error — he will not say anything immediately. He will lean back slightly. He will stop reading the screen and start thinking. Nadia will have to work for the rest of the session to recover what that one click cost.

The engineering team built the navigation as a design requirement. Whether they got it right is something the automated tests do not fully capture, because automated tests don't click. Cilla will have a browser in hand. I will be watching Gary's index finger.

---

## What Linda Will Do That None of the Engineers Predicted

Linda Paredes arrived to her interview with a yellow legal pad full of her own questions. She runs her discrepancy log in red marker on a whiteboard. She has been doing manually what the software should do — tracking every amendment through her personally, because Corridor won't enforce it.

Her core requirement was plain: if the software allows someone to create a legally insufficient maintenance record without friction, they will.

What Linda will do — what nobody on the engineering team has anticipated — is attempt to create a maintenance record with a description that is too short. Before Nadia directs her to the QCM review step, Linda will navigate to the maintenance record form on her own, outside the scripted sequence, and type something minimal — "gasket replaced" or "oil change completed" — to see if the system stops her.

She is not going to ask if it was built. She is going to check.

The engineers implemented the minimum-content enforcement at the mutation level — `workPerformed.length >= 50`, with a message citing AC 43-9C. It was Linda's requirement. Devraj built it. But Linda does not take anyone's word for it that her requirements were implemented, because in every shop she has worked in, some were implemented and some were noted and not built, and the only way to know which is which is to test the boundary.

If the block fires and she gets the AC 43-9C error message: Linda will nod, close the form, and return to the scripted sequence without comment. She will have received the information she came for.

If the block does not fire, or if the error message exists but cites nothing — if the friction is cosmetic rather than structural — Linda will look up from the screen and find Nadia, and what she says next will not be gentle. Not because Linda is unkind. Because she told them exactly what was needed and she's been waiting to see whether it was heard.

---

## Three Things I Expect to Go Wrong That Are Not on Cilla's List

Cilla's known gaps list is honest and well-considered. What it does not include are the friction points that emerge from user behavior rather than system behavior.

**First:** The aircraft total time reconciliation will confuse Gary before it clarifies.

The pre-seeded aircraft record shows N1234A at 2300.0 hours. Gary will enter 2347.4 when he opens the work order. When he looks at the aircraft record — which he will do — he will see 2300.0 and his expression will change. The system's answer — that 2300.0 is the last recorded TT and 2347.4 is the time at this WO open — is architecturally correct. But the UI explanation of the gap will not be self-evident. He will spend two or three minutes determining whether the system is wrong or whether he is.

This is not a bug. It is a gap between the data model's logic and the surface that explains it. Cilla's test assertions verify the monotonic time guard fires correctly; they do not assert that a human understands why the two values look inconsistent before the WO is opened.

**Second:** The Convex real-time update will lag under demo conditions.

When Troy signs a task card step on the tablet Nadia is operating and Gary watches his desktop for the update, there will be a moment — four seconds, maybe six — where Gary watches a screen that does not change. The architecture is correct. The subscription will resolve and the update will arrive. But Gary runs a shop where he reconciles what the hangar floor is doing with what the software shows, and that gap is his daily operational frustration. When he watches a screen for six seconds after a step has been signed and nothing moves, he will think: here is that gap again. He will not say it aloud.

The update will arrive. But the six seconds will have happened, and Gary will file it next to the Corridor experience it resembles.

**Third:** Gary will want Linda to review the work order before the RTS is authorized.

This is not in the gaps list because it is not a software bug. It is a sequence problem rooted in INV-24: a QCM review cannot be created on a work order that is not yet closed. The test plan accounts for this — Steps 10, 11, and 9 must execute in that order, Linda's review post-close. Nadia will guide them through without surfacing the internal logic.

But Gary runs a shop. His view is that the QCM reviews work before the aircraft goes out the door, not after. He will push back — gently, professionally — on why Linda has to wait. This will not be a complaint. It will be a legitimate observation about oversight sequencing that the engineers did not fully resolve: whether a post-close QCM review is equivalent, in practice, to a pre-release one. For most shops these are the same event. For Gary they are adjacent but distinct.

Nobody anticipated this because the test plan is written by engineers who understand INV-24. Gary will surface it because he understands how shops work.

---

## What Success Looks Like for Me

The test plan defines success in eight criteria — PASS-01 through PASS-08. I've read them. They are the right criteria for a software test plan.

They are not my criteria.

Gary has a laminated checklist taped to his office wall. It is his pre-release process made physical — the five items, in order, that he checks before an aircraft goes back to an owner. It represents everything the software has not done for him: the gap between what the system should provide and what he has had to provide himself, personally, on laminated paper, every time.

My definition of success is: at some point during Step 10, when Gary opens the Close Readiness Report and sees the unified checklist — all five categories, green or red, one screen — he forgets to look at the wall.

Not because he's been told to trust the software. Because the screen shows him the same information, in the same order, with better navigation and a hard gate behind it, and the paper becomes briefly redundant. He doesn't reach for it. He reads the screen.

That moment may be two seconds long. Gary won't acknowledge it and I won't write about it in the room. But I will be watching for it.

If I see it, the product has earned the right to the conversation about what comes after alpha.

---

## The Two Sentences

I carry two sentences into every session like this. One to write if it goes well. One to write if it doesn't. I write them in advance so that what I observe is not shaped by what I hoped for.

**If it goes well:**

*Gary Hutchins spent forty-eight minutes with Athelon and did not look at the laminated checklist on his wall.*

**If it doesn't:**

*The gap between what a system must enforce and what a person must still do themselves is where every MRO software product goes to die — and on Tuesday morning at Skyline Turbine Services, we measured how much of that gap remains.*

---

I will be in the room when they arrive. I will not say anything unless asked a direct question. I will take notes. I will time the step sign-off flow. I will watch Gary's face when he sees the Close Readiness Report and Linda's face when she finds the maintenance record form.

I have been embedded with this team for five phases. I have watched them build something careful and correct from a domain none of them had worked in professionally. I have watched the product become different after five real users walked in with their certifications in their bodies and their requirements in plain language.

I know what this product is. I am here to find out if Gary and Linda do.

---

*Miles Beaumont is an embedded documentary journalist with full access to the Athelon team. He files dispatches throughout the build. He has no obligation to make anyone look good.*

*Alpha pilot session: Gary Hutchins (DOM) and Linda Paredes (QCM), Skyline Turbine Services, KMQY. Facilitated by Nadia Solis. Observed by Cilla Oduya. Session clock: 90–120 minutes estimated. This dispatch filed pre-session.*
