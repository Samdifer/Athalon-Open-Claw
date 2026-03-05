"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/hooks/useRouter";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plane,
  FileText,
  Receipt,
  MessageSquare,
  Plus,
  Users,
  Phone,
  Mail,
  Video,
  MapPin,
  StickyNote,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { HealthScoreBadge } from "../../_components/HealthScoreBadge";
import { CreateContactDialog } from "../../_components/CreateContactDialog";

// ─── Types ──────────────────────────────────────────────────────────────────

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

type InteractionType =
  | "phone_call"
  | "email"
  | "meeting"
  | "site_visit"
  | "note";

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

const INTERACTION_ICONS: Record<InteractionType, typeof Phone> = {
  phone_call: Phone,
  email: Mail,
  meeting: Video,
  site_visit: MapPin,
  note: StickyNote,
};

const INTERACTION_LABELS: Record<InteractionType, string> = {
  phone_call: "Phone Call",
  email: "Email",
  meeting: "Meeting",
  site_visit: "Site Visit",
  note: "Note",
};

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

const ACTIVE_WO_STATUSES = new Set([
  "open",
  "in_progress",
  "pending_inspection",
  "pending_signoff",
  "on_hold",
  "open_discrepancies",
]);

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

// ─── Log Interaction Dialog ─────────────────────────────────────────────────

interface LogInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  organizationId: string;
}

