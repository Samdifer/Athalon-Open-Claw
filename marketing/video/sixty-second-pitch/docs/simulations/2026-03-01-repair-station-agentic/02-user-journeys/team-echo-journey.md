# Team Echo User Journey - Leadership and Governance

## Scenario

Weekly operational review with station leaders assessing safety risk, profitability trend, and staffing readiness across DEN/COS.

## Journey Timeline

1. Leadership opens `/dashboard` for same-day operational snapshot.
2. Team drills into `/reports` and `/reports/financials/forecast` for upcoming cashflow risk.
3. Director checks `/personnel` for staffing and certification readiness signals.
4. Accountable manager validates `/settings/locations` governance and station activation posture.
5. Team cross-checks key assumptions against scheduling and billing summaries.

## What Worked

- Multi-module visibility supported broad leadership review.
- Forecast path made next-period stress discussions possible.
- Location management supported explicit governance actions.

## Friction and User Reactions

| Step | Friction | User Narrative |
| --- | --- | --- |
| 1 | Dashboard required too much interpretation before action | "Show me exceptions first, not raw totals." |
| 2 | Financial trend context lacked operational causality links | "I need forecast deltas tied to schedule or labor constraints." |
| 3 | Qualification risk was not surfaced as a single readiness score | "I need one staffing risk number by station." |
| 5 | Manual reconciliation across modules took too long | "I need executive mode with pre-linked root-cause drilldowns." |

## Anticipated Edge Failures

- Leadership decisions drift when KPI definitions vary by page.
- Cross-location comparisons become misleading without normalized denominators.

## User Story Extracts

- As accountable manager, I want exception-first dashboards so decisions happen in minutes.
- As DOM, I want staffing readiness scored by station so dispatch risk is obvious.
- As finance controller, I want forecast variance linked to operational drivers so corrective action is targeted.
