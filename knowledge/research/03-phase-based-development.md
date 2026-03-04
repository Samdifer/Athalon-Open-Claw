# 03 — Phase-Based Development

## What Is Phase-Based Development?

**Phase-based development** organizes a software project into a sequence of discrete phases, each with a well-defined goal, a set of workstreams that produce artifacts, exit criteria that determine when the phase is complete, and a **gate review** that formally evaluates whether those criteria have been met before the team proceeds.

The model sits between pure Waterfall (where entire functional areas are completed before coding begins) and pure Agile (where work flows in continuous sprints with no formal checkpoints). Phase-based development is well-suited for **production enterprise software** where:

- Different phases require fundamentally different types of work (data modeling vs. UI build vs. compliance hardening)
- External stakeholders (customers, regulators, investors) require formal evidence of progress
- Teams are large enough that coordination without structure leads to collision and rework
- The cost of discovering an architecture mistake in Phase 12 rather than Phase 3 is very high

> **Why it matters:** Phases create natural synchronization points. Every team member knows that when Phase N closes, the work of that phase is done — not "mostly done," not "we'll come back to it." This prevents the invisible accumulation of technical debt that kills large projects.

---

## Phase Anatomy

A well-structured phase has five components:

### 1. Goal Statement

A single, clear sentence describing what the phase achieves. This is not a list of tasks — it is a statement of the **outcome** the team is trying to produce.

> Example: "Establish the core data model and backend schema supporting work order lifecycle management, with all invariants enforced and verified by integration tests."

The goal statement is the anchor for gate review evaluation. If there is any dispute about whether the phase is complete, the question is simply: "Have we achieved the goal statement?"

### 2. Workstreams

Phases are decomposed into **workstreams** — parallel tracks of work that can progress independently. Each workstream has a lead, a set of defined artifacts, and its own completion criteria.

Common workstream types:

| Workstream Type | Typical Contents |
|---|---|
| **Schema / Data Model** | Entity definitions, migration scripts, constraint enforcement |
| **Backend / Mutations** | Server-side business logic, API endpoints, invariant enforcement |
| **Frontend / UI** | Components, pages, user interactions, form validation |
| **Testing** | Test plans, integration tests, E2E test scripts |
| **Compliance / Security** | Regulatory review, penetration testing, access control verification |
| **Documentation** | API documentation, runbooks, user guides |

> **Pattern:** Keep workstreams parallel where possible. Serial dependencies create critical path bottlenecks. If Workstream B cannot start until Workstream A finishes, that is a risk that should be explicitly tracked and mitigated.

### 3. Artifacts

Each workstream produces **artifacts** — documents, code, test results, or review records that provide evidence the work was done correctly. Artifacts serve double duty: they guide the current team and they enable future maintainers and auditors to understand what was built and why.

Minimum artifact set for a phase:

- **Workstream plan** — what will be built, how, by whom
- **Implementation artifacts** — the actual code, schema, or specification produced
- **Test results** — evidence that the implementation was verified
- **Gate review record** — the formal evaluation outcome

> **Regulated context:** In regulated industries, artifact completeness is as important as correctness. An auditor may not be able to evaluate your code — but they can evaluate whether your documentation trail is complete, consistent, and tamper-evident. Missing artifacts are findings.

### 4. Exit Criteria

Exit criteria define **what "done" means** for a phase. They must be objective and verifiable — not "the feature is working" but "all integration tests in the `work-order-lifecycle` suite pass with zero failures."

Strong exit criteria examples:
- All schema migrations applied to staging with zero rollback
- 100% of defined test cases executed, 0 blocker/critical failures open
- Gate review board sign-off obtained
- All identified security findings from the threat model are resolved or risk-accepted with documented rationale

Weak exit criteria:
- "Team agrees the feature is ready"
- "Mostly working"
- "Known issues are documented" (without a threshold)

> **Anti-pattern:** Exit criteria defined after the phase is already mostly complete. This allows the criteria to be written to match the current state rather than the desired state. Write exit criteria before the phase begins.

### 5. Gate Review

The gate review is the formal evaluation of whether the phase's exit criteria are met and whether the team is ready to proceed. See the Gate Review section below.

---

## Gate Review Types

### Informal Checkpoint

A brief structured meeting where the phase lead presents completion status against exit criteria. Primarily used for internal phase transitions in a small team. Low overhead, but limited accountability.

**Use when:** Small team, low external risk, internal milestone only.

### Formal Pass/Fail Gate

A structured review with a defined set of reviewers, a pre-distributed evidence package, and a documented verdict. Reviewers have authority to pass, hold, or fail the phase. A hold means specific remediation is required before proceeding; a fail means the phase is reopened and significant rework is required.

**Use when:** External stakeholders are involved, regulatory requirements apply, or the phase transition creates a contractual milestone.

### Advisory Board Review

An external panel — domain experts, customer representatives, regulatory liaisons — reviews the phase evidence and provides guidance. The internal team retains decision authority, but external input is formally solicited and documented.

**Use when:** Novel domain (first product for a new regulated industry), high-stakes customer, or preparing for regulatory certification.

---

## Artifact Standards

Consistent artifact standards across all phases enable institutional knowledge to accumulate. When every phase produces the same artifact types in the same locations with the same structure, onboarding new team members is faster and audit preparation is simpler.

### Minimum Artifact Set Per Phase

