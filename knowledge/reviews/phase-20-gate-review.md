# Phase 20 Gate Review — P5 Activation, Second Shop, Offline Scoping

**Date:** 2026-02-23  
**Gate Authority:** Phase Review Board  
**Artifacts reviewed:** WS20-A, WS20-B, WS20-C, WS20-D, dispatch-19, dispatch-20

---

## Verdict: GO

All five Phase 20 workstreams are complete. No production blockers. One non-blocking deficiency (FR-007) backlogged appropriately. Second shop authorized. Offline scoping has a credible 3-week execution path. Phase 21 is authorized.

---

## P5 Activation Assessment

**Verdict: PASS — all three features live**

| Feature | Memo / Gate | Marcus Sign-off | Production Deploy | Smoke Tests |
|---|---|---|---|---|
| Test Equipment Traceability | CAL-POLICY-MEMO-V1 | ✅ 00:05Z | ✅ 00:11Z | 3/3 PASS |
| Discrepancy Customer Auth | DISC-AUTH-LIABILITY-MEMO-V1 | ✅ 00:18Z | ✅ 00:24Z | 3/3 PASS |
| Customer Portal | Architecture gate | ✅ 00:29Z | ✅ 00:33Z | 3/3 PASS |

All three features cleared their memo gates, received Marcus co-sign with explicit compliance citations, and passed Cilla's 3-test smoke suite in production. Deployment sequence was clean: flag removal only, no schema migrations, zero downtime.

**Marcus sign-off quality:** High. Sign-offs were time-stamped, specific, and conditional in the right ways — he flagged the portal's silent expiry default as FR-007 (UX deficiency, not a compliance issue) and kept it non-blocking. Liability language verbatim-match confirmation on the discrepancy auth is exactly the kind of precision the earlier memo process was designed to produce.

**One outstanding item:** FR-007 — portal invite expiry UI doesn't surface the 90-day backend default when "never" is selected. Backend behavior is correct and safe. UI feedback gap is backlogged. Non-blocking for Phase 21.

**P4 gate prerequisite (72h stability):** Confirmed 2026-02-22T23:00Z. Prerequisite satisfied before any P5 flags were removed.

---

## Second Shop Assessment

**Verdict: GO — onboarding authorized for 2026-03-02**

**Candidate:** High Desert MRO, Prescott AZ. Bill Reardon, DOM, 22 years. Part 145. 6 certificated personnel. Single-engine piston + light twin (Baron, Seneca). Current system: three-version Excel file with known divergence. Source of candidate: Carla referral at IA renewal seminar.

**Onboarding plan soundness:** Sound. The 10-day plan (vs. 5-day for Skyline) is correctly sized to the additional complexity — 6 personnel vs. 3, team walkthrough added on Day 3, first live LLP record update built into Week 2. Sandra Chen (coordinator) identified as the key early adopter; her spreadsheet background makes her a likely fast adapter. Day 4 "run independently" protocol inherited from the Skyline playbook.

**LLP risk — acknowledged and addressed:** Rosa Eaton's framing is correct and load-bearing: the LLP dashboard is infrastructure for Bill's shop, not a feature. The three-version Excel problem means the cycle counts are unverified. Rosa's recommendation — Day 1 LLP baseline audit, build Convex records from verified numbers rather than importing the Excel — is the right call. Importing bad baseline data would erode trust before the product has a chance to earn it.

**Condition:** Rosa Eaton must personally lead the Day 1 LLP baseline audit. This is the highest-risk moment in the onboarding. Delegating it increases the probability of a wrong baseline, which is a worse outcome than a longer onboarding. This condition is already in Nadia's recommendation memo; the board affirms it.

**No additional conditions.** Onboarding plan is executable as filed.

---

## P6 Offline Scoping Assessment

**Verdict: CREDIBLE — proceed to device matrix execution**

**Lead:** Tanya Birch. Supporting: Jonas Harker (CDN), Devraj Anand (Convex sync layer).

