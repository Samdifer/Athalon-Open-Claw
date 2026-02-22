# Athelon — User Personas & UX Teardown
**Author:** Finn Calloway, UX/UI Designer
**Contributing:** Chloe Park, Frontend Engineer
**Date:** 2026-02-22
**Phase:** 1 — Foundation
**Status:** Draft — Internal Use

---

> *I want to be honest about my frame coming into this: I've never designed for an aviation environment before. I've designed for power users under time pressure (Superhuman), and I've designed for developers who hate friction (Linear), but I've never designed for someone who is working with their hands in a cold hangar with a grease-stained tablet and gloves on. The tour of the Denver shop on Day 1 was a genuine reset for me. This document reflects what I've learned, what I've designed for at previous companies, and — critically — what Nadia has corrected me on. The corrections are noted. — FC*

---

## Part 1: User Personas

---

### Persona 1: The Lead AMT — Ray Kowalski

**Age:** 52 | **Location:** Pueblo, Colorado | **Experience:** 22 years as A&P mechanic, 14 at current shop
**Current system:** EBIS 5 (desktop, daily driver)
**Device usage:** Cracked Samsung Galaxy A-series phone (personal). Shop-provided Windows workstation. Refuses to use his phone for work, but not out of principle — out of habit.

#### Background

Ray holds his A&P certificate and has been at Sangre de Cristo Air Service for 14 years. He knows every aircraft on the field by tail number and has a mental model of each aircraft's quirks and discrepancy history. He's the first person the DOM calls when something unexpected turns up in an inspection. He's also the person everyone watches when new software is introduced — if Ray uses it, the rest of the shop follows. If Ray dismisses it, the adoption effort is over.

Ray is not anti-technology. He uses GPS approaches, glass cockpits don't faze him, and he looked up a torque spec on YouTube last week. He is anti-software-that-makes-his-job-harder. Every MRO system he's ever used has promised to save time and added three extra steps to every workflow. He's skeptical, not obtuse.

He has a specific list of things EBIS 5 does that he considers "working": keyboard shortcuts, the parts issue screen (he knows the path cold), and the work order close workflow. He will benchmark Athelon against these three things specifically.

#### A Day in His Life

**6:30 AM:** Ray arrives before the rest of the shop. He walks the hangar and makes mental notes of what's on jacks, what came in overnight. He checks the whiteboard — the official shop schedule — which is not synced with EBIS 5 and doesn't need to be, in his view.

**7:00 AM:** Opens EBIS 5 at his workstation. Reviews open work orders. His standard query: active work orders by aircraft, sorted by date opened. He knows the keyboard shortcut for this. It takes him 8 seconds.

**7:30 AM:** Briefing with the DOM (Sandra). What's priority, what's waiting on parts, what just came in. This conversation happens verbally. EBIS 5 is not involved.

**8:00–4:30 PM:** Hands-on work. He walks to the workstation (or sends a younger tech) to: log time, check parts availability, sign task cards. He does not carry a tablet. He walked to a computer 11 times yesterday — he counted once, irritated.

**4:30 PM:** End-of-day administrative work order updates. This is where he catches up on anything he should have logged during the day but didn't because the workstation was too far away. He estimates he loses 15 minutes of accuracy per day doing this from memory.

#### Primary Frustrations with Current Software

1. **Walking.** Every interaction with EBIS 5 requires going to a workstation. He has calculated (informally) that he walks ~1.5 miles per day in his shop to interact with a computer that is not at the aircraft.

2. **The parts issue screen is wrong.** "Issue" in EBIS 5 requires knowing whether the part is in the correct bin location before you can issue it. If it's been moved — which happens — the system gives an error that requires the parts manager to resolve. This blocks him. He wants to issue the part and let the parts manager sort the location later.

3. **Time logging is all-or-nothing.** He has to remember exactly when he started a job. If he's been working on something for 3 hours and hasn't logged it, he's reconstructing from memory. EBIS 5 has no running timer.

4. **The shortcut learning curve is front-loaded.** He's expert now. But for 6 months after joining the shop, EBIS 5 was genuinely painful. He had no patience for new hires who complained about it because he'd already paid the price.

5. **Reports require the DOM's computer.** He can't pull a report himself unless he's at her workstation. Anything he wants to know that isn't in his direct view requires either asking Sandra or walking over.

#### What Success Looks Like

Ray picks up his phone at the aircraft. He opens Athelon. He sees the work order for N456AB. He taps "Log Time" — it starts a timer. He goes back to the aircraft. When he's done, he taps stop. He selects the task card. He enters a note about what he found. He signs. He puts the phone in his pocket.

