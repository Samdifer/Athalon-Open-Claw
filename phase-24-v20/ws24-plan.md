# WS24 Plan — v2.0 Scope + Fourth Shop Pipeline
**Filed:** 2026-02-23T01:24:00Z  
**Owner:** Nadia Solis, Marcus Webb, Rosa Eaton  
**Phase:** 24 (ACTIVE)

---

## Part 1: v2.0 Scope — Gaps Toward Full Commercial Readiness

v1.2 is a complete, working product for Part 145 general aviation repair stations doing Part 91 and light Part 135 work. What follows is what Athelon still cannot do — and what it must do to serve a broader commercial market. Each gap is assessed for regulatory complexity, estimated sprint count, which current customer it directly unblocks, and whether it gates any other v2.0 feature.

---

### GAP 1: Multi-Shop / Multi-Org Support
**Regulatory Complexity:** Low  
**Estimated Sprints:** 3  
**Unblocks:** All three shops at scale; turbine shop (Scottsdale) for fleet rollout; any customer with >1 location  
**Prerequisite for:** GAP 2 (cert holder separation requires org-aware identity), GAP 4 (DER record linkage across orgs)

Currently, each Athelon installation is single-org. Clerk org switching is implemented at the auth layer but not surfaced in the product. Fleet-scale operators — a King Air shop with multiple line stations, or a charter operator with two maintenance bases — cannot manage records across locations in a single Athelon instance. This is a go-to-market ceiling.

What's needed: Clerk org switching wired to data tenancy. A user with admin role can belong to multiple orgs and switch context without re-auth. Work orders, aircraft, and personnel records are org-scoped. Reports and dashboards aggregate within org. Shared aircraft records (tail numbers that appear at multiple stations) require explicit sharing policy.

Marcus note: No regulatory complexity here — the FAA doesn't care what software architecture a repair station uses for multi-location record management, as long as each record is attributable and retainable per §43.9.

---

### GAP 2: Full Part 135 Compliance — Pilot Portal + MEL Integration
**Regulatory Complexity:** High  
**Estimated Sprints:** 4  
**Unblocks:** Priya Sharma (High Desert Charter Services); turbine shop if they do any charter or air taxi work  
**Prerequisite for:** Nothing upstream; this is terminal

v1.2 satisfies §135.65 recording. It does not satisfy §135.65(b) (pilot access to records before flight), and it has no MEL tracking.

**Pilot Access Portal:** A read-only portal scoped to the Part 135 certificate holder. The assigned pilot in command should be able to log in, see the work orders for their assigned aircraft, and access the maintenance irregularity log before flight. This is not a nice-to-have — it is a regulatory requirement for Part 135 operators. Authentication model: Clerk user with a `pilot_readonly` role, org-scoped to the certificate holder's org (requires GAP 1 first).

**MEL Integration (§135.179):** Minimum Equipment List tracking. When a repair station defers an item per the MEL, the deferral must be documented, time-limited, and linked to the applicable MEL item and revision. Athelon has no MEL record concept. This is a separate data model from work orders and requires: MEL document ingestion (PDF → structured item list), deferral record creation linked to a work order discrepancy, deferral expiry tracking with alerts, and DOM oversight dashboard showing open deferrals by aircraft.

**Certificate Holder Record Separation:** As Part 135 shops add IAs, the cert holder's records must be distinguishable from individual IA records. Schema modification to `pilotNotificationLog` and related tables; UI label changes; DOM-scoped queries. Simpler than the rest — can be delivered as v1.3 before the full Part 135 portal lands.

Marcus: Full Part 135 compliance is a meaningful compliance surface. The pilot portal alone is 3 CFR sections with direct enforcement history in FSDO audits. Do not scope this as a v1.3 patch. Design it properly.

---

### GAP 3: Ferry Permit AD Exception Path
**Regulatory Complexity:** Critical  
**Estimated Sprints:** 2 (design + review) before `ferryWO` type is enabled — build is separate  
**Unblocks:** Any operator needing to ferry an aircraft in an airworthy-for-flight-to-destination configuration (not fully airworthy per all applicable ADs)  
**Prerequisite for:** `ferryWO` work order type (which must NOT be enabled until this is designed)

Marcus flagged this explicitly and his flag stands as a hard gate.

