# Virtual Data Room (VDR) Structure & Organization for Fortune 500 Private Equity Due Diligence

## Overview

This document consolidates best-practice guidance for organizing a virtual data room in a Fortune 500 sell-side or dual-track process where top-tier PE sponsors (KKR, Blackstone, Apollo, Carlyle, Bain Capital) are the expected buyers. The guidance reflects the standards used by major investment banks (Goldman Sachs, Morgan Stanley, Lazard, Evercore), leading PE counsel (Kirkland & Ellis, Simpson Thacher, Weil Gotshal, Latham & Watkins), and the major VDR platforms (Datasite/Merrill, Intralinks/SS&C, Ansarada, Venue/RR Donnelley).

---

## Part 1: Standard Folder Taxonomy

### Top-Level Architecture

Top PE firms expect a numbered taxonomy so items auto-sort consistently regardless of platform. The universally accepted convention is to prefix every top-level folder with a two-digit number. The 15-category structure below mirrors the index used in Kirkland & Ellis and Weil Gotshal buy-side checklists and the Datasite/Intralinks default templates.

```
01 – Corporate & Organizational
02 – Financial Information
03 – Tax
04 – Intellectual Property & Technology
05 – Human Resources & Employee Benefits
06 – Material Contracts
07 – Customers & Sales
08 – Operations & Supply Chain
09 – Information Technology & Cybersecurity
10 – Environmental, Health & Safety
11 – Insurance
12 – Real Estate & Facilities
13 – Regulatory, Compliance & Government
14 – Litigation, Disputes & Contingencies
15 – ESG & Sustainability
```

> Note: Some PE firms (Blackstone in particular) request a separate folder `00 – Deal Workstream` containing NDA, process letters, and management presentation, kept at index position zero so it does not disrupt the main numbering.

---

### Detailed Subfolder Hierarchies

#### 01 – Corporate & Organizational

```
01.01  Corporate Governance
       01.01.01  Certificate of Incorporation & Articles (all jurisdictions)
       01.01.02  Bylaws / Operating Agreements (current + all amendments)
       01.01.03  Board Resolutions (3-year history)
       01.01.04  Board Committee Charters (Audit, Compensation, Nom/Gov)
       01.01.05  Shareholder Meeting Minutes (5-year history)
       01.01.06  Board Meeting Minutes (5-year history)

01.02  Organizational Structure
       01.02.01  Legal Entity Chart (fully annotated, ownership %)
       01.02.02  Subsidiary Register (all active + dormant entities)
       01.02.03  Organizational Chart (management, by business unit)
       01.02.04  Foreign Qualifying Documents by Jurisdiction

01.03  Capital Structure & Equity
       01.03.01  Cap Table (fully diluted, current)
       01.03.02  Stock Ledger & Transfer History
       01.03.03  Equity Incentive Plans (all active plans)
       01.03.04  Outstanding Option / Warrant / RSU Schedules
       01.03.05  Registration Rights Agreements
       01.03.06  Stockholder / Investor Agreements

01.04  Corporate History
       01.04.01  Acquisition & Divestiture History (with deal docs)
       01.04.02  Prior Financing History
       01.04.03  Corporate Name Change History

01.05  Authorizations & Good Standing
       01.05.01  Good Standing Certificates (all jurisdictions — dated <90 days)
       01.05.02  Foreign Qualification Certificates
       01.05.03  Business Licenses & Permits
```

#### 02 – Financial Information

