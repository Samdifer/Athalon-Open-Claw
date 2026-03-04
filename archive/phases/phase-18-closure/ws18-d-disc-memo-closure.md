# WS18-D — DISC-AUTH-LIABILITY-MEMO-V1 Closure

**Phase:** 18  
**Workstream:** WS18-D  
**Owners:** Marcus Webb (signatory) + Danny Osei (SME field review)  
**Date:** 2026-02-22  
**Source Memo:** `phase-16-build/ws16-l-disc-auth-build.md` §2 — DISC-AUTH-LIABILITY-MEMO-V1  
**Production Gate Affected:** `PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED` in `requestCustomerAuthorization` and email dispatch path  
**Status: SIGNED**

---

## 1. Marcus Webb — Review Notes

**Marcus Webb, Regulatory/Compliance Authority**  
**Review conducted:** 2026-02-22, afternoon session

---

### 1.1 What I Checked

This memo is in a different category from CAL-POLICY-MEMO-V1. The calibration memo is about regulatory compliance with an FAA documentation requirement. This memo is about civil liability exposure, customer contract law, and the legal adequacy of an electronic authorization mechanism. My review here was more intensive because the stakes are different: a miscalibrated audit trail of customer consent creates legal risk for every shop on the platform, not just a compliance finding for one shop's maintenance records.

I read the Phase 16 draft in full (WS16-L §2). I reviewed the authorization email template. I reviewed the `consentRecord` schema. I reviewed TC-L-02 (the test that verifies consent capture completeness) and TC-L-07 (the hash verification test). I asked for and received a walkthrough from Devraj of the actual consent text rendering pipeline — specifically, how the consent text is built server-side, how the hash is computed, and how it could be reconstructed if needed in litigation.

**Regulatory and legal citations verified:**

- **14 CFR §91.403(a):** The owner/operator responsibility framing is correct. The memo accurately characterizes the shop's position: performing maintenance beyond the original scope without documented authorization is an evidentiary vulnerability, not a regulatory per se violation (the regulation doesn't prescribe the documentation form). The memo's conservative approach — treating documented authorization as required for any scope expansion — is the right business practice.

- **15 U.S.C. §7001 (E-SIGN Act):** I reviewed the four-part test I laid out in §2.4 of the Phase 16 draft against the actual E-SIGN Act requirements. The test is correct. The click-to-approve mechanism, as implemented, satisfies the E-SIGN Act requirements provided the conditions are met. I added one condition to the list: the customer must have received and can access the authorization text through a mechanism independent of the approval button (i.e., the text must be visible before the button). The implementation's scroll-to-authorize pattern (in the customer portal) already does this.

- **14 CFR Part 145 §145.213:** Work order authorization. The memo correctly cites this as the basis for requiring owner/operator authorization for scope expansions. I confirmed that the authorization flow's state machine design (fail-closed on pending, no AOG bypass of pending state) is consistent with this regulatory basis.

- **UCC Article 2 / State Contract Law:** The memo's framing of this as relevant is appropriate. Payment disputes for unauthorized repairs are primarily governed by state contract law, not federal aviation regulations. The memo correctly identifies the authorization record as the evidence that supports enforceability of the payment obligation.

---

### 1.2 Liability Exposure Analysis

I conducted a liability exposure analysis before signing. The question I was answering: **If Athelon's customer authorization flow is used as the sole evidence of authorization in a payment dispute or regulatory investigation, will the record produced by the system be adequate?**

**Scenarios analyzed:**

**Scenario A — Customer denies authorization ("I never approved that"):**  
The consent record contains: (1) IP address of the approving device, (2) the email address the authorization link was sent to, (3) the Clerk session ID from the approval action, (4) the declared name and relationship entered by the customer, (5) a SHA-256 hash of the exact consent text presented. This is not impossible to dispute, but it is substantially stronger than "we called and they said yes." In a small claims court context — which is where most repair cost disputes land — this level of documentation is dispositive. I am satisfied with the adequacy for the shop sizes Athelon targets (Part 145 repair stations, not major airlines).

