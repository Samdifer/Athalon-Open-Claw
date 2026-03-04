// convex/vendors.ts
// Athelon — Aviation MRO SaaS Platform
//
// Vendor management: create, update, list, approve, and track certifications
// for external vendors (parts suppliers, contract maintenance, calibration labs, DERs).
//
// Author:      Devraj Anand (Backend Engineer)
// Regulatory:  Marcus Webb
//              Marcus note: FAA Part 145 §145.217(b) requires repair stations to
//              maintain an approved vendor list (AVL). This module implements AVL
//              controls — every vendor that supplies parts or services to a Part 145
//              station must be on this list and carry a current cert or be explicitly
//              approved by the DOM or QCM. All approval actions produce audit log entries
//              to satisfy §145.59 recordkeeping requirements.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createVendor
//
// Creates a new vendor record in DRAFT/unapproved state. The vendor is not on
// the Approved Vendor List until setVendorApprovedStatus is called.
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new vendor for the organization. New vendors start unapproved. */
export const createVendor = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    type: v.union(
      v.literal("parts_supplier"),
      v.literal("consumables_supplier"),
      v.literal("contract_maintenance"),
      v.literal("calibration_lab"),
      v.literal("DER"),
      v.literal("service_provider"),
      v.literal("other"),
    ),
    address: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    certNumber: v.optional(v.string()),
    certExpiry: v.optional(v.number()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"vendors">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    if (!args.name.trim()) {
      throw new Error("Vendor name must be a non-empty string.");
    }

    const org = await ctx.db.get(args.orgId);
    if (!org || !org.active) {
      throw new Error(`Organization ${args.orgId} not found or is inactive.`);
    }

    const vendorId = await ctx.db.insert("vendors", {
      orgId: args.orgId,
      name: args.name.trim(),
      type: args.type,
      address: args.address,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      certNumber: args.certNumber,
      certExpiry: args.certExpiry,
      isApproved: false,
      createdAt: now,
      updatedAt: now,
      notes: args.notes,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "vendors",
      recordId: vendorId,
      userId: callerUserId,
      notes: `Vendor "${args.name.trim()}" created (type: ${args.type}). Pending AVL approval.`,
      timestamp: now,
    });

    return vendorId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateVendor
//
// Updates mutable vendor fields. Does not change approval status or cert fields
// (those have dedicated mutations to enforce audit log coverage).
// ─────────────────────────────────────────────────────────────────────────────

/** Updates vendor contact and metadata fields. Approval and cert changes use dedicated mutations. */
export const updateVendor = mutation({
  args: {
    vendorId: v.id("vendors"),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("parts_supplier"),
      v.literal("consumables_supplier"),
      v.literal("contract_maintenance"),
      v.literal("calibration_lab"),
      v.literal("DER"),
      v.literal("service_provider"),
      v.literal("other"),
    )),
    address: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error(`Vendor ${args.vendorId} not found.`);
    if (vendor.orgId !== args.orgId) {
      throw new Error(`Vendor ${args.vendorId} does not belong to organization ${args.orgId}.`);
    }

    const patch: Partial<{
      name: string;
      type: "parts_supplier" | "consumables_supplier" | "contract_maintenance" | "calibration_lab" | "DER" | "service_provider" | "other";
      address: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      notes: string;
      updatedAt: number;
    }> = { updatedAt: now };

    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.type !== undefined) patch.type = args.type;
    if (args.address !== undefined) patch.address = args.address;
    if (args.contactName !== undefined) patch.contactName = args.contactName;
    if (args.contactEmail !== undefined) patch.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) patch.contactPhone = args.contactPhone;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.vendorId, patch);

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_updated",
      tableName: "vendors",
      recordId: args.vendorId,
      userId: callerUserId,
      notes: `Vendor "${vendor.name}" updated.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listVendors
//
// Returns all vendors for the organization, optionally filtered by type and/or
// approved status.
// ─────────────────────────────────────────────────────────────────────────────

/** Lists all vendors for the organization with optional type and approval filters. */
export const listVendors = query({
  args: {
    orgId: v.id("organizations"),
    type: v.optional(v.union(
      v.literal("parts_supplier"),
      v.literal("consumables_supplier"),
      v.literal("contract_maintenance"),
      v.literal("calibration_lab"),
      v.literal("DER"),
      v.literal("service_provider"),
      v.literal("other"),
    )),
    isApproved: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    let vendors;

    if (args.type !== undefined) {
      vendors = await ctx.db
        .query("vendors")
        .withIndex("by_org_type", (q) =>
          q.eq("orgId", args.orgId).eq("type", args.type!),
        )
        .collect();
    } else if (args.isApproved !== undefined) {
      vendors = await ctx.db
        .query("vendors")
        .withIndex("by_org_approved", (q) =>
          q.eq("orgId", args.orgId).eq("isApproved", args.isApproved!),
        )
        .collect();
    } else {
      vendors = await ctx.db
        .query("vendors")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
    }

    // Apply isApproved filter if also filtering by type
    if (args.type !== undefined && args.isApproved !== undefined) {
      vendors = vendors.filter((v) => v.isApproved === args.isApproved);
    }

    return vendors;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getVendor
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a single vendor by ID. Throws if not found or org mismatch. */
export const getVendor = query({
  args: {
    vendorId: v.id("vendors"),
    orgId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error(`Vendor ${args.vendorId} not found.`);
    if (vendor.orgId !== args.orgId) {
      throw new Error(`Vendor ${args.vendorId} does not belong to organization ${args.orgId}.`);
    }
    return vendor;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: setVendorApprovedStatus
//
// Adds or removes a vendor from the Approved Vendor List.
// Marcus: This is a regulated action under §145.217(b). The approver must be
// a technician (DOM or QCM level). Every status change writes an audit log entry
// with the approver identity and rationale.
// ─────────────────────────────────────────────────────────────────────────────

/** Sets vendor approved/unapproved status. Writes audit log entry per §145.217(b). */
export const setVendorApprovedStatus = mutation({
  args: {
    vendorId: v.id("vendors"),
    orgId: v.id("organizations"),
    isApproved: v.boolean(),
    approvedByTechId: v.id("technicians"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error(`Vendor ${args.vendorId} not found.`);
    if (vendor.orgId !== args.orgId) {
      throw new Error(`Vendor ${args.vendorId} does not belong to organization ${args.orgId}.`);
    }

    const tech = await ctx.db.get(args.approvedByTechId);
    if (!tech) throw new Error(`Technician ${args.approvedByTechId} not found.`);

    const oldStatus = vendor.isApproved;

    await ctx.db.patch(args.vendorId, {
      isApproved: args.isApproved,
      approvedBy: args.isApproved ? args.approvedByTechId : undefined,
      approvedAt: args.isApproved ? now : undefined,
      updatedAt: now,
    });

    // Marcus: Audit log is mandatory on AVL status changes per §145.59 recordkeeping.
    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "vendors",
      recordId: args.vendorId,
      userId: callerUserId,
      technicianId: args.approvedByTechId,
      fieldName: "isApproved",
      oldValue: JSON.stringify(oldStatus),
      newValue: JSON.stringify(args.isApproved),
      notes:
        args.isApproved
          ? `Vendor "${vendor.name}" added to Approved Vendor List by ${tech.legalName ?? "technician"}. ${args.notes ?? ""}`
          : `Vendor "${vendor.name}" removed from Approved Vendor List by ${tech.legalName ?? "technician"}. ${args.notes ?? ""}`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateVendorCert
//
// Updates the cert number and expiry for a vendor. Checks whether the new cert
// is expired at the time of update and logs a warning in the audit entry if so.
// Marcus: Calibration labs and DERs must have current FAA certificates. The
// system must surface expiry warnings to prevent use of expired vendors.
// ─────────────────────────────────────────────────────────────────────────────

/** Updates vendor certificate number and expiry. Logs cert status at update time. */
export const updateVendorCert = mutation({
  args: {
    vendorId: v.id("vendors"),
    orgId: v.id("organizations"),
    certNumber: v.string(),
    certExpiry: v.number(),   // Unix ms
    updatedByTechId: v.id("technicians"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error(`Vendor ${args.vendorId} not found.`);
    if (vendor.orgId !== args.orgId) {
      throw new Error(`Vendor ${args.vendorId} does not belong to organization ${args.orgId}.`);
    }

    if (!args.certNumber.trim()) {
      throw new Error("certNumber must be a non-empty string.");
    }
    if (args.certExpiry <= 0) {
      throw new Error("certExpiry must be a positive Unix timestamp in milliseconds.");
    }

    const isExpired = args.certExpiry < now;

    await ctx.db.patch(args.vendorId, {
      certNumber: args.certNumber.trim(),
      certExpiry: args.certExpiry,
      updatedAt: now,
    });

    // Marcus: Cert update must be logged. Expired cert at time of update is flagged
    // in notes so QCM is alerted during AVL review.
    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_updated",
      tableName: "vendors",
      recordId: args.vendorId,
      userId: callerUserId,
      technicianId: args.updatedByTechId,
      fieldName: "certNumber",
      oldValue: JSON.stringify(vendor.certNumber ?? null),
      newValue: JSON.stringify(args.certNumber.trim()),
      notes: [
        `Vendor "${vendor.name}" cert updated to ${args.certNumber.trim()}.`,
        `Expiry: ${new Date(args.certExpiry).toISOString()}.`,
        isExpired ? "⚠️ WARNING: Certificate is ALREADY EXPIRED at time of update." : "Certificate is current.",
        args.notes ?? "",
      ].join(" ").trim(),
      timestamp: now,
    });

    // Marcus: If cert is expired and vendor is currently approved, we do NOT
    // auto-remove from AVL — that requires a human decision by DOM/QCM.
    // We surface the flag via audit log; the frontend should highlight this.
    if (isExpired && vendor.isApproved) {
      await ctx.db.insert("auditLog", {
        organizationId: args.orgId,
        eventType: "system_event",
        tableName: "vendors",
        recordId: args.vendorId,
        userId: callerUserId,
        notes:
          `⚠️ COMPLIANCE FLAG: Vendor "${vendor.name}" is on the Approved Vendor List ` +
          `but cert ${args.certNumber.trim()} expired ${new Date(args.certExpiry).toISOString()}. ` +
          `DOM/QCM review required before further use. §145.217(b).`,
        timestamp: now,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR SERVICES
//
// Catalog of services each vendor provides. Used when attaching outsourced
// work to task cards via taskCardVendorServices.
// ─────────────────────────────────────────────────────────────────────────────

const serviceTypeValidator = v.union(
  v.literal("repair"),
  v.literal("overhaul"),
  v.literal("test"),
  v.literal("calibration"),
  v.literal("inspection"),
  v.literal("fabrication"),
  v.literal("cleaning"),
  v.literal("plating"),
  v.literal("painting"),
  v.literal("ndt"),
  v.literal("other"),
);

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createVendorService
//
// Creates a new service offering for an existing vendor. Validates that the
// vendor exists and belongs to the specified organization.
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new vendor service record. */
export const createVendorService = mutation({
  args: {
    vendorId: v.id("vendors"),
    orgId: v.id("organizations"),
    serviceName: v.string(),
    serviceType: serviceTypeValidator,
    description: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    certificationRequired: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"vendorServices">> => {
    const now = Date.now();

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) {
      throw new Error(`Vendor ${args.vendorId} not found.`);
    }
    if (vendor.orgId !== args.orgId) {
      throw new Error(`Vendor ${args.vendorId} does not belong to organization ${args.orgId}.`);
    }

    return await ctx.db.insert("vendorServices", {
      vendorId: args.vendorId,
      orgId: args.orgId,
      serviceName: args.serviceName,
      serviceType: args.serviceType,
      description: args.description,
      estimatedCost: args.estimatedCost,
      certificationRequired: args.certificationRequired,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateVendorService
//
// Updates a vendor service record. Only patches fields that are provided.
// ─────────────────────────────────────────────────────────────────────────────

/** Updates fields on an existing vendor service. */
export const updateVendorService = mutation({
  args: {
    serviceId: v.id("vendorServices"),
    serviceName: v.optional(v.string()),
    serviceType: v.optional(serviceTypeValidator),
    description: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    certificationRequired: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error(`Vendor service ${args.serviceId} not found.`);
    }

    const patch: Record<string, string | number | boolean> = { updatedAt: now };

    if (args.serviceName !== undefined) patch.serviceName = args.serviceName;
    if (args.serviceType !== undefined) patch.serviceType = args.serviceType;
    if (args.description !== undefined) patch.description = args.description;
    if (args.estimatedCost !== undefined) patch.estimatedCost = args.estimatedCost;
    if (args.certificationRequired !== undefined) patch.certificationRequired = args.certificationRequired;
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.serviceId, patch);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listVendorServices
//
// Returns active services for a vendor, using the by_vendor index.
// ─────────────────────────────────────────────────────────────────────────────

/** Lists active services for the given vendor. */
export const listVendorServices = query({
  args: {
    vendorId: v.id("vendors"),
  },

  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("vendorServices")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    return services.filter((s) => s.isActive);
  },
});
