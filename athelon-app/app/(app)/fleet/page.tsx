import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, PlaneTakeoff, ChevronRight, Download, Radar } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import { FaaLookupButton } from "@/components/faa/FaaLookupButton";
import { AddAircraftWizard } from "./_components/AddAircraftWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Status style helper ────────────────────────────────────────────────────

function getStatusStyle(status: string): {
  color: string;
  dot: string;
  label: string;
} {
  const map: Record<string, { color: string; dot: string; label: string }> = {
    airworthy: {
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      dot: "bg-green-400",
      label: "Airworthy",
    },
    in_maintenance: {
      color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      dot: "bg-sky-400",
      label: "In Maintenance",
    },
    out_of_service: {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
      label: "Out of Service",
    },
    aog: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-500",
      label: "AOG",
    },
    grounded_airworthiness: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-500",
      label: "Grounded",
    },
    grounded_registration: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-500",
      label: "Grounded",
    },
    deregistered: {
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      dot: "bg-slate-400",
      label: "Deregistered",
    },
    sold: {
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      dot: "bg-slate-400",
      label: "Sold",
    },
    destroyed: {
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      dot: "bg-slate-400",
      label: "Destroyed",
    },
  };
  return (
    map[status] ?? {
      color: "bg-muted text-muted-foreground border-border/30",
      dot: "bg-muted-foreground",
      label: status,
    }
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function FleetCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

function FaaLookupDialog() {
  const [nNumber, setNNumber] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Radar className="w-3.5 h-3.5" />
          FAA Lookup
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>FAA Aircraft Registry Lookup</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter N-number (e.g. N12345)"
              value={nNumber}
              onChange={(e) => setNNumber(e.target.value)}
              className="flex-1"
            />
          </div>
          <FaaLookupButton registration={nNumber} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FleetPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterActiveWo, setFilterActiveWo] = useState(false);
  const [addAircraftOpen, setAddAircraftOpen] = useState(false);

  // Build customer lookup map
  const customerMap = new Map<string, string>();
  if (customers) {
    for (const c of customers) {
      customerMap.set(c._id, c.name);
    }
  }

  // Client-side filtering
  const isFiltering = searchTerm !== "" || filterActiveWo;
  const filtered = fleet?.filter((ac) => {
    if (filterActiveWo && ac.openWorkOrderCount <= 0) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const reg = (ac.currentRegistration ?? "").toLowerCase();
      const sn = ac.serialNumber.toLowerCase();
      const custName = (
        ac.customerId ? customerMap.get(ac.customerId) ?? "" : ""
      ).toLowerCase();
      if (!reg.includes(term) && !sn.includes(term) && !custName.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const totalCount = fleet?.length ?? 0;
  const filteredCount = filtered?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isFiltering
              ? `${filteredCount} of ${totalCount} aircraft`
              : `${totalCount} aircraft registered`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (filtered?.length) {
                downloadCSV(
                  filtered.map((ac) => ({
                    Registration: ac.currentRegistration ?? "",
                    Make: ac.make ?? "",
                    Model: ac.model ?? "",
                    "Serial Number": ac.serialNumber ?? "",
                    Status: ac.status ?? "",
                  })),
                  "fleet.csv",
                );
                toast.success("Fleet exported");
              }
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <FaaLookupDialog />
          <Button size="sm" className="flex-1 sm:flex-initial" onClick={() => setAddAircraftOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Aircraft
          </Button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by N number, serial, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-muted/30 border-border/60"
          />
        </div>
        <Button
          variant={filterActiveWo ? "default" : "outline"}
          size="sm"
          className={`h-8 text-xs whitespace-nowrap ${
            filterActiveWo
              ? "bg-sky-600 hover:bg-sky-700 text-white"
              : "border-border/60"
          }`}
          onClick={() => setFilterActiveWo((prev) => !prev)}
        >
          Has Active WO
        </Button>
      </div>

      {/* Filtered count indicator */}
      {isFiltering && fleet && fleet.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredCount} of {totalCount} aircraft
        </p>
      )}

      {/* Loading state — org context still resolving */}
      {!isLoaded && (
        <div className="grid gap-3">
          <FleetCardSkeleton />
          <FleetCardSkeleton />
          <FleetCardSkeleton />
        </div>
      )}

      {/* No org context — queries are skipped */}
      {isLoaded && !orgId && (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center" data-testid="empty-state">
            <PlaneTakeoff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No organization context available
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Ask your administrator to link your account to a technician record.
            </p>
            <Button asChild size="sm" className="mt-4" data-testid="empty-state-primary-action">
              <Link to="/onboarding">Complete Setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state — queries active but still loading */}
      {isLoaded && orgId && fleet === undefined && (
        <div className="grid gap-3">
          <FleetCardSkeleton />
          <FleetCardSkeleton />
          <FleetCardSkeleton />
        </div>
      )}

      {/* Empty state: no aircraft at all */}
      {fleet !== undefined && fleet.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center" data-testid="empty-state">
            <PlaneTakeoff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No aircraft in your fleet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add your first aircraft to get started.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setAddAircraftOpen(true)}
              data-testid="empty-state-primary-action"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Aircraft
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No results state: filtering produced zero matches */}
      {fleet !== undefined && fleet.length > 0 && filtered?.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Search className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No aircraft match your search
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Try adjusting your search term or filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Aircraft cards */}
      {filtered && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((ac) => {
            const style = getStatusStyle(ac.status ?? "");
            const customerName = ac.customerId
              ? customerMap.get(ac.customerId) ?? "Unknown Customer"
              : "No Customer";
            const slug =
              ac.currentRegistration ?? ac.serialNumber;

            return (
              <Link
                key={ac._id}
                to={`/fleet/${encodeURIComponent(slug)}`}
              >
                <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-0.5">
                          <span className="font-mono font-bold text-base sm:text-xl text-foreground">
                            {ac.currentRegistration ?? ac.serialNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${style.color}`}
                          >
                            {style.label}
                          </Badge>
                          {ac.openWorkOrderCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-muted"
                            >
                              {ac.openWorkOrderCount} open WO
                              {ac.openWorkOrderCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-foreground font-medium">
                            {ac.yearOfManufacture ? `${ac.yearOfManufacture} ` : ""}
                            {ac.make} {ac.model}
                            {ac.series ? ` ${ac.series}` : ""}
                          </span>
                          <span className="text-muted-foreground/50">
                            ·
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            S/N {ac.serialNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-muted-foreground">
                            {customerName}
                          </span>
                          <span className="text-muted-foreground/40 text-[11px]">
                            ·
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {ac.totalTimeAirframeHours.toFixed(1)} TTAF
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <AddAircraftWizard open={addAircraftOpen} onOpenChange={setAddAircraftOpen} />
    </div>
  );
}