Total interaction: under 90 seconds. Zero walking to a workstation.

He checks the parts availability for a particular component. It's in the storeroom. He submits a request. Carlos (parts manager) gets a notification. The part is waiting at the bench when he needs it. No phone call, no walking.

#### Biggest Fear About Switching

> *"If I sign something in the new system and the FAA comes in and that signature doesn't hold up, that's my certificate. That's twenty-two years. I'm not signing my name on something in a system I don't trust yet."*

His fear is specific and legitimate: he wants to know that an electronic signature in Athelon is legally equivalent to his ink signature on a paper task card. He needs to understand — in plain language — how Athelon's signature infrastructure is defensible under 14 CFR Part 65 and Part 145. This is not a UX problem. It's a trust problem that requires education before it becomes a design problem.

---

### Persona 2: The Young AMT — Mia Chen

**Age:** 26 | **Location:** Lakeland, Florida | **Experience:** 3 years post-A&P school
**Current system:** EBIS 5 (hates it, uses it because she has to)
**Device usage:** iPhone 15 Pro (personal). Uses it for everything. Finds it baffling that she can't use it at work.

#### Background

Mia graduated from Embry-Riddle's A&P program in 2023 and joined Sun State Aviation Services in Lakeland shortly after. She's smart, thorough, and genuinely loves the mechanical work. She is deeply frustrated — almost philosophically frustrated — by the software she's required to use.

She's the person who reads the Athelon waitlist landing page and signs up with her personal email before her shop even evaluates the product.

#### A Day in Her Life

**7:00 AM:** Arrives. Gets her assignments from the whiteboard. Opens EBIS 5 on the shop computer to review her work orders. Takes 3–4 minutes to navigate to the right view. Remembers that she should have checked this the night before.

**7:30 AM–12:00 PM:** Working on a 100-hour inspection on a Cessna 172. She finds a cracked exhaust manifold she didn't expect. To document it, she takes a photo with her personal phone. Then she needs to get to a computer to enter the squawk. The nearest workstation is 60 feet away. She finishes what she's doing, walks to the workstation, enters the squawk, walks back. The photo is on her phone. She emails it to herself, then to the office email, and someone (eventually) attaches it to the work order. She has done this 40 times and finds it insane every single time.

**12:00 PM:** Lunch. She checks Aviation Stack Exchange and an A&P subreddit on her phone. Both load faster and are more useful than EBIS 5 for answering her technical questions.

**Afternoon:** Parts request. She needs a filter. She goes to EBIS 5, navigates to the parts request screen (5 clicks), enters the part number, submits. She's not sure if the request went through because there's no confirmation she can see. She asks Carlos, who confirms it.

#### Primary Frustrations with Current Software

1. **It makes her feel like she's in 2004.** This sounds superficial. It's not. Software that looks and behaves like 1998 tells you something about how the industry values the people who use it. She's skilled and she knows it, and she doesn't want to use tools that feel like they were designed before she was in middle school.

2. **Photo documentation is broken.** Taking a photo and attaching it to a record is a multi-step, cross-device, embarrassing workflow.

3. **No mobile access.** The entire shop's operational data is locked behind a workstation. Her phone, which is more powerful than the workstation, is useless for work.

4. **She can't see her own performance.** How many hours has she logged this week? How many work orders has she closed? She has no visibility into her own productivity. She finds this demotivating — she works hard and has no way to demonstrate it.

5. **Error messages are inscrutable.** When something goes wrong in EBIS 5, the error message is a database error code. She's never once understood what caused a EBIS 5 error from the error message alone.

#### What Success Looks Like

She's at the aircraft. She finds the crack. She opens Athelon on her phone. She photographs the discrepancy directly in the app. She creates a squawk with the photo attached, links it to the work order, flags it for the DOM's review. She walks back to what she was doing. The whole thing took 45 seconds.

At end of day, she can see her hours, her closed tasks, and her open items. She knows exactly where she stands.

#### Biggest Fear About Switching

That the new software will be worse than EBIS 5, which she considers a low bar to clear. She's been burned by "modern" software promises in other jobs. She will give Athelon one genuinely honest chance. If the first two weeks feel like work, she's done.

---

### Persona 3: The DOM — Sandra Mercado

**Age:** 48 | **Location:** Henderson, Nevada | **Experience:** DOM for 11 years; A&P/IA for 20; previously Line Maintenance at Southwest
**Current system:** Corridor (ENVISION Web)
**Device usage:** MacBook Pro (primary). iPhone 13. Uses both daily. Does not think of herself as "technical."

