/**
 * app/(app)/work-orders/page.tsx
 * Athelon — Work Orders List Page
 *
 * Chloe Park, 2026-02-22
 *
 * Next.js App Router client component. Live data via Convex useQuery.
 * Route: /work-orders
 *
 * Features:
 * - Tab filter bar (Active default — not "All"; matches spec §4.4)
 * - Status filter drives the Convex query arg
 * - Loading skeleton (5 cards) while useQuery returns undefined
 * - Empty state with contextual copy per filter
 * - Role-gated "New Work Order" button (supervisor+ only per auth design §3.3)
 * - Each card links to /work-orders/[id]
 *
 * Data flow:
 *   useQuery(api.workOrders.list, { statusFilter }) → undefined | WorkOrderDoc[]
 *   undefined = still loading → skeleton
 *   [] = loaded, no results → empty state
 *   [...] = loaded with data → WorkOrderCard list
 */

"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { WorkOrderCard, type WorkOrderDoc } from "@/components/WorkOrderCard";
import { useOrgRole } from "@/lib/auth";

// TODO: Import from "@/convex/_generated/api" once Convex is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Status filter tabs — "Active" is the default (spec §4.4 note)
// ---------------------------------------------------------------------------

type StatusFilter =
  | "active"
  | "on_hold"
  | "pending_auth"
  | "awaiting_parts"
  | "complete"
  | "closed"
  | "all";

interface FilterTab {
  id: StatusFilter;
  label: string;
  /** Status values that this tab shows — passed to Convex query */
  statuses: string[];
}

const FILTER_TABS: FilterTab[] = [
  {
    id: "active",
    label: "Active",
    statuses: ["open", "in_progress"],
  },
  {
    id: "on_hold",
    label: "On Hold",
    statuses: ["on_hold"],
  },
  {
    id: "pending_auth",
    label: "Pending Auth",
    statuses: ["pending_inspection", "pending_signoff", "open_discrepancies"],
  },
  {
    id: "awaiting_parts",
    label: "Awaiting Parts",
    // Filter applied server-side using partsOnOrder > 0 in addition to status
    statuses: ["open", "in_progress", "on_hold"],
  },
  {
    id: "complete",
    label: "Complete",
    statuses: ["closed"],
  },
  {
    id: "all",
    label: "All",
    statuses: [], // Empty = no status filter, return all
  },
] as const;

// ---------------------------------------------------------------------------
// Empty state component — aviation-specific copy per filter
// ---------------------------------------------------------------------------

