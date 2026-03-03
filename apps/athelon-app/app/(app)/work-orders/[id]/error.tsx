"use client";

/**
 * TD-006 — Work-order route segment error boundary.
 *
 * Compliance-critical route: any unhandled error here (Convex failure,
 * null dereference, unexpected mutation exception) must be surfaced clearly
 * so that maintenance personnel are not left with a silent blank screen.
 *
 * This boundary applies to all pages under work-orders/[id]/:
 *   - WO detail page
 *   - Task card pages
 *   - RTS authorization
 *   - Maintenance records
 *   - Signature page
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams } from "react-router-dom";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function WorkOrderErrorBoundary({ error, reset }: ErrorPageProps) {
  const params = useParams<{ id: string }>();
  const woId = params?.id ?? null;

  useEffect(() => {
    console.error("[Athelon] Work-order route error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="border-red-500/30 bg-red-500/5 w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            Work Order Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded">
            Compliance notice: if you were in the middle of a sign-off or
            return-to-service operation, do not assume the action completed.
            Verify the record status after recovery.
          </p>
          {error.message && (
            <p className="text-sm text-muted-foreground font-mono break-all bg-muted/40 px-3 py-2 rounded border border-border/40">
              {error.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            An unexpected error occurred on this work order page.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={reset} size="sm" variant="outline" className="gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Try again
            </Button>
            {woId && (
              <Button asChild size="sm" variant="ghost">
                <Link to={`/work-orders/${woId}`}>Back to Work Order</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost">
              <Link to="/work-orders">All Work Orders</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
