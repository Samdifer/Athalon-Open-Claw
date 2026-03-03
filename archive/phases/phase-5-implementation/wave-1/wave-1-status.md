# Wave 1 Status Report — MVP Build Sprint
**Author:** Rafael Mendoza, Tech Lead
**Date:** 2026-02-22
**Wave:** 1 (Infrastructure + Wiring)
**Sprint:** Phase 5 — Alpha MVP Build
**Status:** ⚠️ IN PROGRESS — Infrastructure not yet live; planning complete; execution begins today

---

## Preamble

I'm writing this at the end of Wave 1 planning, before we've executed any of the commands. The point of writing it now is so that when the team is heads-down executing, they have a reference for what "done" looks like and what success criteria we're measuring against. I'll update this in-place as we complete items.

I have read all six reference documents before producing Wave 1 deliverables. There are some things in here I want to flag for the team that go beyond "status" — specifically a few risks I haven't seen written down anywhere and want on the record. Those are in §5.

This report covers Wave 1 scope only. Wave 2 starts the day Jonas says the 8 verification checks in `convex-deployment-plan.md §5` are all green.

---

## Section 1: What Wave 1 Contains

Wave 1 is pure infrastructure and wiring. No new user-facing features. No new backend logic. The goal of Wave 1 is to get the team to a state where **Cilla can run all 43 tests, Chloe can see real data in the browser, and Gary and Linda can log in to staging**. That's the Wave 1 definition of done.

| Deliverable | Owner | Target | Notes |
|---|---|---|---|
| Convex projects created (`athelon-staging`, `athelon-prod`) | Jonas | Day 1 AM | Manual dashboard work — fastest step |
| Deploy keys created + stored in GitHub Actions secrets | Jonas | Day 1 AM | Prerequisite for CI |
| Clerk JWT template configured (staging) | Jonas | Day 1 AM | Prerequisite for auth chain |
| Clerk webhook configured (staging) | Jonas | Day 1 AM | Prerequisite for user sync |
| All Convex Dashboard env vars set (staging) | Jonas | Day 1 AM | |
| All Vercel env vars set (preview scope) | Jonas | Day 1 AM | |
| First manual deploy to `athelon-staging` | Jonas | Day 1 Noon | `npx convex deploy --yes` with staging key |
| All 8 verification checks green | Jonas | Day 1 EOD | See convex-deployment-plan.md §5 |
| `_generated/api.ts` generated + committed | Jonas (triggers; Chloe commits) | Day 1 EOD | Chloe needs this to start |
| Alpha test accounts created in staging Clerk | Jonas | Day 1 EOD | Gary + Linda + Troy proxy + Pat proxy |
| Work orders list page stub → real wiring | Chloe | Day 2 AM | One query call — 30 minutes |
| WO detail page built + wired | Chloe | Day 2-3 | New page, not just a wiring fix |
| Task card detail page built + wired | Chloe | Day 3 | New page |
| `PreSignatureSummary` component built | Chloe | Day 3-4 | See pre-signature-summary-component.md |
| Test import fixes applied | Cilla | Day 2 AM | Per Jonas's test-import-fix.md |
| 27+ tests running (workOrders + taskCards) | Cilla | Day 2 | After import fix |
| CI pipeline green on first PR | Jonas + all | Day 2 | All 6 jobs must pass |
| Gary and Linda staging access confirmed | Rafael | Day 2 | Rafael confirms they can log in |

---

## Section 2: Completed Items

*Updated in-place as items are completed.*

At time of this writing (Wave 1 planning complete, execution not yet started):

### Documents Produced ✅
- [x] `convex-deployment-plan.md` — Step-by-step Convex deployment guide (Jonas)
- [x] `frontend-wiring-plan.md` — All `{} as any` stubs mapped to real API calls (Chloe)
- [x] `pre-signature-summary-component.md` — Full spec for the #1 cross-cutting requirement (Chloe + Finn)
- [x] `wave-1-status.md` — This document (Rafael)

### Infrastructure ⬜ (not yet started)
- [ ] Convex projects created
- [ ] Deploy keys stored
- [ ] Clerk JWT template
- [ ] Clerk webhook
- [ ] Env vars (Convex dashboard + Vercel)
- [ ] First staging deploy
- [ ] 8 verification checks green

### Frontend ⬜ (blocked on infrastructure)
- [ ] `_generated/api.ts` generated
- [ ] Work orders list wired
- [ ] WO detail page built
- [ ] Task card detail page built
- [ ] `PreSignatureSummary` built

