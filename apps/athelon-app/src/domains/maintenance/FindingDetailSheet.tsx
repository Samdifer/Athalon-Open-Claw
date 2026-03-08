/**
 * FindingDetailSheet — Slide-over panel showing full finding details and actions.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  Link2,
  Plus,
  Clock,
  Pause,
  XCircle,
  Plane,
  ShieldAlert,
  FileWarning,
  TrendingUp,
  Calendar,
  Gauge,
  User,
  FileText,
} from "lucide-react";
import type { UnaccountedFinding, FindingSource, FindingSeverity, FindingStatus } from "./types";

// ─── Style maps ──────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const STATUS_STYLES: Record<FindingStatus, string> = {
  open: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  triaged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  linked: "bg-green-500/15 text-green-400 border-green-500/30",
  deferred: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  dismissed: "bg-gray-500/15 text-gray-500 border-gray-500/30",
};

const STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  linked: "Linked",
  deferred: "Deferred",
  dismissed: "Dismissed",
};

const SOURCE_LABELS: Record<FindingSource, string> = {
  ad: "Airworthiness Directive",
  sb: "Service Bulletin",
  predicted: "Predictive Maintenance",
};

const SOURCE_ICONS: Record<FindingSource, typeof ShieldAlert> = {
  ad: ShieldAlert,
  sb: FileWarning,
  predicted: TrendingUp,
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FindingDetailSheetProps {
  finding: UnaccountedFinding | null;
  canTriage: boolean;
  onClose: () => void;
  onTriage: (f: UnaccountedFinding) => void;
  onLink: (f: UnaccountedFinding) => void;
  onCreateWO: (f: UnaccountedFinding) => void;
  onDefer: (f: UnaccountedFinding) => void;
  onDismiss: (f: UnaccountedFinding) => void;
}

export function FindingDetailSheet({
  finding,
  canTriage,
  onClose,
  onTriage,
  onLink,
  onCreateWO,
  onDefer,
  onDismiss,
}: FindingDetailSheetProps) {
  if (!finding) return null;

  const SourceIcon = SOURCE_ICONS[finding.source];

  return (
    <Sheet open={!!finding} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="finding-detail-sheet">
        <SheetHeader>
          <SheetTitle className="text-sm flex items-center gap-2">
            <SourceIcon className="w-4 h-4" />
            {finding.referenceNumber}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {SOURCE_LABELS[finding.source]}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-medium border ${SEVERITY_STYLES[finding.severity]}`}
            >
              {finding.severity.toUpperCase()}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium border ${STATUS_STYLES[finding.status]}`}
            >
              {STATUS_LABELS[finding.status]}
            </Badge>
            {finding.linkedWorkOrderNumber && (
              <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] gap-1">
                <Link2 className="w-3 h-3" />
                {finding.linkedWorkOrderNumber}
              </Badge>
            )}
          </div>

          {/* Title & description */}
          <div>
            <h3 className="text-sm font-medium text-foreground">{finding.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {finding.description}
            </p>
          </div>

          <Separator className="opacity-50" />

          {/* Aircraft */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              Aircraft
            </h4>
            <div className="bg-muted/30 rounded p-2.5">
              <p className="text-sm font-mono font-medium text-foreground">
                {finding.aircraftRegistration}
              </p>
              <p className="text-xs text-muted-foreground">{finding.aircraftType}</p>
            </div>
          </div>

          {/* Due dates */}
          {(finding.dueDate || finding.dueHours) && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Due
              </h4>
              <div className="bg-muted/30 rounded p-2.5 space-y-1">
                {finding.dueDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-xs ${finding.dueDate < Date.now() ? "text-red-400 font-medium" : "text-foreground"}`}>
                      {formatDate(finding.dueDate)}
                      {finding.dueDate < Date.now() && " (OVERDUE)"}
                    </span>
                  </div>
                )}
                {finding.dueHours && (
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-foreground">
                      {finding.dueHours.toLocaleString()} flight hours
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Triage info */}
          {finding.triagedBy && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Triage
              </h4>
              <div className="bg-muted/30 rounded p-2.5 space-y-1">
                <p className="text-xs text-foreground">
                  Triaged by <span className="font-medium">{finding.triagedBy}</span>
                  {finding.triagedAt && ` on ${formatDate(finding.triagedAt)}`}
                </p>
                {finding.triageNotes && (
                  <p className="text-xs text-muted-foreground italic">
                    "{finding.triageNotes}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Defer/dismiss info */}
          {finding.deferredReason && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Deferred
              </h4>
              <div className="bg-muted/30 rounded p-2.5">
                <p className="text-xs text-muted-foreground">{finding.deferredReason}</p>
                {finding.deferredUntil && (
                  <p className="text-xs text-foreground mt-1">
                    Until: {formatDate(finding.deferredUntil)}
                  </p>
                )}
              </div>
            </div>
          )}
          {finding.dismissedReason && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Dismissed
              </h4>
              <div className="bg-muted/30 rounded p-2.5">
                <p className="text-xs text-muted-foreground">{finding.dismissedReason}</p>
                {finding.dismissedBy && (
                  <p className="text-xs text-foreground mt-1">
                    By {finding.dismissedBy}
                    {finding.dismissedAt && ` on ${formatDate(finding.dismissedAt)}`}
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Actions */}
          {canTriage && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground">Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                {finding.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 justify-start"
                    onClick={() => onTriage(finding)}
                    data-testid="detail-triage"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Triage
                  </Button>
                )}
                {!finding.linkedWorkOrderId && finding.status !== "dismissed" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 justify-start"
                      onClick={() => onLink(finding)}
                      data-testid="detail-link-wo"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Link to WO
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 justify-start"
                      onClick={() => onCreateWO(finding)}
                      data-testid="detail-create-wo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create WO
                    </Button>
                  </>
                )}
                {finding.status !== "dismissed" && finding.status !== "deferred" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 justify-start"
                    onClick={() => onDefer(finding)}
                    data-testid="detail-defer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Defer
                  </Button>
                )}
                {finding.status !== "dismissed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 justify-start text-destructive hover:text-destructive"
                    onClick={() => onDismiss(finding)}
                    data-testid="detail-dismiss"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-[10px] text-muted-foreground/60 pt-2">
            <p>Created: {formatDate(finding.createdAt)}</p>
            {finding.updatedAt && <p>Updated: {formatDate(finding.updatedAt)}</p>}
            <p className="font-mono mt-0.5">ID: {finding._id}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
