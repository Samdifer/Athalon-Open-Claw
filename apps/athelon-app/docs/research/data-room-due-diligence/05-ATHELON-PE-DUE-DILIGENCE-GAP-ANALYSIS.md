# Athelon MRO Platform vs. PE Due Diligence Data Room Requirements

## Gap Analysis Report

**Methodology:** Cross-reference of the Athelon application's data model (100+ Convex tables, 142 evaluated page surfaces) against the standard PE due diligence data room taxonomy (15 categories, 10 workstreams) to identify what Athelon captures, what it partially covers, and what is absent.

**Perspective:** An MRO repair station being acquired by a PE firm. The question is: *How much of the data that a PE buyer needs to see in a data room is already captured, organized, and exportable from Athelon?*

---

## Executive Summary

Athelon is exceptionally strong in the operational and regulatory compliance domains that define an FAA Part 145 repair station's core value proposition — and these are exactly the domains where PE buyers have the hardest time getting structured, auditable data. However, Athelon has significant gaps in the financial, HR, and corporate governance domains that PE due diligence also requires.

| Data Room Category | Athelon Coverage | Assessment |
|---|---|---|
| Work Orders & Maintenance Records | **Full** | Best-in-class; immutable records, FAA-compliant signatures |
| Aircraft Fleet & Configuration | **Full** | Registration history, engine/propeller tracking, CAMP linkage |
| Parts & Inventory Management | **Full** | Full lifecycle: receiving → inspection → install → removal → scrap |
| Regulatory Compliance (AD/SB) | **Full** | AD tracking, compliance ledger, inspection records, RTS |
| Quality Control (QCM) | **Strong** | QCM reviews, inspection templates, evidence checklists |
| Customer Management | **Strong** | CRM, contacts, opportunities, customer portal |
| Billing & Invoicing | **Strong** | Quotes, invoices, payments, credit memos, pricing rules |
| Personnel & Certifications | **Strong** | Technician records, FAA certificates, IA tracking |
| Training & Qualifications | **Strong** | OJT curricula, training records, qualification requirements |
| Scheduling & Capacity | **Strong** | Gantt scheduling, roster teams, capacity planning |
| Vendor Management | **Partial** | Vendor records and services exist; no full procurement lifecycle |
| Financial Reporting (GAAP) | **Gap** | No general ledger, no P&L, no balance sheet, no GAAP financials |
| HR & Compensation | **Gap** | No compensation data, no benefits, no org chart beyond technicians |
| Corporate Governance | **Gap** | No board minutes, no cap table, no corporate documents |
| Tax | **Gap** | No tax data whatsoever |
| Real Estate & Facilities | **Minimal** | Shop locations exist; no lease data, no property records |
| Environmental & Safety | **Minimal** | No environmental permits, no OSHA records (beyond training) |
| Insurance | **Gap** | No insurance policy or claims data |
| IT & Cybersecurity | **Gap** | No IT infrastructure documentation within the platform |
| ESG | **Gap** | No ESG data capture |

---

## Detailed Category-by-Category Analysis

### 1. Corporate & Organizational — PARTIAL COVERAGE

**What Athelon Has:**
- `organizations` table: company name, address, Part 145 certificate number, ratings, DOM/QCM assignments, subscription tier
- `shopLocations` table: multi-location facility data with addresses and contact info
- Clerk-based organization identity management

**What's Missing for PE Due Diligence:**
- Certificate of incorporation, bylaws, organizational documents
- Board minutes and resolutions
- Capitalization table and equity ownership
- Subsidiary register and legal entity chart
- Shareholder agreements
- Good standing certificates
- Corporate history (acquisitions, divestitures)

**Gap Severity: HIGH** — Athelon is an operational platform, not a corporate governance repository. None of the corporate formation, equity, or governance documents that occupy Section 01 of a standard data room are present.

---

### 2. Financial Information — PARTIAL COVERAGE (Operational Only)

