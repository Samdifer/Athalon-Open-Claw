# WS37-D — Network Protocol Governance Audit (Required-Step Overrides)
**Phase:** 37
**Status:** ✅ DONE
**Audit period:** 2026-10-01 through 2026-12-10 (71 days)
**Date filed:** 2026-12-13
**Owners:** Marcus Webb (Compliance Director) · Cilla Oduya (QA / Data Analysis)
**Scope:** All required-step override requests and approvals across all 9 Athelon shops
**Document type:** Governance Audit Report — Required-Step Override Behavior

---

## 1) Audit Purpose and Scope

As the Athelon protocol library scales — 9 shops, ~38 active protocols network-wide, required-step enforcement in active use — override requests are the leading indicator of governance health. An override occurs when a technician or DOM requests to mark a required protocol step as N/A or to proceed without completing it, requiring a supervisory or compliance-level justification.

This audit answers:
1. How many override requests were filed in the audit period?
2. What were the stated reasons?
3. What was the approval/denial rate and outcome?
4. Are there patterns suggesting systemic governance risk?
5. What policy changes, if any, should be recommended?

**Cilla extracted the raw override dataset from the platform.** Marcus reviewed for compliance risk and authored the recommendations.

---

## 2) Override Volume and Distribution

### 2.1 Total Override Requests — Audit Period

| Metric | Value |
|---|---|
| Total override requests filed | 23 |
| Total shops with at least one request | 6 of 9 |
| Shops with zero override requests | RMTS, WFAS, Priya Sharma (Sky Reach Air) |
| Override requests approved | 16 |
| Override requests denied | 7 |
| Approval rate | 69.6% |
| Average time from request to decision | 4.2 hours |
| Override requests on safety-critical required steps | 3 |
| Safety-critical overrides approved | 1 |
| Safety-critical overrides denied | 2 |

### 2.2 By Shop

| Shop | Requests | Approved | Denied | Notes |
|---|---|---|---|---|
| High Desert MRO (HDMRO) | 7 | 5 | 2 | Highest volume; 2 denials well-handled |
| Lone Star Rotorcraft (LSR) | 4 | 3 | 1 | All rotorcraft-specific; 1 denial appropriate |
| Desert Sky Turbine (DST) | 4 | 3 | 1 | 1 safety-critical denial (notable) |
| Ridgeline Air Maintenance | 4 | 2 | 2 | 1 safety-critical denial (notable) |
| High Plains Aero & Charter (HPAC) | 2 | 2 | 0 | Both appropriate approvals |
| Rocky Mountain Turbine Service (RMTS) | 1 | 1 | 0 | Single request; well-documented |
| Walker Field Aviation Services (WFAS) | 0 | — | — | Too new; zero protocol WOs with required steps |
| Priya Sharma / Sky Reach Air | 0 | — | — | Part 91 scope only; limited WO volume |
| High Desert MRO (see above — duplicate removed) | — | — | — | — |

*(Note: Ridgeline listed separately above; consolidated in totals.)*

**Corrected by-shop summary:**

| Shop | Requests | Approved | Denied |
|---|---|---|---|
| High Desert MRO | 7 | 5 | 2 |
| Lone Star Rotorcraft | 4 | 3 | 1 |
| Desert Sky Turbine | 4 | 3 | 1 |
| Ridgeline Air Maintenance | 4 | 2 | 2 |
| High Plains Aero & Charter | 2 | 2 | 0 |
| Rocky Mountain Turbine Service | 1 | 1 | 0 |
| Walker Field Aviation Services | 0 | — | — |
| Sky Reach Air | 0 | — | — |
| Sandy's Air (legacy, piston-only) | 1 | 0 | 1 |
| **Total** | **23** | **16** | **7** |

---

## 3) Override Category Analysis

Cilla categorized all 23 requests by stated reason:

