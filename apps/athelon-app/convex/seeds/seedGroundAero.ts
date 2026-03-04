// convex/seedGroundAero.ts
// Ground Aerospace — Part 145 Repair Station Stress Test
// 10 aircraft in work simultaneously, full MRO workflow simulation
// Run: npx convex run seedGroundAero:seed --args '{"clerkUserId":"user_test"}'

import { mutation } from "../_generated/server";
import { v } from "convex/values";

const AIRCRAFT = [
  { make: "Beechcraft", model: "King Air B200", serial: "BB-1842", tail: "N842GA", tt: 8200, owner: "Meridian Charter Group" },
  { make: "Cessna", model: "Citation CJ3+", serial: "525B-0621", tail: "N621CJ", tt: 3100, owner: "SkyBridge Executive Aviation" },
  { make: "Beechcraft", model: "King Air 350", serial: "FL-0485", tail: "N350FL", tt: 12400, owner: "Front Range Air Ambulance" },
  { make: "Pilatus", model: "PC-12/47E", serial: "1847", tail: "N47PC", tt: 4200, owner: "Alpine Cargo Express" },
  { make: "Cessna", model: "Caravan 208B", serial: "208B-2156", tail: "N208CE", tt: 9800, owner: "Alpine Cargo Express" },
  { make: "Beechcraft", model: "King Air C90GTx", serial: "LJ-2089", tail: "N90GT", tt: 5600, owner: "Rocky Mountain Medevac" },
  { make: "Piper", model: "Cheyenne IIXL", serial: "31T-8166042", tail: "N42CH", tt: 14200, owner: "Pueblo Aviation Services" },
  { make: "de Havilland", model: "DHC-6 Twin Otter", serial: "836", tail: "N836DH", tt: 18500, owner: "High Country Skydive" },
  { make: "Beechcraft", model: "King Air 200", serial: "BB-0912", tail: "N912KB", tt: 16100, owner: "Meridian Charter Group" },
  { make: "Cessna", model: "Citation M2", serial: "525-1045", tail: "N45M2", tt: 1800, owner: "SkyBridge Executive Aviation" },
];

const CUSTOMERS = [
  { name: "Meridian Charter Group", email: "ops@meridianchartergroup.com", phone: "303-555-0142", address: "7800 S Peoria St, Centennial CO 80112" },
  { name: "SkyBridge Executive Aviation", email: "mx@skybridgeaviation.com", phone: "719-555-0188", address: "1050 Aviation Way, Colorado Springs CO 80916" },
  { name: "Front Range Air Ambulance", email: "dispatch@frontrangeems.com", phone: "303-555-0199", address: "925 Airport Blvd, Broomfield CO 80021" },
  { name: "Alpine Cargo Express", email: "fleet@alpinecargo.com", phone: "970-555-0167", address: "4400 Airport Rd, Rifle CO 81650" },
  { name: "Rocky Mountain Medevac", email: "maint@rmmv.org", phone: "303-555-0211", address: "500 Airport Way, Erie CO 80516" },
  { name: "Pueblo Aviation Services", email: "hangar@puebloaviation.com", phone: "719-555-0244", address: "31201 Bryan Circle, Pueblo CO 81001" },
  { name: "High Country Skydive", email: "ops@highcountryskydive.com", phone: "719-555-0277", address: "18800 Maher Rd, Calhan CO 80808" },
];

const TECHNICIANS = [
  { name: "Marcus Webb", role: "admin" as const, certs: ["A&P", "IA"], employeeId: "GA-001" },
  { name: "Jake Pullman", role: "lead_technician" as const, certs: ["A&P", "IA"], employeeId: "GA-002" },
  { name: "Rosa Eaton", role: "qcm_inspector" as const, certs: ["A&P", "IA"], employeeId: "GA-003" },
  { name: "Derek Haines", role: "technician" as const, certs: ["A&P"], employeeId: "GA-004" },
  { name: "Tomás Reyes", role: "technician" as const, certs: ["A&P"], employeeId: "GA-005" },
  { name: "Sarah Lin", role: "technician" as const, certs: ["A&P"], employeeId: "GA-006" },
  { name: "Brian Kowalski", role: "technician" as const, certs: ["A&P"], employeeId: "GA-007" },
  { name: "Priya Nair", role: "technician" as const, certs: ["A&P", "IA"], employeeId: "GA-008" },
  { name: "Carlos Mendoza", role: "parts_clerk" as const, certs: [], employeeId: "GA-009" },
  { name: "Alicia Torres", role: "billing_manager" as const, certs: [], employeeId: "GA-010" },
  { name: "Danny Osei", role: "lead_technician" as const, certs: ["A&P", "IA"], employeeId: "GA-011" },
  { name: "Kim Nguyen", role: "technician" as const, certs: ["A&P"], employeeId: "GA-012" },
];

