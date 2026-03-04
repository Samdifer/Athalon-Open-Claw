#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { nowUtcIso, makeRunId } from "./state-io.mjs";

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

export function globToRegExp(pattern) {
  const normalized = normalizePath(pattern);
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__DOUBLE_STAR__/g, ".*");

  return new RegExp(`^${escaped}$`);
}

export function matchesGlob(filePath, pattern) {
  return globToRegExp(pattern).test(normalizePath(filePath));
}

export function listRepoFiles(repoRoot) {
  try {
    const out = execSync("git ls-files", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(normalizePath);
  } catch {
    return [];
  }
}

export function expandPatterns(patterns, repoFiles = []) {
  const files = new Set();
  const unresolved = [];

  for (const rawPattern of patterns || []) {
    const pattern = normalizePath(rawPattern);
    if (!pattern) continue;

    const hasWildcard = /[*?]/.test(pattern);
    const matched = repoFiles.filter((f) => matchesGlob(f, pattern));

    if (matched.length > 0) {
      matched.forEach((m) => files.add(m));
      continue;
    }

    if (!hasWildcard) {
      files.add(pattern);
    } else {
      unresolved.push(pattern);
    }
  }

  return {
    files: [...files],
    unresolved,
  };
}

function staticPrefix(pattern) {
  const normalized = normalizePath(pattern);
  const wildcardIndex = normalized.search(/[?*]/);
  const prefix = wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
  return prefix.replace(/\/$/, "");
}

export function patternsLikelyOverlap(leftPattern, rightPattern) {
  const left = normalizePath(leftPattern);
  const right = normalizePath(rightPattern);

  if (left === right) return true;

  const leftPrefix = staticPrefix(left);
  const rightPrefix = staticPrefix(right);
  if (!leftPrefix || !rightPrefix) return true;

  return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
}

export function patternsOverlap(leftPatterns, rightPatterns, repoFiles = []) {
  const leftExpanded = expandPatterns(leftPatterns, repoFiles);
  const rightExpanded = expandPatterns(rightPatterns, repoFiles);

  const rightSet = new Set(rightExpanded.files);
  for (const file of leftExpanded.files) {
    if (rightSet.has(file)) {
      return {
        overlap: true,
        reason: "file_intersection",
        path: file,
      };
    }
  }

  for (const left of leftPatterns || []) {
    for (const right of rightPatterns || []) {
      if (patternsLikelyOverlap(left, right)) {
        return {
          overlap: true,
          reason: "pattern_prefix_overlap",
          path: `${left} <-> ${right}`,
        };
      }
    }
  }

  return {
    overlap: false,
    reason: "none",
    path: null,
  };
}

export function expireLeases(leasesState, nowIso = nowUtcIso()) {
  const nowMs = new Date(nowIso).getTime();
  for (const lease of leasesState.leases) {
    if (lease.status !== "active") continue;
    if (!lease.expires_at_utc) continue;
    const expiresMs = new Date(lease.expires_at_utc).getTime();
    if (!Number.isFinite(expiresMs)) continue;
    if (expiresMs <= nowMs) {
      lease.status = "expired";
      lease.released_at_utc = nowIso;
      lease.release_reason = "expired";
    }
  }
}

export function getActiveLeases(leasesState) {
  return (leasesState.leases || []).filter((lease) => lease.status === "active");
}

export function acquireLease({
  leasesState,
  assignmentId,
  ownerSession,
  ownerBranch,
  patterns,
  repoFiles,
  ttlMinutes = 120,
  nowIso = nowUtcIso(),
}) {
  expireLeases(leasesState, nowIso);

  const candidatePatterns = [...new Set((patterns || []).map(normalizePath).filter(Boolean))];
  if (candidatePatterns.length === 0) {
    return {
      ok: false,
      error: "No patterns provided for lease acquisition.",
    };
  }

  for (const existing of getActiveLeases(leasesState)) {
    const overlap = patternsOverlap(candidatePatterns, existing.paths || [], repoFiles);
    if (overlap.overlap) {
      return {
        ok: false,
        error: "Lease conflict detected.",
        conflict: {
          lease_id: existing.lease_id,
          assignment_id: existing.assignment_id,
          path: overlap.path,
          reason: overlap.reason,
        },
      };
    }
  }

  const acquiredAt = nowIso;
  const expiresAt = new Date(Date.parse(acquiredAt) + ttlMinutes * 60_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  const lease = {
    lease_id: `LEASE-${makeRunId("L").slice(2)}`,
    assignment_id: assignmentId,
    owner_session: ownerSession || "pending",
    owner_branch: ownerBranch || "pending",
    paths: candidatePatterns,
    acquired_at_utc: acquiredAt,
    expires_at_utc: expiresAt,
    status: "active",
    released_at_utc: null,
    release_reason: null,
  };

  leasesState.leases.push(lease);
  return {
    ok: true,
    lease,
  };
}

export function releaseLease(leasesState, leaseId, reason = "manual", nowIso = nowUtcIso()) {
  const lease = (leasesState.leases || []).find((l) => l.lease_id === leaseId);
  if (!lease) return false;
  if (lease.status !== "active") return false;

  lease.status = "released";
  lease.released_at_utc = nowIso;
  lease.release_reason = reason;
  return true;
}

export function releaseLeasesForAssignment(leasesState, assignmentId, reason = "assignment_complete", nowIso = nowUtcIso()) {
  let count = 0;
  for (const lease of leasesState.leases || []) {
    if (lease.assignment_id !== assignmentId) continue;
    if (lease.status !== "active") continue;
    lease.status = "released";
    lease.released_at_utc = nowIso;
    lease.release_reason = reason;
    count += 1;
  }
  return count;
}

export function loadPathOwnershipConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {
      protected_paths: [],
      group_paths: {},
      defaults: {
        fallback_paths: ["apps/athelon-app/**"],
      },
    };
  }

  const raw = fs.readFileSync(configPath, "utf8").trim();
  if (!raw) {
    return {
      protected_paths: [],
      group_paths: {},
      defaults: {
        fallback_paths: ["apps/athelon-app/**"],
      },
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      protected_paths: parsed.protected_paths || [],
      group_paths: parsed.group_paths || {},
      defaults: parsed.defaults || { fallback_paths: ["apps/athelon-app/**"] },
    };
  } catch {
    return parseBasicYamlOwnership(raw);
  }
}

