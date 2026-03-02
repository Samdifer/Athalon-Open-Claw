import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SCENARIO_KEY = "ATHELON-DEMO-KA-TBM-2LOC";
const BASE_ANCHOR_MS = Date.UTC(2026, 0, 5, 14, 0, 0);

const REQUIRED_COUNTS = {
  locations: 2,
  hangarBays: 8,
  technicians: 10,
  aircraft: 12,
  engines: 20,
  propellers: 20,
  workOrders: 30,
  scheduleAssignments: 30,
  taskCards: 90,
  vendors: 8,
  parts: 60,
  toolRecords: 40,
  rotables: 8,
  loanerItems: 4,
  quotes: 10,
};

const LOCATION_SEED = [
  {
    code: "DEN",
    name: "Denver Main Repair Base",
    city: "Denver",
    state: "CO",
    address: "12800 E 39th Ave",
    certificateNumber: "D3NR145A",
    isPrimary: true,
  },
  {
    code: "COS",
    name: "Colorado Springs Line Station",
    city: "Colorado Springs",
    state: "CO",
    address: "7776 Milton E Proby Pkwy",
    certificateNumber: "C0S145B",
    isPrimary: false,
  },
] as const;

const TECHNICIAN_SEED = [
  { employeeId: "KA-TBM-TECH-001", legalName: "Evan Harrow", role: "admin", locationCode: "DEN" },
  { employeeId: "KA-TBM-TECH-002", legalName: "Rosa Eaton", role: "qcm_inspector", locationCode: "DEN" },
  { employeeId: "KA-TBM-TECH-003", legalName: "Danny Osei", role: "lead_technician", locationCode: "DEN" },
  { employeeId: "KA-TBM-TECH-004", legalName: "Priya Nair", role: "technician", locationCode: "DEN" },
  { employeeId: "KA-TBM-TECH-005", legalName: "Marcus Webb", role: "technician", locationCode: "DEN" },
  { employeeId: "KA-TBM-TECH-006", legalName: "Kai Morgan", role: "lead_technician", locationCode: "COS" },
  { employeeId: "KA-TBM-TECH-007", legalName: "Amina Patel", role: "technician", locationCode: "COS" },
  { employeeId: "KA-TBM-TECH-008", legalName: "Jared Bell", role: "technician", locationCode: "COS" },
  { employeeId: "KA-TBM-TECH-009", legalName: "Nora Singh", role: "parts_clerk", locationCode: "COS" },
  { employeeId: "KA-TBM-TECH-010", legalName: "Maya Cortez", role: "billing_manager", locationCode: "COS" },
] as const;

const AIRCRAFT_SEED = [
  { tail: "N2KA01", make: "Beechcraft", model: "King Air B200", serial: "BB-2201", engineCount: 2, tt: 7420 },
  { tail: "N2KA02", make: "Beechcraft", model: "King Air 250", serial: "BY-4402", engineCount: 2, tt: 6941 },
  { tail: "N2KA03", make: "Beechcraft", model: "King Air 350i", serial: "FL-5603", engineCount: 2, tt: 8895 },
  { tail: "N2KA04", make: "Beechcraft", model: "King Air C90GTx", serial: "LJ-7104", engineCount: 2, tt: 5311 },
  { tail: "N2KA05", make: "Beechcraft", model: "King Air 200", serial: "BB-1805", engineCount: 2, tt: 10342 },
  { tail: "N2KA06", make: "Beechcraft", model: "King Air 260", serial: "BY-9206", engineCount: 2, tt: 4189 },
  { tail: "N2KA07", make: "Beechcraft", model: "King Air 350", serial: "FL-3007", engineCount: 2, tt: 11740 },
  { tail: "N2KA08", make: "Beechcraft", model: "King Air B200GT", serial: "BB-8808", engineCount: 2, tt: 6588 },
  { tail: "N9TB01", make: "Daher", model: "TBM 930", serial: "1298", engineCount: 1, tt: 2210 },
  { tail: "N9TB02", make: "Daher", model: "TBM 940", serial: "1376", engineCount: 1, tt: 1842 },
  { tail: "N9TB03", make: "Daher", model: "TBM 960", serial: "1431", engineCount: 1, tt: 1322 },
  { tail: "N9TB04", make: "Daher", model: "TBM 910", serial: "1189", engineCount: 1, tt: 2899 },
] as const;

const VENDOR_SEED = [
  "Textron Aviation Parts",
  "Daher Aircraft Services",
  "Pratt & Whitney Customer First",
  "Hartzell Propeller",
  "Collins Aerospace",
  "StandardAero",
  "AeroCal Labs",
  "Aviation Supply Depot",
] as const;

const CUSTOMER_SEED = [
  "Front Range Charter",
  "Rocky Mountain Medevac",
  "Summit Corporate Aviation",
  "Pikes Peak Air Taxi",
  "Plains Surveillance LLC",
  "Western Utility Air",
] as const;

const WORK_ORDER_STATUS_MIX = [
  "in_progress", "open", "in_progress", "open", "in_progress",
  "open", "on_hold", "in_progress", "open", "in_progress",
  "pending_signoff", "open", "in_progress", "open", "on_hold",
  "in_progress", "open", "in_progress", "open", "in_progress",
  "open", "on_hold", "in_progress", "open", "pending_signoff",
  "in_progress", "open", "in_progress", "open", "on_hold",
] as const;

const TASK_TITLES = [
  "Phase inspection and incoming checks",
  "Discrepancy repair and ops check",
  "Final inspection readiness and closeout",
] as const;

type PartFamily =
  | "consumables_hardware"
  | "powerplant_service"
  | "airframe_brake_env"
  | "avionics_electrical";

type PartLocation =
  | "pending_inspection"
  | "inventory"
  | "installed"
  | "removed_pending_disposition"
  | "quarantine"
  | "scrapped"
  | "returned_to_vendor";

type PartCondition =
  | "new"
  | "serviceable"
  | "overhauled"
  | "repaired"
  | "unserviceable"
  | "quarantine"
  | "scrapped";

type PartSeedTemplate = {
  partNumber: string;
  partName: string;
  description: string;
  family: PartFamily;
  locationCode: "DEN" | "COS";
  location: PartLocation;
  condition: PartCondition;
  isSerialized: boolean;
  serialNumber?: string;
  isLifeLimited: boolean;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;
  hasShelfLifeLimit: boolean;
  shelfLifeOffsetDays?: number;
  isOwnerSupplied: boolean;
  supplier: string;
  minStockLevel?: number;
  reorderPoint?: number;
  edgeTags: string[];
};

type ToolTemplate = {
  description: string;
  category: "hand_tool" | "power_tool" | "test_equipment" | "special_tooling" | "consumable";
  calibrationRequired: boolean;
  intervalDays: number;
};

const TOOL_CATALOG: ToolTemplate[] = [
  { description: 'Snap-on ATECH3FR100 Torque Wrench 1/4"', category: "hand_tool", calibrationRequired: true, intervalDays: 180 },
  { description: 'CDI 2503MFRMH Torque Wrench 3/8"', category: "hand_tool", calibrationRequired: true, intervalDays: 180 },
  { description: 'Snap-on ATECH3FR250 Torque Wrench 1/2"', category: "special_tooling", calibrationRequired: true, intervalDays: 180 },
  { description: 'Mitutoyo Digital Caliper 6"', category: "hand_tool", calibrationRequired: true, intervalDays: 365 },
  { description: 'Mitutoyo Vernier Caliper 12"', category: "hand_tool", calibrationRequired: true, intervalDays: 365 },
  { description: 'Mitutoyo Micrometer Set 0-3"', category: "hand_tool", calibrationRequired: true, intervalDays: 365 },
  { description: "Dial Indicator with Magnetic Base", category: "hand_tool", calibrationRequired: true, intervalDays: 365 },
  { description: 'Milbar Safety Wire Pliers 9"', category: "hand_tool", calibrationRequired: false, intervalDays: 0 },
  { description: "Chicago Pneumatic 3X Rivet Gun Set", category: "power_tool", calibrationRequired: false, intervalDays: 0 },
  { description: "Sioux Right-Angle Drill Motor", category: "power_tool", calibrationRequired: false, intervalDays: 0 },
  { description: "Fluke 87V Multimeter", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Fluke 376 FC Clamp Meter", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Megger MIT415 Insulation Resistance Tester", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Differential Compression Tester (PT6)", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Olympus IPLEX NX Borescope", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "DSA-202 Propeller Balance Analyzer", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Barfield DPS1000 Pitot-Static Test Set", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Barfield 2312G Transponder Tester", category: "test_equipment", calibrationRequired: true, intervalDays: 365 },
  { description: "Fuel Nozzle Flow Test Bench", category: "special_tooling", calibrationRequired: true, intervalDays: 365 },
  { description: "King Air Wing Jack Set P/N 50-8103", category: "special_tooling", calibrationRequired: false, intervalDays: 0 },
];

