"use client";

/**
 * Part Detail Page — deep-linkable route for viewing a single part.
 *
 * BUG-PC-T2-06: Previously no `/parts/:id` route existed so users could not
 * deep-link or bookmark a specific part. This page fetches the part by ID and
 * displays full detail including identity, traceability, history timeline,
 * conformity documents, and photos.
 */

import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import { PartHistoryTimeline } from "../_components/PartHistoryTimeline";
import { ConformityDocumentPanel } from "../_components/ConformityDocumentPanel";
import { DocumentAttachmentPanel } from "@/app/(app)/work-orders/[id]/_components/DocumentAttachmentPanel";
import { PartTagBadges } from "../_components/PartTagBadges";
import { PartLocationCell } from "../_components/PartLocationCell";

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  serviceable: "Serviceable",
  overhauled: "OH",
  repaired: "Repaired",
  unserviceable: "Unserviceable",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
};

function getConditionStyles(condition: string): string {
  const map: Record<string, string> = {
    new: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    serviceable: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    overhauled: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    repaired: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    unserviceable: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    quarantine: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    scrapped: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };
  return map[condition] ?? "bg-muted text-muted-foreground";
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId, isLoaded } = useCurrentOrg();

  const part = useQuery(
    api.parts.getPart,
    id ? { partId: id as Id<"parts"> } : "skip",
  );

  if (!isLoaded || part === undefined) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/parts"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <Skeleton className="h-6 w-48" />
        </div>
        <Card><CardContent className="p-6"><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div></CardContent></Card>
      </div>
    );
  }

  if (part === null) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto text-center py-16">
        <Package className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">Part not found</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/parts"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Inventory</Link>
        </Button>
      </div>
    );
  }

  // Safe string accessor for unknown-typed fields from the Convex document
  const s = (key: string): string => String((part as Record<string, unknown>)[key] ?? "");
  const p = part as Record<string, unknown>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8">
          <Link to="/parts"><ArrowLeft className="w-3.5 h-3.5 mr-1" />Parts</Link>
        </Button>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-xs font-mono font-semibold">{s("partNumber")}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          {s("partNumber")}
        </h1>
        <p className="text-sm text-muted-foreground">{s("partName")}</p>
      </div>

      {/* Identity */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-[10px] border font-medium ${getConditionStyles(s("condition"))}`}>
              {CONDITION_LABEL[s("condition")] ?? s("condition")}
            </Badge>
            <PartStatusBadge status={s("location")} />
            {s("serialNumber") ? <span className="font-mono text-xs text-muted-foreground">S/N {s("serialNumber")}</span> : null}
          </div>
          <PartTagBadges partId={id!} maxVisible={10} />

          {s("description") ? <p className="text-xs text-muted-foreground">{s("description")}</p> : null}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {s("supplier") ? <div><span className="text-muted-foreground">Supplier:</span> <span className="font-medium">{s("supplier")}</span></div> : null}
            {s("purchaseOrderNumber") ? <div><span className="text-muted-foreground">PO:</span> <span className="font-mono">{s("purchaseOrderNumber")}</span></div> : null}
            {s("lotNumber") ? <div><span className="text-muted-foreground">Lot:</span> <span className="font-mono">{s("lotNumber")}</span></div> : null}
            {(p.binLocationId || p.binLocation) ? <div><span className="text-muted-foreground">Bin:</span> <PartLocationCell binLocationId={p.binLocationId ? String(p.binLocationId) : undefined} legacyBinLocation={p.binLocation ? String(p.binLocation) : undefined} /></div> : null}
            {p.unitCost != null ? <div><span className="text-muted-foreground">Cost:</span> <span className="font-medium text-emerald-600">${Number(p.unitCost).toFixed(2)}</span></div> : null}
            {p.receivingDate ? (
              <div><span className="text-muted-foreground">Received:</span> {new Date(Number(p.receivingDate)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardContent className="p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transaction History</p>
          <PartHistoryTimeline partId={id as Id<"parts">} />
        </CardContent>
      </Card>

      {/* Conformity Documents */}
      {orgId && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Conformity Documents</p>
            <ConformityDocumentPanel organizationId={orgId} partId={id as Id<"parts">} />
          </CardContent>
        </Card>
      )}

      {/* Photos & Documents */}
      {orgId && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Photos &amp; Documents</p>
            <DocumentAttachmentPanel
              organizationId={orgId}
              attachedToTable="parts"
              attachedToId={id!}
              allowedTypes={["photo", "parts_8130", "vendor_invoice", "other"]}
              canDelete
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
