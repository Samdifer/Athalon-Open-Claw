#!/usr/bin/env python3
"""
Seed industry-context evidence links into master build artifacts.

Modes:
  --draft : Analyze and print a proposed seeding summary.
  --apply : Apply seeding updates to:
            - apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md
            - apps/athelon-app/docs/plans/MASTER-FEATURE-REGISTRY.csv
            - apps/athelon-app/docs/plans/contextual-seeding/industry-context-seed-state.json
"""

from __future__ import annotations

import argparse
import csv
import fnmatch
import json
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_CONFIG = ROOT / "apps/athelon-app/docs/plans/contextual-seeding/industry-context-feature-map.json"
DEFAULT_STATE = ROOT / "apps/athelon-app/docs/plans/contextual-seeding/industry-context-seed-state.json"


@dataclass
class SeedResult:
    seed: dict
    eligible: bool
    blocked_by_unindexed: bool
    reasons: list[str]


def run_git(args: list[str]) -> str:
    out = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return out.stdout


def parse_staged_new_docs(corpus_folder: str, index_name: str, additional_index_patterns: list[str]) -> list[str]:
    lines = run_git(["diff", "--cached", "--name-status"]).splitlines()
    docs: list[str] = []
    prefix = f"{corpus_folder}/"
    for line in lines:
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith(("A", "C")) and len(parts) >= 2:
            new_path = parts[1]
        elif status.startswith("R") and len(parts) >= 3:
            new_path = parts[2]
        else:
            continue
        if not new_path.startswith(prefix):
            continue
        rel_corpus_path = new_path[len(prefix) :]
        if rel_corpus_path == index_name:
            continue
        if any(fnmatch.fnmatch(rel_corpus_path, pat) for pat in additional_index_patterns):
            continue
        name = Path(new_path).name
        docs.append(name)
    return sorted(set(docs))


def section_text(md: str, heading: str) -> str:
    start = md.find(heading)
    if start < 0:
        return ""
    start = md.find("\n", start)
    if start < 0:
        return ""
    start += 1
    next_h2 = md.find("\n## ", start)
    if next_h2 < 0:
        return md[start:]
    return md[start:next_h2]


def extract_backtick_artifacts(text: str) -> set[str]:
    indexed: set[str] = set()
    for token in re.findall(r"`([^`\n]+)`", text):
        item = token.strip()
        if not item:
            continue
        indexed.add(item)
        if "/" in item:
            indexed.add(Path(item).name)
    return indexed


