"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { formatDate } from "@/lib/format";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  PackageSearch,
  Wrench,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

// ─── Local Types (mirrors convex/inventoryAlerts.ts return shapes) ────────────

interface ReorderAlertItem {
  partNumber: string;
  partName: string;
  currentStock: number;
  reorderPoint: number | undefined;
  minStockLevel: number | undefined;
  threshold: number;
  thresholdSource: "reorder_point" | "min_stock";
  deficit: number;
  severity: "critical" | "warning";
}

interface CalibrationAlertItem {
  _id: string;
  toolNumber: string;
  description: string;
  category: string;
  lastCalibrationDate: number | undefined;
  nextCalibrationDue: number;
  daysRemaining: number;
  status: string;
  location: string | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLabel(days: number): string {
  if (days <= 0) return "Expired";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function locationLabel(loc: string): string {
  return loc.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryLabel(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Shelf Life Section ───────────────────────────────────────────────────────

interface ShelfLifeAlertItem {
  _id: string;
  type: string;
  partNumber: string;
  partName: string;
  expiryDate: number;
  daysRemaining: number;
  location: string;
  band: string;
}

function ShelfLifeBandSection({
  title,
  items,
  colorClass,
  borderClass,
}: {
  title: string;
  items: Array<ShelfLifeAlertItem>;
  colorClass: string;
  borderClass: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={borderClass}>
          {title} ({items.length})
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part Number</TableHead>
            <TableHead>Part Name</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Days Remaining</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item._id}>
              <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
              <TableCell>{item.partName}</TableCell>
              <TableCell>{formatDate(item.expiryDate)}</TableCell>
              <TableCell>
                <span className={colorClass}>{daysLabel(item.daysRemaining)}</span>
              </TableCell>
              <TableCell>{locationLabel(item.location)}</TableCell>
              {/* BUG-HUNT-113: Pre-fill part number in PO link so the clerk
                  doesn't have to re-type it from the alert row */}
              <TableCell className="text-right">
                {item.daysRemaining <= 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    Quarantine
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/billing/purchase-orders/new?partNumber=${encodeURIComponent(item.partNumber)}`}>Create PO</Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const summary = useQuery(
    api.inventoryAlerts.getAlertsSummary,
    orgId ? { organizationId: orgId } : "skip",
  );

  const shelfLifeAlerts = useQuery(
    api.inventoryAlerts.getShelfLifeAlerts,
    orgId ? { organizationId: orgId } : "skip",
  );

  const reorderAlerts = useQuery(
    api.inventoryAlerts.getReorderAlerts,
    orgId ? { organizationId: orgId } : "skip",
  );

  const calibrationAlerts = useQuery(
    api.inventoryAlerts.getCalibrationAlerts,
    orgId ? { organizationId: orgId } : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      summary === undefined ||
      shelfLifeAlerts === undefined ||
      reorderAlerts === undefined ||
      calibrationAlerts === undefined,
  });

  const defaultTab = useMemo(() => {
    if (!summary) return "shelf-life";
    if (summary.shelfLifeCount > 0) return "shelf-life";
    if (summary.reorderCount > 0) return "reorder";
    if (summary.calibrationCount > 0) return "calibration";
    return "shelf-life";
  }, [summary]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="p-6 space-y-3" data-testid="page-loading-state">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Inventory alerts require organization setup"
        missingInfo="Complete onboarding to monitor shelf life, reorder levels, and calibration schedules."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !summary || !shelfLifeAlerts || !reorderAlerts || !calibrationAlerts) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> Inventory Alerts
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor shelf life expirations, reorder points, and calibration schedules
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Live data</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={summary.shelfLifeCount > 0 ? "border-amber-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Shelf Life Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.shelfLifeCount > 0 ? "text-amber-400" : ""}`}>
              {summary.shelfLifeCount}
            </div>
          </CardContent>
        </Card>

        <Card className={summary.reorderCount > 0 ? "border-blue-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <PackageSearch className="h-4 w-4" /> Reorder Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.reorderCount > 0 ? "text-blue-400" : ""}`}>
              {summary.reorderCount}
            </div>
          </CardContent>
        </Card>

        <Card className={summary.calibrationCount > 0 ? "border-purple-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Wrench className="h-4 w-4" /> Calibration Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.calibrationCount > 0 ? "text-purple-400" : ""}`}>
              {summary.calibrationCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="shelf-life">
            Shelf Life
            {summary.shelfLifeCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">
                {summary.shelfLifeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reorder">
            Reorder
            {summary.reorderCount > 0 && (
              <Badge className="ml-1.5 bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                {summary.reorderCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calibration">
            Calibration
            {summary.calibrationCount > 0 && (
              <Badge className="ml-1.5 bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">
                {summary.calibrationCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Shelf Life Tab */}
        <TabsContent value="shelf-life">
          {shelfLifeAlerts.totalAlerts === 0 ? (
            <Card className="mt-4">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No shelf life alerts in the next 90 days.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 mt-4">
              <ShelfLifeBandSection
                title="Expired"
                items={shelfLifeAlerts.expired}
                colorClass="text-red-400 font-semibold"
                borderClass="bg-red-500/15 text-red-400 border-red-500/30"
              />
              <ShelfLifeBandSection
                title="Critical (0-30 days)"
                items={shelfLifeAlerts.critical}
                colorClass="text-orange-400 font-semibold"
                borderClass="bg-orange-500/15 text-orange-400 border-orange-500/30"
              />
              <ShelfLifeBandSection
                title="Warning (30-60 days)"
                items={shelfLifeAlerts.warning}
                colorClass="text-yellow-400"
                borderClass="bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
              />
              <ShelfLifeBandSection
                title="Upcoming (60-90 days)"
                items={shelfLifeAlerts.upcoming}
                colorClass="text-blue-400"
                borderClass="bg-blue-500/15 text-blue-400 border-blue-500/30"
              />
            </div>
          )}
        </TabsContent>

        {/* Reorder Tab */}
        <TabsContent value="reorder">
          {reorderAlerts.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="py-8 text-center text-muted-foreground">
                <PackageSearch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All part numbers are above reorder thresholds.</p>
              </CardContent>
            </Card>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Deficit</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reorderAlerts as Array<ReorderAlertItem>).map((item) => (
                  <TableRow key={item.partNumber}>
                    <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell className="text-right">{item.currentStock}</TableCell>
                    <TableCell className="text-right">
                      {item.reorderPoint ?? "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.minStockLevel ?? "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-400 font-semibold">-{item.deficit}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={item.severity === "critical"
                          ? "border-red-500/30 text-red-400 bg-red-500/10"
                          : "border-amber-500/30 text-amber-400 bg-amber-500/10"}
                      >
                        {item.severity === "critical" ? "Critical" : "Warning"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/billing/purchase-orders/new?partNumber=${encodeURIComponent(item.partNumber)}`}>Create PO</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Calibration Tab */}
        <TabsContent value="calibration">
          {calibrationAlerts.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No calibrations due in the next 90 days.</p>
              </CardContent>
            </Card>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Tool Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Calibration</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(calibrationAlerts as Array<CalibrationAlertItem>).map((tool) => (
                  <TableRow key={tool._id}>
                    <TableCell className="font-mono text-sm">{tool.toolNumber}</TableCell>
                    <TableCell>{tool.description}</TableCell>
                    <TableCell>{categoryLabel(tool.category)}</TableCell>
                    <TableCell>
                      {tool.lastCalibrationDate ? formatDate(tool.lastCalibrationDate) : "---"}
                    </TableCell>
                    <TableCell>{formatDate(tool.nextCalibrationDue)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          tool.daysRemaining <= 0
                            ? "text-red-400 font-semibold"
                            : tool.daysRemaining <= 30
                              ? "text-orange-400 font-semibold"
                              : "text-muted-foreground"
                        }
                      >
                        {daysLabel(tool.daysRemaining)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/parts/tools">Schedule Calibration</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
