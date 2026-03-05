"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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

type ContactRole =
  | "owner"
  | "dom"
  | "chief_pilot"
  | "ap_manager"
  | "operations"
  | "dispatcher"
  | "other";

const ROLE_OPTIONS: { value: ContactRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "dom", label: "Director of Maintenance" },
  { value: "chief_pilot", label: "Chief Pilot" },
  { value: "ap_manager", label: "AP Manager" },
  { value: "operations", label: "Operations" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "other", label: "Other" },
];

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a customer when opening from an account detail page */
  preselectedCustomerId?: string;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  preselectedCustomerId,
}: CreateContactDialogProps) {
  const { orgId } = useCurrentOrg();
  const createContact = useMutation(api.crm.createContact);

  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<ContactRole | "">("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? "");
  const [isPrimary, setIsPrimary] = useState(false);
  const [receiveStatusUpdates, setReceiveStatusUpdates] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setTitle("");
    setRole("");
    setEmail("");
    setPhone("");
    setMobilePhone("");
    setCustomerId(preselectedCustomerId ?? "");
    setIsPrimary(false);
    setReceiveStatusUpdates(false);
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!customerId) {
      toast.error("Please select an account");
      return;
    }

    setIsSubmitting(true);
    try {
      await createContact({
        organizationId: orgId as Id<"organizations">,
        customerId: customerId as Id<"customers">,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim() || undefined,
        role: role ? (role as ContactRole) : undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        mobilePhone: mobilePhone.trim() || undefined,
        isPrimary,
        receiveStatusUpdates,
        notes: notes.trim() || undefined,
      });
      toast.success("Contact created successfully");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create contact", {
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
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First + Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-first">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-last">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-title">Title</Label>
            <Input
              id="contact-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Director of Maintenance"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as ContactRole)}
            >
              <SelectTrigger id="contact-role">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          {/* Phone + Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-mobile">Mobile Phone</Label>
              <Input
                id="contact-mobile"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                placeholder="+1 555-0000"
              />
            </div>
          </div>

          {/* Account/Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-customer">
              Account <span className="text-destructive">*</span>
            </Label>
            <Select
              value={customerId}
              onValueChange={setCustomerId}
              disabled={!!preselectedCustomerId}
            >
              <SelectTrigger id="contact-customer">
                <SelectValue placeholder="Select an account..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                    {c.companyName ? ` (${c.companyName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Contact */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="contact-primary"
              checked={isPrimary}
              onCheckedChange={(v) => setIsPrimary(v === true)}
            />
            <Label htmlFor="contact-primary" className="cursor-pointer">
              Primary Contact
            </Label>
          </div>

          {/* Receive Status Updates */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="contact-updates"
              checked={receiveStatusUpdates}
              onCheckedChange={(v) => setReceiveStatusUpdates(v === true)}
            />
            <Label htmlFor="contact-updates" className="cursor-pointer">
              Receive Status Updates
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-notes">Notes</Label>
            <Textarea
              id="contact-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
            />
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
              {isSubmitting ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
