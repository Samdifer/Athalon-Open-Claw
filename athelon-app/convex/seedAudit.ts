import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const DEFAULT_SCENARIO_KEY = "ATHELON-DEMO-KA-TBM-2LOC";

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

const PARTS_CONTRACT = {
  consumables_hardware: 18,
  powerplant_service: 12,
  airframe_brake_env: 10,
  avionics_electrical: 8,
  lifeLimited: 6,
  shelfLifeLimited: 10,
  serialized: 20,
  ownerSupplied: 2,
  lowStock: 6,
  pendingInspection: 4,
  quarantine: 4,
  removedPendingDisposition: 4,
  installed: 6,
  expiredShelfLife: 2,
  nearLifeLimit: 2,
  lifeExpiredInQuarantine: 1,
  pendingWithoutInspection: 4,
};

const SCENARIO_FLEET_TAIL_PATTERN = /^(N2KA0[1-8]|N9TB0[1-4])$/;

type PartsUseCaseCoverage = {
  familyCounts: {
    consumables_hardware: number;
    powerplant_service: number;
    airframe_brake_env: number;
    avionics_electrical: number;
  };
  lifeLimited: number;
  shelfLifeLimited: number;
  serialized: number;
  ownerSupplied: number;
  lowStock: number;
  pendingInspection: number;
  quarantine: number;
  removedPendingDisposition: number;
  installed: number;
  expiredShelfLife: number;
  nearLifeLimit: number;
  lifeExpiredInQuarantine: number;
  pendingWithoutInspection: number;
};

type Snapshot = {
  organizationId: Id<"organizations">;
  scenarioKey: string;
  locations: any[];
  bays: any[];
  technicians: any[];
  aircraft: any[];
  engines: any[];
  propellers: any[];
  workOrders: any[];
  assignments: any[];
  taskCards: any[];
  vendors: any[];
  parts: any[];
  tools: any[];
  rotables: any[];
  loaners: any[];
  quotes: any[];
  perLocationScheduledCounts: Array<{
    locationId: Id<"shopLocations">;
    locationCode: string;
    scheduled: number;
  }>;
  perLocationToolCounts: Array<{
    locationId: Id<"shopLocations">;
    locationCode: string;
    tools: number;
  }>;
  statusMix: Record<string, number>;
  toolStatusMix: Record<string, number>;
  toolCategoryMix: Record<string, number>;
  partsUseCaseCoverage: PartsUseCaseCoverage;
  fleetComponentCoverage: Array<{
    aircraftId: Id<"aircraft">;
    tailNumber: string;
    expected: number;
    engines: number;
    propellers: number;
  }>;
  actualCounts: Record<keyof typeof REQUIRED_COUNTS, number>;
};

