#!/usr/bin/env python3
"""Worker A: Transform Colorado Part 145 data into scored master target list."""

import csv
import math
import os

SRC = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/research/crm-colorado-part145/round-3/team-i-crm-ready-final/FINAL-OUTPUT.csv"
OUT_DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"

OUT_COLS = [
    "entity_id","legal_name","dba_name","city","state","zip","phone","email","website",
    "cert_no","shop_size_class","aircraft_worked_on","profile_archetype",
    "airport_icao","airport_distance_band","overall_confidence","outreach_tier",
    "has_phone","has_email","has_website",
    "website_fit_score","website_fit_rationale",
    "erp_fit_score","erp_fit_rationale",
    "corridor_ebis_likelihood","cross_sell_score",
    "data_source","last_updated"
]

def score_website(row):
    has_website = row["has_website"]
    obs = float(row["observability_score"]) if row["observability_score"] else 0.0
    size = row["shop_size_class"]
    archetype = row["profile_archetype"]
    has_phone = row["has_phone"]
    has_email = row["has_email"]
    on_airport = row["airport_proximity_profile"] == "on-airport"

    score = 0
    reasons = []

    # Website presence / quality
    if has_website == "no":
        score += 40
        reasons.append("no website (+40)")
    elif has_website == "yes" and obs < 0.4:
        score += 30
        reasons.append(f"weak site obs={obs:.2f} (+30)")
    elif has_website == "yes" and obs >= 0.7:
        score += 5
        reasons.append(f"strong site obs={obs:.2f}; low redesign priority (+5)")

    # Size
    if size in ("medium", "large"):
        score += 20
        reasons.append(f"size={size} (+20)")
    elif size == "small":
        score += 10
        reasons.append("size=small (+10)")

    # Archetype
    if archetype == "full_service_mro":
        score += 15
        reasons.append("full_service_mro (+15)")
    elif archetype == "specialty":
        score += 10
        reasons.append("specialty (+10)")

    # Reachability
    if has_phone == "yes" or has_email == "yes":
        score += 10
        reasons.append("reachable (+10)")

    # On-airport
    if on_airport:
        score += 5
        reasons.append("on-airport (+5)")

    # Cap at 100
    score = min(score, 100)
    return score, "; ".join(reasons) if reasons else "no scoring criteria met"


def score_erp(row):
    size = row["shop_size_class"]
    archetype = row["profile_archetype"]
    aircraft = (row["aircraft_worked_on"] or "").lower()
    has_phone = row["has_phone"]
    has_email = row["has_email"]
    confidence = float(row["overall_confidence"]) if row["overall_confidence"] else 0.0
    on_airport = row["airport_proximity_profile"] == "on-airport"

    score = 0
    reasons = []

    # Size
    if size in ("medium", "large"):
        score += 25
        reasons.append(f"size={size} (+25)")
    elif size == "small":
        score += 15
        reasons.append("size=small (+15)")

    # Archetype
    if archetype == "full_service_mro":
        score += 25
        reasons.append("full_service_mro (+25)")
    elif archetype == "specialty":
        score += 15
        reasons.append("specialty (+15)")
    elif archetype == "general-mro":
        score += 10
        reasons.append("general-mro (+10)")

    # Aircraft type (high-value)
    HIGH_VALUE = ["business", "turbine", "gulfstream", "hawker", "bombardier"]
    matched = [kw for kw in HIGH_VALUE if kw in aircraft]
    if matched:
        score += 15
        reasons.append(f"high-value aircraft ({','.join(matched)}) (+15)")

    # Reachability
    if has_phone == "yes" or has_email == "yes":
        score += 10
        reasons.append("reachable (+10)")

    # Confidence (tiered, not stacking)
    if confidence >= 0.9:
        score += 10
        reasons.append(f"confidence={confidence:.2f}>=0.9 (+10)")
    elif confidence >= 0.75:
        score += 5
        reasons.append(f"confidence={confidence:.2f}>=0.75 (+5)")

    # On-airport
    if on_airport:
        score += 5
        reasons.append("on-airport (+5)")

    score = min(score, 100)
    return score, "; ".join(reasons) if reasons else "no scoring criteria met"