### QA ⬜ (Cilla — blocked on infrastructure)
- [ ] Import fixes applied (`workOrders.test.ts`, `taskCards.test.ts`)
- [ ] 27+ tests running
- [ ] CI green

---

## Section 3: Blocked Items

### Block 1: Everything is blocked on Jonas completing infrastructure

This is not a criticism — it's the correct architecture. Jonas owns the platform. The dependency graph is real: nothing in Wave 1 (and nothing in Wave 2 either) can proceed until `athelon-staging` is live and the 8 checks are green.

**Jonas's estimated time: 4–6 hours (Day 1 AM).**

If there are unexpected blockers (Clerk account issues, Convex plan limits, GitHub secret permission problems), Jonas needs to escalate to Rafael immediately. Every hour of slip here delays the entire sprint.

**Contingency plan if infrastructure takes more than 8 hours:**
- Chloe can build the WO detail page and task card detail page structures in parallel (without wiring — just layout and navigation)
- Cilla can apply the import fixes to the test files even without Convex running (the fixes are text changes, not dependent on a live Convex project)
- Rafael can document the alpha scenario seed data while Jonas finishes infrastructure

### Block 2: `signatureAuthEvents.create` endpoint needed for full TaskCardStep wiring

Chloe can wire the `useQuery` calls (list, detail, read-only) without any additional backend work. But the full sign-off flow in `TaskCardStep.tsx` requires `api.signatureAuthEvents.create` to be deployed. Per `mvp-scope.md` build sequence, this is Jonas's Task 3 (1 day, after Task 1 deploy). So the step signing end-to-end is Wave 2 work, not Wave 1.

**Wave 1 sign-off wiring scope:** Replace the `{} as any` stub with the real import. The component will still fail gracefully if the `signatureAuthEvents` endpoint isn't available yet — the error handling in `TaskCardStep.tsx` is already written.

### Block 3: `getPreSignatureSummary` query needs to be written (Wave 2 — Devraj)

The `PreSignatureSummary` component is specced in full and ready for implementation. But the Convex query it calls (`api.signOff.getPreSignatureSummary`) doesn't exist yet. This query is Wave 2 work (Devraj, alongside `signatureAuthEvents`).

**Wave 1 pre-signature work:** Chloe can build the full component structure, mock-wire the query, and get all unit tests passing with mock data. Real data arrives when Devraj ships the query in Wave 2.

### Block 4: Seed data for Gary and Linda's first session

I want Gary and Linda to see something meaningful when they log in, not an empty database. The seed script doesn't exist yet (Wave 2 — Devraj). Until it does, Jonas or I need to manually create a few records through the Convex dashboard data browser before the alpha test session.

**Mitigation:** I'll create the minimum manual seed (1 aircraft, 1 open work order with N12345) via the Convex dashboard data browser after Jonas confirms the 8 checks are green. This is not ideal — manual data entry in a production-like database is a bad habit — but it's better than Gary staring at an empty screen on his first session.

---

## Section 4: What Wave 2 Needs to Start

Wave 2 can start the moment Wave 1 is done. Here's exactly what Wave 2 depends on:

### Hard prerequisites (Wave 2 cannot start without these)

1. **`athelon-staging` live, 8 checks green** — Jonas delivers this in Wave 1
2. **`_generated/api.ts` committed** — Chloe commits this after Jonas's deploy
3. **Work orders list page wired** — Chloe delivers in Wave 1; Wave 2 WO detail builds on top of it
4. **27+ tests running in CI** — Cilla delivers in Wave 1; Wave 2 adds new tests to a passing suite
5. **CI pipeline green** — Jonas + all; Wave 2 merges are blocked on CI

### What Wave 2 delivers (preview, not a full spec)

| Task | Owner | Blocked By |
|---|---|---|
| `signatureAuthEvents.create` endpoint | Jonas | Wave 1 complete |
| SHA-256 signature hash (replace placeholder) | Devraj | Wave 1 complete |
| Schema changes: `pending_inspection`, `qcm_reviewed`, `customerFacingStatus` | Devraj | Wave 1 complete |
| `getPreSignatureSummary` query | Devraj | Wave 1 complete |
| Maintenance record creation mutation + UI | Devraj + Chloe | Wave 1 complete + signatureAuthEvents |
| Parts receiving flow (`pending_inspection` state) | Devraj | Schema change |
| Audit history UI component | Chloe | Wave 1 frontend wiring |
| QCM review mutation + dashboard indicator | Devraj + Chloe | Schema change |
| N-number normalization | Devraj | Wave 1 complete |
| Seed script for Gary and Linda's staging session | Devraj | Wave 1 complete |

