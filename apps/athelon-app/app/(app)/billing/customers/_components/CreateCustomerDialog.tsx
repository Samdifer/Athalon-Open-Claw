"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "charter_operator", label: "Charter Operator" },
  { value: "flight_school", label: "Flight School" },
  { value: "government", label: "Government" },
];

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
}: CreateCustomerDialogProps) {
  const { orgId } = useCurrentOrg();
  const createCustomer = useMutation(api.billingV4.createCustomer);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setCompanyName("");
    setCustomerType("individual");
    setAddress("");
    setPhone("");
    setEmail("");
    setNotes("");
    setTaxExempt(false);
    setDefaultPaymentTerms("");
    setDefaultPaymentTermsDays("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomer({
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
      toast.success("Customer created successfully");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create customer", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cust-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-company">Company Name</Label>
            <Input
              id="cust-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company or organization"
            />
          </div>

          {/* Customer Type */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-type">Customer Type</Label>
            <Select
              value={customerType}
              onValueChange={(v) => setCustomerType(v as CustomerType)}
            >
              <SelectTrigger id="cust-type">
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
            <Label htmlFor="cust-address">Address</Label>
            <Input
              id="cust-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, state, ZIP"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input
                id="cust-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-terms">Default Payment Terms</Label>
              <Input
                id="cust-terms"
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-terms-days">Terms Days</Label>
              <Input
                id="cust-terms-days"
                type="number"
                min={0}
                value={defaultPaymentTermsDays}
                onChange={(e) => setDefaultPaymentTermsDays(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-notes">Notes</Label>
            <Textarea
              id="cust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
            />
          </div>

          {/* Tax Exempt */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="cust-tax-exempt"
              checked={taxExempt}
              onCheckedChange={(v) => setTaxExempt(v === true)}
            />
            <Label htmlFor="cust-tax-exempt" className="cursor-pointer">
              Tax Exempt
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !orgId}>
              {isSubmitting ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