| Category | Count | % | Approval Rate |
|---|---|---|---|
| **Cat-A: Step not applicable to specific aircraft configuration** | 9 | 39% | 89% (8/9) |
| **Cat-B: Part not available; work deferred** | 5 | 22% | 80% (4/5) |
| **Cat-C: Step performed under alternative AMM procedure** | 4 | 17% | 75% (3/4) |
| **Cat-D: Time pressure / operational urgency claimed** | 3 | 13% | 33% (1/3) |
| **Cat-E: Disagreement with step necessity** | 2 | 9% | 0% (0/2) |

**Key observations:**

**Cat-A (Not applicable):** High approval rate, appropriate. 8 of 9 approvals were for configuration-specific required steps on aircraft that genuinely did not have the equipment (e.g., Caravan de-ice step required on a non-de-ice-equipped aircraft). 1 denial was where the shop claimed "not applicable" but the aircraft logbook showed the equipment was installed — Marcus denied and required correct completion.

**Cat-B (Part deferred):** 4 of 5 approvals. Appropriate where work was documented as deferred and a follow-on WO was opened. 1 denial: the shop requested approval without opening a deferral WO or noting the discrepancy on the aircraft's maintenance record — denial was correct; shop was coached to use the deferred-discrepancy workflow.

**Cat-C (Alternative procedure):** 3 of 4 approvals. Appropriate where the alternative AMM reference was cited clearly. 1 denial: shop cited "company procedure" without referencing an approved document — denied; shop was coached that required steps can only be overridden by reference to approved data.

**Cat-D (Operational urgency):** 1 of 3 approved. The approved case was an AOG situation where the step was borescope documentation for a non-safety-critical item, urgency was documented, and a follow-on inspection was committed to within 5 days. The 2 denials: safety-critical required steps (borescope of combustion section after a hard landing at DST; torque-check of turbine hardware at Ridgeline). Marcus denied both with explicit coaching notes.

**Cat-E (Disagreement):** 0 of 2 approved. Both cases involved mechanics arguing that a required step "wasn't in the AMM" — Marcus reviewed and confirmed both steps had explicit AMM basis. Coaching note issued to both shops: required step basis is always documented in the step record; if you believe a step has no AMM basis, contact Marcus before the WO reaches the step, not during.

---

## 4) Notable Individual Cases

### Case OVR-37-04 — DST: Hard-Landing Post-Event Borescope (Cat-D denial)
**Date:** 2026-10-22
**Shop:** Desert Sky Turbine
**Mechanic:** Rodriguez (A&P)
**Request:** "Skip borescope post-event inspection step — customer needs aircraft back immediately, no borescope availability today."
**Required step:** Combustion section borescope per PROTO-DST-002 (post-hard-landing / exceedance event protocol) — required step, not optional
**Marcus decision:** **DENIED**
**Marcus coaching note:**
> "Post-exceedance borescope is required because a hard landing can cause internal combustion section damage not detectable by external inspection. The customer's schedule does not override a required safety step. Aircraft must remain AOG until borescope is completed. If the shop does not have borescope capability today, contact a qualified turbine facility or request Marcus assistance in identifying resources. Skipping this step is not an option I can approve."
**Resolution:** Frank Nguyen (DST DOM) sourced a borescope from a neighboring shop at Phoenix Deer Valley; inspection completed 2026-10-23; result SERVICEABLE; aircraft returned to service. Outcome: correct process followed.

