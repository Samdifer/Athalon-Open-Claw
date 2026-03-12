# MRO Industry Data Migration: Challenges, Regulations, and Best Practices

**Research Document 05 — Data Migration & Onboarding Series**
**Scope:** FAA Part 145-compliant MRO SaaS (Athelon)
**Date:** 2026-03-12

---

## Table of Contents

1. [FAA Regulatory Requirements for Data Migration](#1-faa-regulatory-requirements-for-data-migration)
2. [MRO Data Domains and Complexity](#2-mro-data-domains-and-complexity)
3. [Common MRO Software Systems Being Migrated From](#3-common-mro-software-systems-being-migrated-from)
4. [MRO-Specific Migration Challenges](#4-mro-specific-migration-challenges)
5. [Data Quality in the MRO Context](#5-data-quality-in-the-mro-context)
6. [Migration Compliance Considerations](#6-migration-compliance-considerations)
7. [Industry Case Studies and Lessons Learned](#7-industry-case-studies-and-lessons-learned)
8. [Recommendations for Athelon](#8-recommendations-for-athelon)

---

## 1. FAA Regulatory Requirements for Data Migration

### 1.1 Overview: Why Aviation Records Are Different

Aviation maintenance records occupy a unique legal and regulatory position compared to records in almost any other industry. They are not merely business documents — they are evidence of airworthiness, legally required for aircraft to fly, and directly tied to criminal liability under Federal Aviation Act statutes. A maintenance record cannot simply be "archived" or "deleted" without regulatory consequence, and a digitized record does not automatically carry the same legal standing as its paper predecessor.

This creates a fundamentally different migration environment from, for example, migrating CRM data or accounting records. Every migration decision must be evaluated through the lens of: "Does this preserve the evidentiary integrity of the maintenance record?"

### 1.2 14 CFR Part 43 — Maintenance Record Requirements

**14 CFR § 43.9 — Content, form, and disposition of maintenance, preventive maintenance, rebuilding, and alteration records (except inspections performed in accordance with Part 91)**

This section specifies that each person who maintains, performs preventive maintenance, rebuilds, or alters an aircraft must make a record containing:

- A description (or reference to data acceptable to the Administrator) of the work performed
- The date of completion of the work performed
- The name of the person performing the work (if it is not the person signing the record)
- If the work was performed satisfactorily, the signature and certificate number of the person approving the aircraft for return to service

**Migration implications:**
- The description, date, technician name, and approver certificate number are legally required fields. Any migration that silently drops, truncates, or corrupts these fields produces an invalid record.
- Certificate numbers must be preserved exactly. A transposed digit is not a cosmetic issue — it may invalidate the return-to-service entry.
- The "signature" in the context of digitized records has evolved. FAA Order 8900.1 Vol. 6 Ch. 2 provides guidance on electronic signature acceptability. Scanned signatures stored as images are generally acceptable if the image is unalterable. Electronic signatures meeting the criteria of 21 CFR Part 11 are increasingly accepted.

**14 CFR § 43.11 — Content, form, and disposition of records for inspections conducted under Part 91 and Parts 125, 135**

For annual, 100-hour, and progressive inspections, the record must also include:
- The type of inspection and a brief description of the extent of the inspection
- The airworthiness of the aircraft (or what items were found unairworthy)
- The identity of the part, appliance, or component inspected

**Migration implications:**
- Inspection type categorization must map correctly between systems. Many legacy systems use proprietary inspection type codes that do not directly correspond to the regulatory categories.
- "Unairworthy items found" records must be preserved intact and linked to their resolution records. A migrated inspection record showing "squawks found" without the corresponding "squawks resolved" entries is a regulatory red flag.

### 1.3 14 CFR § 91.417 — Maintenance Records Retention

This is the cornerstone regulation for maintenance record retention applicable to general aviation and Part 91 operators, and it is the standard referenced by many Part 145 shops when advising their customers on record-keeping requirements.

**Required retention periods:**

*Records that must be retained until the work is repeated or superseded, or until the aircraft, engine, propeller, or appliance is scrapped:*
- Total time in service (airframe hours, engine hours, propeller hours, cycles where applicable)
- Current inspection status (time since last inspection for each type required or authorized)
- Status of applicable ADs (AD number, revision, method of compliance, and if applicable: the next due date and time in service at which the AD next becomes due)
- List of current major alterations to each airframe, engine, propeller, rotor, and appliance

*Records that must be retained for at least 24 calendar months after the work is performed:*
- All other maintenance, preventive maintenance, rebuilding, and alteration records

**Migration implications:**
- The distinction between "until scrapped" records and "24-month" records must be preserved as metadata. A migration that imports all records with the same retention flag is non-compliant.
- AD compliance status records are specifically called out as "until scrapped" — this is a high-stakes category. AD compliance history is a fundamental audit point during FAA inspections. The migration must preserve: the AD identifier, the revision/amendment that was complied with (not just the AD number), the method of compliance (specific AMM revision, STC number, or other acceptable data), the date of compliance, the aircraft time at compliance, and the next-due calculation if applicable.
- Records of major alterations (337 forms) must be preserved until the aircraft is scrapped.

### 1.4 14 CFR § 121.380 — Air Carrier Maintenance Records

For Part 121 air carriers (which often send heavy maintenance work to Part 145 shops), maintenance records must be retained for:
- Total time in service: life of aircraft
- Time since last overhaul: until completion of work equaling or exceeding overhaul
- Current inspection status: minimum 1 year after the inspection
- AD compliance records: life of aircraft

**Migration implications:**
- If Athelon's customer base includes Part 145 shops that service Part 121 operators, the shop must be able to demonstrate that records maintained on behalf of those operators meet Part 121 retention standards, which are stricter in some categories than Part 91.417.
- Work packages tagged as being performed for a Part 121 customer should carry the Part 121 retention flag so the system knows these records have extended retention requirements.

### 1.5 AC 43-9C — Guidance on Maintenance Records

Advisory Circular 43-9C, "Maintenance Records," provides the FAA's interpretive guidance on what constitutes acceptable maintenance records and how they should be maintained. Key guidance points relevant to migration:

**On electronic records:**
AC 43-9C explicitly acknowledges electronic records but states they must be as complete as paper records and must be retrievable. The AC states that electronic systems must provide for backup and must prevent unauthorized alteration.

**On alterations to existing records:**
The AC explicitly prohibits altering maintenance entries in a way that changes their meaning. This has direct implications for data cleanup during migration: you cannot "fix" a historical record by editing its content, even if the original content was incorrect. Corrections must be made as addenda or annotations, not by overwriting.

**On legibility and completeness:**
The AC emphasizes that records must be legible and that abbreviations must be standardized. This creates a problem for migrated records where the source system used non-standard abbreviations that the destination system may render differently.

### 1.6 Legal Status of Digitized Records vs. Original Paper Records

This is an area of ongoing regulatory evolution. The current state as of 2026:

**Accepted practices:**
- Electronic records that are created electronically from the outset (i.e., technician enters data directly into a digital system at time of work) are generally accepted and not considered a "copy" of a paper record.
- Scanned images of paper records (PDF, TIFF) stored in a tamper-evident system are generally accepted as equivalent to paper originals for operational purposes.
- Systems that use cryptographic hashing or blockchain-style audit trails to prove records have not been altered are considered best practice.

**Practices that require caution:**
- Re-keying paper records into a digital system creates a legally ambiguous situation. The re-keyed record is a copy, not the original. The FAA's position is that such records are acceptable *if the original paper records are retained for a specified period* (commonly 2 years after digitization) or until the aircraft next undergoes an inspection in which the digitized records are reviewed by an authorized inspector.
- OCR-based extraction from paper records carries risk because OCR errors in critical fields (serial numbers, dates, certificate numbers) can create invalid records.

**Practical guidance for Athelon:**
Athelon should treat migrated records as having different trust levels depending on their source:
- **Level 1 (High Trust):** Records migrated from another compliant aviation software system via structured export — treat as authoritative
- **Level 2 (Medium Trust):** Records re-keyed from paper by a trained technician — retain the original paper records for 24 months; flag records as "migrated-from-paper" in audit metadata
- **Level 3 (Lower Trust):** Records produced by OCR from scanned documents — flag as "requires verification," do not use as sole basis for compliance status determinations without manual review

---

## 2. MRO Data Domains and Complexity

### 2.1 Aircraft Records

Aircraft records are the highest-stakes data domain in any MRO migration. They establish the legal identity of the aircraft and its current airworthiness status.

**Core aircraft identity records:**
- Registration number (N-number for US-registered; differs by country)
- Serial number (must be exact — this is the permanent legal identifier)
- Make, model, and series
- Year of manufacture
- Certificate of Airworthiness number and issuance date
- Standard Airworthiness Certificate type (Standard, Limited, Experimental, etc.)
- Type Certificate Data Sheet (TCDS) reference
- Operating limitations (max takeoff weight, approved operations, etc.)

**Time-in-service records (the most complex aircraft data):**
- Total airframe time (TTAF) — Hobbs or tach hours, depending on aircraft
- Total airframe cycles (for pressurized aircraft, turbine aircraft, and helicopters)
- Date of last 100-hour inspection with time at inspection
- Date of last annual inspection with time at inspection
- Date of last major inspection (A/B/C/D checks for heavy maintenance)
- Engine-specific hours and cycles (which may differ from airframe time if engines have been replaced)
- APU hours and cycles (if applicable)

**Migration complexity:** Time-in-service tracking is often fragmented across multiple historical records. An aircraft with 15,000 total hours may have those hours distributed across records from 5 different shops over 30 years. Assembling a coherent, accurate total time requires resolving conflicting records and gaps in history.

### 2.2 Component Tracking

Component tracking is the most data-volume-intensive domain in MRO, and the most likely to have quality problems in migrated data.

**Serialized components:**
Every serialized component attached to the aircraft has its own maintenance history. For a complex turbine aircraft, this can mean thousands of individual component records. Each serialized component record must include:
- Part number (P/N) — including manufacturer's P/N and any applicable interchangeable P/Ns
- Serial number (S/N)
- Manufacturer's name
- Installation record (which aircraft/position it was installed on, at what aircraft total time)
- Removal record (date, reason, aircraft total time at removal)
- Overhaul/shop visit history (which shop, what was done, when, at what component time)
- Serviceable tag or 8130-3 traceability documentation

**Life-limited parts (LLPs):**
LLPs are the highest-consequence category in aviation maintenance. They have a defined maximum service life expressed in hours, cycles, or calendar time beyond which the part *must* be removed from service and cannot be returned to service (in most cases). Errors in LLP tracking are an immediate airworthiness concern.

Each LLP must have records establishing:
- Total cycles (or hours/calendar time, depending on the life limit type) since new
- Cycles since last overhaul (if overhaul is permitted)
- Maximum life limit from the type certificate or applicable AD
- Remaining life
- Back-to-birth traceability (see section 4.4)

**On-condition parts:**
Parts that do not have a fixed life limit but are maintained based on condition and inspection findings. These require records of inspections performed, findings, and corrective actions. Their migration complexity is lower than LLPs but they still require complete shop visit history.

**Rotable components:**
Parts that move between aircraft (e.g., avionics boxes, landing gear components). These have a complex position history (installed on Aircraft A, removed at 500 hours, sent to shop, overhauled, installed on Aircraft B) that must be preserved intact.

### 2.3 AD Compliance Tracking History

Airworthiness Directives are legally mandatory orders issued by the FAA (or foreign NAA for foreign-type-certificated aircraft) to correct known unsafe conditions. AD compliance status is one of the most scrutinized records during FAA inspections.

**What must be tracked per AD:**
- AD number (e.g., 2023-14-09)
- Revision letter/amendment number (critical — compliance must be against a specific revision)
- Title/subject of the AD
- Applicability determination (whether the AD applies to the specific aircraft/engine/component)
- If not applicable: the basis for non-applicability determination
- If complied with:
  - Date of compliance
  - Aircraft total time at compliance
  - Method of compliance (specific paragraphs of the AD followed, STC or AMOC used if applicable)
  - Who performed the compliance (technician name, certificate number)
  - Related work order or logbook reference
- If recurring: next due date and time interval
- If complied with via AMOC (Alternative Method of Compliance): the AMOC approval number

**Migration complexity:** AD compliance records are frequently the most incomplete records in legacy systems, because many MROs have only tracked ADs that required active work — not documenting the ongoing applicability status of every AD. This creates a common scenario where a migrated aircraft appears to have "no AD records" when in fact the shop never entered the ADs that were not applicable or were complied with before the aircraft came to that shop.

### 2.4 Service Bulletin Compliance Records

Service Bulletins (SBs) are manufacturer-issued instructions for modifications, inspections, or replacements. Unlike ADs, SBs are generally not mandatory (unless incorporated by reference into an AD or required by an air carrier's operations specifications). However, SB compliance history is important for:
- Insurance purposes
- Resale value
- Diagnosing recurring problems
- Some OEM warranty conditions

**SB records to track:**
- SB number and revision
- Whether the SB was reviewed for applicability
- Compliance status: not applicable / not complied with / partially complied / complied
- Date and time of compliance (if complied with)
- Parts used (if the SB requires part replacement)

**Migration complexity:** SB compliance data is often the least complete category of records in legacy MRO systems. Many shops track only ADs in their formal compliance system and maintain SB records in paper files or not at all.

### 2.5 Work Order and Work Package History

Work orders are the primary business transaction record of an MRO. They also serve as the primary documentary container for maintenance record entries.

**What a work order record must contain for migration:**
- Work order number (must be preserved — customers may reference it in future warranty or insurance claims)
- Customer/operator
- Aircraft tail number and serial number
- Date opened and date closed
- Description of work requested
- Description of work performed (the maintenance record entry itself)
- Labor records (technician, hours, task)
- Parts consumed (part number, serial number if serialized, quantity, traceability source)
- Inspections performed
- Sign-off records (inspector name, certificate number, date)
- Return-to-service entry
- Any deferred items (open squawks deferred with MEL reference or other basis)

**Migration complexity:** Work orders are the most structurally complex records because they are containers for multiple child records (tasks, parts, labor, findings, etc.). Legacy systems differ dramatically in their data models for work orders, and mapping from a legacy work order model to Athelon's data model requires careful field-level analysis.

### 2.6 Parts Inventory

Parts inventory data carries dual significance: it is both an operational/financial asset and a compliance record (due to traceability requirements).

**Traceability requirements (8130-3 chain):**
FAA Form 8130-3 (Airworthiness Approval Tag) is the document that establishes a part's airworthy status. Every serviceable aviation part must be traceable to an 8130-3 or equivalent documentation (JAA Form One for European parts, EASA Form One, etc.).

For the purposes of migration:
- Each stocked part should have its traceability source documented
- A part without documented traceability cannot be used on a certified aircraft and must be flagged accordingly in the migrated system
- "Dual release" parts (carrying both FAA 8130-3 and EASA Form 1 certification) must have their dual-release status preserved

**Inventory data required per part:**
- Part number (manufacturer P/N)
- Description
- Quantity on hand
- Storage location
- Condition (serviceable, unserviceable, scrap)
- Traceability documentation reference (8130-3 number, date, issuing authority)
- Shelf life (if applicable) with expiry date
- Cure date (for elastomeric/rubber parts)
- Source (new from manufacturer, overhauled, used serviceable)
- Unit of measure
- Minimum stock level / reorder point

**Migration complexity:** Parts inventory is frequently the most inconsistent dataset because:
1. Part numbers are often entered inconsistently (spaces, dashes, capitalization)
2. The same physical part may be listed under multiple P/Ns due to supersessions
3. Traceability documentation may be paper-only and never digitized
4. Shelf-life and cure-date tracking is often manual or absent in older systems

### 2.7 Customer and Operator Records

For each customer aircraft operator:
- Company name and legal entity
- Operating certificate information (Part 91, 91K, 121, 135, 145, etc.)
- FAA certificate numbers
- Contact information (primary, billing, operations, maintenance)
- Aircraft roster (which aircraft they operate)
- Billing and pricing arrangements
- Communication preferences and history
- Insurance information

**Migration complexity:** Customer records are generally the lowest-risk domain for migration (no direct airworthiness implications) but they are often the most disorganized — especially for small shops that manage customers in spreadsheets or their accounting software rather than in their MRO system.

### 2.8 Vendor and Supplier Qualification Records

Part 145 regulations require that repair stations use parts and materials from approved or acceptable sources, and maintain records of vendor qualifications.

**What vendor qualification records contain:**
- Vendor name and address
- Vendor FAA certificates held (Parts Manufacturer Approval, Repair Station Certificate, etc.)
- Approved vendor list status and approval date
- Last audit date and findings
- Products/services approved to source from this vendor
- Any disqualification history

**Migration complexity:** Vendor qualification records are typically maintained in a quality manual or separate spreadsheet rather than the MRO system. They may need to be created from scratch in Athelon if they were never in the source system.

### 2.9 Tool Calibration Records

Part 145 repair stations must maintain records of the calibration status of precision tools and test equipment.

**Required per tool:**
- Tool identifier (shop-assigned ID or serial number)
- Tool description and manufacturer
- Calibration standard used
- Last calibration date
- Next calibration due date
- Calibration status (in calibration / out of calibration / condemned)
- Calibration certificate reference

**Migration complexity:** Tool calibration records are often maintained in a standalone system (dedicated calibration management software) and may not exist in the MRO system at all. They are a new data domain for shops migrating from basic MRO systems.

### 2.10 Employee Training and Authorization Records

Part 145 requires that the repair station maintain records of employee training, qualifications, and specific work authorizations.

**Required records per employee:**
- Name and employee ID
- FAA certificate(s) held with ratings and limitations
- Drug testing compliance status (for safety-sensitive function holders)
- Training records (initial, recurrent, type-specific)
- Shop authorizations (what work they are authorized to perform at this repair station)
- Supervisor/inspector designations

**Migration complexity:** Employee records are sensitive (PII) and must be handled with appropriate data protection. They are also frequently incomplete — shops that don't have a formal training management system may have paper files for some employees and nothing for others.

### 2.11 Quality System Records

Part 145 repair stations must maintain quality assurance records including:
- Audit schedules and completed audit records
- Non-conformance reports (NCRs) / Corrective Action Reports (CARs)
- Return Material Authorizations (RMAs) for suspect parts
- Customer complaints and resolutions
- Regulatory findings and responses

**Migration complexity:** Quality system records are almost never in the MRO transaction system — they typically live in a separate QMS software product (or paper binders). They are unlikely to be migrated as part of an initial MRO system migration but should be considered in a second phase.

---

## 3. Common MRO Software Systems Being Migrated From

### 3.1 Corridor / Ramco Aviation

**Background:** Corridor (now Ramco Aviation Suite) is one of the dominant heavy maintenance MRO platforms. It is used primarily by airline MRO divisions and large independent MRO shops. Ramco acquired Corridor in 2012.

**Data model characteristics:**
- Highly normalized relational database (typically Microsoft SQL Server or Oracle)
- Extensive module coverage: MRO operations, materials, supply chain, finance, HR
- Strong work order management with multi-level task card support
- Component tree with full revision history
- AD/SB module with due-list tracking

**Export capabilities:**
- Custom report exports (Crystal Reports / SSRS) — not structured migration exports
- Some customers have access to direct database exports with vendor cooperation
- Ramco provides a formal data migration service for implementations that includes data mapping tools
- No standard "export to another system" format — leaving Ramco requires either custom extract-transform-load work or Ramco's professional services

**Migration considerations:**
- Ramco's data model is very complex — 200+ tables in a full implementation
- Financial data is tightly coupled to maintenance data; separating them for migration requires care
- Work order numbers may be sequentially generated and may conflict with numbers in the destination system
- Ramco stores some maintenance records as document attachments (PDFs), not structured data — these require separate handling

### 3.2 CAMP Systems

**Background:** CAMP (Continuous Airworthiness Maintenance Program) is the dominant platform for turbine-powered general aviation and regional airline continuing airworthiness management. CAMP's primary value is AD/SB tracking, inspection scheduling, and compliance status management — not work order management.

**Data model characteristics:**
- Aircraft-centric: each aircraft has a full compliance profile
- Strong AD/SB tracking with built-in FAA AD database integration
- Enrollment-based: aircraft are "enrolled" in CAMP and their service history is maintained by CAMP
- Work orders are present but simplified compared to heavy MRO systems
- Component tracking limited to LLPs and major components
- Customer portal allows operators to access their aircraft records

**Export capabilities:**
- CAMP provides PDF reports of aircraft compliance status
- Some structured data export via CSV for enrolled aircraft
- API available to authorized integrators (not publicly documented; requires partnership agreement with CAMP)
- Historical compliance records can be exported as structured data with cooperation from CAMP's migration team

**Migration considerations:**
- CAMP is often the source of truth for AD compliance status for GA turbine aircraft — migrating this data accurately is critical
- CAMP's AD tracking includes not-applicable determinations, which must be preserved
- Shops that used CAMP for tracking and a separate system (or paper) for work orders will need to migrate from two sources
- CAMP often has more complete and accurate AD compliance data than the shop's own MRO system because CAMP updates its AD database and flags new applicabilities proactively

### 3.3 ATP FlightDocs (formerly Avtrak / Avtec)

**Background:** ATP FlightDocs (rebranded from FlightDocs in 2019 when ATP acquired the company) is a web-based maintenance tracking platform focused on Part 135 operators and the MROs that support them. It is positioned as a simpler, lower-cost alternative to CAMP.

**Data model characteristics:**
- Aircraft enrollment model similar to CAMP
- AD/SB tracking with integrated AD database
- Work order management (simpler than heavy MRO systems)
- Digital logbook capabilities
- Parts inventory module (basic)
- Electronic signature support

**Export capabilities:**
- CSV exports of most data entities
- PDF report generation
- API available (REST-based, documented for approved integrators)
- "Export all" function available in some modules
- Historical data exports require support team involvement for complete history

**Migration considerations:**
- FlightDocs has one of the more accessible data export paths among commercial MRO platforms
- The CSV export format is mostly flat (denormalized), which means migrating hierarchical data (work order → task → parts) requires reassembly
- Electronic signature records (who signed, when, certificate number) are exported as structured data, which is good for maintaining record integrity
- FlightDocs' AD compliance export includes the applicability determination, which is important for migration fidelity

### 3.4 Quantum MX (Component Control)

**Background:** Quantum MX (from Component Control, now part of the Hearst Aviation group) is an MRO platform focused on Part 145 repair stations and Part 91/135 operators. It has particularly strong parts/inventory management capabilities.

**Data model characteristics:**
- Strong parts inventory and traceability model — one of the best in the market for tracking 8130-3 documentation
- Work order management with task cards
- Component tracking with position history
- AD compliance tracking (less sophisticated than CAMP/FlightDocs)
- Robust financial integration

**Export capabilities:**
- XML and CSV exports from most modules
- Direct database access available in some licensing tiers
- Component Control offers migration services to and from Quantum MX
- The parts inventory export is particularly detailed and includes traceability metadata

**Migration considerations:**
- Quantum MX's parts data is often the most valuable and highest-quality data to migrate — preserve it carefully
- The work order history model in Quantum MX uses a different numbering convention than most other systems
- AD compliance data in Quantum MX is often the weakest area — many shops use CAMP or FlightDocs for compliance tracking while using Quantum for parts/work orders

### 3.5 WinAir

**Background:** WinAir (Avcom Systems) is a Windows-based desktop MRO application widely used by smaller regional airlines, charter operators, and independent MROs, particularly in Canada and the Caribbean.

**Data model characteristics:**
- Older relational data model (Microsoft Access in older versions; SQL Server in newer versions)
- Full MRO functionality: work orders, parts, inventory, compliance tracking, employee records
- Strong for scheduled maintenance program (SMP) management
- Limited web/API integration capabilities
- Customer portal not available in older versions

**Export capabilities:**
- Direct database access (ODBC) is the primary migration path
- Some CSV/text exports from reports module
- No formal migration export tool
- WinAir's vendor (Avcom) offers migration services to WinAir from other systems but less support for migration away from WinAir

**Migration considerations:**
- WinAir's older versions use a Microsoft Access database with a non-obvious schema — reverse engineering the data model is often necessary
- Date and time formats in WinAir exports are inconsistent (mix of US and ISO date formats in some versions)
- WinAir stores some critical data (aircraft minimum equipment lists, approved maintenance data) as attached documents rather than structured data
- Customers migrating from WinAir v6 or earlier should budget significant time for data cleanup

### 3.6 Traxxall

**Background:** Traxxall is a newer (founded 2012) cloud-based maintenance tracking platform focused on business aviation (Part 91 and 135 operators) and the FBOs/MROs that support them. It is a direct CAMP competitor at the business aviation end of the market.

**Data model characteristics:**
- Aircraft-centric enrollment model
- Strong AD/SB tracking with integrated databases
- Work order management (simpler than heavy MRO)
- Digital logbook support
- Mobile-first interface

**Export capabilities:**
- REST API with reasonable documentation
- CSV and PDF exports from most screens
- API-based migration paths are feasible
- Historical compliance exports require coordination with Traxxall support

**Migration considerations:**
- Traxxall is one of the more API-friendly systems — structured data extraction is more achievable than from older platforms
- Traxxall's AD compliance data is reliable and complete — migrating it accurately is important
- Work order history in Traxxall is limited to the period since the aircraft was enrolled; pre-Traxxall history may not be in the system

### 3.7 Paper-Based and Spreadsheet Systems

This is the most common source for small Part 145 shops (under 10 technicians). A significant portion of general aviation MROs have never used dedicated MRO software.

**Typical paper/spreadsheet configurations:**
- Aircraft logs maintained in paper logbooks (kept by the aircraft owner, not the MRO)
- Work orders on carbonless paper forms stored in filing cabinets
- Parts inventory tracked in Excel
- AD compliance tracked in Excel or in a paper "AD status sheet" per aircraft
- Employee records in paper files
- Customer/billing records in QuickBooks or similar accounting software

**Migration path:**
There is no "migration" in the traditional sense — this is a data entry project. The practical approach is:
- Enter only the data required for Day 1 operations: customer list, aircraft roster (with current times and AD status), and open work orders
- Historical work order and parts transaction data typically stays as paper records; it is not worth the cost and risk of re-keying
- For aircraft AD compliance, the current status (which ADs are applicable and what is their current compliance status) is what matters for operations; full compliance history can be kept in paper and referenced as needed
- Employee records are entered fresh in the new system

**Key risks with paper migration:**
- Re-keyed data has a high error rate (estimates vary from 0.5% to 5% error rate per field for manual data entry)
- Paper records may be deteriorated, illegible, or missing
- Accumulated discrepancies over years of paper-based record-keeping may be discovered during data entry and require management decisions about how to handle them

### 3.8 Homegrown Access and FileMaker Databases

Many medium-sized shops (10-50 employees) built their own MRO systems in Microsoft Access or FileMaker Pro in the 1990s and 2000s. These present unique migration challenges.

**Characteristics:**
- Custom data models that may or may not align with aviation industry concepts
- Often lack referential integrity (parts tables not linked to work orders, etc.)
- May have accumulated years of data quality issues
- The person who built the system may no longer be with the company
- Documentation of the data model is typically nonexistent

**Migration approach:**
- Document the data model first by reverse-engineering the database structure
- Identify the minimal viable data set needed in the new system
- Extract and transform using ETL tools (Python pandas, Pentaho, Talend)
- Validate against paper records or original documents

**Key risks:**
- Homegrown databases frequently have data quality issues that have been managed by user workarounds — these issues become visible during migration
- Date fields in older Access databases are particularly error-prone
- Some homegrown systems have non-standard ways of tracking time-in-service that don't map cleanly to regulatory concepts

---

## 4. MRO-Specific Migration Challenges

### 4.1 Traceability Chain Preservation

The concept of traceability in aviation parts is analogous to chain of custody in legal evidence. A part without complete traceability documentation cannot be legally installed on a certified aircraft. Breaking the traceability chain during migration can effectively render parts unusable.

**What must be preserved in the traceability chain:**
1. Original certification document reference (8130-3 number, date, issuing authority)
2. All subsequent shop visits (what shop, what was done, when, resulting certification documentation)
3. Current location and installation status
4. Any quarantine or suspect-unapproved-parts history

**Migration strategy:**
- Treat traceability as a linked-record problem: the part record must link to certification document records, which must link to document images (if available)
- If certification documents exist only as scanned PDFs, import them into Athelon's document storage system and link them to the part record at migration time
- Flag any part records where the traceability chain is incomplete as "traceability verification required" — do not silently create part records with known gaps in traceability

**Regulatory basis:**
14 CFR § 21.303 and § 43.13 together establish the requirement to use parts of acceptable quality and approved design. FAA Advisory Circular 20-62E, "Eligibility, Quality, and Identification of Aeronautical Replacement Parts," provides detailed guidance on part traceability documentation requirements.

### 4.2 Historical Compliance Status Accuracy

AD compliance history is irreversible — once an AD compliance date is recorded, you cannot simply correct it without creating an audit trail. This creates significant pressure to get compliance data right during migration.

**Common accuracy problems:**
- AD complied with at a different shop before the aircraft came to the current MRO — the current MRO may have recorded only the current status, not the compliance event
- Multiple compliance events for the same AD (e.g., an AD with repetitive inspections) where only the most recent is in the system
- Compliance recorded against an older revision of the AD, when a newer revision has since been issued
- The method of compliance recorded is incomplete (e.g., "complied" with no reference to the specific paragraphs, alternate methods, or parts replaced)
- Calendar-time-based recurrence intervals that are based on the original compliance date, which may not be in the system

**Migration strategy:**
- For current AD compliance status (what is the next due time/date for each recurring AD), validate against an authoritative source such as CAMP or the aircraft's physical logbook during migration
- Do not silently propagate incorrect compliance data — flag any record where compliance method, revision, or next-due calculation seems inconsistent
- For ADs that were complied with before the current MRO's involvement, note the source of the compliance record (e.g., "Compliance per previous logbook entry, pre-[MRO name] records") so future auditors understand the data provenance

### 4.3 Time-in-Service and Cycles Accuracy

Aircraft total time is the foundational quantity from which nearly all maintenance intervals, life limits, and AD due dates are calculated. An error in total time is an error that propagates to every time-based maintenance requirement.

**Sources of total time errors in migration:**
- Engine and airframe time may have diverged (engine replaced or overhauled — the engine's time and the airframe's time are now different)
- Tach time vs. Hobbs time discrepancy (some aircraft track time with a Hobbs meter, others with a tachometer; these give different readings for the same flight)
- Accumulated rounding from legacy systems that stored time to the nearest 0.1 hour, when calculations require 0.01 hour precision
- Cycles vs. hours confusion for systems (e.g., some landing gear components are life-limited by cycles, others by hours; confusing these can create either false alarms or missed limits)

**Migration strategy:**
- Validate current total airframe time against the aircraft's physical maintenance logbook during migration (this should be a mandatory step, not optional)
- Record the source and date of the total time figure used at migration: "Total time as of [date] per [source — logbook / previous system]"
- For all time-limited components, record their time at the point of migration and the aircraft time at that date, so future calculations can use a known reference point

### 4.4 Back-to-Birth Traceability for Life-Limited Parts

Life-limited parts (LLPs) require what the FAA calls "back-to-birth" traceability — documentation of the complete life history of the part from the day it was manufactured, through every shop visit and installation, to the present day. This is required by:
- 14 CFR § 21.303 (approved parts)
- 14 CFR § 43.10 (disposition of life-limited aircraft parts)
- AC 43-10, "Disposition of Parts Removed From Type-Certificated Products"

**Why back-to-birth matters for migration:**
A part found to have incomplete back-to-birth traceability after migration cannot be used and in some cases must be scrapped. The discovery that a high-value LLP lacks complete traceability documentation is a significant financial and operational event.

**Migration strategy:**
- Before migration, audit all LLPs in the inventory or currently installed on aircraft for completeness of back-to-birth documentation
- Identify any LLPs where the documentation chain has gaps
- For gaps in LLP documentation, the regulatory-compliant response is:
  1. Attempt to reconstruct the history from original manufacturer records, FAA Form 337s, logbook entries
  2. If reconstruction is not possible, the part must be removed from service per 14 CFR § 43.10
- Never create synthetic back-to-birth records to fill gaps — this is records falsification and a federal crime under 18 U.S.C. § 1001

### 4.5 Handling Different Measurement Units

Aviation maintenance intervals can be expressed in three fundamental units, and often a combination:
- **Calendar time** (days, months, years) — e.g., "Inspect every 12 months"
- **Accumulated hours** — e.g., "Overhaul every 1500 hours"
- **Cycles** — e.g., "Replace at 20,000 cycles" (a cycle is typically one pressurization-depressurization or one landing)

**Compounding units:**
Many maintenance requirements use compound intervals: "whichever occurs first" (e.g., 500 hours or 12 months, whichever comes first) or "whichever occurs later" (e.g., an oil change no earlier than 6 months or 50 hours).

**Migration complexity:**
Legacy systems often handle compound intervals inconsistently. The migrated data must include not just the interval values but the compound logic (first/later) to avoid incorrectly calculating due dates after migration.

**Helicopter-specific complexity:**
Helicopters have rotor systems with life limits expressed in both hours AND cycles, and the relationship between hours and cycles varies by mission profile. Helicopter component migration requires careful attention to distinguishing component hours from flight hours and rotor cycles from flight cycles.

### 4.6 Aircraft That Have Been Through Multiple MROs

An aircraft with 10+ years of history may have had maintenance performed by several different MROs using different systems. The current MRO typically only has complete records from when the aircraft first came to them. Records from prior MROs are typically available only in paper logbooks or as summaries.

**Practical implications:**
- The "total hours" figure the current MRO has may be what they were told by the customer, not what they independently verified
- AD compliance history before the current MRO's involvement may be incomplete or unverified
- Part configurations (what is actually installed) may differ from what any system says if unauthorized modifications were made at previous shops

**Migration strategy:**
- Clearly tag records by their source: "direct records" (work performed at this shop) vs. "inherited records" (records received from aircraft owner or previous MRO) vs. "computed records" (values derived from reported data without independent verification)
- For compliance-critical items (AD status, LLP lives), recommend that the customer obtain and provide original logbook entries to verify inherited records during migration
- Do not assert higher confidence in migrated records than is warranted

### 4.7 Handling Incomplete Records and "Unknown" History

A significant percentage of general aviation aircraft have records that are incomplete — sometimes seriously so. Logbooks have been lost, damaged, or were never properly kept. The regulatory approach to aircraft with incomplete records is nuanced.

**Regulatory framework:**
AC 43-9C addresses records discrepancies: if an aircraft has lost logbook records, the owner must establish a new baseline by having the aircraft inspected and the current condition documented. The aircraft can then fly legally based on this new baseline, but its "provenance" value is reduced.

**Software handling:**
Athelon should provide a mechanism to explicitly flag records as:
- **Complete and verified** — documentation reviewed and authenticated
- **Reported/unverified** — data provided by customer, not independently verified
- **Estimated** — value was calculated or estimated in the absence of documented records
- **Unknown** — data is genuinely absent; the field is blank because the information is not known, not because it was overlooked during data entry

This is critical: the difference between "unknown" and "empty" must be unambiguous in the data model. An empty field in a compliance database is ambiguous — it could mean the record doesn't exist, was not entered, or is genuinely unknown.

---

## 5. Data Quality in the MRO Context

### 5.1 Common Data Quality Issues in MRO Migrations

Based on documented industry experience and published migration case studies, the following are the most frequently encountered data quality issues:

**Part number inconsistencies (highest frequency):**
- Manufacturer part numbers entered with and without dashes (e.g., "632140" vs "6321-40" vs "632140-1")
- Leading/trailing spaces in P/N fields
- Superseded part numbers that should be linked to current P/Ns
- Proprietary shop part numbers mixed with manufacturer P/Ns
- Non-aviation parts (hardware, consumables) with informal descriptions rather than P/Ns

**Duplicate aircraft entries:**
- Same aircraft (same serial number) entered multiple times with slight variations in tail number format (e.g., "N12345" vs "N-12345" vs "n12345")
- Aircraft re-registered with a new tail number but entered as a different aircraft rather than updating the existing record
- Test/demo aircraft entries that should be deleted

**Missing serial numbers:**
- Serialized components entered without serial numbers (s/n field left blank or populated with "N/A" or "UNK")
- Serial numbers entered in the part number field (common data entry confusion)
- Serial numbers truncated because the source system field was too short

**Date anomalies:**
- Dates entered in inconsistent formats across different users
- Future dates on historical records (data entry errors)
- Year 2000 rollover issues in legacy systems (dates stored as 2-digit years)
- Missing dates (field left blank when a date was required)

**Time tracking errors:**
- Total time that decreases from one work order to the next (data entry error or system correction that was not properly documented)
- Engine time greater than airframe time without a documented engine installation record
- Cycles-since-new that exceed the part's maximum life limit (possible data entry error or possible actual airworthiness issue)

### 5.2 ATA Chapter Code Standardization

The Air Transport Association (ATA) Chapter coding system (ATA iSpec 2200) is the standard taxonomy for organizing aircraft maintenance information by system. Most MRO systems use ATA chapters to categorize work order tasks and parts.

**Standardization issues:**
- Legacy systems may use older ATA chapter numbering that does not align with current ATA 100/iSpec 2200 chapter numbers
- Some systems use two-digit chapter codes; others use four-digit (chapter-section) codes
- Helicopter ATA chapters differ from fixed-wing ATA chapters; a mixed fleet creates complexity
- Some shops use custom chapter codes for non-standard systems or ground support equipment

**Recommended approach:**
- Map legacy ATA codes to standard iSpec 2200 codes during migration
- Preserve the original legacy code as a secondary field for audit trail purposes
- Flag records where the ATA mapping is ambiguous for manual review

### 5.3 Part Number Normalization

Part number normalization is one of the highest-ROI data quality activities in an MRO migration because clean P/N data enables accurate inventory management, parts lookup, and compliance verification.

**Normalization steps:**
1. **Strip whitespace** — leading, trailing, and internal whitespace should be removed or standardized
2. **Standardize case** — most aviation P/Ns are uppercase; normalize all P/Ns to uppercase
3. **Handle manufacturer-specific formats** — some manufacturers use dashes in P/Ns, others do not; create a normalization rule per manufacturer if possible
4. **Resolve supersessions** — cross-reference against manufacturer supersession tables where available; link current P/N to all superseded P/Ns
5. **Identify duplicates** — after normalization, find records that represent the same part under slightly different P/N representations
6. **Flag suspect P/Ns** — P/Ns that don't match any known manufacturer's format should be flagged for verification

**Tools:**
- FAA's Aircraft Parts Lookup database can validate some P/Ns
- Manufacturer P/N databases (available through authorized distributors)
- CAGE code system (commercial and government entity codes) can validate manufacturer identity

### 5.4 Validating Migrated Compliance Data Against FAA Databases

The FAA publishes several databases that can be used to validate migrated compliance data:

**FAA AD Database:**
- Available at rgl.faa.gov
- Contains all ADs with applicability, compliance requirements, and revision history
- Can be used to verify that:
  - AD numbers exist and are formatted correctly
  - Compliance method references are valid for the applicable AD revision
  - Next-due calculations are consistent with the AD's interval requirements

**Aircraft Registry:**
- Available at registry.faa.gov
- Contains current registration information for US-registered aircraft
- Can be used to verify tail number, make/model, serial number, and certificate status

**Airmen Inquiry:**
- Available at amsrvs.amsrvs.faa.gov
- Contains certificate information for FAA-certificated airmen and mechanics
- Can be used to verify mechanic certificate numbers recorded in maintenance entries

**Airworthiness Directives by Aircraft:**
- The FAA's AD Compliance Manager tool allows generating an AD applicability list for a specific aircraft type
- This can be used to validate that the migrated aircraft's AD status addresses all applicable ADs

### 5.5 Strategies for Flagging Data Requiring Manual Verification

Rather than a binary "valid/invalid" approach, Athelon should implement a confidence scoring or flag system for migrated data:

**Recommended flag categories:**

| Flag | Meaning | Action Required |
|------|---------|-----------------|
| `VERIFIED` | Data verified against source documentation | No action |
| `MIGRATED` | Data migrated from prior system, not independently verified | Review at next scheduled inspection |
| `REPORTED` | Data provided by customer/operator without supporting documentation | Verify before relying on for compliance decisions |
| `ESTIMATED` | Value was calculated or estimated due to missing records | Document estimation method; verify when possible |
| `SUSPECT` | Data quality check found anomaly | Manual review required before use |
| `INCOMPLETE` | Required fields missing | Complete before regulatory use |
| `PAPER_ONLY` | Record exists in paper form; digitized copy not available | Paper record must accompany aircraft documentation |

These flags should:
- Be visible in the UI wherever the flagged data is displayed
- Be included in compliance reports so inspectors understand data provenance
- Drive workflow items (e.g., flagged AD compliance records generate a "verify before next flight" task)
- Never be silently removed by normal system use — removing a flag must be a deliberate act with an audit trail

---

## 6. Migration Compliance Considerations

### 6.1 Maintaining Audit Trail During Migration

The migration process itself must be auditable. If an FAA inspector reviews a maintenance record and asks "where did this data come from and has it been altered since migration?", the system must be able to answer.

**Audit trail requirements for migration:**
- Record the source system from which each record was migrated
- Record the date of migration
- Record the identity of the person or process that performed the migration
- Record the original field values if any transformations were applied
- If a record was created during migration to fill a known gap (e.g., a computed total-time record), document that it was created during migration and how the value was computed
- Preserve all original imported records as an immutable import log for a minimum of 24 months post-migration

**Technical implementation:**
The audit trail for migration is distinct from the ongoing operational audit trail. Athelon should implement a `migration_events` table (or equivalent) that records each data import operation with:
- Import batch ID
- Source system identifier
- Records affected (count and entity types)
- Transformation rules applied
- User/process that ran the import
- Timestamp

Individual records should carry a `migrated_from` metadata field that references the import batch.

### 6.2 DER/DAR Involvement for Certain Record Transfers

Designated Engineering Representatives (DERs) and Designated Airworthiness Representatives (DARs) are FAA-designated individuals authorized to make certain compliance determinations on behalf of the FAA.

**When DER/DAR involvement may be relevant to migration:**
- If a major alteration (Form 337) is being transferred to a new system and the alteration data is incomplete, a DER may be needed to assess the completeness of the alteration documentation
- If an aircraft has lost records and a baseline airworthiness determination is needed, a DAR may be involved in the inspection process that establishes the baseline
- If a repair scheme used in historical records references data not in the standard approved data sources, a DER may be needed to confirm the data is acceptable

**Practical scope:**
DER/DAR involvement is not typically required for routine MRO data migration. It becomes relevant in exceptional cases involving incomplete records for complex alterations or when establishing an airworthiness baseline for an aircraft with lost records.

### 6.3 EASA vs FAA Record Format Differences

For Athelon customers that maintain aircraft type-certificated in both the US and Europe (a growing segment due to transatlantic bizav operations), records may need to satisfy both FAA and EASA requirements.

**Key differences:**
- EASA uses EASA Part-145 (analogous to 14 CFR Part 145) for repair station approval
- EASA Form 1 is the equivalent of FAA Form 8130-3 for part certification
- EASA requires a "Continuing Airworthiness Management Organisation" (CAMO) — a function analogous to but distinct from the MRO function
- EASA AD format differs from FAA AD format (EU Regulation 2015/1536 defines the format)
- Some European-type-certificated aircraft (particularly from Airbus and most helicopters) require compliance with EASA ADs in addition to or instead of FAA ADs

**Migration implications:**
- For aircraft with dual US/EASA applicability, the AD compliance record must distinguish between FAA ADs and EASA ADs
- Part certification documents must specify whether they are 8130-3 (FAA) or EASA Form 1
- If Athelon plans to serve European or internationally-operating customers, the data model must support dual-authority compliance tracking

### 6.4 Quality System Documentation Updates After Migration

Under 14 CFR Part 145, the repair station's quality system documentation (operations specifications, quality manual, and inspection procedures manual) describes the repair station's procedures for record keeping. When the record keeping system changes (i.e., when switching from one MRO software to another), the quality system documentation must be updated to reflect the new procedures.

**Required updates typically include:**
- Revision of the record control procedure to reference the new system
- Update of the forms and format section (if the new system generates different forms)
- Update of the backup and recovery procedure for records
- Revision of the data retention schedule to confirm it is implemented in the new system
- Update of training records to show that personnel were trained on the new system

**FAA notification:**
In some cases (particularly for large repair stations operating under complex operations specifications), switching MRO systems may need to be disclosed to the repair station's FSDO (Flight Standards District Office) under the quality system change notification requirements. Athelon should include guidance on this in its onboarding materials.

### 6.5 FAA Inspector Expectations for Digital Migration

When an FAA inspector visits a repair station that has recently migrated to a new MRO system, they will typically want to:

1. **Verify continuity** — can the shop demonstrate that records from the old system are accessible? Are there any gaps in the record history around the migration date?

2. **Test retrieval** — the inspector may request records for a specific aircraft or work order and observe how the shop retrieves them from the new system

3. **Review the migration documentation** — inspectors increasingly ask for a migration plan or migration report documenting what was migrated, when, and how completeness was verified

4. **Examine the transition period** — if the shop ran both systems in parallel, what was the process for deciding which system was authoritative during the overlap?

5. **Assess backup and recovery** — is the new system's backup and recovery procedure documented and tested?

**Practical recommendation:**
Athelon should provide customers with a "Migration Summary Report" — a document generated by the system at the end of migration that summarizes:
- What was imported (record counts by entity type)
- What was flagged (counts by flag type)
- What remains in the source system and why
- The date range of imported historical data
- Who performed the migration and when

This document becomes part of the quality system records and gives FAA inspectors a starting point for reviewing the migration.

---

## 7. Industry Case Studies and Lessons Learned

### 7.1 Common Failure Modes in MRO System Migrations

Analysis of published case studies, industry forum discussions (AEA, ARSA, AMT network), and reported FAA enforcement actions related to record keeping identifies the following recurring failure patterns:

**Failure Mode 1: Scope Creep Leading to a "Big Bang" Cutover**
Many MRO migrations start with the intention to migrate everything perfectly before going live. This leads to indefinitely delayed go-live dates, escalating costs, and ultimately a rushed "big bang" cutover that is poorly validated. The result is a system that goes live with more data quality problems than a phased approach would have produced.

*Lesson:* Use a phased migration approach. Go live with current operational data (open work orders, current fleet, current AD status) and migrate historical data separately, in batches, post-go-live.

**Failure Mode 2: Trusting the Export Without Validation**
Many shops export their data from the old system, import it into the new system, and assume it is correct because the record counts match. They discover errors only when an inspector or customer raises a discrepancy — sometimes months later.

*Lesson:* Validate a statistically significant sample of migrated records against source documents (original logbooks, paper records) before accepting the migration as complete. Spot-check critical records (AD status for aircraft currently in service) 100%.

**Failure Mode 3: AD Compliance Data Migration Without Expert Review**
AD compliance data is the most technically complex data to migrate correctly. Shops that treat it as routine data entry frequently produce AD compliance records that are technically incomplete or reference incorrect revision levels.

*Lesson:* AD compliance migration should be reviewed by an IA (Inspection Authorization holder) or the shop's Director of Maintenance, not delegated to administrative staff.

**Failure Mode 4: Destroying the Source System Records Prematurely**
Some shops decommission their old MRO system immediately after migration, destroying access to the original records before the migration has been validated or before the minimum retention period has elapsed.

*Lesson:* Maintain access to the source system (or a data archive extracted from it) for a minimum of 24 months after migration. For aircraft records, the retention requirement may be longer.

**Failure Mode 5: Inadequate Training Leading to Incorrect Data Entry Immediately Post-Migration**
A new system with correct migrated data can quickly develop data quality problems if staff aren't trained to enter data correctly in the new system. Habits from the old system carry over.

*Lesson:* Training is part of the migration. Validate the first 30 days of new work orders entered in the new system against the same standards used for migrated data.

**Failure Mode 6: Mismatched Time Zones in Cloud Systems**
When migrating from an on-premises system (which records times in local time) to a cloud system (which may store times in UTC), the time offset can corrupt date-critical records if not handled at migration time.

*Lesson:* Establish and document the timezone convention during migration. For date-only fields (AD compliance date, inspection date), use dates without time components where possible to avoid ambiguity.

### 7.2 Typical Migration Timelines by Shop Size

Based on industry benchmarks and published MRO software vendor implementation guides:

**Very small shop (1-5 technicians, under 50 aircraft in fleet, minimal history):**
- Planning and scope: 1-2 weeks
- Data preparation and cleanup: 2-4 weeks
- Import and validation: 1-2 weeks
- Parallel running period: 2-4 weeks
- Total elapsed time: 6-12 weeks

**Small shop (5-20 technicians, 50-200 aircraft, 5+ years of history):**
- Planning and scope: 2-4 weeks
- Data preparation and cleanup: 4-8 weeks
- Import and validation: 2-4 weeks
- Parallel running period: 4-6 weeks
- Total elapsed time: 3-6 months

**Medium shop (20-75 technicians, 200-1000 aircraft, extensive history):**
- Planning and scope: 4-8 weeks
- Data preparation and cleanup: 8-16 weeks
- Import and validation: 4-8 weeks
- Parallel running period: 6-12 weeks
- Total elapsed time: 6-12 months

**Large/heavy MRO (75+ technicians, full-service, hangar operations):**
- Planning and scope: 8-16 weeks
- Data preparation and cleanup: 16-32 weeks
- Import and validation: 8-16 weeks
- Parallel running period: 12-24 weeks
- Total elapsed time: 12-24 months

*Note: These timelines assume dedicated project resources. Shops without a dedicated migration project manager experience 50-100% timeline extensions.*

### 7.3 Cost Considerations and Hidden Expenses

**Direct costs typically understood at project outset:**
- Software licensing for new system
- Vendor implementation/onboarding fees
- IT infrastructure costs (if any)
- Staff training

**Hidden costs frequently underestimated:**
- **Data cleanup labor:** For shops with significant historical data, manual data cleanup (normalizing part numbers, resolving duplicates, completing missing fields) is often the single largest cost. Estimate 1-2 minutes of skilled labor per record for records requiring cleanup.
- **Parallel running overhead:** Running two systems simultaneously roughly doubles administrative burden. For a 90-day parallel period, this overhead is substantial.
- **Validation labor:** Spot-checking migrated records against paper documentation requires time from senior technical staff (DMs, IAs) who are expensive and in short supply.
- **AD compliance reconstruction:** Rebuilding AD compliance history for aircraft with incomplete records may require purchasing access to historical AD records and engaging expert review.
- **Vendor data export fees:** Some MRO software vendors charge for data export services (particularly for structured, system-level exports vs. PDF reports).
- **Downtime costs:** Even with parallel running, there is typically a cutover period (often a weekend) during which neither system is fully operational.
- **Re-training and productivity loss:** Expect 20-40% productivity reduction for the first 30 days in the new system.

**Cost reference point:**
Published implementations of commercial MRO software at mid-sized shops (20-50 employees) typically report total migration costs of $50,000-$200,000 when all the above factors are included, even for "simple" implementations. Heavy MRO implementations can run $500,000-$2M.

### 7.4 Strategies Used by Successful MRO Software Vendors

Analysis of onboarding documentation from CAMP Systems, FlightDocs, and Quantum MX reveals common success patterns:

**Strategy 1: Customer Success Manager with Aviation Background**
Successful vendors assign a migration support person who has actual MRO operations experience, not just software support experience. This person can identify when a customer's data doesn't make technical sense (e.g., a turbine engine with 0 hours time-since-overhaul on an airframe with 15,000 total hours) and ask the right questions.

**Strategy 2: Pre-Migration Readiness Assessment**
Before beginning data import, successful vendors perform a readiness assessment that catalogs the customer's data sources, estimates data quality, and produces a risk register. This prevents surprises during migration.

**Strategy 3: Mandatory Critical Record Validation Checklist**
Some vendors require customers to validate a minimum set of critical records (current AD status for each enrolled aircraft, current total times) against physical documentation before marking migration as complete. This is not optional.

**Strategy 4: Graduated Trust Levels in the System**
CAMP in particular maintains "enrolled" vs. "recently enrolled" status for aircraft, with recently enrolled aircraft showing a caveat that historical data has not been fully verified. This manages liability while still allowing the customer to get value from the system immediately.

**Strategy 5: Data Quality Dashboard Post-Migration**
Successful vendors provide a data quality dashboard that shows the migration health (% records validated, open flags, flagged compliance records) and drives it to zero as a post-migration success metric. This keeps the customer engaged in completing the migration rather than considering it done at go-live.

---

## 8. Recommendations for Athelon

### 8.1 Priority Data Domains for First-Phase Migration Support

Based on operational necessity and regulatory risk, the following priority ordering is recommended:

**Tier 1 — Required for Day-1 Compliance (must be in Athelon before going live):**
1. Aircraft roster with current total times (airframe, engine hours, cycles where applicable)
2. Current AD compliance status for all enrolled aircraft (which ADs apply, current compliance status, next due dates)
3. Open/active work orders (any work currently in progress)
4. Current employee list with certificate information
5. Active customer list

**Tier 2 — Required Within 30 Days of Go-Live:**
6. Parts inventory with current quantities and traceability status
7. Serialized component current installation status
8. Life-limited parts with current accumulated times and limits
9. Approved vendor list
10. Tool calibration current status

**Tier 3 — Historical Data (migrate over 90 days post-go-live):**
11. Work order history (last 24 months minimum per 91.417)
12. Parts transaction history
13. Customer aircraft maintenance history
14. Completed inspection records

**Tier 4 — Archival (migrate as needed, can remain in old system if accessible):**
15. Work order history older than 24 months
16. Parts transactions older than 24 months
17. Archived aircraft records (scrapped or transferred aircraft)

### 8.2 Migration Tier Feature Requirements for the Platform

**Tier 1 import must support:**
- Bulk aircraft import (CSV) with validation against required fields and format
- AD compliance batch import with:
  - FAA AD number validation against the FAA AD database
  - Compliance date and time validation (cannot be future date; must be less than current total time)
  - Confidence level field (verified/reported/estimated)
  - Import preview showing records that fail validation before committing
- Manual work order creation for active in-progress work
- Employee import from CSV with certificate number format validation

**Tier 2 import must support:**
- Parts inventory bulk import (CSV) with:
  - Part number normalization (configurable normalization rules)
  - Traceability source classification (8130-3 / EASA Form 1 / new-from-manufacturer / other)
  - Shelf-life and cure-date support
  - Duplicate detection (same P/N + S/N already exists)
- Component installation tracking import with position-on-aircraft mapping
- LLP import with accumulated life and limit values, plus confidence flags

**Tier 3 import must support:**
- Work order history import with full field mapping
- Ability to map source system work order statuses to Athelon statuses
- Link imported work orders to aircraft and customers imported in Tier 1
- Preserve original work order numbers as a "legacy reference" field

### 8.3 Compliance-Safe Migration Workflow

The following workflow is recommended as Athelon's standard migration process:

**Phase 0: Pre-Migration Assessment (Athelon-facilitated)**
- Customer completes a "Migration Readiness Questionnaire" (source system, years of history, aircraft count, estimated record counts)
- Athelon generates a migration plan with estimated timeline and risk factors
- Customer confirms data backup of source system before any migration begins

**Phase 1: Aircraft and Compliance Import**
- Customer uploads aircraft roster CSV; Athelon validates and shows preview
- Customer reviews validation errors and corrects source data or accepts with flags
- Customer uploads AD compliance CSV; Athelon validates against FAA AD database
- Compliance confidence level assigned per record (not just for the batch)
- Customer reviews flagged records with a qualified person (DM or IA)
- Customer signs off on the imported compliance data ("I certify that this AD compliance data has been reviewed and is accurate to the best of my knowledge")
- Customer uploads employee records

**Phase 2: Operational Go-Live**
- Athelon goes live for new work
- Source system remains accessible (read-only) for historical reference
- New work is entered only in Athelon
- Migration Summary Report generated showing Tier 1 import completeness

**Phase 3: Inventory and Component Import**
- Parts inventory imported and validated (duplicate check, traceability completeness check)
- Serialized components imported with installation status
- LLP data imported with confidence flags assigned
- Customer completes spot-validation of 10% of LLP records against physical documentation

**Phase 4: Historical Work Order Import**
- Historical WOs imported in batches by date range
- Customer validates a sample of imported WOs against paper records
- Flagged records resolved or formally accepted as-is with notation

**Phase 5: Migration Closure**
- Data quality dashboard driven to target state (all Tier 1 critical flags resolved)
- Migration Summary Report finalized and saved to quality records
- Source system decommission scheduled (minimum 24 months after go-live)
- Customer-signed migration completion certificate added to quality system documentation

### 8.4 Parallel Running Period Management

The parallel running period (when both old and new systems are active) is the highest-risk period of any migration. Athelon should provide explicit support for managing this period:

**System of record designation:**
- Athelon must be designated as the system of record for new work from go-live date forward
- Source system is read-only reference for historical records only
- Any finding or discrepancy during parallel running must be recorded in Athelon, not the old system

**Conflict resolution:**
When a discrepancy is found between Athelon data and source system data during parallel running:
1. Do not silently update Athelon to match the source system
2. Investigate the source of the discrepancy
3. Record the investigation and resolution in Athelon's audit trail
4. If the source system is correct, create an amendment record in Athelon documenting what was found and corrected

**End-of-parallel-running checklist:**
- All open items from the migration quality dashboard are resolved
- AD compliance status in Athelon has been validated for all active aircraft
- At least one inspection has been completed and fully recorded in Athelon
- Spot-check of 5 random historical work orders (pulled from source system list, looked up in Athelon) confirms completeness
- Director of Maintenance has signed off on migration completion

### 8.5 Data Model Recommendations for Migration Support

The following additions to Athelon's data model would support the migration use case:

**Per-record migration metadata (add to all major entities):**
```
migrationSource: optional string        // "corridor" | "camp" | "flightdocs" | "paper" | "manual" etc.
migrationBatchId: optional Id           // References a migration_batches record
migratedAt: optional number             // Unix timestamp of migration
migrationConfidence: optional string    // "verified" | "reported" | "estimated" | "suspect"
migrationNotes: optional string         // Free text for migration-specific notes
legacyId: optional string               // Original ID/number from source system
```

**Migration batches table (new):**
```
organizationId: Id<"organizations">
sourcSystem: string
importedBy: Id<"users">
importedAt: number
entityType: string
recordCount: number
validatedCount: number
flaggedCount: number
status: "in_progress" | "completed" | "failed"
notes: optional string
```

**AD compliance record enhancements:**
```
adRevision: optional string             // The specific revision complied with
complianceMethod: optional string       // Paragraph refs, AMOC number, etc.
complianceSource: string                // "shop_records" | "previous_logbook" | "camp_export" | etc.
nextDueCalculationBasis: optional string // How next-due was computed
```

**LLP-specific fields:**
```
birthDocumentReference: optional string  // 8130-3 or manufacturer cert at new
backToBirthComplete: boolean             // Whether full traceability chain is documented
backToBirthNotes: optional string        // Known gaps or verification steps taken
```

### 8.6 Long-Term Platform Strategy Considerations

**Become the migration endpoint, not just a migration consumer:**

The best time to win a customer is when they are already in pain from their current system. Athelon should invest in:

1. **Pre-built connectors for CAMP and FlightDocs** — these are the two most common sources for GA turbine MRO migrations. Structured import from their export formats reduces migration time and error rates dramatically.

2. **A "migration concierge" tier** — for larger shops, offer white-glove migration support as a paid service or include it in higher-tier plans. The cost of doing this well pays back in retention.

3. **Compliance-grade migration certification** — develop a documented, repeatable migration process that culminates in a signed certification document suitable for inclusion in the customer's quality system records. This differentiates Athelon from competitors who treat migration as a self-service checkbox.

4. **Post-migration data health monitoring** — continue monitoring for data quality issues after migration (anomalous total times, AD compliance records with approaching due dates that have not been reviewed, LLP confidence flags that have not been resolved). Alert customers to these through the platform.

5. **FAA/FSDO-ready documentation** — provide customers with a "digital record keeping system" overview document they can present to FAA inspectors during facility evaluations, explaining Athelon's backup, audit trail, and retention capabilities. Inspectors increasingly encounter digital MRO systems and appreciate clear documentation of how the system satisfies regulatory requirements.

---

## Appendix: Regulatory Reference Quick Guide

| Regulation | Subject | Key Requirement |
|------------|---------|-----------------|
| 14 CFR § 43.9 | Maintenance record content | Description, date, name, signature, cert number |
| 14 CFR § 43.10 | Life-limited parts disposition | Documentation required when removing LLPs from service |
| 14 CFR § 43.11 | Inspection record content | Inspection type, airworthiness finding, identity of items |
| 14 CFR § 91.417 | Record retention (Part 91) | "Until scrapped" for AD/alteration records; 24 months for others |
| 14 CFR § 121.380 | Record retention (Part 121) | Life of aircraft for total time, ADs |
| 14 CFR § 145.209 | Repair station records | Content requirements for repair station maintenance records |
| 14 CFR § 145.219 | Repair station quality | Quality system documentation requirements |
| AC 43-9C | Maintenance records guidance | Acceptable formats, electronic record guidance |
| AC 43-10 | LLP disposition | Back-to-birth traceability requirements |
| AC 20-62E | Parts eligibility | Traceability and 8130-3 requirements |
| FAA Order 8900.1 Vol. 6 Ch. 2 | Electronic records | Electronic signature acceptability criteria |

---

*This document is a research artifact for the Athelon platform development team. It represents an analysis of industry practices, regulatory requirements, and migration challenges as of the document date. Specific legal or compliance questions should be directed to an FAA-qualified aviation attorney or the relevant FSDO.*
