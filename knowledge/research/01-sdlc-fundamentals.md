# 01 — SDLC Fundamentals

## What Is a Software Development Lifecycle?

A **Software Development Lifecycle (SDLC)** is a structured process that defines how software is planned, built, verified, deployed, and maintained. It exists to answer a deceptively simple question: *how do you reliably produce working software without chaos?*

For consumer apps with fast iteration cycles and low stakes, a loose SDLC might be acceptable. For **enterprise software** — systems that manage money, medical records, aircraft airworthiness, supply chains, or regulatory compliance — the cost of failure is severe. A missing audit record, a corrupted inventory count, or an undetected data race can cascade into legal liability, regulatory shutdown, or loss of life. These systems require a more deliberate lifecycle.

The SDLC is not bureaucracy for its own sake. It is a **risk management framework** encoded as process.

---

## The Core Phases of Any SDLC

Regardless of the specific model, every SDLC addresses the same fundamental activities:

| Phase | Core Questions Answered |
|---|---|
| **Requirements** | What problem are we solving? For whom? What are the constraints? |
| **Design** | How will we structure the solution? What are the architectural choices? |
| **Implementation** | Build the thing. |
| **Verification** | Does the built thing match what was specified? Does it behave correctly? |
| **Deployment** | How does it reach production? Who approves? What's the rollback plan? |
| **Maintenance** | How do bugs get fixed? How does the system evolve post-launch? |

The models surveyed below differ primarily in **how sequentially or iteratively** these phases are executed, and **how formally** transitions between them are controlled.

---

## Model Survey

### Waterfall

The original structured SDLC, Waterfall executes phases sequentially: Requirements → Design → Implementation → Test → Deployment. Each phase is fully completed before the next begins.

**Strengths:**
- Produces comprehensive upfront documentation
- Clear milestones and deliverables
- Easy to explain to stakeholders and auditors
- Well-suited when requirements are stable and well-understood at the start

