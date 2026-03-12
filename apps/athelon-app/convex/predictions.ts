import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { organizationId: v.id("organizations"), status: v.optional(v.string()), aircraftId: v.optional(v.id("aircraft")) },
  handler: async (ctx, args) => {
    let results;
    if (args.aircraftId) {
      const aid = args.aircraftId;
      results = await ctx.db.query("maintenancePredictions").withIndex("by_aircraft", (q) => q.eq("organizationId", args.organizationId).eq("aircraftId", aid)).collect();
    } else {
      results = await ctx.db.query("maintenancePredictions").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).collect();
    }
    if (args.status) results = results.filter((p) => p.status === args.status);
    return results.sort((a, b) => a.predictedDate - b.predictedDate);
  },
});

export const get = query({
  args: { id: v.id("maintenancePredictions") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    predictionType: v.union(v.literal("time_based"), v.literal("usage_based"), v.literal("trend_based"), v.literal("condition_based")),
    predictedDate: v.number(),
    confidence: v.number(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    description: v.string(),
    recommendation: v.optional(v.string()),
    basedOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("maintenancePredictions", { ...args, status: "active", createdAt: Date.now() });
  },
});

export const acknowledge = mutation({
  args: { id: v.id("maintenancePredictions"), acknowledgedBy: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "acknowledged", acknowledgedBy: args.acknowledgedBy, updatedAt: Date.now() });
  },
});

