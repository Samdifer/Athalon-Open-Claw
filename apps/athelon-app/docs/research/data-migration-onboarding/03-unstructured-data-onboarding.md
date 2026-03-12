# Onboarding B2B SaaS Customers With No Structured Data

**Research Document — Athelon MRO Platform**
**Date:** 2026-03-12
**Audience:** Product, Engineering, Customer Success, GTM

---

## Executive Summary

A substantial portion of small Part 145 repair stations operate with no digital system at all — work orders live in physical filing cabinets, AD compliance is tracked on yellow legal pads, parts inventory exists primarily in one employee's head, and "the system" means a collection of habits that have accumulated over a decade. Demanding these customers produce a clean data export before they can use Athelon is a path to zero activation. This document synthesizes best practices from B2B SaaS companies that have successfully onboarded low-structure customers and translates those practices into concrete recommendations for Athelon.

The central insight across all successful patterns is the same: **do not make data completeness a prerequisite for value delivery**. Instead, meet customers where they are, begin delivering value immediately from whatever fragments they have, and collect structured data as a byproduct of normal system use.

---

## 1. The "No Data" Customer Archetype

### 1.1 Who They Are

The no-data customer in aviation MRO is not ignorant or careless. They are almost always a small business (1–15 AMTs) that built their operation around deeply personal, relationship-driven processes. Their documentation exists; it is simply not structured in a way that a computer expects.

**Common profiles:**

**The Spreadsheet Warrior.** Maintains a meticulously crafted Excel file that has grown organically over eight years. Multiple tabs. Color coding. Merged cells. Embedded comments. The file makes complete sense to the person who built it and is incomprehensible to anyone else. AD compliance lives in column AW, but only from 2021 onward — before that it was a different file that got lost in a hard drive crash.

**The Paper-First Operator.** Runs everything on printed FAA Form 337s, paper work orders, and physical aircraft logbook entries. The filing cabinet is the database. The front desk admin knows exactly which drawer holds the 2019 Cessna work orders. There is no digital component at all except QuickBooks for invoicing.

**The Email-Chain Shop.** Customer requests arrive as emails, get forwarded to the lead tech, who replies with a PDF scan of the completed work order. Institutional memory lives in a Gmail account and in the heads of the two senior AMTs. Searching work history means Cmd+F in Gmail.

**The Post-It Note Tribe.** Very small shops (2–4 AMTs) where everything is verbal. Job assignments happen at the morning standup. Status updates are shouted across the hangar. The only records are the ones the FAA legally requires and those exist in physical form only.

### 1.2 Why They Have Avoided Structured Systems

Understanding the resistance is prerequisite to overcoming it. The reasons cluster into four categories:

**Fear of the unknown disruption.** "If I change the system mid-season I'll lose track of everything." These customers have seen colleagues attempt software transitions that went wrong and created regulatory risk. The devil they know feels safer than the one they don't.

**Past bad experiences.** Many have already tried one or two MRO software products that were either built for large carriers and overwhelming, or built for auto shops and inadequate for FAA compliance. The scar tissue is real.

**The data entry tax.** They correctly observe that entering historical data is non-billable time. A shop doing $800K/year in revenue cannot afford to have their A&P techs entering 3 years of work order history. The ROI is invisible until the system has enough data to be useful.

**"Our system works."** A shop that has operated cleanly and without regulatory violations for 15 years has evidence that their paper system functions. The implicit argument against software is rational: "If it ain't broke, why risk breaking it?"

**Cost skepticism.** Software cost is immediately visible; efficiency gains are diffuse and slow to appear. The no-data customer needs to see value before they commit to a data entry effort.

### 1.3 Their Motivations

Despite resistance, genuine motivations exist and should be understood:

- **Succession and continuity risk.** If the senior AMT who holds all institutional knowledge leaves, the operation collapses. This fear grows as shops age.
- **Compliance audit exposure.** FAA and EASA audits are existential. Many paper-based shops have near-miss moments where they couldn't find a record during an inspection.
- **Competitive pressure.** Airlines and large fleet operators increasingly require digital documentation from their MRO vendors. Paper-only shops lose commercial opportunities.
- **Scale limitations.** Growth past ~8 AMTs is nearly impossible without digital coordination tools.
- **The "someone will finally build this for us" hope.** Aviation-specific software that actually understands Part 145 compliance has been absent from the market. There is latent demand.

---

## 2. Data Discovery and Audit

Before a customer can migrate anything, they need to understand what they actually have. This is often genuinely unknown — customers frequently underestimate how much documentation exists and simultaneously overestimate how well-organized it is.

### 2.1 The Data Archaeology Framework

Help customers conduct a structured inventory across five source categories:

**Physical Documents**
- Paper work orders (completed and in-progress)
- FAA Form 337 copies (major repair/alteration)
- 8130-3 airworthiness approval tags (incoming serviceable parts)
- Aircraft logbook copies where the shop retains them
- Inspection authorization and repair station certificates
- Training records and IA currency documentation
- Parts receiving documents and packing slips

**Spreadsheets and Local Files**
- Excel/Google Sheets tracking work orders, hours, or parts
- Word documents used as work order templates
- Access databases or simple FileMaker systems
- Any shared network drives or Dropbox folders

**Email Archives**
- Customer communications with job requests
- Vendor quotes and purchase orders
- Regulatory correspondence (FSDO communications)
- Internal job status threads

