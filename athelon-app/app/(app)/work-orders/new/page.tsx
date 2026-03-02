"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/useRouter";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Plane, AlertCircle, Loader2, Users, Calendar, Clock } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WO_TYPES, PRIORITY_OPTIONS, type WoType } from "@/lib/mro-constants";

const NO_CUSTOMER_VALUE = "__no_customer__";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewWorkOrderPage() {
  const router = useRouter();
  const { orgId, isLoaded: orgLoaded } = useCurrentOrg();

  // Form state
  const [aircraftId, setAircraftId] = useState<Id<"aircraft"> | "">("");
  const [customerId, setCustomerId] = useState<Id<"customers"> | "">("");
  const [workOrderType, setWorkOrderType] = useState<string>("routine");
  const [description, setDescription] = useState("");
  const [squawks, setSquawks] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "aog">(
    "routine",
  );
  const [notes, setNotes] = useState("");
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState("");
  const [estimatedLaborHours, setEstimatedLaborHours] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch aircraft for this org
  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Fetch customers for this org
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );

  const createWorkOrder = useMutation(api.workOrders.createWorkOrder);

  const isLoading = !orgLoaded || aircraft === undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !aircraftId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const woId = await createWorkOrder({
        organizationId: orgId,
        aircraftId: aircraftId as Id<"aircraft">,
        workOrderType: workOrderType as WoType,
        description: description.trim(),
        squawks: squawks.trim() || undefined,
        priority,
        notes: notes.trim() || undefined,
        customerId: customerId ? (customerId as Id<"customers">) : undefined,
        promisedDeliveryDate: promisedDeliveryDate
          ? new Date(promisedDeliveryDate).getTime()
          : undefined,
        estimatedLaborHoursOverride: estimatedLaborHours
          ? Math.max(0, parseFloat(estimatedLaborHours) || 0) || undefined
          : undefined,
      });

      router.push(`/work-orders/${woId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create work order",
      );
      setIsSubmitting(false);
    }
  }

  const selectedAircraft = aircraft?.find((ac) => ac._id === aircraftId);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 -ml-2 mb-3 text-xs text-muted-foreground"
        >
          <Link to="/work-orders">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Orders
          </Link>
        </Button>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
          New Work Order
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Creates a work order in Draft status. Open it after selecting
          technicians.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Aircraft */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5" />
                Aircraft
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label
                  htmlFor="aircraft"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Aircraft <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                {aircraft && aircraft.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border border-border/60">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-muted-foreground">
                      No aircraft registered. Add aircraft in Fleet first.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={aircraftId}
                    onValueChange={(v) =>
                      setAircraftId(v as Id<"aircraft">)
                    }
                    required
                  >
                    <SelectTrigger
                      id="aircraft"
                      className="h-9 text-sm bg-muted/30 border-border/60"
                    >
                      <SelectValue placeholder="Select aircraft..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aircraft?.map((ac) => (
                        <SelectItem key={ac._id} value={ac._id}>
                          <span className="font-mono font-semibold">
                            {ac.currentRegistration}
                          </span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {ac.make} {ac.model} · S/N {ac.serialNumber}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Aircraft quick info */}
                {selectedAircraft && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border/40"
                    >
                      {selectedAircraft.status}
                    </Badge>
                    <span>
                      {selectedAircraft.totalTimeAirframeHours.toFixed(1)}h TT
                    </span>
                    {selectedAircraft.openWorkOrderCount > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">
                        {selectedAircraft.openWorkOrderCount} open WO
                        {selectedAircraft.openWorkOrderCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label
                  htmlFor="customer"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Customer{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                {customers === undefined ? (
                  <div className="h-9 bg-muted/30 border border-border/60 rounded-md animate-pulse" />
                ) : customers.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border border-border/60">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-muted-foreground">
                      No customers yet. Add customers in Billing → Customers.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={customerId}
                    onValueChange={(v) =>
                      setCustomerId(
                        v === NO_CUSTOMER_VALUE ? "" : (v as Id<"customers">),
                      )
                    }
                  >
                    <SelectTrigger
                      id="customer"
                      className="h-9 text-sm bg-muted/30 border-border/60"
                    >
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CUSTOMER_VALUE}>
                        <span className="text-muted-foreground">— No customer —</span>
                      </SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          <span className="font-medium">{c.name}</span>
                          {c.companyName && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {c.companyName}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Work Order Details */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Work Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* WO Number */}
              <div>
                <Label
                  htmlFor="workOrderNumber"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Work Order Number
                </Label>
                <div
                  id="workOrderNumber"
                  className="h-9 text-sm bg-muted/30 border border-border/60 rounded-md px-3 flex items-center font-mono text-muted-foreground"
                >
                  Auto-generated on create
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Format: {"WO-{BASE}-{SEQUENCE}"} (example: {"WO-DEN-1"}).
                </p>
              </div>

              {/* Type */}
              <div>
                <Label
                  htmlFor="type"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Work Order Type <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Select
                  value={workOrderType}
                  onValueChange={setWorkOrderType}
                  required
                >
                  <SelectTrigger
                    id="type"
                    className="h-9 text-sm bg-muted/30 border-border/60"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WO_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label
                  htmlFor="description"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Description <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the work to be performed..."
                  required
                  rows={3}
                  className="text-sm bg-muted/30 border-border/60 resize-none"
                />
              </div>

              {/* Pilot-Reported Squawks */}
              <div>
                <Label
                  htmlFor="squawks"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Pilot-Reported Squawks{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="squawks"
                  value={squawks}
                  onChange={(e) => setSquawks(e.target.value)}
                  placeholder="Any pilot-reported issues at intake..."
                  rows={2}
                  className="text-sm bg-muted/30 border-border/60 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Priority */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    priority === opt.value
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/40 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={opt.value}
                    checked={priority === opt.value}
                    onChange={() => setPriority(opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      priority === opt.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {priority === opt.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        priority === opt.value
                          ? opt.color
                          : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {opt.description}
                    </div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Scheduling{" "}
                <span className="text-muted-foreground font-normal normal-case">
                  (optional)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label
                  htmlFor="promisedDeliveryDate"
                  className="text-xs font-medium mb-1.5 block"
                >
                  Promised Delivery Date
                </Label>
                <Input
                  id="promisedDeliveryDate"
                  type="date"
                  value={promisedDeliveryDate}
                  onChange={(e) => setPromisedDeliveryDate(e.target.value)}
                  className="h-9 text-sm bg-muted/30 border-border/60"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  The customer-committed return date. Used for schedule risk tracking.
                </p>
              </div>
              <div>
                <Label
                  htmlFor="estimatedLaborHours"
                  className="text-xs font-medium mb-1.5 flex items-center gap-1.5"
                >
                  <Clock className="w-3 h-3" />
                  Estimated Labor Hours
                </Label>
                <Input
                  id="estimatedLaborHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedLaborHours}
                  onChange={(e) => setEstimatedLaborHours(e.target.value)}
                  placeholder="e.g. 16.0"
                  className="h-9 text-sm bg-muted/30 border-border/60"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Top-level estimate. Leave blank to auto-sum from task card estimates as they are created.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Internal Notes{" "}
                <span className="text-muted-foreground font-normal normal-case">
                  (optional)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes for this work order..."
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
              />
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-md border border-red-500/30 bg-red-500/5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !aircraftId ||
                !description.trim()
              }
              className="gap-2"
            >
              {isSubmitting && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              Create Work Order
            </Button>
            <Button asChild variant="ghost" size="sm" disabled={isSubmitting}>
              <Link to="/work-orders">Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
