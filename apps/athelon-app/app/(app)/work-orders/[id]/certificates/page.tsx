"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadPDF } from "@/lib/pdf/download";
import { Form8130PDF } from "@/lib/pdf/Form8130PDF";
import { EASAForm1PDF } from "@/lib/pdf/EASAForm1PDF";
import {
  PartNumberCombobox,
  type PartSelection,
} from "@/src/shared/components/PartNumberCombobox";

export default function CertificatesPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId, org, techId } = useCurrentOrg();
  const workOrderId = id as Id<"workOrders">;

  const certificates = useQuery(
    api.releaseCertificates.listByWorkOrder,
    workOrderId ? { workOrderId } : "skip",
  );
  const workOrder = useQuery(api.workOrders.getWorkOrder, workOrderId && orgId ? { workOrderId, organizationId: orgId } : "skip");
  const createCert = useMutation(api.releaseCertificates.createReleaseCertificate);

  const [dialogOpen, setDialogOpen] = useState(false);
  // Guard: prevent closing the dialog while a certificate is being created.
  // Without this, clicking outside the dialog or pressing Escape during the Convex
  // mutation silently dismisses the form — the mutation still fires but the success
  // toast and form reset never happen because the dialog is gone.
  const handleDialogOpenChange = (open: boolean) => {
    if (saving) return; // block close during active mutation
    setDialogOpen(open);
  };
  const [formType, setFormType] = useState<"faa_8130" | "easa_form1">("faa_8130");
  const [partSelection, setPartSelection] = useState<PartSelection | null>(null);
  const [partDescription, setPartDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [workPerformed, setWorkPerformed] = useState("");
  const [condition, setCondition] = useState("");
  const [remarks, setRemarks] = useState("");
  const [approvalNumber, setApprovalNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const openDialog = (type: "faa_8130" | "easa_form1") => {
    // BUG-QCM-CERT-001: Reset all form fields on every dialog open so stale
    // data from a prior session (or a cancelled entry) doesn't bleed through.
    // Previously only `formType` and `approvalNumber` were set; everything else
    // carried over from the last open/cancel cycle. A QCM who typed an 8130
    // for Part A, cancelled, then opened a new 8130 for Part B would see Part
    // A's description, P/N, and serial pre-filled — and might not notice before
    // submitting, producing a regulatory document with wrong part information.
    setPartSelection(null);
    setPartDescription("");
    setPartNumber("");
    setSerialNumber("");
    setBatchNumber("");
    setQuantity("1");
    setWorkPerformed("");
    setCondition("");
    setRemarks("");
    setFormType(type);
    // Auto-populate approval number from org cert
    setApprovalNumber(org?.part145CertificateNumber ?? "");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!orgId || !techId || !workOrderId) return;

    // BUG-QCM-CERT-002: Client-side validation for required regulatory fields.
    // Previously blank submissions went straight to the backend, which either
    // produced a schema error with no context, or created an invalid FAA 8130-3
    // / EASA Form 1 with blank Part Description or Part Number — an unacceptable
    // regulatory document under 14 CFR 43.9. Now the user gets a clear error
    // message and the backend is never called with invalid data.
    if (!partDescription.trim()) {
      toast.error("Part description is required for a release certificate.");
      return;
    }
    if (!partNumber.trim()) {
      toast.error("Part number is required for a release certificate.");
      return;
    }
    if (!workPerformed) {
      toast.error("Work performed type is required.");
      return;
    }
    if (!condition) {
      toast.error("Part condition is required.");
      return;
    }
    if (!approvalNumber.trim()) {
      toast.error("Approval/repair station certificate number is required.");
      return;
    }

    setSaving(true);
    try {
      await createCert({
        organizationId: orgId,
        workOrderId,
        formType,
        // BH-QCM-003: Trim whitespace before sending to backend — prevents
        // regulatory documents with leading/trailing spaces in key fields.
        partDescription: partDescription.trim(),
        partNumber: partNumber.trim(),
        serialNumber: serialNumber.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        // Guard against negative quantities — parseInt("-5") is truthy so `|| 1`
        // wouldn't catch it. An FAA 8130-3 / EASA Form 1 with negative quantity
        // is an invalid regulatory document.
        quantity: Math.max(1, parseInt(quantity) || 1),
        workPerformed,
        condition,
        remarks,
        inspectorTechnicianId: techId,
        approvalNumber,
      });
      toast.success(
        formType === "faa_8130" ? "FAA 8130-3 certificate created" : "EASA Form 1 certificate created",
      );
      setDialogOpen(false);
      // Reset form
      setPartSelection(null);
      setPartDescription("");
      setPartNumber("");
      setSerialNumber("");
      setBatchNumber("");
      setQuantity("1");
      setWorkPerformed("");
      setCondition("");
      setRemarks("");
      setApprovalNumber("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create certificate — please try again",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (cert: NonNullable<typeof certificates>[number]) => {
    const commonProps = {
      approvingAuthority: "Federal Aviation Administration — United States",
      repairStationCertNumber: cert.repairStationCertNumber,
      repairStationAddress: cert.organizationAddress,
      formTrackingNumber: cert.certificateNumber,
      organizationName: cert.organizationName,
      organizationAddress: cert.organizationAddress,
      workOrderNumber: workOrder?.workOrder?.workOrderNumber,
      partDescription: cert.partDescription,
      partNumber: cert.partNumber,
      quantity: cert.quantity,
      serialNumber: cert.serialNumber,
      batchNumber: cert.batchNumber,
      statusWork: cert.workPerformed,
      condition: cert.condition,
      remarks: cert.remarks,
      inspectorName: cert.inspectorName,
      approvalNumber: cert.approvalNumber,
      signatureDate: cert.signatureDate,
    };

    try {
      if (cert.formType === "faa_8130") {
        await downloadPDF(
          <Form8130PDF {...commonProps} />,
          `8130-3_${cert.certificateNumber}.pdf`,
        );
      } else {
        await downloadPDF(
          <EASAForm1PDF
            {...commonProps}
            approvalReference={cert.repairStationCertNumber}
          />,
          `EASA-Form1_${cert.certificateNumber}.pdf`,
        );
      }
      toast.success(`${cert.formType === "faa_8130" ? "FAA 8130-3" : "EASA Form 1"} downloaded`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate PDF — please try again",
      );
    }
  };

  // BUG-QCM-CERT-002: Gate loading state on BOTH `certificates` and `workOrder`.
  // Previously only `!certificates` triggered the skeleton. If the certificates
  // query resolved before `workOrder` (both start simultaneously), the page would
  // render the certificate list with active "PDF" download buttons while `workOrder`
  // was still undefined. Clicking "PDF" at that moment calls handleDownload which
  // passes `workOrder?.workOrder?.workOrderNumber` (= undefined) into the React-PDF
  // component — producing a release certificate with a blank Work Order Number field.
  // FAA 8130-3 / EASA Form 1 are legally binding regulatory documents; a blank WO
  // number makes the document invalid and non-traceable. Guard on workOrder too.
  if (!certificates || workOrder === undefined) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Release Certificates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            WO{" "}
            <span className="font-mono">
              {workOrder?.workOrder?.workOrderNumber ?? "…"}
            </span>{" "}
            · FAA 8130-3 &amp; EASA Form 1
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openDialog("faa_8130")} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create 8130-3
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDialog("easa_form1")} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            EASA Form 1
          </Button>
        </div>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Certificates Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Create an FAA 8130-3 or EASA Form 1 release certificate for parts
              maintained under this work order.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert._id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {cert.certificateNumber}
                    <Badge variant={cert.formType === "faa_8130" ? "default" : "secondary"}>
                      {cert.formType === "faa_8130" ? "FAA 8130-3" : "EASA Form 1"}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cert.partDescription} — P/N {cert.partNumber}
                    {cert.serialNumber ? ` — S/N ${cert.serialNumber}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownload(cert)}>
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Qty</p>
                    <p className="font-medium">{cert.quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Work Performed</p>
                    <p className="font-medium">{cert.workPerformed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inspector</p>
                    <p className="font-medium">{cert.inspectorName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {/* BUG-QCM-C2: toLocaleDateString() shifts UTC midnight timestamps
                          by the browser's timezone offset. A certificate created at
                          00:10 UTC would display as the prior day in UTC-5 — factually
                          wrong for a regulatory document. Use UTC accessors to reconstruct
                          the calendar date as stored (matches the server-side Date.now()
                          intent: the date the FAA/EASA certificate was actually signed). */}
                      {(() => {
                        const d = new Date(cert.signatureDate);
                        const yyyy = d.getUTCFullYear();
                        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
                        const dd = String(d.getUTCDate()).padStart(2, "0");
                        return `${yyyy}-${mm}-${dd}`;
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Certificate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formType === "faa_8130" ? "Create FAA 8130-3" : "Create EASA Form 1"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Part Description *</Label>
                {/* BUG-QCM-C1: maxLength cap on free-text fields. Without caps
                    a QCM who pastes in a long description gets a cryptic backend
                    schema error after filling out the entire form — a regulatory
                    document wasted with no indication of what went wrong. */}
                <Input value={partDescription} onChange={(e) => setPartDescription(e.target.value.slice(0, 200))} placeholder="e.g. Fuel Control Unit" maxLength={200} />
              </div>
              <div>
                <Label>Part Number *</Label>
                {orgId ? (
                  <PartNumberCombobox
                    organizationId={orgId}
                    onSelect={(sel) => {
                      setPartSelection(sel);
                      setPartNumber(sel.partNumber);
                      if (!partDescription) setPartDescription(sel.partName);
                    }}
                    value={partSelection}
                    sourceContext="release_certificate"
                    sourceReferenceId={workOrderId}
                    placeholder="Search part number..."
                  />
                ) : (
                  <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value.slice(0, 50))} placeholder="e.g. 2524409-1" maxLength={50} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Serial Number</Label>
                <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value.slice(0, 50))} maxLength={50} />
              </div>
              <div>
                <Label>Batch Number</Label>
                <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value.slice(0, 50))} maxLength={50} />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Work Performed / Status *</Label>
              <Select value={workPerformed} onValueChange={setWorkPerformed}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Overhauled">Overhauled</SelectItem>
                  <SelectItem value="Repaired">Repaired</SelectItem>
                  <SelectItem value="Inspected">Inspected</SelectItem>
                  <SelectItem value="Modified">Modified</SelectItem>
                  <SelectItem value="Tested">Tested</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition *</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Serviceable">Serviceable</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Overhauled">Overhauled</SelectItem>
                  <SelectItem value="Repaired">Repaired</SelectItem>
                  <SelectItem value="Prototype">Prototype</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks</Label>
              {/* BUG-QCM-C1 (cont): Remarks is the most likely field to be over-filled —
                  QCMs paste full AD compliance references, AMM procedures, or STC data.
                  1000 chars is generous for an FAA 8130-3 Block 12 / EASA Form 1 Block 12.
                  Character counter turns amber near limit so the user knows before hitting Submit. */}
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value.slice(0, 1000))}
                placeholder="Work performed description, data references..."
                rows={3}
                maxLength={1000}
              />
              <p className={`text-[10px] text-right mt-0.5 ${remarks.length >= 900 ? "text-amber-400" : "text-muted-foreground/50"}`}>
                {remarks.length}/1000
              </p>
            </div>
            <div>
              <Label>Approval / Certificate Number *</Label>
              <Input value={approvalNumber} onChange={(e) => setApprovalNumber(e.target.value.slice(0, 50))} placeholder="Part 145 cert number" maxLength={50} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              // BH-QCM-003: Use .trim() on all required text fields. Without trim,
              // a field containing only spaces (" ") passes the falsy check and the
              // button enables — allowing a blank FAA 8130-3 / EASA Form 1 to be
              // submitted. These are legally binding regulatory release documents;
              // whitespace-only part descriptions or approval numbers are invalid.
              //
              // BUG-QCM-CERT-001: Add `!condition` to the disabled guard. The FAA
              // 8130-3 (Block 12) and EASA Form 1 (Block 12) both require a condition
              // statement ("Serviceable", "Overhauled", etc.). Previously the button
              // was enabled even when Condition was not selected — producing an invalid
              // regulatory document. The Condition Select shows a "Select..." placeholder
              // when empty; its value is "" (empty string), which is falsy and blocks
              // submit. This ensures no certificate can be created without a Condition.
              disabled={saving || !partDescription.trim() || !partNumber.trim() || !workPerformed || !condition || !approvalNumber.trim()}
              className="gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Certificate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
