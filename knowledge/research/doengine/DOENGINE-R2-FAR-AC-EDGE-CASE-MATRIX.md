# DOENGINE Round 2 — FAR/AC Edge-Case Matrix for DO-Item Tracking

## Scope and Intent
This round defines **regulatory edge cases** for a Chapter 4/5 ATA-driven DO-item lifecycle:

1. **Definition** (what the item is, authority, interval basis)
2. **Scheduling** (when due next)
3. **Execution** (work performed)
4. **Sign-off / RTS** (approval for return to service)
5. **Due recompute** (new due point based on actuals and rules)
6. **Records transfer** (retention, supersession, sale/operator handoff)

Primary legal basis: 14 CFR Parts **43**, **91.417**, **135.439/.443**, **145.209/.211/.219**.

> Compliance note: AC content is guidance (acceptable means), not the regulation itself. This matrix treats FAR text as authoritative and ACs as implementation-shaping context.

---

## A) Control Requirements (system-level)

### A1. Immutability and anti-falsification
- **Requirement:** signed maintenance/sign-off events must be append-only; corrections must be additive and traceable.
- **Why:** 14 CFR **43.12** prohibits fraudulent/intentional false entries or fraudulent alteration/reproduction.
- **Engine controls:**
  - WORM-like event ledger for sign-offs and counter snapshots
  - `supersedes_event_id` for amendments (never in-place overwrite)
  - reason code + actor + timestamp + certificate metadata on every correction

### A2. Supersession and retention windows
- **Requirement:** distinguish short-retain “work records” from long-life status records.
- **Why:** 91.417(a)(1) records retained until repeated/superseded or 1 year; 91.417(a)(2) status records retained + transferred with aircraft.
- **Engine controls:**
  - record-class taxonomy: `WORK_EVENT` vs `STATUS_CONTINUITY`
  - supersession chain graph
  - transfer package generator for continuity set

### A3. Deferred vs overdue state model
- **Requirement:** `DEFERRED` is not `OVERDUE`; requires approved basis and constraints.
- **Why:** 43.11 discrepancy list/placard behavior and Part 91/135 operational continuity principles.
- **Engine controls:**
  - explicit disposition enum: `OPEN`, `DEFERRED_AUTHORIZED`, `OVERDUE_UNAUTHORIZED`, `CLOSED`
  - deferred authority object (basis, expiry/limit, approver)

### A4. Counter correction governance
- **Requirement:** any correction to hours/cycles/landings cannot silently re-drive due dates.
- **Why:** 91.417(a)(2) requires current status of life-limited parts, TSO, inspection status, AD recurring due.
- **Engine controls:**
  - counter correction event with old/new + source evidence
  - mandatory recompute snapshot diff and human acknowledgment
  - lockout if correction causes retroactive noncompliance until adjudicated

### A5. Authority provenance for RTS/signature
- **Requirement:** only valid authority roles can create approval-for-return-to-service records.
- **Why:** 43.7, 43.9(a)(4), 135.443(b)(3), 145.213(d).
- **Engine controls:**
  - actor credential model (certificate type/number, role scope, org scope)
  - signature policy engine (who can sign what context)
  - explicit “signature constitutes certification” policy for Part 135 if configured per manual

---

## B) Edge-Case Matrix by Lifecycle Event

| Lifecycle Event | Edge Case | FAR/AC Anchor | Risk if unhandled | Required DoEngine Behavior | Test IDs |
|---|---|---|---|---|---|
| Definition | DO-item created without authority basis (AMM/ICA/AD/manual ref) | 43.13(a), 43.16, 145.211(c)(1)(v) | orphan requirement; invalid obligation | hard-require `authority_source` + revision + effectivity | DEF-01 |
| Definition | Same ATA item instantiated twice with conflicting interval basis | 91.417(a)(2)(iv)(v) | duplicate/contradictory due logic | canonical key + conflict resolver; one active rule set | DEF-02 |
| Definition | Life-limited part item missing PN/SN | 91.417(a)(2)(ii), 43.10(c) | impossible life-status continuity | reject creation unless PN/SN + current life status present | DEF-03 |
| Scheduling | Due computed from projected use, but actual counter already exceeded | 91.417(a)(2)(i)-(iv) | hidden overdue condition | always compare scheduled due vs latest actual counter snapshot; force overdue state | SCH-01 |
| Scheduling | Deferred discrepancy treated as normal open task | 43.11(b), 91.417(b)(3) | illegal operation or bad reporting | separate deferred object with placard/discrepancy references and limit logic | SCH-02 |
| Scheduling | Recurring AD next-due not represented as explicit due node | 91.417(a)(2)(v) | AD recurrence drift | AD recurrence must generate independent due obligation with next due date/time | SCH-03 |
| Execution | Work done but execution record lacks completion date | 43.9(a)(2), 91.417(a)(1)(ii) | noncompliant record, recompute ambiguity | block completion unless completion timestamp captured | EXE-01 |
| Execution | Work reference stored as free text only; no approved-data link | 43.13(a), 145.211(c)(1)(v) | unverifiable method compliance | require structured approved-data citation fields + optional free text | EXE-02 |
| Execution | Major repair/alteration done, but no associated form record pointer | 43.9(d), 91.417(a)(2)(vi) | continuity break for major changes | require form artifact reference for major events | EXE-03 |
| Sign-off | Sign-off by user lacking required cert authority | 43.7, 43.9(a)(4), 145.213(d), 135.443(b)(3) | invalid RTS | enforce authority matrix before status can move to RTS-approved | SIG-01 |
| Sign-off | Signature exists but no cert number/kind metadata | 43.9(a)(4), 43.11(a)(3) | incomplete legal record | mandatory cert fields in signature payload | SIG-02 |
| Sign-off | Part 135 release recorded without required certification statements | 135.443(b)(2) | missing legal assertions | template-driven release statement generation + validation | SIG-03 |
| Due recompute | Late execution should not “erase” period of overdue exposure | 91.417 status continuity intent | audit blind spot | preserve overdue interval history even after completion | REC-01 |
| Due recompute | Counter correction retroactively changes due chronology | 91.417(a)(2), 43.12 | silent compliance shift | recompute versioning; mark previous schedule as superseded-not-deleted | REC-02 |
| Due recompute | Superseding work order closes prior requirement without explicit link | 91.417(b)(1) superseded concept | broken traceability | enforce `supersedes_requirement_id` on closure by replacement | REC-03 |
| Records transfer | Aircraft sale export misses (a)(2)-class continuity records | 91.417(b)(2), 91.419(a) | buyer/operator noncompliance | transfer pack must include full status continuity set | XFER-01 |
| Records transfer | Seller retains physical custody and purchaser loses inspection access | 91.419(b), 91.417(c) | unavailable records to FAA/NTSB | custody flag + purchaser access rights + inspection-readiness checks | XFER-02 |
| Records transfer | Part 135 sale transfer omits a(1) residual records and custody terms | 135.441(a)(b), 135.439(c) | continuity gap under charter ops | dedicated Part-135 transfer profile + completeness validator | XFER-03 |
| Records transfer | Repair-station release copy not delivered to owner/operator | 145.219(b) | owner continuity gap | require recipient acknowledgement for maintenance release delivery | XFER-04 |

