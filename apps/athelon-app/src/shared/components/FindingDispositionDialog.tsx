"use client";

/**
 * FindingDispositionDialog — AI-015
 *
 * AI-015: Fixed MEL deferral path that was completely non-functional.
 * Previous code showed toast.error("MEL deferral requires pre-signing
 * authentication. Use the full deferral workflow.") and did nothing.
 * No "full deferral workflow" page exists. MEL deferrals are a 14 CFR
 * 91.213 / MMEL regulatory requirement — blocking them entirely is worse
 * than requiring the technician to obtain a signature auth event.
 *
 * Fix: Add signatureAuthEventId input to the MEL deferral section (same
 * pattern as CreateRecordForm.tsx). Wire to api.discrepancies.deferDiscrepancy.
 * Show link to signature page when workOrderId is available.
 *
 * Also added: optional workOrderId prop so the signature page link can be
 * constructed. Safe to omit — MEL form still works, just no direct link.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldAlert, Clock } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

type Disposition =
  | "corrected"
  | "deferred_grounded"
  | "no_fault_found"
  | "no_fault_found_could_not_reproduce"
  | "deferred_mel";

interface FindingDispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancyId: Id<"discrepancies">;
  discrepancyNumber: string;
  /** Optional — enables the "Get signature auth event" link for MEL deferral. */
  workOrderId?: Id<"workOrders">;
}

const DISPOSITION_OPTIONS: { value: Disposition; label: string }[] = [
  { value: "corrected", label: "Corrected" },
  { value: "deferred_grounded", label: "Deferred (Grounded)" },
  { value: "deferred_mel", label: "Deferred (MEL)" },
  { value: "no_fault_found", label: "No Fault Found" },
  { value: "no_fault_found_could_not_reproduce", label: "Could Not Reproduce" },
];

const MEL_CATEGORIES = ["A", "B", "C", "D"] as const;

