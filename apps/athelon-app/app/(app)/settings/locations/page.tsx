"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  Plus,
  MapPin,
  Building2,
  Phone,
  Mail,
  Star,
  Loader2,
  Pencil,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

const CERT_TYPES = [
  { value: "part_145", label: "Part 145" },
  { value: "part_135", label: "Part 135" },
  { value: "part_121", label: "Part 121" },
  { value: "part_91", label: "Part 91" },
] as const;

const AVIATION_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET) - America/New_York" },
  { value: "America/Chicago", label: "Central (CT) - America/Chicago" },
  { value: "America/Denver", label: "Mountain (MT) - America/Denver" },
  { value: "America/Phoenix", label: "Mountain (no DST) - America/Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific (PT) - America/Los_Angeles" },
  { value: "America/Anchorage", label: "Alaska (AKT) - America/Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST) - Pacific/Honolulu" },
  { value: "UTC", label: "UTC / Zulu" },
] as const;

type LocationFormState = {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  certNumber: string;
  certType: string;
  timezone: string;
  isPrimary: boolean;
  capabilities: string;
};

const EMPTY_FORM: LocationFormState = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  certNumber: "",
  certType: "",
  timezone: "",
  isPrimary: false,
  capabilities: "",
};

function formatCapabilities(value?: string[]) {
  return value?.join(", ") ?? "";
}

