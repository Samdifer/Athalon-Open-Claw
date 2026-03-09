#!/usr/bin/env python3
"""
Extract Part 145 records for a given state from the FAA facility download,
apply scoring heuristics, and output scored records compatible with master-target-list.csv.

Usage: python3 extract_state.py TX FL AZ GA  (one or more state codes)
"""

import csv
import sys
import os
import hashlib
from datetime import date

FAA_SRC = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/research/crm-colorado-part145/round-1/team-a-registry/tmp/faa_facility_download.csv"
OUT_DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"

OUT_COLS = [
    "entity_id","legal_name","dba_name","city","state","zip","phone","email","website",
    "cert_no","shop_size_class","aircraft_worked_on","profile_archetype",
    "airport_icao","airport_distance_band","overall_confidence","outreach_tier",
    "has_phone","has_email","has_website",
    "website_fit_score","website_fit_rationale",
    "erp_fit_score","erp_fit_rationale",
    "corridor_ebis_likelihood","cross_sell_score",
    "data_source","last_updated",
    "is_enterprise","multi_location_group","domain_normalized"
]

TODAY = date.today().isoformat()


def make_entity_id(cert_no, name):
    """Generate stable entity ID from cert number."""
    return cert_no if cert_no else hashlib.md5(name.encode()).hexdigest()[:8].upper()


def classify_dsgn_code(code):
    """Infer archetype from FAA designation code prefix patterns."""
    if not code:
        return "unknown", "unknown"
    code = code.upper()
    # Common patterns in DSGN codes (first 4 chars are facility identifier)
    # This is limited without the full ratings data, so default to general-mro
    return "general-mro", "unknown"


def score_website_faa(row):
    """Score website fit for FAA-sourced record (no website data initially)."""
    score = 40  # No website baseline
    reasons = ["no website (+40)"]
    
    has_phone = bool(row.get("phone"))
    has_email = bool(row.get("email"))
    
    if has_phone or has_email:
        score += 10
        reasons.append("reachable (+10)")
    
    # Can't assess size from FAA data alone - stay conservative
    return min(score, 100), "; ".join(reasons)


def score_erp_faa(row):
    """Score ERP fit for FAA-sourced record."""
    score = 0
    reasons = []
    
    archetype = row.get("profile_archetype", "general-mro")
    has_phone = bool(row.get("phone"))
    has_email = bool(row.get("email"))
    
    if archetype == "general-mro":
        score += 10
        reasons.append("general-mro (+10)")
    
    if has_phone or has_email:
        score += 10
        reasons.append("reachable (+10)")
    
    return min(score, 100), "; ".join(reasons) if reasons else "minimal data"


def corridor_ebis_faa(row):
    """Corridor/EBIS likelihood from FAA-only data — conservative."""
    return "unknown"


def transform_faa_row(faa_row, state_code):
    """Transform an FAA facility record to our standard format."""
    cert_no = (faa_row.get("Cert_No") or "").strip()
    name = (faa_row.get("Agency Name") or "").strip()
    dba = (faa_row.get("DBA") or "").strip()
    if dba.upper().startswith("DBA "):
        dba = dba[4:].strip()
    
    city = (faa_row.get("City") or "").strip()
    zip_code = (faa_row.get("Postal Code") or "").strip()
    
    # Consolidate phone: agency phone > liaison phone > accountable mgr phone
    phone = (faa_row.get("Agency Phone Number") or "").strip()
    if not phone:
        phone = (faa_row.get("Liaison Phone Number") or "").strip()
    if not phone:
        phone = (faa_row.get("Accountable Manager Phone Number") or "").strip()
    
    # Consolidate email: email > agency email > liaison email > AM email
    email = (faa_row.get("Email") or "").strip()
    if not email:
        email = (faa_row.get("Agency Email") or "").strip()
    if not email:
        email = (faa_row.get("Liaison Email") or "").strip()
    if not email:
        email = (faa_row.get("Accountable Manager Email") or "").strip()
    
    entity_id = make_entity_id(cert_no, name)
    archetype, _ = classify_dsgn_code(faa_row.get("DSGN_CODE"))
    
    has_phone = "yes" if phone else "no"
    has_email = "yes" if email else "no"
    
    # Determine confidence based on data completeness
    data_points = sum([
        bool(name), bool(city), bool(zip_code), bool(phone), bool(email), bool(cert_no)
    ])
    confidence = round(data_points / 6.0, 2)
    
    # Outreach tier
    if has_phone == "yes" and has_email == "yes":
        tier = "A"
    elif has_phone == "yes" or has_email == "yes":
        tier = "B"
    else:
        tier = "C"
    
    rec = {
        "entity_id": entity_id,
        "legal_name": name,
        "dba_name": dba,
        "city": city,
        "state": state_code,
        "zip": zip_code,
        "phone": phone,
        "email": email,
        "website": "",
        "cert_no": cert_no,
        "shop_size_class": "unknown",
        "aircraft_worked_on": "unknown",
        "profile_archetype": archetype,
        "airport_icao": "",
        "airport_distance_band": "unknown",
        "overall_confidence": confidence,
        "outreach_tier": tier,
        "has_phone": has_phone,
        "has_email": has_email,
        "has_website": "no",
    }
    
    ws_score, ws_rationale = score_website_faa(rec)
    erp_score, erp_rationale = score_erp_faa(rec)
    ebis = corridor_ebis_faa(rec)
    cross = round((ws_score + erp_score) / 2, 1)
    
    rec.update({
        "website_fit_score": ws_score,
        "website_fit_rationale": ws_rationale,
        "erp_fit_score": erp_score,
        "erp_fit_rationale": erp_rationale,
        "corridor_ebis_likelihood": ebis,
        "cross_sell_score": cross,
        "data_source": f"faa-facility-{state_code.lower()}",
        "last_updated": TODAY,
        "is_enterprise": "no",
        "multi_location_group": "",
        "domain_normalized": "",
    })
    
    return rec