const WORK_ORDER_SCENARIOS = [
  { acIdx: 0, type: "Phase 4 Inspection", priority: "routine" as const, status: "in_progress" as const, description: "Phase 4 (400hr) inspection — King Air B200. Includes hot section trend monitoring, landing gear service.", daysAgo: 8, promisedInDays: 6 },
  { acIdx: 1, type: "Annual Inspection", priority: "routine" as const, status: "in_progress" as const, description: "Annual/100hr inspection — CJ3+. Collins Pro Line 21 software update included.", daysAgo: 3, promisedInDays: 10 },
  { acIdx: 2, type: "Engine Change", priority: "aog" as const, status: "in_progress" as const, description: "AOG — Left engine (#1) PT6A-42 hot section limit. Engine change with loaner core.", daysAgo: 1, promisedInDays: 5 },
  { acIdx: 3, type: "300hr Inspection", priority: "routine" as const, status: "in_progress" as const, description: "300hr inspection + Garmin G600 TXi upgrade. Customer also requests new interior panels.", daysAgo: 5, promisedInDays: 8 },
  { acIdx: 4, type: "Heavy Maintenance", priority: "routine" as const, status: "open" as const, description: "Caravan 5000hr heavy check. Includes float removal, wing spar inspection, corrosion treatment.", daysAgo: 0, promisedInDays: 21 },
  { acIdx: 5, type: "AD Compliance", priority: "urgent" as const, status: "in_progress" as const, description: "AD 2026-03-15 compliance — fuel system modification. Also addressing SB-C90-5012 propeller.", daysAgo: 4, promisedInDays: 3 },
  { acIdx: 6, type: "Prop Overhaul", priority: "routine" as const, status: "in_progress" as const, description: "Hartzell HC-B4 prop overhaul + governor rebuild. Right engine TBO approaching — quote for overhaul.", daysAgo: 6, promisedInDays: 12 },
  { acIdx: 7, type: "Structural Repair", priority: "routine" as const, status: "open" as const, description: "Belly skin repair (hard landing damage), cargo door hinge replacement, annual inspection due.", daysAgo: 0, promisedInDays: 18 },
  { acIdx: 8, type: "Phase 2 Inspection", priority: "routine" as const, status: "in_progress" as const, description: "Phase 2 inspection. Multiple squawks from last phase — deferred items need resolution.", daysAgo: 7, promisedInDays: 5 },
  { acIdx: 9, type: "Avionics Install", priority: "routine" as const, status: "draft" as const, description: "Garmin G3000 NXi upgrade + ADS-B Out + TCAS II install. Customer requesting quote.", daysAgo: 2, promisedInDays: 0 },
];

const PARTS_INVENTORY = [
  { pn: "3060640-1", desc: "Fuel Filter Element", qty: 12, price: 45.00, minQty: 5 },
  { pn: "MS20470AD4-5", desc: "Rivet, Universal Head", qty: 500, price: 0.12, minQty: 200 },
  { pn: "5011T69-3", desc: "O-Ring, Fuel Nozzle", qty: 24, price: 8.50, minQty: 10 },
  { pn: "AN960-416", desc: "Washer, Flat", qty: 200, price: 0.35, minQty: 50 },
  { pn: "101-389000-403", desc: "Brake Disc Assembly", qty: 4, price: 1250.00, minQty: 2 },
  { pn: "S6135-3", desc: "Igniter Plug, PT6A", qty: 8, price: 285.00, minQty: 4 },
  { pn: "3155106-4", desc: "Generator Brush Set", qty: 6, price: 165.00, minQty: 3 },
  { pn: "MS21044N4", desc: "Nut, Self-Locking", qty: 300, price: 0.45, minQty: 100 },
  { pn: "1159SCH1020", desc: "Oil Filter, Engine", qty: 18, price: 32.00, minQty: 8 },
  { pn: "HC-B4TN-5GL", desc: "Propeller Blade, OH", qty: 0, price: 8500.00, minQty: 0 },
  { pn: "3G6260V02G14", desc: "Windshield Assy, King Air", qty: 1, price: 4200.00, minQty: 1 },
  { pn: "AN6-20A", desc: "Bolt, Machine", qty: 150, price: 1.20, minQty: 50 },
  { pn: "AV-534-A", desc: "Avionics Cooling Fan", qty: 3, price: 420.00, minQty: 2 },
  { pn: "P-300-10", desc: "Hydraulic Fluid, MIL-PRF-5606", qty: 20, price: 28.00, minQty: 8 },
  { pn: "2584080-1", desc: "Landing Light Assembly", qty: 2, price: 890.00, minQty: 1 },
];