**Financial Systems**
- QuickBooks or equivalent job records (often the cleanest digital record of work performed)
- Invoice history as a proxy for work order history
- Parts purchase history from distributors (Aviall, Wencor, etc.)

**Tribal Knowledge**
- Aircraft tail numbers and customer relationships in people's heads
- Informal AD tracking practices ("we always check the ADs for Lycoming engines before any return-to-service")
- Vendor relationships and preferred suppliers
- Recurring customer squawks that aren't formally tracked

### 2.2 Data Archaeology Techniques

**The Inventory Interview.** A 30-minute structured conversation with the shop owner and the most tenured AMT. Questions should cover: "Where would you look if you needed to prove you performed a specific repair in 2021?" and "How do you currently know which aircraft are due for 100-hour inspections?" These questions surface the actual data repositories, not the official answer.

**Document Photography Sprint.** For paper-heavy shops, a simple protocol: spend 2 hours photographing every document in the current active filing tray and one historical drawer. The goal is not to digitize everything — it is to understand the volume and format of what exists so the migration plan is realistic.

**The "What Would You Miss" Test.** Ask: "If your filing cabinet burned down tonight, what would you need to recreate immediately to continue operating?" Answers reveal the genuinely critical data subset. Everything else is nice-to-have.

**Invoice Archaeology.** QuickBooks invoice history frequently contains the cleanest, most complete record of work performed, customer relationships, and dates. This is often the highest-ROI starting point for historical data extraction.

**Email Mining.** A shop's email archive often contains the complete work history for customer aircraft. Simple keyword searches (tail numbers, customer names, "squawk", "work order") can extract a surprising amount of structured data.

### 2.3 Athelon-Specific Data Audit Template

Provide customers with a one-page intake worksheet covering:

```
AIRCRAFT FLEET
- List of tail numbers you currently service (N-numbers)
- Primary owners/operators for each
- Approximate last entry date for each in your records

WORK ORDER HISTORY
- Approx. how many completed WOs per year?
- Physical, digital, or both?
- How far back do you have records?
- Are hours logged per WO?

PARTS INVENTORY
- Do you maintain a parts inventory?
- Spreadsheet, physical log, or memory?
- Approx. number of unique P/N line items?

AD COMPLIANCE
- How do you currently track ADs?
- Per aircraft? Per engine type? Ad-hoc?
- Physical log, spreadsheet, or external service (CAMP, etc.)?

CUSTOMER RECORDS
- Contacts in a CRM, phone, email, or memory?
- Billing addresses on file?
- Certificate of Airworthiness copies retained?

VENDORS
- Preferred parts suppliers (names/account numbers)?
- Approved vendors list maintained?
```

This worksheet sets realistic expectations and shapes the migration plan before the first data import attempt.

---

## 3. Progressive Data Collection

The cardinal error of SaaS onboarding is treating data completeness as a prerequisite for value. The progressive model inverts this: the customer begins using the system immediately with whatever fragments they have, and data accumulates as a natural byproduct of use.

### 3.1 The Minimum Viable Record

Define the absolute minimum data required to open a work order in Athelon and begin capturing value:

**Minimum to create an Aircraft record:**
- N-number (tail number)
- Aircraft make and model

That is sufficient. Registration data (owner, serial number, engine, avionics) can be pulled from FAA N-number registry lookup and auto-populated. Everything else can be added over time.

**Minimum to create a Customer record:**
- Name (individual or company)
- One contact method (phone or email)

**Minimum to open a Work Order:**
- Associated aircraft (or "unknown aircraft" placeholder)
- Date opened
- At least one line item or description

Every additional field — squawk descriptions, part numbers, hours, compliance references — can be added incrementally as the work progresses.

### 3.2 Contextual Data Requests

Instead of a long setup wizard that demands all data upfront, request data at the moment it becomes relevant:

- When a technician logs the first labor entry on a WO, prompt: "What is this technician's certificate number?" (collected once, stored permanently)
- When marking a WO ready for RTS, prompt: "Would you like to attach the completed 8130-3 for any parts used?" (contextual document capture)
- When creating the second work order for an aircraft, prompt: "We noticed you haven't entered this aircraft's serial number yet — it only takes a second and helps with AD compliance lookups."
- When the shop invoices for the first time, prompt: "Add your billing address and tax ID to speed up future invoicing."

This pattern — called progressive profiling in marketing automation — shifts data collection from a front-loaded burden to a series of small, motivated requests with clear immediate benefit.

### 3.3 Data Capture as a Byproduct of Use

Design workflows so that normal system use produces structured data without explicit data entry effort:

- Scanning a part barcode or QR code auto-populates P/N, lot number, and trace documentation fields
- Accepting a digital 8130-3 (PDF) via email attachment and uploading it to a WO auto-extracts part number, approval authority, and approval date using document parsing
- Customer email threads forwarded to a dedicated Athelon address auto-create customer records and link communications to aircraft by N-number pattern matching
- Time clock entries linked to a WO auto-build the labor history without separate entry

### 3.4 "Ghost Records" for Known-Unknown Data

When you know something exists but don't have the details yet, create a placeholder:

- An aircraft can be created with tail number only, flagged as "incomplete profile" — a banner on the aircraft record shows what fields are missing and provides quick-fill links
- A part can be recorded as "P/N unknown — see attached scan" with an image attachment, to be resolved later
- A customer can be created with name only, flagged for contact info enrichment

