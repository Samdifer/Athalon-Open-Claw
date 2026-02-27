"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  ShieldCheck,
  Plus,
  Send,
  Check,
  X,
  Lock,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/format";

type ClaimStatus = "draft" | "submitted" | "under_review" | "approved" | "denied" | "paid" | "closed";
type ClaimType = "part_defect" | "workmanship" | "oem_warranty" | "vendor_warranty";

const STATUS_TABS: Array<{ label: string; value: ClaimStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Under Review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/30",
  submitted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  under_review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-green-500/15 text-green-400 border-green-500/30",
  denied: "bg-red-500/15 text-red-400 border-red-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  part_defect: "Part Defect",
  workmanship: "Workmanship",
  oem_warranty: "OEM Warranty",
  vendor_warranty: "Vendor Warranty",
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Create Claim Dialog ─────────────────────────────────────────────────────

function CreateClaimDialog({
  open,
  onClose,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
}) {
  const create = useMutation(api.warranty.createWarrantyClaim);
  const [claimType, setClaimType] = useState<ClaimType>("part_defect");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [claimedAmount, setClaimedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setClaimType("part_defect");
    setDescription("");
    setPartNumber("");
    setSerialNumber("");
    setClaimedAmount("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!description || !claimedAmount) return;
    setSaving(true);
    try {
      await create({
        organizationId: orgId,
        claimType,
        description,
        partNumber: partNumber || undefined,
        serialNumber: serialNumber || undefined,
        claimedAmount: parseFloat(claimedAmount),
        notes: notes || undefined,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Warranty Claim</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Claim Type</Label>
            <Select value={claimType} onValueChange={(v) => setClaimType(v as ClaimType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CLAIM_TYPE_LABELS) as Array<[ClaimType, string]>).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Part Number</Label>
              <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Claimed Amount ($) *</Label>
            <Input type="number" min="0" step="0.01" value={claimedAmount} onChange={(e) => setClaimedAmount(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !description || !claimedAmount}>
            {saving ? "Creating…" : "Create Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Claim Detail Dialog ─────────────────────────────────────────────────────

function ClaimDetailDialog({
  claimId,
  onClose,
}: {
  claimId: Id<"warrantyClaims"> | null;
  onClose: () => void;
}) {
  const claim = useQuery(api.warranty.getClaimDetail, claimId ? { claimId } : "skip");
  const submit = useMutation(api.warranty.submitClaim);
  const approve = useMutation(api.warranty.approveClaim);
  const deny = useMutation(api.warranty.denyClaim);
  const close = useMutation(api.warranty.closeClaim);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [resolution, setResolution] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  if (!claimId) return null;

  const handleAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={!!claimId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Claim {claim?.claimNumber ?? "…"}</DialogTitle>
        </DialogHeader>
        {!claim ? (
          <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant="outline" className={STATUS_STYLES[claim.status]}>{statusLabel(claim.status)}</Badge>
            </div>
            <div><span className="font-medium">Type:</span> {CLAIM_TYPE_LABELS[claim.claimType as ClaimType]}</div>
            <div><span className="font-medium">Description:</span> {claim.description}</div>
            {claim.partNumber && <div><span className="font-medium">Part #:</span> {claim.partNumber}</div>}
            {claim.serialNumber && <div><span className="font-medium">Serial #:</span> {claim.serialNumber}</div>}
            <div><span className="font-medium">Claimed:</span> {formatCurrency(claim.claimedAmount)}</div>
            {claim.approvedAmount !== undefined && (
              <div><span className="font-medium">Approved:</span> {formatCurrency(claim.approvedAmount)}</div>
            )}
            {claim.resolution && <div><span className="font-medium">Resolution:</span> {claim.resolution}</div>}
            {claim.notes && <div><span className="font-medium">Notes:</span> {claim.notes}</div>}
            <div><span className="font-medium">Created:</span> {formatDate(claim.createdAt)}</div>
            {claim.submittedAt && <div><span className="font-medium">Submitted:</span> {formatDate(claim.submittedAt)}</div>}
            {claim.resolvedAt && <div><span className="font-medium">Resolved:</span> {formatDate(claim.resolvedAt)}</div>}

            {/* Actions */}
            {claim.status === "draft" && (
              <Button size="sm" onClick={() => handleAction(() => submit({ claimId }))} disabled={actionLoading}>
                <Send className="h-3.5 w-3.5 mr-1" /> Submit Claim
              </Button>
            )}
            {(claim.status === "submitted" || claim.status === "under_review") && (
              <div className="space-y-2 border-t pt-2">
                <div>
                  <Label>Approved Amount ($)</Label>
                  <Input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Resolution Notes</Label>
                  <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" disabled={actionLoading || !approvedAmount}
                    onClick={() => handleAction(() => approve({ claimId, approvedAmount: parseFloat(approvedAmount), resolution: resolution || undefined }))}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" disabled={actionLoading || !resolution}
                    onClick={() => handleAction(() => deny({ claimId, resolution }))}>
                    <X className="h-3.5 w-3.5 mr-1" /> Deny
                  </Button>
                </div>
              </div>
            )}
            {(claim.status === "approved" || claim.status === "paid") && (
              <Button size="sm" variant="outline" onClick={() => handleAction(() => close({ claimId }))} disabled={actionLoading}>
                <Lock className="h-3.5 w-3.5 mr-1" /> Close Claim
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function WarrantyPage() {
  const { orgId } = useCurrentOrg();
  const [tab, setTab] = useState<ClaimStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Id<"warrantyClaims"> | null>(null);

  const claims = useQuery(
    api.warranty.listClaims,
    orgId ? { organizationId: orgId, status: tab === "all" ? undefined : tab } : "skip",
  );

  const stats = useMemo(() => {
    if (!claims) return { total: 0, pending: 0, approved: 0, recoveryRate: 0 };
    const total = claims.length;
    const pending = claims.filter((c) => ["submitted", "under_review"].includes(c.status))
      .reduce((s, c) => s + c.claimedAmount, 0);
    const approved = claims.filter((c) => c.status === "approved" || c.status === "paid")
      .reduce((s, c) => s + (c.approvedAmount ?? 0), 0);
    const totalClaimed = claims.reduce((s, c) => s + c.claimedAmount, 0);
    const recoveryRate = totalClaimed > 0 ? (approved / totalClaimed) * 100 : 0;
    return { total, pending, approved, recoveryRate };
  }, [claims]);

  if (!orgId) return <div className="p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Warranty Claims
          </h1>
          <p className="text-muted-foreground text-sm">Track and manage warranty claims against parts, vendors, and OEMs</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Claim
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Claims</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pending Amount</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.pending)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Approved Amount</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-400">{formatCurrency(stats.approved)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Recovery Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.recoveryRate.toFixed(1)}%</div></CardContent></Card>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b pb-1">
        {STATUS_TABS.map((t) => (
          <Button key={t.value} variant={tab === t.value ? "default" : "ghost"} size="sm"
            onClick={() => setTab(t.value as ClaimStatus | "all")}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* Claims Table */}
      {!claims ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No warranty claims found.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Part #</TableHead>
              <TableHead className="text-right">Claimed</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim._id} className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedClaim(claim._id)}>
                <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
                <TableCell>{CLAIM_TYPE_LABELS[claim.claimType as ClaimType]}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_STYLES[claim.status]}>
                    {statusLabel(claim.status)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{claim.partNumber ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(claim.claimedAmount)}</TableCell>
                <TableCell className="text-right">{claim.approvedAmount !== undefined ? formatCurrency(claim.approvedAmount) : "—"}</TableCell>
                <TableCell>{formatDate(claim.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateClaimDialog open={createOpen} onClose={() => setCreateOpen(false)} orgId={orgId} />
      <ClaimDetailDialog claimId={selectedClaim} onClose={() => setSelectedClaim(null)} />
    </div>
  );
}
