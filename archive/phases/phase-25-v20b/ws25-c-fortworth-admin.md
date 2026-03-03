# WS25-C — Fort Worth Helicopter MRO: Administrative Onboarding
**Filed:** 2026-02-23T01:41:00Z
**Owner:** Nadia Solis (onboarding), Marcus Webb (compliance assessment), Rosa Eaton (field contact), Sandra Okafor (DOM, Lone Star Rotorcraft)
**Status: ✅ ADMINISTRATIVE ONBOARDING COMPLETE — COMPLIANCE SURFACE DEFERRED**

---

## Shop Profile

**Name:** Lone Star Rotorcraft  
**Location:** Fort Worth, TX  
**DOM:** Sandra Okafor  
**DOM Background:** 19 years in helicopter maintenance. Robinson R44 and Bell 206 primary fleet. Previously: line mechanic at a Bell authorized service center in Dallas (7 years), then shop lead (4 years), then DOM (last 8 years) at Lone Star. First-generation DOM — built the shop's maintenance program from scratch when the previous owner retired.  
**Fleet:** Robinson R44 Cabriolet (3 aircraft), Bell 206B JetRanger (2 aircraft), one R22 used for flight training partnership  
**Certificate:** Part 135 Air Carrier Certificate (helicopter tours and air taxi — Forth Worth regional)  
**How she found Athelon:** She read dispatch-24 — Frank's dispatch. She knows Frank Nguyen from an FSDO liaison committee they've both served on for the last three years. Frank has mentioned Athelon to her twice in passing. When she read the dispatch about a DER filing a formal bug report, she decided to look into it.

---

## Pre-Onboarding Call

**Date:** 2026-02-23  
**Participants:** Nadia Solis, Marcus Webb, Sandra Okafor  
**Format:** Video call, 90 minutes

Nadia opened. Standard introduction: what Athelon is, where it came from (three shops, one year in production, Part 145 repair stations and a Part 135 operator), why they were talking to helicopter shops now (Phase 25, Fort Worth inbound interest).

Then Marcus took over for the scope discussion. This was the part Nadia had prepped him for: be exact. Don't oversell. Sandra has 19 years. She will know if you're overselling.

---

### What Athelon Covers Today (Marcus's Statement)

Marcus went through the capability list without apology and without hedging on the gaps:

**Covered, works today, no helicopter-specific gaps:**
- Work order structure: aircraft-agnostic. Works for R44 and Bell 206 the same as it works for a Cessna 172 or a King Air.
- Task card execution: mechanics open tasks, log time, document findings, close tasks. No rotorcraft-specific gaps.
- Parts traceability: 8130-3 OCR on receiving, parts tied to work orders and aircraft records. Works for helicopter parts the same as fixed-wing.
- Sign-off and RTS flow (§43.7 / §43.9): the regulatory requirements for record content are the same for Part 27 helicopters as for Part 23 aircraft. The IA re-authentication at signature works for helicopter IAs the same way it works for fixed-wing IAs.
- Personnel compliance: IA expiry tracking, qualification alerts. No rotorcraft-specific gaps.
- DOM dashboard: works for any org type.
- Photo attachments: works for any aircraft.
- Customer portal: Part 135 cert holder separation, pilot portal — all live as of this week.

**Not covered yet — helicopter-specific gaps:**

Marcus did not soften this part. He went through it the same way he'd go through a compliance matrix.

*AD compliance module:* "We cover ADs in the FAA AD database. For Bell, that misses mandatory service instructions that are not incorporated by reference into a FAA AD. Bell mandatory SIs that live outside the AD feed are not in our module. If you use our AD compliance module for Bell work and rely on it exclusively, you will miss mandatory Bell maintenance items. This is not a future problem — it is a present-tense gap. We are planning a supplemental service instruction tracking layer for Phase 26. It doesn't exist today."

*LLP dashboard:* "We have an LLP life accumulation engine. It handles hours, cycles, and date-based limits. It handles event-based triggers. Architecturally, it is compatible with Robinson ALS requirements. What I have not done is sit down with a Robinson-qualified IA and validate the field mapping for R44 ALS components. Until that validation is complete, I will not represent the LLP dashboard as a Robinson ALS compliance tool. You should not use it as one."

*Dynamic component retirement:* "Blade strike tracking, overspeed retirement triggers, pitch link retirement with event-based triggers — these are configured but not Robinson-validated. Same issue as the LLP dashboard. Correct architecture, unvalidated field mapping."

*Bell SI gap:* Already stated above.

*Part 27 regulatory citation templates:* "Our pre-loaded templates use Part 23 regulatory citations. We have not built out Part 27 citation templates. For a helicopter shop doing a Form 337, you would enter the Part 27 citations manually. Not a hard block, but not pre-loaded either."

Marcus finished: "You can use Lone Star Rotorcraft's work on Athelon today for administrative purposes — work orders, task cards, sign-offs, parts traceability. The things that are aircraft-agnostic. The compliance-surface features for helicopter-specific regulatory requirements are either gapped or unvalidated. I don't want you to discover that in an FSDO audit. So I'm telling you now."

