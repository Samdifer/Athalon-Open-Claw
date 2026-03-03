"use client";

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Briefcase, Shield, Calendar, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { WorkloadEntry } from "./shared/rosterConstants";
import { PersonnelRosterTab } from "./tabs/PersonnelRosterTab";
import { PersonnelTeamsShiftsTab } from "./tabs/PersonnelTeamsShiftsTab";
import { PersonnelRolesTab } from "./tabs/PersonnelRolesTab";
import { PersonnelHolidaysTab } from "./tabs/PersonnelHolidaysTab";
import { PersonnelAnalysisTab } from "./tabs/PersonnelAnalysisTab";

// ─── Valid tab keys ──────────────────────────────────────────────────────────

const TAB_KEYS = ["roster", "teams-shifts", "roles", "holidays", "analysis"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isValidTab(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey);
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function PersonnelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─── Main orchestrator ───────────────────────────────────────────────────────

export function PersonnelCommandTabs() {
  const { orgId } = useCurrentOrg();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = isValidTab(tabParam) ? tabParam : "roster";

  function handleTabChange(value: string) {
    if (value === "roster") {
      // Default tab — remove param for clean URL
      setSearchParams((prev) => {
        prev.delete("tab");
        return prev;
      });
    } else {
      setSearchParams((prev) => {
        prev.set("tab", value);
        return prev;
      });
    }
  }

  // ── Convex queries (owned at this level, passed down as props) ──────────

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const workloadList = useQuery(
    api.capacity.getTechnicianWorkload,
    orgId ? { organizationId: orgId } : "skip",
  );

  const rosterWorkspace = useQuery(
    api.schedulerRoster.getRosterWorkspace,
    orgId
      ? { organizationId: orgId, shopLocationId: "all", dateMode: "today" }
      : "skip",
  );

  const myRole = useQuery(
    api.roles.getMyRole,
    orgId ? { organizationId: orgId } : "skip",
  );

  // ── Derived data ───────────────────────────────────────────────────────────

  const isLoading = technicians === undefined;

  const canManageRoster = new Set([
    "admin",
    "shop_manager",
    "lead_technician",
  ]).has(myRole ?? "");

  const canManageRoles = myRole === "admin";

  const workloadMap = useMemo(
    () =>
      new Map<string, WorkloadEntry>(
        (workloadList ?? []).map((w) => [w.technicianId, w]),
      ),
    [workloadList],
  );

  const rosterTeams = useMemo(
    () =>
      (rosterWorkspace?.teams ?? []).map((t) => ({
        teamId: t.teamId,
        name: t.name,
      })),
    [rosterWorkspace],
  );

  const expiringCount = (expiringCerts ?? []).length;

  // ── Subtitle ───────────────────────────────────────────────────────────────

  const subtitle = isLoading ? null : (
    <>
      {(technicians?.length ?? 0)} team member
      {(technicians?.length ?? 0) !== 1 ? "s" : ""}
      {expiringCount > 0 && (
        <span className="text-amber-600 dark:text-amber-400 font-medium">
          {" "}&middot; {expiringCount} certificate
          {expiringCount !== 1 ? "s" : ""} expiring soon
        </span>
      )}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          Personnel Command
        </h1>
        <span className="block text-sm text-muted-foreground mt-0.5">
          {isLoading ? <Skeleton className="h-3 w-48 inline-block" /> : subtitle}
        </span>
      </div>

      {/* Tabs */}
      {isLoading ? (
        <PersonnelSkeleton />
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="roster" data-testid="personnel-tab-roster">
              <Users className="h-3.5 w-3.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="teams-shifts" data-testid="personnel-tab-teams-shifts">
              <Briefcase className="h-3.5 w-3.5" />
              Teams &amp; Shifts
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="personnel-tab-roles">
              <Shield className="h-3.5 w-3.5" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="holidays" data-testid="personnel-tab-holidays">
              <Calendar className="h-3.5 w-3.5" />
              Holidays
            </TabsTrigger>
            <TabsTrigger value="analysis" data-testid="personnel-tab-analysis">
              <BarChart3 className="h-3.5 w-3.5" />
              Analysis
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Roster ───────────────────────────────────────────── */}
          <TabsContent value="roster" className="mt-4">
            <PersonnelRosterTab
              technicians={technicians ?? []}
              expiringCerts={expiringCerts ?? []}
              workloadMap={workloadMap}
              rosterTeams={rosterTeams}
              canManageRoster={canManageRoster}
              orgId={orgId as string | null}
            />
          </TabsContent>

          {/* ── Tab 2: Teams & Shifts ───────────────────────────────────── */}
          <TabsContent value="teams-shifts" className="mt-4">
            <PersonnelTeamsShiftsTab
              teams={(rosterWorkspace?.teams ?? []).map((t) => ({
                teamId: t.teamId,
                name: t.name,
                colorToken: t.colorToken,
                shiftId: t.shiftId ?? "",
                shiftName: t.shiftName,
                memberCount: t.memberCount,
                onShiftCount: t.onShiftCount,
                hasSupervisorCoverage: t.hasSupervisorCoverage,
                isUnsupervised: t.isUnsupervised,
              }))}
              shifts={(rosterWorkspace?.shifts ?? []).map((s) => ({
                shiftId: s.shiftId,
                name: s.name,
                daysOfWeek: s.daysOfWeek,
                startHour: s.startHour,
                endHour: s.endHour,
                efficiencyMultiplier: s.efficiencyMultiplier,
                teamCount: s.teamCount,
                sortOrder: s.sortOrder,
              }))}
              rosterWorkspaceEnabled={
                rosterWorkspace?.feature?.rosterWorkspaceEnabled ?? false
              }
              canManage={canManageRoster}
              orgId={orgId as string | null}
            />
          </TabsContent>

          {/* ── Tab 3: Roles ────────────────────────────────────────────── */}
          <TabsContent value="roles" className="mt-4">
            <PersonnelRolesTab
              technicians={technicians ?? []}
              canManageRoles={canManageRoles}
              orgId={orgId as string | null}
            />
          </TabsContent>

          {/* ── Tab 4: Holidays ─────────────────────────────────────────── */}
          <TabsContent value="holidays" className="mt-4">
            <PersonnelHolidaysTab
              holidays={(rosterWorkspace?.holidays ?? []).map((h) => ({
                _id: h._id,
                dateKey: h.dateKey,
                name: h.name,
                isObserved: h.isObserved,
                notes: h.notes,
              }))}
              canManage={canManageRoster}
              orgId={orgId as string | null}
            />
          </TabsContent>

          {/* ── Tab 5: Analysis ─────────────────────────────────────────── */}
          <TabsContent value="analysis" className="mt-4">
            <PersonnelAnalysisTab
              analysis={rosterWorkspace?.analysis ?? null}
              teams={(rosterWorkspace?.teams ?? []).map((t) => ({
                teamId: t.teamId,
                name: t.name,
                colorToken: t.colorToken,
                memberCount: t.memberCount,
                onShiftCount: t.onShiftCount,
                hasSupervisorCoverage: t.hasSupervisorCoverage,
                isUnsupervised: t.isUnsupervised,
              }))}
              expiringCertsCount={expiringCount}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
