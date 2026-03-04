"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChecklistItem = {
  group: "Training Records" | "Tool Calibration" | "AD/SB Status" | "QCM Reviews" | "Documentation";
  title: string;
  compliant: boolean;
  actionHref: string;
};

export function AuditChecklistGenerator({ items }: { items: ChecklistItem[] }) {
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const exportChecklist = () => {
    const lines = [
      "ATHELON PART 145 PRE-AUDIT CHECKLIST",
      `Generated: ${new Date().toISOString()}`,
      "",
    ];

    for (const [group, groupItems] of Object.entries(grouped)) {
      lines.push(group);
      for (const item of groupItems) {
        lines.push(`- ${item.compliant ? "✅" : "❌"} ${item.title} (${item.actionHref})`);
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
                <a
                  key={`${group}-${item.title}`}
                  href={item.actionHref}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 hover:bg-muted/40"
                >
                  <span className="text-sm">{item.compliant ? "✅" : "❌"} {item.title}</span>
                  <span className="text-[11px] text-primary">Open</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
