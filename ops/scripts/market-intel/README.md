# Market Intel Scoring Methodology

**System:** Athelon Customer Target Intelligence  
**Version:** 1.0 (Wave 1)  
**Last Updated:** 2026-03-09  

---

## Overview

This document defines the scoring methodology used to prioritize FAA Part 145 repair stations as sales targets for two Athelon products:

- **Product A — Website Redesign** ($5k–$25k): Target shops with no or poor web presence
- **Product B — Athelon ERP**: Target shops likely using legacy software (Corridor Aviation or EBIS/Veryon) or running on spreadsheets/paper

Four computed scores drive outreach prioritization:

| Score | Range | Purpose |
|---|---|---|
| Website Fit Score | 0–100 | Likelihood a shop needs/would buy a website redesign |
| ERP Fit Score | 0–100 | Likelihood a shop would buy Athelon ERP |
| Corridor/EBIS Likelihood | categorical | Heuristic for current competitor software use |
| Cross-Sell Score | 0–100 | Combined opportunity metric |

---

## 1. Website Fit Score (0–100)

**Definition:** How likely a shop is to need and purchase a website redesign from Athelon.

### Rationale

A shop with no website is an obvious target. Beyond that, the quality of web presence (observability score), business size, and whether they are reachable by other channels (phone/email) all modulate fit. A shop that has zero digital footprint may not be ready to buy — but a shop with a bad website and real phone/email contact is often highly receptive.

### Component Weights

| Component | Max Points | Rationale |
|---|---|---|
| No website at all | +50 | Strongest signal — direct need |
| Low observability score (≤30) | +20 | Poor web presence even if a site exists |
| Medium observability (31–60) | +10 | Opportunity to upgrade |
| High observability (>60) | 0 | Already well-represented online |
| Has phone contact | +10 | Reachable for outreach |
| Has email contact | +10 | Reachable for outreach |
| Shop size: medium | +10 | Has budget; not too small to care |
| Shop size: large | +15 | Higher budget, more brand pressure |
| Shop size: small | +5 | Some interest but limited budget |
| Profile archetype: commercial | +10 | Commercial shops care more about online presence |
| Profile archetype: mixed | +5 | Partial commercial exposure |

### Formula (pseudocode)

```
score = 0

if has_website == false:
    score += 50
else:
    if observability_score <= 30: score += 20
    elif observability_score <= 60: score += 10

if has_phone: score += 10
if has_email: score += 10

if shop_size_class == "large":  score += 15
elif shop_size_class == "medium": score += 10
elif shop_size_class == "small":  score += 5

if profile_archetype == "commercial": score += 10
elif profile_archetype == "mixed":    score += 5

score = min(score, 100)
```

### Score Interpretation

| Range | Label | Action |
|---|---|---|
| 70–100 | High Priority | Include in website outreach list |
| 40–69 | Medium | Include with lower priority |
| 0–39 | Low | Deprioritize for website offer |

---

## 2. ERP Fit Score (0–100)

**Definition:** How likely a shop would benefit from and purchase Athelon ERP.

### Rationale

ERP fit is primarily driven by shop size (larger shops have more complexity and budget), profile archetype (commercial shops have compliance/workflow needs that drive ERP value), and data observability (shops with high visibility signal a more organized operation that is already thinking about systems). Airport distance band is a proxy for operational footprint — remote shops often have higher self-reliance and may resist software. Aircraft worked on is a proxy for complexity and compliance needs.

### Component Weights

| Component | Max Points | Rationale |
|---|---|---|
| Shop size: large | +35 | Core ERP market; has complexity and budget |
| Shop size: medium | +25 | Strong candidate |
| Shop size: small | +10 | Possible but limited complexity |
| Profile archetype: commercial | +20 | High compliance/workflow needs |
| Profile archetype: mixed | +10 | Some commercial exposure |
| Profile archetype: general_aviation | +5 | Lower complexity but still relevant |
| High observability (>60) | +10 | More organized operation |
| Medium observability (31–60) | +5 | Partial organization |
| Has email | +5 | More likely professional operation |
| Airport distance: on-airport | +5 | Integrated ops, more workflow complexity |
| Aircraft: turbine/jet/multi | +10 | Higher complexity and compliance burden |
| Aircraft: piston only | +5 | Lower complexity |

### Formula (pseudocode)

