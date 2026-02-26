"use client";

/**
 * TD-006 — Segment-level error boundary for all authenticated pages.
 *
 * Next.js App Router requires error.tsx to be a Client Component.
 * This file catches all unhandled errors within the (app) route group,
 * including Convex subscription errors, null-propagation crashes, and
 * unexpected runtime exceptions.
 *
 * For compliance-critical routes (WO detail, RTS) a per-route error.tsx
 * is also added — see app/(app)/work-orders/[id]/error.tsx.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to an error reporting service here if needed.
    console.error("[Athelon] Unhandled page error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="border-red-500/30 bg-red-500/5 w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <p className="text-sm text-muted-foreground font-mono break-all bg-muted/40 px-3 py-2 rounded border border-border/40">
              {error.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            An unexpected error occurred. You can try again or return to the
            dashboard. If the problem persists, contact support.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={reset} size="sm" variant="outline" className="gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Try again
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
