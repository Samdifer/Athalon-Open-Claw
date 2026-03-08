/**
 * CreateWorkOrderDialog — Create a new work order from a finding.
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { UnaccountedFinding } from "../types";
import { useCreateWorkOrderFromFinding } from "../api";

interface CreateWorkOrderDialogProps {
  finding: UnaccountedFinding | null;
  onClose: () => void;
}

export function CreateWorkOrderDialog({ finding, onClose }: CreateWorkOrderDialogProps) {
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "aog">("routine");
  const [submitting, setSubmitting] = useState(false);
  const createMutation = useCreateWorkOrderFromFinding();

  const handleOpen = () => {
    if (finding) {
      setDescription(
        `${finding.referenceNumber}: ${finding.title}\n\n${finding.description}`,
      );
      setPriority(finding.severity === "critical" ? "aog" : finding.severity === "high" ? "urgent" : "routine");
    }
  };

  const handleSubmit = async () => {
    if (!finding || !description.trim()) return;
    setSubmitting(true);
    try {
      await createMutation(finding._id, description, priority, finding.aircraftId);
      onClose();
      setDescription("");
      setPriority("routine");
    } catch (err) {
      console.error("Create WO failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      handleOpen();
    } else {
      onClose();
      setDescription("");
      setPriority("routine");
    }
  };

  return (
    <Dialog open={!!finding} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="create-wo-dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Work Order from Finding</DialogTitle>
          <DialogDescription className="text-xs">
            Create a new work order for{" "}
            <span className="font-mono font-medium">{finding?.referenceNumber}</span>{" "}
            on{" "}
            <span className="font-medium">{finding?.aircraftRegistration}</span>
          </DialogDescription>
        </DialogHeader>

        {finding && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded p-3">
              <div className="flex gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">
                  {finding.aircraftRegistration}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {finding.aircraftType}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Work Order Description <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="text-xs"
                data-testid="create-wo-description"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Priority
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="h-8 text-xs" data-testid="create-wo-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine" className="text-xs">Routine</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                  <SelectItem value="aog" className="text-xs">AOG</SelectItem>
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
            disabled={!description.trim() || submitting}
            className="text-xs gap-1"
            data-testid="create-wo-submit"
          >
            <Plus className="w-3 h-3" />
            {submitting ? "Creating…" : "Create Work Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
