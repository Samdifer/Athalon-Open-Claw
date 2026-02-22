# Phase 9 Closure — Integrity Lock CI Traceability Closure
**Date:** 2026-02-22 (UTC)  
**Owner:** Integrity Governance (Phase 9 Closure)  
**Scope:** Close Phase 8 caveat: make integrity lock audit traceability explicit from policy control -> CI job -> evidence artifact.

---

## 1) Closure objective and disposition

Phase 8 caveat (from gate review): integrity lock is active, but CI job-level traceability is not explicit enough for one-step audit lookup.

This closure defines and operationalizes an exact traceability contract so an auditor can:
1. Start from a policy control ID,
2. Resolve to an unambiguous CI job ID,
3. Retrieve deterministic run evidence/artifacts,
4. Confirm blocked-promotion behavior when control fails.

**Closure position:** caveat can be closed once workflow naming changes below are implemented and one blocked-promotion demonstration run is archived with the required evidence pointers.

---

## 2) Exact naming/traceability contract (Policy -> CI Job -> Artifact)

## 2.1 Contract format (normative)

Each integrity control MUST map to:
- **Policy Control ID** (authoritative control namespace),
- **CI Workflow Job ID** (GitHub Actions YAML `jobs.<id>`),
- **Evidence Artifact Pointer** (run URL + artifact/log path),
- **Decision Outcome** (`PASS` / `FAIL` / `BLOCKED_PROMOTION`).

Canonical trace key:

`<release_id>::<control_id>::<workflow_name>::<job_id>::<run_id>`

Example:

`REL-2026-02-22.3::I-001-CANONICAL-HASH-ORDER::CI / CD::integrity-contract-lock::12933477122`

## 2.2 Control mapping table (practical baseline)

| Policy Control ID | Required CI Job ID | Current/Proposed | Minimum Evidence Artifact |
|---|---|---|---|
| I-001-CANONICAL-HASH-ORDER | `integrity-contract-lock` | **Proposed (new explicit job)** | `artifacts/integrity/canonical-hash-check.json` + step log showing expected vs actual contract signature |
| I-002-IA-SEPARATION | `integrity-contract-lock` | **Proposed** | `artifacts/integrity/ia-separation-check.json` + rejection receipt for missing IA path |
| I-003-AUTH-EVENT-CONSUME | `integrity-contract-lock` | **Proposed** | `artifacts/integrity/auth-event-single-use.json` + replay-block receipt |
| I-004-GUARD-ORDER-FIXITY | `integrity-contract-lock` | **Proposed** | `artifacts/integrity/guard-order-check.json` with precedence assertions |
| I-005-WEBHOOK-LIVENESS | `integrity-contract-lock` | **Proposed** | `artifacts/integrity/webhook-liveness-check.json` + route validation receipt |
| Promotion dependency guard | `deploy-staging`, `deploy-preview`, `deploy-prod` with explicit `needs` including `integrity-contract-lock` | **Proposed update to existing jobs** | workflow graph evidence (run DAG) + skipped/blocked deploy step evidence |

## 2.3 Required job dependency contract (promotion non-bypass)

`deploy-preview` and `deploy-staging` MUST declare:

`needs: [lint, typecheck, test, security, integrity-contract-lock]`

`deploy-prod` MUST be blocked by integrity result through one of:
- same workflow dependency chain (preferred), or
- required status check policy at branch/environment level keyed to `integrity-contract-lock`.

If `integrity-contract-lock` is FAIL, promotion outcome MUST be `BLOCKED_PROMOTION`.

---

## 3) Proposed CI workflow naming and evidence pointers

Source workflow: `phase-4-implementation/infra/github-actions-ci.yml` (current workflow name `CI / CD`).

## 3.1 Naming conventions (recommended)

- Keep workflow name: `CI / CD` (stable external reference)
- Add explicit integrity job ID: `integrity-contract-lock`
- Human-readable job name: `Integrity Contract Lock (I-001..I-005)`
- Step names MUST include control IDs (e.g., `Validate I-001 canonical hash order`).

This ensures run logs are grep-friendly and policy IDs are visible without opening source.

## 3.2 Evidence pointer schema (for release index)

For each control result, write pointers into release evidence index (`evidence/releases/<release-id>/index.json`):

```json
{
  "control_id": "I-001-CANONICAL-HASH-ORDER",
  "workflow": "CI / CD",
  "job_id": "integrity-contract-lock",
  "job_name": "Integrity Contract Lock (I-001..I-005)",
  "run_id": "<github_run_id>",
  "run_url": "https://github.com/<org>/<repo>/actions/runs/<github_run_id>",
  "artifact_path": "artifacts/integrity/canonical-hash-check.json",
  "result": "PASS"
}
```

