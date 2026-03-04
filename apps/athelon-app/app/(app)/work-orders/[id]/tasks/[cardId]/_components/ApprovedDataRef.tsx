"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMMON_REFS = ["AMM", "SB", "AD", "EO"] as const;

type StoredRef = {
  prefix: string;
  value: string;
};

export function ApprovedDataRef({
  workOrderId,
  cardId,
  stepId,
}: {
  workOrderId: string;
  cardId: string;
  stepId: string;
}) {
  const storageKey = useMemo(
    () => `approved-data-ref:${workOrderId}:${cardId}:${stepId}`,
    [workOrderId, cardId, stepId],
  );

  const [prefix, setPrefix] = useState<string>("AMM");
  const [value, setValue] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredRef;
      setPrefix(parsed.prefix || "AMM");
      setValue(parsed.value || "");
    } catch {
      setPrefix("AMM");
      setValue("");
    }
  }, [storageKey]);

  useEffect(() => {
    const payload: StoredRef = { prefix, value };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore quota/private-mode write failures; keep UI responsive.
    }
  }, [prefix, value, storageKey]);

  return (
    <div className="mt-2 ml-8 rounded-md border border-border/50 bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground mb-1">Approved Data Ref</p>
      <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2">
        <Select value={prefix} onValueChange={setPrefix}>
          <SelectTrigger size="sm" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_REFS.map((ref) => (
              <SelectItem key={ref} value={ref} className="text-xs">
                {ref}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 120))}
          className="h-8 text-xs"
          maxLength={120}
          placeholder="e.g. 05-20-00 / Rev 12"
        />
      </div>
    </div>
  );
}