**What Athelon Has:**
- `invoices` / `invoiceLineItems` / `payments` / `creditMemos` — full billing lifecycle
- `quotes` / `quoteLineItems` — detailed quoting with line-item decision events
- `timeEntries` / `timeEntrySegments` — labor time tracking by technician, task, and work order
- `planningFinancialSettings` — shop rate, labor cost rate, monthly overhead assumptions
- `otcSales` / `otcSaleItems` — over-the-counter parts sales
- `purchaseOrders` / `poLineItems` — procurement spend tracking
- `pricingProfiles` / `pricingRules` — pricing engine with customer-specific rules
- `taxRates` / `customerTaxExemptions` — tax configuration
- `customerDeposits` — deposit tracking
- `recurringBillingTemplates` — recurring billing
- `orgBillingSettings` — payment terms, late fees, billing preferences
- `quickbooksSync` / `quickbooksSettings` — QuickBooks integration for external accounting
- Revenue by customer (derivable from invoices)
- Revenue by work order type (derivable from WO + invoice linkage)
- AR aging (derivable from invoice due dates and payment status)

**What's Missing for PE Due Diligence:**
- Audited financial statements (GAAP P&L, balance sheet, cash flow)
- Monthly management accounts
- Financial model and projections
- Quality of Earnings (QoE) support: EBITDA bridge, non-recurring adjustments
- Debt/credit agreements, covenant compliance
- Capital expenditure schedules and fixed asset register
- Working capital analysis
- Related-party transaction disclosures
- General ledger / trial balance

**Gap Severity: MEDIUM-HIGH** — Athelon captures rich operational financial data (revenue by customer, labor costs, parts costs, billing status) that would be extremely valuable for a QoE analysis. The QuickBooks integration suggests the full GAAP financials live in an external accounting system. A PE buyer's accounting advisor could use Athelon's granular data to validate QoE adjustments that the accounting system alone cannot provide (e.g., "What does actual labor cost per work order look like?"). However, the GAAP financial statements themselves are not in Athelon.

**Key PE Insight:** Athelon's data is a *goldmine for QoE validation* even though it doesn't produce GAAP financials. The granular revenue-by-customer, labor-by-technician, parts-cost-by-WO data is exactly what PE accounting advisors spend weeks requesting from target companies.

---

### 3. Tax — NO COVERAGE

Athelon has tax rate configuration (`taxRates`, `customerTaxExemptions`) for invoice generation, but no tax return data, transfer pricing documentation, or tax compliance records. This is expected — tax data lives in the accounting/tax system, not an operational platform.

**Gap Severity: LOW** (appropriate — tax data belongs in the accounting system)

---

### 4. Intellectual Property & Technology — PARTIAL COVERAGE

**What Athelon Has:**
- The platform itself IS the technology asset — a PE buyer would evaluate Athelon as part of IT diligence
- `inspectionTemplates` — proprietary inspection workflows
- `ojtCurricula` / `ojtTasks` — proprietary training curricula (IP asset)
- `routingTemplates` — maintenance routing templates (operational IP)
- `laborKits` — standardized labor packages (pricing IP)
- `quoteTemplates` / `quoteDepartments` — quoting methodologies

**What's Missing:**
- Patent, trademark, copyright registers
- IP assignment agreements
- License agreements (inbound/outbound)
- Open source compliance documentation
- Domain name portfolio
- Software development lifecycle docs

**Gap Severity: MEDIUM** — The proprietary templates, curricula, and workflows within Athelon constitute meaningful operational IP for an MRO. A PE buyer would evaluate the platform itself as a technology asset. The traditional IP register items (patents, trademarks) are unlikely to be relevant for most MRO repair stations.

---

### 5. Human Resources & Employee Benefits — PARTIAL COVERAGE

**What Athelon Has:**
- `technicians` table: legal name, employee ID, status (active/inactive/terminated), email, phone, role, organization, shop location, roster team
- `certificates` table: FAA certificate type, number, issue date, ratings, IA authorization status, IA expiry, IA renewal activities, repair station authorizations — **full FAA certification lifecycle**
- `technicianShifts`: shift patterns, efficiency multipliers
- `rosterTeams`: team structure and assignments
- `trainingRecords`: training type, completion status, expiry tracking, instructor
- `qualificationRequirements`: required qualifications by role
- `ojtJackets` / `ojtStageEvents` / `ojtAuthorizations`: full OJT progression tracking with immutable sign-off events
- `technicianTraining`: training course tracking
- RBAC roles (8 MRO-specific roles with permission levels)

