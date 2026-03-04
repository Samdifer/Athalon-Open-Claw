import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ==========================================
// OJT CURRICULA
// ==========================================

export const listCurricula = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtCurricula")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getCurriculum = query({
  args: { id: v.id("ojtCurricula") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createCurriculum = mutation({
  args: {
    organizationId: v.string(),
    aircraftType: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdByTechnicianId: v.optional(v.id("technicians")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtCurricula", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCurriculum = mutation({
  args: {
    id: v.id("ojtCurricula"),
    name: v.optional(v.string()),
    aircraftType: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
  },
});

// ==========================================
// OJT CURRICULUM SECTIONS
// ==========================================

export const listSections = query({
  args: { curriculumId: v.id("ojtCurricula") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtCurriculumSections")
      .withIndex("by_curriculum", (q) => q.eq("curriculumId", args.curriculumId))
      .collect();
  },
});

export const createSection = mutation({
  args: {
    organizationId: v.string(),
    curriculumId: v.id("ojtCurricula"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtCurriculumSections", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSection = mutation({
  args: {
    id: v.id("ojtCurriculumSections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
  },
});

export const deleteSection = mutation({
  args: { id: v.id("ojtCurriculumSections") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==========================================
// OJT TASKS
// ==========================================

export const listTasks = query({
  args: { sectionId: v.id("ojtCurriculumSections") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtTasks")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
  },
});

export const listTasksByCurriculum = query({
  args: { curriculumId: v.id("ojtCurricula") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtTasks")
      .withIndex("by_curriculum", (q) => q.eq("curriculumId", args.curriculumId))
      .collect();
  },
});

export const createTask = mutation({
  args: {
    organizationId: v.string(),
    curriculumId: v.id("ojtCurricula"),
    sectionId: v.id("ojtCurriculumSections"),
    ataChapter: v.string(),
    description: v.string(),
    approvedDataRef: v.optional(v.string()),
    isSharedAcrossTypes: v.boolean(),
    estimatedMinutes: v.optional(v.number()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtTasks", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("ojtTasks"),
    description: v.optional(v.string()),
    ataChapter: v.optional(v.string()),
    approvedDataRef: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
  },
});

export const deleteTask = mutation({
  args: { id: v.id("ojtTasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==========================================
// OJT JACKETS
// ==========================================

export const listJacketsByTechnician = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtJackets")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .collect();
  },
});

export const listJacketsByCurriculum = query({
  args: { curriculumId: v.id("ojtCurricula") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtJackets")
      .withIndex("by_curriculum", (q) => q.eq("curriculumId", args.curriculumId))
      .collect();
  },
});

export const getJacket = query({
  args: { id: v.id("ojtJackets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getJacketByTechAndCurriculum = query({
  args: { technicianId: v.id("technicians"), curriculumId: v.id("ojtCurricula") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtJackets")
      .withIndex("by_tech_curriculum", (q) =>
        q.eq("technicianId", args.technicianId).eq("curriculumId", args.curriculumId)
      )
      .first();
  },
});

export const createJacket = mutation({
  args: {
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    curriculumId: v.id("ojtCurricula"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if jacket already exists
    const existing = await ctx.db
      .query("ojtJackets")
      .withIndex("by_tech_curriculum", (q) =>
        q.eq("technicianId", args.technicianId).eq("curriculumId", args.curriculumId)
      )
      .first();
    if (existing) throw new Error("Jacket already exists for this technician and curriculum");

    const now = Date.now();
    return await ctx.db.insert("ojtJackets", {
      ...args,
      status: "not_started",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateJacketStatus = mutation({
  args: {
    id: v.id("ojtJackets"),
    status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("fully_qualified"), v.literal("suspended")),
    suspendedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch: Record<string, unknown> = { status: args.status, updatedAt: now };
    if (args.status === "in_progress") patch.startedAt = now;
    if (args.status === "fully_qualified") patch.qualifiedAt = now;
    if (args.status === "suspended") {
      patch.suspendedAt = now;
      if (args.suspendedReason) patch.suspendedReason = args.suspendedReason;
    }
    await ctx.db.patch(args.id, patch);
  },
});

// ==========================================
// OJT STAGE EVENTS (append-only)
// ==========================================

export const listStageEvents = query({
  args: { jacketId: v.id("ojtJackets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtStageEvents")
      .withIndex("by_jacket", (q) => q.eq("jacketId", args.jacketId))
      .collect();
  },
});

export const listStageEventsByTask = query({
  args: { jacketId: v.id("ojtJackets"), taskId: v.id("ojtTasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtStageEvents")
      .withIndex("by_jacket_task", (q) =>
        q.eq("jacketId", args.jacketId).eq("taskId", args.taskId)
      )
      .collect();
  },
});

export const getTaskScore = query({
  args: { jacketId: v.id("ojtJackets"), taskId: v.id("ojtTasks") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("ojtStageEvents")
      .withIndex("by_jacket_task", (q) =>
        q.eq("jacketId", args.jacketId).eq("taskId", args.taskId)
      )
      .collect();

    const completedStages = new Set(
      events
        .filter((e) => e.trainerSignedAt)
        .map((e) => e.stage)
    );
    return {
      score: completedStages.size,
      maxScore: 4,
      completedStages: Array.from(completedStages),
      events,
    };
  },
});

export const recordStageEvent = mutation({
  args: {
    organizationId: v.string(),
    jacketId: v.id("ojtJackets"),
    taskId: v.id("ojtTasks"),
    technicianId: v.id("technicians"),
    stage: v.union(v.literal("observe"), v.literal("assist"), v.literal("supervised"), v.literal("evaluated")),
    trainerId: v.id("technicians"),
    trainerCertificateSnapshot: v.optional(v.string()),
    approvedDataRef: v.optional(v.string()),
    trainingMethod: v.optional(v.string()),
    actualMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate: trainer cannot be the same as technician
    if (args.trainerId === args.technicianId) {
      throw new Error("Trainer cannot sign off their own training (no self-certification)");
    }

    // Validate: stages must be sequential
    const stageOrder = { observe: 1, assist: 2, supervised: 3, evaluated: 4 };
    const existingEvents = await ctx.db
      .query("ojtStageEvents")
      .withIndex("by_jacket_task", (q) =>
        q.eq("jacketId", args.jacketId).eq("taskId", args.taskId)
      )
      .collect();

    const completedStages = new Set(
      existingEvents.filter((e) => e.trainerSignedAt).map((e) => e.stage)
    );
    const requiredPrior = stageOrder[args.stage] - 1;
    if (requiredPrior > 0) {
      const priorStages = Object.entries(stageOrder)
        .filter(([, order]) => order <= requiredPrior)
        .map(([stage]) => stage);
      for (const ps of priorStages) {
        if (!completedStages.has(ps as typeof args.stage)) {
          throw new Error(`Cannot record "${args.stage}" — prior stage "${ps}" not yet signed off`);
        }
      }
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("ojtStageEvents", {
      ...args,
      techSignedAt: now,
      trainerSignedAt: now,
      createdAt: now,
    });

    // Auto-update jacket status to in_progress if not_started
    const jacket = await ctx.db.get(args.jacketId);
    if (jacket && jacket.status === "not_started") {
      await ctx.db.patch(args.jacketId, { status: "in_progress", startedAt: now, updatedAt: now });
    }

    return eventId;
  },
});

export const chiefInspectorCountersign = mutation({
  args: {
    eventId: v.id("ojtStageEvents"),
    chiefInspectorId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Stage event not found");
    if (event.stage !== "evaluated") throw new Error("Chief inspector countersign only applies to evaluated stage");
    if (event.chiefInspectorSignedAt) throw new Error("Already countersigned");

    await ctx.db.patch(args.eventId, {
      chiefInspectorId: args.chiefInspectorId,
      chiefInspectorSignedAt: Date.now(),
    });
  },
});

// ==========================================
// OJT TRAINER AUTHORIZATIONS
// ==========================================

export const listTrainerAuthorizations = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtTrainerAuthorizations")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getTrainerAuthForTech = query({
  args: { organizationId: v.string(), technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtTrainerAuthorizations")
      .withIndex("by_org_tech", (q) =>
        q.eq("organizationId", args.organizationId).eq("technicianId", args.technicianId)
      )
      .collect();
  },
});

export const grantTrainerAuthorization = mutation({
  args: {
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    scope: v.union(v.literal("task"), v.literal("section"), v.literal("curriculum"), v.literal("all")),
    scopeRefId: v.optional(v.string()),
    grantedByTechnicianId: v.id("technicians"),
    expiresAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtTrainerAuthorizations", {
      ...args,
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const revokeTrainerAuthorization = mutation({
  args: {
    id: v.id("ojtTrainerAuthorizations"),
    revokedByTechnicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      revokedAt: now,
      revokedByTechnicianId: args.revokedByTechnicianId,
      updatedAt: now,
    });
  },
});

// ==========================================
// OJT TRAINING GOALS (OKR)
// ==========================================

export const listGoals = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtTrainingGoals")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .collect();
  },
});

export const createGoal = mutation({
  args: {
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    setByTechnicianId: v.id("technicians"),
    period: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("yearly")),
    periodStart: v.number(),
    periodEnd: v.number(),
    targetType: v.union(v.literal("stages_completed"), v.literal("tasks_completed"), v.literal("hours_trained")),
    targetValue: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtTrainingGoals", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateGoalProgress = mutation({
  args: {
    id: v.id("ojtTrainingGoals"),
    actualValue: v.number(),
    status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("missed"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { actualValue: args.actualValue, updatedAt: Date.now() };
    if (args.status) patch.status = args.status;
    await ctx.db.patch(args.id, patch);
  },
});

// ==========================================
// RADAR CHART DATA (computed query)
// ==========================================

export const getRadarData = query({
  args: { jacketId: v.id("ojtJackets") },
  handler: async (ctx, args) => {
    const jacket = await ctx.db.get(args.jacketId);
    if (!jacket) return null;

    const sections = await ctx.db
      .query("ojtCurriculumSections")
      .withIndex("by_curriculum", (q) => q.eq("curriculumId", jacket.curriculumId))
      .collect();

    const allEvents = await ctx.db
      .query("ojtStageEvents")
      .withIndex("by_jacket", (q) => q.eq("jacketId", args.jacketId))
      .collect();

    const allTasks = await ctx.db
      .query("ojtTasks")
      .withIndex("by_curriculum", (q) => q.eq("curriculumId", jacket.curriculumId))
      .collect();

    return sections.map((section) => {
      const sectionTasks = allTasks.filter((t) => t.sectionId === section._id);
      const totalPossible = sectionTasks.length * 4; // 4 stages per task

      const sectionEvents = allEvents.filter((e) =>
        sectionTasks.some((t) => t._id === e.taskId) && e.trainerSignedAt
      );

      // Count unique stage completions per task
      const taskStages = new Map<string, Set<string>>();
      for (const event of sectionEvents) {
        const key = event.taskId;
        if (!taskStages.has(key)) taskStages.set(key, new Set());
        taskStages.get(key)!.add(event.stage);
      }

      let totalScore = 0;
      for (const stages of taskStages.values()) {
        totalScore += stages.size;
      }

      return {
        section: section.name,
        sectionId: section._id,
        score: totalScore,
        maxScore: totalPossible,
        percentage: totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0,
        taskCount: sectionTasks.length,
        completedTasks: sectionTasks.filter((t) => {
          const stages = taskStages.get(t._id);
          return stages && stages.size === 4;
        }).length,
      };
    });
  },
});
