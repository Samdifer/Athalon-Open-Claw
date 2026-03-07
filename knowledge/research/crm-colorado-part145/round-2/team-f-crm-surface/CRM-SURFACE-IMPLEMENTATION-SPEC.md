# CRM Surface Implementation Spec — Colorado Part 145 Prospect Intelligence

**Round:** 2 / Team F  
**Date:** 2026-03-07 (UTC)  
**Scope:** Implementation-ready architecture for surfacing Colorado Part 145 prospect intelligence inside Athelon CRM.

---

## 1) Goals and constraints

### Goals
1. Make OSINT prospect intelligence first-class in CRM accounts and analytics.
2. Preserve field-level traceability to source evidence.
3. Support repeatable imports from research output packages.
4. Keep current CRM/account flows stable while adding prospecting intelligence.

### Constraints
- Current app CRM is built on `customers` + `crm*` tables (`crmContacts`, `crmInteractions`, `crmOpportunities`, `crmHealthSnapshots`) and pages under `app/(app)/crm/*`.
- Team E packaging artifact (`round-2/team-e-qa-packaging/OUTPUT.csv`) is now populated and validated (v2 remediation), so import contract is based on packaged fields with fallback mapping retained only for resilience.
- Convex has no joins; denormalization/indexes are required for filterable UI.

---

## 2) Data architecture

## 2.1 Extend `customers` (crm/accounts primary surface)

Add optional prospect intelligence fields to `customers` to keep list/detail filtering fast and avoid extra joins for common CRM workflows.

### Proposed `customers` additions
- `prospectType?: "part145_repair_station" | "other"`
- `prospectStatus?: "candidate" | "qualified" | "promoted" | "rejected"`
- `prospectRegion?: string` (e.g., `CO`)

#### Regulatory profile
- `regulatoryPart145Status?: "verified" | "likely" | "unknown" | "conflict"`
- `regulatoryCertNumber?: string`
- `regulatoryCertConfidence?: "high" | "medium" | "low"`

#### Shop profile
- `shopSizeClass?: "small" | "medium" | "large" | "unknown"`
- `shopSizeConfidence?: "high" | "medium" | "low"`
- `aircraftFocusTags?: string[]`
- `capabilityTags?: string[]`
- `profileArchetype?: string` (e.g., `full_service_mro`, `oem_platform_specialist`)

#### Location profile
- `nearestAirportCode?: string` (prefer FAA/ICAO available in source)
- `nearestAirportName?: string`
- `airportDistanceBand?: "on-airport" | "near-airport" | "metro-remote" | "unknown"`
- `distanceToAirportNm?: number` (optional future exact geo pass)

#### Web observability
- `observabilityScore?: number` (0-100)
- `observabilityTier?: "low" | "medium" | "high"`
- `observabilitySignals?: string[]`
- `observabilityLastObservedAt?: number`

#### Research metadata
- `researchRound?: number`
- `researchTeam?: string`
- `researchConfidence?: "high" | "medium" | "low"`
- `researchIssueFlag?: boolean`
- `researchIssueSummary?: string`
- `researchProvenanceRefs?: string[]` (compact refs to snapshot/source IDs)
- `researchLastImportedAt?: number`

### Index additions (customers)
- `by_org_prospect_type`: `[organizationId, prospectType]`
- `by_org_part145_status`: `[organizationId, regulatoryPart145Status]`
- `by_org_shop_size`: `[organizationId, shopSizeClass]`
- `by_org_observability`: `[organizationId, observabilityScore]`
- `by_org_nearest_airport`: `[organizationId, nearestAirportCode]`
- `by_org_prospect_status`: `[organizationId, prospectStatus]`

---

## 2.2 New immutable snapshot table (recommended)

Create `crmProspectIntelligenceSnapshots` for auditability/versioning per import pass.

### Table: `crmProspectIntelligenceSnapshots`
- `organizationId: Id<"organizations">`
- `customerId: Id<"customers">`
- `sourceEntityKey: string` (deterministic import key; e.g., cert+legal_name)
- `snapshotVersion: number` (monotonic per `customerId`)
- `snapshotDate: number`
- `importBatchId: string`

