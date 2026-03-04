# Customer + Company CRM Findings Log

Module: `Customer + Company CRM Intake + Tracking`  
Pack: `PACK-CUSTOMER-CRM-v1`  
Status: Complete (all findings closed)

| Finding ID | Date | Run ID | Type | Severity | Role | Route | Summary | Ticket | Status |
|---|---|---|---|---|---|---|---|---|---|
| CUST-CRM-001 | 2026-03-02 | CUST-CRM-RUN-001 | RBAC | S1 | billing_manager (automation + code review) | `/billing/customers` data query path | Resolved by enforcing authenticated org membership in customer list query via `requireOrgMembership` + `requireAuth` (`convex/billingV4.ts:309-321`). Verified by `e2e/wave10-customer-crm-guard.spec.ts` + `e2e/smoke-all-routes.spec.ts`. | WRL-CUST-CRM-001 | Closed |
| CUST-CRM-002 | 2026-03-02 | CUST-CRM-RUN-001 | RBAC | S2 | billing_manager (code review) | `/billing/customers/:id` notes tab | Resolved by validating customer ownership against org and caller org membership in notes read/write handlers (`convex/billingV4.ts:1185-1249`). Note reads are now org-filtered post-collect. | WRL-CUST-CRM-002 | Closed |
| CUST-CRM-003 | 2026-03-02 | CUST-CRM-RUN-001 | DX | S2 | billing_manager (guided flow + code review) | `/billing/customers/:id` profile save | Resolved by enforcing non-empty customer name and bounded integer `defaultPaymentTermsDays` (0-365) validation in create/update paths (`convex/billingV4.ts:34-39`, `124-127`, `233-236`). | WRL-CUST-CRM-003 | Closed |
| CUST-CRM-004 | 2026-03-02 | CUST-CRM-RUN-001 | MF | S2 | shop_manager (adjacent intake paths) | `/billing/customers` + `/fleet` quick-add | Resolved by adding duplicate guard in `createCustomer` using normalized name/company/email matching for org-scoped records (`convex/billingV4.ts:132-163`). Verified by guard test `duplicate customer intake is blocked` (`e2e/wave10-customer-crm-guard.spec.ts:93-115`). | WRL-CUST-CRM-004 | Closed |
| CUST-CRM-005 | 2026-03-02 | CUST-CRM-RUN-001 | OBS | S2 | admin (automated preflight) | CRM module automation coverage | Resolved by adding dedicated deterministic CRM suite `e2e/wave10-customer-crm-guard.spec.ts` with create/update/note, duplicate-block, and active/inactive selector assertions (`3 passed`). | WRL-CUST-CRM-005 | Closed |
| CUST-CRM-006 | 2026-03-02 | CUST-CRM-RUN-001 | OBS | S2 | billing_manager (code review) | CRM mutation audit trail | Resolved by adding explicit audit-log writes on customer create/update and customer note create (`convex/billingV4.ts:183-191`, `280-303`, `1237-1245`). | WRL-CUST-CRM-006 | Closed |
