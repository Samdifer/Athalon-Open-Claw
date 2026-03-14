"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExtractionFieldConfidenceBadge } from "./ExtractionFieldConfidenceBadge";
import {
  EXTRACTABLE_FIELDS,
  type ExtractionResult,
  type ConfidenceLevel,
} from "@/src/shared/lib/documentIntelligence";

export function ExtractionResultCard({
  result,
  children,
}: {
  result: ExtractionResult;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showRawFields, setShowRawFields] = useState(false);

  const statusIcon =
    result.status === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : result.status === "partial" ? (
      <AlertCircle className="w-4 h-4 text-amber-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );

  const extractedFieldCount = Object.keys(result.extractedData).filter(
    (k) => k !== "eightOneThirty",
  ).length;

  const eightOneThirtyFieldCount = result.extractedData.eightOneThirty
    ? Object.keys(result.extractedData.eightOneThirty as Record<string, unknown>).length
    : 0;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <FileText className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm flex-1">{result.fileName}</CardTitle>
          {statusIcon}
          <Badge variant="outline" className="text-xs">
            {result.documentTypeDetected}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {extractedFieldCount + eightOneThirtyFieldCount} fields
          </span>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {result.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {result.error}
            </div>
          )}

          {result.status !== "failed" && (
            <>
              {/* Extracted fields grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {EXTRACTABLE_FIELDS.map((field) => {
                  const value = (result.extractedData as Record<string, unknown>)[field.key];
                  if (value === undefined || value === null) return null;

                  const conf = result.fieldConfidences[field.key];
                  const confidence: ConfidenceLevel = (conf?.confidence as ConfidenceLevel) ?? "medium";

                  return (
                    <div key={field.key} className="flex items-baseline gap-2 py-1">
                      <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">
                        {field.label}
                      </span>
                      <span
                        className={`text-sm font-mono flex-1 truncate ${
                          confidence === "low" ? "text-amber-700 bg-amber-50 px-1 rounded" : ""
                        }`}
                      >
                        {String(value)}
                      </span>
                      <ExtractionFieldConfidenceBadge confidence={confidence} />
                    </div>
                  );
                }).filter(Boolean)}
              </div>

              {/* 8130-3 fields */}
              {result.extractedData.eightOneThirty && (
                <div className="border-t pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRawFields(!showRawFields);
                    }}
                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground mb-2"
                  >
                    {showRawFields ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    8130-3 Form Data ({eightOneThirtyFieldCount} fields)
                  </button>
                  {showRawFields && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-5">
                      {Object.entries(result.extractedData.eightOneThirty as Record<string, unknown>).map(
                        ([key, value]) => (
                          <div key={key} className="flex items-baseline gap-2 py-0.5">
                            <span className="text-xs text-muted-foreground w-36 shrink-0 truncate">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span className="text-xs font-mono flex-1 truncate">
                              {String(value)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Review actions slot */}
              {children}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
