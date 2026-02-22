# Athelon Phase 5 — Requirements Synthesis

**Document:** MVP Embedded-Team Requirements Synthesis  
**Authors:** Nadia Solis (PM) · Rafael Mendoza (Tech Lead)  
**Date:** 2026-02-22  
**Distribution:** Athelon Engineering Team, Executive Sponsors  
**Status:** Working document — this drives MVP scope decisions

---

> A note on what this document is. Rafael and I spent three weeks embedded at five real
> Part 145 repair stations. We met eleven people across nine roles. What follows is what
> they told us, what it means, and what we're going to build because of it. This is not
> a polished market research summary. This is the memo I'd write to myself if I were
> trying to avoid shipping something these people would laugh at.
>
> — *Nadia Solis*

---

## Part 1: The Team We Met

### Carla Ostrowski — Director of Maintenance, Central States Aviation Services, Columbus OH

Carla is 30 years post-A&P and has been a DOM since 2010. She runs a 28-person Part 145
turbine shop, holds an IA, and knows the Columbus FSDO staff by name. Her operative
question for any MRO system: *if a principal maintenance inspector walks in tomorrow
with a subpoena and pulls every record on a specific tail number, does what the system
produced stand on its own without me in the room to explain it?* She came to us because
Central States' current system is held together by institutional memory and one office
manager. She is not here to validate us — she is here to find out whether we'd survive
her audit.

What surprised me: she doesn't want paper. She's been trying to get away from paper for
six years. She just hasn't found a system she trusts enough. When she said *'the
defensible path has to be the default path, not the configured path'* — that Post-it
note has been on my monitor for three weeks. If the defensible path requires a power
user to configure it, it is already a compliance liability.

### Renata Solís — Quality Control Manager, TriState Aviation Services, Wichita KS

Renata is 24 years in aviation, QCM for nine years, IA holder for 14. Her organizational
independence from the DOM is regulatory, not political, and she has exercised it twice
with real professional courage. She has never had a finding against a return-to-service
she authorized. She told me this exactly once, at the end of our first meeting, without
emphasis, and then stood up. What surprised me: I expected her to lead with process
requirements. She led with architecture — her first question was whether discrepancy
records and task card records were the same data model record, or two separate records
joined by a linkage field.

She also, almost in passing, said she maintains eleven manual workarounds for things her
current software doesn't do. Every item on that list is a product requirement. The one
that haunted me most: she exports MRO data to Excel weekly and emails it to herself as a
compliance backup because she doesn't trust the vendor to still be in business when she
needs those records. We need to earn something different from her than what every prior
vendor earned.

### Troy Weaver — Lead A&P Mechanic (Airframe), SunState Jet Center, Lakeland FL

Troy has 18 years on bizjets — Citations, Challengers, Gulfstreams. He told us the
mobile UX design principle in one sentence: *'Every decision should start from the
assumption that I'm standing in a hangar, I've got a flashlight in one hand, and I've
got maybe 30 seconds before I need to put the phone down and get back to work.'*

What surprised me: he doesn't hate software — his objections are specific. Sign-off
confirmation should be immediate and unambiguous. Previous task findings should surface
automatically. Reference links should open at the AMM section, not the document root.
These aren't hard things; nobody has built them correctly. He wants sign-off
confirmation in a form he could screenshot and send himself if he ever needed to prove
it happened. He's not sure he trusts us yet. That's fair. It's on us to earn it.

### Erik Holmberg — Lead A&P Mechanic (Powerplant), TriState Aviation Services, Wichita KS

Erik spent seven years doing teardown-and-rebuild at a dedicated turbine overhaul
facility. He doesn't think of a PT6A-34 as an engine — he thinks of it as a collection
of individually serialized components, each with a traceable life. He caught a 420-cycle
discrepancy on a compressor turbine disk in 2019 by doing arithmetic that didn't add up.
His LLP tracking spreadsheet has 847 rows and two USB backups. He knows exactly what it
says about the industry that the safety backstop for a critical airworthiness control
lives in an Excel file on a personal laptop.

What surprised me: I expected reluctance. Instead he brought a pocket notebook with four
bullet points. He said it directly: *'I would very much like to not be the single point
of failure for my shop's LLP tracking.'* He will discard the spreadsheet the day we ship
something more accurate. His minimum bar: the replacement must be more accurate than the
spreadsheet, not less.

### Dale Renfrew — IA Holder, Mesa Ridge Aviation, Grand Junction CO

Dale holds his IA biennial through Denver FSDO, does 40–55 annuals per year, and can
cite AC 120-78B by section from memory. He got his private certificate specifically to
know what it feels like to be the person at the other end of the maintenance record he's
about to sign. He thinks about that feeling every time. What surprised me: his objection
to current IA sign-off software is not that it's digital — it's that digital signing as
typically implemented removes the deliberate physical pause that catches errors.

