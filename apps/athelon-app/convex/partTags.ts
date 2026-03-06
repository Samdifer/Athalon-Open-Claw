// convex/partTags.ts
// Athelon — Aviation MRO SaaS Platform
//
// Part tagging system: hierarchical taxonomy (TagCategory → Tag → Subtag) with
// many-to-many junction via partTags. Supports system categories (Aircraft Type,
// Engine Type, ATA Chapter, Component Type) and user-defined custom categories.
// Denormalized display names on partTags enable list rendering without extra lookups.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const categoryTypeValidator = v.union(
  v.literal("aircraft_type"),
  v.literal("engine_type"),
  v.literal("ata_chapter"),
  v.literal("component_type"),
  v.literal("custom"),
);

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Tag Categories
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new tag category for the organization.
 * Sets isSystem=false (only seedDefaultCategories creates system categories)
 * and isActive=true.
 */
export const createTagCategory = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    categoryType: categoryTypeValidator,
    description: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"tagCategories">> => {
    const now = Date.now();

    // Check for duplicate slug within the organization
    const existing = await ctx.db
      .query("tagCategories")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId).eq("slug", args.slug),
      )
      .unique();
    if (existing) {
      throw new Error(
        `Tag category with slug "${args.slug}" already exists in this organization.`,
      );
    }

    return await ctx.db.insert("tagCategories", {
      organizationId: args.organizationId,
      name: args.name,
      slug: args.slug,
      categoryType: args.categoryType,
      description: args.description,
      displayOrder: args.displayOrder,
      isSystem: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a tag category. Cannot deactivate system categories.
 */
export const updateTagCategory = mutation({
  args: {
    categoryId: v.id("tagCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<void> => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Tag category not found.");
    }

    // Prevent deactivating system categories
    if (category.isSystem && args.isActive === false) {
      throw new Error("Cannot deactivate a system category.");
    }

    const updates: Record<string, string | number | boolean | undefined> = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.displayOrder !== undefined)
      updates.displayOrder = args.displayOrder;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.categoryId, updates);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Tags
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new tag under a category.
 */
export const createTag = mutation({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.id("tagCategories"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    aircraftMake: v.optional(v.string()),
    aircraftModel: v.optional(v.string()),
    engineMake: v.optional(v.string()),
    engineModel: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"tags">> => {
    const now = Date.now();

    // Verify category exists
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Tag category not found.");
    }

    return await ctx.db.insert("tags", {
      organizationId: args.organizationId,
      categoryId: args.categoryId,
      name: args.name,
      code: args.code,
      description: args.description,
      aircraftMake: args.aircraftMake,
      aircraftModel: args.aircraftModel,
      engineMake: args.engineMake,
      engineModel: args.engineModel,
      isActive: true,
      displayOrder: args.displayOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a tag's mutable fields.
 */
export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Tag not found.");
    }

    const updates: Record<string, string | number | boolean | undefined> = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.code !== undefined) updates.code = args.code;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.displayOrder !== undefined)
      updates.displayOrder = args.displayOrder;

    await ctx.db.patch(args.tagId, updates);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Subtags
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a subtag under a tag. Looks up the parent tag to denormalize categoryId.
 */
export const createSubtag = mutation({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.id("tags"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    aircraftSeries: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"subtags">> => {
    const now = Date.now();

    // Look up the parent tag to get categoryId for denormalization
    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Parent tag not found.");
    }

    return await ctx.db.insert("subtags", {
      organizationId: args.organizationId,
      tagId: args.tagId,
      categoryId: tag.categoryId,
      name: args.name,
      code: args.code,
      description: args.description,
      aircraftSeries: args.aircraftSeries,
      isActive: true,
      displayOrder: args.displayOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a subtag's mutable fields.
 */
export const updateSubtag = mutation({
  args: {
    subtagId: v.id("subtags"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const subtag = await ctx.db.get(args.subtagId);
    if (!subtag) {
      throw new Error("Subtag not found.");
    }

    const updates: Record<string, string | number | boolean | undefined> = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.code !== undefined) updates.code = args.code;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.displayOrder !== undefined)
      updates.displayOrder = args.displayOrder;

    await ctx.db.patch(args.subtagId, updates);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Part ↔ Tag Junction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add a tag (and optional subtag) to a part. Denormalizes category name, tag name,
 * and subtag name onto the junction record. Checks for duplicates before inserting.
 */
export const addTagToPart = mutation({
  args: {
    organizationId: v.id("organizations"),
    partId: v.id("parts"),
    tagId: v.id("tags"),
    subtagId: v.optional(v.id("subtags")),
    createdByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"partTags">> => {
    // Look up tag to get categoryId and tag name
    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Tag not found.");
    }

    // Look up category for category name
    const category = await ctx.db.get(tag.categoryId);
    if (!category) {
      throw new Error("Tag category not found.");
    }

    // Look up subtag name if provided
    let subtagName: string | undefined;
    if (args.subtagId) {
      const subtag = await ctx.db.get(args.subtagId);
      if (!subtag) {
        throw new Error("Subtag not found.");
      }
      subtagName = subtag.name;
    }

    // Check for duplicate: same part + tag + subtag combination
    const existingRecords = await ctx.db
      .query("partTags")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .collect();

    const duplicate = existingRecords.find(
      (pt) =>
        pt.tagId === args.tagId &&
        (args.subtagId ? pt.subtagId === args.subtagId : !pt.subtagId),
    );
    if (duplicate) {
      throw new Error("This tag is already applied to the part.");
    }

    return await ctx.db.insert("partTags", {
      organizationId: args.organizationId,
      partId: args.partId,
      tagId: args.tagId,
      subtagId: args.subtagId,
      categoryId: tag.categoryId,
      categoryName: category.name,
      tagName: tag.name,
      subtagName,
      createdAt: Date.now(),
      createdByUserId: args.createdByUserId,
    });
  },
});

/**
 * Remove a tag from a part by deleting the junction record.
 */
export const removeTagFromPart = mutation({
  args: {
    partTagId: v.id("partTags"),
  },
  handler: async (ctx, args): Promise<void> => {
    const partTag = await ctx.db.get(args.partTagId);
    if (!partTag) {
      throw new Error("Part tag record not found.");
    }
    await ctx.db.delete(args.partTagId);
  },
});

/**
 * Add the same tag (and optional subtag) to multiple parts. Skips duplicates silently.
 */
export const bulkTagParts = mutation({
  args: {
    organizationId: v.id("organizations"),
    partIds: v.array(v.id("parts")),
    tagId: v.id("tags"),
    subtagId: v.optional(v.id("subtags")),
    createdByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Id<"partTags">>> => {
    // Look up tag to get categoryId and tag name
    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new Error("Tag not found.");
    }

    // Look up category for category name
    const category = await ctx.db.get(tag.categoryId);
    if (!category) {
      throw new Error("Tag category not found.");
    }

    // Look up subtag name if provided
    let subtagName: string | undefined;
    if (args.subtagId) {
      const subtag = await ctx.db.get(args.subtagId);
      if (!subtag) {
        throw new Error("Subtag not found.");
      }
      subtagName = subtag.name;
    }

    const now = Date.now();
    const insertedIds: Array<Id<"partTags">> = [];

    for (const partId of args.partIds) {
      // Check for duplicate on this specific part
      const existingRecords = await ctx.db
        .query("partTags")
        .withIndex("by_part", (q) => q.eq("partId", partId))
        .collect();

      const isDuplicate = existingRecords.some(
        (pt) =>
          pt.tagId === args.tagId &&
          (args.subtagId ? pt.subtagId === args.subtagId : !pt.subtagId),
      );

      if (!isDuplicate) {
        const id = await ctx.db.insert("partTags", {
          organizationId: args.organizationId,
          partId,
          tagId: args.tagId,
          subtagId: args.subtagId,
          categoryId: tag.categoryId,
          categoryName: category.name,
          tagName: tag.name,
          subtagName,
          createdAt: now,
          createdByUserId: args.createdByUserId,
        });
        insertedIds.push(id);
      }
    }

    return insertedIds;
  },
});

/**
 * Seed the 4 default system tag categories for an organization if they
 * don't already exist: Aircraft Type, Engine Type, ATA Chapter, Component Type.
 */
export const seedDefaultCategories = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    const defaults: Array<{
      name: string;
      slug: string;
      categoryType:
        | "aircraft_type"
        | "engine_type"
        | "ata_chapter"
        | "component_type";
      displayOrder: number;
    }> = [
      {
        name: "Aircraft Type",
        slug: "aircraft_type",
        categoryType: "aircraft_type" as const,
        displayOrder: 1,
      },
      {
        name: "Engine Type",
        slug: "engine_type",
        categoryType: "engine_type" as const,
        displayOrder: 2,
      },
      {
        name: "ATA Chapter",
        slug: "ata_chapter",
        categoryType: "ata_chapter" as const,
        displayOrder: 3,
      },
      {
        name: "Component Type",
        slug: "component_type",
        categoryType: "component_type" as const,
        displayOrder: 4,
      },
    ];

    for (const def of defaults) {
      // Check if this slug already exists for the org
      const existing = await ctx.db
        .query("tagCategories")
        .withIndex("by_org_slug", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("slug", def.slug),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("tagCategories", {
          organizationId: args.organizationId,
          name: def.name,
          slug: def.slug,
          categoryType: def.categoryType,
          description: undefined,
          displayOrder: def.displayOrder,
          isSystem: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List all active tag categories for an organization, sorted by displayOrder.
 */
export const listTagCategories = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("tagCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    return categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * List tags for an organization, optionally filtered by category.
 */
export const listTags = query({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.optional(v.id("tagCategories")),
  },
  handler: async (ctx, args) => {
    if (args.categoryId) {
      return await ctx.db
        .query("tags")
        .withIndex("by_org_category", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("categoryId", args.categoryId!),
        )
        .collect();
    }

    return await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
  },
});

/**
 * List subtags for an organization, optionally filtered by parent tag.
 */
export const listSubtags = query({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    if (args.tagId) {
      return await ctx.db
        .query("subtags")
        .withIndex("by_org_tag", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("tagId", args.tagId!),
        )
        .collect();
    }

    return await ctx.db
      .query("subtags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
  },
});

/**
 * Get all partTag junction records for a specific part (already has denormalized names).
 */
export const getTagsForPart = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partTags")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .collect();
  },
});

/**
 * Get part IDs that have a specific tag. If subtagId is provided, filter to that subtag.
 */
export const getPartsByTag = query({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.id("tags"),
    subtagId: v.optional(v.id("subtags")),
  },
  handler: async (ctx, args) => {
    if (args.subtagId) {
      const records = await ctx.db
        .query("partTags")
        .withIndex("by_subtag", (q) => q.eq("subtagId", args.subtagId!))
        .collect();
      return records.map((r) => r.partId);
    }

    const records = await ctx.db
      .query("partTags")
      .withIndex("by_org_tag", (q) =>
        q.eq("organizationId", args.organizationId).eq("tagId", args.tagId),
      )
      .collect();
    return records.map((r) => r.partId);
  },
});

/**
 * Get all partTag records within a category for an organization.
 */
export const getPartsByCategory = query({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.id("tagCategories"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partTags")
      .withIndex("by_org_category", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("categoryId", args.categoryId),
      )
      .collect();
  },
});

/**
 * Get tag usage counts: returns an array of { tagId, tagName, count } showing
 * how many parts have each tag, optionally scoped to a category.
 */
export const getTagCounts = query({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.optional(v.id("tagCategories")),
  },
  handler: async (ctx, args) => {
    // Fetch the relevant tags
    let tags;
    if (args.categoryId) {
      tags = await ctx.db
        .query("tags")
        .withIndex("by_org_category", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("categoryId", args.categoryId!),
        )
        .collect();
    } else {
      tags = await ctx.db
        .query("tags")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .collect();
    }

    // For each tag, count the partTag junction records
    const counts: Array<{ tagId: Id<"tags">; tagName: string; count: number }> =
      [];

    for (const tag of tags) {
      const partTagRecords = await ctx.db
        .query("partTags")
        .withIndex("by_org_tag", (q) =>
          q.eq("organizationId", args.organizationId).eq("tagId", tag._id),
        )
        .collect();

      counts.push({
        tagId: tag._id,
        tagName: tag.name,
        count: partTagRecords.length,
      });
    }

    return counts;
  },
});