```
02.01  Historical Financial Statements
       02.01.01  Audited Financials (5 years: Income Statement, Balance Sheet, Cash Flow, Notes)
       02.01.02  Audit Reports & Management Letters
       02.01.03  Interim Unaudited Financials (LTM + current quarter)
       02.01.04  Prior-Year Audit Committee Letters

02.02  Management Accounts
       02.02.01  Monthly P&L by Business Unit / Segment (3 years)
       02.02.02  Monthly Balance Sheet (3 years)
       02.02.03  Monthly Cash Flow (3 years)

02.03  Financial Model & Projections
       02.03.01  Board-Approved Operating Plan / Budget (3 years forward)
       02.03.02  Long-Range Plan (LRP)
       02.03.03  Financial Model (working Excel — unlocked for QoE)
       02.03.04  Sensitivity Analysis / Scenario Models

02.04  Quality of Earnings (QoE) Support
       02.04.01  EBITDA Bridge (GAAP → Adjusted)
       02.04.02  Non-Recurring & One-Time Item Schedule
       02.04.03  Pro Forma Adjustments Schedule
       02.04.04  Working Capital Analysis

02.05  Debt & Financing
       02.05.01  Credit Agreements (all tranches — senior, mezzanine, revolver)
       02.05.02  Debt Amortization Schedules
       02.05.03  Letters of Credit, Guarantees
       02.05.04  Covenant Compliance Certificates (12 months)
       02.05.05  Waiver / Amendment History

02.06  Accounts Receivable & Revenue
       02.06.01  AR Aging Report (current)
       02.06.02  Revenue by Customer (top 20, 3 years)
       02.06.03  Deferred Revenue Schedule
       02.06.04  Bad Debt Write-Off History

02.07  Capital Expenditures
       02.07.01  CapEx Schedule (3 years actual + 3 years projected)
       02.07.02  Fixed Asset Register
       02.07.03  Lease vs. Buy Analysis (major assets)

02.08  Related-Party Transactions
       02.08.01  All Related-Party Agreements & Disclosures

02.09  Accounting Policies
       02.09.01  Revenue Recognition Policy
       02.09.02  Significant Accounting Policy Memos
       02.09.03  Change-in-Accounting-Estimate Memos
```

#### 03 – Tax

```
03.01  Tax Returns
       03.01.01  Federal Income Tax Returns (5 years)
       03.01.02  State & Local Income Tax Returns (5 years, all jurisdictions)
       03.01.03  Foreign Tax Returns (5 years, all jurisdictions)
       03.01.04  Payroll Tax Returns (3 years)
       03.01.05  Sales & Use Tax Returns (3 years)

03.02  Tax Compliance
       03.02.01  Tax Payment & Refund History
       03.02.02  Transfer Pricing Documentation & Studies
       03.02.03  Section 382 / NOL Limitation Analysis
       03.02.04  R&D Tax Credit Documentation

03.03  Tax Disputes & Audits
       03.03.01  Open & Closed Tax Audit Files (IRS + state)
       03.03.02  Tax Controversy Correspondence
       03.03.03  IRS Revenue Agent Reports (RAR)
       03.03.04  Protest Letters, Appeals, Tax Court Filings

03.04  Tax Planning & Structuring
       03.04.01  Material Tax Opinion Letters
       03.04.02  Ruling Requests & IRS Private Letter Rulings
       03.04.03  Transaction-Related Tax Structuring Memos

03.05  Tax Sharing & Indemnity Agreements
       03.05.01  Tax Sharing Agreements (inter-company)
       03.05.02  Tax Indemnification Agreements (prior acquisitions)
```

#### 04 – Intellectual Property & Technology

```
04.01  IP Portfolio
       04.01.01  Patent Register (granted + pending, all jurisdictions)
       04.01.02  Trademark Register (registered + pending, all jurisdictions)
       04.01.03  Copyright Register
       04.01.04  Trade Secret Policy & Register
       04.01.05  Domain Name Portfolio

04.02  IP Agreements
       04.02.01  IP Assignment Agreements (employee, contractor, founder)
       04.02.02  License Agreements — Inbound (software, patents, content)
       04.02.03  License Agreements — Outbound (customers, partners)
       04.02.04  Joint Development Agreements
       04.02.05  Open Source Usage Policy & Inventory

04.03  Technology & Product
       04.03.01  Product Roadmap
       04.03.02  Technology Architecture Overview
       04.03.03  Software Development Lifecycle (SDLC) Documentation
       04.03.04  Source Code Escrow Agreements

04.04  IP Disputes
       04.04.01  Freedom-to-Operate Opinions
       04.04.02  IP Litigation & Dispute History
       04.04.03  Cease-and-Desist Correspondence
```

