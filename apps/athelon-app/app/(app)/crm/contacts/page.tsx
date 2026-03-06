"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "react-router-dom";
import { Search, Contact2, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ContactCard } from "../_components/ContactCard";
import { CreateContactDialog } from "../_components/CreateContactDialog";
import { formatDate } from "@/lib/format";

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  dom: "Director of Maintenance",
  chief_pilot: "Chief Pilot",
  ap_manager: "AP Manager",
  operations: "Operations",
  dispatcher: "Dispatcher",
  other: "Other",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  dom: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  chief_pilot: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  ap_manager: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  operations: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  dispatcher: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  other: "bg-muted text-muted-foreground border-muted-foreground/30",
};

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ContactRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ContactsDirectoryPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [primaryOnly, setPrimaryOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const contacts = useQuery(
    api.crm.listContacts,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  const isLoading = !isLoaded || contacts === undefined;

  // Build customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, { name: string; companyName?: string }>();
    for (const c of customers ?? []) {
      map.set(c._id, { name: c.name, companyName: c.companyName });
    }
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    if (!contacts) return [];

    let result = contacts;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const email = c.email?.toLowerCase() ?? "";
        const customerInfo = customerMap.get(c.customerId);
        const companyName = (customerInfo?.name ?? "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || companyName.includes(q);
      });
    }

    // Account filter
    if (accountFilter !== "all") {
      result = result.filter((c) => c.customerId === accountFilter);
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((c) => c.role === roleFilter);
    }

    // Primary only
    if (primaryOnly) {
      result = result.filter((c) => c.isPrimary);
    }

    // Sort by name
    return [...result].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [contacts, search, accountFilter, roleFilter, primaryOnly, customerMap]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Contacts</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} of {contacts?.length ?? 0} contacts
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Contact
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-muted/30 border-border/60"
            aria-label="Search contacts"
          />
        </div>

        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {(customers ?? []).map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="dom">Director of Maintenance</SelectItem>
            <SelectItem value="chief_pilot">Chief Pilot</SelectItem>
            <SelectItem value="ap_manager">AP Manager</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="dispatcher">Dispatcher</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Checkbox
            id="primary-only"
            checked={primaryOnly}
            onCheckedChange={(v) => setPrimaryOnly(v === true)}
          />
          <Label htmlFor="primary-only" className="text-xs cursor-pointer">
            Primary only
          </Label>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Last Contacted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <ContactRowSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Contact2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No contacts found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || accountFilter !== "all" || roleFilter !== "all" || primaryOnly
                ? "No contacts match your filters."
                : "Add your first contact to get started."}
            </p>
            {!search && accountFilter === "all" && roleFilter === "all" && !primaryOnly && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {filtered.map((contact) => {
              const customerInfo = customerMap.get(contact.customerId);
              return (
                <ContactCard
                  key={contact._id}
                  firstName={contact.firstName}
                  lastName={contact.lastName}
                  title={contact.title}
                  role={contact.role}
                  companyName={customerInfo?.name ?? "Unknown"}
                  phone={contact.phone}
                  email={contact.email}
                  isPrimary={contact.isPrimary}
                />
              );
            })}
          </div>

          {/* Desktop table view */}
          <Card className="border-border/60 hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Last Contacted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((contact) => {
                      const customerInfo = customerMap.get(contact.customerId);
                      return (
                        <TableRow key={contact._id}>
                          <TableCell className="font-medium text-sm">
                            {contact.firstName} {contact.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contact.title ?? "---"}
                          </TableCell>
                          <TableCell>
                            {contact.role ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium border ${ROLE_BADGE_STYLES[contact.role] ?? ROLE_BADGE_STYLES.other}`}
                              >
                                {ROLE_LABELS[contact.role] ?? contact.role}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">---</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/crm/accounts/${contact.customerId}`}
                              className="text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {customerInfo?.name ?? "Unknown"}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contact.phone ?? "---"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contact.email ?? "---"}
                          </TableCell>
                          <TableCell>
                            {contact.isPrimary ? (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <span className="text-xs text-muted-foreground">---</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contact.lastContactedAt
                              ? formatDate(contact.lastContactedAt)
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CreateContactDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