const CONSUMABLE_CATALOG = [
  ["KA-TBM-CNS-001", "Hydraulic Fluid MIL-PRF-5606", "Hydraulic service fluid for PT6 platforms"],
  ["KA-TBM-CNS-002", "AeroShell Turbine Oil 560", "Engine oil for PT6A operations"],
  ["KA-TBM-CNS-003", "PR-1422 B2 Fuel Tank Sealant", "Two-part sealant for wet wing repairs"],
  ["KA-TBM-CNS-004", "EA 9394 Structural Adhesive", "Epoxy adhesive for bonded structures"],
  ["KA-TBM-CNS-005", "AN960-416 Washer", "Standard flat washer 1/4 inch"],
  ["KA-TBM-CNS-006", "MS21044N4 Self-Locking Nut", "Self-locking nut for structural installs"],
  ["KA-TBM-CNS-007", "NAS1149F0463P Washer", "Stainless flat washer"],
  ["KA-TBM-CNS-008", "MS24665-132 Cotter Pin", "Cotter pin for castellated nuts"],
  ["KA-TBM-CNS-009", "CH48108-1 Fuel Filter Element", "Fuel filter consumable"],
  ["KA-TBM-CNS-010", "CH48110-1 Oil Filter Element", "Oil filter consumable"],
  ["KA-TBM-CNS-011", "Cleveland Brake Lining Set", "Brake lining consumable set"],
  ["KA-TBM-CNS-012", "Skydrol-Compatible O-Ring Kit", "Hydraulic O-ring service kit"],
  ["KA-TBM-CNS-013", "Corrosion Inhibitor Compound", "Corrosion prevention spray"],
  ["KA-TBM-CNS-014", "Safety Wire .032 Stainless", "Lockwire for fastener securing"],
  ["KA-TBM-CNS-015", "Safety Wire .041 Stainless", "Lockwire for prop governor hardware"],
  ["KA-TBM-CNS-016", "Masking Tape 3M 471", "Surface prep masking tape"],
  ["KA-TBM-CNS-017", "MS29513-012 O-Ring", "Landing gear seal O-ring"],
  ["KA-TBM-CNS-018", "MS29513-013 O-Ring", "Hydraulic fitting seal O-ring"],
] as const;

const POWERPLANT_CATALOG = [
  ["KA-TBM-PWR-001", "PT6A Fuel Nozzle", "Fuel nozzle assembly for PT6A engines"],
  ["KA-TBM-PWR-002", "PT6A Igniter Plug", "Ignition plug for PT6 combustor"],
  ["KA-TBM-PWR-003", "PT6A Compressor Turbine Blade", "Serialized LLP blade segment"],
  ["KA-TBM-PWR-004", "PT6A Power Turbine Blade", "Serialized LLP blade segment"],
  ["KA-TBM-PWR-005", "PT6A FCU Assembly", "Fuel control unit assembly"],
  ["KA-TBM-PWR-006", "PT6A Starter Generator", "Engine starter-generator"],
  ["KA-TBM-PWR-007", "PT6A Oil Pump", "Engine oil pressure pump"],
  ["KA-TBM-PWR-008", "PT6A Bleed Valve", "Compressor bleed valve"],
  ["KA-TBM-PWR-009", "PT6A Torque Sensor", "Engine torque transducer"],
  ["KA-TBM-PWR-010", "PT6A Exhaust Duct Segment", "Exhaust duct section"],
  ["KA-TBM-PWR-011", "PT6A Fuel Pump", "Engine-driven fuel pump"],
  ["KA-TBM-PWR-012", "PT6A Prop Governor", "Propeller governor unit"],
] as const;

const AIRFRAME_CATALOG = [
  ["KA-TBM-AFM-001", "Main Gear Actuator Seal Kit", "Landing gear actuator overhaul kit"],
  ["KA-TBM-AFM-002", "Nose Gear Steering Bushing", "Nose steering bushing set"],
  ["KA-TBM-AFM-003", "King Air Door Latch Assy", "Cabin door latch assembly"],
  ["KA-TBM-AFM-004", "TBM Cabin Pressure Valve", "Pressurization outflow valve"],
  ["KA-TBM-AFM-005", "Deice Boot Patch Kit", "Pneumatic boot repair kit"],
  ["KA-TBM-AFM-006", "Brake Disc Assembly", "Main wheel brake disc"],
  ["KA-TBM-AFM-007", "Wheel Speed Transducer", "Anti-skid wheel speed transducer"],
  ["KA-TBM-AFM-008", "Aileron Balance Weight", "Flight control balance weight"],
  ["KA-TBM-AFM-009", "Rudder Trim Actuator", "Yaw trim actuator"],
  ["KA-TBM-AFM-010", "Environmental Control Valve", "Environmental flow control valve"],
] as const;

const AVIONICS_CATALOG = [
  ["KA-TBM-AVX-001", "ADC Module", "Air data computer module"],
  ["KA-TBM-AVX-002", "AHRS Unit", "Attitude and heading reference system"],
  ["KA-TBM-AVX-003", "GTN Nav/Com Unit", "Integrated navigation and communication unit"],
  ["KA-TBM-AVX-004", "Transponder LRU", "Mode S transponder line replaceable unit"],
  ["KA-TBM-AVX-005", "Autopilot Servo", "Pitch autopilot servo"],
  ["KA-TBM-AVX-006", "Radar Altimeter Processor", "Radio altimeter processor"],
  ["KA-TBM-AVX-007", "Emergency Battery Pack", "Emergency avionics battery module"],
  ["KA-TBM-AVX-008", "Static Inverter", "Static inverter electrical supply unit"],
] as const;

function keyWithSerial(partNumber: string, serialNumber?: string) {
  return `${partNumber}::${serialNumber ?? ""}`;
}

function quoteStatusForIndex(index: number) {
  const statuses = ["APPROVED", "SENT", "DRAFT", "APPROVED", "SENT"] as const;
  return statuses[index % statuses.length];
}

function makeWorkOrderType(index: number):
  | "routine"
  | "unscheduled"
  | "annual_inspection"
  | "100hr_inspection"
  | "ad_compliance" {
  const types = ["routine", "unscheduled", "annual_inspection", "100hr_inspection", "ad_compliance"] as const;
  return types[index % types.length];
}

function makePriority(index: number): "routine" | "urgent" | "aog" {
  if (index % 11 === 0) return "aog";
  if (index % 5 === 0) return "urgent";
  return "routine";
}

function technicianEmployeeKey(index: number) {
  return `KA-TBM-TECH-${String(index).padStart(3, "0")}`;
}

