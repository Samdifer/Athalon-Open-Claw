"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatusFilter = "all" | "in-stock" | "low" | "out-of-stock" | "on-order";

type PartRow = {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  description?: string;
  supplier?: string;
  condition: string;
  location: string;
  quantity?: number;
  quantityOnHand?: number;
  minStockLevel?: number;
  reorderPoint?: number;
  receivingDate?: number;
  removedAt?: number;
  // BUG-PC-HUNT-121: Include unitCost from the parts data model so the
  // Inventory Master tab can display real cost data instead of $0.00.
  unitCost?: number;
};

function getStatus(part: PartRow): Exclude<StatusFilter, "all"> {
  const qty = part.quantityOnHand ?? part.quantity ?? 0;
  const min = part.minStockLevel ?? 0;
  const reorder = part.reorderPoint ?? 0;

  if (part.location === "pending_inspection") return "on-order";
  if (qty <= 0 || part.location !== "inventory") return "out-of-stock";
  if ((min > 0 && qty <= min) || (reorder > 0 && qty <= reorder)) return "low";
  return "in-stock";
}

function statusBadge(status: Exclude<StatusFilter, "all">) {
  if (status === "in-stock") {
    return <Badge className="bg-green-500/15 text-green-600 border border-green-500/30">In Stock</Badge>;
  }
  if (status === "low") {
    return <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30">Low</Badge>;
  }
  if (status === "on-order") {
    return <Badge className="bg-sky-500/15 text-sky-600 border border-sky-500/30">On Order</Badge>;
  }
  return <Badge className="bg-red-500/15 text-red-600 border border-red-500/30">Out of Stock</Badge>;
}

export function InventoryMasterTab() {
  const { orgId } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationId =
    selectedLocationId === "all" ? "all" : (selectedLocationId as Id<"shopLocations">);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");

  const parts = useQuery(
    api.parts.listParts,
    orgId
      ? {
          organizationId: orgId,
          shopLocationId: selectedShopLocationId,
        }
      : "skip",
  ) as PartRow[] | undefined;

  const rows = useMemo(() => {
    const all = parts ?? [];
    return all
      .map((part) => {
        const qty = part.quantityOnHand ?? part.quantity ?? 0;
        // BUG-PC-HUNT-121: Use actual unitCost from the part record instead of
        // hardcoded 0. Previously every row showed $0.00 for Unit Cost and
        // Total Value — a parts clerk reviewing stock value got wrong data.
        const unitCost = part.unitCost ?? 0;
        const category = part.condition || "general";
        const manufacturer = part.supplier || "Unknown";
        const status = getStatus(part);
        return {
          ...part,
          category,
          manufacturer,
          qty,
          unitCost,
          totalValue: qty * unitCost,
          lastReceivedDate: part.receivingDate ?? null,
          lastIssuedDate: part.removedAt ?? null,
          status,
        };
      })
      .filter((part) => {
        const q = search.trim().toLowerCase();
        if (
          q &&
          !(
            part.partNumber.toLowerCase().includes(q) ||
            part.partName.toLowerCase().includes(q) ||
            (part.description ?? "").toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        if (categoryFilter !== "all" && part.category !== categoryFilter) return false;
        if (statusFilter !== "all" && part.status !== statusFilter) return false;
        if (manufacturerFilter !== "all" && part.manufacturer !== manufacturerFilter) return false;
        return true;
      });
  }, [parts, search, categoryFilter, statusFilter, manufacturerFilter]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((parts ?? []).map((p) => p.condition || "general")))],
    [parts],
  );
  const manufacturers = useMemo(
    () => ["all", ...Array.from(new Set((parts ?? []).map((p) => p.supplier || "Unknown")))],
    [parts],
  );

  const exportData = rows.map((row) => ({
    partNumber: row.partNumber,
    description: row.partName || row.description || "",
    manufacturer: row.manufacturer,
    category: row.category,
    totalQty: row.qty,
    minStock: row.minStockLevel ?? "",
    reorderPoint: row.reorderPoint ?? "",
    unitCost: row.unitCost,
    totalValue: row.totalValue,
    lastReceivedDate: row.lastReceivedDate ? new Date(row.lastReceivedDate).toISOString() : "",
    lastIssuedDate: row.lastIssuedDate ? new Date(row.lastIssuedDate).toISOString() : "",
    status: row.status,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-end">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 flex-1">
          <div>
            <Label className="text-xs">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="P/N, description..."
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c === "all" ? "All" : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="on-order">On Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Manufacturer</Label>
            <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {manufacturers.map((m) => (
                  <SelectItem key={m} value={m}>{m === "all" ? "All" : m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ExportCSVButton
          data={exportData}
          columns={[
            { key: "partNumber", header: "P/N" },
            { key: "description", header: "Description" },
            { key: "manufacturer", header: "Manufacturer" },
            { key: "category", header: "Category" },
            { key: "totalQty", header: "Total Qty" },
            { key: "minStock", header: "Min Stock" },
            { key: "reorderPoint", header: "Reorder Point" },
            { key: "unitCost", header: "Unit Cost" },
            { key: "totalValue", header: "Total Value" },
            { key: "lastReceivedDate", header: "Last Received" },
            { key: "lastIssuedDate", header: "Last Issued" },
            { key: "status", header: "Status" },
          ]}
          fileName="inventory-master.csv"
          className="h-8 text-xs"
        />
      </div>

      <div className="rounded-lg border border-border/60 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead>P/N</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Min</TableHead>
              <TableHead>Reorder</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Last Received</TableHead>
              <TableHead>Last Issued</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                  No inventory rows match current filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="font-mono text-xs font-semibold">{row.partNumber}</TableCell>
                  <TableCell className="text-xs">{row.partName || row.description || "—"}</TableCell>
                  <TableCell className="text-xs">{row.manufacturer}</TableCell>
                  <TableCell className="text-xs capitalize">{row.category}</TableCell>
                  <TableCell className={`text-xs font-medium ${
                    row.status === "out-of-stock"
                      ? "text-red-600"
                      : row.status === "low"
                        ? "text-amber-600"
                        : "text-green-600"
                  }`}>{row.qty}</TableCell>
                  <TableCell className="text-xs">{row.minStockLevel ?? "—"}</TableCell>
                  <TableCell className="text-xs">{row.reorderPoint ?? "—"}</TableCell>
                  <TableCell className="text-xs">${row.unitCost.toFixed(2)}</TableCell>
                  <TableCell className="text-xs">${row.totalValue.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.lastReceivedDate
                      ? new Date(row.lastReceivedDate).toLocaleDateString("en-US", { timeZone: "UTC" })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.lastIssuedDate
                      ? new Date(row.lastIssuedDate).toLocaleDateString("en-US", { timeZone: "UTC" })
                      : "—"}
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
