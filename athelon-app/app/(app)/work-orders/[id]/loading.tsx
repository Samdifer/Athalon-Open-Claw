/**
 * TD-016 — Work Order detail Suspense loading skeleton.
 *
 * Compliance-critical route. Displayed while the WO detail query is in flight.
 * Matches the WO detail page layout: back button, header with badges,
 * stat cards, then tab content area.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function WorkOrderDetailLoading() {
  return (
    <div className="space-y-5">
      {/* Back link */}
      <Skeleton className="h-7 w-28" />

      {/* WO header: number + badges + aircraft info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-36 font-mono" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      {/* Tab content — task card rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1 text-right">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-1.5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
