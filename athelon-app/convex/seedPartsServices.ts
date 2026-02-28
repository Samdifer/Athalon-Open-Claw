// convex/seedPartsServices.ts
// Parts & Services stress test for Ground Aerospace
// Seeds: 50 parts, 8 vendors, 10 rotables, 5 loaners, 12 tools, 5 POs, 3 shipments
// Run: npx convex run seedPartsServices:seed '{"orgId":"<orgId>"}'

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── AVIATION PARTS CATALOG ──
const PARTS = [
  // Consumables & hardware
  { pn: "3060640-1", name: "Fuel Filter Element", desc: "PT6A fuel filter, OEM Pratt & Whitney", serialized: false, condition: "new" as const, qty: 12, price: 45, minStock: 5, reorder: 8, supplier: "Aviall" },
  { pn: "MS20470AD4-5", name: "Rivet, Universal Head 1/8x5/16", desc: "Aluminum alloy rivet", serialized: false, condition: "new" as const, qty: 500, price: 0.12, minStock: 200, reorder: 300, supplier: "Aircraft Spruce" },
  { pn: "5011T69-3", name: "O-Ring, Fuel Nozzle", desc: "Viton O-ring for PT6A fuel nozzle", serialized: false, condition: "new" as const, qty: 24, price: 8.50, minStock: 10, reorder: 15, supplier: "Aviall" },
  { pn: "AN960-416", name: "Washer, Flat 1/4", desc: "Cadmium plated steel washer", serialized: false, condition: "new" as const, qty: 200, price: 0.35, minStock: 50, reorder: 100, supplier: "Aircraft Spruce" },
  { pn: "MS21044N4", name: "Nut, Self-Locking 1/4-28", desc: "Steel self-locking nut", serialized: false, condition: "new" as const, qty: 300, price: 0.45, minStock: 100, reorder: 150, supplier: "Aircraft Spruce" },
  { pn: "AN6-20A", name: "Bolt, Machine 3/8x2", desc: "Steel hex head bolt, cadmium plated", serialized: false, condition: "new" as const, qty: 150, price: 1.20, minStock: 50, reorder: 75, supplier: "Aircraft Spruce" },
  { pn: "P-300-10", name: "Hydraulic Fluid MIL-PRF-5606", desc: "Quart container, MIL-PRF-5606H", serialized: false, condition: "new" as const, qty: 20, price: 28, minStock: 8, reorder: 12, supplier: "Aviall" },
  { pn: "1159SCH1020", name: "Oil Filter, Engine", desc: "Champion oil filter for PT6A series", serialized: false, condition: "new" as const, qty: 18, price: 32, minStock: 8, reorder: 12, supplier: "Aviall" },

  // Serialized components — in inventory
  { pn: "S6135-3", name: "Igniter Plug, PT6A", desc: "Champion igniter plug", serialized: true, sn: "IGN-44219", condition: "new" as const, qty: 1, price: 285, supplier: "Aviall" },
  { pn: "S6135-3", name: "Igniter Plug, PT6A", desc: "Champion igniter plug", serialized: true, sn: "IGN-44220", condition: "new" as const, qty: 1, price: 285, supplier: "Aviall" },
  { pn: "S6135-3", name: "Igniter Plug, PT6A", desc: "Champion igniter plug", serialized: true, sn: "IGN-44221", condition: "new" as const, qty: 1, price: 285, supplier: "Aviall" },
  { pn: "3155106-4", name: "Generator Brush Set", desc: "DC generator brush set, King Air", serialized: true, sn: "GBS-7804", condition: "new" as const, qty: 1, price: 165, supplier: "Heico" },
  { pn: "3155106-4", name: "Generator Brush Set", desc: "DC generator brush set, King Air", serialized: true, sn: "GBS-7805", condition: "new" as const, qty: 1, price: 165, supplier: "Heico" },
  { pn: "101-389000-403", name: "Brake Disc Assembly", desc: "Cleveland brake disc, King Air main gear", serialized: true, sn: "BD-11842", condition: "new" as const, qty: 1, price: 1250, supplier: "Parker Aerospace" },
  { pn: "101-389000-403", name: "Brake Disc Assembly", desc: "Cleveland brake disc, King Air main gear", serialized: true, sn: "BD-11843", condition: "new" as const, qty: 1, price: 1250, supplier: "Parker Aerospace" },
  { pn: "AV-534-A", name: "Avionics Cooling Fan", desc: "Collins avionics cooling fan assembly", serialized: true, sn: "ACF-2291", condition: "new" as const, qty: 1, price: 420, supplier: "Collins Aerospace" },
  { pn: "2584080-1", name: "Landing Light Assembly", desc: "Whelen LED landing light, King Air", serialized: true, sn: "LL-9947", condition: "new" as const, qty: 1, price: 890, supplier: "Whelen Engineering" },
  { pn: "3G6260V02G14", name: "Windshield Assy, King Air", desc: "LH windshield, heated, King Air 200/B200", serialized: true, sn: "WS-4418", condition: "new" as const, qty: 1, price: 4200, supplier: "PPG Aerospace" },

  // Life-limited parts
  { pn: "HC-B4TN-5GL/F8468A", name: "Propeller Blade", desc: "Hartzell 4-blade prop blade, King Air B200", serialized: true, sn: "HCB-22419", condition: "overhauled" as const, qty: 1, price: 8500, supplier: "Hartzell", lifeLimit: 6000 },
  { pn: "3037448-1", name: "Fuel Control Unit", desc: "PT6A-42 FCU, Pratt & Whitney", serialized: true, sn: "FCU-88712", condition: "overhauled" as const, qty: 1, price: 18500, supplier: "StandardAero", lifeLimit: 4000 },

  // Pending inspection parts (just received, not yet inspected)
  { pn: "MS29513-013", name: "O-Ring, Oleo Strut", desc: "Nitrile O-ring for landing gear oleo", serialized: false, condition: "new" as const, qty: 6, price: 12, supplier: "Parker Aerospace", pendingInspection: true },
  { pn: "101-910012-5", name: "Brake Lining Set", desc: "Cleveland brake lining kit, King Air", serialized: true, sn: "BL-5521", condition: "new" as const, qty: 1, price: 380, supplier: "Parker Aerospace", pendingInspection: true },
  { pn: "90-389012-5", name: "Fuel Selector Valve Modified", desc: "AD kit K-4015 fuel selector valve, C90", serialized: true, sn: "FSV-0142", condition: "new" as const, qty: 1, price: 2200, supplier: "Textron Aviation", pendingInspection: true },

  // Quarantined parts (suspected unserviceable)
  { pn: "101-389015-7", name: "Exhaust Stack Assy RH", desc: "RH exhaust collector, cracked at weld", serialized: true, sn: "EX-4421", condition: "unserviceable" as const, qty: 1, price: 0, supplier: "", quarantine: true, quarantineReason: "Cracked at collector weld — found during Phase 4 inspection N842GA. Non-repairable per SB B200-78-4012." },
  { pn: "NAS6404-24", name: "Engine Mount Bolt", desc: "Elongated 0.003in over nominal — replaced", serialized: true, sn: "M-7742", condition: "unserviceable" as const, qty: 1, price: 0, supplier: "", quarantine: true, quarantineReason: "Elongation exceeds 0.002in limit per SB B350-71-3028. Found during N350FL engine change." },

  // Removed parts awaiting disposition
  { pn: "90-389012-3", name: "Fuel Selector Valve (Old)", desc: "Pre-mod fuel selector valve removed per AD 2026-03-15", serialized: true, sn: "FV-2289", condition: "removed" as const, qty: 1, price: 0, supplier: "" },

  // Shelf-life limited
  { pn: "MIL-S-8802-C6", name: "Sealant, Fuel Tank", desc: "2-part polysulfide fuel tank sealant, 6-month shelf life", serialized: false, condition: "new" as const, qty: 4, price: 89, supplier: "PPG Aerospace", shelfLife: true },
  { pn: "EA934NA-KIT", name: "Epoxy Adhesive Kit", desc: "Hysol structural adhesive, 12-month shelf life", serialized: false, condition: "new" as const, qty: 2, price: 145, supplier: "Henkel", shelfLife: true },

  // Low stock / below reorder point
  { pn: "AN525-10R8", name: "Screw, Washer Head #10", desc: "Stainless steel washer head screw", serialized: false, condition: "new" as const, qty: 3, price: 0.85, minStock: 25, reorder: 50, supplier: "Aircraft Spruce" },
  { pn: "NAS1149FN416P", name: "Washer, Flat Stainless 1/4", desc: "Stainless steel flat washer", serialized: false, condition: "new" as const, qty: 8, price: 0.22, minStock: 50, reorder: 100, supplier: "Aircraft Spruce" },
];

