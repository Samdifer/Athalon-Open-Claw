"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import {
  VALID_CONDITIONS,
  VALID_CATEGORIES,
  PART_FIELDS,
  type MappedPartRow,
} from "@/src/shared/lib/partsImport";

// ─── Type helpers ─────────────────────────────────────────────────────────────

type BatchStatus = "processing" | "complete" | "partial" | "failed";

type IssueType =
  | "missing_optional_field"
  | "duplicate_detected"
  | "near_match_detected"
  | "validation_warning"
  | "create_error";

type IssueSeverity = "warning" | "error";

type IssueResolution = "skipped" | "created" | "quantity_updated" | "inline_edited_and_created";

interface BatchIssue {
  _id: Id<"partUploadIssues">;
  rowIndex: number;
  partNumber: string;
  partName?: string;
  issueType: IssueType;
  severity: IssueSeverity;
  fieldName?: string;
  message: string;
  rawRowJson: string;
  resolvedAt?: number;
  resolution?: IssueResolution;
  createdAt: number;
}

interface UploadBatch {
  _id: Id<"partUploadBatches">;
  batchLabel: string;
  fileName: string;
  status: BatchStatus;
  totalRows: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  createdAt: number;
}

// ─── Styling helpers ──────────────────────────────────────────────────────────

const BATCH_STATUS_STYLES: Record<BatchStatus, string> = {
  processing: "border-blue-500/30 text-blue-400",
  complete: "border-green-500/30 text-green-400",
  partial: "border-amber-500/30 text-amber-400",
  failed: "border-red-500/30 text-red-400",
};

const ISSUE_TYPE_STYLES: Record<IssueType, string> = {
  missing_optional_field: "border-blue-500/30 text-blue-400",
  duplicate_detected: "border-amber-500/30 text-amber-400",
  near_match_detected: "border-amber-500/30 text-amber-400",
  validation_warning: "border-yellow-500/30 text-yellow-400",
  create_error: "border-red-500/30 text-red-400",
};

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  missing_optional_field: "Missing Field",
  duplicate_detected: "Duplicate",
  near_match_detected: "Near Match",
  validation_warning: "Validation",
  create_error: "Create Error",
};

// ─── Edit & Resolve Sheet ─────────────────────────────────────────────────────

