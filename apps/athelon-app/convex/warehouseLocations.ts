import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════════════
// Area type validator (shared across create + update)
// ═══════════════════════════════════════════════════════════════════════════

const areaTypeValidator = v.optional(
  v.union(
    v.literal("general"),
    v.literal("hazmat"),
    v.literal("temperature_controlled"),
    v.literal("secure"),
    v.literal("quarantine"),
    v.literal("receiving"),
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// WAREHOUSE MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const createWarehouse = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    shopLocationId: v.optional(v.id("shopLocations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("warehouses", {
      organizationId: args.organizationId,
      name: args.name,
      code: args.code,
      description: args.description,
      address: args.address,
      shopLocationId: args.shopLocationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateWarehouse = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    shopLocationId: v.optional(v.id("shopLocations")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.warehouseId);
    if (!existing) {
      throw new Error("Warehouse not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.code !== undefined) patch.code = args.code;
    if (args.description !== undefined) patch.description = args.description;
    if (args.address !== undefined) patch.address = args.address;
    if (args.shopLocationId !== undefined) patch.shopLocationId = args.shopLocationId;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.warehouseId, patch);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// AREA MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const createArea = mutation({
  args: {
    organizationId: v.id("organizations"),
    warehouseId: v.id("warehouses"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    areaType: areaTypeValidator,
  },
  handler: async (ctx, args) => {
    const warehouse = await ctx.db.get(args.warehouseId);
    if (!warehouse) {
      throw new Error("Warehouse not found");
    }
    const now = Date.now();
    return await ctx.db.insert("warehouseAreas", {
      organizationId: args.organizationId,
      warehouseId: args.warehouseId,
      name: args.name,
      code: args.code,
      description: args.description,
      areaType: args.areaType,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateArea = mutation({
  args: {
    areaId: v.id("warehouseAreas"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    areaType: areaTypeValidator,
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.areaId);
    if (!existing) {
      throw new Error("Area not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.code !== undefined) patch.code = args.code;
    if (args.description !== undefined) patch.description = args.description;
    if (args.areaType !== undefined) patch.areaType = args.areaType;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.areaId, patch);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SHELF MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const createShelf = mutation({
  args: {
    organizationId: v.id("organizations"),
    areaId: v.id("warehouseAreas"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    const now = Date.now();
    return await ctx.db.insert("warehouseShelves", {
      organizationId: args.organizationId,
      warehouseId: area.warehouseId,
      areaId: args.areaId,
      name: args.name,
      code: args.code,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateShelf = mutation({
  args: {
    shelfId: v.id("warehouseShelves"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.shelfId);
    if (!existing) {
      throw new Error("Shelf not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.code !== undefined) patch.code = args.code;
    if (args.description !== undefined) patch.description = args.description;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.shelfId, patch);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SHELF LOCATION MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const createShelfLocation = mutation({
  args: {
    organizationId: v.id("organizations"),
    shelfId: v.id("warehouseShelves"),
    name: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const shelf = await ctx.db.get(args.shelfId);
    if (!shelf) {
      throw new Error("Shelf not found");
    }
    const now = Date.now();
    return await ctx.db.insert("warehouseShelfLocations", {
      organizationId: args.organizationId,
      warehouseId: shelf.warehouseId,
      areaId: shelf.areaId,
      shelfId: args.shelfId,
      name: args.name,
      code: args.code,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateShelfLocation = mutation({
  args: {
    shelfLocationId: v.id("warehouseShelfLocations"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.shelfLocationId);
    if (!existing) {
      throw new Error("Shelf location not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.code !== undefined) patch.code = args.code;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.shelfLocationId, patch);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// BIN MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build "WarehouseName > AreaName > ShelfName > ShelfLocationName > BinName"
 * by walking the ancestor chain from shelfLocation upward.
 */
async function buildDisplayPath(
  ctx: { db: { get: (id: never) => Promise<{ name: string; warehouseId: never; areaId: never; shelfId: never } | null> } },
  ancestors: {
    warehouseId: string;
    areaId: string;
    shelfId: string;
    shelfLocationId: string;
  },
  binName: string,
): Promise<string> {
  const warehouse = await ctx.db.get(ancestors.warehouseId as never);
  const area = await ctx.db.get(ancestors.areaId as never);
  const shelf = await ctx.db.get(ancestors.shelfId as never);
  const shelfLocation = await ctx.db.get(ancestors.shelfLocationId as never);

  const warehouseName = warehouse?.name ?? "Unknown Warehouse";
  const areaName = area?.name ?? "Unknown Area";
  const shelfName = shelf?.name ?? "Unknown Shelf";
  const shelfLocationName = shelfLocation?.name ?? "Unknown Location";

  return `${warehouseName} \u2192 ${areaName} \u2192 ${shelfName} \u2192 ${shelfLocationName} \u2192 ${binName}`;
}

export const createBin = mutation({
  args: {
    organizationId: v.id("organizations"),
    shelfLocationId: v.id("warehouseShelfLocations"),
    name: v.string(),
    code: v.string(),
    barcode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const shelfLocation = await ctx.db.get(args.shelfLocationId);
    if (!shelfLocation) {
      throw new Error("Shelf location not found");
    }

    const ancestors = {
      warehouseId: shelfLocation.warehouseId as string,
      areaId: shelfLocation.areaId as string,
      shelfId: shelfLocation.shelfId as string,
      shelfLocationId: args.shelfLocationId as string,
    };

    const displayPath = await buildDisplayPath(
      ctx as never,
      ancestors,
      args.name,
    );

    const now = Date.now();
    return await ctx.db.insert("warehouseBins", {
      organizationId: args.organizationId,
      warehouseId: shelfLocation.warehouseId,
      areaId: shelfLocation.areaId,
      shelfId: shelfLocation.shelfId,
      shelfLocationId: args.shelfLocationId,
      name: args.name,
      code: args.code,
      barcode: args.barcode,
      displayPath,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBin = mutation({
  args: {
    binId: v.id("warehouseBins"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    barcode: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.binId);
    if (!existing) {
      throw new Error("Bin not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.code !== undefined) patch.code = args.code;
    if (args.barcode !== undefined) patch.barcode = args.barcode;
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    // Recompute displayPath when the bin name changes
    if (args.name !== undefined) {
      const ancestors = {
        warehouseId: existing.warehouseId as string,
        areaId: existing.areaId as string,
        shelfId: existing.shelfId as string,
        shelfLocationId: existing.shelfLocationId as string,
      };
      patch.displayPath = await buildDisplayPath(
        ctx as never,
        ancestors,
        args.name,
      );
    }

    await ctx.db.patch(args.binId, patch);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// WAREHOUSE QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const listWarehouses = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("warehouses")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getWarehouse = query({
  args: {
    warehouseId: v.id("warehouses"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.warehouseId);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// AREA QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const listAreas = query({
  args: {
    organizationId: v.id("organizations"),
    warehouseId: v.optional(v.id("warehouses")),
  },
  handler: async (ctx, args) => {
    if (args.warehouseId) {
      return await ctx.db
        .query("warehouseAreas")
        .withIndex("by_org_warehouse", (q) =>
          q.eq("organizationId", args.organizationId).eq("warehouseId", args.warehouseId!),
        )
        .collect();
    }
    return await ctx.db
      .query("warehouseAreas")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SHELF QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const listShelves = query({
  args: {
    organizationId: v.id("organizations"),
    areaId: v.optional(v.id("warehouseAreas")),
  },
  handler: async (ctx, args) => {
    if (args.areaId) {
      return await ctx.db
        .query("warehouseShelves")
        .withIndex("by_org_area", (q) =>
          q.eq("organizationId", args.organizationId).eq("areaId", args.areaId!),
        )
        .collect();
    }
    return await ctx.db
      .query("warehouseShelves")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SHELF LOCATION QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const listShelfLocations = query({
  args: {
    organizationId: v.id("organizations"),
    shelfId: v.optional(v.id("warehouseShelves")),
  },
  handler: async (ctx, args) => {
    if (args.shelfId) {
      return await ctx.db
        .query("warehouseShelfLocations")
        .withIndex("by_org_shelf", (q) =>
          q.eq("organizationId", args.organizationId).eq("shelfId", args.shelfId!),
        )
        .collect();
    }
    return await ctx.db
      .query("warehouseShelfLocations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// BIN QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const listBins = query({
  args: {
    organizationId: v.id("organizations"),
    shelfLocationId: v.optional(v.id("warehouseShelfLocations")),
  },
  handler: async (ctx, args) => {
    if (args.shelfLocationId) {
      return await ctx.db
        .query("warehouseBins")
        .withIndex("by_org_shelf_location", (q) =>
          q.eq("organizationId", args.organizationId).eq("shelfLocationId", args.shelfLocationId!),
        )
        .collect();
    }
    return await ctx.db
      .query("warehouseBins")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getBin = query({
  args: {
    binId: v.id("warehouseBins"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.binId);
  },
});

export const getBinFullPath = query({
  args: {
    binId: v.id("warehouseBins"),
  },
  handler: async (ctx, args) => {
    const bin = await ctx.db.get(args.binId);
    if (!bin) {
      throw new Error("Bin not found");
    }

    const warehouse = await ctx.db.get(bin.warehouseId);
    const area = await ctx.db.get(bin.areaId);
    const shelf = await ctx.db.get(bin.shelfId);
    const shelfLocation = await ctx.db.get(bin.shelfLocationId);

    return {
      bin,
      warehouseName: warehouse?.name ?? "Unknown Warehouse",
      warehouseCode: warehouse?.code ?? "",
      areaName: area?.name ?? "Unknown Area",
      areaCode: area?.code ?? "",
      shelfName: shelf?.name ?? "Unknown Shelf",
      shelfCode: shelf?.code ?? "",
      shelfLocationName: shelfLocation?.name ?? "Unknown Location",
      shelfLocationCode: shelfLocation?.code ?? "",
      displayPath: bin.displayPath ?? "",
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-TABLE QUERIES (parts / lots in bin)
// ═══════════════════════════════════════════════════════════════════════════

export const listPartsInBin = query({
  args: {
    organizationId: v.id("organizations"),
    binLocationId: v.id("warehouseBins"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parts")
      .withIndex("by_org_bin", (q) =>
        q.eq("organizationId", args.organizationId).eq("binLocationId", args.binLocationId),
      )
      .collect();
  },
});

export const listLotsInBin = query({
  args: {
    organizationId: v.id("organizations"),
    binLocationId: v.id("warehouseBins"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lots")
      .withIndex("by_org_bin", (q) =>
        q.eq("organizationId", args.organizationId).eq("binLocationId", args.binLocationId),
      )
      .collect();
  },
});

export const lookupBinByBarcode = query({
  args: {
    organizationId: v.id("organizations"),
    barcode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("warehouseBins")
      .withIndex("by_org_barcode", (q) =>
        q.eq("organizationId", args.organizationId).eq("barcode", args.barcode),
      )
      .unique();
  },
});
