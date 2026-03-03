# Dispatch 02 — The Stack Decision

**Dateline:** Athelon HQ, End of Week Two  
**Filed by:** Miles Beaumont, Embedded Documentary Reporter

---

By Thursday afternoon, the phrase everyone used was “leadership mandate,” which is startup language for *the decision is made, now make it real*.

The mandate arrived with four explicit constraints and very little room for interpretation:

1. The web application will be primarily TypeScript.
2. Convex is the backend and database layer.
3. Clerk is the authentication system.
4. Vercel is the hosting and deployment platform.

In another context this would be routine platform direction. Here it landed in the middle of a team still defining its first-principles architecture for a regulated product where the data model is the product. Nobody objected to the choices individually. What changed was the sequence of work: a group that had been evaluating what *could* be done now had to decide what would be done, in what order, with which tradeoffs explicitly accepted.

Rafael called an architecture review for the next morning. Agenda line one read: **“Reconcile regulatory model with stack reality.”**

That was the week.

---

## What Changed When the Stack Was No Longer Abstract

Before the mandate, Phase 1 had a familiar ambiguity: broad agreement on outcomes, flexible assumptions on implementation details. After the mandate, ambiguity narrowed.

The new stack constraints forced three immediate shifts:

### 1) Data model decisions had to account for Convex write semantics, not just conceptual correctness

Rafael’s architecture draft correctly separated mutable work orders from immutable maintenance records. Regulatory reviewers (Marcus and Rosa) endorsed the principle quickly. But Devraj’s implementation notes surfaced an engineering reality that mattered immediately: embedded `TaskCardStep[]` objects inside parent task cards would create contention under concurrent mechanic sign-offs in Convex.

This wasn’t theoretical. In an active shop, two mechanics can sign separate steps on the same task card within seconds. In the proposed shape, both writes hit one parent document. Convex handles correctness, but with retries and latency overhead. For a platform promising shop-floor responsiveness, that is an avoidable bottleneck.

Devraj’s phrasing in his schema notes was characteristic: calm, specific, slightly delayed. He had implemented Rafael’s shape faithfully and documented the conflict path, then held the objection for review.

By Friday, the team was aligned: task card steps are moving toward separate table treatment for concurrency and per-step auditability. Regulatory posture is unchanged; execution posture improves.

### 2) Authentication became a product-surface topic, not just an infrastructure checkbox

Once Clerk was confirmed as standard, signature defensibility moved from policy discussion into concrete implementation sequencing. Marcus and Rosa had already defined the legal bar: signatures must be attributable, verifiable, and tamper-evident; signed records must be immutable with correction entries, never silent edits.

With Clerk fixed in the stack, the team began mapping exactly which events must be captured at sign time:
- authenticated identity event
- technician legal name and certificate snapshot at signing
- record hash over signed payload
- timestamp and certificate validity-as-of-sign-date

This alignment mattered because it connected three previously separate conversations: Finn’s trust concerns in the mechanic UI, Marcus’s AC 43-9C requirements, and Devraj’s immutable-record schema design.

### 3) Deployment discipline stopped being optional background work

Jonas’s infrastructure document already positioned Vercel + Convex + Clerk + Cloudflare as the operational baseline, but leadership’s stack lock made his timeline gating real. Preview environments, branch-to-preview flow, migration guardrails for breaking schema changes, and retention export architecture moved from “good DevOps hygiene” to “Phase 1 dependency.”

In practical terms: no one can pretend infrastructure hardening is a Phase 3 concern while defining immutable legal records in Phase 1.

---

## High-Level Progress Summary (Phase 1, Concrete Work Completed)

The team is still early, but this is no longer just staffing and orientation. The following work artifacts now exist and are actively shaping decisions:

### Product and Market Foundation
- **Competitive teardown completed** (`phase-1-data-model/competitive-teardown.md`, Nadia Solis)
  - Detailed Corridor and EBIS 5 strengths/weaknesses
  - Explicit “must not lose” areas: compliance depth, parts traceability
  - Clear opening thesis: onboarding speed, mobile usability, real-time visibility

- **Phase 1 PRD draft completed** (`phase-1-data-model/prd-phase-1.md`, Nadia Solis)
  - Scope boundaries defined (no feature creep into billing UI, customer portal, multi-site)
  - Exit criteria set (including compliance sign-off and audit simulation)
  - Success metrics quantified (schema completeness, edge-case coverage, query performance, mobile payload constraints)

