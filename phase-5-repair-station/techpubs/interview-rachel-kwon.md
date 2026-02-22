# Interview: Rachel Kwon — Tech Publications & Training Manager
**Interviewer:** Nadia Solis (Product Manager, Athelon)  
**Observer:** Finn Calloway (UX Designer, Athelon) — observing for workflow friction and UX pain points  
**Location:** Summit Aerospace Services, Bend OR — tech publications office  
**Date:** 2026-02-22  
**Duration:** 54 minutes  
**Session type:** Discovery interview — repair station operations staff, Phase 5

---

*[Rachel's office is small but unusually organized. One wall has a whiteboard with a list of aircraft types, their AMM revision numbers, and due dates for the next revision check. There's a paper binder on the desk labeled "Training Records — Current" and another labeled "Training Records — Archive." The monitor shows a Jeppesen Maintenance Data browser tab alongside Corridor. Finn notes immediately that Corridor and Jeppesen are completely separate applications with no visible connection between them.]*

---

**Nadia:** Let's start with the approved data question. When a mechanic at Summit does a task, how does the approved data reference end up in the maintenance record?

**Rachel:** Ideally? The mechanic pulls the correct manual, finds the right section, does the work, and then writes the reference in the task card notes field in Corridor. Document, revision, chapter, section. Every time.

In practice, a significant percentage of task cards come to me or to the DOM with "per AMM" and nothing else. Which AMM? Which revision? Which section? "Per AMM" is not an approved data reference. It's a placeholder. But Corridor doesn't require anything more specific, so that's what busy mechanics enter.

**Nadia:** What happens to those when an FAA inspector sees them?

**Rachel:** An experienced inspector will ask. "Per AMM — which section?" And then the mechanic either knows from memory, or they go find it, or they don't remember and we have a problem. The inspector can't verify the work was done per the right data if the reference isn't specific enough to look up. That's a discrepancy.

I wish the software would require a structured reference before a sign-off is accepted. Not free text. A structured field — document type, revision, chapter, section. Required to submit. If you don't fill it in, the step does not sign off. Full stop.

**Finn:** *[Required structured approved data reference field as a gate on step sign-off. High-priority UX enforcement point.]*

**Nadia:** What about the revision currency problem? How do you manage that today?

**Rachel:** Manually. I subscribe to manufacturer revision notifications. When I get one, I update our subscription in Jeppesen, and I check whether any current task cards or work orders reference the superseded section. That second part is entirely manual — I search task card notes in Corridor, which doesn't support any kind of sophisticated search, and I look for any reference to the old chapter number.

The problem is that Corridor has no idea what any manual reference *means*. It's just text in a field. There's nothing that says "this task card refers to AMM Chapter 32-10, Rev 9, and Chapter 32-10 was revised to Rev 10 last week." The connection doesn't exist.

What I want is a publications registry in the system — not the full text of the manuals, that's what Jeppesen is for — but a record of document type, document identifier, current revision, and effective date. When a mechanic references "AMM Rev 9, Ch 32-10," the system checks against the registry. If Rev 9 is not current, the system flags the reference. That would catch stale references before they become a discrepancy.

**Nadia:** How do you handle AD tracking currently?

**Rachel:** Excel spreadsheet. Every applicable AD for every aircraft type we service. Due dates, compliance status, next due, applicable work orders where we documented compliance. It works, but it is completely disconnected from Corridor. When an inspector asks me to show AD compliance for a specific aircraft, I pull the Excel, cross-reference the work order history in Corridor, and build the answer from two systems.

The AD compliance should be in the same system as the work orders. When I open a work order for a Piper Malibu, I should see all applicable ADs and whether they've been complied with, when, by whom, and on what work order. Not a separate spreadsheet. The same record.

**Nadia:** Tell me about training new mechanics. What does that look like?

**Rachel:** Every new hire goes through a three-day onboarding before they touch an aircraft. RSM on day one — that's the Repair Station Manual, it's our shop's bible, every procedure we follow. Day two is approved data access — how to use Jeppesen, how to find the right document, how to document the reference correctly. Day three is shadow work on an active work order with a senior mechanic.

The problem with RSM training specifically is that the RSM changes. When I revise it, I need everyone in the shop to read the affected sections and acknowledge they've seen the update. Right now I email the PDF and ask for a reply. I get about 60% response rate. The other 40% I chase individually.

I wish the software would handle that. New RSM revision goes in, system sends a notification to every active mechanic, they have to click through a read-and-acknowledge flow tied to their login. Not dismissible without reading the specified sections. I get a report showing who has confirmed and who hasn't. That replaces my chase list.

**Nadia:** Last question — what's the one thing that would change your daily job the most?

**Rachel:** The structured reference field on task steps. If every sign-off requires a specific, correct, verifiable approved data reference — document, revision, section — then the traceability problem mostly solves itself. Mechanics know they can't skip it. Records are consistently complete. Audits stop being archaeology.

Right now I spend real hours every month looking at task cards and asking "what did they actually use?" Because the software doesn't require them to say. That's not a hard problem. It's a decision someone made to make the system easier to use by not requiring the thing that makes the record defensible. That's the wrong trade.

*[Session ends. Rachel shows Nadia the AD compliance spreadsheet — 200+ rows across all aircraft types. Finn photographs it. It becomes the primary reference for AD tracking feature requirements.]*

---

## Product Requirements Captured — Rachel Kwon

| # | Requirement | Priority | Source Quote |
|---|---|---|---|
| PR-RK-01 | Task step sign-off must require a structured approved data reference: document type, document identifier, revision, chapter/section — not free-text; required field, not optional | Critical | *"Required to submit. If you don't fill it in, the step does not sign off."* |
| PR-RK-02 | Publications registry: a record of document type, identifier, and current revision; referenced from task cards; system flags stale revision references | High | *"Publications registry — document type, identifier, current revision, effective date"* |
| PR-RK-03 | AD compliance must live in the same system as work orders; per-aircraft AD list visible on work order open, with compliance status and reference work order | High | *"Same system, not a separate spreadsheet"* |
| PR-RK-04 | RSM revision distribution workflow: system-generated read-and-acknowledge flow for each revision; required per mechanic login; DOM gets completion report | High | *"Read-and-acknowledge tied to their login; report showing who confirmed and who hasn't"* |
| PR-RK-05 | Approved data reference field must support structured entry (not free text) with validation against the publications registry for revision currency | High | *"The connection doesn't exist [between the reference and whether it's current]"* |
| PR-RK-06 | Training record tracking: system-maintained training record per mechanic; RSM training, approved data access training, recurrency tracking | Medium | *"Replace my chase list"* |

---

*Interview conducted by Nadia Solis. UX observations by Finn Calloway.*  
*Document prepared 2026-02-22.*