## 3.3 Minimal workflow patch intent (implementation-ready)

1. Add job `integrity-contract-lock` after `security` (or parallel to quality jobs).
2. Upload integrity artifacts (`actions/upload-artifact`) under stable artifact name: `integrity-lock-evidence-<sha>`.
3. Extend `deploy-preview` / `deploy-staging` `needs` to include this job.
4. For production, enforce required status or explicit dependency gate before deploy steps proceed.

---

## 4) Demonstration path — blocked promotion with explicit job IDs

This is the required audit demonstration to close the caveat.

## 4.1 Test scenario

- Trigger: introduce controlled integrity fault for I-001 (canonical order drift fixture).
- Expected failing job: `integrity-contract-lock`.
- Expected blocked jobs: `deploy-staging` (push path) and/or `deploy-prod` (manual promotion path).

## 4.2 Demonstration run recipe

1. Create branch `audit/int-lock-block-demo`.
2. Inject known-fail fixture toggled by env flag (e.g., `INT_FAIL_I001=true`).
3. Open PR and run `CI / CD`.
4. Confirm job IDs in run:
   - `lint` (pass)
   - `typecheck` (pass)
   - `test` (pass)
   - `security` (pass)
   - `integrity-contract-lock` (**fail**, explicit I-001 receipt)
   - `deploy-preview` (**not run/blocked by needs**) 
5. Merge path simulation (or protected test repo push) confirms `deploy-staging` blocked on same dependency.
6. Archive receipts and run metadata into release evidence bundle.

## 4.3 Required explicit IDs in final evidence note

At minimum, record:
- `workflow`: `CI / CD`
- `run_id`: `<numeric GitHub run id>`
- `failed_job_id`: `integrity-contract-lock`
- `blocked_job_id`: `deploy-staging` (and/or `deploy-prod`)
- `control_id`: `I-001-CANONICAL-HASH-ORDER`
- `decision`: `BLOCKED_PROMOTION`

Example statement template:

> Run `12933477122` (`CI / CD`) failed at job `integrity-contract-lock` on control `I-001-CANONICAL-HASH-ORDER`; downstream job `deploy-staging` did not execute due to unmet `needs`. Promotion decision logged as `BLOCKED_PROMOTION`.

---

## 5) Auditor lookup cheat sheet (one-minute trace)

## Start from control ID
1. Open `evidence/releases/<release-id>/index.json`.
2. Find `control_id` (e.g., `I-003-AUTH-EVENT-CONSUME`).
3. Capture `workflow`, `job_id`, `run_id`, `run_url`, `artifact_path`, `result`.

## Confirm CI decision path
4. Open `run_url` in GitHub Actions.
5. Verify job `job_id` status (pass/fail).
6. Open workflow graph and confirm deploy jobs were blocked/skipped when integrity job failed.

## Confirm artifact integrity
7. Download artifact bundle `integrity-lock-evidence-<sha>`.
8. Verify expected control receipt exists at `artifact_path`.
9. Validate checksum/hash entry in release evidence index matches artifact contents.

## Confirm governance decision
10. Cross-check release checklist/audit log entry in `evidence/releases/<release-id>/audit/` for `BLOCKED_PROMOTION` and timestamped authority trail.

---

## 6) Closure verdict recommendation

**Recommendation:** **CONDITIONAL CLOSE** of the Phase 8 caveat, with two concrete exit checks.

Caveat is considered closed when:
1. CI workflow contains explicit job `integrity-contract-lock` and downstream deploy dependency wiring includes it (or production required-status equivalent).
2. One archived blocked-promotion demonstration run exists with explicit `run_id`, `failed_job_id`, `blocked_job_id`, and control receipt artifact pointers.

Given current state (workflow inspected):
- Promotion gating is already structurally strong (`needs`, manual prod dispatch, environment approval).
- Missing piece is explicit integrity job naming and direct artifact mapping.

Therefore the caveat is **ready to close in Phase 9 immediately after implementing naming/wiring and capturing one demonstration evidence run**.

---

## 7) Owner/action handoff (from Gate Review Step 6)

- **Primary owner:** Devraj Anand
- **Support:** Jonas Harker
- **Implementation target file:** `phase-4-implementation/infra/github-actions-ci.yml`
- **Evidence target path:** `evidence/releases/<release-id>/...`
- **Governance update target:** reference this closure doc in phase gate package and mark caveat resolved upon completion evidence.