Wave 2 is where the real alpha-blocking work happens. Wave 1 is the prerequisite. We should not confuse the two.

---

## Section 5: Risks I Want on the Record

These are things I've noticed in the reference documents that nobody has explicitly written down as risks. They're not blockers, but they should be watched.

### Risk 1: `convex/_generated/api.ts` git commit policy

I've specified in `frontend-wiring-plan.md §3` that `_generated/api.ts` should be committed to git. Not everyone does this — some teams gitignore it and regenerate on every CI run.

We need to commit it because:
1. `pnpm turbo typecheck` in CI cannot run without it (no live Convex connection available)
2. Chloe needs it locally to start wiring before Jonas finishes infrastructure (she can pull the committed version)
3. It's stable between runs on the same schema — not a source of noise

**The risk:** If the team accidentally starts generating different API files from different deployed schemas (dev vs. staging) and committing them, we'll get merge conflicts. The rule is: **only commit `_generated/api.ts` that was generated against the most recently deployed schema**. Jonas enforces this by making the schema deployment part of the CI flow, so the generated file in CI always reflects the deployed schema. If a local `_generated/api.ts` was generated from a personal dev schema with different functions, it should not be committed.

I'm going to write this into the PR checklist for the Convex schema diff GitHub Actions job.

### Risk 2: Staging data contamination before Gary and Linda's first session

Staging is a shared environment. When the team merges PRs to `main`, those deploys write test data to `athelon-staging`. Gary and Linda will see this data.

Most of it will be obviously test data ("test WO", "N00001", names like "Test Mechanic"). But some of it might be plausible-looking fake data that confuses them.

**Mitigation I'm putting in place:**
- Before Gary and Linda's first session, Jonas and I do a manual data audit of `athelon-staging` in the Convex dashboard data browser
- Any records that look confusing get deleted manually
- After alpha testing begins, the team uses a naming convention for test data: all test work order descriptions start with `[TEST]` so Gary and Linda can filter them out mentally

This is a temporary measure. The proper solution (per-PR Convex branch isolation) is Wave 3+.

### Risk 3: Clerk JWT claims must include `athelon_role` or role-gated UI fails silently

Chloe's `useOrgRole()` hook reads `athelon_role` from the Clerk JWT session claims. If the Clerk org metadata doesn't include this field, `athelon_role` is undefined, the role comes back as `null`, and every `can(...)` and `isAtLeast(...)` call returns false.

This means:
- Gary can't see the "New Work Order" button (it's gated to `supervisor+`)
- The WO list page shows the empty state CTA instead of real content
- No error is thrown — it just silently degrades

The fix is in Jonas's Wave 1 checklist — Step 4.4 in `convex-deployment-plan.md` covers setting org metadata for alpha test accounts. But I want to flag it here because it's exactly the kind of silent failure that would waste 2 hours of Gary's first session if we didn't catch it.

**Verification:** After creating Gary and Linda's accounts, have Jonas (or me) sign in as Gary, open the browser console, and run `JSON.parse(atob(document.cookie.split('__session=')[1]?.split('.')[1] || ''))` to inspect the JWT claims. `athelon_role` must be present. (Note: this is the dev Clerk JWT, not a production token — this debugging technique is fine for staging.)

### Risk 4: The `adCompliance.test.ts` file will fail to compile until Devraj ships the mutations

Per Jonas's `test-import-fix.md`, the 16 AD compliance tests are blocked on Devraj's implementations. Even after the import fix, they won't compile. CI's test job will fail.

**Options:**
1. Mark the AD compliance tests as `skip` in Wave 1 (`.skip` in Vitest) and un-skip them when Devraj delivers
2. Don't fix the imports until Devraj ships the mutations
3. Accept that `pnpm --filter convex run test:convex` will report a compile error on `adCompliance.test.ts`

I'm going with option 3 for now — accepting the known failure and tracking it explicitly. This keeps the test file visible in the test output (as a compile failure, not a hidden skip) and reminds the team it's pending. Cilla and Devraj need to be aligned on this: the test job failure on AD compliance tests is expected until Wave 2 delivers the mutations.

This will appear in the CI job summary as a test failure. We'll gate Wave 1 completion on "27+ of 43 tests passing" not "all tests passing." I'll note this in the PR description when we merge the import fixes.

### Risk 5: Gary and Linda are real users with real expectations

I want to say something that isn't in any of the technical documents. Gary and Linda are not alpha testers in the traditional software sense. They are running a real repair station. They signed up for this because they believe in the product and they trust us not to waste their time.