// ── VENDORS ──
const VENDORS = [
  { name: "Aviall (Boeing Distribution)", type: "parts_supplier" as const, contact: "Jen Martinez", email: "orders@aviall.com", phone: "800-284-2551", address: "2750 Regent Blvd, DFW Airport TX 75261", cert: "ISO 9001:2015", approved: true },
  { name: "StandardAero", type: "contract_maintenance" as const, contact: "Mike Chen", email: "mx@standardaero.com", phone: "480-377-4100", address: "7337 W Detroit St, Chandler AZ 85226", cert: "RSMC G4XR789K", approved: true },
  { name: "Parker Aerospace", type: "parts_supplier" as const, contact: "Lisa Dubois", email: "aero.parts@parker.com", phone: "949-809-8000", address: "18321 Jamboree Rd, Irvine CA 92612", cert: "ISO/AS9100D", approved: true },
  { name: "Collins Aerospace", type: "parts_supplier" as const, contact: "David Park", email: "spares@collins.com", phone: "319-295-1000", address: "400 Collins Rd NE, Cedar Rapids IA 52498", cert: "AS9100D Rev D", approved: true },
  { name: "Precision Calibration Labs", type: "calibration_lab" as const, contact: "Sarah Wong", email: "cal@precisioncal.com", phone: "303-555-0188", address: "1250 S Abilene St, Aurora CO 80012", cert: "ISO/IEC 17025:2017 Accredited", approved: true },
  { name: "Hartzell Propeller", type: "parts_supplier" as const, contact: "Tom Keyes", email: "service@hartzellprop.com", phone: "937-778-4200", address: "1 Propeller Place, Piqua OH 45356", cert: "FAA-PMA", approved: true },
  { name: "Heico Aerospace", type: "parts_supplier" as const, contact: "Ana Reyes", email: "orders@heico.com", phone: "305-374-1585", address: "3000 Taft St, Hollywood FL 33021", cert: "FAA-PMA / EASA-PAA", approved: true },
  { name: "Denver Aero Tech (Unapproved)", type: "parts_supplier" as const, contact: "Rick Grimes", email: "sales@denveraerotech.com", phone: "303-555-0199", address: "4100 Chambers Rd, Denver CO 80239", cert: "", approved: false },
];