A ferry permit (FAA Form 8130-6) allows an aircraft to be flown to a destination for maintenance when it is not in full compliance with all ADs — specifically when an AD has no alternative method of compliance for a ferry flight. The repair station's role in the ferry permit process is to document the specific ADs from which deviation is requested, the basis for the exception, the duration of the flight authorization, and the maintenance to be performed on arrival.

The risk: Athelon's AD compliance module currently treats all open ADs as compliance blockers. If we enable ferry work orders without an exception path designed into the AD module, a user could close a ferry WO in a way that creates a false compliance record — one that shows the AD as satisfied when the aircraft was actually flown in deviation from it, under a ferry permit. That is a falsification risk, not an operational edge case.

**What must be designed before `ferryWO` is enabled:**
1. Ferry permit record linked to a work order, capturing the specific ADs in deviation
2. AD compliance module exception state: `DEFERRED_FERRY_PERMIT` — distinct from `COMPLIANT` and `NON-COMPLIANT`
3. Automatic reversion of exception state when ferry WO is closed without an arrival maintenance WO linked
4. Marcus sign-off on the exception path language before any implementation begins
5. Legal review of liability language in the UI (the repair station is not issuing the ferry permit — the FSDO is; Athelon should be a record of the request and authorization, not the authorization itself)

This is not a sprint item. It is a design-first-then-build item. Two design sprints (architecture + Marcus/Rosa review), then a build sprint.

---

### GAP 4: DER / Engineering Order Record Linkage
**Regulatory Complexity:** Medium  
**Estimated Sprints:** 2  
**Unblocks:** Specialty shops (avionics, structural modification, supplemental type certificate work); future DER-affiliated customers  
**Prerequisite for:** Nothing upstream

Designated Engineering Representatives and their engineering orders are a significant part of major repair documentation. A Form 337 in Athelon references the DER but does not link to the engineering order as a live document. For shops doing supplemental type certificate work, avionics modifications, or structural repairs requiring DER signoff, the ability to attach an EO number, DER credential reference, and EO document (PDF) directly to the Form 337 record closes a documentation gap that FSDO inspectors look for in major repair audits.

What's needed: `engineeringOrders` table, linked to `form337Records`; EO number + DER cert reference fields; PDF attachment (using existing photo attachment infra); DER lookup by cert number (manual, not API-integrated in v2.0). No regulatory complexity risk — this is documentation structure, not a new compliance surface.

Marcus: DER linkage is straightforward. The complexity is in the UI — making the Form 337 / EO linkage clear without overwhelming the general shop that never touches DER work.

---

### GAP 5: Automated RSM Revision Currency Checking
**Regulatory Complexity:** Medium  
**Estimated Sprints:** 3 (requires external API integration — most of the sprint is integration work, not product logic)  
**Unblocks:** Rachel Kwon's core request; any shop relying on RSM-based approved data references  
**Prerequisite for:** Nothing upstream; but this significantly strengthens GAP 6 (live document linking)

Currently, RSM (Revision Service Manual) acknowledgment is a read-and-sign workflow. A technician signs that they reviewed the current revision of the referenced manual. Athelon does not verify that the revision they signed is still current. Rachel Kwon flagged this: the system should know when a manual has been superseded and prompt a re-acknowledgment before work continues.

This requires an API integration with a library or publisher that provides document currency information. Options: Jeppesen document library (subscription-based, most comprehensive), OEM direct feeds (aircraft-specific, high reliability, low coverage), or manual library API integration where the shop uploads revision notices and Athelon tracks the history.

For v2.0, the recommended path is manual library API integration — the shop's Tech Pubs coordinator (Rachel's role) imports revision notices; Athelon tracks the revision history and flags RSM records signed against a now-superseded revision. Fully automated OEM/Jeppesen API integration is v3.0 scope.

Marcus: RSM revision currency is a real audit finding. The §91.409 requirement that maintenance be performed per current approved data is not hypothetical. Rachel knows what she's asking for. Build it.

---

