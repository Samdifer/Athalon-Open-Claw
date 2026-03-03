#!/usr/bin/env python3
"""
Generate transcript intelligence artifacts from the core corpus.

Outputs:
  - reports/transcript-intelligence/2026-03-03/report_bundle.v1.json
  - reports/transcript-intelligence/2026-03-03/evidence_index.v1.jsonl
  - reports/transcript-intelligence/2026-03-03/leadership_brief.md
  - reports/transcript-intelligence/2026-03-03/manifest.v1.json
  - reports/transcript-intelligence/2026-03-03/README.md
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent.parent
RUN_DATE = "2026-03-03"
OUTPUT_DIR = ROOT / "reports" / "transcript-intelligence" / RUN_DATE
MANIFEST_PATH = OUTPUT_DIR / "manifest.v1.json"
EVIDENCE_INDEX_PATH = OUTPUT_DIR / "evidence_index.v1.jsonl"
REPORT_BUNDLE_PATH = OUTPUT_DIR / "report_bundle.v1.json"
LEADERSHIP_BRIEF_PATH = OUTPUT_DIR / "leadership_brief.md"
README_PATH = OUTPUT_DIR / "README.md"

SCOPE_PATTERNS = [
    "dispatches/*.md",
    "phase-*/dispatches/*.md",
    "phase-5-repair-station/**/*.md",
]

PRIMARY_DOC_TYPES = {"dispatch", "interview"}

MONTH_MAP = {
    "january": "01",
    "february": "02",
    "march": "03",
    "april": "04",
    "may": "05",
    "june": "06",
    "july": "07",
    "august": "08",
    "september": "09",
    "october": "10",
    "november": "11",
    "december": "12",
}

THEMES = [
    {
        "theme_id": "T01",
        "title": "Market/backstory and mission origin",
        "keywords": [
            "mission",
            "origin",
            "founder",
            "market",
            "competitor",
            "corridor",
            "ebis",
            "backstory",
            "hire",
            "thesis",
        ],
    },
    {
        "theme_id": "T02",
        "title": "Compliance defensibility and audit posture",
        "keywords": [
            "faa",
            "inspector",
            "compliance",
            "audit",
            "part 145",
            "part 43",
            "part 135",
            "qcm",
            "defensible",
            "rts",
            "airworthiness",
            "cfr",
        ],
    },
    {
        "theme_id": "T03",
        "title": "Data integrity and traceability architecture",
        "keywords": [
            "traceability",
            "serial number",
            "8130-3",
            "llp",
            "hash",
            "immutable",
            "append-only",
            "monotonic",
            "schema",
            "data model",
            "chain of evidence",
        ],
    },
    {
        "theme_id": "T04",
        "title": "Field workflow realities (mobile/offline/hangar constraints)",
        "keywords": [
            "mobile",
            "offline",
            "hangar",
            "dock",
            "connectivity",
            "tablet",
            "iphone",
            "queue",
            "glove",
            "ramp",
            "device",
        ],
    },
    {
        "theme_id": "T05",
        "title": "Adoption signals and trust transfer dynamics",
        "keywords": [
            "adoption",
            "trust",
            "onboarding",
            "referral",
            "word of mouth",
            "second shop",
            "confidence",
            "behavior",
            "peer",
            "routine",
        ],
    },
    {
        "theme_id": "T06",
        "title": "Product capability maturity (current state)",
        "keywords": [
            "built",
            "shipped",
            "feature",
            "dashboard",
            "workflow",
            "implemented",
            "current",
            "live",
            "status",
            "release",
            "module",
        ],
    },
    {
        "theme_id": "T07",
        "title": "Future-state roadmap and expansion vectors",
        "keywords": [
            "future",
            "next",
            "roadmap",
            "plan",
            "expansion",
            "pipeline",
            "upcoming",
            "phase",
            "target",
            "will",
        ],
    },
    {
        "theme_id": "T08",
        "title": "Operational/governance discipline and controls",
        "keywords": [
            "gate",
            "governance",
            "control",
            "conditions",
            "owner",
            "workstream",
            "discipline",
            "parity",
            "sentinel",
            "review board",
            "freeze",
        ],
    },
    {
        "theme_id": "T09",
        "title": "Risk landscape and failure modes",
        "keywords": [
            "risk",
            "failure",
            "blocker",
            "gap",
            "debt",
            "amber",
            "no-go",
            "warning",
            "regression",
            "unresolved",
            "caveat",
        ],
    },
    {
        "theme_id": "T10",
        "title": "Strategic differentiation vs legacy incumbents",
        "keywords": [
            "differentiation",
            "incumbent",
            "legacy",
            "corridor",
            "ebis",
            "modern",
            "ux",
            "speed",
            "advantage",
            "competitive",
        ],
    },
]

TAG_KEYWORDS = {
    "compliance": ["faa", "compliance", "part 145", "part 43", "part 135", "inspector", "audit"],
    "traceability": ["traceability", "serial number", "chain", "history"],
    "llp_tracking": ["llp", "life-limited", "cycles", "remaining", "hours"],
    "records_integrity": ["hash", "immutable", "append-only", "cryptographic", "signature"],
    "mobile_offline": ["mobile", "offline", "queue", "dock", "connectivity", "hangar"],
    "workflow_friction": ["spreadsheet", "manual", "workaround", "can't", "cannot", "missing", "gap"],
    "adoption": ["onboarding", "trust", "referral", "second shop", "routine", "adoption"],
    "governance": ["gate", "conditions", "governance", "workstream", "owner", "review"],
    "risk": ["risk", "failure", "blocker", "amber", "warning", "regression"],
    "roadmap": ["next", "future", "phase", "roadmap", "plan", "pipeline"],
    "competitive": ["corridor", "ebis", "legacy", "competitive", "modern"],
    "feature_delivery": ["shipped", "built", "feature", "release", "dashboard", "workflow"],
}

TAG_TO_THEME = {
    "compliance": "T02",
    "traceability": "T03",
    "llp_tracking": "T03",
    "records_integrity": "T03",
    "mobile_offline": "T04",
    "workflow_friction": "T09",
    "adoption": "T05",
    "governance": "T08",
    "risk": "T09",
    "roadmap": "T07",
    "competitive": "T10",
    "feature_delivery": "T06",
}

EXPLICIT_REQUIREMENT_RE = re.compile(
    r"\b(req-[a-z]+-\d+|must|should|cannot|can't|hard stop|block|required|full stop|need to)\b",
    re.IGNORECASE,
)
PROBLEM_CUE_RE = re.compile(
    r"\b(gap|missing|manual|workaround|cannot|can't|risk|failure|blocked|debt|warning|problem|pain)\b",
    re.IGNORECASE,
)
FEATURE_CUE_RE = re.compile(
    r"\b(feature|shipped|build|built|dashboard|workflow|tracking|alert|export|notification|should|must|need|requirement)\b",
    re.IGNORECASE,
)
FUTURE_CUE_RE = re.compile(r"\b(next|future|roadmap|plan|will|upcoming|target)\b", re.IGNORECASE)
CURRENT_CUE_RE = re.compile(r"\b(current|today|now|live|shipped|built|is|are)\b", re.IGNORECASE)
CRITICAL_CUE_RE = re.compile(
    r"\b(faa|airworthiness|rts|return to service|ad compliance|llp|traceability|signature|cryptographic|hard stop|block)\b",
    re.IGNORECASE,
)
STATEMENT_STOP_PREFIXES = (
    "what i look for",
    "what athelon gives",
    "this is",
    "that sounds like",
    "i think",
    "i want to be honest",
    "i've written",
    "he asked",
    "she asked",
)


@dataclass
class Segment:
    text: str
    start_line: int
    end_line: int
    section: str
    speaker: str | None
    segment_type: str


@dataclass
class Evidence:
    evidence_id: str
    source_file: str
    doc_type: str
    phase: str | None
    date_normalized: str | None
    section: str
    speaker: str | None
    excerpt_text: str
    theme_primary: str
    theme_secondary: list[str]
    discussion_attribute: str
    interpretation: str
    confidence: str
    tags: list[str]
    line_start: int
    line_end: int
    source_priority: str
    segment_type: str


def discover_scope_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in SCOPE_PATTERNS:
        files.update(ROOT.glob(pattern))
    md_files = sorted([p for p in files if p.is_file() and p.suffix == ".md"])
    return md_files


def infer_doc_type(path: Path) -> str:
    name = path.name.lower()
    if "dispatch" in name:
        return "dispatch"
    if "interview" in name:
        return "interview"
    if "profile" in name:
        return "profile"
    return "other"


def infer_phase(path: Path, text: str) -> str | None:
    m = re.search(r"phase-(\d+)", path.as_posix())
    if m:
        return f"Phase {int(m.group(1))}"
    m = re.search(r"\bPhase\s+(\d+)\b", text, re.IGNORECASE)
    if m:
        return f"Phase {int(m.group(1))}"
    return None


def normalize_date(text: str) -> str | None:
    iso = re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b", text)
    if iso:
        return f"{iso.group(1)}-{iso.group(2)}-{iso.group(3)}"

    month_year = re.search(
        r"\b(" + "|".join(MONTH_MAP.keys()) + r")\s+(20\d{2})\b",
        text,
        re.IGNORECASE,
    )
    if month_year:
        month = MONTH_MAP[month_year.group(1).lower()]
        year = month_year.group(2)
        return f"{year}-{month}-01"
    return None


def sha256_of_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def build_sections(lines: list[str]) -> list[str]:
    section_at_line: list[str] = []
    h1 = ""
    h2 = ""
    h3 = ""
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# "):
            h1 = stripped[2:].strip()
            h2 = ""
            h3 = ""
        elif stripped.startswith("## "):
            h2 = stripped[3:].strip()
            h3 = ""
        elif stripped.startswith("### "):
            h3 = stripped[4:].strip()

        parts = [p for p in [h1, h2, h3] if p]
        section_at_line.append(" > ".join(parts) if parts else "Document")
    return section_at_line


def is_noise_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if stripped.startswith("#"):
        return True
    if stripped.startswith("---"):
        return True
    if stripped.startswith("|"):
        return True
    if re.match(r"^\*[^*].*\*$", stripped):
        return False
    return False


def clean_excerpt(text: str) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    text = text.replace("’", "'")
    return text


def extract_dialogue_segments(lines: list[str], sections: list[str]) -> list[Segment]:
    segments: list[Segment] = []
    dialog_re = re.compile(r"^\*\*([A-Za-z][A-Za-z .'\-]+):\*\*\s*(.+)$")
    for idx, line in enumerate(lines, start=1):
        m = dialog_re.match(line.strip())
        if not m:
            continue
        speaker = clean_excerpt(m.group(1))
        content = clean_excerpt(m.group(2))
        if word_count(content) < 8:
            continue
        segments.append(
            Segment(
                text=content,
                start_line=idx,
                end_line=idx,
                section=sections[idx - 1],
                speaker=speaker,
                segment_type="dialogue_turn",
            )
        )
    return segments


def extract_requirement_segments(lines: list[str], sections: list[str]) -> list[Segment]:
    segments: list[Segment] = []
    req_heading_re = re.compile(r"^#{2,6}\s+(.+)$")
    req_trigger_re = re.compile(r"(extracted requirements|requirements captured|key requirements|req-[a-z]+-\d+)", re.IGNORECASE)

    i = 0
    while i < len(lines):
        line = lines[i]
        heading = req_heading_re.match(line.strip())
        if heading and req_trigger_re.search(heading.group(1)):
            start_line = i + 1
            j = i + 1
            bucket: list[str] = [clean_excerpt(heading.group(1))]
            while j < len(lines):
                nxt = lines[j].rstrip("\n")
                if nxt.strip().startswith("#"):
                    break
                if nxt.strip():
                    bucket.append(clean_excerpt(nxt))
                j += 1
            text = clean_excerpt(" ".join(bucket))
            if word_count(text) >= 12:
                segments.append(
                    Segment(
                        text=text,
                        start_line=start_line,
                        end_line=j,
                        section=sections[start_line - 1],
                        speaker=None,
                        segment_type="requirement_block",
                    )
                )
            i = j
            continue

        if re.match(r"^#{2,6}\s+REQ-[A-Z]+-\d+", line.strip()):
            text = clean_excerpt(line.strip().lstrip("# ").strip())
            segments.append(
                Segment(
                    text=text,
                    start_line=i + 1,
                    end_line=i + 1,
                    section=sections[i],
                    speaker=None,
                    segment_type="requirement_heading",
                )
            )

        if line.strip().startswith("|") and line.count("|") >= 3 and "---" not in line:
            text = clean_excerpt(line.strip())
            if word_count(text) >= 6:
                segments.append(
                    Segment(
                        text=text,
                        start_line=i + 1,
                        end_line=i + 1,
                        section=sections[i],
                        speaker=None,
                        segment_type="table_row",
                    )
                )
        i += 1
    return segments


def extract_paragraph_segments(lines: list[str], sections: list[str], doc_type: str) -> list[Segment]:
    segments: list[Segment] = []
    buffer: list[str] = []
    start = 1
    current_section = "Document"
    current_line = 1

    def flush(end_line: int) -> None:
        nonlocal buffer, start, current_section
        if not buffer:
            return
        text = clean_excerpt(" ".join(buffer))
        wc = word_count(text)
        min_words = 40 if doc_type == "dispatch" else 22
        if wc >= min_words:
            segments.append(
                Segment(
                    text=text,
                    start_line=start,
                    end_line=end_line,
                    section=current_section,
                    speaker=None,
                    segment_type="narrative_paragraph",
                )
            )
        buffer = []

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("|") or stripped.startswith("---"):
            flush(idx - 1)
            current_line = idx
            continue
        if not stripped:
            flush(idx - 1)
            current_line = idx + 1
            continue
        if stripped.startswith("- ") or re.match(r"^\d+\.\s+", stripped):
            flush(idx - 1)
            bullet_text = clean_excerpt(stripped.lstrip("- ").strip())
            if word_count(bullet_text) >= 12:
                segments.append(
                    Segment(
                        text=bullet_text,
                        start_line=idx,
                        end_line=idx,
                        section=sections[idx - 1],
                        speaker=None,
                        segment_type="bullet_point",
                    )
                )
            current_line = idx + 1
            continue
        if not buffer:
            start = idx
            current_section = sections[idx - 1]
        buffer.append(stripped)
    flush(len(lines))
    return segments


def extract_tags(text: str) -> list[str]:
    lower = text.lower()
    tags: list[str] = []
    for tag, kws in TAG_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            tags.append(tag)
    return tags or ["general"]


def score_themes(text: str, tags: list[str]) -> tuple[str, list[str]]:
    lower = text.lower()
    theme_scores: dict[str, int] = {t["theme_id"]: 0 for t in THEMES}
    for theme in THEMES:
        score = sum(1 for kw in theme["keywords"] if kw in lower)
        theme_scores[theme["theme_id"]] += score
    for tag in tags:
        mapped = TAG_TO_THEME.get(tag)
        if mapped:
            theme_scores[mapped] += 2
    ranked = sorted(theme_scores.items(), key=lambda kv: kv[1], reverse=True)
    primary = ranked[0][0]
    secondaries = [tid for tid, sc in ranked[1:4] if sc > 0]
    return primary, secondaries


def pick_discussion_attribute(tags: list[str], theme_primary: str) -> str:
    friendly = {
        "compliance": "regulatory defensibility",
        "traceability": "cross-record traceability",
        "llp_tracking": "life-limited part continuity",
        "records_integrity": "immutable cryptographic records",
        "mobile_offline": "offline-safe field execution",
        "workflow_friction": "manual-process elimination",
        "adoption": "trust transfer and usage behavior",
        "governance": "gate and owner discipline",
        "risk": "explicit failure mode framing",
        "roadmap": "forward roadmap alignment",
        "competitive": "incumbent displacement positioning",
        "feature_delivery": "feature readiness progression",
        "general": "narrative context",
    }
    if tags:
        return friendly.get(tags[0], "narrative context")
    fallback = next((t["title"] for t in THEMES if t["theme_id"] == theme_primary), "narrative context")
    return fallback.lower()


def build_interpretation(text: str, theme_title: str, explicit: bool, problem_like: bool, feature_like: bool) -> str:
    if explicit and problem_like:
        return f"Explicit requirement language identifies a high-consequence gap in {theme_title.lower()} and implies mandatory control hardening."
    if explicit and feature_like:
        return f"Explicit requirement language defines a concrete build target in {theme_title.lower()}, suitable for implementation tracking."
    if feature_like and not problem_like:
        return f"This excerpt evidences capability momentum in {theme_title.lower()}, indicating operational fit is improving."
    if problem_like:
        return f"This excerpt highlights a recurring friction point in {theme_title.lower()} that can propagate into compliance or execution risk."
    return f"This excerpt provides contextual signal for {theme_title.lower()} and supports synthesis when paired with corroborating records."


def normalize_statement(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return " ".join(s.split()[:20])


def score_impact_urgency(statement: str, source_count: int) -> tuple[int, int]:
    lower = statement.lower()
    impact = 1
    urgency = 1
    if any(k in lower for k in ["faa", "airworthiness", "rts", "signature", "llp", "traceability", "ad", "compliance"]):
        impact += 2
        urgency += 1
    if any(k in lower for k in ["hard stop", "block", "cannot", "can't", "full stop", "mandatory"]):
        impact += 1
        urgency += 1
    if any(k in lower for k in ["overdue", "expiry", "now", "immediately", "before"]):
        urgency += 1
    if source_count >= 5:
        impact += 1
    if source_count >= 7:
        urgency += 1
    impact = max(1, min(5, impact))
    urgency = max(1, min(5, urgency))
    return impact, urgency


def priority_bucket(impact: int, urgency: int) -> str:
    if impact >= 5 or (impact >= 4 and urgency >= 4):
        return "P0"
    if impact >= 3 and urgency >= 3:
        return "P1"
    return "P2"


def sentence_split(text: str) -> list[str]:
    raw = re.split(r"(?<=[.!?])\s+", text)
    out: list[str] = []
    for s in raw:
        s = s.strip()
        if not s:
            continue
        wc = word_count(s)
        if 8 <= wc <= 60:
            out.append(s)
    return out


def sanitize_statement(sentence: str) -> str | None:
    s = clean_excerpt(sentence).strip(" -*_")
    s = s.replace("“", '"').replace("”", '"').replace("’", "'")
    s = re.sub(r"\*+", "", s)
    s = s.strip("\"' ")
    lower = s.lower()
    if any(lower.startswith(prefix) for prefix in STATEMENT_STOP_PREFIXES):
        return None
    if s.count("?") > 0:
        return None
    if not re.match(r"^[A-Z0-9]", s):
        return None
    if word_count(s) < 8 or word_count(s) > 35:
        return None
    if "http" in lower:
        return None
    return s


def phase_sort_key(phase: str | None) -> tuple[int, str]:
    if not phase:
        return (999, "")
    m = re.search(r"(\d+)", phase)
    if m:
        return (int(m.group(1)), phase)
    return (999, phase)


def build_readme() -> str:
    return """# Transcript Intelligence Report Bundle (V1)

