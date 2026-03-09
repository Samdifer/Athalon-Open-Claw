"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Search,
  Target,
  Globe,
  Server,
  TrendingUp,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return "text-muted-foreground";
  if (score >= 0.7) return "text-green-600 dark:text-green-400";
  if (score >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function tierBadge(tier: string | undefined) {
  const styles: Record<string, string> = {
    A: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    B: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    C: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  };
  if (!tier) return <Badge variant="outline" className="text-xs">—</Badge>;
  return (
    <Badge variant="outline" className={`text-xs ${styles[tier] ?? ""}`}>
      {tier}
    </Badge>
  );
}

function segmentBadge(seg: string | undefined) {
  const config: Record<string, { icon: typeof Globe; label: string; cls: string }> = {
    website: { icon: Globe, label: "Website", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    erp: { icon: Server, label: "ERP", cls: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
    both: { icon: TrendingUp, label: "Both", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    none: { icon: Filter, label: "None", cls: "bg-muted text-muted-foreground border-muted-foreground/30" },
  };
  if (!seg || !config[seg]) return <span className="text-muted-foreground text-xs">—</span>;
  const { label, cls } = config[seg];
  return <Badge variant="outline" className={`text-xs ${cls}`}>{label}</Badge>;
}

function pct(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return `${(n * 100).toFixed(0)}%`;
}

// ─── Stats Cards ────────────────────────────────────────────────────────────

function StatsCards({ orgId }: { orgId: string }) {
  const stats = useQuery(api.targetProspects.stats, {
    organizationId: orgId as any,
  });

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Prospects</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tier A</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold text-green-600">{stats.byTier.A}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Website Fit</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold text-blue-600">{stats.bySegment.website + stats.bySegment.both}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">ERP Fit</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-bold text-purple-600">{stats.bySegment.erp + stats.bySegment.both}</p></CardContent>
      </Card>
    </div>
  );
}

// ─── Table Skeleton ─────────────────────────────────────────────────────────

function ProspectRowSkeleton() {
  return (
    <TableRow>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <TableCell key={i}><Skeleton className="h-4 w-20" /></TableCell>
      ))}
    </TableRow>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TargetProspectsPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("prominenceScore");

  const prospects = useQuery(
    api.targetProspects.list,
    orgId
      ? {
          organizationId: orgId as any,
          targetSegment: segmentFilter !== "all" ? segmentFilter as any : undefined,
          search: search || undefined,
          limit: 500,
        }
      : "skip"
  );

  const sorted = useMemo(() => {
    if (!prospects) return [];
    let list = [...prospects];

    // Tier filter (client-side since index is segment-based)
    if (tierFilter !== "all") {
      list = list.filter((p) => p.outreachTier === tierFilter);
    }

    // Sort
    list.sort((a, b) => {
      const av = (a as any)[sortField] ?? -1;
      const bv = (b as any)[sortField] ?? -1;
      return bv - av; // descending
    });

    return list;
  }, [prospects, tierFilter, sortField]);

  if (!isLoaded) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Target className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Target Prospects</h1>
        <Badge variant="secondary" className="text-xs">Market Intel</Badge>
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Enriched repair-station targeting data for sales prioritization. Filter by
        target segment, outreach tier, or search by name/location.
      </p>

      {/* Stats */}
      {orgId && <StatsCards orgId={orgId} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, city, cert…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="erp">ERP</SelectItem>
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="A">Tier A</SelectItem>
            <SelectItem value="B">Tier B</SelectItem>
            <SelectItem value="C">Tier C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortField} onValueChange={setSortField}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prominenceScore">Prominence</SelectItem>
            <SelectItem value="websiteRedesignFitScore">Website Fit</SelectItem>
            <SelectItem value="erpCorridorLikelihood">ERP Corridor</SelectItem>
            <SelectItem value="erpEbisLikelihood">ERP EBIS</SelectItem>
            <SelectItem value="confidenceScore">Confidence</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {prospects && (
        <p className="text-xs text-muted-foreground">
          Showing {sorted.length} of {prospects.length} prospects
        </p>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Cert #</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Prominence</TableHead>
              <TableHead className="text-right">Web Fit</TableHead>
              <TableHead className="text-right">ERP Corr.</TableHead>
              <TableHead className="text-right">ERP EBIS</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!prospects ? (
              Array.from({ length: 8 }).map((_, i) => <ProspectRowSkeleton key={i} />)
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No prospects found. Import enrichment data to populate this view.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {p.dbaName || p.legalName}
                    {p.dbaName && (
                      <span className="block text-xs text-muted-foreground truncate">
                        {p.legalName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.certNumber}</TableCell>
                  <TableCell>{tierBadge(p.outreachTier)}</TableCell>
                  <TableCell>{segmentBadge(p.targetSegment)}</TableCell>
                  <TableCell className={`text-right ${scoreColor(p.prominenceScore)}`}>
                    {p.prominenceScore?.toFixed(3) ?? "—"}
                  </TableCell>
                  <TableCell className={`text-right ${scoreColor(p.websiteRedesignFitScore)}`}>
                    {pct(p.websiteRedesignFitScore)}
                  </TableCell>
                  <TableCell className={`text-right ${scoreColor(p.erpCorridorLikelihood)}`}>
                    {pct(p.erpCorridorLikelihood)}
                  </TableCell>
                  <TableCell className={`text-right ${scoreColor(p.erpEbisLikelihood)}`}>
                    {pct(p.erpEbisLikelihood)}
                  </TableCell>
                  <TableCell className={`text-right ${scoreColor(p.confidenceScore)}`}>
                    {p.confidenceLabel ?? pct(p.confidenceScore)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
