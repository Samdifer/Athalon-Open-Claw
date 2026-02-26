"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QcmReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertCircle className="w-8 h-8 text-red-400/60" />
      <p className="text-sm font-medium text-muted-foreground">
        Failed to load QCM Review Dashboard
      </p>
      <p className="text-xs text-muted-foreground/60 max-w-sm text-center">
        {error.message}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