- **Persona + UX teardown completed** (`phase-1-data-model/user-personas-ux.md`, Finn Calloway)
  - Five concrete operator personas with workflow pain points
  - Corridor/EBIS UX failure points documented in operational terms
  - Shop-floor UX principles established (glove-friendly targets, one-handed operation, status clarity)

### Regulatory and Domain Foundation
- **Regulatory requirements specification completed** (`phase-1-data-model/regulatory-requirements.md`, Marcus Webb + Rosa Eaton)
  - Explicit mapping to 14 CFR Parts 43, 65, 145
  - Non-negotiable requirements listed (immutability, certificate traceability, AD retention, discrepancy disposition structure)
  - Critical distinction formalized: mutable work-order workflow vs immutable maintenance/inspection records

### Architecture and Data Foundation
- **Core data model architecture draft completed** (`phase-1-data-model/data-model-architecture.md`, Rafael Mendoza)
  - Entity system across aircraft, work orders, discrepancies, task cards, maintenance records, AD compliance, parts provenance, 8130-3, return-to-service
  - Aircraft-centric record ownership logic articulated for indefinite-retention records
  - Immutability and correction-entry model defined for legal record defensibility

- **Convex schema draft completed** (`phase-1-data-model/convex-schema.md`, Devraj Anand)
  - TypeScript/Convex table design translated from architecture
  - Index coverage specified for key query paths
  - Implementation caveat identified: task-card-step concurrency issue under embedded model

### Platform and Compliance Readiness Foundation
- **Infrastructure foundation draft completed** (`phase-1-data-model/infrastructure-foundation.md`, Jonas Harker)
  - Environment strategy (dev/staging/prod)
  - CI/CD workflow and migration controls
  - FAA retention architecture and S3/Object Lock backup strategy
  - SOC 2 gap analysis with explicit near-term control deficiencies

This is substantial Phase 1 movement for the first two weeks. The remaining risk is not lack of output; it is integration quality between these outputs.

---

## Adaptation Under Constraint: Who Moved Fastest, Who Slowed Down

The stack mandate did not affect everyone equally.

### Fastest adapters

**Devraj Anand** adapted fastest in terms of implementation realism.

He shifted cleanly from architectural fidelity to platform-specific risk surfacing without defending his own draft for ego reasons. His handling of the task-card-step contention issue was textbook: implement as specified, document contention mechanics, bring remediation path with minimal drama.

The team’s long-term velocity depends on this behavior repeating.

**Jonas Harker** adapted fastest operationally.

Because his model already assumed Convex/Vercel/Clerk/Cloudflare, he spent little energy on tool debate and moved directly to control design: retention, secrets, pipeline gates, rollback mechanics, and audit-adjacent process gaps. In a regulated build, this is what “fast” should look like: fewer opinions, more enforceable process.

**Nadia Solis** adapted fastest in scope control.

Her PRD decisions preempted predictable drift once platform choices were fixed. She kept billing UI out of Phase 1, forced customer interviews before schema freeze, and maintained target-segment discipline. In a week where the team could have chased implementation excitement, she kept Phase 1 from turning into Phase 2 prematurely.

### Moderate adapters

**Marcus Webb and Rosa Eaton** were not “fast” in the sprint sense, but they were consistent.

The new stack constraints did not change their acceptance criteria, which is precisely their value. Their posture remained: if the artifact fails regulatory logic, speed is irrelevant. They adapted by translating fixed tooling into compliance evidence requirements rather than reopening regulatory arguments.

**Chloe Park** adapted quickly to TypeScript/Vercel certainty, but still required grounding on aviation-specific execution conditions.

Her initial instinct toward modern interaction patterns remains an asset. The constraint adaptation came when she stopped treating authentication and signatures as generic web UX and started designing around hangar conditions, fallback flows, and compliance-weighted actions.

### Slowest adapters

“Slowest” here is not incompetence; it is friction under new constraints.

**Rafael Mendoza** was the slowest to adapt emotionally to stack finality.

He had been operating from architecture-first optionality and prefers maximal design control before commitment. The mandate reduced optionality before he had finished exploring all branches. The result was predictable: a brief period of over-modeling and defensive completeness.

To his credit, this did not become obstruction. By week’s end, he was aligning architecture decisions to Convex/TypeScript realities and integrating Devraj’s concerns.

**Finn Calloway** slowed where tooling intersects legal meaning.

