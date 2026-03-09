#!/usr/bin/env python3
"""
Wave 5: Advanced heuristic rescoring for master-target-list.csv

Problem: ~1,738 records have flat default scores (wfs=50, erp=20) because FAA
bulk data has no shop type info. This script uses name-based, email-based, and
geographic heuristics to differentiate scoring without web lookups.

Signals used:
- Company name keywords → shop type (avionics, helicopter, engine, paint, FBO, etc.)
- Email domain → custom domain = has website (extract domain); Gmail/AOL/Yahoo = no web presence
- City population tier → metro shops more likely to be established
- Multi-word DBA → suggests marketing awareness
- Zip code metro mapping → density proxy
"""

import csv
import os
import re
from collections import Counter

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"
MASTER = os.path.join(DIR, "master-target-list.csv")

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

# Free email providers (shop using these = no custom domain = higher website need)
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "aol.com", "hotmail.com", "outlook.com",
    "msn.com", "comcast.net", "att.net", "sbcglobal.net", "bellsouth.net",
    "verizon.net", "cox.net", "charter.net", "earthlink.net", "icloud.com",
    "me.com", "mac.com", "live.com", "ymail.com", "rocketmail.com",
}

# Name keywords → archetype detection
AVIONICS_KW = ["AVIONICS", "AVIONIQUE", "INSTRUMENT", "TRANSPONDER", "PITOT", "RADAR", "NAV COMM", "GARMIN"]
HELICOPTER_KW = ["HELICOPTER", "ROTORCRAFT", "HELI ", "HELICRAFT", "ROTOR "]
ENGINE_KW = ["ENGINE", "TURBINE", "POWERPLANT", "PROPULSION", "APU ", "OVERHAUL"]
PAINT_KW = ["PAINT", "REFINISH", "COATING"]
INTERIOR_KW = ["INTERIOR", "UPHOLSTER", "CABIN", "COMPLETIONS"]
STRUCTURAL_KW = ["STRUCTURAL", "COMPOSITE", "SHEET METAL", "NDT", "NONDESTRUCTIVE", "NON-DESTRUCTIVE"]
FBO_KW = ["FBO", "FIXED BASE", "MILLION AIR", "ATLANTIC AVIATION", "SIGNATURE FLIGHT"]
COMPONENT_KW = ["COMPONENT", "ACCESSORY", "ACCESSORIES", "PROP SHOP", "PROPELLER"]

# High-value aviation cities (large business aviation markets)
METRO_CITIES = {
    # FL
    "MIAMI", "FORT LAUDERDALE", "OPA LOCKA", "BOCA RATON", "POMPANO BEACH",
    "WEST PALM BEACH", "DORAL", "MIRAMAR", "HOLLYWOOD", "DAVIE",
    "ORLANDO", "SANFORD", "KISSIMMEE", "TAMPA", "CLEARWATER",
    "SARASOTA", "FORT MYERS", "NAPLES", "JACKSONVILLE", "DAYTONA BEACH",
    # TX
    "DALLAS", "FORT WORTH", "ADDISON", "MCKINNEY", "FRISCO", "IRVING",
    "GRAPEVINE", "HOUSTON", "SUGAR LAND", "PEARLAND", "THE WOODLANDS",
    "SAN ANTONIO", "AUSTIN", "EL PASO", "LUBBOCK", "MIDLAND",
    # CA
    "VAN NUYS", "BURBANK", "LOS ANGELES", "LONG BEACH", "HAWTHORNE",
    "CAMARILLO", "SAN DIEGO", "SAN JOSE", "OAKLAND", "SACRAMENTO",
    "SANTA ANA", "IRVINE", "ONTARIO",
    # AZ
    "SCOTTSDALE", "PHOENIX", "MESA", "CHANDLER", "TEMPE", "GLENDALE",
    "TUCSON", "GOODYEAR", "DEER VALLEY",
    # CO
    "ENGLEWOOD", "BROOMFIELD", "DENVER", "AURORA", "CENTENNIAL",
    "COLORADO SPRINGS", "FORT COLLINS", "GRAND JUNCTION",
    # GA
    "ATLANTA", "MARIETTA", "PEACHTREE CITY", "KENNESAW", "NORCROSS",
    # OH
    "COLUMBUS", "CINCINNATI", "DAYTON", "CLEVELAND", "AKRON",
    # KS
    "WICHITA", "OLATHE", "OVERLAND PARK",
    # CT
    "GROTON", "BRIDGEPORT", "HARTFORD", "STRATFORD",
    # WA
    "SEATTLE", "RENTON", "EVERETT", "TACOMA", "SPOKANE",
    # TN
    "NASHVILLE", "MEMPHIS", "KNOXVILLE", "CHATTANOOGA", "SMYRNA",
    # NV
    "LAS VEGAS", "HENDERSON", "RENO",
    # NY
    "TETERBORO", "FARMINGDALE", "RONKONKOMA", "WHITE PLAINS",
    # OK
    "TULSA", "OKLAHOMA CITY", "TINKER",
    # NC
    "CHARLOTTE", "RALEIGH", "GREENSBORO",
    # IL
    "CHICAGO", "WHEELING", "AURORA", "ROCKFORD",
}


