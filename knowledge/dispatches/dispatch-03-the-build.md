# Dispatch 03 — The Build

**Dateline:** Athelon HQ, End of Phase 2 Design Sprint  
**Filed by:** Miles Beaumont, Embedded Documentary Reporter

---

Phase 2 produced documents. Collectively: six work order mutations, four parts mutations, a task card execution engine with seventeen test cases, a frontend component plan with forty-seven components across four delivery waves, an AD compliance module with explicit citations to 14 CFR § 39.3, and a sign-off flow with nine mandatory preconditions before an aircraft can be legally returned to service.

None of this is running code.

What Phase 2 delivered is a set of contracts — between the engineering team and the regulatory framework, between the frontend and the backend, between what the product claims to do and what it will actually do under an FAA inspection. Whether those contracts hold when implementation begins is what Phase 3 will determine.

Here is what Phase 2 actually produced.

---

## High-Level Progress Summary: What Phase 2 Generated

**Work Order Engine** (`phase-2-work-orders/work-order-engine.md`): Six core mutations fully specified — `createWorkOrder`, `openWorkOrder`, `addTaskCard`, `completeTaskCard`, `closeWorkOrder`, `voidWorkOrder`. The state machine diagram alone covers nine distinct statuses with eleven valid transitions and two terminal states. Each mutation has a numbered guard sequence. `closeWorkOrder` has six explicit preconditions before the record writes. The invariant-to-test-case table maps twenty named invariants (INV-01 through INV-20) to corresponding test case IDs. Nine queries are specified. Devraj's implementation notes are embedded throughout.

**Task Card Execution Engine** (`phase-2-task-cards/task-card-execution.md`): The document Rafael calls a "companion" to the work order engine. In practice, it's as substantial. It specifies `createTaskCard`, `assignStep`, `completeStep`, `signTaskCard`, and `returnTaskCard`, plus the interruption handling model (shift changes, parts holds, deferred maintenance). It also surfaces two schema extensions that schema-v2 cannot support: `taskCardStepCounterSignatures` and `taskCardInterruptions`. These are new tables. The frozen schema needs amendment. Seventeen test cases mapped.

**AD Compliance Module** (`phase-2-compliance/ad-compliance-module.md`): Marcus and Devraj. The mutation pair — `recordAdCompliance` and `markAdNotApplicable` — plus the live-query `checkAdDueForAircraft`. What distinguishes this document from a standard backend spec is Marcus's explicit statement that this module is "the floor," not a feature. He names the scenario: open AD, signed logbook, someone dies, shop loses its certificate, company ends. The document is written in that register throughout.

**Parts Traceability Module** (`phase-2-parts/parts-traceability.md`): Devraj and Nadia. Four core mutations: `receivePart`, `installPart`, `removePart`, `tagPartUnserviceable`. Plus `getPartTraceabilityChain`, which resolves a complete provenance chain from an installed part back through its 8130-3 tag, installation history, maintenance record, and signing certificate. The 8130-3 block mapping — nineteen form blocks translated to typed Convex fields — is here, along with the `chainComplete` boolean and `chainGaps` array that surfaces traceability failures before they become audit findings.

**Frontend Architecture** (`phase-2-frontend/frontend-architecture.md`): Chloe, with Finn annotations. Forty-seven components across four delivery waves. The route structure is finalized. The three-layer auth model — Clerk middleware, layout-level org check, Convex server-side enforcement — is specified. The optimistic update scope is defined (time logging and notes: yes; sign-off and part issuing: no). `useOrgRole()` is the mechanism. The Week 1 sprint plan is granular to the day.

**Sign-Off and RTS Flow** (`phase-2-signoff/signoff-rts-flow.md`): Marcus and Chloe together. The `authorizeReturnToService` mutation has nine preconditions. There are twenty-seven typed error codes. The six-step UI wizard is mapped to component names. The audit log entries required at each step of the sign-off chain fill a table. Six open items remain unresolved before implementation can begin.

The decision landmarks across Phase 2, by my count: the `signatureAuthEvent` as single-consumption cryptographic handshake (not just a database field — a regulatory artifact); the `taskCardStepCounterSignatures` table as the first confirmed schema extension (the frozen schema cannot model dual sign-off without it); the `checkAdDueForAircraft` query's requirement to compute overdue status from live aircraft hours rather than cached fields; and the `returnToService` record's hash computation over all fields before insert, making any post-creation alteration detectable. These are the specification's load-bearing decisions.

---

## The Moments That Mattered

**The moment Marcus wrote "someone dies."**

In the AD compliance document's prefatory note, Marcus wrote: "If this module is wrong, aircraft with open ADs get signed off. Someone dies. The shop loses its certificate. The company ends."

