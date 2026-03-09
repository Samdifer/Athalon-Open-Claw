# Round 1 Output — Enterprise Design System Benchmarker

## Scope

This output benchmarks major official design systems against Athelon’s needs as
a regulated, data-dense, multi-role MRO application.

## Benchmark Matrix

| System | What it optimizes for | Athelon strengths | Copy-wholesale risk | Athelon fit |
|---|---|---|---|---:|
| [Carbon](https://carbondesignsystem.com/) | Dense enterprise data, structured workflows, clear states | Excellent for tables, workbench surfaces, serious B2B posture | Can feel too institutional if not warmed slightly | 4.5 / 5 |
| [SAP Fiori](https://experience.sap.com/fiori-design-web/) | Role-based business workflows, transactional predictability | Strong floorplans for management, billing, settings, and task-driven work | Can become overly ERP-like or heavy | 4.5 / 5 |
| [Fluent 2](https://fluent2.microsoft.design/) | Productivity, multi-pane work, humane system feedback | Strong for lead coordination, admin, and cross-functional views | Can drift toward office-suite language on shop-floor surfaces | 4.1 / 5 |
| [Atlassian Design System](https://atlassian.design/) | Team collaboration and knowledge work | Strong for coordination, search, and secondary collaboration patterns | Too collaboration-forward for authoritative record flows | 3.8 / 5 |
| [Polaris](https://shopify.dev/docs/api/app-home/polaris-web-components) | Commerce/admin clarity and merchant workflow speed | Strong for sales, CRM, and lighter billing/admin | Too gentle and commercial for compliance/execution core | 3.8 / 5 |
| [Apple HIG](https://developer.apple.com/design/human-interface-guidelines) | Native utility, platform respect, touch legibility | Strong influence for mobile detail views and restraint | Not dense enough as the main system for Athelon | 3.5 / 5 |
| [Material overview](https://developer.android.com/design/ui/mobile/guides/foundations/material-overview) | Adaptive design, mobile responsiveness, broad usability | Strong responsive influence and component clarity | Risks landing in generic card-heavy SaaS if copied uncritically | 3.5 / 5 |

## What Each System Optimizes For

### Carbon

Best benchmark for serious, dense internal software. It is particularly useful
for Athelon’s execution, compliance, parts, and reporting surfaces.

### SAP Fiori

Best benchmark for role-based business structure and multi-surface
transactionality. It helps explain how Athelon can keep a coherent shell while
letting different roles do different classes of work.

### Fluent 2

Best benchmark for cross-functional productivity and coordination. It is less
appropriate as the sole visual language, but highly valuable as a supporting
system for navigation, side panels, and humane feedback states.

### Atlassian Design System

Best benchmark for knowledge-work coordination and collaboration. Good for lead
and management work; weaker for aircraft-signoff seriousness.

### Polaris

Best benchmark for sales and administrative clarity. Valuable for Athelon’s
commercial surfaces where “heavy industrial” would become counterproductive.

### Apple HIG and Material

Best used as constraint systems for responsiveness, touch behavior, and utility
legibility rather than as the dominant aesthetic for the entire product.

## Borrowable Patterns For Athelon

### From Carbon

- dense tables and serious B2B layout discipline
- stronger status honesty
- restrained visual language for operational surfaces

### From SAP Fiori

- role- and task-based floorplanning
- clearer separation between overview, work item, and detail views
- enterprise predictability without novelty-driven navigation

### From Fluent 2

- productive side-panel and multi-pane interaction style
- humane waiting, loading, and feedback behavior
- cross-surface coordination polish

### From Polaris

- clearer commercial/admin tone for CRM and sales surfaces
- lighter information framing where the task is administrative rather than operational

### From Apple and Material

- touch comfort
- responsive spacing discipline
- single-task mobile clarity

## Risks Of Copying Each System Wholesale

| System | Main risk if copied directly |
|---|---|
| Carbon | Athelon becomes too cold or institution-like on lighter commercial surfaces |
| SAP Fiori | Athelon feels like ERP first and aviation tool second |
| Fluent 2 | The product drifts toward office-suite semantics |
| Atlassian | Collaboration outruns authority and evidence structure |
| Polaris | High-consequence actions feel too soft |
| Apple HIG | Data density and operational depth get underplayed |
| Material | The app becomes visually generic and over-carded |

## Handoff To Opus Synthesis

The benchmark does not support one direct design-system transplant. It supports
a layered borrowing strategy:

1. Carbon + Fiori for the structural core
2. Fluent for coordination and feedback behavior
3. Polaris for sales/commercial surfaces
4. Apple and Material as responsive/touch constraints