### GAP 6: Live Document Linking (Tap → AMM Section / Jeppesen API)
**Regulatory Complexity:** Low  
**Estimated Sprints:** 4 (Jeppesen API integration is a significant contract and technical lift)  
**Unblocks:** All shops doing structured task-card work against AMM references; turbine shop (King Air/turboprop AMM is heavily structured)  
**Prerequisite for:** Nothing upstream; benefits from GAP 5 (once revision currency is tracked, live links validate against current revision)

Currently, Athelon work orders reference AMM sections by text string (e.g., "AMM 72-00-00, Removal and Installation"). The technician must look up the actual document in a separate system. Live document linking would allow a tap on the task card AMM reference to open the specific AMM section in-context — either via a Jeppesen API subscription or a shop-hosted document server.

The Jeppesen API path is the correct long-term approach for commercial readiness. It requires a partnership agreement and API contract, which is a business development item as much as a technical one. For v2.0, the foundation is: a document link data model on task cards and work orders, a resolver that can open a linked document URL (Jeppesen or otherwise), and a pilot implementation with one or two OEM document sources to validate the pattern. Full Jeppesen API integration is a partnership sprint, not just a build sprint.

Marcus: Low regulatory complexity on the feature itself — this is convenience and safety, not a new compliance surface. High business value for the turbine shop inbound contacts, who operate against highly structured AMMs.

---

### v2.0 Scope Summary Table

| Gap | Regulatory Complexity | Sprints | Unblocks | Gates Other Features |
|---|---|---|---|---|
| 1. Multi-shop / multi-org | Low | 3 | All shops at scale | GAP 2, GAP 4 |
| 2. Full Part 135 compliance | High | 4 | Priya + charter ops | — |
| 3. Ferry permit AD exception | Critical | 2 (design) + build | Ferry operators | `ferryWO` type |
| 4. DER / EO record linkage | Medium | 2 | Specialty shops | — |
| 5. Automated RSM currency | Medium | 3 | Rachel Kwon / tech pubs | GAP 6 (strengthens) |
| 6. Live document linking | Low | 4 | All structured task-card shops | — |

Recommended delivery order: GAP 3 design first (unblocks a future type safely); GAP 1 second (unblocks scale and GAP 2); GAP 2 third (highest regulatory exposure); GAPs 4, 5, 6 in parallel after GAP 1 lands.

---

## Part 2: Fourth Shop — Inbound Pipeline

Nadia now has three unsolicited inbound contacts. These arrived through word of mouth — dispatches spreading at seminars and industry events. None of them were pitched. All three reached out.

---

### Prospect A: Turbine-Only Shop — Scottsdale, AZ
**DOM email inbound:** After reading Nate Cordova's mention in Dispatch-21  
**Fleet:** King Air and turboprop  
**Personnel:** 12 certificated  
**Primary request:** LLP dashboard + AD compliance for turbine ADs

**Fit with current Athelon:**
The LLP dashboard is live and was built with turbine work specifically in mind (Nate Cordova's SME input, Erik Holmberg's powerplant perspective). King Air and turboprop LLP tracking maps cleanly to the current life accumulation engine. AD compliance module handles turbine ADs — the AD type is aircraft-specific, not powerplant-type-specific, so no schema change is needed.

**What's missing:**
- Multi-org support (GAP 1) if they want fleet management across any future line stations
- Live AMM/IPC linking (GAP 6) — turbine AMMs are heavily structured and deep; tap-to-section would be high value here
- DER linkage (GAP 4) if they do STC work on the turboprop fleet
- No ferry permit AD exception needed for this shop type (turbine LLPs typically ground the aircraft, no ferry path)

**Recommended onboarding approach:** Standard onboarding. This shop fits the current product better than any other inbound — their primary requests (LLP dashboard, turbine AD compliance) are fully shipped. Rosa Eaton should run the onboarding, with a specific LLP baseline audit on first day per the High Desert playbook. Pre-load FAA registration data for the fleet before Day 1.

**Marcus's regulatory flag:** None for onboarding. Turbine ADs and LLP tracking are within scope. If they ask about ferry permits or DER records, defer honestly (on roadmap, not shipped).

---

### Prospect B: Helicopter MRO — Fort Worth, TX
**Fleet:** Robinson and Bell  
**Personnel:** 8 certificated  
**Regulatory profile:** Part 27 (Robinson R22/R44, Bell 206/407) — rotorcraft, not fixed-wing