function parseBasicYamlOwnership(raw) {
  const lines = raw.split(/\r?\n/);
  const out = {
    protected_paths: [],
    group_paths: {},
    defaults: {
      fallback_paths: ["apps/athelon-app/**"],
    },
  };

  let section = null;
  let currentGroup = null;

  for (const lineRaw of lines) {
    const line = lineRaw.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "protected_paths:") {
      section = "protected_paths";
      currentGroup = null;
      continue;
    }
    if (trimmed === "group_paths:") {
      section = "group_paths";
      currentGroup = null;
      continue;
    }
    if (trimmed === "defaults:") {
      section = "defaults";
      currentGroup = null;
      continue;
    }

    if (section === "group_paths" && /^[A-Za-z0-9_-]+:\s*$/.test(trimmed)) {
      currentGroup = trimmed.replace(/:\s*$/, "");
      out.group_paths[currentGroup] = [];
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim();
      if (section === "protected_paths") {
        out.protected_paths.push(value);
      } else if (section === "group_paths" && currentGroup) {
        out.group_paths[currentGroup].push(value);
      } else if (section === "defaults") {
        if (!Array.isArray(out.defaults.fallback_paths)) {
          out.defaults.fallback_paths = [];
        }
        out.defaults.fallback_paths.push(value);
      }
      continue;
    }

    if (section === "defaults" && trimmed.startsWith("fallback_paths:")) {
      if (!Array.isArray(out.defaults.fallback_paths)) {
        out.defaults.fallback_paths = [];
      }
    }
  }

  return out;
}

export function resolveLeasePatternsForGroups(groups, ownership) {
  const patterns = [];
  for (const groupId of groups || []) {
    const groupPatterns = ownership.group_paths[groupId] || [];
    patterns.push(...groupPatterns);
  }
  if (patterns.length === 0) {
    patterns.push(...(ownership.defaults?.fallback_paths || ["apps/athelon-app/**"]));
  }
  return [...new Set(patterns.map(normalizePath))];
}

export function withProtectedPaths(patterns, ownership) {
  return [...new Set([...(patterns || []), ...(ownership.protected_paths || [])])];
}

export function resolveRepoFiles(repoRoot) {
  return listRepoFiles(repoRoot);
}

