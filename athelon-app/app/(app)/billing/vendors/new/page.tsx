"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type VendorType =
  | "parts_supplier"
  | "contract_maintenance"
  | "calibration_lab"
  | "DER"
  | "consumables_supplier"
  | "service_provider"
  | "other";

const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: "parts_supplier", label: "Parts Supplier" },
  { value: "contract_maintenance", label: "Contract Maintenance" },
  { value: "calibration_lab", label: "Calibration Lab" },
  { value: "DER", label: "DER (Designated Engineering Rep)" },
  { value: "consumables_supplier", label: "Consumables Supplier" },
  { value: "service_provider", label: "Service Provider" },
  { value: "other", label: "Other" },
];

export default function NewVendorPage() {
  const router = useRouter();
  const { orgId, isLoaded } = useCurrentOrg();

  const createVendor = useMutation(api.vendors.createVendor);

  const [name, setName] = useState("");
  const [type, setType] = useState<VendorType>("parts_supplier");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [certExpiry, setCertExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orgId) { setError("Organization not loaded."); return; }
    if (!name.trim()) { setError("Vendor name is required."); return; }

    setSubmitting(true);
    try {
      const vendorId = await createVendor({
        orgId,
        name: name.trim(),
        type,
        address: address.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        certNumber: certNumber.trim() || undefined,
        certExpiry: certExpiry ? new Date(certExpiry).getTime() : undefined,
        notes: notes.trim() || undefined,
      });
      router.push(`/billing/vendors/${vendorId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor.");
      setSubmitting(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">New Vendor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">New vendors start unapproved — approve after review</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vendor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Vendor Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aviall Services"
                  className="h-9 text-sm border-border/60"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as VendorType)}>
                  <SelectTrigger className="h-9 text-sm border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, State, ZIP"
                className="text-sm border-border/60 resize-none h-16"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Contact Name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-9 text-sm border-border/60" placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" className="h-9 text-sm border-border/60" placeholder="vendor@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} type="tel" className="h-9 text-sm border-border/60" placeholder="555-000-0000" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certification */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Certification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cert / License Number</Label>
                <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} className="h-9 text-sm border-border/60" placeholder="FAA cert / Part 145 #" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cert Expiry Date</Label>
                <Input
                  type="date"
                  value={certExpiry}
                  onChange={(e) => setCertExpiry(e.target.value)}
                  className="h-9 text-sm border-border/60"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm border-border/60 resize-none h-16" placeholder="Additional notes..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Creating..." : "Create Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
