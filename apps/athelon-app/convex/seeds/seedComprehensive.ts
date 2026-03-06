// convex/seeds/seedComprehensive.ts
//
// Comprehensive seed: 3-month operating history + 1 month forward.
// Creates ~920 records simulating Colorado Aviation Maintenance Group mid-operations.
//
// Usage:
//   npx convex run seeds/seedComprehensive:seedComprehensive --args '{"clerkUserId":"user_xxx"}'
//
// Verification:
//   npx convex run seeds/seedComprehensive:verifySeedComprehensive

import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

// ─── Time constants ──────────────────────────────────────────────────────────
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

// ─── Seed data arrays ────────────────────────────────────────────────────────

const LOCATION_SEED = [
  {
    code: "APA",
    name: "Centennial Main Hangar",
    city: "Centennial",
    state: "CO",
    address: "7565 S Peoria St",
    zip: "80112",
    certificateNumber: "CAMG-APA-145",
    isPrimary: true,
  },
  {
    code: "FNL",
    name: "Northern Colorado Line Station",
    city: "Fort Collins",
    state: "CO",
    address: "4900 Earhart Rd",
    zip: "80524",
    certificateNumber: "CAMG-FNL-145",
    isPrimary: false,
  },
] as const;

const TECHNICIAN_SEED = [
  { employeeId: "CAMG-001", legalName: "James Harwick", role: "admin" as const, locationCode: "APA", hasCert: true, hasIa: true },
  { employeeId: "CAMG-002", legalName: "Maria Santos", role: "shop_manager" as const, locationCode: "APA", hasCert: true, hasIa: false },
  { employeeId: "CAMG-003", legalName: "Robert Chen", role: "qcm_inspector" as const, locationCode: "APA", hasCert: true, hasIa: true },
  { employeeId: "CAMG-004", legalName: "Lisa Thornton", role: "billing_manager" as const, locationCode: "APA", hasCert: false, hasIa: false },
  { employeeId: "CAMG-005", legalName: "David Kowalski", role: "lead_technician" as const, locationCode: "APA", hasCert: true, hasIa: true, iaExpiringSoon: true },
  { employeeId: "CAMG-006", legalName: "Sarah Nakamura", role: "lead_technician" as const, locationCode: "FNL", hasCert: true, hasIa: false },
  { employeeId: "CAMG-007", legalName: "Mike Patterson", role: "technician" as const, locationCode: "APA", hasCert: true, hasIa: false },
  { employeeId: "CAMG-008", legalName: "Priya Desai", role: "technician" as const, locationCode: "APA", hasCert: true, hasIa: false },
  { employeeId: "CAMG-009", legalName: "Carlos Mendez", role: "technician" as const, locationCode: "FNL", hasCert: true, hasIa: false },
  { employeeId: "CAMG-010", legalName: "Amanda Wells", role: "parts_clerk" as const, locationCode: "APA", hasCert: false, hasIa: false },
] as const;

const CUSTOMER_SEED = [
  { name: "Peak Aviation Partners", companyName: "Peak Aviation Partners LLC", type: "charter_operator" as const, phone: "303-555-0101", email: "ops@peakaviation.com" },
  { name: "Front Range Flight Training", companyName: "Front Range Flight Training Inc", type: "flight_school" as const, phone: "303-555-0102", email: "dispatch@frft.com" },
  { name: "Mountain West Medevac", companyName: "Mountain West Medevac Services", type: "company" as const, phone: "720-555-0201", email: "maintenance@mwmedevac.com" },
  { name: "Aspen Executive Air", companyName: "Aspen Executive Air LLC", type: "company" as const, phone: "970-555-0301", email: "fleet@aspenexecair.com" },
  { name: "Dr. Thomas Blackwell", companyName: undefined, type: "individual" as const, phone: "303-555-0401", email: "tblackwell@gmail.com" },
  { name: "Colorado Dept of Wildlife", companyName: "State of Colorado - Dept of Wildlife", type: "government" as const, phone: "303-555-0501", email: "aviation@state.co.us" },
  { name: "Summit Agricultural Services", companyName: "Summit Ag Services LLC", type: "company" as const, phone: "970-555-0601", email: "ops@summitagservices.com" },
] as const;

type AircraftSeed = {
  tail: string;
  make: string;
  model: string;
  serial: string;
  engineCount: number;
  tt: number;
  status: "airworthy" | "in_maintenance";
  customerIndex: number;
  category: "normal" | "utility" | "restricted";
  experimental: boolean;
};

const AIRCRAFT_SEED: AircraftSeed[] = [
  { tail: "N341PA", make: "Beechcraft", model: "King Air B200", serial: "BB-2201", engineCount: 2, tt: 8420, status: "in_maintenance", customerIndex: 0, category: "normal", experimental: false },
  { tail: "N892PA", make: "Beechcraft", model: "King Air 250", serial: "BY-4402", engineCount: 2, tt: 5870, status: "airworthy", customerIndex: 0, category: "normal", experimental: false },
  { tail: "N172FR", make: "Cessna", model: "172S Skyhawk", serial: "172S-10241", engineCount: 1, tt: 6241, status: "in_maintenance", customerIndex: 1, category: "normal", experimental: false },
  { tail: "N182FR", make: "Cessna", model: "182T Skylane", serial: "182T-08832", engineCount: 1, tt: 4832, status: "airworthy", customerIndex: 1, category: "normal", experimental: false },
  { tail: "N930MW", make: "Daher", model: "TBM 930", serial: "1298", engineCount: 1, tt: 2345, status: "in_maintenance", customerIndex: 2, category: "normal", experimental: false },
  { tail: "N940MW", make: "Daher", model: "TBM 940", serial: "1376", engineCount: 1, tt: 1678, status: "airworthy", customerIndex: 2, category: "normal", experimental: false },
  { tail: "N350AE", make: "Beechcraft", model: "King Air 350i", serial: "FL-5603", engineCount: 2, tt: 7180, status: "airworthy", customerIndex: 3, category: "normal", experimental: false },
  { tail: "N206TB", make: "Cessna", model: "T206H Turbo Stationair", serial: "T206H-08345", engineCount: 1, tt: 1834, status: "airworthy", customerIndex: 4, category: "normal", experimental: false },
  { tail: "N208CD", make: "Cessna", model: "208B Grand Caravan", serial: "208B-5124", engineCount: 1, tt: 11420, status: "in_maintenance", customerIndex: 5, category: "normal", experimental: false },
  { tail: "N188SA", make: "Cessna", model: "188 AgWagon", serial: "188-0245", engineCount: 1, tt: 9245, status: "airworthy", customerIndex: 6, category: "restricted", experimental: false },
];

type EngineSeed = {
  make: string;
  model: string;
  serial: string;
  aircraftIndex: number;
  position: string;
  tth: number;
  tsnHrs: number;
  tsoHrs: number;
  tboLimit: number;
  cycles?: number;
};

const ENGINE_SEED: EngineSeed[] = [
  // N341PA - King Air B200 (2x PT6A-42)
  { make: "Pratt & Whitney Canada", model: "PT6A-42", serial: "PCE-JE0341", aircraftIndex: 0, position: "L", tth: 8420, tsnHrs: 8420, tsoHrs: 2120, tboLimit: 3600, cycles: 7800 },
  { make: "Pratt & Whitney Canada", model: "PT6A-42", serial: "PCE-JE0342", aircraftIndex: 0, position: "R", tth: 8420, tsnHrs: 8420, tsoHrs: 2120, tboLimit: 3600, cycles: 7800 },
  // N892PA - King Air 250 (2x PT6A-52)
  { make: "Pratt & Whitney Canada", model: "PT6A-52", serial: "PCE-RH0892", aircraftIndex: 1, position: "L", tth: 5870, tsnHrs: 5870, tsoHrs: 1870, tboLimit: 3600, cycles: 5200 },
  { make: "Pratt & Whitney Canada", model: "PT6A-52", serial: "PCE-RH0893", aircraftIndex: 1, position: "R", tth: 5870, tsnHrs: 5870, tsoHrs: 1870, tboLimit: 3600, cycles: 5200 },
  // N172FR - Cessna 172S (IO-360-L2A)
  { make: "Lycoming", model: "IO-360-L2A", serial: "L-54621-51A", aircraftIndex: 2, position: "1", tth: 6241, tsnHrs: 6241, tsoHrs: 241, tboLimit: 2000 },
  // N182FR - Cessna 182T (IO-540-AB1A5)
  { make: "Lycoming", model: "IO-540-AB1A5", serial: "L-19832-51A", aircraftIndex: 3, position: "1", tth: 4832, tsnHrs: 4832, tsoHrs: 832, tboLimit: 2000 },
  // N930MW - TBM 930 (PT6A-66D)
  { make: "Pratt & Whitney Canada", model: "PT6A-66D", serial: "PCE-MW0930", aircraftIndex: 4, position: "1", tth: 2345, tsnHrs: 2345, tsoHrs: 2345, tboLimit: 3600, cycles: 2100 },
  // N940MW - TBM 940 (PT6A-66D)
  { make: "Pratt & Whitney Canada", model: "PT6A-66D", serial: "PCE-MW0940", aircraftIndex: 5, position: "1", tth: 1678, tsnHrs: 1678, tsoHrs: 1678, tboLimit: 3600, cycles: 1520 },
  // N350AE - King Air 350i (2x PT6A-60A)
  { make: "Pratt & Whitney Canada", model: "PT6A-60A", serial: "PCE-AE0350L", aircraftIndex: 6, position: "L", tth: 7180, tsnHrs: 7180, tsoHrs: 1180, tboLimit: 3600, cycles: 6400 },
  { make: "Pratt & Whitney Canada", model: "PT6A-60A", serial: "PCE-AE0350R", aircraftIndex: 6, position: "R", tth: 7180, tsnHrs: 7180, tsoHrs: 1180, tboLimit: 3600, cycles: 6400 },
  // N206TB - T206H (IO-540-AC1A5)
  { make: "Continental", model: "IO-550-C", serial: "C-68521", aircraftIndex: 7, position: "1", tth: 1834, tsnHrs: 1834, tsoHrs: 1834, tboLimit: 1700 },
  // N208CD - Grand Caravan (PT6A-114A)
  { make: "Pratt & Whitney Canada", model: "PT6A-114A", serial: "PCE-CD0208", aircraftIndex: 8, position: "1", tth: 11420, tsnHrs: 11420, tsoHrs: 2420, tboLimit: 3600, cycles: 10200 },
  // N188SA - AgWagon (IO-520-D)
  { make: "Continental", model: "IO-520-D", serial: "C-45188", aircraftIndex: 9, position: "1", tth: 9245, tsnHrs: 9245, tsoHrs: 1245, tboLimit: 1700 },
];

type PropellerSeed = {
  aircraftIndex: number;
  position: "single" | "left" | "right";
  make: string;
  model: string;
  serial: string;
  tth: number;
};

const PROPELLER_SEED: PropellerSeed[] = [
  { aircraftIndex: 2, position: "single", make: "McCauley", model: "1C160-DTM7557", serial: "MC-172-001", tth: 6241 },
  { aircraftIndex: 3, position: "single", make: "McCauley", model: "2A36C23-JFM7660", serial: "MC-182-001", tth: 4832 },
  { aircraftIndex: 7, position: "single", make: "McCauley", model: "3AF32C88-JLB", serial: "MC-206-001", tth: 1834 },
  { aircraftIndex: 9, position: "single", make: "McCauley", model: "D2A34C58-0", serial: "MC-188-001", tth: 9245 },
];

