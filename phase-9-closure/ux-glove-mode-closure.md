# Phase 9 Closure — Glove-Mode High-Stakes CTA Reliability

**Owners:** Finn (UX), Chloe (Frontend), Tanya (Qualification/Ops)  
**Date:** 2026-02-22  
**Scope:** Close Phase 8 FAIL `C-UX-03` for high-stakes sign actions (PreSignatureSummary + sign/submit modal flows).

---

## 1) Root cause analysis of Phase 8 FAIL

Phase 8 failed `C-UX-03` because critical sign-path CTAs were *present* but not consistently *actuated* under glove-mode + keyboard/open-layout transitions.

### Observed failure signatures
1. **Second-tap dependency on sticky footer primary CTA** (`Proceed to Sign`) in iPad portrait glove-profile.
2. **CTA collision/occlusion risk** in narrow tablet width during keyboard-open transitions (notes input + submit region).

### Contributing causes (from implementation)
1. **Target size meets minimum but lacks protected hit envelope**
   - Buttons are `h-16` (64px) and compliant in isolation.
   - In high-density footer/modal contexts, adjacent actionable regions remain close enough that imprecise gloved taps can land on boundary/neighbor controls.

2. **No tap guard/debounce on high-stakes action trigger path**
   - `onClick={proceedEnabled ? onProceed : undefined}` executes immediately once enabled.
   - No short dedupe window to reject rapid duplicate taps or touch jitter.

3. **Accidental-tap prevention exists only as time delay, not intent confirmation**
   - Current 2s delay blocks immediate activation after render, but once elapsed, a single incidental tap can still trigger high-stakes transition.

4. **Keyboard-open layout safety is not explicitly enforced for action row**
   - Modal uses fixed max-height and overflow regions, but there is no explicit “CTA must remain fully visible + separable” guard during virtual keyboard transitions.

### Root cause statement
**Primary failure root cause:** The sign flow relies on standard click semantics with minimal intent confirmation and no explicit keyboard-state action-zone protection; this is insufficient for gloved, low-precision touch conditions on high-stakes CTAs.

---

## 2) Required UI/interaction fixes

## A. Target sizes + spacing (high-stakes controls)
1. Keep minimum 64px height, but increase to **72px** for primary high-stakes CTA (`Proceed to Sign`, `Sign & Submit`).
2. Enforce **minimum 12px vertical and horizontal separation** between sibling CTA hit zones.
3. Add **8px inert padding shield** around primary CTA container (non-interactive area) to reduce edge-miss activation.
4. In modal/footer stacks, prohibit adjacent destructive/exit control from sharing immediate edge with primary action.

## B. Debounce / duplicate-trigger hardening
1. Add **350ms client-side action debounce** on high-stakes CTA handlers.
2. Add **single-flight lock** (`isSubmitting` / `isTransitioning`) so additional taps are ignored until transition resolves.
3. Ensure visual state change within <100ms (pressed/loading) to confirm accepted input and prevent re-tapping.

## C. Confirmation semantics (intent over accidental touch)
1. Replace single-tap finalization for high-stakes sign transitions with **two-step confirm pattern**:
   - Step 1: `Proceed to Sign`
   - Step 2 (same surface): `Confirm Proceed` (explicit stateful confirmation, 3s expiry)
2. Alternative allowed only if workflow constraints demand: **press-and-hold 600ms** on final action.
3. Preserve legal text context during confirmation state (no modal context switch that hides what is being certified).

## D. Accidental tap prevention
1. Keep existing 2s review delay.
2. Add **tap-up inside same target validation** (reject gesture if down/up points cross boundary beyond tolerance).
3. Add **safe-area + keyboard-aware footer offset**:
   - On keyboard open, action row must remain fully visible and not overlap editable fields.
   - If space is constrained, pin CTA row and move content scroll region only.
4. Prevent background scroll/shift from moving CTA between touch-down and touch-up.

---

## 3) Replay test plan (qualification rerun)

Minimum: **5 runs**, no facilitator intervention.

## Test matrix
- Devices/orientations:
  1. iPad portrait (glove profile)
  2. iPad landscape (glove profile)
  3. Narrow tablet width (split/compact viewport) + keyboard open
  4. Standard touch profile sanity run
  5. Stress run with rapid taps/jitter simulation

## Per-run procedure
1. Open PreSignatureSummary with valid signable record.
2. Wait for anti-accidental delay completion.
3. Attempt primary CTA with gloved-tap profile.
4. Trigger notes/keyboard transition where applicable.
5. Complete confirmation step and continue to sign transition.
6. Attempt duplicate tap burst during transition.

## Expected pass criteria (all required)
1. **First deliberate tap success rate ≥ 99%** on primary CTA across runs (no systematic second-tap requirement).
2. **Zero accidental transitions** from incidental/edge taps.
3. **Zero duplicate state transitions/submissions** under rapid tapping.
4. **CTA fully visible and actionable 100% of time** during keyboard-open states.
5. **No control collision** (wrong control activation) in any run.

## Run-count acceptance gate
- Pass only if **5/5 runs PASS** with all criteria met.
- Any single critical miss (blocked sign action, accidental sign progression, occluded CTA) = **FAIL / rework required**.

---

## 4) Before/after decision table

| Dimension | Before (Phase 8 FAIL state) | After (Phase 9 fix target) | Decision impact |
|---|---|---|---|
| Primary CTA hit reliability | Intermittent second-tap need in glove profile | First deliberate tap reliably actuates | Removes critical execution ambiguity |
| High-stakes trigger semantics | Single-tap after 2s delay | Two-step confirm (or hold-to-confirm) | Reduces incidental sign progression |
| Duplicate tap handling | No explicit debounce/single-flight in CTA path | 350ms debounce + transition lock | Prevents duplicate actions/submits |
| Keyboard-open narrow layout | CTA collision/visibility risk observed | Keyboard-aware pinned action row; no overlap | Eliminates blocked/occluded critical action |
| Accidental edge taps | Boundary ambiguity in dense footer/modal regions | Enlarged target + inert shield + spacing guard | Lowers wrong-target activation risk |

---

## 5) Final closure verdict recommendation

**Recommendation: CONDITIONAL PASS pending replay evidence, then close as PASS.**

Rationale:
- Root cause is clear and implementation-bounded (interaction semantics + layout guards), not systemic architecture failure.
- Fixes are concrete and testable with deterministic pass/fail criteria.
- Closure should be upgraded from Phase 8 FAIL to final PASS only after successful **5/5 glove-mode replay** with zero critical misses.

If replay misses any critical criterion, retain **FAIL** and block release of high-stakes mobile sign actions until corrected.
