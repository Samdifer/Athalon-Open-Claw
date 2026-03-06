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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LocationLevel = "warehouse" | "area" | "shelf" | "shelfLocation" | "bin";

interface CreateLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: LocationLevel;
  parentId?: string;
  onCreated?: () => void;
}

const LEVEL_LABELS: Record<LocationLevel, string> = {
  warehouse: "Warehouse",
  area: "Area",
  shelf: "Shelf",
  shelfLocation: "Shelf Location",
  bin: "Bin",
};

const AREA_TYPES = [
  { value: "general", label: "General" },
  { value: "hazmat", label: "Hazmat" },
  { value: "temperature_controlled", label: "Temperature Controlled" },
  { value: "secure", label: "Secure" },
  { value: "quarantine", label: "Quarantine" },
  { value: "receiving", label: "Receiving" },
] as const;

type AreaType = (typeof AREA_TYPES)[number]["value"];

export function CreateLocationDialog({
  open,
  onOpenChange,
  level,
  parentId,
  onCreated,
}: CreateLocationDialogProps) {
  const { orgId } = useCurrentOrg();

  const createWarehouse = useMutation(api.warehouseLocations.createWarehouse);
  const createArea = useMutation(api.warehouseLocations.createArea);
  const createShelf = useMutation(api.warehouseLocations.createShelf);
  const createShelfLocation = useMutation(api.warehouseLocations.createShelfLocation);
  const createBin = useMutation(api.warehouseLocations.createBin);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [areaType, setAreaType] = useState<AreaType>("general");
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setCode("");
    setDescription("");
    setAddress("");
    setAreaType("general");
    setBarcode("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!orgId) {
      toast.error("Organization not found");
      return;
    }

    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }

    setIsSubmitting(true);

    try {
      switch (level) {
        case "warehouse":
          await createWarehouse({
            organizationId: orgId,
            name: name.trim(),
            code: code.trim(),
            description: description.trim() || undefined,
            address: address.trim() || undefined,
          });
          break;

        case "area":
          if (!parentId) throw new Error("Warehouse ID required");
          await createArea({
            organizationId: orgId,
            warehouseId: parentId as Id<"warehouses">,
            name: name.trim(),
            code: code.trim(),
            description: description.trim() || undefined,
            areaType,
          });
          break;

        case "shelf":
          if (!parentId) throw new Error("Area ID required");
          await createShelf({
            organizationId: orgId,
            areaId: parentId as Id<"warehouseAreas">,
            name: name.trim(),
            code: code.trim(),
            description: description.trim() || undefined,
          });
          break;

        case "shelfLocation":
          if (!parentId) throw new Error("Shelf ID required");
          await createShelfLocation({
            organizationId: orgId,
            shelfId: parentId as Id<"warehouseShelves">,
            name: name.trim(),
            code: code.trim(),
          });
          break;

        case "bin":
          if (!parentId) throw new Error("Shelf Location ID required");
          await createBin({
            organizationId: orgId,
            shelfLocationId: parentId as Id<"warehouseShelfLocations">,
            name: name.trim(),
            code: code.trim(),
            barcode: barcode.trim() || undefined,
          });
          break;
      }

      toast.success(`${LEVEL_LABELS[level]} created successfully`);
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to create ${LEVEL_LABELS[level].toLowerCase()}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {LEVEL_LABELS[level]}</DialogTitle>
          <DialogDescription>
            Add a new {LEVEL_LABELS[level].toLowerCase()} to your warehouse hierarchy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-name">Name *</Label>
            <Input
              id="location-name"
              placeholder={`${LEVEL_LABELS[level]} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-code">Code *</Label>
            <Input
              id="location-code"
              placeholder="Short code (e.g. WH-01)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          {(level === "warehouse" || level === "area" || level === "shelf") && (
            <div className="space-y-2">
              <Label htmlFor="location-description">Description</Label>
              <Input
                id="location-description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          {level === "warehouse" && (
            <div className="space-y-2">
              <Label htmlFor="location-address">Address</Label>
              <Input
                id="location-address"
                placeholder="Physical address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}

          {level === "area" && (
            <div className="space-y-2">
              <Label htmlFor="area-type">Area Type</Label>
              <Select
                value={areaType}
                onValueChange={(val) => setAreaType(val as AreaType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select area type" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {level === "bin" && (
            <div className="space-y-2">
              <Label htmlFor="bin-barcode">Barcode</Label>
              <Input
                id="bin-barcode"
                placeholder="Optional barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create {LEVEL_LABELS[level]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
