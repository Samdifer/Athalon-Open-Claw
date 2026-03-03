# Billing Module Gap Analysis
## From the Desk of a Billing Manager

**Date:** 2026-02-25  
**Reviewer:** Billing operations perspective  
**Scope:** Full review of quoting, invoicing, PO, time tracking, vendor management, pricing, and analytics

---

## What Works Well ✅

The billing module has solid bones. The data model is thoughtful and the core flows exist:

- **Quote lifecycle** (DRAFT → SENT → APPROVED → CONVERTED or DECLINED) with decline tracking
- **Invoice lifecycle** (DRAFT → SENT → PARTIAL → PAID or VOID) with void reason
- **Purchase order lifecycle** (DRAFT → SUBMITTED → PARTIAL → RECEIVED → CLOSED) with partial receiving
- **Payment recording** with multiple methods (cash, check, CC, wire, ACH), reference numbers, partial payments
- **Time clock** with clock in/out, per-WO labor tracking, and labor summaries
- **Pricing engine** with profiles, 4 rule types (cost_plus, list_minus, flat_rate, quantity_tier)
- **Vendor management** with approval workflow, cert tracking, and expiry monitoring
- **Atomic document numbering** (Q-0001, INV-0001, PO-0001) — no gaps, no duplicates
- **Progress billing** infrastructure (isProgressBill, depositAmount fields exist)
- **Print styling** on invoices (CSS @media print rules)
- **Quote-to-Work Order conversion** — converts approved quotes into WOs
- **Department sections on quotes** — allows multi-department quoting

---

## Critical Gaps 🔴 (Revenue Impact)

### GAP-01: No Customer Create/Edit UI
- **Impact:** Can't add new customers from the billing module
- **Current state:** `customers.ts` has only `listCustomers` and `getCustomer` queries — no `createCustomer` or `updateCustomer` mutations
- **No `/billing/customers` page exists** — customers must be created through seed data or direct Convex calls
- **Blocker for:** Creating quotes (requires customerId), creating invoices

### GAP-02: No Email Delivery for Quotes/Invoices
- **Impact:** "Send" button changes status to SENT but doesn't actually send anything to the customer
- **Current state:** `sendQuote` and `sendInvoice` mutations update status and timestamps but have no email/notification mechanism
- **What's needed:** Email delivery (PDF attachment), customer notification, delivery confirmation
- **Also missing:** Quote/invoice PDF generation for attachment

### GAP-03: No Tax Calculation Engine
- **Impact:** Tax is always $0 or manually set — no automatic calculation
- **Current state:** Tax fields exist on quotes, invoices, and POs, but the value is hardcoded to `0` in all create mutations
- **What's needed:** Tax rate configuration per org/jurisdiction, auto-calculation on line item changes, tax-exempt customer flag

### GAP-04: No Overdue Invoice Tracking
- **Impact:** Can't identify or act on late-paying customers
- **Missing:** Due date field on invoices, overdue status or flag, aging reports (30/60/90 day), late payment reminders, interest/late fee calculation
- **The invoice schema has no `dueDate` field at all**

### GAP-05: No Payment History View
- **Impact:** Can't see payment history for an invoice or customer
- **Current state:** Payments are recorded in a `payments` table but there's no UI to view them
- **Missing:** Payment list on invoice detail, payment receipt, payment reversal/void, refund capability

---

## High Priority Gaps 🟠 (Operational Impact)

### GAP-06: No Quote/Invoice Edit After Creation
- **Impact:** Can't fix typos, adjust pricing, or add missed line items on existing documents
- **Current state:** Line items can be added to quotes, but there's no `updateQuoteLineItem` or `removeInvoiceLineItem` mutation
- **Invoices have `addInvoiceLineItem` but no edit or remove**
- **No mutation to update quote header fields** (customer, aircraft, expiry date)

### GAP-07: No Quote Expiration Enforcement
- **Impact:** Quotes stay valid forever even past their expiry date
- **Current state:** `expiresAt` field exists but nothing checks or enforces it
- **What's needed:** Auto-expire quotes past due date, visual indicator on expired quotes, prevent approval of expired quotes

### GAP-08: No Quote Revision/Versioning
- **Impact:** When a customer requests changes, you have to create a new quote and lose history
- **What's needed:** Revision number, revision history, ability to create a revised quote from an existing one while maintaining the chain

### GAP-09: No Credit Memos / Refunds
- **Impact:** Can't process returns, issue credits, or handle overpayments
- **Missing:** Credit memo document type, refund recording, credit balance tracking on customer accounts

### GAP-10: No Recurring Billing
- **Impact:** Can't set up monthly retainers, hangar rent, or recurring inspection schedules
- **What's needed:** Recurring invoice templates, auto-generation schedule, recurring billing configuration per customer

### GAP-11: No Discount Support on Line Items
- **Impact:** Can't offer line-item discounts, volume discounts, or promotional pricing
- **Current state:** Line items have qty × unitPrice = total, but no discount field
- **What's needed:** Per-line discount (% or $), document-level discount, discount reason tracking

### GAP-12: No Deposit/Retainer Tracking
- **Impact:** Can't properly track customer deposits against future work
- **Current state:** `isProgressBill` and `depositAmount` fields exist on invoices but are optional and not wired into any workflow
- **What's needed:** Deposit recording, deposit application to final invoice, unapplied deposit report

---

## Medium Priority Gaps 🟡 (Efficiency)