Their UX work is strong and specific, but the stack decision made signature and auth behavior concrete faster than typical UX exploration cycles. Finn adjusted by partnering more directly with compliance and frontend engineering, but this is still an active adaptation area: translating legal-signature gravity into low-friction interaction patterns without theatrical “are you sure?” overload.

---

## The Actual Work Rhythm in Meetings

A pattern has emerged in architecture sessions.

Rafael opens with system intent. Marcus narrows to legal requirements. Devraj translates to data shape and write behavior. Jonas asks what breaks in deployment and evidence capture. Nadia checks scope. Chloe and Finn test usability burden against real workflows. Tanya asks whether any of it survives offline and poor connectivity.

When this sequence holds, progress is good.

When it skips Tanya or compliance review late in discussion, rework risk rises immediately.

One practical example: the task-card-step model issue. In a pure backend room, it is a contention problem. In this team’s full sequence, it became four problems at once:
- contention and latency (Devraj)
- per-step legal traceability clarity (Marcus/Rosa)
- mobile/offline signing resilience (Tanya)
- user mental model of what is signed and when (Finn/Chloe)

That is the right kind of complexity: integrated early, not discovered at test freeze.

---

## What the Stack Decision Clarified About Athelon’s Strategy

The team now has a clearer build identity than it did in Dispatch 01.

Athelon is not trying to out-enterprise incumbents by reproducing their implementation economics. It is trying to compress time-to-trust:
- trust from DOMs that records are defensible
- trust from mechanics that workflows don’t punish them
- trust from owners that operational visibility is real
- trust from auditors that records are complete and retrievable

TypeScript + Convex + Clerk + Vercel is not the strategy by itself. It is the operating constraint set through which this trust has to be delivered.

The danger is mistaking tool modernity for compliance adequacy. The current team does not seem likely to make that mistake, but the pressure will increase when customer pilots begin and feature requests arrive faster than architecture can safely absorb.

---

## Next Week: Risks and Decision Points

If next week goes well, Phase 1 stays on rails. If it goes poorly, the team accumulates hidden debt under polished documents.

### Key risks

1. **Schema freeze pressure before concurrency and edge-case resolution**
   - Risk: locking entity shapes before resolving task-card step modeling, offline mutation semantics, and discrepancy edge paths.
   - Impact: expensive refactor in Phase 2 with compliance risk.

2. **Signature implementation ambiguity**
   - Risk: assuming Clerk auth events plus a hash are sufficient without explicit legal defensibility package.
   - Impact: late discovery during audit simulation or pilot due diligence.

3. **Record ownership and transfer model remains underspecified**
   - Risk: indefinite-retention records are aircraft-scoped in principle, but transfer mechanics across organizations remain deferred.
   - Impact: future legal/product conflict when aircraft changes operator.

4. **Infrastructure controls trail schema maturity**
   - Risk: strong data model with weak operational controls (access reviews, MFA enforcement, monitoring).
   - Impact: SOC 2 readiness slip and avoidable compliance narrative weakness.

5. **Customer discovery lag**
   - Risk: schema decisions harden before enough real Part 145 interview feedback on carry-forward discrepancies, owner authorization patterns, and parts workflow variance.
   - Impact: building a theoretically correct model that misfits shop reality.

### Decision points required next week

1. **TaskCardStep data shape decision**
   - Embedded array vs dedicated table (likely dedicated).
   - Must decide now to avoid migration churn.

2. **Electronic signature technical standard decision**
   - Confirm exact signature evidence model (auth event linkage, payload hash, correction chain handling, fallback auth flows).
   - Must be documented jointly by engineering and compliance.

3. **Aircraft-scoped permanent record transfer strategy decision**
   - Define minimum viable transfer policy and schema hooks now, even if full workflow is Phase 2.

4. **Phase 1 control baseline decision**
   - Enforce MFA for privileged roles now or defer explicitly with accepted risk.
   - Finalize minimal monitoring/alerting baseline tied to production-like staging.

5. **Schema freeze gate criteria decision**
   - Reconfirm that no freeze happens before at least three customer discovery interviews and midpoint compliance review outcomes are integrated.

---

Two weeks in, this still looks like a team building from first principles rather than costume-matching startup pace. The stack decision removed optionality, which is uncomfortable but useful. The work now is less about declaring modern architecture and more about proving that modern architecture can carry the legal and operational weight of a signed maintenance record in a real shop.

That proof is not in the deck. It is in the next seven days.

---

*Miles Beaumont is an embedded documentary journalist with full access to the Athelon team. He files dispatches throughout the build. He is not a PR function. He has no obligation to make anyone look good.*