#### Payload blocks
- `regulatory: { part145Status, certNumber, certConfidence }`
- `shopProfile: { sizeClass, sizeConfidence, aircraftFocusTags[], capabilityTags[], profileArchetype }`
- `locationProfile: { nearestAirportCode, nearestAirportName, airportDistanceBand, distanceToAirportNm? }`
- `observability: { score?, tier?, signals[], lastObservedAt? }`
- `researchMeta: { round, team, confidence, provenanceRefs[], sourceRefs[], unresolvedIssues[] }`

#### Traceability block
- `sourceLogRefs: string[]`
- `rawFindingRefs: string[]`
- `transformNoteRefs: string[]`

#### Control/audit
- `isCurrent: boolean`
- `createdBy: string`
- `createdAt: number`

### Index additions (snapshot table)
- `by_org`: `[organizationId]`
- `by_customer_date`: `[customerId, snapshotDate]`
- `by_org_current`: `[organizationId, isCurrent]`
- `by_org_cert`: `[organizationId, regulatory.certNumber]` (if flattened field duplicated for indexability)
- `by_import_batch`: `[organizationId, importBatchId]`

### Why snapshot table is needed
- Keeps account record lean and queryable for day-to-day CRM.
- Preserves immutable research history.
- Enables “Research Traceability” timeline and diff views.

---

## 3) API contracts

## 3.1 Query contracts

### `crm.listProspectAccounts`
Purpose: account list with prospect-specific filters/sorts.

**Args**
- `organizationId`
- `prospectType?`
- `part145Status?`
- `shopSizeClass?`
- `airportDistanceBand?`
- `observabilityTier?`
- `minObservabilityScore?`
- `profileArchetype?`
- `hasIssuesOnly?`
- `search?`
- `sortBy?: "name" | "observability" | "cert_confidence" | "last_imported"`
- `limit?`, `cursor?`

**Returns**
- account rows with existing customer core fields + new prospect intelligence summary fields.

### `crm.getProspectIntelligenceSummary`
Purpose: Prospect Intelligence page aggregate cards/charts.

**Args**: `organizationId`, optional region/filter set.

**Returns**
- counts by `part145Status`, `shopSizeClass`, `airportDistanceBand`, `profileArchetype`
- observability distribution
- issue queue counts
- freshness metrics (`stale > N days`)

### `crm.getProspectIntelligenceDetail`
Purpose: account-level intelligence detail panel.

**Args**: `organizationId`, `customerId`

**Returns**
- flattened current intelligence
- latest snapshot metadata
- unresolved issues
- provenance refs

### `crm.listProspectSnapshots`
Purpose: timeline for traceability tab.

**Args**: `organizationId`, `customerId`, `limit?`, `cursor?`

**Returns**
- snapshot list ordered desc with diff hints (`changedFields[]`).

### `crm.getProspectSnapshotById`
Purpose: open exact historical snapshot.

**Args**: `organizationId`, `snapshotId`

**Returns**: full immutable snapshot record.

---

## 3.2 Mutation/import contracts

### `crm.importProspectIntelligenceBatch`
Purpose: idempotent import of packaged CSV rows.

**Args**
- `organizationId`
- `importBatchId`
- `sourceRound` (number)
- `sourceTeam` (string)
- `rows: ProspectImportRow[]`
- `upsertMode?: "conservative" | "overwrite_non_null"`

**Behavior**
1. Resolve/create `customers` row for each prospect (by `sourceEntityKey`).
2. Update mutable “current” intelligence fields on `customers`.
3. Insert immutable snapshot row.
4. Flip prior snapshots `isCurrent=false`, latest `isCurrent=true`.
5. Write audit log event.

**Returns**
- `{ insertedCustomers, updatedCustomers, insertedSnapshots, skipped, errors[] }`

### `crm.promoteProspectToPipeline`
Purpose: one-click action from Prospect Intelligence page.

**Args**
- `organizationId`, `customerId`
- `title`, `estimatedValue?`, `source="other"|...`

**Behavior**
- create CRM opportunity (stage `prospecting`)
- patch `customers.prospectStatus = "promoted"`

### `crm.flagProspectIssue`
Purpose: operator triage for low-confidence/conflicts.

**Args**
- `organizationId`, `customerId`, `issueCode`, `note`

