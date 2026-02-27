"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/hooks/useRouter";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Countdown timer hook ────────────────────────────────────────────────────

function useCountdown(expiresAt: number | null): {
  remaining: number;
  expired: boolean;
} {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (expiresAt === null) return;
    const update = () => {
      const ms = Math.max(0, expiresAt - Date.now());
      setRemaining(ms);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { remaining, expired: remaining === 0 };
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignaturePage() {
  const params = useParams();
  const workOrderId = params.id as string;
  const router = useRouter();
  const [searchParams] = useSearchParams();

  // Optional query params:
  //   ?returnTo=/work-orders/[id]/tasks/[cardId]
  //   ?intendedTable=taskCards (defaults to "workOrders" for WO-level signing)
  const returnTo = searchParams.get("returnTo");
  const intendedTable = searchParams.get("intendedTable") ?? "workOrders";

  const { orgId, techId, tech, isLoaded: orgLoaded } = useCurrentOrg();

  // Auth event state
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authEvent, setAuthEvent] = useState<{
    eventId: string;
    expiresAt: number;
  } | null>(null);

  const createSignatureAuthEvent = useMutation(
    api.workOrders.createSignatureAuthEvent,
  );

  const { remaining, expired } = useCountdown(authEvent?.expiresAt ?? null);

  const isLoading = !orgLoaded;

  async function handleCreateAuthEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !techId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createSignatureAuthEvent({
        organizationId: orgId,
        technicianId: techId,
        intendedTable,
        pin: pin.trim(),
      });

      setAuthEvent({
        eventId: result.eventId,
        expiresAt: result.expiresAt,
      });
      setPin("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create authorization token",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleContinue() {
    if (!authEvent) return;
    const dest = returnTo
      ? `${returnTo}?authEventId=${authEvent.eventId}`
      : `/work-orders/${workOrderId}`;
    router.push(dest);
  }

  function handleRefresh() {
    setAuthEvent(null);
    setPin("");
    setError(null);
  }

  // Percentage of 5 min remaining
  const pct = authEvent
    ? Math.round((remaining / (5 * 60 * 1000)) * 100)
    : 0;

  const urgentColor =
    remaining < 60_000
      ? "text-red-600 dark:text-red-400"
      : remaining < 120_000
      ? "text-amber-600 dark:text-amber-400"
      : "text-green-600 dark:text-green-400";

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-5 pt-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 pt-2">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link to={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Work Order
        </Link>
      </Button>

      {/* Header */}
      <div className="text-center space-y-1">
        <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
        <h1 className="text-xl font-semibold text-foreground">
          Re-Authentication Required
        </h1>
        <p className="text-sm text-muted-foreground">
          Signing maintenance records requires re-entry of your PIN.
          <br />
          Generates a single-use 5-minute authorization token.
        </p>
      </div>

      {/* Technician identity */}
      {tech && (
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {tech.legalName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {tech.legalName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {tech.email}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-green-500/30 text-green-600 dark:text-green-400"
            >
              Active
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Auth event active */}
      {authEvent && !expired ? (
        <Card
          className={`border ${
            remaining > 120_000
              ? "border-green-500/30 bg-green-500/5"
              : remaining > 60_000
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <CardContent className="p-5 space-y-4">
            {/* Countdown */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className={`w-5 h-5 ${urgentColor}`} />
                <span className={`text-3xl font-mono font-bold ${urgentColor}`}>
                  {formatCountdown(remaining)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Authorization expires in{" "}
                {Math.ceil(remaining / 60_000) === 1
                  ? "less than 1 minute"
                  : `${Math.ceil(remaining / 60_000)} minutes`}
              </p>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct > 40
                      ? "bg-green-400"
                      : pct > 20
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Status */}
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                  Authorization Token Active
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Token ID:{" "}
                  <span className="font-mono">
                    {authEvent.eventId.slice(0, 12)}…
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  For:{" "}
                  <span className="font-medium capitalize">
                    {intendedTable.replace(/([A-Z])/g, " $1").trim()}
                  </span>{" "}
                  sign-off
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Valid: Single use only (INV-05)
                </p>
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {returnTo && (
                <Button
                  onClick={handleContinue}
                  className="w-full gap-2"
                >
                  Continue to Sign-Off
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="w-full text-xs border-border/60"
              >
                Generate New Token
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : authEvent && expired ? (
        /* Expired */
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Token Expired</p>
            </div>
            <p className="text-xs text-muted-foreground">
              The 5-minute authorization window has elapsed. Re-enter your PIN
              to generate a new token.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="w-full text-xs border-border/60"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* PIN form */
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Enter PIN to Authorize
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/40">
              <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Per 14 CFR 65 and your organization's RSM, each signing action
                requires re-authentication. Your PIN is never stored by Athelon
                in plaintext.
              </p>
            </div>

            <form onSubmit={handleCreateAuthEvent} className="space-y-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">
                  PIN <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4–6 digit PIN"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  required
                  className="h-10 font-mono text-lg tracking-widest text-center bg-muted/30 border-border/60"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Enter the PIN associated with your technician account
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-500/30 bg-red-500/5">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || pin.length < 4 || !orgId || !techId}
                className="w-full gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                Authorize Signature
              </Button>
            </form>

            <Separator className="opacity-30" />

            <div className="space-y-1.5 text-[10px] text-muted-foreground">
              <p className="font-medium text-[11px] text-foreground/70">
                What happens next:
              </p>
              <p>① A single-use 5-minute authorization token is created</p>
              <p>② The token is tied to your identity and cannot be transferred</p>
              <p>③ Use it immediately to complete your signing action</p>
              <p>
                ④ The token is consumed atomically with the signing mutation
                (INV-05)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