#### 05 – Human Resources & Employee Benefits

```
05.01  Workforce Overview
       05.01.01  Headcount by Department, Location, Type (FT/PT/Contractor)
       05.01.02  Organizational Chart (detailed, by function)
       05.01.03  Turnover & Attrition Statistics (3 years)
       05.01.04  Hiring & Recruiting Activity

05.02  Compensation & Payroll
       05.02.01  Compensation Schedule (base, bonus, equity — all employees)
       05.02.02  Payroll Summary by Region (3 years)
       05.02.03  Annual Bonus Plans & Performance Metrics
       05.02.04  Sales Commission Plans
       05.02.05  Executive Compensation — CD&A (if public) or equivalent

05.03  Equity & Long-Term Incentives
       05.03.01  Equity Plan Documents (all active plans)
       05.03.02  Grant Schedules (outstanding options, RSUs, warrants)
       05.03.03  Acceleration & Change-of-Control Provisions

05.04  Key Employee Agreements
       05.04.01  Executive Employment Agreements (C-Suite, SVP and above)
       05.04.02  Non-Compete / Non-Solicit Agreements
       05.04.03  Severance Agreements & Change-of-Control Packages
       05.04.04  Retention Agreements & Signing Bonuses

05.05  Employee Benefits
       05.05.01  Health, Dental, Vision Plan Summaries
       05.05.02  401(k) / Pension Plan Documents & Actuarial Reports
       05.05.03  Defined Benefit Plan (if applicable) — PBGC Filings, Funding Status
       05.05.04  SERP / Executive Pension Plans
       05.05.05  Summary Plan Descriptions (all qualified plans)
       05.05.06  Form 5500 Filings (5 years)

05.06  Labor Relations
       05.06.01  Collective Bargaining Agreements (all active CBAs)
       05.06.02  Works Council Agreements (international)
       05.06.03  NLRB Filings & Union Organizing History
       05.06.04  Labor Dispute History

05.07  HR Policies & Compliance
       05.07.01  Employee Handbook (current)
       05.07.02  Equal Employment Opportunity (EEO) Data & Reports
       05.07.03  WARN Act Compliance History
       05.07.04  Workers' Compensation Claims History
       05.07.05  Immigration & Work Authorization (I-9 policy, visa inventory)
       05.07.06  Workplace Safety Records (OSHA 300 logs, 3 years)
```

#### 06 – Material Contracts

```
06.01  Customer Contracts
       06.01.01  Top 20 Customer Agreements (by revenue)
       06.01.02  Master Service Agreements (MSAs)
       06.01.03  Government & Public Sector Contracts
       06.01.04  SaaS / Subscription Agreements (template + material deviations)

06.02  Supplier & Vendor Contracts
       06.02.01  Top 20 Supplier Agreements (by spend)
       06.02.02  Single-Source & Sole-Source Supplier Agreements
       06.02.03  Logistics & Freight Agreements

06.03  Partnership & Alliance Agreements
       06.03.01  Strategic Partnerships
       06.03.02  Reseller & Channel Agreements
       06.03.03  Joint Ventures & Teaming Agreements

06.04  Financial & Banking Agreements
       06.04.01  Banking Relationships & Account Control Agreements
       06.04.02  Factoring / AR Financing Agreements
       06.04.03  Surety Bonds & Letters of Credit

06.05  Government Contracts
       06.05.01  Federal / State / Local Government Contracts
       06.05.02  GSA Schedule Contracts
       06.05.03  FAR / DFARS Compliance Documentation

06.06  Contract Summaries
       06.06.01  Material Contract Summary Matrix
```

#### 07 – Customers & Sales