#### Background

Sandra has been DOM at Desert Raptor Aviation for 11 years. Before that, she was line maintenance at a major carrier and was part of three FAA surveillance audits. She knows how inspectors think, what they look for, and what documentation they want to see. This knowledge is the foundation of her professional confidence.

She moved Desert Raptor onto Corridor 6 years ago over significant internal resistance. It took 8 months to implement. She was the internal champion. Two FAA surveillance audits since then have gone well. She credits Corridor. She is not emotionally neutral about the system — she has professional identity tied to the decision to adopt it.

She's evaluating Athelon because Desert Raptor's Corridor bill is $6,400/month. The renewal is in 4 months. The owner (Dale) has asked her to find out if there's something better.

#### A Day in Her Life

**6:45 AM:** Coffee at home. Checks the Corridor app on her phone. (It works, barely — small text, lots of scrolling.) Looks at open work orders. Gets the general status picture.

**8:00 AM:** At her desk. Reviews the daily maintenance schedule. Corridor's schedule view is decent. She has it configured the way she likes after 6 years.

**Throughout the day:** Approval workflows. Additional discrepancy authorizations require her signature. In a good system, she'd approve from wherever she is. In practice, she drives in from lunch to sign something twice a week because the Corridor mobile experience isn't trustworthy enough to sign from.

**Friday PM:** Month-end compliance review. She audits a sample of closed work orders for completeness. This takes 3–4 hours in Corridor. It should take 30 minutes.

**Quarterly:** Works with Rusada's support team on anything that's changed. Corridor's customizability is a blessing and a curse — she could configure herself into a non-compliant state if she made the wrong setting change. She's scared of the settings page.

#### Primary Frustrations with Current Software

1. **The mobile experience is not trustworthy.** She doesn't sign compliance documents on Corridor's mobile because she's not confident the signature will display correctly in a desktop audit. This is a specific, named fear.

2. **Reporting takes too long.** Month-end compliance review should be automated. She should be able to set it up once and have it tell her when something is wrong, not spend 4 hours checking manually.

3. **Customization is terrifying.** Corridor has hundreds of configuration options. She's touched maybe 20 of them. She doesn't know what the others do. She's afraid of breaking something.

4. **The vendor relationship is opaque.** She never knows what's changing until it changes. Corridor has pushed updates that changed workflows without warning. She found out when a mechanic complained that the sign-off screen looked different.

5. **The price is disconnected from the value.** $6,400/month is expensive. She believes the system is worth something — she just doesn't believe it's worth $6,400.

#### What Success Looks Like

Sandra can approve a customer authorization for an additional discrepancy from her phone in the parking lot, with full confidence that her signature is legally valid and permanently recorded. She has a live compliance dashboard that tells her every morning if anything is flagged, missing, or incomplete — without her looking for it. Month-end review takes 30 minutes instead of 4 hours. Corridor's bill is gone.

#### Biggest Fear About Switching

> *"What if the FAA shows up on Day 45 and something doesn't print right, or a signature doesn't look right, or a record is in the wrong format? I will have done this to myself. And I will have done it to every mechanic in my shop whose signature is in there."*

Sandra's fear is about professional liability and regulatory exposure during the transition period. She needs two things before she'll commit: a simulated FAA audit in Athelon's demo environment that she can run herself, and a direct conversation with someone who understands FAA documentation standards. That person is Marcus Webb. Arrange the conversation.

---

### Persona 4: The Parts Manager — Carlos Vega

**Age:** 41 | **Location:** Tucson, Arizona | **Experience:** 12 years in aviation parts; formerly at an approved parts distributor
**Current system:** Combination of EBIS 5 (POs and inventory) + Excel (everything else)
**Device usage:** Windows desktop at his parts desk. Personal Android. Never uses Android for work.

#### Background

Carlos is the institutional memory of his shop's inventory. He knows where everything is. He knows which supplier has better lead times for Lycoming parts. He knows which work orders are waiting on parts and how long they've been waiting. He knows none of this because the software tells him — he knows it because he's been doing it for 12 years and it's in his head.

He's the person who panics a little when he thinks about taking a vacation, because nobody knows the inventory like he does. He has spent 12 years building elaborate Excel spreadsheets that shadow the EBIS 5 parts module because "EBIS 5 doesn't have the column I need." His spreadsheets are not backed up. He knows this. He loses sleep about it occasionally.

He is interested in Athelon primarily because his current workflow is fragile and he knows it.

#### A Day in His Life

**7:30 AM:** Reviews his Excel "morning list" — a manually maintained priority queue of parts requests, outstanding POs, and expected deliveries. He made this spreadsheet 4 years ago. It's 1,400 rows.

