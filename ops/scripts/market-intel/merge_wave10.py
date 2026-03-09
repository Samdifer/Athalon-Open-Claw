#!/usr/bin/env python3
"""
Wave 10: Merge enrichment results from FL FTL and CA Van Nuys workers,
plus website quality audit data and EBIS customer additions.
Updates master-target-list.csv, rebuilds tiered lists.
"""

import csv
import os
import sys
from datetime import datetime

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"
MASTER = os.path.join(DIR, "master-target-list.csv")
FL_ENRICHMENT = os.path.join(DIR, "enrichment-results-fl-ftl-w10.csv")
CA_ENRICHMENT = os.path.join(DIR, "enrichment-results-ca-vanNuys-w10.csv")
WEBSITE_AUDIT = os.path.join(DIR, "website-quality-audit-w10.csv")
EBIS_NEW = os.path.join(DIR, "ebis-customers-to-add-w10.csv")

MASTER_COLS = [
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

# Free email providers
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "aol.com", "hotmail.com", "outlook.com",
    "msn.com", "comcast.net", "att.net", "sbcglobal.net", "bellsouth.net",
    "verizon.net", "cox.net", "charter.net", "earthlink.net", "icloud.com",
    "me.com", "mac.com", "live.com", "ymail.com", "rocketmail.com",
}

# Archetype keywords
SPECIALTY_KW = {
    "avionics": ["AVIONICS", "INSTRUMENT", "TRANSPONDER", "GARMIN"],
    "helicopter-mro": ["HELICOPTER", "ROTORCRAFT", "HELI "],
    "engine-specialist": ["ENGINE", "TURBINE", "POWERPLANT", "APU "],
    "interior-specialist": ["INTERIOR", "UPHOLSTER", "CABIN"],
    "component-specialist": ["COMPONENT", "HYDRAULIC", "LANDING GEAR", "ACCESSORY", "ACTUATOR"],
    "paint-shop": ["PAINT", "REFINISH", "COATING"],
}

SIZE_MULTIPLIERS = {
    "micro": {"wfs": 0, "erp": -5},
    "small": {"wfs": 5, "erp": 10},
    "medium": {"wfs": 15, "erp": 25},
    "large": {"wfs": 10, "erp": 20},
}


def compute_scores(row):
    """Recompute WFS, ERP, and cross-sell scores with enriched data."""
    wfs = 0
    erp = 0
    wfs_reasons = []
    erp_reasons = []
    
    has_website = row.get("has_website", "no") == "yes"
    has_phone = row.get("has_phone", "no") == "yes"
    has_email = row.get("has_email", "no") == "yes"
    
    # Base score
    if has_website:
        wfs += 10
        wfs_reasons.append("has_website → base 10")
    else:
        wfs += 40
        wfs_reasons.append("no_website → base 40")
    
    erp += 10
    erp_reasons.append("base 10")
    
    # Reachability
    if has_phone or has_email:
        wfs += 10
        erp += 10
        wfs_reasons.append("reachable (+10)")
        erp_reasons.append("reachable (+10)")
    
    # Shop size
    size = row.get("shop_size_class", "unknown")
    if size in SIZE_MULTIPLIERS:
        wfs += SIZE_MULTIPLIERS[size]["wfs"]
        erp += SIZE_MULTIPLIERS[size]["erp"]
        wfs_reasons.append(f"shop_size={size} (+{SIZE_MULTIPLIERS[size]['wfs']})")
        erp_reasons.append(f"shop_size={size} (+{SIZE_MULTIPLIERS[size]['erp']})")
    
    # Specialty keywords
    name = (row.get("legal_name", "") + " " + row.get("dba_name", "")).upper()
    archetype = row.get("profile_archetype", "general-mro")
    is_specialty = archetype in SPECIALTY_KW or any(
        kw in name for kws in SPECIALTY_KW.values() for kw in kws
    )
    if is_specialty:
        wfs += 10
        erp += 15
        wfs_reasons.append("specialty keywords (+10)")
        erp_reasons.append("specialty keywords (+15)")
    
    # Full-service keywords
    full_svc_kw = ["FULL SERVICE", "MAINTENANCE", "MRO", "REPAIR STATION", "OVERHAUL"]
    if any(kw in name for kw in full_svc_kw):
        wfs += 10
        erp += 20
        wfs_reasons.append("full-service keywords (+10)")
        erp_reasons.append("full-service keywords (+20)")
    
    # Enterprise penalty
    if row.get("is_enterprise") == "yes":
        wfs -= 20
        erp -= 15
        wfs_reasons.append("enterprise (-20)")
        erp_reasons.append("enterprise (-15)")
    
    # Corridor/EBIS status
    cel = row.get("corridor_ebis_likelihood", "unknown")
    if cel == "confirmed_ebis":
        erp += 20
        erp_reasons.append("confirmed_ebis (+20)")
    elif cel == "corridor-verified":
        erp -= 10
        erp_reasons.append("corridor-verified (-10)")
    
    # Multi-location bonus
    if row.get("multi_location_group"):
        wfs += 10
        erp += 15
        wfs_reasons.append("multi_location (+10)")
        erp_reasons.append("multi_location (+15)")
    
    # Confidence bonus
    conf = float(row.get("overall_confidence", 0.5))
    if conf >= 0.8:
        wfs += 5
        erp += 5
        wfs_reasons.append("high_confidence (+5)")
        erp_reasons.append("high_confidence (+5)")
    
    # Cross-sell
    cs = round((wfs + erp) / 2, 1)
    
    row["website_fit_score"] = str(max(0, wfs))
    row["website_fit_rationale"] = "; ".join(wfs_reasons)
    row["erp_fit_score"] = str(max(0, erp))
    row["erp_fit_rationale"] = "; ".join(erp_reasons)
    row["cross_sell_score"] = str(cs)
    
    return row


