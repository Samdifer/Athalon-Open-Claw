// Auto-generated lazy-loader for national Part 145 prospect data.
// Follows the same pattern as faaAirportIndex.ts.

import type { NationalProspectRecord } from "./nationalPart145";

let _records: NationalProspectRecord[] | null = null;
let _byCertNo: Map<string, NationalProspectRecord> | null = null;
let _byState: Map<string, NationalProspectRecord[]> | null = null;

async function ensureLoaded() {
  if (_records) return;
  const { nationalPart145Records } = await import("./nationalPart145");
  _records = nationalPart145Records;

  _byCertNo = new Map();
  _byState = new Map();

  for (const record of _records) {
    _byCertNo.set(record.certNo, record);
    const bucket = _byState.get(record.state) ?? [];
    bucket.push(record);
    _byState.set(record.state, bucket);
  }
}

/** Lazy-load national Part 145 data and return all records */
export async function getAllNationalRecords(): Promise<NationalProspectRecord[]> {
  await ensureLoaded();
  return _records!;
}

/** Lookup by FAA Certificate Number. Returns undefined if not found. */
export async function getNationalRecordByCertNo(
  certNo: string,
): Promise<NationalProspectRecord | undefined> {
  await ensureLoaded();
  return _byCertNo!.get(certNo.toUpperCase());
}

/** Get all records for a given state (2-letter code). Returns empty array if none. */
export async function getNationalRecordsByState(
  state: string,
): Promise<NationalProspectRecord[]> {
  await ensureLoaded();
  return _byState!.get(state.toUpperCase()) ?? [];
}

/** Get list of all states that have Part 145 records, sorted alphabetically. */
export async function getNationalStates(): Promise<string[]> {
  await ensureLoaded();
  return Array.from(_byState!.keys()).sort();
}
