# Role And Workflow Fit Matrix

This matrix scores candidate design directions against Athelon’s current role
model and major product surfaces.

Source inputs:

- [`athelon-role-fit-analyst/OUTPUT.md`](./athelon-role-fit-analyst/OUTPUT.md)
- [`design-style-taxonomist/OUTPUT.md`](./design-style-taxonomist/OUTPUT.md)
- [`enterprise-design-system-benchmarker/OUTPUT.md`](./enterprise-design-system-benchmarker/OUTPUT.md)
- [`operational-workflow-pattern-analyst/OUTPUT.md`](./operational-workflow-pattern-analyst/OUTPUT.md)

## Scoring Legend

- `5` strongest default fit
- `4` strong fit with limited adaptation
- `3` viable but not ideal as the default
- `2` weak fit except on narrow surfaces
- `1` poor default fit

## Candidate Directions

| Code | Direction | Summary |
|---|---|---|
| `ICW` | Industrial control workbench | Dense, calm, operational, state-aware, trust-forward |
| `ETF` | Enterprise transactional floorplan | Role-based, task-based, predictable business software |
| `CWP` | Collaborative workbench productivity | Multi-pane, searchable, cross-functional coordination |
| `PNU` | Platform-native utility | Simple, touch-friendly, restrained, mobile-legible |
| `CAH` | Commerce/admin hybrid | Cleaner, lighter, admin-and-sales-friendly |

## Role Fit

| Role | ICW | ETF | CWP | PNU | CAH | Best default |
|---|---:|---:|---:|---:|---:|---|
| `admin` | 3 | 5 | 4 | 3 | 4 | `ETF` |
| `shop_manager` | 4 | 5 | 4 | 3 | 3 | `ETF` |
| `qcm_inspector` | 5 | 4 | 3 | 3 | 2 | `ICW` |
| `billing_manager` | 2 | 5 | 4 | 3 | 5 | `ETF` + `CAH` |
| `lead_technician` | 5 | 4 | 4 | 3 | 2 | `ICW` |
| `technician` | 5 | 3 | 2 | 4 | 1 | `ICW` |
| `parts_clerk` | 4 | 4 | 3 | 3 | 2 | `ICW` + `ETF` |
| `sales_rep` | 1 | 3 | 4 | 3 | 5 | `CAH` |
| `sales_manager` | 1 | 4 | 4 | 3 | 5 | `CAH` |
| `read_only` | 3 | 4 | 3 | 4 | 4 | `ETF` + `PNU` |

## Surface Fit

| Surface | ICW | ETF | CWP | PNU | CAH | Best default |
|---|---:|---:|---:|---:|---:|---|
| dashboard | 4 | 5 | 4 | 3 | 3 | `ETF` |
| my work / execution | 5 | 3 | 2 | 4 | 1 | `ICW` |
| work orders | 5 | 4 | 3 | 3 | 2 | `ICW` |
| fleet | 4 | 4 | 3 | 3 | 2 | `ICW` + `ETF` |
| scheduling | 5 | 4 | 4 | 2 | 1 | `ICW` |
| parts | 4 | 4 | 3 | 3 | 2 | `ICW` + `ETF` |
| compliance | 5 | 4 | 2 | 3 | 1 | `ICW` |
| billing | 2 | 5 | 4 | 3 | 5 | `ETF` + `CAH` |
| sales / CRM | 1 | 4 | 4 | 3 | 5 | `CAH` |
| reports / settings | 3 | 5 | 3 | 3 | 4 | `ETF` |

## Rubric Weight Notes

These scores are weighted most heavily by:

1. trust and regulatory clarity
2. task speed for repeat work
3. information density handling
4. error prevention and signoff safety

For Athelon, that means execution and compliance surfaces naturally favor
`ICW`, while office administration naturally favors `ETF`. The main non-obvious
finding is that `CAH` performs well for sales and billing but is actively weak
for technician and QCM-heavy work.

## Working Interpretation

Round 1 does not support a single-style redesign.

It supports a structured family:

1. `ICW` for execution, compliance, parts, and schedule control
2. `ETF` for management, reporting, settings, and most billing structures
3. `CAH` selectively for sales and customer-facing commercial surfaces
4. `PNU` as a secondary responsiveness and mobile-legibility influence
5. `CWP` as a coordination layer, not the dominant visual language

## Highest-Leverage Pairings For Later Rounds

| Later-round concept | Recommended combination |
|---|---|
| Technician / lead / QCM redesign | `ICW` spine with selective `PNU` touch legibility |
| Billing / admin / reports redesign | `ETF` spine with selective `CAH` clarity |
| Sales / CRM redesign | `CAH` spine with selective `CWP` coordination patterns |
| Cross-product shell | `ETF` structure with role-dependent interior modes |