Ghost records let the shop maintain operational momentum without grinding to a halt because the full data isn't available.

---

## 4. Smart Defaults and Templates

### 4.1 The Blank Page Problem

A new Athelon account is a blank slate. Every screen says "No records yet." The psychological effect on an operator who runs a busy shop is disorienting — they know they have significant history and the empty system feels wrong, untrustworthy, unready. This accelerates abandonment.

The solution is two-fold: seed the system with relevant defaults and templates before the user arrives, and make empty states instructive rather than empty.

### 4.2 Pre-Built MRO Templates

Provide ready-to-use templates that reflect actual MRO operations, enabling new accounts to function from day one:

**Work Order Templates (by maintenance type):**
- Annual Inspection (100-hour) — standard checklist items pre-populated
- 50-hour inspection
- Engine run-up / ground check
- AOG repair
- Avionics shop visit
- IFR certification / pitot-static check
- Phase inspection (for phased maintenance programs)

**Task Card Templates:**
- Engine oil change
- Spark plug inspection/cleaning
- Brake inspection and service
- Magneto timing check
- ELT battery replacement
- ELT inspection (CFR 91.207)
- Altimeter, transponder, and encoder check (91.411/91.413)

**Squawk Categories (pre-loaded):**
- Avionics / instruments
- Airframe / structural
- Powerplant / engine
- Landing gear / brakes
- Control surfaces
- Electrical system
- Environmental / pressurization
- Fuel system

**Checklist Templates:**
- RTS (Return to Service) readiness checklist
- Parts receiving inspection checklist
- Tool calibration due list
- Annual inspection findings summary

### 4.3 FAA Registry Auto-Population

When a user enters an N-number, immediately call the FAA Aircraft Registry API to auto-populate:

- Make, model, and series
- Serial number
- Engine make and model
- Owner name and address
- Certificate issue date
- Aircraft category and class

This single automation eliminates the most tedious portion of fleet setup for many customers and demonstrates system intelligence immediately.

### 4.4 AD Database Integration

Upon fleet entry, automatically run an AD applicability check against the FAA AD database for each aircraft's make/model/serial combination. Present a pre-populated AD compliance table that the customer can review and mark as compliant, non-compliant, or N/A. This converts an intimidating compliance task into a review-and-confirm workflow.

### 4.5 Industry-Standard Defaults

Pre-configure settings that most small Part 145 shops will want:

- Labor rate fields with common market-rate placeholders (clearly labeled as examples to replace)
- Standard markup percentages for parts (industry typically 15–40%)
- Common squawk priority levels (AOG, Critical, Routine, Deferred)
- Standard documentation types (8130-3, Form 337, logbook entry, inspection authorization)
- Common vendor accounts (Aviall, Wencor, Aircraft Spruce) pre-listed as vendor stubs

---

## 5. Spreadsheet Import Strategies

Spreadsheet import is where many onboarding flows fail. The gap between what a customer has (a lovingly maintained but idiosyncratic Excel file) and what the system expects (clean relational data) is often enormous.

### 5.1 Accepting Messy Input

The importer should accept data as the customer actually has it, not as it should theoretically be structured. Design principles:

**Accept all common formats:** `.xlsx`, `.xls`, `.csv`, `.tsv`, `.ods`, Google Sheets share links. Multi-sheet workbooks should be importable — let the user select which sheet(s) contain which data.

**Handle common spreadsheet pathologies:**
- Merged header cells (flatten them before parsing)
- Header rows that aren't row 1 (scan the first 10 rows to detect the most likely header row)
- Multiple header rows (e.g., a primary header and a secondary sub-header)
- Empty rows used for visual spacing (skip rows where >80% of cells are empty)
- Subtotal/summary rows at the bottom (detect and skip rows that begin with "Total", "Sum", "Grand Total", etc.)
- Columns with inconsistent capitalization or formatting (e.g., "tail number", "Tail Number", "TAIL #", "N-Number" should all map to the same field)

**Do not reject on first parse error.** Import what can be imported, flag what cannot, report clearly on both.

### 5.2 Fuzzy Field Matching

Column header to field mapping should use fuzzy matching rather than requiring exact match. Maintain a synonym dictionary for common MRO field names:

```
Aircraft fields:
  "tail number" | "tail #" | "n-number" | "n number" | "registration" | "ac reg" → aircraft.tailNumber
  "make" | "manufacturer" | "mfr" | "aircraft make" → aircraft.make
  "model" | "aircraft model" | "type" → aircraft.model
  "serial" | "serial number" | "s/n" | "sn" | "msn" → aircraft.serialNumber
  "year" | "year of manufacture" | "mfr year" → aircraft.yearOfManufacture

Work order fields:
  "wo #" | "work order" | "wo number" | "job number" | "order number" → workOrder.number
  "date" | "open date" | "date opened" | "start date" | "in date" → workOrder.dateOpened
  "close date" | "completion date" | "out date" | "date closed" → workOrder.dateClosed
  "description" | "discrepancy" | "squawk" | "problem" | "complaint" | "write-up" → workOrder.description
  "hours" | "labor hours" | "total hours" | "tech hours" → workOrder.laborHours
  "status" | "wo status" | "job status" → workOrder.status
  "customer" | "customer name" | "owner" | "operator" → workOrder.customerName
```

Present the fuzzy matches to the user for confirmation before importing. Users should be able to override any suggested mapping. Persist confirmed mappings so repeat imports from the same source don't require re-mapping.

