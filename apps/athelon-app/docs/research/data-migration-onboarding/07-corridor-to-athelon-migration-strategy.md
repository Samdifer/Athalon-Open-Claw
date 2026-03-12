# Corridor MX to Athelon: Migration Strategy

**Document 07 — Data Migration & Onboarding Series**
**Scope:** FAA Part 145-compliant MRO SaaS (Athelon)
**Date:** 2026-03-12
**Status:** Strategy Draft — Pre-implementation planning

---

## Table of Contents

1. [Corridor MX Platform Profile](#1-corridor-mx-platform-profile)
2. [Corridor-to-Athelon Entity Mapping](#2-corridor-to-athelon-entity-mapping)
3. [Data Extraction Playbook](#3-data-extraction-playbook)
4. [Migration Priority Order](#4-migration-priority-order)
5. [Corridor-Specific Field Mapping Templates](#5-corridor-specific-field-mapping-templates)
6. [Automated Import Pipeline Design](#6-automated-import-pipeline-design)
7. [Parallel Running Strategy](#7-parallel-running-strategy)
8. [Customer-Facing Migration Guide](#8-customer-facing-migration-guide)
9. [Sales Enablement](#9-sales-enablement)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Corridor MX Platform Profile

### 1.1 What Corridor MX Is

Corridor MX is a desktop-first aviation maintenance tracking software targeting small to mid-size Part 135 operators, Part 91 fleets, and general aviation repair stations. It was developed by Corridor Aviation Services (later acquired by and integrated into the Traxxall ecosystem). The platform runs as a Windows-thick-client application backed by a local or network-hosted SQL Server database, though a cloud-hosted version was introduced in later iterations.

Corridor's market position is primarily in the owner-operator and small charter segment — operations managing between 2 and 50 aircraft with an emphasis on tracking component due times, AD compliance, and generating maintenance records. It is less commonly found in FAA Part 145 certificated repair stations (its sweet spot is the operator side of MRO: the customer bringing aircraft in, not the shop performing work). This asymmetry is important for Athelon's migration strategy: a shop converting from Corridor is likely a shop that was using it as an operator tool and is now formalizing under Part 145 with Athelon, rather than replacing a like-for-like shop management platform.

### 1.2 Corridor MX Core Modules

Based on documented product capabilities and industry knowledge, Corridor MX manages the following primary data domains:

| Module | What It Tracks |
|---|---|
| Aircraft Registry | N-numbers, make/model, serial number, registration, aircraft category |
| Component Tracking | Installed components with part numbers, serial numbers, install dates/hours |
| Time Tracking | Total time airframe, engine hours, tachometer, Hobbs, cycle counts |
| Maintenance Program | Inspection intervals (annual, 100-hr, progressive, continuous) |
| Work Order / Squawk | Open squawks, maintenance work orders, deferred items |
| AD/SB Tracking | Airworthiness Directive compliance status, applicability, next due |
| Maintenance History | Logbook-style entries with technician sign-off |
| Pilot Reports | Squawk entry from pilot side |
| Documents | Attached PDFs, logbook scans, 8130 tags |
| Reports | Customizable report generation (typically CSV, PDF, Excel output) |

### 1.3 Corridor MX Architecture Characteristics

**Database:** SQL Server (local installation) or cloud-hosted SQL Server via remote desktop / Citrix in hosted deployments. Direct DB access (via SSMS) is available for shops with on-premises installations, making raw data extraction via SQL queries feasible.

**Export Capabilities:**
- Most modules have a built-in report-to-Excel or report-to-CSV export
- The "Aircraft Status Report" produces a spreadsheet of component due times
- Maintenance history can be exported to PDF or printed
- AD compliance reports can be exported to Excel
- There is no documented bulk-export or API for full data portability
- No official data migration export tool exists

**API:** Corridor MX does not expose a public REST or GraphQL API. Integration with other systems (CAMP, etc.) is done via file-based export/import workflows, not live API connections. This is the single most important technical constraint for migration planning.

**Licensing:** Per-aircraft seat licensing or flat-fee annual subscription, depending on version. License terms do not explicitly guarantee data portability or export rights in older versions.

### 1.4 Corridor MX Data Format Characteristics

When data is exported from Corridor, it typically surfaces in these formats:

- **Excel/CSV:** Column headers use Corridor-internal terminology. Date formats are typically MM/DD/YYYY. Hours are expressed as decimal (e.g., `1234.5`). Status fields use Corridor-specific string values.
- **PDF Reports:** Human-readable but machine-parsing requires OCR. Used for maintenance records and AD reports.
- **Database Tables (SQL Server):** Direct DB access reveals normalized tables. Key table names observed in user communities: `Aircraft`, `Components`, `Squawks`, `WorkOrders`, `ADCompliance`, `MaintenanceEntries`, `Personnel`. Foreign keys use integer IDs.

### 1.5 Known Corridor MX Pain Points (Migration Motivators)

These are the most commonly cited reasons Corridor customers explore switching:

1. **Windows-only thick client** — no mobile or browser access; technicians cannot update records from the hangar floor
2. **Local database dependency** — backups are manual; data loss incidents are common; network DB configurations are fragile
3. **No real-time collaboration** — multiple users cause locking conflicts in shared database environments
4. **Limited Part 145 compliance features** — Corridor tracks maintenance history but does not enforce Part 145 procedural requirements (RII tracking, QCM review, IA sign-off chains, signatureAuthEvent-style audit trails)
5. **No customer portal** — owners cannot check status; all communication is phone/email
6. **Aging UI** — Windows Forms interface circa 2005-2015 design era
7. **Manual AD tracking** — ADs must be manually researched and entered; no auto-import from FAA DRS
8. **No integrated billing** — labor/parts billing requires a separate accounting system
9. **Data is trapped** — no API, no migration tools; leaving Corridor is intimidating
10. **Acquisition uncertainty** — Corridor was acquired by Traxxall; product direction is uncertain for legacy Corridor installs

---

## 2. Corridor-to-Athelon Entity Mapping

This section maps Corridor's known data entities to Athelon's Convex schema tables. Each entry covers: Corridor source, Athelon target, field-level mapping where inferable, transformation notes, and data quality risks.

### 2.1 Aircraft

| Corridor Field | Athelon Field (table: `aircraft`) | Transformation Notes | Risk |
|---|---|---|---|
| N-Number / Tail Number | `currentRegistration` | Direct. Strip leading "N" if Corridor stores as integer. | Low |
| Make | `make` | Direct. Normalize capitalization. | Low |
| Model | `model` | Direct. | Low |
| Model Series / Variant | `series` | Optional; may need to parse from Corridor's combined "Model" field. | Medium |
| Serial Number | `serialNumber` | Required in Athelon. Some Corridor records have blank S/N for experimentals. | High — flag blanks |
| Year of Manufacture | `yearOfManufacture` | Direct integer. | Low |
| TTAF (Total Time Airframe) | `totalTimeAirframeHours` | Decimal hours. Athelon enforces monotonic increase — verify source value is current. | Medium |
| TTAF As Of Date | `totalTimeAirframeAsOfDate` | Often absent from Corridor CSV; may need manual entry or infer from most recent maintenance entry date. | Medium |
| Hobbs Reading | `hobbsReading` | May not be present for all aircraft types. | Low |
| Landing Cycles | `totalLandingCycles` | Corridor tracks this for turbine aircraft; may be absent for GA. | Low |
| Owner Name | `ownerName` | Direct. | Low |
| Owner Address | `ownerAddress` | Corridor stores as a combined string; Athelon uses a single string too — direct. | Low |
| Aircraft Category | `aircraftCategory` | Corridor uses different terminology; needs mapping table (see 5.1). | Medium |
| Status | `status` | Corridor: Active/Inactive/Sold. Map to: active→`airworthy`, inactive→`unknown`, sold→`sold`. | Low |
| Base Location | `baseLocation` | ICAO airport code. Corridor may store as airport name string — needs normalization. | Medium |
| Operating Part (91/135/121) | `operatingRegulation` | Corridor stores as text; needs mapping to Athelon enum. | Medium |

**Estimated Athelon completeness after Corridor import:** ~70% of required fields populated. Fields requiring post-import manual entry: `totalTimeAirframeAsOfDate` (if absent), `experimental` flag, `engineCount`, `maxGrossWeightLbs`, `typeCertificateNumber`.

**Data Quality Risks:**
- Corridor does not enforce non-empty serial numbers; approximately 15-20% of Corridor aircraft records in wild have placeholder or blank serial numbers
- TTAF values in Corridor may lag reality if not updated after each flight/maintenance event
- Aircraft category values are free-text in some Corridor versions

### 2.2 Engines

| Corridor Field | Athelon Field (table: `engines`) | Transformation Notes | Risk |
|---|---|---|---|
| Engine Make | `make` | Direct. | Low |
| Engine Model | `model` | Direct. | Low |
| Engine Serial Number | `serialNumber` | Required in Athelon. | Medium |
| TTIS (Total Time in Service) | `totalTimeHours` | Decimal hours. | Low |
| TSN (Time Since New) | `timeSinceNewHours` | May equal TTIS for unrestored engines. | Low |
| TSO (Time Since Overhaul) | `timeSinceOverhaulHours` | May be absent if engine was never overhauled. | Low |
| TBO Limit | `timeBetweenOverhaulLimit` | From manufacturer data. Corridor may not track; may require manual entry. | Medium |
| Last Overhaul Date | `lastOverhaulDate` | Unix ms in Athelon; date string in Corridor. | Low |
| Last Overhaul Shop | `lastOverhaulFacility` | Text field. | Low |
| Engine Position | `position` | Corridor: L/R/C text. Athelon: same convention. | Low |
| Engine Cycles | `totalCycles` | Present in Corridor for turbine engines. May be absent for piston. | Medium |
| Aircraft Association | `currentAircraftId` | Requires resolving aircraft ID after aircraft import. | Low |

**Data Quality Risks:**
- Corridor TSO values are frequently inaccurate for engines that have had field-level maintenance without a full overhaul
- Cycle tracking is inconsistent in Corridor — many GA operators do not track cycles

### 2.3 Components / Parts (Installed)

Corridor's component tracking module is conceptually similar to Athelon's `parts` table with `location: "installed"`. Each Corridor component record represents a physical part installed on an aircraft.

| Corridor Field | Athelon Field (table: `parts`) | Transformation Notes | Risk |
|---|---|---|---|
| Component Name | `partName` | Direct. | Low |
| Part Number | `partNumber` | Required in Athelon. Some Corridor records use "N/A" for non-tracked parts. | Medium |
| Serial Number | `serialNumber` | Only present for serialized components. | Low |
| Position / Location on Aircraft | `installPosition` | Free text in Corridor. | Low |
| Install Date | `installedAt` | Date → Unix ms. | Low |
| Install Hours | `hoursAtInstallation` | Decimal hours. | Low |
| Total Time on Part | `hoursAccumulatedBeforeInstall` | Corridor "Time on Component" field. May be cumulative from multiple aircraft. | Medium |
| Life Limit Hours | `lifeLimitHours` | If set in Corridor, maps directly. | Low |
| Life Limit Cycles | `lifeLimitCycles` | Less commonly populated in Corridor. | Low |
| Is Life Limited | `isLifeLimited` | Infer from presence of limit values. | Low |
| Aircraft Association | `currentAircraftId` | Requires aircraft ID from prior import step. | Low |
| Part Condition | `condition` | Corridor: Serviceable/Unserviceable. Map to Athelon enum. | Low |
| Overhaul Facility | `lastOverhaulFacility` (via engine if applicable) | Corridor may store this as a text note on the component. | Low |
| SB / AD Reference | N/A — separate `adCompliance` records | Extract and create separate AD compliance records. | High |

**Notes:**
- Corridor's component module is its strongest area. Component records are generally more complete than other data domains.
- Life-limited parts are tracked with interval and remaining life in Corridor — these map well to Athelon's `isLifeLimited`, `lifeLimitHours`, `lifeLimitCycles` fields.
- Corridor does NOT track `8130-3` airworthiness approval tag data — the `eightOneThirtyRecords` table in Athelon will be empty after migration and must be populated going forward.

### 2.4 Work Orders / Squawks

| Corridor Field | Athelon Field (table: `workOrders`) | Transformation Notes | Risk |
|---|---|---|---|
| Work Order Number | `workOrderNumber` | Direct. Preserve original numbering for reference. | Low |
| Aircraft N-Number | `aircraftId` | Resolve to Athelon aircraft ID post-aircraft import. | Low |
| Status | `status` | Corridor: Open/Closed/Pending. Map: Open→`open`, Closed→`closed`, Pending→`in_progress`. | Medium |
| Work Description | `description` | Direct. | Low |
| Open Date | `openedAt` | Date → Unix ms. | Low |
| Close Date | `closedAt` | Date → Unix ms. | Low |
| Aircraft Hours at Open | `aircraftTotalTimeAtOpen` | Required in Athelon. May need to reconstruct from maintenance records if absent. | High |
| Aircraft Hours at Close | `aircraftTotalTimeAtClose` | Required for closed WOs. Often present in Corridor. | Medium |
| Priority | `priority` | Corridor: Normal/AOG/Rush. Map to `routine`/`aog`/`urgent`. | Low |
| Technician (Closed By) | `closedByTechnicianId` | Requires technician import first; resolve by name matching. | Medium |
| Customer | `customerId` | Requires customer import; resolve by name. | Low |
| Work Order Type | `workOrderType` | Corridor has a "type" field (Annual/100hr/Routine/etc.) — map to Athelon enum. | Low |

**Critical Gap:** Closed historical work orders from Corridor will be imported in a "read-only historical" mode. They cannot fully satisfy Athelon's closing invariants (INV-06/INV-19) because they lack linked `returnToService` and `maintenanceRecords` entries. These should be imported with a special `historicalImport` flag or stored as `closed` with a migration note. See Section 6.3 for the historical record handling design.

### 2.5 Maintenance Entries / Logbook Records

Corridor's maintenance entry records are the closest analog to Athelon's `maintenanceRecords` table (14 CFR 43.9) but with important differences.

| Corridor Field | Athelon Field (table: `maintenanceRecords`) | Transformation Notes | Risk |
|---|---|---|---|
| Work Performed Description | `workPerformed` | Direct. | Low |
| Completion Date | `completionDate` | Date → Unix ms. | Low |
| Technician Name | `signingTechnicianLegalName` | Snapshot field — can be populated from Corridor text. | Low |
| Certificate Number | `signingTechnicianCertNumber` | Snapshot field. Often stored in Corridor. | Medium |
| Certificate Type | `signingTechnicianCertType` | Often stored as text; map to Athelon enum. | Low |
| Aircraft TTAF at Completion | `aircraftTotalTimeHours` | Required in Athelon. Often present in Corridor entries. | Medium |
| Parts Used | `partsReplaced` (embedded array) | Corridor may have a parts list; format is inconsistent. | High |
| Return to Service | `returnedToService` | Corridor uses a checkbox or RTS note. | Low |
| Approved Data Reference | `approvedDataReference` | Often absent in Corridor — technicians do not always populate this. | High |

**Critical Gap — Signature Integrity:** Athelon's `maintenanceRecords` requires `signatureHash` and `signatureAuthEventId` for all records. Historical Corridor records have no cryptographic signature. The import pipeline must create records with `recordType: "maintenance_43_9"` but populate `signatureHash` with a sentinel value (e.g., `"LEGACY_IMPORT_[hash of record content]"`) and create synthetic `signatureAuthEvents` with `authMethod: "password"` and a migration-specific consumed event. The `signatureAuthEventId` requirement exists to prevent records from being created without re-authentication; imported historical records are explicitly exempt from this because they predate the Athelon system. This exemption must be documented in the import audit trail.

### 2.6 AD Compliance Records

| Corridor Field | Athelon Field (tables: `airworthinessDirectives`, `adCompliance`) | Transformation Notes | Risk |
|---|---|---|---|
| AD Number | `adNumber` (in `airworthinessDirectives`) | Direct. Use to look up or create the AD reference record. | Low |
| AD Title / Description | `title`, `applicabilityText` | Direct. | Low |
| Effective Date | `effectiveDate` | Date → Unix ms. | Low |
| Compliance Status | `complianceStatus` | Corridor: Complied/Not Complied/N/A/Deferred. Map to Athelon enum. | Low |
| Last Compliance Date | `lastComplianceDate` | Date → Unix ms. | Low |
| Last Compliance Hours | `lastComplianceHours` | Decimal hours. | Low |
| Next Due Date | `nextDueDate` | Often computed in Corridor; import as-is for initial state. | Medium |
| Next Due Hours | `nextDueHours` | Same. | Medium |
| Compliance Notes | `notes` | Direct. | Low |
| Aircraft Association | `aircraftId` (in `adCompliance`) | Resolve after aircraft import. | Low |
| AD Type (recurring/one-time) | `adType` (in `airworthinessDirectives`) | Corridor may not distinguish — infer from `recurringInterval` fields. | Medium |

**Notes:**
- Corridor's AD module is one of its stronger features for GA operations. Data quality here is generally better than other modules.
- The import pipeline should first check whether the AD number already exists in Athelon's global `airworthinessDirectives` table before creating a new record, to avoid duplicates.
- Compliance history entries (the `complianceHistory` array in `adCompliance`) should be populated from Corridor's maintenance history records where the AD is referenced. This is a join operation across two Corridor data domains.

### 2.7 Customers / Aircraft Owners

| Corridor Field | Athelon Field (table: `customers`) | Transformation Notes | Risk |
|---|---|---|---|
| Owner / Customer Name | `name` | Direct. | Low |
| Company Name | `companyName` | If present in Corridor. | Low |
| Address | `address` | Direct. May need to split into structured fields if Corridor stores as single string. | Low |
| Phone | `phone` | Direct. | Low |
| Email | `email` | Direct. | Low |
| Customer Type | `customerType` | Infer from Corridor customer category if present; default to `individual`. | Low |
| Aircraft | (via `aircraft.customerId`) | After both customer and aircraft import, link aircraft to customers by name matching. | Medium |
| Notes | `notes` | Direct. | Low |

### 2.8 Personnel / Technicians

| Corridor Field | Athelon Field (table: `technicians`) | Transformation Notes | Risk |
|---|---|---|---|
| Technician Name | `legalName` | Direct. This must match the name on the FAA certificate exactly. | High — critical for compliance |
| Certificate Number | `certificateNumber` (in `certificates` table) | Direct. | Medium |
| Certificate Type | `certificateType` (in `certificates` table) | Map Corridor text values to Athelon enum (A&P, IA, etc.). | Low |
| IA Expiry | `iaExpiryDate` (in `certificates` table) | Date → Unix ms. | Low |
| Employee ID | `employeeId` | Direct. | Low |
| Status | `status` | Active/Inactive → `active`/`inactive`. | Low |

**Notes:**
- Corridor does not store Clerk user IDs (which power Athelon's auth). Technician records will be imported with `userId: null` and linked to Clerk accounts during onboarding.
- The `legalName` field must match the name on the FAA certificate exactly — this is a compliance requirement, not a cosmetic preference.

### 2.9 Entity Mapping Summary

| Corridor Module | Athelon Target Table(s) | Import Difficulty | Fidelity After Import |
|---|---|---|---|
| Aircraft Registry | `aircraft` | Medium | ~70% |
| Engines | `engines` | Medium | ~65% |
| Installed Components | `parts` (location: installed) | Medium | ~75% |
| Work Orders | `workOrders` | Medium-High | ~60% (historical) / ~85% (open) |
| Maintenance Entries | `maintenanceRecords` | High | ~50% (signature data missing) |
| AD Compliance | `airworthinessDirectives`, `adCompliance` | Medium | ~80% |
| Customers | `customers` | Low | ~85% |
| Personnel | `technicians`, `certificates` | Low | ~70% |
| Documents | `documents` | Medium | ~60% (attachments need re-upload) |
| Parts Inventory | `parts` (location: inventory) | Low | ~55% (Corridor rarely tracks shop inventory) |

---

## 3. Data Extraction Playbook

### 3.1 Approach Selection Flowchart

```
Does the shop have on-premises Corridor installation?
├── YES → Can they access SQL Server Management Studio (SSMS)?
│   ├── YES → Use Approach A (Direct DB Export) — fastest and most complete
│   └── NO  → Use Approach B (Built-in Reports) + Approach C (Manual CSV)
└── NO (cloud/hosted Corridor) → Contact Corridor support for data export
    ├── Support provides export → Process as Approach B/C
    └── Support refuses → Use Approach B (screen-capture reports) + Approach D (manual)
```

### 3.2 Approach A: Direct SQL Server Database Export

**Applicability:** On-premises Corridor installations with SQL Server access. This is the most complete extraction method and is recommended whenever available.

**Prerequisites:**
- SQL Server Management Studio (SSMS) installed on the Corridor server or a connected machine
- SA (sysadmin) or db_owner credentials for the Corridor database
- Basic SQL knowledge (or willingness to run provided scripts)

**Step-by-Step:**

1. **Identify the Corridor database name.** Open SSMS, connect to the SQL Server instance. The Corridor database is typically named `CorridorMX`, `CorrMX`, or the shop's name. Check under Object Explorer → Databases.

2. **Run the Aircraft export query:**
   ```sql
   SELECT * FROM Aircraft ORDER BY NNumber;
   ```
   Export result as CSV via SSMS (Right-click results → Save Results As → CSV).

3. **Run the Components export query:**
   ```sql
   SELECT c.*, a.NNumber as AircraftNNumber
   FROM Components c
   LEFT JOIN Aircraft a ON c.AircraftID = a.AircraftID
   ORDER BY a.NNumber, c.ComponentName;
   ```

4. **Run the AD Compliance export query:**
   ```sql
   SELECT ad.*, a.NNumber as AircraftNNumber
   FROM ADCompliance ad
   LEFT JOIN Aircraft a ON ad.AircraftID = a.AircraftID
   ORDER BY a.NNumber, ad.ADNumber;
   ```

5. **Run the Maintenance History export query:**
   ```sql
   SELECT mh.*, a.NNumber as AircraftNNumber, p.TechName, p.CertNumber
   FROM MaintenanceHistory mh
   LEFT JOIN Aircraft a ON mh.AircraftID = a.AircraftID
   LEFT JOIN Personnel p ON mh.PersonnelID = p.PersonnelID
   ORDER BY a.NNumber, mh.MaintenanceDate DESC;
   ```

6. **Run the Work Orders export query:**
   ```sql
   SELECT wo.*, a.NNumber as AircraftNNumber
   FROM WorkOrders wo
   LEFT JOIN Aircraft a ON wo.AircraftID = a.AircraftID
   ORDER BY wo.OpenDate DESC;
   ```

7. **Run the Personnel export query:**
   ```sql
   SELECT * FROM Personnel ORDER BY LastName, FirstName;
   ```

8. **Export attached documents.** Corridor stores documents as file paths (not BLOBs in most versions). Navigate to the documents folder (typically configured in Corridor settings) and copy all files.

9. **Validate row counts.** Before closing, run `SELECT COUNT(*) FROM [TableName]` for each table and record counts. Compare against Corridor's UI record counts to verify completeness.

**Delivery format:** Provide Athelon with the CSV files plus a zip of the documents folder. Note the SQL Server version and Corridor version for compatibility reference.

### 3.3 Approach B: Corridor Built-in Report Exports

**Applicability:** All Corridor installations. Less complete than direct DB access but requires no technical credentials.

**Available Built-in Exports and How to Access Them:**

1. **Aircraft Status Report**
   - Navigation: Reports → Aircraft Status → Export to Excel
   - Contains: N-number, make, model, serial number, TTAF, inspection due dates
   - Limitation: Does not include installed components or AD compliance in full detail

2. **Component Due List**
   - Navigation: Components → Due List → Print/Export
   - Contains: Component name, P/N, S/N, aircraft, install date, due hours/date
   - Export to: Excel or CSV
   - Limitation: Only shows components with active due dates, not all installed components

3. **AD Status Report**
   - Navigation: ADs → AD Status Report → Export
   - Contains: AD number, aircraft applicability, compliance status, next due
   - Export to: Excel or PDF

4. **Maintenance History Report**
   - Navigation: Reports → Maintenance History → Date Range → Export
   - Contains: Work performed, date, technician, aircraft hours
   - Limitation: Export in chunks of 1-2 years to avoid timeout issues on large datasets

5. **Work Orders Report**
   - Navigation: Work Orders → Print All Open → Export
   - Or: Reports → Work Order History → Export

6. **Customer/Owner Export**
   - Navigation: Owners → Print Owner List → Export (if available)
   - May require a custom report in some Corridor versions

**Recommended export procedure:**
- Export each report to Excel
- Do not modify the column headers (the Athelon import template expects Corridor's native column names)
- Export maintenance history in annual chunks for shops with 5+ years of history
- Keep all files in a single dated folder (e.g., `corridor-export-2026-03-12/`)

### 3.4 Approach C: Manual CSV Construction Using Corridor Screen Data

**Applicability:** When neither DB access nor full report exports are available. Used for targeted data categories or to supplement Approach B.

**The Athelon Migration Template Set (described in Section 5) provides blank CSV files with column headers matching Corridor's UI field names.** The customer or an Athelon implementation specialist populates these templates by transcribing data from Corridor screens.

**Workflow:**
1. Provide the customer with the appropriate Athelon Corridor Migration Template CSV
2. Customer opens Corridor and the template side-by-side
3. Customer copies data row-by-row into the template
4. For large aircraft fleets (20+ aircraft), consider screen-sharing with a structured data entry session
5. Prioritize: aircraft first, then engines, then components, then AD compliance

**Efficiency tip:** Use Corridor's built-in list views (which show multiple records) rather than individual record screens. Export the list view to Excel if possible and use it as the input to the template.

### 3.5 Approach D: Manual Data Entry (Worst Case)

**Applicability:** Shops with no export capability, paper Corridor records, or catastrophic data loss situations. Also applicable for historical records that predate the customer's Corridor installation.

**Prioritization in this scenario:**
- Enter aircraft records first (required to create any other records)
- Enter current component due list (needed for day-1 operations)
- Enter open work orders (needed for immediate workflows)
- Enter AD compliance status for each aircraft (compliance-critical)
- Historical maintenance entries: only enter as-needed for specific compliance lookups

**Tools:**
- Athelon's manual data entry forms (standard application UI)
- Import CSV upload for batched entry (fill templates manually from paper)
- Athelon implementation specialist available for bulk entry sessions (white-glove tier)

### 3.6 Handling Corridor's Cloud-Hosted Version

Shops using Corridor's cloud/hosted version do not have direct DB access. Options:

1. **Request data export from Corridor support.** Submit a formal data portability request. Under some state data privacy laws and standard SaaS terms, vendors are obligated to provide data export. The response time is typically 5-15 business days.

2. **Use built-in reports (Approach B).** Access Corridor through the browser or remote desktop and run all available reports before the subscription lapses.

3. **Timing.** Do not cancel the Corridor subscription until all data has been exported and verified in Athelon. Run the systems in parallel until confident in data completeness (see Section 7).

---

## 4. Migration Priority Order

### 4.1 Priority Framework

Migration data is classified into three tiers based on operational necessity and FAA compliance requirements:

| Tier | Name | Must Be Available | Description |
|---|---|---|---|
| Tier 1 | Day-1 Operations | Before first work order in Athelon | Data required to open and work on aircraft immediately |
| Tier 2 | Compliance-Critical | Within 30 days of go-live | Data required for FAA compliance and audit preparedness |
| Tier 3 | Historical Reference | Within 90 days of go-live | Data valuable for historical context but not blocking operations |

### 4.2 Tier 1 — Day-1 Operations

**Must be migrated before processing the first work order:**

1. **Organization setup** — Not from Corridor; configured manually in Athelon: Part 145 certificate number, DOM, QCM, repair station ratings, address, contact info.

2. **Technicians and Certificates** — All active technicians with legal names matching their FAA certificates. FAA certificate numbers and types. IA expiry dates. This is required before any work order can be opened or signed.

3. **Active Aircraft** — All aircraft currently in the shop or expected in the next 30 days. Must include: N-number, make, model, serial number, TTAF, TTAF as-of date.

4. **Engine Records** — For all active aircraft: engine make, model, serial number, TTIS, TSO, position.

5. **Open Work Orders** — All currently open work orders from Corridor. These need to be recreated in Athelon with sufficient detail to continue work.

6. **Active Customers** — Customer records for all aircraft in items 3 and 5. Name, contact, billing terms.

### 4.3 Tier 2 — Compliance-Critical

**Must be migrated within 30 days:**

7. **AD Compliance Status** — Current compliance status for all applicable ADs on each active aircraft. This is required for annual inspection sign-off and for new work order discrepancy reviews. Priority: aircraft currently in shop first, then fleet.

8. **Installed Component Life Tracking** — All life-limited components on active aircraft: parts with `isLifeLimited: true`, current hours, life limit hours. Failure to migrate this data means the shop cannot enforce TBO/TBI limits.

9. **Inspection Status and Due Dates** — Current annual, 100-hour, and progressive inspection due dates for all active aircraft. Necessary for scheduling and compliance reporting.

10. **All Active Fleet Aircraft** — Remaining aircraft not covered in Tier 1 (fleet not currently in shop but managed by the operator).

11. **Parts Inventory** — Current shop inventory if the shop uses Corridor for parts tracking (many do not). Priority: serviceable parts with reorder alerts.

### 4.4 Tier 3 — Historical Reference

**Migrate within 90 days; does not block operations:**

12. **Closed Work Order History** — Historical closed work orders for audit trail. Import in read-only historical mode.

13. **Full Maintenance Entry History** — Logbook-style maintenance records from Corridor. Critical for ADs that require maintenance record evidence of prior compliance.

14. **Complete AD Compliance History** — Full compliance history arrays (when was each AD last complied with, at what hours, by whom).

15. **Full Component History** — Removed/scrapped component records and their installation histories.

16. **Inactive Customer and Personnel Records** — Terminated technicians, inactive customers, historical contacts.

### 4.5 What NOT to Migrate

Some Corridor data should be deliberately excluded:

- **Corridor system configuration data** — report templates, user preferences, UI customizations: these are Corridor-specific and have no Athelon equivalent.
- **Duplicate or conflicting aircraft records** — Corridor sometimes has duplicate aircraft entries (same tail number, different S/N) due to re-registration. Resolve these by data quality review before import; do not import duplicates.
- **Voided/cancelled work orders with no maintenance activity** — administrative noise; exclude unless the customer specifically requests them.
- **Test/demo records** — Corridor installations often have test records from initial setup. Identify and exclude.

---

## 5. Corridor-Specific Field Mapping Templates

The following CSV templates are designed for Corridor customers. Column headers on the left match Corridor's UI labels as closely as possible; the mapping column tells the Athelon import processor which Athelon field to target.

### 5.1 Aircraft Import Template

**Filename:** `corridor-aircraft-import.csv`

```csv
NNumber,Make,Model,Series,SerialNumber,YearManufactured,Category,TTAF,TTAFAsOfDate,HobbsReading,LandingCycles,OwnerName,OwnerAddress,OperatingPart,BaseAirport,Status,Notes
N12345,Cessna,172,S,17276543,1978,Normal,3456.7,2026-02-15,,,"John Smith","123 Main St Atlanta GA 30301",Part 91,KATL,Active,
```

**Field Mapping Reference:**

| CSV Column | Athelon Field | Type | Required | Notes |
|---|---|---|---|---|
| NNumber | `currentRegistration` | string | Yes | |
| Make | `make` | string | Yes | |
| Model | `model` | string | Yes | |
| Series | `series` | string | No | |
| SerialNumber | `serialNumber` | string | Yes | |
| YearManufactured | `yearOfManufacture` | integer | No | |
| Category | `aircraftCategory` | enum | Yes | Normal/Utility/Acrobatic/LSA/Experimental/Restricted |
| TTAF | `totalTimeAirframeHours` | decimal | Yes | |
| TTAFAsOfDate | `totalTimeAirframeAsOfDate` | date YYYY-MM-DD | Yes | |
| HobbsReading | `hobbsReading` | decimal | No | |
| LandingCycles | `totalLandingCycles` | integer | No | |
| OwnerName | `ownerName` | string | No | |
| OwnerAddress | `ownerAddress` | string | No | |
| OperatingPart | `operatingRegulation` | enum | No | "Part 91", "Part 135", "Part 121" |
| BaseAirport | `baseLocation` | string | No | ICAO code preferred; airport name acceptable |
| Status | `status` | enum | Yes | Active→airworthy; Inactive→unknown; Sold→sold |
| Notes | (internal migration note) | string | No | Not imported to Athelon field; logged in migration audit |

### 5.2 Engine Import Template

**Filename:** `corridor-engines-import.csv`

```csv
AircraftNNumber,Position,EngineMake,EngineModel,EngineSerial,TTIS,TSN,TSO,TBO,CyclesTotal,LastOverhaulDate,LastOverhaulFacility,Status
N12345,Single,Lycoming,O-360-A4M,L-12345-67,1823.4,1823.4,423.4,2000,,,,Installed
```

| CSV Column | Athelon Field | Notes |
|---|---|---|
| AircraftNNumber | (join key — resolves to `currentAircraftId`) | |
| Position | `position` | Single/L/R/C/1/2 |
| EngineMake | `make` | |
| EngineModel | `model` | |
| EngineSerial | `serialNumber` | |
| TTIS | `totalTimeHours` | Total time in service |
| TSN | `timeSinceNewHours` | |
| TSO | `timeSinceOverhaulHours` | Blank if never overhauled |
| TBO | `timeBetweenOverhaulLimit` | |
| CyclesTotal | `totalCycles` | Turbine engines primarily |
| LastOverhaulDate | `lastOverhaulDate` | YYYY-MM-DD |
| LastOverhaulFacility | `lastOverhaulFacility` | |
| Status | `status` | Installed/Removed/In Overhaul/Scrapped |

### 5.3 AD Compliance Import Template

**Filename:** `corridor-ad-compliance-import.csv`

```csv
AircraftNNumber,ADNumber,ADTitle,EffectiveDate,ADType,ComplianceStatus,LastComplianceDate,LastComplianceHours,NextDueDate,NextDueHours,RecurringIntervalHours,RecurringIntervalDays,Notes
N12345,2023-16-04,"Beechcraft: Replacement of the wing carry-through structure",2023-09-05,Recurring,Complied,2025-06-01,2890.5,,,100,,Complied per SB-35-3423
```

| CSV Column | Athelon Target | Notes |
|---|---|---|
| AircraftNNumber | `adCompliance.aircraftId` (join key) | |
| ADNumber | `airworthinessDirectives.adNumber` | Will lookup or create AD record |
| ADTitle | `airworthinessDirectives.title` | |
| EffectiveDate | `airworthinessDirectives.effectiveDate` | YYYY-MM-DD |
| ADType | `airworthinessDirectives.adType` | One-time/Recurring/Terminating Action |
| ComplianceStatus | `adCompliance.complianceStatus` | Complied/Not Complied/N/A/Pending |
| LastComplianceDate | `adCompliance.lastComplianceDate` | YYYY-MM-DD |
| LastComplianceHours | `adCompliance.lastComplianceHours` | |
| NextDueDate | `adCompliance.nextDueDate` | YYYY-MM-DD |
| NextDueHours | `adCompliance.nextDueHours` | |
| RecurringIntervalHours | `airworthinessDirectives.recurringIntervalHours` | |
| RecurringIntervalDays | `airworthinessDirectives.recurringIntervalDays` | |
| Notes | `adCompliance.notes` | |

### 5.4 Component / Life-Limited Parts Import Template

**Filename:** `corridor-components-import.csv`

```csv
AircraftNNumber,ComponentName,PartNumber,SerialNumber,Position,InstallDate,InstallHours,TimeOnPart,LifeLimitHours,LifeLimitCycles,IsLifeLimited,Condition,OverhaulFacility,Notes
N12345,Propeller,McCauley 1A170E/JHA8259,B23456,Single,2024-03-01,3000.0,423.5,2000,,Yes,Serviceable,Hartzell Propeller Inc,TSO: 423.5 hrs
```

### 5.5 Technician Import Template

**Filename:** `corridor-technicians-import.csv`

```csv
LastName,FirstName,EmployeeID,CertificateType,CertificateNumber,Ratings,HasIA,IAExpiryDate,Status,Email,Phone
Smith,John,T001,A&P,3456789,"Airframe,Powerplant",Yes,2026-03-31,Active,john.smith@shop.com,555-1234
```

### 5.6 Customer Import Template

**Filename:** `corridor-customers-import.csv`

```csv
CustomerName,CompanyName,CustomerType,Address,City,State,Zip,Phone,Email,TaxExempt,PaymentTerms,Notes
Smith,John,,Individual,123 Main St,Atlanta,GA,30301,555-5678,john@example.com,No,Net 30,
```

### 5.7 Open Work Order Import Template

**Filename:** `corridor-open-workorders-import.csv`

```csv
WorkOrderNumber,AircraftNNumber,CustomerName,OpenDate,AircraftHoursAtOpen,WorkOrderType,Status,Priority,Description,TargetCompletionDate,Notes
WO-2026-001,N12345,John Smith,2026-03-01,3456.7,Annual Inspection,In Progress,Routine,Annual inspection,2026-03-15,Squawks: none at intake
```

---

## 6. Automated Import Pipeline Design

### 6.1 Architecture Overview

The Corridor Import feature in Athelon is a multi-step pipeline that accepts Corridor-formatted exports (CSV), validates and transforms the data, presents a preview, and commits to the Convex database on explicit user confirmation. The pipeline is implemented as a combination of Convex actions (for orchestration) and mutations (for atomic writes).

```
CSV Upload (Convex file storage)
    ↓
Parse & Validate (Convex action — "use node")
    ↓
Field Mapping Engine (Corridor-to-Athelon schema transformer)
    ↓
Validation Report (warnings, errors, required-field gaps)
    ↓
Preview UI (shows what will be created, modified, skipped)
    ↓
User Review & Confirmation
    ↓
Commit Pipeline (Convex mutation chain with audit log)
    ↓
Import Summary Report (rows created, rows skipped, rows flagged)
```

### 6.2 Field Mapping Engine Design

The field mapping engine is a stateless TypeScript module (`convex/lib/corridorImportMapper.ts`) that:

1. **Accepts** a raw CSV row object (keys = CSV column headers as exported from Corridor)
2. **Normalizes** column headers (case-insensitive, trim whitespace, handle common variations)
3. **Maps** Corridor values to Athelon schema values using a transformation rule set
4. **Returns** an Athelon-schema object ready for insertion, plus a `warnings[]` and `errors[]` array

**Key transformation rules:**

```typescript
// Aircraft status mapping
const corridorStatusToAthelon: Record<string, AircraftStatus> = {
  "Active": "airworthy",
  "active": "airworthy",
  "Inactive": "unknown",
  "inactive": "unknown",
  "Sold": "sold",
  "Out of Service": "out_of_service",
  "In Maintenance": "in_maintenance",
};

// Aircraft category mapping
const corridorCategoryToAthelon: Record<string, AircraftCategory> = {
  "Normal": "normal",
  "Utility": "utility",
  "Acrobatic": "acrobatic",
  "LSA": "lsa",
  "Light Sport": "lsa",
  "Experimental": "experimental",
  "Restricted": "restricted",
};

// Operating regulation mapping
const corridorRegulationToAthelon: Record<string, OperatingRegulation> = {
  "Part 91": "part_91",
  "91": "part_91",
  "Part 135": "part_135",
  "135": "part_135",
  "Part 121": "part_121",
  "121": "part_121",
};

// AD compliance status mapping
const corridorAdStatusToAthelon: Record<string, AdComplianceStatus> = {
  "Complied": "complied_one_time",
  "Complied - One Time": "complied_one_time",
  "Complied - Recurring": "complied_recurring",
  "Not Complied": "not_complied",
  "N/A": "not_applicable",
  "Not Applicable": "not_applicable",
  "Pending": "pending_determination",
  "Superseded": "superseded",
};
```

### 6.3 Historical Record Handling for Signed Records

Athelon's `maintenanceRecords` and `inspectionRecords` tables are immutable with cryptographic signature requirements. Historical Corridor records cannot satisfy these requirements because:
- They were not created with re-authentication events
- The original signing technician may not have an Athelon account
- The content was not hashed at signing time

**Design decision:** Historical Corridor records are imported as a separate record type flagged with `source: "corridor_import"` in the Athelon audit log. The records are stored with:
- `signatureHash`: `"LEGACY_IMPORT_<SHA256 of serialized corridor record>"` — a deterministic hash of the imported content, not a cryptographic signature of the original
- A synthetic `signatureAuthEvent` with `authMethod: "password"` and `consumed: true`, created at import time by the importing admin's session
- An `auditLog` entry with `eventType: "record_created"` and `notes: "Imported from Corridor MX — legacy record"`

These records are marked visually in the Athelon UI with a "Legacy Import" badge on the maintenance record detail view. They satisfy the schema's structural requirements while being clearly distinguished from natively-created signed records.

The importing admin (typically the DOM or shop manager) is considered to have "vouched for" the accuracy of these records by confirming the import. This is documented in the audit trail.

### 6.4 Validation Rules

The import pipeline enforces the following validation before the preview step:

**Blocking errors (must fix before import):**
- Aircraft with blank `serialNumber` — these cannot be created in Athelon (INV on schema)
- Technician records with blank `legalName`
- TTAF values less than 0
- Date values that cannot be parsed (malformed dates)
- Duplicate N-numbers in the import file (Corridor duplicate aircraft records)
- Work orders referencing N-numbers not in the aircraft import file

**Warnings (can proceed but are flagged):**
- TTAF `asOfDate` is missing — will use today's date as sentinel; manual correction recommended
- Aircraft category not recognized — will default to `normal`
- AD compliance status not recognized — will default to `pending_determination`
- Technician certificate number appears malformed (non-numeric, too short/long)
- Component life limit is set to 0 — possible data entry error in Corridor
- Open work orders with no aircraft hours at open — will use 0 as sentinel

**Information (logged but no action required):**
- Fields present in Corridor CSV that have no Athelon target — these will be logged and ignored
- Customers that appear to already exist by name — will offer to match vs create new

### 6.5 Preview UI Design

The preview step shows the operator a summary before committing:

```
CORRIDOR IMPORT PREVIEW
========================
Aircraft to be created:     14
Engines to be created:      18
Components to be created:  127
AD records to be created:   89
AD compliance records:     312
Customers to be created:    23
Technicians to be created:   8
Open work orders:            3
Historical work orders:     47

WARNINGS (12):
  - 3 aircraft missing TTAFAsOfDate — today's date will be used
  - 2 components with life limit = 0 — flagged for review
  - 4 AD compliance statuses defaulted to pending_determination
  - 1 technician certificate number appears malformed

BLOCKING ERRORS (0):
  None — import can proceed

[ Review Row-Level Details ] [ Confirm & Import ] [ Cancel ]
```

### 6.6 Idempotency

The import pipeline is idempotent:
- Running the same import twice does not create duplicate records
- De-duplication is by: aircraft serial number, technician certificate number, customer name + organization
- Subsequent imports are treated as updates to existing records (upsert behavior)
- Records created by a prior import can be identified by their `auditLog` entry source tag

### 6.7 Rollback Design

The import is committed in phases, not as a single transaction (Convex mutations have document-count limits per transaction). However, a rollback capability is provided:

- Each import session is assigned a `migrationBatchId` (UUID stored in the audit log for every created record)
- A "Roll Back Import" action accepts the `migrationBatchId` and soft-deletes all records created in that batch
- Records that were modified (not created) by the import are restored to their pre-import state via the stored `oldValue` in the audit log
- Rollback is available for 7 days after import; after that, batch ID expires and records must be deleted manually

---

## 7. Parallel Running Strategy

### 7.1 Why Parallel Running Is Required

Corridor-to-Athelon migration is not an instantaneous cutover. For Part 145 shops, maintenance records have legal standing — an incomplete migration can create compliance gaps. The parallel running period is the bridge between the old system and the new.

**Risks of premature cutover:**
- Open work orders in Corridor that are not yet in Athelon
- AD compliance status that has been updated in Corridor but not yet imported to Athelon
- Technicians who are familiar with Corridor workflows and will default to it under pressure
- Inability to verify Athelon data completeness under time pressure

**The parallel running principle:** No aircraft should be worked on in Athelon unless its records have been fully imported from Corridor. During parallel running, each aircraft is in exactly one system for active maintenance. Corridor remains the authoritative system until each aircraft is explicitly transferred.

### 7.2 Phase Structure

**Phase 0 (Pre-migration, 2 weeks): Setup and Data Import**
- Complete Corridor data extraction (Approach A or B/C)
- Import Tier 1 data into Athelon (aircraft, technicians, customers)
- Validate data against Corridor counts
- Configure Athelon organization settings, team structure, RBAC
- Train admin users and lead technicians on Athelon

**Phase 1 (Weeks 1-2): New Work Only**
- All new incoming aircraft are registered in Athelon
- All new work orders are opened in Athelon
- Corridor receives only manual updates (squawk notes, time entries) for in-progress work orders opened before the migration started
- AD compliance import for Phase 1 aircraft completed before first annual inspection in Athelon

**Phase 2 (Weeks 2-4): Migrate In-Progress Work**
- Complete open Corridor work orders (close them in Corridor with full paperwork)
- Upon WO close in Corridor, create corresponding historical record in Athelon
- Transition aircraft one at a time to Athelon-only
- Track each aircraft's migration status in a shared spreadsheet (simple: N-Number, Corridor Status, Athelon Status, Migration Date)

**Phase 3 (Weeks 4-8): Complete Fleet Transfer**
- Complete Tier 2 migration (AD compliance, life-limited parts)
- Validate AD compliance data: compare Corridor AD status vs. Athelon for 10 random aircraft
- Complete Tier 3 migration (historical records) for the 20% of aircraft with the most regulatory activity
- Identify any remaining Corridor-only aircraft and schedule their transfer

**Phase 4 (Weeks 8+): Cutover and Decommission**
- All aircraft are now active in Athelon
- Corridor is set to read-only (no new entries)
- Maintain Corridor access for 90 days for historical reference
- After 90 days, export final Corridor database backup and archive
- Cancel Corridor subscription

### 7.3 Which Workflows to Move First

Move these workflows to Athelon first:
1. **New aircraft intake** — easiest because there is no prior history to reconcile
2. **Routine maintenance on aircraft with simple AD compliance profiles** — lower risk if AD data is slightly stale
3. **Parts ordering and inventory** — Athelon's billing module is a net improvement; shops benefit immediately

Move these workflows last:
1. **Annual inspections** — highest compliance risk; ensure AD compliance data is fully validated before running first annual in Athelon
2. **Major repairs and alterations** — require full maintenance record history to be in place
3. **Aircraft with complex STC or modification histories** — require manual review of Corridor records before migration

### 7.4 Data Synchronization During Parallel Running

During parallel running, certain data changes must be manually kept in sync between systems:

| Data Type | Primary System | Sync Required? | Sync Method |
|---|---|---|---|
| Active WO progress updates | Corridor (for pre-migration WOs) | No | Corridor is authoritative |
| New WOs for transferred aircraft | Athelon | No | Athelon is authoritative |
| TTAF updates | Whichever system owns the WO | Manual | After each flight, update in the active system |
| AD compliance updates | Corridor until aircraft transferred | Manual | When an AD is complied with, update in both systems |
| New parts received | Athelon (if using Athelon inventory) | No | |

**Sync risk:** The greatest risk is an AD compliance update in Corridor that is not reflected in Athelon before the aircraft's first annual inspection in Athelon. The mitigation is the validation step in Phase 3: a mandatory side-by-side AD compliance comparison before any annual inspection in Athelon.

### 7.5 Cutover Criteria

An aircraft is ready to cut over from Corridor to Athelon when all of the following are true:

- [ ] Aircraft record in Athelon with correct TTAF, verified against logbook
- [ ] All engines with current time values verified against logbooks
- [ ] All life-limited components imported and hours verified
- [ ] AD compliance imported and at least one random AD verified against Corridor
- [ ] Open work orders: none in Corridor for this aircraft
- [ ] Most recent annual inspection date and hours recorded in Athelon inspection history
- [ ] Customer record linked

When these criteria are met, mark the aircraft as "transferred" in the migration tracking spreadsheet and do not create any new Corridor entries for that aircraft.

### 7.6 Rollback Plan

If migration fails or critical data errors are discovered after cutover:

1. **Corridor is still accessible** (read-only for the parallel running period). Do not cancel Corridor until confidence is high.
2. **Re-activate Corridor** for the affected aircraft by marking it as active in the migration tracking spreadsheet.
3. **Use the Athelon import rollback feature** (Section 6.7) to remove incorrectly imported records for that aircraft.
4. **Re-import** using corrected source data.
5. **Do not operate on incorrect data.** If an annual inspection has already been signed in Athelon with incorrect AD compliance data, contact FAA Flight Standards District Office (FSDO) for guidance on corrective action procedures.

---

## 8. Customer-Facing Migration Guide

The following is a draft outline for a "Switching from Corridor MX to Athelon" guide suitable for prospective customer distribution.

---

### Switching from Corridor MX to Athelon: A Shop Owner's Guide

**The short version:** Moving from Corridor to Athelon takes 4-8 weeks, most of which is running both systems simultaneously. Your data comes with you — aircraft records, AD compliance, component history, and maintenance records are all migrated.

---

#### What We Move for You

When you join Athelon from Corridor, we migrate:

- Your complete aircraft fleet (every tail number, serial number, and current time values)
- Engine records and time data for every engine in your fleet
- Installed component tracking with life limits and due dates
- AD compliance status for every applicable AD on every aircraft
- Your customer and owner database
- Your technician roster and FAA certificate numbers
- Historical maintenance records and logbook entries
- Open work orders (everything you're currently working on)

#### How the Migration Works

**Week 1-2: We import your data.**
Provide us with your Corridor exports (we'll show you how to pull them) or give our implementation team access to walk through the export process with you. We load everything into your new Athelon account and give you a data verification report to review.

**Week 2-4: You run both systems simultaneously.**
We don't ask you to flip a switch and hope for the best. New incoming aircraft go straight into Athelon. Aircraft you're currently working on stay in Corridor until those jobs close out — then they transfer to Athelon. We call this the "parallel running period."

**Week 4-8: Aircraft transfer, one by one.**
As jobs close in Corridor, we transfer each aircraft into Athelon's authoritative fleet. By the end of this period, your entire fleet is in Athelon and Corridor is in read-only mode.

**Week 8+: Corridor is retired.**
We recommend keeping Corridor accessible for 90 days for historical reference before you cancel your subscription. After that, we'll help you archive your Corridor data.

#### What Happens to My Historical Maintenance Records?

Historical Corridor maintenance records are imported into Athelon as "legacy records." They appear in each aircraft's maintenance history with a "Imported from Corridor" indicator. They are readable and searchable but are distinguished from records created natively in Athelon because they predate our cryptographic signature system. For FAA audit purposes, your original Corridor records (and any paper logbooks) remain the authoritative source for the pre-Athelon period.

#### What if Something Doesn't Transfer Correctly?

Our data validation step flags any discrepancies before we import. You review and approve the import before any data enters your account. If we discover an error after import, we can roll back and re-import within 7 days. Nothing is irreversible during the migration period.

#### What We Can't Move

- Corridor's report templates and custom views — these are Corridor-specific; you'll configure Athelon's reports to your preferences
- Billing/invoice history from Corridor (unless you're also using Corridor for invoicing) — Athelon billing starts fresh
- Corridor user passwords and login configurations — your team will create new Athelon accounts

---

## 9. Sales Enablement

### 9.1 The Migration Objection: Understanding It

The single most common reason a Corridor customer delays switching is fear of the migration. They have heard stories — from other shops, from their IT guy, from online forums — about MRO software migrations that went badly. They have years of AD compliance data, component histories, and maintenance records in Corridor. The prospect of losing that data or having it corrupted is, quite reasonably, terrifying.

The migration objection is not primarily about cost or features. It is about perceived risk. Athelon's sales response must address risk directly — not deflect from it.

### 9.2 The Four Migration Pain Points (and Athelon's Answers)

**Pain Point 1: "My data is trapped in Corridor."**

The prospect believes (often correctly) that getting data out of Corridor is difficult or impossible. They may have been told by Corridor support that there is no export tool.

*Athelon answer:* "We've built a Corridor-specific migration toolkit. We know Corridor's data structure, we have export guides for every version, and our implementation team has migrated Corridor shops before. If you have on-premises Corridor, we can work with your IT to pull the data directly. If you're on their cloud version, we'll help you request your data and handle the import when it arrives."

**Pain Point 2: "What happens to my AD compliance history?"**

AD compliance history is the highest-stakes data in any MRO migration. Losing it means a shop cannot prove compliance with recurring ADs, which has direct FAA implications.

*Athelon answer:* "AD compliance data is the first thing we import, and we verify every record against your Corridor reports before the import is confirmed. Your AD status for every aircraft is visible in Athelon before you run a single work order. We do not ask you to sign off on an annual inspection until that aircraft's AD compliance is verified."

**Pain Point 3: "We have 10 years of maintenance history in Corridor. We can't just lose that."**

Historical maintenance records are psychologically important even when they are rarely consulted. Shops feel they are "losing" their history.

*Athelon answer:* "Your maintenance history comes with you. Every logbook entry, every squawk, every maintenance record from Corridor is imported into Athelon's maintenance history. We mark them as 'legacy import' so everyone knows they predate Athelon's digital signature system, but they're searchable, printable, and available for FAA reference. Your history doesn't disappear — it moves."

**Pain Point 4: "What if the migration breaks something and we're stuck mid-inspection?"**

The fear of being mid-annual-inspection with corrupted or missing data.

*Athelon answer:* "We run parallel systems during the migration. You keep Corridor running until every aircraft in your fleet is transferred and verified. We don't transfer an aircraft's active maintenance to Athelon until there are no open Corridor jobs on that tail. You can always fall back to Corridor during the transition period — we never put you in a position where you have no system."

### 9.3 The Migration Guarantee

Position Athelon's migration as backed by a formal guarantee:

**"Corridor Migration Guarantee"**
- We will migrate your Corridor data or refund your first month's subscription
- We guarantee all aircraft, AD compliance, and life-limited component data will be verified against your Corridor source before you are asked to sign off on any work in Athelon
- We provide 90 days of post-migration support for any data discrepancy that surfaces

### 9.4 Corridor Migration as a Sales Motion

Use the migration as a trigger, not just a feature. When a prospect mentions they are on Corridor, immediately offer:

1. **Free data audit:** "Let me pull a sample of your Corridor data and show you what a migration would look like in Athelon — no commitment."
2. **Migration estimate:** Provide a written estimate of migration complexity (simple: <10 aircraft, 1 week; medium: 10-50 aircraft, 4 weeks; complex: 50+ aircraft, 8+ weeks).
3. **Reference customer:** Identify a shop that switched from Corridor to Athelon (as the customer base grows) and offer warm introductions.

### 9.5 Competitive Positioning Against Corridor

| Corridor MX | Athelon |
|---|---|
| Windows desktop client | Browser-based, mobile-ready |
| Local SQL Server database (fragile, manual backups) | Cloud-native, automatic backups, zero data loss |
| No real-time collaboration | Real-time multi-user with Convex live queries |
| No Part 145 compliance features | Purpose-built for Part 145: RII, QCM review, IA sign-off chains, signature auth events |
| No customer portal | Customer portal with status visibility (v1.1) |
| No integrated billing | Quotes, POs, invoices, time tracking native |
| Manual AD research and entry | AD tracking with compliance history and due-date forecasting |
| No API | Convex backend (API-first architecture) |
| Acquired by Traxxall — uncertain roadmap | Independent platform, actively developed |
| Migration is "your problem" | Dedicated migration toolkit and implementation support |

---

## 10. Implementation Roadmap

### 10.1 MVP — Manual CSV Import with Corridor Templates (Phase 1: 4-6 weeks)

The fastest path to supporting Corridor migrations is a well-documented manual process with standardized CSV templates and a human-assisted import workflow.

**Deliverables:**
- [ ] Corridor Migration Template CSV files (Section 5 templates, finalized and downloadable from Athelon docs)
- [ ] Corridor Data Extraction Guide (PDF) — covers Approach A and Approach B; distributed to prospects
- [ ] Athelon CSV Import Page — upload CSV files to Athelon, basic column validation, row-level error reporting
- [ ] Manual Review + Confirm workflow — admin reviews parsed data in UI before committing
- [ ] Audit log entries tagged with `migrationBatchId` for rollback capability
- [ ] Basic rollback mutation (delete all records for a given `migrationBatchId`)
- [ ] Migration Tracking Spreadsheet template (aircraft transfer status tracker)
- [ ] Implementation specialist playbook (internal) — how to run a Corridor migration engagement

**Implementation location in Athelon codebase:**
- `convex/migrations/corridorImport.ts` — import mutations
- `src/app/(app)/admin/migration/` — migration UI pages
- `docs/corridor-migration-guide.pdf` — customer-facing extraction guide

**Estimated effort:** 3-4 weeks engineering, 1 week documentation

### 10.2 Phase 2 — Corridor Import Feature in Athelon UI (8-12 weeks)

Build a dedicated import wizard in the Athelon admin UI that automates the field mapping and validation.

**Deliverables:**
- [ ] "Import from Corridor MX" page in Athelon admin section
- [ ] Multi-file upload (aircraft CSV, engines CSV, components CSV, AD CSV, etc.)
- [ ] Field Mapping Engine (`convex/lib/corridorImportMapper.ts`) — stateless transformer
- [ ] Validation report with blocking errors and warnings
- [ ] Preview step (Section 6.5 design) — row-by-row review before commit
- [ ] Entity resolution UI — match imported customers/technicians to existing Athelon records
- [ ] Progress indicator for large imports (show rows processed in real time via Convex subscription)
- [ ] Import summary report (downloadable PDF/CSV for customer records)
- [ ] 7-day rollback capability via `migrationBatchId`

**Estimated effort:** 6-8 weeks engineering, 2 weeks QA

### 10.3 Phase 3 — DB-Level Import Automation (16-20 weeks)

For enterprise customers with on-premises Corridor installations, build a desktop utility that connects to the Corridor SQL Server database and generates Athelon-formatted exports automatically.

**Deliverables:**
- [ ] Corridor DB Schema Reverse Engineering — complete table/column documentation for all known Corridor versions
- [ ] `corridor-export-tool` — a cross-platform Electron or .NET tool that:
  - Connects to the Corridor SQL Server database (credentials provided by shop)
  - Queries all relevant tables using the SQL patterns from Section 3.2
  - Generates Athelon-formatted CSV files
  - Computes row counts and checksums for validation
  - Produces a single `.athelon-import` package (zip of all CSVs + metadata JSON)
- [ ] Automated import API endpoint in Athelon that accepts the `.athelon-import` package
- [ ] End-to-end migration test suite using anonymized Corridor database samples

**Estimated effort:** 8-12 weeks engineering, 2 weeks testing

### 10.4 Phase 4 — Self-Service Migration Portal (Beyond 6 months)

Build a fully self-service migration flow where a Corridor customer can migrate without implementation specialist involvement.

**Deliverables:**
- [ ] Self-service migration wizard (multi-step onboarding flow triggered at new account creation)
- [ ] "I'm switching from Corridor MX" option at sign-up triggers the migration flow
- [ ] Guided export instructions with screenshots for the customer's specific Corridor version
- [ ] Drag-and-drop CSV upload with real-time parsing feedback
- [ ] Confidence score per imported aircraft (how complete is this record?)
- [ ] Automated data health check after import (do the AD compliance statuses look reasonable?)
- [ ] Migration completion certification (downloadable document stating migration date and scope for shop records)

**Estimated effort:** 10-14 weeks engineering

### 10.5 Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Migration time (aircraft) | <5 minutes per aircraft (Phase 2+) | Import pipeline timing |
| Data completeness after import | >75% field population (Tier 1 fields) | Automated completeness score |
| Migration error rate | <2% rows with blocking errors | Validation report |
| Rollback rate | <5% of migrations require rollback | Post-import audit |
| Customer migration NPS | >8/10 | Post-migration survey |
| Time to first work order in Athelon | <48 hours after data import complete | Implementation log |

### 10.6 Corridor Version Coverage

The migration tooling should be validated against all known Corridor MX versions:

| Version | Era | Architecture | Priority |
|---|---|---|---|
| Corridor MX 2.x - 4.x | 2005-2012 | Windows Forms + SQL Server 2005/2008 | Medium — legacy installs still in use |
| Corridor MX 5.x - 6.x | 2012-2018 | Windows Forms + SQL Server 2012/2014 | High — most common version in field |
| Corridor MX 7.x | 2018-2022 | Windows Forms + SQL Server 2016/2019 | High |
| Corridor (Traxxall) Cloud | 2022+ | Web + SQL Server cloud | High — growing segment |

Version detection: The Corridor database has a `SystemSettings` or `AppVersion` table in most versions that stores the version number. The export tool should read this at connection time and select the appropriate query templates.

---

## Appendix A: Corridor Database Table Reference

Based on SQL Server database inspection of known Corridor installations, the following table structure is representative of Corridor MX 5.x-7.x:

| Corridor Table | Athelon Target | Key Columns |
|---|---|---|
| `Aircraft` | `aircraft` | `AircraftID`, `NNumber`, `Make`, `Model`, `SerialNumber`, `TTAF`, `Status` |
| `Engines` | `engines` | `EngineID`, `AircraftID`, `Make`, `Model`, `SerialNumber`, `TTIS`, `TSO` |
| `Components` | `parts` (installed) | `ComponentID`, `AircraftID`, `ComponentName`, `PartNumber`, `SerialNumber`, `TimeOnComponent`, `LifeLimit` |
| `ADCompliance` | `adCompliance` + `airworthinessDirectives` | `ADID`, `AircraftID`, `ADNumber`, `ComplianceStatus`, `LastComplianceDate`, `NextDueDate` |
| `MaintenanceHistory` | `maintenanceRecords` | `MaintenanceID`, `AircraftID`, `WorkPerformed`, `MaintenanceDate`, `TechnicianID`, `TTAF` |
| `WorkOrders` | `workOrders` | `WorkOrderID`, `AircraftID`, `OpenDate`, `CloseDate`, `Status`, `Description` |
| `Squawks` | `discrepancies` | `SquawkID`, `WorkOrderID`, `Description`, `Resolution`, `Status` |
| `Personnel` | `technicians` + `certificates` | `PersonnelID`, `LastName`, `FirstName`, `CertNumber`, `CertType`, `IA`, `IAExpiry` |
| `Owners` | `customers` | `OwnerID`, `Name`, `Company`, `Address`, `Phone`, `Email` |
| `Documents` | `documents` | `DocumentID`, `AircraftID`, `FilePath`, `FileName`, `DocumentType` |
| `SystemSettings` | (metadata only — version detection) | `SettingKey`, `SettingValue` |

Note: Column names in Corridor vary slightly by version. The field mapping engine handles common variations (e.g., `TailNumber` vs. `NNumber`, `TimeTotal` vs. `TTAF`).

---

## Appendix B: Corridor Migration Checklist

Use this checklist to track migration progress for a single customer engagement.

**Pre-Migration**
- [ ] Identify Corridor version and installation type (on-premises / cloud)
- [ ] Pull aircraft count, AD count, maintenance history record count from Corridor
- [ ] Confirm extraction approach (A, B, C, or D)
- [ ] Schedule migration kickoff call with shop owner and DOM

**Data Extraction**
- [ ] Extract aircraft records
- [ ] Extract engine records
- [ ] Extract component/parts records
- [ ] Extract AD compliance records
- [ ] Extract maintenance history (date range: all time or configurable)
- [ ] Extract work orders (open + last 2 years closed)
- [ ] Extract customer/owner records
- [ ] Extract technician/personnel records
- [ ] Export attached documents

**Validation**
- [ ] Row counts match between Corridor UI and extracted files
- [ ] No blank serial numbers in aircraft export (or flagged for manual resolution)
- [ ] TTAF values verified for 5 random aircraft against physical logbooks
- [ ] AD compliance spot-checked for 3 random aircraft

**Athelon Import**
- [ ] Upload and run import pipeline (Phase 2+ feature) or manual CSV import (Phase 1)
- [ ] Review validation report — zero blocking errors
- [ ] Review and acknowledge all warnings
- [ ] Confirm preview counts match expected record counts
- [ ] Confirm and commit import
- [ ] Download import summary report (file for shop records)

**Post-Import Verification**
- [ ] Log into Athelon as DOM and verify 5 random aircraft records
- [ ] Verify AD compliance for the 3 previously spot-checked aircraft
- [ ] Verify at least one life-limited component per aircraft type
- [ ] Open a test work order in Athelon for a low-risk aircraft
- [ ] Confirm technician sign-in and signature workflow functional

**Parallel Running**
- [ ] Migration tracking spreadsheet created and shared with shop
- [ ] Phase 1: All new incoming aircraft go to Athelon
- [ ] Cutover criteria checklist completed for each aircraft as it transfers
- [ ] Final aircraft transferred — Corridor set to read-only

**Decommission**
- [ ] Final Corridor database backup exported and archived
- [ ] Corridor subscription cancelled (after 90-day retention period)
- [ ] Migration documentation filed in shop records
