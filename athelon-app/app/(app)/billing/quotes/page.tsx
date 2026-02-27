"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Plus,
  Search,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED" | "all";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  APPROVED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  CONVERTED: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DECLINED: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

function QuoteSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuotesPage() {
  const [activeTab, setActiveTab] = useState<QuoteStatus>("all");
  const [search, setSearch] = useState("");
  const { orgId, isLoaded } = useCurrentOrg();

  const quotes = useQuery(
    api.billing.listQuotes,
    orgId ? { orgId, status: activeTab === "all" ? undefined : activeTab } : "skip",
  );

  const isLoading = !isLoaded || quotes === undefined;

  const filtered = useMemo(() => {
    if (!quotes) return [];
    if (!search.trim()) return quotes;
    const q = search.toLowerCase();
    return quotes.filter(
      (quote) =>
        quote.quoteNumber.toLowerCase().includes(q),
    );
  }, [quotes, search]);

  const all = quotes ?? [];
  const counts: Record<QuoteStatus, number> = {
    all: all.length,
    DRAFT: all.filter((q) => q.status === "DRAFT").length,
    SENT: all.filter((q) => q.status === "SENT").length,
    APPROVED: all.filter((q) => q.status === "APPROVED").length,
    CONVERTED: all.filter((q) => q.status === "CONVERTED").length,
    DECLINED: all.filter((q) => q.status === "DECLINED").length,
  };

  const tabs: { value: QuoteStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "APPROVED", label: "Approved" },
    { value: "CONVERTED", label: "Converted" },
    { value: "DECLINED", label: "Declined" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quotes</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {all.length} total · {counts.APPROVED} approved
            </p>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/billing/quotes/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Quote
          </Link>
        </Button>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as QuoteStatus)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5 flex-wrap">
            {tabs.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                {label}
                {!isLoading && counts[value] > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${
                      activeTab === value
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
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
            placeholder="Search quote number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
            aria-label="Search quotes by number"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading quotes">
          {Array.from({ length: 4 }).map((_, i) => <QuoteSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No quotes found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "all"
                ? "No quotes yet. Create one to get started."
                : `No ${activeTab.toLowerCase()} quotes.`}
            </p>
            {activeTab === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link to="/billing/quotes/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Quote
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" aria-live="polite" aria-label={`Quotes list, ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}>
          {filtered.map((quote) => (
            <Link key={quote._id} to={`/billing/quotes/${quote._id}`} aria-label={`Quote ${quote.quoteNumber} — ${quote.status} — $${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}>
              <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {quote.quoteNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border ${STATUS_STYLES[quote.status] ?? ""}`}
                        >
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Created {formatDate(quote.createdAt)}
                        </span>
                        {quote.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            · Expires {formatDate(quote.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        ${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
