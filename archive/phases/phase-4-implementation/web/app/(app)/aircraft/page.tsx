/**
 * app/(app)/aircraft/page.tsx
 * Athelon — Aircraft (Fleet) List Page
 *
 * Chloe Park, 2026-02-22
 *
 * All aircraft this shop maintains or has a record for. Quick glance view
 * for DOMs and lead AMTs — tail number, type, status, open WOs, next maint.
 *
 * Route: /aircraft
 *
 * Features:
 *   - Search by tail number, make/model, customer
 *   - Status filter (All, Active, In Maintenance, Out of Service)
 *   - Aircraft list with: tail + type, owner/customer, status badge,
 *     open WO count, last maintenance date, next maintenance due
 *   - Add aircraft button (DOM only)
 *   - Each row links to /aircraft/[id]
 *
 * Data:
 *   useQuery(api.aircraft.list, { search, statusFilter })
 *   → undefined (loading) | AircraftListItem[]
 *
 * Role gates:
 *   - Add aircraft: DOM only (can("manageUsers") used as proxy — we use
 *     isAtLeast("dom") directly since adding aircraft is a DOM action)
 *   - View list: everyone
 */

"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { useOrgRole } from "@/lib/auth";
import type { StatusVariant } from "@/components/StatusBadge";

// TODO: Replace with real import once Convex is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AircraftListItem {
  _id: string;
  _creationTime: number;
  tailNumber: string;             // N-number (currentRegistration)
  make: string;
  model: string;
  series?: string;
  yearOfManufacture?: number;
  serialNumber: string;
  status: string;                 // aircraftStatus enum
  customerId?: string;
  customerName?: string;          // Denormalized for list
  ownerName?: string;
  totalTimeAirframeHours: number;
  // Computed by server for list view:
  openWorkOrders: number;
  lastMaintenanceDate?: number;   // Timestamp of most recent closed WO
  lastMaintenanceType?: string;   // e.g. "Annual Inspection"
  nextMaintenanceDueDate?: number;
  nextMaintenanceDueType?: string;
  nextMaintenanceDueHours?: number;
  openAds: number;                // ADs with complianceStatus = "not_complied"
  openSquawks: number;
}

type AircraftStatusFilter = "all" | "airworthy" | "in_maintenance" | "out_of_service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatHours(hours: number): string {
  return `${hours.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} hr`;
}

/**
 * Maps the aircraft.status enum from the Convex schema to a StatusVariant.
 * Using StatusBadge for consistent visual language across the app.
 */
function aircraftStatusToVariant(status: string): StatusVariant {
  switch (status) {
    case "airworthy":
      return "active";
    case "in_maintenance":
      return "on_hold";
    case "out_of_service":
      return "overdue";
    case "destroyed":
    case "sold":
      return "cancelled";
    case "unknown":
    default:
      return "pending";
  }
}

function aircraftStatusLabel(status: string): string {
  switch (status) {
    case "airworthy":      return "AIRWORTHY";
    case "in_maintenance": return "IN MAINT.";
    case "out_of_service": return "OOS";
    case "destroyed":      return "DESTROYED";
    case "sold":           return "SOLD";
    default:               return status.toUpperCase();
  }
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

interface StatusTab {
  id: AircraftStatusFilter;
  label: string;
  apiStatuses: string[];
}

const STATUS_TABS: StatusTab[] = [
  { id: "all", label: "All", apiStatuses: [] },
  {
    id: "airworthy",
    label: "Airworthy",
    apiStatuses: ["airworthy"],
  },
  {
    id: "in_maintenance",
    label: "In Maintenance",
    apiStatuses: ["in_maintenance"],
  },
  {
    id: "out_of_service",
    label: "Out of Service",
    apiStatuses: ["out_of_service"],
  },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function AircraftCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[8px] border border-[#363D4E] bg-[#1A1E28] px-4 py-3.5 animate-pulse",
        className,
      )}
      aria-busy="true"
      aria-label="Loading aircraft"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="h-7 w-20 rounded bg-[#2E3445]" />
        <div className="h-5 w-28 rounded bg-[#2E3445]" />
        <div className="h-6 w-20 rounded bg-[#2E3445] ml-auto" />
      </div>
      <div className="h-4 w-48 rounded bg-[#242936] mb-1" />
      <div className="flex gap-4 mt-2">
        <div className="h-4 w-20 rounded bg-[#242936]" />
        <div className="h-4 w-28 rounded bg-[#242936]" />
        <div className="h-4 w-24 rounded bg-[#242936]" />
      </div>
    </div>
  );
}

function AircraftListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading fleet" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <AircraftCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aircraft card
// ---------------------------------------------------------------------------

