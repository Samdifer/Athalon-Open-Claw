"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Sparkles, ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InspectionSuggestion = {
  id: string;
  taskName: string;
  ataChapter: string;
  approvedDataRef?: string;
  selected: boolean;
  overrideReason?: string;
};

type Props = {
  aircraftType: string;
  ataChapter?: string;
  onChange?: (suggestions: InspectionSuggestion[]) => void;
};

export function AIInspectionSuggestions({ aircraftType, ataChapter, onChange }: Props) {
  const { orgId } = useCurrentOrg();
  const programs = useQuery(
    api.maintenancePrograms.listByAircraftType,
    orgId && aircraftType ? { organizationId: orgId, aircraftType } : "skip",
  );

  const baseSuggestions = useMemo(() => {
    const rows = (programs ?? []).filter((row) => {
      if (!row.isActive) return false;
      if (!ataChapter) return true;
      return row.ataChapter.trim().toLowerCase() === ataChapter.trim().toLowerCase();
    });

    return rows.map((row) => ({
      id: String(row._id),
      taskName: row.taskName,
      ataChapter: row.ataChapter,
      approvedDataRef: row.approvedDataRef,
      selected: true,
      overrideReason: "",
    }));
  }, [programs, ataChapter]);

  const [suggestions, setSuggestions] = useState<InspectionSuggestion[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setSuggestions(baseSuggestions);
  }, [baseSuggestions]);

  useEffect(() => {
    onChangeRef.current?.(suggestions);
  }, [suggestions]);

  const selectedCount = suggestions.filter((s) => s.selected).length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          AI Inspection Suggestions
          <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-400 bg-violet-500/10">
            AI Suggestion
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5" />
          <p>These suggestions are advisory. All items require technician/inspector confirmation.</p>
        </div>

        {!aircraftType ? (
          <p className="text-xs text-muted-foreground">Select an aircraft type to generate inspection suggestions.</p>
        ) : programs === undefined ? (
          <p className="text-xs text-muted-foreground">Loading suggestions from maintenance programs…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matching maintenance program tasks found for this aircraft/ATA combination.</p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">{selectedCount}/{suggestions.length} suggestions accepted</div>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-md border border-border/60 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={suggestion.selected}
                      onCheckedChange={(checked) => {
                        setSuggestions((prev) =>
                          prev.map((row) =>
                            row.id === suggestion.id
                              ? {
                                  ...row,
                                  selected: !!checked,
                                  overrideReason: checked ? "" : row.overrideReason,
                                }
                              : row,
                          ),
                        );
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{suggestion.taskName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        ATA {suggestion.ataChapter}
                        {suggestion.approvedDataRef ? ` · ${suggestion.approvedDataRef}` : ""}
                      </p>
                    </div>
                  </div>

                  {!suggestion.selected && (
                    <div className="pl-6 space-y-1">
                      <Label htmlFor={`override-${suggestion.id}`} className="text-[11px] text-muted-foreground">
                        Override reason (required when rejected)
                      </Label>
                      <Input
                        id={`override-${suggestion.id}`}
                        value={suggestion.overrideReason ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSuggestions((prev) =>
                            prev.map((row) =>
                              row.id === suggestion.id ? { ...row, overrideReason: value } : row,
                            ),
                          );
                        }}
                        placeholder="Reason for rejecting this suggestion"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
