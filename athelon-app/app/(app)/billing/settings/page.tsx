"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Settings, Building2, FileText, FileCheck, ShieldCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Form State ───────────────────────────────────────────────────────────────

interface BillingSettingsForm {
  // Company Info
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  logoUrl: string;
  // Invoice Defaults
  invoiceTerms: string;
  invoiceNotes: string;
  paymentInstructions: string;
  defaultPaymentTerms: string;
  defaultPaymentTermsDays: string;
  // Quote Defaults
  quoteTerms: string;
  quoteNotes: string;
}

const DEFAULT_FORM: BillingSettingsForm = {
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  logoUrl: "",
  invoiceTerms: "",
  invoiceNotes: "",
  paymentInstructions: "",
  defaultPaymentTerms: "",
  defaultPaymentTermsDays: "",
  quoteTerms: "",
  quoteNotes: "",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillingSettingsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const settings = useQuery(
    api.billingV4b.getOrgBillingSettings,
    orgId ? { orgId } : "skip"
  );

  const saveSettings = useMutation(api.billingV4b.saveOrgBillingSettings);
  const setApprovalThreshold = useMutation(api.billingV4b.setApprovalThreshold);

  const [form, setForm] = useState<BillingSettingsForm>(DEFAULT_FORM);
  const [poThreshold, setPoThreshold] = useState("5000");
  const [saving, setSaving] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Pre-fill form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName ?? "",
        companyAddress: settings.companyAddress ?? "",
        companyPhone: settings.companyPhone ?? "",
        companyEmail: settings.companyEmail ?? "",
        logoUrl: settings.logoUrl ?? "",
        invoiceTerms: settings.invoiceTerms ?? "",
        invoiceNotes: settings.invoiceNotes ?? "",
        paymentInstructions: settings.paymentInstructions ?? "",
        defaultPaymentTerms: settings.defaultPaymentTerms ?? "",
        defaultPaymentTermsDays:
          settings.defaultPaymentTermsDays != null
            ? String(settings.defaultPaymentTermsDays)
            : "",
        quoteTerms: settings.quoteTerms ?? "",
        quoteNotes: settings.quoteNotes ?? "",
      });
      if (settings.poApprovalThreshold != null) {
        setPoThreshold(String(settings.poApprovalThreshold));
      }
    }
  }, [settings]);

  function setField<K extends keyof BillingSettingsForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;

    const termsDays = form.defaultPaymentTermsDays.trim()
      ? parseInt(form.defaultPaymentTermsDays, 10)
      : undefined;

    setSaving(true);
    try {
      await saveSettings({
        orgId,
        companyName: form.companyName.trim() || undefined,
        companyAddress: form.companyAddress.trim() || undefined,
        companyPhone: form.companyPhone.trim() || undefined,
        companyEmail: form.companyEmail.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        invoiceTerms: form.invoiceTerms.trim() || undefined,
        invoiceNotes: form.invoiceNotes.trim() || undefined,
        paymentInstructions: form.paymentInstructions.trim() || undefined,
        defaultPaymentTerms: form.defaultPaymentTerms.trim() || undefined,
        defaultPaymentTermsDays: termsDays,
        quoteTerms: form.quoteTerms.trim() || undefined,
        quoteNotes: form.quoteNotes.trim() || undefined,
      });
      toast.success("Billing settings saved.");
    } catch (err: unknown) {
      toast.error("Failed to save settings", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveThreshold() {
    if (!orgId) return;
    const val = parseFloat(poThreshold);
    if (isNaN(val) || val < 0) {
      toast.error("PO approval threshold must be a non-negative number.");
      return;
    }
    setSavingThreshold(true);
    try {
      await setApprovalThreshold({ orgId, poApprovalThreshold: val });
      toast.success("PO approval threshold updated.");
    } catch (err: unknown) {
      toast.error("Failed to update threshold", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSavingThreshold(false);
    }
  }

  const isLoading = !isLoaded || settings === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Billing Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Company branding, document defaults, and PO controls.
          </p>
        </div>
        <Button type="submit" size="sm" disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* Company Info */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Company Info
          </CardTitle>
        </CardHeader>
        <Separator className="mb-0" />
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name</Label>
              <Input
                className="text-sm"
                placeholder="Athelon Aviation LLC"
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Email</Label>
              <Input
                className="text-sm"
                type="email"
                placeholder="billing@example.com"
                value={form.companyEmail}
                onChange={(e) => setField("companyEmail", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Phone</Label>
              <Input
                className="text-sm"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.companyPhone}
                onChange={(e) => setField("companyPhone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo URL</Label>
              <Input
                className="text-sm"
                type="url"
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => setField("logoUrl", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Company Address</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder={"123 Main St\nSuite 100\nCity, ST 12345"}
              rows={3}
              value={form.companyAddress}
              onChange={(e) => setField("companyAddress", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Defaults */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Invoice Defaults
          </CardTitle>
        </CardHeader>
        <Separator className="mb-0" />
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Default Payment Terms</Label>
              <Input
                className="text-sm"
                placeholder="Net 30"
                value={form.defaultPaymentTerms}
                onChange={(e) => setField("defaultPaymentTerms", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Terms Days</Label>
              <Input
                className="text-sm"
                type="number"
                min="0"
                placeholder="30"
                value={form.defaultPaymentTermsDays}
                onChange={(e) => setField("defaultPaymentTermsDays", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Terms</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="Payment is due within 30 days of invoice date…"
              rows={3}
              value={form.invoiceTerms}
              onChange={(e) => setField("invoiceTerms", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Notes</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="Default notes printed on every invoice…"
              rows={3}
              value={form.invoiceNotes}
              onChange={(e) => setField("invoiceNotes", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Instructions</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="Please make checks payable to… / Wire transfer details…"
              rows={3}
              value={form.paymentInstructions}
              onChange={(e) => setField("paymentInstructions", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quote Defaults */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-muted-foreground" />
            Quote Defaults
          </CardTitle>
        </CardHeader>
        <Separator className="mb-0" />
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Quote Terms</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="This quote is valid for 30 days from the date of issue…"
              rows={3}
              value={form.quoteTerms}
              onChange={(e) => setField("quoteTerms", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quote Notes</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="Default notes printed on every quote…"
              rows={3}
              value={form.quoteNotes}
              onChange={(e) => setField("quoteNotes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* PO Controls — separate save action */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            PO Controls
          </CardTitle>
        </CardHeader>
        <Separator className="mb-0" />
        <CardContent className="pt-5">
          <div className="flex items-end gap-4">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label className="text-xs">PO Approval Threshold ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  className="pl-7 text-sm"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="5000"
                  value={poThreshold}
                  onChange={(e) => setPoThreshold(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                POs above this amount require manager approval.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingThreshold}
              onClick={handleSaveThreshold}
            >
              {savingThreshold ? "Saving…" : "Update Threshold"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button for convenience */}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
