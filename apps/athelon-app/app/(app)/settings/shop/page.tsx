"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Settings,
  Building2,
  Clock,
  Palette,
  ExternalLink,
  Save,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { AVIATION_TIMEZONES } from "@/src/shared/lib/timezones";

export default function ShopSettingsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const shops = useQuery(
    api.shopLocations.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const updateShop = useMutation(api.shopLocations.update);
  const createShop = useMutation(api.shopLocations.create);

  // Use the primary (or first) shop location
  const shop = shops?.find((s) => s.isPrimary) ?? shops?.[0] ?? null;

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    certificateNumber: "",
    certificateType: "" as string,
    timezone: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || shops === undefined,
  });

  // Populate form when shop data loads
  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name ?? "",
        code: shop.code ?? "",
        address: shop.address ?? "",
        city: shop.city ?? "",
        state: shop.state ?? "",
        zip: shop.zip ?? "",
        phone: shop.phone ?? "",
        email: shop.email ?? "",
        certificateNumber: shop.certificateNumber ?? "",
        certificateType: shop.certificateType ?? "",
        timezone: shop.timezone ?? "",
        notes: shop.notes ?? "",
      });
    }
  }, [shop]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      if (shop) {
        await updateShop({
          id: shop._id,
          name: form.name || undefined,
          code: form.code || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          zip: form.zip || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          certificateNumber: form.certificateNumber || undefined,
          timezone: form.timezone || undefined,
          notes: form.notes || undefined,
        });
      } else {
        await createShop({
          organizationId: orgId,
          name: form.name || "My Shop",
          code: form.code || "MAIN",
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          zip: form.zip || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          certificateNumber: form.certificateNumber || undefined,
          certificateType: form.certificateType
            ? (form.certificateType as "part_145" | "part_135" | "part_121" | "part_91")
            : undefined,
          timezone: form.timezone || undefined,
          notes: form.notes || undefined,
          isPrimary: true,
        });
      }
      toast.success("Shop settings saved");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-5 max-w-2xl">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Shop settings require organization setup"
        missingInfo="Complete onboarding before configuring your primary repair-station profile."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          Shop Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Repair station information and configuration
        </p>
      </div>

      {/* Repair Station Information */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Repair Station Information
          </CardTitle>
          <CardDescription className="text-xs">
            Primary shop details and FAA certificate information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Shop Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Rocky Mountain Turbine Service"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location Code</Label>
              <Input
                value={form.code}
                onChange={(e) => update("code", e.target.value)}
                placeholder="e.g., RMTS"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Street Address
            </Label>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Airport Rd"
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="h-8 text-sm"
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ZIP</Label>
              <Input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(970) 555-0100"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="shop@example.com"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Certificate Number</Label>
              <Input
                value={form.certificateNumber}
                onChange={(e) => update("certificateNumber", e.target.value)}
                placeholder="e.g., RMTS-145-2019-003"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Certificate Type</Label>
              <Select
                value={form.certificateType}
                onValueChange={(v) => update("certificateType", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part_145">Part 145 — Repair Station</SelectItem>
                  <SelectItem value="part_135">Part 135 — Air Carrier</SelectItem>
                  <SelectItem value="part_121">Part 121 — Air Carrier</SelectItem>
                  <SelectItem value="part_91">Part 91 — General Aviation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Timezone</Label>
            <Select
              value={form.timezone || ""}
              onValueChange={(v) => update("timezone", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select timezone…" />
              </SelectTrigger>
              <SelectContent>
                {AVIATION_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value} className="text-xs">
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground/60">
              Used for scheduling calculations, shift times, and regulatory record timestamps.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Additional shop notes, capabilities, etc."
              className="text-sm min-h-[60px]"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Operating Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Operating hours are managed in{" "}
            <Link
              to="/settings/station-config?tab=scheduling"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Station Config → Scheduling
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* Logo / Branding */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            Branding
          </CardTitle>
          <CardDescription className="text-xs">
            Company logo and brand colors for invoices, quotes, and certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Logo upload and brand color customization coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
              <Link to="/billing/tax-config">
                Tax Settings <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
              <Link to="/billing/settings">
                Billing Settings <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