He wants us to engineer that pause back: read the full certification statement with your
IA number populated, then authenticate. In that order. He will interrupt his sign-off
workflow mid-flow on day one of evaluation to see what the system says. He calls systems
that fail this test 'liability buckets.' We should not ship him a liability bucket.

### Dale Purcell — Avionics Technician / Lead Avionics Inspector, Desert Raptor Aviation, Henderson NV

Dale runs the avionics bench at a Part 145 shop in Henderson. He has caught two shops
doing avionics installs without valid STCs and keeps a personal binder of applicable
TSOs on his bench. His diagnostic workflow produces calibrated test equipment records,
bench test results, and installation documentation scattered across three disconnected
places: a paper log, a scanned PDF folder, and EBIS 5's free-text certification notes.

What surprised me: he manages five concurrent aircraft on a whiteboard that nobody else
can fully decode — that whiteboard is the real tracking tool. We need to build its
digital equivalent as a first-class view: a multi-aircraft task board organized around
what a single technician owns across multiple jobs. He also surfaced a requirement none
of us had encountered: calibrated test equipment data as structured required fields in
the avionics maintenance record, linked at the record level. We had no field for it. We
do now.

### Nathaniel Cordova — Powerplant Specialist / IA, Skymark Turbine Services, Phoenix AZ

Nate spent nine years in airline heavy MRO on CFM56-7Bs before moving to Part 145 bizjet
work. He has spent fifteen years watching Part 145 shops treat cycles as optional. They
are not optional. He brought a printed copy of our Phase 2 spec to the interview with
three sections highlighted and a margin note next to the cycle counter open item: *'This
is the question. Answer it before launch.'*

He is right. We have answered it: cycle counter required at aircraft creation for all
turbine aircraft; absence blocks LLP installation. Launch blocker, not a Phase 3 item.
He also said: *'Most MRO systems are filing cabinets with a search bar.'* He told us
about 1,100 missing cycles on a turbine disk that almost returned to service past its
certified life — not for drama, but to show us what our data model choices look like.

### Renata Vasquez — Sheet Metal / Structural Technician, Gulf Coast Structural, Corpus Christi TX

Renata has prepared an estimated 310–340 Form 337s across a 21-year career in structural
repair. Her primary requirement: when a work order is classified as major repair, the
Form 337 reference number must be required before RTS authorization. Not warned.
Required. Blocking. She spent eight months at a shop with AvMaint Direct, which had no
concept of major versus minor repair, and kept a parallel paper log. She doesn't
describe that experience with bitterness — she describes it as evidence.

What surprised me: she already knew about our schema and had been told that form_337_ref
was backend-enforced. Her first reaction: *'Who enforces it? The database? The UI?
Because if the UI lets you submit without it, the schema requirement means nothing.'*
The database enforces it. The UI doesn't surface it until RTS fails. That gap is going
in the alpha requirements. She put it best: *'The architecture is right. The interface
has to catch up.'*

### Teresa Varga — Parts and Inventory Manager, Piedmont Air Services, Hickory NC

Teresa has 19 years in aviation parts operations. She caught a forged 8130-3 in 2021 by
looking up the Block 17 approval number and finding the releasing repair station had
been inactive for three years. She filed the SUP report within 24 hours. She is the
reason Piedmont's traceability holds up every FAA visit — and she does it with a color-
coded binder, an Excel shelf-life workbook, and a padlock on a quarantine cage, because
Corridor has no system-enforced equivalent of any of these.

What surprised me: the physical quarantine cage. There's a padlocked cage in that parts
room and the software has zero representation of it. A quarantined part in Corridor is a
status field anyone can ignore. If the system had a quarantine *location* that made
issuance structurally impossible, one entire category of compliance failure would be
eliminated. The padlock is a software requirement in disguise.

### Danny Osei — Work Order Coordinator / Customer Service, Trident Aviation Maintenance, Manassas VA

Danny bridges mechanics and customers. He holds no A&P certificate but can translate 'we
pulled the prop and the crank seal is weeping' into language a dentist can understand
without being wrong. He runs his operation from a personal whiteboard, a 47-row Word
document status sheet updated daily, and Corridor — three systems because none alone
gives him what he needs to answer a customer call in 30 seconds.

What surprised me: he showed us the Word document. 47 rows. Every open aircraft, current
status, parts pending, rough ETA. That document is the product we haven't built yet —
the customer-facing, human-readable status view. He wants it because ten of his thirty
daily calls are 'is my plane done yet?' calls. He told a story about telling a customer
the aircraft was ready based on Corridor's status — when it wasn't. The customer waited
90 minutes in the lobby and never came back. That customer is our product requirement.