function AircraftCard({ aircraft }: { aircraft: AircraftListItem }) {
  const hasCompliance = aircraft.openAds > 0 || aircraft.openSquawks > 0;
  const hasOpenWork = aircraft.openWorkOrders > 0;

  return (
    <Link
      href={`/aircraft/${aircraft._id}`}
      className={cn(
        "block rounded-[8px] border border-[#363D4E] bg-[#1A1E28]",
        "px-4 py-3.5",
        "hover:bg-[#2E3445] hover:border-[#4A5264]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
        "transition-colors duration-100",
        // Status-driven left border
        aircraft.status === "out_of_service" && "border-l-4 border-l-red-600",
        aircraft.status === "in_maintenance" && "border-l-4 border-l-amber-600",
      )}
      aria-label={`${aircraft.tailNumber} — ${aircraft.make} ${aircraft.model}, status ${aircraft.status}`}
    >
      {/* ── Row 1: Tail number + make/model + status badge ── */}
      <div className="flex items-center gap-2.5 mb-1.5">
        {/* Tail number — the universal key, prominent */}
        <span className="font-mono text-[20px] font-bold text-gray-100 leading-tight tracking-wide">
          {aircraft.tailNumber}
        </span>

        {/* Make/model */}
        <span className="text-[14px] text-gray-400">
          {aircraft.make} {aircraft.model}
          {aircraft.series && (
            <span className="text-gray-600"> {aircraft.series}</span>
          )}
        </span>

        {/* Status badge — right-aligned */}
        <StatusBadge
          variant={aircraftStatusToVariant(aircraft.status)}
          label={aircraftStatusLabel(aircraft.status)}
          size="sm"
          className="ml-auto shrink-0"
        />
      </div>

      {/* ── Row 2: Owner/customer + year + serial ── */}
      <div className="mb-2">
        <span className="text-[13px] text-gray-500">
          {aircraft.customerName ?? aircraft.ownerName ?? "No owner on record"}
        </span>
        {aircraft.yearOfManufacture && (
          <span className="text-[12px] text-gray-600 ml-3">
            {aircraft.yearOfManufacture}
          </span>
        )}
        <span className="text-[12px] font-mono text-gray-600 ml-3">
          S/N {aircraft.serialNumber}
        </span>
      </div>

      {/* ── Row 3: Airframe time + last maintenance ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/* Airframe TT */}
        <span className="text-[12px] text-gray-500 tabular-nums">
          TT: {formatHours(aircraft.totalTimeAirframeHours)}
        </span>

        {/* Last maintenance */}
        {aircraft.lastMaintenanceDate ? (
          <span className="text-[12px] text-gray-500 tabular-nums">
            Last: {aircraft.lastMaintenanceType
              ? `${aircraft.lastMaintenanceType} `
              : ""}
            {formatDate(aircraft.lastMaintenanceDate)}
          </span>
        ) : (
          <span className="text-[12px] text-gray-600">No maintenance on record</span>
        )}

        {/* Next due */}
        {(aircraft.nextMaintenanceDueDate || aircraft.nextMaintenanceDueHours) && (
          <span className="text-[12px] text-gray-400">
            Next:{" "}
            {aircraft.nextMaintenanceDueType && (
              <span>{aircraft.nextMaintenanceDueType} </span>
            )}
            {aircraft.nextMaintenanceDueDate && (
              <span className="tabular-nums">{formatDate(aircraft.nextMaintenanceDueDate)}</span>
            )}
            {aircraft.nextMaintenanceDueHours && aircraft.nextMaintenanceDueDate && (
              <span className="text-gray-600"> / </span>
            )}
            {aircraft.nextMaintenanceDueHours && (
              <span className="tabular-nums">{formatHours(aircraft.nextMaintenanceDueHours)}</span>
            )}
          </span>
        )}
      </div>

      {/* ── Row 4: Flags — open WOs, open ADs, squawks ── */}
      {(hasOpenWork || hasCompliance) && (
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {hasOpenWork && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[12px]",
                aircraft.openWorkOrders > 0 ? "text-blue-400" : "text-gray-600",
              )}
            >
              <svg aria-hidden className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="10" height="10" rx="1.5" />
                <line x1="4" y1="4" x2="8" y2="4" />
                <line x1="4" y1="6" x2="7" y2="6" />
                <line x1="4" y1="8" x2="6" y2="8" />
              </svg>
              {aircraft.openWorkOrders} open WO{aircraft.openWorkOrders !== 1 ? "s" : ""}
            </span>
          )}

          {aircraft.openAds > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-amber-400">
              <svg aria-hidden className="w-3 h-3" viewBox="0 0 10 9" fill="currentColor">
                <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
              </svg>
              {aircraft.openAds} open AD{aircraft.openAds !== 1 ? "s" : ""}
            </span>
          )}

          {aircraft.openSquawks > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-red-400">
              <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" />
                <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" />
              </svg>
              {aircraft.openSquawks} squawk{aircraft.openSquawks !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  filter,
  search,
  canAddAircraft,
}: {
  filter: AircraftStatusFilter;
  search: string;
  canAddAircraft: boolean;
}) {
  let heading: string;
  let body: string;

  if (search.trim() !== "") {
    heading = `No aircraft matching "${search}"`;
    body = "Try searching by tail number, make/model, or owner name.";
  } else {
    switch (filter) {
      case "airworthy":
        heading = "No airworthy aircraft";
        body = "All aircraft in the fleet currently have maintenance in progress or are out of service.";
        break;
      case "in_maintenance":
        heading = "No aircraft in maintenance";
        body = "No aircraft have open work orders right now.";
        break;
      case "out_of_service":
        heading = "No aircraft out of service";
        body = "All tracked aircraft are currently airworthy or in scheduled maintenance.";
        break;
      default:
        heading = "No aircraft in fleet";
        body = "Add the first aircraft to start tracking maintenance records.";
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-[8px] border border-[#363D4E] border-dashed bg-[#1A1E28] px-8 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      {/* Airplane icon */}
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
        <path d="M6 26l8-2 12 14 4-2-6-14 8-2 2-4-8-2-4-10-4 2 2 10-8 2 2 8z" />
      </svg>

      <h3 className="text-[16px] font-semibold text-gray-300 mb-2">{heading}</h3>
      <p className="text-[14px] text-gray-500 max-w-sm leading-relaxed">{body}</p>

      {canAddAircraft && filter === "all" && search === "" && (
        <Link
          href="/aircraft/new"
          className={cn(
            "mt-6 inline-flex items-center gap-2 px-5 h-11 rounded-[6px]",
            "bg-blue-600 hover:bg-blue-700",
            "text-white text-[14px] font-semibold uppercase tracking-[0.04em]",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          )}
        >
          <svg aria-hidden className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Add Aircraft
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AircraftListPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<AircraftStatusFilter>("all");
  const { isAtLeast, isLoaded } = useOrgRole();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const canAddAircraft = isLoaded && isAtLeast("dom");

  // Derive query args
  const filterTab = STATUS_TABS.find((t) => t.id === activeFilter)!;
  const queryArgs = {
    search: search.trim() !== "" ? search.trim() : undefined,
    statuses:
      filterTab.apiStatuses.length > 0 ? filterTab.apiStatuses : undefined,
  };

  const aircraft = useQuery(
    api.aircraft?.list ?? null,
    queryArgs,
  ) as AircraftListItem[] | undefined;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handleClearSearch = useCallback(() => {
    setSearch("");
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 px-4 pt-6 pb-2 sm:px-6">
        <h1 className="text-[24px] font-semibold text-gray-100 leading-tight">
          Fleet
        </h1>

        {/* Add aircraft button — DOM only */}
        {canAddAircraft && (
          <Link
            href="/aircraft/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 h-10 rounded-[6px]",
              "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
              "text-white text-[14px] font-semibold uppercase tracking-[0.04em]",
              "transition-colors duration-100 shrink-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
            )}
            aria-label="Add new aircraft to fleet"
          >
            <svg aria-hidden className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            <span className="hidden sm:inline">Add Aircraft</span>
            <span className="sm:hidden">Add</span>
          </Link>
        )}
      </div>

      {/* ── Search bar ── */}
      <div className="px-4 pt-3 pb-2 sm:px-6">
        <div className="relative">
          {/* Search icon */}
          <svg
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14" y2="14" />
          </svg>

          <input
            ref={searchInputRef}
            type="search"
            inputMode="text"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by tail number, make/model, or owner…"
            className={cn(
              "w-full h-11 pl-9 pr-9 rounded-[6px]",
              "border border-[#363D4E] bg-[#1A1E28]",
              "text-[14px] text-gray-200 placeholder:text-gray-600",
              "focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
              "transition-colors duration-100",
            )}
            aria-label="Search aircraft"
          />

          {/* Clear button */}
          {search !== "" && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <svg aria-hidden className="w-3.5 h-3.5" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <line x1="1" y1="1" x2="7" y2="7" />
                <line x1="7" y1="1" x2="1" y2="7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Filter fleet by aircraft status"
          className="flex items-center gap-1 overflow-x-auto border-b border-[#363D4E] pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeFilter === tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "shrink-0 px-4 h-11 text-[14px] font-medium whitespace-nowrap",
                "border-b-2 -mb-px transition-colors duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                activeFilter === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Aircraft list ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-8 sm:px-6"
        role="main"
        aria-label="Fleet aircraft list"
      >
        {/* Loading */}
        {aircraft === undefined && <AircraftListSkeleton />}

        {/* Empty state */}
        {aircraft !== undefined && aircraft.length === 0 && (
          <EmptyState
            filter={activeFilter}
            search={search}
            canAddAircraft={canAddAircraft}
          />
        )}

        {/* Aircraft cards */}
        {aircraft !== undefined && aircraft.length > 0 && (
          <>
            {/* Result count */}
            <p className="text-[12px] text-gray-600 mb-3">
              {aircraft.length} aircraft
              {search.trim() !== "" && (
                <span> matching &ldquo;{search}&rdquo;</span>
              )}
            </p>

            <ul className="flex flex-col gap-3" aria-label={`${aircraft.length} aircraft`}>
              {aircraft.map((ac) => (
                <li key={ac._id}>
                  <AircraftCard aircraft={ac} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
