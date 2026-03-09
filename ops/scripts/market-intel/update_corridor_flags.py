#!/usr/bin/env python3
"""
Flag known Corridor/EBIS customers in the master target list.
Updates corridor_ebis_likelihood field based on verified customer data.
"""

import csv
import sys

MASTER = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory/master-target-list.csv"

# Known Corridor customers (verified from corridor.aero/customers + case studies)
CORRIDOR_NAMES = {
    'ATLANTIC AVIATION': 'corridor-verified',
    'CLAY LACY': 'corridor-verified',
    'CONSTANT AVIATION': 'corridor-verified',
    'CUTTER AVIATION': 'corridor-verified',
    'EAGLE COPTERS': 'corridor-verified',
    'EXECUJET': 'corridor-verified',
    'GAMA AVIATION': 'corridor-verified',
    'JET AVIATION': 'corridor-verified',
    'MILLION AIR': 'corridor-verified',
    'OMNIMX': 'corridor-verified',
    'STEVENS AVIATION': 'corridor-verified',
    'STEVENS AEROSPACE': 'corridor-verified',
    'WEST STAR AVIATION': 'corridor-verified',
    'WHEELS UP': 'corridor-verified',
    'ACI JET': 'corridor-verified',
    'WARDADDY AVIATION': 'corridor-verified',
}

def check_corridor(legal_name, dba_name):
    combined = (legal_name + ' ' + (dba_name or '')).upper()
    for key, val in CORRIDOR_NAMES.items():
        if key in combined:
            return val
    return None


def main():
    rows = []
    updated = 0
    with open(MASTER, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            match = check_corridor(row['legal_name'], row.get('dba_name', ''))
            if match:
                row['corridor_ebis_likelihood'] = match
                updated += 1
            rows.append(row)
    
    with open(MASTER, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Updated {updated} records with Corridor customer flags")
    print(f"Total records: {len(rows)}")


if __name__ == '__main__':
    main()