### Rachel Kwon — Tech Publications and Training Manager, Summit Aerospace Services, Bend OR

Rachel is a nine-year A&P/IA who moved into a Tech Pubs and Training role that Summit
created because their shared-drive-of-PDFs approach was untenable. She audited the
shared drive her first month: eleven manuals not at current revision, including one case
where a mechanic had been referencing a superseded AMM section for an unknown period.
The work was correct; the documentation reference was wrong. She describes that as a
near-miss.

What surprised me: her frustration isn't about the tools — it's about the cultural gap
between 'we have a PDF of the manual' and 'we can prove which section of which revision
authorized this work.' Most mechanics she trains come from shops where the task card
says 'per AMM.' She teaches them that 'per AMM' is an abbreviation for 'I don't
remember.' She also raised the RSM distribution problem: she sends the revised RSM as a
PDF email and about 60% of mechanics reply. A required read-and-acknowledge in the
system solves this completely.

---

## Part 2: Top 10 Requirements by Frequency and Severity

Ranking: (a) number of team members who raised it independently, (b) severity if missing
— C = compliance gap, W = workflow blocker, N = nice-to-have.

---

### REQ-01 — Certificate Number on Every Signature, Hard-Required at Provisioning

**Raised by:** 7 of 11 — Carla, Renata Solís, Dale Renfrow, Dale Purcell, Nate Cordova, Renata Vasquez, Rachel Kwon | **Severity:** C — §43.9(a)(4), Part 65, AC 120-78B

Carla: 'A username is not a certificate number. An employee ID is not a certificate
number. The FAA does not care who jsmith is.' Dale Renfrow's requirement is sharper: the
IA number must be a separate field from the A&P number — he has rejected two vendors for
conflating them, as they are different documents issued under different FARs. Dale
Purcell: 'I want to see the aircraft N-number, the component P/N and S/N, the test
equipment references, and the work performed — all of it — before I put my certificate
number on it. If I can't see it, I'm signing blind.'

**[RAFAEL]:** Simple (data model, already in schema) / Moderate (enforcement chain).
Phase 4 enforces certificate number at completeStep and authorizeReturnToService. The
upstream gap: if a user can join an org and sign a task step before their certificate
number is confirmed, the enforcement is theatrical. Need a required cert-number gate in
Clerk onboarding, and iaCertNumber as a distinct indexed field separate from certNumber.
PDF export must surface both fields, correctly labeled. Two to three days once
onboarding sequence is settled.

---

### REQ-02 — RTS Hard-Block on All Open Conditions (No Warning Substitution)

**Raised by:** 6 of 11 — Carla, Renata Solís, Dale Renfrow, Teresa Varga, Renata Vasquez, Nate Cordova | **Severity:** C — Part 43, Part 145

Carla: 'Not warned. Blocked.' — she has a six-month FAA follow-up in her professional
history that traces to a warning icon nobody scrolled to. Renata Solís: 'The DOM must
not be able to override this gate without QCM co-authorization. If the gate can be
bypassed by someone above her in the production hierarchy, the gate is not a gate.'
Renata Vasquez: 'The RTS authorization button should be grayed out. Not in small print.
Not as a checkbox I can check without entering a number.' Hard-block conditions: any
unsigned task card step, any open discrepancy, parts-traceability gap, missing Form 337
on major repair, overdue AD, lapsed IA certification, RTS statement failing §43.9
minimum content.

**[RAFAEL]:** Complex for the full set, but the backend is mostly done. Phase 4
authorizeReturnToService enforces 9 preconditions atomically. Gaps: (1) Form 337 block
exists in the backend but is invisible until RTS fails — the work order must show block
conditions from the moment of major repair classification, not only at RTS attempt; (2)
QCM co-authorization for a DOM override doesn't exist in the permission model — requires
a new role-gate where DOM override triggers mandatory QCM PIN auth, with both actors
logged permanently. Design spike: 3–4 days.

---

### REQ-03 — Self-Contained Exported Records (Inspector-Readable Without Database Access)

**Raised by:** 5 of 11 — Carla, Dale Renfrow, Dale Purcell, Renata Solís, Renata Vasquez | **Severity:** C — §43.9, AC 43-9C

Carla's day-one test: create a work order, complete it, generate the maintenance
release, export to PDF, look at it as an FAA inspector would. She has walked out of two
vendor demos when this test failed. Her minimum: tail number, AMM section and revision,
each step with timestamp and signing certificate number, all discrepancies with
dispositions, all installed parts with P/N and S/N, maintenance release with IA cert
number and timestamp — all in the export, without database access. Dale Renfrow: 'The
specific regulatory language, in full, with my name and IA number already populated. I
read it. Then I sign.' Renata Solís tests her export monthly and has found three
discrepancies in four years.

