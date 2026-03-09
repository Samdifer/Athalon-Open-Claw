#!/usr/bin/env python3
"""
Add metro_cluster field to master-target-list.csv.
Groups nearby cities into metropolitan clusters for geographic targeting.
"""

import csv
import os

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"
MASTER = os.path.join(DIR, "master-target-list.csv")

# Metro cluster mappings: city → cluster name
METRO_CLUSTERS = {
    # South Florida
    "MIAMI": "Miami-Dade", "DORAL": "Miami-Dade", "HIALEAH": "Miami-Dade",
    "MEDLEY": "Miami-Dade", "MIAMI LAKES": "Miami-Dade", "MIAMI GARDENS": "Miami-Dade",
    "OPA LOCKA": "Miami-Dade", "OPA-LOCKA": "Miami-Dade", "HOMESTEAD": "Miami-Dade",
    "MIRAMAR": "Broward", "FORT LAUDERDALE": "Broward", "FT LAUDERDALE": "Broward",
    "FT. LAUDERDALE": "Broward", "PEMBROKE PINES": "Broward", "HOLLYWOOD": "Broward",
    "DAVIE": "Broward", "DEERFIELD BEACH": "Broward", "POMPANO BEACH": "Broward",
    "SUNRISE": "Broward", "WEST PALM BEACH": "Palm Beach", "BOCA RATON": "Palm Beach",
    "LANTANA": "Palm Beach", "BOYNTON BEACH": "Palm Beach", "JUPITER": "Palm Beach",
    "STUART": "Treasure Coast",
    # Central FL
    "ORLANDO": "Orlando", "SANFORD": "Orlando", "KISSIMMEE": "Orlando",
    "APOPKA": "Orlando", "MELBOURNE": "Space Coast", "TITUSVILLE": "Space Coast",
    "COCOA": "Space Coast", "VERO BEACH": "Space Coast",
    # Tampa Bay
    "TAMPA": "Tampa Bay", "CLEARWATER": "Tampa Bay", "ST. PETERSBURG": "Tampa Bay",
    "SAINT PETERSBURG": "Tampa Bay", "LAKELAND": "Tampa Bay",
    # SW FL
    "FORT MYERS": "SW Florida", "NAPLES": "SW Florida", "SARASOTA": "SW Florida",
    "VENICE": "SW Florida", "PUNTA GORDA": "SW Florida", "ARCADIA": "SW Florida",
    # TX
    "DALLAS": "DFW", "FORT WORTH": "DFW", "ADDISON": "DFW", "IRVING": "DFW",
    "GRAPEVINE": "DFW", "CARROLLTON": "DFW", "GRAND PRAIRIE": "DFW",
    "FARMERS BRANCH": "DFW", "FRISCO": "DFW", "EULESS": "DFW",
    "DENTON": "DFW", "MCKINNEY": "DFW", "WHITE SETTLEMENT": "DFW",
    "SAN ANTONIO": "San Antonio", "NEW BRAUNFELS": "San Antonio",
    "HOUSTON": "Houston", "SUGAR LAND": "Houston", "HUMBLE": "Houston",
    "PEARLAND": "Houston", "THE WOODLANDS": "Houston", "SPRING": "Houston",
    "DICKINSON": "Houston", "ALVIN": "Houston",
    "WACO": "Central TX", "TEMPLE": "Central TX",
    # AZ
    "PHOENIX": "Phoenix Metro", "MESA": "Phoenix Metro", "TEMPE": "Phoenix Metro",
    "SCOTTSDALE": "Phoenix Metro", "CHANDLER": "Phoenix Metro",
    "GLENDALE": "Phoenix Metro", "GILBERT": "Phoenix Metro", "GOODYEAR": "Phoenix Metro",
    "TUCSON": "Tucson", "MARANA": "Tucson",
    # CA
    "VAN NUYS": "LA Basin", "BURBANK": "LA Basin", "CHATSWORTH": "LA Basin",
    "LONG BEACH": "LA Basin", "HAWTHORNE": "LA Basin", "TORRANCE": "LA Basin",
    "GARDENA": "LA Basin", "EL SEGUNDO": "LA Basin", "INGLEWOOD": "LA Basin",
    "COMPTON": "LA Basin", "MONTEBELLO": "LA Basin", "SAN FERNANDO": "LA Basin",
    "CORONA": "Inland Empire", "ONTARIO": "Inland Empire", "CHINO": "Inland Empire",
    "MORENO VALLEY": "Inland Empire",
    "CAMARILLO": "Ventura/SB", "SIMI VALLEY": "Ventura/SB",
    "SANTA MARIA": "Ventura/SB", "GOLETA": "Ventura/SB",
    "VALENCIA": "Santa Clarita",
    "SAN DIEGO": "San Diego", "EL CAJON": "San Diego", "RAMONA": "San Diego",
    "OCEANSIDE": "San Diego",
    "SACRAMENTO": "Sacramento", "MCCLELLAN": "Sacramento", "MATHER": "Sacramento",
    "FRESNO": "Central Valley", "SALINAS": "Central Valley",
    # CO
    "ENGLEWOOD": "Denver Metro", "BROOMFIELD": "Denver Metro",
    "DENVER": "Denver Metro", "THORNTON": "Denver Metro", "AURORA": "Denver Metro",
    "GRAND JUNCTION": "Western CO", "FORT COLLINS": "Northern CO",
    "COLORADO SPRINGS": "Colorado Springs",
    # OH
    "CINCINNATI": "Cincinnati", "MIAMISBURG": "Dayton", "VANDALIA": "Dayton",
    "BEAVERCREEK": "Dayton", "COLUMBUS": "Columbus", "CLEVELAND": "Cleveland",
    "TIFFIN": "Northern OH",
    # KS
    "WICHITA": "Wichita",
    # OK
    "TULSA": "Tulsa", "BROKEN ARROW": "Tulsa",
    "BETHANY": "OKC", "OKLAHOMA CITY": "OKC", "EDMOND": "OKC",
    # TN
    "NASHVILLE": "Nashville", "GALLATIN": "Nashville", "MT JULIET": "Nashville",
    "MEMPHIS": "Memphis", "COLLIERVILLE": "Memphis",
    "CHATTANOOGA": "Chattanooga",
    # GA
    "ATLANTA": "Atlanta", "KENNESAW": "Atlanta", "MARIETTA": "Atlanta",
    "NORCROSS": "Atlanta", "COLLEGE PARK": "Atlanta", "SUWANEE": "Atlanta",
    "PEACHTREE CITY": "South Atlanta",
    # NC
    "GREENSBORO": "Piedmont Triad", "WINSTON-SALEM": "Piedmont Triad",
    "CHARLOTTE": "Charlotte", "HICKORY": "Charlotte",
    # CT
    "HARTFORD": "Hartford", "EAST WINDSOR": "Hartford", "WINDSOR": "Hartford",
    "BLOOMFIELD": "Hartford", "EAST GRANBY": "Hartford",
    # NY
    "RONKONKOMA": "Long Island", "BOHEMIA": "Long Island",
    # WA
    "EVERETT": "Seattle", "KENT": "Seattle", "MARYSVILLE": "Seattle",
    "BELLINGHAM": "NW Washington",
    # IL
    "CHICAGO": "Chicago", "ELK GROVE VILLAGE": "Chicago",
    "BENSENVILLE": "Chicago", "LINCOLNSHIRE": "Chicago",
    # NV
    "LAS VEGAS": "Las Vegas",
}


def main():
    rows = []
    with open(MASTER) as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            city = row.get("city", "").strip().upper()
            cluster = METRO_CLUSTERS.get(city, "")
            row["metro_cluster"] = cluster
            rows.append(row)
    
    # Add metro_cluster to fieldnames if not present
    if "metro_cluster" not in fieldnames:
        fieldnames = list(fieldnames) + ["metro_cluster"]
    
    with open(MASTER, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    
    # Stats
    from collections import Counter
    clusters = Counter()
    for r in rows:
        c = r.get("metro_cluster", "")
        if c:
            clusters[c] += 1
    
    assigned = sum(1 for r in rows if r.get("metro_cluster"))
    print(f"Metro clusters assigned: {assigned}/{len(rows)} records")
    print("\nTop clusters:")
    for c, n in clusters.most_common(20):
        print(f"  {c}: {n}")


if __name__ == "__main__":
    main()
