# WS18-C — CAL-POLICY-MEMO-V1 Closure

**Phase:** 18  
**Workstream:** WS18-C  
**Owners:** Marcus Webb (signatory) + Dale Purcell (SME field review)  
**Date:** 2026-02-22  
**Source Memo:** `phase-16-build/ws16-f-test-equip-build.md` §2 — CAL-POLICY-MEMO-V1  
**Production Gate Affected:** `PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED` in `recordEquipmentUsage`  
**Status: SIGNED**

---

## 1. Marcus Webb — Review Notes

**Marcus Webb, Regulatory/Compliance Authority**  
**Review conducted:** 2026-02-22, morning session

---

### 1.1 What I Checked

I received the memo draft from Phase 16 (WS16-F §2) and read it in full. I then cross-referenced each regulatory citation against my own notes, confirmed the policy ruling language was what I intended, reviewed the UAT script structure, and re-read Dale Purcell's SME brief from WS15-F for alignment. I also reviewed the Cilla test plan against the memo's stated override conditions to verify the code enforces what the memo says — not just what someone assumed the memo would say.

**Regulatory citations verified:**
- **14 CFR §43.9(a)(2):** Confirms that approved data references in maintenance records must be identifiable. The memo's position — that calibration cert data is part of the approved data chain for Part 43 Appendix E tests — is consistent with my reading and consistent with how FSDO investigators have questioned shops during surveillance. The citation is correct.
- **14 CFR Part 43 Appendix E:** Explicitly governs altimeter, static, and transponder test equipment requirements. The memo correctly identifies this as the hard regulatory hook for cal traceability. No change needed.
- **14 CFR §91.411 / §91.413:** IFR equipment test currency requirements. Cited correctly in context. The memo does not overreach by claiming these sections require documented cal data per se — it correctly frames them as the regulatory basis for why cal currency matters.
- **Part 145.109(a):** Repair station equipment condition requirement. Correctly cited. The memo does not assert this section requires NVLAP accreditation — it correctly frames it as the basis for maintaining equipment in a condition to perform approved maintenance, which implies cal currency.
- **AC 43-9C §6:** The memo's reference to this AC is appropriate. The AC states that maintenance record content should allow identification of test equipment used — the memo uses this to support the policy requirement that a cert number without an uploaded document is insufficient.

**One citation I added:** I added a reference to **AC 120-78B** in the regulatory basis section (not present in the original Phase 16 draft). AC 120-78B governs electronic signatures and their non-repudiation properties in maintenance records. Since the calibration snapshot at time of use is part of the audit record chain that lives alongside the maintenance record, AC 120-78B's non-repudiation requirements apply. This does not change any operative policy — it strengthens the justification for the "snapshot immutability" requirement in TC-F-06. I added this citation to §2.2 of the final memo.

---

### 1.2 What I Required Changed

Three items from the original Phase 16 draft that I required be modified before I would sign:

**Change 1 — §2.4 Policy Ruling language clarification:**  
The original draft used the word "advisory" to describe the expired-cal handling. This is ambiguous — "advisory" in regulatory contexts often means "optional guidance from the FAA," which is different from what we mean (i.e., "non-blocking at the mutation level but documented and audited"). I required the final text to use **"documentable exception with mandatory override record"** in the operative ruling, and to explicitly distinguish this usage from FAA advisory circular language. The final memo now reads:

> *"Expired calibration on test equipment used in a maintenance record is a documentable exception with mandatory override record for v1.1. This is NOT a hard block at the mutation level. The word 'advisory' as used below refers to the system's enforcement posture — not to regulatory advisory status."*

**Change 2 — §2.4 Override condition #2 specificity:**  
The original draft said "authorized by an IA or shop lead." I required this be changed to "authorized by a user holding the `IA` or `DOM` role in the system (minimum privilege: shop_lead or above)." The distinction matters: a "shop lead" title in a shop doesn't mean anything to a compliance reviewer. The system role is what Athelon can actually verify and log. The final memo references the system role, not a job title.

