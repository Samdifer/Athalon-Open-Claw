import {
  ClipboardList,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Package,
  FileSignature,
  User,
  Info,
} from "lucide-react";

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
};

type AuditEvent = {
  _id: string;
  eventType: string;
  notes?: string | null;
  userId?: string | null;
  timestamp: number;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
};

export function ActivityTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="relative pl-6">
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

          let description = ev.notes ?? config.label;
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
            <div key={String(ev._id)} className="relative flex items-start gap-3">
              <div
                className={`absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}
              >
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs text-foreground">{description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-[11px] text-muted-foreground">
                    {ev.userId ?? "System"}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <time className="font-mono text-[10px] text-muted-foreground/70">
                    {new Date(ev.timestamp).toLocaleString()}
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
