/**
 * WorkOrderFindingsPanel — Shows linked AD/SB/Predicted findings on a work order
 * detail page. Includes quick link/unlink actions guarded by RBAC.
 *
 * Drop this component into any work order detail view:
 *   <WorkOrderFindingsPanel workOrderId={wo._id} />
 */

import { useState } from "react";
import {
  ShieldAlert,
  FileWarning,
  TrendingUp,
  Link2,
  Unlink,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { useRbac } from "@/hooks/useRbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import type { FindingSource, FindingSeverity, LinkedFindingSummary } from "./types";
import { useLinkedFindings, useUnlinkFinding } from "./api";

// ─── Style maps ──────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const SOURCE_ICONS: Record<FindingSource, typeof ShieldAlert> = {
  ad: ShieldAlert,
  sb: FileWarning,
  predicted: TrendingUp,
};

const SOURCE_SHORT: Record<FindingSource, string> = {
  ad: "AD",
  sb: "SB",
  predicted: "Predicted",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface WorkOrderFindingsPanelProps {
  workOrderId: Id<"workOrders">;
}

export function WorkOrderFindingsPanel({ workOrderId }: WorkOrderFindingsPanelProps) {
  const { isAdmin, isManager, isInspector } = useRbac();
  const canManage = isAdmin || isManager || isInspector;

  const findings = useLinkedFindings(workOrderId);
  const unlinkMutation = useUnlinkFinding();

  const [unlinkTarget, setUnlinkTarget] = useState<LinkedFindingSummary | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      await unlinkMutation(unlinkTarget._id, workOrderId);
      setUnlinkTarget(null);
    } catch (err) {
      console.error("Unlink failed:", err);
    } finally {
      setUnlinking(false);
    }
  };

  // Loading state
  if (findings === undefined) {
    return (
      <Card className="border-border/60" data-testid="wo-findings-loading">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Linked Findings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60" data-testid="wo-findings-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Linked Findings
            {findings.length > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {findings.length}
              </Badge>
            )}
          </CardTitle>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              asChild
              data-testid="wo-findings-manage"
            >
              <a href="/maintenance/unaccounted">
                <Plus className="w-3 h-3" />
                Manage
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <div className="text-center py-6" data-testid="wo-findings-empty">
            <AlertTriangle className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No findings linked to this work order</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {findings.map((finding) => {
              const SourceIcon = SOURCE_ICONS[finding.source];
              return (
                <div
                  key={finding._id}
                  className="flex items-center gap-2.5 p-2.5 rounded bg-muted/20 hover:bg-muted/30 transition-colors"
                  data-testid={`wo-finding-${finding._id}`}
                >
                  <SourceIcon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      finding.source === "ad"
                        ? "text-red-400"
                        : finding.source === "sb"
                          ? "text-blue-400"
                          : "text-purple-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-medium text-foreground">
                        {finding.referenceNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-medium border ${SEVERITY_STYLES[finding.severity]}`}
                      >
                        {finding.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-border/40">
                        {SOURCE_SHORT[finding.source]}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {finding.title}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title="Unlink finding"
                      onClick={() => setUnlinkTarget(finding)}
                      data-testid={`unlink-finding-${finding._id}`}
                    >
                      <Unlink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Unlink confirmation */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent data-testid="unlink-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Unlink Finding?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Remove the association between{" "}
              <span className="font-mono font-medium">{unlinkTarget?.referenceNumber}</span>{" "}
              and this work order. The finding will return to the unaccounted queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="text-xs bg-destructive hover:bg-destructive/90"
              data-testid="unlink-confirm-submit"
            >
              {unlinking ? "Unlinking…" : "Unlink Finding"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