**Fit with current Athelon:**
Work order structure, task card execution, parts traceability, and RTS flow are aircraft-agnostic — these will work for helicopters without modification. The DOM dashboard, personnel compliance, and photo attachments are also directly applicable.

**What's missing / what Marcus needs to assess:**

Part 27 airworthiness standards (rotorcraft) differ from Part 23 (light fixed-wing) in several important ways that affect Athelon's compliance surfaces:

1. **Robinson Airworthiness Limitation Section (ALS):** Robinson's mandatory replacement times and service life limits are enforced via ALS, not traditional ADs. The LLP dashboard concept applies but the data structure for Robinson components is different — helicopter ALS items include dynamic components (rotor blades, main rotor gearbox, tail rotor gearbox, engine, governor) with component-specific replacement times that are sometimes stated in hours, sometimes in calendar time, sometimes in both. The current LLP engine handles this (it's hours/cycles/date-based), but the field mapping for Robinson components needs to be validated by a Robinson-qualified IA before UAT.

2. **Bell Service Instructions vs. ADs:** Bell helicopters have a complex network of mandatory service instructions that have AD-equivalence through incorporation by reference. These are not always filed as traditional ADs in the FAA AD database. The AD compliance module may miss mandatory Bell maintenance items that are not in the standard AD feed.

3. **Special Airworthiness Requirements (Part 27 §27.XX vs. Part 23 §23.XX):** Work order templates referencing regulatory sections will need rotorcraft-specific citations. This is a data/configuration problem, not a schema problem.

**Marcus's assessment:** Part 27 helicopter MRO is a different regulatory world in several specific ways. The product will work operationally, but the AD/ALS compliance surfaces require expert validation before this shop relies on Athelon for airworthiness decisions. Recommend: onboard with explicit scope boundary (administrative WOs, task card execution, parts traceability) while a Robinson-qualified IA audits the ALS tracking and an aviation attorney reviews the Bell mandatory SI/AD mapping. Do not represent Athelon's AD compliance module as covering Part 27 helicopters until that audit is complete.

**Recommended onboarding approach:** Conditional — begin administrative onboarding, defer compliance-surface features pending Marcus's Part 27 audit. Rosa should interview the Fort Worth DOM before any demonstration to understand their specific fleet mix and compliance documentation practices.

---

### Prospect C: Corporate Flight Department — Chicago, IL
**Profile:** Part 91 only, in-house A&P, no Part 145 certificate  
**Customer type:** Fundamentally different — not a repair station

**Fit with current Athelon:**
Athelon was designed around the repair station model: work orders issued by a repair station, signed off by certificated IA mechanics, RTS authorized per §43.7, records structured for §43.9 compliance. A corporate flight department's A&P maintaining company aircraft under Part 91 rules has different record-keeping obligations — §91.409 (inspection program), §91.417 (maintenance records for private/business aircraft), and no repair station manual or RSM.

The operational workflow (task cards, parts tracking, LLP management) is directly applicable. The compliance surface is simpler: no QCM review required, no repair station authorization chain, no Form 337 major/minor classification under the same regulatory lens. The DOM compliance dashboard would need to reflect Part 91 certificate requirements rather than repair station certificate requirements.

What's missing or different:
- No Part 145 certificate = no repair station regulation applies; the product's repair station framework is overhead they don't need
- Inspection program tracking (§91.409) — annual vs. progressive inspection programs — is not currently in Athelon
- The customer portal concept doesn't apply (the "customer" is themselves)
- Multi-aircraft fleet tracking for non-commercial purposes has different nuance around LLP tracking (no Part 135/121 cycle rules, but owner/operator has separate obligations)

**Marcus's assessment:** This is a different product than what Athelon currently is. The overlap in workflow is real but the compliance framing is wrong for a Part 91 flight department. We can serve this customer but we should not market Athelon as a repair station compliance product to them — because they are not a repair station. If we onboard them, we should create a `part_91_flight_dept` org type with simplified compliance surfaces, and be explicit about what the product does not provide for their use case (no inspection program management, no AD compliance AD database integration for private aircraft ADs as opposed to repair station ADs).

**Recommended onboarding approach:** Deferred. This customer profile requires product configuration work before we can serve them honestly. Log the contact, maintain the relationship, revisit when multi-org and Part 91 flight dept persona are designed. Do not onboard on current product without significant scope boundary communication.

