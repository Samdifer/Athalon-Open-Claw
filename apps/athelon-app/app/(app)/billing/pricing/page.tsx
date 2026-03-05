"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { Plus, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const RULE_TYPE_STYLES: Record<string, string> = {
  cost_plus: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  list_minus: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  flat_rate: "bg-green-500/15 text-green-400 border-green-500/30",
  quantity_tier: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const RULE_TYPE_LABELS: Record<string, string> = {
  cost_plus: "Cost Plus",
  list_minus: "List Minus",
  flat_rate: "Flat Rate",
  quantity_tier: "Qty Tier",
};

const APPLIES_TO_LABELS: Record<string, string> = {
  labor: "Labor",
  part: "Part",
  external_service: "External Service",
};

type RuleType = "cost_plus" | "list_minus" | "flat_rate" | "quantity_tier";
type AppliesToType = "labor" | "part" | "external_service";

export default function PricingPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const profiles = useQuery(
    api.pricing.listPricingProfiles,
    orgId ? { orgId } : "skip",
  );

  const rules = useQuery(
    api.pricing.listPricingRules,
    orgId ? { orgId } : "skip",
  );

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );

  const createProfile = useMutation(api.pricing.createPricingProfile);

  const [profileDialog, setProfileDialog] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileCustomerId, setProfileCustomerId] = useState<string>("");
  const [profileLaborRate, setProfileLaborRate] = useState("");
  const [profileLaborMult, setProfileLaborMult] = useState("");
  const [profileMarkup, setProfileMarkup] = useState("");
  const [profileDiscount, setProfileDiscount] = useState("");
  const [profileIsDefault, setProfileIsDefault] = useState(false);
  const [profileEffective, setProfileEffective] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !isLoaded || profiles === undefined || rules === undefined;

  const handleCreateProfile = async () => {
    if (!orgId) return;
    if (!profileName.trim()) { setError("Profile name is required."); return; }
    if (!profileEffective) { setError("Effective date is required."); return; }

    setSubmitting(true); setError(null);
    try {
      await createProfile({
        orgId,
        name: profileName.trim(),
        customerId: profileCustomerId ? profileCustomerId as Id<"customers"> : undefined,
        laborRateOverride: profileLaborRate ? parseFloat(profileLaborRate) : undefined,
        laborRateMultiplier: profileLaborMult ? parseFloat(profileLaborMult) : undefined,
        partsMarkupPercent: profileMarkup ? parseFloat(profileMarkup) : undefined,
        partsDiscountPercent: profileDiscount ? parseFloat(profileDiscount) : undefined,
        effectiveDate: new Date(profileEffective).getTime(),
        isDefault: profileIsDefault,
      });
      toast.success("Pricing profile created.");
      setProfileDialog(false);
      setProfileName(""); setProfileCustomerId(""); setProfileLaborRate("");
      setProfileLaborMult(""); setProfileMarkup(""); setProfileDiscount("");
      setProfileIsDefault(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Pricing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(profiles ?? []).length} profiles · {(rules ?? []).length} rules
          </p>
        </div>
        <Button size="sm" onClick={() => { setError(null); setProfileDialog(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Profile
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pricing Profiles */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Pricing Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(profiles ?? []).length === 0 ? (
            <div className="py-10 text-center">
              <Tag className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pricing profiles yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create profiles to set customer-specific labor rates and markup.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setError(null); setProfileDialog(true); }}>
                <Plus className="w-3 h-3 mr-1" />
                New Profile
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Labor Rate</TableHead>
                  <TableHead className="text-xs text-right">Parts Markup</TableHead>
                  <TableHead className="text-xs">Effective</TableHead>
                  <TableHead className="text-xs">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles ?? []).map((p) => {
                  const customer = (customers ?? []).find((c) => c._id === p.customerId);
                  return (
                    <TableRow key={p._id} className="border-border/40">
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{customer?.name ?? (p.customerId ? "—" : "Org Default")}</TableCell>
                      <TableCell className="text-sm text-right">
                        {p.laborRateOverride !== undefined
                          ? `$${p.laborRateOverride}/hr`
                          : p.laborRateMultiplier !== undefined
                          ? `×${p.laborRateMultiplier}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {p.partsMarkupPercent !== undefined ? `+${p.partsMarkupPercent}%` : p.partsDiscountPercent !== undefined ? `-${p.partsDiscountPercent}%` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(p.effectiveDate)}</TableCell>
                      <TableCell>
                        {p.isDefault && (
                          <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">Default</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Rules */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Pricing Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(rules ?? []).length === 0 ? (
            <div className="py-10 text-center">
              <Tag className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pricing rules configured.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Pricing rules are created via the Convex backend or API.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Rule Type</TableHead>
                  <TableHead className="text-xs">Applies To</TableHead>
                  <TableHead className="text-xs text-right">Priority</TableHead>
                  <TableHead className="text-xs">Details</TableHead>
                  <TableHead className="text-xs">Effective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((rule) => (
                  <TableRow key={rule._id} className="border-border/40">
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] border ${RULE_TYPE_STYLES[rule.ruleType] ?? ""}`}>
                        {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{APPLIES_TO_LABELS[rule.appliesTo] ?? rule.appliesTo}</TableCell>
                    <TableCell className="text-sm text-right">{rule.priority}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rule.ruleType === "cost_plus" && `+${rule.markupPercent ?? 0}% markup`}
                      {rule.ruleType === "list_minus" && `-${rule.discountPercent ?? 0}% from list`}
                      {rule.ruleType === "flat_rate" && `Flat $${rule.flatRate ?? 0}`}
                      {rule.ruleType === "quantity_tier" && "Tiered pricing"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(rule.effectiveDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Pricing Profile</DialogTitle>
            <DialogDescription>Set labor rates and parts markup for a customer or org-wide.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Profile Name *</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="h-9 text-sm" placeholder="e.g. Standard 2026, VIP Customer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Customer (leave blank for org-wide)</Label>
              <Select value={profileCustomerId || "_org_wide"} onValueChange={(v) => setProfileCustomerId(v === "_org_wide" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Org-wide (all customers)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_org_wide">Org-wide (all customers)</SelectItem>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Labor Rate Override ($/hr)</Label>
                <Input value={profileLaborRate} onChange={(e) => setProfileLaborRate(e.target.value)} type="number" min="0" step="0.01" className="h-9 text-sm" placeholder="e.g. 125.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Labor Rate Multiplier</Label>
                <Input value={profileLaborMult} onChange={(e) => setProfileLaborMult(e.target.value)} type="number" min="0.01" step="0.01" className="h-9 text-sm" placeholder="e.g. 1.25" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parts Markup %</Label>
                <Input value={profileMarkup} onChange={(e) => setProfileMarkup(e.target.value)} type="number" min="0" step="0.1" className="h-9 text-sm" placeholder="e.g. 20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parts Discount %</Label>
                <Input value={profileDiscount} onChange={(e) => setProfileDiscount(e.target.value)} type="number" min="0" step="0.1" className="h-9 text-sm" placeholder="e.g. 5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Effective Date *</Label>
                <Input type="date" value={profileEffective} onChange={(e) => setProfileEffective(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pricing-is-default"
                    checked={profileIsDefault}
                    onCheckedChange={(v) => setProfileIsDefault(v === true)}
                  />
                  <Label htmlFor="pricing-is-default" className="text-xs cursor-pointer">
                    Set as Default Profile
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setProfileDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateProfile} disabled={submitting}>
              {submitting ? "Creating..." : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
