"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Shield,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type PartCondition = "new" | "serviceable" | "overhauled" | "repaired";

const CONDITION_OPTIONS: { value: PartCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "serviceable", label: "Serviceable (used)" },
  { value: "overhauled", label: "Overhauled" },
  { value: "repaired", label: "Repaired" },
];

// ─── Section Toggle ────────────────────────────────────────────────────────────

function SectionToggle({
  open,
  onToggle,
  label,
  badge,
  icon: Icon,
  badgeVariant = "secondary",
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  badge?: string;
  icon?: React.ElementType;
  badgeVariant?: "secondary" | "destructive" | "outline";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 text-left py-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
    >
      {open ? (
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      )}
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      {label}
      {badge && (
        <Badge variant={badgeVariant} className="ml-auto text-[10px] h-4 px-1">
          {badge}
        </Badge>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPartPage() {
  const { orgId } = useCurrentOrg();

  const receivePart = useMutation(api.parts.receivePart);

  // ── Core fields ──────────────────────────────────────────────────────────
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [description, setDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [isSerialized, setIsSerialized] = useState(false);
  const [condition, setCondition] = useState<PartCondition>("new");
  const [supplier, setSupplier] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [isOwnerSupplied, setIsOwnerSupplied] = useState(false);
  // BUG-PC-088: Use local calendar date (not UTC) for receivingDate default.
  // new Date().toISOString().slice(0, 10) returns the UTC date — a parts clerk
  // in UTC-5 working after 7pm local (= midnight+ UTC) would see tomorrow's
  // UTC date pre-filled as the receiving date. A receiving record with the
  // wrong date is a compliance issue against the 8130-3 and PO timestamps.
  const [receivingDate, setReceivingDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [notes, setNotes] = useState("");

  // ── Life-limited section ──────────────────────────────────────────────────
  const [showLifeLimited, setShowLifeLimited] = useState(false);
  const [isLifeLimited, setIsLifeLimited] = useState(false);
  const [lifeLimitHours, setLifeLimitHours] = useState("");
  const [lifeLimitCycles, setLifeLimitCycles] = useState("");
  const [hoursAccumulated, setHoursAccumulated] = useState("");
  const [cyclesAccumulated, setCyclesAccumulated] = useState("");

  // ── Shelf-life section ────────────────────────────────────────────────────
  const [showShelfLife, setShowShelfLife] = useState(false);
  const [hasShelfLifeLimit, setHasShelfLifeLimit] = useState(false);
  const [shelfLifeExpiry, setShelfLifeExpiry] = useState("");

  // ── 8130-3 cert section ───────────────────────────────────────────────────
  const [showCert, setShowCert] = useState(false);
  const [certFormNumber, setCertFormNumber] = useState("");
  const [certApprovalNumber, setCertApprovalNumber] = useState("");
  const [certApprovingAuthority, setCertApprovingAuthority] = useState("");
  const [certApplicantName, setCertApplicantName] = useState("");
  const [certStatusWork, setCertStatusWork] = useState<
    "new" | "overhauled" | "repaired" | "inspected" | "modified"
  >("new");
  const [certSerialBatch, setCertSerialBatch] = useState("");
  const [certRemarks, setCertRemarks] = useState("");
  const [certSignatoryName, setCertSignatoryName] = useState("");
  // BUG-PC-088 (same fix): 8130-3 signature date also uses local calendar date.
  const [certSignatureDate, setCertSignatureDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [certCertifyingStatement, setCertCertifyingStatement] = useState(
    "The work identified herein was accomplished in accordance with the requirements of the applicable maintenance data and in respect to that work the items are considered ready for release to service.",
  );

  // ── Submit state ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function hasCertData() {
    return certFormNumber.trim() !== "" || certApprovalNumber.trim() !== "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!orgId) {
      setSubmitError("Organization not loaded. Please try again.");
      return;
    }

    if (!partNumber.trim()) {
      setSubmitError("Part number is required.");
      return;
    }
    if (!partName.trim()) {
      setSubmitError("Part name is required.");
      return;
    }
    if (isSerialized && !serialNumber.trim()) {
      setSubmitError("Serial number is required for serialized parts.");
      return;
    }
    if (isLifeLimited && !lifeLimitHours.trim() && !lifeLimitCycles.trim()) {
      setSubmitError(
        "Life-limited parts must have at least one limit defined (hours or cycles).",
      );
      return;
    }
    if (hasShelfLifeLimit && !shelfLifeExpiry.trim()) {
      setSubmitError("Shelf-life expiry date is required when shelf-life limit is enabled.");
      return;
    }
    if (hasCertData()) {
      if (!certApprovalNumber.trim()) {
        setSubmitError("8130-3 Approval Number (Block 14a) is required when cert data is provided.");
        return;
      }
      if (!certFormNumber.trim()) {
        setSubmitError("8130-3 Form Tracking Number (Block 3) is required when cert data is provided.");
        return;
      }
      if (!certApprovingAuthority.trim()) {
        setSubmitError("8130-3 Approving Authority is required.");
        return;
      }
      if (!certApplicantName.trim()) {
        setSubmitError("8130-3 Applicant/Operator Name is required.");
        return;
      }
      if (!certSignatoryName.trim()) {
        setSubmitError("8130-3 Authorized Signatory Name is required.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orgIdTyped = orgId as Id<"organizations">;
      const receivingDateMs = new Date(receivingDate).getTime();

      // Build the 8130-3 payload if cert data is present
      const eightOneThirtyData = hasCertData()
        ? {
            approvingAuthority: certApprovingAuthority.trim(),
            applicantName: certApplicantName.trim(),
            formTrackingNumber: certFormNumber.trim(),
            partDescription: partName.trim(),
            partNumber: partNumber.trim(),
            quantity: 1,
            serialBatchNumber: certSerialBatch.trim() || undefined,
            isLifeLimited: isLifeLimited,
            lifeRemainingHours:
              isLifeLimited && lifeLimitHours && hoursAccumulated
                ? Math.max(0, parseFloat(lifeLimitHours) - parseFloat(hoursAccumulated))
                : undefined,
            lifeRemainingCycles:
              isLifeLimited && lifeLimitCycles && cyclesAccumulated
                ? Math.max(0, parseFloat(lifeLimitCycles) - parseFloat(cyclesAccumulated))
                : undefined,
            statusWork: certStatusWork,
            remarks: certRemarks.trim() || undefined,
            certifyingStatement: certCertifyingStatement.trim(),
            authorizedSignatoryName: certSignatoryName.trim(),
            signatureDate: new Date(certSignatureDate).getTime(),
            approvalNumber: certApprovalNumber.trim(),
          }
        : undefined;

      await receivePart({
        organizationId: orgIdTyped,
        partNumber: partNumber.trim(),
        partName: partName.trim(),
        description: description.trim() || undefined,
        serialNumber: isSerialized && serialNumber.trim() ? serialNumber.trim() : undefined,
        isSerialized,
        condition,
        isOwnerSupplied,
        supplier: supplier.trim() || undefined,
        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
        receivingDate: receivingDateMs,
        isLifeLimited,
        lifeLimitHours: isLifeLimited && lifeLimitHours ? parseFloat(lifeLimitHours) : undefined,
        lifeLimitCycles:
          isLifeLimited && lifeLimitCycles ? parseFloat(lifeLimitCycles) : undefined,
        hoursAccumulatedBeforeInstall:
          isLifeLimited && hoursAccumulated ? parseFloat(hoursAccumulated) : undefined,
        cyclesAccumulatedBeforeInstall:
          isLifeLimited && cyclesAccumulated ? parseFloat(cyclesAccumulated) : undefined,
        hasShelfLifeLimit,
        shelfLifeLimitDate:
          hasShelfLifeLimit && shelfLifeExpiry
            ? new Date(shelfLifeExpiry).getTime()
            : undefined,
        eightOneThirtyData,
        notes: notes.trim() || undefined,
      });

      toast.success(
        hasCertData()
          ? `${partNumber.trim()} received with 8130-3 cert — pending inspection`
          : `${partNumber.trim()} received — pending inspection`,
      );
      setSuccess(true);

      // Reset form
      setPartNumber("");
      setPartName("");
      setDescription("");
      setSerialNumber("");
      setIsSerialized(false);
      setCondition("new");
      setSupplier("");
      setPurchaseOrderNumber("");
      setIsOwnerSupplied(false);
      setReceivingDate((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })());
      setNotes("");
      setShowLifeLimited(false);
      setIsLifeLimited(false);
      setLifeLimitHours("");
      setLifeLimitCycles("");
      setHoursAccumulated("");
      setCyclesAccumulated("");
      setShowShelfLife(false);
      setHasShelfLifeLimit(false);
      setShelfLifeExpiry("");
      setShowCert(false);
      setCertFormNumber("");
      setCertApprovalNumber("");
      setCertApprovingAuthority("");
      setCertApplicantName("");
      setCertStatusWork("new");
      setCertSerialBatch("");
      setCertRemarks("");
      setCertSignatoryName("");
      setCertSignatureDate((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setSubmitError(msg);
      toast.error("Failed to receive part");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/parts">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Parts Inventory
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          Receive Part Into Inventory
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Record a part receipt with traceability data. Expand sections to capture 8130-3 cert,
          life limits, and shelf-life.
        </p>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Part record created — pending inspection
            </p>
            <p className="text-[11px] text-green-400/70 mt-0.5">
              Part will appear in the receiving inspection queue.
            </p>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="text-green-400 h-7 text-xs"
              onClick={() => setSuccess(false)}
            >
              Receive another
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-green-400 h-7 text-xs">
              <Link to="/parts/receiving">Receiving Queue</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-green-400 h-7 text-xs">
              <Link to="/parts">View Inventory</Link>
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Core Part Info ─────────────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Part Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="partNumber" className="text-xs font-medium">
                  Part Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="partNumber"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. 206-015-191-013"
                  className="font-mono text-sm h-9 bg-muted/30"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partName" className="text-xs font-medium">
                  Part Name / Description <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="partName"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Main Rotor Blade Assembly"
                  className="text-sm h-9 bg-muted/30"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">
                Additional Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Alternate names, notes..."
                className="text-sm h-9 bg-muted/30"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Condition <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={condition}
                  onValueChange={(v) => setCondition(v as PartCondition)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receivingDate" className="text-xs font-medium">
                  Receiving Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="receivingDate"
                  type="date"
                  value={receivingDate}
                  onChange={(e) => setReceivingDate(e.target.value)}
                  className="text-sm h-9 bg-muted/30"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <Separator className="opacity-40" />

            {/* Serialized toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-serialized"
                  checked={isSerialized}
                  onCheckedChange={(checked) => setIsSerialized(!!checked)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="is-serialized" className="text-xs font-medium cursor-pointer">Serialized Part</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-owner-supplied"
                  checked={isOwnerSupplied}
                  onCheckedChange={(checked) => setIsOwnerSupplied(!!checked)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="is-owner-supplied" className="text-xs font-medium cursor-pointer">Owner-Supplied Part (OSP)</Label>
              </div>
            </div>

            {isSerialized && (
              <div className="space-y-1.5">
                <Label htmlFor="serialNumber" className="text-xs font-medium">
                  Serial Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. AB-12345"
                  className="font-mono text-sm h-9 bg-muted/30"
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplier" className="text-xs font-medium">
                  Supplier
                </Label>
                <Input
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Aviall, Kellstrom"
                  className="text-sm h-9 bg-muted/30"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseOrderNumber" className="text-xs font-medium">
                  PO Number
                </Label>
                <Input
                  id="purchaseOrderNumber"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  placeholder="e.g. PO-2026-001"
                  className="text-sm h-9 bg-muted/30"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Life-Limited Section ────────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <SectionToggle
              open={showLifeLimited}
              onToggle={() => setShowLifeLimited((v) => !v)}
              label="Life-Limited Part (LLP)"
              icon={Shield}
              badge={isLifeLimited ? "Active" : undefined}
              badgeVariant="secondary"
            />
            {showLifeLimited && (
              <div className="mt-3 space-y-4 pl-5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-life-limited"
                    checked={isLifeLimited}
                    onCheckedChange={(checked) => setIsLifeLimited(!!checked)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="is-life-limited" className="text-xs font-medium cursor-pointer">
                    This is a life-limited part (LLP) per manufacturer data / CMM
                  </Label>
                </div>

                {isLifeLimited && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Life Limit (Hours)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={lifeLimitHours}
                          onChange={(e) => setLifeLimitHours(e.target.value)}
                          placeholder="e.g. 3500"
                          className="text-sm h-9 bg-muted/30"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Life Limit (Cycles)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={lifeLimitCycles}
                          onChange={(e) => setLifeLimitCycles(e.target.value)}
                          placeholder="e.g. 5000"
                          className="text-sm h-9 bg-muted/30"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Hours Accumulated (TSN/TSO)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={hoursAccumulated}
                          onChange={(e) => setHoursAccumulated(e.target.value)}
                          placeholder="From 8130-3 Block 12"
                          className="text-sm h-9 bg-muted/30"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Cycles Accumulated</Label>
                        <Input
                          type="number"
                          min="0"
                          value={cyclesAccumulated}
                          onChange={(e) => setCyclesAccumulated(e.target.value)}
                          placeholder="From 8130-3 Block 12"
                          className="text-sm h-9 bg-muted/30"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Parts at or beyond their life limit will be automatically placed in quarantine.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Shelf Life Section ──────────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <SectionToggle
              open={showShelfLife}
              onToggle={() => setShowShelfLife((v) => !v)}
              label="Shelf Life / Expiry"
              icon={Clock}
              badge={hasShelfLifeLimit ? "Active" : undefined}
            />
            {showShelfLife && (
              <div className="mt-3 space-y-3 pl-5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="has-shelf-life"
                    checked={hasShelfLifeLimit}
                    onCheckedChange={(checked) => setHasShelfLifeLimit(!!checked)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="has-shelf-life" className="text-xs font-medium cursor-pointer">This part has a shelf-life expiry date</Label>
                </div>
                {hasShelfLifeLimit && (
                  <div className="space-y-1.5 max-w-xs">
                    <Label htmlFor="shelfLifeExpiry" className="text-xs font-medium">
                      Expiry Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="shelfLifeExpiry"
                      type="date"
                      value={shelfLifeExpiry}
                      onChange={(e) => setShelfLifeExpiry(e.target.value)}
                      className="text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── FAA Form 8130-3 Section ─────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <SectionToggle
              open={showCert}
              onToggle={() => setShowCert((v) => !v)}
              label="FAA Form 8130-3 / Airworthiness Approval Tag"
              icon={FileText}
              badge={hasCertData() ? "Filled" : "Recommended"}
              badgeVariant={hasCertData() ? "secondary" : "outline"}
            />
            {showCert && (
              <div className="mt-4 space-y-4 pl-5">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  FAA Form 8130-3 is required for airworthy parts under 14 CFR Part 43 and Part
                  145. Capture the tag data here for cradle-to-grave traceability. Block references
                  match the FAA 8130-3 form.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="certFormNumber" className="text-xs font-medium">
                      Block 3 — Form Tracking Number{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="certFormNumber"
                      value={certFormNumber}
                      onChange={(e) => setCertFormNumber(e.target.value)}
                      placeholder="e.g. 8130-XXXX-2026"
                      className="font-mono text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="certApprovalNumber" className="text-xs font-medium">
                      Block 14a — Approval / Certificate No.{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="certApprovalNumber"
                      value={certApprovalNumber}
                      onChange={(e) => setCertApprovalNumber(e.target.value)}
                      placeholder="e.g. FZTY771K"
                      className="font-mono text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="certApprovingAuthority" className="text-xs font-medium">
                      Approving Authority <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="certApprovingAuthority"
                      value={certApprovingAuthority}
                      onChange={(e) => setCertApprovingAuthority(e.target.value)}
                      placeholder="e.g. FAA, EASA, Transport Canada"
                      className="text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="certApplicantName" className="text-xs font-medium">
                      Applicant / Operator Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="certApplicantName"
                      value={certApplicantName}
                      onChange={(e) => setCertApplicantName(e.target.value)}
                      placeholder="e.g. Acme Aviation MRO"
                      className="text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Block 11 — Status / Work
                    </Label>
                    <Select
                      value={certStatusWork}
                      onValueChange={(v) =>
                        setCertStatusWork(
                          v as "new" | "overhauled" | "repaired" | "inspected" | "modified",
                        )
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="overhauled">Overhauled</SelectItem>
                        <SelectItem value="repaired">Repaired</SelectItem>
                        <SelectItem value="inspected">Inspected</SelectItem>
                        <SelectItem value="modified">Modified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="certSerialBatch" className="text-xs font-medium">
                      Block 5 — Serial / Batch Number
                    </Label>
                    <Input
                      id="certSerialBatch"
                      value={certSerialBatch}
                      onChange={(e) => setCertSerialBatch(e.target.value)}
                      placeholder="Serial or lot/batch number on tag"
                      className="font-mono text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="certSignatoryName" className="text-xs font-medium">
                      Authorized Signatory Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="certSignatoryName"
                      value={certSignatoryName}
                      onChange={(e) => setCertSignatoryName(e.target.value)}
                      placeholder="Name of person signing the 8130-3"
                      className="text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="certSignatureDate" className="text-xs font-medium">
                      Signature Date
                    </Label>
                    <Input
                      id="certSignatureDate"
                      type="date"
                      value={certSignatureDate}
                      onChange={(e) => setCertSignatureDate(e.target.value)}
                      className="text-sm h-9 bg-muted/30"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="certRemarks" className="text-xs font-medium">
                    Block 12 — Remarks
                  </Label>
                  <Textarea
                    id="certRemarks"
                    value={certRemarks}
                    onChange={(e) => setCertRemarks(e.target.value)}
                    placeholder="Any remarks from Block 12 of the 8130-3 tag…"
                    rows={2}
                    className="text-sm bg-muted/30 border-border/60 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="certStatement" className="text-xs font-medium">
                    Certifying Statement
                  </Label>
                  <Textarea
                    id="certStatement"
                    value={certCertifyingStatement}
                    onChange={(e) => setCertCertifyingStatement(e.target.value)}
                    rows={3}
                    className="text-sm bg-muted/30 border-border/60 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Notes ──────────────────────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">
                Receiving Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this receipt…"
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Error / Submit ──────────────────────────────────────────────────── */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs leading-relaxed">{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3 pb-4">
          <Button type="submit" size="sm" disabled={isSubmitting || !orgId}>
            {isSubmitting ? "Receiving..." : "Receive Part"}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/parts">Cancel</Link>
          </Button>
          {hasCertData() && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              <FileText className="w-3 h-3 mr-1" />
              8130-3 data will be saved
            </Badge>
          )}
        </div>
      </form>

      {/* Info panel */}
      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Part 145 Note:</span> Under 14 CFR
            §43.9 and §145.221, all parts must have a traceable release document before installation.
            For new parts this is FAA Form 8130-3 (or EASA Form One). For overhauled/repaired parts,
            an approved release document from the certifying facility is required. Parts received
            without documentation should be quarantined until documentation is obtained.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
