"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Phone,
  Mail,
  Users,
  MapPin,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InteractionEntry {
  _id: string;
  type: string;
  direction?: string;
  subject: string;
  description?: string;
  outcome?: string;
  durationMinutes?: number;
  interactionDate: number;
  followUpDate?: number;
  followUpCompleted?: boolean;
  createdByName?: string;
  contactId?: string;
  customerId?: string;
  customerName?: string;
}

export interface InteractionTimelineProps {
  interactions: InteractionEntry[];
  customerName?: string;
  showCustomerName?: boolean;
  onCompleteFollowUp?: (interactionId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Phone; label: string; color: string; bgColor: string }
> = {
  phone_call: {
    icon: Phone,
    label: "Phone Call",
    color: "text-blue-500",
    bgColor: "bg-blue-500/15 border-blue-500/30",
  },
  email: {
    icon: Mail,
    label: "Email",
    color: "text-purple-500",
    bgColor: "bg-purple-500/15 border-purple-500/30",
  },
  meeting: {
    icon: Users,
    label: "Meeting",
    color: "text-amber-500",
    bgColor: "bg-amber-500/15 border-amber-500/30",
  },
  site_visit: {
    icon: MapPin,
    label: "Site Visit",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/15 border-emerald-500/30",
  },
  note: {
    icon: FileText,
    label: "Note",
    color: "text-gray-500",
    bgColor: "bg-gray-500/15 border-gray-500/30",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatDayKey(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getFollowUpStatus(
  followUpDate?: number,
  followUpCompleted?: boolean,
): "overdue" | "pending" | "completed" | null {
  if (!followUpDate) return null;
  if (followUpCompleted) return "completed";
  if (followUpDate < Date.now()) return "overdue";
  return "pending";
}

// ─── Single Entry ────────────────────────────────────────────────────────────

function TimelineEntry({
  interaction,
  showCustomerName,
  onCompleteFollowUp,
}: {
  interaction: InteractionEntry;
  showCustomerName?: boolean;
  onCompleteFollowUp?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[interaction.type] ?? TYPE_CONFIG.note;
  const Icon = config.icon;
  const followUpStatus = getFollowUpStatus(
    interaction.followUpDate,
    interaction.followUpCompleted,
  );

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0 group">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-9 bottom-0 w-px bg-border group-last:hidden" />

      {/* Icon circle */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center w-9 h-9 rounded-full border shrink-0",
          config.bgColor,
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">
              {interaction.subject}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              {showCustomerName && interaction.customerName && (
                <Link
                  to={`/crm/accounts/${interaction.customerId}`}
                  className="text-xs text-primary hover:underline"
                >
                  {interaction.customerName}
                </Link>
              )}
              {interaction.createdByName && (
                <span className="text-xs text-muted-foreground">
                  by {interaction.createdByName}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(interaction.interactionDate)}
          </span>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[11px]", config.bgColor)}>
            {config.label}
          </Badge>
          {interaction.direction && (
            <Badge
              variant="outline"
              className={cn(
                "text-[11px]",
                interaction.direction === "inbound"
                  ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
                  : "bg-orange-500/10 text-orange-600 border-orange-500/30",
              )}
            >
              {interaction.direction === "inbound" ? "Inbound" : "Outbound"}
            </Badge>
          )}
          {interaction.durationMinutes != null && interaction.durationMinutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {interaction.durationMinutes} min
            </span>
          )}
          {interaction.outcome && (
            <span className="text-xs text-muted-foreground italic truncate max-w-[180px]">
              Outcome: {interaction.outcome}
            </span>
          )}
        </div>

        {/* Description (expandable) */}
        {interaction.description && (
          <div>
            <p
              className={cn(
                "text-xs text-muted-foreground",
                !expanded && "line-clamp-2",
              )}
            >
              {interaction.description}
            </p>
            {interaction.description.length > 120 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Follow-up row */}
        {followUpStatus && interaction.followUpDate && (
          <div
            className={cn(
              "flex items-center gap-2 text-xs rounded-md px-2 py-1 mt-1",
              followUpStatus === "overdue" && "bg-red-500/10 text-red-600",
              followUpStatus === "pending" && "bg-amber-500/10 text-amber-600",
              followUpStatus === "completed" && "bg-emerald-500/10 text-emerald-600",
            )}
          >
            {followUpStatus === "completed" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <Calendar className="w-3 h-3" />
            <span>
              Follow-up {followUpStatus === "completed" ? "completed" : formatDate(interaction.followUpDate)}
              {followUpStatus === "overdue" && " (overdue)"}
            </span>
            {followUpStatus !== "completed" && onCompleteFollowUp && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[11px] ml-auto"
                onClick={() => onCompleteFollowUp(interaction._id)}
              >
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                Complete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InteractionTimeline({
  interactions,
  customerName,
  showCustomerName,
  onCompleteFollowUp,
}: InteractionTimelineProps) {
  // Group interactions by day
  const grouped: Array<{ dateLabel: string; items: InteractionEntry[] }> = [];
  let currentDayKey = "";

  for (const interaction of interactions) {
    const dayKey = formatDayKey(interaction.interactionDate);
    if (dayKey !== currentDayKey) {
      grouped.push({ dateLabel: dayKey, items: [] });
      currentDayKey = dayKey;
    }
    grouped[grouped.length - 1].items.push({
      ...interaction,
      customerName: interaction.customerName ?? customerName,
    });
  }

  if (interactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.dateLabel}>
          {/* Date separator */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {group.dateLabel}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Entries */}
          <div>
            {group.items.map((interaction) => (
              <TimelineEntry
                key={interaction._id}
                interaction={interaction}
                showCustomerName={showCustomerName}
                onCompleteFollowUp={onCompleteFollowUp}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
