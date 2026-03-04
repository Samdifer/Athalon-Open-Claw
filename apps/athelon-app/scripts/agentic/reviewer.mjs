#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ensureAgenticFilesystem,
  getAgenticPaths,
  makeRunId,
  nowUtcIso,
  parseArgs,
  readJson,
  writeJson,
  writeText,
} from "./state-io.mjs";
import { loadQueue } from "./queue.mjs";
import {
  applyRowUpdates,
  buildFsIndex,
  buildMbpIndex,
  parseFsLinks,
  parseMasterSpec,
  writeMasterSpec,
} from "./registry-parser.mjs";

const VALID_IMPL = new Set([
  "not_implemented",
  "backend_needed",
  "partially_implemented",
  "implemented",
  "blocked",
  "deprecated",
]);

const VALID_VERIFY = new Set([
  "unreviewed",
  "doc_reviewed",
  "app_verified",
  "qa_verified",
  "production_verified",
]);

const VERIFY_RANK = {
  unreviewed: 0,
  doc_reviewed: 1,
  app_verified: 2,
  qa_verified: 3,
  production_verified: 4,
};

const LEGACY_SNAPSHOT_BY_IMPL = {
  not_implemented: "Not Implemented",
  backend_needed: "Backend Needed",
  partially_implemented: "Partially Implemented",
  implemented: "Implemented",
  blocked: "Backend Needed",
  deprecated: "Not Implemented",
};

const LEGACY_STATUS_BY_IMPL = {
  not_implemented: "missing",
  backend_needed: "partial",
  partially_implemented: "partial",
  implemented: "implemented",
  blocked: "missing",
  deprecated: "proposed",
};

function ensureRunDir(baseDir, runId) {
  const runDir = path.join(baseDir, runId);
  writeText(path.join(runDir, ".keep"), "");
  return runDir;
}

function normalizeImpl(value, fallback = "partially_implemented") {
  const normalized = String(value || fallback).trim();
  return VALID_IMPL.has(normalized) ? normalized : fallback;
}

function normalizeVerify(value, fallback = "doc_reviewed") {
  const normalized = String(value || fallback).trim();
  return VALID_VERIFY.has(normalized) ? normalized : fallback;
}

function maxVerification(values) {
  const normalized = values.map((v) => normalizeVerify(v, "unreviewed"));
  const max = normalized.reduce((best, current) => {
    return VERIFY_RANK[current] > VERIFY_RANK[best] ? current : best;
  }, "unreviewed");
  return max;
}

function minVerification(values) {
  const normalized = values.map((v) => normalizeVerify(v, "unreviewed"));
  const min = normalized.reduce((best, current) => {
    return VERIFY_RANK[current] < VERIFY_RANK[best] ? current : best;
  }, "production_verified");
  return min;
}

export function rollupImplementationFromMbpStates(implementationStates) {
  const states = implementationStates.map((state) => normalizeImpl(state, "not_implemented"));
  if (states.length === 0) return "not_implemented";

  if (states.every((state) => state === "implemented")) {
    return "implemented";
  }
  if (states.every((state) => state === "not_implemented")) {
    return "not_implemented";
  }
  if (states.every((state) => ["not_implemented", "backend_needed", "blocked"].includes(state))) {
    return "backend_needed";
  }
  if (states.some((state) => state === "implemented" || state === "partially_implemented" || state === "backend_needed")) {
    return "partially_implemented";
  }
  return "not_implemented";
}

export function rollupVerificationFromMbpStates(verificationStates) {
  if (!verificationStates.length) return "unreviewed";
  return minVerification(verificationStates);
}

export function runGateCommands(mode, appRoot) {
  const gates = [];

  if (mode === "deep") {
    const commands = ["pnpm run typecheck", "pnpm run build"];
    for (const command of commands) {
      try {
        execSync(command, {
          cwd: appRoot,
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
        });
        gates.push({ command, status: "pass" });
      } catch (error) {
        gates.push({
          command,
          status: "fail",
          output: `${error.stdout || ""}${error.stderr || ""}`.slice(0, 2000),
        });
      }
    }
  }

  return gates;
}

function completedQueueEvidence(queue) {
  return queue
    .filter((entry) => entry.status === "completed" && entry.completion)
    .map((entry) => ({
      request_id: entry.request_id,
      completed_at_utc: entry.completion.completed_at_utc,
      validation_status: entry.completion.validation_status,
      implementation_state: entry.completion.implementation_state,
      verification_state: entry.completion.verification_state,
      evidence_links: entry.completion.evidence_links,
      related_ids: entry.completion.related_ids,
      notes: entry.completion.notes,
      mbp_ids: entry.mbp_ids,
    }));
}

