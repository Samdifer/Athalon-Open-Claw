"use client";

import { useState, useEffect } from "react";
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

type InteractionType = "phone_call" | "email" | "meeting" | "site_visit" | "note";
type Direction = "inbound" | "outbound";

const INTERACTION_TYPE_OPTIONS: { value: InteractionType; label: string }[] = [
  { value: "phone_call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site Visit" },
  { value: "note", label: "Note" },
];

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface LogInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function todayISOString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LogInteractionDialog({
  open,
  onOpenChange,
  defaultCustomerId,
}: LogInteractionDialogProps) {
  const { orgId } = useCurrentOrg();
  const logInteraction = useMutation(api.crm.logInteraction);

  // Load customers for the dropdown
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  // Form state
  const [type, setType] = useState<InteractionType>("phone_call");
  const [direction, setDirection] = useState<Direction | "">("");
  const [customerId, setCustomerId] = useState<string>(defaultCustomerId ?? "");
  const [contactId, setContactId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [interactionDate, setInteractionDate] = useState(todayISOString());
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load contacts for selected customer
  const contacts = useQuery(
    api.crm.listContactsForCustomer,
    orgId && customerId
      ? {
          organizationId: orgId as Id<"organizations">,
          customerId: customerId as Id<"customers">,
        }
      : "skip",
  );

  // Update customerId when defaultCustomerId changes
  useEffect(() => {
    if (defaultCustomerId) {
      setCustomerId(defaultCustomerId);
    }
  }, [defaultCustomerId]);

  // Reset form on close
  function resetForm() {
    setType("phone_call");
    setDirection("");
    setCustomerId(defaultCustomerId ?? "");
    setContactId("");
    setSubject("");
    setDescription("");
    setOutcome("");
    setDurationMinutes("");
    setInteractionDate(todayISOString());
    setFollowUpDate("");
  }

  const showDirection = type === "phone_call" || type === "email";
  const showDuration = type === "phone_call" || type === "meeting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !customerId) return;
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const dateTs = new Date(interactionDate + "T12:00:00Z").getTime();
      const followUpTs = followUpDate
        ? new Date(followUpDate + "T12:00:00Z").getTime()
        : undefined;

      await logInteraction({
        organizationId: orgId as Id<"organizations">,
        customerId: customerId as Id<"customers">,
        contactId: contactId
          ? (contactId as Id<"crmContacts">)
          : undefined,
        type,
        direction: showDirection && direction ? (direction as Direction) : undefined,
        subject: subject.trim(),
        description: description.trim() || undefined,
        outcome: outcome.trim() || undefined,
        durationMinutes: showDuration && durationMinutes
          ? parseInt(durationMinutes, 10)
          : undefined,
        interactionDate: dateTs,
        followUpDate: followUpTs,
      });

      toast.success("Interaction logged successfully");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to log interaction", {
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
          <DialogTitle>Log Interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="interaction-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as InteractionType)}
            >
              <SelectTrigger id="interaction-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction (only for phone_call and email) */}
          {showDirection && (
            <div className="space-y-1.5">
              <Label htmlFor="interaction-direction">Direction</Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as Direction | "")}
              >
                <SelectTrigger id="interaction-direction">
                  <SelectValue placeholder="Select direction..." />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="interaction-customer">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                setContactId("");
              }}
            >
              <SelectTrigger id="interaction-customer">
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

          {/* Contact (optional, filtered by customer) */}
          {customerId && contacts && contacts.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="interaction-contact">Contact</Label>
              <Select
                value={contactId}
                onValueChange={(v) => setContactId(v)}
              >
                <SelectTrigger id="interaction-contact">
                  <SelectValue placeholder="Select contact..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts
                    .filter((c) => c.active !== false)
                    .map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.firstName} {c.lastName}
                        {c.title ? ` - ${c.title}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="interaction-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="interaction-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the interaction"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="interaction-description">Description</Label>
            <Textarea
              id="interaction-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed notes..."
              rows={3}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <Label htmlFor="interaction-outcome">Outcome</Label>
            <Input
              id="interaction-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Result or next steps"
            />
          </div>

          {/* Duration + Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showDuration && (
              <div className="space-y-1.5">
                <Label htmlFor="interaction-duration">Duration (minutes)</Label>
                <Input
                  id="interaction-duration"
                  type="number"
                  min={0}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="30"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="interaction-date">
                Interaction Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="interaction-date"
                type="date"
                value={interactionDate}
                onChange={(e) => setInteractionDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Follow-up Date */}
          <div className="space-y-1.5">
            <Label htmlFor="interaction-followup">Follow-up Date</Label>
            <Input
              id="interaction-followup"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
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
              {isSubmitting ? "Logging..." : "Log Interaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