| Artifact | Purpose | Audience |
|---|---|---|
| Phase goal statement | Anchors all work to a single outcome | Team, gate reviewers |
| Workstream plan(s) | Detailed work breakdown within the phase | Team leads |
| Design documents | Architecture decisions, schema, API contracts | Engineers, future maintainers |
| Implementation summary | What was built, what was deferred, key decisions | Team, gate reviewers |
| Test plan + results | What was tested and what the results were | QA, gate reviewers, auditors |
| Gate review record | Formal verdict, conditions, sign-offs | Leadership, auditors, customers |

### Architecture Decision Records (ADRs)

An **ADR** is a short document capturing a significant architectural choice: the context that made the decision necessary, the options considered, the decision made, and the consequences.

ADRs are invaluable because architectural decisions are made in a moment but live for years. Without ADRs, teams spend enormous time reverse-engineering *why* the code is the way it is — often arriving at wrong answers.

> **Pattern:** Write an ADR for any decision that would be non-obvious to a competent engineer reading the code in 12 months. If you caught yourself saying "we debated this," it should be an ADR.

---

## Rollback and Remediation

### Phase Rollback

If a gate review fails, the phase is not simply reopened and worked again without structure. A formal **phase rollback protocol** should define:

1. Which artifacts are invalidated by the failure
2. What remediation work is required (specific findings, not vague "fix it")
3. Who is accountable for each remediation item
4. What evidence is required to re-enter the gate
5. Whether a full re-review or a targeted follow-up review is required

> **Anti-pattern:** "We'll fix it in the next phase." This is how technical debt accumulates as policy. Exit criteria exist precisely to prevent this. A finding that is not resolved in its phase is rescheduled, not forgiven.

### Partial Rollback

For large phases, it may be possible to fail one workstream while passing others. A partial gate pass is acceptable if the failing workstream's artifacts are isolated (no other workstream depends on them). The passing workstreams are locked; the failing workstream is remediated independently.

---

## Team Coordination in Phased Projects

### RACI Matrix

For each phase, a **RACI matrix** (Responsible, Accountable, Consulted, Informed) clarifies decision rights and communication obligations:

| Role | Meaning |
|---|---|
| **Responsible** | Does the work |
| **Accountable** | Owns the outcome — single person, makes the final call |
| **Consulted** | Input required before decisions are made |
| **Informed** | Notified of outcomes, no active input required |

Each phase artifact should have exactly one Accountable person. If multiple people are Accountable, no one is.

### Decision Rights

Large projects accumulate **undocumented decision precedents**: informal agreements made in Slack, verbal approvals in hallway conversations, architectural choices made by whoever happened to be working on that file. These erode team coherence and produce surprises at gate reviews.

> **Pattern:** Designate explicit decision rights by domain. The schema owner approves all changes to the canonical data model. The security lead approves all auth changes. The compliance officer approves changes to regulated workflows. These designations should be written down.

### Escalation Paths

When a decision falls outside a workstream lead's authority, there should be a defined escalation path — not an informal "ask around until someone says yes." Undefined escalation leads to decision paralysis or decisions made by whoever has the most social capital rather than the most relevant expertise.

---

## Versioning and Release Cadence

### Semantic Versioning

Phase-based projects benefit from a semantic versioning cadence tied to phase milestones:

- **Patch (v1.0.x):** Bug fixes within a phase — no new features, no schema changes
- **Minor (v1.x.0):** Phase completion, new features added — backwards-compatible
- **Major (vX.0.0):** Breaking changes — schema migrations with data transformation, API contract changes, new multi-tenant structure

> **Pattern:** Tag every phase completion in version control with a semantic version and a release note that summarizes what was built, what was changed, and what known issues remain.

### Milestone Cadence

A **milestone** is a collection of related phases that together deliver a meaningful product increment visible to external stakeholders. Version milestones map to:

- Customer demonstrations
- Regulatory submission packages
- Contractual delivery points
- Public launch announcements

---

## Anti-Patterns in Phase-Based Development

### Phase Theater

Phases exist on paper — with plan documents and workstream assignments — but no real gate review happens. The team moves from Phase N to Phase N+1 when someone decides it's time to move on, not when exit criteria are actually met.

> **Why it matters:** Phase theater is more dangerous than having no phases at all. It creates false confidence that rigor exists while allowing problems to accumulate unchecked.

---

### Undocumented Decisions

Every significant decision made during a phase that is not captured in an artifact is a future maintenance burden. "We don't need to write that down, everyone knows why" is always wrong — team membership changes, memory fades, and what everyone "knows" at Phase 5 is unknown to the engineer who joins at Phase 15.

---

### Front-Loading Documentation, Skipping Verification

Spending enormous effort on planning documents and design specs while treating test results and implementation evidence as optional. Documentation proves nothing about whether the system actually works — verification does.

---

### Treating Phases as Waterfall at Scale

Using phases as an excuse to defer all customer feedback until the final phases. Even in a phase-gated model, seek external feedback early and often. Use phases to control the *integration* of work, not to postpone validation.

---

## Further Reading

- Robert G. Cooper — *Winning at New Products* (Stage-Gate model)
- Philippe Kruchten — "The 4+1 View Model of Architecture" (artifact standards)
- Michael Nygard — *Release It!* (deployment and rollback discipline)
- INCOSE — *Systems Engineering Handbook* (phase-gate for complex systems)
