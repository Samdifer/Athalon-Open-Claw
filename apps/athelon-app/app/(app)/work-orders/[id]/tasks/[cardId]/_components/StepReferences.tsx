"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

type RefType = "pdf" | "link" | "file";

type StepRef = {
  id: string;
  stepId: string;
  stepNumber: number;
  title: string;
  type: RefType;
  url: string;
  notes?: string;
  createdAt: number;
};

type Step = {
  _id: string;
  stepNumber: number;
  description: string;
};

export function StepReferences({ workOrderId, taskCardId, steps }: { workOrderId: string; taskCardId: string; steps: Step[] }) {
  const storageKey = useMemo(() => `step-references:${workOrderId}:${taskCardId}`, [workOrderId, taskCardId]);
  const [refs, setRefs] = useState<StepRef[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setRefs(raw ? (JSON.parse(raw) as StepRef[]) : []);
    } catch {
      setRefs([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(refs));
    } catch {
      // Ignore storage write failures (quota/private mode).
    }
  }, [refs, storageKey]);

  function addReference(ref: Omit<StepRef, "id" | "createdAt">) {
    setRefs((prev) => [
      {
        ...ref,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    toast.success("Reference added");
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Reference Docs (Step Level)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {steps
          .slice()
          .sort((a, b) => a.stepNumber - b.stepNumber)
          .map((step) => {
            const stepRefs = refs.filter((r) => r.stepId === step._id);
            return (
              <div key={step._id} className="rounded-md border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Step {step.stepNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                  </div>
                  <AddReferenceDialog
                    stepId={step._id}
                    stepNumber={step.stepNumber}
                    onSave={addReference}
                  />
                </div>
                {stepRefs.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">No references added.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stepRefs.map((ref) => (
                      <div key={ref.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground truncate">{ref.title}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{ref.type}</Badge>
                          </div>
                          <a href={ref.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate block">
                            {ref.url}
                          </a>
                          {ref.notes && <p className="text-[11px] text-muted-foreground">{ref.notes}</p>}
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(ref.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

function AddReferenceDialog({ stepId, stepNumber, onSave }: { stepId: string; stepNumber: number; onSave: (ref: Omit<StepRef, "id" | "createdAt">) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<RefType>("pdf");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

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
          <Input placeholder="URL or path" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!title.trim() || !url.trim()) {
                  toast.error("Title and URL/path are required");
                  return;
                }
                onSave({
                  stepId,
                  stepNumber,
                  title: title.trim(),
                  type,
                  url: url.trim(),
                  notes: notes.trim() || undefined,
                });
                setOpen(false);
                setTitle("");
                setType("pdf");
                setUrl("");
                setNotes("");
              }}
            >
              Save Reference
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