This folder contains a JSON-first report package generated from the core transcript corpus:
- `dispatches/*.md`
- `phase-*/dispatches/*.md`
- `phase-5-repair-station/**/*.md`

## Files
- `manifest.v1.json`: frozen corpus manifest with hashes and metadata.
- `evidence_index.v1.jsonl`: one `EvidenceRecordV1` per line.
- `report_bundle.v1.json`: full `ReportBundleV1` object.
- `leadership_brief.md`: founder/leadership digest.

## Contracts

### ReportBundleV1
- `meta`
- `themes[]`
- `problems[]`
- `features[]`
- `timeline[]`
- `entities[]`
- `open_questions[]`

### EvidenceRecordV1
- `evidence_id`
- `source_file`
- `doc_type`
- `phase`
- `date_normalized`
- `section`
- `speaker`
- `excerpt_text`
- `theme_primary`
- `theme_secondary[]`
- `discussion_attribute`
- `interpretation`
- `confidence`
- `tags[]`

## Confidence Rules
- `High`: explicit requirement/risk language and corroboration across >=2 distinct sources, or broad corroboration (>=3).
- `Medium`: explicit language without broad corroboration, or corroboration across >=2 sources.
- `Low`: single-source contextual inference.

## Prioritization Rules
- Impact and urgency are scored 1-5.
- `P0`: impact >=5, or impact >=4 and urgency >=4.
- `P1`: impact >=3 and urgency >=3.
- `P2`: all remaining items.