function latestByMbpId(evidences) {
  const map = new Map();
  for (const evidence of evidences) {
    for (const mbpId of evidence.mbp_ids || []) {
      const prev = map.get(mbpId);
      if (!prev) {
        map.set(mbpId, evidence);
        continue;
      }
      const prevTime = Date.parse(prev.completed_at_utc || "1970-01-01T00:00:00Z");
      const nextTime = Date.parse(evidence.completed_at_utc || "1970-01-01T00:00:00Z");
      if (nextTime >= prevTime) {
        map.set(mbpId, evidence);
      }
    }
  }
  return map;
}

function shouldSetVerifiedAt(verificationState) {
  return ["app_verified", "qa_verified", "production_verified"].includes(verificationState);
}

function mergeEvidenceStrings(...values) {
  return values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join("; ");
}

function resolveProposalPath(proposalPath, paths) {
  if (path.isAbsolute(proposalPath)) return proposalPath;
  const cwdResolved = path.resolve(process.cwd(), proposalPath);
  if (fs.existsSync(cwdResolved)) return cwdResolved;
  return path.resolve(paths.repoRoot, proposalPath);
}

function createFsToMbpMap(registryBRows) {
  const fsToMbp = new Map();
  for (const row of registryBRows) {
    const fsLinks = parseFsLinks(row.fs_links);
    for (const fsId of fsLinks) {
      if (!fsToMbp.has(fsId)) fsToMbp.set(fsId, []);
      fsToMbp.get(fsId).push(row.mbp_id);
    }
  }
  return fsToMbp;
}