**What's Missing:**
- Compensation data (base salary, bonus, equity)
- Benefits plan documents (health, 401k, pension)
- Employment agreements and non-competes
- Headcount by department, location, and employment type (only technicians are tracked — admin, sales, management staff are not in the system)
- Turnover and attrition statistics
- Labor relations (CBAs, union status)
- Employee handbook and HR policies
- Workers' compensation claims
- WARN Act compliance
- Immigration/visa status

**Gap Severity: HIGH for compensation/benefits; LOW for certification/training** — Athelon captures the most valuable and hardest-to-get HR data for an MRO: FAA certification currency, training records, and qualification status. This is exactly what PE buyers struggle to verify during MRO diligence. However, traditional HR/compensation data is absent.

**Key PE Insight:** For MRO acquisitions, the single biggest HR risk is key-person dependency on certified technicians (especially IA holders). Athelon's certificate and training tracking directly addresses this risk — a PE buyer could instantly see how many IA-holders the shop has, when their authorizations expire, and what the training pipeline looks like.

---

### 6. Material Contracts — PARTIAL COVERAGE

**What Athelon Has:**
- `customers` table with contact info, billing terms, credit limits, tax IDs — but no contract documents
- `vendors` table with vendor type classification and contact info
- `vendorServices` table: vendor service capabilities
- Customer-level invoicing and payment history (demonstrates ongoing commercial relationships)
- `crmOpportunities`: pipeline data (deal size, probability, stage)
- `crmInteractions`: customer communication history
- `purchaseOrders`: supplier spend by vendor

**What's Missing:**
- Actual contract documents (MSAs, service agreements)
- Change-of-control provisions analysis
- Contract expiration dates and auto-renewal terms
- Customer concentration analysis document (though the data to produce one exists)
- Government contract documentation (FAR/DFARS if applicable)
- Partnership and JV agreements

**Gap Severity: MEDIUM** — Athelon doesn't store contract documents, but it contains the transactional data that makes contract analysis meaningful: revenue by customer, payment history, vendor spend. A PE buyer could derive customer concentration metrics directly from Athelon's invoice data.

---

### 7. Customers & Sales — STRONG COVERAGE

**What Athelon Has:**
- `customers`: full customer records with billing terms, credit limits, tax configuration
- `crmContacts`: multi-contact management per customer
- `crmInteractions`: interaction tracking (calls, emails, meetings, notes)
- `crmOpportunities`: sales pipeline with stage, probability, value, close dates
- `crmHealthSnapshots`: customer health scoring
- `crmProspectCampaignAssessments`: prospect intelligence and campaign tracking
- `prospectNotes`: prospect engagement notes
- Revenue by customer (derivable from invoices)
- Customer churn (derivable from work order frequency over time)
- `customerRequests`: customer portal request tracking

**What's Missing:**
- Formal customer concentration analysis document
- Win/loss analysis with reason codes
- NPS scores or formal satisfaction surveys
- Sales team structure and compensation plans

**Gap Severity: LOW** — Athelon captures the raw data a PE buyer needs for commercial diligence. Customer concentration, revenue trends, churn patterns, and pipeline value are all derivable from the existing data model.

---

### 8. Operations & Supply Chain — STRONG COVERAGE

**What Athelon Has (this is where Athelon excels):**
- `workOrders`: full work order lifecycle with 10-status state machine, priority, scheduling
- `taskCards` / `taskCardSteps`: granular task execution with step-level sign-off
- `discrepancies`: finding/squawk tracking with OP-1003 classification
- `maintenanceRecords`: immutable 14 CFR 43.9 compliant records
- `inspectionRecords`: immutable 14 CFR 43.11 compliant records
- `returnToService`: immutable RTS records
- `parts` / `partInstallationHistory` / `partHistory` / `partDocuments`: full parts lifecycle
- `testEquipment`: calibration tracking
- `hangarBays` / `scheduleAssignments`: capacity planning
- `toolRecords`: tool tracking and calibration
- `shipments` / `shipmentItems`: shipping and receiving
- `rotables` / `rotableHistory`: rotable component management
- `inventoryCounts` / `inventoryCountItems`: inventory count processes
- `warrantyClaims` / `coreTracking`: warranty and core return tracking
- `warehouses` / `warehouseAreas` / `warehouseShelves` / `warehouseBins`: full warehouse hierarchy
- Operational KPIs derivable: WO turnaround time, technician utilization, parts cost per WO, task completion rates

