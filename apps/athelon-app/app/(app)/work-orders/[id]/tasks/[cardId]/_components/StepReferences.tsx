"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileUpload, type UploadedFile } from "@/components/FileUpload";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/format";

type RefType = "pdf" | "link" | "file";

type Step = {
  _id: string;
  stepNumber: number;
  description: string;
};

export function StepReferences({ orgId, workOrderId, taskCardId, steps, readOnly = false }: { orgId?: string; workOrderId: string; taskCardId: string; steps: Step[]; readOnly?: boolean }) {
  const refs = useQuery(api.taskStepReferences.listForTaskCard, {
    taskCardId: taskCardId as Id<"taskCards">,
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Reference Docs (Step Level)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No steps available for reference attachments on this task card.
          </p>
        ) : (
          steps
            .slice()
            .sort((a, b) => a.stepNumber - b.stepNumber)
            .map((step) => {
              const stepRefs = (refs ?? []).filter((r) => String(r.stepId) === step._id);
              return (
                <div key={step._id} className="rounded-md border border-border/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">Step {step.stepNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    </div>
                    {!readOnly ? (
                      <AddReferenceDialog
                        orgId={orgId}
                        workOrderId={workOrderId}
                        taskCardId={taskCardId}
                        stepId={step._id}
                        stepNumber={step.stepNumber}
                      />
                    ) : null}
                  </div>
                  {stepRefs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">No references added.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {stepRefs.map((ref) => (
                        <StepReferenceRow key={String(ref._id)} refItem={ref} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </CardContent>
    </Card>
  );
}

function StepReferenceRow({
  refItem,
}: {
  refItem: {
    _id: Id<"taskStepReferences">;
    title: string;
    referenceType: RefType;
    url: string;
    notes?: string;
    createdAt: number;
    storageId?: Id<"_storage">;
  };
}) {
  const storageUrl = useQuery(
    api.documents.getDocumentUrl,
    refItem.storageId ? { storageId: refItem.storageId } : "skip",
  );
  const resolvedUrl = storageUrl ?? refItem.url;

  return (
    <div className="flex items-center justify-between gap-2 text-xs rounded border border-border/40 p-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground truncate">{refItem.title}</span>
          <Badge variant="outline" className="text-[10px] uppercase">{refItem.referenceType}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{resolvedUrl}</p>
        {refItem.notes && <p className="text-[11px] text-muted-foreground">{refItem.notes}</p>}
        <p className="text-[10px] text-muted-foreground">{formatDateTime(refItem.createdAt)}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
        <a href={resolvedUrl} target="_blank" rel="noreferrer">View</a>
      </Button>
    </div>
  );
}

function AddReferenceDialog({
  orgId,
  workOrderId,
  taskCardId,
  stepId,
  stepNumber,
}: {
  orgId?: string;
  workOrderId: string;
  taskCardId: string;
  stepId: string;
  stepNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<RefType>("pdf");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const addReference = useMutation(api.taskStepReferences.addReference);
  const saveDocument = useMutation(api.documents.saveDocument);

  async function handleSave() {
    if (!orgId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      let documentId: Id<"documents"> | undefined;
      let storageId: Id<"_storage"> | undefined;
      let resolvedUrl = url.trim();

      if (uploadedFile) {
        storageId = uploadedFile.storageId as Id<"_storage">;
        documentId = await saveDocument({
          organizationId: orgId as Id<"organizations">,
          attachedToTable: "taskCardSteps",
          attachedToId: stepId,
          storageId,
          fileName: uploadedFile.fileName,
          fileSize: uploadedFile.fileSize,
          mimeType: uploadedFile.mimeType,
          documentType: "approved_data",
          description: `Step ${stepNumber} reference`,
        });
        resolvedUrl = `uploaded://${uploadedFile.fileName}`;
      }

      if (!resolvedUrl) {
        toast.error("Provide a URL or upload a file.");
        return;
      }

      await addReference({
        organizationId: orgId as Id<"organizations">,
        workOrderId: workOrderId as Id<"workOrders">,
        taskCardId: taskCardId as Id<"taskCards">,
        stepId: stepId as Id<"taskCardSteps">,
        referenceType: type,
        title: title.trim(),
        url: resolvedUrl,
        notes: notes.trim() || undefined,
        documentId,
        storageId,
      });

      toast.success("Reference added");
      setOpen(false);
      setTitle("");
      setType("pdf");
      setUrl("");
      setNotes("");
      setUploadedFile(null);
    } catch {
      toast.error("Failed to add reference");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">Add Reference</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Reference — Step {stepNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {(["pdf", "link", "file"] as RefType[]).map((t) => (
              <Button key={t} type="button" variant={type === t ? "default" : "outline"} onClick={() => setType(t)} className="capitalize">
                {t}
              </Button>
            ))}
          </div>
          <Input placeholder="URL (optional if uploading)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <FileUpload
            accept="documents"
            compact
            onUpload={(file) => {
              setUploadedFile(file);
              setType(file.mimeType === "application/pdf" ? "pdf" : "file");
            }}
          />
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={() => void handleSave()}>Save Reference</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