**[RAFAEL]:** Complex. The most important gap from Phase 4. Must not slip to beta. The
data assembly mutation exists; the PDF rendering action does not. Need to: (1) choose a
PDF generation library — Convex action + @react-pdf/renderer is the leading candidate;
(2) define a §43.9-compliant template — Marcus reviews before implementation; (3) run
the export in CI on every deploy so a regression fails the build. Two to three weeks of
work.

---

### REQ-04 — Parts Receiving Non-Bypassable; Quarantine as System-Enforced Location

**Raised by:** 5 of 11 — Teresa Varga, Renata Solís, Erik Holmberg, Nate Cordova, Carla | **Severity:** C + Safety (suspect unapproved parts, LLP life tracking)

Teresa Varga: 'Structurally impossible to issue a quarantined part. Not a popup you
click through. Impossible. The mutation fails. The part doesn't appear in available
inventory.' On receiving bypass: 'A receiving but not inspected status completely
separate from available inventory — you receive it, it's in the system, it cannot be
issued until I complete inspection and sign off.' Renata Solís raised the same
requirement independently from the QCM perspective. Erik Holmberg: every incoming LLP
needs its 8130-3 data in structured, queryable fields before the part is available — not
a PDF in a folder.

**[RAFAEL]:** Moderate on receiving states; Complex on quarantine enforcement. Phase 4
has parts traceability backend with installPart guard G8. Gaps: (1) pending receiving
inspection state absent from schema — additive migration: receivingStatus enum with
installPart throwing on non-available status; (2) quarantine filtering must be at the
query layer, not just at installPart; (3) parts management UI is a Phase 4 P1 gap —
multi-week build.

---

### REQ-05 — LLP and Cycle Tracking Per Component Serial Number, Across Full Life History

**Raised by:** 5 of 11 — Erik Holmberg, Nate Cordova, Teresa Varga, Carla, Renata Solís | **Severity:** Safety-critical — turbine disk failure is the specific failure mechanism

Nate Cordova's margin note on the Phase 2 spec: 'This is the question. Answer it before
launch.' Absence of cycle data for a turbine aircraft must block LLP installation — a
block with a logged exception path, not a soft prompt. Erik Holmberg: 'I would very much
like to not be the single point of failure for my shop's LLP tracking.' Teresa Varga:
'Every LLP should show me: how many hours is it certified for, how many has it used in
its entire life, how many are left. Not the hours from this work order. The total. From
the 8130-3 forward.'

**[RAFAEL]:** Complex. Acknowledged Phase 4 gap. A turbine shop launch blocker. What we
can build: (1) cycle counter required at createAircraft for turbine aircraft — RQ-02,
formal Marcus determination; (2) accumulated hours and cycles per LLP serial number
through all installPart/removePart events, opening balance from 8130-3 Block 12 at
receiving; (3) LLP detail view surfacing certified life, opening balance, accumulated,
remaining; (4) proactive alerts at 80% and 90% of life limit via scheduled Convex
function. Cannot build: cross-shop history predating our system. Also need plausibility
checks on incoming cycle data — Nate's Scottsdale incident (1,100 missing cycles due to
a data migration error) is exactly the class of problem a plausibility guard catches.

---

### REQ-06 — Per-Signature Re-Authentication for IA Sign-Offs (No Session Persistence)

**Raised by:** 4 of 11 — Dale Renfrow, Carla, Renata Solís, Dale Purcell | **Severity:** C — AC 120-78B, legal defensibility of the electronic signature

Dale Renfrow: PIN required, not biometrics alone. Authentication per signature, not per
session. No 'remember this device for 30 days.' His reasoning: 'The wet signature is not
valuable because ink is permanent. It is valuable because it is a deliberate physical
act that cannot be performed accidentally or distractedly. A PIN can be entered
reflexively if the session is already open.' He wants the pause engineered back: the
certification statement — with regulatory language, aircraft N-number, and his IA number
— must be fully visible before he enters credentials. He reads it. Then he signs.

**[RAFAEL]:** Moderate — the mechanism exists, the policy needs enforcement specificity.
Phase 4 SignOffFlow implements confirm → PIN → submit with signatureAuthEvent consumed
atomically. Gap: Dale wants Clerk re-authentication per IA sign-off, not a PIN entry
against an existing in-app session. Jonas must clarify: if the current implementation
relies on an existing Clerk session, we need a forced Clerk re-authenticate() gate
specifically for IA actions. Marcus should draft the written AC 120-78B compliance
statement Dale requested before alpha ships.

---

### REQ-07 — Mechanic Qualification Check at Assignment, With Proactive Expiry Alerts