**What's Missing:**
- Supply chain documentation (supplier dependency analysis, sole-source supplier identification)
- Formal quality management system (QMS) manual and ISO certifications
- Manufacturing/operations process documentation
- Deferred maintenance backlog quantification (though carryForwardItems partially covers this)

**Gap Severity: VERY LOW** — This is Athelon's core domain. The operational data captured is more granular and more auditable than what PE buyers typically find in any data room. The immutable maintenance records, calibration traceability, and parts chain-of-custody tracking are exactly what demonstrates operational excellence to a PE buyer.

**Key PE Insight:** An MRO's operational data quality is a direct proxy for management quality — the #1 signal PE firms look for. Athelon's immutable record architecture, signature authentication, and regulatory invariants demonstrate a level of operational discipline that would be a strong positive signal in diligence.

---

### 9. Information Technology & Cybersecurity — NO COVERAGE (Expected)

Athelon is itself the IT system being evaluated, not a repository for IT documentation. IT diligence of an MRO would evaluate Athelon's:
- Architecture (Convex serverless, React frontend, Clerk auth)
- Security posture (signature auth events, RBAC, audit logging)
- Data integrity (immutable records, invariant enforcement)
- Integration capabilities (QuickBooks sync, CAMP linkage, ADS-B integration)

**Gap Severity: N/A** — IT documentation about the target company's infrastructure would live outside Athelon. However, Athelon's own architecture documentation would be part of the IT diligence workstream.

---

### 10. Environmental, Health & Safety — MINIMAL COVERAGE

**What Athelon Has:**
- Training records that may include safety training
- OSHA-relevant data is not explicitly tracked

**What's Missing:**
- Environmental permits
- Phase I/II ESA reports
- Hazardous materials inventory
- OSHA 300 logs
- Workers' compensation claims
- Spill response plans
- EPA/state agency correspondence

**Gap Severity: MEDIUM** — MRO repair stations handle hazardous materials (solvents, sealants, paints, hydraulic fluid). Environmental compliance documentation is a standard PE diligence requirement for aviation MROs.

---

### 11. Insurance — NO COVERAGE

No insurance policy, claims, or coverage data is captured in Athelon. This is expected — insurance documentation lives with the broker/carrier.

**Gap Severity: LOW** (appropriate — insurance data belongs elsewhere)

---

### 12. Real Estate & Facilities — MINIMAL COVERAGE

**What Athelon Has:**
- `shopLocations`: name, address, phone, email, timezone, status
- `hangarBays`: bay names, dimensions, aircraft compatibility, status
- `warehouses` / `warehouseAreas`: warehouse hierarchy

**What's Missing:**
- Lease agreements and terms
- Property deeds
- Facility condition assessments
- Capital improvement plans
- Rent/cost data per location

**Gap Severity: MEDIUM** — Athelon knows where the facilities are and how they're configured operationally, but has no financial or legal property data.

---

### 13. Regulatory, Compliance & Government — STRONG COVERAGE

**What Athelon Has:**
- Part 145 certificate tracking at the organization level
- `airworthinessDirectives` / `adCompliance`: full AD compliance lifecycle
- `complianceLedgerEvents`: append-only compliance state transitions
- `taskComplianceItems`: per-task regulatory reference tracking (AD, SB, AMM, CMM, FAA approved data)
- `qcmReviews`: QCM post-close reviews (signed compliance actions)
- `inspectionRecords`: formal inspection records with airworthiness determinations
- `returnToService`: RTS records with IA verification
- `auditLog`: comprehensive system audit trail
- `certificates`: technician certification tracking with repair station authorizations
- `signatureAuthEvents`: cryptographic signature authentication
- `conformityInspections`: parts conformity inspection records
- `evidenceChecklistTemplates` / `workOrderEvidenceChecklistItems`: evidence hub checklists