### 5.3 Data Normalization

Normalize inconsistent data during import rather than failing:

**Dates:**
- Recognize and normalize `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`, `MM-DD-YY`, `Jan 12 2023`, `12-Jan-23`, Unix timestamps
- When date format is ambiguous (e.g., `03/04/23` could be March 4 or April 3), detect the customer's locale or ask once at the start of import
- Handle partial dates: "March 2022" → flag as approximate, store as 2022-03-01 with an approximation flag

**N-numbers:**
- Normalize to uppercase with no spaces: `n12345`, `N 12345`, `N12345` → `N12345`
- Validate against 5–6 character N-number format
- Flag potential typos (e.g., "N1234" — too short; "N1234567" — too long)

**Part Numbers:**
- Preserve manufacturer formatting (P/Ns are case and dash sensitive)
- Strip leading/trailing whitespace
- Flag duplicate P/Ns within the import for user review

**Status Values:**
- Map free-text status values to system statuses using fuzzy matching: "done", "complete", "completed", "closed", "finished" → `CLOSED`; "open", "in progress", "in work", "active", "working" → `OPEN`
- Unrecognized status values are imported as-is and flagged for manual mapping

### 5.4 The Preview-Before-Commit Pattern

Never execute an import immediately. Always show a preview:

1. **Parse step:** Show row count detected, column mapping proposed, immediate errors (unparseable rows, obviously invalid data)
2. **Mapping step:** Display the column-to-field mapping table; allow overrides
3. **Preview step:** Show first 5 rows as they will appear in Athelon after normalization
4. **Validation step:** Show a summary: "248 aircraft records will be imported. 12 records have warnings (missing N-number). 3 records have errors and will be skipped."
5. **Commit step:** Execute import; show real-time progress; produce a downloadable import report

The import report is important — customers should be able to see exactly what was imported, what was skipped, and why. This provides an audit trail and builds trust.

### 5.5 Incremental and Re-importable

Design all importers as idempotent: re-importing the same file should not create duplicate records, it should update existing ones. Match on natural keys (N-number for aircraft, WO number for work orders, P/N for parts) and upsert.

Communicate clearly: "We found 12 existing aircraft records. 9 will be updated with new information. 3 are new and will be created." This reduces fear of running the import and allows customers to maintain their spreadsheet as a source of truth during the transition period.

---

## 6. AI and ML-Assisted Data Structuring

### 6.1 LLM-Based Document Parsing

Large language models are now capable of extracting structured fields from free-text maintenance documentation with high accuracy. For Athelon, this capability is especially valuable for:

**Work order description parsing.** A customer pastes a paragraph from their paper work order: "Performed 100-hr inspection per manufacturer's maintenance manual. Found cracked left main gear door. R&R per SRM section 32-10. Found left magneto out of time. Retimed and tested. All squawks resolved. Aircraft returned to service." An LLM extracts:

```json
{
  "maintenanceType": "100-hour inspection",
  "squawks": [
    { "system": "landing_gear", "description": "Cracked left main gear door", "action": "Remove and replace per SRM 32-10", "status": "resolved" },
    { "system": "powerplant", "description": "Left magneto out of time", "action": "Retimed and tested", "status": "resolved" }
  ],
  "returnToService": true
}
```

**8130-3 tag extraction.** FAA Form 8130-3 has a standardized layout. A photo or scan of the tag can be processed to extract: part number, serial number, approval authority, approval date, condition, work performed description, and approving technician certificate number. These populate directly into the associated work order parts record.

**Email thread parsing.** A forwarded customer email "can you check the landing light on N3456W? Also I think the left brake is dragging" can create a draft work order with aircraft pre-populated (N3456W), two squawk line items pre-written, and customer pre-matched from the From address.

**Logbook entry summarization.** A paragraph-format aircraft logbook entry can be parsed to extract the date, airframe/engine hours at the time of entry, maintenance performed, AD compliance references, and return-to-service certification.

### 6.2 Confidence Scoring and Human Review

AI-extracted data must include confidence scores and route low-confidence extractions to human review. The workflow:

- **High confidence (>90%):** Auto-populate the field. Show a subtle "AI-filled" indicator that the user can click to review the source.
- **Medium confidence (60–90%):** Pre-populate the field, highlighted in amber. Require one-click confirmation before saving.
- **Low confidence (<60%):** Show the raw source text alongside the suggested value. Require explicit user selection or manual entry.

Never silently insert AI-extracted data without any indication of its origin. In a regulated maintenance environment, incorrect auto-populated data that gets signed off creates genuine liability.

### 6.3 OCR for Physical Documents

For the substantial proportion of small shops with paper-only records, a scan-to-record workflow provides the path of least resistance:

**Mobile capture flow:**
1. User opens Athelon mobile app (or uploads via web)
2. Takes a photo of the document (work order, 8130-3, logbook page, Form 337)
3. System classifies the document type (e.g., "This looks like an 8130-3 tag")
4. OCR extracts text; LLM maps extracted text to structured fields
5. User reviews pre-populated record, corrects any errors, saves

Key requirements for aviation OCR:
- Handle handwritten entries (common in logbooks and work orders)
- Handle checkboxes and signature fields
- Recognize FAA form layouts
- Handle degraded/faded/smudged documents (old paper records)
- Process multi-page documents (lengthy work orders, engine logbook sections)

### 6.4 Intelligent Deduplication