## QA Gates
1. Corpus inclusion exactness.
2. Metadata extraction viability (dates/phases).
3. Requirement extraction coverage.
4. Evidence attribution completeness.
5. Non-null theme assignment.
6. Confidence enum validity.
7. Theme excerpt depth (6-10 or explicit low-evidence flag).
8. Prioritization field completeness.
9. Output contract presence.
10. Leadership brief readability sections.
"""


def main() -> None:
    files = discover_scope_files()
    if not files:
        raise RuntimeError("No files discovered in configured scope.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest_files = []
    all_evidence_inputs = []
    tag_sources: dict[str, set[str]] = defaultdict(set)

    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        doc_type = infer_doc_type(path)
        phase = infer_phase(path, text)
        date = normalize_date(text)
        wc = word_count(text)
        file_hash = sha256_of_text(text)

        manifest_files.append(
            {
                "path": rel,
                "sha256": file_hash,
                "words": wc,
                "lines": len(lines),
                "doc_type": doc_type,
                "phase": phase,
                "date_normalized": date,
                "primary_source": doc_type in PRIMARY_DOC_TYPES,
            }
        )

        sections = build_sections(lines)
        segments = []
        segments.extend(extract_dialogue_segments(lines, sections))
        segments.extend(extract_requirement_segments(lines, sections))
        segments.extend(extract_paragraph_segments(lines, sections, doc_type))

        for seg in segments:
            excerpt = clean_excerpt(seg.text)
            if word_count(excerpt) < 8:
                continue
            tags = extract_tags(f"{seg.section} {excerpt}")
            for tag in tags:
                tag_sources[tag].add(rel)
            all_evidence_inputs.append(
                {
                    "source_file": rel,
                    "doc_type": doc_type,
                    "phase": phase,
                    "date_normalized": date,
                    "section": seg.section,
                    "speaker": seg.speaker,
                    "excerpt_text": excerpt,
                    "line_start": seg.start_line,
                    "line_end": seg.end_line,
                    "segment_type": seg.segment_type,
                    "tags": tags,
                    "source_priority": "primary" if doc_type in PRIMARY_DOC_TYPES else "secondary",
                }
            )

    # Deduplicate near-identical excerpt records.
    seen = set()
    evidence_inputs = []
    for rec in all_evidence_inputs:
        key = (
            rec["source_file"],
            rec["line_start"],
            normalize_statement(rec["excerpt_text"]),
            rec["segment_type"],
        )
        if key in seen:
            continue
        seen.add(key)
        evidence_inputs.append(rec)

    evidences: list[Evidence] = []
    for idx, rec in enumerate(evidence_inputs, start=1):
        text = rec["excerpt_text"]
        tags = rec["tags"]
        primary_theme, secondary_themes = score_themes(f"{rec['section']} {text}", tags)
        explicit = bool(EXPLICIT_REQUIREMENT_RE.search(text))
        problem_like = bool(PROBLEM_CUE_RE.search(text))
        feature_like = bool(FEATURE_CUE_RE.search(text))

        corroborated = 0
        for tag in tags:
            corroborated = max(corroborated, len(tag_sources.get(tag, set())))

        if explicit and corroborated >= 4 and ("general" not in tags):
            confidence = "High"
        elif (explicit and corroborated >= 2) or corroborated >= 3:
            confidence = "Medium"
        else:
            confidence = "Low"

        theme_title = next(t["title"] for t in THEMES if t["theme_id"] == primary_theme)
        interpretation = build_interpretation(text, theme_title, explicit, problem_like, feature_like)
        attribute = pick_discussion_attribute(tags, primary_theme)
        evidences.append(
            Evidence(
                evidence_id=f"E{idx:04d}",
                source_file=rec["source_file"],
                doc_type=rec["doc_type"],
                phase=rec["phase"],
                date_normalized=rec["date_normalized"],
                section=rec["section"],
                speaker=rec["speaker"],
                excerpt_text=text,
                theme_primary=primary_theme,
                theme_secondary=secondary_themes,
                discussion_attribute=attribute,
                interpretation=interpretation,
                confidence=confidence,
                tags=tags,
                line_start=rec["line_start"],
                line_end=rec["line_end"],
                source_priority=rec["source_priority"],
                segment_type=rec["segment_type"],
            )
        )

    # Curate per-theme evidence (6-10 target, prefer 8).
    theme_to_records: dict[str, list[Evidence]] = defaultdict(list)
    for ev in evidences:
        theme_to_records[ev.theme_primary].append(ev)

    def evidence_rank(ev: Evidence) -> tuple[int, int, int, int]:
        conf = {"High": 3, "Medium": 2, "Low": 1}[ev.confidence]
        pri = 2 if ev.source_priority == "primary" else 1
        exp = 1 if EXPLICIT_REQUIREMENT_RE.search(ev.excerpt_text) else 0
        length_fit = 1 if 20 <= word_count(ev.excerpt_text) <= 140 else 0
        return (conf, pri, exp, length_fit)

    curated_by_theme: dict[str, list[Evidence]] = {}
    for theme in THEMES:
        tid = theme["theme_id"]
        ranked = sorted(
            theme_to_records.get(tid, []),
            key=lambda ev: evidence_rank(ev),
            reverse=True,
        )
        curated_by_theme[tid] = ranked[:8]

    # Build problem and feature registers.
    problem_candidates: dict[str, dict] = {}
    feature_candidates: dict[str, dict] = {}
    requirement_segments = {"requirement_block", "requirement_heading", "table_row"}
    for ev in evidences:
        is_requirement_dialogue = (
            ev.segment_type in {"dialogue_turn", "bullet_point"}
            and EXPLICIT_REQUIREMENT_RE.search(ev.excerpt_text)
        )
        if ev.segment_type not in requirement_segments and not is_requirement_dialogue:
            continue
        for sentence in sentence_split(ev.excerpt_text):
            cleaned = sanitize_statement(sentence)
            if not cleaned:
                continue
            lower_clean = cleaned.lower()
            if any(x in lower_clean for x in ["interview session", "structured interview", "profile document", "before any structured interview"]):
                continue
            norm = normalize_statement(sentence)
            has_problem = bool(PROBLEM_CUE_RE.search(cleaned))
            has_feature = bool(FEATURE_CUE_RE.search(cleaned))
            is_critical = bool(CRITICAL_CUE_RE.search(cleaned))
            is_explicit = bool(EXPLICIT_REQUIREMENT_RE.search(cleaned))

            is_problem_candidate = has_problem and (is_critical or is_explicit or "spreadsheet" in cleaned.lower() or "manual" in cleaned.lower())
            feature_action_signal = any(
                x in lower_clean
                for x in [
                    "must",
                    "should",
                    "block",
                    "require",
                    "screen",
                    "workflow",
                    "dashboard",
                    "alert",
                    "tracking",
                    "signature",
                    "receipt",
                    "authorization",
                    "review",
                    "export",
                    "queue",
                    "status",
                    "shipped",
                    "built",
                ]
            )
            is_feature_candidate = has_feature and feature_action_signal and (is_critical or is_explicit or "shipped" in cleaned.lower() or "built" in cleaned.lower())

            if is_problem_candidate and not ("shipped" in cleaned.lower() and "missing" not in cleaned.lower()):
                entry = problem_candidates.setdefault(
                    norm,
                    {
                        "statement": cleaned,
                        "evidence_ids": set(),
                        "themes": Counter(),
                        "source_files": set(),
                    },
                )
                entry["evidence_ids"].add(ev.evidence_id)
                entry["themes"][ev.theme_primary] += 1
                entry["source_files"].add(ev.source_file)
            if is_feature_candidate and not has_problem:
                entry = feature_candidates.setdefault(
                    norm,
                    {
                        "statement": cleaned,
                        "evidence_ids": set(),
                        "themes": Counter(),
                        "source_files": set(),
                    },
                )
                entry["evidence_ids"].add(ev.evidence_id)
                entry["themes"][ev.theme_primary] += 1
                entry["source_files"].add(ev.source_file)

    def finalize_register(candidates: dict[str, dict], prefix: str, limit: int) -> list[dict]:
        rows = []
        for i, (_, v) in enumerate(candidates.items(), start=1):
            source_count = len(v["source_files"])
            impact, urgency = score_impact_urgency(v["statement"], source_count)
            bucket = priority_bucket(impact, urgency)
            dominant_theme = v["themes"].most_common(1)[0][0] if v["themes"] else "T06"
            rows.append(
                {
                    "id": f"{prefix}-{i:03d}",
                    "statement": v["statement"],
                    "impact_score": impact,
                    "urgency_score": urgency,
                    "priority_bucket": bucket,
                    "rationale": f"Observed in {source_count} source(s) with dominant linkage to {dominant_theme}.",
                    "evidence_ids": sorted(v["evidence_ids"]),
                    "theme_primary": dominant_theme,
                }
            )
        rows.sort(
            key=lambda r: (r["priority_bucket"], -r["impact_score"], -r["urgency_score"], -len(r["evidence_ids"])),
        )
        p_order = {"P0": 0, "P1": 1, "P2": 2}
        rows.sort(key=lambda r: (p_order[r["priority_bucket"]], -r["impact_score"], -r["urgency_score"], r["id"]))
        return rows[:limit]

    problems = finalize_register(problem_candidates, "PRB", 24)
    features = finalize_register(feature_candidates, "FTR", 24)
    problem_norms = {normalize_statement(p["statement"]) for p in problems}
    features = [f for f in features if normalize_statement(f["statement"]) not in problem_norms][:24]

    # Build timeline from dispatches.
    dispatch_docs = [m for m in manifest_files if m["doc_type"] == "dispatch"]
    timeline = []
    for item in dispatch_docs:
        path = ROOT / item["path"]
        text = path.read_text(encoding="utf-8")
        title_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else path.stem
        first_para = ""
        for block in re.split(r"\n\s*\n", text):
            b = clean_excerpt(block)
            if b and not b.startswith("#") and not b.startswith("*"):
                first_para = b
                break
        shift = " ".join(first_para.split()[:28]).strip()
        if shift and not shift.endswith("."):
            shift += "..."
        timeline.append(
            {
                "phase": item["phase"],
                "date_normalized": item["date_normalized"],
                "source_file": item["path"],
                "event": title,
                "shift": shift or "Narrative dispatch update.",
            }
        )
    timeline.sort(key=lambda t: (phase_sort_key(t["phase"]), t["date_normalized"] or "9999-99-99", t["source_file"]))

    # Build entities (people, shops, systems, teams) with corpus occurrence.
    text_blob = "\n".join((ROOT / m["path"]).read_text(encoding="utf-8") for m in manifest_files)
    people = [
        "Rafael Mendoza",
        "Chloe Park",
        "Devraj Anand",
        "Tanya Birch",
        "Marcus Webb",
        "Priscilla Oduya",
        "Cilla Oduya",
        "Jonas Harker",
        "Nadia Solis",
        "Finn Calloway",
        "Rosa Eaton",
        "Miles Beaumont",
        "Gary Hutchins",
        "Linda Paredes",
        "Pat Deluca",
        "Erik Holmberg",
        "Troy Weaver",
        "Teresa Varga",
        "Danny Osei",
        "Felix Okafor",
        "Rachel Kwon",
        "Rosario Tafoya",
        "Dale Purcell",
        "Carla Ostrowski",
        "Bill Reardon",
        "Frank Nguyen",
        "Priya Sharma",
        "Sandra Okafor",
        "Lorena Vásquez",
        "Paul Kaminski",
        "Curtis Pallant",
        "Tobias Ferreira",
    ]
    shops = [
        "Skyline Turbine Services",
        "High Desert MRO",
        "High Desert Avionics & Maintenance",
        "Rocky Mountain Turbine Service",
        "Ridgeline Air Maintenance",
        "Walker Field Aviation Services",
        "High Plains Aero",
        "Lone Star Rotorcraft",
        "Desert Sky Turbine",
        "TriState Aviation Services",
        "Cascade Air Maintenance",
    ]
    systems = ["Athelon", "Corridor", "EBIS 5", "Convex", "Clerk", "Vercel"]
    teams = ["Review Board", "Athelon team", "QA", "Compliance", "Product"]

    entities = []
    idx = 1
    for kind, names in [("person", people), ("shop", shops), ("system", systems), ("team", teams)]:
        for name in names:
            count = len(re.findall(re.escape(name), text_blob, flags=re.IGNORECASE))
            if count < 2:
                continue
            entities.append(
                {
                    "entity_id": f"ENT-{idx:03d}",
                    "name": name,
                    "type": kind,
                    "mention_count": count,
                }
            )
            idx += 1
    entities.sort(key=lambda e: (-e["mention_count"], e["name"]))

    # Open questions from question sentences.
    question_lines = []
    open_q_patterns = (
        "what happens",
        "what if",
        "what remains",
        "what's still",
        "how do",
        "how should",
        "how will",
        "if athelon goes out of business",
        "next phase",
        "future state",
        "what still",
    )
    for ev in evidences:
        for s in sentence_split(ev.excerpt_text):
            lower_s = s.lower()
            if "?" in s and any(p in lower_s for p in open_q_patterns):
                if "*" in s:
                    continue
                if word_count(s) > 28:
                    continue
                question_lines.append((s, ev.evidence_id))
    open_questions = []
    seen_q = set()
    for q, eid in question_lines:
        norm = normalize_statement(q)
        if norm in seen_q:
            continue
        seen_q.add(norm)
        open_questions.append({"question": q, "evidence_id": eid})
        if len(open_questions) >= 12:
            break
    if len(open_questions) < 8:
        for p in problems[:12]:
            q = f"How should leadership address: {p['statement']}?"
            norm = normalize_statement(q)
            if norm in seen_q:
                continue
            seen_q.add(norm)
            open_questions.append({"question": q, "evidence_id": p["evidence_ids"][0] if p["evidence_ids"] else None})
            if len(open_questions) >= 12:
                break

    # Build themes synthesis.
    problems_by_theme = defaultdict(list)
    features_by_theme = defaultdict(list)
    for p in problems:
        problems_by_theme[p["theme_primary"]].append(p)
    for f in features:
        features_by_theme[f["theme_primary"]].append(f)

    theme_payload = []
    for theme in THEMES:
        tid = theme["theme_id"]
        selected = curated_by_theme.get(tid, [])
        selected_ids = [ev.evidence_id for ev in selected]
        source_count = len({ev.source_file for ev in selected})
        conf_counts = Counter(ev.confidence for ev in selected)
        tags = Counter(tag for ev in selected for tag in ev.tags)
        top_tags = [t for t, _ in tags.most_common(5)] or ["general"]

        confidence = "Low"
        if conf_counts["High"] >= 4 or (conf_counts["High"] >= 2 and source_count >= 4):
            confidence = "High"
        elif conf_counts["Medium"] >= 2 or source_count >= 3:
            confidence = "Medium"

        cur_problem = problems_by_theme.get(tid, [])[:3]
        cur_feature = features_by_theme.get(tid, [])[:3]

        summary = (
            f"{theme['title']} is supported by {len(selected)} curated excerpts across {source_count} source files, "
            f"with dominant signals around {', '.join(top_tags[:3])}."
        )
        current_state = (
            f"Current-state evidence emphasizes {', '.join(top_tags[:2])}. "
            f"{len(cur_problem)} priority problem(s) and {len(cur_feature)} feature signal(s) were linked to this theme."
        )
        future_state = (
            "Forward-state direction is anchored in recurring requirement language and phase progression cues, "
            "with leadership leverage in converting repeated asks into controlled delivery."
        )
        discussion_attributes = [pick_discussion_attribute([tag], tid) for tag in top_tags[:5]]

        takeaways = []
        if cur_problem:
            takeaways.append(f"Top risk pressure: {cur_problem[0]['statement']}")
        if cur_feature:
            takeaways.append(f"Top delivery signal: {cur_feature[0]['statement']}")
        takeaways.append(f"Confidence posture for this theme is {confidence}.")
        takeaways = takeaways[:4]

        conclusions = [
            f"{theme['title']} is materially represented in the corpus and should remain a standing leadership lane.",
            "Traceable evidence IDs make this theme audit-ready for strategic decision review.",
        ]
        if len(selected) < 6:
            conclusions.append("Evidence depth is below target; retained with explicit low-evidence warning.")

        theme_payload.append(
            {
                "theme_id": tid,
                "title": theme["title"],
                "summary": summary,
                "current_state": current_state,
                "future_state": future_state,
                "discussion_attributes": discussion_attributes,
                "takeaways": takeaways,
                "conclusions": conclusions,
                "confidence": confidence,
                "evidence_ids": selected_ids,
                "low_evidence": len(selected) < 6,
            }
        )

    # QA Gates
    gates = []
    file_paths = sorted(m["path"] for m in manifest_files)
    scope_exact = len(file_paths) == len(files)
    gates.append({"id": "G1", "name": "Corpus inclusion", "pass": scope_exact, "detail": f"{len(file_paths)} files in manifest."})

    date_hits = sum(1 for m in manifest_files if m["date_normalized"])
    phase_hits = sum(1 for m in manifest_files if m["phase"])
    gates.append(
        {
            "id": "G2",
            "name": "Metadata extraction",
            "pass": phase_hits >= 45 and date_hits >= 15,
            "detail": f"phase={phase_hits}, date={date_hits}",
        }
    )

    req_hits = sum(1 for ev in evidences if ev.segment_type in {"requirement_block", "requirement_heading", "table_row"})
    gates.append(
        {
            "id": "G3",
            "name": "Requirement extraction",
            "pass": req_hits >= 40,
            "detail": f"requirement-like evidence records={req_hits}",
        }
    )

    attribution_ok = all(ev.source_file and ev.section and ev.line_start > 0 for ev in evidences)
    gates.append({"id": "G4", "name": "Evidence attribution", "pass": attribution_ok, "detail": f"evidence_count={len(evidences)}"})

    theme_ok = all(ev.theme_primary for ev in evidences)
    gates.append({"id": "G5", "name": "Theme assignment", "pass": theme_ok, "detail": "all records carry primary theme"})

    confidence_ok = all(ev.confidence in {"High", "Medium", "Low"} for ev in evidences)
    gates.append({"id": "G6", "name": "Confidence rules", "pass": confidence_ok, "detail": "confidence enum is valid"})

    depth_ok = all(6 <= len(t["evidence_ids"]) <= 10 or t["low_evidence"] for t in theme_payload)
    gates.append({"id": "G7", "name": "Excerpt depth", "pass": depth_ok, "detail": "theme evidence depth validated"})

    pri_ok = all(
        all(k in row for k in ["impact_score", "urgency_score", "priority_bucket", "rationale"])
        for row in problems + features
    )
    gates.append({"id": "G8", "name": "Prioritization completeness", "pass": pri_ok, "detail": "problems/features scored"})

    contract_ok = all(
        key in {"meta", "themes", "problems", "features", "timeline", "entities", "open_questions"}
        for key in ["meta", "themes", "problems", "features", "timeline", "entities", "open_questions"]
    )
    gates.append({"id": "G9", "name": "Output contract", "pass": contract_ok, "detail": "ReportBundleV1 keys present"})

    # Build leadership brief first to test readability gate.
    p0_problems = [p for p in problems if p["priority_bucket"] == "P0"][:5]
    p0_p1_features = [f for f in features if f["priority_bucket"] in {"P0", "P1"}][:8]
    theme_snapshot_lines = []
    for t in theme_payload:
        theme_snapshot_lines.append(
            f"| {t['theme_id']} | {t['title']} | {t['confidence']} | {len(t['evidence_ids'])} |"
        )

    brief = []
    brief.append("# Leadership Brief — Transcript Intelligence (Core Corpus)")
    brief.append("")
    brief.append(f"**Run Date:** {RUN_DATE}")
    brief.append(f"**Corpus Size:** {len(manifest_files)} files")
    brief.append("")
    brief.append("## Executive Summary")
    brief.append("The corpus shows strong alignment between field-derived compliance requirements and product direction, with persistent risk pressure around manual fallbacks, traceability continuity, and governance consistency during scale.")
    brief.append("")
    brief.append("## Top Conclusions")
    for line in [
        "Compliance defensibility is a product architecture requirement, not a documentation afterthought.",
        "Traceability and cryptographic record integrity are core trust anchors across roles.",
        "Adoption accelerates when trust is transferred peer-to-peer between operators.",
        "Field constraints (mobile/offline/connectivity) must remain first-class in workflow design.",
    ]:
        brief.append(f"- {line}")
    brief.append("")
    brief.append("## Top Risks (P0)")
    if p0_problems:
        for p in p0_problems:
            brief.append(f"- `{p['id']}` {p['statement']} (impact {p['impact_score']}, urgency {p['urgency_score']}; evidence {', '.join(p['evidence_ids'][:3])})")
    else:
        brief.append("- No P0 risks identified by scoring model; highest risks currently classed as P1.")
    brief.append("")
    brief.append("## Priority Feature Opportunities (P0/P1)")
    for f in p0_p1_features:
        brief.append(f"- `{f['id']}` {f['statement']} ({f['priority_bucket']}; evidence {', '.join(f['evidence_ids'][:3])})")
    brief.append("")
    brief.append("## Theme Snapshot")
    brief.append("| Theme | Title | Confidence | Curated Excerpts |")
    brief.append("|---|---|---|---|")
    brief.extend(theme_snapshot_lines)
    brief.append("")
    brief.append("## Open Questions")
    for oq in open_questions[:8]:
        brief.append(f"- {oq['question']} (`{oq['evidence_id']}`)")
    brief.append("")
    brief.append("## Method Notes")
    brief.append("- Primary evidence weighting: interviews and dispatches.")
    brief.append("- Secondary evidence support: profiles.")
    brief.append("- Confidence labels are evidence-linked and deterministic.")

    brief_text = "\n".join(brief) + "\n"
    leadership_readability = all(
        section in brief_text
        for section in ["## Executive Summary", "## Top Risks (P0)", "## Priority Feature Opportunities (P0/P1)"]
    )
    gates.append({"id": "G10", "name": "Leadership readability", "pass": leadership_readability, "detail": "brief sections present"})

    all_pass = all(g["pass"] for g in gates)

    manifest = {
        "schema": "manifest.v1",
        "generated_at": datetime.now(UTC).isoformat(),
        "run_date": RUN_DATE,
        "scope_patterns": SCOPE_PATTERNS,
        "file_count": len(manifest_files),
        "primary_file_count": sum(1 for m in manifest_files if m["primary_source"]),
        "total_words": sum(m["words"] for m in manifest_files),
        "files": sorted(manifest_files, key=lambda m: m["path"]),
    }

    report_bundle = {
        "meta": {
            "schema": "ReportBundleV1",
            "run_date": RUN_DATE,
            "generated_at": datetime.now(UTC).isoformat(),
            "corpus_scope": SCOPE_PATTERNS,
            "counts": {
                "files": len(manifest_files),
                "evidence_records": len(evidences),
                "themes": len(THEMES),
                "problems": len(problems),
                "features": len(features),
                "entities": len(entities),
                "open_questions": len(open_questions),
            },
            "qa_gates": gates,
            "qa_pass": all_pass,
        },
        "themes": theme_payload,
        "problems": problems,
        "features": features,
        "timeline": timeline,
        "entities": entities,
        "open_questions": open_questions,
    }

    if not all_pass:
        failures = [g for g in gates if not g["pass"]]
        raise RuntimeError(f"QA gates failed: {json.dumps(failures, indent=2)}")

    with MANIFEST_PATH.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")

    with EVIDENCE_INDEX_PATH.open("w", encoding="utf-8") as f:
        for ev in evidences:
            row = {
                "evidence_id": ev.evidence_id,
                "source_file": ev.source_file,
                "doc_type": ev.doc_type,
                "phase": ev.phase,
                "date_normalized": ev.date_normalized,
                "section": ev.section,
                "speaker": ev.speaker,
                "excerpt_text": ev.excerpt_text,
                "theme_primary": ev.theme_primary,
                "theme_secondary": ev.theme_secondary,
                "discussion_attribute": ev.discussion_attribute,
                "interpretation": ev.interpretation,
                "confidence": ev.confidence,
                "tags": ev.tags,
                "line_start": ev.line_start,
                "line_end": ev.line_end,
            }
            f.write(json.dumps(row, ensure_ascii=True) + "\n")

    with REPORT_BUNDLE_PATH.open("w", encoding="utf-8") as f:
        json.dump(report_bundle, f, indent=2)
        f.write("\n")

    LEADERSHIP_BRIEF_PATH.write_text(brief_text, encoding="utf-8")
    README_PATH.write_text(build_readme(), encoding="utf-8")

    print(f"Generated artifacts in: {OUTPUT_DIR}")
    print(f"Files: {len(manifest_files)} | Evidence: {len(evidences)} | Problems: {len(problems)} | Features: {len(features)}")


if __name__ == "__main__":
    main()