export function normalizeLeasePatterns(patterns) {
  return [...new Set((patterns || []).map(normalizePath).filter(Boolean))];
}

export function branchFromAssignment(assignmentId, slug = "task") {
  const safeSlug = String(slug || "task")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `agent/${String(assignmentId || "assignment").toLowerCase()}-${safeSlug}`;
}

export function uniqueGroupsFromMbpRows(rows) {
  return [...new Set((rows || []).map((row) => row.canonical_group_id).filter(Boolean))];
}

export function validatePathPatterns(patterns) {
  const normalized = normalizeLeasePatterns(patterns);
  if (normalized.length === 0) {
    throw new Error("No valid path patterns were provided.");
  }
  return normalized;
}

export function resolveLeasePaths({
  explicitPaths,
  groupPatterns,
  ownership,
  includeProtected = false,
}) {
  const explicit = normalizeLeasePatterns(Array.isArray(explicitPaths) ? explicitPaths : []);
  const merged = explicit.length > 0
    ? explicit
    : normalizeLeasePatterns(Array.isArray(groupPatterns) ? groupPatterns : []);
  const normalized = normalizeLeasePatterns(merged);
  if (!includeProtected) return normalized;
  return withProtectedPaths(normalized, ownership);
}

export function ensureLeaseStateShape(leasesState) {
  if (!leasesState || typeof leasesState !== "object") {
    return { leases: [] };
  }
  return {
    leases: Array.isArray(leasesState.leases) ? leasesState.leases : [],
  };
}

export function readPathOwnership(configPath) {
  return loadPathOwnershipConfig(configPath);
}

export function leaseSummary(lease) {
  return {
    lease_id: lease.lease_id,
    assignment_id: lease.assignment_id,
    owner_session: lease.owner_session,
    owner_branch: lease.owner_branch,
    path_count: Array.isArray(lease.paths) ? lease.paths.length : 0,
    status: lease.status,
    expires_at_utc: lease.expires_at_utc,
  };
}

export function toRelativePatterns(patterns) {
  return normalizeLeasePatterns(patterns);
}

export function fileExistsUnderPattern(repoFiles, pattern) {
  return repoFiles.some((filePath) => matchesGlob(filePath, pattern));
}

export function describeOverlap(candidatePatterns, existingLease) {
  return {
    candidate_patterns: candidatePatterns,
    existing_lease_id: existingLease.lease_id,
    existing_assignment_id: existingLease.assignment_id,
    existing_patterns: existingLease.paths,
  };
}

export function isProtectedPath(pathValue, ownership) {
  return (ownership.protected_paths || []).includes(normalizePath(pathValue));
}

export function resolveProtectedPaths(ownership) {
  return normalizeLeasePatterns(ownership.protected_paths || []);
}

export function resolveGroupPatterns(groupId, ownership) {
  return normalizeLeasePatterns(ownership.group_paths?.[groupId] || []);
}

export function mergePatternSets(...sets) {
  const merged = [];
  for (const set of sets) {
    if (!Array.isArray(set)) continue;
    merged.push(...set);
  }
  return normalizeLeasePatterns(merged);
}

export function leaseHasPattern(lease, pattern) {
  const normalizedPattern = normalizePath(pattern);
  return (lease.paths || []).includes(normalizedPattern);
}

export function leaseIsExpired(lease, nowIso = nowUtcIso()) {
  if (!lease.expires_at_utc) return false;
  const expiresMs = new Date(lease.expires_at_utc).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(expiresMs) || !Number.isFinite(nowMs)) return false;
  return expiresMs <= nowMs;
}

export function purgeInactiveLeases(leasesState) {
  leasesState.leases = (leasesState.leases || []).filter((lease) => {
    return ["active", "released", "expired"].includes(lease.status);
  });
}

export function leaseStateStats(leasesState) {
  const stats = {
    total: 0,
    active: 0,
    released: 0,
    expired: 0,
  };
  for (const lease of leasesState.leases || []) {
    stats.total += 1;
    if (lease.status === "active") stats.active += 1;
    if (lease.status === "released") stats.released += 1;
    if (lease.status === "expired") stats.expired += 1;
  }
  return stats;
}

export function leaseToLogLine(lease) {
  return `${lease.lease_id} ${lease.assignment_id} ${lease.status} (${(lease.paths || []).length} paths)`;
}

