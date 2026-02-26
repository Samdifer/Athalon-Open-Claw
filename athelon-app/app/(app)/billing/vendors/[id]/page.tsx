"use client";

import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Building2,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { Separator } from "@/components/ui/separator";

const TYPE_LABELS: Record<string, string> = {
  parts_supplier: "Parts Supplier",
  contract_maintenance: "Contract Maintenance",
  calibration_lab: "Calibration Lab",
  DER: "DER",
  other: "Other",
};

export default function VendorDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const vendorId = params.id as Id<"vendors">;
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const vendor = useQuery(
    api.vendors.getVendor,
    orgId && vendorId ? { vendorId, orgId } : "skip",
  );

  const purchaseOrders = useQuery(
    api.billing.listPurchaseOrders,
    orgId ? { orgId, vendorId } : "skip",
  );

  const setVendorApproved = useMutation(api.vendors.setVendorApprovedStatus);
  const updateVendorCert = useMutation(api.vendors.updateVendorCert);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [certDialog, setCertDialog] = useState(false);
  const [newCertNumber, setNewCertNumber] = useState("");
  const [newCertExpiry, setNewCertExpiry] = useState("");

  const isLoading = !isLoaded || vendor === undefined;

  const certExpired = vendor?.certExpiry ? vendor.certExpiry < Date.now() : false;
  const certExpiringSoon = !certExpired && vendor?.certExpiry
    ? vendor.certExpiry - Date.now() < 30 * 24 * 60 * 60 * 1000
    : false;

  const handleToggleApproval = async () => {
    if (!orgId || !techId || !vendor) return;
    setActionLoading("approval"); setError(null);
    try {
      await setVendorApproved({
        vendorId,
        orgId,
        isApproved: !vendor.isApproved,
        approvedByTechId: techId as Id<"technicians">,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update approval status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateCert = async () => {
    if (!orgId || !techId || !newCertNumber.trim() || !newCertExpiry) return;
    setActionLoading("cert"); setError(null);
    try {
      await updateVendorCert({
        vendorId,
        orgId,
        certNumber: newCertNumber.trim(),
        certExpiry: new Date(newCertExpiry).getTime(),
        updatedByTechId: techId as Id<"technicians">,
      });
      setCertDialog(false);
      setNewCertNumber(""); setNewCertExpiry("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update certificate.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Vendor not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{vendor.name}</h1>
              {vendor.isApproved ? (
                <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30">
                  Not Approved
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {TYPE_LABELS[vendor.type] ?? vendor.type} · Added {formatDate(vendor.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleApproval}
            disabled={actionLoading === "approval"}
            className={`h-8 gap-1.5 text-xs ${vendor.isApproved ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-green-500/40 text-green-400 hover:bg-green-500/10"}`}
          >
            {vendor.isApproved ? (
              <><XCircle className="w-3.5 h-3.5" />{actionLoading === "approval" ? "..." : "Remove from AVL"}</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5" />{actionLoading === "approval" ? "..." : "Add to AVL"}</>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Vendor Details */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Contact</p>
              <p className="text-sm">{vendor.contactName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Phone</p>
              <p className="text-sm">{vendor.contactPhone ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Email</p>
              <p className="text-sm">{vendor.contactEmail ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Type</p>
              <p className="text-sm">{TYPE_LABELS[vendor.type] ?? vendor.type}</p>
            </div>
          </div>
          {vendor.address && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Address</p>
              <p className="text-sm">{vendor.address}</p>
            </div>
          )}
          {vendor.notes && (
            <div>
              <Separator className="my-2" />
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Notes</p>
              <p className="text-sm text-muted-foreground">{vendor.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certification */}
      <Card className={`border-border/60 ${certExpired ? "border-l-4 border-l-red-500" : certExpiringSoon ? "border-l-4 border-l-amber-500" : ""}`}>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Certification</CardTitle>
            {certExpired && (
              <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30 gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                Expired
              </Badge>
            )}
            {certExpiringSoon && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30 gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                Expiring Soon
              </Badge>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => { setNewCertNumber(vendor.certNumber ?? ""); setCertDialog(true); }} className="h-7 text-xs">
            Update Cert
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Cert Number</p>
            <p className="text-sm font-mono">{vendor.certNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Expiry</p>
            <p className={`text-sm ${certExpired ? "text-red-400 font-semibold" : certExpiringSoon ? "text-amber-400 font-semibold" : ""}`}>
              {vendor.certExpiry ? formatDate(vendor.certExpiry) : "—"}
            </p>
          </div>
          {vendor.approvedBy && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Approved</p>
              <p className="text-sm">{vendor.approvedAt ? formatDate(vendor.approvedAt) : "—"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PO History */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Purchase Order History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!purchaseOrders || purchaseOrders.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingCart className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No purchase orders for this vendor.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {purchaseOrders.slice(0, 10).map((po) => (
                <Link key={po._id} to={`/billing/purchase-orders/${po._id}`} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{po.poNumber}</span>
                      <Badge variant="outline" className="text-[10px] border-border/50">{po.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(po.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">${po.total.toFixed(2)}</span>
                    <FileText className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Not on AVL warning */}
      {!vendor.isApproved && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
          <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            This vendor is <strong>not on the Approved Vendor List</strong>. Purchase orders cannot be created until this vendor is approved per §145.217(b).
          </p>
        </div>
      )}

      {/* Update Cert Dialog */}
      <Dialog open={certDialog} onOpenChange={setCertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Certificate</DialogTitle>
            <DialogDescription>Update the certification number and expiry date for {vendor.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Certificate Number *</Label>
              <Input value={newCertNumber} onChange={(e) => setNewCertNumber(e.target.value)} className="h-9 text-sm" placeholder="FAA cert / Part 145 #" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expiry Date *</Label>
              <Input type="date" value={newCertExpiry} onChange={(e) => setNewCertExpiry(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCertDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleUpdateCert}
              disabled={!newCertNumber.trim() || !newCertExpiry || actionLoading === "cert"}
            >
              {actionLoading === "cert" ? "Updating..." : "Update Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