**What's Missing:**
- Operating licenses beyond Part 145 (state/local business licenses)
- FCPA/anti-bribery compliance program (unlikely relevant for domestic MRO)
- Export control documentation (relevant if the shop handles ITAR parts)
- Government contract compliance documentation

**Gap Severity: VERY LOW** — Athelon's regulatory compliance tracking is comprehensive for the FAA Part 145 domain. This is the area where PE buyers have the most difficulty getting structured data from MRO targets, and Athelon delivers it in auditable, immutable form.

---

### 14. Litigation, Disputes & Contingencies — NO COVERAGE

No litigation, claims, or dispute tracking exists in Athelon. This is appropriate — litigation data lives with legal counsel.

**Gap Severity: LOW** (appropriate — litigation data belongs with counsel)

---

### 15. ESG & Sustainability — NO COVERAGE

No ESG data capture exists in Athelon. For a small-to-mid-size MRO repair station, ESG diligence is typically lightweight.

**Gap Severity: LOW** for MRO context

---

## What Makes Athelon Uniquely Valuable for PE Due Diligence

Despite the gaps in traditional corporate/financial domains, Athelon provides capabilities that most PE targets cannot offer:

### 1. Immutable Regulatory Records
`maintenanceRecords`, `inspectionRecords`, and `returnToService` tables are architecturally immutable (no `updatedAt` field — corrections create new records). This means a PE buyer can trust that the maintenance history has not been retroactively altered. This level of data integrity is rare in MRO due diligence.

### 2. Cryptographic Signature Authentication
Every signing action flows through `signatureAuthEvents` with re-authentication (PIN, biometric, MFA), 5-minute TTL, one-time consumption, and IP/device logging. This creates a legally defensible chain of authority that exceeds what most MROs can demonstrate.

### 3. Granular Operational Unit Economics
From Athelon's data, a PE buyer can compute:
- **Revenue per aircraft** (invoices → work orders → aircraft)
- **Labor cost per work order** (time entries → technician rates)
- **Parts cost per work order** (work order parts → unit costs)
- **Technician utilization** (time entries vs. shift capacity)
- **Work order turnaround time** (openedAt → closedAt)
- **Customer lifetime value** (invoice history by customer)
- **Pricing effectiveness** (quoted vs. invoiced amounts)

This level of granularity is what PE accounting advisors spend 4–6 weeks requesting during QoE. An MRO running Athelon could provide it on day one.

### 4. Compliance Readiness Score
The `complianceLedgerEvents` and `adCompliance` tables provide a real-time compliance posture. A PE buyer could instantly assess:
- How many ADs are pending compliance?
- What's the average compliance lag?
- Are there any overdue recurring ADs?
- What's the QCM review completion rate?

### 5. Customer Concentration Data
From `invoices` + `customers`, a PE buyer can generate customer concentration analysis (top 10/20 customers by revenue, multi-year trends) without requesting spreadsheets from the CFO.

---

## Recommendations: Closing the Gaps

### High-Value, Low-Effort Additions

| Feature | PE Diligence Impact | Implementation Effort |
|---|---|---|
| **Document attachment to any entity** | Enables contract, policy, and corporate document storage alongside operational records | Already exists (`documents` table + `DocumentAttachmentPanel`); needs wider entity support |
| **Customer contract metadata** | Contract dates, renewal terms, change-of-control flags on customer records | Schema addition to `customers` table |
| **Financial report exports** | Revenue by customer, AR aging, labor utilization as downloadable Excel/PDF | Query + export layer over existing data |
| **Employee (non-technician) records** | Administrative, sales, and management staff tracking | New table or extension of `technicians` |
| **Insurance policy tracker** | Policy numbers, expiration dates, coverage amounts, carrier info | New lightweight table |
| **Property/lease tracker** | Lease terms, expiration, rent, landlord info per `shopLocations` | Schema addition to `shopLocations` |

