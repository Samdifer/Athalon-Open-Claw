"use client";

import { useState, useMemo } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "react-router-dom";
import { Search, Building2, Plus } from "lucide-react";
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
import { HealthScoreBadge } from "../_components/HealthScoreBadge";
import { AccountCard } from "../_components/AccountCard";
import { formatDate, formatCurrency } from "@/lib/format";

// ─── Types ──────────────────────────────────────────────────────────────────

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

type HealthFilter = "all" | "excellent" | "good" | "at_risk" | "critical";
type StatusFilter = "active" | "inactive" | "all";
type SortOption = "name" | "revenue" | "health" | "last_contact";

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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function AccountRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AccountsDirectoryPage() {
  const router = useRouter();
  const { orgId, isLoaded } = useCurrentOrg();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const accounts = useQuery(
    api.crm.listAccountsWithMetrics,
    orgId
      ? {
          organizationId: orgId as Id<"organizations">,
          includeInactive: statusFilter !== "active",
        }
      : "skip",
  );

  const isLoading = !isLoaded || accounts === undefined;

  const filtered = useMemo(() => {
    if (!accounts) return [];

    let result = accounts;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.companyName?.toLowerCase().includes(q) ?? false),
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((a) => a.customerType === typeFilter);
    }

    // Health score filter
    if (healthFilter !== "all") {
      result = result.filter((a) => {
        const score = a.healthScore as number | null;
        if (score === null) return false;
        switch (healthFilter) {
          case "excellent":
            return score >= 75;
          case "good":
            return score >= 50 && score < 75;
          case "at_risk":
            return score >= 25 && score < 50;
          case "critical":
            return score < 25;
          default:
            return true;
        }
      });
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((a) => a.active !== false);
    } else if (statusFilter === "inactive") {
      result = result.filter((a) => a.active === false);
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "revenue":
        sorted.sort((a, b) => (b.totalRevenue as number) - (a.totalRevenue as number));
        break;
      case "health":
        sorted.sort((a, b) => {
          const sa = (a.healthScore as number | null) ?? -1;
          const sb = (b.healthScore as number | null) ?? -1;
          return sb - sa;
        });
        break;
      case "last_contact":
        sorted.sort((a, b) => {
          const da = (a.lastInteractionDate as number | null) ?? 0;
          const db = (b.lastInteractionDate as number | null) ?? 0;
          return db - da;
        });
        break;
    }

    return sorted;
  }, [accounts, search, typeFilter, healthFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Accounts</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} of {accounts?.length ?? 0} accounts
            </p>
          )}
        </div>
        <Button size="sm" asChild>
          <Link to="/billing/customers">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-muted/30 border-border/60"
            aria-label="Search accounts"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Customer Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="charter_operator">Charter Operator</SelectItem>
            <SelectItem value="flight_school">Flight School</SelectItem>
            <SelectItem value="government">Government</SelectItem>
          </SelectContent>
        </Select>

        <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as HealthFilter)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Health Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="excellent">Excellent (75-100)</SelectItem>
            <SelectItem value="good">Good (50-74)</SelectItem>
            <SelectItem value="at_risk">At Risk (25-49)</SelectItem>
            <SelectItem value="critical">Critical (0-24)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="health">Health Score</SelectItem>
            <SelectItem value="last_contact">Last Contact</SelectItem>
          </SelectContent>
        </Select>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Open WOs</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Health Score</TableHead>
                    <TableHead>Last Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <AccountRowSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No accounts found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || typeFilter !== "all" || healthFilter !== "all"
                ? "No accounts match your filters."
                : "Add your first customer to get started."}
            </p>
            {!search && typeFilter === "all" && healthFilter === "all" && (
              <Button size="sm" className="mt-4" asChild>
                <Link to="/billing/customers">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Customer
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {filtered.map((account) => (
              <AccountCard
                key={account._id}
                id={account._id}
                name={account.name}
                companyName={account.companyName}
                customerType={account.customerType ?? "company"}
                aircraftCount={account.aircraftCount as number}
                openWoCount={account.openWoCount as number}
                totalRevenue={account.totalRevenue as number}
                healthScore={account.healthScore as number | null}
                lastInteractionDate={account.lastInteractionDate as number | null}
                onClick={() => router.push(`/crm/accounts/${account._id}`)}
              />
            ))}
          </div>

          {/* Desktop table view */}
          <Card className="border-border/60 hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Open WOs</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Health Score</TableHead>
                      <TableHead>Last Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((account) => (
                      <TableRow
                        key={account._id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() =>
                          router.push(`/crm/accounts/${account._id}`)
                        }
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{account.name}</p>
                            {account.companyName && (
                              <p className="text-xs text-muted-foreground">
                                {account.companyName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TypeBadge
                            type={(account.customerType ?? "company") as CustomerType}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.aircraftCount as number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.openWoCount as number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCurrency(account.totalRevenue as number)}
                        </TableCell>
                        <TableCell>
                          <HealthScoreBadge
                            score={account.healthScore as number | null}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(account.lastInteractionDate as number | null)
                            ? formatDate(account.lastInteractionDate as number)
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
