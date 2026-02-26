"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  PlaneTakeoff,
  Clock,
  User,
  FileText,
  Pen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  type WoStatus,
} from "@/lib/mro-constants";

// ─── Release confirmation card ────────────────────────────────────────────────

interface ReleaseConfirmation {
  workOrderNumber: string;
  aircraftRegistration: string;
  releasedAt: number;
  releasedBy: string;
}

function ReleaseConfirmationCard({ data }: { data: ReleaseConfirmation }) {
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <CardTitle className="text-base font-semibold text-green-400">
            Aircraft Released to Customer
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              Work Order
            </p>
            <p className="text-sm font-mono font-bold text-foreground">
              {data.workOrderNumber}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              Aircraft
            </p>
            <p className="text-sm font-mono font-bold text-foreground">
              {data.aircraftRegistration}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              Released At
            </p>
            <p className="text-sm text-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {formatDateTime(data.releasedAt)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              Released By
            </p>
            <p className="text-sm text-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              {data.releasedBy}
            </p>
          </div>
        </div>

        <Separator className="opacity-30" />

        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={`/work-orders/${data.workOrderNumber}`}>
              <FileText className="w-3.5 h-3.5" />
              View Work Order
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/work-orders">
              <ArrowLeft className="w-3.5 h-3.5" />
              All Work Orders
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReleaseAircraftPage() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const { orgId, techId, tech, isLoaded } = useCurrentOrg();

  const data = useQuery(
    api.workOrders.getWorkOrder,
    orgId && id
      ? { workOrderId: id as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );

  const releaseAircraft = useMutation(api.gapFixes.releaseAircraftToCustomer);

  const [aircraftTotalTime, setAircraftTotalTime] = useState<string>("");
  const [pickupNotes, setPickupNotes] = useState<string>("");
  const [customerSignature, setCustomerSignature] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [released, setReleased] = useState<ReleaseConfirmation | null>(null);

  const isLoading = !isLoaded || data === undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgId || !techId) {
      setError("Organization or technician not loaded.");
      return;
    }
    if (!aircraftTotalTime || isNaN(parseFloat(aircraftTotalTime))) {
      setError("Aircraft total time at release is required.");
      return;
    }

    setSubmitting(true);
    try {
      await releaseAircraft({
        workOrderId: id as Id<"workOrders">,
        releasedByTechnicianId: techId as Id<"technicians">,
        aircraftTotalTimeAtRelease: parseFloat(aircraftTotalTime),
        pickupNotes: pickupNotes || undefined,
        customerSignature: customerSignature || undefined,
      });

      setReleased({
        workOrderNumber: data?.workOrder?.workOrderNumber ?? id,
        aircraftRegistration:
          data?.aircraft?.currentRegistration ?? "Unknown",
        releasedAt: Date.now(),
        releasedBy:
          tech?.legalName ?? tech?.userId ?? "Unknown",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to release aircraft.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-2xl">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-56" />
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Work order not found
        </p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link to="/work-orders">← Back to Work Orders</Link>
        </Button>
      </div>
    );
  }

  const { workOrder: wo, aircraft } = data as {
    workOrder: {
      workOrderNumber: string;
      status: string;
      description?: string;
      customerFacingStatus?: string;
      releasedAt?: number;
    };
    aircraft: {
      currentRegistration?: string;
      make: string;
      model: string;
      totalTimeAirframeHours: number;
    } | null;
  };

  // If already released, show confirmation
  if (released) {
    return (
      <div className="space-y-5 max-w-2xl">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 -ml-2 text-xs text-muted-foreground"
        >
          <Link to={`/work-orders/${id}`}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Order
          </Link>
        </Button>
        <ReleaseConfirmationCard data={released} />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link to={`/work-orders/${id}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Work Order
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <PlaneTakeoff className="w-5 h-5 text-muted-foreground" />
          Release Aircraft to Customer
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Complete customer handoff and document final aircraft state.
        </p>
      </div>

      {/* WO + Aircraft info */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Work Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                Work Order
              </p>
              <p className="font-mono font-bold text-foreground">
                {wo.workOrderNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                Status
              </p>
              <Badge
                variant="outline"
                className={`text-[11px] border ${WO_STATUS_STYLES[wo.status as WoStatus] ?? "bg-muted text-muted-foreground"}`}
              >
                {WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status}
              </Badge>
            </div>
            {aircraft && (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                    Aircraft
                  </p>
                  <p className="font-mono font-bold text-foreground">
                    {aircraft.currentRegistration ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                    Type
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {aircraft.make} {aircraft.model}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                    Current Total Time
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {aircraft.totalTimeAirframeHours.toFixed(1)} hrs
                  </p>
                </div>
              </>
            )}
            {wo.description && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                  Description
                </p>
                <p className="text-sm text-muted-foreground">{wo.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Release form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Pen className="w-4 h-4 text-muted-foreground" />
              Release Details
            </CardTitle>
            <CardDescription className="text-xs">
              All fields with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Aircraft total time at release */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Aircraft Total Time at Release (hours) *
              </Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={aircraftTotalTime}
                onChange={(e) => setAircraftTotalTime(e.target.value)}
                placeholder={
                  aircraft
                    ? `Current: ${aircraft.totalTimeAirframeHours.toFixed(1)}`
                    : "e.g. 2350.5"
                }
                className="h-9 text-sm border-border/60 font-mono"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Record the Hobbs/tach reading at time of customer pickup.
              </p>
            </div>

            {/* Pickup notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Pickup Notes{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
                placeholder="Any notes about pickup, condition, or handoff…"
                className="text-sm border-border/60 resize-none"
                rows={3}
              />
            </div>

            {/* Customer signature */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Customer Signature — Full Name{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="text"
                value={customerSignature}
                onChange={(e) => setCustomerSignature(e.target.value)}
                placeholder="Customer prints full name as signature"
                className="h-9 text-sm border-border/60"
              />
              <p className="text-[10px] text-muted-foreground">
                Customer name typed here serves as their acknowledgment of
                aircraft receipt.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !aircraftTotalTime}
            className="gap-1.5"
          >
            <PlaneTakeoff className="w-3.5 h-3.5" />
            {submitting ? "Releasing…" : "Release Aircraft to Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
