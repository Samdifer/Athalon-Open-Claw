"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface NotFoundCardProps {
  /** Human-readable description of what wasn't found. */
  message: string;
  /** href for the "Go back" link. */
  backHref: string;
  /** Optional label override for the back link button. Defaults to "Go back". */
  backLabel?: string;
}

/**
 * Shared not-found card for dynamic client-component pages.
 *
 * Do NOT use next/navigation `notFound()` here — that only works in server
 * components. Use this inline conditional instead.
 *
 * Example:
 *   if (isLoaded && !data) return <NotFoundCard message="Work order not found" backHref="/work-orders" />;
 */
export function NotFoundCard({
  message,
  backHref,
  backLabel = "Go back",
}: NotFoundCardProps) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Card className="border-border/60 w-full max-w-sm">
        <CardContent className="py-12 text-center">
          <FileQuestion className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-foreground mb-1">
            Not Found
          </h2>
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>← {backLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