**Raised by:** 4 of 11 — Renata Solís, Carla, Rachel Kwon, Danny Osei (indirectly) | **Severity:** C — Part 65, Part 145 §145.151 and §145.155

Renata Solís spends 90 minutes every Monday morning on a manual qualification audit. She
caught a mechanic whose training date didn't match the training provider's portal — the
discrepancy shifted his recurrency window — and grounded the work order. 'A QCM who
hasn't needed to use their independent authority is either in an unusually well-run shop
or hasn't been looking closely enough.' Carla's competency and authorization matrix in
Excel covers every mechanic, every aircraft type, every expiry date — a two-hour
maintenance task on a rotating three-week cycle she hates and maintains because nothing
else does it.

**[RAFAEL]:** Moderate. completeStep already validates certificate ratings at sign-off
attempt. Gaps: (1) no proactive expiry alerts — we block reactively but don't warn 30 or
60 days ahead; need a scheduled Convex function querying certificates.expiryDate,
writing to notifications table, routed to QCM and the individual mechanic —
approximately one week; (2) assignment-time validation needed at createTaskCard or
assignTechnicianToCard — currently the block fires at sign-off, wasting floor time; (3)
Carla's full authorization matrix is a design spike — beta scope, but proactive alerts
must be in alpha.

---

### REQ-08 — Offline Handling Must Be Explicit, Per-Item, and Non-Lossy

**Raised by:** 4 of 11 — Troy Weaver, Carla, Renata Solís, Dale Renfrow | **Severity:** C + W

Troy Weaver: 'I want to see 5 signatures queued, syncing now — and then I want to see
them confirm one by one. Not sync complete as a single message. If step 39 had a problem
and the others went through, I need to know that specifically.' Carla on the Skyline
incident: a mechanic signed the same step twice because the first signature went pending
without telling him. Both appeared when connectivity restored. Rule: if a signature is
pending, the user must know. If it failed, the user must know immediately. Silent loss
of a maintenance record entry is not recoverable. Dale Renfrow will deliberately
interrupt his sign-off workflow mid-flow on day one of evaluation.

**[RAFAEL]:** Complex. The biggest remaining infrastructure gap, and the one we must be
honest about with the alpha shop. Phase 4 called offline mode a P0 gap. We have no
service worker, no IndexedDB sync, no conflict resolution. We are not shipping full
offline mode for alpha — the alpha shop has WiFi. But we must ship before alpha: (1) a
persistent connectivity indicator in the mobile UI, always visible; (2) fast-fail
behavior on sign-off mutations when offline — if the Convex call cannot be confirmed
within 3 seconds, surface an unambiguous error: This signature was NOT recorded. No
pending state, no spinner; (3) user-facing documentation describing what to do when a
sign-off fails mid-flow. Full offline queue with per-item sync confirmation is beta
scope — but the design must be finalized before alpha ships.

---

### REQ-09 — Structured Approved Data References (Section/Revision Level, Not Freeform Text)

**Raised by:** 5 of 11 — Rachel Kwon, Troy Weaver, Dale Renfrow, Renata Vasquez, Dale Purcell | **Severity:** C — §43.9(a)(2), AC 43-9C Section 6

Rachel Kwon: 'I want task cards to have a structured approved data reference field — not
a free-text notes field. Document type, chapter-section-subject, revision number. All
required. If you don't fill it in, you can't sign off the step.' Troy Weaver: 'I want
the task card to link to the specific section — AMM 53-10-01, paragraph 4. When I tap
the reference, it opens there. Not page 1 of a 600-page PDF.' Dale Renfrow will not
certify text he has not read; any system that generates and commits record language in a
single step is rejected. Renata Vasquez needs SRM references at repair level: manual,
revision, chapter, section, subject, figure. Dale Purcell needs TSO citation fields.

**[RAFAEL]:** Moderate for structured fields; Complex for live revision currency and
document linking. Current approvedDataReference is freeform text. For alpha: replace
with a structured object {documentType: AMM|SRM|IPC|CMM|AD|SB|TSO, documentId, revision,
chapter, section, subject}, add as a required field on task card steps (not only
maintenance records), validate at sign-off that documentType, documentId, and revision
are populated. Schema change requires a migration plan for existing freeform data. For
beta: live document linking requires Jeppesen or equivalent API integration — a separate
multi-week project.

---

### REQ-10 — Real-Time Status Visibility, Customer-Facing Portal, and AOG as a System State

**Raised by:** 3 direct (Danny Osei, Dale Purcell, Rachel Kwon), operationally affects all roles | **Severity:** W (coordinator role) + competitive differentiator against Corridor