export function buildProposal(options = {}) {
  const mode = options.mode || "quick";
  if (!["quick", "deep"].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  const paths = options.paths || getAgenticPaths(options.repoRoot);
  ensureAgenticFilesystem(paths);

  const parsedSpec = parseMasterSpec(paths.masterSpecPath);
  const mbpIndex = buildMbpIndex(parsedSpec.registryBRows);
  const fsIndex = buildFsIndex(parsedSpec.registryARows);
  const fsToMbp = createFsToMbpMap(parsedSpec.registryBRows);

  const queue = loadQueue(paths);
  const evidences = completedQueueEvidence(queue).filter((evidence) => evidence.validation_status === "pass");
  const latestEvidenceByMbp = latestByMbpId(evidences);

  const nowIso = nowUtcIso();
  const runId = options.run_id || makeRunId(mode === "deep" ? "RVWD" : "RVWQ");
  const runDir = ensureRunDir(paths.reviewerRunsRoot, runId);

  const gates = runGateCommands(mode, paths.appRoot);
  const gatesPassed = gates.every((gate) => gate.status === "pass");

  const candidateUpdatesMbp = [];
  const warnings = [];

  for (const [mbpId, evidence] of latestEvidenceByMbp.entries()) {
    const current = mbpIndex.get(mbpId);
    if (!current) {
      warnings.push(`missing_mbp_row:${mbpId}`);
      continue;
    }

    const proposedImplementation = normalizeImpl(evidence.implementation_state, "implemented");
    const evidenceVerification = normalizeVerify(evidence.verification_state, "qa_verified");
    const proposedVerification = gatesPassed
      ? maxVerification([current.verification_state, evidenceVerification])
      : "doc_reviewed";

    const proposal = {
      mbp_id: mbpId,
      previous: {
        implementation_state: current.implementation_state,
        verification_state: current.verification_state,
        legacy_status: current.legacy_status,
      },
      proposed: {
        implementation_state: proposedImplementation,
        verification_state: proposedVerification,
        legacy_status: LEGACY_STATUS_BY_IMPL[proposedImplementation] || "partial",
        last_reviewed_at_utc: nowIso,
        last_verified_in_app_at_utc: shouldSetVerifiedAt(proposedVerification) ? nowIso : "null",
        reviewed_by: "agentic-reviewer",
        evidence_links: mergeEvidenceStrings(current.evidence_links, evidence.evidence_links),
        related_ids: mergeEvidenceStrings(current.related_ids, evidence.related_ids, evidence.request_id),
      },
      source_request_id: evidence.request_id,
      mode,
    };

    const changed =
      proposal.previous.implementation_state !== proposal.proposed.implementation_state
      || proposal.previous.verification_state !== proposal.proposed.verification_state
      || proposal.previous.legacy_status !== proposal.proposed.legacy_status;

    if (changed) {
      candidateUpdatesMbp.push(proposal);
    }
  }

  const projectedMbpStates = new Map();
  for (const row of parsedSpec.registryBRows) {
    projectedMbpStates.set(row.mbp_id, {
      implementation_state: row.implementation_state,
      verification_state: row.verification_state,
    });
  }
  for (const update of candidateUpdatesMbp) {
    projectedMbpStates.set(update.mbp_id, {
      implementation_state: update.proposed.implementation_state,
      verification_state: update.proposed.verification_state,
    });
  }

  const impactedFs = new Set();
  for (const update of candidateUpdatesMbp) {
    const row = mbpIndex.get(update.mbp_id);
    for (const fsId of parseFsLinks(row?.fs_links || "")) {
      impactedFs.add(fsId);
    }
  }

  const candidateUpdatesFs = [];
  for (const fsId of impactedFs) {
    const currentFs = fsIndex.get(fsId);
    if (!currentFs) {
      warnings.push(`missing_fs_row:${fsId}`);
      continue;
    }

    const linkedMbpIds = fsToMbp.get(fsId) || [];
    const implementationStates = linkedMbpIds.map((mbpId) => projectedMbpStates.get(mbpId)?.implementation_state || "not_implemented");
    const verificationStates = linkedMbpIds.map((mbpId) => projectedMbpStates.get(mbpId)?.verification_state || "unreviewed");

    const proposedImplementation = rollupImplementationFromMbpStates(implementationStates);
    const proposedVerification = rollupVerificationFromMbpStates(verificationStates);

    const proposal = {
      fs_id: fsId,
      previous: {
        implementation_state: currentFs.implementation_state,
        verification_state: currentFs.verification_state,
        legacy_state_snapshot: currentFs.legacy_state_snapshot,
      },
      proposed: {
        implementation_state: proposedImplementation,
        verification_state: proposedVerification,
        legacy_state_snapshot: LEGACY_SNAPSHOT_BY_IMPL[proposedImplementation] || "Partially Implemented",
        last_reviewed_at_utc: nowIso,
        last_verified_in_app_at_utc: shouldSetVerifiedAt(proposedVerification) ? nowIso : "null",
        reviewed_by: "agentic-reviewer",
        evidence_links: mergeEvidenceStrings(currentFs.evidence_links, `derived_from=${linkedMbpIds.join(",")}`),
        related_ids: mergeEvidenceStrings(currentFs.related_ids, linkedMbpIds.join(",")),
      },
      linked_mbp_ids: linkedMbpIds,
      mode,
    };

    const changed =
      proposal.previous.implementation_state !== proposal.proposed.implementation_state
      || proposal.previous.verification_state !== proposal.proposed.verification_state
      || proposal.previous.legacy_state_snapshot !== proposal.proposed.legacy_state_snapshot;

    if (changed) {
      candidateUpdatesFs.push(proposal);
    }
  }

  const proposalPayload = {
    run_id: runId,
    generated_at_utc: nowIso,
    mode,
    candidate_updates_mbp: candidateUpdatesMbp,
    candidate_updates_fs: candidateUpdatesFs,
    gates_run: gates,
    evidence: evidences,
    warnings,
    apply_command: `pnpm run agentic:reviewer:apply -- --proposal ${path.relative(paths.appRoot, path.join(runDir, "proposal.json"))} --approve-token YES-APPLY`,
  };

  writeJson(path.join(runDir, "proposal.json"), proposalPayload);

  const summary = [
    `# Reviewer Proposal ${runId}`,
    "",
    `- Generated at: ${nowIso}`,
    `- Mode: ${mode}`,
    `- Gates passed: ${gatesPassed}`,
    `- MBP updates: ${candidateUpdatesMbp.length}`,
    `- FS updates: ${candidateUpdatesFs.length}`,
    "",
    "## Warnings",
    "",
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- none"]),
    "",
    "## Apply",
    "",
    `- ${proposalPayload.apply_command}`,
  ].join("\n");
  writeText(path.join(runDir, "summary.md"), `${summary}\n`);

  return proposalPayload;
}

export function applyProposal(options = {}) {
  const approveToken = options.approve_token;
  if (approveToken !== "YES-APPLY") {
    throw new Error("Invalid or missing approve token. Use --approve-token YES-APPLY.");
  }

  const proposalPath = options.proposal_path;
  if (!proposalPath) {
    throw new Error("--proposal is required.");
  }

  const paths = options.paths || getAgenticPaths(options.repoRoot);
  ensureAgenticFilesystem(paths);

  const resolvedProposalPath = resolveProposalPath(proposalPath, paths);
  const proposal = readJson(resolvedProposalPath, null);
  if (!proposal) {
    throw new Error(`Proposal not found: ${proposalPath}`);
  }

  const parsedSpec = parseMasterSpec(paths.masterSpecPath);
  const nowIso = nowUtcIso();

  const mbpUpdates = new Map();
  for (const update of proposal.candidate_updates_mbp || []) {
    mbpUpdates.set(update.mbp_id, {
      legacy_status: update.proposed.legacy_status,
      implementation_state: update.proposed.implementation_state,
      verification_state: update.proposed.verification_state,
      last_reviewed_at_utc: update.proposed.last_reviewed_at_utc || nowIso,
      last_verified_in_app_at_utc: update.proposed.last_verified_in_app_at_utc || "null",
      reviewed_by: update.proposed.reviewed_by || "agentic-reviewer",
      evidence_links: update.proposed.evidence_links,
      related_ids: update.proposed.related_ids,
    });
  }

  const fsUpdates = new Map();
  for (const update of proposal.candidate_updates_fs || []) {
    fsUpdates.set(update.fs_id, {
      implementation_state: update.proposed.implementation_state,
      verification_state: update.proposed.verification_state,
      last_reviewed_at_utc: update.proposed.last_reviewed_at_utc || nowIso,
      last_verified_in_app_at_utc: update.proposed.last_verified_in_app_at_utc || "null",
      reviewed_by: update.proposed.reviewed_by || "agentic-reviewer",
      evidence_links: update.proposed.evidence_links,
      related_ids: update.proposed.related_ids,
      legacy_state_snapshot: update.proposed.legacy_state_snapshot,
    });
  }

  const touchedMbp = applyRowUpdates(parsedSpec.lines, parsedSpec.registryBTable, "mbp_id", mbpUpdates);
  const touchedFs = applyRowUpdates(parsedSpec.lines, parsedSpec.registryATable, "fs_id", fsUpdates);

  writeMasterSpec(paths.masterSpecPath, parsedSpec.lines);

  let exportResult = { status: "pass", command: "pnpm run spec:export:derived" };
  try {
    execSync("pnpm run spec:export:derived", {
      cwd: paths.appRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch (error) {
    exportResult = {
      status: "fail",
      command: "pnpm run spec:export:derived",
      output: `${error.stdout || ""}${error.stderr || ""}`.slice(0, 2000),
    };
  }

  const applyPayload = {
    run_id: proposal.run_id,
    applied_at_utc: nowIso,
    proposal_path: resolvedProposalPath,
    mbp_rows_updated: touchedMbp,
    fs_rows_updated: touchedFs,
    export_result: exportResult,
  };

  const runDir = path.join(paths.reviewerRunsRoot, proposal.run_id);
  writeJson(path.join(runDir, "apply-result.json"), applyPayload);

  const summary = [
    `# Reviewer Apply ${proposal.run_id}`,
    "",
    `- Applied at: ${nowIso}`,
    `- MBP rows updated: ${touchedMbp}`,
    `- FS rows updated: ${touchedFs}`,
    `- Derived export: ${exportResult.status}`,
  ].join("\n");
  writeText(path.join(runDir, "apply-summary.md"), `${summary}\n`);

  return applyPayload;
}

function usage() {
  process.stdout.write(
    [
      "Reviewer CLI",
      "",
      "Commands:",
      "  propose --mode quick|deep",
      "  apply --proposal <path> --approve-token YES-APPLY",
    ].join("\n"),
  );
}

async function main() {
  const command = process.argv[2];
  if (!command || ["--help", "-h", "help"].includes(command)) {
    usage();
    return;
  }

  const args = parseArgs(process.argv.slice(3));

  if (command === "propose") {
    const mode = args.mode || "quick";
    const proposal = buildProposal({ mode });
    process.stdout.write(
      `${JSON.stringify({ run_id: proposal.run_id, mode: proposal.mode, mbp_updates: proposal.candidate_updates_mbp.length, fs_updates: proposal.candidate_updates_fs.length }, null, 2)}\n`,
    );
    return;
  }

  if (command === "apply") {
    const proposalPath = args.proposal;
    if (!proposalPath) {
      throw new Error("--proposal is required.");
    }

    const result = applyProposal({
      proposal_path: proposalPath,
      approve_token: args["approve-token"],
    });

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown reviewer command: ${command}`);
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
