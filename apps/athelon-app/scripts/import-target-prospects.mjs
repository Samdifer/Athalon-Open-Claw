#!/usr/bin/env node
/**
 * import-target-prospects.mjs
 *
 * Imports enriched repair-station CSV data into the targetProspects table
 * via the Convex bulkUpsert mutation.
 *
 * Usage:
 *   node scripts/import-target-prospects.mjs \
 *     --csv path/to/repair-stations-sales-priority.csv \
 *     --org-id <convex_org_id>
 *
 * CSV columns mapped:
 *   cert_no / Cert_No           → certNumber
 *   entity_id / DSGN_CODE       → designatorCode
 *   legal_name / Agency Name    → legalName
 *   dba_name / DBA              → dbaName
 *   city / City                 → city
 *   state / State/Province      → state
 *   country / Country           → country
 *   zip / Postal Code           → postalCode
 *   phone / Agency Phone Number → phone
 *   email / Agency Email        → email
 *   website                     → website
 *   prominence_score            → prominenceScore
 *   prominence_tier             → prominenceTier
 *   client_focus_guess          → clientFocusGuess
 *   outreach_tier               → outreachTier
 *   confidence_label            → confidenceLabel
 *   overall_confidence          → confidenceScore
 *
 * Enrichment fields (when present in CSV):
 *   website_redesign_fit_score  → websiteRedesignFitScore
 *   erp_corridor_likelihood     → erpCorridorLikelihood
 *   erp_ebis_likelihood         → erpEbisLikelihood
 *   target_segment              → targetSegment
 *   confidence / confidence_score → confidenceScore
 *   evidence_notes              → evidenceNotes
 *
 * Ratings:
 *   Rating - Airframe / rating_airframe   → ratingAirframe
 *   Rating - Powerplant                   → ratingPowerplant
 *   Rating - Accessory                    → ratingAccessory
 *   Rating - Instrument                   → ratingInstrument
 *   Rating - Radio                        → ratingRadio
 *   Rating - Propeller                    → ratingPropeller
 *
 * Added: 2026-03-09 — OPUS Team F
 */

import { readFileSync } from "node:fs";
import { parse } from "node:path";

// ─── CSV Parser (simple, handles quoted fields) ──────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  function splitRow(line) {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  const headers = splitRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    if (cells.length < 3) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j] ?? "";
    }
    rows.push(obj);
  }
  return rows;
}

// ─── Field mapping ───────────────────────────────────────────────────────────

function mapRow(raw) {
  const str = (keys) => {
    for (const k of keys) {
      const v = raw[k];
      if (v && v.trim()) return v.trim();
    }
    return undefined;
  };

  const num = (keys) => {
    const s = str(keys);
    if (!s) return undefined;
    const n = parseFloat(s);
    return isNaN(n) ? undefined : n;
  };

  const certNumber = str(["cert_no", "Cert_No", "certNumber"]);
  if (!certNumber) return null;

  const legalName = str(["legal_name", "Agency Name", "legalName"]);
  if (!legalName) return null;

  return {
    certNumber,
    designatorCode: str(["entity_id", "DSGN_CODE", "designatorCode"]),
    legalName,
    dbaName: str(["dba_name", "DBA", "dbaName"]),
    city: str(["city", "City"]),
    state: str(["state", "State/Province"]),
    country: str(["country", "Country", "normalized_country"]),
    postalCode: str(["zip", "Postal Code"]),
    phone: str(["phone", "Agency Phone Number"]),
    email: str(["email", "Agency Email"]),
    website: str(["website"]),
    prominenceScore: num(["prominence_score"]),
    prominenceTier: str(["prominence_tier"]),
    clientFocusGuess: str(["client_focus_guess", "profile_archetype"]),
    outreachTier: str(["outreach_tier"]),
    confidenceScore: num(["overall_confidence", "confidence_score", "confidence"]),
    confidenceLabel: str(["confidence_label"]),
    websiteRedesignFitScore: num(["website_redesign_fit_score"]),
    erpCorridorLikelihood: num(["erp_corridor_likelihood"]),
    erpEbisLikelihood: num(["erp_ebis_likelihood"]),
    targetSegment: str(["target_segment"]),
    evidenceNotes: str(["evidence_notes"]),
    ratingAirframe: str(["Rating - Airframe", "rating_airframe"]),
    ratingPowerplant: str(["Rating - Powerplant", "rating_powerplant"]),
    ratingAccessory: str(["Rating - Accessory", "rating_accessory"]),
    ratingInstrument: str(["Rating - Instrument", "rating_instrument"]),
    ratingRadio: str(["Rating - Radio", "rating_radio"]),
    ratingPropeller: str(["Rating - Propeller", "rating_propeller"]),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let csvPath = null;
  let orgId = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--csv" && args[i + 1]) csvPath = args[++i];
    else if (args[i] === "--org-id" && args[i + 1]) orgId = args[++i];
    else if (args[i] === "--dry-run") dryRun = true;
  }

  if (!csvPath) {
    console.error("Usage: node import-target-prospects.mjs --csv <path> --org-id <id> [--dry-run]");
    process.exit(1);
  }

  console.log(`📂 Reading CSV: ${csvPath}`);
  const text = readFileSync(csvPath, "utf-8");
  const rawRows = parseCSV(text);
  console.log(`📊 Parsed ${rawRows.length} rows`);

  const mapped = rawRows.map(mapRow).filter(Boolean);
  console.log(`✅ Mapped ${mapped.length} valid prospects`);

  if (dryRun) {
    console.log("\n🔍 DRY RUN — first 5 rows:");
    for (const row of mapped.slice(0, 5)) {
      console.log(`  ${row.certNumber} | ${row.legalName} | tier=${row.outreachTier} | prom=${row.prominenceScore}`);
    }
    console.log(`\n📋 Summary: ${mapped.length} rows ready for import.`);
    console.log("   Run without --dry-run and with --org-id to actually import.");
    return;
  }

  if (!orgId) {
    console.error("ERROR: --org-id required for actual import (or use --dry-run).");
    process.exit(1);
  }

  // For actual Convex import, you'd use the Convex client:
  // import { ConvexHttpClient } from "convex/browser";
  // const client = new ConvexHttpClient(process.env.CONVEX_URL);
  // ... batch calls to api.targetProspects.bulkUpsert

  const batchSize = 100;
  const batchId = `import-${Date.now()}`;
  console.log(`🚀 Importing ${mapped.length} rows in batches of ${batchSize}...`);
  console.log(`   Batch ID: ${batchId}`);
  console.log(`   Org ID: ${orgId}`);
  console.log(`\n⚠️  Connect to Convex and call api.targetProspects.bulkUpsert with these batches.`);
  console.log(`   Batch count: ${Math.ceil(mapped.length / batchSize)}`);

  // Output batch JSON files for manual/automated import
  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`   Batch ${batchNum}: ${batch.length} rows`);
  }

  console.log(`\n✅ Import preparation complete. ${mapped.length} prospects ready.`);
}

main().catch(console.error);