When importing historical data alongside existing records, apply entity resolution:

- Fuzzy match customer names ("Smith Aviation LLC" vs. "Smith Aviation, LLC" vs. "John Smith Aviation")
- N-number matching with OCR correction ("N1234S" and "N12345" may be OCR misread of the same registration)
- Part number normalization (manufacturer prefixes, dash variants)

Show potential duplicates to the user and let them merge or keep separate — never auto-merge silently.

---

## 7. Guided Data Entry UX

### 7.1 The Setup Wizard Philosophy

Wizards work when they are short, contextual, and show immediate value at each step. They fail when they are long, abstract, and feel like filling out a government form before you're allowed to use the product.

**Athelon Setup Wizard should be:**
- No more than 5 steps to reach a functional first work order
- Skippable at any step (with clear recovery path to complete later)
- Value-demonstrating at each step — the user should see something useful appear in the system as a result of their input
- Designed so that completing Step 1 (adding one aircraft) is already useful, not just a prerequisite for Steps 2–5

**Suggested flow:**
1. **Add your first aircraft** (tail number → auto-populate from FAA registry → confirm) — 60 seconds
2. **Tell us about your shop** (name, cert number, cert level) — 45 seconds
3. **Add your first technician** (name, certificate number, certificate type) — 30 seconds
4. **Open your first work order** (select aircraft, add one squawk description) — 60 seconds
5. **You're live.** [Optional: Import existing data | Skip for now]

Total time to first work order: under 4 minutes.

### 7.2 Account Completeness and the Setup Checklist

The setup checklist is a persistent, dismissible widget in the dashboard that shows onboarding progress. The Zeigarnik Effect — the psychological tendency to remember incomplete tasks more than completed ones — makes this pattern effective: users who see "7 of 10 setup tasks complete" are motivated to finish.

**Athelon Setup Checklist (sample):**

```
Getting started (3 of 8 complete)
[x] Add your repair station certificate number
[x] Add your first aircraft
[x] Open your first work order
[ ] Add a second aircraft or technician
[ ] Import your parts inventory
[ ] Set up your labor rates
[ ] Connect your billing
[ ] Complete your first RTS workflow
```

Each checklist item links directly to the relevant action. The checklist fades to secondary prominence (but remains accessible) once all critical items are complete.

**Gamification elements:**
- Progress percentage or filled bar shown in the sidebar
- Milestone notifications: "Your shop profile is 75% complete! Complete it to unlock AD compliance reports."
- First completion celebration (subtle — one well-designed moment, not a confetti storm)

Gating premium features behind completeness thresholds can be effective if done transparently: "AD compliance reports require at least one aircraft and 3 months of work order history."

### 7.3 Contextual Prompts vs. Upfront Demands

The principle of contextual data requests — asking for data when it becomes relevant, not at setup — deserves specific implementation guidance:

| Trigger Event | Contextual Prompt |
|---|---|
| First labor time entry | "What is this technician's A&P certificate number? (Required for RTS sign-off)" |
| First parts consumption | "Add this part to your inventory list for future tracking?" |
| Second WO for same aircraft | "We noticed you haven't entered this aircraft's TT SMOH. Add it for accurate maintenance scheduling?" |
| First RTS sign-off | "Upload or photograph the 8130-3 for any installed parts to complete the compliance record." |
| Closing first WO | "Would you like to record this work in the aircraft's maintenance logbook record?" |

These prompts should be non-blocking (the user can proceed without answering), clearly skippable, and should not repeat if the user has already dismissed them.

### 7.4 In-App Sample Data

For accounts in a trial or early onboarding period, offer the option to populate with realistic sample data:

"Load sample MRO data — we'll add a demo fleet of 3 aircraft, 10 sample work orders, and a parts inventory so you can explore all features before entering your own data."

Sample data should be:
- Aviation-specific (real aircraft types, real maintenance types, real part numbers)
- Clearly marked as DEMO throughout the UI
- Easily deletable in bulk ("Remove all sample data") before going live
- Realistic enough to demonstrate the compliance and reporting features

---

## 8. Data Quality Bootstrap

### 8.1 Starting From Messy Data Is Normal

The assumption that incoming customer data will be clean is false for this market. The goal is not to prevent messy data from entering the system — it is to establish a quality improvement trajectory so that data quality improves over time through normal system use.

**Baseline quality metrics to capture on import:**
- Record completeness percentage (fields filled / total fields)
- Data freshness (how recent is the most recent entry per entity)
- Referential integrity (work orders with no linked aircraft, parts with no linked WO, etc.)
- Format validity (N-numbers in correct format, dates parseable, certificate numbers valid length)

Present these metrics to the customer as a data health dashboard — not as a report card, but as a prioritized improvement list.

### 8.2 Progressive Data Enrichment

Design enrichment as a workflow, not a prerequisite:

**Tier 1 (Required for operation):** Aircraft tail number, customer name, WO open date
**Tier 2 (Required for compliance):** Aircraft serial number, technician certificate number, return-to-service documentation
**Tier 3 (Required for full value):** Complete aircraft specs, AD compliance status, full parts history, labor cost data
**Tier 4 (Optimization):** Predictive maintenance data, customer communication history, vendor performance data

The system should clearly communicate which tier each missing field falls into and why it matters. "Aircraft serial number is needed to run AD applicability lookups" is more motivating than a generic "required field" message.

### 8.3 Data Cleaning Workflows