const VENDOR_SEED = [
  { name: "Aviall Services", type: "parts_supplier" as const, certNumber: "AV-145-2024", contact: "Mike Reynolds", email: "orders@aviall.com", phone: "800-555-2845" },
  { name: "StandardAero", type: "contract_maintenance" as const, certNumber: "SA-145-2023", contact: "Lisa Chen", email: "quotes@standardaero.com", phone: "480-555-7200" },
  { name: "Collins Aerospace", type: "parts_supplier" as const, certNumber: "COL-145-2024", contact: "Dave Morton", email: "parts@collinsaerospace.com", phone: "319-555-4000" },
  { name: "AeroCal Calibration Labs", type: "calibration_lab" as const, certNumber: "ACAL-2024-001", contact: "Frank Torres", email: "service@aerocal.com", phone: "714-555-3300" },
  { name: "Hartzell Propeller", type: "parts_supplier" as const, certNumber: "HP-145-2024", contact: "Sarah Webb", email: "service@hartzellprop.com", phone: "937-555-4411" },
  { name: "Mountain Avionics", type: "service_provider" as const, certNumber: "MA-RS-2024", contact: "Tom Park", email: "shop@mountainavionics.com", phone: "303-555-9800" },
];

const HANGAR_BAY_SEED = [
  { code: "APA", name: "Bay A - Large Turboprop", type: "hangar" as const, capacity: 1 },
  { code: "APA", name: "Bay B - Medium Single/Twin", type: "hangar" as const, capacity: 2 },
  { code: "APA", name: "Bay C - Avionics Shop", type: "hangar" as const, capacity: 1 },
  { code: "FNL", name: "Bay D - Medium", type: "hangar" as const, capacity: 1 },
  { code: "FNL", name: "Ramp Spot 1", type: "ramp" as const, capacity: 1 },
];