---

## C) Implementation-Ready Test Matrix (Athelon DoEngine)

## C1. Definition/Scheduling tests

| ID | Scenario | Setup | Expected |
|---|---|---|---|
| DEF-01 | Missing authority source on new DO-item | create item with ATA + interval but no source/rev | API rejects with `AUTHORITY_SOURCE_REQUIRED` |
| DEF-02 | Duplicate rule collision | create same aircraft+ATA+task with 2 interval schemes | second create rejected or forced conflict workflow |
| DEF-03 | LLP without identity | create LLP DO-item missing PN/SN | reject + explain required fields |
| SCH-01 | Actual counter beyond due threshold | schedule based on stale counter; ingest higher actual | item auto-transitions to `OVERDUE_UNAUTHORIZED` |
| SCH-02 | Deferred discrepancy without basis | mark deferred with no authorizing basis | reject transition to deferred |
| SCH-03 | Recurring AD due generation | seed recurring AD compliance event | next AD obligation auto-created with due reference |

## C2. Execution/Sign-off tests

| ID | Scenario | Setup | Expected |
|---|---|---|---|
| EXE-01 | Completion missing date | submit completion payload with null completion date | validation failure |
| EXE-02 | Free-text-only approved data | execute event with only note text | reject unless structured citation present |
| EXE-03 | Major alteration without form artifact | classify event major alteration, omit form ref | block RTS step |
| SIG-01 | Unauthorized signer | sign with non-qualified role/cert context | sign-off rejected |
| SIG-02 | Signature missing cert metadata | sign with signature blob but no cert no./kind | sign-off rejected |
| SIG-03 | Part 135 release statement incomplete | sign 135 release missing mandatory assertions | release rejected with missing-clause list |

## C3. Recompute/Transfer tests

| ID | Scenario | Setup | Expected |
|---|---|---|---|
| REC-01 | Close overdue item late | set overdue, then complete | state closes but overdue interval remains in audit timeline |
| REC-02 | Counter correction after close | close item, then post counter correction that shifts due backward | new recompute version issued; compliance review required |
| REC-03 | Supersession without linkage | attempt to close prior item as "replaced" with no replacement id | reject closure |
| XFER-01 | Part 91 transfer package completeness | generate package for sold aircraft | includes all 91.417(a)(2) continuity records |
| XFER-02 | Seller custody mode | set seller physical custody | purchaser still has retrieval + inspection access; audit passes |
| XFER-03 | Part 135 transfer profile | generate transfer under 135 | includes 135.439(a)(2) set plus trace to 135.439(a)(1) residuals |
| XFER-04 | Repair station release delivery | close work under 145 cert context | maintenance release copy delivery recorded/acknowledged |

---

## D) Data Model / Rule Hooks (minimal)

- `do_requirement` (authority_source, authority_revision, interval_rule, effectivity)
- `due_projection` (computed_at, basis_counter_snapshot_id, next_due)
- `maintenance_event` (event_type, completion_at, approved_data_refs[])
- `signoff_event` (signature_hash, cert_kind, cert_no, signer_role, authority_scope)
- `supersession_link` (superseded_id, superseding_id, reason)
- `counter_correction_event` (counter_type, old_value, new_value, evidence_ref)
- `record_classification` (`WORK_EVENT` / `STATUS_CONTINUITY`)
- `transfer_package` (regime: PART91/PART135, completeness_report, custody_mode)

Rule hooks:
1. `onRequirementCreate` → authority/effectivity checks
2. `onEventComplete` → mandatory field + major-event artifact checks
3. `onSignoffAttempt` → authority provenance checks
4. `onCounterCorrection` → recompute version and exception gate
5. `onTransferGenerate` → regime-specific completeness validation

---

## E) Advisory Circular informed overlays (non-binding)
- **AC 43-9D** (active, 2025): confirms practical record-making/recordkeeping framing for parts 43/91 and return-to-service documentation patterns.
- **AC 43-9C** (canceled by 43-9D): legacy implementation heuristics still useful for migration/backfile normalization.

Design implication: keep FAR-enforced validation strict; use AC patterns to shape UX templates, field guidance, and training aids.
