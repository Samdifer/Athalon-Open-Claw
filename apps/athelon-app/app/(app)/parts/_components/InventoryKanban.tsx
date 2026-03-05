"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// BUG-PC-HUNT-122: Added "pending_inspection" stage. Previously parts in
// pending_inspection silently fell into "in_stock", making the Kanban view
// misleading for a parts clerk tracking the receiving → inspection → stock flow.
type KanbanStage = "pending_inspection" | "in_stock" | "reserved" | "issued" | "installed" | "scrapped";

type PartItem = {
  _id: string;
  partNumber: string;
  partName: string;
  description?: string;
  condition: string;
  location: string;
  quantity?: number;
  quantityOnHand?: number;
  supplier?: string;
  reservedForWorkOrderId?: string;
  serialNumber?: string;
};

const COLUMNS: Array<{ key: KanbanStage; label: string }> = [
  { key: "pending_inspection", label: "Pending Inspection" },
  { key: "in_stock", label: "In Stock" },
  { key: "reserved", label: "Reserved" },
  { key: "issued", label: "Issued" },
  { key: "installed", label: "Installed" },
  { key: "scrapped", label: "Scrapped" },
];

const CONDITION_STYLES: Record<string, string> = {
  new: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  serviceable: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  overhauled: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  repaired: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
  unserviceable: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  quarantine: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  scrapped: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
};

function toStage(part: PartItem): KanbanStage {
  if (
    part.location === "scrapped" ||
    part.location === "quarantine" ||
    part.location === "returned_to_vendor" ||
    part.condition === "scrapped"
  ) {
    return "scrapped";
  }
  if (part.location === "pending_inspection") return "pending_inspection";
  if (part.location === "installed") return "installed";
  if (part.location === "removed_pending_disposition") return "issued";
  if (part.reservedForWorkOrderId) return "reserved";
  return "in_stock";
}

function categoryFor(part: PartItem): string {
  return part.condition || "general";
}

export function InventoryKanban({ parts }: { parts: PartItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(parts.map((p) => categoryFor(p))))],
    [parts],
  );
  const conditions = useMemo(
    () => ["all", ...Array.from(new Set(parts.map((p) => p.condition || "unknown")))],
    [parts],
  );
  const locations = useMemo(
    () => ["all", ...Array.from(new Set(parts.map((p) => p.location || "unknown")))],
    [parts],
  );

  const filtered = useMemo(
    () =>
      parts.filter((part) => {
        if (categoryFilter !== "all" && categoryFor(part) !== categoryFilter) return false;
        if (conditionFilter !== "all" && part.condition !== conditionFilter) return false;
        if (locationFilter !== "all" && part.location !== locationFilter) return false;
        return true;
      }),
    [parts, categoryFilter, conditionFilter, locationFilter],
  );

  const grouped = useMemo(() => {
    const map: Record<KanbanStage, PartItem[]> = {
      pending_inspection: [],
      in_stock: [],
      reserved: [],
      issued: [],
      installed: [],
      scrapped: [],
    };
    for (const part of filtered) {
      map[toStage(part)].push(part);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat === "all" ? "All categories" : cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            {conditions.map((condition) => (
              <SelectItem key={condition} value={condition}>{condition === "all" ? "All conditions" : condition}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>{location === "all" ? "All locations" : location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-6 gap-3">
        {COLUMNS.map((column) => (
          <div key={column.key} className="rounded-lg border border-border/60 bg-muted/20">
            <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{column.label}</p>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{grouped[column.key].length}</Badge>
            </div>
            <div className="p-2 space-y-2 min-h-24">
              {grouped[column.key].length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-1 py-3">No parts</p>
              ) : (
                grouped[column.key].map((part) => {
                  const id = String(part._id);
                  const isOpen = expanded.has(id);
                  const qty = part.quantityOnHand ?? part.quantity ?? 1;
                  return (
                    <div key={id} className="rounded-md border border-border/60 bg-background/80 p-2">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-[11px] font-semibold truncate">{part.partNumber}</p>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                        <p className="text-[11px] text-foreground truncate">{part.partName}</p>
                        <p className="text-[11px] text-muted-foreground">Qty: {qty}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] border ${CONDITION_STYLES[part.condition] ?? "bg-muted text-muted-foreground"}`}>
                            {part.condition}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">{part.location}</Badge>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5 text-[11px]">
                          <p className="text-muted-foreground">Description: <span className="text-foreground">{part.description || "—"}</span></p>
                          <p className="text-muted-foreground">Serial: <span className="text-foreground font-mono">{part.serialNumber || "—"}</span></p>
                          <p className="text-muted-foreground">Supplier: <span className="text-foreground">{part.supplier || "—"}</span></p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