function EmptyState({
  filter,
  canCreateWo,
}: {
  filter: StatusFilter;
  canCreateWo: boolean;
}) {
  const COPY: Record<StatusFilter, { heading: string; body: string }> = {
    active: {
      heading: "No active work orders",
      body: "There are no open or in-progress work orders right now. Create one to get started.",
    },
    on_hold: {
      heading: "Nothing on hold",
      body: "No work orders are currently paused. Work orders move to On Hold when waiting on parts or customer authorization.",
    },
    pending_auth: {
      heading: "No pending authorizations",
      body: "All work orders are either in progress or have received their required sign-offs.",
    },
    awaiting_parts: {
      heading: "No work orders awaiting parts",
      body: "All active work orders have their required parts on hand or none are currently needed.",
    },
    complete: {
      heading: "No closed work orders",
      body: "Closed work orders will appear here after Return-to-Service sign-off is complete.",
    },
    all: {
      heading: "No work orders found",
      body: "This organization has no work orders yet. Create the first one to begin tracking maintenance.",
    },
  };

  const { heading, body } = COPY[filter];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "rounded-[8px] border border-[#363D4E] border-dashed bg-[#1A1E28]",
        "px-8 py-16 text-center",
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon — clipboard with no items */}
      <svg
        aria-hidden
        className="w-12 h-12 text-gray-700 mb-4"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="12" y="8" width="24" height="32" rx="3" />
        <path d="M18 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
        <line x1="18" y1="20" x2="30" y2="20" />
        <line x1="18" y1="26" x2="26" y2="26" />
      </svg>

      <h3 className="text-[16px] font-semibold text-gray-300 mb-2">{heading}</h3>
      <p className="text-[14px] text-gray-500 max-w-sm leading-relaxed">{body}</p>

      {canCreateWo && (
        <Link
          href="/work-orders/new"
          className={cn(
            "mt-6 inline-flex items-center gap-2 px-5 h-11 rounded-[6px]",
            "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
            "text-white text-[14px] font-semibold uppercase tracking-[0.04em]",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          )}
        >
          <svg aria-hidden className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New Work Order
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — 5 placeholder cards
// ---------------------------------------------------------------------------

function WorkOrderListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading work orders" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <WorkOrderCard key={i} workOrder={undefined} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter tab bar
// ---------------------------------------------------------------------------

function FilterTabBar({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter work orders by status"
      className={cn(
        "flex items-center gap-1 overflow-x-auto",
        "border-b border-[#363D4E] pb-0",
        // Hide scrollbar but keep scrollability (mobile)
        "scrollbar-none",
        "-mx-4 px-4 sm:mx-0 sm:px-0",
      )}
    >
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeFilter === tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={cn(
            // Touch target ≥ 44px height (Tanya's spec — 60px preferred on mobile)
            "shrink-0 px-4 h-11 text-[14px] font-medium whitespace-nowrap",
            "border-b-2 -mb-px transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
            activeFilter === tab.id
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function WorkOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("active");
  const { can, isAtLeast, isLoaded } = useOrgRole();

  // Role gates:
  // - Create WO button: supervisor+ (per permission matrix §3.3 — actually "amt" and up
  //   can create, but Finn wants the button only for supervisor+ in the list header context).
  //   Using isAtLeast("supervisor") here. AMTs create WOs from within a task context.
  // TODO: Confirm with Nadia whether AMTs should see the button on the list page.
  const canCreateWorkOrder = isLoaded && can("createWorkOrder");
  const showCreateButton = isLoaded && isAtLeast("supervisor");

  // Derive query args from active filter
  const filterTab = FILTER_TABS.find((t) => t.id === activeFilter)!;
  const queryArgs = {
    // Empty statuses array = no filter (return all)
    statuses: filterTab.statuses.length > 0 ? filterTab.statuses : undefined,
    // Awaiting parts filter adds an extra condition server-side
    awaitingParts: activeFilter === "awaiting_parts" ? true : undefined,
  };

  // useQuery returns:
  //   undefined = loading
  //   [] = no results
  //   WorkOrderDoc[] = results
  // TODO: Replace `null as any` with real api reference once Convex is deployed.
  const workOrders = useQuery(
    api.workOrders?.list ?? null,
    queryArgs,
  ) as WorkOrderDoc[] | undefined;

  const handleFilterChange = useCallback((filter: StatusFilter) => {
    setActiveFilter(filter);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 px-4 pt-6 pb-4 sm:px-6">
        <h1 className="text-[24px] font-semibold text-gray-100 leading-tight">
          Work Orders
        </h1>

        {/* Create button — supervisor+ only */}
        {showCreateButton && (
          <Link
            href="/work-orders/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 h-10 rounded-[6px]",
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
              "text-white text-[14px] font-semibold uppercase tracking-[0.04em]",
              "transition-colors duration-100 shrink-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
            )}
            aria-label="Create new work order"
          >
            <svg aria-hidden className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            <span className="hidden sm:inline">New Work Order</span>
            <span className="sm:hidden">New</span>
          </Link>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="px-4 sm:px-6">
        <FilterTabBar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* ── Work order list ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-8 sm:px-6"
        role="main"
        aria-label={`Work orders — ${FILTER_TABS.find(t => t.id === activeFilter)?.label ?? ""} filter`}
      >
        {/* Loading skeleton */}
        {workOrders === undefined && <WorkOrderListSkeleton />}

        {/* Empty state — only when loaded and no results */}
        {workOrders !== undefined && workOrders.length === 0 && (
          <EmptyState filter={activeFilter} canCreateWo={canCreateWorkOrder} />
        )}

        {/* Work order cards */}
        {workOrders !== undefined && workOrders.length > 0 && (
          <ul
            className="flex flex-col gap-3"
            aria-label={`${workOrders.length} work order${workOrders.length === 1 ? "" : "s"}`}
          >
            {workOrders.map((wo) => (
              <li key={wo._id}>
                <WorkOrderCard workOrder={wo} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Mobile FAB — floating action button for creating WO on mobile ── */}
      {/* Only renders on small screens where the header button is compact */}
      {showCreateButton && (
        <div className="sm:hidden fixed bottom-20 right-4 z-[100]">
          {/* z-[100] = --z-sticky per design tokens */}
          <Link
            href="/work-orders/new"
            className={cn(
              // 60×60px = Tanya's minimum touch target for primary actions in hangar
              "flex items-center justify-center w-[60px] h-[60px] rounded-full",
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
              "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
              "transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
            )}
            aria-label="Create new work order"
          >
            <svg aria-hidden className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