def detect_archetype(name, dba):
    """Detect shop archetype from name keywords."""
    combined = f"{name} {dba}".upper()
    
    archetypes = []
    if any(kw in combined for kw in AVIONICS_KW):
        archetypes.append("avionics")
    if any(kw in combined for kw in HELICOPTER_KW):
        archetypes.append("helicopter-mro")
    if any(kw in combined for kw in ENGINE_KW):
        archetypes.append("engine-specialist")
    if any(kw in combined for kw in PAINT_KW):
        archetypes.append("paint-specialist")
    if any(kw in combined for kw in INTERIOR_KW):
        archetypes.append("interior-specialist")
    if any(kw in combined for kw in STRUCTURAL_KW):
        archetypes.append("structural-specialist")
    if any(kw in combined for kw in FBO_KW):
        archetypes.append("fbo-mro")
    if any(kw in combined for kw in COMPONENT_KW):
        archetypes.append("component-specialist")
    
    if archetypes:
        return archetypes[0]  # Primary archetype
    return None


def extract_email_domain(email):
    """Extract domain from email, return (domain, is_free)."""
    if not email or "@" not in email:
        return None, None
    domain = email.split("@")[1].strip().lower()
    is_free = domain in FREE_EMAIL_DOMAINS
    return domain, is_free