**Device matrix:**
- iPad 10th Gen (Skyline's current fleet — primary validation target)
- Samsung Galaxy Tab A8 (High Desert MRO — Bill's preference; onboarding coincides with matrix Week 2)
- iPhone 14 (Troy Weaver's floor device; mobile form factor coverage)

**Test plan completeness:** Strong. Four structured scenarios (planned drop, mid-signature drop, extended 2.5h offline, reconnect conflict), plus 4-hour trust window verification at 30m/3.5h/4.0h/4.1h intervals, plus per-item queue confirmation, plus conflict detection. Conflict resolution architecture (optimistic version tokens) is a natural extension of existing Convex mutation logic — not a new system bolted on.

**iOS/Android platform split:** Appropriate and honest. Tanya's assessment of iOS Safari's service worker lifecycle limitations is accurate — background sync is unreliable, so foreground-only sync on iOS is the correct conservative choice. Android Chrome's background sync availability allows a more seamless reconnect experience. The `SyncManager` interface abstraction keeps conflict detection and queue confirmation logic identical across platforms, which is the right architectural discipline. The UI difference (iOS requires user to open app to trigger sync prompt; Android prompts nearly instantly) is a real UX delta that Bill's shop should understand at onboarding.

**Jonas's CDN strategy:** Solid. Versioned asset manifest + content-hashed filenames + 5-minute shop-specific offline bundle refresh is the right approach. The storage quota pruning fallback (30 days → 7 days when device storage < 50MB) degrades gracefully and avoids the failure mode Jonas correctly identifies as worst-case (offline mode starts, data is missing).

**Three-week timeline:** Achievable if Week 1 iPad testing surfaces no structural issues. Tanya's stated policy — no partial rollout, offline ships when it's right on all three devices — is the correct discipline.

**P6 activation gate (6 conditions):** All 6 are well-formed. Troy Weaver's live offline walkthrough sign-off is particularly important — the 4-hour trust window spec was built around his SME input and his sign-off closes the loop.

**No changes recommended to scoping plan.** Execute as filed.

---

## Miles Beaumont — Dispatch Quality Check

**Verdict: Both dispatches earn their place. Dispatch-20 is appropriately different from dispatch-19, not lesser.**

**Dispatch-19 (The First Work Order):** Exceptional. This is the most comprehensive document in the Phase 20 artifact set. The field reporting — Dave's workflow absorption, Ellen's 15-second pause, Carla's PDF check she didn't perform — captures behavioral evidence that no internal test report could produce. The "On Honesty" section in §IX earns the dispatch's place in the permanent record: Miles names the Phase 9 race condition and the thin Phase 11–12 regulatory artifacts directly and draws the causal line to what made February 23rd trustworthy. That's not promotional writing. It's accountability writing. Marcus's single unqualified line is the most credible external validation in the Athelon record.

**Dispatch-20 (The Second Shop):** Shorter, structurally different, and correctly so. This is a business story, not a technical event story — the moment the product became word-of-mouth. Miles's structural clarity on what a demo cannot do vs. what a peer's judgment can do is analytically sound. The framing of Bill's onboarding challenge (LLP dashboard is infrastructure) and Carla's shop vs. Bill's shop as proof-of-concept vs. proof-of-depth is accurate to the facts in WS20-C.

**Is dispatch-20 as honest as dispatch-19?** Yes, within its scope. It doesn't editorialize about failure history (there's no comparable failure to name), but it doesn't oversell either. "The product passed that test" is the right calibration. The final line — "Carla wasn't trying to sell anything. She was just talking about Tuesday" — is honest and earns the emotional register it reaches for.

**One observation for the record:** Dispatch-20 is thinner because the story is thinner, not because Miles pulled punches. The second shop story has not yet happened. The depth dispatch will be dispatch-21 or later, after Bill Reardon's LLP baseline is audited and his first live RTS is signed. That dispatch will be worth waiting for.

---

## Phase 21 Authorization

**Phase 21 is authorized.** Three parallel execution tracks:

**Track 1 — Bill Reardon onboarding (begins 2026-03-02)**
Day 1 LLP baseline audit with Rosa Eaton on-site. 10-day plan per WS20-C. First live RTS on Athelon targeted by Day 10 (week of 2026-03-09). Nadia primary owner; Rosa owns Days 1–2 specifically.

**Track 2 — Offline device matrix execution (begins 2026-02-23)**
Tanya runs iPad matrix Week 1, Android/iPhone matrix Week 2, edge case closure Week 3. P6 activation decision week of 2026-03-16. Jonas CDN validation runs in parallel.

**Track 3 — v1.2 backlog prioritization**
NPS/feedback data from Skyline (post-P1 dispatch-19 field observations) feeds the v1.2 backlog. FR-007 (portal expiry UI feedback) is already filed. Dave's native app request and the certification statement scroll behavior (Ellen's note) should be evaluated in v1.2 scoping.

---

## Monday Actions (2026-02-23)

1. **Nadia Solis** — Confirm March 2 onboarding date with Bill Reardon; lock Rosa Eaton for Day 1 LLP audit; distribute 10-day onboarding plan to full High Desert team by EOD.
2. **Tanya Birch** — Begin iPad 10th gen device setup and connectivity drop Scenario A; document baseline in device matrix report.
3. **Devraj Anand** — File FR-007 in the product backlog with portal expiry UI spec; confirm no P5 production anomalies in post-deploy monitoring (first 48h).
4. **Marcus Webb** — Confirm compliance watch period for P5 features is open; expected to clear by 2026-02-25 absent production incidents.
5. **Nadia Solis** — Open v1.2 backlog prioritization session with team; bring Carla's field observations from dispatch-19 (parts receipt prominence, certification statement scroll, native app signal from Dave) as primary input.

---

## Final Ruling

**PHASE 20: GO**

All workstreams delivered. The three memo-gated features are live and smoke-tested. The pre-second-shop fixes were shipped and Carla-accepted before any new shop saw the product. The second shop candidate is sound, the onboarding plan is executable, and the LLP risk is acknowledged with a specific mitigation (Rosa on-site Day 1). The offline scoping is credible and disciplined. The dispatch record is honest.

The signal that matters most in Phase 20 is not technical: it's Carla calling Bill. That is the product passing a test no engineering team can design for. Phase 21 proceeds.

**Phase 21 authorized. Onboarding begins 2026-03-02. Offline matrix underway.**

---

*Gate review filed: 2026-02-23T00:44:00Z*  
*Review Board — Phase 20 Gate Review*
