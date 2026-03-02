# Team Delta User Journey - Estimating and Billing

## Scenario

New customer request arrives while another draft quote is being revised and an open invoice needs payment posting.

## Journey Timeline

1. Estimator starts at `/billing/quotes/new` and applies labor kit lines.
2. Service writer opens `/billing/quotes`, edits seeded draft quote, adds manual line item.
3. Billing manager verifies converted quote discoverability and status continuity.
4. Billing manager opens `/billing/invoices/[id]`, records payment, validates outstanding balance behavior.
5. Customer success reviews `/portal` alignment with internal quote/invoice state.

## What Worked

- Labor-kit insertion accelerated quote authoring.
- Converted quote status remained visible in billing index and detail views.
- Payment dialog guardrails reduced overpayment risk.

## Friction and User Reactions

| Step | Friction | User Narrative |
| --- | --- | --- |
| 1 | Kit search required exact naming memory | "I need better keyword and ATA intent matching." |
| 2 | Manual line entry lacked assistant for common line bundles | "I am rebuilding the same lines repeatedly." |
| 4 | Payment posting still felt like a single-user process | "I need approval workflow for large receipts." |
| 5 | Portal expectation mismatch risk on status timing | "Customer sees old status before my internal update settles." |

## Anticipated Edge Failures

- Quote conversion succeeds but downstream invoice defaults miss pricing/tax rule updates.
- Portal cache delay causes customer dispute over visible quote state.

## User Story Extracts

- As an estimator, I want semantic kit search so I can build quotes from intent, not exact string memory.
- As billing, I want dual-control for high-dollar payment posting so financial errors are contained.
- As customer success, I want portal state freshness indicators so trust is preserved.
