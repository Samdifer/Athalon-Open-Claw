#!/usr/bin/env python3
"""
Generate metro cluster analysis from master target list.
Groups shops by metropolitan area for geographic selling strategy.
"""

import csv
import os
from collections import defaultdict

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"

# Metro area definitions: city patterns -> metro name
METRO_DEFS = {
    "South Florida": {
        "state": "FL",
        "cities": ["MIAMI", "FORT LAUDERDALE", "HOLLYWOOD", "POMPANO BEACH", "BOCA RATON",
                   "WEST PALM BEACH", "DEERFIELD BEACH", "HIALEAH", "OPA LOCKA", "DORAL",
                   "MIRAMAR", "CORAL GABLES", "HOMESTEAD", "STUART", "JUPITER",
                   "BOYNTON BEACH", "DELRAY BEACH", "PLANTATION", "SUNRISE", "DAVIE",
                   "PEMBROKE PINES", "WESTON", "TAMARAC", "CORAL SPRINGS", "MELBOURNE",
                   "VERO BEACH", "SANFORD", "OCOEE"]
    },
    "DFW Metroplex": {
        "state": "TX",
        "cities": ["DALLAS", "FORT WORTH", "ADDISON", "MCKINNEY", "ROANOKE", "ARLINGTON",
                   "IRVING", "PLANO", "FRISCO", "DENTON", "MESQUITE", "GARLAND",
                   "GRAND PRAIRIE", "CARROLLTON", "LEWISVILLE", "GRAPEVINE", "FLOWER MOUND",
                   "MIDLOTHIAN", "LANCASTER", "DECATUR", "BRIDGEPORT", "GAINESVILLE",
                   "MINERAL WELLS", "WEATHERFORD", "CLEBURNE"]
    },
    "Los Angeles Basin": {
        "state": "CA",
        "cities": ["LOS ANGELES", "VAN NUYS", "BURBANK", "LONG BEACH", "TORRANCE",
                   "EL MONTE", "COMPTON", "HAWTHORNE", "CHINO", "ONTARIO", "RIVERSIDE",
                   "SAN BERNARDINO", "UPLAND", "CORONA", "FULLERTON", "SANTA ANA",
                   "ANAHEIM", "IRVINE", "REDLANDS", "CAMARILLO", "OXNARD", "PALMDALE",
                   "LANCASTER", "VICTORVILLE"]
    },
    "Phoenix Metro": {
        "state": "AZ",
        "cities": ["PHOENIX", "SCOTTSDALE", "MESA", "TEMPE", "CHANDLER", "GLENDALE",
                   "GOODYEAR", "DEER VALLEY", "SURPRISE", "PEORIA", "GILBERT", "AVONDALE",
                   "BUCKEYE", "LITCHFIELD PARK", "MARANA"]
    },
    "San Antonio / Austin": {
        "state": "TX",
        "cities": ["SAN ANTONIO", "AUSTIN", "NEW BRAUNFELS", "SAN MARCOS", "GEORGETOWN",
                   "BOERNE", "SEGUIN", "ROUND ROCK", "CEDAR PARK"]
    },
    "Houston": {
        "state": "TX",
        "cities": ["HOUSTON", "SUGAR LAND", "CONROE", "SPRING", "HUMBLE", "TOMBALL",
                   "PASADENA", "BAYTOWN", "LEAGUE CITY", "GALVESTON", "PEARLAND"]
    },
    "Denver Front Range": {
        "state": "CO",
        "cities": ["DENVER", "AURORA", "BROOMFIELD", "ENGLEWOOD", "THORNTON", "ARVADA",
                   "LOVELAND", "GREELEY", "BOULDER", "LONGMONT", "FORT COLLINS",
                   "CENTENNIAL", "LITTLETON", "LAKEWOOD", "WESTMINSTER", "ERIE",
                   "JEFFERSON COUNTY"]
    },
    "Atlanta Metro": {
        "state": "GA",
        "cities": ["ATLANTA", "MARIETTA", "PEACHTREE CITY", "KENNESAW", "LAWRENCEVILLE",
                   "NORCROSS", "ALPHARETTA", "MCDONOUGH", "GRIFFIN", "ROME", "CARTERSVILLE"]
    },
    "Wichita": {
        "state": "KS",
        "cities": ["WICHITA", "BENTON", "HUTCHINSON", "NEWTON", "EL DORADO", "AUGUSTA",
                   "DERBY", "ANDOVER", "PARK CITY"]
    },
    "Nashville": {
        "state": "TN",
        "cities": ["NASHVILLE", "MURFREESBORO", "SMYRNA", "LEBANON", "FRANKLIN",
                   "GALLATIN", "HENDERSONVILLE", "MOUNT JULIET"]
    },
    "SF Bay Area": {
        "state": "CA",
        "cities": ["SAN FRANCISCO", "OAKLAND", "SAN JOSE", "HAYWARD", "CONCORD",
                   "LIVERMORE", "PALO ALTO", "SANTA ROSA", "NAPA", "NOVATO",
                   "REDWOOD CITY", "FREMONT", "TRACY"]
    },
    "Las Vegas": {
        "state": "NV",
        "cities": ["LAS VEGAS", "HENDERSON", "NORTH LAS VEGAS", "BOULDER CITY"]
    },
    "Seattle / Puget Sound": {
        "state": "WA",
        "cities": ["SEATTLE", "RENTON", "KENT", "AUBURN", "OLYMPIA", "TACOMA",
                   "PUYALLUP", "EVERETT", "BELLEVUE", "MUKILTEO", "BELLINGHAM",
                   "BURLINGTON", "ARLINGTON", "SNOHOMISH"]
    },
    "Hartford / CT Corridor": {
        "state": "CT",
        "cities": ["HARTFORD", "WINDSOR LOCKS", "STRATFORD", "BRIDGEPORT", "GROTON",
                   "NEW HAVEN", "MERIDEN", "WATERBURY", "DANBURY", "BETHANY",
                   "ROCKY HILL", "BLOOMFIELD", "OXFORD", "PORTLAND"]
    },
    "Tucson": {
        "state": "AZ",
        "cities": ["TUCSON", "MARANA", "ORO VALLEY"]
    },
    "Tampa Bay": {
        "state": "FL",
        "cities": ["TAMPA", "ST PETERSBURG", "CLEARWATER", "LAKELAND", "SARASOTA",
                   "BRADENTON", "PLANT CITY"]
    },
    "Orlando": {
        "state": "FL",
        "cities": ["ORLANDO", "KISSIMMEE", "SANFORD", "DAYTONA BEACH", "TITUSVILLE",
                   "DELAND"]
    },
    "Columbus / Dayton OH": {
        "state": "OH",
        "cities": ["COLUMBUS", "DAYTON", "SPRINGFIELD", "BELLEFONTAINE", "ZANESVILLE",
                   "LONDON", "WILMINGTON"]
    },
    "Cleveland / Akron": {
        "state": "OH",
        "cities": ["CLEVELAND", "AKRON", "WILLOUGHBY", "CUYAHOGA FALLS", "NORTH CANTON",
                   "RAVENNA"]
    },
    "San Diego": {
        "state": "CA",
        "cities": ["SAN DIEGO", "CARLSBAD", "OCEANSIDE", "EL CAJON", "CHULA VISTA"]
    },
}