That's not boilerplate. That's the first time, in all the documents I've read over these weeks, that the consequence chain was stated this plainly. It changed the room — not dramatically, not with anyone breaking stride, but something settled. The team had already been working in the register of "this matters," but that sentence made it concrete. AD compliance is not a feature with a backlog priority. It's the thing that, if it fails, ends the company in a particular way.

The technical consequence: every guard in `checkAdDueForAircraft`, every hard block in the RTS precondition chain, every prohibition on computing overdue status from cached fields traces back to that sentence. It became the implicit standard by which guard conditions were evaluated.

**The dual sign-off table discovery.**

Rafael's task card execution document surfaces the problem cleanly: the frozen schema-v2 has a single signer slot on `taskCardSteps`. Annual inspections require an AMT signature on the work and an IA signature on the return-to-service authorization. These are, Marcus explains, different legal certifications under different regulatory authorities. The A&P certifies the work was performed; the IA certifies the aircraft is airworthy. A single signature field cannot model both.

The result: a new table request. `taskCardStepCounterSignatures`. It wasn't in the frozen schema. Now it has to be. Phase 2.1.

What was notable wasn't the technical resolution — it was the moment Rafael and Devraj agreed that the Phase 1 schema, which had been treated as the stable foundation for everything built in Phase 2, needed amendment before Phase 2 implementation could begin. That's not a failure. It's the system working correctly: design against a spec, discover the spec's edge cases, amend the spec before building. But it recalibrated the team's confidence in "frozen" as a meaningful status. The schema is now "frozen pending known extensions." That's a different thing.

**The sign-off wizard's last screen.**

Chloe's frontend spec describes the final submission step in the RTS wizard. The submit button uses a `danger-confirm` variant. It requires a two-second hover before it becomes clickable, to prevent accidental single-clicks. Finn had annotated that the post-sign-off state must only render after the Convex mutation resolves — not optimistically — because if the UI shows "Signed ✓" before server confirmation and a network error occurs, a mechanic might walk away believing a regulatory record was created when it wasn't.

This moment matters not because of the specific UX decision, but because of the category of thinking it represents: Chloe and Finn now reason about regulatory weight in UI affordances. The distinction between "optimistic update acceptable" (time logging, notes) and "must await server confirmation" (sign-off) isn't a performance preference. It's a determination about which actions have legal permanence and which don't. That distinction is now embedded in the component design.

**The close guard catching falsified logbooks.**

In `closeWorkOrder`, a check: `aircraftTotalTimeAtClose < aircraftTotalTimeAtOpen` throws with the message "A time-at-close less than time-at-open is the single most reliable indicator of falsified logbooks in FAA enforcement actions." 

Marcus wrote that annotation. Devraj implemented the throw. The decision to make it a hard throw — not a warning, not a soft error requiring an override with a reason — was deliberate. It's not that the system assumes bad intent; it's that no legitimate scenario produces that condition, and the right response to a potentially falsified logbook entry is to stop, not to ask for a reason.

The team agreed on this quietly and moved on. It took about four minutes in a review. That's the kind of decision that rarely shows up in postmortems but turns out to matter.

---

## Who Surprised You

**Marcus, consistently.**

The regulatory documents were expected to be thorough. What I didn't anticipate was Marcus writing beyond the compliance minimum. His annotations don't just cite the regulation and move on — they explain the failure mode, name the enforcement scenario, and specify the consequence. "An annual inspection step signed by a technician whose IA expired on March 31 — even by one day — is a regulatory violation. The check is strict: if `iaExpiryDate < now`, it throws. There is no grace period in the regulations."

That's a document written by someone who has been in the room when those conversations happen. Not theorizing about FAA inspections. Remembering them. His annotations are the difference between a compliance spec and a compliance education.

**Nadia, for the right distinctions.**

Her embedded notes in the parts module are where it's clearest. She pushed back on a hard block for low remaining life on life-limited parts — not to reduce safety, but because mechanics sometimes knowingly install a part with minimal remaining life to cover a single ferry flight. That's a legal operation. A paternalistic hard block forces workarounds. The decision: block at zero, warn below ten percent, leave the call to the certificated technician. That's not a PM softening a safety feature. That's someone who distinguishes between policy and engineering.

**Chloe, for absorbing the weight.**

The question going into Phase 2 was whether Chloe would fully absorb the regulatory stakes. She has. Her enumeration of what gets optimistic updates and what doesn't is precise and correct. The sign-off mutation must await server confirmation before showing "Signed ✓" — not a performance preference, but a determination about which actions have legal permanence. Her three-layer auth model reflects a designer who has stopped treating regulatory requirements as constraints on UX and started treating them as the design material itself.