Danny Osei: 'When a mechanic signs off a task step, I want to see it. I don't want to
refresh. I want my screen to update.' He runs coordination from a Word document and a
whiteboard because Corridor has zero real-time floor visibility. His customer-facing
status requirement: seven human-readable stages (Awaiting Aircraft Arrival through Ready
for Pickup) completely distinct from internal technical states. Two separate status
models for the same work order. On AOG: 'AOG as a system state, not just a label. When a
work order goes AOG, it should be visible everywhere — top of every queue, elapsed-time
counter, nothing else is normal.'

**[RAFAEL]:** Simple for real-time (Convex reactive queries are architectural). Moderate
for portal and AOG. Real-time updates are a structural advantage of our Convex stack —
any UI component subscribed to a work order query re-renders automatically when
underlying data changes. This is essentially free once we wire the stubs and is the most
visible differentiator against Corridor. Customer portal: read-only Convex query behind
a tokenized URL — approximately one week of work. AOG system state: add aogDeclaredAt to
work order schema, update all role-specific list queries to sort by it first, add
declareAog mutation with audit event. All three sub-requirements should be in alpha.

---

## Part 3: Unexpected Findings

*Things the spec work alone didn't surface. What real users told us that the engineers missed.*

**Finding 1 — Avionics test equipment traceability is an invisible compliance requirement nobody built for.**
Dale Purcell's bench test records are orphaned from work orders. The Aeroflex 2050T, the
Barfield pitot-static test set — their calibration certificate dates must appear in the
maintenance record for any test they were used in, per applicable TSOs. No MRO system
Dale has used has a structured field for this. We had not thought about it. Needs: test
equipment P/N, S/N, calibration date, and calibration expiry, linked at the record level
(not the work order level). This affects every avionics shop we onboard.

**Finding 2 — The multi-aircraft task board is a first-class product need, not a reporting variant.**
Dale Purcell manages five concurrent aircraft on a whiteboard nobody else can fully
decode — that whiteboard is the real tracking tool. We designed everything around the
single-aircraft work order view. We did not design a view that shows one technician's
open tasks across all their active aircraft simultaneously. Danny Osei has the same gap
from the coordinator side. This view doesn't exist in Corridor, EBIS 5, or any system
our embedded team uses. Build in beta. Design now — show Dale Purcell a wireframe and
tell him it's coming.

**Finding 3 — Silent text truncation is an active compliance risk in production MRO software.**
Renata Solís described a case at a consulting engagement: a free-text field with an
undocumented character limit accepted input and displayed it correctly in the UI, but
silently dropped trailing content in the stored record. Seventeen closed work orders had
truncated corrective action narratives with no error ever surfaced. We have free-text
fields in our schema. We need to: (a) define and document all character limits, (b)
enforce with visible in-field counters, (c) warn before the limit — not truncate after.

**Finding 4 — The Form 337 requirement should surface at major repair classification, not at RTS failure.**
Renata Vasquez identified a UX gap we hadn't mapped: the Form 337 enforcement fires at
RTS but from the moment of major repair classification, the UI shows nothing different.
A mechanic who classifies a job as major repair, completes work over several days, and
hits a mysterious RTS block has no idea why. The work order card must show '337 Ref:
PENDING' from the moment of major repair classification. The RTS block should confirm a
requirement the user understood from day one, not introduce it as a surprise.

**Finding 5 — The coordinator's pre-close review is entirely manual and entirely automatable.**
Danny Osei spends 15–20 minutes manually reviewing every work order before billing —
checking for unsigned steps, parts documentation gaps, and unauthorized discrepancies —
because nothing in Corridor checks for him. We have all of this data. The automated pre-
close checklist is a feature every shop coordinator will understand within five minutes
of a demo because it is exactly the manual review they do now, done instantly.

**Finding 6 — The IA should never see their own name as a public countdown on a shared dashboard.**
Dale Renfrow made this quietly and once: systems that display 'IA sign-off pending —
Dale Renfrow' as a visible named countdown create production pressure on the return-to-
service decision. That decision is a legal certification of airworthiness, not a queue
item to clear on a production schedule. We will not build a public 'IA pending' badge
with the IA's name attached. The IA's view of pending sign-offs is private to the IA and
DOM.

**Finding 7 — Customer discrepancy authorization is done on sticky notes and hope.**
Danny Osei tracks verbal authorizations in free-text work order notes and chases written
confirmation by email for days. Nothing prevents a mechanic from proceeding without
documented authorization. We need: mechanic documents discrepancy → system generates
authorization request via email with click-to-approve → work order enters authorization-
pending state → customer clicks → authorization event logged with timestamp and identity
→ work order advances. For Part 91 aircraft, this also protects the shop from post-
service liability disputes.