Build in-system cleanup tools rather than expecting customers to clean externally:

**Bulk edit:** Select multiple aircraft records and update a shared field (e.g., correct "Cessna" vs. "CESSNA" vs. "cessna" normalization across all records)

**Merge duplicates:** Present potential duplicate detection results with a side-by-side comparison and a one-click merge that resolves the duplicate to a single canonical record, preserving all linked work orders from both

**Validation rules with inline fixes:** Flag records that fail validation (e.g., technician records missing certificate expiration date) and provide inline edit capability directly from the flag notification — no navigation required

**Data quality tasks:** A prioritized list of specific data issues ("12 work orders are missing close dates — click to review") that a front desk admin can work through systematically

### 8.4 Deduplication

Deduplication in MRO data has some aviation-specific nuances:

**Aircraft deduplication:** N-number is the canonical unique key. However, watch for:
- Foreign-registered aircraft (C-, G-, D-, F- prefixes) — different format rules apply
- Experimental aircraft (N-numbers ending in letters like "N1234EX")
- Tail number changes (aircraft can be re-registered; the same physical aircraft gets a new N-number)

**Customer deduplication:** Fuzzy name matching plus address comparison. Key pattern: the same operator runs multiple aircraft under different legal entities (e.g., "Smith Aviation LLC" for the charter operation and "John Smith" for his personal Bonanza). These should remain separate but linkable.

**Parts deduplication:** Part number is canonical but manufacturers use inconsistent dash conventions. A parts synonym table can map common variants. Serial numbers are required for traceable parts and should be validated against format rules per part category.

### 8.5 Audit Trail for Data Changes

In a regulated environment, data provenance matters. Every data change — manual entry, import, AI-extracted, or bulk edit — should be logged with:
- Who made the change (user ID)
- When (timestamp)
- What changed (before/after values)
- How it was entered (manual, import, AI-parsed, system-generated)

This audit trail is not just a compliance feature; it is a trust feature. Customers who are uncertain about AI-extracted data are reassured by knowing they can always see what was auto-populated and when.

---

## 9. Human-Assisted Onboarding

### 9.1 When Self-Service Fails

Some customers will not successfully onboard through self-service tooling regardless of how good it is. The barriers are not technical — they are time, confidence, and competing priorities. A shop owner who is on the floor wrenching 50 hours a week has no cognitive budget for "learning new software" even if they are motivated to adopt it.

Human-assisted onboarding acknowledges this reality and offers to solve it directly.

### 9.2 Onboarding Service Tiers

**Tier 0 — Self-Service (included)**
All automated import tools, templates, setup wizard, help documentation, and in-app guidance. Appropriate for customers who have someone with office time to manage the transition (front desk, admin, shop manager).

**Tier 1 — Guided Onboarding ($299–$499 one-time)**
A 2-hour video call with an Athelon onboarding specialist:
- Data audit walkthrough (using the intake worksheet)
- Supervised import of existing data
- Customization of templates and defaults for their specific operation
- Training for the first work order completion through RTS
- 30-day email support

Suitable for: shops with some digital data but needing guidance on how to structure the migration.

**Tier 2 — Concierge Setup ($999–$1,999 one-time)**
Athelon handles the entire initial data entry:
- Customer ships or shares their existing records (photos of paper, spreadsheets, QuickBooks export)
- Athelon's team enters the data on their behalf
- Delivered back as a fully populated account: fleet, customer records, recent work order history, AD compliance baseline
- 2 training sessions included
- 90-day priority support

Suitable for: paper-heavy shops, owners who have no admin staff, shops with complex historical data requirements.

**Tier 3 — Enterprise Migration (custom pricing)**
For shops with 10+ aircraft in fleet, complex inventory systems, or requirements to migrate from another MRO software (CAMP, Traxxall, etc.). Includes data transformation, custom field mapping, and a dedicated migration project manager.

### 9.3 Pricing Psychology for Onboarding Services

The common mistake is making onboarding services feel like a tax. Frame them as insurance:

"We can set up your entire Athelon account for you — your fleet, customer records, and work order history — so you can start fresh with everything already in the system. Most shops that do this see full team adoption within the first week. The alternative is a 3–6 month partial adoption period while data gets entered gradually."

The concierge tier should be the default recommendation for the target customer (paper-based small shop) because the ROI is demonstrably higher. Self-service should be positioned as an option for customers with the internal capacity to do it, not the default path.

### 9.4 Onboarding Specialist Profile

The right person for aviation MRO onboarding is not a generic SaaS CSM. They need:
- Familiarity with FAA Part 145 requirements (what an 8130-3 is, what a Form 337 means)
- Experience reading aircraft logbook entries
- Understanding of A&P certificate types and IA authorization
- Ability to read and interpret a maintenance spreadsheet and map it to correct data structures

As Athelon scales, building an internal team with aviation background or partnering with a local A&P school for trained assistants will be more effective than general-purpose data entry contractors.

### 9.5 "Data Entry as a Service" Business Model Consideration

For the long term, a recurring data entry service (not just initial migration) may be a viable revenue line for small shops:

- "We'll enter your completed paper work orders into Athelon once a week — $99/month for up to 20 WOs"
- This serves the customer who wants to transition to digital records for future work but cannot afford the time to backfill everything at once
- Creates a natural upsell path: as the shop sees the value of digital records, they eventually internalize the workflow

---

