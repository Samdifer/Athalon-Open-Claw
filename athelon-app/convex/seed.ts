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
