"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Settings, Building2, FileText, FileCheck, ShieldCheck, Save, DollarSign, Plus, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CURRENCY_OPTIONS, formatCurrency } from "@/lib/format";

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

  // Currency
  const currencySettings = useQuery(
    api.currency.listSupportedCurrencies,
    orgId ? { orgId } : "skip",
  );
  const currencyRates = useQuery(
    api.currency.listRates,
    orgId ? { orgId } : "skip",
  );
  const updateCurrencySettings = useMutation(api.currency.updateCurrencySettings);
  const upsertRate = useMutation(api.currency.upsertRate);
  const deleteRate = useMutation(api.currency.deleteRate);

  const [form, setForm] = useState<BillingSettingsForm>(DEFAULT_FORM);
  const [poThreshold, setPoThreshold] = useState("5000");
  const [saving, setSaving] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Currency state
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateFrom, setRateFrom] = useState("USD");
  const [rateTo, setRateTo] = useState("EUR");
  const [rateValue, setRateValue] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

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

      {/* Currency Settings */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            Multi-Currency
          </CardTitle>
        </CardHeader>
        <Separator className="mb-0" />
        <CardContent className="pt-5 space-y-4">
          {/* Base Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Base Currency</Label>
              <Select
                value={currencySettings?.baseCurrency ?? "USD"}
                onValueChange={async (val) => {
                  if (!orgId) return;
                  setSavingCurrency(true);
                  try {
                    await updateCurrencySettings({
                      orgId,
                      baseCurrency: val,
                      supportedCurrencies: currencySettings?.supportedCurrencies ?? [val],
                    });
                    toast.success("Base currency updated.");
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Failed to update");
                  } finally {
                    setSavingCurrency(false);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supported Currencies</Label>
              <div className="flex flex-wrap gap-1.5">
                {(currencySettings?.supportedCurrencies ?? ["USD"]).map((code) => (
                  <Badge key={code} variant="secondary" className="text-xs gap-1">
                    {code}
                    {code !== (currencySettings?.baseCurrency ?? "USD") && (
                      <button
                        type="button"
                        className="hover:text-red-400 ml-0.5"
                        onClick={async () => {
                          if (!orgId) return;
                          const updated = (currencySettings?.supportedCurrencies ?? []).filter(
                            (c) => c !== code,
                          );
                          try {
                            await updateCurrencySettings({
                              orgId,
                              baseCurrency: currencySettings?.baseCurrency ?? "USD",
                              supportedCurrencies: updated,
                            });
                            toast.success("Currency removed");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to remove currency");
                          }
                        }}
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))}
                <Select
                  value=""
                  onValueChange={async (val) => {
                    if (!orgId || !val) return;
                    const existing = currencySettings?.supportedCurrencies ?? [];
                    if (existing.includes(val)) return;
                    try {
                      await updateCurrencySettings({
                        orgId,
                        baseCurrency: currencySettings?.baseCurrency ?? "USD",
                        supportedCurrencies: [...existing, val],
                      });
                      toast.success("Currency added");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to add currency");
                    }
                  }}
                >
                  <SelectTrigger className="h-7 w-20 text-xs border-dashed">
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.filter(
                      (c) => !(currencySettings?.supportedCurrencies ?? []).includes(c.code),
                    ).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Exchange Rates Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Exchange Rates</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setRateFrom(currencySettings?.baseCurrency ?? "USD");
                  setRateTo(
                    CURRENCY_OPTIONS.find(
                      (c) => c.code !== (currencySettings?.baseCurrency ?? "USD"),
                    )?.code ?? "EUR",
                  );
                  setRateValue("");
                  setRateDialogOpen(true);
                }}
              >
                <Plus className="w-3 h-3" />
                Add Rate
              </Button>
            </div>

            {currencyRates && currencyRates.length > 0 ? (
              <div className="rounded-lg border border-border/60 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs">From</TableHead>
                      <TableHead className="text-xs">To</TableHead>
                      <TableHead className="text-xs">Rate</TableHead>
                      <TableHead className="text-xs">Updated</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencyRates.map((rate) => (
                      <TableRow key={rate._id}>
                        <TableCell className="text-sm font-mono">{rate.fromCurrency}</TableCell>
                        <TableCell className="text-sm font-mono">{rate.toCurrency}</TableCell>
                        <TableCell className="text-sm font-mono">{rate.rate.toFixed(4)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(rate.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                            onClick={async () => {
                              try {
                                await deleteRate({ rateId: rate._id });
                                toast.success("Rate deleted.");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to delete rate");
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-lg">
                No exchange rates configured. Add a rate to enable multi-currency billing.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Rate Dialog */}
      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Add Exchange Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Select value={rateFrom} onValueChange={setRateFrom}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Select value={rateTo} onValueChange={setRateTo}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Rate <span className="text-muted-foreground">(1 {rateFrom} = ? {rateTo})</span>
              </Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="1.0000"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                className="text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingRate || !rateValue || rateFrom === rateTo}
              onClick={async () => {
                if (!orgId) return;
                const val = parseFloat(rateValue);
                if (isNaN(val) || val <= 0) {
                  toast.error("Rate must be a positive number.");
                  return;
                }
                setSavingRate(true);
                try {
                  await upsertRate({
                    orgId,
                    fromCurrency: rateFrom,
                    toCurrency: rateTo,
                    rate: val,
                  });
                  toast.success(`Rate saved: 1 ${rateFrom} = ${val} ${rateTo}`);
                  setRateDialogOpen(false);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Failed to save rate");
                } finally {
                  setSavingRate(false);
                }
              }}
            >
              {savingRate ? "Saving…" : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Email Settings ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure outbound email settings for invoices, quotes, and payment confirmations.
            Emails are sent via Resend API. Set the <code>RESEND_API_KEY</code> environment variable
            in your Convex dashboard to enable live sending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emailFromName">From Name</Label>
              <Input id="emailFromName" placeholder="Athelon MRO" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailFromAddress">From Email</Label>
              <Input id="emailFromAddress" placeholder="noreply@athelon.app" disabled />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emailReplyTo">Reply-To Email</Label>
              <Input id="emailReplyTo" placeholder="billing@yourcompany.com" disabled />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Send invoice emails on send</p>
                <p className="text-xs text-muted-foreground">Automatically email customers when an invoice is sent</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Send payment confirmations</p>
                <p className="text-xs text-muted-foreground">Email customers when a payment is recorded</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Send overdue reminders</p>
                <p className="text-xs text-muted-foreground">Automatically remind customers about overdue invoices</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="resendApiKey">Resend API Key</Label>
            <Input id="resendApiKey" type="password" placeholder="re_••••••••••••" disabled />
            <p className="text-xs text-muted-foreground">
              Set via <code>RESEND_API_KEY</code> environment variable in your Convex dashboard.
              Without it, emails are logged to console in stub mode.
            </p>
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
