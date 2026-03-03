"use client";

import { useState } from "react";
import { X, ArchiveRestore, CalendarDays, FileText, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type ArchivedPlannerProject = {
  assignmentId: string;
  workOrderId: string;
  workOrderNumber: string;
  description: string;
  priority: "routine" | "urgent" | "aog";
  archivedAt?: number;
  quoteNumber?: string | null;
  quoteStatus?: string | null;
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
};

interface GraveyardSidebarProps {
  isOpen: boolean;
  projects: ArchivedPlannerProject[];
  onClose: () => void;
  onRestore: (assignmentId: string) => Promise<void>;
}

const PRIORITY_LABEL: Record<ArchivedPlannerProject["priority"], string> = {
  aog: "AOG",
  urgent: "URGENT",
  routine: "ROUTINE",
};

const PRIORITY_CLASS: Record<ArchivedPlannerProject["priority"], string> = {
  aog: "bg-red-600 text-white border-red-500",
  urgent: "bg-orange-500 text-white border-orange-400",
  routine: "bg-muted text-foreground border-border/60",
};

export function GraveyardSidebar({
  isOpen,
  projects,
  onClose,
  onRestore,
}: GraveyardSidebarProps) {
  if (!isOpen) return null;

  const sorted = [...projects].sort(
    (a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0),
  );

  return (
    <div
      className="fixed top-12 right-0 bottom-0 w-full sm:w-[320px] z-50 flex flex-col bg-background border-l border-border/50 shadow-2xl"
      role="dialog"
      aria-label="Graveyard"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <span className="text-sm font-semibold text-foreground">Graveyard</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close graveyard">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="archived" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 h-8 bg-muted/40">
          <TabsTrigger value="archived" className="text-xs h-7 flex-1">
            Archived WOs
            <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 min-w-[16px] px-1">
              {sorted.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="lost-quotes" className="text-xs h-7 flex-1">
            Lost Quotes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="archived" className="flex-1 overflow-y-auto mt-0 mx-0">
          {sorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
              <ArchiveRestore className="h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">No archived assignments</p>
              <p className="text-xs text-muted-foreground">
                Archive scheduled bars from the board to manage them here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {sorted.map((project) => (
                <li
                  key={project.assignmentId}
                  className="px-3 py-3 space-y-2"
                  data-testid={`graveyard-item-${project.assignmentId}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {project.aircraft?.currentRegistration && (
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {project.aircraft.currentRegistration}
                        </p>
                      )}
                      <p className="text-xs font-semibold font-mono text-foreground truncate">
                        {project.workOrderNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {project.description}
                      </p>
                      {project.quoteNumber && (
                        <p className="text-[10px] text-muted-foreground/90 font-mono truncate">
                          {project.quoteNumber}
                          {project.quoteStatus ? ` • ${project.quoteStatus}` : ""}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_CLASS[project.priority]}`}>
                      {PRIORITY_LABEL[project.priority]}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {project.archivedAt
                        ? new Date(project.archivedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Unknown"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={async () => {
                          await onRestore(project.assignmentId);
                        }}
                      >
                        Restore
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                        <Link to={`/work-orders/${project.workOrderId}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="lost-quotes" className="flex-1 overflow-y-auto mt-0 mx-0">
          <LostQuotesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Lost Quotes Tab ──────────────────────────────────────────────────────────

function LostQuotesTab() {
  const { orgId, techId } = useCurrentOrg();
  const navigate = useNavigate();
  const declinedQuotes = useQuery(
    api.billing.listQuotes,
    orgId ? { orgId, status: "DECLINED" as const } : "skip",
  );
  const cloneQuote = useMutation(api.billing.cloneDeclinedQuote);
  const [cloningId, setCloningId] = useState<string | null>(null);

  if (declinedQuotes === undefined) {
    return (
      <div className="px-3 py-4 space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (declinedQuotes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
        <FileText className="h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">No lost quotes</p>
        <p className="text-xs text-muted-foreground">
          Declined quotes will appear here for easy retry.
        </p>
      </div>
    );
  }

  const handleRetry = async (quoteId: string) => {
    if (!techId) {
      toast.error("Technician context not available.");
      return;
    }
    setCloningId(quoteId);
    try {
      const newQuoteId = await cloneQuote({
        quoteId: quoteId as Id<"quotes">,
        createdByTechId: techId as Id<"technicians">,
      });
      toast.success("Quote cloned as new draft");
      navigate(`/billing/quotes/${newQuoteId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone quote");
    } finally {
      setCloningId(null);
    }
  };

  return (
    <ul className="divide-y divide-border/40">
      {declinedQuotes.map((q) => (
        <li key={q._id} className="px-3 py-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold font-mono text-foreground truncate">
                {q.quoteNumber}
              </p>
              <p className="text-[11px] text-muted-foreground">
                ${(q.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              {q.updatedAt && (
                <p className="text-[10px] text-muted-foreground/80">
                  Declined {new Date(q.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
              DECLINED
            </Badge>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1"
              onClick={() => handleRetry(q._id)}
              disabled={cloningId === q._id}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {cloningId === q._id ? "Cloning..." : "Retry"}
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
              <Link to={`/billing/quotes/${q._id}`}>View</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
