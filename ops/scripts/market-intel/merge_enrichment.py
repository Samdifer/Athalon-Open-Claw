#!/usr/bin/env python3
"""
Merge enrichment results from web discovery workers back into master-target-list.csv.
Updates: website, has_website, shop_size_class, profile_archetype, aircraft_worked_on,
         website_fit_score, website_fit_rationale, erp_fit_score, erp_fit_rationale,
         corridor_ebis_likelihood, cross_sell_score.
"""

import csv
import os
from datetime import date

DIR = "/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/knowledge/market-intel/mro-directory"
MASTER = os.path.join(DIR, "master-target-list.csv")
TODAY = date.today().isoformat()


def load_enrichment(path):
    """Load enrichment CSV into dict keyed by cert_no."""
    enriched = {}
    if not os.path.exists(path):
        return enriched
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cert = row.get('cert_no', '').strip()
            if cert:
                enriched[cert] = row
    return enriched


def score_website_enriched(row, enrichment):
    """Re-score website fit using enrichment data."""
    website_url = enrichment.get('website_url', '').strip()
    website_quality = enrichment.get('website_quality', 'none').strip().lower()
    size = enrichment.get('shop_size_class', row.get('shop_size_class', 'unknown')).strip().lower()
    archetype = enrichment.get('profile_archetype', row.get('profile_archetype', 'general-mro')).strip().lower()
    has_phone = row.get('has_phone', 'no')
    has_email = row.get('has_email', 'no')

    score = 0
    reasons = []

    # Website presence/quality
    if not website_url or website_url == 'none':
        score += 40
        reasons.append("no website (+40)")
    elif website_quality in ('poor', 'basic'):
        score += 30
        reasons.append(f"weak site quality={website_quality} (+30)")
    elif website_quality == 'good':
        score += 15
        reasons.append(f"decent site quality={website_quality} (+15)")
    elif website_quality == 'professional':
        score += 5
        reasons.append(f"professional site (+5)")

    # Size
    if size in ('medium', 'large'):
        score += 20
        reasons.append(f"size={size} (+20)")
    elif size == 'small':
        score += 10
        reasons.append(f"size=small (+10)")

    # Archetype
    if 'full-service' in archetype or 'full_service' in archetype:
        score += 15
        reasons.append(f"full-service-mro (+15)")
    elif archetype in ('specialty', 'specialty-avionics', 'specialty-components', 'specialty-engine',
                        'specialty-line-maintenance'):
        score += 10
        reasons.append(f"specialty (+10)")
    elif 'fbo' in archetype:
        score += 12
        reasons.append(f"fbo-with-maintenance (+12)")
    elif 'oem' in archetype:
        score += 8
        reasons.append(f"oem-service-center (+8)")

    # Reachability
    if has_phone == 'yes' or has_email == 'yes':
        score += 10
        reasons.append("reachable (+10)")

    return min(score, 100), "; ".join(reasons) if reasons else "no scoring criteria met"


def score_erp_enriched(row, enrichment):
    """Re-score ERP fit using enrichment data."""
    size = enrichment.get('shop_size_class', row.get('shop_size_class', 'unknown')).strip().lower()
    archetype = enrichment.get('profile_archetype', row.get('profile_archetype', 'general-mro')).strip().lower()
    aircraft = enrichment.get('aircraft_worked_on', row.get('aircraft_worked_on', 'unknown')).lower()
    has_phone = row.get('has_phone', 'no')
    has_email = row.get('has_email', 'no')
    confidence = float(row.get('overall_confidence', 0))

    score = 0
    reasons = []

    # Size
    if size in ('medium', 'large'):
        score += 25
        reasons.append(f"size={size} (+25)")
    elif size == 'small':
        score += 15
        reasons.append(f"size=small (+15)")

    # Archetype
    if 'full-service' in archetype or 'full_service' in archetype:
        score += 25
        reasons.append("full-service-mro (+25)")
    elif archetype in ('specialty', 'specialty-avionics', 'specialty-components', 'specialty-engine'):
        score += 15
        reasons.append(f"specialty (+15)")
    elif 'general-mro' in archetype:
        score += 10
        reasons.append("general-mro (+10)")
    elif 'fbo' in archetype:
        score += 12
        reasons.append("fbo-with-maintenance (+12)")

    # High-value aircraft
    HIGH_VALUE = ["business", "turbine", "jet", "gulfstream", "bombardier", "falcon", "challenger", "citation"]
    matched = [kw for kw in HIGH_VALUE if kw in aircraft]
    if matched:
        score += 15
        reasons.append(f"high-value aircraft ({','.join(matched[:3])}) (+15)")

    # Reachability
    if has_phone == 'yes' or has_email == 'yes':
        score += 10
        reasons.append("reachable (+10)")

    # Confidence
    if confidence >= 0.9:
        score += 10
        reasons.append(f"confidence={confidence:.2f}>=0.9 (+10)")
    elif confidence >= 0.75:
        score += 5
        reasons.append(f"confidence={confidence:.2f}>=0.75 (+5)")

    return min(score, 100), "; ".join(reasons) if reasons else "no scoring criteria met"


