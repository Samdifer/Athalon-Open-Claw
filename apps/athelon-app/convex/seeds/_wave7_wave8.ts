// ══════════════════════════════════════════════════════════════════════════════
// WAVE 7: Vendor Services, Templates & Tags
// WAVE 8: Scheduling & Settings
//
// Colorado Aviation Maintenance Group (CAMG) — FAA Part 145 seed data
// ══════════════════════════════════════════════════════════════════════════════

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export interface SeedIds {
  orgId: Id<"organizations">;
  clerkUserId: string;
  now: number;
  DAY: number;
  HOUR: number;
  techMap: Record<string, Id<"technicians">>;
  customerIds: Id<"customers">[];
  aircraftIds: Id<"aircraft">[];
  vendorIds: Id<"vendors">[];
  hangarBayIds: Id<"hangarBays">[];
  partIds: Id<"parts">[];
  closedWOIds: Id<"workOrders">[];
  activeWOIds: Id<"workOrders">[];
  locationMap: Record<string, Id<"shopLocations">>;
}

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 7
// ══════════════════════════════════════════════════════════════════════════════

export async function seedWave7(ctx: MutationCtx, ids: SeedIds) {
  const { orgId, clerkUserId, now, DAY, techMap, vendorIds, partIds, closedWOIds, activeWOIds } = ids;

  // ── 1. vendorServices (10 records) ─────────────────────────────────────────
  // [0] Aviall — engine component repair
  const vsAviallEngineRepair = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[0], // Aviall
    orgId,
    serviceName: "Lycoming O-360 Cylinder Overhaul",
    serviceType: "overhaul",
    description: "Top overhaul of Lycoming O-360 cylinders including honing, ring replacement, and valve reconditioning.",
    estimatedCost: 2800,
    certificationRequired: "FAA Repair Station — Engine (Class 4)",
    isActive: true,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // [1] Aviall — NDT
  const vsAviallNdt = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[0], // Aviall
    orgId,
    serviceName: "Fluorescent Penetrant Inspection (FPI)",
    serviceType: "ndt",
    description: "Level II FPI on turboprop compressor blades and combustion hardware per manufacturer CMM.",
    estimatedCost: 450,
    certificationRequired: "ASNT Level II PT certification",
    isActive: true,
    createdAt: now - 180 * DAY,
    updatedAt: now - 10 * DAY,
  });

  // [2] StandardAero — turboprop overhaul
  const vsStandardAeroOverhaul = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[1], // StandardAero
    orgId,
    serviceName: "PT6A-60A Hot Section Inspection (HSI)",
    serviceType: "inspection",
    description: "Hot section inspection of PT6A-60A turboprop engine per P&WC SB 14842. Includes NGV, power turbine, and combustion liner inspection.",
    estimatedCost: 18500,
    certificationRequired: "P&WC Authorized Service Center",
    isActive: true,
    createdAt: now - 150 * DAY,
    updatedAt: now - 150 * DAY,
  });

  // [3] StandardAero — full overhaul
  const vsStandardAeroFullOH = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[1], // StandardAero
    orgId,
    serviceName: "PT6A-60A Time Between Overhaul (TBO) Overhaul",
    serviceType: "overhaul",
    description: "Full TBO overhaul per P&WC Overhaul Manual chapter 72. All life-limited parts replaced. Engine returned with new limits.",
    estimatedCost: 185000,
    certificationRequired: "P&WC Authorized Service Center — Engine Overhaul",
    isActive: true,
    createdAt: now - 150 * DAY,
    updatedAt: now - 150 * DAY,
  });

  // [4] Garmin — avionics calibration
  const vsGarminCalibration = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[2], // Garmin
    orgId,
    serviceName: "GTX 345 Transponder Certification",
    serviceType: "calibration",
    description: "IFR transponder certification test per 14 CFR §91.413 and FAR 43 Appendix F. Altitude encoder correlation included.",
    estimatedCost: 275,
    certificationRequired: "FAA Avionics Repair Station (Instrument Class 3)",
    isActive: true,
    createdAt: now - 120 * DAY,
    updatedAt: now - 30 * DAY,
  });

  // [5] Garmin — repair
  const vsGarminRepair = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[2], // Garmin
    orgId,
    serviceName: "GNS 530W WAAS Repair & Bench Test",
    serviceType: "repair",
    description: "Factory-level repair and bench test of GNS 530W WAAS navigator. Includes software validation and RF output verification.",
    estimatedCost: 1200,
    certificationRequired: "Garmin Authorized Repair Station",
    isActive: true,
    createdAt: now - 120 * DAY,
    updatedAt: now - 120 * DAY,
  });

  // [6] Hartzell — prop overhaul
  const vsHartzellPropOH = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[3], // Hartzell
    orgId,
    serviceName: "HC-B3TN-3D Propeller 6-Year/2400-Hr Overhaul",
    serviceType: "overhaul",
    description: "Major overhaul of Hartzell HC-B3TN-3D three-blade turboprop propeller per Hartzell Overhaul Manual 137. Includes hub disassembly, blade NDT, seal and bearing replacement.",
    estimatedCost: 9500,
    certificationRequired: "Hartzell Authorized Propeller Overhaul Station",
    isActive: true,
    createdAt: now - 90 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // [7] Cleveland Wheels — brake overhaul
  const vsClevelandBrakeOH = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[4], // Cleveland Wheels
    orgId,
    serviceName: "30-97A Wheel & Brake Assembly Overhaul",
    serviceType: "overhaul",
    description: "Overhaul of Cleveland 30-97A main gear wheel and brake assembly. Wheel half NDT, bearing replacement, brake disc inspection, and pressure test.",
    estimatedCost: 680,
    certificationRequired: "FAA Repair Station — Landing Gear",
    isActive: true,
    createdAt: now - 60 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // [8] Collins Aerospace — test
  const vsCollinsTest = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[5], // Collins Aerospace
    orgId,
    serviceName: "AHC-3000 AHRS Test & Certification",
    serviceType: "test",
    description: "Functional test and certification of Collins AHC-3000 attitude and heading reference system per CMM 34-20-00.",
    estimatedCost: 850,
    certificationRequired: "Collins Aerospace Authorized Service Center",
    isActive: true,
    createdAt: now - 45 * DAY,
    updatedAt: now - 45 * DAY,
  });

  // [9] Collins Aerospace — fabrication (sheet metal)
  const vsCollinsFab = await ctx.db.insert("vendorServices", {
    vendorId: vendorIds[5], // Collins Aerospace
    orgId,
    serviceName: "Custom Avionics Wiring Harness Fabrication",
    serviceType: "fabrication",
    description: "Custom mil-spec wiring harness fabrication for Collins Pro Line Fusion avionics integration. Includes pin-out verification and continuity test.",
    estimatedCost: 1800,
    isActive: true,
    createdAt: now - 30 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const vendorServiceIds = [
    vsAviallEngineRepair,
    vsAviallNdt,
    vsStandardAeroOverhaul,
    vsStandardAeroFullOH,
    vsGarminCalibration,
    vsGarminRepair,
    vsHartzellPropOH,
    vsClevelandBrakeOH,
    vsCollinsTest,
    vsCollinsFab,
  ];

  // ── 2. taskCardVendorServices (6 records) ──────────────────────────────────
  // Pull task cards to get real IDs
  const taskCards = await ctx.db
    .query("taskCards")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();

  // Guard: only create taskCardVendorServices if we have enough task cards
  if (taskCards.length >= 4) {
    // [0] Prop overhaul sent out — closed WO
    await ctx.db.insert("taskCardVendorServices", {
      taskCardId: taskCards[0]._id,
      workOrderId: closedWOIds[0],
      organizationId: orgId,
      vendorId: vendorIds[3], // Hartzell
      vendorServiceId: vendorServiceIds[6], // HC-B3TN-3D Overhaul
      vendorName: "Hartzell Propeller",
      serviceName: "HC-B3TN-3D Propeller 6-Year/2400-Hr Overhaul",
      serviceType: "overhaul",
      status: "completed",
      estimatedCost: 9500,
      actualCost: 9250,
      notes: "Returned with 8130-3. Minor blade blend within limits — no extra charge.",
      createdAt: now - 85 * DAY,
      updatedAt: now - 62 * DAY,
    });

    // [1] Transponder calibration — closed WO
    await ctx.db.insert("taskCardVendorServices", {
      taskCardId: taskCards[1]._id,
      workOrderId: closedWOIds[1],
      organizationId: orgId,
      vendorId: vendorIds[2], // Garmin
      vendorServiceId: vendorServiceIds[4], // GTX 345 Calibration
      vendorName: "Garmin International",
      serviceName: "GTX 345 Transponder Certification",
      serviceType: "calibration",
      status: "completed",
      estimatedCost: 275,
      actualCost: 275,
      notes: "Passed all altitude encoder correlation checks. Cert on file.",
      createdAt: now - 72 * DAY,
      updatedAt: now - 58 * DAY,
    });

    // [2] Engine HSI sent to StandardAero — active WO
    await ctx.db.insert("taskCardVendorServices", {
      taskCardId: taskCards[2]._id,
      workOrderId: activeWOIds[0],
      organizationId: orgId,
      vendorId: vendorIds[1], // StandardAero
      vendorServiceId: vendorServiceIds[2], // PT6A-60A HSI
      vendorName: "StandardAero",
      serviceName: "PT6A-60A Hot Section Inspection (HSI)",
      serviceType: "inspection",
      status: "in_progress",
      estimatedCost: 18500,
      notes: "Engine shipped 2026-03-01. ETA 3 weeks per StandardAero work order SA-2026-0891.",
      createdAt: now - 11 * DAY,
      updatedAt: now - 4 * DAY,
    });

    // [3] NDT on compressor blades — active WO, planned
    await ctx.db.insert("taskCardVendorServices", {
      taskCardId: taskCards[2]._id,
      workOrderId: activeWOIds[0],
      organizationId: orgId,
      vendorId: vendorIds[0], // Aviall
      vendorServiceId: vendorServiceIds[1], // FPI NDT
      vendorName: "Aviall Services",
      serviceName: "Fluorescent Penetrant Inspection (FPI)",
      serviceType: "ndt",
      status: "planned",
      estimatedCost: 450,
      notes: "Pending return of engine from StandardAero — will schedule FPI on removed compressor components.",
      createdAt: now - 11 * DAY,
      updatedAt: now - 11 * DAY,
    });

    // [4] Wheel/brake overhaul sent — active WO
    await ctx.db.insert("taskCardVendorServices", {
      taskCardId: taskCards[3]._id,
      workOrderId: activeWOIds[1],
      organizationId: orgId,
      vendorId: vendorIds[4], // Cleveland Wheels
      vendorServiceId: vendorServiceIds[7], // 30-97A Brake OH
      vendorName: "Cleveland Wheels & Brakes",
      serviceName: "30-97A Wheel & Brake Assembly Overhaul",
      serviceType: "overhaul",
      status: "sent_for_work",
      estimatedCost: 680,
      notes: "Both main gear assemblies shipped via FedEx. Tracking #799123456789.",
      createdAt: now - 6 * DAY,
      updatedAt: now - 5 * DAY,
    });

    // [5] AHRS test — active WO, cancelled (decided to replace unit instead)
    await ctx.db.insert("taskCardVendorServices", {
      taskCardId: taskCards[3]._id,
      workOrderId: activeWOIds[1],
      organizationId: orgId,
      vendorId: vendorIds[5], // Collins Aerospace
      vendorServiceId: vendorServiceIds[8], // AHC-3000 Test
      vendorName: "Collins Aerospace",
      serviceName: "AHC-3000 AHRS Test & Certification",
      serviceType: "test",
      status: "cancelled",
      estimatedCost: 850,
      notes: "Cancelled — customer approved unit replacement (SV with exchange). New unit ordered via PO-2026-0041.",
      createdAt: now - 8 * DAY,
      updatedAt: now - 3 * DAY,
    });
  }

  // ── 3. routingTemplates (4 records) ────────────────────────────────────────
  // NOTE: organizationId is v.string() in this table
  const orgIdStr = ids.orgId as unknown as string;

  await ctx.db.insert("routingTemplates", {
    organizationId: orgIdStr,
    name: "Cessna 172S 100-Hour Inspection",
    description: "Standard routing template for Cessna 172S 100-hour inspection per Cessna Model 172 Maintenance Manual Chapter 5.",
    steps: [
      { name: "Aircraft Induction & Logbook Review", description: "Receive aircraft, open work order, review all logs for ADs, SBs, and airworthiness items.", estimatedHours: 0.5 },
      { name: "Aircraft Wash & Decontamination", description: "Wash exterior, inspect for obvious damage during wash.", estimatedHours: 1.0 },
      { name: "Engine Compartment Inspection", description: "Complete engine inspection per Lycoming IO-360 and CMM Chapter 72. Check compressions.", estimatedHours: 4.0 },
      { name: "Airframe Inspection — Fuselage & Empennage", description: "Inspect fuselage skins, empennage attach fittings, control surfaces, and rigging.", estimatedHours: 3.0 },
      { name: "Landing Gear & Brake Inspection", description: "Inspect tricycle gear, tires, brakes, nose gear shimmy damper, and strut servicing.", estimatedHours: 2.0 },
      { name: "Avionics & Electrical Inspection", description: "Test all avionics, check wiring, inspect battery and ground straps.", estimatedHours: 1.5 },
      { name: "Fuel System Inspection", description: "Drain and inspect sumps, check fuel caps, gascolator, and lines.", estimatedHours: 1.0 },
      { name: "Flight Control Rigging Check", description: "Verify aileron, elevator, and rudder travel limits per maintenance manual.", estimatedHours: 1.0 },
      { name: "Squawk Resolution & Corrective Actions", description: "Complete any squawks identified during inspection.", estimatedHours: 2.0 },
      { name: "QCM Final Inspection & RTS Sign-Off", description: "Inspector review, return to service entry, and logbook endorsement.", estimatedHours: 1.0 },
    ],
    createdBy: clerkUserId,
    isActive: true,
    createdAt: now - 120 * DAY,
    updatedAt: now - 30 * DAY,
  });

  await ctx.db.insert("routingTemplates", {
    organizationId: orgIdStr,
    name: "King Air B200 Phase 1/2 Inspection",
    description: "Beechcraft King Air B200 Phase 1 and Phase 2 combined inspection routing per B200 Maintenance Manual Chapter 05-10.",
    steps: [
      { name: "Aircraft Induction & Records Review", description: "Open work order, review aircraft logs, identify all required ADs and SBs due.", estimatedHours: 1.0 },
      { name: "Defueling & Safety Grounding", description: "Defuel aircraft per Chapter 12. Establish ground safety.", estimatedHours: 0.5 },
      { name: "Engine & Nacelle Inspection (Both)", description: "PT6A-52 engine inspections per Chapter 72 and P&WC MM. Check bleed, fuel, oil, torque.", estimatedHours: 6.0 },
      { name: "Propeller & De-ice Boot Inspection", description: "Hartzell prop inspection per Hartzell MM. Check blade tracking and de-ice boots.", estimatedHours: 2.5 },
      { name: "Airframe Inspection — Phase 1 Items", description: "Fuselage frames, wing attach fittings, wing spar carry-through corrosion check.", estimatedHours: 5.0 },
      { name: "Airframe Inspection — Phase 2 Items", description: "Control surfaces, hinges, empennage attach, pressurization check.", estimatedHours: 4.0 },
      { name: "Landing Gear — Retraction Test & Inspection", description: "Gear retraction test, oleo service, tire/brake inspection, door seal check.", estimatedHours: 3.0 },
      { name: "Avionics & EFIS Functional Check", description: "Collins Pro Line 21 system check, transponder check, TCAS, ELT test.", estimatedHours: 2.0 },
      { name: "Fuel System & Anti-Ice Functional Check", description: "Inspect wet wing, tank caps, boost pumps, and anti-ice TKS/bleed air.", estimatedHours: 2.0 },
      { name: "Squawk Disposition & Corrective Actions", description: "Address all write-ups from inspection.", estimatedHours: 4.0 },
      { name: "Inspector Buy-Back & RTS", description: "QCM inspector review, maintenance record entries, and return to service.", estimatedHours: 1.5 },
    ],
    createdBy: clerkUserId,
    isActive: true,
    createdAt: now - 100 * DAY,
    updatedAt: now - 20 * DAY,
  });

  await ctx.db.insert("routingTemplates", {
    organizationId: orgIdStr,
    name: "Avionics Installation (GTN 750Xi)",
    description: "Garmin GTN 750Xi WAAS navigator installation and certification routing. Includes STC compliance, TSO documentation, and IFR flight check.",
    steps: [
      { name: "Work Authorization & AFMS Review", description: "Confirm customer authorization, review applicable Garmin STC and AFMS requirements.", estimatedHours: 0.5 },
      { name: "Aircraft Prep & Panel Access", description: "Remove existing navigator, document panel as-found, protect avionics bay.", estimatedHours: 1.5 },
      { name: "GTN 750Xi Tray & Wiring Installation", description: "Install tray, route wiring harness per installation manual, connect antenna and data bus.", estimatedHours: 5.0 },
      { name: "Database Loading & Configuration", description: "Load navigation database, configure unit per aircraft application, set baro source.", estimatedHours: 1.0 },
      { name: "Antenna Installation & Coax Routing", description: "Install GPS and comm antennas, route coax, check VSWR.", estimatedHours: 2.0 },
      { name: "System Functional Test — Ground", description: "GPS signal check, comm transmit/receive, WAAS signal acquisition, HSI integration.", estimatedHours: 2.0 },
      { name: "Transponder & Altitude Encoder Correlation", description: "Certify transponder per §91.413 following avionics installation.", estimatedHours: 1.0 },
      { name: "IFR Flight Test & Log Entry", description: "Maintenance test flight verifying WAAS LPV approach capability and HSI accuracy.", estimatedHours: 1.5 },
      { name: "8110-3 / 337 & AFMS Completion", description: "Complete FAA Form 337, obtain DER sign-off if required, update aircraft records.", estimatedHours: 1.0 },
    ],
    createdBy: clerkUserId,
    isActive: true,
    createdAt: now - 60 * DAY,
    updatedAt: now - 60 * DAY,
  });

  await ctx.db.insert("routingTemplates", {
    organizationId: orgIdStr,
    name: "TBM 930 Engine Compressor Wash",
    description: "Pratt & Whitney PT6A-66D compressor wash routing for TBM 930 aircraft per P&WC SB 14248 and SOCATA AMM Chapter 72.",
    steps: [
      { name: "Pre-Wash Safety Setup", description: "Open cowl, position wash rig, ground aircraft, ensure fire extinguisher on standby.", estimatedHours: 0.25 },
      { name: "Desalt Rinse (if coastal operation)", description: "Freshwater rinse cycle per P&WC SB 14248 — applicable if aircraft operated within 25nm of coast.", estimatedHours: 0.5 },
      { name: "Motoring Wash", description: "Inject cleaner solution during engine motoring cycle per P&WC wash procedure.", estimatedHours: 0.5 },
      { name: "Power Rinse", description: "Rinse with demineralized water during motoring. Ensure all cleaner expelled.", estimatedHours: 0.5 },
      { name: "Drying Run", description: "Start engine and bring to idle for drying run. Monitor ITT and NG per limits.", estimatedHours: 0.5 },
      { name: "Logbook Entry", description: "Record wash in engine log with date, cycle count, and any deviations from procedure.", estimatedHours: 0.25 },
    ],
    createdBy: clerkUserId,
    isActive: true,
    createdAt: now - 45 * DAY,
    updatedAt: now - 45 * DAY,
  });

  // ── 4. laborKits (3 records) ───────────────────────────────────────────────
  await ctx.db.insert("laborKits", {
    organizationId: orgId,
    name: "Cessna 172 Annual Oil Change & Filter",
    description: "Standard Lycoming IO-360 oil change, filter, and safety wire. Includes compression check.",
    ataChapter: "79",
    aircraftType: "Cessna 172S",
    estimatedHours: 1.5,
    laborRate: 125,
    laborItems: [
      { description: "Drain engine oil and capture for analysis", estimatedHours: 0.25, skillRequired: "A&P" },
      { description: "Remove and inspect oil filter — cut for metal particles", estimatedHours: 0.25, skillRequired: "A&P" },
      { description: "Install new oil filter with safety wire", estimatedHours: 0.25, skillRequired: "A&P" },
      { description: "Service with fresh Aeroshell 15W-50, 8 quarts", estimatedHours: 0.25, skillRequired: "A&P" },
      { description: "Run engine to temp, check for leaks, record in logbook", estimatedHours: 0.5, skillRequired: "A&P" },
    ],
    requiredParts: [
      { partNumber: "CH48110-1", description: "Lycoming Oil Filter Element", quantity: 1, unitCost: 18.50 },
      { partNumber: "LW-16702", description: "Oil Filter Gasket", quantity: 1, unitCost: 4.25 },
      { partNumber: "AW15W50-QT", description: "Aeroshell W15W-50 Oil, 1-qt", quantity: 8, unitCost: 9.00 },
    ],
    isActive: true,
    createdAt: now - 90 * DAY,
  });

  await ctx.db.insert("laborKits", {
    organizationId: orgId,
    name: "King Air Main Gear Strut Service",
    description: "Beechcraft King Air B200 main landing gear oleo strut service — nitrogen charge and hydraulic fluid service per AMM Chapter 32.",
    ataChapter: "32",
    aircraftType: "King Air B200",
    estimatedHours: 3.0,
    laborRate: 145,
    laborItems: [
      { description: "Defueling and aircraft jacking", estimatedHours: 0.75, skillRequired: "A&P" },
      { description: "Left main gear — measure extension, deflate, service fluid, recharge nitrogen", estimatedHours: 0.75, skillRequired: "A&P" },
      { description: "Right main gear — same procedure", estimatedHours: 0.75, skillRequired: "A&P" },
      { description: "Retraction test and gear door rigging check", estimatedHours: 0.5, skillRequired: "A&P" },
      { description: "Logbook entry and gear service sticker", estimatedHours: 0.25, skillRequired: "A&P" },
    ],
    requiredParts: [
      { partNumber: "AV680-OIL", description: "MIL-PRF-5606 Hydraulic Fluid, 1-qt", quantity: 2, unitCost: 12.00 },
      { partNumber: "N2-CHARGE", description: "Aviation Dry Nitrogen Charge", quantity: 1, unitCost: 15.00 },
    ],
    externalServices: [
      { vendorName: "APA Ground Services", description: "Aircraft jack rental (4-hour minimum)", estimatedCost: 80 },
    ],
    isActive: true,
    createdAt: now - 75 * DAY,
  });

  await ctx.db.insert("laborKits", {
    organizationId: orgId,
    name: "ELT Battery Replacement & Test",
    description: "406 MHz ELT battery replacement, antenna inspection, and compliance test per 14 CFR §91.207 and TSO-C126b.",
    ataChapter: "25",
    estimatedHours: 1.0,
    laborRate: 125,
    laborItems: [
      { description: "Remove ELT unit from mounting bracket", estimatedHours: 0.25, skillRequired: "A&P" },
      { description: "Replace battery pack per manufacturer installation manual", estimatedHours: 0.25, skillRequired: "A&P" },
      { description: "Inspect antenna, coax, and connector for corrosion", estimatedHours: 0.1, skillRequired: "A&P" },
      { description: "Self-test per RTCA DO-204A and update battery expiry placard", estimatedHours: 0.15, skillRequired: "A&P" },
      { description: "Logbook entry — note new battery expiry date", estimatedHours: 0.25, skillRequired: "A&P" },
    ],
    requiredParts: [
      { partNumber: "453-6604", description: "Artex ELT Battery Pack (ACK/Artex 406)", quantity: 1, unitCost: 145.00 },
    ],
    isActive: true,
    createdAt: now - 60 * DAY,
  });

  // ── 5. inspectionTemplates (3 records) ─────────────────────────────────────
  await ctx.db.insert("inspectionTemplates", {
    organizationId: orgId,
    name: "King Air B200 Phase 3 — Pressurization System",
    aircraftMake: "Beechcraft",
    aircraftModel: "King Air B200",
    inspectionType: "scheduled_phase",
    approvedDataSource: "Beechcraft King Air B200 Maintenance Manual, Chapter 21 — Air Conditioning / Pressurization",
    approvedDataRevision: "Rev 22, dated January 2024",
    steps: [
      {
        stepNumber: 1,
        description: "Inspect pressurization controller and outflow valve for security and condition. Check wiring harness for chafing.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 30,
        zoneReference: "Zone 200 — Fuselage Upper",
      },
      {
        stepNumber: 2,
        description: "Perform pressurization system leak check — inflate cabin to 6.0 psi differential. Maximum allowable leak rate: 120 ft/min cabin altitude rise.",
        requiresSpecialTool: true,
        specialToolReference: "Beechcraft Cabin Pressurization Test Kit P/N 101-1027-1 or equivalent",
        signOffRequired: true,
        signOffRequiresIa: true,
        estimatedDurationMinutes: 60,
        zoneReference: "Zone 200 — Fuselage Upper",
        measurementSpec: {
          name: "Cabin Altitude Rise Rate",
          unit: "ft/min",
          maxValue: 120,
        },
      },
      {
        stepNumber: 3,
        description: "Inspect bleed air ducting, clamps, and insulation blankets for condition, chafing, and security. Check for heat discoloration.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 45,
        zoneReference: "Zone 400 — Engine Nacelles",
      },
      {
        stepNumber: 4,
        description: "Operationally test pressurization on ground — verify cabin altitude, differential pressure, and outflow valve operation through full range.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: true,
        estimatedDurationMinutes: 30,
        zoneReference: "Zone 200 — Fuselage",
      },
    ],
    active: true,
    createdAt: now - 110 * DAY,
    updatedAt: now - 30 * DAY,
  });

  await ctx.db.insert("inspectionTemplates", {
    organizationId: orgId,
    name: "Cessna 172S Annual — Fuel System Inspection",
    aircraftMake: "Cessna",
    aircraftModel: "172S",
    inspectionType: "annual",
    approvedDataSource: "Cessna Model 172 Maintenance Manual, Chapter 28 — Fuel",
    approvedDataRevision: "Rev 15, dated March 2023",
    steps: [
      {
        stepNumber: 1,
        description: "Drain all tank sumps and check for water, sediment, and contamination. Dispose of fuel per local environmental regulations.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 15,
        zoneReference: "Zone 500 — Wing Fuel Tanks",
      },
      {
        stepNumber: 2,
        description: "Remove and inspect both fuel tank caps and filler necks. Check cap O-rings and seals. Replace caps if cracked or worn.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 20,
        zoneReference: "Zone 500 — Wing Fuel Tanks",
      },
      {
        stepNumber: 3,
        description: "Inspect fuel selector valve for proper detent, freedom of movement, and absence of leaks. Operate through all positions.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 15,
        zoneReference: "Zone 100 — Cockpit",
      },
      {
        stepNumber: 4,
        description: "Remove, clean, and inspect gascolator (fuel strainer). Check screen for contamination. Reinstall with new safety wire.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 20,
        zoneReference: "Zone 300 — Firewall/Fuselage Forward",
      },
      {
        stepNumber: 5,
        description: "Inspect all fuel lines, hose connections, and clamps for condition, routing, and security. Check for chafing against structure.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 25,
        zoneReference: "Zone 300/500 — Fuselage & Wings",
      },
      {
        stepNumber: 6,
        description: "Verify fuel quantity gauge calibration by comparing indicated quantity against known fuel quantity. Accuracy must be within ±5% of full scale.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 15,
        zoneReference: "Zone 100 — Cockpit",
      },
    ],
    active: true,
    createdAt: now - 95 * DAY,
    updatedAt: now - 95 * DAY,
  });

  await ctx.db.insert("inspectionTemplates", {
    organizationId: orgId,
    name: "TBM 930 PT6A-66D Compressor Inspection",
    aircraftMake: "Daher",
    aircraftModel: "TBM 930",
    inspectionType: "condition_monitoring",
    approvedDataSource: "Pratt & Whitney Canada PT6A-66D Engine Maintenance Manual, Chapter 72",
    approvedDataRevision: "Rev 09, dated June 2025",
    steps: [
      {
        stepNumber: 1,
        description: "Remove all engine cowl panels per SOCATA TBM 930 AMM Chapter 54. Tag and store fasteners.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 30,
        zoneReference: "Zone 400 — Engine/Nacelle",
      },
      {
        stepNumber: 2,
        description: "Borescope inspection of compressor stages 1 through 4 using approved borescope. Document all nicks, scratches, and corrosion pitting on CAMG borescope form. Evaluate against P&WC limits table.",
        requiresSpecialTool: true,
        specialToolReference: "Olympus HX 10-60 Videoscope or equivalent; P&WC borescope port adapter 3040155",
        signOffRequired: true,
        signOffRequiresIa: true,
        estimatedDurationMinutes: 90,
        zoneReference: "Zone 400 — Engine Compressor Section",
      },
      {
        stepNumber: 3,
        description: "Inspect inlet screen and inlet guide vanes for FOD damage, erosion, and corrosion. Check for cracks at vane attachment roots.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 30,
        zoneReference: "Zone 400 — Engine Inlet",
      },
      {
        stepNumber: 4,
        description: "Record compressor wash status. If wash is due, perform per P&WC SB 14248 procedure before reinstalling cowl.",
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        estimatedDurationMinutes: 15,
        zoneReference: "Zone 400 — Engine",
      },
    ],
    active: true,
    createdAt: now - 70 * DAY,
    updatedAt: now - 15 * DAY,
  });

  // ── 6. evidenceChecklistTemplates (2 records) ──────────────────────────────
  const ectInDock = await ctx.db.insert("evidenceChecklistTemplates", {
    organizationId: orgId,
    evidenceType: "in_dock",
    name: "Standard In-Dock Evidence Package",
    items: [
      "Aircraft condition photo — left side",
      "Aircraft condition photo — right side",
      "Aircraft condition photo — cockpit as-found",
      "Engine compartment photo — as-found",
      "Fuel sample verification photo",
      "Squawk write-up documented in work order",
      "Customer authorization on file",
      "Parts ordered / on-hand confirmed",
    ],
    isDefault: true,
    isActive: true,
    createdByUserId: clerkUserId,
    createdAt: now - 100 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const ectRts = await ctx.db.insert("evidenceChecklistTemplates", {
    organizationId: orgId,
    evidenceType: "rts",
    name: "Standard RTS Evidence Package",
    items: [
      "All work items signed off by A&P",
      "Inspector buy-back complete (IA sign-off where required)",
      "Return to service logbook entry drafted",
      "8130-3 tags for installed parts on file",
      "Final inspection photo — engine compartment",
      "Final inspection photo — landing gear / tires",
      "AD compliance checklist reviewed and updated",
      "Flight manual supplements (AFMS) inserted if applicable",
      "Aircraft data plate and registration verified",
      "Customer notification completed",
    ],
    isDefault: true,
    isActive: true,
    createdByUserId: clerkUserId,
    createdAt: now - 100 * DAY,
    updatedAt: now - 30 * DAY,
  });

  // ── 7. workOrderEvidenceChecklistItems (10 records) ────────────────────────
  // 5 in-dock items for closedWOIds[0]
  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: closedWOIds[0],
    templateId: ectInDock,
    evidenceType: "in_dock",
    bucketKey: "in_dock_checklist",
    label: "Aircraft condition photo — left side",
    order: 1,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-007"],
    completedAt: now - 87 * DAY,
    createdAt: now - 88 * DAY,
    updatedAt: now - 87 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: closedWOIds[0],
    templateId: ectInDock,
    evidenceType: "in_dock",
    bucketKey: "in_dock_checklist",
    label: "Aircraft condition photo — right side",
    order: 2,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-007"],
    completedAt: now - 87 * DAY,
    createdAt: now - 88 * DAY,
    updatedAt: now - 87 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: closedWOIds[0],
    templateId: ectInDock,
    evidenceType: "in_dock",
    bucketKey: "in_dock_checklist",
    label: "Customer authorization on file",
    order: 3,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-005"],
    completedAt: now - 88 * DAY,
    createdAt: now - 88 * DAY,
    updatedAt: now - 88 * DAY,
  });

  // 2 RTS items for closedWOIds[0]
  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: closedWOIds[0],
    templateId: ectRts,
    evidenceType: "rts",
    bucketKey: "rts_checklist",
    label: "All work items signed off by A&P",
    order: 1,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-003"],
    completedAt: now - 75 * DAY,
    createdAt: now - 88 * DAY,
    updatedAt: now - 75 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: closedWOIds[0],
    templateId: ectRts,
    evidenceType: "rts",
    bucketKey: "rts_checklist",
    label: "Inspector buy-back complete (IA sign-off where required)",
    order: 2,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-003"],
    completedAt: now - 75 * DAY,
    createdAt: now - 88 * DAY,
    updatedAt: now - 75 * DAY,
  });

  // 5 items for activeWOIds[0] (in progress — some incomplete)
  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: activeWOIds[0],
    templateId: ectInDock,
    evidenceType: "in_dock",
    bucketKey: "in_dock_checklist",
    label: "Aircraft condition photo — left side",
    order: 1,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-005"],
    completedAt: now - 10 * DAY,
    createdAt: now - 12 * DAY,
    updatedAt: now - 10 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: activeWOIds[0],
    templateId: ectInDock,
    evidenceType: "in_dock",
    bucketKey: "in_dock_checklist",
    label: "Engine compartment photo — as-found",
    order: 2,
    completed: true,
    completedByUserId: clerkUserId,
    completedByTechnicianId: techMap["CAMG-005"],
    completedAt: now - 10 * DAY,
    createdAt: now - 12 * DAY,
    updatedAt: now - 10 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: activeWOIds[0],
    templateId: ectInDock,
    evidenceType: "in_dock",
    bucketKey: "in_dock_checklist",
    label: "Squawk write-up documented in work order",
    order: 3,
    completed: false,
    createdAt: now - 12 * DAY,
    updatedAt: now - 12 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: activeWOIds[0],
    templateId: ectRts,
    evidenceType: "rts",
    bucketKey: "rts_checklist",
    label: "All work items signed off by A&P",
    order: 1,
    completed: false,
    createdAt: now - 12 * DAY,
    updatedAt: now - 12 * DAY,
  });

  await ctx.db.insert("workOrderEvidenceChecklistItems", {
    organizationId: orgId,
    workOrderId: activeWOIds[0],
    templateId: ectRts,
    evidenceType: "rts",
    bucketKey: "rts_checklist",
    label: "Return to service logbook entry drafted",
    order: 2,
    completed: false,
    createdAt: now - 12 * DAY,
    updatedAt: now - 12 * DAY,
  });

  // ── 8. tagCategories (4 records) ───────────────────────────────────────────
  const tcAircraftType = await ctx.db.insert("tagCategories", {
    organizationId: orgId,
    name: "Aircraft Type",
    slug: "aircraft-type",
    categoryType: "aircraft_type",
    description: "Tags parts by compatible aircraft make and model.",
    displayOrder: 1,
    isSystem: true,
    isActive: true,
    createdAt: now - 150 * DAY,
    updatedAt: now - 150 * DAY,
  });

  const tcEngineType = await ctx.db.insert("tagCategories", {
    organizationId: orgId,
    name: "Engine Type",
    slug: "engine-type",
    categoryType: "engine_type",
    description: "Tags parts by compatible engine make and model.",
    displayOrder: 2,
    isSystem: true,
    isActive: true,
    createdAt: now - 150 * DAY,
    updatedAt: now - 150 * DAY,
  });

  const tcAtaChapter = await ctx.db.insert("tagCategories", {
    organizationId: orgId,
    name: "ATA Chapter",
    slug: "ata-chapter",
    categoryType: "ata_chapter",
    description: "ATA 100 chapter classification for inventory search and compliance mapping.",
    displayOrder: 3,
    isSystem: true,
    isActive: true,
    createdAt: now - 150 * DAY,
    updatedAt: now - 150 * DAY,
  });

  const tcComponentType = await ctx.db.insert("tagCategories", {
    organizationId: orgId,
    name: "Component Type",
    slug: "component-type",
    categoryType: "component_type",
    description: "Functional component category for inventory organization.",
    displayOrder: 4,
    isSystem: true,
    isActive: true,
    createdAt: now - 150 * DAY,
    updatedAt: now - 150 * DAY,
  });

  // ── 9. tags (10 records) ───────────────────────────────────────────────────
  const tagKingAirB200 = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcAircraftType,
    name: "King Air B200",
    code: "KA-B200",
    description: "Beechcraft King Air B200 series",
    aircraftMake: "Beechcraft",
    aircraftModel: "King Air B200",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagCessna172 = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcAircraftType,
    name: "Cessna 172",
    code: "C172",
    description: "Cessna 172 series (172R, 172S, 172SP)",
    aircraftMake: "Cessna",
    aircraftModel: "172",
    isActive: true,
    displayOrder: 2,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagTbm930 = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcAircraftType,
    name: "TBM 930",
    code: "TBM930",
    description: "Daher TBM 930 single-engine turboprop",
    aircraftMake: "Daher",
    aircraftModel: "TBM 930",
    isActive: true,
    displayOrder: 3,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagGrandCaravan = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcAircraftType,
    name: "Cessna Grand Caravan",
    code: "C208B",
    description: "Cessna 208B Grand Caravan",
    aircraftMake: "Cessna",
    aircraftModel: "208B Grand Caravan",
    isActive: true,
    displayOrder: 4,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagPt6a = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcEngineType,
    name: "Pratt & Whitney PT6A",
    code: "PT6A",
    description: "P&WC PT6A turboprop series",
    engineMake: "Pratt & Whitney Canada",
    engineModel: "PT6A",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagLycomingIO360 = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcEngineType,
    name: "Lycoming IO-360",
    code: "LYC-IO360",
    description: "Lycoming IO-360 and O-360 series piston engines",
    engineMake: "Lycoming",
    engineModel: "IO-360",
    isActive: true,
    displayOrder: 2,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagAta32 = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcAtaChapter,
    name: "ATA 32 — Landing Gear",
    code: "ATA32",
    description: "Landing gear, wheels, brakes, tires, and retraction systems.",
    isActive: true,
    displayOrder: 32,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagAta79 = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcAtaChapter,
    name: "ATA 79 — Oil",
    code: "ATA79",
    description: "Engine oil system components — filters, lines, coolers.",
    isActive: true,
    displayOrder: 79,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagFilter = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcComponentType,
    name: "Filter",
    code: "FILTER",
    description: "Oil, fuel, and hydraulic filter elements.",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  const tagBearing = await ctx.db.insert("tags", {
    organizationId: orgId,
    categoryId: tcComponentType,
    name: "Bearing",
    code: "BEARING",
    description: "Wheel bearings, engine bearings, and control surface bearings.",
    isActive: true,
    displayOrder: 2,
    createdAt: now - 148 * DAY,
    updatedAt: now - 148 * DAY,
  });

  // ── 10. subtags (6 records) ─────────────────────────────────────────────────
  const subtagB200Series = await ctx.db.insert("subtags", {
    organizationId: orgId,
    tagId: tagKingAirB200,
    categoryId: tcAircraftType,
    name: "B200 / B200GT",
    code: "KA-B200-GT",
    description: "Standard B200 and B200GT variants",
    aircraftSeries: "B200",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 145 * DAY,
    updatedAt: now - 145 * DAY,
  });

  const subtagB200King350 = await ctx.db.insert("subtags", {
    organizationId: orgId,
    tagId: tagKingAirB200,
    categoryId: tcAircraftType,
    name: "King Air 350i",
    code: "KA-350I",
    description: "King Air 350i — extended cabin B300 series",
    aircraftSeries: "350i",
    isActive: true,
    displayOrder: 2,
    createdAt: now - 145 * DAY,
    updatedAt: now - 145 * DAY,
  });

  const subtagPt6a60 = await ctx.db.insert("subtags", {
    organizationId: orgId,
    tagId: tagPt6a,
    categoryId: tcEngineType,
    name: "PT6A-60A (King Air 250)",
    code: "PT6A-60A",
    description: "PT6A-60A variant installed on King Air 250 / B200GT",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 145 * DAY,
    updatedAt: now - 145 * DAY,
  });

  const subtagPt6a66d = await ctx.db.insert("subtags", {
    organizationId: orgId,
    tagId: tagPt6a,
    categoryId: tcEngineType,
    name: "PT6A-66D (TBM 930)",
    code: "PT6A-66D",
    description: "PT6A-66D variant installed on Daher TBM 930",
    isActive: true,
    displayOrder: 2,
    createdAt: now - 145 * DAY,
    updatedAt: now - 145 * DAY,
  });

  const subtagC172S = await ctx.db.insert("subtags", {
    organizationId: orgId,
    tagId: tagCessna172,
    categoryId: tcAircraftType,
    name: "172S Skyhawk SP",
    code: "C172S",
    description: "Cessna 172S Skyhawk SP with IO-360-L2A",
    aircraftSeries: "172S",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 145 * DAY,
    updatedAt: now - 145 * DAY,
  });

  const subtagOilFilter = await ctx.db.insert("subtags", {
    organizationId: orgId,
    tagId: tagFilter,
    categoryId: tcComponentType,
    name: "Oil Filter",
    code: "OIL-FILTER",
    description: "Engine oil filter elements — disposable spin-on and cartridge types.",
    isActive: true,
    displayOrder: 1,
    createdAt: now - 145 * DAY,
    updatedAt: now - 145 * DAY,
  });

  // ── 11. partTags (15 records) ──────────────────────────────────────────────
  // Tag parts[0..14] with realistic taxonomy

  // partIds[0] — Oil Filter Element (CH48110-1) → ATA 79, Filter, Lycoming IO-360, Cessna 172
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[0],
    tagId: tagAta79,
    categoryId: tcAtaChapter,
    categoryName: "ATA Chapter",
    tagName: "ATA 79 — Oil",
    createdAt: now - 140 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[0],
    tagId: tagFilter,
    subtagId: subtagOilFilter,
    categoryId: tcComponentType,
    categoryName: "Component Type",
    tagName: "Filter",
    subtagName: "Oil Filter",
    createdAt: now - 140 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[0],
    tagId: tagLycomingIO360,
    categoryId: tcEngineType,
    categoryName: "Engine Type",
    tagName: "Lycoming IO-360",
    createdAt: now - 140 * DAY,
    createdByUserId: clerkUserId,
  });

  // partIds[1] — Fuel Filter Element → ATA 28 (represented via Filter component type), Cessna 172
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[1],
    tagId: tagFilter,
    categoryId: tcComponentType,
    categoryName: "Component Type",
    tagName: "Filter",
    createdAt: now - 140 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[1],
    tagId: tagCessna172,
    subtagId: subtagC172S,
    categoryId: tcAircraftType,
    categoryName: "Aircraft Type",
    tagName: "Cessna 172",
    subtagName: "172S Skyhawk SP",
    createdAt: now - 140 * DAY,
    createdByUserId: clerkUserId,
  });

  // partIds[5] — Landing gear component → ATA 32, King Air B200
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[5],
    tagId: tagAta32,
    categoryId: tcAtaChapter,
    categoryName: "ATA Chapter",
    tagName: "ATA 32 — Landing Gear",
    createdAt: now - 138 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[5],
    tagId: tagKingAirB200,
    subtagId: subtagB200Series,
    categoryId: tcAircraftType,
    categoryName: "Aircraft Type",
    tagName: "King Air B200",
    subtagName: "B200 / B200GT",
    createdAt: now - 138 * DAY,
    createdByUserId: clerkUserId,
  });

  // partIds[8] — Bearing → ATA 32, Bearing component type
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[8],
    tagId: tagAta32,
    categoryId: tcAtaChapter,
    categoryName: "ATA Chapter",
    tagName: "ATA 32 — Landing Gear",
    createdAt: now - 136 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[8],
    tagId: tagBearing,
    categoryId: tcComponentType,
    categoryName: "Component Type",
    tagName: "Bearing",
    createdAt: now - 136 * DAY,
    createdByUserId: clerkUserId,
  });

  // partIds[10] — PT6A component → Engine type PT6A
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[10],
    tagId: tagPt6a,
    subtagId: subtagPt6a60,
    categoryId: tcEngineType,
    categoryName: "Engine Type",
    tagName: "Pratt & Whitney PT6A",
    subtagName: "PT6A-60A (King Air 250)",
    createdAt: now - 134 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[10],
    tagId: tagKingAirB200,
    categoryId: tcAircraftType,
    categoryName: "Aircraft Type",
    tagName: "King Air B200",
    createdAt: now - 134 * DAY,
    createdByUserId: clerkUserId,
  });

  // partIds[15] — TBM part → PT6A-66D, TBM 930
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[15],
    tagId: tagPt6a,
    subtagId: subtagPt6a66d,
    categoryId: tcEngineType,
    categoryName: "Engine Type",
    tagName: "Pratt & Whitney PT6A",
    subtagName: "PT6A-66D (TBM 930)",
    createdAt: now - 132 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[15],
    tagId: tagTbm930,
    categoryId: tcAircraftType,
    categoryName: "Aircraft Type",
    tagName: "TBM 930",
    createdAt: now - 132 * DAY,
    createdByUserId: clerkUserId,
  });

  // partIds[20] — Caravan part → Grand Caravan, PT6A
  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[20],
    tagId: tagGrandCaravan,
    categoryId: tcAircraftType,
    categoryName: "Aircraft Type",
    tagName: "Cessna Grand Caravan",
    createdAt: now - 128 * DAY,
    createdByUserId: clerkUserId,
  });

  await ctx.db.insert("partTags", {
    organizationId: orgId,
    partId: partIds[20],
    tagId: tagPt6a,
    categoryId: tcEngineType,
    categoryName: "Engine Type",
    tagName: "Pratt & Whitney PT6A",
    createdAt: now - 128 * DAY,
    createdByUserId: clerkUserId,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 8: Scheduling & Settings
// ══════════════════════════════════════════════════════════════════════════════

export async function seedWave8(ctx: MutationCtx, ids: SeedIds) {
  const { orgId, clerkUserId, now, DAY, techMap, hangarBayIds, locationMap } = ids;

  // ── 1. schedulingSettings (1 record) ───────────────────────────────────────
  await ctx.db.insert("schedulingSettings", {
    organizationId: orgId,
    capacityBufferPercent: 15,
    defaultShiftDays: [1, 2, 3, 4, 5], // Mon–Fri
    defaultStartHour: 7,
    defaultEndHour: 17,
    defaultEfficiencyMultiplier: 0.85,
    timezone: "America/Denver",
    operatingHours: [
      { dayOfWeek: 0, isOpen: false, openTime: "07:00", closeTime: "17:00" }, // Mon (schema: 0=Mon)
      { dayOfWeek: 1, isOpen: true,  openTime: "07:00", closeTime: "17:00" }, // Tue
      { dayOfWeek: 2, isOpen: true,  openTime: "07:00", closeTime: "17:00" }, // Wed
      { dayOfWeek: 3, isOpen: true,  openTime: "07:00", closeTime: "17:00" }, // Thu
      { dayOfWeek: 4, isOpen: true,  openTime: "07:00", closeTime: "17:00" }, // Fri
      { dayOfWeek: 5, isOpen: false, openTime: "08:00", closeTime: "14:00" }, // Sat
      { dayOfWeek: 6, isOpen: false, openTime: "07:00", closeTime: "17:00" }, // Sun
    ],
    updatedAt: now - 30 * DAY,
    updatedByUserId: clerkUserId,
  });

  // ── 2. schedulingHolidays (10 records) — 2026 US Federal Holidays ──────────
  const apaLocationId = locationMap["APA"];
  const fnlLocationId = locationMap["FNL"];

  // New Year's Day — Jan 1, 2026
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    dateKey: "2026-01-01",
    name: "New Year's Day",
    isObserved: true,
    notes: "Shop closed. Emergency on-call available.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // MLK Day — Jan 19, 2026 (3rd Monday of January)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    dateKey: "2026-01-19",
    name: "Martin Luther King Jr. Day",
    isObserved: true,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Presidents' Day — Feb 16, 2026 (3rd Monday of February)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    dateKey: "2026-02-16",
    name: "Presidents' Day",
    isObserved: true,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Memorial Day — May 25, 2026 (last Monday of May)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    dateKey: "2026-05-25",
    name: "Memorial Day",
    isObserved: true,
    notes: "Both APA and FNL closed.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Juneteenth — June 19, 2026
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    dateKey: "2026-06-19",
    name: "Juneteenth National Independence Day",
    isObserved: true,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Independence Day — July 4, 2026 (Saturday — observed Friday July 3)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    dateKey: "2026-07-03",
    name: "Independence Day (Observed)",
    isObserved: true,
    notes: "July 4th falls on Saturday; observed on Friday July 3rd.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Labor Day — Sep 7, 2026 (first Monday of September)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    dateKey: "2026-09-07",
    name: "Labor Day",
    isObserved: true,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Columbus Day — Oct 12, 2026 (2nd Monday of October)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    dateKey: "2026-10-12",
    name: "Columbus Day",
    isObserved: false,
    notes: "Federal holiday — shop remains open at reduced capacity. No scheduled inspections.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Veterans Day — Nov 11, 2026
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    dateKey: "2026-11-11",
    name: "Veterans Day",
    isObserved: true,
    notes: "Shop closed. We honor our veterans.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Thanksgiving — Nov 26, 2026 (4th Thursday of November)
  await ctx.db.insert("schedulingHolidays", {
    organizationId: orgId,
    dateKey: "2026-11-26",
    name: "Thanksgiving Day",
    isObserved: true,
    notes: "Shop closed Thursday and Friday (Nov 27 taken as informal holiday).",
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // ── 3. stationSupportedAircraft (8 records) ─────────────────────────────────
  // APA station capabilities
  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    make: "Beechcraft",
    model: "King Air B200",
    series: "B200 / B200GT",
    category: "turboprop",
    compatibleBayIds: [hangarBayIds[0], hangarBayIds[1]],
    createdAt: now - 160 * DAY,
    updatedAt: now - 160 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    make: "Beechcraft",
    model: "King Air 350i",
    series: "350i",
    category: "turboprop",
    compatibleBayIds: [hangarBayIds[0]],
    createdAt: now - 160 * DAY,
    updatedAt: now - 160 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    make: "Daher",
    model: "TBM 930",
    category: "turboprop",
    compatibleBayIds: [hangarBayIds[0], hangarBayIds[1]],
    createdAt: now - 160 * DAY,
    updatedAt: now - 160 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    make: "Cessna",
    model: "172S",
    series: "Skyhawk SP",
    category: "single-engine",
    compatibleBayIds: [hangarBayIds[1], hangarBayIds[2]],
    createdAt: now - 160 * DAY,
    updatedAt: now - 160 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    make: "Cessna",
    model: "208B Grand Caravan",
    category: "turboprop",
    compatibleBayIds: [hangarBayIds[0]],
    createdAt: now - 160 * DAY,
    updatedAt: now - 160 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: apaLocationId,
    make: "Beechcraft",
    model: "Bonanza A36",
    category: "single-engine",
    compatibleBayIds: [hangarBayIds[1], hangarBayIds[2]],
    createdAt: now - 160 * DAY,
    updatedAt: now - 160 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  // FNL station capabilities (smaller facility)
  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: fnlLocationId,
    make: "Cessna",
    model: "172S",
    series: "Skyhawk SP",
    category: "single-engine",
    compatibleBayIds: [hangarBayIds[3], hangarBayIds[4]],
    createdAt: now - 155 * DAY,
    updatedAt: now - 155 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("stationSupportedAircraft", {
    organizationId: orgId,
    shopLocationId: fnlLocationId,
    make: "Cessna",
    model: "182T",
    series: "Skylane",
    category: "single-engine",
    compatibleBayIds: [hangarBayIds[3], hangarBayIds[4]],
    createdAt: now - 155 * DAY,
    updatedAt: now - 155 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  // ── 4. workOrderStageConfigs (1 record) ─────────────────────────────────────
  await ctx.db.insert("workOrderStageConfigs", {
    organizationId: orgId,
    stages: [
      {
        id: "intake",
        label: "Intake",
        description: "Aircraft received, work order opened, initial inspection in progress.",
        color: "#64748b",
        sortOrder: 1,
        statusMappings: ["draft", "open"],
      },
      {
        id: "active_work",
        label: "Active Work",
        description: "Maintenance actively in progress on aircraft.",
        color: "#3b82f6",
        sortOrder: 2,
        statusMappings: ["in_progress"],
      },
      {
        id: "hold",
        label: "On Hold",
        description: "Work paused — awaiting parts, customer authorization, or inspection.",
        color: "#f59e0b",
        sortOrder: 3,
        statusMappings: ["on_hold", "pending_inspection", "pending_signoff", "open_discrepancies"],
      },
      {
        id: "closeout",
        label: "Closeout",
        description: "Work complete — processing RTS, final sign-offs, and invoicing.",
        color: "#8b5cf6",
        sortOrder: 4,
        statusMappings: ["closed"],
      },
      {
        id: "closed",
        label: "Closed / Released",
        description: "Aircraft returned to service. Work order closed and invoiced.",
        color: "#10b981",
        sortOrder: 5,
        statusMappings: ["cancelled", "voided"],
      },
    ],
    createdAt: now - 90 * DAY,
    updatedAt: now - 14 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  // ── 5. stationTimelineCursorConfig (1 record) ───────────────────────────────
  await ctx.db.insert("stationTimelineCursorConfig", {
    organizationId: orgId,
    cursors: [
      { id: "today", label: "Today", dayOffset: 0, colorClass: "text-red-500", enabled: true },
      { id: "parts_eta", label: "Parts ETA", dayOffset: 5, colorClass: "text-amber-500", enabled: true },
      { id: "target_rts", label: "Target RTS", dayOffset: 14, colorClass: "text-emerald-500", enabled: true },
      { id: "customer_deadline", label: "Customer Deadline", dayOffset: 21, colorClass: "text-violet-500", enabled: true },
      { id: "quarter_end", label: "Quarter End", dayOffset: 90, colorClass: "text-sky-400", enabled: false },
    ],
    rangeStartDay: -7,
    rangeEndDay: 60,
    createdAt: now - 60 * DAY,
    updatedAt: now - 7 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  // ── 6. planningFinancialSettings (1 record) ─────────────────────────────────
  await ctx.db.insert("planningFinancialSettings", {
    organizationId: orgId,
    defaultShopRate: 145,           // $/hr — blended A&P labor rate
    defaultLaborCostRate: 58,       // $/hr — average fully-loaded labor cost
    monthlyFixedOverhead: 42000,    // Rent, insurance, depreciation, salaries (fixed)
    monthlyVariableOverhead: 18500, // Utilities, consumables, variable operational costs
    annualCapexAssumption: 85000,   // Equipment, tooling, hangar improvements
    partMarkupTiers: [
      { maxLimit: 100,    markupPercent: 50 }, // < $100: 50% markup
      { maxLimit: 500,    markupPercent: 35 }, // $100–$500: 35% markup
      { maxLimit: 2500,   markupPercent: 25 }, // $500–$2,500: 25% markup
      { maxLimit: 10000,  markupPercent: 20 }, // $2,500–$10,000: 20% markup
      { maxLimit: Infinity, markupPercent: 15 }, // > $10,000: 15% markup
    ],
    serviceMarkupTiers: [
      { maxLimit: 1000,   markupPercent: 20 }, // < $1,000: 20% markup
      { maxLimit: 10000,  markupPercent: 15 }, // $1,000–$10,000: 15% markup
      { maxLimit: Infinity, markupPercent: 10 }, // > $10,000: 10% markup
    ],
    updatedAt: now - 45 * DAY,
    updatedByUserId: clerkUserId,
  });

  // ── 7. planningScenarios (2 records) ───────────────────────────────────────
  await ctx.db.insert("planningScenarios", {
    organizationId: orgId,
    name: "Standard 90-Day Rolling Window",
    isDefault: true,
    rangeStartDay: -7,
    rangeEndDay: 90,
    cursors: [
      { label: "Today", dayOffset: 0, color: "#ef4444", enabled: true },
      { label: "Parts ETA", dayOffset: 5, color: "#f59e0b", enabled: true },
      { label: "Target RTS", dayOffset: 14, color: "#10b981", enabled: true },
    ],
    notes: "Default planning view — 7-day lookback, 90-day forward. Used for weekly capacity reviews.",
    createdAt: now - 60 * DAY,
    updatedAt: now - 7 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  await ctx.db.insert("planningScenarios", {
    organizationId: orgId,
    name: "Q2 2026 Revenue Push",
    isDefault: false,
    rangeStartDay: 0,
    rangeEndDay: 120,
    cursors: [
      { label: "Today", dayOffset: 0, color: "#ef4444", enabled: true },
      { label: "Q2 End", dayOffset: 111, color: "#8b5cf6", enabled: true }, // Jun 30
      { label: "Fleet Annuals Due", dayOffset: 75, color: "#f59e0b", enabled: true },
    ],
    notes: "Extended scenario to track Q2 revenue targets and fleet annual inspection scheduling for summer flying season.",
    createdAt: now - 15 * DAY,
    updatedAt: now - 15 * DAY,
    createdByUserId: clerkUserId,
    updatedByUserId: clerkUserId,
  });

  // ── 8. notificationPreferences (3 records) ─────────────────────────────────
  // Admin (Harwick) — suppresses only high-volume assignment notifications
  await ctx.db.insert("notificationPreferences", {
    userId: clerkUserId,
    organizationId: orgId,
    disabledTypes: ["assignment"],
    updatedAt: now - 30 * DAY,
  });

  // Shop manager (Santos) — wants all notifications
  await ctx.db.insert("notificationPreferences", {
    userId: `clerk_simulated_${techMap["CAMG-002"]}`,
    organizationId: orgId,
    disabledTypes: [],
    updatedAt: now - 25 * DAY,
  });

  // QCM inspector (Chen) — suppresses non-critical items
  await ctx.db.insert("notificationPreferences", {
    userId: `clerk_simulated_${techMap["CAMG-003"]}`,
    organizationId: orgId,
    disabledTypes: ["part_received", "assignment", "system"],
    updatedAt: now - 20 * DAY,
  });

  // ── 9. technicianShifts (8 records) ────────────────────────────────────────
  // APA technicians — standard Mon–Fri, 07:00–17:00

  // James Harwick (admin) — 4/10 schedule
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-001"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [1, 2, 3, 4], // Mon–Thu (4x10)
    startHour: 7,
    endHour: 18,
    efficiencyMultiplier: 1.0,
    notes: "Admin 4/10 schedule — Monday through Thursday 07:00–18:00",
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // Maria Santos (shop_manager) — standard 5/8
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-002"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
    startHour: 7,
    endHour: 15,
    efficiencyMultiplier: 1.0,
    notes: "Shop manager shift — early start to overlap with all technician shifts",
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // Robert Chen (QCM inspector) — standard 5/8
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-003"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 15,
    efficiencyMultiplier: 1.0,
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // David Kowalski (lead tech APA) — 4/10 schedule
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-005"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [1, 2, 3, 4],
    startHour: 7,
    endHour: 18,
    efficiencyMultiplier: 1.1,
    notes: "Senior lead technician — higher efficiency multiplier reflects experience",
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // Sarah Nakamura (lead tech FNL) — 5/8
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-006"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 15,
    efficiencyMultiplier: 1.05,
    notes: "FNL station lead — based at FNL",
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // Mike Patterson (tech APA) — 5/8
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-007"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [2, 3, 4, 5, 6], // Tue–Sat (staggered)
    startHour: 8,
    endHour: 16,
    efficiencyMultiplier: 0.9,
    notes: "Staggered Tue–Sat shift to maintain weekend coverage",
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // Priya Desai (tech APA) — 5/8
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-008"],
    organizationId: orgId,
    effectiveFrom: now - 90 * DAY,
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 15,
    efficiencyMultiplier: 0.85,
    notes: "Updated after completing instrument rating — shift unchanged",
    createdAt: now - 90 * DAY,
    createdByUserId: clerkUserId,
  });

  // Carlos Mendez (tech FNL) — 4/10 FNL
  await ctx.db.insert("technicianShifts", {
    technicianId: techMap["CAMG-009"],
    organizationId: orgId,
    effectiveFrom: now - 180 * DAY,
    daysOfWeek: [1, 2, 3, 4],
    startHour: 7,
    endHour: 18,
    efficiencyMultiplier: 0.9,
    notes: "FNL station 4/10 schedule",
    createdAt: now - 180 * DAY,
    createdByUserId: clerkUserId,
  });

  // ── 10. maintenancePredictions (5 records) ──────────────────────────────────
  // Aircraft[0] = N341PA King Air B200
  await ctx.db.insert("maintenancePredictions", {
    organizationId: orgId,
    aircraftId: ids.aircraftIds[0], // N341PA King Air B200
    componentPartNumber: "PT6A-52",
    predictionType: "time_based",
    predictedDate: now + 45 * DAY,
    confidence: 88,
    severity: "high",
    description: "Engine hot section inspection (HSI) approaching per P&WC TBO interval. Estimated to be due within 45 days based on current engine hours accumulation rate.",
    recommendation: "Schedule PT6A-52 HSI with StandardAero. Lead time is 3–4 weeks. Coordinate with customer to minimize AOG time.",
    basedOn: "Engine log hours analysis: 1,980 hours SHSI of 2,000-hour interval. Current flying rate: ~20 hrs/month.",
    status: "acknowledged",
    acknowledgedBy: clerkUserId,
    createdAt: now - 14 * DAY,
    updatedAt: now - 7 * DAY,
  });

  // Aircraft[2] = N172FR Cessna 172S
  await ctx.db.insert("maintenancePredictions", {
    organizationId: orgId,
    aircraftId: ids.aircraftIds[2], // N172FR Cessna 172S
    componentPartNumber: "OH-360-A1A6",
    predictionType: "usage_based",
    predictedDate: now + 120 * DAY,
    confidence: 72,
    severity: "medium",
    description: "Lycoming IO-360 engine approaching 2,000-hour TBO. Predicted to reach TBO in approximately 4 months based on current utilization.",
    recommendation: "Advise customer to plan engine overhaul or replacement. Recommend obtaining exchange quote from RAM Aircraft or Mattituck. Budget: $28,000–$35,000.",
    basedOn: "Engine log: 1,832 hours SMOH of 2,000-hour Lycoming TBO. Average utilization: 14 hours/month (flight school).",
    status: "active",
    createdAt: now - 7 * DAY,
    updatedAt: now - 7 * DAY,
  });

  // Aircraft[4] = N930MW TBM 930
  await ctx.db.insert("maintenancePredictions", {
    organizationId: orgId,
    aircraftId: ids.aircraftIds[4], // N930MW TBM 930
    componentPartNumber: "PT6A-66D",
    componentSerialNumber: "PCE-RB0812",
    predictionType: "trend_based",
    predictedDate: now + 30 * DAY,
    confidence: 81,
    severity: "high",
    description: "Oil consumption trend indicates possible compressor seal degradation. Trending at 0.8 qt/hr vs. normal 0.3 qt/hr baseline. If trend continues, component failure may occur before next scheduled maintenance.",
    recommendation: "Perform compressor wash and borescope inspection ASAP. Consider HSI if internal damage is found. Do not extend beyond 30 days without re-evaluation.",
    basedOn: "Last 5 oil service intervals — oil added per flight: 0.2, 0.3, 0.5, 0.6, 0.8 qt/hr. Trend R²=0.94 (strong linear increase).",
    status: "active",
    createdAt: now - 5 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // Aircraft[7] = N206HCA Cessna T206H
  await ctx.db.insert("maintenancePredictions", {
    organizationId: orgId,
    aircraftId: ids.aircraftIds[7], // N206HCA Cessna T206H
    componentPartNumber: "TCM-TSIO-540-AJ1A",
    predictionType: "condition_based",
    predictedDate: now + 60 * DAY,
    confidence: 65,
    severity: "medium",
    description: "Low compression on cylinder #4 (56/80 psi) detected at last 100-hour inspection. Below service limit of 60/80 psi. Requires top overhaul or cylinder replacement before next 100-hour inspection.",
    recommendation: "Order replacement cylinder assembly (P/N 641523) and schedule top overhaul within 60 days. Customer should limit operation to VFR day pending repair.",
    basedOn: "100-hour compression check 2026-02-28: Cyl 1: 76, Cyl 2: 74, Cyl 3: 73, Cyl 4: 56 (below 60 psi limit per Lycoming SL L180C), Cyl 5: 75, Cyl 6: 72.",
    status: "scheduled",
    createdAt: now - 12 * DAY,
    updatedAt: now - 3 * DAY,
  });

  // Aircraft[9] = N90FR Bonanza A36
  await ctx.db.insert("maintenancePredictions", {
    organizationId: orgId,
    aircraftId: ids.aircraftIds[9], // N90FR Bonanza A36
    predictionType: "time_based",
    predictedDate: now + 10 * DAY,
    confidence: 95,
    severity: "low",
    description: "Pitot-static system certification (biennial altimeter/encoder test) due within 10 days per 14 CFR §91.411.",
    recommendation: "Schedule pitot-static certification test. Allow 2 hours shop time. Pair with transponder §91.413 check if due (last cert was 23 months ago).",
    basedOn: "Last pitot-static certification: 2024-03-08. 24-month requirement per 14 CFR §91.411. Due by 2026-03-08.",
    status: "active",
    createdAt: now - 3 * DAY,
    updatedAt: now - 3 * DAY,
  });
}