**Change 3 — §2.5 Audit visibility wording:**  
The original draft said override frequency exceeding thresholds "triggers a QA review flag." I required this be changed to "triggers a **mandatory** QA review flag that must be cleared by a DOM or QCM before the flag closes." The word "triggers" without "mandatory" is unenforceable — it suggests a flag might appear and be ignored. The override frequency dashboard must require a DOM/QCM acknowledgment to clear. Devraj confirmed this is implementable and is now in the build spec.

---

### 1.3 What I Accepted Without Change

- The full text of §2.3 (What Constitutes Valid Calibration Evidence): The five-part definition is correct and appropriately strict. The requirement for an uploaded certificate PDF (not just a certificate number) is the right call.
- The §2.6 hard-block upgrade trigger conditions: The three conditions I specified (FAA investigation referencing an Athelon record, systematic misuse pattern, Notice of Investigation) are the right escalation thresholds. I am comfortable with these as the v1.1 policy.
- The v2.0 reservation: My right to upgrade expired-cal to a hard block after reviewing v1.1 usage patterns is correctly preserved.
- The override conditions in total: Four conditions are the right number. Not onerous enough to drive mechanics back to paper workarounds, not permissive enough to be a rubber stamp.

---

## 2. Dale Purcell — Field Review

**Dale Purcell, Avionics Technician, Henderson NV**  
**Field review conducted:** 2026-02-22

Dale Purcell was the primary SME for WS15-F and WS16-F. His review of the memo focused on whether the policy reflects how calibration actually operates on the avionics bench — not just what the regulations say, but what shops actually do and what the real failure modes look like.

---

### 2.1 Dale's Specific Concerns (and Resolution Status)

**Concern 1 — The "submitted to the lab" scenario:**  
*"The most common expired-cal situation I see is equipment that's been submitted to the calibration lab but hasn't come back yet. We know it's going to be fine — it's the same equipment that just had a good cert 60 days ago — but technically the cert is past due while it's being renewed. The memo needs to acknowledge this scenario explicitly or shops will feel like they're admitting wrongdoing just by using the override."*

**Resolution:** Marcus added an explicit example in §2.4 to the explanation requirement: *"'Submitted to CalLab Inc. 3 days ago; lab confirmation email ref LAB-2024-0312 attached' is an example of an adequate explanation that addresses both why the equipment was used despite expired cal and what evidence of interim validity exists."* This is now reproduced verbatim in the final memo. Dale confirmed this resolves the concern.

**Concern 2 — Self-authorization by the shop IA:**  
*"In a small shop, the IA might be the only person with authority to authorize an override. If the rule is that the authorizer can't be the same person as the linking tech, you could have a situation where the IA is also the one doing the work. In a 2-person shop on a Saturday, that's a real problem."*

**Resolution:** Marcus and Dale discussed this directly. Marcus's position: *"A 2-person shop where the IA is both the technician and the only authorized override approver is exactly the kind of scenario that should create friction. The friction is the point. If you're using expired cal equipment and you're the only person in the shop, you should be on the phone to your DOM, not self-authorizing. That said, the DOM role is authorized to override — and a DOM who calls in and tells you to proceed can be listed as the authorizer. That's the path."* Dale accepted this. He noted it requires that the DOM's name be accessible in the system user directory even if the DOM isn't physically present. Confirmed: the `authorizedBy` field accepts any user ID with the appropriate role, regardless of physical location.

**Concern 3 — NVLAP accreditation as a hard requirement:**  
*"Not every cal lab we use is NVLAP-accredited. Some of the OEM service centers have their own internal calibration programs that are ISO/IEC 17025 but not NVLAP specifically. The memo says 'NVLAP accreditation or equivalent ISO/IEC 17025 accreditation' — I need the system to actually accept ISO/IEC 17025 as sufficient, not just mention it in the memo."*

