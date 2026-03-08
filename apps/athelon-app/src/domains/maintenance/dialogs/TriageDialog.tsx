/**
 * TriageDialog — Mark a finding as triaged with notes and optional severity override.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { UnaccountedFinding, FindingSeverity } from "../types";
import { useTriageFinding } from "../api";

interface TriageDialogProps {
  finding: UnaccountedFinding | null;
  onClose: () => void;
}

export function TriageDialog({ finding, onClose }: TriageDialogProps) {
  const [notes, setNotes] = useState("");
  const [severity, setSeverity] = useState<FindingSeverity | "">("");
  const [submitting, setSubmitting] = useState(false);
  const triageMutation = useTriageFinding();

  const handleSubmit = async () => {
    if (!finding || !notes.trim()) return;
    setSubmitting(true);
    try {
      await triageMutation(finding._id, notes, severity || undefined);
      onClose();
      setNotes("");
      setSeverity("");
    } catch (err) {
      console.error("Triage failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setNotes("");
      setSeverity("");
    }
  };

  return (
    <Dialog open={!!finding} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="triage-dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Triage Finding</DialogTitle>
          <DialogDescription className="text-xs">
            Review and triage{" "}
            <span className="font-mono font-medium">{finding?.referenceNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {finding && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">{finding.title}</p>
              <p className="text-xs text-muted-foreground">{finding.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">
                  {finding.aircraftRegistration}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {finding.severity.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Triage Notes <span className="text-red-400">*</span>
              </label>
              <Textarea
                placeholder="Assessment, next steps, recommendations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-xs"
                data-testid="triage-notes"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Override Severity (optional)
              </label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as FindingSeverity)}>
                <SelectTrigger className="h-8 text-xs" data-testid="triage-severity">
                  <SelectValue placeholder="Keep current severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!notes.trim() || submitting}
            className="text-xs"
            data-testid="triage-submit"
          >
            {submitting ? "Saving…" : "Mark as Triaged"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
