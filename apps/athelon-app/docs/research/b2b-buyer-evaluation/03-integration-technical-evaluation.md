# Integration, API, and Technical Evaluation — B2B Buyer Research

**Document:** 03 in the B2B Buyer Evaluation series
**Product:** Athelon — FAA Part 145 Aircraft Maintenance MRO SaaS
**Stack:** Convex (serverless backend) + React/Vite + Clerk auth + Vercel
**Date:** 2026-03-12
**Audience:** Founders, product leads, and sales engineers answering technical evaluations

---

## Executive Summary

When a shop manager or Director of Maintenance demo-requests Athelon, an IT stakeholder or operations manager is usually circling in the background running a silent technical checklist. In the SMB and lower mid-market Part 145 segment (2–50 technicians), that stakeholder is often the same person who also manages QuickBooks and keeps the spreadsheet of recurring inspections. In the upper mid-market (50–200 technicians), it is a dedicated IT manager or VP of Operations who will send a formal vendor questionnaire before procurement.

Integration capability is the #1 reason MRO operators abandon software during a proof-of-concept. "We couldn't get it to talk to our accounting system" and "the data was trapped in there" are the two most common rejection reasons in post-decision interviews across field service and MRO verticals.

This document covers what buyers actually evaluate, what Athelon needs to build and document to win deals, and a realistic integration roadmap given the Convex + Clerk stack.

---

## 1. What B2B Buyers Evaluate: Integration Requirements

### 1.1 The Four Integration Tiers Buyers Test

Buyers segment integrations mentally into four tiers of priority:

**Tier 1 — Must Have at Signing (Deal-breaker if absent)**
- Accounting system sync (QuickBooks Online or Xero for SMB; Sage Intacct or NetSuite for larger operators)
- Bi-directional customer/contact sync (don't re-enter the customer in two places)
- Data export in a portable format (CSV, PDF of records) — buyers need an "exit ramp"

**Tier 2 — Required Within 90 Days of Go-Live**
- Parts/inventory supplier catalog lookup (ILS, PartsBase, or equivalent)
- Document storage (work order records, 8130-3s, and logbook entries must be retrievable)
- Email/calendar integration (work order status notifications, scheduling reminders)

**Tier 3 — Evaluated During POC, Not a Hard Blocker**
- iPaaS connectivity (Zapier, Make) for automating custom workflows
- Flight operations data sync (ForeFlight, LogTen Pro)
- Customer portal for aircraft owners to view maintenance status

**Tier 4 — Enterprise/Future State**
- ERP integration (SAP, Oracle, Microsoft Dynamics for airline MROs)
- FAA SDRS (Service Difficulty Reporting System) automated submission
- IoT/sensor feeds and predictive maintenance data pipelines

**The deal-zone for Athelon today is Tier 1 + Tier 2.** A prospect who cannot get their work order invoices into QuickBooks will not buy, regardless of how good everything else is.

### 1.2 What Buyers Ask in Discovery Calls

These are the literal questions prospects ask before a demo even starts, collected from sales call analysis across MRO and field-service SaaS companies:

1. "Does it integrate with QuickBooks? Can invoices auto-post?"
2. "Can we import our existing aircraft records and maintenance history?"
3. "Does it work on iPads? What happens when Wi-Fi goes out in the hangar?"
4. "Can our customers see their aircraft status without calling us?"
5. "Do you have an API? Our IT guy will want to look at it."
6. "What does data export look like if we ever switch systems?"
7. "Is it SOC 2 certified? We need to send a vendor questionnaire."
8. "What's your uptime? We can't be down during an AOG."

Map these questions to product features and documentation before every sales motion, not after.

### 1.3 Webhook and Automation Expectations

Modern B2B buyers — even SMB operators who have never heard the word "webhook" — expect their tools to react to events automatically. They express this as: "When a work order is closed, I want the invoice to appear in QuickBooks automatically."

Concretely, buyers evaluate:

- **Outbound webhooks:** Can Athelon push events (work order created, invoice finalized, part received) to an external URL so that accounting or ERP systems can consume them?
- **Inbound webhooks / API endpoints:** Can external systems push data into Athelon (e.g., a parts order confirmation from a supplier marketplace)?
- **Event coverage:** Work order state changes, technician assignment, invoice creation, document upload, and parts consumption are the minimum event set MRO operators care about.
- **Retry behavior:** Buyers who have been burned by dropped events ask whether failed webhook deliveries are retried with exponential backoff.
- **iPaaS compatibility:** If Athelon is listed on Zapier or Make, smaller shops consider integration "solved." This is a significant sales unlock for the SMB segment.

---

## 2. Key Integrations for MRO/Aviation — Priority-Ordered

### 2.1 Accounting Systems (Highest Revenue Impact)

**QuickBooks Online** is the dominant SMB accounting platform. Virtually every Part 145 shop with 1–20 technicians uses it. The minimum required integration:

- Sync customers/contacts bidirectionally
- Push finalized work order invoices from Athelon into QBO as invoices
- Sync payments back to Athelon when invoices are marked paid
- Map Athelon line items (labor, parts, fees) to QBO chart of accounts

**Xero** is the runner-up, stronger in international markets and among tech-forward operators. Same data requirements as QBO.

**The practical implementation path for Athelon:** Build a native QBO integration first using QuickBooks Online's REST API and OAuth 2.0. Xero second. Both provide sandbox environments. Do not rely on Zapier as the primary path — it creates a support burden and feels fragile to buyers during evaluation.

### 2.2 Parts and Inventory Marketplaces

The two platforms that dominate SMB/lower mid-market Part 145 procurement:

- **ILS (Inventory Locator Service / ILSmart):** The largest global aviation parts marketplace. Shops use it to source parts, post excess inventory, and get quotes. Integration means being able to search ILS from within a Athelon work order and auto-populate a purchase order.
- **PartsBase:** Similar to ILS, strong in the US GA and regional carrier market.

For Athelon's segment, the minimum viable integration is an outbound search (lookup part availability and pricing from within a work order) rather than a full bidirectional inventory sync. Full sync is the enterprise MRO problem; Athelon's buyers need "find the part without leaving the app."

**AeroXchange** matters if Athelon targets airline MROs or operators with airline maintenance contracts. Lower priority for pure Part 145 shops today.

### 2.3 Customer-Facing Portal and Communications

Aircraft owners increasingly expect digital status access. The buyer (the MRO) sells this to their own customers as a differentiator — "our customers can see exactly where their aircraft is in maintenance."

Minimum requirements for a customer portal integration:
- Shared view of open work orders by tail number (read-only)
- Document delivery (final 337s, 8130-3s, logbook entries) via secure link
- Approval workflows (customer authorizes squawk resolution or cost overage)
- Communication thread tied to a work order (no more phone tag)

Athelon already has a customer portal route (`/portal/*`). The integration question is whether the portal can be white-labeled or embedded, and whether customers can receive proactive notifications via email/SMS when work order status changes.

### 2.4 Flight Operations and Pilot Log Software

**ForeFlight** has an integration API and is used by a large percentage of GA and Part 135 operators who are also Part 145 customers. The integration value: when a pilot logs a flight in ForeFlight, Athelon could ingest Hobbs time and automatically flag when an aircraft is due for an inspection.

**LogTen Pro** is the dominant pilot logbook software in the US GA market. Same concept — ingest flight hours to trigger maintenance scheduling.

**The practical reality:** These integrations are Tier 3. They are impressive during demos and help justify price to Part 135 operators. Build them after accounting and parts integrations are solid, but feature-flag them into demos early to create competitive differentiation.

### 2.5 FAA Regulatory Systems

**FAA SDRS (Service Difficulty Reporting System):** Operators can file service difficulty reports electronically. An integration that auto-populates an SDRS submission from a Athelon discrepancy record would be a genuine differentiator — no competitor in the SMB segment does this well.

**FAA Registry / N-Number Lookup:** Already a well-known integration point; Athelon appears to have this for work order creation. Maintaining this as the FAA data updates is ongoing maintenance, not a new build.

**AD Research (airworthiness directives):** Integration with the FAA's AD database or a third-party AD research service (e.g., AeroInfo Systems, IPC) allows Athelon to flag applicable ADs when aircraft type is entered. This directly supports the compliance workflows already built in Athelon.

### 2.6 ERP Systems (Mid-Market and Enterprise)

For Part 145 shops that operate within a larger aviation services group or airline:

- **Corridor:** The incumbent legacy MRO ERP in the US Part 145 market. Many prospects migrating to Athelon will have historical data in Corridor. A data import tool (even CSV-based) is required to win these deals.
- **Quantum Control / Pentagon 2000SQL:** Similar legacy systems. Import tooling matters more than live integration.
- **Microsoft Dynamics / SAP / Oracle:** Relevant only if Athelon targets maintenance organizations embedded in airline operations (Tier 4 priority).

---

## 3. API Maturity Expectations

### 3.1 What "API Maturity" Means to Buyers

Buyers in 2025-2026 don't expect GraphQL — they expect clear REST with good documentation and a sandbox. Here is the maturity ladder and where Athelon needs to land to win deals:

| Level | What it means | Deal impact |
|---|---|---|
| 0 — No public API | Data is locked in. No integration possible | Immediate disqualifier for IT-forward buyers |
| 1 — Undocumented API | Technically possible but requires reverse-engineering | Passes basic filter, creates implementation risk |
| 2 — Documented REST API | OpenAPI/Swagger spec, versioned endpoints, rate limits documented | Passes IT evaluation at SMB level |
| 3 — Developer portal + sandbox | Interactive docs, test environment, OAuth 2.0, webhook management UI | Passes enterprise IT evaluation |
| 4 — SDK + partner integrations | Client libraries, certified integrations, integration marketplace | Competitive moat, reduces sales cycle |

**Athelon's current position:** Level 0-1. Convex exposes HTTP actions (REST-capable) but there is no documented public API surface. This is acceptable at the earliest stages but becomes a hard blocker as deals get larger.

**Near-term target:** Level 2 (documented REST API) within the first 12 months of active sales. Level 3 before pursuing mid-market deals above $20K ACV.

### 3.2 REST vs. GraphQL Decision

For Athelon's segment, REST is the right choice. Reasons:

- QuickBooks, Xero, ILS, ForeFlight, and every iPaaS connector builder (Zapier, Make) all speak REST/webhook natively
- IT evaluators at SMB/lower mid-market are familiar with REST; GraphQL adds friction
- Convex's HTTP Actions are REST-native (Request/Response Fetch API)
- GraphQL adds complexity with no incremental win in this market

The one place GraphQL would be valuable is a deeply nested real-time query interface for a customer portal or mobile app — but Convex's own subscription model (`useQuery`) handles that better than an exposed GraphQL layer.

### 3.3 Documentation Quality

Buyers (and their IT staff) read API documentation before they book a technical call. What they look for:

- **Authentication flow:** Is it OAuth 2.0 with clear scope descriptions? API key with rotation? Clerk JWT passthrough? Explain it in one page.
- **Endpoint reference:** Every endpoint documented with request/response examples in real JSON, not pseudocode. OpenAPI/Swagger spec downloadable.
- **Error codes:** A full list of error codes with plain-English descriptions. "What does a 429 mean and how long should I back off?" is a common IT question.
- **Versioning policy:** "We support each version for at least 12 months after a successor is released. Breaking changes require a new version (`/v1/` → `/v2/`)."
- **Rate limits:** State them explicitly. 20 req/min is a red flag. 500 req/min with burst allowance is acceptable. Document per-endpoint limits if they differ.
- **Changelog:** Date-stamped list of API changes. Enterprise buyers require this for their own change management processes.

### 3.4 Sandbox Environment

A sandbox is not optional for deals above $5K ACV. Requirements:
- Separate environment (different Convex deployment) with realistic sample data
- Full API access including webhooks
- No credit card required to access the sandbox
- Sample aviation data: 3–5 sample aircraft, open work orders, parts inventory, sample invoices

### 3.5 Versioning Strategy

For Athelon's Convex-based architecture, the recommended approach is URI path versioning (`/api/v1/work-orders`). Reasons:
- Simple to implement as Convex HTTP Action routes
- Transparent to buyers — they can see the version in their integration code
- Easy to document and easy for iPaaS connectors to hardcode

Policy to publish to buyers: "We maintain backward compatibility within a major version. We publish release notes for all changes. Breaking changes are announced with 90 days notice and a migration guide."

---

## 4. Data Migration — What Buyers Need to Move In

### 4.1 The Migration Problem in the Part 145 Market

Over 70% of SMB MROs still operate on some combination of:
- Paper logbooks and FAA Form 337 binders
- Microsoft Excel or Google Sheets for maintenance tracking
- Corridor, Quantum MX, or similar legacy desktop MRO software
- QuickBooks for billing with no connection to maintenance records

When these shops evaluate Athelon, the migration question is: "How painful is it to get our history in there?" If the answer is "very painful," they don't buy. If the answer is "we have an import tool and will help you," they buy.

### 4.2 What Data Buyers Need to Migrate

**Aircraft records (mandatory):**
- Tail numbers, make/model/serial, engine(s) serial numbers, total time
- Current airworthiness status and certificate dates
- Open ADs and compliance status

**Maintenance history (high value, hard to migrate):**
- Historical work orders and task cards (typically only last 2–3 years matters for buyer's decision)
- Squawk history
- Approved Maintenance Data (AMM references) tied to tasks

**Customer records:**
- Aircraft owner contact information
- Billing addresses, payment history

**Parts inventory:**
- Current on-hand inventory with part numbers, quantities, locations
- Supplier relationships and pricing

**Documents:**
- Scanned 337s, 8130-3s, maintenance release documents

### 4.3 Migration Tooling Athelon Should Build

**Phase 1 (required to close deals):**
- CSV import templates for aircraft, customers, and basic work order history
- A migration guide with field mapping instructions
- White-glove onboarding offer: "We import your first 50 aircraft records for you"

**Phase 2 (required for mid-market):**
- Corridor export → Athelon import pipeline (Corridor dominates the incumbent install base)
- QuickBooks customer list import (avoid double-entry of existing customers)
- Bulk document upload (drag-and-drop zip file of scanned PDFs, auto-sorted by tail number if filenames match a pattern)

**Phase 3 (enterprise):**
- API-based migration from legacy systems with transformation mapping UI
- Scheduled delta sync during parallel-run period before full cutover

### 4.4 Reducing Migration Anxiety in Sales

Buyers are less worried about the technical migration than about "what if something goes wrong." The sales motion should be:

1. Show the import templates upfront (not after close)
2. Offer a free migration audit: buyer exports from current system, Athelon team reviews and gives a migration estimate before contract
3. Guarantee a rollback period: "Your old system stays active for 30 days post-migration. We help you verify every aircraft record before you turn it off."
4. Reference customers who migrated from the same legacy system

---

## 5. Technical Due Diligence Checklist

This is the checklist that IT managers and procurement officers at larger operators (50+ technicians) run when evaluating Athelon. Use this to pre-answer every question in a security trust portal or vendor questionnaire.

### 5.1 Infrastructure and Architecture

| Question | Athelon's Answer (current) | Action needed |
|---|---|---|
| Where is data hosted? | Convex managed cloud (AWS-backed) | Document the specific regions in a trust portal |
| What is the database architecture? | Convex document store (serverless) | Write one-page architecture overview for IT |
| How is the frontend delivered? | Vite SPA on Vercel CDN | Document Vercel's infrastructure guarantees |
| Is the architecture multi-tenant? | Yes, org-isolated via Clerk + Convex | Document isolation model (logical, not physical) |
| What is the scalability model? | Serverless auto-scale on Convex + Vercel | Describe auto-scaling with no capacity planning needed |

### 5.2 Uptime and SLA

Buyers in the aviation MRO segment operate 24/7 AOG environments. Downtime during an AOG (aircraft on ground) situation can cost operators $10K–$100K+ per hour for airline customers.

**What buyers ask:**
- What is your historical uptime percentage?
- Do you have a published SLA with financial remedies for downtime?
- What is your incident response time?
- Do you have a status page?

**What Athelon needs to build/publish:**
- A public status page (statuspage.io or similar) showing real-time Convex and Vercel status
- A published SLA with at minimum 99.5% uptime commitment (better: 99.9%)
- Incident response policy: "P1 incidents acknowledged within 15 minutes, updates every 30 minutes"
- Note: Convex's own SLA and Vercel's SLA should be surfaced in customer-facing documentation — buyers need to know the infrastructure providers, not just the application layer

### 5.3 Security and Compliance

| Criteria | Current Status | Priority |
|---|---|---|
| SOC 2 Type II | Not certified | High — required for any operator with airline contracts or >$50K ACV |
| GDPR / CCPA compliance | Partial (Clerk handles PII for auth) | Medium — document data flows |
| Encryption at rest | Convex encrypts at rest | Document and surface this |
| Encryption in transit | TLS 1.2+ via Vercel | Document and surface this |
| Authentication | Clerk (MFA available) | Document MFA enforcement options |
| Penetration testing | Unknown | Required for enterprise deals |
| Vulnerability disclosure policy | None published | Create and publish |

**The SOC 2 question is the single most common hard blocker for enterprise deals.** Operators who maintain airline contracts or DOD work are contractually required to use SOC 2-certified vendors. Start the SOC 2 Type I process as soon as ARR justifies it (roughly $500K ARR is the typical trigger point for B2B SaaS).

### 5.4 Disaster Recovery

Buyers ask two specific questions:
- **RTO (Recovery Time Objective):** If Athelon goes down, how long until it's back?
- **RPO (Recovery Point Objective):** If there is data loss, how much data is lost?

Convex provides point-in-time backups. Document and publish:
- Backup frequency (continuous in Convex's case)
- Retention period
- Recovery process and estimated RTO
- Whether customers can export their own data snapshot on demand (they should be able to)

### 5.5 Data Portability and Exit Rights

Every sophisticated buyer asks: "What happens to our data if we cancel?" This question is partly contractual but also technical — can they get their data out?

**Athelon must support:**
- Full data export in a standard format (JSON or CSV) on demand, not requiring a support ticket
- Export includes: all work orders, aircraft records, customer data, documents (as a zip), and audit logs
- Export is available for 90 days post-cancellation at minimum

Explicitly stating this in a one-pager called "Data Portability Policy" removes a significant procurement obstacle.

---

## 6. Mobile and Offline Requirements for MRO Shops

### 6.1 The Hangar Floor Reality

Aircraft maintenance is physical work. Technicians work under aircraft, in engine bays, in parts storage rooms, and on ramp areas — almost never at a desk. The primary work surface for technicians in 2025 is an iPad (or increasingly, an iPad mini in a protective case).

**Connectivity facts for aviation maintenance environments:**
- Large hangars frequently have dead zones in the interior
- Military base MROs may have restricted Wi-Fi access
- Remote line maintenance (at non-hub airports) may have no Wi-Fi and limited cellular
- FAA inspection environments may restrict device connectivity

Any MRO software that does not function offline will fail in these environments. Technicians who cannot access a task card because of connectivity will revert to paper, defeating the entire purpose of the software.

### 6.2 What "Mobile-Ready" Means vs. What Buyers Require

Buyers use "mobile-friendly" and "mobile-ready" loosely. What they actually require, broken down:

**Must have (deal-breaker if absent):**
- Works on iPad Safari without requiring an app store download
- Task card list loads and is readable on a 10" tablet
- Technicians can log time, update task status, and add discrepancy notes on mobile
- Document (photos, PDFs) can be captured or attached from a mobile device

**Should have (mentioned in 3 out of 5 demos):**
- PWA (Progressive Web App) installable to iPad home screen for app-like experience
- Offline mode: task cards and work order details accessible without internet
- Background sync: changes made offline sync when connectivity returns
- Native iOS app (higher demand in larger shops)

**Nice to have (mentioned in enterprise deals):**
- Barcode/QR scanning for parts (scan a bag tag to log part receipt)
- Augmented reality overlays for inspection procedures (Tier 4, exists but niche)

### 6.3 Athelon's Current Mobile State and Gap

Athelon is a Vite SPA — it renders in a browser and is technically accessible on mobile. The gap is:

1. **Offline mode:** Convex's real-time subscription model (`useQuery`) requires an active connection. Offline operation requires either a service worker with local caching strategy or a PWA with background sync. This is a significant engineering investment.

2. **PWA configuration:** A service worker + manifest can be added to the Vite build relatively quickly. This would give technicians an installable icon on their iPad home screen, offline-cached static assets, and a cleaner full-screen experience. Estimated effort: 2–3 engineering days for basic PWA, 2–3 weeks for meaningful offline data access.

3. **Touch-optimized UI:** The current shadcn/Radix component set is not specifically optimized for large-finger touch targets. A mobile-specific CSS layer or responsive breakpoint pass is needed before demos on actual iPads.

### 6.4 Recommended Mobile Roadmap

**Sprint 1 (quick wins, demo-ready):**
- Add PWA manifest and service worker for offline static asset caching
- Audit and fix touch target sizes on task card and work order views
- Test and document "works on iPad" in marketing

**Sprint 2 (meaningful offline):**
- Implement IndexedDB-based local cache for work orders and task cards using a service worker
- Queue mutations (time log entries, status updates) locally and sync on reconnect
- Add offline indicator UI

**Sprint 3 (full mobile experience):**
- Mobile-optimized task card detail view (full-screen, swipeable)
- Camera integration for document capture from mobile
- Consider React Native / Expo wrapper for App Store distribution (unlocks enterprise IT policies that require managed app distribution)

---

## 7. How Athelon Should Build Its Integration Roadmap

### 7.1 Architecture Assessment: What Convex Gives You

**Strengths of the Convex + Clerk stack for integrations:**

- **HTTP Actions:** Convex natively supports defining REST endpoints via HTTP actions. These can serve as a public API surface — no separate API gateway needed. Outbound webhooks can be fired from Convex mutations/actions.
- **Real-time subscriptions:** Convex's subscription model can power a customer portal with live work order updates without a separate WebSocket infrastructure.
- **Clerk identity:** Every API call can be authenticated with a Clerk JWT. External systems can be issued API keys via Clerk's Machine-to-Machine token support.
- **Actions for external calls:** Convex Actions can call external APIs (QuickBooks, Xero, ILS) without running into the "no external calls in queries/mutations" limitation.
- **Scheduled functions:** Convex scheduled jobs can handle webhook retry logic, nightly syncs with accounting systems, and AD compliance check runs.

**Limitations to plan around:**

- **No built-in rate limiting:** HTTP Actions have no rate limiter. Any public API must implement rate limiting at the application layer (a Convex mutation that checks request frequency per API key) or via a thin Vercel Edge middleware layer.
- **No built-in API key management:** Clerk M2M tokens or a custom `apiKeys` Convex table are both viable approaches. Choose one and document it early.
- **20MB request/response limit:** Fine for all MRO use cases except bulk document uploads. Document uploads should use presigned URLs (already the pattern with Convex file storage).
- **No argument validation on HTTP Actions:** Must be implemented manually with zod or similar.
- **Webhook delivery guarantees:** Outbound webhooks fired from Convex actions are not automatically retried. Build a `webhookDeliveries` table with retry logic via a Convex scheduled job.

### 7.2 Integration Architecture Pattern

```
External System (QuickBooks, Xero, iPaaS)
         │
         ▼
[Convex HTTP Action endpoint]
   /api/v1/webhooks/incoming
         │
         ▼
[Convex Mutation — validates + writes to DB]
         │
         ▼
[Convex Scheduled Job — outbound webhook delivery]
         │
         ▼
External System (customer's Zapier/Make endpoint)
```

For outbound webhooks:
1. Every mutation that should fire an event appends to a `pendingWebhookEvents` table
2. A scheduled job (runs every 30 seconds) picks up undelivered events and POSTs them to registered endpoint URLs
3. Failed deliveries are retried with exponential backoff up to 5 times
4. Delivery status logged in `webhookDeliveryLog` for debugging

### 7.3 Phased Integration Roadmap

**Phase 1 — Foundation (Months 1–3)**

Priority: Unblock first 10 paying customers, all of whom need accounting integration.

- [ ] **QuickBooks Online integration** (OAuth 2.0, invoice push, customer sync)
- [ ] **CSV data import** for aircraft, customers, and basic work order history
- [ ] **Public API documentation** (even if just 5 endpoints — `/work-orders`, `/aircraft`, `/invoices`) with OpenAPI spec
- [ ] **Data export** endpoint — full org data as JSON/CSV on demand
- [ ] **Status page** (statuspage.io, $29/mo) — surface Convex and Vercel status

**Phase 2 — Integration Platform (Months 4–8)**

Priority: Win deals against Corridor and Quantum MX by being more connected.

- [ ] **Xero integration** (mirror of QBO integration)
- [ ] **Outbound webhook system** with delivery guarantee and retry logic
- [ ] **Zapier / Make connector** (Zapier Partner Program application; unlocks 7,000+ app ecosystem)
- [ ] **Parts lookup** — ILS and/or PartsBase search from within work order
- [ ] **Corridor data import tool** (CSV/Excel export from Corridor → Athelon import)
- [ ] **PWA + basic offline mode** for hangar floor tablet use
- [ ] **API key management** for third-party integrations (Clerk M2M or custom table)

**Phase 3 — Ecosystem (Months 9–18)**

Priority: Move upmarket, win operators with airline contracts.

- [ ] **FAA SDRS integration** (auto-populate service difficulty reports from discrepancy records)
- [ ] **ForeFlight API integration** (flight hours → automatic maintenance scheduling triggers)
- [ ] **SOC 2 Type I** audit initiated
- [ ] **Developer portal** with sandbox, interactive API docs, and webhook tester
- [ ] **NetSuite / Sage Intacct connectors** for mid-market accounting
- [ ] **Native iOS app** (React Native / Expo wrapping Convex backend)
- [ ] **Bulk document import** (zip upload of scanned PDFs, auto-sorted by tail number)

### 7.4 The Zapier Play

A Zapier listing deserves special attention because it is disproportionately high ROI for the effort. Here is why:

- Zapier supports 7,000+ apps. A Athelon Zapier trigger means any shop can pipe work order events into Slack, Google Sheets, Notion, SMS, Salesforce, or any other tool without any engineering
- Zapier listings are discoverable — "aircraft maintenance software + Zapier" is a search that buyers run
- The integration looks impressive in demos even if 90% of customers never use it
- Zapier's Partner Program provides marketing support and co-promotion

The technical requirement for a Zapier integration: a REST API with polling support (for triggers) or webhook registration (preferred). Athelon's HTTP Actions can support both. Build this in Phase 2.

### 7.5 What to Say to Buyers Today (Before These Are Built)

When a prospect asks about integrations before Phase 1 is complete, the honest answer that doesn't kill the deal:

- "We have a native QuickBooks integration on our roadmap launching in [month]. For early customers, we provide a CSV export from Athelon that maps directly to QuickBooks import format — it's a 5-minute weekly process."
- "Our API is currently in early access. We're working with 2-3 design partners on their specific integration needs. If you have a specific system you need to connect, tell me and I'll give you a straight answer on timeline."
- "We have a documented data export so your data is always yours. We can provide that as a one-time export or a scheduled export."

Do not overpromise. "It integrates with everything" is a trust-destroyer if a prospect later discovers it doesn't integrate with their specific QuickBooks Desktop version.

---

## 8. Competitive Landscape: How Competitors Handle Integration

Understanding where Athelon stands relative to alternatives buyers will evaluate:

| Platform | Accounting Integration | API | Mobile/Offline | iPaaS |
|---|---|---|---|---|
| **Corridor** | Manual export / some QBO connectors | Minimal / not public | Desktop-first, limited mobile | None |
| **Quantum MX** | QuickBooks export | Limited REST | iOS app | None |
| **Quantum Control** | QuickBooks, ILS, PartsBase, Aeroxchange | GraphQL + REST | Limited | None |
| **OASES** | ERP connectors via OASES Gateway | REST (Gateway API) | Web-based, some mobile | None |
| **Smart145** | Manual/export | Limited | Web-based | None |
| **Athelon (current)** | None | None | Web SPA (not optimized) | None |
| **Athelon (Phase 2)** | QBO + Xero native | REST + webhooks | PWA + offline | Zapier |

The competitive opportunity is clear: the SMB MRO software market has poor API and integration story across the board. Athelon can leapfrog legacy competitors not by having the most integrations, but by having a clean, well-documented API and a Zapier connector — neither of which any incumbent offers well.

---

## 9. What to Build vs. What to Document

A common founder mistake is building integrations nobody asked for while failing to document the integrations that already exist (data export, customer portal, email notifications). Before building anything new:

**Documentation that should exist today (costs $0 to write):**
- "Athelon Security Overview" one-pager: Convex encryption, Clerk MFA, Vercel TLS, data residency
- "Data Portability Policy": what data you can export, in what format, and how to request it
- "API Roadmap" page: what's available today, what's coming, and how to sign up for early access
- "Integration FAQ": answers to the 8 buyer questions listed in Section 1.2

**Integrations to build based on deal-blocking frequency (highest to lowest):**
1. QuickBooks Online (blocks ~80% of SMB deals without it)
2. CSV data import (blocks 100% of migrations without it)
3. Data export endpoint (required for procurement approval at any account with an IT person)
4. Outbound webhooks (enables Zapier and bespoke integrations)
5. Xero (blocks UK/Australian/international deals)
6. Zapier connector (unlocks ecosystem, multiplies QBO and data access integrations)
7. ILS/PartsBase parts lookup (differentiator in demos, not a hard blocker)

---

## Appendix A: Sample Vendor Security Questionnaire Answers

The following are template answers to common IT security questionnaire questions. Adapt with actual specifics as infrastructure is documented.

**Q: Where is data stored geographically?**
A: Data is stored in Convex-managed infrastructure on AWS in the United States (us-east-1). Customer organizations are logically isolated at the database level.

**Q: What encryption standards are used?**
A: Data is encrypted at rest using AES-256 via Convex's managed storage. Data in transit is encrypted via TLS 1.2 minimum on all endpoints (Vercel CDN + Convex API).

**Q: How is authentication managed?**
A: Authentication is handled by Clerk, a SOC 2 Type II certified identity platform. Athelon supports MFA enforcement at the organization level. User sessions use short-lived JWTs.

**Q: What is your uptime SLA?**
A: Athelon targets 99.9% monthly uptime. A public status page is available at [status.athelon.app]. Our underlying infrastructure (Convex and Vercel) publish their own uptime guarantees.

**Q: Do you have a SOC 2 report?**
A: SOC 2 audit is scheduled for [date]. Current security controls align with SOC 2 Trust Services Criteria. Security overview documentation is available under NDA.

**Q: What is your disaster recovery / RTO?**
A: Convex performs continuous incremental backups with point-in-time recovery. Our target RTO is 4 hours for full service restoration following a catastrophic failure. Data export is available on demand at any time.

**Q: How is customer data separated from other customers?**
A: Each customer organization has a unique organization ID enforced at the database query level via Convex's security rules. No customer can access another customer's data.

---

## Appendix B: API Documentation Starter Template

When building the public API, structure documentation as follows:

```
/docs/api/
  overview.md          — Authentication, base URL, versioning policy, rate limits
  quickstart.md        — "Get a list of work orders in 5 minutes" tutorial
  endpoints/
    work-orders.md     — CRUD operations on work orders
    aircraft.md        — Aircraft records
    customers.md       — Customer records
    invoices.md        — Invoice creation and status
    webhooks.md        — How to register and consume webhooks
  reference/
    error-codes.md     — All error codes with descriptions
    rate-limits.md     — Per-endpoint rate limit table
    changelog.md       — Dated list of all API changes
  sdks/
    javascript.md      — (When available)
```

Publish the OpenAPI spec (`openapi.yaml`) at `/api/openapi.yaml` so tools like Postman, Insomnia, and Zapier can auto-import it.

---

*Research sources: QOCO Aero, AeroNextGen 2026 market analysis, ERP.aero integration directory, SOMA Software 2025 buyer guide, Convex HTTP Actions documentation, Astra Canyon aerospace ERP buyers guide, Auditive SaaS due diligence checklist, Prismatic B2B API UX analysis, ForeFlight integrations portal, Smart 145 MRO blog.*