function LogInteractionDialog({
  open,
  onOpenChange,
  customerId,
  organizationId,
}: LogInteractionDialogProps) {
  const logInteraction = useMutation(api.crm.logInteraction);
  const [type, setType] = useState<InteractionType>("phone_call");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setType("phone_call");
    setSubject("");
    setDescription("");
    setOutcome("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await logInteraction({
        organizationId: organizationId as Id<"organizations">,
        customerId: customerId as Id<"customers">,
        type,
        subject: subject.trim(),
        description: description.trim() || undefined,
        outcome: outcome.trim() || undefined,
        interactionDate: Date.now(),
      });
      toast.success("Interaction logged");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to log interaction", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="interaction-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
              <SelectTrigger id="interaction-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone_call">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interaction-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="interaction-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject line"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interaction-desc">Description</Label>
            <Textarea
              id="interaction-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details of the interaction..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="interaction-outcome">Outcome</Label>
            <Input
              id="interaction-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Result or next steps"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging..." : "Log Interaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { orgId, isLoaded } = useCurrentOrg();

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);

  // ─── Data queries ───────────────────────────────────────────────────────

  const accountSummary = useQuery(
    api.crm.getAccountSummary,
    orgId && customerId
      ? {
          organizationId: orgId as Id<"organizations">,
          customerId: customerId as Id<"customers">,
        }
      : "skip",
  );

  const contacts = useQuery(
    api.crm.listContactsForCustomer,
    orgId && customerId
      ? {
          organizationId: orgId as Id<"organizations">,
          customerId: customerId as Id<"customers">,
        }
      : "skip",
  );

  const aircraft = useQuery(
    api.billingV4.listAircraftForCustomer,
    orgId && customerId
      ? {
          customerId: customerId as Id<"customers">,
          organizationId: orgId as Id<"organizations">,
        }
      : "skip",
  );

  const workOrders = useQuery(
    api.billingV4.listWorkOrdersForCustomer,
    orgId && customerId
      ? {
          customerId: customerId as Id<"customers">,
          organizationId: orgId as Id<"organizations">,
        }
      : "skip",
  );

  const quotes = useQuery(
    api.billingV4.listQuotesForCustomer,
    orgId && customerId
      ? {
          customerId: customerId as Id<"customers">,
          organizationId: orgId as Id<"organizations">,
        }
      : "skip",
  );

  const invoices = useQuery(
    api.billingV4.listInvoicesForCustomer,
    orgId && customerId
      ? {
          customerId: customerId as Id<"customers">,
          organizationId: orgId as Id<"organizations">,
        }
      : "skip",
  );

  const interactions = useQuery(
    api.crm.listInteractionsForCustomer,
    orgId && customerId
      ? {
          organizationId: orgId as Id<"organizations">,
          customerId: customerId as Id<"customers">,
        }
      : "skip",
  );

  const isLoading = !isLoaded || accountSummary === undefined;
  const customer = accountSummary?.customer;

  // Derived work order splits
  const activeWOs = (workOrders ?? []).filter((wo: Record<string, unknown>) =>
    ACTIVE_WO_STATUSES.has(wo.status as string),
  );
  const completedWOs = (workOrders ?? []).filter((wo: Record<string, unknown>) =>
    !ACTIVE_WO_STATUSES.has(wo.status as string),
  );

  // Recent activity (last 10 interactions for overview)
  const recentInteractions = (interactions ?? []).slice(0, 10);

  if (!isLoading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Account not found.</p>
        <Button variant="outline" onClick={() => router.push("/crm/accounts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Accounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/crm/accounts")}
            aria-label="Back to accounts"
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                    {customer?.name}
                  </h1>
                  {customer && (
                    <TypeBadge type={(customer.customerType as CustomerType) ?? "company"} />
                  )}
                  <HealthScoreBadge
                    score={accountSummary?.healthScore?.overallScore ?? null}
                  />
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

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap ml-11 sm:ml-0">
          <Button
            size="sm"
            variant="default"
            onClick={() => setInteractionDialogOpen(true)}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Log Interaction
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/billing/quotes/new">
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Create Quote
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/billing/customers/${customerId}`}>
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Edit in Billing
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">Contacts</TabsTrigger>
          <TabsTrigger value="aircraft" className="text-xs">Aircraft</TabsTrigger>
          <TabsTrigger value="work-history" className="text-xs">Work History</TabsTrigger>
          <TabsTrigger value="quotes-invoices" className="text-xs">Quotes & Invoices</TabsTrigger>
          <TabsTrigger value="interactions" className="text-xs">Interactions</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-5">
          {/* Metric Cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-semibold mt-1">
                    {formatCurrency(accountSummary?.totalRevenue ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Open WOs</p>
                  <p className="text-lg font-semibold mt-1">
                    {accountSummary?.activeWoCount ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Aircraft</p>
                  <p className="text-lg font-semibold mt-1">
                    {accountSummary?.aircraftCount ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                  <p className="text-lg font-semibold mt-1">
                    {formatCurrency(accountSummary?.outstandingBalance ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Active Opportunities</p>
                  <p className="text-lg font-semibold mt-1">
                    {accountSummary?.activeOpportunities ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {interactions === undefined ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentInteractions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No interactions recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentInteractions.map((interaction: Record<string, unknown>) => {
                    const iType = interaction.type as InteractionType;
                    const Icon = INTERACTION_ICONS[iType] ?? StickyNote;
                    return (
                      <div
                        key={interaction._id as string}
                        className="flex gap-3 items-start"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {interaction.subject as string}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] flex-shrink-0"
                            >
                              {INTERACTION_LABELS[iType] ?? iType}
                            </Badge>
                          </div>
                          {interaction.description ? (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {String(interaction.description)}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>
                              {formatDate(interaction.interactionDate as number)}
                            </span>
                            {interaction.createdByName ? (
                              <>
                                <span>&middot;</span>
                                <span>{String(interaction.createdByName)}</span>
                              </>
                            ) : null}
                            {interaction.outcome ? (
                              <>
                                <span>&middot;</span>
                                <span className="text-foreground/70">
                                  {String(interaction.outcome)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Contacts Tab ─────────────────────────────────────────────── */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Contacts ({contacts?.length ?? 0})
            </h2>
            <Button size="sm" onClick={() => setContactDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Contact
            </Button>
          </div>

          {contacts === undefined ? (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : contacts.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No contacts yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Add a contact to start tracking your relationship.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setContactDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
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
                          <TableCell>
                            {contact.active !== false ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30"
                              >
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Aircraft Tab ─────────────────────────────────────────────── */}
        <TabsContent value="aircraft" className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">
            Aircraft ({aircraft?.length ?? 0})
          </h2>

          {aircraft === undefined ? (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration</TableHead>
                      <TableHead>Make / Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : aircraft.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Plane className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No aircraft linked to this account
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Registration</TableHead>
                        <TableHead>Make / Model</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aircraft.map((ac: Record<string, unknown>) => (
                        <TableRow
                          key={ac._id as string}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() =>
                            router.push(`/fleet/${ac.registration as string}`)
                          }
                        >
                          <TableCell className="font-medium text-sm">
                            {ac.registration as string}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(ac.make as string) ?? "---"}{" "}
                            {(ac.model as string) ?? ""}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                (ac.status as string) === "active"
                                  ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
                                  : "bg-muted text-muted-foreground border-muted-foreground/30"
                              }`}
                            >
                              {(ac.status as string) ?? "---"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(ac.totalTime as number) != null
                              ? `${ac.totalTime as number} hrs`
                              : "---"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Work History Tab ─────────────────────────────────────────── */}
        <TabsContent value="work-history" className="space-y-5">
          {/* Active Work Orders */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">
              Active Work Orders ({activeWOs.length})
            </h2>
            {workOrders === undefined ? (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>WO #</TableHead>
                        <TableHead>Aircraft</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : activeWOs.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active work orders.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>WO #</TableHead>
                          <TableHead>Aircraft</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeWOs.map((wo: Record<string, unknown>) => {
                          const statusStyle = getWoStatusStyle(wo.status as string);
                          return (
                            <TableRow
                              key={wo._id as string}
                              className="cursor-pointer hover:bg-muted/40 transition-colors"
                              onClick={() =>
                                router.push(`/work-orders/${wo._id as string}`)
                              }
                            >
                              <TableCell className="font-medium text-sm">
                                {(wo.woNumber as string) ?? (wo._id as string).slice(-6)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(wo.aircraftRegistration as string) ?? "---"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] border ${statusStyle.color}`}
                                >
                                  {statusStyle.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(wo.type as string) ?? "---"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Completed Work Orders */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">
              Completed Work Orders ({completedWOs.length})
            </h2>
            {completedWOs.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No completed work orders.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>WO #</TableHead>
                          <TableHead>Aircraft</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedWOs.map((wo: Record<string, unknown>) => {
                          const statusStyle = getWoStatusStyle(wo.status as string);
                          return (
                            <TableRow
                              key={wo._id as string}
                              className="cursor-pointer hover:bg-muted/40 transition-colors"
                              onClick={() =>
                                router.push(`/work-orders/${wo._id as string}`)
                              }
                            >
                              <TableCell className="font-medium text-sm">
                                {(wo.woNumber as string) ?? (wo._id as string).slice(-6)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(wo.aircraftRegistration as string) ?? "---"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] border ${statusStyle.color}`}
                                >
                                  {statusStyle.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(wo.type as string) ?? "---"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── Quotes & Invoices Tab ────────────────────────────────────── */}
        <TabsContent value="quotes-invoices" className="space-y-5">
          {/* Quotes */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">
              Quotes ({quotes?.length ?? 0})
            </h2>
            {quotes === undefined ? (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 2 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : quotes.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-8 text-center">
                  <Receipt className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No quotes yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.map((quote: Record<string, unknown>) => {
                          const statusStyle = getQuoteStatusStyle(
                            quote.status as string,
                          );
                          return (
                            <TableRow key={quote._id as string}>
                              <TableCell className="font-medium text-sm">
                                {(quote.quoteNumber as string) ?? "---"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] border ${statusStyle.color}`}
                                >
                                  {statusStyle.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatCurrency((quote.total as number) ?? 0)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(quote.createdAt as number)
                                  ? formatDate(quote.createdAt as number)
                                  : "---"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Invoices */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">
              Invoices ({invoices?.length ?? 0})
            </h2>
            {invoices === undefined ? (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 2 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : invoices.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-8 text-center">
                  <FileText className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No invoices yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv: Record<string, unknown>) => {
                          const statusStyle = getInvoiceStatusStyle(
                            inv.status as string,
                          );
                          const total = (inv.total as number) ?? 0;
                          const amountPaid = (inv.amountPaid as number) ?? 0;
                          const balance = total - amountPaid;
                          return (
                            <TableRow key={inv._id as string}>
                              <TableCell className="font-medium text-sm">
                                {(inv.invoiceNumber as string) ?? "---"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] border ${statusStyle.color}`}
                                >
                                  {statusStyle.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatCurrency(total)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatCurrency(balance)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(inv.dueDate as number)
                                  ? formatDate(inv.dueDate as number)
                                  : "---"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── Interactions Tab ─────────────────────────────────────────── */}
        <TabsContent value="interactions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Interactions ({interactions?.length ?? 0})
            </h2>
            <Button
              size="sm"
              onClick={() => setInteractionDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Log Interaction
            </Button>
          </div>

          {interactions === undefined ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : interactions.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No interactions recorded
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Log your first interaction to start building a timeline.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setInteractionDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Log Interaction
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="relative border-l-2 border-border/60 ml-4 pl-6 space-y-6">
              {interactions.map((interaction: Record<string, unknown>) => {
                const iType = interaction.type as InteractionType;
                const Icon = INTERACTION_ICONS[iType] ?? StickyNote;
                return (
                  <div
                    key={interaction._id as string}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[33px] top-0 h-8 w-8 rounded-full bg-background border-2 border-border/60 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {interaction.subject as string}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                        >
                          {INTERACTION_LABELS[iType] ?? iType}
                        </Badge>
                      </div>
                      {interaction.description ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {String(interaction.description)}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>
                          {formatDate(interaction.interactionDate as number)}
                        </span>
                        {interaction.createdByName ? (
                          <>
                            <span>&middot;</span>
                            <span>{String(interaction.createdByName)}</span>
                          </>
                        ) : null}
                      </div>
                      {interaction.outcome ? (
                        <p className="text-xs text-foreground/70 mt-1">
                          Outcome: {String(interaction.outcome)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Documents Tab ────────────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Document management coming soon
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Attach contracts, certificates, and other documents to this account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        preselectedCustomerId={customerId}
      />
      {orgId && (
        <LogInteractionDialog
          open={interactionDialogOpen}
          onOpenChange={setInteractionDialogOpen}
          customerId={customerId}
          organizationId={orgId}
        />
      )}
    </div>
  );
}
