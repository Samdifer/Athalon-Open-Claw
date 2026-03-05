"use client";

import { Link } from "react-router-dom";
import { CheckCircle2, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReadinessCheck = {
  label: string;
  passed: boolean;
};

// BUG-QCM-HUNT-125: Added `hideRtsLink` prop. This component is rendered on
// the RTS page itself (/work-orders/:id/rts) where the "Generate RTS Document"
// button at the bottom links to... the same page. The QCM inspector sees a
// link to navigate to the page they're already on — confusing and wastes
// vertical space. When rendered from within the RTS page, pass hideRtsLink
// to suppress the redundant navigation button.
export function RTSEvidenceSummary({
  workOrderId,
  taskCardsComplete,
  discrepanciesResolved,
  requiredInspectionsDone,
  partsTraceabilityComplete,
  requiredDocsUploaded,
  customerAuthorizationOnFile,
  hideRtsLink = false,
}: {
  workOrderId: string;
  taskCardsComplete: boolean;
  discrepanciesResolved: boolean;
  requiredInspectionsDone: boolean;
  partsTraceabilityComplete: boolean;
  requiredDocsUploaded: boolean;
  customerAuthorizationOnFile: boolean;
  hideRtsLink?: boolean;
}) {
  const checks: ReadinessCheck[] = [
    { label: "All task cards complete", passed: taskCardsComplete },
    { label: "All discrepancies resolved", passed: discrepanciesResolved },
    { label: "All required inspections done", passed: requiredInspectionsDone },
    { label: "Parts traceability complete", passed: partsTraceabilityComplete },
    { label: "Required documents uploaded", passed: requiredDocsUploaded },
    { label: "Customer authorization on file", passed: customerAuthorizationOnFile },
  ];

  const blockers = checks.filter((item) => !item.passed).map((item) => item.label);
  const ready = blockers.length === 0;

  return (
    <Card className={`border ${ready ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-sm font-semibold">RTS Evidence Summary</CardTitle>
          <div className="flex items-center gap-2">
            {/* BUG-QCM-HUNT-139: Previously showed only a "Ready"/"Not Ready"
                badge with no indication of progress. A QCM with 4/6 checks
                passing had to count the individual icons to understand how
                close the WO was to release readiness. Added a pass count so
                the QCM can instantly gauge progress without scanning each row. */}
            <span className="text-[11px] text-muted-foreground font-mono">
              {checks.filter((c) => c.passed).length}/{checks.length}
            </span>
            <Badge variant="outline" className={ready ? "text-green-500 border-green-500/40" : "text-amber-500 border-amber-500/40"}>
              {ready ? "Ready for RTS" : "Not Ready"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          {checks.map((check) => (
            <div key={check.label} className="rounded-md border border-border/60 p-2 text-xs flex items-center justify-between gap-2">
              <span>{check.label}</span>
              {/* BUG-QCM-HUNT-121: Previously rendered BOTH a Lucide icon AND a
                  Unicode emoji (✅/❌) for each check — double visual indicator
                  for the same state. The emoji renders inconsistently across
                  platforms (Windows vs macOS vs mobile) and clutters the row.
                  Keeping the icon-only pattern consistent with every other
                  status indicator in the compliance section. */}
              {check.passed ? (
                <span className="inline-flex items-center gap-1 text-green-500"><CheckCircle2 className="w-3.5 h-3.5" /></span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-500"><CircleOff className="w-3.5 h-3.5" /></span>
              )}
            </div>
          ))}
        </div>

        {!ready && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs font-medium text-red-500 mb-1">Blocking items</p>
            <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        {!hideRtsLink && (
          <div className="flex justify-end">
            <Button asChild size="sm" className="h-8 text-xs">
              <Link to={`/work-orders/${workOrderId}/rts`}>Generate RTS Document</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
