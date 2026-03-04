#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# During compatibility window, both canonical namespaces and legacy symlink aliases are expected.
ALLOWED=(
  .git .github .githooks .claude .turbo
  apps archive knowledge ops research node_modules
  athelon-app scheduler marketing artifacts openclaw-backup
  dispatches docs reports reviews scripts team
  phase-1-data-model phase-11-recovery phase-12-reentry phase-13-reentry phase-13-reentry-closure
  phase-14-stabilization phase-15-rd phase-16-build phase-17-sprint phase-18-closure phase-19-launch
  phase-2-compliance phase-2-frontend phase-2-parts phase-2-signoff phase-2-task-cards phase-2-work-orders
  phase-20-scale phase-21-expansion phase-22-v12 phase-23-sprint3 phase-24-v20 phase-25-v20b
  phase-26-v20c phase-27-v20d phase-28-v13 phase-29-v14 phase-3-auth phase-3-compliance
  phase-3-frontend phase-3-implementation phase-3-mobile phase-3-mutations phase-3-qa phase-3-schema
  phase-30-v14 phase-31-v14 phase-32-v14 phase-33-v15 phase-34-v15 phase-35-v15 phase-36-v15
  phase-37-v15 phase-4-compliance phase-4-frontend phase-4-implementation phase-4-infra phase-4-mobile
  phase-4-mutations phase-4-tests phase-5-implementation phase-5-mvp phase-5-repair-station
  phase-6-alpha phase-7-hardening phase-8-qualification phase-9-closure
)

# Validate unexpected top-level directories.
while IFS= read -r name; do
  skip=false
  for allowed in "${ALLOWED[@]}"; do
    if [[ "$name" == "$allowed" ]]; then
      skip=true
      break
    fi
  done
  if [[ "$skip" == false ]]; then
    echo "Unexpected top-level directory: $name"
    exit 1
  fi
done < <(find . -mindepth 1 -maxdepth 1 -type d -print | sed 's#^./##' | sort)

# Canonical namespace checks.
for required in apps/athelon-app apps/marketing archive/phases knowledge knowledge/research ops/scripts; do
  if [[ ! -e "$required" ]]; then
    echo "Missing required canonical path: $required"
    exit 1
  fi
done

# Compatibility symlink checks.
for legacy in athelon-app scripts docs dispatches reviews reports team artifacts openclaw-backup research; do
  if [[ ! -L "$legacy" ]]; then
    echo "Expected legacy compatibility symlink missing: $legacy"
    exit 1
  fi
done

echo "Repository structure guard passed."