export const resolve = mutation({
  args: { id: v.id("maintenancePredictions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "resolved", resolvedDate: Date.now(), updatedAt: Date.now() });
  },
});

export const dismiss = mutation({
  args: { id: v.id("maintenancePredictions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "dismissed", updatedAt: Date.now() });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Multi-signal predictions engine (Optimization Phase 1 — A3)
//
// Replaces trivial heuristic with multi-signal projection:
//   1. Read actual TBO from engines.timeBetweenOverhaulLimit per engine
//   2. Compute utilization rate from adsbFlightSessions (if available) or
//      aircraft.averageDailyHours or totalTimeAirframeAsOfDate / days since last update
//   3. Project LLP remaining life from parts.lifeLimitHours/Cycles
//   4. Surface non-complied ADs approaching deadline
//   5. Confidence based on data source quality (ADS-B = high, manual = medium, default = low)
// ═══════════════════════════════════════════════════════════════════════════

const DAY_MS = 86_400_000;
const MONTH_MS = 30 * DAY_MS;

type DataQuality = "adsb" | "manual" | "default";

function computeConfidence(dataQuality: DataQuality, pctUsed: number): number {
  const baseConfidence = dataQuality === "adsb" ? 85 : dataQuality === "manual" ? 70 : 55;
  // Higher usage % = more confidence in the prediction
  return Math.min(98, Math.round(baseConfidence + pctUsed * 10));
}

function computeSeverity(pctUsed: number): "low" | "medium" | "high" | "critical" {
  if (pctUsed > 0.95) return "critical";
  if (pctUsed > 0.90) return "high";
  if (pctUsed > 0.80) return "medium";
  return "low";
}

export const generatePredictions = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const aircraft = await ctx.db.query("aircraft").withIndex("by_organization", (q) => q.eq("operatingOrganizationId", args.organizationId)).collect();
    let created = 0;

    for (const ac of aircraft) {
      // Determine utilization rate and data quality
      let hoursPerDay: number;
      let dataQuality: DataQuality;

      // Check for ADS-B flight session data (highest quality)
      const adsbSessions = await ctx.db
        .query("adsbFlightSessions")
        .withIndex("by_aircraft", (q) => q.eq("aircraftId", ac._id))
        .collect();

      if (adsbSessions.length >= 5) {
        // Compute average daily hours from ADS-B data
        const sorted = adsbSessions.sort((a, b) => a.departureTimestamp - b.departureTimestamp);
        const earliest = sorted[0].departureTimestamp;
        const latest = sorted[sorted.length - 1].departureTimestamp;
        const daySpan = Math.max(1, (latest - earliest) / DAY_MS);
        const totalFlightHours = sorted.reduce((sum, s) => sum + (s.clockDurationMinutes ?? 0) / 60, 0);
        hoursPerDay = totalFlightHours / daySpan;
        dataQuality = "adsb";
      } else if (ac.averageDailyHours && ac.averageDailyHours > 0) {
        // Manual entry (medium quality)
        hoursPerDay = ac.averageDailyHours;
        dataQuality = "manual";
      } else {
        // Default estimate based on total time and age
        hoursPerDay = 1.5;
        dataQuality = "default";
      }

      // Get existing active predictions to avoid duplicates
      const existing = await ctx.db.query("maintenancePredictions")
        .withIndex("by_aircraft", (q) => q.eq("organizationId", args.organizationId).eq("aircraftId", ac._id))
        .collect();
      const activePredKeys = new Set(
        existing.filter((p) => p.status === "active").map((p) => p.basedOn ?? ""),
      );

      // ── Signal 1: Engine TBO ──────────────────────────────────────────
      const engines = await ctx.db
        .query("engines")
        .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", ac._id))
        .collect();

      for (const engine of engines) {
        const tbo = engine.timeBetweenOverhaulLimit;
        if (!tbo || tbo <= 0) continue;

        const tsoHours = engine.timeSinceOverhaulHours ?? engine.totalTimeHours;
        const pctUsed = tsoHours / tbo;
        if (pctUsed < 0.75) continue; // Only predict when > 75% TBO consumed

        const hoursRemaining = tbo - tsoHours;
        const daysRemaining = Math.max(1, hoursRemaining / hoursPerDay);
        const predictedDate = now + daysRemaining * DAY_MS;

        const predKey = `engine-tbo:${engine._id}`;
        if (activePredKeys.has(predKey)) continue;

        await ctx.db.insert("maintenancePredictions", {
          organizationId: args.organizationId,
          aircraftId: ac._id,
          predictionType: "usage_based",
          predictedDate,
          confidence: computeConfidence(dataQuality, pctUsed),
          severity: computeSeverity(pctUsed),
          description: `Engine ${engine.make} ${engine.model} S/N ${engine.serialNumber} (pos ${engine.position ?? "?"}) — ${Math.round(hoursRemaining)}h remaining of ${tbo}h TBO (${Math.round(pctUsed * 100)}% used)`,
          recommendation: hoursRemaining <= 100
            ? `Schedule engine overhaul immediately — less than 100h remaining`
            : `Schedule engine overhaul within ${Math.round(daysRemaining / 30)} months`,
          basedOn: predKey,
          status: "active",
          createdAt: now,
        });
        created++;
      }

      // ── Signal 2: LLP remaining life ──────────────────────────────────
      const llps = await ctx.db
        .query("parts")
        .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", ac._id))
        .collect();

      for (const part of llps) {
        if (!part.isLifeLimited) continue;

        // Hours-based LLP
        if (part.lifeLimitHours && part.lifeLimitHours > 0) {
          const accum = part.hoursAccumulatedBeforeInstall ?? 0;
          const atInstall = part.hoursAtInstallation ?? 0;
          const currentHours = accum + Math.max(0, ac.totalTimeAirframeHours - atInstall);
          const pctUsed = currentHours / part.lifeLimitHours;
          if (pctUsed < 0.75) continue;

          const remainingHours = part.lifeLimitHours - currentHours;
          const daysRemaining = Math.max(1, remainingHours / hoursPerDay);
          const predictedDate = now + daysRemaining * DAY_MS;

          const predKey = `llp-h:${part._id}`;
          if (activePredKeys.has(predKey)) continue;

          await ctx.db.insert("maintenancePredictions", {
            organizationId: args.organizationId,
            aircraftId: ac._id,
            componentPartNumber: part.partNumber,
            componentSerialNumber: part.serialNumber ?? undefined,
            predictionType: "usage_based",
            predictedDate,
            confidence: computeConfidence(dataQuality, pctUsed),
            severity: computeSeverity(pctUsed),
            description: `LLP ${part.partName} (P/N ${part.partNumber}) — ${Math.round(remainingHours)}h of ${part.lifeLimitHours}h life remaining (${Math.round(pctUsed * 100)}%)`,
            recommendation: remainingHours <= 50
              ? `Replace LLP immediately — approaching hard life limit`
              : `Plan LLP replacement within ${Math.round(daysRemaining / 30)} months`,
            basedOn: predKey,
            status: "active",
            createdAt: now,
          });
          created++;
        }

        // Cycles-based LLP
        if (part.lifeLimitCycles && part.lifeLimitCycles > 0) {
          const cyclesAccum = part.cyclesAccumulatedBeforeInstall ?? 0;
          const currentCycles = cyclesAccum + (ac.totalLandingCycles ?? 0);
          const pctUsed = currentCycles / part.lifeLimitCycles;
          if (pctUsed < 0.75) continue;

          const remainingCycles = part.lifeLimitCycles - currentCycles;
          const cyclesPerDay = ac.averageDailyCycles ?? 1;
          const daysRemaining = Math.max(1, remainingCycles / cyclesPerDay);
          const predictedDate = now + daysRemaining * DAY_MS;

          const predKey = `llp-c:${part._id}`;
          if (activePredKeys.has(predKey)) continue;

          await ctx.db.insert("maintenancePredictions", {
            organizationId: args.organizationId,
            aircraftId: ac._id,
            componentPartNumber: part.partNumber,
            componentSerialNumber: part.serialNumber ?? undefined,
            predictionType: "usage_based",
            predictedDate,
            confidence: computeConfidence(dataQuality, pctUsed),
            severity: computeSeverity(pctUsed),
            description: `LLP ${part.partName} (P/N ${part.partNumber}) — ${Math.round(remainingCycles)} of ${part.lifeLimitCycles} cycles remaining (${Math.round(pctUsed * 100)}%)`,
            recommendation: `Plan LLP replacement within ${Math.round(daysRemaining / 30)} months (cycle-limited)`,
            basedOn: predKey,
            status: "active",
            createdAt: now,
          });
          created++;
        }
      }

      // ── Signal 3: Non-complied ADs approaching deadline ───────────────
      const adRows = await ctx.db
        .query("adCompliance")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("complianceStatus", "not_complied"),
        )
        .collect();

      for (const row of adRows) {
        if (String(row.aircraftId) !== String(ac._id)) continue;
        const dueDate = row.nextDueDate;
        if (!dueDate) continue;

        const daysUntilDue = (dueDate - now) / DAY_MS;
        if (daysUntilDue > 90) continue; // Only flag ADs due within 90 days

        const ad = await ctx.db.get(row.adId);
        const predKey = `ad-nc:${row._id}`;
        if (activePredKeys.has(predKey)) continue;

        await ctx.db.insert("maintenancePredictions", {
          organizationId: args.organizationId,
          aircraftId: ac._id,
          predictionType: "time_based",
          predictedDate: dueDate,
          confidence: 95, // AD deadlines are hard dates — high confidence
          severity: daysUntilDue <= 0 ? "critical" : daysUntilDue <= 30 ? "high" : "medium",
          description: `AD ${ad?.adNumber ?? "?"} — ${ad?.title ?? "Non-complied airworthiness directive"} — ${daysUntilDue <= 0 ? "OVERDUE" : `${Math.round(daysUntilDue)} days remaining`}`,
          recommendation: daysUntilDue <= 0
            ? `Aircraft may be unairworthy — comply with AD immediately`
            : `Schedule AD compliance within ${Math.round(daysUntilDue)} days`,
          basedOn: predKey,
          status: "active",
          createdAt: now,
        });
        created++;
      }

      // ── Signal 4: Engine cycle-based TBO ──────────────────────────────
      for (const engine of engines) {
        const cbo = engine.cycleBetweenOverhaulLimit;
        if (!cbo || cbo <= 0 || !engine.cyclesSinceOverhaul) continue;

        const pctUsed = engine.cyclesSinceOverhaul / cbo;
        if (pctUsed < 0.75) continue;

        const remainingCycles = cbo - engine.cyclesSinceOverhaul;
        const cyclesPerDay = ac.averageDailyCycles ?? 1;
        const daysRemaining = Math.max(1, remainingCycles / cyclesPerDay);
        const predictedDate = now + daysRemaining * DAY_MS;

        const predKey = `engine-cbo:${engine._id}`;
        if (activePredKeys.has(predKey)) continue;

        await ctx.db.insert("maintenancePredictions", {
          organizationId: args.organizationId,
          aircraftId: ac._id,
          predictionType: "usage_based",
          predictedDate,
          confidence: computeConfidence(dataQuality, pctUsed),
          severity: computeSeverity(pctUsed),
          description: `Engine ${engine.make} ${engine.model} (pos ${engine.position ?? "?"}) — ${Math.round(remainingCycles)} cycles remaining of ${cbo} cycle overhaul limit (${Math.round(pctUsed * 100)}%)`,
          recommendation: `Schedule engine overhaul within ${Math.round(daysRemaining / 30)} months (cycle-limited)`,
          basedOn: predKey,
          status: "active",
          createdAt: now,
        });
        created++;
      }
    }

    return { created };
  },
});
