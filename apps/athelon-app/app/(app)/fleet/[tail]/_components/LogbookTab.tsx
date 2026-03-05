import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, FilePlus2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type EntryType = "all" | "maintenance" | "inspection" | "alteration" | "repair";

type LogbookEntry = {
  _id: string;
  date?: number;
  description?: string;
  workOrderNumber?: string;
  statementType?: string;
  technicianName?: string;
  aircraftTotalTimeAtClose?: number;
};

type WorkOrderLike = {
  _id: Id<"workOrders">;
  workOrderNumber: string;
  description?: string;
  status: string;
  closedAt?: number;
  aircraftTotalTimeAtClose?: number;
};

function mapEntryType(statementType?: string): Exclude<EntryType, "all"> {
  if (!statementType) return "maintenance";
  if (statementType.includes("inspection") || statementType === "hundred_hour") return "inspection";
  if (statementType.includes("alteration")) return "alteration";
  if (statementType.includes("repair")) return "repair";
  return "maintenance";
}

export function LogbookTab({
  aircraftId,
  organizationId,
  tailNumber,
  totalTimeHours,
}: {
  aircraftId: Id<"aircraft">;
  organizationId: Id<"organizations">;
  tailNumber: string;
  totalTimeHours: number;
}) {
  const entriesRaw = useQuery(api.logbook.listLogbookEntries, { aircraftId, organizationId });
  const workOrdersRaw = useQuery(api.workOrders.listByAircraft, { aircraftId, organizationId });
  const generateLogbookEntry = useMutation(api.logbook.generateLogbookEntry);

  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [typeFilter, setTypeFilter] = useState<EntryType>("all");
  const [selectedWoId, setSelectedWoId] = useState<string>("");

  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [entryType, setEntryType] = useState<Exclude<EntryType, "all">>("maintenance");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [totalTimeUpdate, setTotalTimeUpdate] = useState(totalTimeHours.toFixed(1));
  const [technician, setTechnician] = useState("");
  const [inspector, setInspector] = useState("");
  const [saving, setSaving] = useState(false);

  const completedWorkOrders = useMemo(
    () => ((workOrdersRaw ?? []) as WorkOrderLike[]).filter((wo) => wo.status === "closed"),
    [workOrdersRaw],
  );

  const entries = (entriesRaw ?? []) as LogbookEntry[];

  const filteredEntries = useMemo(() => {
    const withType = entries.filter((entry) => (typeFilter === "all" ? true : mapEntryType(entry.statementType) === typeFilter));
    return withType.sort((a, b) => {
      const d = (a.date ?? 0) - (b.date ?? 0);
      return sortDir === "asc" ? d : -d;
    });
  }, [entries, sortDir, typeFilter]);

  const handlePrefillFromWo = (woId: string) => {
    setSelectedWoId(woId);
    const wo = completedWorkOrders.find((item) => String(item._id) === woId);
    if (!wo) return;
    if (wo.closedAt) setEntryDate(new Date(wo.closedAt).toISOString().slice(0, 10));
    setDescription(wo.description ?? "");
    setReference(wo.workOrderNumber ?? "");
    setTotalTimeUpdate((wo.aircraftTotalTimeAtClose ?? totalTimeHours).toFixed(1));
  };

  const handleSave = async () => {
    if (!selectedWoId) {
      toast.error("Select a completed work order to generate an entry.");
      return;
    }
    setSaving(true);
    const statementType =
      entryType === "inspection"
        ? "annual_inspection"
        : entryType === "repair"
          ? "major_repair"
          : "return_to_service";

    try {
      await generateLogbookEntry({
        workOrderId: selectedWoId as Id<"workOrders">,
        organizationId,
        statementType,
        additionalNotes: [
          `Manual Entry Date: ${entryDate}`,
          `Entry Type: ${entryType}`,
          `Reference: ${reference}`,
          `Technician: ${technician || "N/A"}`,
          `Inspector: ${inspector || "N/A"}`,
          `Aircraft Total Time Update: ${totalTimeUpdate}h`,
          description ? `Manual Description: ${description}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      toast.success("Logbook entry generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate logbook entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ["Date", "Type", "Reference", "Description", "Technician", "Aircraft Total Time"],
      ...filteredEntries.map((entry) => [
        entry.date ? new Date(entry.date).toISOString().slice(0, 10) : "",
        mapEntryType(entry.statementType),
        entry.workOrderNumber ?? "",
        (entry.description ?? "").replace(/\n/g, " "),
        entry.technicianName ?? "",
        entry.aircraftTotalTimeAtClose != null ? String(entry.aircraftTotalTimeAtClose) : "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    // BUG-DOM-131: CSV lacked a UTF-8 BOM (Byte Order Mark). Excel on Windows —
    // the standard tool in every Part 145 shop's front office — defaults to ANSI
    // encoding when opening .csv files without a BOM. This garbles non-ASCII
    // characters (diacritics in technician names, degree symbols in descriptions,
    // certain special characters in tail registrations). Prepending the BOM
    // (\uFEFF) tells Excel to read the file as UTF-8 without requiring the user
    // to go through the import wizard.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tailNumber}-logbook.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Generate Entry from WO</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex gap-2">
            <Select value={selectedWoId} onValueChange={handlePrefillFromWo}>
              <SelectTrigger>
                <SelectValue placeholder={
                  workOrdersRaw === undefined
                    ? "Loading work orders…"
                    : completedWorkOrders.length === 0
                      ? "No completed work orders"
                      : "Select completed work order"
                } />
              </SelectTrigger>
              <SelectContent>
                {/* BUG-DOM-HUNT-145: WO dropdown showed an empty list with no explanation
                    when (a) work orders were still loading or (b) no WOs have been closed
                    for this aircraft. The DOM opens the logbook tab intending to generate
                    an entry, clicks the dropdown, sees nothing, and thinks it's broken.
                    Show a disabled placeholder item in both cases so the user understands
                    why the list is empty. */}
                {workOrdersRaw === undefined && (
                  <SelectItem value="__loading" disabled>Loading…</SelectItem>
                )}
                {workOrdersRaw !== undefined && completedWorkOrders.length === 0 && (
                  <SelectItem value="__empty" disabled>No closed work orders found</SelectItem>
                )}
                {completedWorkOrders.map((wo) => (
                  <SelectItem key={String(wo._id)} value={String(wo._id)}>
                    {wo.workOrderNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={!selectedWoId || saving} className="gap-1.5">
              <FilePlus2 className="w-4 h-4" />
              {saving ? "Generating..." : "Generate Entry from WO"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            <Select value={entryType} onValueChange={(v) => setEntryType(v as Exclude<EntryType, "all">)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="alteration">Alteration</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
              </SelectContent>
            </Select>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (WO#)" />
            <Input value={totalTimeUpdate} onChange={(e) => setTotalTimeUpdate(e.target.value)} placeholder="Aircraft total time" />
            <Input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Technician" />
            <Input value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="Inspector" />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of work"
            rows={3}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Logbook Entries</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EntryType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="alteration">Alteration</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as "desc" | "asc") }>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* BUG-DOM-HUNT-142: When entriesRaw is undefined (still loading from
                Convex), the entries array defaults to [] and this block renders
                "No entries found" — misleading the DOM into thinking the logbook is
                empty when it's just loading. Show a proper loading skeleton first. */}
            {entriesRaw === undefined ? (
              <div className="space-y-2">
                <div className="rounded-md border border-border/60 p-3 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="rounded-md border border-border/60 p-3 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No entries found.</p>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry._id} className="rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    {/* BUG-DOM-124: Entry dates displayed in raw ISO format (2026-03-05)
                        while every other date in the app uses locale format pinned to UTC
                        (Mar 5, 2026). A DOM switching between the logbook tab and the full
                        logbook page would see inconsistent date formatting. */}
                    <p className="text-xs text-muted-foreground">{entry.date ? new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—"}</p>
                    <p className="text-xs font-mono text-muted-foreground">{entry.workOrderNumber ?? "Manual"}</p>
                  </div>
                  <p className="text-sm mt-1">{entry.description ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mapEntryType(entry.statementType)} · Tech: {entry.technicianName ?? "—"} · Total Time: {entry.aircraftTotalTimeAtClose ?? "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
