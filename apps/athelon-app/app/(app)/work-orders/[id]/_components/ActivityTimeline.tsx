import {
  ClipboardList,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Package,
  FileSignature,
  User,
  Info,
  FileText,
  Wrench,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const EVENT_CONFIG: Record<string, { icon: typeof Info; color: string; label: string }> = {
  record_created: { icon: ClipboardList, color: "text-blue-500 bg-blue-500/10", label: "Created" },
  status_changed: { icon: RefreshCw, color: "text-amber-500 bg-amber-500/10", label: "Status Changed" },
  record_updated: { icon: Info, color: "text-muted-foreground bg-muted", label: "Updated" },
  record_signed: { icon: FileSignature, color: "text-green-500 bg-green-500/10", label: "Signed" },
  technician_signed: { icon: FileSignature, color: "text-green-500 bg-green-500/10", label: "Tech Signed" },
  part_installed: { icon: Package, color: "text-primary bg-primary/10", label: "Part Installed" },
  part_removed: { icon: Package, color: "text-orange-500 bg-orange-500/10", label: "Part Removed" },
  correction_created: { icon: AlertTriangle, color: "text-red-500 bg-red-500/10", label: "Correction" },
  qcm_reviewed: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", label: "QCM Review" },
  discrepancy_writeup: { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10", label: "Description Updated" },
  corrective_action: { icon: Wrench, color: "text-green-600 bg-green-500/10", label: "Corrective Action Updated" },
  note: { icon: FileText, color: "text-blue-500 bg-blue-500/10", label: "Note Added" },
  status_change: { icon: RefreshCw, color: "text-indigo-500 bg-indigo-500/10", label: "Status Note Added" },
};

export type ActivityTimelineEvent = {
  _id: string;
  eventType: string;
  headline?: string | null;
  notes?: string | null;
  actorName?: string | null;
  entityLabel?: string | null;
  userId?: string | null;
  timestamp: number;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  description: "Description",
  correctiveAction: "Corrective Action",
  discrepancySummary: "Task Discrepancy Summary",
  correctiveActionSummary: "Task Corrective Action Summary",
  stepDiscrepancySummary: "Step Discrepancy Summary",
  stepCorrectiveActionSummary: "Step Corrective Action Summary",
  returnToServiceStatement: "Return-to-Service Statement",
  inspectorNotes: "Inspector Sign-Off Notes",
  handoffNotes: "Shift Handoff Notes",
  notes: "Sign-Off Notes",
  naReason: "N/A Reason",
  note: "Note",
  statusNote: "Status Note",
};

function formatFieldLabel(fieldName: string): string {
  return (
    FIELD_LABELS[fieldName] ??
    fieldName
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (segment) => segment.toUpperCase())
  );
}

function formatHistoryValue(value?: string | null): string | null {
  if (value === undefined || value === null) return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed === null || parsed === "") return "Empty";
    if (typeof parsed === "string") return parsed;
    if (typeof parsed === "number" || typeof parsed === "boolean") return String(parsed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export function ActivityTimeline({
  events,
  testId,
}: {
  events: ActivityTimelineEvent[];
  testId?: string;
}) {
  if (events.length === 0) {
    return (
      <div
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid={testId}
      >
        No activity recorded yet.
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="relative pl-6" data-testid={testId}>
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4">
        {sorted.map((ev) => {
          const config = EVENT_CONFIG[ev.eventType] ?? {
            icon: Info,
            color: "text-muted-foreground bg-muted",
            label: ev.eventType.replace(/_/g, " "),
          };
          const Icon = config.icon;

          const headline = ev.headline ?? config.label;
          const actorName = ev.actorName
            ? ev.actorName
            : ev.userId
              ? ev.userId.startsWith("user_")
                ? "Staff Member"
                : ev.userId
              : "System";
          const oldValue = formatHistoryValue(ev.oldValue);
          const newValue = formatHistoryValue(ev.newValue);

          let description = ev.notes ?? headline;
          if (ev.eventType === "status_changed" && ev.oldValue && ev.newValue) {
            try {
              const from = JSON.parse(ev.oldValue);
              const to = JSON.parse(ev.newValue);
              description = `Status: ${from} → ${to}`;
            } catch {
              // keep default
            }
          }

          return (
            <div
              key={String(ev._id)}
              className="relative flex items-start gap-3"
              data-testid={testId ? `${testId}-item` : undefined}
            >
              <div
                className={`absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}
              >
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {ev.entityLabel ? (
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full border-border/60 bg-muted/30 px-2 text-[10px] font-medium text-muted-foreground"
                    >
                      {ev.entityLabel}
                    </Badge>
                  ) : null}
                  <p className="text-xs font-medium text-foreground">{headline}</p>
                </div>
                {description && description !== headline ? (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {description}
                  </p>
                ) : null}
                {ev.fieldName && (oldValue !== null || newValue !== null) ? (
                  <div className="mt-2 rounded-md border border-border/50 bg-muted/20 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {formatFieldLabel(ev.fieldName)}
                    </p>
                    {oldValue !== null ? (
                      <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap">
                        <span className="font-medium text-foreground/80">From:</span> {oldValue}
                      </p>
                    ) : null}
                    {newValue !== null ? (
                      <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap">
                        <span className="font-medium text-foreground/80">To:</span> {newValue}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-[11px] text-muted-foreground">
                    {actorName}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <time className="font-mono text-[10px] text-muted-foreground/70">
                    {/* BUG-LT-076: ActivityTimeline used raw toLocaleString() which
                        applies the browser's default locale and timezone. All other
                        timestamps in the WO detail page use formatDateTime() from
                        @/lib/format — an en-US fixed-locale formatter. A tech on a
                        French or German browser locale would see activity timestamps
                        in a different format from every other date on the page. More
                        importantly, toLocaleString() is inconsistent across OS/browser
                        combinations for the same timezone. Using formatDateTime() ensures
                        all timestamps in the maintenance record use the same formatter. */}
                    {formatDateTime(ev.timestamp)}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
