// FAA NFDC Airport/Landing Facility Record
// Source: knowledge/research/airport data/all-airport-data.xlsx
// Data currency: FAA NFDC cycle effective 2026-02-19
// Refresh: run `pnpm data:parse-airports` after updating the source XLSX

export type FaaAirportRecord = {
  /** FAA Location Identifier (3-4 char, e.g. "ORD", "DEN"). Every facility has one. */
  faaLocId: string;
  /** ICAO Identifier (4 char, e.g. "KORD", "KDEN"). Only ~2,705 of 19,606 facilities have one. */
  icaoId: string | null;
  /** Official facility name */
  facilityName: string;
  /** Facility type classification */
  facilityType: "AIRPORT" | "HELIPORT" | "SEAPLANE BASE" | "BALLOONPORT" | "GLIDERPORT" | "ULTRALIGHT" | string;
  /** US state or territory abbreviation */
  state: string;
  /** City associated with the facility */
  city: string;
  /** County */
  county: string | null;
  /** Airport Reference Point latitude in decimal degrees */
  latDecimal: number;
  /** Airport Reference Point longitude in decimal degrees */
  lonDecimal: number;
  /** Ownership type: PU=Public, PR=Private, MA=Air Force, MR=Army, MN=Navy, CG=Coast Guard */
  ownership: string;
  /** On-airport airframe repair capability */
  airframeRepair: "NONE" | "MINOR" | "MAJOR" | null;
  /** On-airport powerplant repair capability */
  powerPlantRepair: "NONE" | "MINOR" | "MAJOR" | null;
  /** Available fuel types (e.g. "100LL,JET-A") */
  fuelTypes: string | null;
  /** CFR Part 139 certification type (e.g. "I", "II", "IV") */
  part139Cert: string | null;
  /** NPIAS hub classification (Large, Medium, Small, Nonhub) */
  npiasHubClass: string | null;
  /** Total based aircraft count */
  basedAircraftTotal: number | null;
  /** Total annual operations count */
  annualOpsTotal: number | null;
};