function buildPartTemplates(): PartSeedTemplate[] {
  const templates: PartSeedTemplate[] = [];

  for (const [index, row] of CONSUMABLE_CATALOG.entries()) {
    templates.push({
      partNumber: row[0],
      partName: row[1],
      description: row[2],
      family: "consumables_hardware",
      locationCode: index % 2 === 0 ? "DEN" : "COS",
      location: "inventory",
      condition: "new",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: index < 8,
      shelfLifeOffsetDays: index < 8 ? 240 - index * 8 : undefined,
      isOwnerSupplied: false,
      supplier: VENDOR_SEED[index % VENDOR_SEED.length],
      minStockLevel: index < 4 ? 20 : undefined,
      reorderPoint: index < 4 ? 24 : undefined,
      edgeTags: index < 4 ? ["low_stock"] : [],
    });
  }

  for (const [index, row] of POWERPLANT_CATALOG.entries()) {
    const isSerialized = index !== 9 && index !== 10;
    const lifeLimited = index < 6;
    templates.push({
      partNumber: row[0],
      partName: row[1],
      description: row[2],
      family: "powerplant_service",
      locationCode: index % 2 === 0 ? "DEN" : "COS",
      location: "inventory",
      condition: lifeLimited ? "serviceable" : "overhauled",
      isSerialized,
      serialNumber: isSerialized ? `PWR-SN-${String(7100 + index)}` : undefined,
      isLifeLimited: lifeLimited,
      lifeLimitHours: lifeLimited ? 6000 + index * 120 : undefined,
      hoursAccumulatedBeforeInstall: lifeLimited ? 2200 + index * 180 : undefined,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: index % 2 === 0 ? "Pratt & Whitney Customer First" : "StandardAero",
      edgeTags: [],
    });
  }

  for (const [index, row] of AIRFRAME_CATALOG.entries()) {
    const isSerialized = index % 2 === 0;
    templates.push({
      partNumber: row[0],
      partName: row[1],
      description: row[2],
      family: "airframe_brake_env",
      locationCode: index % 2 === 0 ? "DEN" : "COS",
      location: "inventory",
      condition: index < 3 ? "serviceable" : "new",
      isSerialized,
      serialNumber: isSerialized ? `AFM-SN-${String(8100 + index)}` : undefined,
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: index % 2 === 0 ? "Textron Aviation Parts" : "Aviation Supply Depot",
      minStockLevel: index < 2 ? 4 : undefined,
      reorderPoint: index < 2 ? 5 : undefined,
      edgeTags: index < 2 ? ["low_stock"] : [],
    });
  }

  for (const [index, row] of AVIONICS_CATALOG.entries()) {
    const isSerialized = true;
    templates.push({
      partNumber: row[0],
      partName: row[1],
      description: row[2],
      family: "avionics_electrical",
      locationCode: index % 2 === 0 ? "DEN" : "COS",
      location: "inventory",
      condition: index < 3 ? "overhauled" : "serviceable",
      isSerialized,
      serialNumber: `AVX-SN-${String(9100 + index)}`,
      isLifeLimited: false,
      hasShelfLifeLimit: index === 6,
      shelfLifeOffsetDays: index === 6 ? 180 : undefined,
      isOwnerSupplied: false,
      supplier: "Collins Aerospace",
      edgeTags: [],
    });
  }

  const basePending = new Set([5, 17]);
  const baseQuarantine = new Set([11, 23]);
  const baseRemoved = new Set([7, 31]);
  const baseInstalled = new Set([2, 14, 28, 41]);

  for (const [idx, template] of templates.entries()) {
    if (basePending.has(idx)) {
      template.location = "pending_inspection";
      template.edgeTags.push("pending_receiving_inspection");
    } else if (baseQuarantine.has(idx)) {
      template.location = "quarantine";
      template.condition = "quarantine";
      template.edgeTags.push("quarantine_hold");
    } else if (baseRemoved.has(idx)) {
      template.location = "removed_pending_disposition";
      template.condition = "unserviceable";
      template.edgeTags.push("removed_pending_disposition");
    } else if (baseInstalled.has(idx)) {
      template.location = "installed";
      template.condition = "serviceable";
      template.edgeTags.push("installed");
    }
  }

  const edgeTemplates: PartSeedTemplate[] = [
    {
      partNumber: "KA-TBM-EDGE-001",
      partName: "Owner-Supplied PT6A Fuel Nozzle",
      description: "Owner supplied serialized fuel nozzle awaiting receiving signoff",
      family: "powerplant_service",
      locationCode: "DEN",
      location: "pending_inspection",
      condition: "new",
      isSerialized: true,
      serialNumber: "EDGE-OSP-001",
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: true,
      supplier: "Pratt & Whitney Customer First",
      edgeTags: ["owner_supplied", "pending_receiving_inspection"],
    },
    {
      partNumber: "KA-TBM-EDGE-002",
      partName: "Owner-Supplied ADC Module",
      description: "Owner supplied avionics LRU pending intake inspection",
      family: "avionics_electrical",
      locationCode: "COS",
      location: "pending_inspection",
      condition: "new",
      isSerialized: true,
      serialNumber: "EDGE-OSP-002",
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: true,
      supplier: "Collins Aerospace",
      edgeTags: ["owner_supplied", "pending_receiving_inspection"],
    },
    {
      partNumber: "KA-TBM-EDGE-003",
      partName: "PT6A Compressor Turbine Wheel (Expired)",
      description: "Life-limited powerplant part exceeding hour limit",
      family: "powerplant_service",
      locationCode: "DEN",
      location: "quarantine",
      condition: "quarantine",
      isSerialized: true,
      serialNumber: "EDGE-LLP-EXP-001",
      isLifeLimited: true,
      lifeLimitHours: 3600,
      hoursAccumulatedBeforeInstall: 3660,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Pratt & Whitney Customer First",
      edgeTags: ["life_expired", "quarantine_hold"],
    },
    {
      partNumber: "KA-TBM-EDGE-004",
      partName: "Fuel Tank Sealant Kit (Expired Shelf Life)",
      description: "Shelf-life consumable expired in stores",
      family: "consumables_hardware",
      locationCode: "COS",
      location: "quarantine",
      condition: "quarantine",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: true,
      shelfLifeOffsetDays: -10,
      isOwnerSupplied: false,
      supplier: "Aviation Supply Depot",
      edgeTags: ["expired_shelf_life", "quarantine_hold"],
    },
    {
      partNumber: "KA-TBM-EDGE-005",
      partName: "Brake Disc Removed For Disposition",
      description: "Removed disc pending disposition routing",
      family: "airframe_brake_env",
      locationCode: "DEN",
      location: "removed_pending_disposition",
      condition: "unserviceable",
      isSerialized: true,
      serialNumber: "EDGE-RPD-001",
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Textron Aviation Parts",
      edgeTags: ["removed_pending_disposition"],
    },
    {
      partNumber: "KA-TBM-EDGE-006",
      partName: "Transponder LRU Removed For Disposition",
      description: "Removed avionics unit pending repair disposition",
      family: "avionics_electrical",
      locationCode: "COS",
      location: "removed_pending_disposition",
      condition: "unserviceable",
      isSerialized: true,
      serialNumber: "EDGE-RPD-002",
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Collins Aerospace",
      edgeTags: ["removed_pending_disposition"],
    },
    {
      partNumber: "KA-TBM-EDGE-007",
      partName: "PT6A Turbine Blade LLP (Near Limit)",
      description: "Installed LLP with <10% life remaining",
      family: "powerplant_service",
      locationCode: "DEN",
      location: "installed",
      condition: "serviceable",
      isSerialized: true,
      serialNumber: "EDGE-NLL-001",
      isLifeLimited: true,
      lifeLimitHours: 6000,
      hoursAccumulatedBeforeInstall: 5580,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Pratt & Whitney Customer First",
      edgeTags: ["near_life_limit", "installed"],
    },
    {
      partNumber: "KA-TBM-EDGE-008",
      partName: "Propeller Hub LLP (Near Cycle Limit)",
      description: "Installed LLP with <10% cycles remaining",
      family: "powerplant_service",
      locationCode: "COS",
      location: "installed",
      condition: "serviceable",
      isSerialized: true,
      serialNumber: "EDGE-NLL-002",
      isLifeLimited: true,
      lifeLimitCycles: 12000,
      cyclesAccumulatedBeforeInstall: 11220,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Hartzell Propeller",
      edgeTags: ["near_life_limit", "installed"],
    },
    {
      partNumber: "KA-TBM-EDGE-009",
      partName: "Adhesive Cartridge (Expired)",
      description: "Expired shelf-life adhesive in quarantine",
      family: "consumables_hardware",
      locationCode: "DEN",
      location: "quarantine",
      condition: "quarantine",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: true,
      shelfLifeOffsetDays: -45,
      isOwnerSupplied: false,
      supplier: "Aviation Supply Depot",
      edgeTags: ["expired_shelf_life", "quarantine_hold"],
    },
    {
      partNumber: "KA-TBM-EDGE-010",
      partName: "Starter Generator Pending Inspection",
      description: "Incoming serialized rotable candidate pending receiving inspection",
      family: "powerplant_service",
      locationCode: "COS",
      location: "pending_inspection",
      condition: "new",
      isSerialized: true,
      serialNumber: "EDGE-PND-001",
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "StandardAero",
      edgeTags: ["pending_receiving_inspection"],
    },
    {
      partNumber: "KA-TBM-EDGE-011",
      partName: "Removed Fuel Filter Pending Disposition",
      description: "Consumable removed during discrepancy troubleshooting",
      family: "consumables_hardware",
      locationCode: "DEN",
      location: "removed_pending_disposition",
      condition: "unserviceable",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Textron Aviation Parts",
      edgeTags: ["removed_pending_disposition"],
    },
    {
      partNumber: "KA-TBM-EDGE-012",
      partName: "Installed Environmental Control Valve",
      description: "Serviceable installed airframe component",
      family: "airframe_brake_env",
      locationCode: "COS",
      location: "installed",
      condition: "serviceable",
      isSerialized: true,
      serialNumber: "EDGE-INS-001",
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      supplier: "Textron Aviation Parts",
      edgeTags: ["installed"],
    },
  ];

  templates.push(...edgeTemplates);

  if (templates.length !== 60) {
    throw new Error(`Part template contract failure: expected 60 templates, found ${templates.length}`);
  }

  return templates;
}