**8:00 AM – 12:00 PM:** Receiving. When a box arrives, he processes it against the PO in EBIS 5, then manually updates his Excel spreadsheet. Then physically stages the part in the correct bin. If the part has an 8130-3, he scans it into a shared drive folder named inconsistently by whoever scanned last.

**Throughout the day:** Parts requests from the shop. He gets them verbally (mechanic yells from across the hangar), via sticky note on his desk, via EBIS 5 request (which he prefers but which only 2 of the 6 mechanics actually use), or via text message (which he also prefers but is not compliant with the shop's record-keeping policy, technically).

**Monthly:** Inventory valuation for the owner. This requires exporting EBIS 5 data, massaging it in Excel, and comparing it against his shadow spreadsheet. The two never match perfectly. He has a standard set of "reconciliation adjustments" he applies every month. He does not know what causes the discrepancy. Neither does anyone else.

#### Primary Frustrations with Current Software

1. **Parts requests come from five different channels.** There is no single place where all parts requests live. He misses requests. It happens.

2. **8130-3 tracking is manual.** Scanning documents into an inconsistent folder structure is not traceability. An FAA inspector who wants the 8130-3 for a specific part gets a hunt through a network folder, not a click.

3. **The inventory never matches.** There's a persistent reconciliation problem between EBIS 5 and reality that nobody has fully solved. He suspects it's related to parts issued directly from the receiving dock before being formally entered in EBIS 5. He has no way to prevent this in the software.

4. **His spreadsheet is a single point of failure.** He knows this. It keeps him at the shop when he should be on vacation.

5. **PO tracking is separate from inventory tracking.** When a PO is open, he tracks it in EBIS 5. When it arrives, he updates EBIS 5 and his spreadsheet. If the delivery is partial, the workflow breaks — EBIS 5 doesn't handle partial receipt gracefully.

#### What Success Looks Like

Every parts request from every mechanic arrives in one queue in Athelon, with work order context. He processes it in order. When a part arrives, he scans the barcode, Athelon pulls the PO, he adds the 8130-3 number, done. No Excel. No reconciliation spreadsheet. The inventory in the software matches the physical inventory because the software enforces the process rather than trusting humans to follow it.

The DOM can pull the 8130-3 documentation for any part issued to any work order in under 30 seconds. Carlos doesn't have to do anything for that to be true.

#### Biggest Fear About Switching

His expertise will become visible. Right now, Carlos is indispensable because the knowledge is in his head. Athelon would put that knowledge in the system. He's simultaneously attracted to this (it removes the vacation anxiety) and worried about it (am I still as valuable?). He hasn't articulated this. It's there.

---

### Persona 5: The Owner/Operator — Dale Harrington

**Age:** 61 | **Location:** Flagstaff, Arizona | **Experience:** 35 years in GA; non-mechanic owner; CFI/CFII; sold his charter operation in 2019, kept the repair station
**Current system:** Whatever Sandra uses. He sees reports from it.
**Device usage:** iPad Pro (home and office). iPhone 14. Occasionally uses a Windows PC.

#### Background

Dale owns Flagstaff Aircraft Maintenance, a 6-mechanic Part 145 with turboprop and light jet ratings. He's a pilot, not a mechanic — he understands the aircraft but relies entirely on Sandra's judgment on compliance. What he cares about: is the shop making money, is the work getting done, and is he going to get surprised by the FAA.

His last surprise was 4 years ago — a ramp check at Flagstaff Pulliam found a discrepancy in a log entry on a customer's airplane. It wasn't a safety issue. But it was a conversation with an FAA inspector that Dale still mentions. He never wants to have that conversation again.

He reads the Corridor reports Sandra sends him every month. He does not fully understand them. He nods.

#### A Day in His Life

**Dale doesn't have a "day in the shop" in the traditional sense.** He's there 2–3 times per week for 1–2 hours. He has other real estate interests.

When he's in, he's asking Sandra: what's in the shop, what's going out, what's billing this week, are there any problems I should know about.

He reviews the monthly P&L his accountant sends. He cross-references it mentally with "how busy does the shop seem when I walk in." These two data points frequently disagree and he doesn't know why.

He does not want to learn MRO software. He wants a one-page summary of his shop's financial health that doesn't require knowing what EBIS 5 is.

#### Primary Frustrations with Current Software

1. **He can't see anything without asking Sandra.** If Sandra is on vacation, Dale has no visibility into his own shop.

2. **Billing is slow.** Invoices regularly go out 2–3 weeks after work completion because Sandra is the bottleneck and she prioritizes compliance over billing. Dale has lost at least $40,000 in 30+ day receivables in the past year from this delay alone.

3. **The accountant and the software don't agree.** He's not sure which one is right.

4. **He has no early warning system.** He finds out about problems from Sandra — who finds out when they've already happened. He'd like to find out when they're about to happen.

5. **He can't evaluate the shop's performance.** Which work orders were most profitable? Which customer is highest-value? Which mechanic generates the most billable hours? He doesn't know and the current system doesn't tell him in a way he can use.

#### What Success Looks Like

Dale opens Athelon on his iPad on a Tuesday morning in Scottsdale. He sees: 4 active work orders, one of which is overdue for parts, estimated billing this week of $18,400, last invoice sent 3 days ago. He sees that last month's highest-margin work was a turboprop annual on N789DE. He sees one compliance flag — a task card awaiting his DOM's signature — and it's being handled.

He puts his iPad down and goes back to his coffee. He didn't need to call Sandra.

#### Biggest Fear About Switching

Another ramp check situation. Dale doesn't care about software — he cares about not getting surprised by the FAA. If Athelon is the reason a compliance gap appears during an audit, it will be the most expensive software decision he ever made. He needs to hear — from someone credible, not a salesperson — that switching to Athelon does not create a compliance gap during transition.

---

## Part 2: UX Teardown

---

### Finn's Method

I spent 3 hours with Corridor's demo environment (ENVISION Web) and worked through EBIS 5 via screenshots, screen recordings from real shops, and a 2-hour screen-share with a power user (introduced by Nadia). I took 47 annotated screenshots of Corridor and 31 of EBIS 5. What follows is the distilled analysis.

*Note: Chloe Park (frontend) was looking at Corridor screenshots alongside me during a 90-minute working session on Day 2. Her reactions are documented at the end of this section, because they're instructive — both for what they reveal about the state of aviation UX, and for where naive "modern web" assumptions don't survive contact with hangar reality.*

---

### 2.1 The 5 Most Painful UX Moments in Corridor

#### Moment 1: Navigation Depth — Getting to a Work Order

**What should happen:** User wants to see the active work order for a specific tail number. Should be: search for tail number → see work order.

**What actually happens:** In Corridor ENVISION, the path is: Home → Production (left sidebar, Level 1) → Work Orders (Level 2) → Active (Level 3, because there's also "Pending," "On Hold," "Completed," and "Archived") → filter by Aircraft → find the tail number.

If you don't know to go to "Active" (as opposed to "In Progress," which is a distinct status), you may find nothing and conclude the work order doesn't exist. I made this mistake. I spent 4 minutes on a work order that was "Active" but that I was searching in "In Progress." The status labels are real workflow states, but they use terminology that is only intuitive if you already understand MRO workflow.

**Design failure:** The system was designed for experts who already know the workflow. There's no affordance for what to do if your mental model doesn't match the system's.

**Athelon principle:** The most common user action (find a work order for an aircraft) must be reachable in ≤2 steps from any screen. Universal search handles this — type a tail number from anywhere and get directly to the aircraft record.

---

#### Moment 2: The Multi-Save Task Card Edit

**What happens:** To update a task card in Corridor, you must:
1. Navigate to the work order
2. Navigate to the task card
3. Click "Edit" on the Task Description section → make change → Save
4. Click "Edit" on the Parts Required section → make change → Save
5. Click "Edit" on the Labor section → make change → Save
6. Return to task card overview

Each section saves independently. There is no global "save all" for the task card. This means a mechanic making 3 updates to a task card makes 6 save actions (3 edits + 3 saves), and if any one fails silently, the data is lost.

**Design failure:** This pattern comes from a time when database writes were expensive and needed to be minimized. In 2026, this makes no sense. It's a server-side save model leaking into the UI.

**Athelon principle:** Autosave on all form fields. No explicit save button in the middle of a record. A single "commit" action (sign-off or close) is the only user-initiated save that matters.

---

#### Moment 3: The Parts Request Disambiguation

**What happens:** When a mechanic needs a part on a work order, Corridor presents three options that are not obviously distinct: "Parts Request," "Parts Order," and "Parts Issue." These represent distinct stages of the parts process — you request it, the parts manager orders it, it gets issued to the work order — but the UI presents all three as separate actions available at the same level.

A new user doesn't know which to choose. They usually pick "Parts Request." This is correct, but they're not told it's correct. They're just presented with three options and a blank form.

**What I watched happen:** The Corridor demo user (someone who works at Rusada, demonstrating their own product) briefly hesitated before clicking "Parts Request." If the person giving the demo hesitates, the new user is lost.

**Design failure:** The workflow model is correct — these are genuinely distinct states — but the UI doesn't contextualize them. The user is dropped into a taxonomy without a map.

**Athelon principle:** Workflow state transitions should be initiated by the current state ("Request this part" appears only when you're viewing a work order and the part isn't on order). The next action is surfaced based on where you are, not presented as a global menu.

---

#### Moment 4: The Signature Flow on Mobile

**What happens:** Corridor's electronic signature for task card sign-off on mobile (ENVISION, mobile browser) requires:
1. Scrolling to the bottom of a long task card view
2. Finding the signature zone (small text, low contrast)
3. Tapping a "Sign" button that opens a modal
4. Entering credentials (username and password, not biometrics, not PIN)
5. Tapping a small checkbox confirming intent
6. Tapping "Sign"

On a phone in landscape mode with small font settings, the signature zone is below multiple folds of content and requires precise tapping. Step 4 — username and password — is a mobile input nightmare with full keyboard on a small screen. With gloves, it's essentially impossible.

**Design failure:** The signature flow was designed for desktop and made technically accessible on mobile. "Accessible" and "usable" are not the same thing.

**Athelon principle:** The sign-off action must be the most prominent element on the task card view when sign-off is the next step. It must support biometric authentication (Face ID / fingerprint) as the primary method. It should require zero text input from the mechanic.

---

#### Moment 5: The Invisible Status

**What happens:** In Corridor's work order list view, the status of each work order is indicated by a small colored square (roughly 8x8 pixels) in a status column. The colors are: grey (draft), blue (active), yellow (on hold), green (complete), red (overdue or compliance flag).

On a laptop in daylight, these colors are distinguishable. In the demo, I had to learn what each color meant by hovering. There's no legend visible without navigating to a help section. On a tablet at 60% brightness (realistic shop tablet lighting), grey and blue are indistinguishable.

**Design failure:** Status information is being communicated exclusively through color with no secondary indicator (icon, label, pattern). This fails basic accessibility standards and fails real-world environment standards.

**Athelon principle:** Status is always communicated by color + icon + text label. Never by color alone. This is both an accessibility requirement and a hangar-reality requirement.

---

### 2.2 The 5 Most Painful UX Moments in EBIS 5

#### Moment 1: The MDI Window Pile-Up

**What happens:** EBIS 5 uses Windows MDI (Multiple Document Interface). Every record opens in a child window inside the parent application. A power user working on multiple items simultaneously has an overlapping mess of windows. There's no task bar, no window management affordance, no spatial consistency.

The power user I screen-shared with had 9 child windows open. When I asked how he found a specific one, he said "I just open another one and close the other ones when I'm done." He's been doing this for 11 years. He's adapted to the chaos. A new user has a panic response.

**Design failure:** MDI was designed in the late 1980s for a different computing paradigm. It has no equivalent in modern software design because it failed as a pattern.

**Athelon principle:** Context is preserved, not stacked. Navigating to a new record doesn't destroy the previous context — back navigation works like a browser. Related records are surfaced in context panels, not separate windows.

---

#### Moment 2: The Cryptic Error Message

**What happens:** When something fails in EBIS 5 — a parts issue that conflicts with inventory, a signature on a work order with open items, a PO for a vendor not in the system — the error message displayed is a Windows dialog containing a database error code. Example (reconstructed from user description): "Error 3021: No current record. Contact your database administrator."

The user has no idea what "no current record" means, what caused it, or how to fix it. They either: call the parts manager, call the DOM, call EBIS 5 support, or give up and do it on paper.

**Design failure:** Error messages were written by the engineers who built the system, for an audience that doesn't exist at the user level.

**Athelon principle:** Every error message must: (1) explain what went wrong in plain English, (2) explain why, and (3) tell the user what to do next. "You can't issue this part because it hasn't been received into inventory yet. Ask your parts manager to receive it first." Not a database error code.

---

#### Moment 3: The Data-Dense Print-First Form

**What happens:** EBIS 5's work order view is designed to be printed. It is laid out like a printed form — dense text, small labels, rows of fields that mirror a physical form. On screen, this means every field is small, every label is truncated, and reading the record requires zooming in or squinting.

The user I observed printed work orders regularly. Not because he had to — because the printed form was easier to read than the screen. This is a fundamental design failure: the print artifact is clearer than the digital record.

**Design failure:** The software was designed to produce paper, not to replace it.

**Athelon principle:** The digital record is the primary artifact. Paper is a secondary output. The screen view is scannable, readable, and contextual. The print output matches what regulatory bodies want to see.

---

#### Moment 4: The Shortcut / No-Shortcut Split

**What happens:** EBIS 5's power user experience is built on keyboard shortcuts. The most common operations (navigate to work order, open parts module, create new task card) all have shortcuts. BUT: the shortcut system is inconsistent. Some screens have full shortcut support. Some screens have none. And critically, there is no discoverable shortcut reference — the list exists in a PDF manual that ships with the product.

New users operate slowly because they haven't found the shortcuts. Power users are blindsided when a screen they thought had shortcuts suddenly doesn't. There's no visual cue to indicate whether the current screen is shortcut-enabled.

**Design failure:** Keyboard efficiency was bolted on to a form application, not designed in.

**Athelon principle:** Keyboard navigation is designed in from the beginning, with consistent patterns. Every common action has a keyboard path. Keyboard shortcuts are discoverable (hover reveals the shortcut). Progressive disclosure: novice users see buttons; expert users use shortcuts; both paths are fully functional.

---

#### Moment 5: The Missing Mobile Experience

**What happens:** There is no mobile experience. The EBIS Web interface is available on mobile browsers, but it provides read-only access to a limited set of views. You can see the status of a work order but you can't log time, sign a task card, create a squawk, or request a part.

This is not a minor limitation. It means every action a technician needs to take — every action that is part of doing the job — requires walking to a Windows workstation. In a shop with 8 mechanics and 3 workstations (typical), this creates queuing, interruption, and delay.

**Design failure:** Mobile was not considered a primary interface. In 2026, this is not a design limitation — it's a market limitation.

**Athelon principle:** Every workflow action available on desktop is available on mobile. Not a reduced version. The full workflow, designed for a 6-inch screen in a noisy hangar with one hand occupied.

---

### 2.3 Shared Patterns Reflecting Outdated Design Assumptions

Both Corridor and EBIS 5 share a set of structural design assumptions that were reasonable in 1998 and are liabilities in 2026:

**Assumption 1: The user is at a desk, has two hands free, and can read small text.**
Both systems have minimum touch targets and text sizes appropriate for mouse operation. Neither was designed for a user whose other hand is holding a flashlight.

**Assumption 2: The computer is in a controlled environment.**
Both systems assume good lighting, consistent network connectivity, a large screen, and a keyboard. None of these assumptions hold in a hangar.

**Assumption 3: The user has been trained before they touch the software.**
Both systems present no in-product guidance. There are no tooltips, no contextual help, no progressive onboarding. You are expected to have completed the training course before you open the application. This made sense when software was installed on a company server and training was a deployment step. In a SaaS world, users encounter software before they've been trained.

**Assumption 4: The paper record is the truth.**
Both systems treat the software as a system of record that produces paper. The paper is what gets shown to the inspector. The digital record is intermediate. This is backward — the digital record should be authoritative, with paper as a derived output.

**Assumption 5: Compliance is the administrator's problem, not the technician's.**
Both systems concentrate compliance features in admin/DOM-level screens. The mechanic's interface is for doing the work; the DOM's interface is for checking compliance. This misses the fact that compliance starts at the mechanic level — the sign-off, the discrepancy note, the part number entry. If the mechanic's interface doesn't reinforce compliance, the DOM's review layer catches failures after the fact rather than preventing them.

---

### 2.4 UX Principles That Will Guide Athelon's Shop-Floor Design

The following principles are informed by the teardown, by the hangar tour, and by the persona interviews. They are listed in priority order.

**Principle 1: Glove-Friendly by Default**
Minimum touch target: 60px × 60px. Preferred: 72px × 72px for primary actions. Spacing between interactive elements: minimum 8px. No action requires precision tapping. Drag operations are never the only way to accomplish something important.

**Principle 2: One-Handed Operation**
Every primary workflow (log time, sign task card, create squawk, request part) is completable with one thumb. The left hand may be occupied. The screen may be rotated. The user may be walking.

**Principle 3: Minimal Navigation Depth**
The most common action for any persona is reachable in ≤2 taps from the home screen. Secondary actions in ≤3 taps. If a user needs more than 3 taps to accomplish a primary job, the information architecture is wrong.

**Principle 4: Context-Preserving Navigation**
Navigating to related information does not destroy the current context. A mechanic looking at a task card can view the aircraft's squawk history without losing their place on the task card.

**Principle 5: Status is Never Ambiguous**
Every record shows its status clearly: color + icon + text label. Status is visible without interacting with the record. The user never has to open a record to find out if it requires their attention.

**Principle 6: Errors Are Instructions, Not Codes**
Every error message tells the user what happened, why, and what to do next. Database error codes never reach the UI. Error states are visually distinct from warning states (which are different from informational states).

**Principle 7: Compliance Is Reinforced at the Point of Action**
The mechanic's sign-off screen shows what they're signing before they sign it. A clear summary: "You are certifying that [task description] was performed on [aircraft N-number] in accordance with [reference], on [date], by you, [name], certificate #[number]." No surprises about what the signature means.

**Principle 8: Progressive Disclosure for Complexity**
A new user sees simplified forms with the minimum required fields. An expert user can see all fields. Configuration and advanced options are not visible by default. The system doesn't show you a 14-field form when 4 fields are required to proceed.

---

### 2.5 Chloe Park's Reaction — A Documented Exchange

*The following is a summary of a working session between Finn Calloway and Chloe Park (Frontend Engineer) during the Day 2 UX teardown review. It is documented here because it illustrates important design constraints.*

---

**The Setup:** Finn is sharing their screen, walking Chloe through the 47 annotated Corridor screenshots. It's the first time Chloe has looked at the software in context.

---

**Chloe's First Reaction (screenshot 3: the Corridor work order list):**

Chloe: *"Wait. Is that... is that a 2003 Windows web application? That's the actual UI? That's what people use?"*

Finn: *"Yeah."*

Chloe: *"Are they... okay? Like, does anyone at Rusada have access to a browser made after 2015? I'm not being mean, I genuinely want to know what happened here."*

Finn: *"What happened is that this software was built in an era where the alternative was paper, and paper was worse. The bar was 'better than paper.' That bar got cleared 20 years ago and nobody reset it."*

Chloe: *"This looks like my university's financial aid portal. And that was embarrassing in 2015."*

---

**The productive tension (screenshot 31: the Corridor mobile signature screen):**

Chloe, after seeing the mobile signature flow, immediately:

*"Okay so this is a solved problem. You use a sticky-top action bar with the sign button, you authenticate with biometrics, you show a clean summary overlay with the task details, the user face-IDs and it's done. We could ship this in a week. This is just React Native with a bottom sheet modal."*

Finn paused.

*"Can I ask — when you say 'the user face-IDs' — where is the mechanic when they're doing this?"*

Chloe: *"At their phone. Right?"*

Finn: *"Sometimes. But sometimes they're on a ladder. Or in a confined space with a headlamp. Or their face is covered because they're spraying aircraft wash. Or it's a guy who has a beard and glasses and has never once successfully Face ID'd on the first try."*

Chloe: *"Oh."*

Finn: *"Face ID as primary authentication fails in hangar environments more than we'd expect. We need Face ID as an option — it's the right default for ideal conditions. But the fallback has to be a PIN, not a typed password. A 4–6 digit PIN with large keys that you can enter one-handed without looking."*

Chloe: *"That's... actually a more interesting design problem than I thought it was."*

Finn: *"Aviation always is."*

Chloe paused, then: *"Okay so I'm adding 'large PIN entry fallback' to my component spec. And I'm flagging that Face ID environment failure modes need to be tested in conditions that are not a normal office. Can we get someone to test authentication in a cold hangar with gloves?"*

Finn: *"I'll ask Nadia if any of our pilot program contacts will let us run a session."*

---

**The moment that reframed everything for Chloe (screenshot 44: the EBIS 5 parts issue screen):**

Chloe, genuinely: *"I don't understand why this has to be its own screen. In any modern app, this is a modal or a drawer. You don't navigate away from the work order to issue a part. You issue it in context. Why would you ever design it this way?"*

Finn: *"You wouldn't. But here's the real question — what's the data model behind this screen? When Carlos issues a part, what happens in the database?"*

Chloe, starting to think about it: *"It... creates an issue record? Decrements inventory? Links to the work order?"*

Finn: *"It does all of that. But it also — this is the important part — triggers a compliance event. The issue of a part to a specific work order, on a specific date, by a specific person, creates a traceability record that an FAA inspector might ask to see. The reason it's its own screen is because the original designers wanted to make it clear that you're doing something official. You're creating a record, not just clicking a checkbox."*

Chloe: *"Okay but that doesn't mean it needs to be a separate screen. It means the design needs to communicate the weight of the action, not interrupt the workflow."*

Finn: *"Now we agree. The question is how you communicate regulatory weight without creating navigation friction. That's the design problem we're solving."*

Chloe wrote it down. She's been thinking about it since.

---

*End of UX Teardown. Questions to Finn Calloway. Design work begins in Week 3.*