## 10. Success Stories: B2B SaaS Companies That Nail Low-Structure Onboarding

### 10.1 Toast (Restaurant Management)

Toast replaced the restaurant POS and management market dominated by paper ticket systems and generic retail POS software. Their target customer — independent restaurant owners — is structurally identical to the small repair station owner: time-poor, skeptical of technology, running a complex operation that previously required no software, and terrified of disruption during busy service.

**What Toast does well:**

Toast's white-glove installation service is included in their contracts. A field technician physically arrives at the restaurant, installs hardware, migrates their menu data (manually entering it if the source is a printed menu), trains the staff on-site, and stays through the first service. The "activation event" is a real dinner service, not a demo environment.

Key lessons for Athelon:
- Physical presence at activation creates trust that remote onboarding cannot
- Defining the activation event concretely (first dinner service; first completed work order through RTS) creates a shared goal
- Menu entry is analogous to parts/fleet data entry — doing it for the customer as part of the sale removes the biggest adoption barrier

Toast also provides a free menu digitization service where a restaurant photographs their printed menu and Toast's team enters it. This mirrors a concierge fleet entry service for Athelon.

### 10.2 ServiceTitan (HVAC, Plumbing, Electrical)

ServiceTitan targets the skilled trades — exactly the same operational profile as a small repair station: technical experts who run physical-world businesses, paper work order habits, QuickBooks for billing, and no formal data architecture.

**What ServiceTitan does well:**

ServiceTitan has a formal "Go-Live" program with a dedicated implementation manager assigned to every new account regardless of size. The process:
1. Implementation kickoff call — audit current systems and data
2. Data import of customer history from QuickBooks and existing CSVs
3. Configuration of service types, pricing books, and technician assignments
4. "Practice mode" — a parallel run period where both paper and ServiceTitan are used simultaneously
5. Go-live date — hard cutover with ServiceTitan support on call

The parallel run is particularly valuable: it removes the fear of commitment by letting the customer use the new system without abandoning their familiar process until they are confident.

Key lessons for Athelon:
- A named implementation manager creates accountability and a human relationship
- Parallel run periods reduce fear of transition
- The Go-Live event is a milestone worthy of celebration and follow-up

ServiceTitan also has a large library of pre-built service catalog templates for every trade type. Importing a service catalog is the equivalent of loading Athelon's work order and task card templates.

### 10.3 Procore (Construction Project Management)

Procore targets construction contractors, many of whom managed projects entirely in spreadsheets and email. The complexity of construction documentation (RFIs, submittals, drawings, change orders) is analogous in some ways to aviation maintenance documentation (work orders, 8130-3s, ADs, Form 337s).

**What Procore does well:**

Procore offers a "Procore Certified" training program that is delivered free and positions as professional development for the customer's staff rather than product onboarding. By framing system knowledge as a career credential, Procore reduces resistance to the learning investment.

Procore also handles the "drawing digitization" problem — architectural drawings that exist only in physical form — through a partner network of scanning services. This is directly analogous to Athelon's paper work order/logbook scanning challenge.

Their "project template" library pre-populates a new project with standard construction workflows, punch list categories, and inspection types specific to the customer's project type (commercial, residential, civil, etc.). The user's first experience is a populated system, not a blank one.

Key lessons for Athelon:
- Credentialing and training programs that position system knowledge as professional development
- Third-party partner network for physical document digitization
- Project type templates that pre-configure the system for the specific maintenance context

### 10.4 Mindbody (Fitness Studios and Wellness)

Mindbody serves small fitness studios and wellness businesses — often owner-operated, technically unsophisticated, previously running on paper sign-in sheets and index cards for client records.

**What Mindbody does well:**

Mindbody recognized early that their customers' client records often existed only in the owner's memory or a paper appointment book. They built a structured interview-based import: an onboarding specialist calls the new customer and asks them to name their top 20 most valuable clients. That list becomes the seed data. Everything else is built from future bookings.

This "seed from memory" approach is directly applicable to Athelon: prompt the new customer to name their 5 most active aircraft and their primary customers. Those 5 aircraft become the starting fleet. Everything else accumulates.

Key lessons for Athelon:
- Tribal knowledge can be extracted through structured interviews
- Starting with a high-value subset rather than demanding complete data
- Future transactions auto-build the historical record

### 10.5 Vend / Lightspeed (Retail POS)

Vend (now Lightspeed) targets independent retailers moving from paper or basic systems. Their inventory import challenge is structurally similar to Athelon's parts inventory challenge: irregular data, inconsistent formatting, and a customer who has never thought about their inventory in database terms.

**What Vend does well:**

Vend's import flow includes an "I don't have this data" option for every field, which normalizes incomplete data and removes the psychological block of "I can't start until I have everything." Products can be created with name and price only; SKU, category, supplier, and cost can be added later through either a follow-up import or in-system editing.

Vend also provides a "stock take" feature — a mobile app that lets users scan barcodes or enter counts physically, converting a physical inventory count into a digital record in real-time. This is the equivalent of Athelon providing a mobile parts scanning flow to build inventory from physical counting rather than document entry.

Key lessons for Athelon:
- Normalize incomplete data explicitly ("I don't have this" as a first-class option)
- Physical-to-digital capture flows (scan-and-count for inventory)
- Minimum viable product record: name and price only, everything else optional

---

## 11. Athelon-Specific Recommendations

### 11.1 Prioritized Implementation Roadmap