---

### Sandra's Reaction

There was a pause after Marcus finished. Nadia had learned to read that pause in sales calls. It could go either direction.

Sandra said: "Okay. I appreciate that."

Another beat. Then: "You want to know how rare it is that a vendor tells me what they can't do? I have sat through thirty product demonstrations in the last eight years. Every single one of them told me they covered everything I needed. Every single one. Three of those turned into contracts. Two of those I had to cancel because I found gaps after I'd already migrated data."

"The Bell SI gap — I know that gap. I've known that gap exists in every piece of software I've evaluated. Nobody has ever named it to me in a pre-sales call. You're the first."

She wasn't sold yet. But she was listening differently.

Nadia: "So what are you thinking?"

Sandra: "I'm thinking I can use what you have today. The administrative side — work orders, parts, sign-offs. That's actually most of my documentation pain right now. The compliance-surface stuff I can keep doing in my existing spreadsheet until you get the Robinson validation done."

"I want to be part of the validation when you do it. I have two Robinson-qualified IAs on staff. One of them has been doing R44 annuals for twelve years. He knows every item on that ALS."

Marcus: "That's exactly what I need."

---

### What They Agreed To

1. **Sandra onboards on Part 91 administrative work only.** Work orders, task cards, sign-offs, parts traceability. No compliance-surface features enabled. The AD compliance module is disabled for Lone Star Rotorcraft's org until Marcus completes the Robinson IA validation audit.

2. **Compliance-surface helicopter features deferred.** Dynamic component tracking, Bell SI tracking, Robinson IA audit — all deferred until Marcus completes the Part 27 scope build. Marcus's estimate: Robinson ALS field mapping validation, 3–4 weeks. Bell SI supplemental tracking layer, Phase 26.

3. **Sandra's Robinson-qualified IA will participate in the validation.** Marcus will contact him directly for the field mapping review. His name is Tobias Ferreira. He has been doing R44 work since 2013.

4. **No compliance claims until validated.** Lone Star Rotorcraft's DOM is on record that she understands Athelon's current helicopter scope limitations. This is documented in this onboarding record and signed off by Marcus.

---

### Sandra's One Contribution on the Call

Near the end of the call, Sandra raised something Marcus had not mentioned. She asked whether the LLP dashboard handled the Robinson R44 main rotor blade retention bolt airworthiness limitation correctly.

Marcus said he wasn't sure which specific item she meant.

Sandra: "Most MRO software tracks the main rotor blade retention bolts as an AD item. It's not an AD. It's an Airworthiness Limitations item in the RFM — Section 4, paragraph 4.3. Mandatory replacement per the ALS, not per an AD. If your software is looking for an AD number on those bolts, it won't find one. And it won't flag them. And the shop will miss a mandatory replacement."

Marcus wrote this down. Not in a system — literally wrote it on paper. Nadia watched him do it.

Marcus: "That's exactly the kind of thing the field mapping validation needs to catch. I'm putting that in the Robinson ALS audit list right now."

Sandra: "That's the first one I always check. If a vendor gets that wrong, the rest of the review is shorter."

It didn't come up again, but it was clear: she had just run a test. Marcus had passed it.

---

## Administrative Onboarding Executed

Lone Star Rotorcraft org created in Athelon production. Sandra Okafor set as DOM. Work order templates loaded (generic, aircraft-agnostic). Personnel records: Sandra (DOM), Tobias Ferreira (Robinson-qualified IA), two additional A&P mechanics. Fleet: R44 × 3, Bell 206B × 2, R22 × 1 — aircraft records entered without LLP baseline (deferred pending Robinson IA validation).

**First work order:** Sandra creates WO-LSR-001 herself, a Bell 206B rotor head inspection. Standard work order structure. Task cards, parts, sign-offs. Works without modification.

Her comment at the end of Day 1 admin setup: "It's not complicated to use. That's actually harder to achieve than it looks."

---

## Outstanding Actions (Deferred)

| Action | Owner | Timeline | Gate |
|---|---|---|---|
| Robinson ALS field mapping validation | Marcus + Tobias Ferreira (Lone Star IA) | 3–4 weeks post-call | Required before LLP dashboard enabled for LSR |
| Bell SI supplemental tracking design | Marcus + Devraj | Phase 26 | Required before AD compliance module enabled for Bell work |
| Part 27 citation templates | Marcus (data entry) | Post-Robinson audit | Required before Form 337 workflow is pre-loaded for rotorcraft |
| Full compliance surface onboarding | Marcus + Sandra | Phase 26 | After all above complete |

---

## Status: ✅ ADMINISTRATIVE ONBOARDING COMPLETE — COMPLIANCE SURFACE DEFERRED

Lone Star Rotorcraft is live on Athelon for administrative work. Compliance-surface features disabled pending Marcus's Part 27 audit. Sandra Okafor understands and has acknowledged the scope boundaries in writing. Robinson ALS blade retention bolt gap logged for validation. Tobias Ferreira (Robinson-qualified IA) scheduled for field mapping review.