```
07.01  Customer Data
       07.01.01  Customer List (anonymized or restricted view) — top 50 by revenue
       07.01.02  Customer Concentration Analysis
       07.01.03  Churn / Retention Analysis (3 years)
       07.01.04  Net Revenue Retention (NRR) / Net Dollar Retention (NDR)

07.02  Sales & Revenue Analytics
       07.02.01  Revenue by Product / Service / Segment (3 years)
       07.02.02  Revenue by Geography (3 years)
       07.02.03  Revenue by Channel (3 years)
       07.02.04  Revenue Cohort Analysis
       07.02.05  Bookings, Backlog & Pipeline Reporting

07.03  Sales Organization
       07.03.01  Sales Team Structure & Headcount
       07.03.02  Sales Compensation Plans
       07.03.03  CRM System Overview & Key Metrics

07.04  Marketing
       07.04.01  Brand Guidelines & Marketing Collateral
       07.04.02  Key Marketing Campaign Performance
       07.04.03  Market Research & Competitive Analysis
```

#### 08 – Operations & Supply Chain

```
08.01  Operations Overview
       08.01.01  Operations Narrative / Management Presentation
       08.01.02  Manufacturing Process Documentation
       08.01.03  Quality Management System (ISO certifications, QMS manual)
       08.01.04  Operational KPIs & Metrics Dashboard

08.02  Supply Chain
       08.02.01  Supplier Dependency Analysis
       08.02.02  Inventory Policies & Levels
       08.02.03  Logistics Network Overview

08.03  CapEx & Maintenance
       08.03.01  Deferred Maintenance Schedule
       08.03.02  Capital Project Pipeline
```

#### 09 – Information Technology & Cybersecurity

```
09.01  IT Infrastructure
       09.01.01  IT Architecture Overview
       09.01.02  Hardware & Software Inventory
       09.01.03  Network Diagram
       09.01.04  Data Center Locations & Contracts

09.02  Enterprise Applications
       09.02.01  ERP System (SAP, Oracle, etc.) — License & Support Agreements
       09.02.02  CRM, HCM, SCM System Licenses
       09.02.03  SaaS Application Inventory

09.03  Cybersecurity
       09.03.01  Information Security Policy
       09.03.02  SOC 2 / ISO 27001 Reports (most recent)
       09.03.03  Penetration Test Reports (last 2 years)
       09.03.04  Cybersecurity Incident History
       09.03.05  Vulnerability Assessment & Remediation Plans

09.04  Data Privacy
       09.04.01  Data Privacy Policy & GDPR / CCPA Compliance Program
       09.04.02  Data Processing Agreements (with customers, processors)
       09.04.03  Privacy Breach History & Regulatory Notifications

09.05  Business Continuity
       09.05.01  Business Continuity Plan (BCP)
       09.05.02  Disaster Recovery Plan (DRP) & Test Results
```

#### 10 – Environmental, Health & Safety

```
10.01  Environmental Compliance
       10.01.01  Environmental Permits (all active — NPDES, air, hazardous waste)
       10.01.02  Phase I / Phase II Environmental Site Assessments
       10.01.03  Hazardous Materials Inventory & MSDS / SDS
       10.01.04  Spill Response Plans

10.02  Regulatory Filings
       10.02.01  EPA / State Agency Correspondence (5 years)
       10.02.02  Superfund / CERCLA Notices & Consent Orders
       10.02.03  Environmental Violations & Notices of Violation

10.03  Health & Safety
       10.03.01  OSHA 300 Logs (3 years)
       10.03.02  Incident Investigation Reports
       10.03.03  Workers' Compensation Claims Summary
       10.03.04  Safety Training Programs

10.04  Climate & Sustainability
       10.04.01  GHG Emissions Data (Scope 1/2/3, if tracked)
       10.04.02  Sustainability Reports
```

#### 11 – Insurance

```
11.01  Insurance Portfolio
       11.01.01  Insurance Binder Summary (all active policies)
       11.01.02  General Liability Policy
       11.01.03  D&O Policy (directors & officers)
       11.01.04  E&O / Professional Liability Policy
       11.01.05  Property & Casualty Policy
       11.01.06  Workers' Compensation Policy
       11.01.07  Cyber Liability Policy
       11.01.08  Key Man / Life Insurance Policies
       11.01.09  Environmental Liability Policy

11.02  Claims History
       11.02.01  Material Claims & Loss History (5 years)
       11.02.02  Reservation of Rights Letters
```