Based on the research above, the following sequence maximizes onboarding ROI for Athelon's specific customer profile:

**Phase 1 — Immediate friction elimination (0–3 months)**
1. FAA N-number registry API integration for aircraft auto-population
2. Revised setup wizard: 5 steps, skippable, reaches first functional WO in <5 minutes
3. "No data" empty states that are instructive rather than blank
4. Pre-built work order templates for top 5 maintenance types
5. FAA form 8130-3 structured as a first-class Athelon entity with scan-to-create flow

**Phase 2 — Import tooling (3–6 months)**
1. CSV/Excel import for aircraft fleet and customer records with fuzzy field mapping
2. QuickBooks invoice export import as work order history seed
3. Import preview and import report features
4. Idempotent upsert behavior on re-import

**Phase 3 — AI-assisted data capture (6–12 months)**
1. LLM-based work order description parsing to structured squawks
2. 8130-3 PDF/photo → structured record extraction with confidence scoring
3. Email thread parsing to draft work orders
4. Deduplication engine with merge workflow

**Phase 4 — Human-assisted onboarding services (6–12 months)**
1. Guided onboarding call offering (Tier 1)
2. Concierge setup service (Tier 2) with trained aviation-background staff
3. Ongoing data entry subscription option

### 11.2 The MRO-Specific Data Minimum

For Athelon specifically, the absolute minimum viable data set to deliver meaningful compliance value (the core differentiator) is:

| Entity | Minimum Fields |
|---|---|
| Aircraft | N-number, make, model |
| Technician | Name, certificate number, certificate type |
| Work Order | Aircraft, open date, at least one squawk description |
| Part (installed) | Part number (P/N), description |

Everything beyond this is enrichment that unlocks additional features. The FAA N-number lookup covers much of what a customer would otherwise need to enter manually.

### 11.3 The Paper Logbook Problem

Aircraft logbooks are a genuinely hard problem. They are physical legal documents. They are not transferable to Athelon — only copies can be captured. The practical approach:

- Athelon creates a parallel digital maintenance record that supplements (does not replace) the physical logbook
- For historical data: photograph and attach as a document; use OCR + LLM to extract key events (entries, hours, AD compliance sign-offs) as structured records flagged "extracted from logbook"
- For going-forward work: Athelon generates a correctly formatted logbook entry as part of the RTS workflow, which the AMT transcribes (or prints and pastes) into the physical logbook
- Long-term: Advocate for FAA digital logbook acceptance (the regulatory change that enables full digital records is coming but not yet universal)

### 11.4 AD Compliance Bootstrap Without Historical Data

Many small shops cannot produce a complete AD compliance history. The practical approach for Athelon:

1. Create the aircraft record with make/model/serial (via FAA registry)
2. Auto-generate the applicable AD list from the FAA AD database
3. For each applicable AD, default status to "compliance unknown"
4. Provide a review workflow: user marks each AD as Compliant (with estimated date if known), Non-Compliant, or N/A
5. Flag any ADs marked "compliance unknown" as requiring audit before next maintenance release
6. As work orders are completed going forward, the compliance record builds from actual records

This converts an intimidating "prove historical compliance" requirement into a manageable "review and mark current status" workflow that a shop owner can complete in a few hours.

### 11.5 Language and Tone

For the no-data customer archetype, language in onboarding flows should be:

- **Specific to aviation.** Do not use generic SaaS language ("record", "entry", "asset"). Use "aircraft", "work order", "squawk", "airworthiness tag", "return to service". AMTs recognize their domain immediately.
- **Non-judgmental about existing practices.** Never imply that paper systems are inadequate or that the customer is behind. Frame digital as additive: "keep your physical logbooks; Athelon gives you a searchable digital backup."
- **Time-aware.** Acknowledge that entering data takes time and that incomplete is fine. "Start with what you have — your data fills in over time."
- **Compliance-forward.** FAA compliance is the one motivation that always lands. Frame data entry in terms of its compliance benefit: "Adding your technicians' certificate numbers now means Athelon auto-generates correct logbook signatures later."

---

## Appendix A: Data Sources Available for Auto-Population

| Data Type | Source | Notes |
|---|---|---|
| Aircraft make/model/serial/owner | FAA N-Number Registry API | Free, real-time |
| Airworthiness Directives | FAA AD Portal / Regulatory XML feed | Free, updated continuously |
| Type Certificate Data Sheets | FAA TCDS database | Free |
| Repair Station Certificate verification | FAA ARSA lookup | Free |
| A&P/IA Certificate verification | FAA Airmen Inquiry | Free |
| Parts Master data (P/N catalog) | Distributor APIs (Aviall, Wencor) | Partnership required |
| Engine/propeller data | Manufacturer service letter databases | Partnership required |

Auto-population from these sources significantly reduces the data entry burden for new customers and increases data quality compared to manual entry.

---

## Appendix B: Further Reading

- Lincoln Murphy, "Customer Success: How Innovative Companies Are Reducing Churn and Growing Recurring Revenue" — foundational B2B onboarding theory
- Samuel Hulick, "The Elements of User Onboarding" — progressive disclosure and activation design
- Wes Bush, "Product-Led Growth" — self-serve activation patterns
- FAA Advisory Circular AC 145-9A — repair station record-keeping guidance
- FAA Order 8900.1 — maintenance record requirements (Chapters 5 and 6)
- ARSA Regulatory Compliance Guidance — industry association resources for Part 145 shops
