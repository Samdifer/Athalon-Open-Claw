"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

type ImportType = "aircraft" | "parts" | "customers";

const FIELD_MAPS: Record<ImportType, { required: string[]; optional: string[] }> = {
  aircraft: {
    required: ["tailNumber", "make", "model", "serialNumber"],
    optional: ["year", "totalTimeHours", "totalCycles"],
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

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
  );
  return { headers, rows };
}

export default function ImportPage() {
  const { orgId } = useCurrentOrg();
  const [importType, setImportType] = useState<ImportType>("aircraft");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ row: number; success: boolean; error?: string }[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importAircraft = useMutation(api.bulkImport.importAircraft);
  const importParts = useMutation(api.bulkImport.importParts);
  const importCustomers = useMutation(api.bulkImport.importCustomers);

  const fields = FIELD_MAPS[importType];
  const allFields = [...fields.required, ...fields.optional];

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
        // Auto-map by exact name match
        const mapping: Record<string, string> = {};
        for (const field of allFields) {
          const match = headers.find(
            (h) => h.toLowerCase() === field.toLowerCase(),
          );
          if (match) mapping[field] = match;
        }
        setColumnMapping(mapping);
      };
      reader.readAsText(file);
    },
    [allFields],
  );

  const validationErrors = useCallback(() => {
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < csvRows.length; i++) {
      for (const req of fields.required) {
        const col = columnMapping[req];
        if (!col) {
          errors.push({ row: i, message: `Missing mapping for required field: ${req}` });
          continue;
        }
        const idx = csvHeaders.indexOf(col);
        if (idx === -1 || !csvRows[i][idx]?.trim()) {
          errors.push({ row: i, message: `Row ${i + 1}: empty required field "${req}"` });
        }
      }
    }
    return errors;
  }, [csvRows, csvHeaders, columnMapping, fields.required]);

  const handleImport = async () => {
    if (!orgId) return;
    const errors = validationErrors();
    if (errors.length > 0) {
      toast.error(`${errors.length} validation error(s). Fix them before importing.`);
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
            obj[field] = Number(val) || undefined;
          } else {
            obj[field] = val;
          }
        }
        return obj;
      });

      setProgress(30);
      let res: { row: number; success: boolean; error?: string }[];

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
      toast.success(`Imported ${successCount} of ${res.length} rows.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!orgId) {
    return <div className="p-6 text-muted-foreground">Select an organization first.</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Import Data</h1>
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
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
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
          {/* Column mapping */}
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
                      {fields.required.includes(field) && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </span>
                    <Select
                      value={columnMapping[field] ?? ""}
                      onValueChange={(v) =>
                        setColumnMapping((prev) => ({ ...prev, [field]: v }))
                      }
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

          {/* Preview */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                3. Preview ({csvRows.length} rows)
              </CardTitle>
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
                <p className="text-xs text-muted-foreground mt-2">
                  Showing first 50 of {csvRows.length} rows
                </p>
              )}
            </CardContent>
          </Card>

          {importing && <Progress value={progress} className="h-2" />}

          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? "Importing..." : `Import ${csvRows.length} rows`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
