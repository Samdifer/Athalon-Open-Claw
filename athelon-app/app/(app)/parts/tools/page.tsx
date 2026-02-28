"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeBadge } from "@/components/QRCodeBadge";
import { QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "hand_tool", label: "Hand Tool" },
  { value: "power_tool", label: "Power Tool" },
  { value: "test_equipment", label: "Test Equipment" },
  { value: "special_tooling", label: "Special Tooling" },
  { value: "consumable", label: "Consumable" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "calibration_due", label: "Calibration Due" },
  { value: "out_for_calibration", label: "Out for Calibration" },
  { value: "retired", label: "Retired" },
] as const;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    available: "bg-green-500/15 text-green-600 border-green-500/30",
    in_use: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    calibration_due: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    out_for_calibration: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    retired: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  };
  return (
    <Badge className={map[status] ?? "bg-muted text-muted-foreground"}>
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  );
}

function categoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ToolCribPage() {
  const { orgId } = useCurrentOrg();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("inventory");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<Id<"toolRecords"> | null>(null);
  const [qrTool, setQrTool] = useState<{ id: string; calDue: string; name: string } | null>(null);

  // Queries
  const allTools = useQuery(
    api.toolCrib.listTools,
    orgId ? { orgId } : "skip"
  );
  const calibrationDue = useQuery(
    api.toolCrib.listCalibrationDue,
    orgId ? { orgId, withinDays: 30 } : "skip"
  );
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Mutations
  const createTool = useMutation(api.toolCrib.createTool);
  const checkOutTool = useMutation(api.toolCrib.checkOutTool);
  const checkInTool = useMutation(api.toolCrib.checkInTool);
  const sendForCalibration = useMutation(api.toolCrib.sendForCalibration);
  const completeCalibration = useMutation(api.toolCrib.completeCalibration);

  // ─── Add Tool State ──────────────────────────────────────────────────────
  const [fToolNumber, setFToolNumber] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fSerialNumber, setFSerialNumber] = useState("");
  const [fCategory, setFCategory] = useState<Category>("hand_tool");
  const [fLocation, setFLocation] = useState("");
  const [fCalibRequired, setFCalibRequired] = useState(false);
  const [fCalibInterval, setFCalibInterval] = useState("");
  const [fCalibProvider, setFCalibProvider] = useState("");
  const [fNotes, setFNotes] = useState("");

  // ─── Check Out State ─────────────────────────────────────────────────────
  const [coTechId, setCoTechId] = useState("");

  // ─── Calibration State ────────────────────────────────────────────────────
  const [calProvider, setCalProvider] = useState("");
  const [calDate, setCalDate] = useState("");
  const [calNextDue, setCalNextDue] = useState("");
  const [calAction, setCalAction] = useState<"send" | "complete">("send");

  const filteredTools = useMemo(() => {
    if (!allTools) return [];
    let tools = allTools;
    if (filterStatus !== "all") {
      tools = tools.filter((t) => t.status === filterStatus);
    }
    if (filterCategory !== "all") {
      tools = tools.filter((t) => t.category === filterCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      tools = tools.filter(
        (t) =>
          t.toolNumber.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.serialNumber ?? "").toLowerCase().includes(q)
      );
    }
    return tools;
  }, [allTools, filterStatus, filterCategory, search]);

  async function handleAddTool() {
    if (!orgId || !fToolNumber || !fDescription) {
      toast.error("Tool number and description are required");
      return;
    }
    try {
      await createTool({
        organizationId: orgId,
        toolNumber: fToolNumber,
        description: fDescription,
        serialNumber: fSerialNumber || undefined,
        category: fCategory,
        location: fLocation || undefined,
        calibrationRequired: fCalibRequired,
        calibrationIntervalDays: fCalibInterval ? parseInt(fCalibInterval) : undefined,
        calibrationProvider: fCalibProvider || undefined,
        notes: fNotes || undefined,
      });
      toast.success("Tool added");
      setShowAddDialog(false);
      setFToolNumber("");
      setFDescription("");
      setFSerialNumber("");
      setFCategory("hand_tool");
      setFLocation("");
      setFCalibRequired(false);
      setFCalibInterval("");
      setFCalibProvider("");
      setFNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add tool");
    }
  }

  async function handleCheckOut() {
    if (!selectedToolId || !coTechId) {
      toast.error("Select a technician");
      return;
    }
    try {
      await checkOutTool({
        toolId: selectedToolId,
        technicianId: coTechId as Id<"technicians">,
      });
      toast.success("Tool checked out");
      setShowCheckOutDialog(false);
      setCoTechId("");
      setSelectedToolId(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to check out");
    }
  }

  async function handleCheckIn(toolId: Id<"toolRecords">) {
    try {
      await checkInTool({ toolId });
      toast.success("Tool checked in");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to check in");
    }
  }

  async function handleCalibration() {
    if (!selectedToolId) return;
    try {
      if (calAction === "send") {
        if (!calProvider) {
          toast.error("Provider is required");
          return;
        }
        await sendForCalibration({ toolId: selectedToolId, provider: calProvider });
        toast.success("Tool sent for calibration");
      } else {
        if (!calDate || !calNextDue) {
          toast.error("Dates are required");
          return;
        }
        await completeCalibration({
          toolId: selectedToolId,
          date: new Date(calDate).getTime(),
          nextDue: new Date(calNextDue).getTime(),
        });
        toast.success("Calibration completed");
      }
      setShowCalibrationDialog(false);
      setCalProvider("");
      setCalDate("");
      setCalNextDue("");
      setSelectedToolId(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Tool Crib
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage tool inventory, check-out, and calibration tracking
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tool
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-xl font-bold">
                  {(allTools ?? []).filter((t) => t.status === "available").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">In Use</p>
                <p className="text-xl font-bold">
                  {(allTools ?? []).filter((t) => t.status === "in_use").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Cal. Due</p>
                <p className="text-xl font-bold">
                  {(calibrationDue ?? []).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Out for Cal.</p>
                <p className="text-xl font-bold">
                  {(allTools ?? []).filter((t) => t.status === "out_for_calibration").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="calibration">
            Calibration Due
            {(calibrationDue ?? []).length > 0 && (
              <Badge className="ml-2 bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs">
                {(calibrationDue ?? []).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tool List */}
          {!allTools ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tools found.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Tool #</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2 pr-4 hidden md:table-cell">Category</th>
                    <th className="pb-2 pr-4 hidden md:table-cell">Location</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4 hidden lg:table-cell">Next Cal.</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTools.map((tool) => (
                    <tr key={tool._id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono font-medium">{tool.toolNumber}</td>
                      <td className="py-2 pr-4">{tool.description}</td>
                      <td className="py-2 pr-4 hidden md:table-cell">
                        {categoryLabel(tool.category)}
                      </td>
                      <td className="py-2 pr-4 hidden md:table-cell">
                        {tool.location ?? "—"}
                      </td>
                      <td className="py-2 pr-4">{statusBadge(tool.status)}</td>
                      <td className="py-2 pr-4 hidden lg:table-cell">
                        {tool.nextCalibrationDue
                          ? new Date(tool.nextCalibrationDue).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          {tool.status === "available" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedToolId(tool._id);
                                setShowCheckOutDialog(true);
                              }}
                            >
                              Check Out
                            </Button>
                          )}
                          {tool.status === "in_use" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckIn(tool._id)}
                            >
                              Check In
                            </Button>
                          )}
                          {(tool.status === "calibration_due" ||
                            tool.status === "available") &&
                            tool.calibrationRequired && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedToolId(tool._id);
                                  setCalAction("send");
                                  setShowCalibrationDialog(true);
                                }}
                              >
                                Send Cal.
                              </Button>
                            )}
                          {tool.status === "out_for_calibration" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedToolId(tool._id);
                                setCalAction("complete");
                                setShowCalibrationDialog(true);
                              }}
                            >
                              Complete Cal.
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Show QR Code"
                            onClick={() =>
                              setQrTool({
                                id: tool.toolNumber,
                                calDue: tool.nextCalibrationDue
                                  ? new Date(tool.nextCalibrationDue).toISOString().split("T")[0]
                                  : "N/A",
                                name: tool.description,
                              })
                            }
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calibration" className="space-y-4 mt-4">
          {!calibrationDue ? (
            <Skeleton className="h-32 w-full" />
          ) : calibrationDue.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tools need calibration within 30 days.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {calibrationDue
                .sort(
                  (a, b) =>
                    (a.nextCalibrationDue ?? 0) - (b.nextCalibrationDue ?? 0)
                )
                .map((tool) => {
                  const daysLeft = tool.nextCalibrationDue
                    ? Math.ceil(
                        (tool.nextCalibrationDue - Date.now()) /
                          (24 * 60 * 60 * 1000)
                      )
                    : 0;
                  return (
                    <Card
                      key={tool._id}
                      className={`border-l-4 ${
                        daysLeft <= 0
                          ? "border-red-500/40"
                          : daysLeft <= 7
                          ? "border-amber-500/40"
                          : "border-yellow-500/40"
                      }`}
                    >
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {tool.toolNumber} — {tool.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {daysLeft <= 0
                              ? "Overdue"
                              : `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}{" "}
                            •{" "}
                            {tool.nextCalibrationDue
                              ? new Date(
                                  tool.nextCalibrationDue
                                ).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedToolId(tool._id);
                            setCalAction(
                              tool.status === "out_for_calibration"
                                ? "complete"
                                : "send"
                            );
                            setShowCalibrationDialog(true);
                          }}
                        >
                          {tool.status === "out_for_calibration"
                            ? "Complete"
                            : "Send for Cal."}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Tool Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tool Number *</Label>
                <Input
                  value={fToolNumber}
                  onChange={(e) => setFToolNumber(e.target.value)}
                  placeholder="e.g. TL-001"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={fCategory} onValueChange={(v) => setFCategory(v as Category)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                placeholder="e.g. Torque Wrench 3/8"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serial Number</Label>
                <Input
                  value={fSerialNumber}
                  onChange={(e) => setFSerialNumber(e.target.value)}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={fLocation}
                  onChange={(e) => setFLocation(e.target.value)}
                  placeholder="e.g. Bay 2, Cabinet A"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="calibRequired"
                checked={fCalibRequired}
                onCheckedChange={(v) => setFCalibRequired(!!v)}
              />
              <Label htmlFor="calibRequired">Calibration Required</Label>
            </div>
            {fCalibRequired && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Calibration Interval (days)</Label>
                  <Input
                    type="number"
                    value={fCalibInterval}
                    onChange={(e) => setFCalibInterval(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Calibration Provider</Label>
                  <Input
                    value={fCalibProvider}
                    onChange={(e) => setFCalibProvider(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTool}>Add Tool</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check Out Dialog */}
      <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Tool</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Assign to Technician</Label>
            <Select value={coTechId} onValueChange={setCoTechId}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {(technicians ?? []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckOutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckOut}>Check Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calibration Dialog */}
      <Dialog open={showCalibrationDialog} onOpenChange={setShowCalibrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {calAction === "send" ? "Send for Calibration" : "Complete Calibration"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {calAction === "send" ? (
              <div>
                <Label>Calibration Provider *</Label>
                <Input
                  value={calProvider}
                  onChange={(e) => setCalProvider(e.target.value)}
                  placeholder="e.g. Transcat"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label>Calibration Date *</Label>
                  <Input
                    type="date"
                    value={calDate}
                    onChange={(e) => setCalDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Next Due *</Label>
                  <Input
                    type="date"
                    value={calNextDue}
                    onChange={(e) => setCalNextDue(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalibrationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCalibration}>
              {calAction === "send" ? "Send" : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* QR Code Dialog */}
      <Dialog open={!!qrTool} onOpenChange={(v) => !v && setQrTool(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Tool QR Code</DialogTitle>
          </DialogHeader>
          {qrTool && (
            <div className="flex justify-center py-4">
              <QRCodeBadge
                value={`TOOL:${qrTool.id}:${qrTool.calDue}`}
                label={qrTool.name}
                size={160}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