### Case OVR-37-11 — Ridgeline: Torque-Check Override Request (Cat-D denial)
**Date:** 2026-11-08
**Shop:** Ridgeline Air Maintenance
**Mechanic:** Renard Osei (A&P)
**Request:** "Customer is waiting for aircraft. Torque-check step on PT6A-66D turbine section takes 2 hours and customer is AOG. Can we skip and note it?"
**Required step:** Post-replacement torque verification per AMM 72-40-05 (required per Ridgeline's adopted turbine protocol PROTO-RDG-001)
**Marcus decision:** **DENIED**
**Marcus coaching note:**
> "Torque verification on turbine hardware is a safety-critical required step. Two hours of delay is not a justification I can accept for skipping fastener verification on the hot section. The aircraft is a TBM 850 with a turbine life-limited-part-replacement just completed. Skipping torque-check creates an unacceptable risk of engine failure in-flight. Curtis, I need you to personally review this with Renard — the required step is there because of exactly this pressure scenario, not despite it."
**Resolution:** Curtis Pallant (DOM) intervened; torque-check completed; all fasteners within spec. Aircraft returned to service at 2:20 delay. Outcome: correct.
**Secondary note:** Marcus flagged this case to Nadia as a training opportunity: the pressure to skip a torque check for customer convenience is the exact scenario PROTO-RDG-001 was written to prevent.

### Case OVR-37-17 — HPAC: Configuration Exemption (Cat-A approval)
**Date:** 2026-11-20
**Shop:** High Plains Aero & Charter
**DOM:** Lorena Vásquez
**Request:** "Required step for de-ice system functional check does not apply to N521HPA — aircraft is not equipped with de-ice. Step appears because King Air B200 base template includes it by default."
**Required step:** Wing de-ice boot pressure test per PROTO-HPAC-001 (derived from King Air B200 base template)
**Marcus decision:** **APPROVED**
**Marcus note:**
> "Correct application. The step is required by default in the base template because the majority of King Air B200s in the network have de-ice equipment. N521HPA is a non-de-ice configuration (confirmed in aircraft identity fields). Lorena's request is properly documented with aircraft identity reference. Approved. Lorena — consider adding a per-aircraft configuration flag to PROTO-HPAC-001 so this override is not needed on every N521HPA WO. I'll add a note to the base template update queue."
**Resolution:** Template update request filed (FR-37-02: per-aircraft configuration flags on base template required steps). Appropriate override, appropriately approved.

---

## 5) Pattern Analysis

### 5.1 High Desert MRO (7 requests — highest volume)
HDMRO accounts for 30% of all override requests. Volume is high relative to shop size (6 active certifications, similar to RMTS which had 1 request). Cilla and Marcus analyzed the HDMRO override patterns:

- 3 of 7 were Cat-A (configuration exemptions): all appropriate; suggest HDMRO has not fully customized base templates for their specific aircraft configurations
- 2 of 7 were Cat-C (alternative procedures): 1 appropriate; 1 denied (no approved data reference)
- 1 of 7 was Cat-D (urgency): appropriate approval (AOG, non-safety-critical step)
- 1 of 7 was Cat-B (part deferred): denied initially (no deferral WO); resubmitted with deferral WO; approved

**Assessment:** HDMRO's override volume suggests they are using templates without adequate configuration customization. The platform is catching it at the step level (technicians mark required steps as N/A when they shouldn't apply), but the correct fix is template customization upstream. Recommendation: Marcus to schedule a template customization session with Bill Reardon (HDMRO DOM) — target January 2027.

### 5.2 Zero-Override Shops (RMTS, WFAS, Sky Reach)
- **RMTS (Dale Renfrow):** 1 request in 71 days. Dale has customized all his templates for his fleet configurations; required steps are rarely N/A because the templates are already aircraft-specific. This is best-practice behavior.
- **WFAS (Paul Kaminski):** 0 requests, but WFAS has only had 1 protocol-covered turbine WO in the period. Zero overrides is expected; monitor as WO volume grows.
- **Sky Reach Air (Priya Sharma):** 0 requests; Part 91 scope with limited WO complexity; appropriate.

### 5.3 Safety-Critical Override Pattern
3 safety-critical override requests were filed in 71 days. 2 of 3 were denied correctly. 1 was approved (appropriate, per Case OVR-37-17 above — not actually safety-critical despite being flagged; the de-ice check is a required step but the N/A determination was equipment-based, not a safety shortcut).

**Marcus's assessment:** The 2 appropriate denials (OVR-37-04 and OVR-37-11) show that technicians under time pressure are willing to try to short-circuit safety steps. The governance system worked — both were denied and coaching was delivered. The risk is if a DOM approves these without Marcus visibility. Current policy requires DOM + Marcus co-approval on safety-critical step overrides; this policy held in both cases.

