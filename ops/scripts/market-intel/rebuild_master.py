#!/usr/bin/env python3
"""
Rebuild master-target-list.csv from all state-*-raw.csv files and enrichment results.
Handles dedup by cert_no, applies enrichment overlays, and flags EBIS/Corridor customers.
"""

import csv
import os
import glob
import sys

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"

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

# Known EBIS customers (company name -> details)
EBIS_CUSTOMERS = {
    "SALTY PELICAN": {"city": "New Braunfels", "state": "TX"},
    "PLANE PLACE": {"city": "Dallas", "state": "TX"},
    "BASIN AVIATION": {"city": "Midland", "state": "TX"},
    "PLATINUM SKY": {"city": "Fort Lauderdale", "state": "FL"},
    "MY JET DOM": {"city": "McDonough", "state": "GA"},
    "COLE AVIATION": {"city": "McDonough", "state": "GA"},
    "MIDWEST CORPORATE AIR": {"city": "Bellefontaine", "state": "OH"},
    "CLEMENS AVIATION": {"city": "Benton", "state": "KS"},
    "OCR AVIATION": {"city": "Long Beach", "state": "CA"},
    "APEX AVIATION": {"city": "Henderson", "state": "NV"},
    "APPALACHIAN AERO": {"city": "Hickory", "state": "NC"},
    "ORACLE AVIATION": {"city": "Omaha", "state": "NE"},
    "JET SERVICES MAINTENANCE": {"city": "Mobile", "state": "AL"},
    "QMULUS AVIATION": {"city": "Caldwell", "state": "ID"},
    "FLIGHTCRAFT": {"city": "Lincoln", "state": "NE"},
    "SKYVIEW AVIATION": {"city": "Tracy", "state": "CA"},
    "WAIR AVIATION": {"city": "Wheeling", "state": "IL"},
}

# Known Corridor customers
CORRIDOR_CUSTOMERS = [
    "WEST STAR AVIATION", "STEVENS AVIATION", "CUTTER AVIATION",
    "MILLION AIR", "ACI JET", "CLAY LACY",
]

ENTERPRISE_KEYWORDS = [
    "BOEING", "AIRBUS", "LOCKHEED", "NORTHROP", "RAYTHEON", "GENERAL ELECTRIC",
    "PRATT & WHITNEY", "ROLLS-ROYCE", "SAFRAN", "HONEYWELL", "COLLINS AEROSPACE",
    "L3HARRIS", "BAE SYSTEMS", "LEONARDO", "TEXTRON AVIATION", "BOMBARDIER",
    "GULFSTREAM AEROSPACE", "DASSAULT FALCON", "EMBRAER", "SPIRIT AEROSYSTEMS",
    "STANDARDAERO", "AAR CORP", "STS AVIATION", "HEICO", "TRANSDIGM",
    "KAMAN AEROSPACE",
]


def is_enterprise(name):
    name_upper = name.upper()
    for kw in ENTERPRISE_KEYWORDS:
        if kw in name_upper:
            return True
    return False


def check_ebis(name, city, state):
    name_upper = name.upper()
    for key, info in EBIS_CUSTOMERS.items():
        if key in name_upper:
            # Check state match
            if info.get("state") == state:
                return "confirmed_ebis"
    return "unknown"


def check_corridor(name):
    name_upper = name.upper()
    for cust in CORRIDOR_CUSTOMERS:
        if cust in name_upper:
            return "corridor-verified"
    return None


def load_enrichment_results():
    """Load all enrichment CSVs and build lookups by cert_no and company name + state."""
    by_name = {}
    by_cert = {}
    for path in glob.glob(os.path.join(DIR, "enrichment-results-*.csv")):
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get("company_name") or row.get("legal_name") or "").strip().upper()
                state = (row.get("state") or "").strip().upper()
                cert = (row.get("cert_no") or "").strip()
                if cert:
                    by_cert[cert] = row
                if name:
                    by_name[f"{name}|{state}"] = row
    return by_name, by_cert


def apply_enrichment(rec, enrichments_by_name, enrichments_by_cert):
    """Try to match and apply enrichment data to a record."""
    name = rec["legal_name"].upper()
    state = rec["state"].upper()
    cert = rec.get("cert_no", "")
    
    # Try cert_no match first (most reliable)
    enr = enrichments_by_cert.get(cert) if cert else None
    
    # Try exact name match
    if not enr:
        key = f"{name}|{state}"
        enr = enrichments_by_name.get(key)
    
    # Try DBA match
    if not enr and rec.get("dba_name"):
        dba = rec["dba_name"].upper()
        key2 = f"{dba}|{state}"
        enr = enrichments_by_name.get(key2)
    
    if not enr:
        return rec
    
    # Apply enrichment fields if present and non-empty
    website = enr.get("website") or enr.get("website_url") or ""
    if website and not rec.get("website"):
        rec["website"] = website
        rec["has_website"] = "yes"
        domain = website.replace("https://", "").replace("http://", "").rstrip("/")
        rec["domain_normalized"] = domain
    
    if enr.get("shop_size_class") and rec.get("shop_size_class") == "unknown":
        rec["shop_size_class"] = enr["shop_size_class"]
    
    if enr.get("aircraft_worked_on") and rec.get("aircraft_worked_on") == "unknown":
        rec["aircraft_worked_on"] = enr.get("aircraft_worked_on", "")
    
    if enr.get("profile_archetype") and rec.get("profile_archetype") == "general-mro":
        rec["profile_archetype"] = enr.get("profile_archetype", "")
    
    # Update scores if enrichment has them
    for score_field in ["website_fit_score", "erp_fit_score"]:
        if enr.get(score_field):
            try:
                new_score = float(enr[score_field])
                old_score = float(rec.get(score_field, 0))
                if new_score > old_score:
                    rec[score_field] = new_score
                    rationale_field = score_field.replace("_score", "_rationale")
                    if enr.get(rationale_field):
                        rec[rationale_field] = enr[rationale_field]
            except (ValueError, TypeError):
                pass
    
    # Recalculate cross-sell
    try:
        ws = float(rec.get("website_fit_score", 0))
        erp = float(rec.get("erp_fit_score", 0))
        rec["cross_sell_score"] = round((ws + erp) / 2, 1)
    except (ValueError, TypeError):
        pass
    
    return rec


