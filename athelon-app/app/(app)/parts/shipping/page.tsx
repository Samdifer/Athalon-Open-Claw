"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  Plus, Search, ChevronDown, ChevronRight, Truck, Package, AlertTriangle, Trash2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_transit: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ShippingPage() {
  const { orgId: organizationId, isLoaded } = useCurrentOrg();
  const orgId = organizationId as Id<"organizations"> | undefined;
  const shipments = useQuery(api.shipping.list, orgId ? { organizationId: orgId } : "skip");
  const createShipment = useMutation(api.shipping.create);
  const updateStatus = useMutation(api.shipping.updateStatus);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || shipments === undefined,
  });

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{ id: Id<"shipments">; shipmentNumber: string; type: string } | null>(null);
  const [deliverConfirm, setDeliverConfirm] = useState<{ id: Id<"shipments">; shipmentNumber: string; carrier?: string; type: string } | null>(null);

  // Create form state
  const [formType, setFormType] = useState<"inbound" | "outbound">("outbound");
  const [formCarrier, setFormCarrier] = useState("");
  const [formTracking, setFormTracking] = useState("");
  const [formOrigin, setFormOrigin] = useState("");
  const [formDest, setFormDest] = useState("");
  const [formHazmat, setFormHazmat] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!shipments) return [];
    let list = shipments;
    if (tab !== "all") list = list.filter((s) => s.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.shipmentNumber.toLowerCase().includes(q) ||
          s.trackingNumber?.toLowerCase().includes(q) ||
          s.carrier?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shipments, tab, search]);

  const handleCreate = async () => {
    if (!orgId) {
      toast.error("Organization context is required");
      return;
    }
    setIsCreating(true);
    try {
      await createShipment({
        organizationId: orgId,
        type: formType,
        carrier: formCarrier || undefined,
        trackingNumber: formTracking || undefined,
        originName: formOrigin || undefined,
        destinationName: formDest || undefined,
        hazmat: formHazmat || undefined,
        notes: formNotes || undefined,
      });
      toast.success("Shipment created");
      setShowCreate(false);
      setFormCarrier(""); setFormTracking(""); setFormOrigin(""); setFormDest(""); setFormHazmat(false); setFormNotes("");
    } catch {
      toast.error("Failed to create shipment");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (id: Id<"shipments">, status: "pending" | "in_transit" | "delivered" | "cancelled", isInbound?: boolean) => {
    try {
      await updateStatus({ id, status });
      if (status === "delivered" && isInbound) {
        toast.success("Inbound shipment marked delivered — parts need receiving inspection.", {
          description: "Go to the Parts Receiving queue to inspect and accept these parts into inventory.",
          action: { label: "Open Receiving", onClick: () => { window.location.href = "/parts/receiving"; } },
          duration: 8000,
        });
      } else {
        toast.success(`Status updated to ${status.replace("_", " ")}`);
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const counts = useMemo(() => {
    if (!shipments) return { all: 0, pending: 0, in_transit: 0, delivered: 0 };
    return {
      all: shipments.length,
      pending: shipments.filter((s) => s.status === "pending").length,
      in_transit: shipments.filter((s) => s.status === "in_transit").length,
      delivered: shipments.filter((s) => s.status === "delivered").length,
    };
  }, [shipments]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-3" data-testid="page-loading-state">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Shipping requires organization setup"
        missingInfo="Complete onboarding before creating inbound or outbound shipments."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !shipments) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2"><Truck className="w-5 h-5 text-muted-foreground" /> Shipping & Receiving</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track inbound and outbound shipments</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(v) => {
          if (!isCreating) {
            if (!v) {
              setFormCarrier(""); setFormTracking(""); setFormOrigin(""); setFormDest(""); setFormHazmat(false); setFormNotes("");
              setFormType("outbound");
            }
            setShowCreate(v);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5"><Plus className="w-4 h-4" /> New Shipment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Shipment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as "inbound" | "outbound")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Carrier</Label><Input value={formCarrier} onChange={(e) => setFormCarrier(e.target.value.slice(0, 100))} placeholder="FedEx, UPS..." maxLength={100} /></div>
                <div><Label>Tracking #</Label><Input value={formTracking} onChange={(e) => setFormTracking(e.target.value.slice(0, 100))} placeholder="1Z999..." maxLength={100} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Origin</Label><Input value={formOrigin} onChange={(e) => setFormOrigin(e.target.value.slice(0, 100))} placeholder="Origin name" maxLength={100} /></div>
                <div><Label>Destination</Label><Input value={formDest} onChange={(e) => setFormDest(e.target.value.slice(0, 100))} placeholder="Destination name" maxLength={100} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hazmat"
                  checked={formHazmat}
                  onCheckedChange={(checked) => setFormHazmat(checked === true)}
                />
                <Label htmlFor="hazmat" className="flex items-center gap-1 cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Hazmat
                </Label>
              </div>
              <div><Label>Notes</Label><Input value={formNotes} onChange={(e) => setFormNotes(e.target.value.slice(0, 500))} placeholder="Special instructions..." maxLength={500} /></div>
              <Button onClick={handleCreate} className="w-full gap-1.5" disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isCreating ? "Creating…" : "Create Shipment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.all, icon: Package },
          { label: "Pending", value: counts.pending, color: "text-yellow-400" },
          { label: "In Transit", value: counts.in_transit, color: "text-blue-400" },
          { label: "Delivered", value: counts.delivered, color: "text-green-400" },
        ].map((c) => (
          <Card key={c.label}><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color ?? ""}`}>{c.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search shipments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Shipment List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <ActionableEmptyState
            title="No shipments found"
            missingInfo="Create your first inbound or outbound shipment to begin tracking."
            primaryActionLabel="New Shipment"
            primaryActionType="button"
            primaryActionTarget={() => setShowCreate(true)}
          />
        )}
        {filtered.map((s) => (
          <Card key={s._id} className="overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(expanded === s._id ? null : s._id)}
            >
              {expanded === s._id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium">{s.shipmentNumber}</span>
                  <Badge variant="outline" className={STATUS_COLORS[s.status] ?? ""}>
                    {s.status.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline">{s.type}</Badge>
                  {s.hazmat && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />HAZMAT</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {s.carrier && <span>{s.carrier} • </span>}
                  {s.trackingNumber && <span>#{s.trackingNumber} • </span>}
                  {s.originName && s.destinationName && <span>{s.originName} → {s.destinationName}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                {s.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(s._id, "in_transit"); }}>
                    Mark Shipped
                  </Button>
                )}
                {s.status === "in_transit" && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDeliverConfirm({ id: s._id, shipmentNumber: s.shipmentNumber, carrier: s.carrier ?? undefined, type: s.type }); }}>
                    Mark Delivered
                  </Button>
                )}
                {s.status !== "cancelled" && s.status !== "delivered" && (
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setCancelConfirm({ id: s._id, shipmentNumber: s.shipmentNumber, type: s.type }); }}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            </div>
            {expanded === s._id && (
              <ShipmentDetails shipmentId={s._id} orgId={orgId!} />
            )}
          </Card>
        ))}
      </div>

      <AlertDialog open={!!cancelConfirm} onOpenChange={(v) => !v && setCancelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel {cancelConfirm?.type} shipment <strong>{cancelConfirm?.shipmentNumber}</strong>? This cannot be undone. Verify all staged parts are returned to inventory before cancelling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Shipment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelConfirm) {
                  handleStatusUpdate(cancelConfirm.id, "cancelled");
                  setCancelConfirm(null);
                }
              }}
            >
              Cancel Shipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deliverConfirm} onOpenChange={(v) => !v && setDeliverConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark shipment <strong>{deliverConfirm?.shipmentNumber}</strong>
              {deliverConfirm?.carrier ? ` (${deliverConfirm.carrier})` : ""} as{" "}
              <strong>Delivered</strong>? This confirms physical receipt of all items. Verify parts have been physically received and checked before confirming — this action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not Yet</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (deliverConfirm) {
                  void handleStatusUpdate(deliverConfirm.id, "delivered", deliverConfirm.type === "inbound");
                  setDeliverConfirm(null);
                }
              }}
            >
              Confirm Delivery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ShipmentDetails({ shipmentId, orgId }: { shipmentId: Id<"shipments">; orgId: Id<"organizations"> }) {
  const items = useQuery(api.shipping.getItems, { shipmentId });
  const addItem = useMutation(api.shipping.addItem);
  const removeItem = useMutation(api.shipping.removeItem);
  const [showAdd, setShowAdd] = useState(false);
  const [pn, setPn] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [sn, setSn] = useState("");
  const [removeConfirmId, setRemoveConfirmId] = useState<Id<"shipmentItems"> | null>(null);

  const handleAdd = async () => {
    if (!pn.trim()) { toast.error("Part number is required."); return; }
    if (!desc.trim()) { toast.error("Description is required."); return; }
    const parsedQty = Number(qty);
    if (!qty.trim() || isNaN(parsedQty) || parsedQty <= 0 || !Number.isInteger(parsedQty)) {
      toast.error("Quantity must be a whole number greater than zero.");
      return;
    }
    try {
      await addItem({ shipmentId, organizationId: orgId, partNumber: pn.trim(), description: desc.trim(), quantity: parsedQty, serialNumber: sn.trim() || undefined });
      toast.success("Item added");
      setPn(""); setDesc(""); setQty("1"); setSn(""); setShowAdd(false);
    } catch {
      toast.error("Failed to add item");
    }
  };

  if (items === undefined) {
    return (
      <div className="border-t p-4 bg-muted/30 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="border-t p-4 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Items ({items.length})</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
      </div>
      {showAdd && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input placeholder="Part #" value={pn} onChange={(e) => setPn(e.target.value)} />
          <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input placeholder="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="S/N" value={sn} onChange={(e) => setSn(e.target.value)} />
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        </div>
      )}
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item._id} className="flex items-center justify-between text-sm p-2 rounded bg-background">
              <div>
                <span className="font-mono">{item.partNumber}</span> — {item.description}
                {item.serialNumber && <span className="text-muted-foreground ml-2">S/N: {item.serialNumber}</span>}
                <span className="text-muted-foreground ml-2">Qty: {item.quantity}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRemoveConfirmId(item._id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      )}

      <AlertDialog open={!!removeConfirmId} onOpenChange={(v) => !v && setRemoveConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this item from the shipment manifest? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (removeConfirmId) {
                  try {
                    await removeItem({ id: removeConfirmId });
                    toast.success("Item removed");
                  } catch {
                    toast.error("Failed to remove item");
                  }
                  setRemoveConfirmId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
