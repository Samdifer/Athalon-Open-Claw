# Profile: Rachel Kwon — Tech Publications & Training Manager
**Role:** Tech Publications and Training Manager, Summit Aerospace Services (Part 145, turboprop + piston)  
**Location:** Bend, OR  
**Experience:** 17 years in aviation maintenance; 9 years as A&P/IA; 5 years in current role  
**Interviewed for Athelon:** Phase 5 — Repair Station Staff Discovery  
**Interview Date:** 2026-02-22

---

## Background

Rachel Kwon holds an A&P certificate with IA authorization and worked as a line mechanic and inspector for nine years before moving into the Tech Publications and Training role at Summit Aerospace Services in 2021. She took the job because the position was a new one — the shop's previous approach to approved data management was "we have a shared drive with some PDFs on it" — and she was frustrated enough with that approach to want to fix it.

Summit has 18 mechanics, 3 inspectors, and a DOM who knows how to run a shop but admits he doesn't have time to manage the publications library the way it needs to be managed. Rachel was hired to fix that. She built the current system — a combination of a Jeppesen Maintenance Data subscription, a shared network drive with strict folder conventions, and a paper-based training records binder — largely from scratch.

She has a strong opinion on one subject: when a mechanic does work, they should be able to point to exactly what approved data they used, down to the section and revision number. Not just "I used the AMM." Which AMM? Which revision? Which section? That is what an FAA inspector asks. That is what a defensible maintenance record contains. And that is what most MRO software, in her experience, makes it almost impossible to document properly.

---

## Scope of Responsibility

- **Approved data library:** Maintains subscriptions to aircraft maintenance manuals (AMM), structural repair manuals (SRM), illustrated parts catalogs (IPC), wiring diagrams, and component maintenance manuals (CMM) for all aircraft types serviced by Summit.
- **Airworthiness Directive (AD) library:** Tracks all applicable ADs for aircraft in the Summit customer base; coordinates with DOM on AD compliance documentation; flags newly issued ADs against current fleet.
- **Revision currency:** Ensures all approved data is current revision. Monitors manufacturer service bulletin and revision notices. Removes superseded revisions from the system and the shop floor.
- **Repair Station Manual (RSM):** Custodian of the RSM and all associated procedures. Manages FAA-approved revision process — every RSM change must go through her and receive DOM sign-off before distribution.
- **Training records:** Tracks initial and recurrent training for all 18 mechanics and 3 inspectors. Maintains training records binder. Coordinates new hire orientation, including RSM training and approved data access training.
- **New hire indoctrination:** Every new mechanic goes through a structured training program on how to access approved data, how to document references, and what the shop's RSM requires. Rachel runs this herself.

---

## The Problem She Inherited

When Rachel arrived, Summit's "approved data management" consisted of:
- A shared network drive with PDFs of manuals — some current, some 3–4 years out of date
- No version tracking
- No record of who accessed what and when
- Task cards that said "per AMM" with no section number, no revision, no document identifier
- A DOM who acknowledged the problem but hadn't had time to fix it

Her first month was spent auditing every manual on the network drive. She found 11 manuals that were not current revision. She found one case where a mechanic had been referencing an AMM section that had been superseded by a manufacturer service bulletin — the old section was still on the drive, the new one had never been added. The work had been done correctly (as it turned out), but the documentation reference was wrong. She considers that a near-miss.

---

## Technology Profile

- **Jeppesen Maintenance Data:** Online subscription service for approved manuals; replaced the network PDF drive for primary reference
- **Corridor:** Used for work order and task card management; in her view, its handling of approved data references is "a text field with no connection to anything"
- **Shared network drive (residual):** Still used for RSM, training records, and shop-specific documents
- **Excel:** Tracks AD compliance due dates and revision currency dates
- **Paper binder:** Training records (all 18 mechanics + 3 inspectors); required for FAA inspection

---

## Core Pain Points (Pre-Interview Summary)

1. **Task cards don't require specific approved data references.** Corridor has a notes field. Mechanics write "per AMM." Rachel wants section number, revision number, page number. Corridor has no enforcement mechanism for this.
2. **No link between the task card and the actual document.** "Per AMM Chapter 5-20-00, Rev 12" is just text in a field — it doesn't connect to the actual manual. If the manual gets revised and the reference becomes stale, there's nothing to flag it.
3. **AD tracking lives in Excel.** She wants AD compliance documentation to be in the same system as work orders and task cards. The current separation means she has to manually cross-reference.
4. **New hires don't know how to document approved data references.** It's the most common training issue. Mechanics with prior experience from other shops have habits — bad habits, usually — around documentation. Retraining them is manual.
5. **RSM changes have no distribution confirmation workflow.** When she revises the RSM, she emails the PDF to everyone and asks them to reply confirming receipt. About 60% reply. The other 40% she has to chase.

---

## What She Wants from Software

Direct quotes from pre-interview notes:

- *"I want task cards to have a structured approved data reference field — not a free-text notes field. Part number, document type (AMM/SRM/IPC/etc.), chapter-section-subject, revision number. All required. If you don't fill it in, you can't sign off the step."*
- *"I want the system to know which revision of which manual is current, and flag when a task card references a revision that's been superseded."*
- *"ADs should live in the same system as work orders. When I open a work order for a Cirrus SR22, the system should show me every applicable AD and whether it's been addressed. Not a separate spreadsheet. The same system."*
- *"When I update the RSM and publish a new revision, I want confirmation from every mechanic in the system — a required read-and-acknowledge that they can't dismiss without reading the affected sections."*

---

*Interviewed by Nadia Solis. UX observation: Finn Calloway.*
