// convex/seed.ts
// Athelon — Demo Seed Data
//
// Populates realistic demo data for the Athelon MRO platform.
// Run via: npx convex run seed:seedDemo
//
// Demo scenario:
//   - 1 organization: Rocky Mountain Turbine Service
//   - 3 aircraft: N192AK (C172), N76LS (Bell 206B), N416AB (Caravan)
//   - 4 users/technicians: DOM, Lead AMT, Inspector, Parts Manager
//   - 5 work orders in various lifecycle states
//   - Task cards, parts, squawks for the in-progress WO
//   - 1 IA cert expiring in 8 days (triggers attention queue)

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDemo = mutation({
  args: {
    clerkUserId: v.string(), // The current user's Clerk ID to assign as DOM
  },
  handler: async (ctx, args) => {
    // Clear any existing seed data first (idempotent)
    const existing = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), "Rocky Mountain Turbine Service"))
      .first();

    if (existing) {
      return {
        message: "Demo data already seeded",
        organizationId: existing._id,
      };
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // ─────────────────────────────────────────────────────
    // ORGANIZATION
    // ─────────────────────────────────────────────────────
    const orgId = await ctx.db.insert("organizations", {
      name: "Rocky Mountain Turbine Service",
      part145CertificateNumber: "RMTS-145-2019-003",
      part145Ratings: ["Class A Airframe", "Class A Powerplant"],
      address: "1847 Airport Blvd",
      city: "Grand Junction",
      state: "CO",
      zip: "81505",
      country: "USA",
      phone: "+1 (970) 555-0147",
      subscriptionTier: "professional",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // CUSTOMERS
    // ─────────────────────────────────────────────────────
    const customer1Id = await ctx.db.insert("customers", {
      organizationId: orgId,
      name: "High Country Charter LLC",
      customerType: "charter_operator",
      email: "dale@highcountrycharter.com",
      phone: "+1 (970) 555-0183",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const customer2Id = await ctx.db.insert("customers", {
      organizationId: orgId,
      name: "Summit Helicopters Inc.",
      customerType: "company",
      email: "ron@summithelicopters.com",
      phone: "+1 (970) 555-0291",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // TECHNICIANS
    // ─────────────────────────────────────────────────────
    const domTechId = await ctx.db.insert("technicians", {
      organizationId: orgId,
      userId: args.clerkUserId,
      legalName: "Sandra Mercado",
      email: "sandra@rmts.aero",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const leadAmtId = await ctx.db.insert("technicians", {
      organizationId: orgId,
      legalName: "Ray Kowalski",
      email: "ray@rmts.aero",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const inspectorId = await ctx.db.insert("technicians", {
      organizationId: orgId,
      legalName: "Mia Chen",
      email: "mia@rmts.aero",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const partsManagerId = await ctx.db.insert("technicians", {
      organizationId: orgId,
      legalName: "Carlos Vega",
      email: "carlos@rmts.aero",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Update org with DOM and QCM references
    await ctx.db.patch(orgId, {
      directorOfMaintenanceId: domTechId,
      directorOfMaintenanceName: "Sandra Mercado",
      qualityControlManagerId: inspectorId,
      qualityControlManagerName: "Mia Chen",
    });

    // ─────────────────────────────────────────────────────
    // CERTIFICATES
    // ─────────────────────────────────────────────────────
    // DOM - A&P + IA (IA expiring in 8 days — triggers attention queue)
    await ctx.db.insert("certificates", {
      technicianId: domTechId,
      certificateType: "IA",
      certificateNumber: "IA-2019-CO-00847",
      issueDate: now - 2 * 365 * day,
      hasIaAuthorization: true,
      iaExpiryDate: now + 8 * day, // Expiring soon — creates attention item
      ratings: ["airframe", "powerplant"],
      iaRenewalActivities: [],
      repairStationAuthorizations: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("certificates", {
      technicianId: domTechId,
      certificateType: "A&P",
      certificateNumber: "AP-1998-044792",
      issueDate: now - 26 * 365 * day,
      hasIaAuthorization: false,
      ratings: ["airframe", "powerplant"],
      iaRenewalActivities: [],
      repairStationAuthorizations: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Lead AMT - A&P only
    await ctx.db.insert("certificates", {
      technicianId: leadAmtId,
      certificateType: "A&P",
      certificateNumber: "AP-2002-081345",
      issueDate: now - 22 * 365 * day,
      hasIaAuthorization: false,
      ratings: ["airframe", "powerplant"],
      iaRenewalActivities: [],
      repairStationAuthorizations: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Inspector - A&P + IA (current)
    await ctx.db.insert("certificates", {
      technicianId: inspectorId,
      certificateType: "IA",
      certificateNumber: "IA-2023-CO-01204",
      issueDate: now - 365 * day,
      hasIaAuthorization: true,
      iaExpiryDate: now + 355 * day,
      ratings: ["airframe", "powerplant"],
      iaRenewalActivities: [],
      repairStationAuthorizations: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // AIRCRAFT
    // ─────────────────────────────────────────────────────
    const aircraft1Id = await ctx.db.insert("aircraft", {
      operatingOrganizationId: orgId,
      currentRegistration: "N192AK",
      make: "Cessna",
      model: "172",
      series: "S",
      serialNumber: "172S11234",
      yearOfManufacture: 2008,
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: 3847.2,
      totalTimeAirframeAsOfDate: now,
      status: "in_maintenance",
      customerId: customer1Id,
      createdAt: now,
      updatedAt: now,
    });

    const aircraft2Id = await ctx.db.insert("aircraft", {
      operatingOrganizationId: orgId,
      currentRegistration: "N76LS",
      make: "Bell",
      model: "206B",
      series: "III",
      serialNumber: "4089",
      yearOfManufacture: 1991,
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: 9124.4,
      totalTimeAirframeAsOfDate: now,
      status: "airworthy",
      customerId: customer2Id,
      createdAt: now,
      updatedAt: now,
    });

    const aircraft3Id = await ctx.db.insert("aircraft", {
      operatingOrganizationId: orgId,
      currentRegistration: "N416AB",
      make: "Cessna",
      model: "208B",
      series: "Grand Caravan",
      serialNumber: "208B0947",
      yearOfManufacture: 2001,
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: 18402.1,
      totalTimeAirframeAsOfDate: now,
      status: "in_maintenance",
      customerId: customer1Id,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // WORK ORDERS
    // ─────────────────────────────────────────────────────

    // WO 1: In-progress (the primary demo WO) — N192AK 100-hr inspection
    const wo1Id = await ctx.db.insert("workOrders", {
      organizationId: orgId,
      workOrderNumber: "WO-2026-0041",
      aircraftId: aircraft1Id,
      workOrderType: "100hr_inspection",
      status: "in_progress",
      priority: "routine",
      description:
        "100-hour inspection per Cessna 172S Maintenance Manual. Includes engine compression check, oil change, brake inspection, and required AD compliance checks.",
      openedAt: now - 3 * day,
      openedByUserId: args.clerkUserId,
      aircraftTotalTimeAtOpen: 3847.2,
      customerId: customer1Id,
      createdAt: now - 3 * day,
      updatedAt: now,
    });

    // WO 2: Draft — N416AB scheduled maintenance
    const wo2Id = await ctx.db.insert("workOrders", {
      organizationId: orgId,
      workOrderNumber: "WO-2026-0042",
      aircraftId: aircraft3Id,
      workOrderType: "routine",
      status: "draft",
      priority: "routine",
      description:
        "Scheduled maintenance: Replace fuel selector valve P/N 9924721-1. ALS-triggered replacement at cycle limit.",
      openedAt: now,
      openedByUserId: args.clerkUserId,
      aircraftTotalTimeAtOpen: 18402.1,
      customerId: customer1Id,
      createdAt: now,
      updatedAt: now,
    });

    // WO 3: On hold — waiting for parts
    const wo3Id = await ctx.db.insert("workOrders", {
      organizationId: orgId,
      workOrderNumber: "WO-2026-0039",
      aircraftId: aircraft2Id,
      workOrderType: "unscheduled",
      status: "on_hold",
      priority: "aog",
      description:
        "AOG: Main rotor blade crack found during preflight. Waiting on Bell replacement blade P/N 206-015-191-013.",
      openedAt: now - 7 * day,
      openedByUserId: args.clerkUserId,
      aircraftTotalTimeAtOpen: 9120.1,
      customerId: customer2Id,
      onHoldReason: "Awaiting parts — Bell P/N 206-015-191-013 ETA 5 days",
      createdAt: now - 7 * day,
      updatedAt: now,
    });

    // WO 4: Closed — completed last week
    const wo4Id = await ctx.db.insert("workOrders", {
      organizationId: orgId,
      workOrderNumber: "WO-2026-0037",
      aircraftId: aircraft2Id,
      workOrderType: "annual_inspection",
      status: "closed",
      priority: "routine",
      description: "Annual inspection — Bell 206B-III. All ALS items reviewed.",
      openedAt: now - 21 * day,
      openedByUserId: args.clerkUserId,
      closedAt: now - 8 * day,
      aircraftTotalTimeAtOpen: 9089.3,
      aircraftTotalTimeAtClose: 9120.1,
      customerId: customer2Id,
      closedByTechnicianId: inspectorId,
      closedByUserId: args.clerkUserId,
      createdAt: now - 21 * day,
      updatedAt: now - 8 * day,
    });

    // WO 5: Pending signoff — all tasks done, waiting for DOM sign-off
    const wo5Id = await ctx.db.insert("workOrders", {
      organizationId: orgId,
      workOrderNumber: "WO-2026-0040",
      aircraftId: aircraft3Id,
      workOrderType: "routine",
      status: "pending_signoff",
      priority: "routine",
      description:
        "Oil change and filter replacement. Magnetic chip detector inspection. PT6A-114A trend monitoring.",
      openedAt: now - 5 * day,
      openedByUserId: args.clerkUserId,
      aircraftTotalTimeAtOpen: 18395.4,
      customerId: customer1Id,
      createdAt: now - 5 * day,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // TASK CARDS for WO-2026-0041 (in-progress)
    // ─────────────────────────────────────────────────────

    const tc1Id = await ctx.db.insert("taskCards", {
      organizationId: orgId,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      taskCardNumber: "TC-001",
      title: "Engine Compression Check — All Cylinders",
      taskType: "inspection",
      status: "complete",
      approvedDataSource: "Cessna 172S MM | Chapter 05-50-00 | Rev 15",
      assignedToTechnicianId: leadAmtId,
      stepCount: 3,
      completedStepCount: 3,
      naStepCount: 0,
      completedAt: now - 2 * day,
      createdAt: now - 3 * day,
      updatedAt: now - 2 * day,
    });

    const tc2Id = await ctx.db.insert("taskCards", {
      organizationId: orgId,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      taskCardNumber: "TC-002",
      title: "Engine Oil Change & Filter Replacement",
      taskType: "replacement",
      status: "complete",
      approvedDataSource: "Cessna 172S MM | Chapter 12-10-00 | Rev 15",
      assignedToTechnicianId: leadAmtId,
      stepCount: 4,
      completedStepCount: 4,
      naStepCount: 0,
      completedAt: now - 2 * day,
      createdAt: now - 3 * day,
      updatedAt: now - 2 * day,
    });

    const tc3Id = await ctx.db.insert("taskCards", {
      organizationId: orgId,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      taskCardNumber: "TC-003",
      title: "Brake System Inspection — Main & Nose",
      taskType: "inspection",
      status: "in_progress",
      approvedDataSource: "Cessna 172S MM | Chapter 32-40-00 | Rev 15",
      assignedToTechnicianId: leadAmtId,
      stepCount: 5,
      completedStepCount: 2,
      naStepCount: 0,
      startedAt: now - 1 * day,
      createdAt: now - 3 * day,
      updatedAt: now - 1 * day,
    });

    const tc4Id = await ctx.db.insert("taskCards", {
      organizationId: orgId,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      taskCardNumber: "TC-004",
      title: "Airworthiness Directive Compliance Review",
      taskType: "ad_compliance",
      status: "not_started",
      approvedDataSource: "FAA AD 2023-09-12 | Amendment 39-22462",
      assignedToTechnicianId: domTechId,
      stepCount: 2,
      completedStepCount: 0,
      naStepCount: 0,
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
    });

    // Steps for TC-003
    await ctx.db.insert("taskCardSteps", {
      taskCardId: tc3Id,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      organizationId: orgId,
      stepNumber: 1,
      description:
        "Inspect main gear brake discs for wear. Minimum thickness 0.182 in. Record measurements.",
      requiresSpecialTool: false,
      signOffRequired: true,
      signOffRequiresIa: false,
      status: "completed",
      signedByTechnicianId: leadAmtId,
      signedAt: now - 1 * day,
      notes: "Left disc: 0.201 in | Right disc: 0.198 in. Both within limits.",
      discrepancyIds: [],
      createdAt: now - 3 * day,
      updatedAt: now - 1 * day,
    });

    await ctx.db.insert("taskCardSteps", {
      taskCardId: tc3Id,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      organizationId: orgId,
      stepNumber: 2,
      description:
        "Inspect brake caliper assemblies for cracks, corrosion, and fluid leaks.",
      requiresSpecialTool: false,
      signOffRequired: true,
      signOffRequiresIa: false,
      status: "completed",
      signedByTechnicianId: leadAmtId,
      signedAt: now - 1 * day,
      notes: "No cracks or leaks found. Minor surface corrosion on right caliper housing — within limits.",
      discrepancyIds: [],
      createdAt: now - 3 * day,
      updatedAt: now - 1 * day,
    });

    await ctx.db.insert("taskCardSteps", {
      taskCardId: tc3Id,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      organizationId: orgId,
      stepNumber: 3,
      description: "Check brake fluid level and condition. Top off as required with MIL-PRF-5606.",
      requiresSpecialTool: false,
      signOffRequired: true,
      signOffRequiresIa: false,
      status: "pending",
      discrepancyIds: [],
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
    });

    await ctx.db.insert("taskCardSteps", {
      taskCardId: tc3Id,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      organizationId: orgId,
      stepNumber: 4,
      description: "Inspect nose gear shimmy damper. Check for leaks and proper torque.",
      requiresSpecialTool: false,
      signOffRequired: true,
      signOffRequiresIa: false,
      status: "pending",
      discrepancyIds: [],
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
    });

    await ctx.db.insert("taskCardSteps", {
      taskCardId: tc3Id,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      organizationId: orgId,
      stepNumber: 5,
      description: "Operational check: Taxi aircraft and verify brake function. Document pedal feel and stopping distance.",
      requiresSpecialTool: false,
      signOffRequired: true,
      signOffRequiresIa: false,
      status: "pending",
      discrepancyIds: [],
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
    });

    // ─────────────────────────────────────────────────────
    // PARTS for WO-2026-0041
    // ─────────────────────────────────────────────────────

    await ctx.db.insert("parts", {
      organizationId: orgId,
      installedByWorkOrderId: wo1Id,
      partNumber: "AV-OIL-W80",
      partName: "Aviation Oil 15W-50 AeroShell W80",
      condition: "new",
      location: "installed",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("parts", {
      organizationId: orgId,
      installedByWorkOrderId: wo1Id,
      partNumber: "AV17-FILTER-CH48109-1",
      partName: "Engine Oil Filter — Champion CH48109-1",
      condition: "new",
      location: "installed",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("parts", {
      organizationId: orgId,
      receivingWorkOrderId: wo1Id,
      partNumber: "MIL-PRF-5606-QT",
      partName: "Hydraulic Fluid MIL-PRF-5606 — 1qt",
      condition: "new",
      location: "inventory",
      isSerialized: false,
      isLifeLimited: false,
      hasShelfLifeLimit: false,
      isOwnerSupplied: false,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // DISCREPANCY — open squawk blocking WO close
    // ─────────────────────────────────────────────────────

    await ctx.db.insert("discrepancies", {
      organizationId: orgId,
      workOrderId: wo1Id,
      aircraftId: aircraft1Id,
      discrepancyNumber: "SQ-2026-041-001",
      description:
        "Right main gear shimmy dampener shows intermittent hesitation on taxi. Suspect worn piston seal. Requires evaluation before RTS.",
      status: "open",
      foundDuring: "100hr_inspection",
      foundByTechnicianId: leadAmtId,
      foundAt: now - 1 * day,
      foundAtAircraftHours: 3847.2,
      createdAt: now - 1 * day,
      updatedAt: now - 1 * day,
    });

    // ─────────────────────────────────────────────────────
    // AUDIT LOG entries
    // ─────────────────────────────────────────────────────

    await ctx.db.insert("auditLog", {
      organizationId: orgId,
      eventType: "record_created",
      tableName: "workOrders",
      recordId: wo1Id,
      userId: args.clerkUserId,
      timestamp: now - 3 * day,
      notes: "Work order WO-2026-0041 created",
    });

    await ctx.db.insert("auditLog", {
      organizationId: orgId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: wo1Id,
      userId: args.clerkUserId,
      timestamp: now - 3 * day,
      notes: "Status changed: draft → open",
      oldValue: "draft",
      newValue: "open",
    });

    await ctx.db.insert("auditLog", {
      organizationId: orgId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: wo1Id,
      userId: args.clerkUserId,
      timestamp: now - 2 * day,
      notes: "Status changed: open → in_progress (first task card created)",
      oldValue: "open",
      newValue: "in_progress",
    });

    return {
      message: "Demo data seeded successfully",
      organizationId: orgId,
      aircraft: {
        N192AK: aircraft1Id,
        N76LS: aircraft2Id,
        N416AB: aircraft3Id,
      },
      workOrders: {
        "WO-2026-0041": wo1Id,
        "WO-2026-0042": wo2Id,
        "WO-2026-0039": wo3Id,
        "WO-2026-0037": wo4Id,
        "WO-2026-0040": wo5Id,
      },
    };
  },
});

// Seed a deterministic scheduler/quote story dataset for seeded E2E scenarios.
// Idempotent by org + fixed work order / quote numbers.
export const seedSchedulerStories = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    let technician = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", args.clerkUserId))
      .first();

    let orgId: any;
    let techId: any;

    if (!technician) {
      orgId = await ctx.db.insert("organizations", {
        name: "E2E Story Hangar",
        part145Ratings: ["Class A Airframe", "Class A Powerplant"],
        address: "1200 Storyline Ave",
        city: "Denver",
        state: "CO",
        zip: "80201",
        country: "USA",
        email: "e2e-story@athelon.test",
        subscriptionTier: "starter",
        active: true,
        createdAt: now,
        updatedAt: now,
      });

      techId = await ctx.db.insert("technicians", {
        organizationId: orgId,
        userId: args.clerkUserId,
        legalName: "E2E Story Admin",
        email: "e2e-story@athelon.test",
        status: "active",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("shopLocations", {
        organizationId: orgId,
        name: "Main Shop",
        code: "MAIN",
        city: "Denver",
        state: "CO",
        country: "US",
        isPrimary: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      orgId = technician.organizationId;
      techId = technician._id;
    }

    const customerName = "E2E Story Aviation";
    let customer = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
      .filter((q) => q.eq(q.field("name"), customerName))
      .first();

    if (!customer) {
      const customerId = await ctx.db.insert("customers", {
        organizationId: orgId,
        name: customerName,
        customerType: "charter_operator",
        email: "mx@e2e-story-aviation.test",
        phone: "+1 (303) 555-2121",
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      customer = await ctx.db.get(customerId);
    }

    if (!customer) {
      throw new Error("Unable to create or resolve story customer");
    }
    const customerId = customer._id;

    async function ensureAircraft(params: {
      registration: string;
      make: string;
      model: string;
      serialNumber: string;
      ttHours: number;
    }) {
      const existing = await ctx.db
        .query("aircraft")
        .withIndex("by_registration", (q) =>
          q.eq("currentRegistration", params.registration),
        )
        .first();

      if (existing && existing.operatingOrganizationId === orgId) {
        return existing._id;
      }

      return await ctx.db.insert("aircraft", {
        operatingOrganizationId: orgId,
        currentRegistration: params.registration,
        make: params.make,
        model: params.model,
        serialNumber: params.serialNumber,
        aircraftCategory: "normal",
        engineCount: 1,
        experimental: false,
        totalTimeAirframeHours: params.ttHours,
        totalTimeAirframeAsOfDate: now,
        customerId,
        status: "in_maintenance",
        createdAt: now,
        updatedAt: now,
      });
    }

    const directAircraftId = await ensureAircraft({
      registration: "N818ST",
      make: "Cessna",
      model: "208B",
      serialNumber: "E2E-STORY-208B-001",
      ttHours: 9321.3,
    });
    const convertedAircraftId = await ensureAircraft({
      registration: "N477QA",
      make: "Beechcraft",
      model: "King Air 200",
      serialNumber: "E2E-STORY-KA200-001",
      ttHours: 12411.8,
    });
    const unscheduledAircraftId = await ensureAircraft({
      registration: "N330UX",
      make: "Pilatus",
      model: "PC-12/47E",
      serialNumber: "E2E-STORY-PC12-001",
      ttHours: 5877.2,
    });

    const desiredBays = [
      { name: "E2E Bay Alpha", type: "hangar" as const },
      { name: "E2E Bay Bravo", type: "hangar" as const },
      { name: "E2E Bay Paint", type: "paint" as const },
    ];
    const existingBays = await ctx.db
      .query("hangarBays")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();

    for (const desired of desiredBays) {
      const already = existingBays.find((bay) => bay.name === desired.name);
      if (already) continue;
      await ctx.db.insert("hangarBays", {
        organizationId: orgId,
        name: desired.name,
        description: "Seeded for scheduler story E2E coverage",
        type: desired.type,
        capacity: 1,
        status: "available",
        createdAt: now,
        updatedAt: now,
      });
    }

    const DIRECT_WO_NUMBER = "E2E-WO-DIRECT-001";
    const CONVERTED_WO_NUMBER = "E2E-WO-CONV-001";
    const UNSCHEDULED_WO_NUMBER = "E2E-WO-UNSCHED-001";

    const directStart = now + 2 * day;
    const directEnd = now + 8 * day;
    const convertedStart = now + 9 * day;
    const convertedEnd = now + 16 * day;

    async function ensureWorkOrder(params: {
      workOrderNumber: string;
      aircraftId: any;
      description: string;
      status: "draft" | "open" | "in_progress";
      priority: "routine" | "urgent" | "aog";
      scheduledStartDate?: number;
      promisedDeliveryDate?: number;
    }) {
      const existing = await ctx.db
        .query("workOrders")
        .withIndex("by_number", (q) =>
          q.eq("organizationId", orgId).eq("workOrderNumber", params.workOrderNumber),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          aircraftId: params.aircraftId,
          customerId,
          status: params.status,
          priority: params.priority,
          description: params.description,
          scheduledStartDate: params.scheduledStartDate,
          promisedDeliveryDate: params.promisedDeliveryDate,
          updatedAt: now,
        });
        return existing._id;
      }

      return await ctx.db.insert("workOrders", {
        organizationId: orgId,
        workOrderNumber: params.workOrderNumber,
        aircraftId: params.aircraftId,
        workOrderType: "routine",
        status: params.status,
        priority: params.priority,
        description: params.description,
        openedAt: now - day,
        openedByUserId: args.clerkUserId,
        aircraftTotalTimeAtOpen: 0,
        customerId,
        scheduledStartDate: params.scheduledStartDate,
        promisedDeliveryDate: params.promisedDeliveryDate,
        createdAt: now - day,
        updatedAt: now,
      });
    }

    const directWoId = await ensureWorkOrder({
      workOrderNumber: DIRECT_WO_NUMBER,
      aircraftId: directAircraftId,
      description:
        "Legacy scheduled WO (dates-only) for backfill verification and quote continuity.",
      status: "in_progress",
      priority: "routine",
      scheduledStartDate: directStart,
      promisedDeliveryDate: directEnd,
    });

    const convertedWoId = await ensureWorkOrder({
      workOrderNumber: CONVERTED_WO_NUMBER,
      aircraftId: convertedAircraftId,
      description: "WO converted from approved quote; must retain quote linkage in planner.",
      status: "open",
      priority: "urgent",
      scheduledStartDate: convertedStart,
      promisedDeliveryDate: convertedEnd,
    });

    const unscheduledWoId = await ensureWorkOrder({
      workOrderNumber: UNSCHEDULED_WO_NUMBER,
      aircraftId: unscheduledAircraftId,
      description: "Unscheduled WO candidate for magic scheduler user story.",
      status: "draft",
      priority: "routine",
      scheduledStartDate: undefined,
      promisedDeliveryDate: undefined,
    });

    const DIRECT_QUOTE_NUMBER = "E2E-Q-DIRECT-001";
    const CONVERTED_QUOTE_NUMBER = "E2E-Q-CONV-001";
    const DRAFT_QUOTE_NUMBER = "E2E-Q-DRAFT-001";
    const E2E_LABOR_KIT_NAME = "E2E-KIT-QUOTE-001";

    async function upsertQuote(
      quoteNumber: string,
      patch: {
        workOrderId?: any;
        convertedToWorkOrderId?: any;
        aircraftId: any;
        status: "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED";
      },
    ) {
      const existing = await ctx.db
        .query("quotes")
        .withIndex("by_org_quote_number", (q) =>
          q.eq("orgId", orgId).eq("quoteNumber", quoteNumber),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          customerId,
          aircraftId: patch.aircraftId,
          workOrderId: patch.workOrderId,
          convertedToWorkOrderId: patch.convertedToWorkOrderId,
          status: patch.status,
          laborTotal: 22500,
          partsTotal: 11800,
          subtotal: 34300,
          tax: 0,
          total: 34300,
          updatedAt: now,
        });
        return existing._id;
      }

      return await ctx.db.insert("quotes", {
        orgId,
        customerId,
        aircraftId: patch.aircraftId,
        workOrderId: patch.workOrderId,
        status: patch.status,
        quoteNumber,
        createdByTechId: techId,
        convertedToWorkOrderId: patch.convertedToWorkOrderId,
        sentAt: patch.status !== "DRAFT" ? now - 2 * day : undefined,
        respondedAt:
          patch.status === "APPROVED" || patch.status === "CONVERTED"
            ? now - day
            : undefined,
        expiresAt: now + 14 * day,
        laborTotal: 22500,
        partsTotal: 11800,
        subtotal: 34300,
        tax: 0,
        total: 34300,
        currency: "USD",
        createdAt: now - 3 * day,
        updatedAt: now,
      });
    }

    const directQuoteId = await upsertQuote(DIRECT_QUOTE_NUMBER, {
      aircraftId: directAircraftId,
      workOrderId: directWoId,
      convertedToWorkOrderId: undefined,
      status: "APPROVED",
    });

    const convertedQuoteId = await upsertQuote(CONVERTED_QUOTE_NUMBER, {
      aircraftId: convertedAircraftId,
      workOrderId: undefined,
      convertedToWorkOrderId: convertedWoId,
      status: "CONVERTED",
    });

    const draftQuoteId = await upsertQuote(DRAFT_QUOTE_NUMBER, {
      aircraftId: unscheduledAircraftId,
      workOrderId: unscheduledWoId,
      convertedToWorkOrderId: undefined,
      status: "DRAFT",
    });

    async function ensureLaborKit() {
      const existing = await ctx.db
        .query("laborKits")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId))
        .filter((q) => q.eq(q.field("name"), E2E_LABOR_KIT_NAME))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          description: "Seeded labor kit for quote builder user-story coverage.",
          ataChapter: "05",
          aircraftType: "Pilatus PC-12/47E",
          estimatedHours: 5.5,
          laborRate: 165,
          laborItems: [
            {
              description: "E2E borescope inspection",
              estimatedHours: 2.5,
            },
            {
              description: "E2E oil system servicing",
              estimatedHours: 3,
            },
          ],
          requiredParts: [
            {
              partNumber: "E2E-FLTR-001",
              description: "Filter element",
              quantity: 2,
              unitCost: 145,
            },
          ],
          externalServices: [
            {
              vendorName: "E2E NDT Vendor",
              description: "NDT review",
              estimatedCost: 420,
            },
          ],
          isActive: true,
        });
        return existing._id;
      }

      return await ctx.db.insert("laborKits", {
        organizationId: orgId,
        name: E2E_LABOR_KIT_NAME,
        description: "Seeded labor kit for quote builder user-story coverage.",
        ataChapter: "05",
        aircraftType: "Pilatus PC-12/47E",
        estimatedHours: 5.5,
        laborRate: 165,
        laborItems: [
          {
            description: "E2E borescope inspection",
            estimatedHours: 2.5,
          },
          {
            description: "E2E oil system servicing",
            estimatedHours: 3,
          },
        ],
        requiredParts: [
          {
            partNumber: "E2E-FLTR-001",
            description: "Filter element",
            quantity: 2,
            unitCost: 145,
          },
        ],
        externalServices: [
          {
            vendorName: "E2E NDT Vendor",
            description: "NDT review",
            estimatedCost: 420,
          },
        ],
        isActive: true,
        createdAt: now,
      });
    }

    const laborKitId = await ensureLaborKit();

    // Keep seeded DRAFT quote deterministic by resetting line items each run.
    const existingDraftLines = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_org_quote", (q) => q.eq("orgId", orgId).eq("quoteId", draftQuoteId))
      .collect();
    for (const line of existingDraftLines) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.insert("quoteLineItems", {
      orgId,
      quoteId: draftQuoteId,
      type: "labor",
      description: "E2E baseline inspection labor",
      qty: 2,
      unitPrice: 175,
      total: 350,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(draftQuoteId, {
      laborTotal: 350,
      partsTotal: 0,
      subtotal: 350,
      tax: 0,
      total: 350,
      updatedAt: now,
    });

    const storyWoIds = [directWoId, convertedWoId, unscheduledWoId];
    for (const woId of storyWoIds) {
      const assignment = await ctx.db
        .query("scheduleAssignments")
        .withIndex("by_org_wo", (q) => q.eq("organizationId", orgId).eq("workOrderId", woId))
        .first();
      if (assignment) {
        await ctx.db.delete(assignment._id);
      }
    }

    return {
      message: "Scheduler story seed prepared",
      organizationId: orgId,
      technicianId: techId,
      workOrders: {
        DIRECT_WO_NUMBER: directWoId,
        CONVERTED_WO_NUMBER: convertedWoId,
        UNSCHEDULED_WO_NUMBER: unscheduledWoId,
      },
      quotes: {
        DIRECT_QUOTE_NUMBER: directQuoteId,
        CONVERTED_QUOTE_NUMBER: convertedQuoteId,
        DRAFT_QUOTE_NUMBER: draftQuoteId,
      },
      laborKitId,
    };
  },
});