// ── ROTABLE COMPONENTS ──
const ROTABLES = [
  { pn: "PT6A-42", sn: "PCE-RB0418", desc: "PT6A-42 Engine (removed from N350FL)", status: "at_vendor" as const, cond: "unserviceable" as const, tsnH: 4200, tsnC: 3800, tboH: 5000, purchasePrice: 485000, coreValue: 125000, ohVendor: "StandardAero", ohDate: -365, warrantyDays: 730 },
  { pn: "PT6A-42", sn: "PCE-RB0442", desc: "PT6A-42 Engine (loaner, installed on N350FL)", status: "installed" as const, cond: "overhauled" as const, tsnH: 200, tsnC: 180, tboH: 5000, purchasePrice: 485000, coreValue: 125000, ohVendor: "StandardAero", ohDate: -90, warrantyDays: 730, aircraftIdx: 2 },
  { pn: "HC-B4TN-5GL", sn: "HUB-44182", desc: "Hartzell 4-blade propeller hub, LH", status: "serviceable" as const, cond: "overhauled" as const, tsnH: 200, tsnC: 180, tboH: 6000, purchasePrice: 42000, coreValue: 15000, ohVendor: "Hartzell", ohDate: -180, warrantyDays: 365 },
  { pn: "HC-B4TN-5GL", sn: "HUB-44183", desc: "Hartzell 4-blade propeller hub, RH", status: "serviceable" as const, cond: "overhauled" as const, tsnH: 200, tsnC: 180, tboH: 6000, purchasePrice: 42000, coreValue: 15000, ohVendor: "Hartzell", ohDate: -180, warrantyDays: 365 },
  { pn: "3037448-1", sn: "FCU-71104", desc: "PT6A-42 Fuel Control Unit", status: "in_shop" as const, cond: "unserviceable" as const, tsnH: 3800, tsnC: 3400, tboH: 4000, purchasePrice: 38000, coreValue: 12000, ohVendor: "" },
  { pn: "4-163-1", sn: "STRTR-8892", desc: "Starter-Generator, PT6A", status: "serviceable" as const, cond: "overhauled" as const, tsnH: 50, tsnC: 45, tboH: 6000, purchasePrice: 18500, coreValue: 6000, ohVendor: "StandardAero", ohDate: -60, warrantyDays: 365 },
  { pn: "69B20021-3", sn: "IDG-4417", desc: "Integrated Drive Generator", status: "serviceable" as const, cond: "inspected" as const, tsnH: 3200, tsnC: 2900, tboH: 8000, purchasePrice: 22000, coreValue: 8000, ohVendor: "" },
  { pn: "65C29545-17", sn: "ACM-1142", desc: "Air Cycle Machine", status: "at_vendor" as const, cond: "unserviceable" as const, tsnH: 5800, tsnC: 5200, tboH: 6000, purchasePrice: 16000, coreValue: 5000, ohVendor: "Parker Aerospace" },
  { pn: "810604-3", sn: "FP-9918", desc: "Engine-Driven Fuel Pump", status: "serviceable" as const, cond: "overhauled" as const, tsnH: 100, tsnC: 90, tboH: 4000, purchasePrice: 4800, coreValue: 1500, ohVendor: "StandardAero", ohDate: -30, warrantyDays: 365 },
  { pn: "23503", sn: "ALT-6614", desc: "Encoding Altimeter", status: "serviceable" as const, cond: "overhauled" as const, tsnH: 150, tsnC: 130, tboH: 0, purchasePrice: 3200, coreValue: 800, ohVendor: "Collins Aerospace", ohDate: -45, warrantyDays: 180 },
];

