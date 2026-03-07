"use client";

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useRbac } from "@/hooks/useRbac";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isTechnicalRole } from "@/src/shared/lib/personnelRoles";

function toDateInput(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

export default function TechnicianTrainingPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId, isLoaded } = useCurrentOrg();
  const { hasPermission } = useRbac();
  const canEdit = hasPermission("personnel.update") || hasPermission("personnel.create") || hasPermission("personnel.delete");

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const orgTraining = useQuery(
    api.technicianTraining.listByOrg,
    orgId ? { organizationId: orgId } : "skip",
  );

  const addTraining = useMutation(api.technicianTraining.addTraining);
  const updateTraining = useMutation(api.technicianTraining.updateTraining);
  const removeTraining = useMutation(api.technicianTraining.removeTraining);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"technicianTraining"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingId, setIsRemovingId] = useState<Id<"technicianTraining"> | null>(null);

  const [trainingType, setTrainingType] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [certificateRef, setCertificateRef] = useState("");

  const isLoading = !isLoaded || technicians === undefined || orgTraining === undefined;

  const technician = useMemo(
    () => (technicians ?? []).find((t) => t._id === id),
    [technicians, id],
  );

  const records = useMemo(
    () =>
      (orgTraining ?? [])
        .filter((record) => record.technicianId === id)
        .sort((a, b) => b.completedAt - a.completedAt),
    [orgTraining, id],
  );

  function resetForm() {
    setEditingId(null);
    setTrainingType("");
    setCompletedAt("");
    setExpiresAt("");
    setCertificateRef("");
  }

  function openCreateDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(record: (typeof records)[number]) {
    setEditingId(record._id);
    setTrainingType(record.trainingType);
    setCompletedAt(toDateInput(record.completedAt));
    setExpiresAt(toDateInput(record.expiresAt));
    setCertificateRef(record.certificateRef ?? "");
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!orgId || !id) return;
    if (!trainingType.trim() || !completedAt) {
      toast.error("Training type and completion date are required.");
      return;
    }

    if (expiresAt && expiresAt <= completedAt) {
      toast.error("Expiry date must be after completion date.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateTraining({
          trainingId: editingId,
          trainingType: trainingType.trim(),
          completedAt: new Date(completedAt).getTime(),
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
          certificateRef: certificateRef.trim() || undefined,
        });
        toast.success("Training record updated.");
      } else {
        await addTraining({
          technicianId: id as Id<"technicians">,
          organizationId: orgId,
          trainingType: trainingType.trim(),
          completedAt: new Date(completedAt).getTime(),
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
          certificateRef: certificateRef.trim() || undefined,
        });
        toast.success("Training record added.");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save training record.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(trainingId: Id<"technicianTraining">) {
    setIsRemovingId(trainingId);
    try {
      await removeTraining({ trainingId });
      toast.success("Training record archived.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive record.");
    } finally {
      setIsRemovingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to resolve organization context. Reload and try again.
        </CardContent>
      </Card>
    );
  }

  if (!technician) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Technician not found in this organization.
        </CardContent>
      </Card>
    );
  }

  const technicalRole = isTechnicalRole(technician.role);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link to="/personnel">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Personnel
              </Button>
            </Link>
            <Badge variant="outline" className="text-[10px]">Training</Badge>
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
            {technician.legalName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {technicalRole
              ? "Manage technician-specific qualification and recurrent training records."
              : "Non-technical role: certification and technical compliance requirements are suppressed."}
          </p>
        </div>

        {canEdit && (
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-1" /> Add Record
          </Button>
        )}
      </div>

      {!canEdit && (
        <Card className="border-border/60">
          <CardContent className="py-4 text-sm text-muted-foreground">
            You have view-only access. Contact a manager/admin to update training records.
          </CardContent>
        </Card>
      )}

      {records.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No training records found for this technician yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const isExpired = record.expiresAt !== undefined && record.expiresAt < Date.now();
            const isExpiringSoon =
              record.expiresAt !== undefined &&
              record.expiresAt >= Date.now() &&
              record.expiresAt <= Date.now() + 1000 * 60 * 60 * 24 * 30;

            return (
              <Card key={record._id} className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{record.trainingType}</CardTitle>
                    {record.expiresAt ? (
                      <Badge
                        variant="outline"
                        className={
                          isExpired
                            ? "text-red-500 border-red-500/40"
                            : isExpiringSoon
                              ? "text-amber-500 border-amber-500/40"
                              : "text-emerald-500 border-emerald-500/40"
                        }
                      >
                        {isExpired ? "Expired" : isExpiringSoon ? "Expiring Soon" : "Current"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No Expiry</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">Completed:</span>{" "}
                    {new Date(record.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Expires:</span>{" "}
                    {record.expiresAt
                      ? new Date(record.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })
                      : "No expiry"}
                  </p>
                  {technicalRole && (
                    <p>
                      <span className="text-muted-foreground">Certificate:</span>{" "}
                      {record.certificateRef || "Not provided"}
                    </p>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="h-7" onClick={() => openEditDialog(record)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => handleArchive(record._id)}
                        disabled={isRemovingId === record._id}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        {isRemovingId === record._id ? "Archiving..." : "Archive"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Training Record" : "Add Training Record"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Training Type</Label>
              <Input
                value={trainingType}
                onChange={(e) => setTrainingType(e.target.value)}
                placeholder="e.g. 91.411, NDT Level II, borescope"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Completed</Label>
                <Input
                  type="date"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expires (optional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            {technicalRole && (
              <div className="space-y-1.5">
                <Label>Certificate Reference (optional)</Label>
                <Input
                  value={certificateRef}
                  onChange={(e) => setCertificateRef(e.target.value)}
                  placeholder="Certificate number, doc ref, or storage key"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