type FindingHistoryEntry = {
  status: string;
  actor: string;
  timestamp: number;
  note?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function FindingDispositionDialog({
  open,
  onOpenChange,
  discrepancyId,
  discrepancyNumber,
  workOrderId,
}: FindingDispositionDialogProps) {
  const { orgId, techId } = useCurrentOrg();

  // Shared fields
  const [disposition, setDisposition] = useState<Disposition | "">("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [deferredReason, setDeferredReason] = useState("");
  const [noFaultNotes, setNoFaultNotes] = useState("");

  // MEL-specific fields (AI-015)
  const [melItemNumber, setMelItemNumber] = useState("");
  const [melCategory, setMelCategory] = useState<"A" | "B" | "C" | "D" | "">("");
  const [melSignatureAuthEventId, setMelSignatureAuthEventId] = useState("");
  // BUG-LT-HUNT-008: Use local calendar date for MEL deferral date default.
  // `toISOString().slice(0,10)` extracts the UTC date. A lead technician in
  // UTC-5 working after 7:00 PM local time would see tomorrow's UTC date
  // pre-filled (e.g., March 4 instead of March 3). The MEL deferral date is
  // a regulatory record under 14 CFR 91.213; an incorrect date produces an
  // invalid MEL deferral that an inspector or DAR can reject during a ramp
  // check. Same bug was fixed in CreateRecordForm.tsx (BUG-QCM-REC-001)
  // and reports/page.tsx (BUG-SM-HUNT-003) in prior cycles.
  const [melDeferralDate, setMelDeferralDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [melNotes, setMelNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const historyKey = useMemo(() => `athelon:finding-history:${discrepancyId}`, [discrepancyId]);
  const [history, setHistory] = useState<FindingHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(`athelon:finding-history:${discrepancyId}`);
      return raw ? (JSON.parse(raw) as FindingHistoryEntry[]) : [];
    } catch {
      return [];
    }
  });

  const dispositionMutation = useMutation(api.discrepancies.dispositionDiscrepancy);
  const deferMutation = useMutation(api.discrepancies.deferDiscrepancy);

  const appendHistory = (entry: FindingHistoryEntry) => {
    const next = [entry, ...history];
    setHistory(next);
    localStorage.setItem(historyKey, JSON.stringify(next));
  };

  const resetForm = () => {
    setDisposition("");
    setCorrectiveAction("");
    setDeferredReason("");
    setNoFaultNotes("");
    setMelItemNumber("");
    setMelCategory("");
    setMelSignatureAuthEventId("");
    // BUG-LT-HUNT-008: Same local-date fix as the initial useState above.
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setMelDeferralDate(`${y}-${m}-${day}`);
    setMelNotes("");
  };

  const handleSubmit = async () => {
    if (!orgId || !techId || !disposition) return;

    setSubmitting(true);
    try {
      if (disposition === "deferred_mel") {
        // ── MEL deferral — requires signature auth event (14 CFR 91.213) ──
        if (!melItemNumber || !melCategory) {
          toast.error("MEL item number and category are required.");
          setSubmitting(false);
          return;
        }
        if (!melSignatureAuthEventId.trim()) {
          toast.error(
            "A signature auth event ID is required for MEL deferral. " +
            "Obtain one from the work order's signature page.",
          );
          setSubmitting(false);
          return;
        }

        const result = await deferMutation({
          discrepancyId,
          organizationId: orgId as Id<"organizations">,
          signatureAuthEventId: melSignatureAuthEventId.trim() as Id<"signatureAuthEvents">,
          melItemNumber: melItemNumber.trim(),
          melCategory: melCategory as "A" | "B" | "C" | "D",
          melDeferralDate: new Date(melDeferralDate).getTime(),
          dispositionedByTechnicianId: techId as Id<"technicians">,
          notes: melNotes.trim() || undefined,
        });

        // BUG-LT-HUNT-009: Use UTC timezone for MEL expiry date display.
        // melExpiryDate is calculated by the backend as a UTC-midnight timestamp
        // from the YYYY-MM-DD deferral date + MEL category interval. Calling
        // toLocaleDateString() without a timezone option renders the previous
        // calendar day for users west of UTC (e.g., UTC-5: March 31 UTC midnight
        // = March 30 local). A tech who defers under MEL Cat B (3 calendar days)
        // starting March 3 would see "Expires: March 5" when the correct
        // expiry is March 6. Using {timeZone:"UTC"} ensures the date-only
        // value is displayed as intended regardless of the user's local timezone.
        const expiryStr = result.melExpiryDate
          ? ` Expires: ${new Date(result.melExpiryDate).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}.`
          : "";
        toast.success(
          `Finding ${discrepancyNumber} deferred under MEL ${melItemNumber} (Cat ${melCategory}).${expiryStr}`,
        );
        appendHistory({
          status: "deferred_mel",
          actor: "Technician",
          timestamp: Date.now(),
          note: `MEL ${melItemNumber} (Category ${melCategory})`,
        });
      } else {
        // ── Non-MEL dispositions ────────────────────────────────────────────
        if (!correctiveAction.trim()) {
          toast.error("Corrective Action is required before closing a finding.");
          setSubmitting(false);
          return;
        }

        await dispositionMutation({
          discrepancyId,
          organizationId: orgId as Id<"organizations">,
          disposition,
          dispositionedByTechnicianId: techId as Id<"technicians">,
          ...(disposition === "corrected" && correctiveAction
            ? { correctiveAction }
            : {}),
          ...(disposition === "deferred_grounded" && deferredReason
            ? { deferredReason }
            : {}),
          ...((disposition === "no_fault_found" ||
            disposition === "no_fault_found_could_not_reproduce") &&
          noFaultNotes
            ? { noFaultNotes }
            : {}),
        });

        toast.success(
          `Finding ${discrepancyNumber} dispositioned as "${disposition.replace(/_/g, " ")}"`,
        );
        appendHistory({
          status: disposition,
          actor: "Technician",
          timestamp: Date.now(),
          note: correctiveAction.trim(),
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disposition failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    disposition !== "" &&
    (disposition === "deferred_mel" || correctiveAction.trim().length > 0) &&
    (disposition !== "deferred_grounded" || deferredReason.trim().length > 0) &&
    (disposition !== "deferred_mel" ||
      (melItemNumber.trim() !== "" &&
        melCategory !== "" &&
        melSignatureAuthEventId.trim() !== ""));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disposition {discrepancyNumber}</DialogTitle>
          <DialogDescription>
            Record the resolution for this finding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Disposition type ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Disposition</Label>
            <Select
              value={disposition}
              onValueChange={(v) => setDisposition(v as Disposition)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select disposition…" />
              </SelectTrigger>
              <SelectContent>
                {DISPOSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Corrective action requirement ───────────────────────────── */}
          {disposition !== "" && disposition !== "deferred_mel" && (
            <div className="space-y-1.5">
              <Label>
                Corrective Action <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="Describe corrective action/disposition notes before closing…"
                rows={3}
              />
            </div>
          )}

          {/* ── Deferred (Grounded) ──────────────────────────────────────── */}
          {disposition === "deferred_grounded" && (
            <div className="space-y-1.5">
              <Label>
                Deferral Reason <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Textarea
                value={deferredReason}
                onChange={(e) => setDeferredReason(e.target.value)}
                placeholder="Reason for grounding deferral…"
                rows={3}
              />
            </div>
          )}

          {/* ── MEL Deferral — AI-015 ────────────────────────────────────── */}
          {disposition === "deferred_mel" && (
            <div className="space-y-3 p-3 border border-amber-500/30 rounded-md bg-amber-500/5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  MEL Deferral — 14 CFR 91.213 / MMEL. Signature required.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    MEL Item Number <span className="text-red-600 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    value={melItemNumber}
                    onChange={(e) => setMelItemNumber(e.target.value)}
                    placeholder="e.g. 28-10-01"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    MEL Category <span className="text-red-600 dark:text-red-400">*</span>
                  </Label>
                  <Select
                    value={melCategory}
                    onValueChange={(v) => setMelCategory(v as typeof melCategory)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          Category {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Deferral Date</Label>
                <Input
                  type="date"
                  value={melDeferralDate}
                  onChange={(e) => setMelDeferralDate(e.target.value)}
                  className="text-xs h-8 w-48"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={melNotes}
                  onChange={(e) => setMelNotes(e.target.value)}
                  placeholder="Operational limitations, conditions, recipient notified…"
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Signature auth event — required for MEL deferral */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Signature Auth Event ID{" "}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Input
                  value={melSignatureAuthEventId}
                  onChange={(e) => setMelSignatureAuthEventId(e.target.value)}
                  placeholder="5-minute single-use auth event ID…"
                  className="font-mono text-xs h-8"
                />
                <p className="text-[11px] text-muted-foreground">
                  {workOrderId ? (
                    <>
                      Obtain from{" "}
                      <Link
                        to={`/work-orders/${workOrderId}/signature`}
                        className="text-primary hover:underline"
                        onClick={() => onOpenChange(false)}
                      >
                        the work order signature page
                      </Link>
                      . Single-use, expires in 5 minutes.
                    </>
                  ) : (
                    "Obtain a re-authentication event from the work order's signature page. Single-use, expires in 5 minutes."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── No Fault Found ───────────────────────────────────────────── */}
          {(disposition === "no_fault_found" ||
            disposition === "no_fault_found_could_not_reproduce") && (
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={noFaultNotes}
                onChange={(e) => setNoFaultNotes(e.target.value)}
                placeholder="Describe findings and testing performed…"
                rows={3}
              />
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-xs font-medium text-foreground">Status History</p>
              <div className="space-y-1.5">
                {history.map((entry, idx) => (
                  <div key={`${entry.timestamp}-${idx}`} className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <Clock className="w-3 h-3 mt-0.5" />
                    <div>
                      <p>
                        <span className="text-foreground/90 font-medium">{entry.actor}</span>{" "}
                        set status to <span className="text-foreground/90">{entry.status.replace(/_/g, " ")}</span>
                        {" "}on {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      {entry.note && <p className="text-muted-foreground/80">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Disposition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
