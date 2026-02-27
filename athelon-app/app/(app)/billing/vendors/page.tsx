"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Plus,
  Search,
  Building2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

type VendorFilter = "all" | "approved" | "unapproved";

const TYPE_LABELS: Record<string, string> = {
  parts_supplier: "Parts Supplier",
  contract_maintenance: "Contract Maintenance",
  calibration_lab: "Calibration Lab",
  DER: "DER",
  consumables_supplier: "Consumables Supplier",
  service_provider: "Service Provider",
  other: "Other",
};

// Demo service counts — cycles through 0, 2, 1 for variety until real data is wired up
function getDemoServiceCount(index: number): number {
  const counts = [0, 2, 1];
  return counts[index % counts.length];
}

const CERT_WARNING_DAYS = 30;

function isCertExpiringSoon(certExpiry: number | undefined): boolean {
  if (!certExpiry) return false;
  return certExpiry - Date.now() < CERT_WARNING_DAYS * 24 * 60 * 60 * 1000;
}

function isCertExpired(certExpiry: number | undefined): boolean {
  if (!certExpiry) return false;
  return certExpiry < Date.now();
}

function VendorSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /></div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState<VendorFilter>("all");
  const [search, setSearch] = useState("");
  const { orgId, isLoaded } = useCurrentOrg();

  const vendors = useQuery(
    api.vendors.listVendors,
    orgId ? {
      orgId,
      isApproved: activeTab === "all" ? undefined : activeTab === "approved",
    } : "skip",
  );

  const isLoading = !isLoaded || vendors === undefined;

  const filtered = useMemo(() => {
    if (!vendors) return [];
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.contactName ?? "").toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const all = vendors ?? [];
  const counts = {
    all: all.length,
    approved: all.filter((v) => v.isApproved).length,
    unapproved: all.filter((v) => !v.isApproved).length,
  };

  const expiringCount = all.filter((v) => isCertExpiringSoon(v.certExpiry)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Vendors</h1>
          {isLoading ? <Skeleton className="h-4 w-40 mt-1" /> : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {all.length} total · {counts.approved} approved
              {expiringCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-2">· {expiringCount} cert expiring</span>
              )}
            </p>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/billing/vendors/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Vendor
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VendorFilter)} className="w-full sm:w-auto">
          <TabsList className="h-8 bg-muted/40 p-0.5">
            {([
              ["all", "All"],
              ["approved", "Approved"],
              ["unapproved", "Pending"],
            ] as const).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-7 px-3 text-xs data-[state=active]:bg-background">
                {label}
                {!isLoading && counts[value] > 0 && (
                  <Badge variant="secondary" className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${activeTab === value ? "bg-primary/15 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                    {counts[value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
            aria-label="Search vendors by name or type"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading vendors">{Array.from({ length: 4 }).map((_, i) => <VendorSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No vendors found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "all" ? "Add vendors to manage your Approved Vendor List." : `No ${activeTab} vendors.`}
            </p>
            {activeTab === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link to="/billing/vendors/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Vendor
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" aria-live="polite" aria-label={`Vendors list, ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}>
          {filtered.map((vendor, vendorIndex) => {
            const certExpired = isCertExpired(vendor.certExpiry);
            const certExpiringSoon = !certExpired && isCertExpiringSoon(vendor.certExpiry);
            const serviceCount = getDemoServiceCount(vendorIndex);

            return (
              <Link key={vendor._id} to={`/billing/vendors/${vendor._id}`} aria-label={`Vendor: ${vendor.name} — ${vendor.isApproved ? "Approved" : "Not Approved"}${certExpired ? " — Certificate Expired" : certExpiringSoon ? " — Certificate Expiring Soon" : ""}`}>
                <Card className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${certExpired ? "border-l-4 border-l-red-500" : certExpiringSoon ? "border-l-4 border-l-amber-500" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{vendor.name}</span>
                          {vendor.isApproved ? (
                            <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 text-[10px] gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30 gap-0.5">
                              <XCircle className="w-2.5 h-2.5" aria-hidden="true" />
                              Not Approved
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/40">
                            {TYPE_LABELS[vendor.type] ?? vendor.type}
                          </Badge>
                          {certExpired && (
                            <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Cert Expired
                            </Badge>
                          )}
                          {certExpiringSoon && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Cert Expiring
                            </Badge>
                          )}
                          {serviceCount > 0 && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/40">
                              {serviceCount} {serviceCount === 1 ? "service" : "services"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {vendor.contactName && <span className="text-xs text-muted-foreground">{vendor.contactName}</span>}
                          {vendor.certExpiry && (
                            <span className="text-xs text-muted-foreground">
                              · Cert expires {formatDate(vendor.certExpiry)}
                            </span>
                          )}
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
    </div>
  );
}