### GAP-13: No Invoice from Quote (Direct Conversion)
- **Impact:** After a quote is approved and converted to a WO, creating the invoice requires manual re-entry of line items
- **Current state:** `convertQuoteToWorkOrder` exists, but there's no `convertQuoteToInvoice` or auto-population of invoice line items from quote line items
- **`createInvoiceFromWorkOrder` exists** but doesn't pull quote line items

### GAP-14: No Batch Operations
- **Impact:** Processing multiple invoices/POs one at a time is slow
- **Missing:** Batch send invoices, batch print, batch status updates, batch payment recording

### GAP-15: No Document Templates / Branding
- **Impact:** All quotes/invoices look the same — no shop branding
- **Missing:** Organization logo, custom header/footer, terms & conditions template, payment instructions on invoices

### GAP-16: No Time Clock Approval Workflow
- **Impact:** Technicians clock time but no supervisor reviews/approves it before billing
- **Current state:** Time entries go directly into billing without validation
- **What's needed:** Time entry review queue, supervisor approval, edit before billing, reject with reason

### GAP-17: No Parts Markup on Invoicing
- **Impact:** Can't apply standard markup (e.g., cost + 30%) when adding parts to invoices
- **Current state:** Parts line items on invoices use manually entered unit prices
- **What's needed:** Auto-populate part cost from inventory, apply pricing rule markup, track cost vs. billed price for margin analysis

### GAP-18: No Accounts Receivable Dashboard
- **Impact:** No single view of who owes what
- **Missing:** AR aging report (current/30/60/90+), customer balance summary, collection priority list, DSO (Days Sales Outstanding) metric

### GAP-19: No PO Budget/Spending Controls
- **Impact:** No guard against overspending on parts for a work order
- **Missing:** WO budget cap, PO approval thresholds (e.g., POs > $5K need manager approval), spending alerts

### GAP-20: Analytics Too Basic
- **Impact:** The analytics page shows lists but lacks actionable financial intelligence
- **Current state:** Shows quote/invoice lists with status badges — essentially a reformatted list view
- **Missing:** Revenue trends (chart), conversion rate (quotes → WOs), average invoice value, revenue by customer, revenue by aircraft type, profit margin analysis, month-over-month comparison

---

## Low Priority / Nice-to-Have 🟢

### GAP-21: No Multi-Currency Support
- All amounts assume a single currency with no currency field

### GAP-22: No QuickBooks/Xero Integration
- FEAT-110 already deferred — needs OAuth flow for accounting system sync

### GAP-23: No Customer Portal
- Customers can't view quotes, approve online, or make payments through a portal

### GAP-24: No Automated Payment Reminders
- No scheduled email/SMS reminders for overdue invoices

### GAP-25: No Audit Log for Billing Changes
- While the core MRO has audit logging, billing mutations don't write to auditLog

---

## Priority Matrix

| Priority | Gap | Effort | Revenue Impact |
|----------|-----|--------|----------------|
| 🔴 P0 | GAP-01: Customer CRUD | S | Blocker |
| 🔴 P0 | GAP-04: Due dates + overdue tracking | M | High |
| 🔴 P0 | GAP-05: Payment history view | S | High |
| 🟠 P1 | GAP-02: Email delivery | L | High |
| 🟠 P1 | GAP-03: Tax engine | M | Medium |
| 🟠 P1 | GAP-06: Edit line items | M | Medium |
| 🟠 P1 | GAP-09: Credit memos/refunds | M | Medium |
| 🟠 P1 | GAP-11: Line item discounts | S | Medium |
| 🟠 P1 | GAP-13: Quote → Invoice conversion | M | Medium |
| 🟠 P1 | GAP-18: AR dashboard | M | Medium |
| 🟡 P2 | GAP-07: Quote expiration | S | Low |
| 🟡 P2 | GAP-08: Quote revisions | M | Low |
| 🟡 P2 | GAP-10: Recurring billing | L | Medium |
| 🟡 P2 | GAP-12: Deposit tracking | M | Low |
| 🟡 P2 | GAP-15: Document templates | M | Low |
| 🟡 P2 | GAP-16: Time approval workflow | M | Low |
| 🟡 P2 | GAP-17: Parts markup auto-calc | S | Medium |
| 🟡 P2 | GAP-19: PO budget controls | M | Low |
| 🟡 P2 | GAP-20: Analytics upgrade | L | Low |
| 🟡 P2 | GAP-14: Batch operations | M | Low |
| 🟢 P3 | GAP-21: Multi-currency | L | Low |
| 🟢 P3 | GAP-22: QuickBooks integration | L | Medium |
| 🟢 P3 | GAP-23: Customer portal | L | Low |
| 🟢 P3 | GAP-24: Auto reminders | M | Medium |
| 🟢 P3 | GAP-25: Billing audit log | S | Low |

---

## Recommended Next Sprint (P0 + Quick P1 Wins)

1. **Customer CRUD** — createCustomer, updateCustomer mutations + `/billing/customers` page
2. **Invoice due dates** — add `dueDate` to schema, overdue badge, aging logic
3. **Payment history** — list payments on invoice detail page
4. **Line item editing** — updateQuoteLineItem, removeInvoiceLineItem, updateInvoiceLineItem
5. **Line item discounts** — add `discount` field to quote/invoice line items
6. **Quote expiration** — enforce expiresAt, auto-expire cron, visual indicator
7. **Quote → Invoice shortcut** — populate invoice lines from approved quote

**Estimated effort:** 2-3 days with agent-assisted development