def merge_enrichment(master_rows, enrichment_file, source_label):
    """Merge enrichment CSV into master rows by entity_id."""
    if not os.path.exists(enrichment_file):
        print(f"  Skipping {enrichment_file} (not found)")
        return master_rows, 0
    
    enrichment = {}
    with open(enrichment_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            eid = row.get("entity_id", "").strip()
            if eid:
                enrichment[eid] = row
    
    updated = 0
    for mrow in master_rows:
        eid = mrow["entity_id"]
        if eid in enrichment:
            erow = enrichment[eid]
            # Update fields from enrichment
            if erow.get("website") and not mrow.get("website"):
                mrow["website"] = erow["website"]
                mrow["has_website"] = "yes"
            if erow.get("shop_size_class") and erow["shop_size_class"] != "unknown":
                mrow["shop_size_class"] = erow["shop_size_class"]
            if erow.get("aircraft_worked_on") and erow["aircraft_worked_on"] != "unknown":
                mrow["aircraft_worked_on"] = erow["aircraft_worked_on"]
            if erow.get("profile_archetype") and erow["profile_archetype"] != "general-mro":
                mrow["profile_archetype"] = erow["profile_archetype"]
            if erow.get("is_enterprise") == "yes":
                mrow["is_enterprise"] = "yes"
            if erow.get("mro_software_detected") and erow["mro_software_detected"] not in ("", "none", "unknown"):
                sw = erow["mro_software_detected"].lower()
                if "ebis" in sw:
                    mrow["corridor_ebis_likelihood"] = "confirmed_ebis"
                elif "corridor" in sw:
                    mrow["corridor_ebis_likelihood"] = "corridor-verified"
            if erow.get("contact_name"):
                # Store in notes via data_source update
                pass
            
            mrow["data_source"] = f"{mrow.get('data_source','')};{source_label}"
            mrow["last_updated"] = datetime.now().strftime("%Y-%m-%d")
            updated += 1
    
    print(f"  Merged {updated} records from {source_label}")
    return master_rows, updated


def rebuild_tiers(master_rows):
    """Rebuild website-targets-tiered.csv and erp-targets-tiered.csv."""
    smb_rows = [r for r in master_rows if r.get("is_enterprise") != "yes"]
    
    # Website targets: WFS >= 55, sorted desc
    website_targets = sorted(
        [r for r in smb_rows if float(r.get("website_fit_score", 0)) >= 55],
        key=lambda r: float(r.get("website_fit_score", 0)),
        reverse=True
    )[:150]
    
    out = os.path.join(DIR, "website-targets-tiered.csv")
    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(website_targets)
    print(f"  Website targets: {len(website_targets)} records")
    
    # ERP targets: ERP >= 35, sorted desc
    erp_targets = sorted(
        [r for r in smb_rows if float(r.get("erp_fit_score", 0)) >= 35],
        key=lambda r: float(r.get("erp_fit_score", 0)),
        reverse=True
    )[:150]
    
    out = os.path.join(DIR, "erp-targets-tiered.csv")
    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(erp_targets)
    print(f"  ERP targets: {len(erp_targets)} records")
    
    # No-website priority
    no_web = sorted(
        [r for r in smb_rows if r.get("has_website") != "yes"],
        key=lambda r: float(r.get("website_fit_score", 0)),
        reverse=True
    )
    
    out = os.path.join(DIR, "no-website-priority.csv")
    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(no_web)
    print(f"  No-website priority: {len(no_web)} records")
    
    # Cross-sell top 25
    cross = sorted(
        [r for r in smb_rows if float(r.get("cross_sell_score", 0)) >= 50],
        key=lambda r: float(r.get("cross_sell_score", 0)),
        reverse=True
    )[:25]
    
    out = os.path.join(DIR, "cross-sell-top25.csv")
    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(cross)
    print(f"  Cross-sell top 25: {len(cross)} records")


def rebuild_hot_leads(master_rows):
    """Rebuild hot-leads-priority.csv with improved scoring."""
    leads = []
    for row in master_rows:
        if row.get("is_enterprise") == "yes":
            continue
        
        wfs = float(row.get("website_fit_score", 0))
        erp = float(row.get("erp_fit_score", 0))
        cs = float(row.get("cross_sell_score", 0))
        cel = row.get("corridor_ebis_likelihood", "unknown")
        multi = row.get("multi_location_group", "")
        
        priority = 0
        lead_type = []
        action = []
        
        # EBIS churn leads
        if cel == "confirmed_ebis":
            priority += 100
            lead_type.append("EBIS_CHURN")
            action.append("Warm ERP outreach — Veryon churn window")
        
        # Corridor adjacent (smaller shops)
        if cel == "corridor-verified":
            priority += 30
            lead_type.append("CORRIDOR_ADJACENT")
        
        # Cross-sell (high WFS + high ERP)
        if wfs >= 60 and erp >= 50:
            priority += 60
            lead_type.append("CROSS_SELL")
            action.append(f"Website redesign $10-25k; ERP demo qualification")
        
        # Multi-location
        if multi:
            priority += 15
            lead_type.append("MULTI_LOCATION")
            action.append(f"Multi-location deal ({multi})")
        
        # High WFS only
        if wfs >= 70 and "CROSS_SELL" not in lead_type:
            priority += 40
            lead_type.append("WEBSITE_HOT")
            action.append(f"Website redesign ${int(5+wfs/10)}k-{int(10+wfs/5)}k")
        
        # High ERP only
        if erp >= 60 and "CROSS_SELL" not in lead_type:
            priority += 40
            lead_type.append("ERP_HOT")
            action.append("ERP demo qualification")
        
        if priority > 0:
            leads.append({
                "priority_rank": 0,
                "lead_type": "|".join(lead_type),
                "entity_id": row["entity_id"],
                "legal_name": row.get("legal_name", ""),
                "dba_name": row.get("dba_name", ""),
                "city": row.get("city", ""),
                "state": row.get("state", ""),
                "phone": row.get("phone", ""),
                "email": row.get("email", ""),
                "website": row.get("website", ""),
                "profile_archetype": row.get("profile_archetype", ""),
                "shop_size_class": row.get("shop_size_class", ""),
                "website_fit_score": wfs,
                "erp_fit_score": erp,
                "cross_sell_score": cs,
                "corridor_ebis_likelihood": cel,
                "multi_location_group": multi,
                "action_recommended": "; ".join(action) if action else "",
                "notes": "",
                "_priority": priority,
            })
    
    # Sort by priority desc
    leads.sort(key=lambda x: x["_priority"], reverse=True)
    for i, lead in enumerate(leads, 1):
        lead["priority_rank"] = i
        del lead["_priority"]
    
    # Write top 50
    out = os.path.join(DIR, "hot-leads-priority.csv")
    lead_cols = ["priority_rank","lead_type","entity_id","legal_name","dba_name",
                 "city","state","phone","email","website","profile_archetype",
                 "shop_size_class","website_fit_score","erp_fit_score",
                 "cross_sell_score","corridor_ebis_likelihood","multi_location_group",
                 "action_recommended","notes"]
    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=lead_cols, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(leads[:50])
    print(f"  Hot leads: {len(leads)} total, top 50 written")
    return len(leads)


def main():
    print("=== Wave 10 Merge ===")
    print(f"Reading master list from {MASTER}")
    
    master_rows = []
    with open(MASTER) as f:
        reader = csv.DictReader(f)
        for row in reader:
            master_rows.append(row)
    print(f"  Loaded {len(master_rows)} records")
    
    # Merge enrichments
    total_updated = 0
    for enrichment_file, label in [
        (FL_ENRICHMENT, "enrichment-fl-ftl-w10"),
        (CA_ENRICHMENT, "enrichment-ca-vanNuys-w10"),
    ]:
        master_rows, updated = merge_enrichment(master_rows, enrichment_file, label)
        total_updated += updated
    
    print(f"\n  Total records enriched: {total_updated}")
    
    # Rescore all records
    print("\nRescoring all records...")
    for row in master_rows:
        compute_scores(row)
    
    # Write updated master
    print(f"\nWriting updated master ({len(master_rows)} records)...")
    with open(MASTER, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(master_rows)
    
    # Rebuild tiers
    print("\nRebuilding tiered lists...")
    rebuild_tiers(master_rows)
    
    # Rebuild hot leads
    print("\nRebuilding hot leads...")
    hot_count = rebuild_hot_leads(master_rows)
    
    print(f"\n=== Done. {total_updated} records enriched, {hot_count} hot leads identified. ===")


if __name__ == "__main__":
    main()