### Medium-Value, Medium-Effort Additions

| Feature | PE Diligence Impact | Implementation Effort |
|---|---|---|
| **Formal QMS documentation repository** | Store RSM, QCM manual, procedures manual as versioned documents | Document management extension |
| **Environmental permit tracking** | Permit numbers, expiry dates, issuing agency | New table linked to `shopLocations` |
| **OSHA recordable incident tracking** | TRIR/DART rates — standard PE safety metric | New table |
| **Compensation data on technician records** | Base rate, overtime rate, benefits cost — enables labor cost validation | Schema addition to `technicians` |
| **Supplier dependency analysis** | Flag sole-source suppliers, track vendor concentration | Analytics query over `purchaseOrders` + `vendors` |

### Data Room Export Feature (Highest Strategic Value)

The single most impactful feature Athelon could build for PE readiness:

**A "Data Room Export" module** that generates a structured document package organized by PE diligence categories:

```
Export Package:
  02 — Financial/
    Revenue_by_Customer_3yr.xlsx
    AR_Aging_Report.xlsx
    Labor_Cost_by_WO.xlsx
    Parts_Cost_Summary.xlsx
    Invoice_Register.xlsx
  05 — Personnel/
    Technician_Roster.xlsx
    Certificate_Status_Report.xlsx
    Training_Compliance_Matrix.xlsx
    IA_Holder_Summary.xlsx
  08 — Operations/
    Work_Order_History.xlsx
    Turnaround_Time_Analysis.xlsx
    Capacity_Utilization.xlsx
    Parts_Inventory_Valuation.xlsx
  13 — Compliance/
    AD_Compliance_Status.xlsx
    QCM_Review_Log.xlsx
    Maintenance_Record_Register.xlsx
    Audit_Trail_Export.xlsx
```

This would allow any Athelon customer preparing for a PE transaction to generate their operational data room in minutes rather than weeks — a differentiated selling point for the platform.

---

## Summary Scorecard

| PE Data Room Category | Coverage Level | Score |
|---|---|---|
| 01 — Corporate & Organizational | Minimal | 1/5 |
| 02 — Financial Information | Partial (operational only) | 2/5 |
| 03 — Tax | None (appropriate) | 0/5 |
| 04 — IP & Technology | Partial | 2/5 |
| 05 — HR & Employee Benefits | Strong for certs/training; gap on compensation | 3/5 |
| 06 — Material Contracts | Partial (no documents, has transactional data) | 2/5 |
| 07 — Customers & Sales | Strong | 4/5 |
| 08 — Operations & Supply Chain | **Exceptional** | 5/5 |
| 09 — IT & Cybersecurity | N/A (platform is the subject) | N/A |
| 10 — Environmental, Health & Safety | Minimal | 1/5 |
| 11 — Insurance | None (appropriate) | 0/5 |
| 12 — Real Estate & Facilities | Minimal | 1/5 |
| 13 — Regulatory & Compliance | **Exceptional** | 5/5 |
| 14 — Litigation & Disputes | None (appropriate) | 0/5 |
| 15 — ESG & Sustainability | None | 0/5 |

**Overall Operational Readiness: HIGH** — Athelon covers the hardest-to-get data for MRO PE diligence.
**Overall Corporate/Financial Readiness: LOW** — Standard corporate governance, financial, and HR data is absent.

**Net Assessment:** An MRO repair station running Athelon would be significantly better prepared for PE due diligence than a shop using spreadsheets and paper records for its operational data — which is the typical state of most MROs. The operational and compliance data captured by Athelon is exactly what PE operating partners struggle to extract during diligence, and having it structured, auditable, and exportable would materially accelerate a deal process and potentially improve valuation by reducing the "operational risk" discount that PE buyers apply to poorly-documented MROs.

---

*Analysis based on: Athelon Convex schema (100+ tables, ~6000 lines), UX evaluation (142 page surfaces, 7 modules), and PE due diligence data room standards from Kirkland & Ellis, Datasite, Intralinks, and top PE firm DDR templates.*
