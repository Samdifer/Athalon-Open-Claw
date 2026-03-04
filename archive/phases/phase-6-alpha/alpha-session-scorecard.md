# Alpha Session Scorecard
**Session:** Gary + Linda live alpha  
**Environment:** staging (`athelon-staging`)  
**Scoring model:** Pass/Fail + notes, operational not theoretical.

---

## 1) Overall Rubric

- **PASS** = all 8 hard pass criteria pass, and no unresolved hard blocker.
- **CONDITIONAL PASS** = hard pass criteria pass with non-blocking findings requiring follow-up.
- **FAIL** = any hard pass criterion fails or any hard blocker unresolved.

Record one line per checkpoint: `PASS | FAIL | NOTES`.

---

## 2) 11-Step Scenario Scoring Grid

| Step | Actor | Checkpoint | Result (P/F) | Notes / Evidence ID |
|---|---|---|---|---|
| 1 | Gary | Creates WO for N1234A with correct initial fields |  |  |
| 2 | Gary | Opens WO, enters TT, status transitions correctly |  |  |
| 3 | Troy | Creates task card (5 steps, step 5 IA-required) |  |  |
| 4a | Troy | Completes/signs steps 1–4 via PIN flow |  |  |
| 4b | Pat proxy | IA-required step signs successfully with current IA |  |  |
| 5 | Troy | Creates maintenance record, references TW-2847, signs |  |  |
| 6 | Troy/Cilla obs. | Pre-signature summary complete and correct before sign |  |  |
| 7 | Troy | Sign action completes; audit trail entry present |  |  |
| 8 | Pat proxy | Inspection record path succeeds (or documented fallback) |  |  |
| 10 | Gary | Close readiness report all required checks green |  |  |
| 11 | Gary | Authorizes RTS; aircraft flips to Airworthy; WO closes |  |  |
| 9 | Linda | Post-close QCM review created and signed |  |  |

---

## 3) Hard Pass Criteria (8)

| ID | Hard Criterion | Result (P/F) | Notes / Evidence ID |
|---|---|---|---|
| HP-01 | Gary can complete create/open WO flow without hands-on operator takeover |  |  |
| HP-02 | IA-required control works: non-IA blocked, Pat IA accepted with current status |  |  |
| HP-03 | Pre-signature summary displays correct N1234A/WO/cert context before signing |  |  |
| HP-04 | Maintenance record signing path enforces structured approved-data + minimum work description |  |  |
| HP-05 | Close readiness accurately reflects readiness (no false green or false red at final state) |  |  |
| HP-06 | RTS action changes aircraft to `airworthy` and closes WO with consistent state |  |  |
| HP-07 | Linda can perform QCM review only post-close (INV-24/25 behavior intact) |  |  |
| HP-08 | Auditability complete: signature auth events, signature hashes, and key audit events present |  |  |

---

## 4) Hard Blocker Check (8)

Mark any triggered blocker:

| Blocker ID | Triggered? (Y/N) | Notes |
|---|---|---|
| HB-01 signature hash placeholder/invalid |  |  |
| HB-02 IA currency invariant breach |  |  |
| HB-03 close-readiness false block after valid completion |  |  |
| HB-04 RTS success without aircraft state transition |  |  |
| HB-05 QCM review allowed before WO close |  |  |
| HB-06 unrecoverable session drop/partial signature corruption |  |  |
| HB-07 signature auth event misuse accepted |  |  |
| HB-08 unstructured approved-data allowed in final sign/close path |  |  |

**If any = Y, overall score cannot be PASS.**

---

## 5) Time & Friction Notes

- Step sign-off timing (<30s target): ____________________
- Major hesitation points observed: ____________________
- Did users reach for paper/spreadsheet fallback? ____________________

---

## 6) Feedback Sections

## Gary Feedback (DOM)
- What felt trustworthy:
- What felt risky/confusing:
- Would he run this on a real aircraft tomorrow (Y/N + why):
- Verbatim quotes:

## Linda Feedback (QCM)
- QCM review adequacy vs real workflow:
- Findings documentation confidence:
- What must change before routine use:
- Verbatim quotes:

## Cilla Findings (QA)
- Pass/fail summary by step:
- Defects found (ID, severity, owner):
- UX friction findings:
- Recommended retest scope:

## Marcus Compliance Notes
- Invariant/regulatory concerns observed:
- Audit evidence sufficiency:
- Required corrective actions before broader rollout:
- Compliance sign-off status: Approved / Conditional / Blocked

---

## 7) Final Session Decision

- **Overall:** PASS / CONDITIONAL PASS / FAIL
- **Reason:**
- **Required actions + owners + due dates:**
  1.
  2.
  3.
- **Sign-offs:**
  - Gary (acknowledged): __________
  - Linda (acknowledged): __________
  - Cilla (QA): __________
  - Jonas (Platform): __________
  - Marcus (Compliance): __________
