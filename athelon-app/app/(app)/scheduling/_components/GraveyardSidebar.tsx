"use client";

import { X, ArchiveRestore, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      aria-label="Archived Assignments"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Archived Assignments</span>
          <Badge variant="secondary" className="text-[11px] h-5 min-w-[20px] px-1.5">
            {sorted.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close graveyard">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  );
}

