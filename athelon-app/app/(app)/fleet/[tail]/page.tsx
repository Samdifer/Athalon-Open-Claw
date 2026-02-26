"use client";

import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Wrench,
  ClipboardList,
  AlertTriangle,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { NotFoundCard } from "@/components/NotFoundCard";

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusStyle(status: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    airworthy: {
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      label: "Airworthy",
    },
    airworthy_with_limitations: {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      label: "Airworthy w/ Limitations",
    },
    grounded_airworthiness: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      label: "Grounded — Airworthiness",
    },
    grounded_registration: {
      color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      label: "Grounded — Registration",
    },
    in_maintenance: {
      color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      label: "In Maintenance",
    },
    aog: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      label: "AOG",
    },
    deregistered: {
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      label: "Deregistered",
    },
  };
  return (
    map[status] ?? {
      color: "bg-muted text-muted-foreground border-border/30",
      label: status,
    }
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AircraftDetailPage() {
  const { tail } = useParams();
  const tailNumber = decodeURIComponent(tail ?? "");

  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  // Update TT dialog state
  const [updateTTOpen, setUpdateTTOpen] = useState(false);
  const [newTT, setNewTT] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [updateTTError, setUpdateTTError] = useState<string | null>(null);
  const [updateTTSubmitting, setUpdateTTSubmitting] = useState(false);

  const updateTotalTime = useMutation(api.gapFixes.updateAircraftTotalTime);

  async function handleUpdateTT(e: React.FormEvent) {
    e.preventDefault();
    if (!aircraft?._id || !newTT || !asOfDate) return;
    setUpdateTTSubmitting(true);
    setUpdateTTError(null);
    try {
      await updateTotalTime({
        aircraftId: aircraft._id,
        totalTimeAirframeHours: parseFloat(newTT),
        asOfDate: new Date(asOfDate).getTime(),
      });
      toast.success("Total time updated successfully");
      setUpdateTTOpen(false);
      setNewTT("");
      setAsOfDate("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update total time";
      setUpdateTTError(msg);
    } finally {
      setUpdateTTSubmitting(false);
    }
  }

  // Load aircraft by tail number
  const aircraft = useQuery(
    api.aircraft.getByTailNumber,
    orgId ? { organizationId: orgId, tailNumber } : "skip",
  );

  // Load fleet list to get denormalized openWorkOrderCount
  const fleetList = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const enrichedAircraft = fleetList?.find(
    (ac) => ac.currentRegistration === tailNumber,
  );

  const isLoading = aircraft === undefined || fleetList === undefined;

  if (!isLoading && aircraft === null) {
    return (
      <NotFoundCard
        message={`Aircraft "${tailNumber}" not found. It may have been removed from the fleet or the registration is incorrect.`}
        backHref="/fleet"
        backLabel="Back to Fleet"
      />
    );
  }

  const openWoCount = enrichedAircraft?.openWorkOrderCount ?? 0;
  const status = aircraft?.status ?? "";
  const style = getStatusStyle(status);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm" className="mt-0.5">
          <Link to="/fleet">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Fleet
          </Link>
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono text-foreground">
                  {aircraft!.currentRegistration}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[11px] border ${style.color}`}
                >
                  {style.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {aircraft!.yearOfManufacture} {aircraft!.make} {aircraft!.model}
                {aircraft!.series ? ` ${aircraft!.series}` : ""} &mdash; S/N{" "}
                {aircraft!.serialNumber}
              </p>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <DetailSkeleton />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      Total Airframe Time
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xl font-bold text-foreground">
                        {aircraft!.totalTimeAirframeHours.toFixed(1)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                        onClick={() => setUpdateTTOpen(true)}
                      >
                        <Pencil className="w-2.5 h-2.5 mr-1" />
                        Update TT
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <ClipboardList className="w-4 h-4 text-sky-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Open Work Orders
                    </p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                      {openWoCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Engine Count
                    </p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                      {aircraft!.engineCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">engines</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Category
                    </p>
                    <p className="text-xl font-bold text-foreground mt-0.5 capitalize">
                      {aircraft!.aircraftCategory}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {aircraft!.experimental ? "experimental" : "certificated"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aircraft Details Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Aircraft Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    Registration
                  </p>
                  <p className="font-mono font-semibold text-sm text-foreground mt-0.5">
                    {aircraft!.currentRegistration}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    Serial Number
                  </p>
                  <p className="font-mono text-sm text-foreground mt-0.5">
                    {aircraft!.serialNumber}
                  </p>
                </div>
                <Separator className="col-span-2 opacity-40" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    Make / Model
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {aircraft!.make} {aircraft!.model}
                    {aircraft!.series ? ` ${aircraft!.series}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    Year of Manufacture
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {aircraft!.yearOfManufacture ?? "—"}
                  </p>
                </div>
                <Separator className="col-span-2 opacity-40" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    Total Airframe Time
                  </p>
                  <p className="font-mono text-sm text-foreground mt-0.5">
                    {aircraft!.totalTimeAirframeHours.toFixed(1)} hrs
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    Time Recorded As Of
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {new Date(
                      aircraft!.totalTimeAirframeAsOfDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button asChild variant="outline" size="sm">
              <Link to={`/work-orders?aircraft=${tailNumber}`}>
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                View Work Orders
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/work-orders/new">
                <Wrench className="w-3.5 h-3.5 mr-1.5" />
                New Work Order
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/fleet/${encodeURIComponent(tailNumber)}/logbook`}>
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Logbook
              </Link>
            </Button>
          </div>

          {/* Maintenance Events Placeholder (Team 2 will add records) */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground" />
                Recent Maintenance Events
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="py-8 text-center">
                <Wrench className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Maintenance record history coming soon
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  Records will appear here once maintenance is logged
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Update Total Time Dialog (GAP-01) ── */}
      <Dialog open={updateTTOpen} onOpenChange={(open) => {
        setUpdateTTOpen(open);
        if (!open) {
          setNewTT("");
          setAsOfDate("");
          setUpdateTTError(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Total Time</DialogTitle>
            <DialogDescription>
              Enter the new total airframe time. Per INV-18, total time may only
              increase.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTT} className="space-y-4">
            <div>
              <Label
                htmlFor="new-tt"
                className="text-xs font-medium mb-1.5 block"
              >
                New Total Time (hours){" "}
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="new-tt"
                type="number"
                step="0.1"
                min="0"
                value={newTT}
                onChange={(e) => setNewTT(e.target.value)}
                placeholder={`Current: ${aircraft?.totalTimeAirframeHours.toFixed(1)}`}
                className="h-9 text-sm bg-muted/30 border-border/60 font-mono"
                required
              />
            </div>
            <div>
              <Label
                htmlFor="as-of-date"
                className="text-xs font-medium mb-1.5 block"
              >
                As of Date <span className="text-red-400">*</span>
              </Label>
              <Input
                id="as-of-date"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="h-9 text-sm bg-muted/30 border-border/60"
                required
              />
            </div>

            {updateTTError && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{updateTTError}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUpdateTTOpen(false)}
                disabled={updateTTSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTTSubmitting || !newTT || !asOfDate}
                className="gap-2"
              >
                {updateTTSubmitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