// ── LOANER ITEMS ──
const LOANERS = [
  { pn: "PT6A-42", sn: "PCE-RB0442", desc: "Loaner Engine — PT6A-42", rate: 250, status: "loaned_out" as const, customerIdx: 2 },
  { pn: "4-163-1", sn: "STRTR-LOANR-1", desc: "Loaner Starter-Generator", rate: 75, status: "available" as const },
  { pn: "69B20021-3", sn: "IDG-LOANR-1", desc: "Loaner IDG Unit", rate: 150, status: "available" as const },
  { pn: "810604-3", sn: "FP-LOANR-1", desc: "Loaner Engine Fuel Pump", rate: 45, status: "available" as const },
  { pn: "3037448-1", sn: "FCU-LOANR-1", desc: "Loaner Fuel Control Unit", rate: 200, status: "maintenance" as const },
];

// ── TEST EQUIPMENT / TOOLS ──
const TOOLS = [
  { num: "GA-TE-001", name: "Fluke 87V Multimeter", cat: "test_equipment" as const, sn: "FLK-441289", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -120, status: "available" as const },
  { num: "GA-TE-002", name: "Barfield TT1000A Pitot-Static Tester", cat: "test_equipment" as const, sn: "BAR-78412", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -300, status: "available" as const },
  { num: "GA-TE-003", name: "Barfield 2312G Transponder Tester", cat: "test_equipment" as const, sn: "BAR-55219", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -340, status: "calibration_due" as const },
  { num: "GA-TE-004", name: "Olympus IPLEX NX Borescope", cat: "test_equipment" as const, sn: "OLY-14592", calReq: false, calInterval: 0, status: "in_use" as const },
  { num: "GA-TW-001", name: "Snap-on ATECH3FR250 Torque Wrench 1/2", cat: "special_tooling" as const, sn: "SN-TW-44812", calReq: true, calInterval: 180, calProvider: "Precision Calibration Labs", calDate: -150, status: "available" as const },
  { num: "GA-TW-002", name: "CDI 2503MFRMH Torque Wrench 3/8", cat: "special_tooling" as const, sn: "CDI-88104", calReq: true, calInterval: 180, calProvider: "Precision Calibration Labs", calDate: -170, status: "available" as const },
  { num: "GA-ST-001", name: "King Air Wing Jack Set P/N 50-8103", cat: "special_tooling" as const, sn: "WJ-001", calReq: false, status: "available" as const },
  { num: "GA-ST-002", name: "Engine Hoist P/N 3103900-1", cat: "special_tooling" as const, sn: "EH-001", calReq: false, status: "available" as const },
  { num: "GA-ST-003", name: "Prop Balance Analyzer DSA-202", cat: "test_equipment" as const, sn: "DSA-22871", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -200, status: "available" as const },
  { num: "GA-HT-001", name: "Compression Tester, Differential", cat: "hand_tool" as const, sn: "CT-4412", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -60, status: "available" as const },
  { num: "GA-TE-005", name: "Insulation Resistance Tester Megger MIT415", cat: "test_equipment" as const, sn: "MEG-19442", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -10, status: "out_for_calibration" as const },
  { num: "GA-FUEL-001", name: "Fuel System Test Stand", cat: "special_tooling" as const, sn: "FST-001", calReq: true, calInterval: 365, calProvider: "Precision Calibration Labs", calDate: -100, status: "available" as const },
];