#### 12 – Real Estate & Facilities

```
12.01  Owned Properties
       12.01.01  Deeds & Title Insurance Policies
       12.01.02  Surveys, Site Plans, Environmental Studies
       12.01.03  Mortgage Documents

12.02  Leased Properties
       12.02.01  All Active Leases (with key term summaries)
       12.02.02  Lease Abstracts Matrix
       12.02.03  Sublease Agreements
       12.02.04  Option to Renew / Purchase Provisions

12.03  Facilities
       12.03.01  Facilities Maintenance Agreements
       12.03.02  Capital Improvement Plans

12.04  Real Estate Schedule
       12.04.01  Property Summary Schedule (address, sq ft, tenure, expiry, annual rent)
```

#### 13 – Regulatory, Compliance & Government

```
13.01  Licenses & Permits
       13.01.01  Federal & State Operating Licenses
       13.01.02  Professional & Industry Licenses
       13.01.03  Export Control & ITAR/EAR Registrations

13.02  Regulatory Filings
       13.02.01  Industry-Specific Regulatory Filings (e.g., FDA, FCC, FINRA, FERC)
       13.02.02  Annual Reports to Regulatory Bodies

13.03  Compliance Program
       13.03.01  Code of Ethics / Code of Conduct
       13.03.02  Anti-Bribery / FCPA Compliance Program & Training Records
       13.03.03  AML / KYC Policy (if applicable)
       13.03.04  OFAC / Sanctions Compliance Program
       13.03.05  Compliance Audit Reports (internal + external, 3 years)

13.04  Government Investigations
       13.04.01  Government Investigation Correspondence (all agencies)
       13.04.02  Subpoenas, CIDs, Document Holds
       13.04.03  Deferred Prosecution Agreements (DPAs) / Non-Prosecution Agreements (NPAs)

13.05  Antitrust & Competition
       13.05.01  HSR Filings (prior transactions)
       13.05.02  Competition Authority Correspondence
```

#### 14 – Litigation, Disputes & Contingencies

```
14.01  Active Litigation
       14.01.01  Litigation Summary Matrix (plaintiff, claim, status, estimated exposure)
       14.01.02  Pleadings & Key Court Filings (material matters)
       14.01.03  Expert Reports (material matters)

14.02  Threatened Claims
       14.02.01  Demand Letters & Threatened Litigation

14.03  Settled Matters
       14.03.01  Settlement Agreements (last 5 years)
       14.03.02  Consent Decrees & Injunctions

14.04  Arbitration & Mediation
       14.04.01  AAA / JAMS / ICC Proceedings

14.05  Contingent Liabilities
       14.05.01  Indemnification Obligations (prior transactions)
       14.05.02  Guarantees Issued to Third Parties
       14.05.03  Product Liability & Recall History
```

#### 15 – ESG & Sustainability

```
15.01  ESG Governance
       15.01.01  Board ESG Committee Charter or Oversight Policy
       15.01.02  ESG Risk Assessment

15.02  ESG Reporting
       15.02.01  Published Sustainability Reports
       15.02.02  ESG Ratings (MSCI, Sustainalytics, CDP scores)
       15.02.03  GHG Emissions Inventory & Reduction Targets

15.03  Social Responsibility
       15.03.01  DEI Programs & Metrics
       15.03.02  Community Investment Programs
       15.03.03  Supply Chain Human Rights Policy & Audits
```

---

## Part 2: Document Naming Conventions

### Core Naming Formula

The universally recommended format across Datasite, Intralinks, and Ansarada default templates is:

```
[FolderNumber]_[DocumentType]_[CompanyOrEntity]_[Period]_[Version].[ext]
```

