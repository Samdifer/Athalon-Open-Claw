"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// BUG-QCM-HUNT-122: Compliance error boundary used a raw <button> with inline
// styles instead of the shadcn Button component. Every other error boundary in
// the app (qcm-review/error.tsx, billing error pages, parts error pages) uses
// the proper Button component with consistent sizing and hover states. This page
// also lacked an error icon and truncated the error message. A QCM inspector
// hitting an error on the compliance dashboard saw an unstyled "Try again" text
// link that looked broken — undermining confidence in the tool.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="w-8 h-8 text-red-400/60" />
      <p className="text-sm font-medium text-muted-foreground">
        Failed to load Compliance Dashboard
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