function buildPartsUseCaseCoverage(parts: any[]) {
  const now = Date.now();

  const familyCounts = {
    consumables_hardware: 0,
    powerplant_service: 0,
    airframe_brake_env: 0,
    avionics_electrical: 0,
  };

  let lifeLimited = 0;
  let shelfLifeLimited = 0;
  let serialized = 0;
  let ownerSupplied = 0;
  let lowStock = 0;
  let pendingInspection = 0;
  let quarantine = 0;
  let removedPendingDisposition = 0;
  let installed = 0;
  let expiredShelfLife = 0;
  let nearLifeLimit = 0;
  let lifeExpiredInQuarantine = 0;
  let pendingWithoutInspection = 0;

  for (const part of parts) {
    const notes = String(part.notes ?? "");
    if (notes.includes("family:consumables_hardware")) familyCounts.consumables_hardware += 1;
    if (notes.includes("family:powerplant_service")) familyCounts.powerplant_service += 1;
    if (notes.includes("family:airframe_brake_env")) familyCounts.airframe_brake_env += 1;
    if (notes.includes("family:avionics_electrical")) familyCounts.avionics_electrical += 1;

    if (part.isLifeLimited) lifeLimited += 1;
    if (part.hasShelfLifeLimit) shelfLifeLimited += 1;
    if (part.isSerialized) serialized += 1;
    if (part.isOwnerSupplied) ownerSupplied += 1;
    if (part.reorderPoint != null && part.minStockLevel != null) lowStock += 1;

    if (part.location === "pending_inspection") pendingInspection += 1;
    if (part.location === "quarantine") quarantine += 1;
    if (part.location === "removed_pending_disposition") removedPendingDisposition += 1;
    if (part.location === "installed") installed += 1;

    if (part.hasShelfLifeLimit && part.shelfLifeLimitDate != null && part.shelfLifeLimitDate <= now) {
      expiredShelfLife += 1;
    }

    const hoursRemaining =
      part.isLifeLimited && part.lifeLimitHours != null && part.hoursAccumulatedBeforeInstall != null
        ? part.lifeLimitHours - part.hoursAccumulatedBeforeInstall
        : undefined;
    const cyclesRemaining =
      part.isLifeLimited && part.lifeLimitCycles != null && part.cyclesAccumulatedBeforeInstall != null
        ? part.lifeLimitCycles - part.cyclesAccumulatedBeforeInstall
        : undefined;

    const nearHours =
      hoursRemaining != null &&
      hoursRemaining > 0 &&
      part.lifeLimitHours != null &&
      hoursRemaining <= part.lifeLimitHours * 0.1;

    const nearCycles =
      cyclesRemaining != null &&
      cyclesRemaining > 0 &&
      part.lifeLimitCycles != null &&
      cyclesRemaining <= part.lifeLimitCycles * 0.1;

    if (nearHours || nearCycles) nearLifeLimit += 1;

    const expiredHours = hoursRemaining != null && hoursRemaining <= 0;
    const expiredCycles = cyclesRemaining != null && cyclesRemaining <= 0;
    if (part.location === "quarantine" && part.isLifeLimited && (expiredHours || expiredCycles)) {
      lifeExpiredInQuarantine += 1;
    }

    if (part.location === "pending_inspection" && part.receivingInspectedAt == null) {
      pendingWithoutInspection += 1;
    }
  }

  return {
    familyCounts,
    lifeLimited,
    shelfLifeLimited,
    serialized,
    ownerSupplied,
    lowStock,
    pendingInspection,
    quarantine,
    removedPendingDisposition,
    installed,
    expiredShelfLife,
    nearLifeLimit,
    lifeExpiredInQuarantine,
    pendingWithoutInspection,
  };
}

function engineModelForAircraft(aircraftModel: string) {
  if (aircraftModel.includes("TBM")) return "PT6A-66D";
  if (aircraftModel.includes("350")) return "PT6A-60A";
  if (aircraftModel.includes("260")) return "PT6A-52";
  if (aircraftModel.includes("250")) return "PT6A-52";
  return "PT6A-42";
}

function propellerModelForAircraft(aircraftModel: string) {
  if (aircraftModel.includes("TBM")) return "Hartzell HC-E5A-3A";
  if (aircraftModel.includes("350")) return "Hartzell HC-B4TN-3";
  return "Hartzell HC-B4TN-5";
}

