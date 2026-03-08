"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

type ImportType = "aircraft" | "parts" | "customers";

type CsvValidationError = { row: number; message: string };

type ImportResult = { row: number; success: boolean; error?: string };

const FIELD_MAPS: Record<ImportType, { required: string[]; optional: string[] }> = {
  aircraft: {
    required: ["tailNumber", "make", "model", "serialNumber"],
    optional: ["year", "totalTimeHours", "totalCycles", "campAircraftId", "campTailNumber"],
  },
  parts: {
    required: ["partNumber", "partName"],
    optional: ["description", "serialNumber", "condition", "location"],
  },
  customers: {
    required: ["name"],
    optional: ["email", "phone", "address", "notes"],
  },
};

const TEMPLATE_ROWS: Record<ImportType, string[]> = {
  aircraft: [
    "tailNumber,make,model,serialNumber,year,totalTimeHours,totalCycles,campAircraftId,campTailNumber",
    "N123AB,Cessna,172S,172S-8390,2008,3450,5230,CAMP-AC-1001,N123AB",
  ],
  parts: [
    "partNumber,partName,description,serialNumber,condition,location",
    "CH48108-1,Spark Plug,Massive electrode plug,SN-0001,new,inventory",
  ],
  customers: [
    "name,email,phone,address,notes",
    "Acme Air Charter,ops@acme-air.example,+1-555-0100,123 Hangar Rd,Priority account",
  ],
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      cell = "";

      const hasContent = row.some((c) => c.trim().length > 0);
      if (hasContent) rows.push(row.map((c) => c.replace(/^"|"$/g, "")));
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    const hasContent = row.some((c) => c.trim().length > 0);
    if (hasContent) rows.push(row.map((c) => c.replace(/^"|"$/g, "")));
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const [headers, ...dataRows] = rows;
  return { headers, rows: dataRows };
}

