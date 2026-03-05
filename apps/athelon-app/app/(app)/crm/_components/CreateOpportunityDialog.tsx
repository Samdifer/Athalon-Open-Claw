"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

type OpportunityStage = "prospecting" | "qualification" | "proposal" | "negotiation";
type OpportunitySource =
  | "prediction"
  | "referral"
  | "walk_in"
  | "phone"
  | "website"
  | "trade_show"
  | "existing_customer"
  | "other";

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = [
  { value: "prospecting", label: "Prospecting" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

const SOURCE_OPTIONS: { value: OpportunitySource; label: string }[] = [
  { value: "prediction", label: "Prediction" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "website", label: "Website" },
  { value: "trade_show", label: "Trade Show" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "other", label: "Other" },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateOpportunityDialog({
  open,
  onOpenChange,
}: CreateOpportunityDialogProps) {
  const { orgId } = useCurrentOrg();
  const createOpportunity = useMutation(api.crm.createOpportunity);

  // Load customers for dropdown
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  // Form state
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [aircraftId, setAircraftId] = useState<string>("");
  const [stage, setStage] = useState<OpportunityStage>("prospecting");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [estimatedLaborHours, setEstimatedLaborHours] = useState("");
  const [probability, setProbability] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [source, setSource] = useState<OpportunitySource | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load aircraft for the selected customer
  const aircraft = useQuery(
    api.billingV4.listAircraftForCustomer,
    orgId && customerId
      ? {
          organizationId: orgId as Id<"organizations">,
          customerId: customerId as Id<"customers">,
        }
      : "skip",
  );

  function resetForm() {
    setTitle("");
    setCustomerId("");
    setAircraftId("");
    setStage("prospecting");
    setEstimatedValue("");
    setEstimatedLaborHours("");
    setProbability("");
    setExpectedCloseDate("");
    setSource("");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !customerId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const valueNum = parseFloat(estimatedValue);
    if (isNaN(valueNum) || valueNum < 0) {
      toast.error("Estimated value must be a valid positive number");
      return;
    }

    const probNum = probability ? parseFloat(probability) : undefined;
    if (probNum !== undefined && (probNum < 0 || probNum > 100)) {
      toast.error("Probability must be between 0 and 100");
      return;
    }

    setIsSubmitting(true);
    try {
      const closeDateTs = expectedCloseDate
        ? new Date(expectedCloseDate + "T12:00:00Z").getTime()
        : undefined;

      await createOpportunity({
        organizationId: orgId as Id<"organizations">,
        customerId: customerId as Id<"customers">,
        aircraftId: aircraftId ? (aircraftId as Id<"aircraft">) : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        stage,
        estimatedValue: valueNum,
        estimatedLaborHours: estimatedLaborHours
          ? parseFloat(estimatedLaborHours)
          : undefined,
        probability: probNum,
        expectedCloseDate: closeDateTs,
        source: source || undefined,
      });

      toast.success("Opportunity created successfully");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create opportunity", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="opp-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="opp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opportunity title"
              required
            />
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="opp-customer">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                setAircraftId("");
              }}
            >
              <SelectTrigger id="opp-customer">
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aircraft (optional, filtered by customer) */}
          {customerId && aircraft && aircraft.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="opp-aircraft">Aircraft</Label>
              <Select
                value={aircraftId}
                onValueChange={(v) => setAircraftId(v)}
              >
                <SelectTrigger id="opp-aircraft">
                  <SelectValue placeholder="Select aircraft..." />
                </SelectTrigger>
                <SelectContent>
                  {aircraft.map((ac) => (
                    <SelectItem key={ac._id} value={ac._id}>
                      {ac.currentRegistration ?? (`${ac.make ?? ""} ${ac.model ?? ""}`.trim() || "Unknown Aircraft")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stage */}
          <div className="space-y-1.5">
            <Label htmlFor="opp-stage">
              Stage <span className="text-destructive">*</span>
            </Label>
            <Select
              value={stage}
              onValueChange={(v) => setStage(v as OpportunityStage)}
            >
              <SelectTrigger id="opp-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Value + Labor Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="opp-value">
                Estimated Value ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="opp-value"
                type="number"
                min={0}
                step="0.01"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="10000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-labor-hours">Est. Labor Hours</Label>
              <Input
                id="opp-labor-hours"
                type="number"
                min={0}
                value={estimatedLaborHours}
                onChange={(e) => setEstimatedLaborHours(e.target.value)}
                placeholder="40"
              />
            </div>
          </div>

          {/* Probability + Expected Close Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="opp-probability">Probability (%)</Label>
              <Input
                id="opp-probability"
                type="number"
                min={0}
                max={100}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-close-date">Expected Close Date</Label>
              <Input
                id="opp-close-date"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="opp-source">Source</Label>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as OpportunitySource)}
            >
              <SelectTrigger id="opp-source">
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="opp-description">Description</Label>
            <Textarea
              id="opp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !orgId || !customerId}
            >
              {isSubmitting ? "Creating..." : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