export const seedKingAirTbmRepairStation = mutation({
  args: {
    clerkUserId: v.string(),
    scenarioKey: v.optional(v.string()),
    targetOrgMode: v.optional(v.union(v.literal("dedicated"), v.literal("reuse"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scenarioKey = args.scenarioKey?.trim() || DEFAULT_SCENARIO_KEY;
    const targetOrgMode = args.targetOrgMode ?? "dedicated";

    const existingOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), scenarioKey))
      .first();

    const orgId = existingOrg
      ? existingOrg._id
      : await ctx.db.insert("organizations", {
          name: scenarioKey,
          part145CertificateNumber: "ATHELON-145-KATBM",
          part145Ratings: ["Class A Airframe", "Class A Powerplant", "Avionics"],
          address: "1450 Hangar Loop",
          city: "Denver",
          state: "CO",
          zip: "80249",
          country: "USA",
          phone: "+1-303-555-0145",
          email: "ops@athelon-demo.local",
          subscriptionTier: "enterprise",
          active: true,
          createdAt: now,
          updatedAt: now,
        });

    if (existingOrg) {
      await ctx.db.patch(orgId, {
        active: true,
        updatedAt: now,
      });
    }

    const [existingLocations, existingBays, existingTechs, existingAircraft, existingWorkOrders] =
      await Promise.all([
        ctx.db.query("shopLocations").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("hangarBays").withIndex("by_org", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("technicians").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("aircraft").withIndex("by_organization", (q) => q.eq("operatingOrganizationId", orgId)).collect(),
        ctx.db.query("workOrders").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
      ]);

    const locationByCode = new Map(existingLocations.map((loc) => [loc.code, loc]));
    const bayByName = new Map(existingBays.map((bay) => [bay.name, bay]));
    const techByEmployeeId = new Map(
      existingTechs
        .filter((tech) => tech.employeeId)
        .map((tech) => [tech.employeeId as string, tech]),
    );
    const aircraftByTail = new Map(
      existingAircraft
        .filter((aircraft) => aircraft.currentRegistration)
        .map((aircraft) => [aircraft.currentRegistration as string, aircraft]),
    );
    const workOrderByNumber = new Map<string, Id<"workOrders">>(
      existingWorkOrders.map((wo) => [wo.workOrderNumber, wo._id]),
    );

    const customerRows = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const customerByName = new Map<string, any>(customerRows.map((c) => [c.name, c]));

    const vendorRows = await ctx.db
      .query("vendors")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const vendorByName = new Map<string, any>(vendorRows.map((vendor) => [vendor.name, vendor]));

    const partsRows = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const partByKey = new Map<string, any>(
      partsRows.map((part) => [keyWithSerial(part.partNumber, part.serialNumber), part]),
    );

    const toolRows = await ctx.db
      .query("toolRecords")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();
    const toolByNumber = new Map<string, any>(toolRows.map((tool) => [tool.toolNumber, tool]));

    const rotableRows = await ctx.db
      .query("rotables")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const rotableByKey = new Map<string, any>(
      rotableRows.map((row) => [keyWithSerial(row.partNumber, row.serialNumber), row]),
    );

    const loanerRows = await ctx.db
      .query("loanerItems")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const loanerByKey = new Map<string, any>(
      loanerRows.map((row) => [keyWithSerial(row.partNumber, row.serialNumber), row]),
    );

    const engineRows = await ctx.db
      .query("engines")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const engineBySerial = new Map<string, any>(engineRows.map((engine) => [engine.serialNumber, engine]));

    const propellerRows = await ctx.db
      .query("propellers")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const propellerByAircraftPosition = new Map<string, any>(
      propellerRows.map((propeller) => [`${String(propeller.aircraftId)}::${propeller.position}`, propeller]),
    );

    if (targetOrgMode === "dedicated") {
      const expectedAircraftTails = new Set<string>(
        AIRCRAFT_SEED.map((aircraft) => aircraft.tail),
      );
      for (const aircraftRow of existingAircraft) {
        const tailNumber = String(aircraftRow.currentRegistration ?? "");
        if (expectedAircraftTails.has(tailNumber)) continue;

        const linkedWorkOrders = existingWorkOrders.filter(
          (workOrder) => workOrder.aircraftId === aircraftRow._id,
        );
        for (const linkedWorkOrder of linkedWorkOrders) {
          const [linkedAssignments, linkedTaskCards, linkedQuotes] = await Promise.all([
            ctx.db
              .query("scheduleAssignments")
              .withIndex("by_org_wo", (q) =>
                q.eq("organizationId", orgId).eq("workOrderId", linkedWorkOrder._id),
              )
              .collect(),
            ctx.db
              .query("taskCards")
              .withIndex("by_work_order", (q) => q.eq("workOrderId", linkedWorkOrder._id))
              .collect(),
            ctx.db
              .query("quotes")
              .withIndex("by_work_order", (q) => q.eq("workOrderId", linkedWorkOrder._id))
              .collect(),
          ]);

          for (const assignment of linkedAssignments) {
            await ctx.db.delete(assignment._id);
          }
          for (const taskCard of linkedTaskCards) {
            await ctx.db.delete(taskCard._id);
          }

          for (const quote of linkedQuotes) {
            const quoteLineItems = await ctx.db
              .query("quoteLineItems")
              .withIndex("by_quote", (q) => q.eq("quoteId", quote._id))
              .collect();
            for (const lineItem of quoteLineItems) {
              await ctx.db.delete(lineItem._id);
            }
            await ctx.db.delete(quote._id);
          }

          await ctx.db.delete(linkedWorkOrder._id);
          workOrderByNumber.delete(linkedWorkOrder.workOrderNumber);
        }

        for (const engine of engineRows) {
          if (engine.currentAircraftId !== aircraftRow._id) continue;
          await ctx.db.delete(engine._id);
          engineBySerial.delete(engine.serialNumber);
        }

        for (const propeller of propellerRows) {
          if (propeller.aircraftId !== aircraftRow._id) continue;
          await ctx.db.delete(propeller._id);
          propellerByAircraftPosition.delete(
            `${String(propeller.aircraftId)}::${propeller.position}`,
          );
        }

        await ctx.db.delete(aircraftRow._id);
        aircraftByTail.delete(tailNumber);
      }
    }

    const quoteRows = await ctx.db
      .query("quotes")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const quoteByNumber = new Map<string, any>(quoteRows.map((quote) => [quote.quoteNumber, quote]));

    const assignmentRows = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();
    const assignmentByWorkOrder = new Map<string, any>(
      assignmentRows.map((row) => [String(row.workOrderId), row]),
    );

    const taskCardRows = await ctx.db
      .query("taskCards")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .collect();
    const taskCardByKey = new Map<string, any>(
      taskCardRows.map((card) => [keyWithSerial(String(card.workOrderId), card.taskCardNumber), card]),
    );

    const customerIds: Id<"customers">[] = [];
    for (const [index, customerName] of CUSTOMER_SEED.entries()) {
      const existing = customerByName.get(customerName);
      const payload = {
        organizationId: orgId,
        name: customerName,
        customerType: "company" as const,
        email: `ops+${index + 1}@katbm-demo.local`,
        phone: `+1-720-555-01${String(index + 10).padStart(2, "0")}`,
        active: true,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        customerIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("customers", {
          ...payload,
          createdAt: now,
        });
        customerIds.push(id);
        customerByName.set(customerName, { _id: id, ...payload, createdAt: now });
      }
    }

    const locationIdByCode: Record<string, Id<"shopLocations">> = {};
    for (const location of LOCATION_SEED) {
      const existing = locationByCode.get(location.code);
      const payload = {
        organizationId: orgId,
        name: location.name,
        code: location.code,
        address: location.address,
        city: location.city,
        state: location.state,
        zip: location.code === "DEN" ? "80249" : "80916",
        country: "USA",
        phone: "+1-303-555-1450",
        email: `${location.code.toLowerCase()}@athelon-demo.local`,
        certificateNumber: location.certificateNumber,
        certificateType: "part_145" as const,
        capabilities: ["King Air", "TBM", "Inspection", "AOG"],
        isActive: true,
        isPrimary: location.isPrimary,
        timezone: "America/Denver",
        notes: `Scenario ${scenarioKey}`,
        updatedAt: now,
      };

      const locationId = existing
        ? existing._id
        : await ctx.db.insert("shopLocations", {
            ...payload,
            createdAt: now,
          });

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      }

      locationIdByCode[location.code] = locationId;
    }

    const bayIdsByLocationCode: Record<string, Id<"hangarBays">[]> = {
      DEN: [],
      COS: [],
    };
    for (const location of LOCATION_SEED) {
      for (let i = 0; i < 4; i += 1) {
        const bayName = `${location.code}-BAY-${i + 1}`;
        const existing = bayByName.get(bayName);
        const payload = {
          organizationId: orgId,
          shopLocationId: locationIdByCode[location.code],
          name: bayName,
          description: `${location.name} bay ${i + 1}`,
          type: "hangar" as const,
          capacity: 1,
          status: "available" as const,
          currentAircraftId: undefined,
          currentWorkOrderId: undefined,
          updatedAt: now,
        };

        const bayId = existing
          ? existing._id
          : await ctx.db.insert("hangarBays", {
              ...payload,
              createdAt: now,
            });

        if (existing) {
          await ctx.db.patch(existing._id, payload);
        }

        bayIdsByLocationCode[location.code].push(bayId);
      }
    }

    const technicianIdsByEmployeeId: Record<string, Id<"technicians">> = {};
    for (const tech of TECHNICIAN_SEED) {
      const existing = techByEmployeeId.get(tech.employeeId);
      const payload = {
        organizationId: orgId,
        primaryShopLocationId: locationIdByCode[tech.locationCode],
        userId: tech.employeeId === "KA-TBM-TECH-001" ? args.clerkUserId : undefined,
        legalName: tech.legalName,
        employeeId: tech.employeeId,
        role: tech.role,
        status: "active" as const,
        email: `${tech.employeeId.toLowerCase()}@athelon-demo.local`,
        updatedAt: now,
      };

      const techId = existing
        ? existing._id
        : await ctx.db.insert("technicians", {
            ...payload,
            createdAt: now,
          });

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      }

      technicianIdsByEmployeeId[tech.employeeId] = techId;
    }

    await ctx.db.patch(orgId, {
      directorOfMaintenanceId: technicianIdsByEmployeeId["KA-TBM-TECH-001"],
      directorOfMaintenanceName: "Evan Harrow",
      qualityControlManagerId: technicianIdsByEmployeeId["KA-TBM-TECH-002"],
      qualityControlManagerName: "Rosa Eaton",
      updatedAt: now,
    });

    const aircraftIdsByTail: Record<string, Id<"aircraft">> = {};
    for (const [index, aircraftSeed] of AIRCRAFT_SEED.entries()) {
      const existing = aircraftByTail.get(aircraftSeed.tail);
      const payload = {
        operatingOrganizationId: orgId,
        make: aircraftSeed.make,
        model: aircraftSeed.model,
        serialNumber: aircraftSeed.serial,
        currentRegistration: aircraftSeed.tail,
        totalTimeAirframeHours: aircraftSeed.tt,
        totalTimeAirframeAsOfDate: BASE_ANCHOR_MS,
        engineCount: aircraftSeed.engineCount,
        yearOfManufacture: 2010 + (index % 13),
        experimental: false,
        aircraftCategory: "normal" as const,
        customerId: customerIds[index % customerIds.length],
        status: "in_maintenance" as const,
        updatedAt: now,
      };

      const aircraftId = existing
        ? existing._id
        : await ctx.db.insert("aircraft", {
            ...payload,
            createdAt: now,
          });

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      }

      aircraftIdsByTail[aircraftSeed.tail] = aircraftId;
    }

    const engineIdsByTailPosition: Record<string, Id<"engines">> = {};
    for (const [aircraftIndex, aircraftSeed] of AIRCRAFT_SEED.entries()) {
      const aircraftId = aircraftIdsByTail[aircraftSeed.tail];
      const positions = aircraftSeed.engineCount === 2 ? ["left", "right"] : ["single"];
      for (const [positionIndex, position] of positions.entries()) {
        const serial = `ENG-${aircraftSeed.tail}-${position === "single" ? "S" : position === "left" ? "L" : "R"}`;
        const existing = engineBySerial.get(serial);
        const payload = {
          make: "Pratt & Whitney",
          model: engineModelForAircraft(aircraftSeed.model),
          serialNumber: serial,
          currentAircraftId: aircraftId,
          position,
          totalTimeHours: aircraftSeed.tt - (80 + aircraftIndex * 7 + positionIndex * 11),
          totalTimeAsOfDate: BASE_ANCHOR_MS,
          timeSinceOverhaulHours: 320 + aircraftIndex * 15 + positionIndex * 12,
          timeSinceNewHours: aircraftSeed.tt - (40 + aircraftIndex * 5 + positionIndex * 8),
          timeBetweenOverhaulLimit: 3600,
          totalCycles: Math.round((aircraftSeed.tt - 600) * 0.74),
          totalCyclesAsOfDate: BASE_ANCHOR_MS,
          cyclesSinceOverhaul: 260 + aircraftIndex * 12 + positionIndex * 10,
          cycleBetweenOverhaulLimit: 6800,
          lastOverhaulDate: BASE_ANCHOR_MS - (420 + aircraftIndex * 18) * DAY_MS,
          lastOverhaulFacility: aircraftSeed.model.includes("TBM") ? "Pratt & Whitney Service Center" : "StandardAero",
          llpPackageReviewDate: BASE_ANCHOR_MS - (100 + aircraftIndex * 6) * DAY_MS,
          llpPackageReviewedByTechnicianId: technicianIdsByEmployeeId["KA-TBM-TECH-002"],
          status: "installed" as const,
          organizationId: orgId,
          updatedAt: now,
        };

        const engineId = existing
          ? existing._id
          : await ctx.db.insert("engines", {
              ...payload,
              createdAt: now,
            });

        if (existing) {
          await ctx.db.patch(existing._id, payload);
        }

        engineIdsByTailPosition[`${aircraftSeed.tail}:${position}`] = engineId;
      }
    }

    for (const [aircraftIndex, aircraftSeed] of AIRCRAFT_SEED.entries()) {
      const aircraftId = aircraftIdsByTail[aircraftSeed.tail];
      const positions: Array<"single" | "left" | "right"> =
        aircraftSeed.engineCount === 2 ? ["left", "right"] : ["single"];

      for (const [positionIndex, position] of positions.entries()) {
        const key = `${String(aircraftId)}::${position}`;
        const existing = propellerByAircraftPosition.get(key);
        const serial = `PROP-${aircraftSeed.tail}-${position === "single" ? "S" : position === "left" ? "L" : "R"}`;
        const payload = {
          aircraftId,
          organizationId: orgId,
          position,
          make: "Hartzell",
          model: propellerModelForAircraft(aircraftSeed.model),
          serialNumber: serial,
          totalTimeHours: aircraftSeed.tt - (50 + aircraftIndex * 6 + positionIndex * 9),
          totalTimeAsOfDate: BASE_ANCHOR_MS,
          timeSinceOverhaulHours: 280 + aircraftIndex * 10 + positionIndex * 9,
          lastOverhaulDate: BASE_ANCHOR_MS - (300 + aircraftIndex * 14) * DAY_MS,
          updatedAt: now,
        };

        if (existing) {
          await ctx.db.patch(existing._id, payload);
        } else {
          const id = await ctx.db.insert("propellers", {
            ...payload,
            createdAt: now,
          });
          propellerByAircraftPosition.set(key, { _id: id, ...payload, createdAt: now });
        }
      }
    }

    const workOrderIds: Id<"workOrders">[] = [];
    const workOrderLocationById = new Map<string, Id<"shopLocations">>();
    for (let i = 0; i < 30; i += 1) {
      const locationCode = i < 15 ? "DEN" : "COS";
      const locationId = locationIdByCode[locationCode];
      const perLocationIndex = (i % 15) + 1;
      const workOrderNumber = `WO-${locationCode}-${1100 + perLocationIndex}`;
      const aircraftSeed = AIRCRAFT_SEED[i % AIRCRAFT_SEED.length];
      const aircraftId = aircraftIdsByTail[aircraftSeed.tail];
      const startDate = BASE_ANCHOR_MS + (i % 15) * 2 * DAY_MS + (locationCode === "COS" ? DAY_MS : 0);
      const durationDays = 4 + (i % 5);
      const endDate = startDate + durationDays * DAY_MS;
      const status = WORK_ORDER_STATUS_MIX[i];
      const existing = workOrderByNumber.get(workOrderNumber);
      const payload = {
        workOrderNumber,
        organizationId: orgId,
        shopLocationId: locationId,
        aircraftId,
        status,
        workOrderType: makeWorkOrderType(i),
        description: `${aircraftSeed.model} planned maintenance block ${perLocationIndex}`,
        openedAt: startDate - 2 * DAY_MS,
        openedByUserId: args.clerkUserId,
        targetCompletionDate: endDate,
        customerId: customerIds[i % customerIds.length],
        priority: makePriority(i),
        promisedDeliveryDate: endDate,
        estimatedLaborHoursOverride: 36 + (i % 6) * 8,
        scheduledStartDate: startDate,
        aircraftTotalTimeAtOpen: aircraftSeed.tt + i,
        returnedToService: false,
        notes: `Scenario ${scenarioKey} WO ${i + 1}`,
        updatedAt: now,
      };

      const workOrderId = existing
        ? existing
        : await ctx.db.insert("workOrders", {
            ...payload,
            createdAt: startDate - 2 * DAY_MS,
          });

      if (existing) {
        await ctx.db.patch(existing, payload);
      }

      workOrderByNumber.set(workOrderNumber, workOrderId);
      workOrderIds.push(workOrderId);
      workOrderLocationById.set(String(workOrderId), locationId);
    }

    const quoteIdByWorkOrderId = new Map<string, Id<"quotes">>();
    for (let i = 0; i < 10; i += 1) {
      const workOrderId = workOrderIds[i];
      const aircraftSeed = AIRCRAFT_SEED[i % AIRCRAFT_SEED.length];
      const quoteNumber = `Q-KATBM-${2001 + i}`;
      const existing = quoteByNumber.get(quoteNumber);
      const laborTotal = 9000 + i * 1250;
      const partsTotal = 4200 + i * 700;
      const subtotal = laborTotal + partsTotal;
      const tax = Math.round(subtotal * 0.0725);
      const total = subtotal + tax;
      const payload = {
        orgId: orgId,
        customerId: customerIds[i % customerIds.length],
        aircraftId: aircraftIdsByTail[aircraftSeed.tail],
        workOrderId,
        status: quoteStatusForIndex(i),
        quoteNumber,
        createdByTechId: technicianIdsByEmployeeId["KA-TBM-TECH-001"],
        laborTotal,
        partsTotal,
        subtotal,
        tax,
        total,
        currency: "USD",
        updatedAt: now,
      };

      const quoteId = existing
        ? existing._id
        : await ctx.db.insert("quotes", {
            ...payload,
            createdAt: BASE_ANCHOR_MS + i * DAY_MS,
          });

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      }

      quoteIdByWorkOrderId.set(String(workOrderId), quoteId);
    }

    for (let i = 0; i < workOrderIds.length; i += 1) {
      const workOrderId = workOrderIds[i];
      const locationCode = i < 15 ? "DEN" : "COS";
      const locationId = locationIdByCode[locationCode];
      const bayId = bayIdsByLocationCode[locationCode][i % 4];
      const existing = assignmentByWorkOrder.get(String(workOrderId));
      const startDate = BASE_ANCHOR_MS + (i % 15) * 2 * DAY_MS + (locationCode === "COS" ? DAY_MS : 0);
      const endDate = startDate + (4 + (i % 5)) * DAY_MS;
      const payload = {
        organizationId: orgId,
        workOrderId,
        sourceQuoteId: quoteIdByWorkOrderId.get(String(workOrderId)),
        hangarBayId: bayId,
        shopLocationId: locationId,
        startDate,
        endDate,
        isLocked: i % 10 === 0,
        archivedAt: undefined,
        archivedByUserId: undefined,
        updatedAt: now,
        updatedByUserId: args.clerkUserId,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        const assignmentId = await ctx.db.insert("scheduleAssignments", {
          ...payload,
          createdAt: now,
        });
        assignmentByWorkOrder.set(String(workOrderId), {
          _id: assignmentId,
          ...payload,
        });
      }
    }

    for (let i = 0; i < workOrderIds.length; i += 1) {
      const workOrderId = workOrderIds[i];
      const wo = await ctx.db.get(workOrderId);
      if (!wo) continue;
      for (let taskIndex = 0; taskIndex < 3; taskIndex += 1) {
        const taskCardNumber = `${wo.workOrderNumber}-TC-${taskIndex + 1}`;
        const key = keyWithSerial(String(workOrderId), taskCardNumber);
        const existing = taskCardByKey.get(key);

        const taskStatus: "complete" | "in_progress" | "not_started" =
          wo.status === "pending_signoff"
            ? "complete"
            : taskIndex === 0
              ? "complete"
              : taskIndex === 1 && wo.status === "in_progress"
                ? "in_progress"
                : "not_started";

        const completedStepCount = taskStatus === "complete" ? 3 : taskStatus === "in_progress" ? 1 : 0;

        const payload = {
          workOrderId,
          aircraftId: wo.aircraftId,
          organizationId: orgId,
          taskCardNumber,
          title: TASK_TITLES[taskIndex],
          taskType: taskIndex === 1 ? "repair" as const : "inspection" as const,
          approvedDataSource: "OEM MM Rev 2026.1",
          assignedToTechnicianId:
            i < 15
              ? technicianIdsByEmployeeId[technicianEmployeeKey(((i + taskIndex) % 5) + 1)]
              : technicianIdsByEmployeeId[technicianEmployeeKey(((i + taskIndex) % 5) + 6)],
          status: taskStatus,
          estimatedHours: 6 + taskIndex * 2,
          stepCount: 3,
          completedStepCount,
          naStepCount: 0,
          updatedAt: now,
        };

        if (existing) {
          await ctx.db.patch(existing._id, payload);
        } else {
          const id = await ctx.db.insert("taskCards", {
            ...payload,
            createdAt: now,
          });
          taskCardByKey.set(key, { _id: id, ...payload, createdAt: now });
        }
      }
    }

    for (const [index, vendorName] of VENDOR_SEED.entries()) {
      const existing = vendorByName.get(vendorName);
      const payload = {
        orgId: orgId,
        name: vendorName,
        type:
          vendorName === "AeroCal Labs"
            ? "calibration_lab" as const
            : "parts_supplier" as const,
        contactName: `Contact ${index + 1}`,
        contactEmail: `vendor${index + 1}@katbm-demo.local`,
        contactPhone: `+1-800-555-02${String(index + 10).padStart(2, "0")}`,
        address: `${100 + index} Supplier Way, Denver CO`,
        certNumber: `V-${3000 + index}`,
        certExpiry: BASE_ANCHOR_MS + 365 * DAY_MS,
        isApproved: true,
        approvedBy: technicianIdsByEmployeeId["KA-TBM-TECH-001"],
        approvedAt: BASE_ANCHOR_MS,
        notes: `Scenario ${scenarioKey}`,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        const id = await ctx.db.insert("vendors", {
          ...payload,
          createdAt: now,
        });
        vendorByName.set(vendorName, { _id: id, ...payload, createdAt: now });
      }
    }

    const partTemplates = buildPartTemplates();
    const expectedPartKeys = new Set(
      partTemplates.map((template, index) =>
        keyWithSerial(
          template.partNumber,
          template.isSerialized
            ? template.serialNumber ?? `SN-${String(5000 + index)}`
            : undefined,
        ),
      ),
    );

    // Prune legacy scenario parts so the deterministic contract always resolves to exactly 60 parts.
    // Scope is intentionally limited to KA-TBM scenario part numbers in the dedicated demo org.
    for (const existingPart of partsRows) {
      const partNumber = String(existingPart.partNumber ?? "");
      if (!partNumber.startsWith("KA-TBM-")) continue;
      const existingKey = keyWithSerial(existingPart.partNumber, existingPart.serialNumber);
      if (expectedPartKeys.has(existingKey)) continue;
      await ctx.db.delete(existingPart._id);
      partByKey.delete(existingKey);
    }
    const engineIds = Object.values(engineIdsByTailPosition);
    const aircraftIds = Object.values(aircraftIdsByTail);

    for (const [index, template] of partTemplates.entries()) {
      const serialNumber = template.isSerialized
        ? template.serialNumber ?? `SN-${String(5000 + index)}`
        : undefined;
      const key = keyWithSerial(template.partNumber, serialNumber);
      const existing = partByKey.get(key);
      const receivingWorkOrderId = workOrderIds[index % workOrderIds.length];

      const shelfLifeLimitDate = template.hasShelfLifeLimit
        ? BASE_ANCHOR_MS + (template.shelfLifeOffsetDays ?? 180) * DAY_MS
        : undefined;

      const isInstalled = template.location === "installed";
      const installWorkOrderId = isInstalled ? workOrderIds[(index * 3) % workOrderIds.length] : undefined;
      const useEngineInstall = isInstalled && template.family === "powerplant_service" && engineIds.length > 0;
      const installedEngineId = useEngineInstall ? engineIds[index % engineIds.length] : undefined;
      const installedAircraftId =
        isInstalled && !useEngineInstall
          ? aircraftIds[index % aircraftIds.length]
          : isInstalled && useEngineInstall
            ? (await ctx.db.get(installedEngineId!))?.currentAircraftId
            : undefined;

      const edgeTagSuffix = template.edgeTags.map((tag) => `edge:${tag}`).join(" | ");
      const payload = {
        organizationId: orgId,
        shopLocationId: locationIdByCode[template.locationCode],
        partNumber: template.partNumber,
        partName: template.partName,
        description: template.description,
        serialNumber,
        isSerialized: template.isSerialized,
        isLifeLimited: template.isLifeLimited,
        lifeLimitHours: template.lifeLimitHours,
        lifeLimitCycles: template.lifeLimitCycles,
        hasShelfLifeLimit: template.hasShelfLifeLimit,
        shelfLifeLimitDate,
        hoursAccumulatedBeforeInstall: template.hoursAccumulatedBeforeInstall,
        cyclesAccumulatedBeforeInstall: template.cyclesAccumulatedBeforeInstall,
        isOwnerSupplied: template.isOwnerSupplied,
        condition: template.condition,
        location: template.location,
        currentAircraftId: installedAircraftId,
        currentEngineId: installedEngineId,
        installPosition: isInstalled ? "MX" : undefined,
        installedAt: isInstalled ? BASE_ANCHOR_MS - (20 + (index % 17)) * DAY_MS : undefined,
        installedByWorkOrderId: installWorkOrderId,
        hoursAtInstallation: isInstalled ? 4200 + index * 8 : undefined,
        cyclesAtInstallation: isInstalled ? 2100 + index * 5 : undefined,
        installedOnAircraftId: installedAircraftId,
        installedOnWorkOrderId: installWorkOrderId,
        installedByTechnicianId: isInstalled
          ? technicianIdsByEmployeeId[index % 2 === 0 ? "KA-TBM-TECH-003" : "KA-TBM-TECH-007"]
          : undefined,
        receivingDate: BASE_ANCHOR_MS - (index % 28) * DAY_MS,
        receivingWorkOrderId,
        supplier: template.supplier,
        reservedForWorkOrderId:
          template.location === "inventory" && index % 7 === 0
            ? workOrderIds[(index + 5) % workOrderIds.length]
            : undefined,
        receivingInspectedBy:
          template.location !== "pending_inspection"
            ? technicianIdsByEmployeeId["KA-TBM-TECH-009"]
            : undefined,
        receivingInspectedAt:
          template.location !== "pending_inspection"
            ? BASE_ANCHOR_MS - (index % 14) * DAY_MS
            : undefined,
        receivingInspectionNotes:
          template.location !== "pending_inspection"
            ? "Receiving inspection complete per incoming checklist"
            : undefined,
        receivingRejectionReason:
          template.location === "quarantine" && template.edgeTags.includes("quarantine_hold")
            ? "Holding for quality disposition"
            : undefined,
        quarantineReason:
          template.location === "quarantine"
            ? template.edgeTags.includes("life_expired")
              ? "Life limit exhausted prior to installation"
              : template.edgeTags.includes("expired_shelf_life")
                ? "Shelf-life expired in stores"
                : "Quality hold for disposition"
            : undefined,
        minStockLevel: template.minStockLevel,
        reorderPoint: template.reorderPoint,
        notes: `Scenario ${scenarioKey} | family:${template.family}${edgeTagSuffix ? ` | ${edgeTagSuffix}` : ""}`,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        partByKey.set(key, { _id: existing._id, ...payload, createdAt: existing.createdAt });
      } else {
        const id = await ctx.db.insert("parts", {
          ...payload,
          createdAt: now,
        });
        partByKey.set(key, { _id: id, ...payload, createdAt: now });
      }
    }

    const denWorkOrders = ["WO-DEN-1101", "WO-DEN-1102", "WO-DEN-1103"].map((number) => workOrderByNumber.get(number));
    const cosWorkOrders = ["WO-COS-1101", "WO-COS-1102", "WO-COS-1103"].map((number) => workOrderByNumber.get(number));

    for (const [locationIndex, locationCode] of ["DEN", "COS"].entries()) {
      const locationId = locationIdByCode[locationCode];
      const inUseTechIds =
        locationCode === "DEN"
          ? [
              technicianIdsByEmployeeId["KA-TBM-TECH-003"],
              technicianIdsByEmployeeId["KA-TBM-TECH-004"],
              technicianIdsByEmployeeId["KA-TBM-TECH-005"],
            ]
          : [
              technicianIdsByEmployeeId["KA-TBM-TECH-006"],
              technicianIdsByEmployeeId["KA-TBM-TECH-007"],
              technicianIdsByEmployeeId["KA-TBM-TECH-008"],
            ];
      const inUseWorkOrderIds = locationCode === "DEN" ? denWorkOrders : cosWorkOrders;

      for (const [toolIndex, template] of TOOL_CATALOG.entries()) {
        const absoluteIndex = locationIndex * TOOL_CATALOG.length + toolIndex;
        const toolNumber = `KA-TBM-TOOL-${String(absoluteIndex + 1).padStart(2, "0")}`;
        const existing = toolByNumber.get(toolNumber);

        const status: "available" | "in_use" | "calibration_due" | "out_for_calibration" =
          toolIndex <= 11
            ? "available"
            : toolIndex <= 14
              ? "in_use"
              : toolIndex <= 16
                ? "calibration_due"
                : toolIndex === 17
                  ? "out_for_calibration"
                  : "available";

        const assignedToTechnicianId =
          status === "in_use" ? inUseTechIds[(toolIndex - 12) % inUseTechIds.length] : undefined;
        const assignedToWorkOrderId =
          status === "in_use" ? inUseWorkOrderIds[(toolIndex - 12) % inUseWorkOrderIds.length] : undefined;

        const lastCalibrationDate = template.calibrationRequired
          ? BASE_ANCHOR_MS - (120 + absoluteIndex * 3) * DAY_MS
          : undefined;

        const nextCalibrationDue = template.calibrationRequired
          ? (status === "calibration_due" || status === "out_for_calibration"
              ? BASE_ANCHOR_MS - (5 + toolIndex) * DAY_MS
              : BASE_ANCHOR_MS + (75 + absoluteIndex * 2) * DAY_MS)
          : undefined;

        const payload = {
          organizationId: orgId,
          shopLocationId: locationId,
          toolNumber,
          description: template.description,
          serialNumber: `TL-${locationCode}-${String(7000 + absoluteIndex)}`,
          category: template.category,
          location: `${locationCode} Tool Crib`,
          status,
          calibrationRequired: template.calibrationRequired,
          lastCalibrationDate,
          nextCalibrationDue,
          calibrationIntervalDays: template.calibrationRequired ? template.intervalDays : undefined,
          calibrationProvider: template.calibrationRequired ? "AeroCal Labs" : undefined,
          assignedToTechnicianId,
          assignedToWorkOrderId,
          notes: `Scenario ${scenarioKey} | catalog:turboprop`,
        };

        if (existing) {
          await ctx.db.patch(existing._id, payload);
        } else {
          const id = await ctx.db.insert("toolRecords", {
            ...payload,
            createdAt: now,
          });
          toolByNumber.set(toolNumber, { _id: id, ...payload, createdAt: now });
        }
      }
    }

    const rotableStatusMix: Array<
      "installed" | "serviceable" | "at_vendor" | "in_shop" | "condemned"
    > = [
      "installed",
      "serviceable",
      "at_vendor",
      "in_shop",
      "condemned",
      "installed",
      "serviceable",
      "at_vendor",
    ];

    for (let i = 0; i < 8; i += 1) {
      const partNumber = `KA-TBM-ROTABLE-${i + 1}`;
      const serialNumber = `RT-${8100 + i}`;
      const key = keyWithSerial(partNumber, serialNumber);
      const existing = rotableByKey.get(key);
      const status = rotableStatusMix[i];
      const installedAircraftId =
        status === "installed"
          ? ((await ctx.db.get(workOrderIds[i % workOrderIds.length])) as any)?.aircraftId
          : undefined;
      const payload = {
        organizationId: orgId,
        shopLocationId: i < 4 ? locationIdByCode.DEN : locationIdByCode.COS,
        partNumber,
        serialNumber,
        description: `Scenario rotable ${i + 1}`,
        status,
        condition:
          status === "condemned"
            ? "unserviceable" as const
            : i % 2 === 0
              ? "overhauled" as const
              : "serviceable" as const,
        aircraftId: installedAircraftId,
        positionCode: status === "installed" ? (i % 2 === 0 ? "L" : "R") : undefined,
        tsnHours: 800 + i * 120,
        tsnCycles: 600 + i * 80,
        tsoHours: 220 + i * 45,
        tsoCycles: 180 + i * 30,
        tsiHours: status === "installed" ? 30 + i * 3 : undefined,
        tsiCycles: status === "installed" ? 20 + i * 2 : undefined,
        tboHours: 5000,
        tboCycles: 9000,
        purchasePrice: 12000 + i * 800,
        currentValue: status === "condemned" ? 1500 : 9000 + i * 600,
        coreValue: 3000 + i * 300,
        lastOverhaulVendor: i % 3 === 2 ? "StandardAero" : "Hartzell Propeller",
        lastOverhaulDate: BASE_ANCHOR_MS - (90 + i * 10) * DAY_MS,
        warrantyExpiry: BASE_ANCHOR_MS + (220 - i * 5) * DAY_MS,
        notes: `Scenario ${scenarioKey}`,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        const id = await ctx.db.insert("rotables", {
          ...payload,
          createdAt: now,
        });
        rotableByKey.set(key, { _id: id, ...payload, createdAt: now });
      }
    }

    for (let i = 0; i < 4; i += 1) {
      const partNumber = `KA-TBM-LOANER-${i + 1}`;
      const serialNumber = `LN-${9100 + i}`;
      const key = keyWithSerial(partNumber, serialNumber);
      const existing = loanerByKey.get(key);
      const isLoaned = i === 0;
      const payload = {
        organizationId: orgId,
        partNumber,
        serialNumber,
        description: `Scenario loaner ${i + 1}`,
        status: isLoaned ? "loaned_out" as const : i === 3 ? "maintenance" as const : "available" as const,
        loanedToCustomerId: isLoaned ? customerIds[0] : undefined,
        loanedToWorkOrderId: isLoaned ? workOrderIds[2] : undefined,
        loanedDate: isLoaned ? BASE_ANCHOR_MS + 2 * DAY_MS : undefined,
        expectedReturnDate: isLoaned ? BASE_ANCHOR_MS + 20 * DAY_MS : undefined,
        dailyRate: 125 + i * 20,
        conditionOut: isLoaned ? "Serviceable" : undefined,
        notes: `Scenario ${scenarioKey}`,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        const id = await ctx.db.insert("loanerItems", {
          ...payload,
          createdAt: now,
        });
        loanerByKey.set(key, { _id: id, ...payload, createdAt: now });
      }
    }

    if (targetOrgMode === "dedicated") {
      const expectedAircraftTails = new Set<string>(
        AIRCRAFT_SEED.map((aircraft) => aircraft.tail),
      );
      const [aircraftRowsPostSeed, workOrdersPostSeed, enginesPostSeed, propellersPostSeed] =
        await Promise.all([
          ctx.db
            .query("aircraft")
            .withIndex("by_organization", (q) => q.eq("operatingOrganizationId", orgId))
            .collect(),
          ctx.db
            .query("workOrders")
            .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
            .collect(),
          ctx.db
            .query("engines")
            .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
            .collect(),
          ctx.db
            .query("propellers")
            .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
            .collect(),
        ]);

      for (const aircraftRow of aircraftRowsPostSeed) {
        const tailNumber = String(aircraftRow.currentRegistration ?? "");
        if (expectedAircraftTails.has(tailNumber)) continue;

        const hasLinkedWorkOrders = workOrdersPostSeed.some(
          (workOrder) => workOrder.aircraftId === aircraftRow._id,
        );
        if (hasLinkedWorkOrders) continue;

        for (const engine of enginesPostSeed) {
          if (engine.currentAircraftId !== aircraftRow._id) continue;
          await ctx.db.delete(engine._id);
        }

        for (const propeller of propellersPostSeed) {
          if (propeller.aircraftId !== aircraftRow._id) continue;
          await ctx.db.delete(propeller._id);
        }

        await ctx.db.delete(aircraftRow._id);
      }
    }

    const [
      locations,
      bays,
      technicians,
      aircraft,
      engines,
      propellers,
      workOrders,
      assignments,
      taskCards,
      vendors,
      parts,
      tools,
      rotables,
      loaners,
      quotes,
    ] =
      await Promise.all([
        ctx.db.query("shopLocations").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("hangarBays").withIndex("by_org", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("technicians").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("aircraft").withIndex("by_organization", (q) => q.eq("operatingOrganizationId", orgId)).collect(),
        ctx.db.query("engines").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("propellers").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("workOrders").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("scheduleAssignments").withIndex("by_org", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("taskCards").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("vendors").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect(),
        ctx.db.query("parts").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("toolRecords").withIndex("by_org", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("rotables").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("loanerItems").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).collect(),
        ctx.db.query("quotes").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect(),
      ]);

    const perLocationScheduledCounts = LOCATION_SEED.map((location) => ({
      locationCode: location.code,
      locationId: locationIdByCode[location.code],
      scheduled: assignments.filter((assignment) => assignment.shopLocationId === locationIdByCode[location.code]).length,
    }));

    const perLocationToolCounts = LOCATION_SEED.map((location) => ({
      locationCode: location.code,
      locationId: locationIdByCode[location.code],
      tools: tools.filter((tool) => tool.shopLocationId === locationIdByCode[location.code]).length,
    }));

    const statusMix = workOrders.reduce<Record<string, number>>((acc, wo) => {
      acc[wo.status] = (acc[wo.status] ?? 0) + 1;
      return acc;
    }, {});

    const engineCountsByAircraft = AIRCRAFT_SEED.map((seed) => {
      const aircraftId = aircraftIdsByTail[seed.tail];
      return {
        tail: seed.tail,
        aircraftId,
        expected: seed.engineCount,
        actual: engines.filter((engine) => engine.currentAircraftId === aircraftId).length,
      };
    });

    const propellerCountsByAircraft = AIRCRAFT_SEED.map((seed) => {
      const aircraftId = aircraftIdsByTail[seed.tail];
      return {
        tail: seed.tail,
        aircraftId,
        expected: seed.engineCount,
        actual: propellers.filter((propeller) => propeller.aircraftId === aircraftId).length,
      };
    });

    const authoritativeParts = Array.from(partByKey.values());
    const partsUseCaseCoverage = buildPartsUseCaseCoverage(authoritativeParts);

    const actualCounts = {
      locations: locations.length,
      hangarBays: bays.length,
      technicians: technicians.length,
      aircraft: aircraft.length,
      engines: engines.length,
      propellers: propellers.length,
      workOrders: workOrders.length,
      scheduleAssignments: assignments.length,
      taskCards: taskCards.length,
      vendors: vendors.length,
      parts: authoritativeParts.length,
      toolRecords: tools.length,
      rotables: rotables.length,
      loanerItems: loaners.length,
      quotes: quotes.length,
    };

    return {
      scenarioKey,
      targetOrgMode,
      organizationId: orgId,
      locationIds: locationIdByCode,
      seededCounts: actualCounts,
      requiredCounts: REQUIRED_COUNTS,
      perLocationScheduledCounts,
      perLocationToolCounts,
      engineCountsByAircraft,
      propellerCountsByAircraft,
      partsUseCaseCoverage,
      statusMix,
      runMetadata: {
        runAt: now,
        organizationCreated: !existingOrg,
      },
    };
  },
});