function toNumberOrUndefined(value: string | undefined) {
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export default function ImportPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [importType, setImportType] = useState<ImportType>("aircraft");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importAircraft = useMutation(api.bulkImport.importAircraft);
  const importParts = useMutation(api.bulkImport.importParts);
  const importCustomers = useMutation(api.bulkImport.importCustomers);
  const applyCampMappings = useMutation(api.bulkImport.applyCampAircraftMappings);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded,
  });

  const fields = FIELD_MAPS[importType];
  const allFields = [...fields.required, ...fields.optional];

  const validationErrors = useMemo(() => {
    const errors: CsvValidationError[] = [];

    for (const req of fields.required) {
      if (!columnMapping[req]) {
        errors.push({ row: 0, message: `Missing mapping for required field: ${req}` });
      }
    }

    for (let i = 0; i < csvRows.length; i++) {
      for (const req of fields.required) {
        const col = columnMapping[req];
        const idx = col ? csvHeaders.indexOf(col) : -1;
        const value = idx >= 0 ? csvRows[i][idx]?.trim() : "";
        if (!value) {
          errors.push({ row: i + 1, message: `Required field \"${req}\" is empty.` });
        }
      }
    }

    return errors;
  }, [csvRows, csvHeaders, columnMapping, fields.required]);

  const mappedPreview = useMemo(() => {
    return csvRows.slice(0, 5).map((row) => {
      const obj: Record<string, string | number | undefined> = {};
      for (const field of allFields) {
        const col = columnMapping[field];
        const idx = col ? csvHeaders.indexOf(col) : -1;
        const raw = idx >= 0 ? row[idx]?.trim() : undefined;
        if (!raw) continue;
        if (["year", "totalTimeHours", "totalCycles"].includes(field)) {
          obj[field] = toNumberOrUndefined(raw);
        } else {
          obj[field] = raw;
        }
      }
      return obj;
    });
  }, [allFields, columnMapping, csvHeaders, csvRows]);

  const campMappingRows = useMemo(() => {
    if (importType !== "aircraft") return [] as { campAircraftId: string; campTailNumber?: string; serialNumber?: string }[];
    return csvRows.flatMap((row) => {
      const campIdHeader = columnMapping.campAircraftId;
      const campTailHeader = columnMapping.campTailNumber;
      const serialHeader = columnMapping.serialNumber;
      const campId = campIdHeader ? row[csvHeaders.indexOf(campIdHeader)]?.trim() : "";
      const campTailNumber = campTailHeader ? row[csvHeaders.indexOf(campTailHeader)]?.trim() : "";
      const serialNumber = serialHeader ? row[csvHeaders.indexOf(serialHeader)]?.trim() : "";
      if (!campId) return [];
      return [{ campAircraftId: campId, campTailNumber: campTailNumber || undefined, serialNumber: serialNumber || undefined }];
    });
  }, [importType, csvRows, csvHeaders, columnMapping]);

  const campPreview = useQuery(
    api.bulkImport.previewCampAircraftMappings,
    orgId && campMappingRows.length > 0
      ? { organizationId: orgId, rows: campMappingRows }
      : "skip",
  );

  const summary = useMemo(() => {
    if (!results) return null;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    return { total: results.length, successCount, failureCount };
  }, [results]);

  const downloadTemplate = () => {
    const blob = new Blob([`${TEMPLATE_ROWS[importType].join("\n")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${importType}-import-template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setResults(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { headers, rows } = parseCSV(text);
        setCsvHeaders(headers);
        setCsvRows(rows);
        const mapping: Record<string, string> = {};
        for (const field of allFields) {
          const match = headers.find((h) => h.toLowerCase() === field.toLowerCase());
          if (match) mapping[field] = match;
        }
        setColumnMapping(mapping);
      };
      reader.readAsText(file);
    },
    [allFields],
  );

  const handleImport = async () => {
    if (!orgId) return;
    if (validationErrors.length > 0) {
      toast.error(`${validationErrors.length} validation error(s). Fix them before importing.`);
      return;
    }

    setImporting(true);
    setProgress(10);

    try {
      const mapped = csvRows.map((row) => {
        const obj: Record<string, string | number | undefined> = {};
        for (const field of allFields) {
          const col = columnMapping[field];
          if (!col) continue;
          const idx = csvHeaders.indexOf(col);
          const val = idx >= 0 ? row[idx]?.trim() : undefined;
          if (!val) continue;
          if (["year", "totalTimeHours", "totalCycles"].includes(field)) {
            obj[field] = toNumberOrUndefined(val);
          } else {
            obj[field] = val;
          }
        }
        return obj;
      });

      setProgress(40);
      let res: ImportResult[];

      if (importType === "aircraft") {
        res = await importAircraft({
          organizationId: orgId,
          rows: mapped as Parameters<typeof importAircraft>[0]["rows"],
        });
      } else if (importType === "parts") {
        res = await importParts({
          organizationId: orgId,
          rows: mapped as Parameters<typeof importParts>[0]["rows"],
        });
      } else {
        res = await importCustomers({
          organizationId: orgId,
          rows: mapped as Parameters<typeof importCustomers>[0]["rows"],
        });
      }

      setProgress(100);
      setResults(res);

      const successCount = res.filter((r) => r.success).length;
      const failureCount = res.length - successCount;

      if (failureCount > 0) {
        toast.warning(`Imported ${successCount}/${res.length}. ${failureCount} rows failed.`);
      } else {
        toast.success(`Imported ${successCount}/${res.length} rows successfully.`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleApplyCampMappings = async () => {
    if (!orgId || !campPreview) return;
    const autoResolvable = campPreview.filter((row) => !row.ambiguous && row.selectedAircraftId);
    if (autoResolvable.length === 0) {
      toast.warning("No unambiguous CAMP mappings available. Resolve conflicts manually.");
      return;
    }

    try {
      const mappings = autoResolvable
        .filter((row): row is typeof row & { selectedAircraftId: string } => Boolean(row.selectedAircraftId))
        .map((row) => ({
          aircraftId: row.selectedAircraftId,
          campAircraftId: row.campAircraftId,
          campTailNumber: row.campTailNumber,
          linkageConfidence: row.linkageConfidence,
          confirmRelink: false,
        }));

      const result = await applyCampMappings({
        organizationId: orgId,
        mappings,
      });
      const successCount = result.filter((item) => item.success).length;
      const failCount = result.length - successCount;
      if (failCount > 0) {
        toast.warning(`Applied ${successCount}/${result.length} CAMP mappings. ${failCount} failed.`);
      } else {
        toast.success(`Applied ${successCount} CAMP mappings.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed CAMP mapping apply.");
    }
  };

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4 max-w-5xl" data-testid="page-loading-state">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Bulk import requires organization setup"
        missingInfo="Complete onboarding before importing aircraft, parts, or customers."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Bulk CSV Import</h1>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">1. Select type &amp; upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={importType}
              onValueChange={(v) => {
                setImportType(v as ImportType);
                setCsvHeaders([]);
                setCsvRows([]);
                setColumnMapping({});
                setResults(null);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aircraft">Aircraft</SelectItem>
                <SelectItem value="parts">Parts</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload CSV
            </Button>
            <Button variant="ghost" onClick={downloadTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Required fields: {fields.required.join(", ")}
            {fields.optional.length > 0 && ` · Optional: ${fields.optional.join(", ")}`}
          </p>
        </CardContent>
      </Card>

      {csvHeaders.length > 0 && (
        <>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">2. Map columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allFields.map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs w-32 truncate">
                      {field}
                      {fields.required.includes(field) && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    <Select
                      value={columnMapping[field] ?? ""}
                      onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, [field]: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">3. Validation &amp; preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Rows: {csvRows.length}</Badge>
                <Badge variant={validationErrors.length ? "destructive" : "secondary"}>
                  Validation errors: {validationErrors.length}
                </Badge>
                {summary && (
                  <>
                    <Badge variant="secondary">Imported: {summary.successCount}</Badge>
                    <Badge variant={summary.failureCount ? "destructive" : "secondary"}>
                      Failed: {summary.failureCount}
                    </Badge>
                  </>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs font-medium mb-1">Fix validation errors before import:</p>
                  <ul className="text-xs space-y-1 max-h-32 overflow-auto">
                    {validationErrors.slice(0, 12).map((error, idx) => (
                      <li key={`${error.row}-${idx}`}>
                        {error.row > 0 ? `Row ${error.row}: ` : ""}
                        {error.message}
                      </li>
                    ))}
                    {validationErrors.length > 12 && (
                      <li className="text-muted-foreground">+{validationErrors.length - 12} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-medium mb-2">Mapped object preview (first 5 rows)</p>
                <pre className="text-[10px] whitespace-pre-wrap break-all text-muted-foreground">
                  {JSON.stringify(mappedPreview, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">4. Raw CSV preview ({csvRows.length} rows)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-10">#</TableHead>
                    {csvHeaders.map((h) => (
                      <TableHead key={h} className="text-xs">
                        {h}
                      </TableHead>
                    ))}
                    {results && <TableHead className="text-xs">Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {row.map((cell, j) => (
                        <TableCell key={j} className="text-xs max-w-[150px] truncate">
                          {cell}
                        </TableCell>
                      ))}
                      {results && (
                        <TableCell>
                          {results[i]?.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              {results[i]?.error ?? "Error"}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {csvRows.length > 50 && (
                <p className="text-xs text-muted-foreground mt-2">Showing first 50 of {csvRows.length} rows</p>
              )}
            </CardContent>
          </Card>

          {importType === "aircraft" && campPreview && campPreview.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">5. CAMP mapping helper</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">Rows with CAMP IDs: {campPreview.length}</Badge>
                  <Badge variant={campPreview.some((r) => r.ambiguous) ? "destructive" : "secondary"}>
                    Ambiguous: {campPreview.filter((r) => r.ambiguous).length}
                  </Badge>
                  <Badge variant="secondary">Auto-matchable: {campPreview.filter((r) => !r.ambiguous && r.selectedAircraftId).length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ambiguous matches are blocked from auto-linking until manually confirmed.
                </p>
                <Button variant="outline" onClick={handleApplyCampMappings}>
                  Apply unambiguous CAMP mappings
                </Button>
              </CardContent>
            </Card>
          )}

          {importing && <Progress value={progress} className="h-2" />}

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={importing || csvRows.length === 0 || validationErrors.length > 0}
              className="gap-2"
            >
              {importing ? "Importing..." : `Import ${csvRows.length} rows`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
