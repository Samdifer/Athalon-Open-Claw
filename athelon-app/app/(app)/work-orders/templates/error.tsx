"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TemplatesError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle className="w-8 h-8 text-destructive/60" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Failed to load templates</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