**Scenario B — Customer claims they didn't understand what they were approving:**  
The email template I reviewed explicitly states: what was found, what treatment is proposed, and the cost range. The customer portal presents this same information before the approval button is active. The decline path is equal in prominence to the approve path. The template text I reviewed includes: "What happens if you decline: We will not perform this additional repair... depending on the nature of the finding, this may affect the aircraft's airworthiness status." This is appropriate disclosure. A customer who clicks "Approve" after reading this text has been given the relevant information.

**Scenario C — Wrong person authorized (e.g., pilot who is not the owner):**  
The authorization form asks for declared name and relationship to the aircraft (owner / operator / authorized agent). A non-owner who selects "owner" and submits has made a false declaration. The shop's liability in this scenario is reduced: Athelon's system captured a declaration, the shop acted in good faith on that declaration. This is the best the system can do without requiring a title search before every discrepancy authorization. I am satisfied this is appropriate.

**Scenario D — FAA investigation of scope creep (unauthorized maintenance):**  
If an FAA investigator questions whether the shop had authorization for additional work, the audit trail — `discAuthRequests` record, `transitionLog`, `consentRecord` — is producible as a complete, structured record. The `liabilityMemoRef` field in the consent record explicitly references this memo, tying the authorization event to the adopted policy. This is a defensible posture.

**Overall liability exposure assessment:** The system as designed provides **adequate** documentation for a Part 145 repair station operating in the maintenance scope that Athelon targets. It is not as strong as a wet-signature authorization form on letterhead, but it is substantially stronger than the current practice (sticky notes and recalled phone conversations), and it is legally adequate under the E-SIGN Act for the authorization purpose it serves.

---

### 1.3 E-SIGN Act Adequacy Assessment

Applying the four-part E-SIGN Act test from the Phase 16 draft plus the one condition I added:

| Condition | Required | Implementation | Satisfied? |
|---|---|---|---|
| Customer can review authorization text before approving | Yes | Authorization text rendered in full on portal page before approve/decline buttons | ✅ YES |
| Authorization text clearly states what is being approved and cost range | Yes | Template includes discrepancy description, cost range, consequences of approval and decline | ✅ YES |
| Click logged with sufficient identity evidence | Yes | Email address delivery + IP timestamp + Clerk session context from approval action | ✅ YES |
| Customer had option to decline or request clarification | Yes | Decline button is equal prominence to approve button; coordinator contact info included | ✅ YES |
| Authorization text independently accessible before approval | Added by Marcus | Scroll-to-approve pattern on portal; text visible before button active | ✅ YES (existing design satisfies) |

**E-SIGN Act adequacy: CONFIRMED**

---

### 1.4 What I Required Changed

Two items from the original Phase 16 draft that I required be modified before I would sign:

**Change 1 — §2.4 "This mechanism is legally superior to a verbal phone authorization":**  
I struck this sentence. The comparison is unnecessary and potentially damaging if a court takes a different view — we don't need to assert superiority to anything else, just adequacy. Replaced with: *"This mechanism meets the legal requirements of an electronic signature under the E-SIGN Act and is substantially more defensible than undocumented verbal authorization."* The word "superior" invited a legal challenge; "substantially more defensible" is accurate and not overbroad.

**Change 2 — Assisted-phone path implementation requirement:**  
The Phase 16 draft included the assisted-phone path as a "build" item but did not specify that it is a **blocking requirement** for production. I required the final memo state explicitly: *"The assisted-phone path is not optional for production. A coordinator who documents customer authorization by phone must use the structured assisted-phone path in the system — not a free-text note. The `witnessCoordinatorId` requirement in the assisted-phone path is mandatory."* This ensures the liability protection the memo establishes extends to phone authorizations, not just email-click authorizations.

---

### 1.5 What I Accepted Without Change

- The full scope of `consentRecord` fields: IP, timestamp, declared name, relationship, consent text hash, cost range presented, `liabilityMemoRef`. This is the right set.
- The 48-hour timeout and 24-hour reminder structure.
- The scope-change supersede mechanism (TC-L-06): a material scope change invalidates the prior authorization and requires re-authorization. This is the correct design.
- The "not a technical release or airworthiness determination" disclaimer in the email template. This language protects Athelon from having the customer authorization record mistaken for a technical finding by either the customer or an investigator.
- The 7-year retention floor on consent records per WS15-L §6.4.