```
score = 0

if shop_size_class == "large":   score += 35
elif shop_size_class == "medium": score += 25
elif shop_size_class == "small":  score += 10

if profile_archetype == "commercial":      score += 20
elif profile_archetype == "mixed":         score += 10
elif profile_archetype == "general_aviation": score += 5

if observability_score > 60:   score += 10
elif observability_score > 30: score += 5

if has_email: score += 5

if airport_distance_band == "on_airport": score += 5

if aircraft_worked_on includes turbine/jet/multi-engine: score += 10
elif aircraft_worked_on includes piston: score += 5

score = min(score, 100)
```

### Score Interpretation

| Range | Label | Action |
|---|---|---|
| 60–100 | High Priority | Include in ERP outreach list |
| 35–59 | Medium | Nurture; qualify via call |
| 0–34 | Low | Deprioritize for ERP offer |

---

## 3. Corridor/EBIS Likelihood

**Definition:** Heuristic estimate of whether a shop currently uses Corridor Aviation Software or EBIS/Veryon (primary ERP competitors to Athelon).

**Returns:** `"likely"` | `"possible"` | `"unlikely"` | `"unknown"`

### Rationale

We have no direct evidence of software usage for Wave 1. This heuristic uses proxy signals:

- **Large commercial shops** with high observability are more likely to have adopted a formal ERP already — and Corridor and EBIS/Veryon dominate this segment
- **Medium shops** with commercial or mixed profiles are in the "possible" zone — they may have outgrown spreadsheets but not yet committed to a platform
- **Small or general aviation** shops are unlikely to be running enterprise MRO software

### Logic

```
if shop_size_class == "large" AND profile_archetype IN ["commercial", "mixed"]:
    return "likely"

elif shop_size_class == "medium" AND profile_archetype IN ["commercial", "mixed"]:
    return "possible"

elif shop_size_class == "medium" AND profile_archetype == "general_aviation":
    return "possible"

elif overall_confidence < 0.3:
    return "unknown"

else:
    return "unlikely"
```

### Usage Note

This is a **heuristic only** — not confirmed data. Wave 2 should add direct evidence gathering (e.g., scraping job listings for "Corridor" or "EBIS/Veryon" mentions, checking vendor case studies).

---

## 4. Cross-Sell Score (0–100)

**Definition:** Combined opportunity metric representing total Athelon revenue potential from a single shop.

### Formula

```
crossSellScore = (websiteFitScore * 0.4) + (erpFitScore * 0.6)
```

ERP is weighted higher (0.6) because it represents a larger, more recurring revenue opportunity ($25k+ ARR vs. $5k–$25k one-time for website).

### Interpretation

| Range | Action |
|---|---|
| 70–100 | Priority target — pitch both products |
| 50–69 | Strong target — lead with strongest fit |
| 30–49 | Nurture track |
| 0–29 | Low priority |

---

## 5. Outreach Tier Logic

Tiers reflect **data quality**, not score alone. A Tier A shop with low scores gets less outreach priority, but a Tier B shop with high scores warrants investment to verify and upgrade.

| Tier | Definition | Outreach Strategy |
|---|---|---|
| A | Full contact info + web verification complete | Direct outreach — call + email |
| B | Partial contact — phone or email known, not both; or website unverified | Attempt contact; fill gaps before outreach |
| C | No contact channels found | Research pass required before any outreach |

### Tier Assignment Logic (from source data)

Tier is assigned during enrichment, not scoring. Scoring layers on top:

```
effective_priority = tier_weight(tier) * cross_sell_score

tier_weights:
  A → 1.0
  B → 0.7
  C → 0.3
```

This produces an **Effective Priority Score** for ranking within each outreach list.

---

## Field Reference

| Field | Type | Values |
|---|---|---|
| `has_website` | boolean | true / false |
| `observability_score` | number | 0–100 |
| `shop_size_class` | string | "small" / "medium" / "large" |
| `profile_archetype` | string | "commercial" / "general_aviation" / "mixed" / "unknown" |
| `has_phone` | boolean | true / false |
| `has_email` | boolean | true / false |
| `airport_distance_band` | string | "on_airport" / "near_airport" / "off_airport" / "unknown" |
| `aircraft_worked_on` | string[] | e.g. ["piston", "turbine", "jet"] |
| `overall_confidence` | number | 0.0–1.0 |

---

## Scripts

- `scoring-heuristics.mjs` — Node.js module exporting all scoring functions
- Future: `score-all-records.mjs` — batch runner that reads the enriched JSONL and outputs scored records

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-03-09 | Initial methodology — Wave 1 bootstrap |
