# Round 1 Output — Design Style Taxonomist

## Scope

This output maps the major visual and interaction style families relevant to an
Athelon redesign. It keeps those families distinct so later synthesis can make
deliberate tradeoffs instead of blending everything into generic “enterprise
SaaS.”

## Distinct Style Families

| Style family | Hallmarks | Representative references |
|---|---|---|
| Industrial control workbench | Dense status presentation, calm severity, strong semantic state, minimal decorative noise, action surfaces built around active work | Current [`STYLE-GUIDE.md`](../../../STYLE-GUIDE.md), [Carbon](https://carbondesignsystem.com/), [CAMP eWorkOrder](https://www.campsystems.com/eWorkOrder) |
| Enterprise transactional floorplan | Role-based pages, clear task sections, strong form/table balance, predictable hierarchy | [SAP Fiori](https://experience.sap.com/fiori-design-web/), [Carbon](https://carbondesignsystem.com/) |
| Collaborative workbench productivity | Multi-pane coordination, flexible navigation, comments/handoff comfort, command/search affordances | [Fluent 2](https://fluent2.microsoft.design/), [Atlassian Design System](https://atlassian.design/) |
| Document-centric ledger | Review summaries, evidence-first structure, timelines, checklists, explicit preconditions before high-consequence actions | [`ALPHA-LAUNCH-BRIEF.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/reviews/ALPHA-LAUNCH-BRIEF.md), [SAP Fiori](https://experience.sap.com/fiori-design-web/) |
| Platform-native utility | Touch-first clarity, restrained controls, simpler depth, stronger single-task flows | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [Material overview](https://developer.android.com/design/ui/mobile/guides/foundations/material-overview) |
| Commerce/admin hybrid | Cleaner surfaces, lower perceived risk, familiar admin patterns, lighter visual tone | [Polaris](https://shopify.dev/docs/api/app-home/polaris-web-components), [Atlassian Design System](https://atlassian.design/) |
| Expressive consumer/product-led | Strong brand expression, larger gestures, more visual novelty, lower tolerance for dense operational detail | [Material overview](https://developer.android.com/design/ui/mobile/guides/foundations/material-overview), `Inference` from current design-system comparisons |

## What Each Style Optimizes For

### Industrial control workbench

Optimizes for repeat operational work, exception awareness, and dense scanning.
This is the strongest fit for Athelon’s execution-heavy surfaces because the
current app is already oriented toward high-consequence actions and live status.

### Enterprise transactional floorplan

Optimizes for predictability, role-based business work, and complex but stable
flows. It is strongest where Athelon behaves like serious back-office software:
billing, settings, reports, inventory administration, and management review.

### Collaborative workbench productivity

Optimizes for coordination rather than authoritative record execution. Its value
inside Athelon is real, but secondary. Lead handoff, shift coordination, and
cross-team follow-up benefit more than compliance or technician signoff.

### Document-centric ledger

Optimizes for trust in signed evidence, review completeness, and “what exactly
am I approving?” clarity. This is crucial for RTS, QCM, compliance, and audit
surfaces.

### Platform-native utility

Optimizes for responsive legibility, touch confidence, and lightweight
single-task execution. It is especially useful as an influence on phone and
tablet behavior.

### Commerce/admin hybrid

Optimizes for commercial clarity, lighter administration, and reduced cognitive
severity. It is the strongest fit for sales, CRM, quoting, and some customer
transparency surfaces.

### Expressive consumer/product-led

Optimizes for emotional differentiation and surface memorability. `Inference`:
it is useful only in narrow doses for Athelon because the product’s core value
depends more on trust and operational precision than on novelty.

## Failure Modes In Athelon Context

| Style family | Failure mode in regulated MRO context |
|---|---|
| Industrial control workbench | Can become visually oppressive or overly dark if forced onto every office surface |
| Enterprise transactional floorplan | Can become ERP-heavy, slow, and emotionally flat on execution pages |
| Collaborative workbench productivity | Can over-prioritize coordination affordances at the expense of evidence integrity |
| Document-centric ledger | Can slow routine execution if overused outside review and signoff flows |
| Platform-native utility | Can under-serve dense scheduling, parts, and compliance data work |
| Commerce/admin hybrid | Can make serious maintenance actions feel less consequential than they are |
| Expressive consumer/product-led | Can undermine trust, density, and audit legibility |

## Candidate Surface Matches

| Athelon surface | Strongest style family | Why |
|---|---|---|
| My Work / execution | Industrial control workbench | Fast scanning, status visibility, minimal ambiguity |
| Work Orders | Industrial control workbench + document-centric ledger | Execution plus signed-evidence review |
| Scheduling | Industrial control workbench | Dense coordination of time, bays, and resources |
| Compliance | Document-centric ledger + industrial control workbench | Review clarity with state-aware operational context |
| Parts | Industrial control workbench + enterprise transactional floorplan | Mixed operational and administrative behavior |
| Billing | Enterprise transactional floorplan + commerce/admin hybrid | Structured business flows with clearer administrative tone |
| Sales / CRM | Commerce/admin hybrid + collaborative workbench productivity | Relationship work and commercial coordination |
| Reports / settings | Enterprise transactional floorplan | Predictability and administrative clarity |
| Read-only and mobile lookup | Platform-native utility | Legibility and low-friction access |

## Handoff To Opus Synthesis

Round 1 should not choose one dominant style family for the whole product.

The most defensible synthesis is:

1. industrial control workbench for execution-heavy surfaces
2. enterprise transactional floorplan for office-heavy surfaces
3. document-centric overlays for review and signoff
4. commerce/admin hybrid for sales and outward-facing commercial work