---

## 2. Danny Osei — Field Review

**Danny Osei, Work Order Coordinator, Manassas VA**  
**Field review conducted:** 2026-02-22

Danny Osei was the primary customer-side SME for WS15-L and WS16-L. His field review focused on whether the authorization flow matches how he actually handles customer authorization in practice — the friction points, the timing pressures, the conversations he has with aircraft owners who are often anxious and always wanting their aircraft back.

---

### 2.1 Danny's Specific Concerns (and Resolution Status)

**Concern 1 — The email template's tone:**  
*"I've seen the email template and I want to be honest: it reads a little formal and scary. 'Depending on the nature of the finding, this may affect the aircraft's airworthiness status' — that's going to cause some customers to call me in a panic before they click anything. I'd rather the template say something softer. But I also understand Marcus has liability reasons for the language. Can we keep the information but make it sound less like a legal warning?"*

**Resolution:** Marcus and Danny had a direct conversation about this. Marcus's position was firm: the consequences of decline need to be clearly stated, because a customer who later claims they didn't understand they were declining a safety-relevant repair is a worse outcome than a customer who calls the coordinator with questions. However, Marcus agreed to add a line to the email template that softens the entry: *"If you have any questions before deciding, please call your coordinator — they'll walk you through it."* Danny confirmed that this single line changes the feel of the email significantly, because it tells the customer they don't have to make this decision alone. This addition is in the final template.

**Concern 2 — The "authorized agent" relationship category:**  
*"A lot of the time I'm talking to a fleet manager or an operation's maintenance manager, not the aircraft owner directly. Sometimes the owner is a company, not a person. The form asks for owner / operator / authorized agent — does 'authorized agent' cover corporate fleet managers?"*

**Resolution:** Yes. The "authorized agent" category is specifically designed for this scenario. The `customerDeclaredName` field captures the actual person's name, and the `customerRelationship: "authorized_agent"` records that they are acting on behalf of the owner. If the aircraft owner disputes an authorization made by someone who wasn't actually authorized to act as their agent, the liability for that misrepresentation lies with the person who made a false declaration of their authorization status — not with the shop that acted in good faith on the declaration. Marcus confirmed this is the correct legal framing. Danny confirmed this resolves his concern.

**Concern 3 — The 48-hour timeout in AOG situations:**  
*"AOG is the one scenario where 48 hours is way too long. If an aircraft is grounded and the owner wants it back ASAP, they're going to respond to an authorization request in 10 minutes. The 48-hour timeout is fine as a floor — it's the right policy for normal situations. But in AOG, I need to know the system is going to escalate faster. The 24-hour reminder is too late."*

**Resolution:** The system's timeout is a maximum, not a timer that delays action. The moment the customer clicks Approve, the WO unlocks — the 48-hour window doesn't prevent fast resolution. What Danny was concerned about was the escalation behavior when the customer doesn't respond. For AOG scenarios, Devraj confirmed that the coordinator can manually escalate — there's a "Flag as AOG" action on the WO that increases the notification priority level for the coordinator and triggers an immediate in-app alert rather than waiting for the hourly cron. This AOG escalation path is confirmed implemented (WS17-K and WS17-L both include AOG priority handling). Danny confirmed this resolves his concern. The 48-hour timeout remains as the policy floor.

**Concern 4 — Phone authorization during the 48-hour window:**  
*"Sometimes the owner calls me back before they click the link and just tells me verbally: 'Danny, go ahead, fix it.' What do I do? I can't tell the customer 'you have to click the email.' That's terrible customer service."*

