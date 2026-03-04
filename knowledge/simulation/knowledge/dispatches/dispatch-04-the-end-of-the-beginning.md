# Dispatch 04 — The End of the Beginning

**Dateline:** Athelon HQ, End of Phase 4
**Filed by:** Miles Beaumont, Embedded Documentary Reporter

---

The photo on Rafael Mendoza's desk is still there. Black and white. Small. A man at LAX, 1987, with safety wire in hand and his head inside an engine nacelle.

I've been thinking about that photo since the first week. His father spent thirty years documenting every bolt he touched, every system he inspected, every airworthiness directive he complied with — in paper logbooks, with a pen and a signature that meant *I am legally certifying that this aircraft is safe to fly.* The accountability was real. The system for producing and preserving those records was, by every modern standard, inadequate.

Rafael saw that inadequacy from the inside. He's been in aviation software for fourteen years. He knows exactly where the paper system breaks: transfer of ownership, legibility under inspection, the gap between what the regulation requires and what a handwritten entry can prove. He knows what happens when an FAA inspector opens a logbook and finds an anomaly — not abstractly, but in the specific, expensive detail of a Part 145 shop reconstructing its records chain while its certificate hangs in the balance.

He took this job to build the thing that should have existed while his father was still working.

So it is not a small thing that the most consequential mutation in the system — `authorizeReturnToService` — now enforces nine preconditions before it will allow a mechanic to release an aircraft.

Nine.

Not "are all the boxes checked." Nine discrete, sequenced, hard-blocking conditions, each one corresponding to a specific regulatory requirement, each one written into the code with an error message that names the CFR citation and explains, in plain language, why it cannot be bypassed.

Before the system writes the return-to-service record, it verifies: that the signature auth event is valid, unconsumed, unexpired, and issued for the correct table. That the work order is in the correct state. That the aircraft total time is internally consistent — and that any inconsistency is flagged not as a data error but as a potential falsification indicator. That every task card is complete or voided. That every discrepancy is dispositioned, and that every MEL deferral has all required fields populated and hasn't expired. That the signing technician is active, holds a current certificate, and — if the work order is an annual inspection — holds a current Inspection Authorization that has not lapsed by even one day. That AD compliance has been reviewed and documented. That all maintenance records are signed. That the RTS statement itself is substantive — not empty, not a one-liner, but at least fifty characters of legal certification language.

When all nine conditions are satisfied, the system writes an immutable record with a deterministic hash over all the required fields. After creation, there is no `updatedAt` field. Any database-level tampering would change the document without changing the stored hash. Auditors can check.

What does it mean that we built this? It means that the legal record of a return-to-service is produced by a system that cannot be talked into skipping a step. You cannot rationalize your way past an expired IA. You cannot close a work order with an unsigned task card and then create an RTS record manually. The system says no, it says why, and it logs the failed attempt to an audit table even when it says no.

Rafael's father had none of this. He had a pen, a logbook, and his own professional judgment. The professional judgment was probably excellent. But professional judgment is not a verification system. The documentation it produced could be questioned, misread, lost, or altered. The record of thirty years of safe maintenance exists somewhere in a form that would make a modern compliance attorney uncomfortable.

What Athelon built is the system that makes that uncomfortable feeling go away. The question is: did they build it yet?

---

## What the System Is

Here is the honest inventory, as of the end of Phase 4 implementation work.

**What exists and works:**

A Convex schema of 1,500-plus lines covering every table in the aviation maintenance domain — aircraft, work orders, task cards, task card steps, maintenance records, discrepancies, AD compliance, parts provenance, 8130-3 tags, return-to-service records, signature auth events, audit log, and the organizational and personnel data that ties all of it together. Every table has appropriate indexes. Every index was designed for the specific query paths the application needs.

A backend mutation layer that enforces the regulatory model atomically. `closeWorkOrder` has eight guard conditions. `completeStep` executes a six-check signature auth event validation sequence in a single transaction. `authorizeReturnToService` enforces all nine preconditions and writes a tamper-detectable immutable record. The AD compliance module enforces blocking using live aircraft hours, not cached fields — the architectural decision that distinguishes this from what competitors get wrong.

A frontend component set that is aviation-aware in its design decisions. The sign-off flow requires server confirmation before showing a success state — not optimistic, not "probably worked," but server-confirmed — because a mechanic who walks away believing a record was created when it wasn't is a compliance failure. The task card progress display shows "X/N signed," not a percentage, because percentages imply uniform task weight, which is false. The `StatusBadge` component has thirteen variants with deuteranopia-safe icon differentiation, because hangars are not optimized for accessibility and the people who use this software sometimes cannot tell red from green.