**Behavior**
- patch `researchIssueFlag`, `researchIssueSummary`
- append issue to current snapshot (optional derived event row)

---

## 3.3 Transport/file import endpoint

If import initiated from file upload UI, add server action endpoint:
- `POST /api/crm/prospects/import`
- accepts CSV payload + metadata (`organizationId`, `importBatchId`, `sourceRound`, `sourceTeam`)
- parses/validates then calls `crm.importProspectIntelligenceBatch`

Validation failures produce downloadable reject report with row numbers.

---

## 4) UI surface implementation

## 4.1 CRM > Accounts (`/crm/accounts`)

### Add filters
- Prospect type (`Part 145 Prospect` / all)
- Part 145 status
- Shop size
- Airport distance band
- Observability tier
- Has unresolved issues

### Add badges/columns
- Badge: `Part 145 Prospect`
- Badge: `Verified/likely/conflict`
- Column: `Shop Size`
- Column: `Nearest Airport`
- Column: `Observability`
- Column: `Last Research Refresh`

### Interaction
- row click → account detail
- quick action: “Open Intelligence” routes to new page pre-filtered on account

---

## 4.2 CRM > Analytics (`/crm/analytics`)

Add “Prospect Intelligence” analytics section/cards:
1. Colorado Part 145 prospects by status
2. Shop size distribution
3. Observability score histogram (0-100 buckets)
4. Airport proximity split (on-airport / near / metro-remote)
5. Top prospect archetypes
6. Staleness panel (records older than threshold)

No removal of existing health/revenue analytics; append as a new section.

---

## 4.3 New page: CRM > Prospect Intelligence

### Route
- `/crm/prospects/intelligence`

### Page sections
1. **Filter rail** (region, status, archetype, observability, issue flag)
2. **Prospect cards/table** with:
   - profile summary
   - confidence indicators
   - last refresh
   - issue flag
3. **Evidence drawer**
   - key fields + provenance refs
   - source links
4. **Actions**
   - Promote to pipeline
   - Mark for manual review
   - View account detail

### Empty/error states
- no prospects imported yet
- import partially failed (show batch diagnostics)

---

## 4.4 Account detail enhancement (`/crm/accounts/[id]`)

Add tab: **Research Traceability**

### Tab contents
- current intelligence summary
- snapshot timeline (reverse chronological)
- field-level provenance refs
- unresolved issues list
- “open source log” links

### Optional enhancement
- “Diff with previous snapshot” (changed fields only)

---

## 5) Migration/import mapping (Team E package → app schema)

> Team E `OUTPUT.csv` is populated in the current run (71 entities). Mapping below is the active implementation contract; Round 1 fallback columns remain as defensive compatibility.

| Team-E / package field | Target table | Target field | Transform | Required | Notes |
|---|---|---|---|---|---|
| `candidate_name` / `legal_name` | `customers` | `name` | trim | yes | Primary display name |
| `dba_name` | `customers` | `companyName` or notes suffix | trim/null-if-empty | no | Preserve DBA context |
| `city,state,postal_code,address_line_1` | `customers` | `address` | concatenate single-line | no | |
| `phone` | `customers` | `phone` | normalize E.164 if possible | no | |
| `email` | `customers` | `email` | lowercase | no | |
| `shop_size_class` | `customers` | `shopSizeClass` | enum map | no | small/medium/large/unknown |
| `shop_size_confidence` | `customers` | `shopSizeConfidence` | enum map | no | high/medium/low |
| `aircraft_worked_on` | `customers` | `aircraftFocusTags[]` | split `;` | no | controlled vocab pass later |
| `profile_archetype` | `customers` | `profileArchetype` | passthrough | no | |
| `part145_evidence_confidence` | `customers` | `regulatoryCertConfidence` | enum map | no | |
| `certificate_hints` / `cert_no` | `customers` | `regulatoryCertNumber` | regex extract cert token | no | if available |
| derived `part145_status` | `customers` | `regulatoryPart145Status` | rules from confidence+source | yes | verified/likely/unknown/conflict |
| `nearest_iata/nearest_icao/nearest_faa` | `customers` | `nearestAirportCode` | preference FAA>ICAO>IATA | no | |
| `nearest_airport_name` | `customers` | `nearestAirportName` | trim | no | |
| `distance_band` | `customers` | `airportDistanceBand` | enum map | no | on-airport/near/metro-remote |
| `web_observability_signals` | `customers` | `observabilitySignals[]` | split `;` | no | |
| derived `web_observability_score` | `customers` | `observabilityScore` | scorer (v1 heuristic) | no | 0-100 |
| derived `web_presence_tier` | `customers` | `observabilityTier` | score bucket | no | low/medium/high |
| `source_refs` | `customers` | `researchProvenanceRefs[]` | split `;` | yes | minimal traceability |
| `source_refs` + import metadata | `crmProspectIntelligenceSnapshots` | `sourceLogRefs/rawFindingRefs/...` | resolve refs | yes | immutable audit trail |
| import metadata | `customers` | `researchRound`,`researchTeam`,`researchLastImportedAt` | set constants/now | yes | |
| import issues | `customers` | `researchIssueFlag`,`researchIssueSummary` | derive from issue codes | no | |