**Resolution:** This is exactly what the assisted-phone path is for. Danny navigates to the authorization request, selects "Record Phone Authorization," enters his witness ID and notes the customer's verbal approval, and the system records a `decision: "approve"` consent record with `actorType: "coordinator"` and `witnessCoordinatorId: [Danny's user ID]`. The email link becomes void (the request is now APPROVED). Danny did not know this path was implemented — he thought the phone path was still "a sticky note." Devraj walked him through it during the UAT session. Danny's reaction:

*"Oh. That's the whole thing. That solves it. I can record the phone approval right then, the WO unlocks, and there's a record of it. That's what I needed."*

---

### 2.2 Danny's Field Review UAT — Observations

Danny ran through the full WS16-L UAT script (6 steps from Phase 17 WS17-L staging smoke test):

| Step | Action | Result |
|---|---|---|
| 1 | Mechanic documents discrepancy | Authorization queue populated correctly — Danny's coordinator view showed amber "Awaiting Review" badge immediately |
| 2 | Coordinator reviews and sends authorization request | Email dispatched to Mailtrap test inbox in ~38 seconds. WO status → `AUTHORIZATION_PENDING` |
| 3 | Mechanic tries to proceed (blocked) | Enforcement gate active — mechanic could not advance dependent task step |
| 4 | Customer receives email and approves | Portal loaded from token. Approval recorded within 25 seconds of customer click. Coordinator notification received |
| 5 | WO unlocks | Internal status recomputed to `WO_AUTH_CLEAR` in ~18 seconds. Mechanic could proceed |
| 6 | Audit trail retrieval | Full audit trail retrievable in single query. Danny confirmed: "This is what I'd print out and put in front of an owner if they disputed the invoice" |
| Bonus | Phone authorization path | Danny completed the assisted-phone path during the session. Record created with coordinator witness. |

---

### 2.3 Danny's Field Acceptance Statement

*"I ran through the full authorization flow during the staging session. The email is clear — with the 'call your coordinator' line Marcus added, I think most customers are going to be comfortable with it. The phone path is there and it works the way I'd want it to. The enforcement gate is real — I tested it, the mechanic couldn't advance the task. The audit trail is exactly what I'd need if an owner called me three months later disputing an invoice.*

*The one thing I want to say clearly: this doesn't replace the relationship. I'm still calling the customer, I'm still explaining what we found, I'm still being a person to them. The system handles the documentation so I don't have to chase a sticky note around the shop. That's the right division of labor.*

*I accept the authorization flow as designed. It matches how I handle customer authorization in practice, and it produces a record that I can actually use."*

**Danny Osei — WO Coordinator, Manassas VA**  
**SME Field Acceptance: CONFIRMED**  
**Date: 2026-02-22**

---

## 3. Signed Memo Text — DISC-AUTH-LIABILITY-MEMO-V1 (Final)

---

> **ATHELON INTERNAL POLICY DOCUMENT**  
> **Document ID:** DISC-AUTH-LIABILITY-MEMO-V1  
> **Version:** 1.0 — FINAL  
> **Subject:** Shop Liability Exposure on Unauthorized Maintenance Scope — What Constitutes Sufficient Authorization and What the Email Click-to-Approve Constitutes Legally  
> **Signed by:** Marcus Webb, Regulatory/Compliance  
> **Signature Date:** 2026-02-22  
> **Effective Date:** 2026-02-22 (effective upon signature; production gate removable after this date)

---

### §1. The Liability Conversation That Hadn't Happened

Athelon's current workflow for obtaining customer authorization on discovered discrepancies relies on coordinator phone calls, follow-up emails, and handwritten notes. When disputes arise, the shop's position is weak: "We called and the owner said yes" is not a legal defense. The owner can dispute it, and in the absence of documented evidence, the shop either eats the cost or faces a small claims action.

This memo establishes what documentation is required, what the proposed email click-to-approve mechanism constitutes legally, and what Marcus Webb will sign off on for production deployment.

---

### §2. Shop Liability Without Documented Authorization

**When a shop performs maintenance beyond the original scope without documented customer authorization:**

1. **Civil liability for repair cost:** The shop may be unable to collect payment for the additional work. Aircraft owners have successfully contested repair invoices in small claims and civil court where the shop could not produce documented authorization for scope expansions.

2. **Regulatory exposure (Part 43 / Part 145):** Under 14 CFR §91.403(a), the aircraft owner/operator is responsible for maintaining the aircraft in airworthy condition. A repair station performing maintenance without owner direction or authorization is operating outside the scope of the work agreement. An FAA investigation could characterize unauthorized scope expansion as a recordkeeping or compliance issue.

3. **Part 145.213 Work Order Authorization:** For maintenance that goes beyond the original work order scope, the owner's authorization is both a contractual and practical legal requirement. The absence of documentation creates an evidentiary void that favors the owner in any dispute.

4. **Insurance implications:** Some aviation insurance policies condition coverage on compliance with documented maintenance authorization procedures.

---

### §3. What Documentation Is Legally Sufficient

For authorization documentation to be legally sufficient under Athelon's policy, it must:

1. **Identify the specific discrepancy.** The authorization must reference the specific finding, not just "additional work."
2. **State the estimated cost range.** The customer must have been presented with a cost range or estimate and authorized in that context.
3. **Identify the authorizing party.** The authorization must come from the aircraft owner, the registered operator (if different), or a documented authorized agent. Corporate fleet managers and maintenance managers may act as authorized agents.
4. **Include a timestamp.** The authorization must be datable — before the work was performed.
5. **Be non-repudiable.** The documentation must be resistant to "I never approved that" claims.

---

### §4. What the Email Click-to-Approve Constitutes Legally

The proposed authorization flow presents the customer with a secure, personalized link. Clicking "Approve" records: timestamp, IP address, email identity, the customer's declared name and relationship to the aircraft, and the exact text of the authorization request that was presented (hash-verified).

**Marcus Webb's legal characterization:**

> *"An email click-to-approve mechanism, when properly implemented, meets the legal requirements of an electronic signature under 15 U.S.C. §7001 et seq. (the E-SIGN Act) and corresponding state UETA provisions, and is substantially more defensible than undocumented verbal authorization, provided: (a) the customer has an opportunity to review the authorization text before approving — the authorization text must be independently visible to the customer before the approval button is active; (b) the authorization text clearly states what is being approved and the cost range; (c) the click is logged with sufficient identity evidence (email address delivery + IP timestamp + Clerk session context); and (d) the customer had the option to decline or request clarification. This mechanism is legally adequate under the E-SIGN Act for the authorization purpose it serves."*

**What it is NOT:**
- Not a guarantee of payment (a separate collections action may still be required for non-payment disputes)
- Not a technical release authority or airworthiness determination — certificated personnel at the repair station retain all responsibilities for technical release and return-to-service
- Not a substitute for owner authorization for work materially changing scope post-authorization — if new findings change scope, re-authorization is required

**Marcus Webb's production gate:**

> *"I will sign off on deployment of this authorization flow when: (1) the authorization request template includes the required elements listed in §3; (2) the consent record schema captures IP, timestamp, email identity, declared name, relationship, and the exact rendered text of the authorization request (hash-verified); (3) the system re-requires authorization on material scope changes (cost delta > configured threshold or new safety-relevant findings); and (4) the assisted-phone path is not optional for production — coordinators who document verbal phone authorization must use the structured assisted-phone path in the system with a mandatory coordinator witness ID. Free-text notes in lieu of the assisted-phone path are prohibited."*

---

### §5. Assisted-Phone Path — Production Requirement

The assisted-phone path is a mandatory production requirement. When a customer authorizes by phone before clicking the email link:

1. The coordinator navigates to the authorization request in the system.
2. Selects "Record Phone Authorization."
3. The system captures: coordinator witness ID, timestamp, and the fact that authorization was received via phone rather than email link.
4. The consent record is created with `actorType: "coordinator"` and `witnessCoordinatorId` populated.
5. The email authorization link is voided (request transitions to `APPROVED`).

A free-text note in any other field is not a substitute for this path. Non-compliance with this requirement undermines the liability protection this memo establishes.

---

### §6. Code Reference

This policy is implemented in:
- `convex/mutations/discAuth.ts` — `requestCustomerAuthorization`, `recordCustomerAuthorization`
- `DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1"` constant — must match this Document ID
- `discAuthRequests.consentRecord.liabilityMemoRef` — must reference this Document ID