def main():
    # Load master list
    master_path = os.path.join(DIR, "master-target-list.csv")
    records = []
    with open(master_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    
    # Classify each record into metro
    metro_shops = defaultdict(list)
    unclassified = []
    
    for rec in records:
        if rec.get("is_enterprise") in ("yes", "self"):
            continue
        
        city = (rec.get("city") or "").upper().strip()
        state = (rec.get("state") or "").upper().strip()
        matched = False
        
        for metro_name, defn in METRO_DEFS.items():
            if defn["state"] == state and city in defn["cities"]:
                metro_shops[metro_name].append(rec)
                matched = True
                break
        
        if not matched:
            unclassified.append(rec)
    
    # Output metro cluster summary
    out_path = os.path.join(DIR, "metro-clusters-detailed.csv")
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["metro", "total_shops", "with_website", "no_website", "tier_a",
                         "avg_website_fit", "avg_erp_fit", "ebis_confirmed", "corridor_confirmed",
                         "priority_rank", "notes"])
        
        ranked = sorted(metro_shops.items(), key=lambda x: len(x[1]), reverse=True)
        
        for rank, (metro, shops) in enumerate(ranked, 1):
            with_web = sum(1 for s in shops if s.get("has_website") == "yes")
            no_web = sum(1 for s in shops if s.get("has_website") == "no")
            tier_a = sum(1 for s in shops if s.get("outreach_tier") == "A")
            avg_ws = round(sum(float(s.get("website_fit_score", 0)) for s in shops) / len(shops), 1)
            avg_erp = round(sum(float(s.get("erp_fit_score", 0)) for s in shops) / len(shops), 1)
            ebis = sum(1 for s in shops if "ebis" in (s.get("corridor_ebis_likelihood") or "").lower())
            corridor = sum(1 for s in shops if "corridor" in (s.get("corridor_ebis_likelihood") or "").lower())
            
            notes = []
            if ebis > 0:
                notes.append(f"{ebis} EBIS churn targets")
            if corridor > 0:
                notes.append(f"{corridor} Corridor users (enterprise)")
            if no_web / max(len(shops), 1) > 0.9:
                notes.append("90%+ no-website — mass outreach opportunity")
            
            writer.writerow([metro, len(shops), with_web, no_web, tier_a,
                             avg_ws, avg_erp, ebis, corridor, rank,
                             "; ".join(notes)])
        
        print(f"\n=== Metro Cluster Summary ({len(ranked)} metros) ===\n")
        print(f"{'Metro':<30} {'Shops':>6} {'No Web':>7} {'Tier A':>7} {'WS Fit':>7} {'ERP Fit':>8}")
        print("-" * 75)
        for rank, (metro, shops) in enumerate(ranked, 1):
            no_web = sum(1 for s in shops if s.get("has_website") == "no")
            tier_a = sum(1 for s in shops if s.get("outreach_tier") == "A")
            avg_ws = round(sum(float(s.get("website_fit_score", 0)) for s in shops) / len(shops), 1)
            avg_erp = round(sum(float(s.get("erp_fit_score", 0)) for s in shops) / len(shops), 1)
            print(f"{rank:2}. {metro:<27} {len(shops):>6} {no_web:>7} {tier_a:>7} {avg_ws:>7} {avg_erp:>8}")
        
        print(f"\nUnclassified (non-metro): {len(unclassified)} shops")
    
    # Generate per-metro mini-lists for top 10 metros
    minilist_dir = os.path.join(DIR, "metro-outreach")
    os.makedirs(minilist_dir, exist_ok=True)
    
    OUT_COLS = [
        "entity_id","legal_name","dba_name","city","state","zip","phone","email","website",
        "cert_no","shop_size_class","website_fit_score","erp_fit_score","cross_sell_score",
        "corridor_ebis_likelihood","outreach_tier"
    ]
    
    for metro, shops in sorted(metro_shops.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
        fname = metro.lower().replace(" / ", "-").replace(" ", "-").replace(",", "") + ".csv"
        fpath = os.path.join(minilist_dir, fname)
        
        # Sort by cross-sell score descending
        shops_sorted = sorted(shops, key=lambda s: float(s.get("cross_sell_score", 0)), reverse=True)
        
        with open(fpath, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=OUT_COLS, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(shops_sorted)
        
        print(f"  Metro mini-list: {fname} ({len(shops_sorted)} shops)")
    
    print(f"\nDone. Summary → {out_path}")


if __name__ == "__main__":
    main()
