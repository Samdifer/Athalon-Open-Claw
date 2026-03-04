"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RatingBadgeProps = {
  ratingClass: 1 | 2 | 3 | 4;
  ratingText: string;
  hasLimitation?: boolean;
};

const CLASS_STYLES: Record<RatingBadgeProps["ratingClass"], string> = {
  1: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  2: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  3: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  4: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300",
};

export function RatingBadge({ ratingClass, ratingText, hasLimitation = false }: RatingBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium", CLASS_STYLES[ratingClass])}
    >
      Class {ratingClass} · {ratingText}
      {hasLimitation ? " · Limited" : ""}
    </Badge>
  );
}