When we give them staging access, we need to be confident that the experience is stable enough to show the concept without embarrassing ourselves. "Stable enough" in this context means:
- The sign-in flow works without errors
- The work orders list shows data (even if it's seed data)
- The core signing ceremony (summary → PIN → confirmation) works end-to-end

We do not need to have parts management working. We do not need the audit history UI built. We need the primary loop (WO → task card → sign step → confirmation visible) to be solid.

My conservative estimate is that we can schedule Gary and Linda's first session at the end of Wave 2, not Wave 1. Wave 1 just gets them log-in credentials. Wave 2 gets them something to actually do.

Rafael to schedule that conversation with Gary after Wave 2 is complete.

---

## Section 6: Team Communication Plan for Wave 1

- **Jonas:** Slack-pings Rafael and Chloe in `#athelon-eng` when each major infra step completes. Ping on: (1) first deploy success, (2) all 8 checks green, (3) alpha accounts created.
- **Chloe:** Starts wiring the moment Jonas pings "8 checks green." PRs should be small — one PR per wired page. No WIP PRs that combine multiple pages.
- **Cilla:** Starts import fix work the moment Jonas pings "8 checks green." Can actually start the text changes earlier (they're known) — just can't verify they work until Convex is live.
- **Rafael:** Reviews all Wave 1 PRs within 4 hours of submission. No PR ages more than 24 hours without a review during Wave 1.
- **Daily check-in format:** 5 minutes, async in Slack `#athelon-eng`. Jonas posts infra status; Chloe posts frontend progress. Not a meeting.

**No Wave 2 work starts until Rafael explicitly says Wave 1 is done.** I know the temptation to get ahead — please resist it. Wave 2 depends on Wave 1 being solid, and a half-finished Wave 1 infrastructure under an in-progress Wave 2 frontend is the fastest way to create a week of debugging.

---

## Section 7: Definition of Done for Wave 1

These are the specific conditions I will check before closing Wave 1 and opening Wave 2. Each condition is binary — yes or no, no partial credit.

1. ✅ All 8 verification checks from `convex-deployment-plan.md §5` green
2. ✅ CI pipeline green on a merged PR (all 6 jobs pass: lint, typecheck, test, security, convex-schema-diff, deploy-preview)
3. ✅ 27+ tests passing in `pnpm --filter convex run test:convex` (16 work order + 11 task card; AD compliance known-fail is acceptable with documentation)
4. ✅ Work orders list page loads real data from Convex on staging with zero TypeScript errors
5. ✅ No `{} as any` stubs remaining in `apps/web/` pages or page-level components (grep clean)
6. ✅ Gary and Linda can log in to `https://staging.athelon.app` with their Clerk accounts
7. ✅ `PreSignatureSummary` component spec complete and unit tests written (implementation can be mock-wired; real Convex query is Wave 2)

When all 7 are true, I'll post "Wave 1 DONE" in `#athelon-eng` and follow up with the Wave 2 kickoff plan.

---

## Appendix: Reference Document Summary

For anyone joining the sprint mid-wave, the six documents I read before producing Wave 1 deliverables are:

| Document | What it Contains | Most Important Section for Wave 1 |
|---|---|---|
| `phase-5-mvp/mvp-scope.md` | Approved alpha scope, schema changes required, build sequence, definition of done | Build Sequence table (columns: Order, Task, Owner, Depends On) |
| `phase-5-mvp/requirements-synthesis.md` | 10 interview analysis, top 10 requirements, validation wins, scope recommendations | Theme 1 (Pre-Signature Summary) and Validation Wins table |
| `phase-4-implementation/infra/environment-setup.md` | All env vars, per-environment config, new developer setup, troubleshooting | §2 (Complete Variable Reference) and §3 (New Developer Setup) |
| `phase-4-implementation/infra/github-actions-ci.yml` | Full CI/CD pipeline definition | `deploy-staging` job and NOTES at bottom (required secrets list) |
| `phase-4-implementation/infra/test-import-fix.md` | Why 0/43 tests run, how to fix it, who does what | Summary table at the end (4 files × 3 columns) |
| `phase-3-implementation/web/README.md` | Phase 3 frontend components, patterns used, what's missing | "What's Missing Before Week 2" and "Stubs present" annotations |

---

*Rafael Mendoza — 2026-02-22*
*Wave 1 is the unsexy work. It's also the only work that matters right now. Everything the alpha users will ever see depends on Jonas making 8 green checks happen by end of Day 1.*
