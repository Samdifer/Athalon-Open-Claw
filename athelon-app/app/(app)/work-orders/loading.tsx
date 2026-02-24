/**
 * TD-016 — Work Orders list Suspense loading skeleton.
 *
 * Displayed during navigation to /work-orders before the Convex query
 * resolves. Mimics the WO list layout: header + filter row + card rows.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function WorkOrdersLoading() {
  return (
    <div className="space-y-5">
      {/* Page title + action button */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Filter / search bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* WO list rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card"
          >
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
