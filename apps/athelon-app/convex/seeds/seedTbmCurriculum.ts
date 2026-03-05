// convex/seeds/seedTbmCurriculum.ts
// Athelon — TBM OJT Curriculum Seed Data (Avex Excel)
//
// Seeds the FULL TBM OJT training jacket curriculum with all 10 sections,
// 9 specialization sub-sections, and every task from the Avex Excel data.
//
// Run via: npx convex run seeds/seedTbmCurriculum:seedTbmCurriculum
//
// Curriculum: TBM OJT Curriculum v2.1 (repetition_5col sign-off model)
// Sections: Authorizations, Class Record, Initial, Inspection, Basic,
//           Intermediate, Advanced, Specializations (9 sub-sections),
//           Aircraft Towing / Run Taxi, OJT Resources / ATA Index

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const seedTbmCurriculum = internalMutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const orgId = args.organizationId;

    // ─────────────────────────────────────────────────────
    // CURRICULUM
    // ─────────────────────────────────────────────────────
    const curriculumId = await ctx.db.insert("ojtCurricula", {
      organizationId: orgId,
      aircraftType: "TBM",
      name: "TBM OJT Curriculum",
      signOffModel: "repetition_5col",
      version: "2.1",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // SECTIONS (10 top-level)
    // ─────────────────────────────────────────────────────
    const authorizationsSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Authorizations",
      sectionType: "authorization",
      displayOrder: 1,
      createdAt: now,
      updatedAt: now,
    });

    const classRecordSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Class Record / In-doc Record",
      sectionType: "reference",
      displayOrder: 2,
      createdAt: now,
      updatedAt: now,
    });

    const initialSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Initial Training",
      sectionType: "standard",
      displayOrder: 3,
      createdAt: now,
      updatedAt: now,
    });

    const inspectionSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Inspection Training",
      sectionType: "standard",
      displayOrder: 4,
      createdAt: now,
      updatedAt: now,
    });

    const basicSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Basic Tasks",
      sectionType: "standard",
      displayOrder: 5,
      createdAt: now,
      updatedAt: now,
    });

    const intermediateSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Intermediate Tasks",
      sectionType: "standard",
      displayOrder: 6,
      createdAt: now,
      updatedAt: now,
    });

    const advancedSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Advanced Tasks",
      sectionType: "standard",
      displayOrder: 7,
      createdAt: now,
      updatedAt: now,
    });

    const specializationsSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Specializations",
      sectionType: "standard",
      displayOrder: 8,
      createdAt: now,
      updatedAt: now,
    });

    const towingRunTaxiSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Aircraft Towing / Run Taxi",
      sectionType: "procedural",
      displayOrder: 9,
      createdAt: now,
      updatedAt: now,
    });

    const resourcesSectionId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "OJT Resources / ATA Index",
      sectionType: "reference",
      displayOrder: 10,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // SUB-SECTIONS under Specializations (9 sub-sections)
    // ─────────────────────────────────────────────────────
    const specInspectionSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Inspection",
      sectionType: "standard",
      displayOrder: 1,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specAcPressurizationSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Air Conditioning / Pressurization",
      sectionType: "standard",
      displayOrder: 2,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specEngineSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Engine",
      sectionType: "standard",
      displayOrder: 3,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specSheetMetalSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Sheet Metal",
      sectionType: "standard",
      displayOrder: 4,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specPaintingSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Painting",
      sectionType: "standard",
      displayOrder: 5,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specBootRepairSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Pneumatic Boot Repair / De-ice",
      sectionType: "standard",
      displayOrder: 6,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specFleetIssuesSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Common TBM Fleet Issues",
      sectionType: "standard",
      displayOrder: 7,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specTestFlightSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Test Flight Observer",
      sectionType: "standard",
      displayOrder: 8,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    const specElectricalSubId = await ctx.db.insert("ojtCurriculumSections", {
      organizationId: orgId,
      curriculumId,
      name: "Electrical Repair",
      sectionType: "standard",
      displayOrder: 9,
      parentSectionId: specializationsSectionId,
      createdAt: now,
      updatedAt: now,
    });

    // ─────────────────────────────────────────────────────
    // HELPER — batch insert tasks
    // ─────────────────────────────────────────────────────
    type TaskDef = { description: string; ataChapter: string };

    async function insertTasks(
      sectionId: typeof authorizationsSectionId,
      tasks: Array<TaskDef>,
      proficiencyTier: "initial" | "basic" | "intermediate" | "advanced" | "specialization" | undefined,
      requiredSignOffs: number,
    ) {
      for (let i = 0; i < tasks.length; i++) {
        await ctx.db.insert("ojtTasks", {
          organizationId: orgId,
          curriculumId,
          sectionId,
          ataChapter: tasks[i].description ? tasks[i].ataChapter : "GEN",
          description: tasks[i].description,
          isSharedAcrossTypes: false,
          displayOrder: i + 1,
          proficiencyTier,
          requiredSignOffs,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // ─────────────────────────────────────────────────────
    // AUTHORIZATION TASKS (12 items — binary, requiredSignOffs: 1)
    // ─────────────────────────────────────────────────────
    await insertTasks(authorizationsSectionId, [
      { description: "Aircraft Towing", ataChapter: "GEN" },
      { description: "Aircraft Towing in controlled area", ataChapter: "GEN" },
      { description: "Aircraft Engine Run", ataChapter: "GEN" },
      { description: "Aircraft Taxi", ataChapter: "GEN" },
      { description: "Prop Vibe balance", ataChapter: "GEN" },
      { description: "Use of Advanced borescope", ataChapter: "GEN" },
      { description: "Hot Section Inspection", ataChapter: "GEN" },
      { description: "Signature authorization", ataChapter: "GEN" },
      { description: "Inspector", ataChapter: "GEN" },
      { description: "Parts Receiving Inspection", ataChapter: "GEN" },
      { description: "Hazmat Shipping", ataChapter: "GEN" },
      { description: "Class record", ataChapter: "GEN" },
    ], undefined, 1);

    // ─────────────────────────────────────────────────────
    // INITIAL TRAINING TASKS (22 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(initialSectionId, [
      { description: "Access jack points / jack aircraft up for service", ataChapter: "7" },
      { description: "Jack Aircraft", ataChapter: "7" },
      { description: "Complete aircraft servicing lube tip to tail", ataChapter: "12" },
      { description: "Lubrication Exterior", ataChapter: "12" },
      { description: "Lubrication Interior", ataChapter: "12" },
      { description: "Lubrication Engine", ataChapter: "12" },
      { description: "Engine Cleaning", ataChapter: "12" },
      { description: "Tire Servicing", ataChapter: "12" },
      { description: "Oxygen Servicing", ataChapter: "12" },
      { description: "Learn different interiors, carefully remove/reinstall all types of interior, carpets seats, walls, label all connectors, switches, lights", ataChapter: "25" },
      { description: "Removal of interior", ataChapter: "25" },
      { description: "Installation of Interior", ataChapter: "25" },
      { description: "Flap roller lubrication", ataChapter: "27" },
      { description: "Inspect operation of all aircraft lights Interior and exterior Incandescent and LED", ataChapter: "33" },
      { description: "Oil sample / patch test", ataChapter: "79" },
      { description: "Open and close aircraft for inspection", ataChapter: "GEN" },
      { description: "Demonstrate capable of cleaning up after the job is complete, keep tool room haz-mat areas clean, keep shop and hangar equipment organized", ataChapter: "GEN" },
      { description: "Demonstrate ability to follow directions readily", ataChapter: "GEN" },
      { description: "Good attendance", ataChapter: "GEN" },
      { description: "Follow directions readily", ataChapter: "GEN" },
      { description: "Find correct maintenance manual references for tasks assigned", ataChapter: "GEN" },
      { description: "Demonstrate proper use of hand tools", ataChapter: "GEN" },
    ], "initial", 5);

    // ─────────────────────────────────────────────────────
    // INSPECTION TRAINING TASKS (6 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(inspectionSectionId, [
      { description: "AREA 100", ataChapter: "INSP" },
      { description: "Area 200", ataChapter: "INSP" },
      { description: "Sub area 210/211", ataChapter: "INSP" },
      { description: "Area 300", ataChapter: "INSP" },
      { description: "Area 500/600", ataChapter: "INSP" },
      { description: "Area 700", ataChapter: "INSP" },
    ], "initial", 5);

    // ─────────────────────────────────────────────────────
    // BASIC TASKS (24 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(basicSectionId, [
      { description: "Polishing of cockpit side windows and windshields", ataChapter: "12" },
      { description: "Clean safety/outflow valves", ataChapter: "21" },
      { description: "Inspection of Deice Boots (inflated)", ataChapter: "21" },
      { description: "Test of Static Dischargers, New and old style (composite structure vs aluminum) and Removal and replacement", ataChapter: "23" },
      { description: "Fuel tank servicing strainers, flappers, repair leaks", ataChapter: "28" },
      { description: "Wing Structural inspection, removal of all aircraft fuel panels", ataChapter: "28" },
      { description: "Fuel And Defuel aircraft", ataChapter: "28" },
      { description: "Inspection / replacement of the airframe fuel filter", ataChapter: "28" },
      { description: "Water Separator filter Replacement", ataChapter: "30" },
      { description: "Inspect and replace tires", ataChapter: "32" },
      { description: "Clean and repack bearing with new grease", ataChapter: "32" },
      { description: "Inspect and replace brakes (700-930) and new (940)", ataChapter: "32" },
      { description: "1yr landing gear INSP", ataChapter: "32" },
      { description: "Balance nose tire", ataChapter: "32" },
      { description: "O2, bottle removal and installation", ataChapter: "35" },
      { description: "Tap test of composite surfaces (wings)", ataChapter: "51" },
      { description: "Inspection / service of the engine oil filter Per P&W manual", ataChapter: "72" },
      { description: "Inspection / check of the P3 filter per P&WC manual", ataChapter: "72" },
      { description: "Inspection / replacement of engine fuel outlet filter per P&WC manual", ataChapter: "72" },
      { description: "Removal and installation of new and old style inertial separator", ataChapter: "72" },
      { description: "R&R of Engine Igniter", ataChapter: "74" },
      { description: "Inspection and test of chip detector indication systems", ataChapter: "77" },
      { description: "Clean aircraft areas like 311, under floor in cabin, engine compartment", ataChapter: "GEN" },
      { description: "Able to set GPU to correct amperage for different aircraft", ataChapter: "GEN" },
    ], "basic", 5);

    // ─────────────────────────────────────────────────────
    // INTERMEDIATE TASKS (24 tasks — same descriptions as Basic, tier: intermediate)
    // ─────────────────────────────────────────────────────
    await insertTasks(intermediateSectionId, [
      { description: "Polishing of cockpit side windows and windshields", ataChapter: "12" },
      { description: "Clean safety/outflow valves", ataChapter: "21" },
      { description: "Inspection of Deice Boots (inflated)", ataChapter: "21" },
      { description: "Test of Static Dischargers, New and old style (composite structure vs aluminum) and Removal and replacement", ataChapter: "23" },
      { description: "Fuel tank servicing strainers, flappers, repair leaks", ataChapter: "28" },
      { description: "Wing Structural inspection, removal of all aircraft fuel panels", ataChapter: "28" },
      { description: "Fuel And Defuel aircraft", ataChapter: "28" },
      { description: "Inspection / replacement of the airframe fuel filter", ataChapter: "28" },
      { description: "Water Separator filter Replacement", ataChapter: "30" },
      { description: "Inspect and replace tires", ataChapter: "32" },
      { description: "Clean and repack bearing with new grease", ataChapter: "32" },
      { description: "Inspect and replace brakes (700-930) and new (940)", ataChapter: "32" },
      { description: "1 year landing gear inspection", ataChapter: "32" },
      { description: "Balance nose tire", ataChapter: "32" },
      { description: "O2, bottle removal and installation", ataChapter: "35" },
      { description: "Tap test of composite surfaces (wings)", ataChapter: "51" },
      { description: "Inspection / service of the engine oil filter Per P&W manual", ataChapter: "72" },
      { description: "Inspection / check of the P3 filter per P&WC manual", ataChapter: "72" },
      { description: "Inspection / replacement of engine fuel outlet filter per P&WC manual", ataChapter: "72" },
      { description: "Removal and installation of new and old style inertial separator", ataChapter: "72" },
      { description: "R&R of Engine Igniter", ataChapter: "74" },
      { description: "Inspection and test of chip detector indication systems", ataChapter: "77" },
      { description: "Clean aircraft areas like 311, under floor in cabin, engine compartment", ataChapter: "GEN" },
      { description: "Able to set GPU to correct amperage for different aircraft", ataChapter: "GEN" },
    ], "intermediate", 5);

    // ─────────────────────────────────────────────────────
    // ADVANCED TASKS (36 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(advancedSectionId, [
      { description: "Weight and balance of aircraft", ataChapter: "8" },
      { description: "Troubleshoot ECS system and components use computer software for post G1000 Gas controller system faults", ataChapter: "21" },
      { description: "Troubleshoot autopilot porpoise fault", ataChapter: "22" },
      { description: "Sound Proofing upgrade", ataChapter: "25" },
      { description: "Fuel calibration check and adjustment pre and post G1000 systems", ataChapter: "28" },
      { description: "Brake pad replacement on plates", ataChapter: "28" },
      { description: "Rigging of the landing gear and leak check of the actuators", ataChapter: "32" },
      { description: "Long life inspection of the landing gear", ataChapter: "32" },
      { description: "10yr landing gear INSP", ataChapter: "32" },
      { description: "T/S and rigging of the MLG actuators (emphasis on safety)", ataChapter: "32" },
      { description: "Emergency landing gear valve removal and replacement", ataChapter: "32" },
      { description: "Reinstalling Static ports", ataChapter: "34" },
      { description: "Rig passenger door and pilot door", ataChapter: "52" },
      { description: "Perform rigging on air stair door", ataChapter: "52" },
      { description: "Replacement of pilot and main door seal", ataChapter: "52" },
      { description: "Replacement of pilot door bracket", ataChapter: "52" },
      { description: "Servicing of the stabilizers R&R bolts A.D. inspection", ataChapter: "55" },
      { description: "Assist in removal and installation of horizontal stabilizer", ataChapter: "55" },
      { description: "Assist in removal and installation of Vertical stabilizer", ataChapter: "55" },
      { description: "Removal and replacement of windshield and side windows", ataChapter: "56" },
      { description: "Assist in removal and installation of wings", ataChapter: "57" },
      { description: "Replacement and rigging of propeller governors", ataChapter: "61" },
      { description: "Composite propeller repair", ataChapter: "61" },
      { description: "First stage compressor blade blending Partial and full", ataChapter: "72" },
      { description: "Replacement of O-rings, Garlock seals, gaskets around engine for leak repair", ataChapter: "72" },
      { description: "Remove and Replace Garlock seals on engine", ataChapter: "72" },
      { description: "Fuel nozzle removal and replacement", ataChapter: "73" },
      { description: "Perform dead weight test for torque indication", ataChapter: "77" },
      { description: "Calibration check of the ITT indication system with Barfield 1000", ataChapter: "77" },
      { description: "Check calibration of the fuel PSI indication system and boost pump on checks", ataChapter: "77" },
      { description: "Scavenge tube leak fix", ataChapter: "79" },
      { description: "Oil sight glass leak fix", ataChapter: "79" },
      { description: "Remove and replace o-rings on oil transfer and scavenge tubes", ataChapter: "79" },
      { description: "Complete training for silver award (40 Hrs)", ataChapter: "Shop" },
      { description: "Able to prioritize tasks and complete W.O.'s", ataChapter: "Shop" },
      { description: "Help Train junior mechanics", ataChapter: "Shop" },
    ], "advanced", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Inspection (4 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specInspectionSubId, [
      { description: "Perform borescope and Olympus training", ataChapter: "GEN" },
      { description: "Perform Dye Penetrant Inspection", ataChapter: "20" },
      { description: "Use of optical micrometer on windshields to determine damage airworthiness", ataChapter: "56" },
      { description: "Dye penetrant inspection", ataChapter: "20" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Air Conditioning / Pressurization (9 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specAcPressurizationSubId, [
      { description: "Replacement of Air conditioning High pressure and low pressure lines", ataChapter: "21" },
      { description: "Cockpit and cabin evaporator replacement", ataChapter: "21" },
      { description: "Replacement of air conditioning compressor", ataChapter: "21" },
      { description: "Servicing of R-12 air conditioning system", ataChapter: "12" },
      { description: "Servicing of R-134 air conditioning system", ataChapter: "12" },
      { description: "Servicing of Secan air conditioning system", ataChapter: "12" },
      { description: "Can Identify all types of air conditioning systems (Keith, Secan, etc.)", ataChapter: "21" },
      { description: "Use Liebherr Gas controller software to diagnose A/C system faults", ataChapter: "21" },
      { description: "Use Liebherr Gas controller software to diagnose pressurization system faults", ataChapter: "21" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Engine (10 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specEngineSubId, [
      { description: "FCU full rigging (static rig, high and low idle rig, reverse rig, Fwd rig checks)", ataChapter: "73" },
      { description: "Replacement of the fuel flow transducer / set new k factor for indication", ataChapter: "77" },
      { description: "Perform hot section Inspection", ataChapter: "72" },
      { description: "Engine removal and installation", ataChapter: "72" },
      { description: "Borescope Inspection of First stage Compressor", ataChapter: "72" },
      { description: "Borescope Inspection of Hot Section", ataChapter: "72" },
      { description: "Borescope Inspection of Power Turbine", ataChapter: "72" },
      { description: "Borescope Inspection of No. 3 Bearing drain", ataChapter: "72" },
      { description: "Removal and Replacement of T5 probe", ataChapter: "72" },
      { description: "Removal and replacement of oil pressure transducer", ataChapter: "72" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Sheet Metal (8 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specSheetMetalSubId, [
      { description: "Sheet metal projects — General and advance repairs, rivet selection, edge distance, bend radius, rivet bucking technique", ataChapter: "20" },
      { description: "Upgrade of the inertial separator to new style (sheet metal) and rig", ataChapter: "20" },
      { description: "Antenna Doubler", ataChapter: "51" },
      { description: "Skin doubler / Patch", ataChapter: "51" },
      { description: "Home safe Sheetmetal upgrades", ataChapter: "51" },
      { description: "C2 Frame Mod", ataChapter: "53" },
      { description: "C10 Frame Mod", ataChapter: "53" },
      { description: "Replace fuel panel structure (landing component)", ataChapter: "28" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Painting (7 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specPaintingSubId, [
      { description: "Standard shop practices for painting and paint booth use", ataChapter: "51" },
      { description: "Use of airbrush and upholstery touch up", ataChapter: "51" },
      { description: "Propeller painting", ataChapter: "51" },
      { description: "Nose gear Painting", ataChapter: "51" },
      { description: "Use of paint matching equipment", ataChapter: "51" },
      { description: "Color matching and spot paint repair on aircraft exterior", ataChapter: "51" },
      { description: "Flight Control Painting", ataChapter: "51" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Pneumatic Boot Repair / De-ice (4 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specBootRepairSubId, [
      { description: "Pneumatic boot repair", ataChapter: "31" },
      { description: "Removal and stripping of de-ice boots", ataChapter: "31" },
      { description: "Installation of new deicers", ataChapter: "31" },
      { description: "Installation and operational check of deice boots on aircraft", ataChapter: "31" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Common TBM Fleet Issues (3 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specFleetIssuesSubId, [
      { description: "T/S of the fuel selector valve and Auto Select System", ataChapter: "28" },
      { description: "Main door and baggage door seal leak fix", ataChapter: "52" },
      { description: "Test Flight Observer", ataChapter: "GEN" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Test Flight Observer (3 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specTestFlightSubId, [
      { description: "Familiar with test flight checklists", ataChapter: "GEN" },
      { description: "Able to perform post test flight MX", ataChapter: "GEN" },
      { description: "Test flight observer duties", ataChapter: "GEN" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // SPECIALIZATION: Electrical Repair (7 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(specElectricalSubId, [
      { description: "Properly use multimeter and understand its functions", ataChapter: "24" },
      { description: "Properly Solder connections and wires", ataChapter: "24" },
      { description: "Properly Splice wires", ataChapter: "24" },
      { description: "Read and understand wiring diagrams", ataChapter: "24" },
      { description: "Use a Megger as a troubleshooting tool and understand its dangers", ataChapter: "24" },
      { description: "Complete ESD (electro static discharge) awareness training", ataChapter: "24" },
      { description: "Perform basic circuit troubleshooting", ataChapter: "24" },
    ], "specialization", 5);

    // ─────────────────────────────────────────────────────
    // AIRCRAFT TOWING / RUN TAXI — Procedural tasks (20 tasks)
    // ─────────────────────────────────────────────────────
    await insertTasks(towingRunTaxiSectionId, [
      { description: "Aircraft Towing", ataChapter: "GEN" },
      { description: "Run Taxi", ataChapter: "GEN" },
      { description: "PRE-RUN INSPECTION", ataChapter: "GEN" },
      { description: "ENG. PRE-START PROCEDURES", ataChapter: "GEN" },
      { description: "ENG. START - GPU", ataChapter: "GEN" },
      { description: "ENG. START - BATT", ataChapter: "GEN" },
      { description: "ELEC PWR-UP - GENERATORS", ataChapter: "GEN" },
      { description: "ELEC. PWR-UP - LIGHTS", ataChapter: "GEN" },
      { description: "ELEC. PWR-UP - AVIONICS", ataChapter: "GEN" },
      { description: "ELEC. PWR-UP - ENVIR SYS.", ataChapter: "GEN" },
      { description: "ENG. SHUT DOWN", ataChapter: "GEN" },
      { description: "ABORT ENG. START", ataChapter: "GEN" },
      { description: "EMER PROC. - FIRE", ataChapter: "GEN" },
      { description: "EMER PROC. - SMOKE", ataChapter: "GEN" },
      { description: "EMER PROC. - ELEC. FAIL", ataChapter: "GEN" },
      { description: "RADIO PROCEDURES", ataChapter: "GEN" },
      { description: "TAXI ACFT.", ataChapter: "GEN" },
      { description: "EMER PROC. - BRAKE FAIL", ataChapter: "GEN" },
      { description: "EMER PROC. - STEERING FAIL", ataChapter: "GEN" },
      { description: "EMER PROC. - RADIO FAIL", ataChapter: "GEN" },
    ], undefined, 5);

    // ─────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────
    return {
      curriculumId,
      sections: {
        authorizations: authorizationsSectionId,
        classRecord: classRecordSectionId,
        initialTraining: initialSectionId,
        inspectionTraining: inspectionSectionId,
        basicTasks: basicSectionId,
        intermediateTasks: intermediateSectionId,
        advancedTasks: advancedSectionId,
        specializations: specializationsSectionId,
        towingRunTaxi: towingRunTaxiSectionId,
        resources: resourcesSectionId,
      },
      subSections: {
        inspection: specInspectionSubId,
        acPressurization: specAcPressurizationSubId,
        engine: specEngineSubId,
        sheetMetal: specSheetMetalSubId,
        painting: specPaintingSubId,
        bootRepair: specBootRepairSubId,
        fleetIssues: specFleetIssuesSubId,
        testFlight: specTestFlightSubId,
        electrical: specElectricalSubId,
      },
      taskCounts: {
        authorizations: 12,
        initialTraining: 22,
        inspectionTraining: 6,
        basicTasks: 24,
        intermediateTasks: 24,
        advancedTasks: 36,
        specInspection: 4,
        specAcPressurization: 9,
        specEngine: 10,
        specSheetMetal: 8,
        specPainting: 7,
        specBootRepair: 4,
        specFleetIssues: 3,
        specTestFlight: 3,
        specElectrical: 7,
        towingRunTaxi: 20,
        total: 199,
      },
    };
  },
});
