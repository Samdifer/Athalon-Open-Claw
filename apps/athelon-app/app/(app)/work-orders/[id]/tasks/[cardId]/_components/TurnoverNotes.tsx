import { useEffect, useMemo, useState } from "react";
import { Sparkles, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type TurnoverEntry = {
  id: string;
  note: string;
  createdAt: number;
};

type Props = {
  workOrderId: string;
  taskCardId: string;
  readOnly?: boolean;
};

function storageKey(workOrderId: string, taskCardId: string) {
  return `athelon:turnover-notes:${workOrderId}:${taskCardId}`;
}

const SUGGESTIONS = [
  "Shift turnover: Last completed step [#]. Open discrepancies: [none/list]. Parts status: [installed/awaiting]. Next shift priority: [next action]. Safety/quality notes: [critical checks].",
  "Turnover summary: Work accomplished [brief]. Current aircraft/configuration status [state]. Blocking items [vendor/parts/tools]. Required sign-offs remaining [A&P/IA/QA].",
  "Handoff template: 1) Progress: [x/y steps]. 2) Findings: [reference]. 3) Parts/documents: [status]. 4) Risks: [watch items]. 5) Immediate next task: [owner/action].",
];

export function TurnoverNotes({ workOrderId, taskCardId, readOnly = false }: Props) {
  const [entries, setEntries] = useState<TurnoverEntry[]>([]);
  const [draft, setDraft] = useState("");
  const key = useMemo(() => storageKey(workOrderId, taskCardId), [workOrderId, taskCardId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setEntries([]);
        return;
      }
      const parsed = JSON.parse(raw) as TurnoverEntry[];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }, [key]);

  function persist(next: TurnoverEntry[]) {
    setEntries(next);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function handleAdd() {
    const note = draft.trim();
    if (!note) return;

    const next: TurnoverEntry[] = [
      { id: crypto.randomUUID(), note, createdAt: Date.now() },
      ...entries,
    ];
    persist(next);
    setDraft("");
    toast.success("Turnover note added");
  }

  function handleDelete(id: string) {
    const next = entries.filter((entry) => entry.id !== id);
    persist(next);
    toast.success("Turnover note removed");
  }

  function handleAiSuggest() {
    const next = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${next}` : next));
    toast.success("AI suggestion inserted");
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          Turnover Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No turnover notes for this task card yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("en-US", { timeZone: "UTC" })}
                  </p>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{entry.note}</p>
              </div>
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="space-y-2 border-t border-border/50 pt-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
              placeholder="Capture shift turnover context for the next technician..."
              className="text-xs bg-muted/30 border-border/60 resize-none"
              rows={3}
              maxLength={1000}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">{draft.length}/1000</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAiSuggest}>
                  <Sparkles className="w-3 h-3" />
                  AI Suggest
                </Button>
                <Button size="sm" className="h-7 text-xs" disabled={!draft.trim()} onClick={handleAdd}>
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
