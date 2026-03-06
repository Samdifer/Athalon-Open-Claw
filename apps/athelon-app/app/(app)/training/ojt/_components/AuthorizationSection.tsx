"use client";

import { useState } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Shield, ShieldOff } from "lucide-react";

type Authorization = Doc<"ojtAuthorizations">;

type AuthorizationSectionProps = {
  authorizations: Authorization[];
  techniciansMap: Map<string, string>;
  onGrant: (id: Id<"ojtAuthorizations">, notes?: string) => Promise<void>;
  onRevoke: (id: Id<"ojtAuthorizations">, reason?: string) => Promise<void>;
};

function formatDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AuthorizationSection({
  authorizations,
  techniciansMap,
  onGrant,
  onRevoke,
}: AuthorizationSectionProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "grant" | "revoke";
    authId: Id<"ojtAuthorizations">;
    label: string;
  } | null>(null);
  const [dialogNotes, setDialogNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sorted = [...authorizations].sort((a, b) => a.displayOrder - b.displayOrder);
  const grantedCount = sorted.filter((a) => a.isGranted).length;

  async function handleConfirm() {
    if (!confirmDialog) return;
    setIsSubmitting(true);
    try {
      if (confirmDialog.type === "grant") {
        await onGrant(confirmDialog.authId, dialogNotes || undefined);
      } else {
        await onRevoke(confirmDialog.authId, dialogNotes || undefined);
      }
      setConfirmDialog(null);
      setDialogNotes("");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sorted.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Authorization Capabilities
            </CardTitle>
            <Badge variant="outline">
              {grantedCount}/{sorted.length} granted
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.map((auth) => (
            <div
              key={auth._id}
              className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                auth.isGranted
                  ? "border-green-500/30 bg-green-500/5"
                  : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {auth.isGranted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{auth.capabilityLabel}</p>
                  {auth.isGranted && auth.grantedByName && (
                    <p className="text-xs text-muted-foreground">
                      Granted by {auth.grantedByName} on {formatDate(auth.grantedAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor={`auth-${auth._id}`} className="text-xs text-muted-foreground sr-only">
                  {auth.isGranted ? "Revoke" : "Grant"}
                </Label>
                <Switch
                  id={`auth-${auth._id}`}
                  checked={auth.isGranted}
                  onCheckedChange={(checked) => {
                    setConfirmDialog({
                      type: checked ? "grant" : "revoke",
                      authId: auth._id,
                      label: auth.capabilityLabel,
                    });
                    setDialogNotes("");
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmDialog(null);
            setDialogNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "grant" ? "Grant" : "Revoke"} Authorization
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              {confirmDialog?.type === "grant" ? (
                <>
                  Confirm granting <span className="font-medium">{confirmDialog.label}</span> authorization.
                </>
              ) : (
                <>
                  Confirm revoking <span className="font-medium">{confirmDialog?.label}</span> authorization.
                </>
              )}
            </p>
            <div className="space-y-2">
              <Label>{confirmDialog?.type === "grant" ? "Notes" : "Reason"}</Label>
              <Textarea
                value={dialogNotes}
                onChange={(e) => setDialogNotes(e.target.value)}
                rows={2}
                placeholder={
                  confirmDialog?.type === "grant"
                    ? "Optional notes..."
                    : "Reason for revocation..."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog(null);
                setDialogNotes("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.type === "revoke" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : confirmDialog?.type === "grant"
                  ? "Grant"
                  : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
