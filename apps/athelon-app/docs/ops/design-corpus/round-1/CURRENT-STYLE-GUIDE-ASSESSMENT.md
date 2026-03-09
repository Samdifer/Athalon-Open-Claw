# Current Style Guide Assessment

This assessment compares the current
[`STYLE-GUIDE.md`](../../STYLE-GUIDE.md) against round-1 research findings from the
saved agent outputs:

- [`design-style-taxonomist/OUTPUT.md`](./design-style-taxonomist/OUTPUT.md)
- [`design-philosophy-analyst/OUTPUT.md`](./design-philosophy-analyst/OUTPUT.md)
- [`enterprise-design-system-benchmarker/OUTPUT.md`](./enterprise-design-system-benchmarker/OUTPUT.md)
- [`operational-workflow-pattern-analyst/OUTPUT.md`](./operational-workflow-pattern-analyst/OUTPUT.md)
- [`athelon-role-fit-analyst/OUTPUT.md`](./athelon-role-fit-analyst/OUTPUT.md)

## Baseline Read

The current guide already assumes a safety-critical, data-dense B2B product:
clarity over cleverness, information density without clutter, trust through
consistency, and domain-semantic color use. That foundation aligns strongly with
the official enterprise systems that scored highest for Athelon, especially
[Carbon](https://carbondesignsystem.com/),
[SAP Fiori](https://experience.sap.com/fiori-design-web/), and
[Fluent 2](https://fluent2.microsoft.design/).

## Keep

### 1. Clarity-over-cleverness as a core design law

Keep this unchanged. It is compatible with safety-critical trust design,
document-centric review flows, and dense workbench patterns. It also matches the
pilot workflow narrative in
[`ALPHA-LAUNCH-BRIEF.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/reviews/ALPHA-LAUNCH-BRIEF.md),
which repeatedly centers “one screen, one checklist” and explicit signoff
preview.

### 2. Information density without clutter

Keep this, but interpret it as a surface-specific rule rather than a single
global visual style. Carbon and SAP Fiori both support dense operational and
transactional surfaces without forcing novelty-driven layouts:
[Carbon overview](https://carbondesignsystem.com/),
[SAP Fiori](https://experience.sap.com/fiori-design-web/).

### 3. Domain-semantic color and technical typography

Keep the aviation semantic colors, monospace identifiers, and tabular numerals.
These directly reinforce trust, scan speed, and audit legibility. They are a
real product advantage, not just styling.

### 4. Accessibility as a first-order concern

Keep accessibility as non-negotiable. Round 1 consistently shows that any later
direction must preserve contrast, responsive legibility, and predictable focus
behavior:
[Apple HIG](https://developer.apple.com/design/human-interface-guidelines),
[Material overview](https://developer.android.com/design/ui/mobile/guides/foundations/material-overview),
[Fluent 2](https://fluent2.microsoft.design/).

## Reconsider

### 1. “Dark mode is primary” as a product-wide default

Reconsider this from a role-and-surface perspective, not because dark mode is
wrong. Round 1 fit scoring indicates dark-heavy execution surfaces are strong
for technicians, leads, QCM, and parts work, but office-heavy roles like
billing, sales, and admin are better served by equal light-mode parity and a
less aggressively nocturnal aesthetic. This is an inference from Athelon’s role
mix plus the more context-sensitive stance taken by Apple, Fluent, Polaris, and
Fiori:
[Apple HIG](https://developer.apple.com/design/human-interface-guidelines),
[Fluent 2](https://fluent2.microsoft.design/),
[Polaris](https://shopify.dev/docs/api/app-home/polaris-web-components),
[SAP Fiori](https://experience.sap.com/fiori-design-web/).

### 2. A single “industrial utilitarian” tone for every surface

Reconsider making one tone govern execution, compliance, billing, sales, and
reporting equally. Round 1 shows that Athelon likely needs a design family with
multiple aligned modes:

- industrial control for execution and compliance
- enterprise transactional for billing, settings, and reports
- lighter commercial/admin treatment for CRM and sales

The current guide is directionally right for the hangar-facing core, but too
uniform for the full product.

### 3. “No decorative elements without purpose” as an anti-expression absolute

Keep the spirit, loosen the wording. Round 1 found that restrained visual
structure can still be useful for hierarchy, grouping, and orientation. Fluent,
Atlassian, and Polaris all use subtle emphasis to support comprehension without
becoming decorative noise:
[Fluent 2](https://fluent2.microsoft.design/),
[Atlassian Design System](https://atlassian.design/),
[Polaris](https://shopify.dev/docs/api/app-home/polaris-web-components).

### 4. Hard global typography rules such as “No text larger than 24px”

Reconsider fixed caps as global laws. Athelon should keep a restrained scale,
but some office and summary surfaces benefit from slightly stronger hierarchy
than the most compressed execution pages. The issue is not size inflation; it
is whether the hierarchy matches the task.

### 5. “Never wrap text in table cells” as an absolute

Reconsider this. It is strong for execution grids and audit tables on desktop,
but too rigid for tablet and narrower administrative surfaces. Carbon’s table
guidance and responsive enterprise patterns imply selective truncation, not
universal truncation:
[Carbon data table](https://carbondesignsystem.com/components/data-table/usage/).

## Leave Open

### 1. How much command-centered interaction Athelon should adopt

Round 1 supports command-centric shortcuts for office power users and leads, but
not as the primary model for technicians or high-consequence review screens.

### 2. Whether compliance surfaces should be more document-centric than the rest of the app

The current guide treats the whole product similarly. Round 1 suggests
compliance, RTS, and audit surfaces may need a more document-led presentation
than scheduling or billing.

### 3. How sharply to separate internal and external-facing product modes

The style guide currently reads as a single internal platform. Round 1 leaves
open whether customer-portal and read-only surfaces should remain visually
closer to the internal tool or become a lighter, clearer trust layer.

## Net Assessment

The current style guide is a strong core specification for Athelon’s most
critical execution surfaces. What it lacks is not seriousness or rigor, but
surface differentiation. The research does not argue to discard the guide. It
argues to split its good instincts into a more explicit multi-surface system:

1. keep the trust spine
2. keep dense operational legibility
3. stop treating every role as if they live in the same visual and environmental context