function normalizeCapabilities(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function certBadgeLabel(certType?: string) {
  return certType?.replace("_", " ").toUpperCase();
}

export default function ShopLocationsPage() {
  const { orgId: organizationId, isLoaded } = useCurrentOrg();
  const orgId = organizationId as Id<"organizations"> | undefined;
  const locations = useQuery(api.shopLocations.list, orgId ? { organizationId: orgId } : "skip");
  const createLocation = useMutation(api.shopLocations.create);
  const updateLocation = useMutation(api.shopLocations.update);
  const removeLocation = useMutation(api.shopLocations.remove);

  const [deactivateTarget, setDeactivateTarget] = useState<{
    id: Id<"shopLocations">;
    name: string;
    certNumber?: string;
  } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<Id<"shopLocations"> | null>(null);
  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || locations === undefined,
  });

  const isEditing = editingLocationId !== null;

  function updateForm<K extends keyof LocationFormState>(field: K, value: LocationFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingLocationId(null);
  }

  function openCreateDialog() {
    resetForm();
    setShowDialog(true);
  }

  function openEditDialog(location: Doc<"shopLocations">) {
    setEditingLocationId(location._id);
    setForm({
      name: location.name ?? "",
      code: location.code ?? "",
      address: location.address ?? "",
      city: location.city ?? "",
      state: location.state ?? "",
      zip: location.zip ?? "",
      phone: location.phone ?? "",
      email: location.email ?? "",
      certNumber:
        location.repairStationCertificateNumber ?? location.certificateNumber ?? "",
      certType: location.certificateType ?? "",
      timezone: location.timezone ?? "",
      isPrimary: Boolean(location.isPrimary),
      capabilities: formatCapabilities(location.capabilities),
    });
    setShowDialog(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setShowDialog(open);
    if (!open) {
      resetForm();
    }
  }

  async function handleSave() {
    if (!orgId) {
      toast.error("Complete setup before managing shop locations.");
      return;
    }

    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zip: form.zip.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      certificateNumber: form.certNumber.trim() || undefined,
      certificateType: form.certType
        ? (form.certType as "part_145" | "part_135" | "part_121" | "part_91")
        : undefined,
      timezone: form.timezone || undefined,
      isPrimary: form.isPrimary || undefined,
      capabilities: normalizeCapabilities(form.capabilities),
    };

    try {
      if (isEditing && editingLocationId) {
        await updateLocation({
          id: editingLocationId,
          ...payload,
          capabilities: payload.capabilities.length > 0 ? payload.capabilities : undefined,
        });
        toast.success("Location updated");
      } else {
        await createLocation({
          organizationId: orgId,
          ...payload,
          capabilities: payload.capabilities.length > 0 ? payload.capabilities : undefined,
        });
        toast.success("Location created");
      }
      handleDialogOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Failed to update location" : "Failed to create location");
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await removeLocation({ id: deactivateTarget.id });
      toast.success(`${deactivateTarget.name} deactivated`);
      setDeactivateTarget(null);
    } catch (error) {
      toast.error("Failed to deactivate location");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleTogglePrimary(id: Id<"shopLocations">, current: boolean | undefined) {
    try {
      await updateLocation({ id, isPrimary: !current });
      toast.success(current ? "Removed primary" : "Set as primary");
    } catch (error) {
      toast.error("Failed to update primary location");
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="page-loading-state">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Shop locations require organization setup"
        missingInfo="Complete onboarding before adding shop locations and certificates."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !locations) return null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Shop Locations
            </h1>
            <p className="text-muted-foreground">
              Manage multi-shop locations, certificates, and timezones.
            </p>
          </div>

          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        <Dialog open={showDialog} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Shop Location" : "Add Shop Location"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Main Hangar"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value)}
                    placeholder="MH1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(event) => updateForm("address", event.target.value)}
                  placeholder="123 Airport Rd"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(event) => updateForm("city", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} onChange={(event) => updateForm("state", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={(event) => updateForm("zip", event.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Certificate #</Label>
                  <Input
                    value={form.certNumber}
                    onChange={(event) => updateForm("certNumber", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Certificate Type</Label>
                  <Select
                    value={form.certType || "_none"}
                    onValueChange={(value) =>
                      updateForm("certType", value === "_none" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {CERT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select
                  value={form.timezone || "_none"}
                  onValueChange={(value) =>
                    updateForm("timezone", value === "_none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Use organization default</SelectItem>
                    {AVIATION_TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Capabilities (comma-separated)</Label>
                <Input
                  value={form.capabilities}
                  onChange={(event) => updateForm("capabilities", event.target.value)}
                  placeholder="Airframe, Powerplant, Avionics"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="primary-location">Primary location</Label>
                  <p className="text-xs text-muted-foreground">
                    Primary locations are used as the default station for new workflows.
                  </p>
                </div>
                <Switch
                  id="primary-location"
                  checked={form.isPrimary}
                  onCheckedChange={(checked) => updateForm("isPrimary", checked)}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                {isEditing ? "Save Changes" : "Create Location"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Map integration coming soon</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.length === 0 && (
            <div className="col-span-full">
              <ActionableEmptyState
                title="No locations yet"
                missingInfo="Add your first shop location to support bay scheduling and compliance workflows."
                primaryActionLabel="Add Location"
                primaryActionType="button"
                primaryActionTarget={openCreateDialog}
              />
            </div>
          )}

          {locations.map((location) => (
            <Card key={location._id} className={!location.isActive ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {location.isPrimary && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    {location.name}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono">
                    {location.code}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {location.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[location.address, location.city, location.state, location.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

                {location.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {location.phone}
                  </p>
                )}

                {location.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {location.email}
                  </p>
                )}

                {location.timezone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {location.timezone}
                  </p>
                )}

                {location.certificateNumber && (
                  <div className="flex items-center gap-2">
                    {location.certificateType && (
                      <Badge variant="secondary">{certBadgeLabel(location.certificateType)}</Badge>
                    )}
                    <span className="text-sm font-mono">{location.certificateNumber}</span>
                  </div>
                )}

                {location.capabilities && location.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {location.capabilities.map((capability) => (
                      <Badge key={capability} variant="outline" className="text-xs">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(location)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTogglePrimary(location._id, location.isPrimary)}
                    className="gap-1.5"
                  >
                    <Star className={`h-3 w-3 ${location.isPrimary ? "text-yellow-500" : ""}`} />
                    {location.isPrimary ? "Primary" : "Make Primary"}
                  </Button>

                  {location.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400"
                      onClick={() =>
                        setDeactivateTarget({
                          id: location._id,
                          name: location.name,
                          certNumber: location.certificateNumber,
                        })
                      }
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This location will be marked inactive and removed from scheduling and work order assignment.
              {deactivateTarget?.certNumber && (
                <>
                  {" "}
                  Certificate{" "}
                  <span className="font-mono font-semibold">{deactivateTarget.certNumber}</span>{" "}
                  will no longer be associated with active operations.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