def corridor_ebis(row):
    size = row["shop_size_class"]
    archetype = row["profile_archetype"]
    if size == "large" and archetype in ("full_service_mro", "general-mro"):
        return "likely"
    elif size in ("medium", "large") and archetype in ("full_service_mro", "general-mro"):
        return "possible"
    else:
        return "unknown"


def transform(row):
    ws_score, ws_rationale = score_website(row)
    erp_score, erp_rationale = score_erp(row)
    ebis = corridor_ebis(row)
    cross = round((ws_score + erp_score) / 2, 1)

    return {
        "entity_id": row["entity_id"],
        "legal_name": row["legal_name"],
        "dba_name": row.get("dba_name", ""),
        "city": row["city"],
        "state": row["state"],
        "zip": row["zip"],
        "phone": row["phone"],
        "email": row["email"],
        "website": row["website"],
        "cert_no": row["cert_no"],
        "shop_size_class": row["shop_size_class"],
        "aircraft_worked_on": row["aircraft_worked_on"],
        "profile_archetype": row["profile_archetype"],
        "airport_icao": row["nearest_airport_icao"],
        "airport_distance_band": row["airport_distance_band"],
        "overall_confidence": row["overall_confidence"],
        "outreach_tier": row["outreach_tier"],
        "has_phone": row["has_phone"],
        "has_email": row["has_email"],
        "has_website": row["has_website"],
        "website_fit_score": ws_score,
        "website_fit_rationale": ws_rationale,
        "erp_fit_score": erp_score,
        "erp_fit_rationale": erp_rationale,
        "corridor_ebis_likelihood": ebis,
        "cross_sell_score": cross,
        "data_source": "colorado-part145-round3",
        "last_updated": "2026-03-09",
    }


def write_csv(path, rows, sort_by=None, reverse=True):
    data = rows[:]
    if sort_by:
        data.sort(key=lambda r: float(r[sort_by]), reverse=reverse)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS)
        writer.writeheader()
        writer.writerows(data)
    print(f"Written {len(data)} rows → {path}")


def main():
    rows = []
    with open(SRC, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(transform(row))

    print(f"Total records processed: {len(rows)}")

    # Master list (unsorted by default, stable order)
    write_csv(os.path.join(OUT_DIR, "master-target-list.csv"), rows)

    # Website targets: all sorted by website_fit_score desc
    write_csv(os.path.join(OUT_DIR, "website-targets-tiered.csv"), rows, sort_by="website_fit_score")

    # ERP targets: all sorted by erp_fit_score desc
    write_csv(os.path.join(OUT_DIR, "erp-targets-tiered.csv"), rows, sort_by="erp_fit_score")

    # No-website priority: only has_website=no, sorted by website_fit_score desc
    no_website = [r for r in rows if r["has_website"] == "no"]
    write_csv(os.path.join(OUT_DIR, "no-website-priority.csv"), no_website, sort_by="website_fit_score")

    # Summary stats
    print(f"\nSummary:")
    print(f"  has_website=yes: {sum(1 for r in rows if r['has_website']=='yes')}")
    print(f"  has_website=no:  {sum(1 for r in rows if r['has_website']=='no')}")
    ws_scores = [float(r["website_fit_score"]) for r in rows]
    erp_scores = [float(r["erp_fit_score"]) for r in rows]
    print(f"  website_fit avg: {sum(ws_scores)/len(ws_scores):.1f}, max: {max(ws_scores)}, min: {min(ws_scores)}")
    print(f"  erp_fit avg:     {sum(erp_scores)/len(erp_scores):.1f}, max: {max(erp_scores)}, min: {min(erp_scores)}")
    print(f"  corridor_ebis likely: {sum(1 for r in rows if r['corridor_ebis_likelihood']=='likely')}")
    print(f"  corridor_ebis possible: {sum(1 for r in rows if r['corridor_ebis_likelihood']=='possible')}")
    print(f"  corridor_ebis unknown: {sum(1 for r in rows if r['corridor_ebis_likelihood']=='unknown')}")


if __name__ == "__main__":
    main()
