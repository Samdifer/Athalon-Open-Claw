"use client";

import { useEffect, useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PART_FIELDS,
  autoMapColumns,
  mapRowToPartArgs,
  validatePartRow,
  type ColumnMapping,
  type MappedPartRow,
  type RowValidationResult,
} from "@/src/shared/lib/partsImport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnMapperProps {
  headers: string[];
  rows: string[][];
  onMappingComplete: (
    mapping: ColumnMapping,
    mappedRows: MappedPartRow[],
    validationResults: RowValidationResult[],
  ) => void;
  onBack: () => void;
}

// ─── Group labels ─────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  required: "Required Fields",
  classification: "Classification",
  lifeLimits: "Life Limits",
  sourcing: "Sourcing & Receiving",
  costing: "Costing & Stock",
  lotBatch: "Lot / Batch",
  location: "Warehouse Location",
  notes: "Notes",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ColumnMapper({ headers, rows, onMappingComplete, onBack }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});

  // Auto-map on mount
  useEffect(() => {
    setMapping(autoMapColumns(headers));
  }, [headers]);

  // Group fields by group property
  const groupedFields = PART_FIELDS.reduce<
    Record<string, typeof PART_FIELDS[number][]>
  >((acc, field) => {
    const g = field.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(field);
    return acc;
  }, {});

  const groups = Object.keys(GROUP_LABELS).filter((g) => groupedFields[g]?.length > 0);

  // Check required fields are mapped
  const missingRequired = PART_FIELDS.filter(
    (f) => f.required && !Object.values(mapping).includes(f.key),
  );
  const canContinue = missingRequired.length === 0;

  function handleContinue() {
    if (!canContinue) return;

    const mappedRows = rows.map((cells) =>
      mapRowToPartArgs(cells, headers, mapping),
    );
    const validationResults = mappedRows.map((row, idx) =>
      validatePartRow(row, idx),
    );

    onMappingComplete(mapping, mappedRows, validationResults);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Map your spreadsheet columns to Athelon part fields. Required fields are marked with{" "}
          <span className="text-destructive">*</span>. Important optional fields are highlighted in{" "}
          <span className="text-amber-600 dark:text-amber-400">amber</span>.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive">
                {missingRequired.length} required field{missingRequired.length !== 1 ? "s" : ""} not mapped:
              </p>
              <p className="text-xs text-destructive/80 mt-0.5">
                {missingRequired.map((f) => f.label).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <Card key={group} className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {GROUP_LABELS[group] ?? group}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(groupedFields[group] ?? []).map((field) => {
                const isRequired = field.required;
                const isImportant = "important" in field && field.important;
                const currentMapping = Object.entries(mapping).find(([, v]) => v === field.key);
                const selectedHeader = currentMapping?.[0] ?? "";

                return (
                  <div key={field.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span
                        className={`text-xs truncate ${
                          isRequired
                            ? "font-medium text-foreground"
                            : isImportant
                            ? "font-medium text-amber-700 dark:text-amber-300"
                            : "text-muted-foreground"
                        }`}
                      >
                        {field.label}
                        {isRequired && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                        {isImportant && !isRequired && (
                          <span className="text-amber-500 ml-0.5">◆</span>
                        )}
                      </span>
                    </div>

                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <Select
                        value={selectedHeader}
                        onValueChange={(val) => {
                          setMapping((prev) => {
                            // Remove any existing mapping that maps to this field key
                            const updated: ColumnMapping = {};
                            for (const [h, k] of Object.entries(prev)) {
                              if (k !== field.key) {
                                updated[h] = k;
                              }
                            }
                            if (val && val !== "__none__") {
                              updated[val] = field.key;
                            }
                            return updated;
                          });
                        }}
                      >
                        <SelectTrigger
                          className={`h-8 text-xs ${
                            isRequired && !selectedHeader
                              ? "border-destructive/60 bg-destructive/5"
                              : "bg-muted/30 border-border/60"
                          }`}
                        >
                          <SelectValue placeholder="Not mapped" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground italic">Not mapped</span>
                          </SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="text-destructive font-bold">*</span> Required
        </span>
        <span className="flex items-center gap-1">
          <span className="text-amber-500">◆</span> Recommended
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {rows.length} rows to process
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button size="sm" onClick={handleContinue} disabled={!canContinue}>
          Continue — Validate
        </Button>
      </div>
    </div>
  );
}