A test suite of forty-three named test cases covering the work order lifecycle, task card execution, and AD compliance. Every test documents the specific failure mode it guards against and the regulatory reason that failure mode matters.

**What does not exist yet:**

A deployed environment. As of the Phase 3 gate review, no `npx convex deploy` has been run. The schema and mutations exist as TypeScript files. Zero functionality is accessible to a user.

A working application. The aircraft detail page is built. The work orders list page is built. The work order detail page, task card detail page, and sign-off wizard do not exist. The parts management pages do not exist. The compliance dashboard does not exist. Of approximately twelve pages needed, two are built.

Connected data flow. Every Convex API reference in the frontend is stubbed as `{} as any`. The Clerk-to-Convex webhook is not wired. The signatureAuthEvent creation endpoint doesn't exist. The PIN authentication in `SignOffFlow.tsx` creates a stub auth event ID instead of making a real server call.

Eleven mutations unimplemented at Phase 3's close — including `authorizeReturnToService`, which `closeWorkOrder` was already checking for in its fifth guard condition. The lifecycle had a dead end built into its most important guard.

A real Part 145 mechanic cannot use this software today. They could not complete a work order, sign a task card step, or release an aircraft. The system that would prevent them from doing those things incorrectly does not yet run.

What exists is a precise, regulatorily-grounded specification for a product that has not been deployed. Whether the distance between that specification and a running application is two weeks of focused work or four months of integration surprises is what Phase 4 was built to determine.

---

## The Four Who Shaped the Outcome

I have been watching eleven people for the duration of this simulation. I am going to name four of them as the ones whose specific contributions determined what Athelon became — not the most pleasant to work with, not the most visible, but the most consequential.

**Marcus Webb** is first, and not close. His contribution is not that he slowed things down, though he did. His contribution is that he rewrote the register in which the entire team understood their work. When he wrote "If this module is wrong, aircraft with open ADs get signed off. Someone dies. The shop loses its certificate. The company ends" — in a technical specification document, in the code's own companion document — he changed what kind of project this was. Before that sentence, Athelon was a well-designed compliance product. After it, Athelon was a system whose failure mode had been named, in writing, by someone who had been in the room when that failure mode happened. Every hard block in the system — every error that throws instead of warns, every condition that cannot be overridden — exists because Marcus established the standard against which guard conditions were measured. He wrote the comments in Devraj's code that explain not just what a guard does but what regulatory scenario it guards against and why there is no grace period. His annotations are an education embedded in the codebase.

**Devraj Anand** is second. The case for Devraj is not glamorous: he is the person who translated regulatory intent into transactional data writes without losing anything in translation. The six-check signature auth event consumption sequence in `completeStep` — EXISTS, UNCONSUMED, UNEXPIRED, IDENTITY MATCH, CONSUME, WRITE — executes in a single Convex transaction. The audit log write happens in the same transaction as the primary mutation. There is no path through the code where a step is signed without an audit entry. This sounds like good engineering practice. It is. It is also the specific implementation pattern that makes the resulting records survive an FAA digital recordkeeping audit — not by accident, not by policy, but because the code cannot produce a record without simultaneously producing its own evidence. The concurrent step signing problem — two mechanics signing different steps on the same task card within seconds — was identified by Devraj, held quietly until it could be reviewed, and resolved by extracting task card steps to separate documents. The resolution is correct not just for performance but for per-step legal traceability. He found the right answer to a problem that most engineers would have shipped without noticing.

**Chloe Park** is third. The case for Chloe is about a transformation that is harder to see than a schema change or a mutation guard. Chloe came in with zero aviation background and a professional background in interfaces that are used at desks, in warm rooms, by people who are not wearing gloves and are not standing in an aircraft bay at 2 AM while a charter waits on the ramp. Her early instincts — toward modern interaction patterns, toward the kind of UI elegance that earns design awards — were correct in their domain and required correction in this one. What she did with that correction is what matters. She did not compromise. She did not produce a modern-looking interface layered over a misunderstanding of the regulatory stakes. She absorbed the stakes and made them design material. The sign-off flow's requirement to await server confirmation before showing "Signed ✓" is her decision. The classification of which actions permit optimistic updates and which do not — time logging, yes; signing a maintenance record, no — is her taxonomy, and it is correct. The thirteen-variant status badge with deuteranopia-safe icons is her attention to a use environment most designers never consider. By Phase 4, she was building interfaces that reason correctly about what it means for an action to have legal permanence. That is not where she started.