function buildPartsUseCaseCoverage(parts: any[]): PartsUseCaseCoverage {
  const now = Date.now();

  const coverage: PartsUseCaseCoverage = {
    familyCounts: {
      consumables_hardware: 0,
      powerplant_service: 0,
      airframe_brake_env: 0,
      avionics_electrical: 0,
    },
    lifeLimited: 0,
    shelfLifeLimited: 0,
    serialized: 0,
    ownerSupplied: 0,
    lowStock: 0,
    pendingInspection: 0,
    quarantine: 0,
    removedPendingDisposition: 0,
    installed: 0,
    expiredShelfLife: 0,
    nearLifeLimit: 0,
    lifeExpiredInQuarantine: 0,
    pendingWithoutInspection: 0,
  };

  for (const part of parts) {
    const notes = String(part.notes ?? "");

    if (notes.includes("family:consumables_hardware")) coverage.familyCounts.consumables_hardware += 1;
    if (notes.includes("family:powerplant_service")) coverage.familyCounts.powerplant_service += 1;
    if (notes.includes("family:airframe_brake_env")) coverage.familyCounts.airframe_brake_env += 1;
    if (notes.includes("family:avionics_electrical")) coverage.familyCounts.avionics_electrical += 1;

    if (part.isLifeLimited) coverage.lifeLimited += 1;
    if (part.hasShelfLifeLimit) coverage.shelfLifeLimited += 1;
    if (part.isSerialized) coverage.serialized += 1;
    if (part.isOwnerSupplied) coverage.ownerSupplied += 1;
    if (part.minStockLevel != null && part.reorderPoint != null) coverage.lowStock += 1;

    if (part.location === "pending_inspection") coverage.pendingInspection += 1;
    if (part.location === "quarantine") coverage.quarantine += 1;
    if (part.location === "removed_pending_disposition") coverage.removedPendingDisposition += 1;
    if (part.location === "installed") coverage.installed += 1;

    if (part.hasShelfLifeLimit && part.shelfLifeLimitDate != null && part.shelfLifeLimitDate <= now) {
      coverage.expiredShelfLife += 1;
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

    if (nearHours || nearCycles) coverage.nearLifeLimit += 1;

    const expiredHours = hoursRemaining != null && hoursRemaining <= 0;
    const expiredCycles = cyclesRemaining != null && cyclesRemaining <= 0;

    if (part.location === "quarantine" && part.isLifeLimited && (expiredHours || expiredCycles)) {
      coverage.lifeExpiredInQuarantine += 1;
    }

    if (part.location === "pending_inspection" && part.receivingInspectedAt == null) {
      coverage.pendingWithoutInspection += 1;
    }
  }

  return coverage;
}

async function buildSnapshot(
  ctx: { db: { query: (...args: any[]) => any } },
  scenarioKey: string,
): Promise<Snapshot | null> {
  const org = await ctx.db
    .query("organizations")
    .filter((q: any) => q.eq(q.field("name"), scenarioKey))
    .first();

  if (!org) return null;

  const [
    locations,
    bays,
    technicians,
    aircraft,
    engines,
    propellers,
    workOrders,
    assignmentsRaw,
    taskCards,
    vendors,
    parts,
    tools,
    rotables,
    loaners,
    quotes,
  ] = await Promise.all([
    ctx.db.query("shopLocations").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("hangarBays").withIndex("by_org", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("technicians").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("aircraft").withIndex("by_organization", (q: any) => q.eq("operatingOrganizationId", org._id)).collect(),
    ctx.db.query("engines").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("propellers").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("workOrders").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("scheduleAssignments").withIndex("by_org", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("taskCards").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("vendors").withIndex("by_org", (q: any) => q.eq("orgId", org._id)).collect(),
    ctx.db.query("parts").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("toolRecords").withIndex("by_org", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("rotables").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("loanerItems").withIndex("by_organization", (q: any) => q.eq("organizationId", org._id)).collect(),
    ctx.db.query("quotes").withIndex("by_org", (q: any) => q.eq("orgId", org._id)).collect(),
  ]);

  const assignments = assignmentsRaw.filter((assignment: any) => assignment.archivedAt === undefined);
  const bayById = new Map<string, any>(bays.map((bay: any) => [String(bay._id), bay]));
  const workOrderById = new Map<string, any>(
    workOrders.map((workOrder: any) => [String(workOrder._id), workOrder]),
  );

  const scheduledByLocation = new Map<string, number>();
  for (const assignment of assignments) {
    const locationId =
      assignment.shopLocationId ??
      workOrderById.get(String(assignment.workOrderId))?.shopLocationId ??
      bayById.get(String(assignment.hangarBayId))?.shopLocationId;
    if (!locationId) continue;
    const key = String(locationId);
    scheduledByLocation.set(key, (scheduledByLocation.get(key) ?? 0) + 1);
  }

  const perLocationScheduledCounts = locations.map((location: any) => ({
    locationId: location._id,
    locationCode: location.code,
    scheduled: scheduledByLocation.get(String(location._id)) ?? 0,
  }));

  const toolsByLocation = new Map<string, number>();
  for (const tool of tools as any[]) {
    const inferredLocationId =
      tool.shopLocationId ??
      locations.find((location: any) =>
        typeof tool.location === "string" && tool.location.toUpperCase().includes(location.code),
      )?._id;

    if (!inferredLocationId) continue;
    const key = String(inferredLocationId);
    toolsByLocation.set(key, (toolsByLocation.get(key) ?? 0) + 1);
  }

  const perLocationToolCounts = locations.map((location: any) => ({
    locationId: location._id,
    locationCode: location.code,
    tools: toolsByLocation.get(String(location._id)) ?? 0,
  }));

  const statusMix: Record<string, number> = {};
  for (const workOrder of workOrders as any[]) {
    statusMix[workOrder.status] = (statusMix[workOrder.status] ?? 0) + 1;
  }

  const toolStatusMix: Record<string, number> = {};
  const toolCategoryMix: Record<string, number> = {};
  for (const tool of tools as any[]) {
    toolStatusMix[tool.status] = (toolStatusMix[tool.status] ?? 0) + 1;
    toolCategoryMix[tool.category] = (toolCategoryMix[tool.category] ?? 0) + 1;
  }

  const partsUseCaseCoverage = buildPartsUseCaseCoverage(parts);

  const fleetContractAircraft = aircraft.filter((aircraftRow: any) =>
    SCENARIO_FLEET_TAIL_PATTERN.test(String(aircraftRow.currentRegistration ?? "")),
  );
  const fleetAircraftIdSet = new Set(
    fleetContractAircraft.map((aircraftRow: any) => String(aircraftRow._id)),
  );

  const fleetComponentCoverage = fleetContractAircraft.map((aircraftRow: any) => {
    const tailNumber = aircraftRow.currentRegistration ?? aircraftRow.serialNumber;
    const expected = aircraftRow.engineCount ?? 0;
    const engineCount = engines.filter(
      (engine: any) => engine.currentAircraftId === aircraftRow._id,
    ).length;
    const propellerCount = propellers.filter(
      (propeller: any) => propeller.aircraftId === aircraftRow._id,
    ).length;
    return {
      aircraftId: aircraftRow._id,
      tailNumber,
      expected,
      engines: engineCount,
      propellers: propellerCount,
    };
  });

  const actualCounts = {
    locations: locations.length,
    hangarBays: bays.length,
    technicians: technicians.length,
    aircraft: fleetContractAircraft.length,
    engines: engines.filter((engine: any) =>
      fleetAircraftIdSet.has(String(engine.currentAircraftId)),
    ).length,
    propellers: propellers.filter((propeller: any) =>
      fleetAircraftIdSet.has(String(propeller.aircraftId)),
    ).length,
    workOrders: workOrders.length,
    scheduleAssignments: assignments.length,
    taskCards: taskCards.length,
    vendors: vendors.length,
    parts: parts.length,
    toolRecords: tools.length,
    rotables: rotables.length,
    loanerItems: loaners.length,
    quotes: quotes.length,
  };

  return {
    organizationId: org._id,
    scenarioKey,
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
    perLocationScheduledCounts,
    perLocationToolCounts,
    statusMix,
    toolStatusMix,
    toolCategoryMix,
    partsUseCaseCoverage,
    fleetComponentCoverage,
    actualCounts,
  };
}

function coveragePassFail(snapshot: Snapshot) {
  const countFailures = Object.entries(REQUIRED_COUNTS)
    .filter(([key, required]) => snapshot.actualCounts[key as keyof typeof REQUIRED_COUNTS] !== required)
    .map(([key, required]) => {
      const actual = snapshot.actualCounts[key as keyof typeof REQUIRED_COUNTS];
      return `${key}: expected ${required}, actual ${actual}`;
    });

  const perLocationFailures = snapshot.perLocationScheduledCounts
    .filter((row) => row.scheduled !== 15)
    .map((row) => `${row.locationCode}: expected 15 scheduled, actual ${row.scheduled}`);

  const perLocationToolFailures = snapshot.perLocationToolCounts
    .filter((row) => row.tools !== 20)
    .map((row) => `${row.locationCode}: expected 20 tools, actual ${row.tools}`);

  const familyFailures: string[] = [];
  for (const [family, minimum] of Object.entries(PARTS_CONTRACT).filter(([key]) =>
    ["consumables_hardware", "powerplant_service", "airframe_brake_env", "avionics_electrical"].includes(key),
  )) {
    const actual = snapshot.partsUseCaseCoverage.familyCounts[family as keyof PartsUseCaseCoverage["familyCounts"]];
    if (actual < minimum) {
      familyFailures.push(`${family}: expected >= ${minimum}, actual ${actual}`);
    }
  }

  const edgeChecks: Array<[string, number]> = [
    ["lifeLimited", PARTS_CONTRACT.lifeLimited],
    ["shelfLifeLimited", PARTS_CONTRACT.shelfLifeLimited],
    ["serialized", PARTS_CONTRACT.serialized],
    ["ownerSupplied", PARTS_CONTRACT.ownerSupplied],
    ["lowStock", PARTS_CONTRACT.lowStock],
    ["pendingInspection", PARTS_CONTRACT.pendingInspection],
    ["quarantine", PARTS_CONTRACT.quarantine],
    ["removedPendingDisposition", PARTS_CONTRACT.removedPendingDisposition],
    ["installed", PARTS_CONTRACT.installed],
    ["expiredShelfLife", PARTS_CONTRACT.expiredShelfLife],
    ["nearLifeLimit", PARTS_CONTRACT.nearLifeLimit],
    ["lifeExpiredInQuarantine", PARTS_CONTRACT.lifeExpiredInQuarantine],
    ["pendingWithoutInspection", PARTS_CONTRACT.pendingWithoutInspection],
  ];

  const edgeFailures = edgeChecks
    .filter(([key, minimum]) => (snapshot.partsUseCaseCoverage as any)[key] < minimum)
    .map(([key, minimum]) => `${key}: expected >= ${minimum}, actual ${(snapshot.partsUseCaseCoverage as any)[key]}`);

  const fleetFailures = snapshot.fleetComponentCoverage
    .filter((row) => row.engines !== row.expected || row.propellers !== row.expected)
    .map((row) =>
      `${row.tailNumber}: expected ${row.expected} engines/propellers, actual engines=${row.engines}, propellers=${row.propellers}`,
    );

  const pass =
    countFailures.length === 0 &&
    perLocationFailures.length === 0 &&
    perLocationToolFailures.length === 0 &&
    familyFailures.length === 0 &&
    edgeFailures.length === 0 &&
    fleetFailures.length === 0;

  return {
    pass,
    countFailures,
    perLocationFailures,
    perLocationToolFailures,
    familyFailures,
    edgeFailures,
    fleetFailures,
    failures: [
      ...countFailures,
      ...perLocationFailures,
      ...perLocationToolFailures,
      ...familyFailures,
      ...edgeFailures,
      ...fleetFailures,
    ],
  };
}

export const getRepairStationSeedCoverage = query({
  args: {
    scenarioKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scenarioKey = args.scenarioKey?.trim() || DEFAULT_SCENARIO_KEY;
    const snapshot = await buildSnapshot(ctx, scenarioKey);

    if (!snapshot) {
      return {
        scenarioKey,
        organizationId: null,
        requiredCounts: REQUIRED_COUNTS,
        actualCounts: Object.fromEntries(
          Object.keys(REQUIRED_COUNTS).map((key) => [key, 0]),
        ),
        perLocationScheduledCounts: [],
        perLocationToolCounts: [],
        statusMix: {},
        toolStatusMix: {},
        toolCategoryMix: {},
        partsUseCaseCoverage: {
          familyCounts: {
            consumables_hardware: 0,
            powerplant_service: 0,
            airframe_brake_env: 0,
            avionics_electrical: 0,
          },
          lifeLimited: 0,
          shelfLifeLimited: 0,
          serialized: 0,
          ownerSupplied: 0,
          lowStock: 0,
          pendingInspection: 0,
          quarantine: 0,
          removedPendingDisposition: 0,
          installed: 0,
          expiredShelfLife: 0,
          nearLifeLimit: 0,
          lifeExpiredInQuarantine: 0,
          pendingWithoutInspection: 0,
        },
        fleetComponentCoverage: [],
        coveragePassFail: {
          pass: false,
          countFailures: ["Scenario organization not found"],
          perLocationFailures: ["No location data available"],
          perLocationToolFailures: ["No tooling location data available"],
          familyFailures: ["No parts family data available"],
          edgeFailures: ["No parts edge-case data available"],
          fleetFailures: ["No fleet component data available"],
          failures: ["Scenario organization not found"],
        },
      };
    }

    return {
      scenarioKey,
      organizationId: snapshot.organizationId,
      requiredCounts: REQUIRED_COUNTS,
      actualCounts: snapshot.actualCounts,
      perLocationScheduledCounts: snapshot.perLocationScheduledCounts,
      perLocationToolCounts: snapshot.perLocationToolCounts,
      statusMix: snapshot.statusMix,
      toolStatusMix: snapshot.toolStatusMix,
      toolCategoryMix: snapshot.toolCategoryMix,
      partsUseCaseCoverage: snapshot.partsUseCaseCoverage,
      fleetComponentCoverage: snapshot.fleetComponentCoverage,
      coveragePassFail: coveragePassFail(snapshot),
    };
  },
});

export const getSchedulerParityGaps = query({
  args: {
    scenarioKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scenarioKey = args.scenarioKey?.trim() || DEFAULT_SCENARIO_KEY;
    const snapshot = await buildSnapshot(ctx, scenarioKey);

    if (!snapshot) {
      return [
        {
          gapId: "gap-scenario-org-missing",
          status: "open",
          severity: "critical",
          category: "seed_integrity",
          evidence: {
            scenarioKey,
            message: "Scenario organization not found.",
          },
          impact: "No seed coverage or parity checks can run until the scenario org exists.",
          recommendedFix: "Run seedRepairStationScenario:seedKingAirTbmRepairStation first.",
        },
      ];
    }

    const locationById = new Map(snapshot.locations.map((location) => [String(location._id), location]));
    const workOrderById = new Map(snapshot.workOrders.map((workOrder) => [String(workOrder._id), workOrder]));

    const allBaysLinked = snapshot.bays.every((bay) => bay.shopLocationId !== undefined);
    const allWorkOrdersLinked = snapshot.workOrders.every((workOrder) => workOrder.shopLocationId !== undefined);
    const allTechsLinked = snapshot.technicians.every((tech) => tech.primaryShopLocationId !== undefined);

    const allAssignmentsLinked = snapshot.assignments.every((assignment) => {
      const inferredLocationId =
        assignment.shopLocationId ??
        workOrderById.get(String(assignment.workOrderId))?.shopLocationId;
      return inferredLocationId !== undefined;
    });

    const allToolsLinked = snapshot.tools.every((tool) => tool.shopLocationId !== undefined);

    const inactiveLocationIds = snapshot.locations
      .filter((location) => location.isActive === false)
      .map((location) => location._id);
    const assignmentsAtInactiveLocations = snapshot.assignments.filter((assignment) =>
      inactiveLocationIds.includes(assignment.shopLocationId),
    ).length;
    const workOrdersAtInactiveLocations = snapshot.workOrders.filter((workOrder) =>
      inactiveLocationIds.includes(workOrder.shopLocationId),
    ).length;

    const locationPrefixMatches = snapshot.workOrders.every((workOrder) => {
      if (!workOrder.shopLocationId) return false;
      const location = locationById.get(String(workOrder.shopLocationId));
      if (!location) return false;
      const match = workOrder.workOrderNumber.match(/^WO-([A-Z]{2,3})-[0-9]+$/);
      if (!match) return false;
      return match[1] === location.code;
    });
    const locationScopedNumberingPass = snapshot.workOrders.length > 0 && locationPrefixMatches;

    const perLocationPass = snapshot.perLocationScheduledCounts.every((row) => row.scheduled === 15);
    const perLocationToolPass = snapshot.perLocationToolCounts.every((row) => row.tools === 20);

    const toolFamilyChecks = {
      torque_wrench: snapshot.tools.some((tool) => /torque wrench/i.test(tool.description)),
      caliper: snapshot.tools.some((tool) => /caliper/i.test(tool.description)),
      borescope: snapshot.tools.some((tool) => /borescope/i.test(tool.description)),
      pitot_static: snapshot.tools.some((tool) => /pitot|static test/i.test(tool.description)),
      transponder: snapshot.tools.some((tool) => /transponder/i.test(tool.description)),
      compression: snapshot.tools.some((tool) => /compression tester/i.test(tool.description)),
      wing_jack: snapshot.tools.some((tool) => /wing jack/i.test(tool.description)),
    };

    const toolingCatalogPass =
      snapshot.tools.length === REQUIRED_COUNTS.toolRecords &&
      Object.values(toolFamilyChecks).every(Boolean);

    const partsFamilyPass =
      snapshot.partsUseCaseCoverage.familyCounts.consumables_hardware >= PARTS_CONTRACT.consumables_hardware &&
      snapshot.partsUseCaseCoverage.familyCounts.powerplant_service >= PARTS_CONTRACT.powerplant_service &&
      snapshot.partsUseCaseCoverage.familyCounts.airframe_brake_env >= PARTS_CONTRACT.airframe_brake_env &&
      snapshot.partsUseCaseCoverage.familyCounts.avionics_electrical >= PARTS_CONTRACT.avionics_electrical;

    const edgeCoveragePass =
      snapshot.partsUseCaseCoverage.expiredShelfLife >= PARTS_CONTRACT.expiredShelfLife &&
      snapshot.partsUseCaseCoverage.nearLifeLimit >= PARTS_CONTRACT.nearLifeLimit &&
      snapshot.partsUseCaseCoverage.lifeExpiredInQuarantine >= PARTS_CONTRACT.lifeExpiredInQuarantine &&
      snapshot.partsUseCaseCoverage.pendingWithoutInspection >= PARTS_CONTRACT.pendingWithoutInspection;

    const fleetCoveragePass = snapshot.fleetComponentCoverage.every(
      (row) => row.engines === row.expected && row.propellers === row.expected,
    );

    return [
      {
        gapId: "gap-location-switcher-query-consumption",
        status: allBaysLinked && allAssignmentsLinked && allWorkOrdersLinked && allTechsLinked ? "resolved" : "open",
        severity: "high",
        category: "location_filtering",
        evidence: {
          perLocationScheduledCounts: snapshot.perLocationScheduledCounts,
          allBaysLinked,
          allAssignmentsLinked,
          allWorkOrdersLinked,
          allTechsLinked,
          codeRefs: [
            "components/LocationSwitcher.tsx",
            "app/(app)/scheduling/page.tsx",
            "app/(app)/scheduling/capacity/page.tsx",
            "app/(app)/scheduling/financial-planning/page.tsx",
          ],
        },
        impact: "If unresolved, location switching does not materially change scheduler/capacity views.",
        recommendedFix: "Pass shopLocationId through scheduling/capacity/work-order queries and persist selection state.",
      },
      {
        gapId: "gap-hangar-bays-not-linked-to-locations",
        status: allBaysLinked ? "resolved" : "open",
        severity: "high",
        category: "data_model",
        evidence: {
          linked: snapshot.bays.filter((bay) => bay.shopLocationId !== undefined).length,
          total: snapshot.bays.length,
          codeRef: "convex/schema.ts",
        },
        impact: "Bays cannot be partitioned by location without explicit linkage.",
        recommendedFix: "Keep hangarBays.shopLocationId populated and enforce org ownership on create/update.",
      },
      {
        gapId: "gap-schedule-assignments-not-location-scoped",
        status: allAssignmentsLinked && perLocationPass ? "resolved" : "open",
        severity: "critical",
        category: "scheduling",
        evidence: {
          linkedAssignments: snapshot.assignments.filter((assignment) => assignment.shopLocationId !== undefined).length,
          totalAssignments: snapshot.assignments.length,
          perLocationScheduledCounts: snapshot.perLocationScheduledCounts,
          codeRef: "convex/schedulerPlanning.ts",
        },
        impact: "Schedule board cannot guarantee per-location workload partitioning.",
        recommendedFix: "Store and enforce shopLocationId on scheduleAssignments and filter planner queries by location.",
      },
      {
        gapId: "gap-work-orders-not-location-scoped",
        status: allWorkOrdersLinked ? "resolved" : "open",
        severity: "critical",
        category: "work_orders",
        evidence: {
          linkedWorkOrders: snapshot.workOrders.filter((workOrder) => workOrder.shopLocationId !== undefined).length,
          totalWorkOrders: snapshot.workOrders.length,
          codeRef: "convex/workOrders.ts",
        },
        impact: "Operational and financial reports cannot reliably separate workloads per station.",
        recommendedFix: "Persist shopLocationId on workOrders and apply location filters to list/risk queries.",
      },
      {
        gapId: "gap-technicians-not-location-assigned",
        status: allTechsLinked ? "resolved" : "open",
        severity: "high",
        category: "capacity",
        evidence: {
          linkedTechnicians: snapshot.technicians.filter((tech) => tech.primaryShopLocationId !== undefined).length,
          totalTechnicians: snapshot.technicians.length,
          codeRef: "convex/capacity.ts",
        },
        impact: "Capacity bars blend technicians from multiple locations.",
        recommendedFix: "Persist primaryShopLocationId on technicians and scope capacity queries.",
      },
      {
        gapId: "gap-location-deactivation-not-enforced",
        status:
          assignmentsAtInactiveLocations === 0 &&
          workOrdersAtInactiveLocations === 0
            ? "resolved"
            : "open",
        severity: "medium",
        category: "policy_enforcement",
        evidence: {
          inactiveLocationCount: inactiveLocationIds.length,
          assignmentsAtInactiveLocations,
          workOrdersAtInactiveLocations,
          codeRefs: [
            "app/(app)/settings/locations/page.tsx",
            "convex/shopLocations.ts",
          ],
        },
        impact: "UI messaging can drift from actual assignment behavior after deactivation.",
        recommendedFix: "Add mutation-level guards that block assignment to inactive locations and migrate affected records.",
      },
      {
        gapId: "gap-work-order-number-uses-primary-location",
        status: locationScopedNumberingPass ? "resolved" : "open",
        severity: "medium",
        category: "numbering",
        evidence: {
          locationPrefixMatches,
          locationScopedNumberingPass,
          codeRefs: [
            "convex/lib/workOrderNumber.ts",
            "convex/workOrders.ts",
            "convex/billing.ts",
          ],
          note:
            "Work-order numbering should follow explicit shopLocationId context when present, " +
            "then fallback to org primary location when absent.",
        },
        impact: "WO numbering can drift from the assigned station in multi-location operations.",
        recommendedFix: "Update number reservation API to accept work-order location and derive prefix from that location.",
      },
      {
        gapId: "gap-scheduler-parity-base-filter-model",
        status: allBaysLinked && allAssignmentsLinked && allTechsLinked && perLocationPass ? "resolved" : "open",
        severity: "high",
        category: "scheduler_parity",
        evidence: {
          allBaysLinked,
          allAssignmentsLinked,
          allTechsLinked,
          perLocationScheduledCounts: snapshot.perLocationScheduledCounts,
          codeRefs: [
            "scheduler/components/GanttBoard.tsx",
            "convex/schedulerPlanning.ts",
          ],
        },
        impact: "Parity with Scheduler app degrades when base/location filters are not first-class data dimensions.",
        recommendedFix: "Keep location on bays/assignments/technicians and consume it in all planner and capacity routes.",
      },
      {
        gapId: "gap-fleet-component-coverage",
        status: fleetCoveragePass ? "resolved" : "open",
        severity: "high",
        category: "fleet_components",
        evidence: {
          expectedByAircraft: snapshot.fleetComponentCoverage,
          requiredCounts: {
            engines: REQUIRED_COUNTS.engines,
            propellers: REQUIRED_COUNTS.propellers,
          },
        },
        impact: "Fleet detail pages and maintenance planning lose realism when engine/propeller coverage is incomplete.",
        recommendedFix: "Seed and maintain deterministic engines/propellers per aircraft engineCount.",
      },
      {
        gapId: "gap-parts-usecase-coverage",
        status: partsFamilyPass ? "resolved" : "open",
        severity: "high",
        category: "inventory_coverage",
        evidence: {
          familyCounts: snapshot.partsUseCaseCoverage.familyCounts,
          contract: {
            consumables_hardware: PARTS_CONTRACT.consumables_hardware,
            powerplant_service: PARTS_CONTRACT.powerplant_service,
            airframe_brake_env: PARTS_CONTRACT.airframe_brake_env,
            avionics_electrical: PARTS_CONTRACT.avionics_electrical,
          },
        },
        impact: "Parts UI and workflows do not exercise realistic turboprop maintenance inventory paths.",
        recommendedFix: "Keep contextual family-based parts templates and enforce minimum family coverage in seed audit.",
      },
      {
        gapId: "gap-life-limit-shelf-life-edge-coverage",
        status: edgeCoveragePass ? "resolved" : "open",
        severity: "medium",
        category: "inventory_edge_cases",
        evidence: {
          coverage: snapshot.partsUseCaseCoverage,
          contract: {
            expiredShelfLife: PARTS_CONTRACT.expiredShelfLife,
            nearLifeLimit: PARTS_CONTRACT.nearLifeLimit,
            lifeExpiredInQuarantine: PARTS_CONTRACT.lifeExpiredInQuarantine,
            pendingWithoutInspection: PARTS_CONTRACT.pendingWithoutInspection,
          },
        },
        impact: "Edge-case QA paths for LLP and shelf-life handling may regress without deterministic test fixtures.",
        recommendedFix: "Seed deterministic expired/near-limit/pending-inspection records and verify with coverage checks.",
      },
      {
        gapId: "gap-tooling-catalog-contract",
        status: toolingCatalogPass ? "resolved" : "open",
        severity: "high",
        category: "tooling_coverage",
        evidence: {
          toolCount: snapshot.tools.length,
          expectedToolCount: REQUIRED_COUNTS.toolRecords,
          toolFamilyChecks,
          toolStatusMix: snapshot.toolStatusMix,
          toolCategoryMix: snapshot.toolCategoryMix,
        },
        impact: "Tool crib workflows and calibration dashboards are under-tested without core turboprop tooling families.",
        recommendedFix: "Maintain deterministic 40-item tooling catalog and enforce family presence in seed audit.",
      },
      {
        gapId: "gap-tooling-location-scoping",
        status: allToolsLinked && perLocationToolPass ? "resolved" : "open",
        severity: "medium",
        category: "tooling_location_filtering",
        evidence: {
          allToolsLinked,
          perLocationToolCounts: snapshot.perLocationToolCounts,
          codeRefs: [
            "convex/toolCrib.ts",
            "app/(app)/parts/tools/page.tsx",
          ],
        },
        impact: "Location-filtered tool crib views can drift when tools are not location-scoped.",
        recommendedFix: "Persist toolRecords.shopLocationId and consume shopLocationId filters in tool crib queries/routes.",
      },
    ];
  },
});
