# Internal Routes Gate Ops

This documents the GitHub wiring for Wave 5 PR enforcement.

## Gate Workflow

- Workflow file: `.github/workflows/internal-routes-gate.yml`
- Required check context: `Internal Routes Gate / wave-gate`
- Trigger: `pull_request` changes under `athelon-app/**`

## Required GitHub Secrets

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `PLAYWRIGHT_UNLINKED_EMAIL`
- `PLAYWRIGHT_EMPTY_ORG_EMAIL`
- `PLAYWRIGHT_SEEDED_EMAIL`

## One-Step Setup Script

From repo root:

```bash
bash scripts/ci/setup-internal-routes-gate.sh
```

Optional overrides:

```bash
REPO=owner/repo \
ENV_FILE=athelon-app/.env.local \
BRANCH=main \
CHECK_CONTEXT="Internal Routes Gate / wave-gate" \
bash scripts/ci/setup-internal-routes-gate.sh
```

Dry run:

```bash
DRY_RUN=1 bash scripts/ci/setup-internal-routes-gate.sh
```

## Verification

Check secrets:

```bash
gh api repos/<owner>/<repo>/actions/secrets --jq '.secrets[].name'
```

Check branch protection rule:

```bash
gh api graphql -f query='
query {
  repository(owner:"<owner>", name:"<repo>") {
    branchProtectionRules(first: 20) {
      nodes {
        pattern
        requiredStatusCheckContexts
        requiresApprovingReviews
      }
    }
  }
}'
```

## Important

The branch protection rule requires `Internal Routes Gate / wave-gate`.
If the workflow file is not present in the active PR branch or default branch, merges will be blocked because the required check cannot report.
