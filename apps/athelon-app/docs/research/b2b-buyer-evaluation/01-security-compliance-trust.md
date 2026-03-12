# B2B Buyer Evaluation: Security, Compliance & Trust

**Research corpus for Athelon — FAA Part 145 MRO SaaS**
Last updated: 2026-03-12

---

## Executive Summary

Enterprise and mid-market B2B buyers in regulated industries run security and compliance reviews that kill more deals than price negotiations. For aviation MRO software specifically, procurement teams answer to both their own InfoSec function and to the FAA/EASA regulatory regimes that govern their operations. A vendor that cannot answer a VSQ (Vendor Security Questionnaire) with documented evidence does not make it past the first gate.

This document maps every axis of the buyer security review to Athelon's current stack (Convex + Clerk + Vercel on AWS) and provides a concrete action list of what to build, what to document, and what to communicate to pass enterprise procurement.

---

## 1. Security Requirements B2B Buyers Demand

### 1.1 The Non-Negotiable Baseline (Mid-Market and Above)

| Requirement | What Buyers Check | Current Athelon Status |
|---|---|---|
| **SOC 2 Type II** | Request the actual report, check coverage period (min 6 months), review exceptions | Convex: SOC 2 Type II. Vercel: SOC 2 Type II. Clerk: verify current status. Athelon itself: **not yet certified** — this is the critical gap. |
| **Encryption at rest** | AES-256; must cover all data stores including backups | Convex: AES-256 at rest for all storage. Vercel: AES-256 at rest. |
| **Encryption in transit** | TLS 1.2 minimum; TLS 1.3 preferred | Convex: TLS/SSH. Vercel: HTTPS/TLS. Standard for all three providers. |
| **MFA enforcement** | Must be enforceable for all users, not just optional | Clerk supports MFA (TOTP, SMS). Athelon must expose and enforce it for all org members — **verify this is a mandatory setting, not opt-in**. |
| **SSO / SAML 2.0** | Enterprise IT will not manage separate credentials | Clerk supports SAML 2.0 via Enterprise Connections (paid tier). Athelon must enable and document this. |
| **Role-based access control (RBAC)** | Least privilege; auditable role assignments | Athelon has 8-role RBAC system already built. Strong differentiator — document and showcase it. |
| **Audit logs** | Immutable, tamper-evident, minimum 1-year retention; must include user, action, timestamp, resource | This is a **build gap**. Athelon needs a dedicated audit log surface in the UI and exportable audit trail from Convex. |
| **Penetration testing** | Annual third-party pen test; buyers want the executive summary or a letter of attestation | Convex: annual third-party pen test. Vercel: regular third-party pen testing + HackerOne bug bounty. Athelon application layer: **not yet tested** — required before enterprise sales. |
| **Vulnerability management** | Patch SLAs (critical: 24-48h, high: 7-14 days); scanning frequency | Convex: automated vulnerability scanning + intrusion detection. Vercel: CSPM + daily static analysis. Athelon must document its own vulnerability response policy. |
| **Incident response** | Written IR plan, defined RTO/RPO, breach notification SLA | Athelon needs a written incident response plan and breach notification commitment (72h is standard, matching GDPR). |

### 1.2 Authentication Deep Dive

Buyers specifically test:

- **Password policy enforcement** — minimum complexity, no common passwords, breach detection (HIBP integration)
- **Session management** — idle timeout, absolute session limits, concurrent session controls
- **MFA recovery** — how are backup codes handled? Can admins reset MFA for locked-out users?
- **Privileged access** — are admin accounts separated from standard accounts?

Clerk handles most of this by default. Athelon's action item is to document Clerk's capabilities in its own security documentation so the VSQ answer is "yes, implemented via Clerk — here is the Clerk security page and our configuration."

### 1.3 Infrastructure Security

Buyers at enterprise scale will ask about:

- **Cloud provider** — AWS (via Convex) and AWS + Azure CosmosDB (via Vercel). Both are well-understood and accepted.
- **Data center certifications** — AWS SOC 2 Type II, ISO 27001, ISO 9001, FedRAMP (inherited by Athelon's stack)
- **Network security** — WAF, DDoS protection, private networking between components
- **Secrets management** — how are API keys, database credentials, and signing secrets stored?
- **Container/runtime isolation** — Convex provides per-customer database isolation via unique credentials per project

---

## 2. Compliance Certifications That Matter Most

### 2.1 Priority Stack for Aviation MRO SaaS

| Certification | Urgency | Why It Matters for Athelon |
|---|---|---|
| **SOC 2 Type II (Athelon entity)** | Critical — Year 1 | Without this, deals stall at every Fortune-1000 account. Mid-market buyers increasingly require it too. The Convex/Vercel/Clerk certs do NOT substitute for Athelon's own cert — buyers want the cert for the product they're buying. |
| **GDPR compliance posture** | High | If any European airlines or MRO operators are in the pipeline (EASA-regulated shops), GDPR applies. Convex and Vercel have GDPR compliance. Athelon needs a Data Processing Agreement (DPA) template and a privacy policy that addresses GDPR. |
| **ISO 27001 (Athelon entity)** | Medium — Year 2–3 | European enterprise buyers prefer ISO 27001 over SOC 2. If Athelon targets EASA-regulated MROs, this becomes important. |
| **ITAR / EAR awareness** | Situational | Some Part 145 repair stations work on military aircraft or export-controlled components. If Athelon processes data about these aircraft, ITAR export control becomes relevant. This is a niche requirement but a deal-blocker when it applies. |
| **FedRAMP** | Low — Future | Only relevant if targeting U.S. government-operated repair stations (e.g., Air Force, Navy MRO facilities). Not a Year 1 priority. |

### 2.2 FAA Part 145 Regulatory Context

The FAA does not currently mandate specific cybersecurity certifications for software tools used by Part 145 repair stations. However, FAA Part 145 regulations (14 CFR Part 145) do impose requirements that translate into software requirements:

- **Record retention** — Maintenance records must be retained for a minimum of 2 years (§145.219). Athelon must ensure data is not deletable within this window and must support compliant record export.
- **Authorized signature and accountability** — Work performed must be traceable to authorized individuals. Athelon's audit trail and technician record system directly supports this requirement.
- **Quality control system** — §145.209 requires documented QC procedures. Athelon's task card and inspection workflows support this but must be documented as QC-compatible tools.
- **Inspection authorization (IA) tracking** — The software must accurately track who holds IA qualifications, which Athelon's RBAC and technician record systems support.

The implication: **Athelon is not itself regulated by the FAA, but its Part 145 customers are.** The software must not create compliance gaps for those customers. Frame security and compliance marketing around enabling the customer's own FAA compliance posture, not around Athelon having FAA certification.

### 2.3 NIST Cybersecurity Framework Alignment

The NIST CSF (version 2.0) is the de facto framework for U.S. regulated industries. Buyers increasingly request a NIST CSF self-assessment or alignment mapping. The five core functions are:

1. **Govern** — Policies, risk management strategy, organizational understanding
2. **Identify** — Asset management, risk assessment, supply chain risk
3. **Protect** — Access control, data security, maintenance, training
4. **Detect** — Anomalies, continuous monitoring, detection processes
5. **Respond** — Response planning, communications, analysis, mitigation
6. **Recover** — Recovery planning, improvements, communications

Athelon should produce a one-page NIST CSF self-assessment mapping for use in RFPs and VSQs. This does not require certification — it is a self-declaration with documentation references.

### 2.4 CSA CAIQ / Cloud Controls Matrix

The Cloud Security Alliance's Consensus Assessments Initiative Questionnaire (CAIQ v4, now integrated with CCM 4.0) is often attached to vendor security reviews. It covers 17 domains including:

- Application and Interface Security
- Audit Assurance and Compliance
- Business Continuity Management
- Change Control and Configuration Management
- Data Security and Privacy Lifecycle Management
- Encryption and Key Management
- Governance, Risk and Compliance
- Human Resources Security
- Identity and Access Management
- Infrastructure and Virtualization Security
- Interoperability and Portability
- Logging and Monitoring
- Security Incident Management
- Supply Chain Management, Transparency, and Accountability

Athelon does not need to complete a full CAIQ for early-stage deals, but maintaining a partial CAIQ response document (covering the most-requested domains) dramatically accelerates VSQ completion time.

---

## 3. Data Governance Expectations

### 3.1 Backup and Disaster Recovery

| Expectation | Industry Standard | Athelon/Stack Status |
|---|---|---|
| Backup frequency | Daily minimum; real-time replication preferred | Vercel: automated backups every 2 hours, 30-day retention, globally replicated. Convex: built on AWS with high-availability configuration. |
| Recovery Time Objective (RTO) | < 4 hours for enterprise; < 1 hour for Tier 1 | Must be documented and contractually committed. |
| Recovery Point Objective (RPO) | < 1 hour for enterprise | Must be documented and contractually committed. |
| Disaster recovery testing | Annual DR test with documented results | Must be scheduled and documented — Vercel mentions periodic engineering team testing. |
| Geographic redundancy | Multi-region or at minimum cross-AZ | AWS multi-AZ via Convex. Vercel global CDN + edge infrastructure. |

Athelon's action: Write and publish an RTO/RPO commitment in the product documentation and MSA (Master Service Agreement). Even if conservative (e.g., RTO 4 hours, RPO 1 hour), having a documented commitment moves faster than "we'll discuss."

### 3.2 Data Residency

Enterprise buyers in the EU and regulated industries increasingly require:

- Contractual commitment that data stays in a specific geographic region (EU, US, etc.)
- Data Processing Agreement (DPA) specifying sub-processors and data flows
- List of all sub-processors (Convex, Clerk, Vercel, any analytics tools, any email/notification services)

Athelon's current stack is AWS-hosted (us-east-1 by default for Convex). EU data residency is not possible without configuring Convex to deploy in EU regions (if supported) or building a region-select feature. This is a **medium-term sales blocker for European accounts** — flag it early in the sales process rather than discovering it in procurement.

Sub-processor list Athelon must maintain and publish:
- Convex (database, backend compute) — AWS us-east-1
- Clerk (authentication, user management) — AWS (region varies; check Clerk's sub-processor list)
- Vercel (hosting, CDN) — AWS + Azure CosmosDB (multi-region)
- Stripe (billing) — if applicable
- Any email delivery service (SendGrid, Postmark, etc.)
- Any analytics platform (PostHog, Mixpanel, etc.)

### 3.3 Data Portability

Enterprise procurement increasingly includes contractual data portability requirements. Buyers want:

- **Export on demand** — ability to export all their organization's data in a standard format (JSON, CSV, or industry-specific format) at any time
- **Export on termination** — guaranteed data export window (typically 30-90 days) after contract termination
- **Format specification** — structured, machine-readable formats, not PDF dumps

Athelon action: Build a Data Export function (Convex mutation that queries all records for an `orgId` and returns JSON) and expose it in the Settings/Admin area. This is both a procurement requirement and an FAA compliance enabler (record portability for audits).

### 3.4 Data Deletion and Retention

| Expectation | Detail |
|---|---|
| Deletion on termination | All customer data deleted within 30-90 days of contract termination (contractual) |
| Deletion confirmation | Written certification that deletion is complete |
| Selective deletion | GDPR "right to erasure" for personal data — must be able to delete individual user PII without deleting all org data |
| Retention controls | Organizations must be able to configure their own retention policies where legally permitted |
| Legal hold | Enterprise buyers may need to place data on litigation hold — prevents deletion |

Athelon's Convex schema uses hard-deletes or soft-deletes. Review the schema to confirm that a `deleteOrganizationData` mutation can be written that purges all records for an org without affecting other orgs. This is also a GDPR requirement for EU customers.

---

## 4. Vendor Security Questionnaires (VSQs)

### 4.1 The SIG (Standardized Information Gathering) Questionnaire

The SIG, maintained by Shared Assessments, is the most widely used third-party vendor risk assessment framework. Used by banks, insurance companies, healthcare systems, and large enterprises. If Athelon sells to any Fortune-500 or large MRO operator, expect to receive a SIG or SIG Lite.

SIG covers 20 domains. The questions most commonly asked of SaaS vendors:

**Authentication and Access Control**
- Do you enforce MFA for all user access to production systems?
- Do you support SAML 2.0 / OIDC for enterprise SSO?
- How are privileged/admin access credentials managed?
- What is the process for de-provisioning access when an employee departs?
- Do you enforce the principle of least privilege?

**Data Security**
- How is customer data encrypted at rest? What algorithm and key length?
- How is data encrypted in transit? What TLS version is minimum?
- Who has access to customer data? Under what circumstances?
- How long is customer data retained after contract termination?
- Can customer data be restored to a specific point in time?

**Security Program**
- Do you have a documented Information Security Policy? When was it last updated?
- Do you have a named CISO or equivalent security lead?
- Do you conduct annual security awareness training for all staff?
- Do you perform background checks on employees with data access?

**Vulnerability Management**
- How frequently do you conduct vulnerability scans?
- Do you conduct annual penetration tests? Can you provide the executive summary?
- What is your patch management SLA for critical vulnerabilities?
- Do you have a responsible disclosure / bug bounty program?

**Incident Response**
- Do you have a documented Incident Response Plan?
- What is your breach notification timeline? To whom do you notify?
- Describe your most recent significant security incident and how it was handled.

**Third-Party Risk**
- What sub-processors have access to customer data?
- How do you assess the security posture of your sub-processors?
- Do all sub-processors have SOC 2 Type II or equivalent?

**Business Continuity**
- What are your documented RTO and RPO commitments?
- When was your DR plan last tested?
- What is your current uptime SLA?

**Compliance and Certifications**
- Do you hold a current SOC 2 Type II attestation? Can you provide it?
- Are you GDPR compliant? Do you offer a DPA?
- Do you maintain a list of sub-processors?

### 4.2 Answers That Close Deals vs. Answers That Stall Deals

| Question Type | Deal-Closing Answer | Deal-Stalling Answer |
|---|---|---|
| "Do you have SOC 2 Type II?" | "Yes, current report available under NDA" | "We rely on our infrastructure providers' certs" |
| "Can you support SSO/SAML?" | "Yes, via Clerk Enterprise Connections — setup guide available" | "It's on our roadmap" |
| "What is your breach notification SLA?" | "We notify affected customers within 72 hours per our Incident Response Policy" | "We would notify you as soon as possible" |
| "Who has access to my data?" | "Only authorized Athelon staff require access to production for troubleshooting; access is logged, requires MFA, and follows least-privilege principles" | "Our engineers may access data for support purposes" |
| "What is your uptime SLA?" | "99.9% uptime SLA with credits defined in our MSA; see status.athelon.com" | "We aim for high availability" |
| "How is my data deleted on termination?" | "Within 30 days of termination, all org data is permanently deleted and we provide a written certification" | "We follow our data retention policy" |
| "Can you provide a pen test report?" | "Annual third-party pen test by [firm name]; executive summary available under NDA" | "Our cloud providers are pen tested" |

### 4.3 The CAIQ Self-Assessment

Completing a CAIQ self-assessment (available as a spreadsheet from the Cloud Security Alliance) is a 4-8 hour investment that produces a reusable document. Many enterprise procurement teams ask for it directly. The CAIQ maps to the CCM 4.0 domains listed in Section 2.4.

Completing the CAIQ also forces Athelon to identify gaps before they surface in a live deal.

---

## 5. Trust Signals That Accelerate Buying Decisions

### 5.1 Certification Badges and Documentation

In order of impact:

1. **SOC 2 Type II badge + report on request** — Single highest-impact trust signal for U.S. enterprise buyers. Removes the security review from being a blocker and turns it into a checkbox.
2. **Public security page (athelon.com/security)** — Lists certifications, encryption standards, data residency, incident response commitment, and sub-processor list. Signals maturity. Referenced in VSQs.
3. **Trust center / status page (status.athelon.com)** — Public uptime history with defined SLA. Buyers check this before signing. Lack of a status page signals immaturity.
4. **DPA template available on request** — For GDPR-relevant accounts. Pre-drafted DPA reduces legal review time by weeks.
5. **MSA with security annexe** — Master Service Agreement that includes security commitments, data handling, and breach notification inline rather than as a negotiated add-on.

### 5.2 Customer References in Aviation

For aviation MRO specifically:
- **Named Part 145 customer references** are the strongest sales tool. A buyer will call a peer before trusting any marketing claim.
- **Case studies with operational metrics** (e.g., "reduced work order cycle time by 30%") matter more than security claims — but security is the gate that must be cleared first.
- **Logo display permission** from even 2-3 repair stations signals the software is production-deployed in the regulated environment.

### 5.3 Uptime SLAs

Enterprise procurement expects:
- **99.9% monthly uptime SLA** as the minimum (equates to ~43 minutes downtime/month)
- **99.5% or higher annual** is acceptable for non-tier-1 enterprise
- **Credits for downtime** — typically 10% of monthly fee per percentage point below SLA
- **Scheduled maintenance windows** — must be pre-announced, not counted against SLA

Athelon's Vercel + Convex infrastructure supports these SLAs operationally. The gap is contractualizing them in the MSA and publishing them on the security/legal pages.

### 5.4 Transparent Incident History

Counterintuitively, showing past incidents (handled professionally) builds more trust than claiming zero incidents. A status page with a visible history of incidents and resolutions, including postmortems, signals:
- The team detected the issue (good monitoring)
- The team communicated transparently (trustworthy)
- The team prevented recurrence (mature operations)

Buyers that see a blank status page history wonder if the vendor simply doesn't track incidents.

### 5.5 Security Contact and Responsible Disclosure

Publishing a `security@athelon.com` contact and a responsible disclosure policy (even a simple one) signals security maturity. Many enterprise procurement teams will send a test disclosure and measure response time. Standard expectation: acknowledge within 24 hours.

---

## 6. How Athelon Should Position Itself

### 6.1 The Positioning Frame

Athelon is not competing with enterprises on having more security certifications. It is competing with legacy MRO software (typically on-premise, often decades old, with no modern security posture) and general-purpose software that has been adapted for maintenance tracking. The positioning should be:

**"Purpose-built for Part 145 compliance, with the same security standards your enterprise IT team requires from any SaaS vendor."**

This acknowledges the buyer's two audiences: the aviation compliance team and the InfoSec team. Both must say yes.

### 6.2 What Athelon Inherits from Its Stack (and Should Communicate)

This is an important point: Convex + Clerk + Vercel all carry enterprise-grade certifications. Athelon can legitimately say:

- "Our infrastructure is hosted on AWS, which holds SOC 2 Type II, ISO 27001, ISO 9001, FedRAMP, and HIPAA certifications."
- "Our database and backend layer (Convex) is SOC 2 Type II certified and HIPAA and GDPR compliant, with AES-256 encryption at rest and TLS in transit."
- "Our authentication layer (Clerk) supports SAML 2.0 enterprise SSO and enforces MFA across all user sessions."
- "Our hosting layer (Vercel) holds ISO 27001:2013, SOC 2 Type II, PCI DSS v4.0, and HIPAA compliance."

The accurate caveat: **these certifications cover the infrastructure and platform layers, not the Athelon application layer itself.** Enterprise buyers understand the shared responsibility model — they just need Athelon to have its own application-level controls and, eventually, its own SOC 2.

### 6.3 Credible Positioning Before Athelon's Own SOC 2

Prior to achieving Athelon's own SOC 2 Type II (which typically takes 6-12 months and $15-50K with a compliance automation platform like Vanta or Drata):

1. **Publish a security page** at athelon.com/security listing all sub-processor certifications with direct links to their trust pages
2. **Maintain a security documentation package** (the "security pack"): a PDF or Notion doc with answers to the top 30 VSQ questions, sub-processor list, encryption details, incident response commitment, and pen test attestation from sub-processors
3. **Commission a penetration test** of the Athelon application itself (not just the infrastructure). This is the single highest-ROI security investment before a SOC 2 — it's $5-20K, takes 2 weeks, and produces an executive summary that answers one of the most common VSQ questions definitively.
4. **Draft and publish a DPA** — even a simple one. Use Vercel's and Convex's DPAs as starting templates.
5. **Implement audit logging** in the Athelon application layer — an append-only `auditLog` table in Convex that records every create/update/delete with user, orgId, timestamp, action, and resource. Export this as CSV from the admin settings page.

### 6.4 The Audit Log Build Specification

This is the highest-priority feature gap for enterprise procurement. The `auditLog` table should:

```
auditLogs: defineTable({
  orgId: v.id("organizations"),
  userId: v.id("users"),           // Clerk user ID
  userEmail: v.string(),           // denormalized for read performance
  action: v.string(),              // e.g., "work_order.created", "user.role_changed"
  resourceType: v.string(),        // e.g., "work_order", "aircraft", "user"
  resourceId: v.string(),          // the ID of the affected record
  metadata: v.optional(v.any()),   // before/after state for sensitive changes
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  timestamp: v.number(),           // Date.now()
}).index("by_org_and_timestamp", ["orgId", "timestamp"])
  .index("by_user_and_timestamp", ["userId", "timestamp"])
```

This log should be:
- **Immutable** — no mutation to update or delete individual log entries
- **Exportable** — CSV export in admin settings, filterable by date range and user
- **Retained for minimum 1 year** — configurable per org, default 2 years to align with FAA Part 145 §145.219 record retention

### 6.5 The SOC 2 Roadmap

Expected timeline and cost for a startup:

| Phase | Timeline | Cost |
|---|---|---|
| Gap assessment (using Vanta or Drata) | Month 1 | $8-15K/year for compliance platform |
| Implement missing controls | Months 1-3 | Engineering time |
| SOC 2 Type I audit (design of controls) | Month 4-5 | $8-20K for auditor fees |
| SOC 2 Type II observation period | Months 5-11 | Controls must operate for 6+ months |
| SOC 2 Type II audit and report | Month 12+ | $15-40K for auditor fees |

**Recommended platforms:** Vanta ($15K-25K/year), Drata ($20K-30K/year), or Secureframe ($10-20K/year). These automate evidence collection from AWS, GitHub, Vercel, and other integrations, reducing audit prep time from months to weeks.

**Key insight:** The SOC 2 Type II report itself is not given to every prospect — it is shared under NDA with qualified enterprise opportunities. The certification badge and willingness to share the report under NDA is what unlocks the procurement process.

---

## 7. Deal-Stage Security Checklist

Use this checklist to determine what is required at each stage of an enterprise deal:

### Discovery Stage (Before Demo)
- [ ] Public security page exists at athelon.com/security
- [ ] Sub-processor list is published or available on request
- [ ] Basic privacy policy and terms of service are in place

### Proof of Concept / Demo Stage
- [ ] Security documentation package (PDF) is ready to share
- [ ] SSO/SAML is enabled and can be demonstrated
- [ ] MFA enforcement can be demonstrated

### Procurement / Legal Review Stage
- [ ] VSQ response document is drafted and ready for customization
- [ ] DPA template is available
- [ ] MSA includes security annexe with uptime SLA and breach notification commitment
- [ ] Reference customers in aviation can be offered

### Contract Execution Stage
- [ ] SOC 2 Type II report available under NDA (or roadmap/timeline if not yet achieved)
- [ ] Pen test executive summary available under NDA
- [ ] NIST CSF self-assessment available on request
- [ ] Signed DPA included in contract package

---

## 8. Competitive Context: What Competitors Offer

Legacy MRO software competitors (Aircraft Maintenance Manager, AMOS, Quantum Control, Traxxall) typically:
- Are primarily on-premise deployments — no SOC 2, no cloud certifications, but also no cloud attack surface
- Have minimal modern auth (often no SSO, no MFA)
- Have audit logs that are rarely exportable in useful formats
- Have no public status pages or transparency about incidents

Athelon's cloud-native stack is simultaneously a security marketing advantage ("enterprise-grade certifications from day one via AWS/Convex/Vercel") and a security evaluation challenge ("cloud means the buyer's InfoSec team will scrutinize it more").

The positioning: Athelon is the only modern, cloud-native Part 145 MRO platform with enterprise-grade security baked in — and the only one where the InfoSec team can actually review certifications, rather than relying on on-premise installation without external validation.

---

## 9. Action Priority List

Ordered by impact-to-effort ratio:

| Priority | Action | Effort | Impact |
|---|---|---|---|
| P0 | Commission application-layer penetration test | $5-20K, 2-4 weeks | Removes biggest VSQ blocker |
| P0 | Build audit log table and export UI | 3-5 days engineering | Required for enterprise POC |
| P1 | Publish security page at athelon.com/security | 1-2 days | Qualifies the deal, reduces VSQ time |
| P1 | Draft VSQ response template (top 40 questions) | 2-3 days | Cuts VSQ response time from weeks to days |
| P1 | Draft DPA template | Legal review, 1-2 weeks | Required for EU/GDPR deals |
| P1 | Set up status page (Statuspage.io or BetterUptime) | 1 day | Visible trust signal; buyers check before signing |
| P2 | Configure Clerk SAML for enterprise SSO | 1-2 days + Clerk plan | Required for any enterprise IT gating SSO |
| P2 | Enforce MFA as mandatory for org members | 1 day Clerk config | Common VSQ question |
| P2 | Publish sub-processor list | 1 day | GDPR requirement; VSQ question |
| P2 | Write incident response policy (internal document) | 1-2 days | VSQ question; also required for SOC 2 |
| P3 | Start SOC 2 Type II program via Vanta/Drata | Ongoing | Required for large enterprise deals |
| P3 | Draft NIST CSF self-assessment | 2-3 days | RFP/government/defense-adjacent deals |
| P3 | Complete CAIQ self-assessment | 4-8 hours | Enterprise procurement acceleration |

---

## Sources and References

- Convex Security page: https://www.convex.dev/security
- Vercel Security page: https://vercel.com/security
- Secureframe: What is SOC 2 Type II — https://secureframe.com/hub/soc-2/what-is-soc-2
- NCSC 14 Cloud Security Principles — https://www.ncsc.gov.uk/collection/cloud/the-cloud-security-principles
- AWS Compliance Programs — https://aws.amazon.com/compliance/programs/
- IBM Cost of Data Breach Report 2025 — https://www.ibm.com/reports/data-breach ($4.4M average breach cost; identity security as top defensive priority)
- 14 CFR Part 145 — FAA Repair Station regulations (record retention §145.219, QC §145.209)
- NIST Cybersecurity Framework 2.0 — https://www.nist.gov/cyberframework
- Cloud Security Alliance CAIQ/CCM v4 — https://cloudsecurityalliance.org
- Shared Assessments SIG Questionnaire — https://sharedassessments.org/sig/
