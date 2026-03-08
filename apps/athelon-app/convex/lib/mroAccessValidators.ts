import { v } from "convex/values";
import type { AccessAuthorization, MroRole } from "../../lib/mro-access";

export const mroRoleValidator = v.union(
  v.literal("admin"),
  v.literal("shop_manager"),
  v.literal("qcm_inspector"),
  v.literal("billing_manager"),
  v.literal("lead_technician"),
  v.literal("technician"),
  v.literal("parts_clerk"),
  v.literal("sales_rep"),
  v.literal("sales_manager"),
  v.literal("read_only"),
);

export const accessAuthorizationValidator = v.literal("rii");

export const accessAuthorizationArrayValidator = v.array(
  accessAuthorizationValidator,
);

export type { AccessAuthorization, MroRole };
