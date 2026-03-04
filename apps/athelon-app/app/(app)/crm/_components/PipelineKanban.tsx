import { useMemo, useState, type PointerEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  OpportunityCard,
  type PipelineOpportunity,
  type PipelineStatus,
} from "./OpportunityCard";

const COLUMNS: Array<{ key: PipelineStatus; label: string; color: string }> = [
  { key: "new", label: "New", color: "border-t-blue-500" },
  { key: "contacted", label: "Contacted", color: "border-t-amber-500" },
  { key: "quote_sent", label: "Quote Sent", color: "border-t-purple-500" },
  { key: "won", label: "Won", color: "border-t-emerald-500" },
  { key: "lost", label: "Lost", color: "border-t-red-500" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PipelineKanban({
  opportunities,
}: {
  opportunities: PipelineOpportunity[];
}) {
  const [items, setItems] = useState(opportunities);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStatus | null>(null);

  const grouped = useMemo(() => {
    const map: Record<PipelineStatus, PipelineOpportunity[]> = {
      new: [],
      contacted: [],
      quote_sent: [],
      won: [],
      lost: [],
    };
    for (const item of items) {
      map[item.status].push(item);
    }
    return map;
  }, [items]);

  const pointerDrop = (targetStatus: PipelineStatus) => {
    if (!draggingId) return;
    setItems((prev) =>
      prev.map((opp) =>
        opp.id === draggingId ? { ...opp, status: targetStatus } : opp,
      ),
    );
    setDraggingId(null);
    setDragOver(null);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (e.pointerType !== "mouse") {
      setDraggingId(id);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((column) => {
        const columnItems = grouped[column.key];
        const totalValue = columnItems.reduce((sum, item) => sum + item.estimatedValue, 0);

        return (
          <Card
            key={column.key}
            className={cn(
              "w-[300px] flex-shrink-0 border-t-4",
              column.color,
              dragOver === column.key && "ring-2 ring-primary/40",
            )}
            onPointerUp={() => pointerDrop(column.key)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(column.key);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              setDraggingId(id);
              pointerDrop(column.key);
            }}
          >
            <CardHeader className="px-3 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{column.label}</CardTitle>
                <Badge variant="secondary">{columnItems.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatMoney(totalValue)}</p>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2 max-h-[540px] overflow-y-auto">
              {columnItems.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">No opportunities</div>
              ) : (
                columnItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onPointerDown={(event) => onPointerDown(event, item.id)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", item.id);
                      setDraggingId(item.id);
                    }}
                  >
                    <OpportunityCard opportunity={item} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