**Cilla Oduya** is fourth, and she will surprise people who weren't paying attention. Forty-three test cases. Every one named. Every one tagged with the specific failure mode it prevents and the regulatory consequence of that failure. Her "Things I will NOT accept as good enough" section in the QA README is a professional standard document written by someone who has seen software ship with exactly those deficiencies and knows what happens next. What Cilla built is not a test suite — it is a contract. It defines, in advance, what the system must prove before it is allowed near a real aircraft. The fact that zero tests were passing at the Phase 3 gate — import path mismatch between her test structure and Devraj's implementation — is not a failure of the test suite. It is the test suite functioning correctly: it found a gap between specification and implementation before anyone shipped. A test suite that can't execute is better than one that executes against the wrong thing. Cilla's contract for what "done" means will outlast the simulation.

---

## The Gap Between This and Reality

A simulation captures many things well. It captured the regulatory domain with unusual fidelity — Marcus and Rosa together produced a compliance foundation that would survive peer review by aviation attorneys. It captured the architectural tensions correctly: the right arguments happened between the right people at the right times about offline behavior, concurrent writes, optimistic updates, and the exact meaning of a legally defensible signature. It captured the team dynamics in ways a real build would recognize: the engineer who holds concerns quietly until asked, the designer whose fresh eyes are both asset and liability, the PM who prevents scope from inflating.

What it couldn't capture is time. The simulation produced four phases of artifacts in a single day. Real builds produce those artifacts across months, and the friction is not just between documents — it's between schedules, between confidence levels, between what was agreed in a spec and what seemed obvious when it came time to implement.

What simulation also can't capture is the customer. Schema decisions hardened before real Part 145 shops had validated the workflow. The work order state machine is theoretically correct. It may not match how a shop with fifteen mechanics and forty aircraft actually moves paperwork on a Tuesday when two people called in sick and the IA is at another facility. The interruption handling model was designed from regulatory first principles. Real shops will have opinions. The distance between "correct per the regulation" and "correct for the way we work" is where MRO software goes to die.

---

## The Question It Leaves Open

The simulation answered a lot of questions. Whether the data model can support the regulatory framework: yes. Whether a team without deep aviation backgrounds can absorb the compliance stakes: yes, if you have Marcus and Rosa in the room and Cilla holding the gate. Whether the sign-off flow can be both mobile-friendly and legally defensible: the architecture says yes; Tanya's field verification would have to confirm it.

The question the simulation couldn't answer is this: **Will a real mechanic trust it?**

Not use it. Trust it. The distinction matters.

Adoption in aviation maintenance software is not primarily a UX problem or a feature problem. It is a trust problem. Corridor has fifty thousand mechanics not because it is better software but because mechanics have used it for years and know that when they sign something in Corridor, the record exists, it won't vanish, it won't corrupt, it will be there when the inspector comes. That trust was built by time and repetition and the absence of catastrophic failures. It cannot be designed into a product. It has to be earned by a product that works, correctly, for long enough that the people who stake their certificates on its records stop wondering whether they should worry about it.

The nine preconditions in `authorizeReturnToService` are correct. They are more thorough than anything in Corridor. They will survive a compliance audit in ways that a paper logbook cannot. But a mechanic who has signed paper logbooks for twenty years, who has never had a record fail an inspection, who understands the regulatory requirements better than most engineers who write code about them — that mechanic is going to pick up this phone and look at this dialpad and ask, in the back of their mind: *Do I trust this more than I trust my own signature?*

The answer to that question is not in the code. It's not in the test suite. It's not in the architecture review or the Phase 4 gate decision. It's in the first six months of a real shop using a real deployment and finding out whether the system that was designed to be trustworthy has, in practice, earned it.

That's where Athelon goes next. That's where everything built over these four phases either holds up or doesn't.

The photo on Rafael's desk is still small. Black and white. A man with grease on his hands and a paper logbook ahead of him.

What we built is the system that comes after the paper. Whether it's good enough is what his father's industry will decide.

---

*Miles Beaumont is an embedded documentary journalist with full access to the Athelon team. He files dispatches throughout the build. He is not a PR function. He has no obligation to make anyone look good.*

*This is the final dispatch of the Athelon simulation.*
