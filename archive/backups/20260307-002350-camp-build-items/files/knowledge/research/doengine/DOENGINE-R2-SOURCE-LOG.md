# DOENGINE Round 2 — Source Log (FAR + AC)

## Method
- Primary legal text extracted from local CFR XML corpus:
  - `knowledge/research/industry-context-field-artifacts/Sky Source Source Files/14 CFR/CFR-2025-title14-vol1.xml`
  - `.../CFR-2025-title14-vol2.xml`
  - `.../CFR-2025-title14-vol3.xml`
- Advisory circular metadata collected from FAA AC document pages (web fetch/search).
- Date of research: **2026-03-06 (UTC)**.

---

## 1) 14 CFR Part 43 anchors

### § 43.9 (content/form/disposition of maintenance records)
- Key points used:
  - record must include description/reference of work
  - date of completion
  - name of performer (if different)
  - signature + certificate number/kind for approving person
  - major repairs/alterations entered on prescribed form (appendix B)
- Local source excerpt lines near: vol1.xml around line 52412 onward.

### § 43.11 (inspection records, discrepancy list)
- Key points used:
  - inspection entry content requirements
  - signed and dated discrepancy list when not approved for RTS
  - inoperative item placarding linkage for permitted inoperative equipment
- Local source excerpt lines near: vol1.xml around line 52504 onward.

### § 43.12 (falsification/reproduction/alteration)
- Key points used:
  - prohibition on fraudulent/intentional false entries
  - prohibition on fraudulent reproduction/alteration
- Local source excerpt lines near: vol1.xml around line 52530 onward.

### § 43.13 and § 43.16 (approved methods / airworthiness limitations)
- Key points used:
  - methods/techniques per current maintenance manual/ICA or acceptable data
  - required compliance with airworthiness limitations section tasks
- Local source excerpt lines near: vol1.xml around lines 52540+ and 528xx.

### § 43.7 and § 43.6 (RTS authority + prerequisite records before RTS)
- Key points used:
  - who may approve RTS
  - no RTS unless required maintenance record entries/forms are made
- Local source excerpt lines near: vol1.xml around lines 52390-52420 and 524xx.

---

## 2) 14 CFR Part 91 anchors

### § 91.417 (maintenance records)
- Key points used:
  - bifurcated record classes: work records vs continuity/status records
  - continuity status elements: total time, LLP status, TSO, inspection status, AD status/next due, major alteration forms
  - retention windows and transfer requirements
  - discrepancy list retention until repaired and RTS
  - inspection availability to FAA/NTSB
- Local source excerpt lines near: vol2.xml around lines 35975 onward.

### § 91.419 (transfer of maintenance records)
- Key points used:
  - transfer at sale of 91.417(a)(2) records and non-overlapping (a)(1) records
  - purchaser responsibility for inspection availability even with seller custody
- Local source excerpt lines near: vol2.xml around lines 36006 onward.

---

## 3) 14 CFR Part 135 anchors

### § 135.439 (maintenance recording requirements)
- Key points used:
  - records to support airworthiness release
  - continuity/status information similar to 91 context
  - retention/supersession rules and transfer at sale
  - records availability to FAA/NTSB
- Local source excerpt lines near: vol3.xml around lines 28994 onward.

### § 135.443 (airworthiness release / maintenance log entry)
- Key points used:
  - no operation post maintenance unless release/log entry prepared
  - mandatory certification statements and authorized signature
  - manual-governed signature certification pattern
- Local source excerpt lines near: vol3.xml around lines 29023 onward.

### § 135.441 (transfer of maintenance records)
- Key points used:
  - transfer rules analogous to 91 sale transfer, tied to 135.439 sets
- Local source excerpt lines near: vol3.xml around lines 29019 onward.

---

## 4) 14 CFR Part 145 anchors

### § 145.209 (repair station manual contents)
- Key points used:
  - recordkeeping system description requirement
  - procedures for revision control and notification
- Local source excerpt lines near: vol3.xml around lines 39488 onward.

### § 145.211 (quality control system)
- Key points used:
  - maintain FAA-acceptable QC system ensuring airworthiness
  - current technical data control and corrective action procedures
- Local source excerpt lines near: vol3.xml around lines 39515 onward.

### § 145.219 (recordkeeping)
- Key points used:
  - retain records demonstrating Part 43 compliance
  - provide maintenance release copy to owner/operator
  - retain at least 2 years and make available for inspection
- Local source excerpt lines near: vol3.xml around lines 39579 onward.

### § 145.213(d)
- Key point used:
  - sign-off on final inspections/maintenance releases restricted to authorized personnel (with specific outside-US exception)
- Local source excerpt lines near: vol3.xml around lines 39560-39600.

---

## 5) Advisory Circular references (guidance layer)

### AC 43-9D — Maintenance Records and FAA Form 8130-3 Return to Service
- FAA document information page (active; issued 2025-09-22).
- Stated description indicates guidance for recordkeeping/record-making under 14 CFR parts 43 and 91 and return-to-service context.
- URL: https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1044416

### AC 43-9C — Maintenance Records (canceled by 43-9D)
- Used as legacy context only (migration/backfile behavior), not primary authority.
- FAA page references/cancellation relationship observed via 43-9D document page.

Note: direct PDF text extraction via local tooling was unavailable in this run; AC usage in Round 2 is therefore conservative (scope-level and metadata-confirmed), with FAR text carrying all normative requirements.

---

## 6) Traceability to Round 2 Matrix
- Immutability / anti-falsification controls → §43.12, plus §91.417 continuity expectations.
- Supersession + retention controls → §91.417(b), §135.439(b), §145.219(c).
- Deferred-vs-overdue controls → §43.11 discrepancy/placard logic + operational record continuity requirements.
- Counter correction governance → §91.417(a)(2) status fidelity.
- Authority provenance/sign-off controls → §§43.7/43.9/43.11, §135.443, §145.213.
- Transfer and custody controls → §91.419, §135.441, §145.219(b).
