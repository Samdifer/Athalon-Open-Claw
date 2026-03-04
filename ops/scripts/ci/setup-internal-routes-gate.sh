#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-Samdifer/Athalon-Open-Claw}"
ENV_FILE="${ENV_FILE:-apps/athelon-app/.env.local}"
BRANCH="${BRANCH:-main}"
CHECK_CONTEXT="${CHECK_CONTEXT:-Internal Routes Gate / wave-gate}"
DRY_RUN="${DRY_RUN:-0}"

usage() {
  cat <<'EOF'
Setup GitHub wiring for the internal routes gate.

Environment overrides:
  REPO=owner/name
  ENV_FILE=path/to/.env.local
  BRANCH=main
  CHECK_CONTEXT="Internal Routes Gate / wave-gate"
  DRY_RUN=1

Example:
  REPO=Samdifer/Athalon-Open-Claw ENV_FILE=apps/athelon-app/.env.local bash ops/scripts/ci/setup-internal-routes-gate.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

get_env_value() {
  local key="$1"
  local line
  line="$(grep -m1 "^${key}=" "$ENV_FILE" || true)"
  [[ -n "$line" ]] && printf '%s' "${line#*=}"
}

set_repo_secret() {
  local key="$1"
  local value="$2"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY_RUN set secret: ${key}"
    return
  fi
  gh secret set "$key" -R "$REPO" -b "$value" >/dev/null
  echo "Set secret: ${key}"
}

echo "Syncing required gate secrets to ${REPO}"
vite_convex_url="$(get_env_value VITE_CONVEX_URL)"
if [[ -z "$vite_convex_url" ]]; then
  vite_convex_url="$(get_env_value NEXT_PUBLIC_CONVEX_URL)"
fi
vite_clerk_pk="$(get_env_value VITE_CLERK_PUBLISHABLE_KEY)"
if [[ -z "$vite_clerk_pk" ]]; then
  vite_clerk_pk="$(get_env_value NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
fi
clerk_secret_key="$(get_env_value CLERK_SECRET_KEY)"
unlinked_email="$(get_env_value PLAYWRIGHT_UNLINKED_EMAIL)"
empty_org_email="$(get_env_value PLAYWRIGHT_EMPTY_ORG_EMAIL)"
seeded_email="$(get_env_value PLAYWRIGHT_SEEDED_EMAIL)"

required_values=(
  "$vite_convex_url"
  "$vite_clerk_pk"
  "$clerk_secret_key"
  "$unlinked_email"
  "$empty_org_email"
  "$seeded_email"
)

for i in "${!required_values[@]}"; do
  if [[ -z "${required_values[$i]}" ]]; then
    echo "Missing required env values in ${ENV_FILE}" >&2
    exit 1
  fi
done

set_repo_secret "VITE_CONVEX_URL" "$vite_convex_url"
set_repo_secret "VITE_CLERK_PUBLISHABLE_KEY" "$vite_clerk_pk"
set_repo_secret "CLERK_SECRET_KEY" "$clerk_secret_key"
set_repo_secret "PLAYWRIGHT_UNLINKED_EMAIL" "$unlinked_email"
set_repo_secret "PLAYWRIGHT_EMPTY_ORG_EMAIL" "$empty_org_email"
set_repo_secret "PLAYWRIGHT_SEEDED_EMAIL" "$seeded_email"

owner="${REPO%/*}"
name="${REPO#*/}"

repo_info="$(gh api graphql -f query='
query($owner:String!,$name:String!){
  repository(owner:$owner,name:$name){
    id
    branchProtectionRules(first:100){
      nodes{
        id
        pattern
      }
    }
  }
}' -f owner="$owner" -f name="$name")"

repo_id="$(echo "$repo_info" | jq -r '.data.repository.id')"
rule_id="$(echo "$repo_info" | jq -r --arg pattern "$BRANCH" '.data.repository.branchProtectionRules.nodes[] | select(.pattern == $pattern) | .id' || true)"

echo "Configuring branch protection for ${owner}/${name}:${BRANCH}"
if [[ -n "$rule_id" ]]; then
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY_RUN update branch protection rule: ${rule_id}"
  else
    gh api graphql -f query='
mutation($ruleId:ID!,$contexts:[String!]!){
  updateBranchProtectionRule(input:{
    branchProtectionRuleId:$ruleId,
    requiresStatusChecks:true,
    requiresStrictStatusChecks:true,
    requiredStatusCheckContexts:$contexts,
    requiresApprovingReviews:true,
    requiredApprovingReviewCount:1,
    dismissesStaleReviews:true,
    requiresConversationResolution:true
  }){
    branchProtectionRule{
      id
      pattern
      requiredStatusCheckContexts
    }
  }
}' -f ruleId="$rule_id" -f "contexts[]=$CHECK_CONTEXT" >/dev/null
    echo "Updated branch protection rule: ${rule_id}"
  fi
else
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY_RUN create branch protection rule for pattern=${BRANCH}"
  else
    gh api graphql -f query='
mutation($repositoryId:ID!,$pattern:String!,$contexts:[String!]!){
  createBranchProtectionRule(input:{
    repositoryId:$repositoryId,
    pattern:$pattern,
    requiresStatusChecks:true,
    requiresStrictStatusChecks:true,
    requiredStatusCheckContexts:$contexts,
    requiresApprovingReviews:true,
    requiredApprovingReviewCount:1,
    dismissesStaleReviews:true,
    requiresConversationResolution:true,
    isAdminEnforced:false
  }){
    branchProtectionRule{
      id
      pattern
      requiredStatusCheckContexts
    }
  }
}' -f repositoryId="$repo_id" -f pattern="$BRANCH" -f "contexts[]=$CHECK_CONTEXT" >/dev/null
    echo "Created branch protection rule for ${BRANCH}"
  fi
fi

echo "Done."
