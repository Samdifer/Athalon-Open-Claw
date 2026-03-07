# DOENGINE R3 Source Log — ATA Chapter 4/5 Integration Blueprint

Date: 2026-03-06  
Author: OpenClaw subagent (doengine-r3-ata-ch4-ch5-integration-design)

---

## A) Primary internal repository sources (used directly)

1. `knowledge/research/camp-systems/CAMP-MAINTENANCE-TRACKING-DEEP-DIVE.md`
   - Used for synthesized view of CAMP strengths: due tracking discipline, workflow continuity, integration posture.

2. `knowledge/research/camp-systems/TEAM-1-CAMP-FEATURE-INVENTORY.md`
   - Used for feature-level workflow mapping patterns:
     - due-list + calendar + recurring handling
     - due-list -> monthly planning -> WO/task execution
     - AD/SB and compliance evidence concepts

3. `knowledge/research/camp-systems/TEAM-2-WORKFLOW-COMPLIANCE-ANALYSIS.md`
   - Used for compliance-sensitive workflow architecture and control points:
     - deterministic status handling needs
     - records/evidence closure requirements
     - risk patterns for partial adoption and sign-off ambiguity

4. `knowledge/research/camp-systems/TEAM-3-INTEGRATIONS-AND-DATA-FLOWS.md`
   - Used for integration touchpoints design:
     - counters push / due-list pull patterns
     - per-tail enablement concepts
     - reconciliation and identifier strictness considerations

5. `knowledge/plans/2026-03-06-camp-maintenance-tracking-research-and-implementation-plan.md`
   - Used to align the R3 blueprint with current Athelon planning language and phased build framing (MVP/hardening/parity+).

---

## B) External references (web discovery; used as contextual standards anchors)

> Note: These were used as context signals and naming conventions; blueprint remains implementation-centric and repository-grounded.

1. A4A Publications — ATA iSpec 2200 (product page)
   - URL: https://publications.airlines.org/products/ispec-2200-information-standards-for-aviation-maintenance-revision-2025-1
   - Usage: contextual grounding that ATA/iSpec conventions structure maintenance information exchanges.

2. FAA AC 120-16D (Air Carrier Maintenance Programs)
   - URL: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC120-16D.pdf
   - Usage: contextual grounding for structured maintenance intervals/program logic.

3. FAA AC 120-16G (newer AC index hit)
   - URL: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-16G.pdf
   - Usage: contextual awareness of maintenance program modernization.

4. FAA AC 121-22C (MRB/MTB/OEM recommended procedures; search result)
   - URL: https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC%20121-22C.pdf
   - Usage: contextual anchor for minimum scheduled tasking concepts.

5. EASA User Guide for Aircraft Maintenance Programmes (AMP approvals)
   - URL: https://www.easa.europa.eu/sites/default/files/dfu/UG.CAMO_.00010-002_-_User_Guide_for_Aircraft_Maintenance_Programmes__AMP__approvals.pdf
   - Usage: contextual reference to AMM Chapter 5/MPD usage in AMP basis.

6. EASA AMP FAQ page
   - URL: https://www.easa.europa.eu/en/the-agency/faqs/amp-aircraft-maintenance-programme
   - Usage: contextual support for mandatory maintenance inclusion patterns.

7. EASA Easy Access Rules (continuing airworthiness; chapter/MPD references in search snippet)
   - URL: https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-continuing-airworthiness?page=23
   - Usage: contextual support for Chapter 5/MPD planning references.

---

## C) Source quality notes

- **High confidence:** internal CAMP research docs in this repo (already synthesized with source confidence framing).
- **Medium confidence:** public FAA/EASA standards references used only to reinforce terminology and interval-program framing.
- **Not relied on for core logic:** forum-level or non-authoritative interpretation pages.

---

## D) Scope control statement

This R3 blueprint intentionally centers on:
- a single canonical DoEngine model for ATA-coded Ch4/5 due-items,
- deterministic due evaluation,
- minimal but complete operator workflow,
- CAMP-like interoperability without lock-in.

Non-core areas (commercial positioning, broad product marketing comparisons) were excluded unless directly informing technical integration design.