**Weaknesses:**
- Extremely costly to change requirements mid-project
- Long feedback loops — working software is not visible until late
- Testing is deferred, making defects expensive to fix
- Assumes the world stays static during development (it doesn't)

> **Anti-pattern:** Treating Waterfall as a reason to write hundreds of pages of requirements documents before writing any code. Requirements documents rot. The goal of upfront specification is *enough clarity to build*, not *exhaustive documentation*.

---

### V-Model

An extension of Waterfall that makes the testing relationship explicit. Every development phase has a corresponding verification phase:

```
Requirements ←→ Acceptance Testing
  System Design ←→ System Testing
    Detailed Design ←→ Integration Testing
      Coding ←→ Unit Testing
```

**Strengths:**
- Verification is planned alongside construction, not as an afterthought
- Strong fit for safety-critical systems (aerospace, medical devices)
- Traceability from requirement to test is explicit

**Weaknesses:**
- Still sequential — same feedback loop problem as Waterfall
- Can create test-bureaucracy that slows delivery without improving quality

> **Regulated context:** The V-Model underpins many regulatory certification frameworks (DO-178C for airborne software, IEC 62304 for medical devices). Understanding it is essential for any team building safety-critical software.

---

### Iterative Development

Rather than completing the full design before building, iterative development produces a series of increasingly complete versions. Each iteration includes design, build, and test for a subset of functionality.

**Strengths:**
- Earlier visibility into working software
- Lessons from one iteration inform the next
- Risk of large integration failures is reduced

**Weaknesses:**
- Can produce architectural drift if design is not revisited between iterations
- Requires more discipline from the team to manage evolving scope

---

### Spiral Model

Proposed by Barry Boehm, the Spiral model adds **risk management** as a first-class activity at each iteration. Each "turn" of the spiral evaluates risk before committing to the next level of development.

**Strengths:**
- Explicitly acknowledges that software development is inherently risky
- Risk-driven decision-making at each turn
- Well-suited for very large or novel systems where requirements are uncertain

**Weaknesses:**
- Overhead-heavy — not cost-effective for small projects
- Requires experienced risk assessment at each cycle

---

### Agile (Scrum, SAFe, Kanban)

Agile is a **family of iterative, incremental methodologies** that share the principles of the 2001 Agile Manifesto: working software over comprehensive documentation, customer collaboration over contract negotiation, responding to change over following a plan.

**Scrum** organizes work into time-boxed sprints (usually 2 weeks). A prioritized product backlog drives sprint planning. Daily standups, sprint reviews, and retrospectives structure team communication.

**SAFe (Scaled Agile Framework)** layers Agile principles onto large, multi-team programs. It introduces Program Increments (PIs) as a planning cadence, release trains as team coordination structures, and portfolio-level prioritization for enterprise budgeting.

**Kanban** visualizes work as a flow through states, limiting work-in-progress (WIP) to expose bottlenecks rather than scheduling iteration boundaries.

**Strengths:**
- Frequent delivery of working software
- Rapid feedback from users and stakeholders
- Adaptable to changing requirements
- Reduces "big bang" integration risk

**Weaknesses:**
- Can produce under-designed systems if architecture is not explicitly protected
- Poorly suited for fixed-scope, fixed-cost contracts without hybrid adaptation
- "Agile" often becomes a label for doing whatever the team wants with no structure

> **Anti-pattern:** "We're Agile, so we don't need architecture documents." Agile reduces documentation overhead — it does not eliminate the need to design. Architecture decisions made implicitly in sprint 1 become unmovable constraints in sprint 40.

---

### Phase-Gated Hybrid

The most common model for **regulated enterprise software** is a hybrid: Agile development practices (sprints, iterative build) inside a phase-gated structure (sequential high-level phases with formal gate reviews between them).

This gives teams the delivery speed and adaptability of Agile while preserving the documentation rigor, traceability, and external auditability that regulators and enterprise customers require.

See [03-phase-based-development.md](./03-phase-based-development.md) for a deep treatment of the phase-gate model.

---

## Stage-Gate Theory

**Stage-Gate** is a process model originated by Robert G. Cooper as a framework for managing product development portfolios. It divides development into **stages** (periods of work) separated by **gates** (structured decision points).

At each gate, a review panel evaluates:
- Is the deliverable complete and meets quality criteria?
- Are the risks acceptable to proceed?
- Does the business case still hold?
- Should we continue, hold, or kill this project?

### Why Gates Matter

Gates exist to **prevent the sunk cost fallacy from driving bad decisions**. Without formal go/kill criteria, teams continue building doomed projects because stopping feels like admitting failure. A gate makes the stop/continue decision explicit, scheduled, and criteria-driven.

> **Pattern:** Define gate criteria **before** entering the stage. If you define what "done" means when you start, you avoid the "almost done" trap where a stage never formally closes.

> **Anti-pattern:** Gates that are only used to ratify decisions already made. A gate review where everyone already knows the answer is theater. Gates should surface real risks and have real authority to halt work.

---

## Key Lifecycle Artifacts

Well-run SDLC processes produce documentation at each phase that serves three purposes: (1) alignment within the team, (2) traceability for future maintainers, and (3) evidence for auditors or customers.

| Phase | Artifacts |
|---|---|
| Requirements | Product requirements document (PRD), use cases, acceptance criteria, constraint register |
| Design | Architecture decision records (ADRs), entity-relationship diagrams, API contracts, data flow diagrams |
| Implementation | Code, inline documentation, implementation notes, dependency manifests |
| Verification | Test plans, test cases, test results, bug reports, coverage reports |
| Gate Review | Gate verdict document, risk register update, sign-off record |
| Deployment | Deployment runbook, rollback plan, change log, release notes |
| Maintenance | Incident post-mortems, bug triage logs, change request records |

> **Why it matters:** Artifacts are how you answer "why was this decision made?" six months later, when the engineer who made it has left the company and the auditor is asking for documentation of your change control process.

---

## Common Failure Modes and Anti-Patterns

### Big-Bang Releases

Accumulating changes in a long-lived branch or staging environment and deploying everything at once dramatically increases risk. Integration defects only surface late, rollback is all-or-nothing, and the pressure of a large release leads to shortcuts in testing.

> **Pattern:** Deploy continuously in small, well-tested increments. Use feature flags to decouple deployment from feature activation if needed.

---

### Absent or Toothless Gates

If gates exist only as calendar events where the team presents progress and leadership approves automatically, they provide no risk mitigation. The hallmark of a real gate is that it can — and sometimes does — result in a hold or a rework mandate.

---

### Scope Creep

Requirements grow incrementally throughout development without corresponding time and cost adjustment. Each addition seems small; collectively they are catastrophic to schedule and quality.

> **Pattern:** Maintain a formal change control process for requirements after the initial scope is locked. Every addition requires explicit approval, with impact assessment on schedule, cost, and risk.

---

### Testing as a Final Phase

Treating verification as something that happens after all code is written leads to expensive, late-discovered defects and schedule compression that causes testing to be cut short.

> **Pattern:** Testing is a continuous activity, not a phase. Unit tests are written alongside code. Integration tests are defined in the design phase and run in CI. System tests are scripted from acceptance criteria before implementation begins.

---

### "Agile" Without Engineering Discipline

Adopting Agile ceremonies (standups, retrospectives, sprints) without adopting the engineering practices that make iteration safe — continuous integration, automated testing, refactoring, architecture review — produces fast delivery of increasingly fragile software.

---

## Choosing a Model

| Factor | Recommendation |
|---|---|
| Stable, well-understood requirements | Lean toward Waterfall or phase-gated |
| Changing or uncertain requirements | Lean toward Agile or iterative |
| Regulated industry (FAA, FDA, SOX) | Phase-gated hybrid with formal gate documentation |
| Small team, fast product | Agile (Scrum or Kanban) |
| Large multi-team program | SAFe or phase-gated with Agile workstreams |
| Safety-critical software | V-Model inside a phase-gated structure |
| Fixed-price contract with defined scope | Waterfall or very tightly scoped phase-gated |

The right model is always context-dependent. Avoid dogma about any single methodology — the goal is predictable delivery of quality software, not faithful adherence to a named framework.

---

## Further Reading

- Robert G. Cooper — *Winning at New Products* (Stage-Gate origin)
- Beck et al. — *Manifesto for Agile Software Development* (2001)
- Steve McConnell — *Software Project Survival Guide* (practical SDLC guidance)
- Barry Boehm — "A Spiral Model of Software Development and Enhancement" (1988)
- RTCA DO-178C — *Software Considerations in Airborne Systems and Equipment Certification*