export const seed = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 86400000;
    const orgId = args.orgId;

    // Get existing data for linking
    const aircraft = await ctx.db.query("aircraft")
      .filter(q => q.eq(q.field("operatingOrganizationId"), orgId))
      .collect();
    const customers = await ctx.db.query("customers")
      .filter(q => q.eq(q.field("organizationId"), orgId))
      .collect();
    const technicians = await ctx.db.query("technicians")
      .filter(q => q.eq(q.field("organizationId"), orgId))
      .collect();
    const workOrders = await ctx.db.query("workOrders")
      .filter(q => q.eq(q.field("organizationId"), orgId))
      .collect();

    const domTech = technicians.find(t => t.role === "admin");
    const qcmTech = technicians.find(t => t.role === "qcm_inspector");
    const partsTech = technicians.find(t => t.role === "parts_clerk");

    // ── 1. VENDORS ──
    const vendorIds: string[] = [];
    for (const v2 of VENDORS) {
      const id = await ctx.db.insert("vendors", {
        orgId: orgId,
        name: v2.name,
        type: v2.type,
        contactName: v2.contact,
        contactEmail: v2.email,
        contactPhone: v2.phone,
        address: v2.address,
        certNumber: v2.cert || undefined,
        certExpiry: v2.cert ? now + 365 * DAY : undefined,
        isApproved: v2.approved,
        approvedBy: v2.approved && domTech ? domTech._id : undefined,
        approvedAt: v2.approved ? now - 180 * DAY : undefined,
        createdAt: now,
        updatedAt: now,
      });
      vendorIds.push(id);
    }

    // ── 2. PARTS INVENTORY ──
    const partIds: string[] = [];
    for (const p of PARTS) {
      const isSerialized = p.serialized ?? false;
      const qty = isSerialized ? 1 : (p.qty ?? 1);

      if (isSerialized) {
        const id = await ctx.db.insert("parts", {
          organizationId: orgId,
          partNumber: p.pn,
          partName: p.name,
          description: p.desc,
          serialNumber: (p as any).sn,
          isSerialized: true,
          isLifeLimited: !!(p as any).lifeLimit,
          lifeLimitHours: (p as any).lifeLimit,
          hasShelfLifeLimit: false,
          isOwnerSupplied: false,
          condition: (p.condition === "removed" ? "unserviceable" : p.condition) as "new" | "serviceable" | "overhauled" | "repaired" | "unserviceable" | "quarantine" | "scrapped",
          location: (p as any).quarantine ? "quarantine" : (p as any).pendingInspection ? "pending_inspection" : p.condition === "removed" ? "removed_pending_disposition" : "inventory",
          supplier: p.supplier || undefined,
          receivingDate: now - 30 * DAY,
          quarantineReason: (p as any).quarantineReason,
          quarantineCreatedById: (p as any).quarantine && qcmTech ? qcmTech._id : undefined,
          quarantineCreatedAt: (p as any).quarantine ? now : undefined,
          minStockLevel: undefined,
          reorderPoint: undefined,
          notes: (p as any).quarantineReason || undefined,
          createdAt: now,
          updatedAt: now,
        });
        partIds.push(id);
      } else {
        // Non-serialized: create one record representing stock
        const id = await ctx.db.insert("parts", {
          organizationId: orgId,
          partNumber: p.pn,
          partName: p.name,
          description: p.desc,
          isSerialized: false,
          isLifeLimited: false,
          hasShelfLifeLimit: !!(p as any).shelfLife,
          shelfLifeLimitDate: (p as any).shelfLife ? now + 180 * DAY : undefined,
          isOwnerSupplied: false,
          condition: (p.condition === "removed" ? "unserviceable" : p.condition) as "new" | "serviceable" | "overhauled" | "repaired" | "unserviceable" | "quarantine" | "scrapped",
          location: (p as any).pendingInspection ? "pending_inspection" : "inventory",
          supplier: p.supplier || undefined,
          receivingDate: now - 60 * DAY,
          minStockLevel: (p as any).minStock,
          reorderPoint: (p as any).reorder,
          notes: qty <= ((p as any).minStock ?? 0) ? `LOW STOCK: ${qty} on hand, min ${(p as any).minStock}` : undefined,
          createdAt: now,
          updatedAt: now,
        });
        partIds.push(id);
      }
    }

    // ── 3. ROTABLE COMPONENTS ──
    const rotableIds: string[] = [];
    for (const r of ROTABLES) {
      const id = await ctx.db.insert("rotables", {
        organizationId: orgId,
        partNumber: r.pn,
        serialNumber: r.sn,
        description: r.desc,
        status: r.status,
        condition: r.cond,
        aircraftId: (r as any).aircraftIdx !== undefined ? aircraft[(r as any).aircraftIdx]?._id : undefined,
        tsnHours: r.tsnH,
        tsnCycles: r.tsnC,
        tboHours: r.tboH || undefined,
        purchasePrice: r.purchasePrice,
        currentValue: r.purchasePrice * 0.6,
        coreValue: r.coreValue,
        lastOverhaulVendor: r.ohVendor || undefined,
        lastOverhaulDate: r.ohDate ? now + r.ohDate * DAY : undefined,
        warrantyExpiry: (r as any).warrantyDays ? now + (r as any).warrantyDays * DAY : undefined,
        createdAt: now,
        updatedAt: now,
      });
      rotableIds.push(id);
    }

    // ── 4. LOANER ITEMS ──
    const loanerIds: string[] = [];
    for (const l of LOANERS) {
      const id = await ctx.db.insert("loanerItems", {
        organizationId: orgId,
        partNumber: l.pn,
        serialNumber: l.sn,
        description: l.desc,
        status: l.status,
        dailyRate: l.rate,
        loanedToCustomerId: l.status === "loaned_out" && (l as any).customerIdx !== undefined ? customers[(l as any).customerIdx]?._id : undefined,
        loanedToWorkOrderId: l.status === "loaned_out" ? workOrders[2]?._id : undefined,
        loanedDate: l.status === "loaned_out" ? now - DAY : undefined,
        expectedReturnDate: l.status === "loaned_out" ? now + 14 * DAY : undefined,
        conditionOut: l.status === "loaned_out" ? "Serviceable, overhauled — 200 TSN" : undefined,
        createdAt: now,
        updatedAt: now,
      });
      loanerIds.push(id);
    }

    // ── 5. TOOLS / TEST EQUIPMENT ──
    const toolIds: string[] = [];
    for (const t of TOOLS) {
      const calDate = t.calDate ? now + t.calDate * DAY : undefined;
      const nextCalDue = calDate && t.calInterval ? calDate + t.calInterval * DAY : undefined;
      const id = await ctx.db.insert("toolRecords", {
        organizationId: orgId,
        toolNumber: t.num,
        description: t.name,
        serialNumber: t.sn,
        category: t.cat,
        status: t.status,
        calibrationRequired: t.calReq,
        lastCalibrationDate: calDate,
        nextCalibrationDue: nextCalDue,
        calibrationIntervalDays: t.calInterval || undefined,
        calibrationProvider: t.calProvider || undefined,
        assignedToTechnicianId: t.status === "in_use" && technicians[3] ? technicians[3]._id : undefined,
        createdAt: now,
      });
      toolIds.push(id);
    }

    // ── 6. PURCHASE ORDERS ──
    const aviallVendor = vendorIds[0]; // Aviall
    const standardAeroVendor = vendorIds[1]; // StandardAero
    const parkerVendor = vendorIds[2]; // Parker
    const collinsVendor = vendorIds[3]; // Collins

    // PO-001: Routine consumables from Aviall
    await ctx.db.insert("purchaseOrders", {
      orgId: orgId,
      poNumber: "PO-GA-2026-001",
      vendorId: aviallVendor as any,
      workOrderId: workOrders[0]?._id,
      status: "SUBMITTED",
      requestedByTechId: partsTech?._id ?? technicians[0]._id,
      subtotal: 1240,
      tax: 86.80,
      total: 1326.80,
      notes: "Routine consumables restock — fuel filters, oil filters, O-rings",
      createdAt: now - 5 * DAY,
      updatedAt: now - 5 * DAY,
    });

    // PO-002: AOG engine parts from StandardAero
    await ctx.db.insert("purchaseOrders", {
      orgId: orgId,
      poNumber: "PO-GA-2026-002",
      vendorId: standardAeroVendor as any,
      workOrderId: workOrders[2]?._id,
      status: "PARTIAL",
      requestedByTechId: domTech?._id ?? technicians[0]._id,
      subtotal: 485000,
      tax: 0,
      total: 485000,
      notes: "AOG — PT6A-42 engine overhaul for N350FL. Core return required.",
      createdAt: now - DAY,
      updatedAt: now,
    });

    // PO-003: AD compliance kit from Textron
    await ctx.db.insert("purchaseOrders", {
      orgId: orgId,
      poNumber: "PO-GA-2026-003",
      vendorId: aviallVendor as any,
      workOrderId: workOrders[5]?._id,
      status: "RECEIVED",
      requestedByTechId: partsTech?._id ?? technicians[0]._id,
      subtotal: 2200,
      tax: 154,
      total: 2354,
      notes: "AD 2026-03-15 fuel selector valve mod kit K-4015",
      createdAt: now - 7 * DAY,
      updatedAt: now - 2 * DAY,
    });

    // PO-004: Prop overhaul from Hartzell
    const hartzellVendor = vendorIds[5];
    await ctx.db.insert("purchaseOrders", {
      orgId: orgId,
      poNumber: "PO-GA-2026-004",
      vendorId: hartzellVendor as any,
      workOrderId: workOrders[6]?._id,
      status: "SUBMITTED",
      requestedByTechId: domTech?._id ?? technicians[0]._id,
      subtotal: 34000,
      tax: 0,
      total: 34000,
      notes: "HC-B4 prop overhaul x2 + governor rebuild — N42CH Cheyenne",
      createdAt: now - 6 * DAY,
      updatedAt: now - 6 * DAY,
    });

    // PO-005: Windshield from PPG (pending approval — over $5K threshold)
    await ctx.db.insert("purchaseOrders", {
      orgId: orgId,
      poNumber: "PO-GA-2026-005",
      vendorId: collinsVendor as any,
      status: "DRAFT",
      requestedByTechId: partsTech?._id ?? technicians[0]._id,
      subtotal: 4200,
      tax: 294,
      total: 4494,
      notes: "LH windshield replacement for N912KB — pilot reported delamination",
      createdAt: now - 2 * DAY,
      updatedAt: now - 2 * DAY,
    });

    // ── 7. SHIPMENTS ──
    // Inbound: AD kit from Textron (delivered)
    await ctx.db.insert("shipments", {
      organizationId: orgId,
      shipmentNumber: "SHP-GA-IN-001",
      type: "inbound",
      status: "delivered",
      carrier: "FedEx Priority Overnight",
      trackingNumber: "7749 2841 0012",
      shippedDate: now - 4 * DAY,
      estimatedDelivery: now - 3 * DAY,
      actualDelivery: now - 3 * DAY,
      originName: "Textron Aviation Parts Depot",
      originAddress: "9709 E Central, Wichita KS 67206",
      destinationName: "Ground Aerospace",
      destinationAddress: "12500 E 39th Ave, Denver CO 80239",
      workOrderId: workOrders[5]?._id,
      shippingCost: 145,
      weight: 8.5,
      specialInstructions: "AD compliance kit — time sensitive",
      createdAt: now - 5 * DAY,
      updatedAt: now - 3 * DAY,
    });

    // Outbound: Core engine return to StandardAero
    await ctx.db.insert("shipments", {
      organizationId: orgId,
      shipmentNumber: "SHP-GA-OUT-001",
      type: "outbound",
      status: "in_transit",
      carrier: "Pilot Freight Services",
      trackingNumber: "PFS-884412-DEN",
      shippedDate: now - DAY,
      estimatedDelivery: now + 2 * DAY,
      originName: "Ground Aerospace",
      originAddress: "12500 E 39th Ave, Denver CO 80239",
      destinationName: "StandardAero Dallas",
      destinationAddress: "7337 W Detroit St, Chandler AZ 85226",
      workOrderId: workOrders[2]?._id,
      vendorId: standardAeroVendor as any,
      shippingCost: 2800,
      insuranceValue: 485000,
      weight: 380,
      hazmat: false,
      specialInstructions: "ENGINE CORE — handle with care. Pallet mount bolts hand-tight only. Include all QEC accessories.",
      bolNumber: "BOL-GA-2026-001",
      createdAt: now - DAY,
      updatedAt: now - DAY,
    });

    // Inbound: Consumables from Aviall (pending)
    await ctx.db.insert("shipments", {
      organizationId: orgId,
      shipmentNumber: "SHP-GA-IN-002",
      type: "inbound",
      status: "pending",
      carrier: "UPS Ground",
      estimatedDelivery: now + 3 * DAY,
      originName: "Aviall DFW Distribution",
      originAddress: "2750 Regent Blvd, DFW Airport TX 75261",
      destinationName: "Ground Aerospace",
      destinationAddress: "12500 E 39th Ave, Denver CO 80239",
      workOrderId: workOrders[0]?._id,
      purchaseOrderId: undefined, // TODO: link to PO-001 after insert
      shippingCost: 35,
      notes: "Routine consumables restock — fuel filters, O-rings, oil filters",
      createdAt: now - 2 * DAY,
      updatedAt: now - 2 * DAY,
    });

    return {
      seeded: {
        parts: partIds.length,
        vendors: vendorIds.length,
        rotables: rotableIds.length,
        loaners: loanerIds.length,
        tools: toolIds.length,
        purchaseOrders: 5,
        shipments: 3,
      },
      orgId,
    };
  },
});

// ── Query helpers for simulation ──
export const listSeededParts = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("parts")
      .filter(q => q.eq(q.field("organizationId"), args.orgId))
      .collect();
  },
});

export const listSeededVendors = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("vendors")
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .collect();
  },
});

export const listSeededRotables = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("rotables")
      .filter(q => q.eq(q.field("organizationId"), args.orgId))
      .collect();
  },
});

export const listSeededLoaners = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("loanerItems")
      .filter(q => q.eq(q.field("organizationId"), args.orgId))
      .collect();
  },
});

export const listSeededTools = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("toolRecords")
      .filter(q => q.eq(q.field("organizationId"), args.orgId))
      .collect();
  },
});
