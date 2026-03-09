#!/usr/bin/env python3
"""
Wave 3 data quality pass:
1. Deduplicate master-target-list by cert_no (primary key)
2. Normalize domains (lowercase, strip www.)
3. Normalize geo (state uppercase, zip 5-digit)
4. Flag enterprise/OEM entities for exclusion
5. Improve confidence scoring
6. Tag multi-location entities
"""

import csv
import os
import re
from datetime import date
from collections import Counter

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"
MASTER = os.path.join(DIR, "master-target-list.csv")
TODAY = date.today().isoformat()

# Known enterprise/OEM names to flag (not SMB targets)
ENTERPRISE_PATTERNS = [
    r'\bboeing\b', r'\bairbus\b', r'\blockheed\b', r'\bnorthrop\b', r'\braytheon\b',
    r'\bgeneral electric\b', r'\bge aviation\b', r'\bpratt\s*&?\s*whitney\b',
    r'\brolls[\s-]royce\b', r'\bhoneywell\b', r'\bcollins aerospace\b',
    r'\brtx\b', r'\bl3harris\b', r'\bbae systems\b', r'\bsafran\b',
    r'\btextron aviation\b', r'\bamentum\b', r'\bdrs defense\b',
    r'\bsierra nevada company\b', r'\bvertex aerospace\b',
    r'\bboeing distribution\b', r'\binternational aerospace coatings\b',
    r'\bstandardaero\b', r'\bsts aviation\b', r'\bheico\b',
    r'\bdelta techops\b', r'\bunited airlines\b', r'\bamerican airlines\b',
    r'\bsouthwest airlines\b', r'\bfedex\b', r'\bups\b',
]

def normalize_website(url):
    if not url:
        return ''
    url = url.strip().lower()
    url = re.sub(r'^https?://', '', url)
    url = re.sub(r'^www\.', '', url)
    url = url.rstrip('/')
    return url

def normalize_state(state):
    return state.strip().upper() if state else ''

def normalize_zip(z):
    if not z:
        return ''
    z = z.strip()
    if len(z) > 5 and '-' in z:
        z = z.split('-')[0]
    return z[:5]

def is_enterprise(name):
    name_lower = name.lower() if name else ''
    for pat in ENTERPRISE_PATTERNS:
        if re.search(pat, name_lower):
            return True
    return False

def main():
    with open(MASTER, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"Input: {len(rows)} records")

    # Add new columns if not present
    extra_cols = ['is_enterprise', 'multi_location_group', 'domain_normalized']
    for col in extra_cols:
        if col not in fieldnames:
            fieldnames.append(col)

    # Deduplicate by cert_no (keep first occurrence)
    seen_certs = set()
    deduped = []
    dupes_removed = 0
    for row in rows:
        cert = row.get('cert_no', '').strip()
        if cert and cert in seen_certs:
            dupes_removed += 1
            continue
        if cert:
            seen_certs.add(cert)
        deduped.append(row)

    print(f"Removed {dupes_removed} duplicate cert_no records")

    # Normalize and enrich
    enterprise_count = 0
    multi_loc_groups = Counter()
    
    for row in deduped:
        # Normalize fields
        row['state'] = normalize_state(row.get('state', ''))
        row['zip'] = normalize_zip(row.get('zip', ''))
        
        # Normalize website domain
        website = row.get('website', '')
        row['domain_normalized'] = normalize_website(website)
        
        # Flag enterprise
        name = row.get('legal_name', '')
        row['is_enterprise'] = 'yes' if is_enterprise(name) else 'no'
        if row['is_enterprise'] == 'yes':
            enterprise_count += 1
        
        # Track multi-location entities
        multi_loc_groups[name] += 1

    # Tag multi-location groups
    multi_loc_names = {n for n, c in multi_loc_groups.items() if c > 1}
    multi_loc_count = 0
    for row in deduped:
        name = row.get('legal_name', '')
        if name in multi_loc_names:
            row['multi_location_group'] = name
            multi_loc_count += 1
        else:
            row['multi_location_group'] = ''

    # Recalculate confidence for records with more data points
    for row in deduped:
        data_points = 0
        if row.get('has_phone') == 'yes': data_points += 1
        if row.get('has_email') == 'yes': data_points += 1
        if row.get('has_website') == 'yes': data_points += 2
        if row.get('shop_size_class', 'unknown') != 'unknown': data_points += 1
        if row.get('aircraft_worked_on', 'unknown') != 'unknown': data_points += 1
        if row.get('profile_archetype', 'unknown') != 'unknown': data_points += 1
        
        # Adjust confidence based on data completeness
        base_conf = float(row.get('overall_confidence', 0.5))
        if data_points >= 5:
            row['overall_confidence'] = str(min(0.95, base_conf + 0.1))
        elif data_points >= 3:
            row['overall_confidence'] = str(min(0.85, base_conf + 0.05))

    # Write back
    with open(MASTER, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(deduped)

    print(f"Output: {len(deduped)} records")
    print(f"Enterprise flagged: {enterprise_count}")
    print(f"Multi-location entities: {len(multi_loc_names)} groups ({multi_loc_count} records)")

    # Print state distribution
    state_counts = Counter(r['state'] for r in deduped)
    print(f"\nState distribution:")
    for state, count in sorted(state_counts.items(), key=lambda x: -x[1]):
        ent = sum(1 for r in deduped if r['state'] == state and r['is_enterprise'] == 'yes')
        smb = count - ent
        print(f"  {state}: {count} total ({smb} SMB, {ent} enterprise)")

if __name__ == '__main__':
    main()