def corridor_ebis_enriched(enrichment, existing):
    """Update corridor/EBIS likelihood."""
    evidence = enrichment.get('corridor_ebis_evidence', 'none').strip().lower()
    if evidence and evidence != 'none':
        return evidence
    return existing


def main():
    # Load all enrichment files
    enrichments = {}
    for fname in os.listdir(DIR):
        if fname.startswith('enrichment-results-') and fname.endswith('.csv'):
            path = os.path.join(DIR, fname)
            data = load_enrichment(path)
            enrichments.update(data)
            print(f"Loaded {len(data)} enrichment records from {fname}")

    if not enrichments:
        print("No enrichment files found. Nothing to merge.")
        return

    # Load and update master list
    rows = []
    updated = 0
    with open(MASTER, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            cert = row.get('cert_no', '').strip()
            if cert in enrichments:
                e = enrichments[cert]
                
                # Update website
                website_url = e.get('website_url', '').strip()
                if website_url and website_url.lower() != 'none':
                    row['website'] = website_url
                    row['has_website'] = 'yes'
                
                # Update profile fields
                size = e.get('shop_size_class', '').strip()
                if size and size != 'unknown':
                    row['shop_size_class'] = size
                
                archetype = e.get('profile_archetype', '').strip()
                if archetype and archetype != 'unknown':
                    row['profile_archetype'] = archetype
                
                aircraft = e.get('aircraft_worked_on', '').strip()
                if aircraft and aircraft != 'unknown':
                    row['aircraft_worked_on'] = aircraft
                
                # Re-score
                ws_score, ws_rationale = score_website_enriched(row, e)
                erp_score, erp_rationale = score_erp_enriched(row, e)
                
                row['website_fit_score'] = ws_score
                row['website_fit_rationale'] = ws_rationale
                row['erp_fit_score'] = erp_score
                row['erp_fit_rationale'] = erp_rationale
                
                # Corridor/EBIS
                row['corridor_ebis_likelihood'] = corridor_ebis_enriched(e, row.get('corridor_ebis_likelihood', 'unknown'))
                
                # Cross-sell score
                row['cross_sell_score'] = round((float(ws_score) + float(erp_score)) / 2, 1)
                
                # Update timestamp
                row['last_updated'] = TODAY
                
                updated += 1
            
            rows.append(row)

    # Write updated master
    with open(MASTER, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nMerged enrichment: {updated} records updated out of {len(rows)} total")

    # Rebuild tiered lists
    rebuild_tiered(rows, fieldnames)


def rebuild_tiered(rows, fieldnames):
    """Rebuild all tiered output lists."""
    ws_sorted = sorted(rows, key=lambda r: float(r.get('website_fit_score', 0)), reverse=True)
    write_csv(os.path.join(DIR, 'website-targets-tiered.csv'), ws_sorted, fieldnames)

    erp_sorted = sorted(rows, key=lambda r: float(r.get('erp_fit_score', 0)), reverse=True)
    write_csv(os.path.join(DIR, 'erp-targets-tiered.csv'), erp_sorted, fieldnames)

    no_web = [r for r in rows if r.get('has_website') == 'no']
    no_web_sorted = sorted(no_web, key=lambda r: float(r.get('website_fit_score', 0)), reverse=True)
    write_csv(os.path.join(DIR, 'no-website-priority.csv'), no_web_sorted, fieldnames)

    print(f"Rebuilt tiered lists: {len(rows)} total, {len(no_web)} no-website, {len(rows)-len(no_web)} with-website")


def write_csv(path, rows, fieldnames):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == '__main__':
    main()
