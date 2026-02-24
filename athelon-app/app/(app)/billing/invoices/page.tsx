"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Plus,
  Search,
  Receipt,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "VOID" | "all";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PAID: "bg-green-500/15 text-green-400 border-green-500/30",
  VOID: "bg-red-500/15 text-red-400 border-red-500/30",
};

function agingDays(sentAt: number | undefined): number | null {
  if (!sentAt) return null;
  return Math.floor((Date.now() - sentAt) / (1000 * 60 * 60 * 24));
}

function AgingBadge({ days }: { days: number }) {
  if (days <= 30) return null;
  const cls = days > 90
    ? "bg-red-500/15 text-red-400 border-red-500/30"
    : days > 60
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return (
    <Badge variant="outline" className={`text-[10px] border ${cls} gap-0.5`}>
      <AlertTriangle className="w-2.5 h-2.5" />
      {days}d
    </Badge>
  );
}

function InvoiceSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  const { orgId, isLoaded } = useCurrentOrg();

  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId, status: activeTab === "all" ? undefined : activeTab } : "skip",
  );

  const isLoading = !isLoaded || invoices === undefined;

  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((inv) => inv.invoiceNumber.toLowerCase().includes(q));
  }, [invoices, search]);

  const all = invoices ?? [];
  const counts: Record<InvoiceStatus, number> = {
    all: all.length,
    DRAFT: all.filter((i) => i.status === "DRAFT").length,
    SENT: all.filter((i) => i.status === "SENT").length,
    PAID: all.filter((i) => i.status === "PAID").length,
    VOID: all.filter((i) => i.status === "VOID").length,
  };

  const tabs: { value: InvoiceStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "PAID", label: "Paid" },
    { value: "VOID", label: "Void" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {all.length} total · {counts.SENT} outstanding
            </p>
          )}
        </div>
        <Button asChild size="sm">
          <Link href="/billing/invoices/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InvoiceStatus)} className="w-full sm:w-auto">
          <TabsList className="h-8 bg-muted/40 p-0.5">
            {tabs.map(({ value, label }) => (
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <InvoiceSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No invoices found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "all" ? "No invoices yet. Create one from a closed work order." : `No ${activeTab.toLowerCase()} invoices.`}
            </p>
            {activeTab === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link href="/billing/invoices/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Invoice
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const aging = inv.status === "SENT" ? agingDays(inv.sentAt) : null;
            return (
              <Link key={inv._id} href={`/billing/invoices/${inv._id}`}>
                <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground font-medium">{inv.invoiceNumber}</span>
                          <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[inv.status] ?? ""}`}>
                            {inv.status}
                          </Badge>
                          {aging !== null && aging > 30 && <AgingBadge days={aging} />}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">Created {formatDate(inv.createdAt)}</span>
                          {inv.sentAt && (
                            <span className="text-xs text-muted-foreground">· Sent {formatDate(inv.sentAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold">${inv.total.toFixed(2)}</p>
                          {inv.status === "SENT" && inv.balance > 0 && (
                            <p className="text-[10px] text-muted-foreground">Balance: ${inv.balance.toFixed(2)}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </div>
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
