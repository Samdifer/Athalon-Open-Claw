"use client";

import { CheckCircle2, XCircle, Clock, AlertTriangle, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PreconditionStatus = "PASS" | "FAIL" | "PENDING";

export interface Precondition {
  id: string;
  label: string;
  description: string;
  status: PreconditionStatus;
  failureMessage?: string;
}

interface RtsChecklistProps {
  preconditions: Precondition[];
}

// ─── Precondition Badge ───────────────────────────────────────────────────────

function PreconditionBadge({ status }: { status: PreconditionStatus }) {
  if (status === "PASS") {
    return (
      <Badge
        variant="outline"
        className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] font-bold w-16 justify-center"
      >
        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
        PASS
      </Badge>
    );
  }
  if (status === "FAIL") {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] font-bold w-16 justify-center"
      >
        <XCircle className="w-2.5 h-2.5 mr-1" />
        FAIL
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold w-16 justify-center"
    >
      <Clock className="w-2.5 h-2.5 mr-1" />
      PENDING
    </Badge>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RtsChecklist({ preconditions }: RtsChecklistProps) {
  // BUG-QCM-049: Title hardcoded "All 9 Must Pass" — gave the QCM no real-time
  // progress indication. When reviewing a complex WO a QCM had to read through
  // every row to understand how many preconditions were satisfied. Now the header
  // shows a live "X / N passed" count: once all pass it shows "All N Passed" in
  // green. The count updates reactively as the QCM completes each prerequisite.
  const passCount = preconditions.filter((p) => p.status === "PASS").length;
  const total = preconditions.length;
  const allPass = passCount === total;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            RTS Preconditions
          </span>
          <span className={`font-mono font-bold ${allPass ? "text-green-400" : "text-amber-400"}`}>
            {allPass ? `All ${total} Passed ✓` : `${passCount} / ${total} passed`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {preconditions.map((pre, idx) => (
            <div key={pre.id}>
              {idx > 0 && <Separator className="opacity-20 my-1" />}
              <div
                className={`flex items-start gap-3 py-2 rounded-md px-2 ${
                  pre.status === "FAIL" ? "bg-red-500/5" : ""
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <PreconditionBadge status={pre.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <p className="text-xs font-medium text-foreground">
                      {pre.label}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {pre.description}
                  </p>
                  {pre.status === "FAIL" && pre.failureMessage && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-400">
                        {pre.failureMessage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