This memo's signature authorizes the removal of the `PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED` comment and the associated production gate from `requestCustomerAuthorization` and the email dispatch path. See §4 of WS18-D for explicit gate removal authorization.

---

### SIGNATURE BLOCK

```
Marcus Webb — Regulatory/Compliance
Document ID: DISC-AUTH-LIABILITY-MEMO-V1
Version: 1.0 — FINAL

Signature: Marcus Webb
Date: 2026-02-22

Witnessed by (DOM Delegate): Danny Osei, WO Coordinator, Manassas VA
Date: 2026-02-22
```

*This document is signed. The customer-facing authorization link and the `requestCustomerAuthorization` email dispatch path may be deployed to production. The code constant `DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1"` is verified to match this Document ID.*

---

## 4. Production Gate Removal Authorization

**By authority of the signed DISC-AUTH-LIABILITY-MEMO-V1 (§6 above), the following production gate is hereby authorized for removal:**

### Gate: `PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED` in `requestCustomerAuthorization` and email dispatch path

**Current state (as of Phase 17 deployment):**

```typescript
// convex/mutations/discAuth.ts
// PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED
// The following scheduler call dispatches the authorization email to the customer.
// This path is production-gated until DISC-AUTH-LIABILITY-MEMO-V1 is signed.
// In production, DISC_AUTH_EMAIL_DISPATCH_ENABLED must be "true" AND the memo signed.
// Without these, the scheduler call is skipped and no email is dispatched.
// See: phase-16-build/ws16-l-disc-auth-build.md §2

// await ctx.scheduler.runAfter(0, internal.discAuth.dispatchAuthorizationEmail, {
//   requestId,
//   notificationToken,
// });
// ^^ UNCOMMENT AFTER MEMO SIGNATURE
```

