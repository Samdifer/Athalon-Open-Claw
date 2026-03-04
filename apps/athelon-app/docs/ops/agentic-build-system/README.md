# Agentic Build System Runbook

This runbook documents day-to-day operation of the Athelon agentic build system:
1. `Feature Reviewer Agent`
2. `Parallel Orchestrator Agent`

## Purpose

Use this system to:
1. Run multiple implementation teams in parallel without file collisions.
2. Enforce dependency gates before dispatch.
3. Review and update MBP/FS status in canonical spec using explicit approval.

## Canonical Inputs

The system reads and writes against:
1. `apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md` (canonical)
2. `apps/athelon-app/docs/plans/MASTER-FEATURE-REGISTRY.csv` (derived)
3. `apps/athelon-app/docs/plans/MASTER-FEATURE-CROSSWALK.md` (derived + dependency rollup)
4. `apps/athelon-app/scripts/bug-hunter-sync-master-build.mjs`
5. `apps/athelon-app/scripts/export-feature-spec-derived.mjs`

## Directory Layout

1. Queue and run artifacts:
   `apps/athelon-app/docs/ops/agentic-build-system/`
2. Runtime state (gitignored):
   `ops/agentic-build-system/runtime/`
3. Runtime modules:
   `apps/athelon-app/scripts/agentic/`
4. Config:
   `ops/agentic-build-system/config/`

## Core Contracts

### Queue Entry

Stored as JSONL in:
`apps/athelon-app/docs/ops/agentic-build-system/feature-request-queue.jsonl`

Required fields:
1. `request_id`
2. `created_at_utc`
3. `requested_by`
4. `mbp_ids`
5. `priority`
6. `notes`
7. `status`

Common statuses:
1. `queued`
2. `blocked`
3. `in_progress`
4. `completed`
5. `failed`
6. `cancelled`

### Lease

Stored in:
`ops/agentic-build-system/runtime/leases.json`

Each active assignment acquires a path lease before spawn. No dispatch occurs if lease overlap exists.

### Run Window

Stored in:
`ops/agentic-build-system/runtime/orchestrator-state.json`

Dispatch happens only when:
1. `run_mode = ACTIVE`
2. dependencies are ready
3. max parallel cap is not exceeded
4. lease acquisition succeeds

## Daily Operation

Run from repo root:

```bash
pnpm --dir apps/athelon-app run agentic:orchestrator:start -- --max-parallel 8
pnpm --dir apps/athelon-app run agentic:queue:add -- --requested-by sam --mbp-ids MBP-0105,MBP-0106 --priority P1 --notes "RBAC admin batch"
pnpm --dir apps/athelon-app run agentic:queue:list
pnpm --dir apps/athelon-app run agentic:orchestrator:tick -- --spawn-mode mock
pnpm --dir apps/athelon-app run agentic:queue:complete -- --request-id REQ-... --completed-by team-a --status completed --implementation-state implemented --verification-state qa_verified --validation-status pass --evidence-links "run://..." --related-ids "REQ-..."
pnpm --dir apps/athelon-app run agentic:reviewer:quick
pnpm --dir apps/athelon-app run agentic:reviewer:deep
pnpm --dir apps/athelon-app run agentic:reviewer:apply -- --proposal docs/ops/agentic-build-system/runs/reviewer/<RUN_ID>/proposal.json --approve-token YES-APPLY
pnpm --dir apps/athelon-app run agentic:orchestrator:stop
```

## Reviewer Workflow

### Propose

1. `quick`: lightweight review using queue completion evidence.
2. `deep`: runs gate commands before proposing stronger verification transitions.

Artifacts are written to:
`apps/athelon-app/docs/ops/agentic-build-system/runs/reviewer/<run_id>/`

### Apply

1. Requires exact token: `YES-APPLY`.
2. Updates both Registry B (`MBP-*`) and Registry A (`FS-*`) in canonical spec.
3. Triggers derived export command (`spec:export:derived`).
4. Writes apply artifact in same reviewer run folder.

## Orchestrator Workflow

### Dispatch Rules

1. Strict dependency enforcement from Registry B dependency groups.
2. Group readiness read from `MASTER-FEATURE-CROSSWALK.md` rollup.
3. Max parallel default: `8`.
4. One branch per assignment:
   `agent/<assignment-id>-<slug>`
5. Path lease required before spawn.

### Spawn Adapter

Supported modes:
1. `mock` (default)
2. `cli`
3. `local` (gateway bypass; writes local assignment manifests under runtime)
4. `disabled`

Optional environment variables:
1. `OPENCLAW_SPAWN_MODE`
2. `OPENCLAW_SPAWN_CMD` (default: `openclaw sessions spawn`)

### Gateway Bypass (Local Session)

If OpenClaw gateway is down, run local-session bypass:

```bash
pnpm --dir apps/athelon-app run agentic:session:bypass
pnpm --dir apps/athelon-app run agentic:session:next
```

Artifacts written to:
1. `ops/agentic-build-system/runtime/local-session/dispatch-log.jsonl`
2. `ops/agentic-build-system/runtime/local-session/ACTIVE-ASSIGNMENTS.md`
3. `ops/agentic-build-system/runtime/local-session/<assignment_id>.json`

## Cron Schedule

Tracked template:
`ops/agentic-build-system/config/cron-templates.json`

Defined jobs:
1. `athelon-orchestrator-tick` every 5 minutes
2. `athelon-reviewer-quick` every 1 hour
3. `athelon-reviewer-deep` every 6 hours

## Recovery Playbooks

### 1. Request blocked by lease conflict

1. Run `agentic:queue:list`.
2. Identify conflicting active request and assignment.
3. Wait for completion or complete/cancel the blocking request.
4. Re-run `agentic:orchestrator:tick`.

### 2. Request blocked by dependency

1. Check blocked reason for `dependency_not_ready`.
2. Validate dependency group rollup in `MASTER-FEATURE-CROSSWALK.md`.
3. Complete prerequisite group work.
4. Re-run orchestrator tick.

### 3. Spawn failure

1. Ensure `spawn-mode` and OpenClaw command are valid.
2. Re-run tick after fixing adapter settings.
3. Confirm failed request returned to blocked state and lease was released.

### 4. Orphaned in-progress request (session died)

1. Pause orchestrator:
   `agentic:orchestrator:stop`
2. Mark the request `failed` or `cancelled` via `agentic:queue:complete`.
3. Confirm lease release and assignment removal.
4. Re-queue work with new request if needed.

### 5. Reviewer apply should not proceed

1. Do not run `agentic:reviewer:apply` without explicit approval.
2. Keep proposal artifact as review record.
3. Re-run `quick` or `deep` after more evidence arrives.

### 6. Bad apply outcome

1. Inspect:
   `apps/athelon-app/docs/ops/agentic-build-system/runs/reviewer/<run_id>/apply-result.json`
2. If derived export failed, fix cause and rerun export.
3. If canonical state needs reversal, use normal git revert workflow (do not hand-edit runtime state first).

## Safety Checklist

1. Keep orchestrator paused when doing manual spec maintenance.
2. Only reviewer apply mutates canonical status fields.
3. Never bypass approval token requirement in automation.
4. Monitor run artifacts for repeated lease conflicts or dependency blockers.
5. Keep `path-ownership.yaml` updated when new feature groups or directories are introduced.
