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
  orgId,
  workOrderId,
  cardId,
  stepId,
  readOnly,
}: {
  orgId?: string;
  workOrderId: string;
  cardId: string;
  stepId: string;
  readOnly?: boolean;
}) {
  // BUG-LT-HUNT-141: Include orgId in localStorage key to prevent cross-org
  // data bleed. Same pattern as BUG-LT-HUNT-102 (TurnoverNotes) and
  // BUG-LT-HUNT-115 (VendorServicePanel). A user belonging to multiple Part
  // 145 shops could see approved data references from Shop A's step appearing
  // on Shop B's step if WO/card/step IDs collide. Under 14 CFR 43.9 each
  // maintenance entry must reference the correct approved data source — a
  // wrong AMM reference on a sign-off is a records violation.
  const storageKey = useMemo(
    () => `approved-data-ref:${orgId ?? "no-org"}:${workOrderId}:${cardId}:${stepId}`,
    [orgId, workOrderId, cardId, stepId],
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

  // BUG-LT-HUNT-142: Show approved data ref as read-only on completed/voided
  // cards and N/A steps. Previously the inputs were always editable — a tech
  // could modify the approved data reference AFTER the step was signed off,
  // which means the maintenance record no longer matches what was actually
  // referenced during the work. Under 14 CFR 43.9 approved data references
  // on a signed step are part of the permanent record.
  return (
    <div className="mt-2 ml-8 rounded-md border border-border/50 bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground mb-1">Approved Data Ref</p>
      {readOnly ? (
        value ? (
          <p className="text-xs font-mono text-foreground">
            {prefix} {value}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">No approved data reference recorded.</p>
        )
      ) : (
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
      )}
    </div>
  );
}