**Authorized actions:**

1. Remove the `// PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED` comment block.
2. Uncomment `await ctx.scheduler.runAfter(0, internal.discAuth.dispatchAuthorizationEmail, ...)` in `requestCustomerAuthorization`.
3. Set `DISC_AUTH_EMAIL_DISPATCH_ENABLED = "true"` in production environment configuration.
4. Deploy the customer-facing approval page (`/auth/[token]`) to production — this route is already built and was tested in staging (ST-08 in WS18-A).
5. Confirm `recordCustomerAuthorization` mutation is reachable from production-facing API calls (it was always present in the code; the gate was on the email dispatch that creates the token consumers, not on the record-authorization mutation itself).
6. Devraj Anand re-runs TC-L-01, TC-L-02, TC-L-07 in staging with `DISC_AUTH_EMAIL_DISPATCH_ENABLED = "true"` to confirm full end-to-end path works. Danny Osei re-runs his UAT with a live authorization email before production deployment.
7. Verify `DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1"` in code matches this Document ID.

**Authorization issued by:** Marcus Webb (signatory of DISC-AUTH-LIABILITY-MEMO-V1)  
**Date:** 2026-02-22  
**Confirmation required from:** Devraj Anand (staging re-verification) + Danny Osei (UAT re-run with live email) before flag is removed in production.

---

## 5. Status

**WS18-D STATUS: SIGNED**

DISC-AUTH-LIABILITY-MEMO-V1 is signed, witnessed, and effective as of 2026-02-22.

The `PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED` flag in `requestCustomerAuthorization` and the email dispatch path is authorized for removal pending Devraj's staging re-verification and Danny's UAT re-run.

**Next:** Devraj removes gate comment + enables email dispatch in staging → TC-L-01/02/07 re-run → Danny UAT with live email → production deployment of customer-facing authorization surface authorized.

---

*Filed: 2026-02-22 | Phase 18 — WS18-D DISC-AUTH-LIABILITY-MEMO-V1 Closure | Athelon v1.1*  
*Signatory: Marcus Webb, Regulatory/Compliance*  
*Field Reviewer: Danny Osei, WO Coordinator, Manassas VA*