// Parts catalog — 40 parts covering consumables, serialized, life-limited, and rotables
const PARTS_CATALOG = [
  // Consumables (not serialized)
  { pn: "CH48110-1", name: "Oil Filter Element", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 24 },
  { pn: "CH48108-1", name: "Fuel Filter Element", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 18 },
  { pn: "MIL-PRF-5606", name: "Hydraulic Fluid", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 40 },
  { pn: "AEROSHELL-560", name: "AeroShell Turbine Oil 560", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 36 },
  { pn: "SW-032-SS", name: "Safety Wire .032 Stainless", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 50 },
  { pn: "AN960-416", name: "Flat Washer 1/4-in", cat: "standard" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 200 },
  { pn: "MS21044N4", name: "Self-Locking Nut", cat: "standard" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 150 },
  { pn: "MS24665-132", name: "Cotter Pin", cat: "standard" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 300 },
  { pn: "PR-1422-B2", name: "Fuel Tank Sealant", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 8, hasShelf: true },
  { pn: "CORR-INHIB-1", name: "Corrosion Inhibitor Compound", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 12 },
  // Serialized powerplant parts
  { pn: "3040550-01", name: "PT6A Fuel Nozzle", cat: "repairable" as const, isSer: true, sn: "FN-7201", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  { pn: "3040550-01", name: "PT6A Fuel Nozzle", cat: "repairable" as const, isSer: true, sn: "FN-7202", isLL: false, cond: "overhauled" as const, loc: "inventory" as const },
  { pn: "3045001-01", name: "PT6A Igniter Plug", cat: "expendable" as const, isSer: true, sn: "IP-4401", isLL: false, cond: "new" as const, loc: "inventory" as const },
  { pn: "3045001-01", name: "PT6A Igniter Plug", cat: "expendable" as const, isSer: true, sn: "IP-4402", isLL: false, cond: "new" as const, loc: "inventory" as const },
  { pn: "3041600-01", name: "PT6A FCU Assembly", cat: "rotable" as const, isSer: true, sn: "FCU-1101", isLL: false, cond: "overhauled" as const, loc: "inventory" as const },
  { pn: "3041700-01", name: "PT6A Starter Generator", cat: "rotable" as const, isSer: true, sn: "SG-2201", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  // Life-limited parts
  { pn: "3042800-01", name: "PT6A 1st Stage Turbine Wheel", cat: "repairable" as const, isSer: true, sn: "TW1-5501", isLL: true, llHrs: 12000, llCyc: 10000, cond: "serviceable" as const, loc: "inventory" as const },
  { pn: "3042900-01", name: "PT6A 2nd Stage Turbine Wheel", cat: "repairable" as const, isSer: true, sn: "TW2-5502", isLL: true, llHrs: 12000, llCyc: 10000, cond: "serviceable" as const, loc: "inventory" as const },
  // Airframe parts
  { pn: "101-8002-1", name: "Main Gear Actuator Seal Kit", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 4 },
  { pn: "101-8003-1", name: "Nose Gear Steering Bushing", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 6 },
  { pn: "101-3200-5", name: "Brake Disc Assembly", cat: "rotable" as const, isSer: true, sn: "BD-3301", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  { pn: "101-3200-5", name: "Brake Disc Assembly", cat: "rotable" as const, isSer: true, sn: "BD-3302", isLL: false, cond: "new" as const, loc: "inventory" as const },
  { pn: "101-8100-2", name: "Cleveland Brake Lining Set", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 8 },
  { pn: "101-5200-1", name: "Deice Boot Patch Kit", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 3 },
  // Avionics parts
  { pn: "822-1468-004", name: "ADC Module (GTN 750Xi)", cat: "rotable" as const, isSer: true, sn: "ADC-9101", isLL: false, cond: "overhauled" as const, loc: "inventory" as const },
  { pn: "060-4072-04", name: "AHRS Unit (GRS 77)", cat: "rotable" as const, isSer: true, sn: "AHRS-9102", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  { pn: "011-04316-40", name: "GTN 750Xi Nav/Com", cat: "rotable" as const, isSer: true, sn: "GTN-9103", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  { pn: "011-00455-00", name: "GTX 345 Transponder", cat: "rotable" as const, isSer: true, sn: "XPDR-9104", isLL: false, cond: "new" as const, loc: "inventory" as const },
  { pn: "011-03510-00", name: "GFC 700 Autopilot Servo", cat: "rotable" as const, isSer: true, sn: "AP-9105", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  // Edge cases
  { pn: "3040550-01", name: "PT6A Fuel Nozzle (Quarantine)", cat: "repairable" as const, isSer: true, sn: "FN-QUAR-001", isLL: false, cond: "quarantine" as const, loc: "quarantine" as const },
  { pn: "101-8100-3", name: "Wheel Speed Transducer", cat: "rotable" as const, isSer: true, sn: "WST-REM-001", isLL: false, cond: "unserviceable" as const, loc: "removed_pending_disposition" as const },
  { pn: "3045001-01", name: "PT6A Igniter Plug (Pending Insp)", cat: "expendable" as const, isSer: true, sn: "IP-PEND-001", isLL: false, cond: "new" as const, loc: "pending_inspection" as const },
  // A few more consumables
  { pn: "MS29513-012", name: "O-Ring Landing Gear Seal", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 20 },
  { pn: "MS29513-013", name: "O-Ring Hydraulic Fitting", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 20 },
  { pn: "SW-041-SS", name: "Safety Wire .041 Stainless", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 30 },
  { pn: "MASKING-3M-471", name: "Masking Tape 3M 471", cat: "consumable" as const, isSer: false, isLL: false, cond: "new" as const, loc: "inventory" as const, qty: 24 },
  { pn: "101-4500-1", name: "Cabin Pressure Valve", cat: "rotable" as const, isSer: true, sn: "CPV-4501", isLL: false, cond: "serviceable" as const, loc: "inventory" as const },
  { pn: "101-9200-1", name: "Environmental Control Valve", cat: "rotable" as const, isSer: true, sn: "ECV-4601", isLL: false, cond: "new" as const, loc: "inventory" as const },
  { pn: "101-3500-1", name: "Rudder Trim Actuator", cat: "rotable" as const, isSer: true, sn: "RTA-4701", isLL: false, cond: "overhauled" as const, loc: "inventory" as const },
  { pn: "P38-01", name: "Emergency Battery Pack", cat: "rotable" as const, isSer: true, sn: "EBP-9106", isLL: false, cond: "new" as const, loc: "inventory" as const, hasShelf: true },
];

type TestEquipSeed = {
  pn: string;
  sn: string;
  name: string;
  eqType: string;
  calCert: string;
  calDaysAgo: number;
  calIntervalDays: number;
};

const TEST_EQUIP_SEED: TestEquipSeed[] = [
  { pn: "87V", sn: "TE-FLUKE-001", name: "Fluke 87V Multimeter", eqType: "multimeter", calCert: "ACAL-2025-FL87-001", calDaysAgo: 120, calIntervalDays: 365 },
  { pn: "DPS1000", sn: "TE-BARF-001", name: "Barfield DPS1000 Pitot-Static Test Set", eqType: "pitot_static_tester", calCert: "ACAL-2025-DPS-001", calDaysAgo: 90, calIntervalDays: 365 },
  { pn: "2312G", sn: "TE-BARF-002", name: "Barfield 2312G Transponder Tester", eqType: "transponder_tester", calCert: "ACAL-2025-XPT-001", calDaysAgo: 200, calIntervalDays: 365 },
  { pn: "NX-V2", sn: "TE-OLYM-001", name: "Olympus IPLEX NX Borescope", eqType: "borescope", calCert: "ACAL-2025-BSC-001", calDaysAgo: 60, calIntervalDays: 365 },
  { pn: "ATECH3FR100", sn: "TE-SNAP-001", name: 'Snap-on ATECH3FR100 Torque Wrench 1/4"', eqType: "torque_wrench", calCert: "ACAL-2025-TW1-001", calDaysAgo: 45, calIntervalDays: 180 },
  { pn: "ATECH3FR250", sn: "TE-SNAP-002", name: 'Snap-on ATECH3FR250 Torque Wrench 1/2"', eqType: "torque_wrench", calCert: "ACAL-2025-TW2-001", calDaysAgo: 30, calIntervalDays: 180 },
  { pn: "DCT-PT6", sn: "TE-COMP-001", name: "Differential Compression Tester (PT6)", eqType: "compression_tester", calCert: "ACAL-2025-DCT-001", calDaysAgo: 150, calIntervalDays: 365 },
  { pn: "DSA-202", sn: "TE-PROP-001", name: "DSA-202 Propeller Balance Analyzer", eqType: "prop_balance_analyzer", calCert: "ACAL-2025-PBA-001", calDaysAgo: 340, calIntervalDays: 365 },
];

// ─── Work order seed data ────────────────────────────────────────────────────

type ClosedWOSeed = {
  woNumber: string;
  aircraftIndex: number;
  woType: string;
  description: string;
  daysAgo: number; // when opened relative to now
  durationDays: number;
  priority: "routine" | "urgent" | "aog";
  taskCount: number;
  discrepancyCount: number;
  laborHours: number;
  partsTotal: number;
};

const CLOSED_WO_SEED: ClosedWOSeed[] = [
  // M3 (90 days ago)
  { woNumber: "WO-2025-0801", aircraftIndex: 2, woType: "annual_inspection", description: "Annual inspection - Cessna 172S N172FR", daysAgo: 88, durationDays: 7, priority: "routine", taskCount: 4, discrepancyCount: 2, laborHours: 28, partsTotal: 1200 },
  { woNumber: "WO-2025-0802", aircraftIndex: 8, woType: "100hr_inspection", description: "100-hour inspection - Grand Caravan N208CD", daysAgo: 85, durationDays: 5, priority: "routine", taskCount: 3, discrepancyCount: 1, laborHours: 22, partsTotal: 800 },
  { woNumber: "WO-2025-0803", aircraftIndex: 3, woType: "routine", description: "Brake overhaul and gear inspection - N182FR", daysAgo: 74, durationDays: 2, priority: "routine", taskCount: 2, discrepancyCount: 0, laborHours: 8, partsTotal: 450 },
  { woNumber: "WO-2025-0804", aircraftIndex: 0, woType: "ad_compliance", description: "AD 2024-15-07 compliance - King Air B200 N341PA fuel line inspection", daysAgo: 78, durationDays: 3, priority: "urgent", taskCount: 3, discrepancyCount: 1, laborHours: 16, partsTotal: 2200 },
  { woNumber: "WO-2025-0805", aircraftIndex: 5, woType: "unscheduled", description: "Pressurization system troubleshoot - TBM 940 N940MW", daysAgo: 68, durationDays: 4, priority: "urgent", taskCount: 3, discrepancyCount: 2, laborHours: 18, partsTotal: 3400 },
  // M2 (60 days ago)
  { woNumber: "WO-2025-0901", aircraftIndex: 1, woType: "annual_inspection", description: "Annual inspection - King Air 250 N892PA", daysAgo: 58, durationDays: 10, priority: "routine", taskCount: 5, discrepancyCount: 3, laborHours: 42, partsTotal: 4500 },
  { woNumber: "WO-2025-0902", aircraftIndex: 6, woType: "100hr_inspection", description: "100-hour inspection - King Air 350i N350AE", daysAgo: 53, durationDays: 5, priority: "routine", taskCount: 4, discrepancyCount: 1, laborHours: 24, partsTotal: 1800 },
  { woNumber: "WO-2025-0903", aircraftIndex: 4, woType: "routine", description: "Engine trend monitoring and oil analysis - TBM 930 N930MW", daysAgo: 48, durationDays: 6, priority: "routine", taskCount: 3, discrepancyCount: 1, laborHours: 20, partsTotal: 600 },
  { woNumber: "WO-2025-0904", aircraftIndex: 7, woType: "annual_inspection", description: "Annual inspection - T206H N206TB", daysAgo: 50, durationDays: 5, priority: "routine", taskCount: 4, discrepancyCount: 2, laborHours: 26, partsTotal: 1400 },
  { woNumber: "WO-2025-0905", aircraftIndex: 9, woType: "routine", description: "Seasonal prep and corrosion treatment - AgWagon N188SA", daysAgo: 43, durationDays: 3, priority: "routine", taskCount: 2, discrepancyCount: 0, laborHours: 12, partsTotal: 350 },
  // M1 (30 days ago)
  { woNumber: "WO-2025-1001", aircraftIndex: 2, woType: "unscheduled", description: "Engine rough running investigation - 172S N172FR", daysAgo: 28, durationDays: 2, priority: "urgent", taskCount: 2, discrepancyCount: 1, laborHours: 10, partsTotal: 500 },
  { woNumber: "WO-2025-1002", aircraftIndex: 8, woType: "ad_compliance", description: "AD compliance - Grand Caravan N208CD fuel selector valve", daysAgo: 23, durationDays: 4, priority: "routine", taskCount: 3, discrepancyCount: 1, laborHours: 14, partsTotal: 1800 },
  { woNumber: "WO-2025-1003", aircraftIndex: 0, woType: "routine", description: "Phase 2 inspection - King Air B200 N341PA", daysAgo: 18, durationDays: 3, priority: "routine", taskCount: 3, discrepancyCount: 1, laborHours: 16, partsTotal: 900 },
  { woNumber: "WO-2025-1004", aircraftIndex: 3, woType: "100hr_inspection", description: "100-hour inspection - 182T N182FR", daysAgo: 16, durationDays: 4, priority: "routine", taskCount: 3, discrepancyCount: 1, laborHours: 18, partsTotal: 700 },
  { woNumber: "WO-2025-1005", aircraftIndex: 5, woType: "routine", description: "Avionics software update and functional check - TBM 940 N940MW", daysAgo: 10, durationDays: 5, priority: "routine", taskCount: 3, discrepancyCount: 0, laborHours: 14, partsTotal: 200 },
];

type ActiveWOSeed = {
  woNumber: string;
  aircraftIndex: number;
  woType: string;
  description: string;
  status: string;
  daysAgoOpened: number;
  taskCount: number;
  completedTasks: number;
  priority: "routine" | "urgent" | "aog";
};

const ACTIVE_WO_SEED: ActiveWOSeed[] = [
  { woNumber: "WO-2026-0101", aircraftIndex: 0, woType: "routine", description: "Phase 3 inspection - King Air B200 N341PA", status: "in_progress", daysAgoOpened: 5, taskCount: 5, completedTasks: 3, priority: "routine" },
  { woNumber: "WO-2026-0102", aircraftIndex: 4, woType: "annual_inspection", description: "Annual inspection - TBM 930 N930MW", status: "in_progress", daysAgoOpened: 3, taskCount: 4, completedTasks: 1, priority: "routine" },
  { woNumber: "WO-2026-0103", aircraftIndex: 8, woType: "routine", description: "Engine trend monitoring and borescope - Grand Caravan N208CD", status: "pending_inspection", daysAgoOpened: 7, taskCount: 3, completedTasks: 3, priority: "routine" },
  { woNumber: "WO-2026-0104", aircraftIndex: 2, woType: "unscheduled", description: "Prop strike evaluation - Cessna 172S N172FR", status: "pending_signoff", daysAgoOpened: 4, taskCount: 3, completedTasks: 3, priority: "urgent" },
  { woNumber: "WO-2026-0105", aircraftIndex: 1, woType: "unscheduled", description: "Gear actuator replacement - King Air 250 N892PA", status: "on_hold", daysAgoOpened: 6, taskCount: 3, completedTasks: 1, priority: "urgent" },
  { woNumber: "WO-2026-0106", aircraftIndex: 6, woType: "unscheduled", description: "Intake squawk evaluation - King Air 350i N350AE", status: "open", daysAgoOpened: 0, taskCount: 2, completedTasks: 0, priority: "routine" },
  { woNumber: "WO-2026-0107", aircraftIndex: 3, woType: "routine", description: "Avionics upgrade - Cessna 182T N182FR (GTN 750Xi install)", status: "draft", daysAgoOpened: 1, taskCount: 0, completedTasks: 0, priority: "routine" },
];

type FutureWOSeed = {
  woNumber: string;
  aircraftIndex: number;
  woType: string;
  description: string;
  daysFromNow: number;
  estimatedDays: number;
  priority: "routine" | "urgent";
};

const FUTURE_WO_SEED: FutureWOSeed[] = [
  { woNumber: "WO-2026-0201", aircraftIndex: 5, woType: "100hr_inspection", description: "100-hour inspection - TBM 940 N940MW", daysFromNow: 15, estimatedDays: 4, priority: "routine" },
  { woNumber: "WO-2026-0202", aircraftIndex: 8, woType: "annual_inspection", description: "Annual inspection - Grand Caravan N208CD", daysFromNow: 25, estimatedDays: 8, priority: "routine" },
  { woNumber: "WO-2026-0203", aircraftIndex: 9, woType: "routine", description: "Spring AG season prep - AgWagon N188SA", daysFromNow: 20, estimatedDays: 3, priority: "routine" },
  { woNumber: "WO-2026-0204", aircraftIndex: 7, woType: "routine", description: "Oil change + 50hr inspection - T206H N206TB", daysFromNow: 30, estimatedDays: 2, priority: "routine" },
];

const AD_SEED = [
  { adNumber: "2024-15-07", title: "Fuel Line Inspection - King Air B200", type: "recurring" as const, compType: "calendar_or_hours" as const, appMakes: ["Beechcraft"], appModels: ["King Air B200", "King Air 250"], recurHrs: 1200, recurDays: 365, emergency: false },
  { adNumber: "2024-18-03", title: "Fuel Selector Valve Inspection - Cessna 208B", type: "recurring" as const, compType: "hours" as const, appMakes: ["Cessna"], appModels: ["208B Grand Caravan"], recurHrs: 500, emergency: false },
  { adNumber: "2023-22-11", title: "PT6A Compressor Blade Inspection", type: "recurring" as const, compType: "hours_or_cycles" as const, appMakes: ["Pratt & Whitney Canada"], appModels: ["PT6A-42", "PT6A-52", "PT6A-60A"], recurHrs: 3000, emergency: false },
  { adNumber: "2024-06-02", title: "Landing Gear Retract Actuator - King Air", type: "one_time" as const, compType: "one_time" as const, appMakes: ["Beechcraft"], appModels: ["King Air B200", "King Air 250", "King Air 350i"], emergency: false },
  { adNumber: "2025-01-15", title: "Propeller Hub Crack Inspection", type: "recurring" as const, compType: "calendar_or_hours" as const, appMakes: ["McCauley"], appModels: ["1C160-DTM7557", "2A36C23-JFM7660"], recurHrs: 500, recurDays: 365, emergency: false },
  { adNumber: "2024-12-09", title: "TBM Cabin Door Latch", type: "one_time" as const, compType: "one_time" as const, appMakes: ["Daher"], appModels: ["TBM 930", "TBM 940"], emergency: false },
  { adNumber: "2023-08-17", title: "Cessna 172/182 Seat Rail Lock", type: "recurring" as const, compType: "calendar" as const, appMakes: ["Cessna"], appModels: ["172S Skyhawk", "182T Skylane"], recurDays: 365, emergency: false },
  { adNumber: "2024-20-01", title: "PT6A-114A Fuel Nozzle Inspection", type: "recurring" as const, compType: "hours" as const, appMakes: ["Pratt & Whitney Canada"], appModels: ["PT6A-114A"], recurHrs: 600, emergency: false },
  { adNumber: "2025-03-22", title: "Emergency AD - PT6A Turbine Blade Retention", type: "one_time" as const, compType: "one_time" as const, appMakes: ["Pratt & Whitney Canada"], appModels: ["PT6A-42", "PT6A-52", "PT6A-60A", "PT6A-66D", "PT6A-114A"], emergency: true },
  { adNumber: "2024-09-14", title: "King Air Horizontal Stabilizer Spar", type: "recurring" as const, compType: "calendar_or_hours" as const, appMakes: ["Beechcraft"], appModels: ["King Air B200", "King Air 250", "King Air 350i"], recurHrs: 2400, recurDays: 730, emergency: false },
  { adNumber: "2023-15-06", title: "Continental IO-520/IO-550 Crankshaft", type: "recurring" as const, compType: "hours" as const, appMakes: ["Continental"], appModels: ["IO-550-C", "IO-520-D"], recurHrs: 1500, emergency: false },
  { adNumber: "2024-04-11", title: "Lycoming IO-360/IO-540 Valve Guide", type: "recurring" as const, compType: "hours" as const, appMakes: ["Lycoming"], appModels: ["IO-360-L2A", "IO-540-AB1A5"], recurHrs: 1000, emergency: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seedHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `seed-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

// ─── Main seed mutation ──────────────────────────────────────────────────────

export const seedComprehensive = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const M3 = now - 90 * DAY;
    const M2 = now - 60 * DAY;
    const M1 = now - 30 * DAY;
    const F1 = now + 30 * DAY;

    // ── Idempotency check ──────────────────────────────────────────────
    const existingOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "Colorado Aviation Maintenance Group"))
      .first();
    if (existingOrg) {
      return { orgId: existingOrg._id, stats: { message: "Seed already exists — skipping" } };
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 1: Foundation
    // ══════════════════════════════════════════════════════════════════════

    // Organization
    const orgId = await ctx.db.insert("organizations", {
      name: "Colorado Aviation Maintenance Group",
      clerkOrganizationId: undefined,
      part145CertificateNumber: "CAMG-145-2022-001",
      part145Ratings: ["Class A Airframe", "Class A Powerplant", "Limited Avionics"],
      address: "7565 S Peoria St",
      city: "Centennial",
      state: "CO",
      zip: "80112",
      country: "US",
      phone: "303-555-1234",
      email: "office@camg-mro.com",
      subscriptionTier: "professional",
      active: true,
      createdAt: M3,
      updatedAt: now,
    });

    // Shop Locations
    const locationMap: Record<string, Id<"shopLocations">> = {};
    for (const loc of LOCATION_SEED) {
      const locId = await ctx.db.insert("shopLocations", {
        organizationId: orgId,
        name: loc.name,
        code: loc.code,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zip: loc.zip,
        country: "US",
        certificateNumber: loc.certificateNumber,
        certificateType: "part_145",
        capabilities: loc.isPrimary ? ["airframe", "powerplant", "avionics"] : ["airframe", "powerplant"],
        isActive: true,
        isPrimary: loc.isPrimary,
        timezone: "America/Denver",
        createdAt: M3,
        updatedAt: M3,
      });
      locationMap[loc.code] = locId;
    }

    // Roster Shifts (needed before rosterTeams)
    const dayShiftAPA = await ctx.db.insert("rosterShifts", {
      organizationId: orgId,
      shopLocationId: locationMap["APA"],
      name: "APA Day Shift",
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 7,
      endHour: 17,
      efficiencyMultiplier: 1.0,
      isActive: true,
      sortOrder: 1,
      createdAt: M3,
      updatedAt: M3,
    });

    const dayShiftFNL = await ctx.db.insert("rosterShifts", {
      organizationId: orgId,
      shopLocationId: locationMap["FNL"],
      name: "FNL Day Shift",
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 7,
      endHour: 17,
      efficiencyMultiplier: 1.0,
      isActive: true,
      sortOrder: 2,
      createdAt: M3,
      updatedAt: M3,
    });

    // Roster Teams
    const teamAPA = await ctx.db.insert("rosterTeams", {
      organizationId: orgId,
      shopLocationId: locationMap["APA"],
      name: "APA Day Team",
      colorToken: "blue",
      shiftId: dayShiftAPA,
      isActive: true,
      sortOrder: 1,
      createdAt: M3,
      updatedAt: M3,
    });

    const teamFNL = await ctx.db.insert("rosterTeams", {
      organizationId: orgId,
      shopLocationId: locationMap["FNL"],
      name: "FNL Day Team",
      colorToken: "green",
      shiftId: dayShiftFNL,
      isActive: true,
      sortOrder: 2,
      createdAt: M3,
      updatedAt: M3,
    });

    // Technicians
    const techMap: Record<string, Id<"technicians">> = {};
    const techNames: Record<string, string> = {};
    for (const [i, tech] of TECHNICIAN_SEED.entries()) {
      const locId = locationMap[tech.locationCode];
      const teamId = tech.locationCode === "APA" ? teamAPA : teamFNL;
      const techId = await ctx.db.insert("technicians", {
        legalName: tech.legalName,
        userId: i === 0 ? args.clerkUserId : `sim-user-${tech.employeeId}`,
        employeeId: tech.employeeId,
        organizationId: orgId,
        primaryShopLocationId: locId,
        rosterTeamId: teamId,
        status: "active",
        email: `${tech.legalName.toLowerCase().replace(" ", ".")}@camg-mro.com`,
        role: tech.role,
        createdAt: M3,
        updatedAt: M3,
      });
      techMap[tech.employeeId] = techId;
      techNames[tech.employeeId] = tech.legalName;
    }

    // Patch org with DOM and QCM references
    await ctx.db.patch(orgId, {
      directorOfMaintenanceId: techMap["CAMG-001"],
      directorOfMaintenanceName: "James Harwick",
      qualityControlManagerId: techMap["CAMG-003"],
      qualityControlManagerName: "Robert Chen",
    });

    // Certificates
    const certMap: Record<string, Id<"certificates">> = {};
    const certNumbers: Record<string, string> = {};
    for (const tech of TECHNICIAN_SEED) {
      if (!tech.hasCert) continue;
      const certNum = `FAA-AP-${tech.employeeId.replace("CAMG-", "")}`;
      const hasIa = tech.hasIa;
      const iaExpiringSoon = "iaExpiringSoon" in tech && tech.iaExpiringSoon;
      const certId = await ctx.db.insert("certificates", {
        technicianId: techMap[tech.employeeId],
        certificateType: "A&P",
        certificateNumber: certNum,
        issueDate: M3 - 365 * DAY,
        ratings: ["airframe", "powerplant"],
        hasIaAuthorization: hasIa,
        iaExpiryDate: hasIa
          ? iaExpiringSoon
            ? now + 8 * DAY   // expires in 8 days — attention queue item
            : now + 365 * DAY // next March 31
          : undefined,
        iaRenewalActivities: hasIa
          ? [{ date: M3, activityType: "inspection_performed" as const, notes: "Annual inspection activity" }]
          : [],
        repairStationAuthorizations: [{
          organizationId: orgId,
          authorizedWorkScope: "Airframe and Powerplant maintenance per Part 145 RSMC",
          effectiveDate: M3 - 365 * DAY,
        }],
        active: true,
        createdAt: M3,
        updatedAt: M3,
      });
      certMap[tech.employeeId] = certId;
      certNumbers[tech.employeeId] = certNum;
    }

    // Customers
    const customerIds: Id<"customers">[] = [];
    for (const cust of CUSTOMER_SEED) {
      const custId = await ctx.db.insert("customers", {
        organizationId: orgId,
        name: cust.name,
        companyName: cust.companyName,
        customerType: cust.type,
        phone: cust.phone,
        email: cust.email,
        taxExempt: cust.type === "government",
        defaultPaymentTerms: cust.type === "government" ? "Net 45" : "Net 30",
        defaultPaymentTermsDays: cust.type === "government" ? 45 : 30,
        active: true,
        createdAt: M3,
        updatedAt: M3,
      });
      customerIds.push(custId);
    }

    // Aircraft
    const aircraftIds: Id<"aircraft">[] = [];
    for (const ac of AIRCRAFT_SEED) {
      const acId = await ctx.db.insert("aircraft", {
        make: ac.make,
        model: ac.model,
        serialNumber: ac.serial,
        currentRegistration: ac.tail,
        experimental: ac.experimental,
        aircraftCategory: ac.category,
        engineCount: ac.engineCount,
        totalTimeAirframeHours: ac.tt,
        totalTimeAirframeAsOfDate: now,
        customerId: customerIds[ac.customerIndex],
        status: ac.status,
        createdAt: M3,
        updatedAt: now,
        createdByOrganizationId: orgId,
      });
      aircraftIds.push(acId);
    }

    // Aircraft Registration History
    for (const [i, ac] of AIRCRAFT_SEED.entries()) {
      await ctx.db.insert("aircraftRegistrationHistory", {
        aircraftId: aircraftIds[i],
        nNumber: ac.tail,
        effectiveDate: M3 - 365 * DAY,
        registrationClass: "Standard",
      });
    }

    // Engines
    const engineIds: Id<"engines">[] = [];
    for (const eng of ENGINE_SEED) {
      const engId = await ctx.db.insert("engines", {
        make: eng.make,
        model: eng.model,
        serialNumber: eng.serial,
        currentAircraftId: aircraftIds[eng.aircraftIndex],
        position: eng.position,
        totalTimeHours: eng.tth,
        totalTimeAsOfDate: now,
        timeSinceOverhaulHours: eng.tsoHrs,
        timeSinceNewHours: eng.tsnHrs,
        timeBetweenOverhaulLimit: eng.tboLimit,
        totalCycles: eng.cycles,
        totalCyclesAsOfDate: eng.cycles ? now : undefined,
        status: "installed",
        organizationId: orgId,
        createdAt: M3,
        updatedAt: now,
      });
      engineIds.push(engId);
    }

    // Propellers
    for (const prop of PROPELLER_SEED) {
      await ctx.db.insert("propellers", {
        aircraftId: aircraftIds[prop.aircraftIndex],
        organizationId: orgId,
        position: prop.position,
        make: prop.make,
        model: prop.model,
        serialNumber: prop.serial,
        totalTimeHours: prop.tth,
        totalTimeAsOfDate: now,
        createdAt: M3,
        updatedAt: now,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 2: Infrastructure
    // ══════════════════════════════════════════════════════════════════════

    // Vendors
    const vendorIds: Id<"vendors">[] = [];
    for (const v of VENDOR_SEED) {
      const vId = await ctx.db.insert("vendors", {
        orgId: orgId,
        name: v.name,
        type: v.type,
        contactName: v.contact,
        contactEmail: v.email,
        contactPhone: v.phone,
        certNumber: v.certNumber,
        certExpiry: now + 365 * DAY,
        isApproved: true,
        approvedBy: techMap["CAMG-001"],
        approvedAt: M3,
        createdAt: M3,
        updatedAt: M3,
      });
      vendorIds.push(vId);
    }

    // Vendor Services
    const vendorServiceTypes = ["repair", "overhaul", "calibration", "test", "inspection"] as const;
    for (const [i, v] of VENDOR_SEED.entries()) {
      const svcCount = Math.min(2, vendorServiceTypes.length);
      for (let j = 0; j < svcCount; j++) {
        await ctx.db.insert("vendorServices", {
          vendorId: vendorIds[i],
          orgId: orgId,
          serviceName: `${v.name} — ${vendorServiceTypes[(i + j) % vendorServiceTypes.length]}`,
          serviceType: vendorServiceTypes[(i + j) % vendorServiceTypes.length],
          description: `${vendorServiceTypes[(i + j) % vendorServiceTypes.length]} services provided by ${v.name}`,
          isActive: true,
          createdAt: M3,
          updatedAt: M3,
        });
      }
    }

    // Hangar Bays
    const hangarBayIds: Id<"hangarBays">[] = [];
    for (const bay of HANGAR_BAY_SEED) {
      const bayId = await ctx.db.insert("hangarBays", {
        organizationId: orgId,
        shopLocationId: locationMap[bay.code],
        name: bay.name,
        type: bay.type,
        capacity: bay.capacity,
        status: "available",
        createdAt: M3,
        updatedAt: M3,
      });
      hangarBayIds.push(bayId);
    }

    // Test Equipment
    const testEquipIds: Id<"testEquipment">[] = [];
    for (const te of TEST_EQUIP_SEED) {
      const calDate = now - te.calDaysAgo * DAY;
      const calExpiry = calDate + te.calIntervalDays * DAY;
      const teId = await ctx.db.insert("testEquipment", {
        organizationId: orgId,
        partNumber: te.pn,
        serialNumber: te.sn,
        equipmentName: te.name,
        equipmentType: te.eqType as "multimeter" | "pitot_static_tester" | "transponder_tester" | "borescope" | "torque_wrench" | "compression_tester" | "prop_balance_analyzer",
        calibrationCertNumber: te.calCert,
        calibrationDate: calDate,
        calibrationExpiryDate: calExpiry,
        calibrationPerformedBy: "AeroCal Calibration Labs",
        status: calExpiry > now ? "current" : "expired",
        createdAt: M3,
        updatedAt: now,
      });
      testEquipIds.push(teId);
    }

    // Parts
    const partIds: Id<"parts">[] = [];
    for (const p of PARTS_CATALOG) {
      const partData: Record<string, unknown> = {
        partNumber: p.pn,
        partName: p.name,
        partCategory: p.cat,
        isSerialized: p.isSer,
        serialNumber: "sn" in p ? p.sn : undefined,
        isLifeLimited: p.isLL,
        lifeLimitHours: "llHrs" in p ? p.llHrs : undefined,
        lifeLimitCycles: "llCyc" in p ? p.llCyc : undefined,
        hasShelfLifeLimit: "hasShelf" in p && p.hasShelf === true,
        shelfLifeLimitDate: "hasShelf" in p && p.hasShelf ? now + 180 * DAY : undefined,
        condition: p.cond,
        location: p.loc,
        organizationId: orgId,
        shopLocationId: locationMap["APA"],
        isOwnerSupplied: false,
        quantityOnHand: "qty" in p ? p.qty : undefined,
        createdAt: M3,
        updatedAt: M3,
      };
      const pId = await ctx.db.insert("parts", partData as never);
      partIds.push(pId);
    }

    // Tool Records
    const toolCatalog = [
      { desc: 'Snap-on ATECH3FR100 Torque Wrench 1/4"', cat: "hand_tool" as const, calReq: true, intDays: 180 },
      { desc: 'CDI 2503MFRMH Torque Wrench 3/8"', cat: "hand_tool" as const, calReq: true, intDays: 180 },
      { desc: 'Mitutoyo Digital Caliper 6"', cat: "hand_tool" as const, calReq: true, intDays: 365 },
      { desc: "Fluke 87V Multimeter", cat: "test_equipment" as const, calReq: true, intDays: 365 },
      { desc: "Barfield DPS1000 Pitot-Static Test Set", cat: "test_equipment" as const, calReq: true, intDays: 365 },
      { desc: "Barfield 2312G Transponder Tester", cat: "test_equipment" as const, calReq: true, intDays: 365 },
      { desc: "Olympus IPLEX NX Borescope", cat: "test_equipment" as const, calReq: true, intDays: 365 },
      { desc: 'Milbar Safety Wire Pliers 9"', cat: "hand_tool" as const, calReq: false, intDays: 0 },
      { desc: "Chicago Pneumatic 3X Rivet Gun Set", cat: "power_tool" as const, calReq: false, intDays: 0 },
      { desc: "King Air Wing Jack Set", cat: "special_tooling" as const, calReq: false, intDays: 0 },
    ];
    for (const [i, tool] of toolCatalog.entries()) {
      const calDate = tool.calReq ? now - (60 + i * 30) * DAY : undefined;
      const calDue = tool.calReq && calDate ? calDate + tool.intDays * DAY : undefined;
      await ctx.db.insert("toolRecords", {
        organizationId: orgId,
        shopLocationId: i < 7 ? locationMap["APA"] : locationMap["FNL"],
        toolNumber: `CAMG-TL-${String(i + 1).padStart(3, "0")}`,
        description: tool.desc,
        category: tool.cat,
        status: calDue && calDue < now ? "calibration_due" : "available",
        calibrationRequired: tool.calReq,
        lastCalibrationDate: calDate,
        nextCalibrationDue: calDue,
        calibrationIntervalDays: tool.intDays || undefined,
        calibrationProvider: tool.calReq ? "AeroCal Calibration Labs" : undefined,
        createdAt: M3,
      });
    }

    // Scheduling Settings
    await ctx.db.insert("schedulingSettings", {
      organizationId: orgId,
      capacityBufferPercent: 15,
      defaultShiftDays: [1, 2, 3, 4, 5],
      defaultStartHour: 7,
      defaultEndHour: 17,
      defaultEfficiencyMultiplier: 1.0,
      timezone: "America/Denver",
      updatedAt: M3,
      updatedByUserId: args.clerkUserId,
    });

    // Org Billing Settings
    await ctx.db.insert("orgBillingSettings", {
      orgId: orgId,
      companyName: "Colorado Aviation Maintenance Group",
      companyAddress: "7565 S Peoria St, Centennial, CO 80112",
      companyPhone: "303-555-1234",
      companyEmail: "billing@camg-mro.com",
      invoiceTerms: "Payment due within 30 days of invoice date.",
      defaultPaymentTerms: "Net 30",
      defaultPaymentTermsDays: 30,
      createdAt: M3,
      updatedAt: M3,
    });

    // Shop Settings (quote builder markup config)
    await ctx.db.insert("shopSettings", {
      orgId: orgId,
      shopRate: 125,
      averageHourlyCost: 55,
      partMarkupTiers: [
        { maxCostThreshold: 100, markupMultiplier: 1.50 },
        { maxCostThreshold: 500, markupMultiplier: 1.35 },
        { maxCostThreshold: 5000, markupMultiplier: 1.25 },
        { maxCostThreshold: 99999, markupMultiplier: 1.15 },
      ],
      serviceMarkupTiers: [
        { maxCostThreshold: 1000, markupMultiplier: 1.20 },
        { maxCostThreshold: 99999, markupMultiplier: 1.10 },
      ],
      createdAt: M3,
      updatedAt: M3,
    });

    // Tax Rates
    await ctx.db.insert("taxRates", {
      orgId: orgId,
      name: "Colorado State Sales Tax",
      rate: 2.9,
      appliesTo: "parts",
      isDefault: true,
      active: true,
      createdAt: M3,
      updatedAt: M3,
    });
    await ctx.db.insert("taxRates", {
      orgId: orgId,
      name: "Arapahoe County Tax",
      rate: 1.0,
      appliesTo: "parts",
      isDefault: false,
      active: true,
      createdAt: M3,
      updatedAt: M3,
    });

    // Pricing Profiles
    await ctx.db.insert("pricingProfiles", {
      orgId: orgId,
      name: "Standard Rate",
      laborRateOverride: 95,
      isDefault: true,
      effectiveDate: M3,
      createdAt: M3,
      updatedAt: M3,
    });
    await ctx.db.insert("pricingProfiles", {
      orgId: orgId,
      name: "Premium / AOG Rate",
      laborRateOverride: 125,
      isDefault: false,
      effectiveDate: M3,
      createdAt: M3,
      updatedAt: M3,
    });

    // Rotables
    const rotableItems = [
      { pn: "3041600-01", sn: "FCU-ROT-001", desc: "PT6A FCU Assembly", stat: "serviceable" as const, cond: "overhauled" as const },
      { pn: "3041700-01", sn: "SG-ROT-001", desc: "PT6A Starter Generator", stat: "serviceable" as const, cond: "serviceable" as const },
      { pn: "101-3200-5", sn: "BD-ROT-001", desc: "Brake Disc Assembly", stat: "in_shop" as const, cond: "unserviceable" as const },
      { pn: "822-1468-004", sn: "ADC-ROT-001", desc: "ADC Module (GTN 750Xi)", stat: "serviceable" as const, cond: "overhauled" as const },
    ];
    for (const rot of rotableItems) {
      await ctx.db.insert("rotables", {
        organizationId: orgId,
        shopLocationId: locationMap["APA"],
        partNumber: rot.pn,
        serialNumber: rot.sn,
        description: rot.desc,
        status: rot.stat,
        condition: rot.cond,
        createdAt: M3,
      });
    }

    // Loaner Items
    const loanerItems = [
      { pn: "3041600-01", sn: "FCU-LOAN-001", desc: "PT6A FCU Assembly (Loaner)", rate: 150 },
      { pn: "822-1468-004", sn: "ADC-LOAN-001", desc: "ADC Module (Loaner)", rate: 75 },
    ];
    for (const loan of loanerItems) {
      await ctx.db.insert("loanerItems", {
        organizationId: orgId,
        partNumber: loan.pn,
        serialNumber: loan.sn,
        description: loan.desc,
        status: "available",
        dailyRate: loan.rate,
        createdAt: M3,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 3: Historical Closed Work Orders
    // ══════════════════════════════════════════════════════════════════════

    const closedWOIds: Id<"workOrders">[] = [];
    let authEventCounter = 0;
    let mainRecSeqByAircraft: Record<number, number> = {};
    let inspRecSeqByAircraft: Record<number, number> = {};

    // Helper: create pre-consumed auth event
    async function createConsumedAuth(techEmpId: string, timestamp: number, table: string) {
      authEventCounter++;
      const techId = techMap[techEmpId];
      const certNum = certNumbers[techEmpId] ?? "SIM-CERT";
      const authId = await ctx.db.insert("signatureAuthEvents", {
        clerkEventId: `sim-seed-${authEventCounter}`,
        clerkSessionId: `sim-session-seed-${authEventCounter}`,
        userId: `sim-user-${techEmpId}`,
        technicianId: techId,
        authenticatedLegalName: techNames[techEmpId],
        authenticatedCertNumber: certNum,
        authMethod: "pin",
        intendedTable: table,
        authenticatedAt: timestamp - 60_000,
        expiresAt: timestamp + 240_000,
        consumed: true,
        consumedAt: timestamp,
        consumedByTable: table,
      });
      return authId;
    }

    for (const [woIdx, wo] of CLOSED_WO_SEED.entries()) {
      const ac = AIRCRAFT_SEED[wo.aircraftIndex];
      const openedAt = now - wo.daysAgo * DAY;
      const closedAt = openedAt + wo.durationDays * DAY;
      const ttAtOpen = ac.tt - 20 + woIdx; // slightly lower than current TT
      const ttAtClose = ttAtOpen + 5; // a few hours accrued

      const woId = await ctx.db.insert("workOrders", {
        workOrderNumber: wo.woNumber,
        organizationId: orgId,
        shopLocationId: locationMap["APA"],
        aircraftId: aircraftIds[wo.aircraftIndex],
        status: "closed",
        workOrderType: wo.woType as "routine" | "unscheduled" | "annual_inspection" | "100hr_inspection" | "ad_compliance",
        description: wo.description,
        openedAt,
        openedByUserId: args.clerkUserId,
        closedAt,
        closedByUserId: args.clerkUserId,
        closedByTechnicianId: techMap["CAMG-001"],
        aircraftTotalTimeAtOpen: ttAtOpen,
        aircraftTotalTimeAtClose: ttAtClose,
        customerId: customerIds[ac.customerIndex],
        priority: wo.priority,
        billingStatus: "paid",
        returnedToService: true,
        aircraftSnapshotAtOpen: {
          registration: ac.tail,
          make: ac.make,
          model: ac.model,
          serialNumber: ac.serial,
          totalTimeAirframeHours: ttAtOpen,
          engineSnapshots: ENGINE_SEED
            .filter((e) => e.aircraftIndex === wo.aircraftIndex)
            .map((e) => ({
              make: e.make,
              model: e.model,
              serialNumber: e.serial,
              totalTimeHours: e.tth - 20 + woIdx,
              totalCycles: e.cycles ? e.cycles - 10 : undefined,
            })),
        },
        createdAt: openedAt,
        updatedAt: closedAt,
      });
      closedWOIds.push(woId);

      // Task Cards (3-5 per WO)
      const taskCardIds: Id<"taskCards">[] = [];
      const taskTitles = [
        "Incoming inspection and documentation review",
        "Primary maintenance task execution",
        "Discrepancy evaluation and corrective action",
        "Final inspection and closeout",
        "AD compliance verification",
      ];
      for (let t = 0; t < wo.taskCount; t++) {
        const tcId = await ctx.db.insert("taskCards", {
          workOrderId: woId,
          aircraftId: aircraftIds[wo.aircraftIndex],
          organizationId: orgId,
          taskCardNumber: `${wo.woNumber}-TC-${t + 1}`,
          title: taskTitles[t % taskTitles.length],
          taskType: t === 0 ? "inspection" : t === wo.taskCount - 1 ? "return_to_service" : "repair",
          approvedDataSource: "FAA-approved data per AMM",
          assignedToTechnicianId: techMap[`CAMG-00${(t % 4) + 5}`],
          status: "complete",
          startedAt: openedAt + t * DAY,
          completedAt: openedAt + (t + 1) * DAY,
          stepCount: 3,
          completedStepCount: 3,
          naStepCount: 0,
          estimatedHours: wo.laborHours / wo.taskCount,
          createdAt: openedAt,
          updatedAt: closedAt,
        });
        taskCardIds.push(tcId);

        // Task Card Steps (3 per task card)
        for (let s = 0; s < 3; s++) {
          const stepTime = openedAt + t * DAY + s * 2 * HOUR;
          const stepAuthId = await createConsumedAuth(
            `CAMG-00${(t % 4) + 5}`,
            stepTime + 2 * HOUR,
            "taskCardSteps"
          );
          await ctx.db.insert("taskCardSteps", {
            taskCardId: tcId,
            workOrderId: woId,
            aircraftId: aircraftIds[wo.aircraftIndex],
            organizationId: orgId,
            stepNumber: s + 1,
            description: `Step ${s + 1}: ${["Inspect and document condition", "Perform corrective action per AMM", "Verify and sign off completion"][s]}`,
            requiresSpecialTool: s === 1,
            signOffRequired: true,
            signOffRequiresIa: s === 0 && t === 0,
            status: "completed",
            signedByTechnicianId: techMap[`CAMG-00${(t % 4) + 5}`],
            signedAt: stepTime + 2 * HOUR,
            signedCertificateNumber: certNumbers[`CAMG-00${(t % 4) + 5}`] ?? "SIM-CERT",
            signatureAuthEventId: stepAuthId,
            discrepancyIds: [],
            createdAt: openedAt,
            updatedAt: stepTime + 2 * HOUR,
          });
        }
      }

      // Discrepancies
      const discrepancyIds: Id<"discrepancies">[] = [];
      for (let d = 0; d < wo.discrepancyCount; d++) {
        const dId = await ctx.db.insert("discrepancies", {
          workOrderId: woId,
          aircraftId: aircraftIds[wo.aircraftIndex],
          organizationId: orgId,
          discrepancyNumber: `${wo.woNumber}-D-${d + 1}`,
          status: "dispositioned",
          disposition: d === 0 ? "corrected" : "replaced",
          foundDuring: wo.woType === "annual_inspection" ? "annual_inspection" : "routine_maintenance",
          description: `Discrepancy ${d + 1} found during ${wo.description.toLowerCase()}`,
          foundByTechnicianId: techMap["CAMG-007"],
          foundAt: openedAt + DAY,
          foundAtAircraftHours: ttAtOpen + 1,
          dispositionedByTechnicianId: techMap["CAMG-005"],
          dispositionedAt: openedAt + 2 * DAY,
          correctiveAction: d === 0 ? "Corrected per AMM procedures" : "Part replaced with serviceable unit",
          createdAt: openedAt + DAY,
          updatedAt: openedAt + 2 * DAY,
        });
        discrepancyIds.push(dId);
      }

      // Maintenance Record
      const mrSeq = (mainRecSeqByAircraft[wo.aircraftIndex] ?? 0) + 1;
      mainRecSeqByAircraft[wo.aircraftIndex] = mrSeq;
      const mrAuthId = await createConsumedAuth("CAMG-005", closedAt - HOUR, "maintenanceRecords");
      const mrId = await ctx.db.insert("maintenanceRecords", {
        recordType: "maintenance_43_9",
        aircraftId: aircraftIds[wo.aircraftIndex],
        aircraftMake: ac.make,
        aircraftModel: ac.model,
        aircraftSerialNumber: ac.serial,
        aircraftRegistration: ac.tail,
        aircraftTotalTimeHours: ttAtClose,
        workOrderId: woId,
        organizationId: orgId,
        organizationCertificateNumber: "CAMG-145-2022-001",
        sequenceNumber: mrSeq,
        workPerformed: wo.description,
        approvedDataReference: "FAA-approved data per applicable AMM, SBs, and ADs",
        partsReplaced: [],
        completionDate: closedAt,
        technicians: [{
          technicianId: techMap["CAMG-005"],
          legalName: "David Kowalski",
          certificateNumber: certNumbers["CAMG-005"],
          certificateType: "A&P",
          ratingsExercised: ["airframe", "powerplant"],
          scopeOfWork: wo.description,
          signatureTimestamp: closedAt - HOUR,
          signatureHash: seedHash(`mr-${wo.woNumber}`),
          signatureAuthEventId: mrAuthId,
        }],
        signingTechnicianId: techMap["CAMG-005"],
        signingTechnicianLegalName: "David Kowalski",
        signingTechnicianCertNumber: certNumbers["CAMG-005"],
        signingTechnicianCertType: "A&P",
        signingTechnicianRatingsExercised: ["airframe", "powerplant"],
        signatureTimestamp: closedAt - HOUR,
        signatureHash: seedHash(`mr-${wo.woNumber}`),
        signatureAuthEventId: mrAuthId,
        returnedToService: false,
        discrepanciesFound: discrepancyIds,
        discrepanciesCorrected: discrepancyIds,
        createdAt: closedAt - HOUR,
      });

      // Inspection Record (for inspection-type WOs)
      let inspectionRecordId: Id<"inspectionRecords"> | undefined;
      if (["annual_inspection", "100hr_inspection"].includes(wo.woType)) {
        const irSeq = (inspRecSeqByAircraft[wo.aircraftIndex] ?? 0) + 1;
        inspRecSeqByAircraft[wo.aircraftIndex] = irSeq;
        const irAuthId = await createConsumedAuth("CAMG-003", closedAt - 30 * MINUTE, "inspectionRecords");
        inspectionRecordId = await ctx.db.insert("inspectionRecords", {
          workOrderId: woId,
          aircraftId: aircraftIds[wo.aircraftIndex],
          organizationId: orgId,
          inspectionType: wo.woType === "annual_inspection" ? "annual" : "100_hour",
          inspectionDate: closedAt,
          aircraftMake: ac.make,
          aircraftModel: ac.model,
          aircraftSerialNumber: ac.serial,
          aircraftRegistration: ac.tail,
          totalTimeAirframeHours: ttAtClose,
          scopeDescription: wo.description,
          airworthinessDetermination: "returned_to_service",
          discrepancyIds,
          iaTechnicianId: techMap["CAMG-003"],
          iaCertificateNumber: certNumbers["CAMG-003"],
          iaCurrentOnInspectionDate: true,
          iaSignatureTimestamp: closedAt - 30 * MINUTE,
          iaSignatureHash: seedHash(`ir-${wo.woNumber}`),
          iaSignatureAuthEventId: irAuthId,
          adComplianceReviewed: true,
          adComplianceReferenceIds: [],
          sequenceNumber: irSeq,
          createdAt: closedAt - 30 * MINUTE,
        });
      }

      // Return to Service
      const rtsAuthId = await createConsumedAuth("CAMG-001", closedAt, "returnToService");
      const rtsId = await ctx.db.insert("returnToService", {
        workOrderId: woId,
        aircraftId: aircraftIds[wo.aircraftIndex],
        organizationId: orgId,
        inspectionRecordId,
        signedByIaTechnicianId: techMap["CAMG-001"],
        iaCertificateNumber: certNumbers["CAMG-001"],
        iaCurrentOnRtsDate: true,
        returnToServiceDate: closedAt,
        returnToServiceStatement: `I certify that this aircraft has been inspected in accordance with the applicable regulations and is returned to service. ${wo.description}`,
        aircraftHoursAtRts: ttAtClose,
        signatureHash: seedHash(`rts-${wo.woNumber}`),
        signatureTimestamp: closedAt,
        signatureAuthEventId: rtsAuthId,
        createdAt: closedAt,
      });

      // Patch WO with RTS reference
      await ctx.db.patch(woId, { returnToServiceId: rtsId });

      // QCM Review
      const qcmAuthId = await createConsumedAuth("CAMG-003", closedAt + 2 * HOUR, "qcmReviews");
      await ctx.db.insert("qcmReviews", {
        workOrderId: woId,
        organizationId: orgId,
        reviewedByTechnicianId: techMap["CAMG-003"],
        reviewerLegalName: "Robert Chen",
        reviewerCertificateNumber: certNumbers["CAMG-003"],
        reviewerCertificateType: "A&P",
        reviewTimestamp: closedAt + 2 * HOUR,
        outcome: "accepted",
        signatureHash: seedHash(`qcm-${wo.woNumber}`),
        signatureTimestamp: closedAt + 2 * HOUR,
        signatureAuthEventId: qcmAuthId,
        createdAt: closedAt + 2 * HOUR,
      });

      // Time Entries (2-4 per WO)
      const timeEntryCount = Math.min(4, Math.max(2, Math.floor(wo.laborHours / 8)));
      for (let te = 0; te < timeEntryCount; te++) {
        const clockIn = openedAt + te * DAY + 7 * HOUR;
        const clockOut = clockIn + Math.floor(wo.laborHours / timeEntryCount) * HOUR;
        await ctx.db.insert("timeEntries", {
          orgId: orgId,
          technicianId: techMap[`CAMG-00${(te % 4) + 5}`],
          entryType: "work_order",
          workOrderId: woId,
          clockInAt: clockIn,
          clockOutAt: clockOut,
          durationMinutes: Math.floor((clockOut - clockIn) / MINUTE),
          billingClass: "billable",
          rateAtTime: 95,
          createdAt: clockIn,
          updatedAt: clockOut,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 4: Active Operations
    // ══════════════════════════════════════════════════════════════════════

    const activeWOIds: Id<"workOrders">[] = [];
    for (const awo of ACTIVE_WO_SEED) {
      const ac = AIRCRAFT_SEED[awo.aircraftIndex];
      const openedAt = now - awo.daysAgoOpened * DAY;
      const ttAtOpen = ac.tt - 10;

      const woId = await ctx.db.insert("workOrders", {
        workOrderNumber: awo.woNumber,
        organizationId: orgId,
        shopLocationId: locationMap["APA"],
        aircraftId: aircraftIds[awo.aircraftIndex],
        status: awo.status as "draft" | "open" | "in_progress" | "on_hold" | "pending_inspection" | "pending_signoff",
        workOrderType: awo.woType as "routine" | "unscheduled" | "annual_inspection",
        description: awo.description,
        openedAt,
        openedByUserId: args.clerkUserId,
        aircraftTotalTimeAtOpen: ttAtOpen,
        customerId: customerIds[ac.customerIndex],
        priority: awo.priority,
        onHoldReason: awo.status === "on_hold" ? "Awaiting gear actuator from Aviall — ETA 3 days" : undefined,
        onHoldSince: awo.status === "on_hold" ? now - 2 * DAY : undefined,
        aircraftSnapshotAtOpen: {
          registration: ac.tail,
          make: ac.make,
          model: ac.model,
          serialNumber: ac.serial,
          totalTimeAirframeHours: ttAtOpen,
          engineSnapshots: ENGINE_SEED
            .filter((e) => e.aircraftIndex === awo.aircraftIndex)
            .map((e) => ({
              make: e.make,
              model: e.model,
              serialNumber: e.serial,
              totalTimeHours: e.tth - 10,
              totalCycles: e.cycles ? e.cycles - 5 : undefined,
            })),
        },
        createdAt: openedAt,
        updatedAt: now,
      });
      activeWOIds.push(woId);

      // Task cards for active WOs
      if (awo.taskCount > 0) {
        const activeTasks = [
          "Incoming inspection and panel removal",
          "Primary work scope execution",
          "Systems operational check",
          "Discrepancy investigation",
          "Final inspection and closeout",
        ];
        for (let t = 0; t < awo.taskCount; t++) {
          const isComplete = t < awo.completedTasks;
          const isInProgress = t === awo.completedTasks && awo.completedTasks < awo.taskCount;
          const tcStatus = isComplete ? "complete" : isInProgress ? "in_progress" : "not_started";
          const tcId = await ctx.db.insert("taskCards", {
            workOrderId: woId,
            aircraftId: aircraftIds[awo.aircraftIndex],
            organizationId: orgId,
            taskCardNumber: `${awo.woNumber}-TC-${t + 1}`,
            title: activeTasks[t % activeTasks.length],
            taskType: t === 0 ? "inspection" : "repair",
            approvedDataSource: "FAA-approved data per AMM",
            assignedToTechnicianId: techMap[`CAMG-00${(t % 3) + 7}`],
            status: tcStatus,
            startedAt: isComplete || isInProgress ? openedAt + t * DAY : undefined,
            completedAt: isComplete ? openedAt + (t + 1) * DAY : undefined,
            stepCount: 3,
            completedStepCount: isComplete ? 3 : isInProgress ? 1 : 0,
            naStepCount: 0,
            estimatedHours: 8,
            createdAt: openedAt,
            updatedAt: now,
          });

          // Steps for active task cards
          for (let s = 0; s < 3; s++) {
            const stepComplete = isComplete || (isInProgress && s === 0);
            let stepAuthId: Id<"signatureAuthEvents"> | undefined;
            if (stepComplete) {
              stepAuthId = await createConsumedAuth(
                `CAMG-00${(t % 3) + 7}`,
                openedAt + t * DAY + (s + 1) * 2 * HOUR,
                "taskCardSteps"
              );
            }
            await ctx.db.insert("taskCardSteps", {
              taskCardId: tcId,
              workOrderId: woId,
              aircraftId: aircraftIds[awo.aircraftIndex],
              organizationId: orgId,
              stepNumber: s + 1,
              description: `Step ${s + 1}: ${["Inspect condition", "Perform work", "Verify completion"][s]}`,
              requiresSpecialTool: false,
              signOffRequired: true,
              signOffRequiresIa: false,
              status: stepComplete ? "completed" : isInProgress && s === 1 ? "in_progress" : "pending",
              signedByTechnicianId: stepComplete ? techMap[`CAMG-00${(t % 3) + 7}`] : undefined,
              signedAt: stepComplete ? openedAt + t * DAY + (s + 1) * 2 * HOUR : undefined,
              signedCertificateNumber: stepComplete ? certNumbers[`CAMG-00${(t % 3) + 7}`] : undefined,
              signatureAuthEventId: stepAuthId,
              discrepancyIds: [],
              createdAt: openedAt,
              updatedAt: now,
            });
          }
        }
      }

      // Schedule assignments for active WOs (not draft)
      if (awo.status !== "draft") {
        await ctx.db.insert("scheduleAssignments", {
          organizationId: orgId,
          workOrderId: woId,
          hangarBayId: hangarBayIds[activeWOIds.length % hangarBayIds.length],
          shopLocationId: locationMap["APA"],
          startDate: openedAt,
          endDate: openedAt + 10 * DAY,
          createdAt: openedAt,
          updatedAt: now,
          updatedByUserId: args.clerkUserId,
        });
      }

      // Discrepancies for some active WOs
      if (["in_progress", "pending_inspection", "on_hold"].includes(awo.status)) {
        await ctx.db.insert("discrepancies", {
          workOrderId: woId,
          aircraftId: aircraftIds[awo.aircraftIndex],
          organizationId: orgId,
          discrepancyNumber: `${awo.woNumber}-D-1`,
          status: awo.status === "pending_inspection" ? "dispositioned" : "open",
          disposition: awo.status === "pending_inspection" ? "corrected" : undefined,
          foundDuring: "routine_maintenance",
          description: `Found during ${awo.description.toLowerCase()}`,
          foundByTechnicianId: techMap["CAMG-007"],
          foundAt: openedAt + DAY,
          foundAtAircraftHours: ttAtOpen + 2,
          createdAt: openedAt + DAY,
          updatedAt: now,
        });
      }
    }

    // Purchase Orders for active WOs
    // PO for on_hold WO (WO-2026-0105 - gear actuator)
    const poVendor = vendorIds[0]; // Aviall
    const poId = await ctx.db.insert("purchaseOrders", {
      orgId: orgId,
      poNumber: "PO-2026-0015",
      vendorId: poVendor,
      workOrderId: activeWOIds[4], // on_hold WO
      status: "SUBMITTED",
      requestedByTechId: techMap["CAMG-005"],
      subtotal: 4200,
      tax: 163.80,
      total: 4363.80,
      createdAt: now - 4 * DAY,
      updatedAt: now - 4 * DAY,
    });
    await ctx.db.insert("poLineItems", {
      orgId: orgId,
      purchaseOrderId: poId,
      description: "Main Gear Actuator Assembly",
      qty: 1,
      unitPrice: 4200,
      receivedQty: 0,
      status: "PENDING",
      createdAt: now - 4 * DAY,
      updatedAt: now - 4 * DAY,
    });

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 5: Future Planned Work
    // ══════════════════════════════════════════════════════════════════════

    for (const fwo of FUTURE_WO_SEED) {
      const ac = AIRCRAFT_SEED[fwo.aircraftIndex];
      const scheduledStart = now + fwo.daysFromNow * DAY;

      const woId = await ctx.db.insert("workOrders", {
        workOrderNumber: fwo.woNumber,
        organizationId: orgId,
        shopLocationId: locationMap["APA"],
        aircraftId: aircraftIds[fwo.aircraftIndex],
        status: "draft",
        workOrderType: fwo.woType as "routine" | "100hr_inspection" | "annual_inspection",
        description: fwo.description,
        openedAt: now,
        openedByUserId: args.clerkUserId,
        aircraftTotalTimeAtOpen: ac.tt,
        customerId: customerIds[ac.customerIndex],
        priority: fwo.priority,
        scheduledStartDate: scheduledStart,
        promisedDeliveryDate: scheduledStart + fwo.estimatedDays * DAY,
        createdAt: now,
        updatedAt: now,
      });

      // Schedule assignments for future WOs
      await ctx.db.insert("scheduleAssignments", {
        organizationId: orgId,
        workOrderId: woId,
        hangarBayId: hangarBayIds[0],
        shopLocationId: locationMap["APA"],
        startDate: scheduledStart,
        endDate: scheduledStart + fwo.estimatedDays * DAY,
        createdAt: now,
        updatedAt: now,
        updatedByUserId: args.clerkUserId,
      });
    }

    // Quotes
    const quoteStatuses = ["APPROVED", "SENT", "DRAFT", "DECLINED"] as const;
    for (const [qi, fwo] of FUTURE_WO_SEED.entries()) {
      const ac = AIRCRAFT_SEED[fwo.aircraftIndex];
      const quoteId = await ctx.db.insert("quotes", {
        orgId: orgId,
        customerId: customerIds[ac.customerIndex],
        aircraftId: aircraftIds[fwo.aircraftIndex],
        status: quoteStatuses[qi],
        quoteNumber: `Q-2026-${String(qi + 1).padStart(4, "0")}`,
        createdByTechId: techMap["CAMG-002"],
        laborTotal: fwo.estimatedDays * 8 * 95,
        partsTotal: 1500 + qi * 500,
        subtotal: fwo.estimatedDays * 8 * 95 + 1500 + qi * 500,
        tax: (fwo.estimatedDays * 8 * 95 + 1500 + qi * 500) * 0.039,
        total: (fwo.estimatedDays * 8 * 95 + 1500 + qi * 500) * 1.039,
        sentAt: qi < 2 ? now - 5 * DAY : undefined,
        respondedAt: qi === 0 ? now - 3 * DAY : qi === 3 ? now - 2 * DAY : undefined,
        declineReason: qi === 3 ? "Customer decided to defer maintenance" : undefined,
        createdAt: now - 7 * DAY,
        updatedAt: now,
      });

      // Quote line items (4 per quote)
      const lineTypes = ["labor", "part", "labor", "part"] as const;
      for (let li = 0; li < 4; li++) {
        const isLabor = lineTypes[li] === "labor";
        const qty = isLabor ? fwo.estimatedDays * 4 : li + 1;
        const unitPrice = isLabor ? 95 : 250 + li * 100;
        await ctx.db.insert("quoteLineItems", {
          orgId: orgId,
          quoteId,
          type: lineTypes[li],
          description: isLabor ? `Labor — ${li === 0 ? "Inspection" : "Maintenance"}` : `Parts — Line ${li + 1}`,
          qty,
          unitPrice,
          total: qty * unitPrice,
          createdAt: now - 7 * DAY,
          updatedAt: now,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 6: Compliance, Training, CRM
    // ══════════════════════════════════════════════════════════════════════

    // Airworthiness Directives
    const adIds: Id<"airworthinessDirectives">[] = [];
    for (const ad of AD_SEED) {
      const adId = await ctx.db.insert("airworthinessDirectives", {
        adNumber: ad.adNumber,
        title: ad.title,
        effectiveDate: M3 - 180 * DAY,
        applicabilityText: `Applies to ${ad.appMakes.join(", ")} ${ad.appModels.join(", ")}`,
        adType: ad.type,
        emergencyAd: ad.emergency,
        complianceMethodDescription: `Inspection and/or corrective action per AD ${ad.adNumber}`,
        complianceType: ad.compType,
        recurringIntervalHours: ad.recurHrs,
        recurringIntervalDays: ad.recurDays,
        createdAt: M3,
        updatedAt: M3,
      });
      adIds.push(adId);
    }

    // AD Compliance records — link ADs to aircraft
    for (const [adIdx, ad] of AD_SEED.entries()) {
      for (const [acIdx, ac] of AIRCRAFT_SEED.entries()) {
        // Check if AD applies to this aircraft/engine
        const appliesToAircraft = ad.appMakes.includes(ac.make) && ad.appModels.includes(ac.model);
        const appliesToEngine = ENGINE_SEED
          .filter((e) => e.aircraftIndex === acIdx)
          .some((e) => ad.appMakes.includes(e.make) && ad.appModels.includes(e.model));

        if (!appliesToAircraft && !appliesToEngine) continue;

        const isComplied = adIdx < 9; // First 9 ADs are complied, last 3 have varying status
        const status = isComplied
          ? ad.type === "one_time" ? "complied_one_time" : "complied_recurring"
          : adIdx === 9 ? "not_complied" : "pending_determination";

        await ctx.db.insert("adCompliance", {
          adId: adIds[adIdx],
          aircraftId: aircraftIds[acIdx],
          organizationId: orgId,
          applicable: true,
          applicabilityDeterminedById: techMap["CAMG-003"],
          applicabilityDeterminationDate: M3 + 7 * DAY,
          complianceStatus: status as "not_complied" | "complied_one_time" | "complied_recurring" | "pending_determination",
          complianceHistory: isComplied
            ? [{
                complianceDate: M2,
                aircraftHoursAtCompliance: ac.tt - 30,
                technicianId: techMap["CAMG-005"],
                maintenanceRecordId: closedWOIds[0] as unknown as Id<"maintenanceRecords">, // placeholder
                complianceMethodUsed: "Inspection per AD requirements",
              }]
            : [],
          lastComplianceDate: isComplied ? M2 : undefined,
          lastComplianceHours: isComplied ? ac.tt - 30 : undefined,
          nextDueDate: ad.recurDays ? M2 + ad.recurDays * DAY : undefined,
          nextDueHours: ad.recurHrs ? (ac.tt - 30) + ad.recurHrs : undefined,
          maintenanceRecordIds: [],
          createdAt: M3 + 7 * DAY,
          updatedAt: now,
        });
      }
    }

    // CRM Contacts
    const crmContactData = [
      { custIdx: 0, first: "Jeff", last: "Morrison", title: "Chief Pilot", role: "chief_pilot" as const, phone: "303-555-0111", email: "jeff.morrison@peakaviation.com" },
      { custIdx: 0, first: "Karen", last: "Phillips", title: "Maintenance Coordinator", role: "ap_manager" as const, phone: "303-555-0112", email: "karen.phillips@peakaviation.com" },
      { custIdx: 1, first: "Steve", last: "Rodriguez", title: "Director of Maintenance", role: "dom" as const, phone: "303-555-0121", email: "steve.rodriguez@frft.com" },
      { custIdx: 2, first: "Amy", last: "Liu", title: "Fleet Manager", role: "operations" as const, phone: "720-555-0211", email: "amy.liu@mwmedevac.com" },
      { custIdx: 2, first: "Robert", last: "Nash", title: "Medical Director", role: "other" as const, phone: "720-555-0212", email: "rnash@mwmedevac.com" },
      { custIdx: 3, first: "Michael", last: "Grant", title: "COO", role: "operations" as const, phone: "970-555-0311", email: "mgrant@aspenexecair.com" },
      { custIdx: 4, first: "Thomas", last: "Blackwell", title: "Owner/Pilot", role: "owner" as const, phone: "303-555-0401", email: "tblackwell@gmail.com" },
      { custIdx: 5, first: "Jennifer", last: "Hawk", title: "Aviation Division Chief", role: "operations" as const, phone: "303-555-0511", email: "jennifer.hawk@state.co.us" },
      { custIdx: 6, first: "Bobby", last: "Trujillo", title: "Operations Manager", role: "operations" as const, phone: "970-555-0611", email: "bobby@summitagservices.com" },
      { custIdx: 6, first: "Maria", last: "Trujillo", title: "Owner", role: "owner" as const, phone: "970-555-0612", email: "maria@summitagservices.com" },
    ];
    for (const contact of crmContactData) {
      await ctx.db.insert("crmContacts", {
        customerId: customerIds[contact.custIdx],
        organizationId: orgId,
        firstName: contact.first,
        lastName: contact.last,
        title: contact.title,
        role: contact.role,
        phone: contact.phone,
        email: contact.email,
        isPrimary: crmContactData.filter(c => c.custIdx === contact.custIdx)[0] === contact,
        active: true,
        createdAt: M3,
        updatedAt: M3,
      });
    }

    // CRM Interactions
    const interactionTypes = ["phone_call", "email", "meeting"] as const;
    for (let i = 0; i < 15; i++) {
      const daysAgo = 85 - i * 5;
      await ctx.db.insert("crmInteractions", {
        customerId: customerIds[i % customerIds.length],
        organizationId: orgId,
        type: interactionTypes[i % 3],
        subject: `${interactionTypes[i % 3] === "phone_call" ? "Call" : interactionTypes[i % 3] === "email" ? "Email" : "Meeting"} regarding maintenance scheduling`,
        description: "Discussed upcoming maintenance needs and scheduling availability.",
        interactionDate: now - daysAgo * DAY,
        createdByUserId: args.clerkUserId,
        createdByName: "James Harwick",
        createdAt: now - daysAgo * DAY,
      });
    }

    // Training Records
    const trainingCourses = [
      { name: "FAA Part 145 Annual Refresher", type: "recurrent" as const, provider: "FAA Safety Team" },
      { name: "Hazmat Awareness Training", type: "hazmat" as const, provider: "IATA Training" },
      { name: "PT6A Engine Familiarization", type: "oem" as const, provider: "Pratt & Whitney Canada" },
      { name: "Human Factors in Aviation Maintenance", type: "safety" as const, provider: "FAA Safety Team" },
    ];
    for (const tech of TECHNICIAN_SEED) {
      if (!tech.hasCert) continue;
      for (const [ci, course] of trainingCourses.entries()) {
        const completedAt = M3 + ci * 15 * DAY;
        const expiresAt = completedAt + 365 * DAY;
        await ctx.db.insert("trainingRecords", {
          organizationId: orgId,
          technicianId: techMap[tech.employeeId],
          courseName: course.name,
          courseType: course.type,
          provider: course.provider,
          completedAt,
          expiresAt,
          status: expiresAt > now ? "current" : "expired",
          createdAt: completedAt,
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 7: Financial Records
    // ══════════════════════════════════════════════════════════════════════

    // Invoices for closed WOs
    const invoiceData = CLOSED_WO_SEED.map((wo, idx) => {
      const ac = AIRCRAFT_SEED[wo.aircraftIndex];
      const laborTotal = wo.laborHours * 95;
      const partsTotal = wo.partsTotal;
      const subtotal = laborTotal + partsTotal;
      const tax = partsTotal * 0.039; // Only parts are taxed
      const total = subtotal + tax;
      const closedAt = now - wo.daysAgo * DAY + wo.durationDays * DAY;
      const dueDate = closedAt + 30 * DAY;

      // Determine invoice status
      let status: "PAID" | "SENT" | "PARTIAL";
      let amountPaid: number;
      if (idx < 8) {
        status = "PAID"; amountPaid = total;
      } else if (idx < 13) {
        status = "SENT"; amountPaid = 0;
      } else {
        status = "SENT"; amountPaid = 0; // overdue
      }

      return {
        woIdx: idx,
        customerIdx: ac.customerIndex,
        invoiceNum: `CAMG-INV-${String(idx + 1).padStart(4, "0")}`,
        status,
        laborTotal,
        partsTotal,
        subtotal,
        tax,
        total,
        amountPaid,
        balance: total - amountPaid,
        closedAt,
        dueDate,
      };
    });

    for (const inv of invoiceData) {
      const invId = await ctx.db.insert("invoices", {
        orgId: orgId,
        workOrderId: closedWOIds[inv.woIdx],
        customerId: customerIds[inv.customerIdx],
        invoiceNumber: inv.invoiceNum,
        status: inv.status,
        createdByTechId: techMap["CAMG-004"],
        sentAt: inv.closedAt + DAY,
        paidAt: inv.status === "PAID" ? inv.closedAt + 15 * DAY : undefined,
        laborTotal: inv.laborTotal,
        partsTotal: inv.partsTotal,
        subtotal: inv.subtotal,
        tax: inv.tax,
        total: inv.total,
        taxRatePercent: 3.9,
        amountPaid: inv.amountPaid,
        balance: inv.balance,
        dueDate: inv.dueDate,
        paymentTerms: "Net 30",
        createdAt: inv.closedAt,
        updatedAt: inv.status === "PAID" ? inv.closedAt + 15 * DAY : now,
      });

      // Invoice line items
      await ctx.db.insert("invoiceLineItems", {
        orgId: orgId,
        invoiceId: invId,
        type: "labor",
        description: `Labor — ${CLOSED_WO_SEED[inv.woIdx].description}`,
        qty: CLOSED_WO_SEED[inv.woIdx].laborHours,
        unitPrice: 95,
        total: inv.laborTotal,
        createdAt: inv.closedAt,
        updatedAt: inv.closedAt,
      });
      await ctx.db.insert("invoiceLineItems", {
        orgId: orgId,
        invoiceId: invId,
        type: "part",
        description: "Parts and materials",
        qty: 1,
        unitPrice: inv.partsTotal,
        total: inv.partsTotal,
        createdAt: inv.closedAt,
        updatedAt: inv.closedAt,
      });

      // Payments for paid invoices
      if (inv.status === "PAID") {
        await ctx.db.insert("payments", {
          orgId: orgId,
          invoiceId: invId,
          amount: inv.total,
          method: inv.woIdx % 3 === 0 ? "check" : inv.woIdx % 3 === 1 ? "wire" : "ach",
          recordedAt: inv.closedAt + 15 * DAY,
          recordedByTechId: techMap["CAMG-004"],
          referenceNumber: `PAY-${String(inv.woIdx + 1).padStart(4, "0")}`,
          createdAt: inv.closedAt + 15 * DAY,
        });
      }
    }

    // Notifications
    const notificationData = [
      { type: "wo_status_change" as const, title: "Work Order Completed", message: "WO-2025-1005 has been closed and returned to service.", daysAgo: 5 },
      { type: "invoice_paid" as const, title: "Payment Received", message: "Payment of $5,230.00 received for CAMG-INV-0008.", daysAgo: 3 },
      { type: "part_received" as const, title: "Parts Received", message: "Oil filter elements received from Aviall (PO-2026-0012).", daysAgo: 2 },
      { type: "invoice_overdue" as const, title: "Invoice Overdue", message: "CAMG-INV-0014 is 15 days past due. Balance: $1,627.30.", daysAgo: 1 },
      { type: "discrepancy_critical" as const, title: "New Discrepancy Found", message: "Critical discrepancy found on N341PA during Phase 3 inspection.", daysAgo: 0 },
      { type: "system" as const, title: "Certificate Expiry Warning", message: "David Kowalski's IA authorization expires in 8 days.", daysAgo: 0 },
      { type: "rts_ready" as const, title: "Aircraft Ready for RTS", message: "N208CD is pending final inspection for return to service.", daysAgo: 0 },
      { type: "assignment" as const, title: "New Task Assignment", message: "You have been assigned to WO-2026-0106 (N350AE intake squawk).", daysAgo: 0 },
    ];
    for (const notif of notificationData) {
      await ctx.db.insert("notifications", {
        organizationId: orgId,
        recipientUserId: args.clerkUserId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: notif.daysAgo > 1,
        createdAt: now - notif.daysAgo * DAY,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // Return summary
    // ══════════════════════════════════════════════════════════════════════
    return {
      orgId,
      stats: {
        organization: 1,
        shopLocations: 2,
        technicians: 10,
        certificates: Object.keys(certMap).length,
        customers: customerIds.length,
        aircraft: aircraftIds.length,
        engines: engineIds.length,
        propellers: PROPELLER_SEED.length,
        vendors: vendorIds.length,
        hangarBays: hangarBayIds.length,
        testEquipment: testEquipIds.length,
        parts: partIds.length,
        closedWorkOrders: closedWOIds.length,
        activeWorkOrders: activeWOIds.length,
        futureWorkOrders: FUTURE_WO_SEED.length,
        quotes: FUTURE_WO_SEED.length,
        airworthinessDirectives: adIds.length,
        invoices: invoiceData.length,
        signatureAuthEvents: authEventCounter,
      },
    };
  },
});

// ─── Verification Query ──────────────────────────────────────────────────────

export const verifySeedComprehensive = query({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "Colorado Aviation Maintenance Group"))
      .first();

    if (!org) return { seeded: false, message: "Seed not found" };

    const counts: Record<string, number> = {};
    const tables = [
      "organizations", "shopLocations", "technicians", "certificates",
      "customers", "aircraft", "engines", "propellers", "vendors",
      "hangarBays", "testEquipment", "parts", "workOrders", "taskCards",
      "taskCardSteps", "discrepancies", "maintenanceRecords", "inspectionRecords",
      "returnToService", "qcmReviews", "signatureAuthEvents", "timeEntries",
      "scheduleAssignments", "quotes", "quoteLineItems", "invoices",
      "invoiceLineItems", "payments", "airworthinessDirectives", "adCompliance",
      "notifications", "trainingRecords", "toolRecords", "rotables", "loanerItems",
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      counts[table] = rows.length;
    }

    const woByStatus: Record<string, number> = {};
    const wos = await ctx.db.query("workOrders").collect();
    for (const wo of wos) {
      woByStatus[wo.status] = (woByStatus[wo.status] ?? 0) + 1;
    }

    return {
      seeded: true,
      orgId: org._id,
      orgName: org.name,
      tableCounts: counts,
      workOrdersByStatus: woByStatus,
      totalRecords: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  },
});