---

## 6) Policy Review — Current Rules

Current override governance rules (established in Phase 35 with F-1.5-E adoption workflow):

| Rule | Current Policy |
|---|---|
| Override initiation | Any A&P or DOM on the WO can request; DOM must co-approve for non-safety-critical; Marcus co-approval required for safety-critical |
| Justification requirement | Free-text justification required (minimum 20 characters) |
| Required documentation | Override request logged with: requester, timestamp, step ID, justification, decision, decision-maker, coaching note |
| Coaching note requirement | None (optional) |
| Safety-critical threshold | Marcus manually flags steps as safety-critical in template |

---

## 7) Recommended Policy Changes

Based on audit findings, Marcus and Cilla recommend the following governance policy changes:

### REC-37-D-01 — Mandatory Coaching Note on All Denials
**Current:** Coaching notes are optional on denials.
**Proposed:** All denied override requests must include a coaching note from the decision-maker explaining the denial and the correct course of action.
**Rationale:** Both notable denials (OVR-37-04, OVR-37-11) included coaching notes voluntarily. The 5 other denials had brief decision text but no structured coaching. Coaching notes create a training record and close the feedback loop.
**Implementation:** Add required `coachingNote` field (minimum 50 characters) to override denial mutation. UI: denial button triggers modal with coaching note text field.
**Compliance risk if not adopted:** Medium (no regulatory gap, but governance quality gap if patterns repeat without correction)

### REC-37-D-02 — Per-Aircraft Configuration Flags on Base Templates
**Current:** Base template required steps are aircraft-type-level; configuration exemptions require case-by-case overrides.
**Proposed:** Marcus-managed configuration flags on required steps: `applicableConfigurations: ['de-ice', 'turboprop', 'pressurized']` — step is required only if aircraft identity includes the matching configuration tag.
**Rationale:** 39% of override requests (Cat-A) are configuration exemptions that could be eliminated by proper template design. HDMRO in particular would see its override volume drop significantly.
**Implementation:** FR-37-02 (already logged per Case OVR-37-17 coaching note). Add to v1.5 Sprint 5 intake.
**Compliance risk if not adopted:** Low (current override process catches it), but high nuisance factor

### REC-37-D-03 — Cat-B Deferral WO Requirement in Platform (not just coaching)
**Current:** Part-deferred overrides are approved if the shop commits to a deferral WO, but the platform does not enforce this — it's a coaching expectation.
**Proposed:** Cat-B override requests (parts unavailable / deferral) require a linked deferral WO number in the override request form before submission is allowed.
**Rationale:** 1 of 5 Cat-B requests was denied because the shop submitted without a deferral WO. The platform should prevent this submission path rather than catch it at review.
**Implementation:** Add conditional required field `linkedDeferralWo` to override request form when reason category = "PART_DEFERRED".
**Compliance risk if not adopted:** Medium — deferral without documented follow-on WO creates tracking gap

### REC-37-D-04 — Safety-Critical Step Warning Banner at WO Open (not just at step execution)
**Current:** Safety-critical step designation is visible when the technician reaches the step during execution.
**Proposed:** When a WO is opened for a work type that contains safety-critical required steps, a banner is shown to the opening DOM: "This work type contains X safety-critical required steps. Review the protocol before authorizing the WO."
**Rationale:** Both safety-critical denials (OVR-37-04, OVR-37-11) arose because the technician was under time pressure at execution time. Moving the safety-critical step awareness to WO-open time gives the DOM an opportunity to set expectations with the customer before the job starts.
**Implementation:** New query `getWoTypeSafetyCriticalStepCount`; banner on WO creation modal.
**Compliance risk if not adopted:** Medium — pattern of urgency-based safety-critical override requests likely to recur

---

## 8) Implementation Priorities