def rescore_record(rec):
    """Apply advanced heuristics to rescore a record."""
    name = rec.get("legal_name", "")
    dba = rec.get("dba_name", "")
    city = rec.get("city", "").upper().strip()
    email = rec.get("email", "")
    has_phone = rec.get("has_phone") == "yes"
    has_email = rec.get("has_email") == "yes"
    has_website = rec.get("has_website") == "yes"
    current_archetype = rec.get("profile_archetype", "general-mro")
    current_size = rec.get("shop_size_class", "unknown")
    
    # Skip already-enriched records (high confidence scoring)
    # BUT always process confirmed EBIS users for churn bonus
    ebis_status = rec.get("corridor_ebis_likelihood", "unknown")
    if current_size != "unknown" and current_archetype != "general-mro" and ebis_status != "confirmed_ebis":
        return rec  # Already has good data from enrichment
    
    # === Detect archetype from name ===
    detected = detect_archetype(name, dba)
    if detected and current_archetype == "general-mro":
        rec["profile_archetype"] = detected
    
    archetype = rec["profile_archetype"]
    
    # === Email domain analysis ===
    domain, is_free = extract_email_domain(email)
    website_from_email = None
    if domain and not is_free and domain not in FREE_EMAIL_DOMAINS:
        # Custom email domain likely = has website
        candidate = f"https://www.{domain}"
        if not has_website:
            website_from_email = candidate
    
    # === Rescore website fit ===
    wfs = 0
    wfs_reasons = []
    
    if not has_website and not website_from_email:
        wfs += 40
        wfs_reasons.append("no website (+40)")
    elif website_from_email:
        wfs += 25
        wfs_reasons.append("likely basic site from email domain (+25)")
    elif has_website:
        wfs += 5
        wfs_reasons.append("has site (+5)")
    
    if has_phone or has_email:
        wfs += 10
        wfs_reasons.append("reachable (+10)")
    
    if city in METRO_CITIES:
        wfs += 8
        wfs_reasons.append("metro city (+8)")
    
    if archetype in ("avionics", "helicopter-mro", "engine-specialist", "fbo-mro"):
        wfs += 10
        wfs_reasons.append(f"high-value archetype: {archetype} (+10)")
    elif archetype in ("paint-specialist", "interior-specialist", "structural-specialist", "component-specialist"):
        wfs += 7
        wfs_reasons.append(f"specialty: {archetype} (+7)")
    
    if dba and dba.strip():
        wfs += 3
        wfs_reasons.append("has DBA/brand (+3)")
    
    if is_free:
        wfs += 5
        wfs_reasons.append("free email = no custom domain (+5)")
    
    wfs = min(wfs, 100)
    
    # === Rescore ERP fit ===
    erp = 0
    erp_reasons = []
    
    if archetype in ("avionics", "helicopter-mro", "engine-specialist"):
        erp += 20
        erp_reasons.append(f"specialty type: {archetype} (+20)")
    elif archetype in ("fbo-mro",):
        erp += 15
        erp_reasons.append("FBO-MRO likely multi-service (+15)")
    elif archetype in ("paint-specialist", "interior-specialist", "structural-specialist"):
        erp += 12
        erp_reasons.append(f"specialty: {archetype} (+12)")
    elif archetype in ("component-specialist",):
        erp += 10
        erp_reasons.append("component specialist (+10)")
    else:
        erp += 8
        erp_reasons.append("general-mro (+8)")
    
    if has_phone or has_email:
        erp += 10
        erp_reasons.append("reachable (+10)")
    
    if city in METRO_CITIES:
        erp += 7
        erp_reasons.append("metro city (+7)")
    
    if dba and dba.strip():
        erp += 5
        erp_reasons.append("has DBA = established brand (+5)")
    
    if website_from_email or has_website:
        erp += 5
        erp_reasons.append("web presence (+5)")
    
    # EBIS/Corridor status bonus
    ebis_status = rec.get("corridor_ebis_likelihood", "unknown")
    if ebis_status == "confirmed_ebis":
        erp += 40
        erp_reasons.append("CONFIRMED EBIS user — Veryon churn window (+40)")
    elif ebis_status == "corridor-verified":
        erp += 10
        erp_reasons.append("Corridor user - track for churn (+10)")
    
    erp = min(erp, 100)
    
    # === Update record ===
    # Only update if new scores are meaningfully different from enriched scores
    old_wfs = float(rec.get("website_fit_score", 0))
    old_erp = float(rec.get("erp_fit_score", 0))
    
    # For records that were manually enriched with high scores, don't downgrade
    # BUT always update if new score is HIGHER (e.g. EBIS bonus increase)
    if old_wfs <= 50 or wfs > old_wfs:
        rec["website_fit_score"] = wfs
        rec["website_fit_rationale"] = "; ".join(wfs_reasons)
    
    if old_erp <= 20 or erp > old_erp:
        rec["erp_fit_score"] = erp
        rec["erp_fit_rationale"] = "; ".join(erp_reasons)
    
    # Update cross-sell
    final_wfs = float(rec.get("website_fit_score", 0))
    final_erp = float(rec.get("erp_fit_score", 0))
    rec["cross_sell_score"] = round((final_wfs + final_erp) / 2, 1)
    
    # Update domain if extracted from email
    if website_from_email and not rec.get("domain_normalized"):
        rec["domain_normalized"] = domain
    
    return rec