def parse_index(index_path: Path) -> tuple[set[str], set[str]]:
    text = index_path.read_text()

    file_index_names = set(re.findall(r"^###\s+\d+\)\s+`([^`]+)`", text, flags=re.M))
    snapshot_names = set(re.findall(r"^\| `([^`]+)` \|", text, flags=re.M))
    indexed_files = file_index_names | snapshot_names | extract_backtick_artifacts(text)

    app_map = section_text(text, "## Application Context Mapping")
    domains: set[str] = set()
    for line in app_map.splitlines():
        if not line.startswith("|"):
            continue
        if line.startswith("|---"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if not cells:
            continue
        if cells[0] == "Athelon Build Domain":
            continue
        if cells[0]:
            domains.add(cells[0])
    return indexed_files, domains


def resolve_index_paths(corpus_root: Path, index_name: str, additional_patterns: list[str]) -> list[Path]:
    paths: list[Path] = [corpus_root / index_name]
    for pattern in additional_patterns:
        for p in sorted(corpus_root.glob(pattern)):
            if p.is_file():
                paths.append(p)
    out: list[Path] = []
    seen: set[Path] = set()
    for p in paths:
        if p in seen:
            continue
        seen.add(p)
        out.append(p)
    return out


def resolve_seeds(config: dict, indexed_files: set[str], domains: set[str], staged_new_docs: list[str]) -> tuple[list[SeedResult], list[dict]]:
    rules: dict[str, list[int]] = config["feature_rules"]
    rule_feature_set: set[int] = set()
    for d in domains:
        for n in rules.get(d, []):
            rule_feature_set.add(int(n))

    unindexed = set(staged_new_docs) - indexed_files
    results: list[SeedResult] = []
    open_candidates: list[dict] = []

    for seed in config["seeds"]:
        reasons: list[str] = []
        docs_present = all(doc in indexed_files for doc in seed["source_artifacts"])
        if not docs_present:
            reasons.append("missing_source_artifact_in_index")

        domain_hit = any(d in domains for d in seed["required_domains"])
        if not domain_hit:
            reasons.append("required_domain_not_present")

        feature_hit = int(seed["feature_number"]) in rule_feature_set
        if not feature_hit:
            reasons.append("feature_not_reachable_from_domain_rules")

        blocked_unindexed = any(doc in unindexed for doc in seed["source_artifacts"])
        if blocked_unindexed:
            reasons.append("blocked_by_unindexed_new_docs")

        eligible = docs_present and domain_hit and feature_hit
        result = SeedResult(
            seed=seed,
            eligible=eligible,
            blocked_by_unindexed=blocked_unindexed,
            reasons=reasons,
        )
        results.append(result)
        if not eligible:
            open_candidates.append(
                {
                    "id": seed["id"],
                    "feature": seed["feature_number"],
                    "reasons": reasons,
                }
            )
    return results, open_candidates


def render_seeding_block(config: dict, seed_results: list[SeedResult], master_path: Path) -> str:
    section_title = config["output"]["section_title"]
    corpus_folder = config["corpus"]["folder"]
    default_context_file = config["corpus"]["index_file"]

    lines: list[str] = []
    lines.append(f"### {section_title}")
    lines.append("")
    lines.append("| Seed ID | Source Artifact | Source Context Link | Mapped Feature # | Feature Name | Registry MBP IDs | Confidence | Enhancement Context | Future-State Delta |")
    lines.append("|---|---|---|---:|---|---|---|---|---|")

    applied = [r for r in seed_results if r.eligible and not r.blocked_by_unindexed]
    for r in applied:
        s = r.seed
        source_artifacts = ", ".join(f"`{d}`" for d in s["source_artifacts"])
        context_file = s.get("source_context_file", default_context_file)
        context_anchor = s.get("source_context_anchor", "file-index")
        context_label = s.get("source_context_label")
        if not context_label:
            if context_anchor == "application-context-mapping":
                context_label = "Application Context Mapping"
            elif context_anchor == "file-index":
                context_label = "File Index"
            else:
                context_label = context_anchor.replace("-", " ").title()
        target_path = ROOT / corpus_folder / context_file
        rel_context = Path(os.path.relpath(target_path, master_path.parent)).as_posix()
        context_doc_name = Path(context_file).name
        context_link = f"[`{context_doc_name}` {context_label}]({rel_context}#{context_anchor})"
        feature_cell = f"[{s['feature_number']}](#feature-state-matrix-all-53-features)"
        mbp_ids = ", ".join(f"`{m}`" for m in s["mbp_ids"])
        lines.append(
            f"| {s['id']} | {source_artifacts} | {context_link} | {feature_cell} | {s['feature_name']} | {mbp_ids} | {s['confidence']} | {s['enhancement_context']} | {s['future_state_delta']} |"
        )

    if not applied:
        lines.append("| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |")

    lines.append("")
    return "\n".join(lines)


def upsert_master_seeding_block(master_path: Path, block: str, section_title: str) -> bool:
    original = master_path.read_text()
    heading = f"### {section_title}"
    if heading in original:
        start = original.index(heading)
        body_start = original.find("\n", start)
        if body_start < 0:
            body_start = start + len(heading)
        match = re.search(r"\n(?:##|###) ", original[body_start + 1 :])
        after = (body_start + 1 + match.start()) if match else -1
        if after < 0:
            updated = original[:start].rstrip() + "\n\n" + block.rstrip() + "\n"
        else:
            updated = original[:start].rstrip() + "\n\n" + block.rstrip() + "\n\n" + original[after + 1 :]
    else:
        insert_before = "## Feature Interconnection Graph"
        if insert_before in original:
            idx = original.index(insert_before)
            updated = original[:idx].rstrip() + "\n\n" + block.rstrip() + "\n\n" + original[idx:]
        else:
            fallback_before = "### Auto-Discovered Master Features (Bug Hunter)"
            if fallback_before in original:
                idx = original.index(fallback_before)
                updated = original[:idx].rstrip() + "\n\n" + block.rstrip() + "\n\n" + original[idx:]
            else:
                updated = original.rstrip() + "\n\n" + block.rstrip() + "\n"
    if updated == original:
        return False
    master_path.write_text(updated)
    return True


def upsert_registry_tags(registry_path: Path, seed_results: list[SeedResult]) -> tuple[bool, list[str]]:
    rows = list(csv.DictReader(registry_path.read_text().splitlines()))
    fieldnames = list(rows[0].keys())
    index = {r["mbp_id"]: r for r in rows}
    today = datetime.now(timezone.utc).date().isoformat()

    # Remove prior ICS tags first for idempotency.
    for row in rows:
        notes = (row.get("notes") or "").strip()
        if not notes:
            continue
        parts = [p.strip() for p in notes.split(";") if p.strip()]
        parts = [p for p in parts if not p.startswith("ctx_seed=ICS-")]
        row["notes"] = "; ".join(parts)

    missing_ids: list[str] = []
    for res in seed_results:
        if not res.eligible or res.blocked_by_unindexed:
            continue
        s = res.seed
        tag = (
            f"ctx_seed={s['id']}/corpus=industry-context-field-artifacts"
            f"/doc={s['primary_doc']}/feature={s['feature_number']}/conf=high/date={today}"
        )
        for mbp_id in s["mbp_ids"]:
            row = index.get(mbp_id)
            if row is None:
                missing_ids.append(mbp_id)
                continue
            notes = (row.get("notes") or "").strip()
            if notes:
                if tag not in notes:
                    row["notes"] = f"{notes}; {tag}"
            else:
                row["notes"] = tag

    # Keep registry sorted by MBP id.
    rows.sort(key=lambda r: int(r["mbp_id"].split("-")[1]))
    # Write with csv to preserve quotes and keep LF line endings for idempotency.
    import io

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    new_text = buf.getvalue()
    old_text = registry_path.read_text()
    if new_text == old_text:
        return False, sorted(set(missing_ids))
    registry_path.write_text(new_text)
    return True, sorted(set(missing_ids))


def update_state(state_path: Path, mode: str, staged_new_docs: list[str], unindexed_docs: list[str], applied_seed_ids: list[str]) -> None:
    state = {}
    if state_path.exists():
        state = json.loads(state_path.read_text())
    state["last_run_utc"] = datetime.now(timezone.utc).isoformat()
    state["last_mode"] = mode
    state["last_detected_new_docs"] = staged_new_docs
    state["last_unindexed_docs"] = unindexed_docs
    state["last_applied_seed_ids"] = applied_seed_ids
    state_path.write_text(json.dumps(state, indent=2) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--state", default=str(DEFAULT_STATE))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--draft", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--staged-docs", default="", help="Comma-separated override for staged new docs.")
    args = parser.parse_args()

    run_mode = "apply" if args.apply else "draft"

    config = json.loads(Path(args.config).read_text())
    corpus_folder = config["corpus"]["folder"]
    index_name = config["corpus"]["index_file"]
    additional_index_patterns = list(config["corpus"].get("additional_index_files", []))
    corpus_path = ROOT / corpus_folder
    index_paths = resolve_index_paths(corpus_path, index_name, additional_index_patterns)
    master_path = ROOT / config["output"]["master_build_list"]
    registry_path = ROOT / config["output"]["registry_csv"]
    state_path = Path(args.state)

    if args.staged_docs.strip():
        staged_new_docs = sorted({d.strip() for d in args.staged_docs.split(",") if d.strip()})
    else:
        staged_new_docs = parse_staged_new_docs(corpus_folder, index_name, additional_index_patterns)

    indexed_files: set[str] = set()
    domains: set[str] = set()
    for index_path in index_paths:
        files, found_domains = parse_index(index_path)
        indexed_files |= files
        domains |= found_domains
    seed_results, open_candidates = resolve_seeds(config, indexed_files, domains, staged_new_docs)
    unindexed_docs = sorted(set(staged_new_docs) - indexed_files)

    eligible = [r for r in seed_results if r.eligible]
    applied_candidates = [r for r in eligible if not r.blocked_by_unindexed]

    print("Industry context seeding summary")
    print(f"- Corpus folder: {corpus_folder}")
    print(f"- Index files parsed: {len(index_paths)}")
    print(f"- Indexed files: {len(indexed_files)}")
    print(f"- Domains detected: {len(domains)}")
    print(f"- Staged new docs: {len(staged_new_docs)}")
    print(f"- Eligible seeds: {len(eligible)}")
    print(f"- Eligible and unblocked seeds: {len(applied_candidates)}")
    if staged_new_docs:
        print("- New docs detected:")
        for d in staged_new_docs:
            print(f"  - {d}")
    if unindexed_docs:
        print("- Unindexed new docs (skipped for apply):")
        for d in unindexed_docs:
            print(f"  - {d}")

    if open_candidates:
        print("- Open candidate seeds:")
        for c in open_candidates:
            print(f"  - {c['id']} (feature {c['feature']}): {', '.join(c['reasons'])}")

    if run_mode == "draft":
        print("\nProposed seed rows:")
        for r in applied_candidates:
            print(f"- {r.seed['id']} -> feature #{r.seed['feature_number']} ({r.seed['feature_name']})")
        update_state(state_path, "draft", staged_new_docs, unindexed_docs, [])
        return 0

    block = render_seeding_block(config, seed_results, master_path)
    changed_master = upsert_master_seeding_block(master_path, block, config["output"]["section_title"])
    changed_registry, missing_ids = upsert_registry_tags(registry_path, seed_results)

    applied_seed_ids = [r.seed["id"] for r in applied_candidates]
    update_state(state_path, "apply", staged_new_docs, unindexed_docs, applied_seed_ids)

    print("\nApply results:")
    print(f"- MASTER-BUILD-LIST updated: {'yes' if changed_master else 'no'}")
    print(f"- MASTER-FEATURE-REGISTRY updated: {'yes' if changed_registry else 'no'}")
    print(f"- State manifest updated: yes")
    if missing_ids:
        print("- Missing MBP IDs (tag skipped):")
        for m in missing_ids:
            print(f"  - {m}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