export function normalizeOwnershipConfig(ownership) {
  return {
    protected_paths: normalizeLeasePatterns(ownership?.protected_paths || []),
    group_paths: Object.fromEntries(
      Object.entries(ownership?.group_paths || {}).map(([groupId, patterns]) => [
        groupId,
        normalizeLeasePatterns(patterns),
      ]),
    ),
    defaults: {
      fallback_paths: normalizeLeasePatterns(ownership?.defaults?.fallback_paths || ["apps/athelon-app/**"]),
    },
  };
}

export function pathToGroupMatches(pathValue, ownership) {
  const normalizedPath = normalizePath(pathValue);
  const matches = [];
  for (const [groupId, patterns] of Object.entries(ownership.group_paths || {})) {
    if ((patterns || []).some((pattern) => matchesGlob(normalizedPath, pattern))) {
      matches.push(groupId);
    }
  }
  return matches;
}

export function guessGroupFromPaths(paths, ownership) {
  const counts = new Map();
  for (const p of paths || []) {
    for (const g of pathToGroupMatches(p, ownership)) {
      counts.set(g, (counts.get(g) || 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

export function leaseConflictMessage(conflict) {
  if (!conflict) return "unknown_conflict";
  return `conflict_with_${conflict.assignment_id}_at_${conflict.path}`;
}

export function assignmentLeaseKey(assignmentId) {
  return `assignment:${assignmentId}`;
}

export function makeAssignmentId() {
  return `ASG-${makeRunId("A").slice(2)}`;
}

export function defaultLeaseTtlMinutes() {
  return 120;
}

export function canAcquireLease(leasesState, patterns, repoFiles) {
  for (const existing of getActiveLeases(leasesState)) {
    const overlap = patternsOverlap(patterns, existing.paths || [], repoFiles);
    if (overlap.overlap) return false;
  }
  return true;
}

export function normalizeExplicitPaths(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeLeasePatterns(value);
  return normalizeLeasePatterns(String(value).split(",").map((item) => item.trim()));
}

export function safeLeaseOwnerSession(value) {
  return String(value || "pending-session");
}

export function safeLeaseOwnerBranch(value) {
  return String(value || "pending-branch");
}

export function resolveOwnershipForRequest({
  mbpRows,
  explicitPaths,
  ownership,
  includeProtected = false,
}) {
  const groups = uniqueGroupsFromMbpRows(mbpRows);
  const groupPatterns = resolveLeasePatternsForGroups(groups, ownership);
  return resolveLeasePaths({
    explicitPaths,
    groupPatterns,
    ownership,
    includeProtected,
  });
}

export function summarizeLeaseConflicts(candidatePatterns, leasesState, repoFiles) {
  const conflicts = [];
  for (const existing of getActiveLeases(leasesState)) {
    const overlap = patternsOverlap(candidatePatterns, existing.paths || [], repoFiles);
    if (!overlap.overlap) continue;
    conflicts.push({
      lease_id: existing.lease_id,
      assignment_id: existing.assignment_id,
      path: overlap.path,
      reason: overlap.reason,
    });
  }
  return conflicts;
}

export function leaseAgeMinutes(lease, nowIso = nowUtcIso()) {
  const startMs = new Date(lease.acquired_at_utc).getTime();
  const nowMs = new Date(nowIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.round((nowMs - startMs) / 60000));
}

export function hasActiveLeaseForAssignment(leasesState, assignmentId) {
  return getActiveLeases(leasesState).some((lease) => lease.assignment_id === assignmentId);
}

export function activeLeaseByAssignment(leasesState, assignmentId) {
  return getActiveLeases(leasesState).find((lease) => lease.assignment_id === assignmentId) || null;
}

export function releaseByRequestAssignments(leasesState, assignmentIds, reason = "request_complete", nowIso = nowUtcIso()) {
  let released = 0;
  for (const assignmentId of assignmentIds || []) {
    released += releaseLeasesForAssignment(leasesState, assignmentId, reason, nowIso);
  }
  return released;
}

export function pathPatternStats(patterns, repoFiles) {
  const expanded = expandPatterns(patterns, repoFiles);
  return {
    input_count: (patterns || []).length,
    expanded_count: expanded.files.length,
    unresolved_count: expanded.unresolved.length,
  };
}

export function validateOwnershipConfig(ownership) {
  const errors = [];
  if (!ownership || typeof ownership !== "object") {
    errors.push("ownership config must be an object");
    return errors;
  }

  if (!Array.isArray(ownership.protected_paths)) {
    errors.push("protected_paths must be an array");
  }
  if (!ownership.group_paths || typeof ownership.group_paths !== "object") {
    errors.push("group_paths must be an object");
  }
  return errors;
}

export function ownershipCoverage(groups, ownership) {
  const missing = [];
  for (const group of groups || []) {
    if (!ownership.group_paths[group] || ownership.group_paths[group].length === 0) {
      missing.push(group);
    }
  }
  return {
    covered: (groups || []).length - missing.length,
    missing,
  };
}

export function normalizeLeaseId(leaseId) {
  return String(leaseId || "").trim();
}

export function resolveRequestPatternUnion(request, ownership, mbpRows) {
  return resolveOwnershipForRequest({
    mbpRows,
    explicitPaths: request.explicit_paths,
    ownership,
  });
}

export function writeLeaseDebug(filePath, payload) {
  const output = `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(filePath, output, "utf8");
}

export function parsePathCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizePath);
}

export function leaseIsActive(lease) {
  return lease?.status === "active";
}

export function requestExplicitPathCount(request) {
  return Array.isArray(request.explicit_paths) ? request.explicit_paths.length : 0;
}

export function activeLeaseCount(leasesState) {
  return getActiveLeases(leasesState).length;
}

export function listActiveLeaseAssignments(leasesState) {
  return getActiveLeases(leasesState).map((lease) => lease.assignment_id);
}

export function leasePatternsForAssignment(leasesState, assignmentId) {
  const lease = activeLeaseByAssignment(leasesState, assignmentId);
  return lease ? lease.paths || [] : [];
}

export function formatLeaseWindow(lease) {
  return `${lease.acquired_at_utc} -> ${lease.expires_at_utc}`;
}

export function ensureLeaseFields(lease) {
  return {
    lease_id: lease.lease_id,
    assignment_id: lease.assignment_id,
    owner_session: lease.owner_session,
    owner_branch: lease.owner_branch,
    paths: Array.isArray(lease.paths) ? lease.paths : [],
    acquired_at_utc: lease.acquired_at_utc,
    expires_at_utc: lease.expires_at_utc,
    status: lease.status || "active",
    released_at_utc: lease.released_at_utc || null,
    release_reason: lease.release_reason || null,
  };
}

export function normalizeLeases(leasesState) {
  leasesState.leases = (leasesState.leases || []).map(ensureLeaseFields);
  return leasesState;
}

export function leaseStateSnapshot(leasesState) {
  return {
    stats: leaseStateStats(leasesState),
    active_assignments: listActiveLeaseAssignments(leasesState),
  };
}

export function normalizeGroupId(value) {
  return String(value || "").trim().toUpperCase();
}

export function uniqueNormalizedGroupIds(groups) {
  return [...new Set((groups || []).map(normalizeGroupId).filter(Boolean))];
}

export function parseGroupList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return uniqueNormalizedGroupIds(value);
  return uniqueNormalizedGroupIds(String(value).split(","));
}

export function matchesAnyPattern(filePath, patterns) {
  return (patterns || []).some((pattern) => matchesGlob(filePath, pattern));
}

export function ensureRepoFiles(repoRoot, providedFiles = null) {
  if (Array.isArray(providedFiles)) return providedFiles;
  return listRepoFiles(repoRoot);
}

export function normalizeLeaseStatus(value) {
  const normalized = String(value || "active").toLowerCase();
  if (["active", "released", "expired"].includes(normalized)) return normalized;
  return "active";
}

export function leaseNeedsRelease(lease, assignmentId) {
  return lease.assignment_id === assignmentId && lease.status === "active";
}

export function releaseMatchingLeases(leasesState, predicate, reason = "predicate_release", nowIso = nowUtcIso()) {
  let count = 0;
  for (const lease of leasesState.leases || []) {
    if (!predicate(lease)) continue;
    if (lease.status !== "active") continue;
    lease.status = "released";
    lease.released_at_utc = nowIso;
    lease.release_reason = reason;
    count += 1;
  }
  return count;
}

export function cloneLeaseState(leasesState) {
  return JSON.parse(JSON.stringify(leasesState || { leases: [] }));
}

export function makeLeaseConflictError(conflict) {
  const err = new Error(leaseConflictMessage(conflict));
  err.conflict = conflict;
  return err;
}