def main():
    print("=== Wave 5: Advanced Heuristic Rescoring ===\n")
    
    # Load master
    records = []
    with open(MASTER, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    
    print(f"Loaded {len(records)} records from master list")
    
    # Pre-scoring stats
    flat_wfs = sum(1 for r in records if str(r.get("website_fit_score")) == "50" and "no website (+40); reachable (+10)" in str(r.get("website_fit_rationale", "")))
    flat_erp = sum(1 for r in records if str(r.get("erp_fit_score")) == "20" and "general-mro (+10); reachable (+10)" in str(r.get("erp_fit_rationale", "")))
    print(f"Flat-scored records: {flat_wfs} website, {flat_erp} ERP")
    
    # Track changes
    archetype_changes = Counter()
    wfs_changes = 0
    erp_changes = 0
    domain_discoveries = 0
    
    for rec in records:
        old_arch = rec.get("profile_archetype", "general-mro")
        old_wfs = rec.get("website_fit_score")
        old_erp = rec.get("erp_fit_score")
        old_domain = rec.get("domain_normalized", "")
        
        rec = rescore_record(rec)
        
        if rec["profile_archetype"] != old_arch:
            archetype_changes[rec["profile_archetype"]] += 1
        if str(rec["website_fit_score"]) != str(old_wfs):
            wfs_changes += 1
        if str(rec["erp_fit_score"]) != str(old_erp):
            erp_changes += 1
        if rec.get("domain_normalized") and not old_domain:
            domain_discoveries += 1
    
    # Write updated master
    with open(MASTER, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
    
    print(f"\n=== Rescoring Results ===")
    print(f"Website scores changed: {wfs_changes}")
    print(f"ERP scores changed: {erp_changes}")
    print(f"Domain discoveries from email: {domain_discoveries}")
    print(f"Archetype detections:")
    for arch, count in archetype_changes.most_common():
        print(f"  {arch}: {count}")
    
    # Score distribution
    wfs_dist = Counter()
    erp_dist = Counter()
    for r in records:
        wfs_dist[int(float(r.get("website_fit_score", 0)))] += 1
        erp_dist[int(float(r.get("erp_fit_score", 0)))] += 1
    
    print(f"\n=== Website Fit Score Distribution ===")
    for score in sorted(wfs_dist.keys(), reverse=True):
        print(f"  {score}: {wfs_dist[score]} records")
    
    print(f"\n=== ERP Fit Score Distribution ===")
    for score in sorted(erp_dist.keys(), reverse=True):
        print(f"  {score}: {erp_dist[score]} records")
    
    # Rebuild tiered lists
    smb = [r for r in records if r.get("is_enterprise") not in ("yes", "self")]
    
    ws_sorted = sorted(smb, key=lambda r: float(r.get("website_fit_score", 0)), reverse=True)
    _write(os.path.join(DIR, "website-targets-tiered.csv"), ws_sorted[:100])
    
    erp_sorted = sorted(smb, key=lambda r: float(r.get("erp_fit_score", 0)), reverse=True)
    _write(os.path.join(DIR, "erp-targets-tiered.csv"), erp_sorted[:100])
    
    no_web = [r for r in smb if r.get("has_website") == "no" or r.get("has_website") != "yes"]
    no_web_sorted = sorted(no_web, key=lambda r: float(r.get("website_fit_score", 0)), reverse=True)
    _write(os.path.join(DIR, "no-website-priority.csv"), no_web_sorted)
    
    cross = sorted(smb, key=lambda r: float(r.get("cross_sell_score", 0)), reverse=True)
    _write(os.path.join(DIR, "cross-sell-top25.csv"), cross[:50])
    
    print(f"\nRebuit tiered lists: {len(smb)} SMB targets")
    print(f"Top 5 website targets:")
    for r in ws_sorted[:5]:
        print(f"  {r['legal_name']} ({r['city']}, {r['state']}) — wfs={r['website_fit_score']}, arch={r['profile_archetype']}")
    print(f"Top 5 ERP targets:")
    for r in erp_sorted[:5]:
        print(f"  {r['legal_name']} ({r['city']}, {r['state']}) — erp={r['erp_fit_score']}, ebis={r.get('corridor_ebis_likelihood','')}")


def _write(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