def main():
    # 1. Load all state raw CSVs
    records = {}  # cert_no -> record
    state_files = sorted(glob.glob(os.path.join(DIR, "state-*-raw.csv")))
    
    for path in state_files:
        state_name = os.path.basename(path).replace("state-", "").replace("-raw.csv", "").upper()
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cert = row.get("cert_no", "")
                if cert and cert not in records:
                    # Ensure all columns exist
                    for col in OUT_COLS:
                        if col not in row:
                            row[col] = ""
                    records[cert] = row
        print(f"  Loaded {state_name}: {sum(1 for r in records.values() if r.get('state','').upper() == state_name)} unique records")
    
    print(f"\n  Total raw records: {len(records)}")
    
    # 2. Load enrichment data
    enrichments_by_name, enrichments_by_cert = load_enrichment_results()
    print(f"  Enrichment records available: {len(enrichments_by_name)} by name, {len(enrichments_by_cert)} by cert")
    
    # 3. Apply enrichments, EBIS flags, Corridor flags, enterprise flags
    enriched_count = 0
    ebis_count = 0
    corridor_count = 0
    enterprise_count = 0
    
    for cert, rec in records.items():
        name = rec.get("legal_name", "")
        city = rec.get("city", "")
        state = rec.get("state", "")
        
        # Apply enrichment
        old_website = rec.get("has_website")
        rec = apply_enrichment(rec, enrichments_by_name, enrichments_by_cert)
        if rec.get("has_website") != old_website:
            enriched_count += 1
        
        # EBIS check
        ebis = check_ebis(name, city, state)
        if ebis != "unknown":
            rec["corridor_ebis_likelihood"] = ebis
            ebis_count += 1
        
        # Corridor check
        corr = check_corridor(name)
        if corr:
            rec["corridor_ebis_likelihood"] = corr
            corridor_count += 1
        
        # Enterprise check
        if is_enterprise(name):
            rec["is_enterprise"] = "yes"
            enterprise_count += 1
        elif not rec.get("is_enterprise"):
            rec["is_enterprise"] = "no"
        
        # Flag self
        if "ELEVATE MRO" in name.upper():
            rec["is_enterprise"] = "self"
        
        records[cert] = rec
    
    print(f"  Enriched with website: {enriched_count}")
    print(f"  EBIS customers flagged: {ebis_count}")
    print(f"  Corridor customers flagged: {corridor_count}")
    print(f"  Enterprise entities flagged: {enterprise_count}")
    
    # 4. Write master
    master_path = os.path.join(DIR, "master-target-list.csv")
    all_records = list(records.values())
    
    with open(master_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_records)
    
    print(f"\n  Master list written: {len(all_records)} records → {master_path}")
    
    # 5. Rebuild tiered lists
    smb = [r for r in all_records if r.get("is_enterprise") not in ("yes", "self")]
    
    # Website targets
    ws_sorted = sorted(smb, key=lambda r: float(r.get("website_fit_score", 0)), reverse=True)
    _write(os.path.join(DIR, "website-targets-tiered.csv"), ws_sorted[:100])
    
    # ERP targets
    erp_sorted = sorted(smb, key=lambda r: float(r.get("erp_fit_score", 0)), reverse=True)
    _write(os.path.join(DIR, "erp-targets-tiered.csv"), erp_sorted[:100])
    
    # No-website priority
    no_web = [r for r in smb if r.get("has_website") == "no"]
    no_web_sorted = sorted(no_web, key=lambda r: float(r.get("website_fit_score", 0)), reverse=True)
    _write(os.path.join(DIR, "no-website-priority.csv"), no_web_sorted)
    
    # Cross-sell
    cross = sorted(smb, key=lambda r: float(r.get("cross_sell_score", 0)), reverse=True)
    _write(os.path.join(DIR, "cross-sell-top25.csv"), cross[:50])
    
    print(f"  SMB targets: {len(smb)}")
    print(f"  No-website targets: {len(no_web)}")
    print(f"  Enterprise excluded: {enterprise_count}")
    
    # Stats by state
    print("\n  === By State ===")
    state_counts = {}
    for r in all_records:
        st = r.get("state", "??")
        state_counts[st] = state_counts.get(st, 0) + 1
    for st in sorted(state_counts.keys()):
        print(f"  {st}: {state_counts[st]}")


def _write(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
