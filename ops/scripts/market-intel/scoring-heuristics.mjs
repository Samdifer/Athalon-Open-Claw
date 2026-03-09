/**
 * scoring-heuristics.mjs
 * Athelon Market Intel — Scoring Functions
 *
 * Computes fit scores and likelihood heuristics for Part 145 MRO repair stations
 * as sales targets for two Athelon products:
 *   A) Website redesign ($5k–$25k)
 *   B) Athelon ERP (replacing Corridor Aviation or EBIS/Veryon)
 *
 * See README.md for full methodology documentation.
 *
 * @module scoring-heuristics
 */

/**
 * @typedef {Object} MRORecord
 * @property {boolean} has_website          - Whether the shop has a known website
 * @property {number}  observability_score  - 0–100; how visible/findable the shop is online
 * @property {string}  shop_size_class      - "small" | "medium" | "large"
 * @property {string}  profile_archetype    - "commercial" | "general_aviation" | "mixed" | "unknown"
 * @property {boolean} has_phone            - Whether a phone number was found
 * @property {boolean} has_email            - Whether an email address was found
 * @property {string}  airport_distance_band - "on_airport" | "near_airport" | "off_airport" | "unknown"
 * @property {string[]} aircraft_worked_on  - e.g. ["piston", "turbine", "jet", "helicopter"]
 * @property {number}  overall_confidence   - 0.0–1.0; data quality confidence
 */

/**
 * @typedef {Object} ScoreResult
 * @property {number}   score     - Numeric score 0–100
 * @property {string[]} rationale - Human-readable list of factors that contributed to the score
 */

/**
 * @typedef {"likely"|"possible"|"unlikely"|"unknown"} CorridorEbisLikelihood
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely reads a boolean field from a record, defaulting to false if absent.
 * @param {MRORecord} record
 * @param {string} field
 * @returns {boolean}
 */
function boolField(record, field) {
  return record[field] === true;
}

/**
 * Safely reads a numeric field, defaulting to 0 if absent or non-numeric.
 * @param {MRORecord} record
 * @param {string} field
 * @returns {number}
 */
function numField(record, field) {
  const val = record[field];
  return typeof val === 'number' && isFinite(val) ? val : 0;
}

/**
 * Safely reads a string field, defaulting to empty string if absent.
 * @param {MRORecord} record
 * @param {string} field
 * @returns {string}
 */
function strField(record, field) {
  return typeof record[field] === 'string' ? record[field].toLowerCase().trim() : '';
}

/**
 * Checks whether an array field contains any of the given values (case-insensitive).
 * @param {MRORecord} record
 * @param {string} field
 * @param {string[]} values
 * @returns {boolean}
 */