**Finding 8 — RSM revision distribution has no confirmation mechanism beyond email and hope.**
Rachel Kwon sends the revised Repair Station Manual as a PDF email and about 60% of
mechanics reply. She chases the other 40% every cycle. This manual governs how the shop
operates under its Part 145 certificate. A required read-and-acknowledge inside the
system — surfaced when a mechanic opens their queue after an RSM update, blocking new
work until they acknowledge — solves this compliance gap completely and costs almost
nothing to build.

---

## Part 4: Requirements That Conflict

**Conflict — Hard Block vs. Supervised Override for Out-of-Tolerance Conditions**
Carla wants every compliance gate to be an unconditional hard block — she is allergic to
warning icons because one at Skyline cost her six months of FAA follow-up. Nate Cordova
and Erik Holmberg acknowledge that hard blocks will trigger on legitimate edge cases: an
LLP with a cycle count lower than expected due to a manufacturer data correction, a
shelf-life part the IA has AMM authorization to install. If every edge case requires a
phone call before the system will allow progress, real shops will route around the
system.

*Resolution:* Marcus's Phase 3 tiered approach. Unconditional hard blocks for LLPs — no
override argument accepted. Supervised, permanently logged override for other compliance
gates, requiring A&P credentials, a documented reason, and a permanent audit entry. The
override must never be frictionless.

**Conflict — Pre-Population vs. Explicit Certification in Sign-Off Flows**
Renata Solís wants the system to pre-populate the certificate rating checkbox from the
task type — a reasonable UX convenience. Dale Renfrow takes a harder position: any field
the system fills in and commits without him reading it could produce a record that says
something he didn't specifically certify. 'If I can't change it before it's committed,
I'm not signing it.'

*Resolution:* Marcus's RQ-05: the system may pre-populate any field as a convenience
starting point, but the technician must touch the control to confirm. A pre-populated
value is never silently accepted. All auto-generated fields in the sign-off summary must
be editable before authentication. Design standard for all sign-off flows without
exception.

**Conflict — Customer Transparency vs. Shop Operational Sensitivity**
Danny Osei wants maximum customer visibility — a portal showing real-time task
completion, parts status, and estimated dates. Carla Ostrowski and Renata Solís are
concerned about uncontrolled external visibility: if a customer sees their aircraft sat
untouched for two days after intake, that creates service relationship problems
unrelated to maintenance quality.

*Resolution:* The portal will exist because Danny's need and the competitive gap against
Corridor are both real. But customer-visible status must be explicitly curated by the
coordinator — not automatically mirrored from internal technical states. Internal status
and customer-facing status are separate fields. The coordinator controls what customers
see and when. Danny said it himself. The shop controls the narrative. The portal serves
the customer relationship. These two things coexist.

---

## Part 5: Alpha Scope vs. Beta Scope

### Must Be in Alpha to Be Taken Seriously

If the alpha is missing any of the following, the DOM will use us in parallel with paper
and call it a pilot. We will not get honest feedback.

1. **Certificate number hard-required at provisioning; IA number as a distinct field.** Dale Renfrow checks the stored record for his IA number on day one. If it's absent or conflated with his A&P number, the evaluation ends.
2. **RTS block conditions visible in the UI at work order open — not revealed at RTS failure.** Renata Vasquez's Form 337 gap is the poster case: major repair classification must immediately surface the 337 reference status on the work order card.
3. **Sign-off confirmation immediate, unambiguous, and per-item.** Troy Weaver's 30-second rule. This is the most damaging failure mode for floor adoption and the hardest trust to rebuild once lost.
4. **Offline detection with honest, immediate status communication.** Not full offline mode — the alpha shop has WiFi. If connectivity drops during a sign-off, the system must say exactly what happened. Dale Renfrow will deliberately trigger this.
5. **Parts quarantine as a system-enforced location state.** Teresa Varga's padlock must become a system control. Quarantined parts do not appear in search results. The mutation blocks. Non-negotiable.
6. **LLP life accumulation from 8130-3 forward; cycle counter required for turbine aircraft.** Nate Cordova's hard launch blocker. If we cannot verify cycle status for a turbine LLP, we are not a turbine MRO system.
7. **Maintenance record creation UI — full §43.9 entry, not only task card sign-off.** Phase 4 identified this as a critical gap. The mutation exists. The UI doesn't. Mechanics need standalone entries for corrective actions and squawk resolutions.
8. **Exported records pass Carla's day-one PDF test.** She will run it before the pilot begins. If it fails, the pilot is over. Build the PDF export, test it against Marcus's checklist, run it in CI.
9. **Automated pre-close checklist.** Danny Osei's manual 15-minute review automated at work order close. Every shop coordinator will understand the value in the first five minutes of use.
10. **Real-time status updates and AOG as a system state.** Structurally free on our Convex stack. Immediately visible as a differentiator. Ship it in alpha.

