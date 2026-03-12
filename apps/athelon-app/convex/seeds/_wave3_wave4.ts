// ══════════════════════════════════════════════════════════════════════════════
// WAVE 3: QUOTING & BILLING
// WAVE 4: CRM & CUSTOMER PORTAL
//
// Seed helper for Colorado Aviation Maintenance Group (CAMG) demo data.
// Called from seedComprehensive.ts or a standalone seed mutation.
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
  partIds: Id<"parts">[];
  closedWOIds: Id<"workOrders">[];
  activeWOIds: Id<"workOrders">[];
  locationMap: Record<string, Id<"shopLocations">>;
}

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 3: QUOTING & BILLING
// Tables: pricingRules, taxRates, pricingProfiles, creditMemos,
//         customerTaxExemptions, recurringBillingTemplates, customerDeposits,
//         orgCounters, quoteDepartments, quoteTemplates, shopSettings,
//         orgBillingSettings
// ══════════════════════════════════════════════════════════════════════════════

export async function seedWave3(ctx: MutationCtx, ids: SeedIds) {
  const {
    orgId,
    now,
    DAY,
    techMap,
    customerIds,
  } = ids;

  // ── 1. pricingRules (8 records) ─────────────────────────────────────────────

  // Rule 1: Default labor — A&P cost-plus standard rate
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "cost_plus",
    appliesTo: "labor",
    techCertLevel: "A&P",
    markupPercent: 130,
    effectiveDate: now - 365 * DAY,
    priority: 100,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Rule 2: IA-signed labor — premium cost-plus
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "cost_plus",
    appliesTo: "labor",
    techCertLevel: "IA",
    markupPercent: 165,
    effectiveDate: now - 365 * DAY,
    priority: 90,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Rule 3: Flight school customer labor discount — list-minus
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "list_minus",
    appliesTo: "labor",
    customerClass: "flight_school",
    listPrice: 135.00,
    discountPercent: 12,
    effectiveDate: now - 180 * DAY,
    priority: 50,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Rule 4: Charter operator labor — flat rate premium
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "flat_rate",
    appliesTo: "labor",
    customerClass: "charter_operator",
    flatRate: 155.00,
    effectiveDate: now - 180 * DAY,
    priority: 60,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Rule 5: Consumable parts (under $100) — cost-plus high margin
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "cost_plus",
    appliesTo: "part",
    partClass: "consumable",
    markupPercent: 50,
    effectiveDate: now - 365 * DAY,
    priority: 80,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Rule 6: Avionics parts — list-minus (distributor list pricing)
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "list_minus",
    appliesTo: "part",
    partClass: "avionics",
    discountPercent: 5,
    effectiveDate: now - 365 * DAY,
    priority: 70,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Rule 7: External DER engineering services — cost-plus
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "cost_plus",
    appliesTo: "external_service",
    markupPercent: 20,
    effectiveDate: now - 365 * DAY,
    priority: 100,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Rule 8: Quantity-tier parts discount (bulk hardware orders)
  await ctx.db.insert("pricingRules", {
    orgId,
    ruleType: "quantity_tier",
    appliesTo: "part",
    partClass: "hardware",
    tierBreaks: JSON.stringify([
      { minQty: 1, maxQty: 9, unitPrice: 8.50 },
      { minQty: 10, maxQty: 49, unitPrice: 7.25 },
      { minQty: 50, maxQty: 999, unitPrice: 5.95 },
    ]),
    effectiveDate: now - 90 * DAY,
    priority: 110,
    createdAt: now - 90 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // ── 2. taxRates (3 records) ─────────────────────────────────────────────────

  // Colorado state sales tax on parts
  await ctx.db.insert("taxRates", {
    orgId,
    name: "Colorado State Sales Tax",
    rate: 2.9,
    appliesTo: "parts",
    isDefault: false,
    active: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Arapahoe County sales tax (APA location)
  await ctx.db.insert("taxRates", {
    orgId,
    name: "Arapahoe County Sales Tax",
    rate: 0.25,
    appliesTo: "parts",
    isDefault: true,
    active: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // No labor tax — Colorado exempts aircraft maintenance labor
  await ctx.db.insert("taxRates", {
    orgId,
    name: "Aircraft Maintenance Labor (Exempt)",
    rate: 0,
    appliesTo: "labor",
    isDefault: false,
    active: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // ── 3. pricingProfiles (3 records) ─────────────────────────────────────────

  // Org-wide default profile
  await ctx.db.insert("pricingProfiles", {
    orgId,
    name: "Standard CAMG Rate Schedule",
    laborRateOverride: 135.00,
    partsMarkupPercent: 30,
    effectiveDate: now - 365 * DAY,
    isDefault: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Front Range Flight Training — discounted profile
  await ctx.db.insert("pricingProfiles", {
    orgId,
    customerId: customerIds[1], // Front Range Flight Training
    name: "Flight School Preferred Rate",
    laborRateOverride: 119.00,
    partsMarkupPercent: 20,
    partsDiscountPercent: 5,
    effectiveDate: now - 180 * DAY,
    isDefault: false,
    createdAt: now - 180 * DAY,
    updatedAt: now - 180 * DAY,
  });

  // Colorado Dept of Wildlife — government rate
  await ctx.db.insert("pricingProfiles", {
    orgId,
    customerId: customerIds[2], // Colorado Dept of Wildlife
    name: "Government Agency Rate",
    laborRateMultiplier: 0.95,
    partsMarkupPercent: 22,
    effectiveDate: now - 270 * DAY,
    isDefault: false,
    createdAt: now - 270 * DAY,
    updatedAt: now - 270 * DAY,
  });

  // ── 4. creditMemos (2 records) ─────────────────────────────────────────────
  // Query existing invoices to reference real invoice IDs
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();

  const peakInvoice = invoices.find((inv) =>
    inv.customerId === customerIds[0]
  );
  const frontRangeInvoice = invoices.find((inv) =>
    inv.customerId === customerIds[1]
  );

  // CM-0001: Parts return credit for Peak Aviation Partners
  await ctx.db.insert("creditMemos", {
    orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    invoiceId: peakInvoice?._id,
    creditMemoNumber: "CM-0001",
    status: "ISSUED",
    reason: "Customer returned undamaged PT6A igniter plug — wrong part ordered. Credit issued per CAMG return policy.",
    amount: 510.00,
    issuedByTechId: techMap["CAMG-004"], // Lisa Thornton, billing manager
    notes: "Part returned in original packaging within 5 business days. Full credit approved.",
    createdAt: now - 21 * DAY,
    updatedAt: now - 20 * DAY,
  });

  // CM-0002: Overbilling correction for Front Range Flight Training
  await ctx.db.insert("creditMemos", {
    orgId,
    customerId: customerIds[1], // Front Range Flight Training
    invoiceId: frontRangeInvoice?._id,
    creditMemoNumber: "CM-0002",
    status: "APPLIED",
    reason: "Labor hours on 172S 100-hour inspection were billed at A&P rate but work was performed by tech under direct supervision — corrected to trainee assist rate.",
    amount: 142.50,
    issuedByTechId: techMap["CAMG-004"], // Lisa Thornton, billing manager
    appliedToInvoiceId: frontRangeInvoice?._id,
    appliedAt: now - 10 * DAY,
    notes: "Applied as credit against INV-0014. Customer notified by email.",
    createdAt: now - 14 * DAY,
    updatedAt: now - 10 * DAY,
  });

  // ── 5. customerTaxExemptions (2 records) ───────────────────────────────────

  // Colorado Dept of Wildlife — government full exemption
  await ctx.db.insert("customerTaxExemptions", {
    orgId,
    customerId: customerIds[2], // Colorado Dept of Wildlife
    exemptionType: "full",
    certificateNumber: "COG-2023-78412",
    expiresAt: now + 365 * DAY, // Valid for another year
    createdAt: now - 270 * DAY,
  });

  // High Country Ag Aviation — ag aircraft parts exemption (14 CFR 137 operator)
  await ctx.db.insert("customerTaxExemptions", {
    orgId,
    customerId: customerIds[6], // High Country Ag Aviation
    exemptionType: "parts_only",
    certificateNumber: "CO-AG-2024-1193",
    expiresAt: now + 540 * DAY,
    createdAt: now - 120 * DAY,
  });

  // ── 6. recurringBillingTemplates (2 records) ───────────────────────────────

  // Monthly avionics maintenance contract — MedEvac (monthly PT6 trend monitoring)
  await ctx.db.insert("recurringBillingTemplates", {
    orgId,
    customerId: customerIds[3], // MWMedevac
    name: "Monthly Engine Trend Monitoring — TBM Fleet",
    description: "Monthly PT6A-66D engine trend monitoring, borescope if indicated, and performance data analysis per operator MEL and CAMP program requirements.",
    frequency: "monthly",
    lineItems: [
      {
        type: "labor",
        description: "Engine trend run & data collection (2 aircraft × 1.5 hrs/ea)",
        qty: 3,
        unitPrice: 135.00,
      },
      {
        type: "labor",
        description: "Data analysis and CAMP report preparation",
        qty: 1,
        unitPrice: 135.00,
      },
      {
        type: "external_service",
        description: "CAMP program monthly subscription (pass-through)",
        qty: 1,
        unitPrice: 185.00,
      },
    ],
    subtotal: 725.00,
    paymentTerms: "Net 30",
    paymentTermsDays: 30,
    nextGenerateAt: now + 18 * DAY,
    lastGeneratedAt: now - 12 * DAY,
    active: true,
    createdByTechId: techMap["CAMG-004"], // Lisa Thornton
    createdAt: now - 180 * DAY,
    updatedAt: now - 12 * DAY,
  });

  // Quarterly King Air 90-day inspection template — Peak Aviation Partners
  await ctx.db.insert("recurringBillingTemplates", {
    orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    name: "Quarterly 90-Day Inspection — King Air B200 N341PA",
    description: "King Air B200 90-day/100-hour inspection per Beechcraft Maintenance Manual Section 5. Includes airframe, engine, and avionics functional checks.",
    frequency: "quarterly",
    lineItems: [
      {
        type: "labor",
        description: "Airframe 100-hour inspection (Tech Lead)",
        qty: 12,
        unitPrice: 135.00,
      },
      {
        type: "labor",
        description: "Engine run & PT6A checks (Lead Tech)",
        qty: 4,
        unitPrice: 155.00,
      },
      {
        type: "labor",
        description: "Avionics functional check & logbook entry",
        qty: 2,
        unitPrice: 135.00,
      },
      {
        type: "part",
        description: "Oil filter elements (2 engines)",
        qty: 2,
        unitPrice: 42.00,
      },
      {
        type: "part",
        description: "AeroShell Turbine Oil 560 (6 qt)",
        qty: 6,
        unitPrice: 37.80,
      },
    ],
    subtotal: 3104.80,
    paymentTerms: "Net 15",
    paymentTermsDays: 15,
    nextGenerateAt: now + 75 * DAY,
    lastGeneratedAt: now - 15 * DAY,
    active: true,
    createdByTechId: techMap["CAMG-004"], // Lisa Thornton
    createdAt: now - 365 * DAY,
    updatedAt: now - 15 * DAY,
  });

  // ── 7. customerDeposits (3 records) ────────────────────────────────────────

  // Deposit from Rocky Mountain Corporate Aviation — annual inspection holdover
  await ctx.db.insert("customerDeposits", {
    orgId,
    customerId: customerIds[4], // Rocky Mountain Corporate Aviation
    amount: 5000.00,
    appliedAmount: 0.00,
    remainingAmount: 5000.00,
    method: "wire",
    referenceNumber: "WIRE-20260301-001",
    notes: "Deposit on account for upcoming King Air 350i annual inspection (WO pending scheduling). Customer requested deposit applied before invoicing.",
    recordedByTechId: techMap["CAMG-004"], // Lisa Thornton
    status: "AVAILABLE",
    createdAt: now - 9 * DAY,
    updatedAt: now - 9 * DAY,
  });

  // Partial deposit — Peak Aviation Partners, applied to active WO
  await ctx.db.insert("customerDeposits", {
    orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    amount: 3000.00,
    appliedAmount: 3000.00,
    remainingAmount: 0.00,
    method: "ach",
    referenceNumber: "ACH-20260115-PA-002",
    notes: "Deposit pre-paid against WO-2026-0101 King Air B200 Phase 3 inspection. Fully applied on invoice close.",
    recordedByTechId: techMap["CAMG-004"], // Lisa Thornton
    status: "APPLIED",
    createdAt: now - 25 * DAY,
    updatedAt: now - 3 * DAY,
  });

  // Partial deposit — Aspen Executive Air
  await ctx.db.insert("customerDeposits", {
    orgId,
    customerId: customerIds[5], // Aspen Executive Air
    amount: 2500.00,
    appliedAmount: 1800.00,
    remainingAmount: 700.00,
    method: "check",
    referenceNumber: "CHK-8842",
    notes: "Check deposit against estimated cost of gear actuator repair. $1,800 applied to WO-2026-0105; $700 remaining on account for parts balance.",
    recordedByTechId: techMap["CAMG-004"], // Lisa Thornton
    status: "PARTIAL",
    createdAt: now - 14 * DAY,
    updatedAt: now - 4 * DAY,
  });

  // ── 8. orgCounters (5 records) ─────────────────────────────────────────────
  // NOTE: orgId is v.string() in this table — cast required
  const orgIdStr = ids.orgId as unknown as string;

  await ctx.db.insert("orgCounters", {
    orgId: orgIdStr,
    counterType: "invoice",
    lastValue: 47,
  });

  await ctx.db.insert("orgCounters", {
    orgId: orgIdStr,
    counterType: "quote",
    lastValue: 23,
  });

  await ctx.db.insert("orgCounters", {
    orgId: orgIdStr,
    counterType: "po",
    lastValue: 18,
  });

  await ctx.db.insert("orgCounters", {
    orgId: orgIdStr,
    counterType: "credit_memo",
    lastValue: 2,
  });

  await ctx.db.insert("orgCounters", {
    orgId: orgIdStr,
    counterType: "work_order:WO",
    lastValue: 62,
  });

  // ── 9. quoteDepartments (6 records) ────────────────────────────────────────
  const quotes = await ctx.db
    .query("quotes")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();

  // Assign up to 3 quotes across departments; guard if fewer quotes exist
  const q0 = quotes[0];
  const q1 = quotes[1];
  const q2 = quotes[2];

  if (q0) {
    // Quote 0: King Air B200 Phase 3 — Airframe dept (approved) + Powerplant dept (submitted)
    await ctx.db.insert("quoteDepartments", {
      orgId,
      quoteId: q0._id,
      sectionName: "Airframe",
      assignedTechId: techMap["CAMG-005"], // David Kowalski, lead tech
      status: "APPROVED",
      submittedAt: now - 8 * DAY,
      createdAt: now - 10 * DAY,
      updatedAt: now - 7 * DAY,
    });

    await ctx.db.insert("quoteDepartments", {
      orgId,
      quoteId: q0._id,
      sectionName: "Powerplant",
      assignedTechId: techMap["CAMG-007"], // Mike Patterson, tech
      status: "SUBMITTED",
      submittedAt: now - 6 * DAY,
      createdAt: now - 10 * DAY,
      updatedAt: now - 6 * DAY,
    });
  }

  if (q1) {
    // Quote 1: TBM 930 annual — Airframe (pending) + Avionics (approved)
    await ctx.db.insert("quoteDepartments", {
      orgId,
      quoteId: q1._id,
      sectionName: "Airframe",
      assignedTechId: techMap["CAMG-008"], // Priya Desai
      status: "PENDING",
      createdAt: now - 4 * DAY,
      updatedAt: now - 4 * DAY,
    });

    await ctx.db.insert("quoteDepartments", {
      orgId,
      quoteId: q1._id,
      sectionName: "Avionics",
      assignedTechId: techMap["CAMG-005"], // David Kowalski
      status: "APPROVED",
      submittedAt: now - 3 * DAY,
      createdAt: now - 4 * DAY,
      updatedAt: now - 2 * DAY,
    });
  }

  if (q2) {
    // Quote 2: Grand Caravan ag/inspection — single Airframe dept (approved)
    await ctx.db.insert("quoteDepartments", {
      orgId,
      quoteId: q2._id,
      sectionName: "Airframe",
      assignedTechId: techMap["CAMG-009"], // Carlos Mendez
      status: "APPROVED",
      submittedAt: now - 15 * DAY,
      createdAt: now - 18 * DAY,
      updatedAt: now - 14 * DAY,
    });
  }

  // ── 10. quoteTemplates (3 records) ─────────────────────────────────────────

  // Template 1: King Air B200 100-hour inspection
  await ctx.db.insert("quoteTemplates", {
    orgId,
    name: "King Air B200 100-Hour Phase Inspection",
    aircraftTypeFilter: "Beechcraft King Air B200",
    lineItems: [
      {
        type: "labor",
        description: "100-hour/phase inspection — airframe (per BHT Maint. Manual Section 5)",
        qty: 16,
        unitPrice: 135.00,
        directCost: 58.00,
        markupMultiplier: 2.33,
      },
      {
        type: "labor",
        description: "PT6A engine inspection & run (both engines)",
        qty: 6,
        unitPrice: 155.00,
        directCost: 58.00,
        markupMultiplier: 2.67,
      },
      {
        type: "part",
        description: "Oil filter elements — PT6A (2 ea)",
        qty: 2,
        unitPrice: 42.00,
        directCost: 28.00,
        markupMultiplier: 1.50,
      },
      {
        type: "part",
        description: "AeroShell Turbine Oil 560 (qty to service)",
        qty: 6,
        unitPrice: 37.80,
        directCost: 28.00,
        markupMultiplier: 1.35,
      },
      {
        type: "part",
        description: "Fuel filter elements (2 ea)",
        qty: 2,
        unitPrice: 38.50,
        directCost: 25.00,
        markupMultiplier: 1.54,
      },
    ],
    isActive: true,
    createdAt: now - 270 * DAY,
    updatedAt: now - 30 * DAY,
  });

  // Template 2: Cessna 172/182 annual inspection
  await ctx.db.insert("quoteTemplates", {
    orgId,
    name: "Cessna 172/182 Annual Inspection",
    aircraftTypeFilter: "Cessna 172/182",
    lineItems: [
      {
        type: "labor",
        description: "Annual inspection — complete per 14 CFR 43 Appendix D",
        qty: 14,
        unitPrice: 135.00,
        directCost: 58.00,
        markupMultiplier: 2.33,
      },
      {
        type: "labor",
        description: "Compression check (all cylinders) & mag timing",
        qty: 2,
        unitPrice: 135.00,
        directCost: 58.00,
        markupMultiplier: 2.33,
      },
      {
        type: "part",
        description: "Oil filter element (Cessna — Champion CH48110-1)",
        qty: 1,
        unitPrice: 27.75,
        directCost: 18.50,
        markupMultiplier: 1.50,
      },
      {
        type: "part",
        description: "Engine oil — Phillips X/C 20W-50 (6 qt)",
        qty: 6,
        unitPrice: 12.50,
        directCost: 8.25,
        markupMultiplier: 1.52,
      },
      {
        type: "part",
        description: "Spark plugs — Champion REM37BY (set of 8)",
        qty: 8,
        unitPrice: 28.50,
        directCost: 19.00,
        markupMultiplier: 1.50,
      },
    ],
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // Template 3: Pitot-static / transponder IFR certification
  await ctx.db.insert("quoteTemplates", {
    orgId,
    name: "IFR Certification — Pitot-Static & Transponder",
    lineItems: [
      {
        type: "labor",
        description: "Pitot-static system test per 14 CFR 91.411 (FAR biennial)",
        qty: 3,
        unitPrice: 135.00,
        directCost: 58.00,
        markupMultiplier: 2.33,
      },
      {
        type: "labor",
        description: "Transponder operational check per 14 CFR 91.413",
        qty: 2,
        unitPrice: 135.00,
        directCost: 58.00,
        markupMultiplier: 2.33,
      },
      {
        type: "external_service",
        description: "Mode C encoder calibration (if required) — external avionics shop",
        qty: 1,
        unitPrice: 185.00,
        directCost: 155.00,
        markupMultiplier: 1.19,
      },
    ],
    isActive: true,
    createdAt: now - 180 * DAY,
  });

  // ── 11. shopSettings (1 record) ────────────────────────────────────────────
  await ctx.db.insert("shopSettings", {
    orgId,
    shopRate: 135.00,
    averageHourlyCost: 58.00,
    partMarkupTiers: [
      { maxCostThreshold: 100, markupMultiplier: 1.50 },
      { maxCostThreshold: 500, markupMultiplier: 1.35 },
      { maxCostThreshold: 2000, markupMultiplier: 1.25 },
      { maxCostThreshold: 10000, markupMultiplier: 1.15 },
      { maxCostThreshold: 999999, markupMultiplier: 1.10 },
    ],
    serviceMarkupTiers: [
      { maxCostThreshold: 500, markupMultiplier: 1.25 },
      { maxCostThreshold: 2000, markupMultiplier: 1.20 },
      { maxCostThreshold: 999999, markupMultiplier: 1.15 },
    ],
    updatedAt: now - 30 * DAY,
    createdAt: now - 365 * DAY,
  });

  // ── 12. orgBillingSettings (1 record) ──────────────────────────────────────
  await ctx.db.insert("orgBillingSettings", {
    orgId,
    companyName: "Colorado Aviation Maintenance Group, LLC",
    companyAddress: "7665 S. Peoria St., Suite 110\nEnglewood, CO 80112",
    companyPhone: "(720) 555-0147",
    companyEmail: "billing@camgaviation.com",
    invoiceTerms: "Payment due within 30 days of invoice date. A 1.5% monthly finance charge (18% APR) will be applied to balances outstanding beyond 30 days. Aircraft will not be returned to service on future visits until outstanding balances are resolved.",
    invoiceNotes: "Thank you for your business. CAMG is an FAA Part 145 Certificated Repair Station (AGBR601L).",
    quoteTerms: "This estimate is valid for 30 days from the date of issue. Actual charges may vary based on findings during inspection. Customer will be notified before any work beyond this estimate is performed.",
    quoteNotes: "All work performed under FAA Part 145 Certificate AGBR601L. Parts quoted are new unless otherwise noted. Overhauled/serviceable exchange units are available upon request.",
    paymentInstructions: "Check payable to Colorado Aviation Maintenance Group, LLC\nACH/Wire: First National Bank — Routing 107005047, Account 4401882291\nCredit card accepted (3% surcharge applies).",
    defaultPaymentTerms: "Net 30",
    defaultPaymentTermsDays: 30,
    poApprovalThreshold: 1500.00,
    baseCurrency: "USD",
    supportedCurrencies: ["USD"],
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 4: CRM & CUSTOMER PORTAL
// Tables: customerNotes, customerRequests, crmContacts, crmInteractions,
//         crmOpportunities, crmHealthSnapshots, prospectNotes
// ══════════════════════════════════════════════════════════════════════════════

export async function seedWave4(ctx: MutationCtx, ids: SeedIds) {
  const {
    orgId,
    clerkUserId,
    now,
    DAY,
    HOUR,
    techMap,
    customerIds,
    aircraftIds,
    activeWOIds,
    closedWOIds,
  } = ids;

  // ── 1. customerNotes (10 records) ──────────────────────────────────────────

  // Peak Aviation Partners
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[0],
    organizationId: orgId,
    content: "Customer called to check status of N341PA Phase 3 inspection. Spoke with James (ops manager). Advised parts for PT6A igniter plugs received and installation on schedule for Wednesday. Customer confirmed they need aircraft back NLT Friday for charter ops.",
    createdByUserId: clerkUserId,
    createdByName: "David Kowalski",
    createdAt: now - 3 * DAY,
  });

  await ctx.db.insert("customerNotes", {
    customerId: customerIds[0],
    organizationId: orgId,
    content: "Peak Aviation renewing annual contract for preventive maintenance on both King Airs. Maria Santos discussed rate structure — customer accepted 3% increase effective Q2 2026. New PO required from their accounting dept.",
    createdByUserId: clerkUserId,
    createdByName: "Maria Santos",
    createdAt: now - 45 * DAY,
  });

  // Front Range Flight Training
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[1],
    organizationId: orgId,
    content: "Spoke with Tom Bradley (owner) regarding scheduling the 172S and 182T annuals back-to-back in late March. They need both aircraft back before spring flying season starts. We can accommodate both aircraft in hangar simultaneously — confirmed with bay scheduling.",
    createdByUserId: clerkUserId,
    createdByName: "Maria Santos",
    createdAt: now - 14 * DAY,
  });

  await ctx.db.insert("customerNotes", {
    customerId: customerIds[1],
    organizationId: orgId,
    content: "Applied credit memo CM-0002 ($142.50) to INV-0014. Tom Bradley acknowledged receipt via email. Account now current. Good relationship — 12 WOs last year.",
    createdByUserId: clerkUserId,
    createdByName: "Lisa Thornton",
    createdAt: now - 10 * DAY,
  });

  // Colorado Dept of Wildlife
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[2],
    organizationId: orgId,
    content: "Annual government contract renewal submitted to CDOW procurement. POC is Karen Willis, contracting officer. Contract includes 4 Cessna T206H annual inspections plus on-call unscheduled maintenance. Value approximately $38,000/yr. Awaiting signature.",
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 60 * DAY,
  });

  // MWMedevac
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[3],
    organizationId: orgId,
    content: "MedEvac operations manager (Rick Diaz) called about N930MW TBM 930 engine trend data. February trend run flagged slight ITT deviation on start cycle. We recommended borescope inspection before next dispatch. Customer authorized work immediately — safety-critical operation.",
    createdByUserId: clerkUserId,
    createdByName: "David Kowalski",
    createdAt: now - 7 * DAY,
  });

  // Rocky Mountain Corporate Aviation
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[4],
    organizationId: orgId,
    content: "Rocky Mountain Corp Av has a new Director of Maintenance — Craig Hoffman starts March 15. Previous DOM was Steve Pelletier who retired. Craig has 22 years King Air experience (NetJets). Set up introductory call for next week. High-value account — 3 aircraft, approx. $185K/yr revenue.",
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 20 * DAY,
  });

  // Aspen Executive Air
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[5],
    organizationId: orgId,
    content: "Aspen Exec confirmed King Air 250 N892PA main gear actuator squawk. Aircraft AOG at APA. We've ordered replacement actuator assembly (Aviall PO-2026-0015). ETA 3 business days. Customer arranging ground transportation for pax in the meantime.",
    createdByUserId: clerkUserId,
    createdByName: "David Kowalski",
    createdAt: now - 6 * DAY,
  });

  // High Country Ag Aviation
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[6],
    organizationId: orgId,
    content: "High Country Ag called to schedule N208CD Grand Caravan before ag season starts April 1. Needs: annual inspection, hopper system check, and spray boom resealing. Also asking about Part 137 operating certificate renewal support documentation. Scheduling for week of March 24.",
    createdByUserId: clerkUserId,
    createdByName: "Sarah Nakamura",
    createdAt: now - 12 * DAY,
  });

  // Peak Aviation Partners — historical note
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[0],
    organizationId: orgId,
    content: "Completed invoice review with Peak Aviation for Q4 2025. Total billing: $142,800. Customer satisfied with quality and turn times. No disputes. They're evaluating adding a third King Air to their fleet (used 250 or 350) which would increase our MRO exposure with this account significantly.",
    createdByUserId: clerkUserId,
    createdByName: "Lisa Thornton",
    createdAt: now - 75 * DAY,
  });

  // Front Range Flight Training — maintenance planning note
  await ctx.db.insert("customerNotes", {
    customerId: customerIds[1],
    organizationId: orgId,
    content: "Front Range adding a Bonanza A36 to their rental fleet (N90FR). Aircraft currently based at APA. They want us to perform the pre-buy inspection and handle all ongoing maintenance. Bonanza is outside our turboprop focus but good single-engine volume opportunity. Confirmed we have A&P coverage.",
    createdByUserId: clerkUserId,
    createdByName: "Maria Santos",
    createdAt: now - 28 * DAY,
  });

  // ── 2. customerRequests (6 records) ────────────────────────────────────────

  await ctx.db.insert("customerRequests", {
    organizationId: orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    customerNameSnapshot: "Peak Aviation Partners",
    customerEmailSnapshot: "ops@peaviationco.com",
    workOrderId: activeWOIds[0],
    aircraftId: aircraftIds[0],
    subject: "N341PA — ETA update request",
    message: "Hi CAMG team — can we get an updated ETA on the Phase 3 inspection? We have a charter departure Friday 0800 and need the aircraft airworthy by Thursday 1700 latest. Please advise. — James, Peak Aviation Ops",
    category: "work_order",
    priority: "high",
    status: "responded",
    submittedByUserId: "portal_peak_ops_001",
    submittedByEmail: "ops@peaviationco.com",
    internalResponse: "Hi James — N341PA is on track for completion Thursday EOD. PT6A igniter plugs installed this morning, final engine run scheduled for Thursday 1400. We'll call you immediately after the run check. — David Kowalski, CAMG",
    respondedByUserId: clerkUserId,
    respondedAt: now - 2 * DAY,
    createdAt: now - 3 * DAY,
    updatedAt: now - 2 * DAY,
  });

  await ctx.db.insert("customerRequests", {
    organizationId: orgId,
    customerId: customerIds[1], // Front Range Flight Training
    customerNameSnapshot: "Front Range Flight Training",
    customerEmailSnapshot: "accounting@frontrangeflght.com",
    subject: "Invoice INV-0014 — discrepancy on labor hours",
    message: "We reviewed INV-0014 and noticed the labor rate on the 172S oil change is higher than our agreed rate. Can someone from billing review and clarify? We expected the flight school rate per our contract.",
    category: "invoice",
    priority: "normal",
    status: "closed",
    submittedByUserId: "portal_frontrange_001",
    submittedByEmail: "accounting@frontrangeflght.com",
    internalResponse: "Hi — you're correct. We've issued credit memo CM-0002 for $142.50 and applied it to your account balance. INV-0014 has been adjusted. Our apologies for the billing discrepancy. — Lisa Thornton, CAMG Billing",
    respondedByUserId: clerkUserId,
    respondedAt: now - 10 * DAY,
    createdAt: now - 14 * DAY,
    updatedAt: now - 9 * DAY,
  });

  await ctx.db.insert("customerRequests", {
    organizationId: orgId,
    customerId: customerIds[3], // MWMedevac
    customerNameSnapshot: "MWMedevac",
    customerEmailSnapshot: "maintenance@mwmedevac.org",
    aircraftId: aircraftIds[4],
    subject: "N930MW engine trend concern — borescope authorization",
    message: "David, we saw your email about the ITT deviation on N930MW. We're authorizing the borescope inspection immediately. This aircraft is on our HEMS certificate — any indication of engine anomaly must be investigated before return to service. Please proceed and keep us informed of findings.",
    category: "technical",
    priority: "high",
    status: "in_review",
    submittedByUserId: "portal_mwmedevac_001",
    submittedByEmail: "maintenance@mwmedevac.org",
    createdAt: now - 6 * DAY,
    updatedAt: now - 6 * DAY,
  });

  await ctx.db.insert("customerRequests", {
    organizationId: orgId,
    customerId: customerIds[5], // Aspen Executive Air
    customerNameSnapshot: "Aspen Executive Air",
    customerEmailSnapshot: "ops@aspenexecair.com",
    workOrderId: activeWOIds[4],
    aircraftId: aircraftIds[1],
    subject: "N892PA AOG — actuator ETA and estimated total cost",
    message: "Appreciate the fast response on the gear squawk. Can you give us an estimated total for the actuator repair including parts and labor? Also any chance of expedited shipping on the part? We have passengers stranded.",
    category: "work_order",
    priority: "high",
    status: "responded",
    submittedByUserId: "portal_aspen_001",
    submittedByEmail: "ops@aspenexecair.com",
    internalResponse: "Hi — estimated total for N892PA gear actuator R&R: $5,640 (actuator $4,830 + labor 4 hrs at $155). We've already requested expedited shipping from Aviall — they confirmed overnight for +$185 freight. New ETA is tomorrow morning. We'll confirm receipt and install status by 1200 tomorrow. — David Kowalski",
    respondedByUserId: clerkUserId,
    respondedAt: now - 5 * DAY,
    createdAt: now - 6 * DAY,
    updatedAt: now - 5 * DAY,
  });

  await ctx.db.insert("customerRequests", {
    organizationId: orgId,
    customerId: customerIds[6], // High Country Ag Aviation
    customerNameSnapshot: "High Country Ag Aviation",
    customerEmailSnapshot: "roger@highcountryag.com",
    subject: "Schedule question — March annual and Part 137 documentation",
    message: "Roger here from High Country Ag. We need the Grand Caravan done before April 1 ag season. Can we get on the schedule for March 24 week? Also I need documentation for my Part 137 certificate renewal — do you have the maintenance records from last season's annual?",
    category: "general",
    priority: "normal",
    status: "responded",
    submittedByUserId: "portal_highcountry_001",
    submittedByEmail: "roger@highcountryag.com",
    internalResponse: "Hi Roger — March 24 works great. I've blocked out the bay for N208CD March 24-28. For Part 137 documentation, I'll pull your maintenance history and compile an airworthiness summary letter — standard stuff for certificate renewal. I'll have it ready when you come in. — Sarah Nakamura, FNL",
    respondedByUserId: clerkUserId,
    respondedAt: now - 11 * DAY,
    createdAt: now - 12 * DAY,
    updatedAt: now - 11 * DAY,
  });

  await ctx.db.insert("customerRequests", {
    organizationId: orgId,
    customerId: customerIds[2], // Colorado Dept of Wildlife
    customerNameSnapshot: "Colorado Dept of Wildlife",
    customerEmailSnapshot: "aviation@cdow.state.co.us",
    aircraftId: aircraftIds[7],
    subject: "Annual inspection schedule for N206HCA — fiscal year coordination",
    message: "CDOW Aviation is planning our FY2027 budget. Can you provide an estimate for the annual inspection on N206HCA (Cessna T206H)? Also interested in a quote for IFR cert if it comes due this cycle. Need estimates by April 1 for budget submission.",
    category: "quote",
    priority: "normal",
    status: "new",
    submittedByUserId: "portal_cdow_001",
    submittedByEmail: "aviation@cdow.state.co.us",
    createdAt: now - 1 * DAY,
    updatedAt: now - 1 * DAY,
  });

  // ── 3. crmContacts (12 records) ────────────────────────────────────────────

  // Peak Aviation Partners contacts
  const contactJamesPeak = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[0],
    firstName: "James",
    lastName: "Calloway",
    title: "Director of Operations",
    role: "operations",
    email: "ops@peaviationco.com",
    phone: "(303) 555-0212",
    mobilePhone: "(303) 555-0891",
    isPrimary: true,
    receiveStatusUpdates: true,
    notes: "Primary ops POC. Prefers text for AOG situations, email for routine updates. Good relationship — responsive.",
    active: true,
    lastContactedAt: now - 3 * DAY,
    createdAt: now - 400 * DAY,
    updatedAt: now - 3 * DAY,
  });

  const contactDOMAMPeak = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[0],
    firstName: "Sandra",
    lastName: "Wilks",
    title: "Director of Maintenance",
    role: "dom",
    email: "dom@peaviationco.com",
    phone: "(303) 555-0213",
    isPrimary: false,
    receiveStatusUpdates: true,
    notes: "Sandra holds IA cert (#4231872). Reviews all maintenance releases for Part 135 operations. Must be copied on RTS documentation.",
    active: true,
    lastContactedAt: now - 10 * DAY,
    createdAt: now - 400 * DAY,
    updatedAt: now - 10 * DAY,
  });

  // Front Range Flight Training contacts
  const contactTomFRFT = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[1],
    firstName: "Tom",
    lastName: "Bradley",
    title: "Owner / Chief CFI",
    role: "owner",
    email: "tom@frontrangeflght.com",
    phone: "(970) 555-0118",
    mobilePhone: "(970) 555-0443",
    isPrimary: true,
    receiveStatusUpdates: true,
    notes: "Owner and primary decision maker. Very cost-conscious — always asks for itemized invoices. Good payer once invoices are accurate.",
    active: true,
    lastContactedAt: now - 10 * DAY,
    createdAt: now - 350 * DAY,
    updatedAt: now - 10 * DAY,
  });

  // Colorado Dept of Wildlife contacts
  const contactKarenCDOW = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[2],
    firstName: "Karen",
    lastName: "Willis",
    title: "Aviation Contracting Officer",
    role: "ap_manager",
    email: "karen.willis@cdow.state.co.us",
    phone: "(303) 555-0340",
    isPrimary: true,
    receiveStatusUpdates: false,
    notes: "Karen handles procurement and contract renewals. Requires 60-day notice for new contracts. Strict about government rates and tax exemption documentation.",
    active: true,
    lastContactedAt: now - 60 * DAY,
    createdAt: now - 300 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const contactPilotCDOW = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[2],
    firstName: "Marcus",
    lastName: "Delgado",
    title: "Chief Pilot",
    role: "chief_pilot",
    email: "marcus.delgado@cdow.state.co.us",
    phone: "(303) 555-0341",
    mobilePhone: "(720) 555-0812",
    isPrimary: false,
    receiveStatusUpdates: true,
    notes: "Marcus coordinates aircraft scheduling with our maintenance schedule. Call him directly for AOG situations — he can reallocate mission assets.",
    active: true,
    lastContactedAt: now - 30 * DAY,
    createdAt: now - 300 * DAY,
    updatedAt: now - 30 * DAY,
  });

  // MWMedevac contacts
  const contactRickMedEvac = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[3],
    firstName: "Rick",
    lastName: "Diaz",
    title: "Operations Manager",
    role: "operations",
    email: "rdiaz@mwmedevac.org",
    phone: "(720) 555-0519",
    mobilePhone: "(720) 555-0901",
    isPrimary: true,
    receiveStatusUpdates: true,
    notes: "AOG-critical customer. Rick is on call 24/7. Always responds within 15 min. HEMS operations — any maintenance delay has life-safety implications. Treat with highest priority.",
    active: true,
    lastContactedAt: now - 6 * DAY,
    createdAt: now - 500 * DAY,
    updatedAt: now - 6 * DAY,
  });

  // Rocky Mountain Corporate Aviation contacts
  const contactCraigRMCA = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[4],
    firstName: "Craig",
    lastName: "Hoffman",
    title: "Director of Maintenance",
    role: "dom",
    email: "c.hoffman@rmcorpav.com",
    phone: "(720) 555-0662",
    isPrimary: true,
    receiveStatusUpdates: true,
    notes: "New DOM starting March 15. Former NetJets — very experienced. Expect he'll do a thorough review of our processes. Schedule introductory meeting.",
    active: true,
    lastContactedAt: now - 20 * DAY,
    createdAt: now - 20 * DAY,
    updatedAt: now - 20 * DAY,
  });

  // Aspen Executive Air contacts
  const contactAspenOps = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[5],
    firstName: "Patricia",
    lastName: "Okonkwo",
    title: "Chief Pilot / DOM",
    role: "dom",
    email: "patricia@aspenexecair.com",
    phone: "(970) 555-0773",
    mobilePhone: "(970) 555-0221",
    isPrimary: true,
    receiveStatusUpdates: true,
    notes: "Patricia holds both ATP and DOM authority. Very detail-oriented — expects written status updates on AOG events. Good technical background.",
    active: true,
    lastContactedAt: now - 5 * DAY,
    createdAt: now - 250 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // High Country Ag Aviation contacts
  const contactRogerHCGA = await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[6],
    firstName: "Roger",
    lastName: "Tanner",
    title: "Owner / Pilot",
    role: "owner",
    email: "roger@highcountryag.com",
    phone: "(970) 555-0884",
    mobilePhone: "(970) 555-0229",
    isPrimary: true,
    receiveStatusUpdates: true,
    notes: "Sole owner. Seasonal operation — very busy Feb-Sep (ag season), quiet Oct-Jan. Highly price-sensitive but loyal. Pays by check, usually within 15 days.",
    active: true,
    lastContactedAt: now - 11 * DAY,
    createdAt: now - 600 * DAY,
    updatedAt: now - 11 * DAY,
  });

  // Additional secondary contacts
  await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[0], // Peak Aviation Partners — dispatch contact
    firstName: "Nicole",
    lastName: "Vargas",
    title: "Flight Dispatcher",
    role: "dispatcher",
    email: "dispatch@peaviationco.com",
    phone: "(303) 555-0214",
    isPrimary: false,
    receiveStatusUpdates: true,
    notes: "Nicole coordinates aircraft return scheduling. cc: her on all ETA updates and aircraft release notifications.",
    active: true,
    createdAt: now - 200 * DAY,
    updatedAt: now - 50 * DAY,
  });

  await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[4], // Rocky Mountain Corporate Aviation — former DOM (inactive)
    firstName: "Steve",
    lastName: "Pelletier",
    title: "Director of Maintenance (Retired)",
    role: "dom",
    email: "steve.pelletier@rmcorpav.com",
    isPrimary: false,
    receiveStatusUpdates: false,
    notes: "Retired March 1. Replaced by Craig Hoffman. Keep record for historical reference — Steve managed the account for 8 years.",
    active: false,
    createdAt: now - 730 * DAY,
    updatedAt: now - 10 * DAY,
  });

  await ctx.db.insert("crmContacts", {
    organizationId: orgId,
    customerId: customerIds[3], // MWMedevac — AP contact
    firstName: "Sandra",
    lastName: "Fuentes",
    title: "Accounts Payable Manager",
    role: "ap_manager",
    email: "ap@mwmedevac.org",
    phone: "(720) 555-0520",
    isPrimary: false,
    receiveStatusUpdates: false,
    notes: "Sandra processes all HEMS invoices. Requires PO number on every invoice — their accounting system rejects invoices without a PO ref. Rick Diaz issues POs.",
    active: true,
    lastContactedAt: now - 20 * DAY,
    createdAt: now - 400 * DAY,
    updatedAt: now - 20 * DAY,
  });

  // ── 4. crmInteractions (10 records) ────────────────────────────────────────

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    contactId: contactJamesPeak,
    type: "phone_call",
    direction: "inbound",
    subject: "N341PA Phase 3 status check",
    description: "James Calloway called asking for status update on the King Air B200 Phase 3 inspection. Discussed current progress, igniter plug install, and expected completion date.",
    outcome: "Customer satisfied with progress. Confirmed Thursday completion target. No scope changes requested.",
    durationMinutes: 12,
    interactionDate: now - 3 * DAY,
    createdByUserId: clerkUserId,
    createdByName: "David Kowalski",
    createdAt: now - 3 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    contactId: contactDOMAMPeak,
    type: "email",
    direction: "outbound",
    subject: "Q4 2025 Maintenance Summary — Peak Aviation Partners",
    description: "Sent annual maintenance summary report to Sandra Wilks (DOM) covering all WOs completed in Q4 2025, parts replaced, ADs complied with, and upcoming scheduled maintenance items.",
    outcome: "Sandra replied confirming receipt and will review before their next Board meeting.",
    interactionDate: now - 75 * DAY,
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 75 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[1], // Front Range Flight Training
    contactId: contactTomFRFT,
    type: "phone_call",
    direction: "outbound",
    subject: "Spring annual scheduling discussion",
    description: "Called Tom Bradley to discuss scheduling 172S and 182T annuals. Both aircraft need annuals before the spring training season. Proposed March 10-21 window (both aircraft sequential).",
    outcome: "Tom agreed to the window. He'll send a formal work authorization by end of week. Requested itemized quote first.",
    durationMinutes: 18,
    interactionDate: now - 14 * DAY,
    followUpDate: now + 3 * DAY,
    followUpCompleted: false,
    createdByUserId: clerkUserId,
    createdByName: "Maria Santos",
    createdAt: now - 14 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[2], // Colorado Dept of Wildlife
    contactId: contactKarenCDOW,
    type: "meeting",
    direction: "outbound",
    subject: "FY2027 Contract Renewal — CDOW Aviation",
    description: "In-person meeting with Karen Willis at CDOW offices in Denver. Presented renewal proposal for FY2027 aircraft maintenance contract. Includes 4 T206H annuals, IFR cert cycle for 2 aircraft, and on-call AOG coverage.",
    outcome: "Karen will route proposal to CDOW legal for review. Standard 45-day review cycle. She noted the pricing is competitive. Likely renewal unless significant budget cuts.",
    durationMinutes: 75,
    interactionDate: now - 60 * DAY,
    followUpDate: now + 15 * DAY,
    followUpCompleted: false,
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 60 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[3], // MWMedevac
    contactId: contactRickMedEvac,
    type: "phone_call",
    direction: "inbound",
    subject: "N930MW ITT anomaly — borescope authorization",
    description: "Rick Diaz called immediately after receiving our trend monitoring report flagging the ITT deviation on N930MW. He authorized borescope inspection on the spot and asked us to treat as AOG priority.",
    outcome: "Borescope authorized. Scheduling for tomorrow morning first thing. Rick will hold the aircraft from dispatch pending our findings report.",
    durationMinutes: 8,
    interactionDate: now - 6 * DAY,
    createdByUserId: clerkUserId,
    createdByName: "David Kowalski",
    createdAt: now - 6 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[4], // Rocky Mountain Corporate Aviation
    contactId: contactCraigRMCA,
    type: "meeting",
    direction: "outbound",
    subject: "New DOM Introduction — Craig Hoffman",
    description: "Introductory meeting with Craig Hoffman, incoming DOM for Rocky Mountain Corporate Aviation. Walked him through our facilities, met the team, reviewed open WOs and maintenance history for their fleet (King Air 350i N350AE and two other aircraft).",
    outcome: "Craig was very impressed with the shop. He has specific requirements for his CAMP data — wants monthly syncs. Discussing potential to expand scope to include avionics work they currently outsource. Follow up with CAMP integration capability sheet.",
    durationMinutes: 120,
    interactionDate: now - 15 * DAY,
    followUpDate: now + 5 * DAY,
    followUpCompleted: false,
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 15 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[5], // Aspen Executive Air
    contactId: contactAspenOps,
    type: "phone_call",
    direction: "outbound",
    subject: "N892PA AOG update — actuator arrival and install schedule",
    description: "Called Patricia Okonkwo with update on King Air 250 gear actuator situation. Confirmed expedited part arrival and provided detailed install timeline.",
    outcome: "Patricia approved expedited freight cost. She needs the aircraft back no later than Saturday for a charter leg. We confirmed Thursday completion — two days buffer.",
    durationMinutes: 20,
    interactionDate: now - 5 * DAY,
    createdByUserId: clerkUserId,
    createdByName: "David Kowalski",
    createdAt: now - 5 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[6], // High Country Ag Aviation
    contactId: contactRogerHCGA,
    type: "phone_call",
    direction: "inbound",
    subject: "Spring annual scheduling and Part 137 documentation",
    description: "Roger Tanner called to schedule the Grand Caravan annual and get Part 137 renewal documentation. Discussed hopper system inspection and spray boom resealing scope.",
    outcome: "Scheduled March 24-28. Quote to follow. Roger mentioned he may want a second Grand Caravan in the future if the season goes well.",
    durationMinutes: 25,
    interactionDate: now - 12 * DAY,
    followUpDate: now + 10 * DAY,
    followUpCompleted: false,
    createdByUserId: clerkUserId,
    createdByName: "Sarah Nakamura",
    createdAt: now - 12 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[0], // Peak Aviation Partners
    contactId: contactJamesPeak,
    type: "site_visit",
    direction: "inbound",
    subject: "Peak Aviation fleet visit — annual maintenance review",
    description: "James Calloway and Sandra Wilks visited our APA facility for their annual maintenance review. Toured the shop, reviewed in-progress WOs, and discussed fleet maintenance planning for 2026.",
    outcome: "Excellent relationship-building visit. They're very satisfied with quality. Discussed potential to add third King Air to fleet — we'd be primary MRO. Sandra requested we be included in their pre-buy inspection if they find a candidate aircraft.",
    durationMinutes: 180,
    interactionDate: now - 45 * DAY,
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 45 * DAY,
  });

  await ctx.db.insert("crmInteractions", {
    organizationId: orgId,
    customerId: customerIds[1], // Front Range Flight Training
    contactId: contactTomFRFT,
    type: "note",
    subject: "Credit memo discussion — INV-0014 billing discrepancy",
    description: "Tom called regarding billing discrepancy on INV-0014. Labor rate was charged at standard A&P rate rather than flight school preferred rate. Reviewed invoice with Lisa and confirmed the error. Credit memo CM-0002 authorized.",
    outcome: "Tom satisfied with resolution. Reminded him of the agreed rate schedule and confirmed it's now in our billing system as a pricing profile.",
    durationMinutes: 15,
    interactionDate: now - 14 * DAY,
    createdByUserId: clerkUserId,
    createdByName: "Lisa Thornton",
    createdAt: now - 14 * DAY,
  });

  // ── 5. crmOpportunities (6 records) ────────────────────────────────────────

  // Peak Aviation: Third King Air pre-buy — prospecting stage
  await ctx.db.insert("crmOpportunities", {
    organizationId: orgId,
    customerId: customerIds[0],
    title: "Peak Aviation Fleet Expansion — Third King Air Pre-Buy & MRO Contract",
    description: "Peak Aviation is evaluating a used King Air 250 or 350 to expand their Part 135 charter fleet. They've requested CAMG be their primary MRO and conduct the pre-buy inspection. Estimated annual MRO value of $55,000-$80,000 for the additional aircraft.",
    stage: "prospecting",
    estimatedValue: 75000,
    estimatedLaborHours: 180,
    probability: 70,
    expectedCloseDate: now + 90 * DAY,
    source: "existing_customer",
    assignedToUserId: clerkUserId,
    assignedToName: "James Harwick",
    createdAt: now - 45 * DAY,
    updatedAt: now - 10 * DAY,
  });

  // Rocky Mountain Corp: Avionics scope expansion — qualification stage
  await ctx.db.insert("crmOpportunities", {
    organizationId: orgId,
    customerId: customerIds[4],
    aircraftId: aircraftIds[6], // King Air 350i N350AE
    title: "Rocky Mountain Corporate Aviation — Avionics MRO Scope Expansion",
    description: "RMCA currently outsources all avionics work to Denver Avionics ($30K/yr+). Craig Hoffman expressed interest in consolidating MRO here. Would require us to quote avionics capability expansion (G600 avionics support). High strategic value.",
    stage: "qualification",
    estimatedValue: 35000,
    estimatedLaborHours: 90,
    probability: 55,
    expectedCloseDate: now + 120 * DAY,
    source: "existing_customer",
    assignedToUserId: clerkUserId,
    assignedToName: "James Harwick",
    createdAt: now - 15 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // CDOW: Full contract renewal — proposal stage
  await ctx.db.insert("crmOpportunities", {
    organizationId: orgId,
    customerId: customerIds[2],
    title: "CDOW Aviation FY2027 Maintenance Contract Renewal",
    description: "Annual renewal of Colorado Dept of Wildlife maintenance contract. Covers 4 aircraft (Cessna T206H fleet). Scope includes annuals, IFR certs, and on-call AOG. Contract value approximately $38K annually.",
    stage: "proposal",
    estimatedValue: 38000,
    estimatedLaborHours: 95,
    probability: 85,
    expectedCloseDate: now + 45 * DAY,
    source: "existing_customer",
    assignedToUserId: clerkUserId,
    assignedToName: "James Harwick",
    createdAt: now - 60 * DAY,
    updatedAt: now - 30 * DAY,
  });

  // MedEvac: Engine overhaul opportunity — won
  await ctx.db.insert("crmOpportunities", {
    organizationId: orgId,
    customerId: customerIds[3],
    aircraftId: aircraftIds[4], // TBM 930
    title: "MWMedevac N930MW Engine Borescope & Trend Investigation",
    description: "ITT anomaly detected during monthly trend monitoring. Borescope inspection authorized. If combustion liner damage found, may escalate to engine removal and overhaul at approved engine shop (Stanley Aviation). CAMG manages R&R.",
    stage: "won",
    estimatedValue: 4500,
    estimatedLaborHours: 12,
    probability: 100,
    expectedCloseDate: now - 3 * DAY,
    actualCloseDate: now - 5 * DAY,
    wonWorkOrderId: activeWOIds[2],
    source: "existing_customer",
    assignedToUserId: clerkUserId,
    assignedToName: "David Kowalski",
    createdAt: now - 6 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // High Country Ag: Annual inspection — proposal stage
  await ctx.db.insert("crmOpportunities", {
    organizationId: orgId,
    customerId: customerIds[6],
    aircraftId: aircraftIds[8], // Grand Caravan N208CD
    title: "High Country Ag Annual Inspection + Part 137 Compliance Package",
    description: "Grand Caravan annual inspection plus agricultural spray system inspection and Part 137 certificate renewal documentation. Seasonal timing is critical — must complete before April 1.",
    stage: "proposal",
    estimatedValue: 8200,
    estimatedLaborHours: 38,
    probability: 95,
    expectedCloseDate: now + 14 * DAY,
    source: "existing_customer",
    assignedToUserId: clerkUserId,
    assignedToName: "Sarah Nakamura",
    createdAt: now - 12 * DAY,
    updatedAt: now - 11 * DAY,
  });

  // Front Range: Second aircraft (Bonanza A36) — qualification stage
  await ctx.db.insert("crmOpportunities", {
    organizationId: orgId,
    customerId: customerIds[1],
    aircraftId: aircraftIds[9], // Bonanza A36 N90FR
    title: "Front Range Flight Training — Bonanza A36 Pre-Buy and Annual MRO",
    description: "Tom Bradley is adding N90FR (Bonanza A36) to the FRFT rental fleet. Requesting pre-buy inspection and ongoing annual/100-hr MRO. Good opportunity to deepen relationship with our busiest flight school customer.",
    stage: "qualification",
    estimatedValue: 9500,
    estimatedLaborHours: 24,
    probability: 90,
    expectedCloseDate: now + 30 * DAY,
    source: "existing_customer",
    assignedToUserId: clerkUserId,
    assignedToName: "Maria Santos",
    createdAt: now - 28 * DAY,
    updatedAt: now - 14 * DAY,
  });

  // ── 6. crmHealthSnapshots (5 records) ──────────────────────────────────────

  // Peak Aviation Partners — excellent health
  await ctx.db.insert("crmHealthSnapshots", {
    organizationId: orgId,
    customerId: customerIds[0],
    overallScore: 92,
    factors: {
      woFrequency: 95,
      paymentTimeliness: 90,
      fleetSize: 90,
      contractValue: 98,
      communicationFrequency: 88,
      recencyOfWork: 95,
    },
    churnRiskLevel: "low",
    snapshotDate: now - 1 * DAY,
    createdAt: now - 1 * DAY,
  });

  // Front Range Flight Training — good health, watch billing accuracy
  await ctx.db.insert("crmHealthSnapshots", {
    organizationId: orgId,
    customerId: customerIds[1],
    overallScore: 74,
    factors: {
      woFrequency: 85,
      paymentTimeliness: 72,
      fleetSize: 55,
      contractValue: 65,
      communicationFrequency: 80,
      recencyOfWork: 88,
    },
    churnRiskLevel: "low",
    snapshotDate: now - 1 * DAY,
    createdAt: now - 1 * DAY,
  });

  // MWMedevac — high value, high engagement, low churn risk
  await ctx.db.insert("crmHealthSnapshots", {
    organizationId: orgId,
    customerId: customerIds[3],
    overallScore: 96,
    factors: {
      woFrequency: 98,
      paymentTimeliness: 95,
      fleetSize: 80,
      contractValue: 95,
      communicationFrequency: 98,
      recencyOfWork: 100,
    },
    churnRiskLevel: "low",
    snapshotDate: now - 1 * DAY,
    createdAt: now - 1 * DAY,
  });

  // Rocky Mountain Corporate Aviation — medium risk due to DOM transition
  await ctx.db.insert("crmHealthSnapshots", {
    organizationId: orgId,
    customerId: customerIds[4],
    overallScore: 68,
    factors: {
      woFrequency: 75,
      paymentTimeliness: 85,
      fleetSize: 80,
      contractValue: 90,
      communicationFrequency: 55,
      recencyOfWork: 70,
    },
    churnRiskLevel: "medium",
    snapshotDate: now - 1 * DAY,
    createdAt: now - 1 * DAY,
  });

  // High Country Ag Aviation — seasonal pattern, medium engagement
  await ctx.db.insert("crmHealthSnapshots", {
    organizationId: orgId,
    customerId: customerIds[6],
    overallScore: 62,
    factors: {
      woFrequency: 65,
      paymentTimeliness: 88,
      fleetSize: 35,
      contractValue: 45,
      communicationFrequency: 60,
      recencyOfWork: 72,
    },
    churnRiskLevel: "medium",
    snapshotDate: now - 1 * DAY,
    createdAt: now - 1 * DAY,
  });

  // ── 7. prospectNotes (4 records) ───────────────────────────────────────────
  // Prospect entity IDs are string references to external prospect records
  // (aircraft operators in the region CAMG has not yet converted to customers)

  // Prospect: Denver Air Charter LLC — regional Part 135 charter operator
  await ctx.db.insert("prospectNotes", {
    prospectEntityId: "prospect_denver_air_charter_001",
    organizationId: orgId,
    campaignKey: "part135-charter-apa-2026",
    content: "Initial outreach via LinkedIn to Ops Director Bill Harmon. Denver Air Charter operates 2 King Air C90s out of APA. Their current MRO (Jet Aviation DEN) has been inconsistent on turnaround times. Bill was receptive — agreed to an introductory call next week.",
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 21 * DAY,
  });

  await ctx.db.insert("prospectNotes", {
    prospectEntityId: "prospect_denver_air_charter_001",
    organizationId: orgId,
    campaignKey: "part135-charter-apa-2026",
    content: "Follow-up call with Bill Harmon completed. Discussed CAMG capabilities, King Air specialization, and APA location advantage. He's interested in getting a quote for their next scheduled annual. Asked for our Part 145 certificate and capabilities list — sent via email same day.",
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 14 * DAY,
  });

  // Prospect: Summit Mountain Flying — flying club with Cirrus fleet
  await ctx.db.insert("prospectNotes", {
    prospectEntityId: "prospect_summit_mountain_flying_001",
    organizationId: orgId,
    campaignKey: "ga-fleet-fnl-2026",
    content: "Met club president Diana Weston at the Oshkosh Airventure 2025. Summit operates 3 Cirrus SR22s out of FNL. Their current A&P is a one-man shop about to retire. Looking for a certified shop with capacity for their fleet. Gave her our FNL contact card — Sarah Nakamura to follow up.",
    createdByUserId: clerkUserId,
    createdByName: "James Harwick",
    createdAt: now - 90 * DAY,
  });

  await ctx.db.insert("prospectNotes", {
    prospectEntityId: "prospect_summit_mountain_flying_001",
    organizationId: orgId,
    campaignKey: "ga-fleet-fnl-2026",
    content: "Sarah followed up with Diana Weston by phone. Summit Mountain Flying is ready to move their Cirrus fleet to a new shop after their A&P retires in April. Cirrus SR22 is within our single-engine capability. Sending quote for all three annuals as a fleet package — competitive pricing to win the relationship.",
    createdByUserId: clerkUserId,
    createdByName: "Sarah Nakamura",
    createdAt: now - 30 * DAY,
  });
}
