"use client";

import { Badge } from "@/components/ui/badge";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PartsRequestRecord, PartsRequestStatus } from "./PartsRequestForm";
import { useMemo, useState } from "react";

interface PartsRequestQueueProps {
  requests: PartsRequestRecord[];
  onRequestsChange: (next: PartsRequestRecord[]) => void;
}

function urgencyClass(urgency: PartsRequestRecord["urgency"]) {
  if (urgency === "aog") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
  if (urgency === "urgent") return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border/40";
}

const pendingStatuses: PartsRequestStatus[] = ["requested", "ordered", "shipped"];

export function PartsRequestQueue({ requests, onRequestsChange }: PartsRequestQueueProps) {
  // BUG-PC-HUNT-123: Added "shipped" tab. Previously shipped requests were
  // only visible under "All" or "Pending" — a parts clerk tracking inbound
  // shipments couldn't quickly filter to just the shipped items to know
  // what's en route.
  const [tab, setTab] = useState<"all" | "pending" | "ordered" | "shipped" | "received">("all");

  const filtered = useMemo(() => {
    if (tab === "all") return requests;
    if (tab === "pending") return requests.filter((r) => pendingStatuses.includes(r.status));
    if (tab === "ordered") return requests.filter((r) => r.status === "ordered");
    if (tab === "shipped") return requests.filter((r) => r.status === "shipped");
    return requests.filter((r) => r.status === "received");
  }, [requests, tab]);

  function setStatus(id: string, status: PartsRequestStatus) {
    onRequestsChange(
      requests.map((r) => (r.id === id ? { ...r, status, updatedAt: Date.now() } : r)),
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Parts Request Queue</CardTitle>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="all" className="h-7 text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="h-7 text-xs">Pending</TabsTrigger>
              <TabsTrigger value="ordered" className="h-7 text-xs">Ordered</TabsTrigger>
              <TabsTrigger value="shipped" className="h-7 text-xs">Shipped</TabsTrigger>
              <TabsTrigger value="received" className="h-7 text-xs">Received</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No requests in this queue.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="rounded-md border border-border/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-semibold">{r.partNumber}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] ${urgencyClass(r.urgency)}`}>{r.urgency.toUpperCase()}</Badge>
                  <PartStatusBadge status={r.status} />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                <span>Qty: {r.quantity}</span>
                <span>Req: {r.requestingTechnician}</span>
                <span>WO: {r.workOrderRef || "—"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.status === "requested" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(r.id, "ordered")}>
                    Mark Ordered
                  </Button>
                )}
                {r.status === "ordered" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(r.id, "shipped")}>
                    Mark Shipped
                  </Button>
                )}
                {(r.status === "ordered" || r.status === "shipped") && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(r.id, "received")}>
                    Mark Received
                  </Button>
                )}
                {r.status === "received" && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => setStatus(r.id, "issued")}>
                    Issue to Tech
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
