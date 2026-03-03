// convex/releaseCertificates.ts
// Release certificates (FAA 8130-3 / EASA Form 1) for completed work orders.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createReleaseCertificate = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    partId: v.optional(v.id("parts")),
    formType: v.union(v.literal("faa_8130"), v.literal("easa_form1")),
    partDescription: v.string(),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    quantity: v.number(),
    workPerformed: v.string(),
    condition: v.string(),
    remarks: v.string(),
    inspectorTechnicianId: v.id("technicians"),
    approvalNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Look up technician for name
    const tech = await ctx.db.get(args.inspectorTechnicianId);
    if (!tech) throw new Error("Technician not found");

    // Look up org for cert info
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("Organization not found");

    // Generate certificate number
    const existing = await ctx.db
      .query("releaseCertificates")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const certNumber = `RC-${String(existing.length + 1).padStart(4, "0")}`;

    const now = Date.now();
    const id = await ctx.db.insert("releaseCertificates", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      partId: args.partId,
      formType: args.formType,
      certificateNumber: certNumber,
      partDescription: args.partDescription,
      partNumber: args.partNumber,
      serialNumber: args.serialNumber,
      batchNumber: args.batchNumber,
      quantity: args.quantity,
      workPerformed: args.workPerformed,
      condition: args.condition,
      remarks: args.remarks,
      inspectorTechnicianId: args.inspectorTechnicianId,
      inspectorName: tech.legalName,
      approvalNumber: args.approvalNumber,
      organizationName: org.name,
      organizationAddress: `${org.address}, ${org.city}, ${org.state} ${org.zip}`,
      repairStationCertNumber: org.part145CertificateNumber,
      signatureDate: now,
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "releaseCertificates",
      recordId: id,
      notes: `${args.formType === "faa_8130" ? "FAA 8130-3" : "EASA Form 1"} certificate ${certNumber} created`,
      timestamp: now,
    });

    return id;
  },
});

export const listByWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("releaseCertificates")
      .withIndex("by_workOrder", (q) => q.eq("workOrderId", args.workOrderId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("releaseCertificates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
