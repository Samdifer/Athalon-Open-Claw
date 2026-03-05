"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/hooks/useRouter";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/format";
import { ArrowLeft, Plane, FileText, Receipt, MessageSquare, Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────────────

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

// ─── Style Maps ─────────────────────────────────────────────────────────────

const TYPE_BADGE_STYLES: Record<CustomerType, string> = {
  individual: "bg-muted text-muted-foreground border-muted-foreground/30",
  company: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  charter_operator: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  flight_school: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  government: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
};

const TYPE_LABELS: Record<CustomerType, string> = {
  individual: "Individual",
  company: "Company",
  charter_operator: "Charter Operator",
  flight_school: "Flight School",
  government: "Government",
};

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "charter_operator", label: "Charter Operator" },
  { value: "flight_school", label: "Flight School" },
  { value: "government", label: "Government" },
];

function TypeBadge({ type }: { type: CustomerType }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium border ${TYPE_BADGE_STYLES[type] ?? ""}`}
    >
      {TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

function getWoStatusStyle(status: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    draft: { color: "bg-slate-500/15 text-slate-400 border-slate-500/30", label: "Draft" },
    open: { color: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Open" },
    in_progress: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "In Progress" },
    pending_inspection: { color: "bg-violet-500/15 text-violet-400 border-violet-500/30", label: "Pending Inspection" },
    pending_signoff: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Pending Sign-off" },
    on_hold: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "On Hold" },
    open_discrepancies: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Open Discrepancies" },
    closed: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Closed" },
  };
  return map[status] ?? { color: "bg-muted text-muted-foreground border-border/30", label: status };
}

function getQuoteStatusStyle(status: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    DRAFT: { color: "bg-slate-500/15 text-slate-400 border-slate-500/30", label: "Draft" },
    SENT: { color: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Sent" },
    APPROVED: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Accepted" },
    DECLINED: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Declined" },
    CONVERTED: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Converted" },
  };
  return map[status] ?? { color: "bg-muted text-muted-foreground border-border/30", label: status };
}

function getInvoiceStatusStyle(status: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    DRAFT: { color: "bg-slate-500/15 text-slate-400 border-slate-500/30", label: "Draft" },
    SENT: { color: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Sent" },
    PARTIAL: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Partial" },
    PAID: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Paid" },
    VOID: { color: "bg-muted text-muted-foreground border-border/30", label: "Voided" },
  };
  return map[status] ?? { color: "bg-muted text-muted-foreground border-border/30", label: status };
}

// BUG-FD-006: Draft WOs were excluded from active statuses, causing them to appear
// in the "Past" section. A front desk person creating a new WO (which starts as draft)
// would immediately see it filed under "Past" — confusing and wrong. Drafts are
// pre-work items that need attention, not completed jobs.
const ACTIVE_WO_STATUSES = new Set([
  "draft",
  "open",
  "in_progress",
  "pending_inspection",
  "pending_signoff",
  "on_hold",
  "open_discrepancies",
]);

// ─── Page Component ─────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { orgId, isLoaded } = useCurrentOrg();
  const { user } = useUser();

  const updateCustomer = useMutation(api.billingV4.updateCustomer);
  const addNoteMutation = useMutation(api.billingV4.addCustomerNote);

  // Fetch all customers and find the one we need (no per-customer getter in billingV4)
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId
      ? { organizationId: orgId as Id<"organizations">, includeInactive: true }
      : "skip",
  );

  const payments = useQuery(
    api.billingV4.listPaymentsForCustomer,
    orgId && customerId
      ? {
          orgId: orgId as Id<"organizations">,
          customerId: customerId as Id<"customers">,
        }
      : "skip",
  );

  const aircraft = useQuery(
    api.billingV4.listAircraftForCustomer,
    orgId && customerId
      ? { customerId: customerId as Id<"customers">, organizationId: orgId as Id<"organizations"> }
      : "skip",
  );

  const workOrders = useQuery(
    api.billingV4.listWorkOrdersForCustomer,
    orgId && customerId
      ? { customerId: customerId as Id<"customers">, organizationId: orgId as Id<"organizations"> }
      : "skip",
  );

  const quotes = useQuery(
    api.billingV4.listQuotesForCustomer,
    orgId && customerId
      ? { customerId: customerId as Id<"customers">, organizationId: orgId as Id<"organizations"> }
      : "skip",
  );

  const invoices = useQuery(
    api.billingV4.listInvoicesForCustomer,
    orgId && customerId
      ? { customerId: customerId as Id<"customers">, organizationId: orgId as Id<"organizations"> }
      : "skip",
  );

  const notes = useQuery(
    api.billingV4.listCustomerNotes,
    orgId && customerId
      ? { customerId: customerId as Id<"customers">, organizationId: orgId as Id<"organizations"> }
      : "skip",
  );

  const customer = customers?.find((c) => c._id === customerId);
  const isLoading = !isLoaded || customers === undefined;

  // Form state (initialised from customer once loaded)
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profileNotes, setProfileNotes] = useState("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("");
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState("");
  const [formInitialized, setFormInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Notes form state
  const [noteContent, setNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Initialize form when customer loads
  if (customer && !formInitialized) {
    setName(customer.name);
    setCompanyName(customer.companyName ?? "");
    setCustomerType((customer.customerType as CustomerType) ?? "individual");
    setAddress(customer.address ?? "");
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setProfileNotes(customer.notes ?? "");
    setTaxExempt(customer.taxExempt ?? false);
    setDefaultPaymentTerms(customer.defaultPaymentTerms ?? "");
    setDefaultPaymentTermsDays(
      customer.defaultPaymentTermsDays != null
        ? String(customer.defaultPaymentTermsDays)
        : "",
    );
    setFormInitialized(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !customer) return;

    setIsSaving(true);
    try {
      await updateCustomer({
        customerId: customer._id as Id<"customers">,
        organizationId: orgId as Id<"organizations">,
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        customerType,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: profileNotes.trim() || undefined,
        taxExempt,
        defaultPaymentTerms: defaultPaymentTerms.trim() || undefined,
        defaultPaymentTermsDays: defaultPaymentTermsDays
          ? parseInt(defaultPaymentTermsDays, 10)
          : undefined,
      });
      toast.success("Customer updated");
    } catch (err) {
      toast.error("Failed to update customer", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!orgId || !customer) return;
    try {
      await updateCustomer({
        customerId: customer._id as Id<"customers">,
        organizationId: orgId as Id<"organizations">,
        active: customer.active !== false ? false : true,
      });
      toast.success(
        customer.active !== false ? "Customer deactivated" : "Customer activated"
      );
    } catch (err) {
      toast.error("Failed to update customer", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function handleAddNote() {
    if (!orgId || !customerId || !noteContent.trim()) return;
    setIsAddingNote(true);
    try {
      await addNoteMutation({
        customerId: customerId as Id<"customers">,
        organizationId: orgId as Id<"organizations">,
        content: noteContent.trim(),
        createdByUserId: user?.id,
        createdByName: user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined,
      });
      setNoteContent("");
      toast.success("Note added");
    } catch (err) {
      toast.error("Failed to add note", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsAddingNote(false);
    }
  }

  // Derived data: work orders split into active/past
  const activeWOs = (workOrders ?? []).filter((wo: Record<string, unknown>) =>
    ACTIVE_WO_STATUSES.has(wo.status as string)
  );
  const pastWOs = (workOrders ?? []).filter((wo: Record<string, unknown>) =>
    !ACTIVE_WO_STATUSES.has(wo.status as string)
  );

  // Derived data: AR summary from invoices
  const outstandingBalance = (invoices ?? []).reduce(
    (sum: number, inv: Record<string, unknown>) => {
      if (inv.status === "PAID" || inv.status === "VOID") return sum;
      return sum + ((inv.total as number) ?? 0) - ((inv.amountPaid as number) ?? 0);
    },
    0
  );
  const overdueCount = (invoices ?? []).filter((inv: Record<string, unknown>) => {
    if (inv.status === "PAID" || inv.status === "VOID") return false;
    const dueDate = inv.dueDate as number | undefined;
    return dueDate != null && dueDate < Date.now();
  }).length;

  // Aircraft lookup map for work orders tab
  const aircraftMap = new Map<string, Record<string, unknown>>();
  for (const ac of aircraft ?? []) {
    aircraftMap.set(ac._id as string, ac as Record<string, unknown>);
  }

  // Count open WOs per aircraft
  const openWoCountByAircraft = new Map<string, number>();
  for (const wo of workOrders ?? []) {
    const woRec = wo as Record<string, unknown>;
    if (ACTIVE_WO_STATUSES.has(woRec.status as string)) {
      const acId = woRec.aircraftId as string;
      openWoCountByAircraft.set(acId, (openWoCountByAircraft.get(acId) ?? 0) + 1);
    }
  }

  if (!isLoading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" onClick={() => router.push("/billing/customers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/billing/customers")}
            aria-label="Back to customers"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                    {customer?.name}
                  </h1>
                  {customer && (
                    <TypeBadge type={customer.customerType as CustomerType} />
                  )}
                  {customer?.active === false && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30"
                    >
                      Inactive
                    </Badge>
                  )}
                </div>
                {customer?.companyName && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {customer.companyName}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {!isLoading && customer && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
            >
              {customer.active !== false ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="h-9 bg-muted/40 p-0.5">
          <TabsTrigger
            value="profile"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="aircraft"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Aircraft
          </TabsTrigger>
          <TabsTrigger
            value="work-orders"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Work Orders
          </TabsTrigger>
          <TabsTrigger
            value="quotes"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Quotes
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Invoices
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Notes
          </TabsTrigger>
        </TabsList>

        {/* ─── Profile Tab ──────────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-4">
          {isLoading ? (
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="detail-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-company">Company Name</Label>
                    <Input
                      id="detail-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  {/* Customer Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-type">Customer Type</Label>
                    <Select
                      value={customerType}
                      onValueChange={(v) =>
                        setCustomerType(v as CustomerType)
                      }
                    >
                      <SelectTrigger id="detail-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-address">Address</Label>
                    <Input
                      id="detail-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  {/* Phone + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-phone">Phone</Label>
                      <Input
                        id="detail-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-email">Email</Label>
                      <Input
                        id="detail-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-terms">
                        Default Payment Terms
                      </Label>
                      <Input
                        id="detail-terms"
                        value={defaultPaymentTerms}
                        onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                        placeholder="e.g. Net 30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-terms-days">Terms Days</Label>
                      <Input
                        id="detail-terms-days"
                        type="number"
                        min={0}
                        value={defaultPaymentTermsDays}
                        onChange={(e) =>
                          setDefaultPaymentTermsDays(e.target.value)
                        }
                        placeholder="30"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-notes">Notes</Label>
                    <Textarea
                      id="detail-notes"
                      value={profileNotes}
                      onChange={(e) => setProfileNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Tax Exempt */}
                  <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <Label htmlFor="detail-tax-exempt" className="text-sm font-medium">
                        Tax Exempt
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Exempt from sales tax on invoices
                      </p>
                    </div>
                    <Switch
                      id="detail-tax-exempt"
                      checked={taxExempt}
                      onCheckedChange={setTaxExempt}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="sm" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Aircraft Tab ─────────────────────────────────────────────── */}
        <TabsContent value="aircraft" className="mt-4 space-y-3">
          {aircraft === undefined ? (
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ) : aircraft.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Plane className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No aircraft linked to this customer
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(aircraft as Record<string, unknown>[]).map((ac) => {
                const acId = ac._id as string;
                const reg = (ac.currentRegistration as string) ?? (ac.serialNumber as string) ?? "Unknown";
                const openCount = openWoCountByAircraft.get(acId) ?? 0;
                const acStatus = ac.status as string;
                const statusStyle = acStatus === "airworthy"
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : acStatus === "in_maintenance"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-muted text-muted-foreground border-border/30";

                return (
                  <Card
                    key={acId}
                    className="border-border/60 hover:border-border transition-colors cursor-pointer"
                    onClick={() => router.push(`/fleet/${encodeURIComponent(reg)}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {reg}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${statusStyle}`}
                            >
                              {(acStatus ?? "unknown").replace(/_/g, " ")}
                            </Badge>
                            {openCount > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-sky-500/15 text-sky-400 border-sky-500/30"
                              >
                                {openCount} open WO{openCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[ac.year, ac.make, ac.model, ac.series]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground/70">
                            {ac.serialNumber ? (
                              <span>S/N: {ac.serialNumber as string}</span>
                            ) : null}
                            {ac.totalAirframeTime != null && (
                              <span>TTAF: {(ac.totalAirframeTime as number).toLocaleString()} hrs</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Work Orders Tab ──────────────────────────────────────────── */}
        <TabsContent value="work-orders" className="mt-4 space-y-4">
          {/* BUG-FD-010: No "New Work Order" action on the customer's WO tab.
              Front desk needed to navigate away to /work-orders/new and manually
              find the aircraft. Adding a direct action button. */}
          {!isLoading && customer && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => router.push(`/work-orders/new?customer=${customerId}`)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New Work Order
              </Button>
            </div>
          )}
          {workOrders === undefined ? (
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ) : workOrders.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Wrench className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No work orders for this customer
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Active WOs */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-foreground">Active</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {activeWOs.length}
                  </Badge>
                </div>
                {activeWOs.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1 mb-4">
                    No active work orders
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {(activeWOs as Record<string, unknown>[]).map((wo) => {
                      const woId = wo._id as string;
                      const style = getWoStatusStyle(wo.status as string);
                      const ac = aircraftMap.get(wo.aircraftId as string);
                      const reg = ac
                        ? ((ac.currentRegistration as string) ?? (ac.serialNumber as string))
                        : null;
                      return (
                        <Card
                          key={woId}
                          className="border-border/60 hover:border-border transition-colors cursor-pointer"
                          onClick={() => router.push(`/work-orders/${woId}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-bold text-sm text-foreground">
                                    {wo.workOrderNumber as string}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] border ${style.color}`}
                                  >
                                    {style.label}
                                  </Badge>
                                  {reg && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-mono bg-muted/50"
                                    >
                                      {reg}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {wo.description as string}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  Opened {formatDate(wo.openedAt as number)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past WOs */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-foreground">Past</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {pastWOs.length}
                  </Badge>
                </div>
                {pastWOs.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">
                    No past work orders
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(pastWOs as Record<string, unknown>[]).map((wo) => {
                      const woId = wo._id as string;
                      const style = getWoStatusStyle(wo.status as string);
                      const ac = aircraftMap.get(wo.aircraftId as string);
                      const reg = ac
                        ? ((ac.currentRegistration as string) ?? (ac.serialNumber as string))
                        : null;
                      return (
                        <Card
                          key={woId}
                          className="border-border/60 hover:border-border/80 transition-colors cursor-pointer"
                          onClick={() => router.push(`/work-orders/${woId}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-bold text-sm text-foreground">
                                    {wo.workOrderNumber as string}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] border ${style.color}`}
                                  >
                                    {style.label}
                                  </Badge>
                                  {reg && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-mono bg-muted/50"
                                    >
                                      {reg}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {wo.description as string}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  Opened {formatDate(wo.openedAt as number)}
                                  {wo.closedAt ? ` — Closed ${formatDate(wo.closedAt as number)}` : ""}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Quotes Tab ───────────────────────────────────────────────── */}
        <TabsContent value="quotes" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Quotes</CardTitle>
              {/* BUG-FD-007: "New Quote" button didn't pass the customer ID, forcing
                  front desk to re-select the customer on the quote creation page.
                  Now passes customerId as a query param for pre-fill. */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => router.push(`/billing/quotes/new?customerId=${customerId}`)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New Quote
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {quotes === undefined ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : quotes.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No quotes for this customer yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(quotes as Record<string, unknown>[]).map((q) => {
                      const style = getQuoteStatusStyle(q.status as string);
                      return (
                        <TableRow
                          key={q._id as string}
                          className="cursor-pointer"
                          onClick={() => router.push(`/billing/quotes/${q._id as string}`)}
                        >
                          <TableCell className="font-mono text-xs font-medium">
                            {q.quoteNumber as string}
                          </TableCell>
                          <TableCell className="text-sm">
                            ${((q.total as number) ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${style.color}`}
                            >
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(q.createdAt as number)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              View
                            </Button>
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
        </TabsContent>

        {/* ─── Invoices Tab ─────────────────────────────────────────────── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* AR Summary */}
          {/* BUG-FD-008: AR summary only showed outstanding balance and overdue count
              but no total billed or total paid. Front desk answering "how much have we
              billed this customer?" or "how much have they paid?" had to mentally sum
              the invoice table. Added total billed and total paid cards so the full
              billing picture is visible at a glance. */}
          {invoices && invoices.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Billed</p>
                  <p className="text-lg font-semibold text-foreground">
                    ${(invoices as Record<string, unknown>[]).reduce(
                      (sum, inv) => sum + ((inv.total as number) ?? 0),
                      0,
                    ).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                  <p className="text-lg font-semibold text-green-400">
                    ${(invoices as Record<string, unknown>[]).reduce(
                      (sum, inv) => sum + ((inv.amountPaid as number) ?? 0),
                      0,
                    ).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className={`text-lg font-semibold ${outstandingBalance > 0 ? "text-amber-400" : "text-foreground"}`}>
                    ${outstandingBalance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Overdue</p>
                  <p className={`text-lg font-semibold ${overdueCount > 0 ? "text-red-400" : "text-foreground"}`}>
                    {overdueCount} invoice{overdueCount !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Invoices Table */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoices === undefined ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center">
                  <Receipt className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No invoices for this customer yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {/* BUG-FD-009: Invoice table didn't show how much was paid vs
                        total, making it hard for front desk to verify partial payments.
                        Added "Paid" column so the full picture (total, paid, remaining)
                        is visible without clicking into each invoice. */}
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance Due</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices as Record<string, unknown>[]).map((inv) => {
                      const style = getInvoiceStatusStyle(inv.status as string);
                      const dueDate = inv.dueDate as number | undefined;
                      const isOverdue =
                        dueDate != null &&
                        dueDate < Date.now() &&
                        inv.status !== "PAID" &&
                        inv.status !== "VOID";
                      return (
                        <TableRow
                          key={inv._id as string}
                          className="cursor-pointer"
                          onClick={() => router.push(`/billing/invoices/${inv._id as string}`)}
                        >
                          <TableCell className="font-mono text-xs font-medium">
                            {inv.invoiceNumber as string}
                          </TableCell>
                          <TableCell className="text-sm">
                            ${((inv.total as number) ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm text-green-400">
                            ${((inv.amountPaid as number) ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            ${(((inv.total as number) ?? 0) - ((inv.amountPaid as number) ?? 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-sm ${isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                            {dueDate ? formatDate(dueDate) : "--"}
                            {isOverdue && " (overdue)"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${style.color}`}
                            >
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              View
                            </Button>
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

          {/* Payment History */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments === undefined ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No payments recorded
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Payments will appear here when invoices are paid.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="font-mono text-xs">
                          {payment.invoiceNumber ?? "--"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {payment.method ?? "--"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Notes Tab ────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          {/* Add note form */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="mb-3"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={isAddingNote || !noteContent.trim()}
                  onClick={handleAddNote}
                >
                  {isAddingNote ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes list */}
          {notes === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No notes yet. Add the first note above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(notes as Record<string, unknown>[]).map((note) => (
                <Card key={note._id as string} className="border-border/60">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {note.content as string}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/70">
                      {note.createdByName ? (
                        <span className="font-medium text-muted-foreground">
                          {note.createdByName as string}
                        </span>
                      ) : null}
                      <span>{formatDateTime(note.createdAt as number)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