function EditResolveSheet({
  issue,
  orgId,
  onClose,
}: {
  issue: BatchIssue | null;
  orgId: Id<"organizations">;
  onClose: () => void;
}) {
  const resolveIssue = useMutation(api.partsBulkUpload.resolveIssue);
  const receivePart = useMutation(api.parts.receivePart);

  const [form, setForm] = useState<Partial<MappedPartRow>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form from issue whenever it changes
  if (issue && !initialized) {
    try {
      const parsed = JSON.parse(issue.rawRowJson) as Partial<MappedPartRow>;
      setForm(parsed);
      setInitialized(true);
    } catch {
      setForm({});
      setInitialized(true);
    }
  }

  if (!issue) return null;

  const handleClose = () => {
    setInitialized(false);
    setForm({});
    onClose();
  };

  const updateField = <K extends keyof MappedPartRow>(key: K, value: MappedPartRow[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.partNumber?.trim()) {
      toast.error("Part number is required.");
      return;
    }
    if (!form.partName?.trim()) {
      toast.error("Part name is required.");
      return;
    }
    if (!form.condition) {
      toast.error("Condition is required.");
      return;
    }

    setSaving(true);
    try {
      const result = await receivePart({
        organizationId: orgId,
        partNumber: form.partNumber.trim(),
        partName: form.partName.trim(),
        condition: form.condition as Parameters<typeof receivePart>[0]["condition"],
        isSerialized: form.isSerialized ?? false,
        isOwnerSupplied: form.isOwnerSupplied ?? false,
        isLifeLimited: form.isLifeLimited ?? false,
        hasShelfLifeLimit: form.hasShelfLifeLimit ?? false,
        receivingDate: form.receivingDate ?? Date.now(),
        description: form.description || undefined,
        serialNumber: form.serialNumber || undefined,
        supplier: form.supplier || undefined,
        purchaseOrderNumber: form.purchaseOrderNumber || undefined,
        lifeLimitHours: form.lifeLimitHours,
        lifeLimitCycles: form.lifeLimitCycles,
        hoursAccumulatedBeforeInstall: form.hoursAccumulatedBeforeInstall,
        cyclesAccumulatedBeforeInstall: form.cyclesAccumulatedBeforeInstall,
        shelfLifeLimitDate: form.shelfLifeLimitDate,
        notes: form.notes || undefined,
      });

      await resolveIssue({
        issueId: issue._id,
        resolution: "inline_edited_and_created",
        resolvedPartId: result.partId,
      });

      toast.success(`Part ${form.partNumber} created and issue resolved.`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save part");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!issue} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit &amp; Resolve Issue</SheetTitle>
        </SheetHeader>

        {/* Issue alert */}
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-amber-400">{ISSUE_TYPE_LABELS[issue.issueType]}</span>
            {issue.fieldName && <span className="text-muted-foreground"> · {issue.fieldName}</span>}
            <p className="text-muted-foreground mt-0.5">{issue.message}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Required fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Part Number (readonly)</Label>
              <Input
                value={form.partNumber ?? ""}
                readOnly
                className="bg-muted/50 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Part Name *</Label>
              <Input
                value={form.partName ?? ""}
                onChange={(e) => updateField("partName", e.target.value)}
                placeholder="Part name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Condition *</Label>
              <Select
                value={form.condition ?? ""}
                onValueChange={(v) => updateField("condition", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Part Category</Label>
              <Select
                value={form.partCategory ?? ""}
                onValueChange={(v) => updateField("partCategory", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Serial Number</Label>
              <Input
                value={form.serialNumber ?? ""}
                onChange={(e) => updateField("serialNumber", e.target.value)}
                placeholder="S/N (if serialized)"
              />
            </div>
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input
                value={form.supplier ?? ""}
                onChange={(e) => updateField("supplier", e.target.value)}
                placeholder="Supplier name"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">PO Number</Label>
            <Input
              value={form.purchaseOrderNumber ?? ""}
              onChange={(e) => updateField("purchaseOrderNumber", e.target.value)}
              placeholder="Purchase order number"
            />
          </div>

          {/* Boolean fields */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {(
              [
                { key: "isSerialized", label: "Is Serialized" },
                { key: "isOwnerSupplied", label: "Owner Supplied" },
                { key: "isLifeLimited", label: "Life Limited" },
                { key: "hasShelfLifeLimit", label: "Has Shelf Life" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={key}
                  checked={!!(form as Record<string, unknown>)[key]}
                  onCheckedChange={(checked) =>
                    updateField(key as keyof MappedPartRow, !!checked as MappedPartRow[typeof key])
                  }
                />
                <Label htmlFor={key} className="text-xs cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>

          {/* Life limit fields */}
          {form.isLifeLimited && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Life Limit Hours</Label>
                <Input
                  type="number"
                  value={form.lifeLimitHours ?? ""}
                  onChange={(e) => updateField("lifeLimitHours", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label className="text-xs">Life Limit Cycles</Label>
                <Input
                  type="number"
                  value={form.lifeLimitCycles ?? ""}
                  onChange={(e) => updateField("lifeLimitCycles", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          )}

          {/* Shelf life */}
          {form.hasShelfLifeLimit && (
            <div>
              <Label className="text-xs">Shelf Life Expiry Date</Label>
              <Input
                type="date"
                value={form.shelfLifeLimitDate
                  ? new Date(form.shelfLifeLimitDate).toISOString().slice(0, 10)
                  : ""}
                onChange={(e) =>
                  updateField(
                    "shelfLifeLimitDate",
                    e.target.value ? new Date(e.target.value).getTime() : undefined,
                  )
                }
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Save & Create Part"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PartsUploadIssuesPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [selectedBatchId, setSelectedBatchId] = useState<Id<"partUploadBatches"> | null>(null);
  const [editingIssue, setEditingIssue] = useState<BatchIssue | null>(null);
  const [resolvedOpen, setResolvedOpen] = useState(false);

  const resolveIssue = useMutation(api.partsBulkUpload.resolveIssue);

  const batches = useQuery(
    api.partsBulkUpload.listBatches,
    orgId ? { organizationId: orgId } : "skip",
  ) as UploadBatch[] | undefined;

  const batchDetail = useQuery(
    api.partsBulkUpload.getBatch,
    selectedBatchId ? { batchId: selectedBatchId } : "skip",
  );

  const issues = useQuery(
    api.partsBulkUpload.listBatchIssues,
    selectedBatchId ? { batchId: selectedBatchId } : "skip",
  ) as BatchIssue[] | undefined;

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded,
  });

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="p-6 space-y-3" data-testid="page-loading-state">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-64 w-80" />
          <Skeleton className="h-64 flex-1" />
        </div>
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Import issues require organization setup"
        missingInfo="Complete onboarding to manage parts import issues."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  const openIssues = (issues ?? []).filter((i) => !i.resolvedAt);
  const resolvedIssues = (issues ?? []).filter((i) => !!i.resolvedAt);

  const handleSkip = async (issueId: Id<"partUploadIssues">) => {
    try {
      await resolveIssue({ issueId, resolution: "skipped" });
      toast.success("Issue skipped.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to skip issue");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel: batch list */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Upload Batches</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {batches === undefined ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : batches.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No upload batches yet. Use Parts → Bulk Upload to import parts.
            </div>
          ) : (
            <div className="divide-y">
              {batches.map((batch) => {
                const isSelected = selectedBatchId === batch._id;
                return (
                  <button
                    key={batch._id}
                    onClick={() => {
                      setSelectedBatchId(batch._id);
                      setEditingIssue(null);
                    }}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                      isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{batch.batchLabel}</p>
                        <p className="text-xs text-muted-foreground truncate">{batch.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${BATCH_STATUS_STYLES[batch.status]}`}
                      >
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex gap-2 text-[10px]">
                      <span className="text-red-400">{batch.errorCount} errors</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-green-400">{batch.successCount} ok</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: issue table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedBatchId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm">Select a batch to view issues</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">
                    {batchDetail?.batchLabel ?? "Loading…"}
                  </h2>
                  <p className="text-xs text-muted-foreground">{batchDetail?.fileName}</p>
                </div>
                {batchDetail && (
                  <Badge
                    variant="outline"
                    className={`${BATCH_STATUS_STYLES[batchDetail.status as BatchStatus]} shrink-0`}
                  >
                    {batchDetail.status}
                  </Badge>
                )}
              </div>
              {batchDetail && (
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total issues: </span>
                    <span className="font-medium">
                      {(batchDetail as typeof batchDetail & { resolvedIssueCount?: number; unresolvedIssueCount?: number }).unresolvedIssueCount !== undefined
                        ? ((batchDetail as typeof batchDetail & { resolvedIssueCount: number; unresolvedIssueCount: number }).unresolvedIssueCount + (batchDetail as typeof batchDetail & { resolvedIssueCount: number; unresolvedIssueCount: number }).resolvedIssueCount)
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Open: </span>
                    <span className="font-medium text-red-400">{openIssues.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolved: </span>
                    <span className="font-medium text-green-400">{resolvedIssues.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Issue table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {issues === undefined ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : openIssues.length === 0 && resolvedIssues.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500/50 mb-2" />
                  <p className="text-sm">No issues in this batch — all rows were processed successfully.</p>
                </div>
              ) : (
                <>
                  {/* Open issues table */}
                  {openIssues.length > 0 && (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs w-12">Row</TableHead>
                            <TableHead className="text-xs">Part Number</TableHead>
                            <TableHead className="text-xs">Issue Type</TableHead>
                            <TableHead className="text-xs">Field</TableHead>
                            <TableHead className="text-xs">Message</TableHead>
                            <TableHead className="text-xs w-8">Sev.</TableHead>
                            <TableHead className="text-xs w-40">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openIssues.map((issue) => (
                            <TableRow key={issue._id}>
                              <TableCell className="text-xs text-muted-foreground">
                                {issue.rowIndex + 2}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{issue.partNumber}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${ISSUE_TYPE_STYLES[issue.issueType]}`}
                                >
                                  {ISSUE_TYPE_LABELS[issue.issueType]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                                {issue.fieldName ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs max-w-[240px]">
                                <span className="line-clamp-2">{issue.message}</span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    issue.severity === "error"
                                      ? "border-red-500/30 text-red-400"
                                      : "border-amber-500/30 text-amber-400"
                                  }`}
                                >
                                  {issue.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => setEditingIssue(issue)}
                                  >
                                    Edit &amp; Resolve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-2 text-muted-foreground"
                                    onClick={() => handleSkip(issue._id)}
                                  >
                                    Skip
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Resolved issues — collapsible */}
                  {resolvedIssues.length > 0 && (
                    <Collapsible open={resolvedOpen} onOpenChange={setResolvedOpen}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                          {resolvedOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          Resolved ({resolvedIssues.length})
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-md border overflow-hidden opacity-60">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs w-12">Row</TableHead>
                                <TableHead className="text-xs">Part Number</TableHead>
                                <TableHead className="text-xs">Issue Type</TableHead>
                                <TableHead className="text-xs">Message</TableHead>
                                <TableHead className="text-xs">Resolution</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {resolvedIssues.map((issue) => (
                                <TableRow key={issue._id} className="text-muted-foreground">
                                  <TableCell className="text-xs">{issue.rowIndex + 2}</TableCell>
                                  <TableCell className="font-mono text-xs">{issue.partNumber}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px]">
                                      {ISSUE_TYPE_LABELS[issue.issueType]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[240px]">
                                    <span className="line-clamp-1">{issue.message}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {issue.resolution ?? "resolved"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit & Resolve Sheet */}
      <EditResolveSheet
        issue={editingIssue}
        orgId={orgId}
        onClose={() => setEditingIssue(null)}
      />
    </div>
  );
}
