"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, FileText } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  deferred_maintenance: "Deferred Maintenance",
  note: "Note",
  ad_tracking: "AD Tracking",
};

interface DeferredMaintenanceSectionProps {
  aircraftId: Id<"aircraft">;
}

export function DeferredMaintenanceSection({ aircraftId }: DeferredMaintenanceSectionProps) {
  const navigate = useNavigate();
  const items = useQuery(api.carryForwardItems.listByAircraft, { aircraftId });
  const dismissMutation = useMutation(api.carryForwardItems.dismiss);

  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissing, setDismissing] = useState(false);

  if (items === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No deferred items — all clear ✓</p>
          <p className="text-xs text-muted-foreground mt-1">
            Deferred maintenance items from closed work orders will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDismiss = async () => {
    if (!dismissTarget || !dismissReason.trim()) return;
    setDismissing(true);
    try {
      await dismissMutation({
        itemId: dismissTarget as Id<"carryForwardItems">,
        reason: dismissReason.trim(),
      });
      toast.success("Item dismissed");
      setDismissTarget(null);
      setDismissReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss item");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item._id} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${PRIORITY_STYLES[item.priority] ?? ""}`}
                    >
                      {item.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{item.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {/* BUG-QCM-TZ-003: toLocaleDateString() without timeZone uses the
                        browser's local offset. A deferred item logged at 00:15 UTC
                        displays the prior day in UTC-5 — wrong MEL creation date for
                        the technician reviewing what was deferred and when. */}
                    Created {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setDismissTarget(item._id);
                      setDismissReason("");
                    }}
                  >
                    <XCircle className="w-3 h-3" />
                    Dismiss
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() =>
                      navigate(
                        `/billing/quotes/new?aircraftId=${encodeURIComponent(String(aircraftId))}&carryForwardId=${encodeURIComponent(item._id)}`,
                      )
                    }
                  >
                    <FileText className="w-3 h-3" />
                    Add to Quote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={dismissTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDismissTarget(null);
            setDismissReason("");
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Dismiss Deferred Item</DialogTitle>
            <DialogDescription>
              Provide a reason for dismissing this deferred maintenance item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dismiss-reason" className="text-xs font-medium">
              Reason <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="dismiss-reason"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="e.g. Addressed in subsequent WO, no longer applicable..."
              className="text-sm border-border/60 resize-none h-20"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissTarget(null)}
              disabled={dismissing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDismiss}
              disabled={dismissing || !dismissReason.trim()}
            >
              {dismissing ? "Dismissing..." : "Dismiss Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
