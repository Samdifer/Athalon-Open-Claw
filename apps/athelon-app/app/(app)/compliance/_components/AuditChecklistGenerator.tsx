"use client";

import { Link } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChecklistItem = {
  group: "Training Records" | "Tool Calibration" | "AD/SB Status" | "QCM Reviews" | "Documentation";
  title: string;
  compliant: boolean;
  actionHref: string;
};

// BUG-QCM-HUNT-163: Export was missing the overall readiness score. A QCM
// downloading the checklist for an upcoming FAA audit had a PASS/FAIL list
// with no summary score — they'd have to manually count. Now includes the
// weighted readiness score at the top of the export for quick reference.
export function AuditChecklistGenerator({ items, overallScore }: { items: ChecklistItem[]; overallScore?: number }) {
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const exportChecklist = () => {
    const passCount = items.filter((i) => i.compliant).length;
    const lines = [
      "ATHELON PART 145 PRE-AUDIT CHECKLIST",
      `Generated: ${new Date().toISOString()}`,
      ...(overallScore != null ? [`Overall Readiness Score: ${overallScore}%`] : []),
      `Summary: ${passCount}/${items.length} checks passing`,
      "",
    ];

    for (const [group, groupItems] of Object.entries(grouped)) {
      lines.push(group);
      for (const item of groupItems) {
        lines.push(`- [${item.compliant ? "PASS" : "FAIL"}] ${item.title} (${item.actionHref})`);
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-checklist-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Pre-Audit Checklist</CardTitle>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportChecklist}>
          Export Checklist
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([group, groupItems]) => (
          <div key={group}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</h3>
            <div className="space-y-1.5">
              {groupItems.map((item) => (
                <Link
                  key={`${group}-${item.title}`}
                  to={item.actionHref}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 hover:bg-muted/40"
                >
                  {/* BUG-QCM-HUNT-131: Previously used emoji (✅/❌) which renders
                      inconsistently across platforms (Windows vs macOS vs mobile) and
                      was already fixed in RTSEvidenceSummary (BUG-QCM-HUNT-121). The
                      pre-audit checklist is the last compliance component still using
                      emoji — every other status indicator uses Lucide icons. Matching
                      the icon-only pattern for visual consistency. */}
                  <span className="text-sm flex items-center gap-1.5">
                    {item.compliant ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    {item.title}
                  </span>
                  <span className="text-[11px] text-primary">Open</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
