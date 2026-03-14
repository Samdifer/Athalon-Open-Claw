"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseCSV,
  parseXlsx,
  generateDownloadTemplate,
} from "@/src/shared/lib/partsImport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface UploadDropZoneProps {
  onParsed: (data: ParsedData, fileName: string, batchLabel: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UploadDropZone({ onParsed }: UploadDropZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  function handleDownloadTemplate() {
    const blob = generateDownloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts-import-template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const processFile = useCallback(async (file: File) => {
    setParseError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      let result: ParsedData;

      if (ext === "csv") {
        const text = await file.text();
        result = parseCSV(text);
      } else if (ext === "xlsx" || ext === "xls" || ext === "ods") {
        const buffer = await file.arrayBuffer();
        result = parseXlsx(buffer);
      } else {
        setParseError("Unsupported file type. Please upload a .csv or .xlsx file.");
        return;
      }

      if (result.headers.length === 0) {
        setParseError("The file appears to be empty or could not be parsed.");
        return;
      }

      setParsed(result);
      setFileName(file.name);
      // Auto-populate batch label from file name (without extension)
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setBatchLabel((prev) => prev || baseName);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to parse file.");
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleContinue() {
    if (!parsed || parsed.rows.length === 0) return;
    onParsed(parsed, fileName, batchLabel.trim() || fileName);
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-4 min-h-[300px]
          rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${isDragOver
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.ods"
          className="hidden"
          onChange={handleFileChange}
        />

        {parsed ? (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <div>
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {parsed.rows.length} data rows · {parsed.headers.length} columns detected
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setParsed(null);
                setFileName("");
                setParseError(null);
              }}
            >
              Choose a different file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drop your file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts .csv and .xlsx files
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">CSV or Excel spreadsheet</span>
            </div>
          </div>
        )}
      </div>

      {parseError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3">
            <p className="text-xs text-destructive">{parseError}</p>
          </CardContent>
        </Card>
      )}

      {/* Batch label */}
      <div className="space-y-1.5">
        <Label htmlFor="batchLabel" className="text-xs font-medium">
          Batch Label{" "}
          <span className="text-muted-foreground font-normal">(optional — helps identify this upload later)</span>
        </Label>
        <Input
          id="batchLabel"
          value={batchLabel}
          onChange={(e) => setBatchLabel(e.target.value)}
          placeholder="e.g. Q2 Stock Replenishment"
          className="text-sm h-9 bg-muted/30 max-w-md"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleContinue}
          disabled={!parsed || parsed.rows.length === 0}
          size="sm"
        >
          Continue — Map Columns
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={(e) => {
            e.preventDefault();
            handleDownloadTemplate();
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Download Template
        </Button>
      </div>

      {parsed && parsed.rows.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          The file was parsed but contains no data rows (only a header row).
        </p>
      )}
    </div>
  );
}