**Examples:**
```
02.01.01_AuditedFinancials_Consolidated_FY2023_v1.pdf
02.01.01_AuditedFinancials_Consolidated_FY2024_v1.pdf
02.03.01_Budget_Board-Approved_FY2025-2027_v2.xlsx
05.04.01_EmploymentAgreement_JohnSmith-CEO_Executed_2022-03-15.pdf
12.02.01_Lease_NYC-HQ-1234ParkAve_Expires-2031-06_v1.pdf
```

### Naming Rules

**1. Avoid special characters.** No `/ \ : * ? " < > |` — these break VDR indexing and some PDF previews. Use hyphens (`-`) or underscores (`_`). Never use spaces in filenames at the folder or file level.

**2. Use ISO 8601 dates.** Always `YYYY-MM-DD` or `YYYY-QQ` or `FYXXXX`. Never `03/15/22` — it is ambiguous across jurisdictions and sorts incorrectly.

**3. Include version suffixes.** `_v1`, `_v2`, `_FINAL`, `_EXECUTION` — one of these must always be the last token before the extension. PE diligence counsel (Kirkland, Weil) will flag a VDR where multiple versions of the same document exist with no version control as a yellow flag on process quality.

**4. Indicate document status in the name.** Common status tokens:
- `_DRAFT` — internal working draft
- `_FINAL` — approved for distribution
- `_EXECUTION` — fully signed/countersigned version
- `_REDACTED` — redacted version produced to bidder
- `_SUPERSEDED` — prior version (move to `_Archive` subfolder)

**5. Entity name in multi-subsidiary companies.** For a company with 30+ subsidiaries, prefix the legal entity name early in the filename:
```
03.01.01_FederalTaxReturn_HoldCo-LLC_FY2023_v1.pdf
03.01.01_FederalTaxReturn_OpCo-Inc_FY2023_v1.pdf
```

**6. Descriptive but not verbose.** The filename should be legible in a 60-character truncated view.

**7. Consistency across the entire VDR.** Pick one convention at the start and enforce it. Inconsistency signals a disorganized seller to PE buyers.

---

## Part 3: Master Index Structure

### The Index Document

Every professionally run VDR includes a downloadable Master Index as file `00.00_Master-Index_[CompanyName]_[Date].xlsx`. It is kept in a top-level `00 – Index & Deal Workstream` folder or provided at root.

### Master Index Columns

| Column | Description |
|---|---|
| **Index Number** | Hierarchical decimal (01.02.03) |
| **Folder Path** | Full folder path string |
| **Document Title** | Human-readable descriptive title |
| **Filename** | Exact filename as uploaded |
| **Document Type** | Category tag (Agreement, Financial Statement, Policy, Report, etc.) |
| **Status** | Uploaded / Placeholder / Redacted / Withheld |
| **Period / As-Of Date** | The period covered (FY2023, Q3 2024, as of 2024-09-30) |
| **Version** | v1, v2, FINAL, EXECUTION |
| **Counterparty / Issuer** | Name of issuing party or counterparty (for contracts) |
| **Expiry / Term End** | For leases, licenses, agreements |
| **Notes / Flags** | Seller notes, redaction explanations, cross-references |
| **Uploaded Date** | When document was added to VDR |
| **Uploaded By** | Role of uploader (Seller, Seller Counsel, Auditor) |
| **Buyer Access Level** | Which buyer groups can access (All Bidders / Phase 2 Only / Management Presentation Only) |
| **Cross-Reference** | Index numbers of related documents |

### Index Management Rules

- The index must be **re-exported and re-published** every time documents are added.
- **Placeholders** should be used immediately for documents that are forthcoming. A row with status `Placeholder - Due [Date]` is far preferable to an empty folder.
- **Withheld documents** must be listed with a clear reason (`Competitively Sensitive - Phase 2 Only`, `Subject to Third-Party Consent`, `Under Attorney-Client Privilege`).

---

## Part 4: Prioritization Tiers

### Tier 1 — Day 1 (First-Round / IOI Stage)

These documents must be uploaded before sending process letters.