---

### Marcus's Priority Ranking: Which Shop to Onboard Next

**Priority 1: Turbine shop (Scottsdale AZ)**

Rationale: They already want the thing that's already built. LLP dashboard for King Air is exactly what the product does. Nate Cordova's name in the dispatch is the reason they reached out — the product's aviation credibility is doing the sales work. Onboarding will be clean, the SME validation is already done (turbine LLPs were designed with Nate and Erik), and a successful turbine shop deployment strengthens the product story for every future pitch to the King Air world. This is the closest possible thing to a guaranteed win.

**Priority 2: Helicopter MRO (Fort Worth TX)**

Rationale: Real market expansion, but requires Marcus's Part 27 audit first. The product works operationally. The compliance surfaces need expert validation. Onboard after the Scottsdale turbine shop is stable and after Marcus has run the Robinson ALS and Bell SI audit. Two to three months behind the turbine shop.

**Priority 3: Corporate flight department (Chicago IL)**

Rationale: Different product, not yet built. Maintain the relationship but do not onboard until the Part 91 flight department product persona is designed. This is a v2.0+ scope item.

---

## Part 3: Nadia's v2.0 Roadmap Letter

*To: Carla Ostrowski (Skyline Aviation Services), Bill Reardon (High Desert MRO), Priya Sharma (High Desert Charter Services)*  
*From: Nadia Solis*  
*Re: Where we're going next*  
*Date: 2026-03-09*

---

Hi all —

v1.2 just shipped. I want to tell you what's coming next, and I want to be honest about the timeline and the hard parts.

**What we're calling v2.0**

There are six things the product still can't do that it should be able to do. Some of them you've asked for directly. Some of them are gaps we've identified through watching you work.

The biggest one is full Part 135 compliance. Priya, the pilot notification log we shipped today satisfies the §135.65 recording requirement — you can log the notification, it's in the work order, it will survive an FSDO audit. What it does not do yet is give Jack a way to log in and see the record before flight. That's the other half of §135.65. It's also MEL tracking. These two features require significant architecture work that we haven't started yet. I'm not going to give you a ship date for them right now because I don't want to give you a date I'm not sure we can hit. What I can tell you is that they're at the top of the v2.0 list and we're scoping them now.

The second big thing is multi-location support. If any of you ever grow to a second station — or if you want to share an aircraft record with another shop — the current product doesn't handle that cleanly. Building it properly is three sprints of work. It's also a prerequisite for the Part 135 pilot portal (the pilot portal needs to know which cert holder's records the pilot is authorized to see). We'll build multi-location first.

The rest of v2.0 is: automated RSM revision currency checking (so Athelon knows when a manual you've signed against has been superseded), live document linking (tap on the task card reference, go directly to the AMM section), and DER/engineering order record linkage for shops doing STC or major repair work. These matter to specific shops more than others. If any of these are blocking something for you today, tell me.

**What the turbine shop and helicopter MRO mean for the product**

We have inbound contacts from a King Air shop in Scottsdale and a helicopter MRO in Fort Worth. I want to tell you what that means for Athelon, because you should know.

The King Air shop is a natural extension of what the product already does. LLP tracking for turbine engines is something the product was designed to handle, and this shop represents the first deployment in a fully turbine environment. It doesn't change what the product is — it validates it.

The helicopter MRO is different. Robinson and Bell operate under Part 27, not Part 23. The workflow is similar but the regulatory compliance surfaces — especially Robinson's Airworthiness Limitation Section and Bell's mandatory service instruction network — require expert validation before we can tell a helicopter shop that Athelon's compliance module covers their airworthiness decisions. Marcus is scoping that audit now. This is not "Athelon supports helicopters." It is "we are carefully figuring out what it would take to support helicopters correctly." If we do it, we'll do it the same way we've done everything else: SME-validated, compliance-reviewed, honest about the gaps.

**What I'm asking from you**

If something is missing from the product that affects your ability to do your job, tell me now. Don't wait for the roadmap. The features in v1.2 came from you asking for them by name. The best features in v2.0 will come the same way.

Nadia

---

*WS24 Plan filed. Phase 24 is active.*
