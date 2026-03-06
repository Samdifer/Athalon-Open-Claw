"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus } from "lucide-react";
import { InteractionTimeline } from "../_components/InteractionTimeline";
import { LogInteractionDialog } from "../_components/LogInteractionDialog";

// ─── Constants ───────────────────────────────────────────────────────────────

type InteractionTypeFilter = "all" | "phone_call" | "email" | "meeting" | "site_visit" | "note";

const TYPE_FILTER_OPTIONS: { value: InteractionTypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "phone_call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site Visit" },
  { value: "note", label: "Note" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CrmInteractionsPage() {
  const { orgId } = useCurrentOrg();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<InteractionTypeFilter>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const completeFollowUpMutation = useMutation(api.crm.completeFollowUp);

  // Load interactions (with optional type filter for the server-side query)
  const interactions = useQuery(
    api.crm.listInteractions,
    orgId
      ? {
          organizationId: orgId as Id<"organizations">,
          ...(typeFilter !== "all"
            ? { type: typeFilter as "phone_call" | "email" | "meeting" | "site_visit" | "note" }
            : {}),
          ...(customerFilter !== "all"
            ? { customerId: customerFilter as Id<"customers"> }
            : {}),
        }
      : "skip",
  );

  // Load customers for the filter dropdown and for name resolution
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  const isLoading = !orgId || interactions === undefined || customers === undefined;

  // Build customer name map for name resolution
  const customerNameMap = useMemo(() => {
    if (!customers) return new Map<string, string>();
    return new Map(customers.map((c) => [c._id, c.name]));
  }, [customers]);

  // Enrich interactions with customer names
  const enrichedInteractions = useMemo(() => {
    if (!interactions) return [];
    return interactions.map((i) => ({
      ...i,
      _id: i._id as string,
      customerName: customerNameMap.get(i.customerId) ?? "Unknown Customer",
      customerId: i.customerId as string,
      type: i.type as string,
      direction: i.direction as string | undefined,
      contactId: i.contactId as string | undefined,
    }));
  }, [interactions, customerNameMap]);

  async function handleCompleteFollowUp(interactionId: string) {
    if (!orgId) return;
    try {
      await completeFollowUpMutation({
        interactionId: interactionId as Id<"crmInteractions">,
        organizationId: orgId as Id<"organizations">,
      });
      toast.success("Follow-up marked as completed");
    } catch (err) {
      toast.error("Failed to complete follow-up", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">
            Interactions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Communication log across all customers
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Log Interaction
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as InteractionTypeFilter)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={customerFilter}
          onValueChange={(v) => setCustomerFilter(v)}
        >
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers?.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {enrichedInteractions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">No interactions found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            {typeFilter !== "all" || customerFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Log your first interaction to start building your communication history."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Log Interaction
          </Button>
        </div>
      ) : (
        <InteractionTimeline
          interactions={enrichedInteractions}
          showCustomerName
          onCompleteFollowUp={handleCompleteFollowUp}
        />
      )}

      {/* Dialog */}
      <LogInteractionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