| Folder | Documents |
|---|---|
| 01 – Corporate | Legal entity chart, cap table, board / shareholder minutes (2 years) |
| 02 – Financial | Audited financials (3 years), LTM unaudited, monthly P&L (2 years), budget/plan |
| 02 – Financial | QoE EBITDA bridge, non-recurring adjustments schedule |
| 02 – Financial | Debt agreements (all tranches, covenant compliance) |
| 07 – Customers | Revenue by customer (top 20), revenue by segment/geography, retention/churn |
| 05 – HR | Headcount summary, senior management bios, org chart |
| 05 – HR | Executive employment agreements, equity plans, outstanding grants |
| 06 – Contracts | Material customer contracts (top 10) |
| 04 – IP | IP ownership summary, patent register, key license agreements |
| 13 – Regulatory | Key operating licenses, industry-specific permits |
| 14 – Litigation | Litigation summary matrix |
| 11 – Insurance | Insurance binder summary |

### Tier 2 — Second Round (Post-IOI, Pre-LOI)

| Folder | Documents |
|---|---|
| 02 – Financial | Monthly accounts (3 years), financial model (unlocked), CapEx schedule, AR aging |
| 02 – Financial | All debt documents including amendments, waiver history |
| 03 – Tax | Tax returns (5 years, all jurisdictions), transfer pricing docs, open audits |
| 05 – HR | Full compensation schedule, benefit plan documents, Form 5500s, CBA |
| 06 – Contracts | All material contracts (customers, suppliers, partnerships) |
| 08 – Operations | Operations narrative, supply chain analysis, quality certifications |
| 09 – IT | IT architecture, SOC 2 reports, enterprise application license inventory |
| 10 – EHS | Environmental permits, Phase I/II ESA reports, OSHA records |
| 12 – Real Estate | All active leases (with abstracts), property schedule |
| 13 – Regulatory | Full compliance program, FCPA policy, regulatory filing history |
| 14 – Litigation | Pleadings and expert reports for material matters, settlement agreements |
| 15 – ESG | Published sustainability reports, ESG metrics |

### Tier 3 — Exclusivity / Confirmatory

| Folder | Documents |
|---|---|
| 02 – Financial | Working capital true-up model, detailed cash flow projections |
| 03 – Tax | Tax planning memos, private letter rulings, NOL analysis |
| 05 – HR | Individual employee-level compensation data, SERP documents |
| 06 – Contracts | Contracts with change-of-control / assignment restrictions (with negotiation context) |
| 09 – IT | Penetration test reports, vulnerability assessments, incident reports |
| 05 – HR | Detailed benefit plan actuarial reports |
| 13 – Regulatory | Government investigation correspondence, DPA/NPA documents |
| 01 – Corporate | Complete board minutes (5 years) |

---

## Part 5: Cross-Referencing System

### Index Cross-Reference Column

In the Master Index, the `Cross-Reference` column lists related index numbers separated by commas:

| Index | Document | Cross-Reference |
|---|---|---|
| 06.01.01 | Master Service Agreement — Customer A | 07.01.01, 02.06.02 |
| 02.04.01 | EBITDA Bridge — GAAP to Adjusted | 02.01.01, 02.02.01, 02.09.01 |
| 05.04.01 | Employment Agreement — CEO | 05.03.01, 05.03.02 |
| 10.01.01 | Environmental Permit — Facility A | 12.02.01, 10.01.02 |

### Contract Summary Matrices

For any contract-heavy folder, maintain a summary matrix document at the folder level:

| Field | Value |
|---|---|
| Index Number | Links back to the full agreement |
| Counterparty | Name |
| Agreement Type | MSA, SaaS, Supply, License |
| Effective Date | YYYY-MM-DD |
| Expiry / Term End | YYYY-MM-DD |
| Auto-Renewal | Yes/No, notice period |
| Change of Control | Assignment restriction, consent required, termination right |
| Exclusivity | Yes/No |
| Governing Law | Jurisdiction |
| Annual Revenue / Spend | $ value |
| Notes / Red Flags | Key issues for buyer attention |
| VDR Link | Clickable hyperlink to full agreement |