| Recommendation | Priority | Target Sprint | Estimated Effort |
|---|---|---|---|
| REC-37-D-01 Coaching note requirement on denials | P1 | Sprint 5 | Small (1 day backend + UI) |
| REC-37-D-03 Cat-B deferral WO link required | P1 | Sprint 5 | Small (1 day frontend) |
| REC-37-D-04 Safety-critical step banner at WO open | P2 | Sprint 5 | Small (2 days) |
| REC-37-D-02 Per-aircraft configuration flags | P2 | Sprint 5 | Medium (5 days backend + template migration) |

All four recommendations are logged as FR-37-03 (coaching note), FR-37-04 (deferral WO link), FR-37-05 (safety-critical banner), FR-37-06 (per-aircraft config flags) for Sprint 5 intake consideration.

**HDMRO template customization session:** Marcus to schedule with Bill Reardon, target January 2027. Not a platform change — a customer success action.

---

## 9) Audit Conclusion

Marcus Webb:
> "The override system is working. The 23 requests over 71 days is a volume I'd expect for a network this size with this level of protocol adoption. The 2 safety-critical denials demonstrate that the governance process can hold under real time pressure. The 69.6% approval rate is higher than I'd like — I want to see more Cat-A overrides eliminated by template configuration improvement, which would pull that number down to a healthier 50-60% range. The four policy recommendations are all achievable in Sprint 5. The most important is the coaching note requirement — it turns every denial into a training record."

Cilla Oduya:
> "Data extraction and analysis was clean. No audit gaps. Platform override log is complete for the entire period. The per-shop breakdown was straightforward — HDMRO is the outlier and the cause is identifiable (template configuration, not compliance intent). All 23 records are admissible."

**WS37-D STATUS: ✅ DONE**

---

## Appendix A — Override Log Summary (all 23 cases)

| Case ID | Date | Shop | Category | Decision | Safety-Critical |
|---|---|---|---|---|---|
| OVR-37-01 | 2026-10-04 | HDMRO | Cat-A | Approved | No |
| OVR-37-02 | 2026-10-09 | LSR | Cat-C | Approved | No |
| OVR-37-03 | 2026-10-15 | HDMRO | Cat-B | Approved | No |
| OVR-37-04 | 2026-10-22 | DST | Cat-D | **Denied** | **Yes** |
| OVR-37-05 | 2026-10-24 | HDMRO | Cat-A | Approved | No |
| OVR-37-06 | 2026-10-29 | Sandy's Air | Cat-E | **Denied** | No |
| OVR-37-07 | 2026-11-01 | HDMRO | Cat-D | Approved | No |
| OVR-37-08 | 2026-11-03 | DST | Cat-C | Approved | No |
| OVR-37-09 | 2026-11-05 | Ridgeline | Cat-A | Approved | No |
| OVR-37-10 | 2026-11-07 | HPAC | Cat-A | Approved | No |
| OVR-37-11 | 2026-11-08 | Ridgeline | Cat-D | **Denied** | **Yes** |
| OVR-37-12 | 2026-11-10 | LSR | Cat-B | **Denied** | No |
| OVR-37-13 | 2026-11-14 | HDMRO | Cat-A | Approved | No |
| OVR-37-14 | 2026-11-16 | DST | Cat-B | Approved | No |
| OVR-37-15 | 2026-11-18 | HDMRO | Cat-C | **Denied** | No |
| OVR-37-16 | 2026-11-19 | Ridgeline | Cat-E | **Denied** | No |
| OVR-37-17 | 2026-11-20 | HPAC | Cat-A | Approved | No |
| OVR-37-18 | 2026-11-22 | HDMRO | Cat-B | Approved | No |
| OVR-37-19 | 2026-11-25 | LSR | Cat-A | Approved | No |
| OVR-37-20 | 2026-11-30 | DST | Cat-C | Approved | No |
| OVR-37-21 | 2026-12-02 | LSR | Cat-A | Approved | No |
| OVR-37-22 | 2026-12-05 | Ridgeline | Cat-B | Approved | No |
| OVR-37-23 | 2026-12-08 | RMTS | Cat-A | Approved | No |
