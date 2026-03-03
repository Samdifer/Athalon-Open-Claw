import type { Id } from "@/convex/_generated/dataModel";

export type QuoteWorkspaceMode = "list" | "new" | "detail";

export type QuoteWorkspaceWorkOrder = {
  _id: Id<"workOrders">;
  workOrderNumber: string;
  description: string;
  status: string;
  priority: "routine" | "urgent" | "aog";
  sourceQuoteId?: Id<"quotes">;
  quoteNumber?: string | null;
  quoteStatus?: string | null;
  aircraft: { currentRegistration?: string; make: string; model: string } | null;
};