**Devraj, for saying so.**

Every time Devraj's implementation notes flag a problem, they do so clearly. The counter-signature table gap. The requirement to use live aircraft hours rather than cached next-due fields. He documents the caveat, holds it for review, brings a resolution path. He doesn't commit to the wrong thing in order to keep moving. In a system with this much moving complexity, that behavior is load-bearing.

---

## What the Product Actually Is Now

After Phase 2, Athelon is — theoretically — a state machine enforcement layer with a compliance evidence chain attached.

In plain English: it is software designed to make every step in the maintenance process leave a verifiable record that can survive an FAA inspection. When a mechanic signs a task card step, the system captures not just who signed it but the method of authentication, the certificate number at the moment of signing, the regulatory rating exercised, a hash of the signed payload, and the expiry status of the signer's IA if applicable. When a work order closes, six preconditions must all be true — not five, not "the important ones." All six.

What Athelon can theoretically do after Phase 2:

- Create and manage work orders through a nine-state lifecycle with enforced guard conditions on every transition
- Track task cards to individual steps, with per-step sign-off tied to cryptographic authentication events
- Model an 8130-3 airworthiness tag as structured data across nineteen form blocks, not as a PDF attachment
- Track a part's accumulated life across multiple installation cycles and block installation when life expires
- Flag an aircraft as non-compliant if any applicable AD is overdue, using live aircraft hours not cached fields
- Prevent return-to-service if IA currency has lapsed — even by one day
- Reconstruct a complete chain of custody for any installed part back to its origin paperwork
- Emit an immutable RTS record with a field hash for tamper detection

What Athelon cannot do yet: run. None of the mutations above exist as deployed code. The `taskCardStepCounterSignatures` and `taskCardInterruptions` tables aren't in the schema. Cycle tracking for life-limited parts is unimplemented. The Form 337 reference field doesn't exist. Six open items in the sign-off spec are unresolved.

The honest inventory: Phase 2 produced a precise description of a product that has not yet been built.

---

## Phase 3 Risks

**The schema is not actually frozen.**

"Frozen" meant "no changes during Phase 2 design work." What Phase 2 discovered is that two new tables and at least two new fields are required before Phase 2 mutations can be implemented: `taskCardStepCounterSignatures`, `taskCardInterruptions`, the Form 337 reference field. The question now is whether schema amendments go through full gate review or move faster. If faster, the question is what gets missed. If through full review, whether the schedule can absorb the delay.

**Backlog items are not actually backlog.**

Items tagged "Phase 2.1" include the counter-sign flow, interruption handling, the close guard for open interruptions (`BACK-TC-08`), cycle tracking for life-limited parts, and the ferry permit AD exception path. Most carry regulatory stakes. The interruption close guard means a work order can currently close with an unresolved shift-change interruption on a task card step. That's a continuity-of-work gap. Calling it backlog defers the risk without resolving it.

**Six open items are blocking the RTS mutation.**

The sign-off document ends with a table of six unresolved items: ratings-exercised inference logic, Form 337 schema change, multi-inspector UX design, re-auth Clerk integration, RTS statement minimum content validation, and the aircraft-ownership edge case. `authorizeReturnToService` cannot be fully implemented until they're resolved. The RTS mutation is the most important mutation in the system. Six open items is not a normal launch posture.

**The customer has not yet validated the model.**

Phase 2 completed without visible evidence that real Part 145 shops validated the workflow. The work order state machine, the interruption type taxonomy, the discrepancy disposition structure — theoretically correct per the regulatory requirements. Not yet pressure-tested against how a shop with fifteen mechanics and forty aircraft actually moves paperwork on a Tuesday when two mechanics call in sick and the IA is at another facility. That gap is the kind of thing you discover in pilot deployments. It needs to be named as a risk rather than assumed resolved.

**Theory under load.**

Phase 2 designed for clean conditions: every auth event consumed atomically, every precondition evaluated against populated records, every technician's certificate data current. Real implementations encounter partial data, migration states, and the offline edge conditions Tanya has been flagging since Phase 1. The invariants are right. The test cases map to them. What Phase 3 determines is whether the implementation handles the space between the invariants.

Phase 2 was the design. Phase 3 is the proof.

---

The documentation is honest. The team knows what they've built and what they haven't. What Athelon is right now is a precise specification for a compliance enforcement layer that, if built correctly, would be harder to fake and easier to audit than anything in the market.

Whether it gets built correctly is what Phase 3 determines.

---

*Miles Beaumont is an embedded documentary journalist with full access to the Athelon team. He files dispatches throughout the build. He has no obligation to make anyone look good.*