### Can Wait for Beta Without Losing Credibility

1. Full offline mode with per-item sync queue. Alpha shop has WiFi. Defer with a design, not a promise. Design must be finalized before alpha ships.
2. Live document linking (tap to open at specific AMM section). Requires Jeppesen or equivalent API integration. The structured reference field is alpha.
3. Customer portal. Design tension between Danny, Carla, and Renata must be resolved first. Beta — shown as a wireframe in the alpha demo.
4. Multi-aircraft task board view for specialists. A new UI mode requiring design. Explicitly on the beta roadmap — not 'someday.'
5. Automated revision currency checking. Requires manual library integration. Beta, scoped separately.
6. QCM co-authorization for DOM override of RTS gate. Design spike needed. Alpha pilot DOM documents overrides manually in the interim.
7. RSM read-and-acknowledge workflow. Real compliance gap. Not alpha-blocking.
8. Internal audit analytics view. Renata Solís's QCM pattern-detection requirements. Q3 feature, not Phase 5 MVP.
9. Ferry permit AD exception path. Marcus's Phase 3 high-risk gap. Must be designed before the ferryWO work order type is enabled at any shop.

---

## Part 6: Rafael's Technical Implications

*For each top 10 requirement: implementation complexity and blocker dependencies.*

| # | Requirement | Complexity | Blocker Dependency |
|---|---|---|---|
| 1 | Certificate number hard-required; IA number distinct field | Simple (data) / Moderate (enforcement) | Clerk onboarding gate; schema iaCertNumber; PDF export surfaces both |
| 2 | RTS hard-block + QCM co-auth for override | Complex | Co-auth design spike; UI surfaces block state at classification time |
| 3 | Self-contained exported records (PDF) | Complex | PDF library + §43.9 template; Marcus review; CI regression test on export |
| 4 | Receiving non-bypassable; quarantine as enforced location | Moderate | Parts management UI (Phase 4 P1); additive schema for receivingStatus; quarantine filter at query layer |
| 5 | LLP/cycle tracking per S/N across full life | Complex | Cycle counter at turbine aircraft creation; plausibility checks; proactive alerts |
| 6 | Per-signature IA re-auth (PIN, no session carry) | Moderate | Jonas: Clerk re-auth vs. in-system PIN; Marcus: written AC 120-78B statement |
| 7 | Qualification gate at assignment + proactive expiry alerts | Moderate | Scheduled Convex function for alerts; assignment-time validation hook |
| 8 | Offline: explicit, per-item, non-lossy | Complex | Design finalized before alpha; alpha minimum: connectivity indicator + fast-fail |
| 9 | Structured approved data references | Moderate | Schema migration + plan for existing freeform data; library integration is beta |
| 10 | Real-time status + AOG + customer portal | Simple (RT) / Moderate (portal + AOG) | AOG: schema aogDeclaredAt; portal: tokenized read-only query; RT: free via Convex |

---

## Closing Note from Nadia

Three weeks with this team changed how I understand what we're building.

We're not building better workflow software for repair stations. We're building the
system that stands between a mechanic's signature and an FAA enforcement action. Every
person we talked to has carried a compliance risk that their current software makes
harder to manage, not easier. Carla has a six-month FAA investigation in her
professional history that traces to a configuration gap in a software product. Dale
Renfrow checks his IA renewal date on a wall calendar, his phone, and a notebook in his
tool chest because he once came within twelve days of losing his authorization on a
technicality. Erik Holmberg has two USB backups of a spreadsheet that is the only thing
preventing his shop from losing legal traceability on a turbine disk. Renata Solís
emails herself a weekly MRO data export because she doesn't trust the vendor to still be
in business when she needs those records.

These are not edge cases. These are the normal conditions under which aviation
maintenance software operates in 2026. If we build something that adds friction to
compliance rather than removing it, we are not just shipping a bad product — we are
making those risks worse for people who are already working hard to manage them with
inadequate tools.

The good news: we are closer than any of them have seen before. Carla said the
architecture sounds like it was written by someone who has been through an FAA audit.
She meant it as the highest compliment she knows how to give. Dale Renfrow said if the
system earns his trust, he will say so in writing. That is an IA holder putting his
professional judgment on record. That is worth building for.

Let's earn it.

**— Nadia Solis, PM**  
*2026-02-22*

---

*Document approved for sprint planning use.*  
*Next: Prioritization session with Rafael, Devraj, Chloe — Friday.*  
*Bring the Phase 4 gate review gap list. These two documents together define the alpha build.*  
*Alpha scope items are the sprint input. Beta scope items need design owners assigned by end of sprint 1.*