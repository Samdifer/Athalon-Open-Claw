#!/usr/bin/env python3
"""
Rebuild tiered outreach lists from master-target-list.csv.
Excludes enterprise-flagged records from outreach targets.
Generates:
  - website-targets-tiered.csv (Top 50 by website_fit_score, no website or poor site)
  - erp-targets-tiered.csv (Top 50 by erp_fit_score)
  - no-website-priority.csv (All SMB shops with no website, sorted by cross_sell_score)
  - cross-sell-top25.csv (Top 25 cross-sell opportunities)
"""

import csv
import os

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"
MASTER = os.path.join(DIR, "master-target-list.csv")

def load_master():
    with open(MASTER, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)
    return fieldnames, rows

def is_smb(row):
    return row.get('is_enterprise', 'no') != 'yes'

def has_phone_or_email(row):
    return row.get('has_phone') == 'yes' or row.get('has_email') == 'yes'

def write_csv(path, fieldnames, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)

def main():
    fieldnames, rows = load_master()
    smb = [r for r in rows if is_smb(r)]
    reachable_smb = [r for r in smb if has_phone_or_email(r)]
    
    print(f"Total: {len(rows)} | SMB: {len(smb)} | Reachable SMB: {len(reachable_smb)}")
    
    # Website targets: SMB shops with no website or weak website, sorted by website_fit_score
    website_candidates = [r for r in reachable_smb 
                         if r.get('has_website') != 'yes' or 
                         'poor' in r.get('website_fit_rationale', '').lower() or
                         'basic' in r.get('website_fit_rationale', '').lower() or
                         'weak' in r.get('website_fit_rationale', '').lower()]
    website_candidates.sort(key=lambda r: float(r.get('website_fit_score', 0)), reverse=True)
    write_csv(os.path.join(DIR, 'website-targets-tiered.csv'), fieldnames, website_candidates[:50])
    print(f"Website targets (top 50): written")
    
    # ERP targets: SMB shops sorted by erp_fit_score
    erp_candidates = sorted(reachable_smb, key=lambda r: float(r.get('erp_fit_score', 0)), reverse=True)
    write_csv(os.path.join(DIR, 'erp-targets-tiered.csv'), fieldnames, erp_candidates[:50])
    print(f"ERP targets (top 50): written")
    
    # No-website priority: all SMB without website
    no_web = [r for r in smb if r.get('has_website') != 'yes']
    no_web.sort(key=lambda r: float(r.get('cross_sell_score', 0)), reverse=True)
    write_csv(os.path.join(DIR, 'no-website-priority.csv'), fieldnames, no_web)
    print(f"No-website priority: {len(no_web)} records")
    
    # Cross-sell top 25: highest combined score, reachable
    for r in reachable_smb:
        ws = float(r.get('website_fit_score', 0))
        es = float(r.get('erp_fit_score', 0))
        r['_combined'] = ws + es
    cross_sell = sorted(reachable_smb, key=lambda r: r.get('_combined', 0), reverse=True)[:25]
    write_csv(os.path.join(DIR, 'cross-sell-top25.csv'), fieldnames, cross_sell)
    print(f"Cross-sell top 25: written")
    
    # Stats
    states = {}
    for r in website_candidates[:50]:
        st = r.get('state', '?')
        states[st] = states.get(st, 0) + 1
    print(f"\nTop 50 website targets by state: {dict(sorted(states.items(), key=lambda x: -x[1]))}")
    
    erp_states = {}
    for r in erp_candidates[:50]:
        st = r.get('state', '?')
        erp_states[st] = erp_states.get(st, 0) + 1
    print(f"Top 50 ERP targets by state: {dict(sorted(erp_states.items(), key=lambda x: -x[1]))}")

if __name__ == '__main__':
    main()