**Resolution:** The memo uses the phrase "NVLAP accreditation number must be recorded *where available*" — the "where available" qualifier means ISO/IEC 17025 certs from non-NVLAP labs are accepted, and the accreditation number field can record the ISO/IEC 17025 certificate reference instead. The `verifyCalibration` mutation's `nvlapAccreditationNumber` field is `v.optional(v.string())` — it is not required. The memo's language and the code's schema are consistent. Dale confirmed this resolves the concern.

**Concern 4 (no change required) — 30-day warning window:**  
*"30 days warning before expiry is right for most equipment, but for equipment that goes out to a 6-month or 12-month cal cycle, 30 days is plenty. For equipment on a 90-day cycle — like some transponder test sets — 30 days is cutting it close if the lab is backed up. Not asking to change it, just flagging that some shops may want to configure a 60-day warning for short-cycle equipment."*

**Resolution:** Dale acknowledged this is a post-v1.1 feature request (configurable warning window per equipment category). Logged as enhancement request, not a blocker. The 30-day floor in v1.1 is accepted.

---

### 2.2 Dale's Field Acceptance Statement

*"I've read the CAL-POLICY-MEMO-V1 final version, including the three changes Marcus required. The memo reflects how calibration works on the avionics bench. The override path is friction-laden in the right way — it requires a specific explanation that addresses the actual question (why is this expired equipment being used and what evidence of interim validity exists) rather than a checkbox. The self-authorization block is the right call even if it creates operational friction for small shops. The NVLAP-or-equivalent language is workable. I'm satisfied that the system built around this memo will produce calibration records that hold up when an inspector asks for them."*

**Dale Purcell — Avionics Technician, Henderson NV**  
**SME Field Acceptance: CONFIRMED**  
**Date: 2026-02-22**

---

## 3. Signed Memo Text — CAL-POLICY-MEMO-V1 (Final)

---

> **ATHELON INTERNAL POLICY DOCUMENT**  
> **Document ID:** CAL-POLICY-MEMO-V1  
> **Version:** 1.0 — FINAL  
> **Subject:** Test Equipment Calibration Evidence Policy — Valid Evidence, Override Conditions, and Audit Requirements  
> **Signed by:** Marcus Webb, Regulatory/Compliance  
> **Signature Date:** 2026-02-22  
> **Effective Date:** 2026-02-22 (effective upon signature; production gate removable after this date)

---

### §1. Scope

This memo establishes Athelon's policy on what constitutes valid calibration evidence for test equipment used in FAA-regulated maintenance records, the conditions under which expired-calibration override is permitted, and how such overrides are audited. This policy governs the behavior of the `recordEquipmentUsage` mutation and any system path that associates test equipment with a maintenance record entry. This policy was prepared in conjunction with the WS16-F build specification and reviewed by Dale Purcell (avionics technician, Henderson NV) as the field SME.

---

### §2. Regulatory Basis

The following regulations and advisory circulars form the basis of this policy:

- **14 CFR §43.9(a)(2):** Maintenance records must identify the approved data used. For regulated test procedures (altimeter, static, transponder per Part 43 Appendix E), the calibration certificate data for test equipment used is part of the approved data chain and must be identifiable from the record.
- **14 CFR Part 43, Appendix E:** Specifies equipment requirements for altimeter, static, and transponder tests. Equipment used must be appropriately calibrated.
- **14 CFR §91.411 / §91.413:** IFR equipment test currency requirements. Test equipment calibration is a component of the test's validity.
- **Part 145.109(a):** Repair stations must maintain equipment in a condition to perform approved maintenance. This implies calibration currency for test equipment.
- **AC 43-9C §6:** Maintenance record content should allow identification of test equipment used.
- **AC 120-78B:** Electronic signature and record non-repudiation requirements applicable to maintenance records. The calibration snapshot at time of use is part of the non-repudiable maintenance record chain.

---

### §3. What Constitutes Valid Calibration Evidence

For calibration evidence to be considered valid in the Athelon system, ALL of the following must be true at time of equipment use:

1. **Calibration certificate is current.** The calibration due date (calDueDate) is on or after the date the maintenance work is performed.
2. **Certificate is from an accredited lab.** The calibrating laboratory holds NVLAP accreditation or equivalent ISO/IEC 17025 accreditation for the relevant measurement discipline. Where NVLAP accreditation number is available, it must be recorded. ISO/IEC 17025 accreditation references from non-NVLAP labs are accepted in the `calibrationAuthority` field.
3. **NIST traceability is attested.** The technician receiving or re-verifying the equipment has attested (not merely defaulted) that NIST traceability is documented on the certificate.
4. **Certificate is on file.** The calibration certificate PDF has been uploaded to `_storage` and linked to the equipment record. A certificate number without an uploaded document is insufficient.
5. **All required fields are populated.** Cal cert number, cal date, cal due date, cal lab name, NIST traceable boolean, and cal cert storage ID must all be non-null.

A free-text note referencing calibration does not satisfy these requirements.

---

### §4. Expired Calibration — Policy Decision

**Policy ruling (Marcus Webb, signatory):**

Expired calibration on test equipment used in a maintenance record is a **documentable exception with mandatory override record** for v1.1. This is NOT a hard block at the mutation level. The word "advisory" as used below refers to the system's enforcement posture — not to regulatory advisory status.

Rationale:

> *"A hard block at the mutation level would prevent mechanics from documenting work in real-world scenarios where equipment is in a calibration renewal gap — submitted to the lab, awaiting return, with interim lab confirmation available. A hard block creates pressure to use different equipment without disclosure rather than documenting the expired status transparently. The regulatory requirement is documentation and traceability, not physical impossibility. The system should make the exception as friction-laden and auditable as possible, not impossible."*

**Expired-cal override is permitted ONLY when all of the following are true:**

1. The explanation text provided is at minimum 30 characters and addresses: (a) why the equipment was used despite expired cal, and (b) what evidence of interim validity exists. Example of an adequate explanation: *"Submitted to CalLab Inc. 3 days ago; lab confirmation email ref LAB-2024-0312 attached."* This example explicitly addresses both required elements and is the minimum quality of explanation the system should accept.
2. The override is authorized by a user holding the `IA` or `DOM` system role (minimum system privilege: `shop_lead` or above). A job title is not sufficient — the authorizer must hold the applicable system role, which is verifiable in the audit log.
3. The override authorizer is a different user ID from the user linking the equipment. Self-authorization is prohibited. In a 2-person shop where the IA is the only eligible authorizer: the DOM must be contacted (remotely is acceptable); the DOM's user ID may serve as the authorizing entity.
4. The override is logged with full timestamp, authorizer ID, and explanation text in the `expiredCalOverride` block.

**v2.0 note:** Marcus Webb reserves the right to upgrade expired-cal to a hard block after reviewing v1.1 usage patterns. The override frequency dashboard (§5) must be reviewed quarterly.

---

### §5. How Overrides Are Audited

Every expired-cal override appears in:

1. The `maintenanceRecordTestEquipmentLinks` record with full `expiredCalOverride` block (non-deletable, non-modifiable after creation).
2. The maintenance record PDF export under a flagged amber "Cal expired at use — override documented" section.
3. The quarterly cal policy compliance report surfaced to the shop's QA/compliance role.
4. The WS16-M hash-manifest chain for the work order.

Override frequency exceeding **2 per technician per quarter** triggers a mandatory QA review flag that must be cleared by a DOM or QCM before the flag closes.  
Override frequency exceeding **5 per shop per month** triggers a mandatory compliance review by Marcus Webb or designated compliance reviewer.

---

### §6. Future Hard-Block Trigger Conditions

Marcus Webb will recommend upgrade to hard block if any of the following occur:

- An FAA investigation references an Athelon-documented maintenance record with expired-cal equipment.
- Quarterly override report shows systematic misuse (pattern of approver = closest colleague, boilerplate explanations, override frequency without corresponding cal lab turnaround evidence).
- Any shop receives a Notice of Investigation touching calibration traceability.

---

### §7. Code Reference

This policy is implemented in:
- `convex/mutations/testEquipment.ts` — `recordEquipmentUsage` mutation, `expiredCalOverride` branch
- `CAL_POLICY_MEMO_REF = "CAL-POLICY-MEMO-V1"` constant — must match this Document ID
- `maintenanceRecordTestEquipmentLinks.expiredCalOverride.calPolicyMemoRef` — must reference this Document ID

This memo's signature authorizes the removal of the `PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED` comment and the associated feature flag from the `recordEquipmentUsage` mutation. See §4 of WS18-C for explicit gate removal authorization.

---

### SIGNATURE BLOCK

```
Marcus Webb — Regulatory/Compliance
Document ID: CAL-POLICY-MEMO-V1
Version: 1.0 — FINAL

Signature: Marcus Webb
Date: 2026-02-22

Witnessed by (SME Field Reviewer): Dale Purcell, Avionics Technician, Henderson NV
Date: 2026-02-22
```

*This document is signed. The `linkTestEquipment` / `recordEquipmentUsage` expired-cal branch may be merged to main and deployed to production. The code constant `CAL_POLICY_MEMO_REF = "CAL-POLICY-MEMO-V1"` is verified to match this Document ID.*

---

## 4. Production Gate Removal Authorization

**By authority of the signed CAL-POLICY-MEMO-V1 (§7 above), the following production gate is hereby authorized for removal:**

### Gate: `PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED` in `recordEquipmentUsage`

**Current state (as of Phase 17 deployment):**
```typescript
// convex/mutations/testEquipment.ts
// PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED
// The expiredCalOverride branch below is present in code but must NOT be reached
// in production until CAL-POLICY-MEMO-V1 is signed by Marcus Webb.
// See: phase-16-build/ws16-f-test-equip-build.md §2
if (equipment.status === "cal_expired") {
  if (!args.expiredCalOverride) {
    throw new ConvexError(
      `Equipment ${equipment.internalEquipmentId} calibration expired — override documentation required per CAL-POLICY-MEMO-V1`
    );
  }
  // ... override validation logic
}
```

**Authorized action:**
1. Remove the `// PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED` comment block.
2. The underlying logic (`if (equipment.status === "cal_expired")` → override validation) remains exactly as written — the gate was not suppressing the logic; it was documenting that the logic was not to be tested in production. With the memo signed, the logic is now authorized.
3. Set `PRECLOSE_WS16F_EXPIREDCAL_ENABLED = "true"` in production environment configuration (or remove the feature flag entirely if the build has been updated to remove the flag-guarded path).
4. Devraj Anand confirms flag removal in staging first, re-runs TC-F-03 through TC-F-05 in staging, and confirms Dale Purcell's UAT scenario (expired cal with documented override end-to-end) passes in the staging environment before production deployment.

**Authorization issued by:** Marcus Webb (signatory of CAL-POLICY-MEMO-V1)  
**Date:** 2026-02-22  
**Confirmation required from:** Devraj Anand (staging re-verification) before flag is removed in production.

---

## 5. Status

**WS18-C STATUS: SIGNED**

CAL-POLICY-MEMO-V1 is signed, witnessed, and effective as of 2026-02-22.

The `PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED` flag in `recordEquipmentUsage` is authorized for removal pending Devraj's staging re-verification run.

**Next:** Devraj removes flag in staging → TC-F-03/04/05 re-run → Dale UAT confirmed → production deployment of expired-cal override path authorized.

---

*Filed: 2026-02-22 | Phase 18 — WS18-C CAL-POLICY-MEMO-V1 Closure | Athelon v1.1*  
*Signatory: Marcus Webb, Regulatory/Compliance*  
*Field Reviewer: Dale Purcell, Avionics Technician, Henderson NV*
