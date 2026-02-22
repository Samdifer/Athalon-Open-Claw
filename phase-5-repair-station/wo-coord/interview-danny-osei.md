# Interview: Danny Osei — Work Order Coordinator / Customer Service
**Interviewer:** Nadia Solis (Product Manager, Athelon)  
**Observer:** Finn Calloway (UX Designer, Athelon) — observing for workflow friction and UX pain points  
**Location:** Trident Aviation Maintenance, Manassas VA — front office  
**Date:** 2026-02-22  
**Duration:** 71 minutes  
**Session type:** Discovery interview — repair station operations staff, Phase 5

---

*[Danny is at a desk that has two monitors — one with Corridor open, one with a browser showing an email inbox — and a personal whiteboard with about a dozen aircraft tail numbers written in dry-erase marker at various stages of a hand-drawn timeline. His phone rings twice in the first five minutes of the session. He lets it go to voicemail, checks who it was, and says "that's the Piper Meridian, I'll call her back when we're done." Finn notes the whiteboard. It's clearly the real scheduling system.]*

---

**Nadia:** You've got a lot going on right now — thanks for making time. Can you describe what your morning actually looks like? Before the first customer call comes in.

**Danny:** I get in around 7:30 and the first thing I do is look at my whiteboard. *(gestures at the personal desk whiteboard)* I know, it's low-tech. But it's actually accurate. I update it myself every day after I walk through the shop. Tail numbers, what's in there, roughly what stage they're at.

Then I look at Corridor to see if anything changed overnight — like if a mechanic left a note or if new parts came in. Then I check email for anything from customers.

I have a Word document that I've been calling my "status sheet" for three years. It's a table of every open work order with the tail number, the customer name, what they came in for, what we've found so far, what parts are pending, and a rough ETA. I update it every afternoon. I use it to answer customer calls because Corridor's work order screen doesn't give me enough at a glance.

**Nadia:** You've got three systems: the whiteboard, Corridor, and the Word doc. Why three?

**Danny:** Because none of them does what I need by itself. The whiteboard is the schedule — it's the DOM's and mine, it reflects reality because we update it ourselves. Corridor is the official record — work orders, task cards, all of that. But the Corridor list view just shows me work order numbers and status. I can't see what the current task is, I can't see parts status, I can't see notes without clicking into each job. The Word doc is my customer-facing brain. It has the information customers actually ask about in the format I can use to answer a call in 30 seconds.

**Nadia:** How many of those calls are "is my plane done yet?"

**Danny:** *(exhales)* At least ten a day in busy season. On a Tuesday in May, half my calls are status calls. And here's the thing — I understand it. These are people's planes. Some of them depend on the plane for their business. Some of them just love their aircraft and they dropped it off and they feel out of control. I get it. But I can't do anything meaningful with their plane while I'm on the phone telling them it's "in progress."

**Nadia:** What would you give to not have those calls?

**Danny:** I would give a lot. If every customer could log into a page and see — the aircraft is currently in bay 2, these are the tasks on the work order, these four are completed, this one is in progress right now, the next step is X — they would not call me. They'd refresh the page at midnight if they wanted to. I would still get calls, but they'd be meaningful calls. "I saw the prop came off, what did you find?" That's a call I can work with.

I wish the software would let me generate a read-only customer link for every work order. They see a customer view — translated language, no technical jargon, just status and what's pending. They don't see the internal notes. They don't see the dollar amounts in real time if I don't want them to. But they can see their plane is being worked on.

**Finn:** *[Note: "customer view" vs. "internal view" as two distinct status models for the same WO. Important design distinction.]*

**Nadia:** Tell me about the difference between what a customer should see and what the mechanic sees.

**Danny:** Totally different things. The mechanic sees task steps, sign-offs, part numbers, torque values, references to the AMM. None of that means anything to an aircraft owner who's a dentist. The customer needs to see: is the aircraft being worked on right now? What did you find? What are you doing about it? What parts are you waiting for and when do you expect them? What's the estimated completion date?

And the status language matters. In Corridor, the status options are "Open," "In Progress," and "Closed." "In Progress" covers everything from "we haven't touched it yet but the work order is open" to "the mechanic is putting the cowling back on right now." Those are not the same thing. A customer who calls on day three of "In Progress" doesn't know if we've done anything.

I want customer-facing status that means something. Things like: "Awaiting your aircraft arrival." "Aircraft received — initial inspection pending." "Inspection in progress." "Discrepancy found — authorization required." "Awaiting parts — estimated [date]." "Work complete — final inspection pending." "Ready for pickup." Seven clear stages the customer can understand without calling me.

**Nadia:** You mentioned authorization when discrepancies are found. Walk me through how that works now.

**Danny:** Mechanic finds something during an inspection. He puts a note in Corridor and tells me. I call the customer. Customer says yes or no on the phone. If it's yes, I go into the work order notes field and type "Customer verbally authorized additional work per phone call [date] [time]." Then I send them an email summary and ask them to reply with written authorization. Fifty percent of the time I get the reply back within an hour. Fifty percent of the time I'm chasing it for a day or two.

Meanwhile the mechanic can't close out that discrepancy until the authorization is documented. Or he can, in Corridor — there's nothing technically stopping him. I've had mechanics close out work orders before written authorization came in because they wanted to move on to the next job.

I wish the software would create a formal authorization workflow. Mechanic writes up a discrepancy. The system holds the work order in an "authorization pending" state. It generates an email to the customer with a link they can click to approve or decline. When they click, it timestamps the authorization, records their identity, and moves the work order forward. No chasing. No "I forgot to send the email." The system does it.

**Nadia:** Let's talk about AOG. How do you handle a situation where something on an aircraft turns out to be much more urgent?

**Danny:** AOG is different from everything else. When a work order goes AOG — aircraft on ground, can't fly — everything stops being normal. That plane is priority one. Parts get expedited regardless of cost. Mechanics shift off other jobs. I'm calling the customer every few hours whether they ask or not. It's a completely different operating mode.

In Corridor, AOG is a checkbox I can tick in the work order. It doesn't actually *do* anything. It doesn't reprioritize the parts queue. It doesn't move the work order to the top of everyone's list. It doesn't change what the DOM sees on her screen. It's just a tag that says "someone flagged this."

I wish the software would treat AOG as a system state, not just a label. When a work order goes AOG, it should be visible everywhere: at the top of every technician's work queue, at the top of the parts manager's list, at the top of the DOM's dashboard. There should be a timestamp on when it went AOG and a running elapsed time visible to everyone in the shop. Nothing makes a Part 145 shop look more professional to a customer than an AOG being handled with visible urgency. And nothing makes it look worse than "yeah, we flagged it as AOG but things are pretty busy."

**Finn:** *[AOG as a cross-cutting system state affecting queue order, notifications, visible elapsed timer across all roles.]*

**Nadia:** When you hand a work order off to billing and it comes back with issues, what kinds of things are wrong?

**Danny:** Usually one of three things. Task card wasn't completed — a mechanic left a step unsigned and nobody caught it until I reviewed the work order on the way out. Parts on the job don't match the task card — something was swapped out during the job and the parts record wasn't updated. Or there's a discrepancy that was found and documented but customer authorization is missing.

I do a manual review before every work order hits the billing queue. I look at every task card, I look at the parts list, I look at the authorization records. It takes me 15–20 minutes per work order depending on how complex it is.

I wish the software would do that review automatically. Show me a pre-close checklist when I try to move a work order to billing. "Task cards: 7 complete, 0 unsigned." "Parts: all installed parts have documentation on file." "Discrepancies: 3 found, 3 authorized." Green means ready to close. Red means here's what's missing, go fix it.

**Nadia:** One more question. If you could only fix one thing about how software handles your job today, what would it be?

**Danny:** Real-time status. I need to see what's happening on the floor without calling someone or physically walking out there. When a mechanic signs off a task step, I want to see that. When a part gets issued, I want to see that. When the aircraft moves from the shop to the run-up pad, I want to see that.

Not because I'm micromanaging. Because customers call me. And I can either be the person who knows what's happening and can tell them something real, or I can be the person who says "let me check and call you back" seventeen times a day. I want to be the first one. Right now, Corridor makes me the second one.

*[Session ends. Danny shows Nadia and Finn his Word document status sheet — it's 47 rows long and covers every aircraft currently in work or awaiting scheduling. Finn photographs it with Danny's permission. It becomes the primary design reference for the Athelon customer-facing status feature.]*

---

## Product Requirements Captured — Danny Osei

| # | Requirement | Priority | Source Quote |
|---|---|---|---|
| PR-DO-01 | Customer-facing read-only portal link per work order: distinct status language, no internal technical data, no internal cost data unless explicitly shared | Critical | *"Generate a read-only customer link for every work order"* |
| PR-DO-02 | Customer-visible status must be a separate field from internal status, with predefined human-readable values distinct from technical workflow states | Critical | *"Status language that means something"* |
| PR-DO-03 | AOG flag must be a system-level state that cascades across all user queues: top of tech queue, top of parts list, top of DOM dashboard; must include elapsed-time counter | Critical | *"AOG as a system state, not just a label"* |
| PR-DO-04 | Discrepancy authorization workflow: system-generated customer email with click-to-approve link; work order held in "authorization pending" state until authorization event is logged | High | *"Formal authorization workflow"* |
| PR-DO-05 | Pre-close checklist: automated validation at work order close — task cards complete, parts documented, discrepancies authorized — with specific resolution guidance for each failure | High | *"Pre-close checklist that does the review automatically"* |
| PR-DO-06 | Real-time work order status update: when a task step is signed, a part is issued, or a status changes, the coordinator's view must update without manual refresh | High | *"When a mechanic signs off a step, I want to see it"* |
| PR-DO-07 | Work order list view must surface: current task in progress, parts-pending status, authorization-pending flags, and AOG designation — without requiring click-through to each record | Medium | *"Corridor shows work order numbers and status. I can't see anything meaningful without clicking into each job"* |
| PR-DO-08 | Verbal authorization log: structured record capturing date, time, customer identity, scope of authorization, and follow-up email status — not a free-text notes field | Medium | *"No chasing"* |
| PR-DO-09 | Status options in customer view must be curated and role-gated: coordinators define what customers see; mechanics see their own technical view | Medium | *"Different fields. The customer sees translated language."* |

---

*Interview conducted by Nadia Solis. UX observations by Finn Calloway.*  
*Document prepared 2026-02-22.*