### Hyperlinked Table of Contents

Sellers should maintain a `00.01_Table-of-Contents_Hyperlinked.pdf` with:
- A one-sentence description of each top-level folder's contents
- Hyperlinks to each folder
- A "Where to Find" section for the most commonly requested items

---

## Part 6: PE Firm-Specific Expectations

### KKR
Particular emphasis on operational KPIs and IT/cyber. Expect 300–500-item DDRs for large-cap transactions. KKR's operations group (KKR Capstone) will want independent access to folder `08 – Operations` and `09 – IT`.

### Blackstone
Prioritizes the financial model and QoE support. Expects an unlocked, auditor-reviewed financial model in Excel format. Runs a separate ESG workstream for all transactions above $1B — folder `15` should be populated before their process begins.

### Apollo
Aggressive credit-focused lens even in equity transactions. Expect deep scrutiny of debt facilities (`02.05`), covenant compliance, and litigation/contingent liabilities (`14`).

### Carlyle
Heavy emphasis on management and HR (`05`), particularly in sectors where talent is the primary asset. Has issued formal ESG due diligence questionnaires since 2020.

### Bain Capital
Most commercially intensive diligence. Sends 10–15-page commercial due diligence questionnaires in addition to standard DDR. Particular emphasis on customer contract risk in folder `06`.

---

## Part 7: VDR Operational Best Practices

### Access Controls

| Tier | Group | Access |
|---|---|---|
| Full Access | Management, Sell-Side Banker, Sell-Side Counsel | All folders including restricted |
| Standard Bidder | All qualified bidders (Phase 1) | Folders 01–09, 11–12, 15 (excluding Tier 3 items) |
| Phase 2 Bidder | Preferred bidder(s) post-IOI | + Tax returns, compensation detail, litigation pleadings |
| Exclusivity Bidder | Single bidder in exclusivity | Full VDR + confirmatory items |
| Management | Management team for Q&A | Read-only + Q&A response |

### Q&A Protocol

- All questions submitted through VDR Q&A, never by email
- Questions assigned to subject-matter experts within the Q&A tool
- Response time SLA: 24 hours for factual questions, 48 hours for legal/financial questions
- Answers made available to all bidders in the same round simultaneously
- Q&A log exported and stored as a document in folder `00` at deal close

### Pre-Launch Checklist

1. All Tier 1 documents uploaded and indexed
2. Master Index exported and current
3. Watermarking configured and tested
4. Access groups configured per the access control matrix
5. Q&A module configured with correct assignees
6. NDA executed by all bidders before access granted
7. Sell-side counsel has reviewed all documents for privilege and confidentiality
8. Placeholder rows created for all Tier 2 and Tier 3 expected documents

---

## Critical Success Factors

1. **Number every folder and file** — auto-sort is non-negotiable at scale
2. **ISO 8601 dates in every filename** — `YYYY-MM-DD` sorts correctly in all environments
3. **Version token in every filename** — `_v1`, `_FINAL`, `_EXECUTION` is mandatory
4. **Contract Summary Matrix** in folder `06` — pre-populates buyer's legal review model
5. **EBITDA Bridge with full supporting cross-references** — the single highest-scrutiny document in the VDR
6. **Litigation Summary Matrix** in folder `14` — PE general counsel will demand this on Day 1
7. **Populated Master Index with Cross-Reference column** — separates a professionally run process from an amateur one
8. **Placeholders for forthcoming documents** — signals competence and avoids perception of concealment
9. **Watermarked Phase 1 access** — protects seller in failed auction scenarios
10. **Live Q&A module** — all five referenced PE firms expect this; email-based Q&A is a process red flag

---

*Sources: Datasite VDR platform documentation; Intralinks/SS&C VDR practices; Ansarada University platform guides; PE firm process letter conventions and DDR templates from Kirkland & Ellis, Simpson Thacher, Weil Gotshal & Manges, and Latham & Watkins.*