def extract_state(state_code):
    """Extract all records for a state from FAA CSV."""
    records = []
    with open(FAA_SRC, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            st = (row.get("State/Province") or "").strip().upper()
            if st == state_code.upper():
                rec = transform_faa_row(row, state_code.upper())
                if rec["legal_name"]:  # Skip empty records
                    records.append(rec)
    return records


def write_state_csv(state_code, records):
    """Write state-specific CSV."""
    path = os.path.join(OUT_DIR, f"state-{state_code.lower()}-raw.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS)
        writer.writeheader()
        writer.writerows(records)
    print(f"  Written {len(records)} records → {path}")
    return path


def merge_into_master(new_records):
    """Merge new state records into master-target-list.csv, deduping by cert_no."""
    master_path = os.path.join(OUT_DIR, "master-target-list.csv")
    existing = []
    existing_certs = set()
    
    if os.path.exists(master_path):
        with open(master_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing.append(row)
                if row.get("cert_no"):
                    existing_certs.add(row["cert_no"])
    
    added = 0
    for rec in new_records:
        cert = rec.get("cert_no", "")
        if cert and cert not in existing_certs:
            existing.append(rec)
            existing_certs.add(cert)
            added += 1
        elif not cert:
            # No cert — check by name+state
            key = f"{rec['legal_name']}|{rec['state']}"
            existing_keys = {f"{r['legal_name']}|{r['state']}" for r in existing}
            if key not in existing_keys:
                existing.append(rec)
                added += 1
    
    with open(master_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS)
        writer.writeheader()
        writer.writerows(existing)
    
    print(f"  Master list: {len(existing)} total records (+{added} new)")
    return added, len(existing)


def rebuild_tiered_lists():
    """Rebuild all tiered output lists from master."""
    master_path = os.path.join(OUT_DIR, "master-target-list.csv")
    rows = []
    with open(master_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    
    # Website targets (sorted by website_fit_score desc)
    ws_sorted = sorted(rows, key=lambda r: float(r.get("website_fit_score", 0)), reverse=True)
    _write(os.path.join(OUT_DIR, "website-targets-tiered.csv"), ws_sorted)
    
    # ERP targets (sorted by erp_fit_score desc)
    erp_sorted = sorted(rows, key=lambda r: float(r.get("erp_fit_score", 0)), reverse=True)
    _write(os.path.join(OUT_DIR, "erp-targets-tiered.csv"), erp_sorted)
    
    # No-website priority
    no_web = [r for r in rows if r.get("has_website") == "no"]
    no_web_sorted = sorted(no_web, key=lambda r: float(r.get("website_fit_score", 0)), reverse=True)
    _write(os.path.join(OUT_DIR, "no-website-priority.csv"), no_web_sorted)
    
    print(f"  Rebuilt tiered lists: {len(rows)} total, {len(no_web)} no-website")


def _write(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS)
        writer.writeheader()
        writer.writerows(rows)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_state.py TX FL AZ ...")
        sys.exit(1)
    
    states = [s.upper() for s in sys.argv[1:]]
    total_added = 0
    
    for state in states:
        print(f"\n=== Extracting {state} ===")
        records = extract_state(state)
        print(f"  Found {len(records)} records")
        
        # Summary stats
        with_phone = sum(1 for r in records if r["has_phone"] == "yes")
        with_email = sum(1 for r in records if r["has_email"] == "yes")
        tier_a = sum(1 for r in records if r["outreach_tier"] == "A")
        tier_b = sum(1 for r in records if r["outreach_tier"] == "B")
        tier_c = sum(1 for r in records if r["outreach_tier"] == "C")
        print(f"  Phone: {with_phone} | Email: {with_email} | Tiers: A={tier_a} B={tier_b} C={tier_c}")
        
        # Write state-specific file
        write_state_csv(state, records)
        
        # Merge into master
        added, total = merge_into_master(records)
        total_added += added
    
    # Rebuild tiered lists
    print(f"\n=== Rebuilding tiered lists ===")
    rebuild_tiered_lists()
    
    print(f"\n=== Done: added {total_added} new records across {len(states)} states ===")


if __name__ == "__main__":
    main()
