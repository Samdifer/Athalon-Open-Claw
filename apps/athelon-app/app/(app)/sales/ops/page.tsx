"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED";

type PipelineBucket = {
  key: "draft" | "in-process" | "closed";
  title: string;
  statuses: QuoteStatus[];
  description: string;
  testId: string;
};

const PIPELINE_BUCKETS: PipelineBucket[] = [
  {
    key: "draft",
    title: "Draft quotes",
    statuses: ["DRAFT"],
    description: "Pre-release quotes still in authoring and scope review.",
    testId: "sales-ops-bucket-draft",
  },
  {
    key: "in-process",
    title: "In-process quotes",
    statuses: ["SENT", "APPROVED"],
    description: "Customer-facing quotes currently awaiting response or conversion.",
    testId: "sales-ops-bucket-in-process",
  },
  {
    key: "closed",
    title: "Closed quotes",
    statuses: ["CONVERTED", "DECLINED"],
    description: "Closed outcomes including won (converted) and declined work.",
    testId: "sales-ops-bucket-closed",
  },
];

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  CONVERTED: "Converted",
  DECLINED: "Declined",
};

export default function SalesOpsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const quotes = useQuery(api.billing.listQuotes, orgId ? { orgId } : "skip");
  const customers = useQuery(api.customers.listCustomers, orgId ? { orgId } : "skip");
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers ?? []) {
      map.set(String(customer._id), customer.name);
    }
    return map;
  }, [customers]);

  const technicianMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const tech of technicians ?? []) {
      map.set(String(tech._id), tech.legalName || tech.employeeNumber || "Unknown Owner");
    }
    return map;
  }, [technicians]);

  const buckets = useMemo(() => {
    const allQuotes = quotes ?? [];
    return PIPELINE_BUCKETS.map((bucket) => ({
      ...bucket,
      items: allQuotes.filter((quote) => bucket.statuses.includes(quote.status as QuoteStatus)),
    }));
  }, [quotes]);

  const isLoading = !isLoaded || quotes === undefined || customers === undefined || technicians === undefined;

  return (
    <div className="space-y-6" data-testid="sales-ops-page">
      <div>
        <h1 className="text-2xl font-semibold">Sales Ops</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quote pipeline status by ownership and stage metadata.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {PIPELINE_BUCKETS.map((bucket) => {
          const stats = buckets.find((entry) => entry.key === bucket.key);
          const count = stats?.items.length ?? 0;
          return (
            <Card key={bucket.key} className="border-border/60" data-testid={`${bucket.testId}-summary`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{bucket.title}</CardTitle>
                <CardDescription>{bucket.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid={`${bucket.testId}-count`}>{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {buckets.map((bucket) => (
          <Card key={bucket.key} className="border-border/60" data-testid={bucket.testId}>
            <CardHeader>
              <CardTitle className="text-base">{bucket.title}</CardTitle>
              <CardDescription>{bucket.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`${bucket.key}-sk-${index}`} className="h-20 w-full" />
                ))
              ) : bucket.items.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid={`${bucket.testId}-empty`}>
                  No quotes in this stage.
                </p>
              ) : (
                bucket.items.slice(0, 8).map((quote) => (
                  <Link
                    key={String(quote._id)}
                    to={`/sales/quotes/${quote._id}`}
                    className="block rounded-md border border-border/60 p-3 transition-colors hover:border-primary/40"
                    data-testid={`${bucket.testId}-item-${quote._id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{quote.quoteNumber}</span>
                      <Badge variant="outline">{STATUS_LABELS[quote.status as QuoteStatus]}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium truncate">
                      {customerMap.get(String(quote.customerId)) ?? "Unknown customer"}
                    </p>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      <p>
                        Owner: {technicianMap.get(String(quote.createdByTechId)) ?? "Unknown owner"}
                      </p>
                      <p>
                        Created: {formatDate(quote.createdAt)}
                        {quote.sentAt ? ` · Sent: ${formatDate(quote.sentAt)}` : ""}
                        {quote.respondedAt ? ` · Responded: ${formatDate(quote.respondedAt)}` : ""}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
