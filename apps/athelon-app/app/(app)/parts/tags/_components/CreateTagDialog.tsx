"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: "tag" | "subtag";
  categoryId?: string;
  tagId?: string;
  categoryType?: string;
  onCreated?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTagDialog({
  open,
  onOpenChange,
  level,
  categoryId,
  tagId,
  categoryType,
  onCreated,
}: CreateTagDialogProps) {
  const { orgId } = useCurrentOrg();
  const createTag = useMutation(api.partTags.createTag);
  const createSubtag = useMutation(api.partTags.createSubtag);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // Aircraft-type specific fields (level="tag")
  const [aircraftMake, setAircraftMake] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");

  // Engine-type specific fields (level="tag")
  const [engineMake, setEngineMake] = useState("");
  const [engineModel, setEngineModel] = useState("");

  // Aircraft-type specific fields (level="subtag")
  const [aircraftSeries, setAircraftSeries] = useState("");

  function resetForm() {
    setName("");
    setCode("");
    setDescription("");
    setDisplayOrder(0);
    setAircraftMake("");
    setAircraftModel("");
    setEngineMake("");
    setEngineModel("");
    setAircraftSeries("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim()) return;

    setSaving(true);
    try {
      if (level === "tag" && categoryId) {
        await createTag({
          organizationId: orgId,
          categoryId: categoryId as Id<"tagCategories">,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          aircraftMake:
            categoryType === "aircraft_type" && aircraftMake.trim()
              ? aircraftMake.trim()
              : undefined,
          aircraftModel:
            categoryType === "aircraft_type" && aircraftModel.trim()
              ? aircraftModel.trim()
              : undefined,
          engineMake:
            categoryType === "engine_type" && engineMake.trim()
              ? engineMake.trim()
              : undefined,
          engineModel:
            categoryType === "engine_type" && engineModel.trim()
              ? engineModel.trim()
              : undefined,
          displayOrder,
        });
        toast.success(`Tag "${name.trim()}" created`);
      } else if (level === "subtag" && tagId) {
        await createSubtag({
          organizationId: orgId,
          tagId: tagId as Id<"tags">,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          aircraftSeries:
            categoryType === "aircraft_type" && aircraftSeries.trim()
              ? aircraftSeries.trim()
              : undefined,
          displayOrder,
        });
        toast.success(`Subtag "${name.trim()}" created`);
      }

      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const dialogTitle = level === "tag" ? "Create Tag" : "Create Subtag";
  const dialogDescription =
    level === "tag"
      ? "Add a new tag to this category."
      : "Add a new subtag under this tag.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tag-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={level === "tag" ? "e.g. Cessna 172" : "e.g. 172S"}
                required
              />
            </div>

            {/* Code */}
            <div className="space-y-1.5">
              <Label htmlFor="tag-code">Code</Label>
              <Input
                id="tag-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. C172"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="tag-description">Description</Label>
              <Input
                id="tag-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            {/* Aircraft-type fields for tags */}
            {level === "tag" && categoryType === "aircraft_type" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="aircraft-make">Aircraft Make</Label>
                  <Input
                    id="aircraft-make"
                    value={aircraftMake}
                    onChange={(e) => setAircraftMake(e.target.value)}
                    placeholder="e.g. Cessna"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aircraft-model">Aircraft Model</Label>
                  <Input
                    id="aircraft-model"
                    value={aircraftModel}
                    onChange={(e) => setAircraftModel(e.target.value)}
                    placeholder="e.g. 172"
                  />
                </div>
              </>
            )}

            {/* Engine-type fields for tags */}
            {level === "tag" && categoryType === "engine_type" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="engine-make">Engine Make</Label>
                  <Input
                    id="engine-make"
                    value={engineMake}
                    onChange={(e) => setEngineMake(e.target.value)}
                    placeholder="e.g. Lycoming"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="engine-model">Engine Model</Label>
                  <Input
                    id="engine-model"
                    value={engineModel}
                    onChange={(e) => setEngineModel(e.target.value)}
                    placeholder="e.g. IO-360"
                  />
                </div>
              </>
            )}

            {/* Aircraft-series field for subtags under aircraft_type */}
            {level === "subtag" && categoryType === "aircraft_type" && (
              <div className="space-y-1.5">
                <Label htmlFor="aircraft-series">Aircraft Series</Label>
                <Input
                  id="aircraft-series"
                  value={aircraftSeries}
                  onChange={(e) => setAircraftSeries(e.target.value)}
                  placeholder="e.g. 172S Skyhawk SP"
                />
              </div>
            )}

            {/* Display Order */}
            <div className="space-y-1.5">
              <Label htmlFor="display-order">Display Order</Label>
              <Input
                id="display-order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {level === "tag" ? "Create Tag" : "Create Subtag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