---

## 6) Phased rollout plan

## Phase 0 — Contracts + schema prep (1 sprint)
- add new optional fields to `customers`
- add `crmProspectIntelligenceSnapshots`
- add indexes
- implement import contract + validation scaffolding

**Acceptance criteria**
- schema compiles
- import endpoint validates sample payload and returns deterministic errors
- no regressions in existing CRM queries

## Phase 1 — Ingestion + account list surfacing (1 sprint)
- implement `importProspectIntelligenceBatch`
- extend `listAccountsWithMetrics` to include prospect fields
- add account filters/badges/columns

**Acceptance criteria**
- can import 100+ prospects with idempotent rerun behavior
- `/crm/accounts` can filter by Part 145 + size + observability
- account row shows confidence/status without opening detail

## Phase 2 — Prospect Intelligence page + traceability tab (1 sprint)
- new route/page `/crm/prospects/intelligence`
- add Research Traceability tab on account detail
- snapshot timeline query + detail query

**Acceptance criteria**
- operator can open source-backed evidence for any surfaced field
- timeline shows at least two versions after re-import
- promote-to-pipeline creates opportunity and updates status

## Phase 3 — Analytics and hardening (1 sprint)
- add analytics widgets for prospect distributions
- add stale-data and issue-queue indicators
- add QA checks + import reject reports

**Acceptance criteria**
- analytics section renders with imported data
- stale/issue metrics match snapshot records
- import failure report is downloadable and row-addressable

---

## 7) Risks and fallback paths

1. **Upstream package quality drift (Team E OUTPUT schema/quality changes)**  
   - *Risk:* importer receives records that fail quality gates or schema expectations.  
   - *Fallback:* enforce import preflight checks + keep configurable Round 1 fallback mapping in adapter.

2. **Schema bloat in `customers`**  
   - *Risk:* account object grows and impacts read performance.  
   - *Fallback:* keep only filter-critical fields in `customers`; move heavy/verbose fields into snapshots.

3. **Ambiguous identity resolution (same name, different cert/location)**  
   - *Risk:* incorrect merges overwrite intelligence.  
   - *Fallback:* deterministic `sourceEntityKey`, conservative upsert mode, manual review queue.

4. **No exact distance metrics in current geo pass**  
   - *Risk:* UI implies precision not supported by data.  
   - *Fallback:* show `distance_band` only until numeric geocoding pass is available.

5. **Observability score instability across runs**  
   - *Risk:* rankings fluctuate and hurt trust.  
   - *Fallback:* version scoring logic and store score_version in snapshot metadata.

6. **Traceability link rot**  
   - *Risk:* source refs become non-resolvable over time.  
   - *Fallback:* persist immutable ref IDs to internal `SOURCE-LOG.md` entries and raw finding IDs, not only external URLs.

---

## 8) Definition of done (program-level)

- Product can ingest Colorado Part 145 prospect records into CRM.
- Account list supports prospect-oriented filtering and badges.
- Analytics includes prospect intelligence distribution views.
- Prospect Intelligence page exists with promote-to-pipeline action.
- Account detail includes Research Traceability tab with snapshot history.
- Every displayed intelligence field has provenance path to source refs.
- Import runs are auditable and re-runnable idempotently.
