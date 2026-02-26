"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
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

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

const TYPE_BADGE_STYLES: Record<CustomerType, string> = {
  individual: "bg-muted text-muted-foreground border-muted-foreground/30",
  company: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  charter_operator: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  flight_school: "bg-green-500/15 text-green-400 border-green-500/30",
  government: "bg-orange-500/15 text-orange-400 border-orange-500/30",
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

export default function CustomerDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const customerId = params.id as string;
  const { orgId, isLoaded } = useCurrentOrg();

  const updateCustomer = useMutation(api.billingV4.updateCustomer);

  // Fetch all customers and find the one we need (no per-customer getter in API)
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

  const customer = customers?.find((c) => c._id === customerId);
  const isLoading = !isLoaded || customers === undefined;

  // Form state (initialised from customer once loaded)
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("");
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState("");
  const [formInitialized, setFormInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when customer loads
  if (customer && !formInitialized) {
    setName(customer.name);
    setCompanyName(customer.companyName ?? "");
    setCustomerType((customer.customerType as CustomerType) ?? "individual");
    setAddress(customer.address ?? "");
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
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
        notes: notes.trim() || undefined,
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

  if (!isLoading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" onClick={() => navigate("/billing/customers")}>
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
            onClick={() => navigate("/billing/customers")}
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
                  <h1 className="text-xl font-semibold text-foreground">
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
      <Tabs defaultValue="details">
        <TabsList className="h-9 bg-muted/40 p-0.5">
          <TabsTrigger
            value="details"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="h-8 px-4 text-xs data-[state=active]:bg-background"
          >
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
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
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No payments recorded
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Payments will appear here when invoices are paid.
                  </p>
                </div>
              ) : (
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
                          {payment.invoiceNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {payment.method ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
