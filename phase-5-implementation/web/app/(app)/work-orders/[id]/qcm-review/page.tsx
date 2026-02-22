/**
 * app/(app)/work-orders/[id]/qcm-review/page.tsx
 * Athelon — QCM Review Page
 *
 * Chloe Park, 2026-02-22
 * Wave 2
 *
 * Route: /work-orders/[id]/qcm-review
 * Requires: role === "inspector" (QCM) or "dom"
 *
 * What this page does:
 *   1. Fetches the work order by [id] param
 *   2. Fetches all linked maintenance records and task cards
 *   3. Fetches existing QCM review if one exists
 *   4. Fetches the current user's technician record
 *   5. Role gates: redirects non-QCM/non-DOM roles to /work-orders/[id]
 *   6. Renders QcmReviewPanel in review-form or immutable-submitted mode
 *
 * Data fetching:
 *   All Convex queries are live subscriptions (useQuery). The page uses
 *   Convex `useQuery` for all data — real-time, no manual refresh needed.
 *   Loading states show skeletons. Error states show specific messages.
 *
 * The `{} as any` stubs will be replaced with real api.* imports after
 * `npx convex dev` generates _generated/api.ts. See frontend-wiring-plan.md.
 */

"use client";

import React, { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOrgRole } from "@/lib/auth";
import { QcmReviewPanel } from "@/components/QcmReviewPanel";
import type {
  WorkOrderForQcmReview,
  MaintenanceRecordSummary,
  TaskCardSignOffSummary,
  ExistingQcmReview,
} from "@/components/QcmReviewPanel";

// TODO: Replace stubs with real Convex imports once deployed:
// import { api } from "@/convex/_generated/api";
// import { useQuery } from "convex/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;
// Stub useQuery — returns undefined (loading) until real Convex runs
function useQuery<T>(
  _ref: unknown,
  _args?: unknown,
): T | null | undefined {
  return undefined;
}
type Id<_T extends string> = string;

// ---------------------------------------------------------------------------
// Skeleton for full page loading
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 animate-pulse">
      {/* Page header */}
      <div className="h-8 bg-gray-200 rounded-[4px] w-48" />
      <div className="h-4 bg-gray-200 rounded-[4px] w-32" />
      {/* Sections */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-[6px] border border-gray-200 bg-white p-4 space-y-3"
        >
          <div className="h-4 bg-gray-200 rounded-[4px] w-32" />
          <div className="h-16 bg-gray-100 rounded-[4px] w-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error display
// ---------------------------------------------------------------------------

function PageError({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div
        role="alert"
        className="rounded-[6px] border border-red-300 bg-red-50 px-4 py-4"
      >
        <p className="text-[15px] font-semibold text-red-800 mb-1">
          Unable to load QCM review
        </p>
        <p className="text-[14px] text-red-700">{message}</p>
        <p className="text-[13px] text-red-600 mt-2">
          What to do:
          <br />
          1. Go back and reload the page.
          <br />
          2. If the problem persists, contact your administrator.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className={cn(
          "mt-4 h-14 w-full rounded-[6px]",
          "border border-gray-300 bg-white",
          "text-[15px] font-medium text-gray-700",
          "hover:bg-gray-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        )}
      >
        ← Back to Work Order
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — data shape from Convex queries
// ---------------------------------------------------------------------------

/**
 * Expected shape from api.workOrders.getWorkOrderForQcmReview.
 * Devraj: please match this shape in the query response.
 */
interface GetWorkOrderForQcmReviewResult {
  workOrder: WorkOrderForQcmReview;
  maintenanceRecords: MaintenanceRecordSummary[];
  taskCards: TaskCardSignOffSummary[];
  existingReview: ExistingQcmReview | null;
  currentTechnicianId: Id<"technicians"> | null;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function QcmReviewPage() {
  const router = useRouter();
  const params = useParams();
  const workOrderId = params.id as Id<"workOrders">;

  const { role, isLoaded: roleLoaded } = useOrgRole();

  // Role gate — redirect non-QCM/DOM users immediately
  useEffect(() => {
    if (!roleLoaded) return;
    if (role !== "inspector" && role !== "dom") {
      router.replace(`/work-orders/${workOrderId}`);
    }
  }, [role, roleLoaded, router, workOrderId]);

  // ── Convex query — fetches WO + all linked records + existing review ──
  // TODO: Replace with real api.workOrders.getWorkOrderForQcmReview once deployed.
  // Single query that joins WO + maintenance records + task cards + existing QCM review.
  // This is intentional: one round-trip for all the data this page needs.
  const result = useQuery<GetWorkOrderForQcmReviewResult>(
    api.workOrders?.getWorkOrderForQcmReview,
    workOrderId ? { workOrderId } : "skip",
  );

  // ── Back navigation ──
  const handleBack = () => {
    router.push(`/work-orders/${workOrderId}`);
  };

  // ── Loading: role not yet resolved ──
  if (!roleLoaded) {
    return <PageSkeleton />;
  }

  // ── Role gate: redirect will fire via useEffect, show nothing ──
  if (role !== "inspector" && role !== "dom") {
    return null;
  }

  // ── Loading: Convex query pending ──
  if (result === undefined) {
    return <PageSkeleton />;
  }

  // ── Error: query returned null (not found or access denied) ──
  if (result === null) {
    return (
      <PageError
        message="Work order not found or you do not have access. Only QC Inspectors and Directors of Maintenance can access QCM reviews."
        onBack={handleBack}
      />
    );
  }

  const {
    workOrder,
    maintenanceRecords,
    taskCards,
    existingReview,
    currentTechnicianId,
  } = result;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header — sticky, consistent with the app shell */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to work order"
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-[6px]",
            "text-gray-600 hover:bg-gray-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          )}
        >
          <svg
            aria-hidden
            className="w-5 h-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 4L7 10l6 6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            QCM Review
          </p>
          <h1 className="text-[16px] font-bold text-gray-900 truncate">
            {workOrder.workOrderNumber} · {workOrder.aircraftRegistration}
          </h1>
        </div>

        {existingReview && (
          <span
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold uppercase tracking-wide",
              "bg-green-100 text-green-700",
            )}
          >
            ✓ Reviewed
          </span>
        )}
      </div>

      {/* Page content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <QcmReviewPanel
          workOrder={workOrder}
          maintenanceRecords={maintenanceRecords}
          taskCards={taskCards}
          existingReview={existingReview}
          currentTechnicianId={currentTechnicianId}
          onReviewSubmitted={() => {
            // After submission, scroll to top so the immutable view is visible
            window.scrollTo({ top: 0, behavior: "smooth" });
            // No router.push — stay on page to show the immutable confirmation
          }}
        />

        {/* Footer: back link */}
        <div className="mt-8 pb-8">
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              "w-full h-14 rounded-[6px]",
              "border border-gray-300 bg-white",
              "text-[15px] font-medium text-gray-700",
              "hover:bg-gray-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            )}
          >
            ← Back to Work Order {workOrder.workOrderNumber}
          </button>
        </div>
      </main>
    </div>
  );
}