function arrayContainsAny(record, field, values) {
  const arr = Array.isArray(record[field]) ? record[field] : [];
  const normalized = arr.map(v => (typeof v === 'string' ? v.toLowerCase().trim() : ''));
  return values.some(v => normalized.includes(v.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Website Fit Score
// ---------------------------------------------------------------------------

/**
 * Computes how likely a Part 145 shop is to need and purchase a website redesign.
 *
 * Scoring logic:
 * - +50 if no website at all (strongest signal)
 * - +20 if observability_score ≤ 30 (poor web presence even with a site)
 * - +10 if observability_score 31–60 (mediocre presence — upgrade opportunity)
 * - +10 if has_phone (reachable for outreach)
 * - +10 if has_email (reachable for outreach)
 * - +5/+10/+15 for small/medium/large shop size (budget proxy)
 * - +10 if commercial archetype, +5 if mixed (brand pressure)
 *
 * @param {MRORecord} record - Enriched MRO shop record
 * @returns {ScoreResult} Score 0–100 and rationale array
 */
export function computeWebsiteFitScore(record) {
  let score = 0;
  const rationale = [];

  const hasWebsite = boolField(record, 'has_website');
  const observability = numField(record, 'observability_score');
  const sizeClass = strField(record, 'shop_size_class');
  const archetype = strField(record, 'profile_archetype');
  const hasPhone = boolField(record, 'has_phone');
  const hasEmail = boolField(record, 'has_email');

  // --- Website presence ---
  if (!hasWebsite) {
    score += 50;
    rationale.push('+50: No website detected — direct need for web presence');
  } else {
    if (observability <= 30) {
      score += 20;
      rationale.push(`+20: Website exists but observability is very low (${observability}) — strong redesign opportunity`);
    } else if (observability <= 60) {
      score += 10;
      rationale.push(`+10: Website exists with mediocre observability (${observability}) — upgrade opportunity`);
    } else {
      rationale.push(`+0: Website exists with good observability (${observability}) — low redesign need`);
    }
  }

  // --- Contact reachability ---
  if (hasPhone) {
    score += 10;
    rationale.push('+10: Phone number available — reachable for outreach');
  }
  if (hasEmail) {
    score += 10;
    rationale.push('+10: Email address available — reachable for outreach');
  }

  // --- Shop size (budget proxy) ---
  if (sizeClass === 'large') {
    score += 15;
    rationale.push('+15: Large shop — higher budget, brand visibility pressure');
  } else if (sizeClass === 'medium') {
    score += 10;
    rationale.push('+10: Medium shop — reasonable budget, growth-oriented');
  } else if (sizeClass === 'small') {
    score += 5;
    rationale.push('+5: Small shop — limited budget but some interest possible');
  }

  // --- Profile archetype (brand motivation) ---
  if (archetype === 'commercial') {
    score += 10;
    rationale.push('+10: Commercial archetype — cares about online presence for customer acquisition');
  } else if (archetype === 'mixed') {
    score += 5;
    rationale.push('+5: Mixed archetype — partial commercial exposure motivates web presence');
  }

  const finalScore = Math.min(score, 100);
  return { score: finalScore, rationale };
}

// ---------------------------------------------------------------------------
// ERP Fit Score
// ---------------------------------------------------------------------------

/**
 * Computes how likely a Part 145 shop would benefit from and purchase Athelon ERP.
 *
 * Scoring logic:
 * - +10/+25/+35 for small/medium/large shop size (complexity and budget)
 * - +5/+10/+20 for general_aviation/mixed/commercial archetype (compliance needs)
 * - +5/+10 for medium/high observability (organized operation signal)
 * - +5 if has_email (professional operation indicator)
 * - +5 if on-airport (integrated ops, higher workflow complexity)
 * - +10 if turbine/jet/multi-engine aircraft worked on (compliance burden)
 * - +5 if piston-only (lower complexity but still relevant)
 *
 * @param {MRORecord} record - Enriched MRO shop record
 * @returns {ScoreResult} Score 0–100 and rationale array
 */
export function computeErpFitScore(record) {
  let score = 0;
  const rationale = [];

  const sizeClass = strField(record, 'shop_size_class');
  const archetype = strField(record, 'profile_archetype');
  const observability = numField(record, 'observability_score');
  const hasEmail = boolField(record, 'has_email');
  const distanceBand = strField(record, 'airport_distance_band');

  // --- Shop size (complexity and budget proxy) ---
  if (sizeClass === 'large') {
    score += 35;
    rationale.push('+35: Large shop — core ERP market; has workflow complexity and procurement budget');
  } else if (sizeClass === 'medium') {
    score += 25;
    rationale.push('+25: Medium shop — strong ERP candidate; likely outgrowing spreadsheets');
  } else if (sizeClass === 'small') {
    score += 10;
    rationale.push('+10: Small shop — possible but limited complexity; lower priority');
  }

  // --- Profile archetype (compliance/workflow needs) ---
  if (archetype === 'commercial') {
    score += 20;
    rationale.push('+20: Commercial archetype — high compliance and workflow needs; strong ERP fit');
  } else if (archetype === 'mixed') {
    score += 10;
    rationale.push('+10: Mixed archetype — partial commercial exposure; some ERP need');
  } else if (archetype === 'general_aviation') {
    score += 5;
    rationale.push('+5: General aviation archetype — lower compliance burden but ERP still relevant');
  }

  // --- Observability (organizational maturity proxy) ---
  if (observability > 60) {
    score += 10;
    rationale.push(`+10: High observability (${observability}) — suggests organized, systems-oriented operation`);
  } else if (observability > 30) {
    score += 5;
    rationale.push(`+5: Medium observability (${observability}) — some organizational maturity`);
  }

  // --- Contact / professional operation signal ---
  if (hasEmail) {
    score += 5;
    rationale.push('+5: Email available — more likely a professional, software-receptive operation');
  }

  // --- Airport proximity (operational integration) ---
  if (distanceBand === 'on_airport') {
    score += 5;
    rationale.push('+5: On-airport location — integrated operations; higher workflow complexity');
  }

  // --- Aircraft types (compliance burden proxy) ---
  const hasTurbineOrJet = arrayContainsAny(record, 'aircraft_worked_on', ['turbine', 'jet', 'turbojet', 'turbofan', 'turboprop']);
  const hasMultiEngine = arrayContainsAny(record, 'aircraft_worked_on', ['multi', 'multi-engine', 'multiengine']);
  const hasPiston = arrayContainsAny(record, 'aircraft_worked_on', ['piston', 'reciprocating']);

  if (hasTurbineOrJet || hasMultiEngine) {
    score += 10;
    rationale.push('+10: Works on turbine/jet/multi-engine aircraft — high compliance and documentation burden');
  } else if (hasPiston) {
    score += 5;
    rationale.push('+5: Works on piston aircraft — moderate complexity; ERP relevant');
  }

  const finalScore = Math.min(score, 100);
  return { score: finalScore, rationale };
}

// ---------------------------------------------------------------------------
// Corridor / EBIS Likelihood
// ---------------------------------------------------------------------------

/**
 * Estimates whether a shop currently uses Corridor Aviation Software or EBIS/Veryon
 * (primary ERP competitors to Athelon) based on proxy signals.
 *
 * This is a HEURISTIC ONLY — Wave 1 has no direct software evidence.
 * Use this to prioritize displacement outreach, not to assert confirmed usage.
 *
 * Logic:
 * - "likely"   → large commercial/mixed shop (dominant Corridor/EBIS market segment)
 * - "possible" → medium commercial/mixed shop, or medium GA shop
 * - "unknown"  → overall_confidence < 0.3 (insufficient data)
 * - "unlikely" → small shop or GA-only with low complexity
 *
 * @param {MRORecord} record - Enriched MRO shop record
 * @returns {CorridorEbisLikelihood}
 */
export function computeCorridorEbisLikelihood(record) {
  const sizeClass = strField(record, 'shop_size_class');
  const archetype = strField(record, 'profile_archetype');
  const confidence = numField(record, 'overall_confidence');

  // Insufficient data — don't guess
  if (confidence < 0.3) {
    return 'unknown';
  }

  // Large commercial/mixed shops: Corridor and EBIS/Veryon dominate this segment
  if (sizeClass === 'large' && (archetype === 'commercial' || archetype === 'mixed')) {
    return 'likely';
  }

  // Medium commercial/mixed shops: may have adopted formal ERP
  if (sizeClass === 'medium' && (archetype === 'commercial' || archetype === 'mixed')) {
    return 'possible';
  }

  // Medium GA shops: some chance, especially if size suggests complexity
  if (sizeClass === 'medium' && archetype === 'general_aviation') {
    return 'possible';
  }

  // Everything else: small shops and pure GA are unlikely to run enterprise MRO ERP
  return 'unlikely';
}

// ---------------------------------------------------------------------------
// Cross-Sell Score
// ---------------------------------------------------------------------------

/**
 * Computes a combined opportunity score representing total Athelon revenue potential
 * from a single shop across both products.
 *
 * ERP is weighted higher (60%) than website (40%) because it represents larger
 * and recurring revenue vs. a one-time website project.
 *
 * Formula:
 *   crossSellScore = (websiteFitScore × 0.4) + (erpFitScore × 0.6)
 *
 * Interpretation:
 *   70–100: Priority target — pitch both products
 *   50–69:  Strong target — lead with strongest fit score
 *   30–49:  Nurture track
 *   0–29:   Low priority
 *
 * @param {number} websiteScore - Result of computeWebsiteFitScore (0–100)
 * @param {number} erpScore     - Result of computeErpFitScore (0–100)
 * @returns {number} Cross-sell score rounded to one decimal place (0–100)
 */
export function computeCrossSellScore(websiteScore, erpScore) {
  const raw = websiteScore * 0.4 + erpScore * 0.6;
  return Math.round(raw * 10) / 10;
}

// ---------------------------------------------------------------------------
// Convenience: score all fields at once
// ---------------------------------------------------------------------------

/**
 * Runs all scoring functions against a single record and returns a consolidated result.
 *
 * @param {MRORecord} record - Enriched MRO shop record
 * @returns {{
 *   websiteFit: ScoreResult,
 *   erpFit: ScoreResult,
 *   corridorEbisLikelihood: CorridorEbisLikelihood,
 *   crossSellScore: number
 * }}
 */
export function scoreRecord(record) {
  const websiteFit = computeWebsiteFitScore(record);
  const erpFit = computeErpFitScore(record);
  const corridorEbisLikelihood = computeCorridorEbisLikelihood(record);
  const crossSellScore = computeCrossSellScore(websiteFit.score, erpFit.score);

  return {
    websiteFit,
    erpFit,
    corridorEbisLikelihood,
    crossSellScore,
  };
}