export const seed = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 86400000;

    // 1. Organization
    const orgId = await ctx.db.insert("organizations", {
      name: "Ground Aerospace",
      part145CertificateNumber: "G4XR456K",
      part145Ratings: ["Class A Airframe", "Class A Powerplant", "Class C Avionics", "Class D Propeller"],
      address: "12500 E 39th Ave, Denver CO 80239",
      city: "Denver",
      state: "CO",
      zip: "80239",
      country: "US",
      phone: "303-555-0100",
      email: "ops@groundaerospace.com",
      subscriptionTier: "professional",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Customers
    const customerIds: Record<string, string> = {};
    for (const c of CUSTOMERS) {
      const id = await ctx.db.insert("customers", {
        organizationId: orgId,
        name: c.name,
        customerType: "company",
        email: c.email,
        phone: c.phone,
        address: c.address,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      customerIds[c.name] = id;
    }

    // 3. Aircraft
    const aircraftIds: string[] = [];
    for (const ac of AIRCRAFT) {
      const id = await ctx.db.insert("aircraft", {
        operatingOrganizationId: orgId,
        make: ac.make,
        model: ac.model,
        serialNumber: ac.serial,
        currentRegistration: ac.tail,
        totalTimeAirframeHours: ac.tt,
        totalTimeAirframeAsOfDate: now,
        engineCount: ac.model.includes("Twin") || ac.model.includes("King") || ac.model.includes("Cheyenne") || ac.model.includes("Citation") ? 2 : 1,
        yearOfManufacture: 2018,
        maxGrossWeightLbs: 12500,
        experimental: false,
        aircraftCategory: "normal",
        status: "in_maintenance",
        createdAt: now,
        updatedAt: now,
      });
      aircraftIds.push(id);
    }

    // 4. Technicians
    const techIds: string[] = [];
    for (const t of TECHNICIANS) {
      const id = await ctx.db.insert("technicians", {
        organizationId: orgId,
        userId: t.employeeId === "GA-001" ? args.clerkUserId : `clerk_${t.employeeId}`,
        legalName: t.name,
        role: t.role,
        employeeId: t.employeeId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      techIds.push(id);
    }

    // 5. Parts Inventory
    for (const p of PARTS_INVENTORY) {
      await ctx.db.insert("parts", {
        organizationId: orgId,
        partNumber: p.pn,
        partName: p.desc,
        description: p.desc,
        isSerialized: false,
        isLifeLimited: false,
        hasShelfLifeLimit: false,
        isOwnerSupplied: false,
        condition: "new",
        location: "inventory",
        minStockLevel: p.minQty,
        notes: `Unit price: $${p.price}`,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Hangar Bays
    const bayNames = ["Bay A (Main Hangar)", "Bay B (Main Hangar)", "Bay C (East Hangar)", "Bay D (East Hangar)", "Bay E (Paint/Sheet Metal)"];
    for (let i = 0; i < bayNames.length; i++) {
      await ctx.db.insert("hangarBays", {
        organizationId: orgId,
        name: bayNames[i],
        type: i < 4 ? "hangar" : "paint",
        status: i < 4 ? "occupied" : "available",
        capacity: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Work Orders
    const woIds: string[] = [];
    for (let i = 0; i < WORK_ORDER_SCENARIOS.length; i++) {
      const s = WORK_ORDER_SCENARIOS[i];
      const ac = AIRCRAFT[s.acIdx];
      const woNum = `GA-WO-${String(2026001 + i)}`;
      const id = await ctx.db.insert("workOrders", {
        organizationId: orgId,
        workOrderNumber: woNum,
        aircraftId: aircraftIds[s.acIdx] as any,
        customerId: customerIds[ac.owner] as any,
        status: s.status,
        priority: s.priority,
        workOrderType: "routine",
        description: s.description,
        openedAt: now - s.daysAgo * DAY,
        openedByUserId: args.clerkUserId,
        aircraftTotalTimeAtOpen: ac.tt,
        promisedDeliveryDate: s.promisedInDays > 0 ? now + s.promisedInDays * DAY : undefined,
        targetCompletionDate: s.promisedInDays > 0 ? now + s.promisedInDays * DAY : undefined,
        createdAt: now - s.daysAgo * DAY,
        updatedAt: now,
      });
      woIds.push(id);
    }

    // 8. Task Cards for in-progress WOs
    const taskCardData = [
      { woIdx: 0, tasks: ["Engine trend monitor check (L&R)", "Landing gear retract test", "Fuel system leak check", "Propeller blade inspection", "Cabin pressurization test", "Nav light replacement"] },
      { woIdx: 1, tasks: ["FJ44-3A borescope inspection (L&R)", "Wheel bearing repack", "Collins Pro Line 21 software update", "Pitot-static system check"] },
      { woIdx: 2, tasks: ["Remove #1 PT6A-42 engine", "Install loaner engine", "Engine mount inspection", "Engine run / power assurance check", "Taxi test / leak check"] },
      { woIdx: 3, tasks: ["300hr airframe inspection items", "Garmin G600 TXi removal", "G600 TXi install & config", "Interior panel replacement (4 ea)", "Functional check flight"] },
      { woIdx: 5, tasks: ["AD 2026-03-15 fuel system mod", "SB-C90-5012 propeller inspection", "Fuel tank reseal (inboard)", "Ground run / leak check"] },
      { woIdx: 6, tasks: ["Prop removal (L&R)", "Send props to overhaul facility", "Governor removal & bench test", "Prop install after OH", "Track & balance"] },
      { woIdx: 8, tasks: ["Phase 2 inspection items", "Deferred squawk — #2 eng oil leak", "Deferred squawk — flap actuator play", "Oxygen system service", "Exterior paint touch-up"] },
    ];

    for (const tc of taskCardData) {
      for (let j = 0; j < tc.tasks.length; j++) {
        const status = j === 0 ? "in_progress" as const : j < 2 ? "complete" as const : "not_started" as const;
        await ctx.db.insert("taskCards", {
          organizationId: orgId,
          workOrderId: woIds[tc.woIdx] as any,
          aircraftId: aircraftIds[WORK_ORDER_SCENARIOS[tc.woIdx].acIdx] as any,
          taskCardNumber: `TC-${tc.woIdx + 1}-${j + 1}`,
          title: tc.tasks[j],
          taskType: "inspection",
          approvedDataSource: "Manufacturer Maintenance Manual",
          status,
          estimatedHours: Math.floor(Math.random() * 6 + 2),
          assignedToTechnicianId: techIds[Math.floor((tc.woIdx + j) % 8)] as any,
          stepCount: 3,
          completedStepCount: status === "complete" ? 3 : status === "in_progress" ? 1 : 0,
          naStepCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 9. Discrepancies/Squawks
    const squawks = [
      { woIdx: 0, desc: "Corrosion found on RH wing spar cap — requires engineering assessment", severity: "major" as const },
      { woIdx: 0, desc: "LH engine oil pressure transducer intermittent", severity: "minor" as const },
      { woIdx: 1, desc: "Windshield delamination — LH pilot side, 3-inch area", severity: "minor" as const },
      { woIdx: 2, desc: "#1 engine mount bolt elongation found — mount requires replacement", severity: "critical" as const },
      { woIdx: 3, desc: "Fuel quantity indicator R tank inop intermittently", severity: "minor" as const },
      { woIdx: 5, desc: "Fuel cell bladder cracking found during AD compliance", severity: "major" as const },
      { woIdx: 6, desc: "Prop hub crack indication — NDI required", severity: "critical" as const },
      { woIdx: 8, desc: "#2 engine oil leak exceeding limits — rear case seal", severity: "major" as const },
      { woIdx: 8, desc: "Flap actuator rod end bearing worn beyond limits", severity: "major" as const },
    ];

    for (const sq of squawks) {
      const acIdx = WORK_ORDER_SCENARIOS[sq.woIdx].acIdx;
      await ctx.db.insert("discrepancies", {
        organizationId: orgId,
        workOrderId: woIds[sq.woIdx] as any,
        aircraftId: aircraftIds[acIdx] as any,
        discrepancyNumber: `SQ-${sq.woIdx + 1}-${squawks.indexOf(sq) + 1}`,
        description: sq.desc,
        severity: sq.severity,
        priority: sq.severity === "critical" ? "urgent" : "routine",
        status: "open",
        foundDuring: "routine_maintenance",
        foundByTechnicianId: techIds[0] as any,
        foundAt: now,
        foundAtAircraftHours: AIRCRAFT[acIdx].tt,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 10. Quotes (for the quoting WO and some squawk repairs)
    await ctx.db.insert("quotes", {
      orgId: orgId,
      quoteNumber: "GA-Q-2026001",
      customerId: customerIds["SkyBridge Executive Aviation"] as any,
      aircraftId: aircraftIds[9] as any,
      workOrderId: woIds[9] as any,
      status: "DRAFT",
      createdByTechId: techIds[0] as any,
      laborTotal: 15000,
      partsTotal: 182000,
      subtotal: 197000,
      tax: 0,
      total: 197000,
      createdAt: now,
      updatedAt: now,
    });

    return {
      orgId,
      customerCount: CUSTOMERS.length,
      aircraftCount: AIRCRAFT.length,
      technicianCount: TECHNICIANS.length,
      workOrderCount: WORK_ORDER_SCENARIOS.length,
      partsCount: PARTS_INVENTORY.length,
      message: "Ground Aerospace seeded — 10 aircraft, 7 customers, 12 technicians, 10 WOs, 15 parts, 5 bays, 9 squawks, 1 quote",
    };
  },
});
