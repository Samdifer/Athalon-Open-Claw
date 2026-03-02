"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  type UIEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { GanttBoard } from "./_components/GanttBoard";
import { BacklogSidebar } from "./_components/BacklogSidebar";
import { GraveyardSidebar } from "./_components/GraveyardSidebar";
import DailyFinancialTracker, {
  type DailyFinancialPoint,
} from "./_components/DailyFinancialTracker";
import CapacityForecaster, { type CapacityPoint } from "./_components/CapacityForecaster";
import SchedulingAnalyticsPanel from "./_components/SchedulingAnalyticsPanel";
import SchedulingRosterPanel from "./_components/SchedulingRosterPanel";
import { SchedulingCommandCenterDialog } from "./_components/SchedulingCommandCenterDialog";
import { SchedulingOnboardingPanel } from "./_components/SchedulingOnboardingPanel";
import { SchedulingQuoteWorkspaceDialog } from "./_components/SchedulingQuoteWorkspaceDialog";
import DraggableWindow from "./_components/DraggableWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Archive,
  Ban,
  BarChart3,
  Command,
  Edit,
  FileText,
  ListChecks,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { autoSchedule } from "@/lib/scheduling/autoSchedule";
import { magicSchedule } from "@/lib/scheduling/magicSchedule";
import { detectConflicts } from "@/lib/scheduling/conflicts";
import type { ScheduledWO } from "@/lib/scheduling/conflicts";
import {
  applyDistributeStep,
  buildNormalizedDayModel,
  toDailyEffortRows,
  toggleBlockedDay,
} from "@/lib/scheduling/dayModel";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function GanttSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
        <Skeleton className="h-7 w-40 rounded-md" />
        <Skeleton className="h-4 w-px" />
        <Skeleton className="h-4 w-44" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 flex-shrink-0 border-r border-border/40 space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-center px-3 border-b border-border/30"
              style={{ height: 48 }}
            >
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative border-b border-border/30 px-3 flex items-center"
              style={{ height: 48 }}
            >
              <Skeleton
                className="h-7 rounded"
                style={{
                  width: `${Math.floor(Math.random() * 200) + 80}px`,
                  marginLeft: `${i * 30}px`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMELINE_DAYS = 120;
const SCHEDULING_ONBOARDING_STORAGE_VERSION = 1;

type SchedulingOnboardingRecord = {
  version: number;
  seenAt: number;
  skippedAt?: number;
  completedAt?: number;
  defaultsAppliedAt?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationFilter = useMemo(
    () =>
      selectedLocationId === "all"
        ? "all"
        : (selectedLocationId as Id<"shopLocations">),
    [selectedLocationId],
  );
  const selectedShopLocationIdForMutations =
    selectedLocationId === "all"
      ? undefined
      : (selectedLocationId as Id<"shopLocations">);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [quoteWorkspaceOpen, setQuoteWorkspaceOpen] = useState(false);
  const [onboardingSetupOpen, setOnboardingSetupOpen] = useState(false);
  const [onboardingRecord, setOnboardingRecord] = useState<SchedulingOnboardingRecord | null>(
    null,
  );
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicRunning, setMagicRunning] = useState(false);
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [scheduleEditTool, setScheduleEditTool] = useState<"distribute" | "block">(
    "distribute",
  );
  const [magicSelectionMode, setMagicSelectionMode] = useState(false);
  const [magicSelectedIds, setMagicSelectedIds] = useState<string[]>([]);
  const [magicPriorityOrder, setMagicPriorityOrder] = useState<string[]>([]);
  const [magicResults, setMagicResults] = useState<
    Array<{
      workOrderId: string;
      workOrderNumber: string;
      oldEndDate: number | null;
      newEndDate: number;
      bayId: string;
    }>
  >([]);
  const [pnlOpen, setPnlOpen] = useState(true);
  const [capacityOpen, setCapacityOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [pnlPopout, setPnlPopout] = useState(false);
  const [capacityPopout, setCapacityPopout] = useState(false);
  const [analyticsPopout, setAnalyticsPopout] = useState(false);
  const [rosterPopout, setRosterPopout] = useState(false);
  const [panelHeights, setPanelHeights] = useState({
    pnl: 208,
    capacity: 176,
    analytics: 176,
  });
  const [rosterWidth, setRosterWidth] = useState(320);
  const [resizingPanel, setResizingPanel] = useState<{
    target: "pnl" | "capacity" | "analytics";
    startY: number;
    startHeight: number;
  } | null>(null);
  const [resizingRoster, setResizingRoster] = useState<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const [timelineConfig, setTimelineConfig] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      timelineStartMs: today.getTime() - 30 * DAY_MS,
      totalDays: DEFAULT_TIMELINE_DAYS,
      cellWidth: 40,
      todayIndex: 30,
    };
  });
  const isFullscreen = searchParams.get("view") === "fullscreen";

  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const trackerScrollRef = useRef<HTMLDivElement>(null);
  const capacityScrollRef = useRef<HTMLDivElement>(null);

  const data = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId
      ? { organizationId: orgId, shopLocationId: selectedShopLocationFilter }
      : "skip",
  );

  const bays = useQuery(
    api.hangarBays.listBays,
    orgId
      ? { organizationId: orgId, shopLocationId: selectedShopLocationFilter }
      : "skip",
  );

  const plannerProjects = useQuery(
    api.schedulerPlanning.listPlannerProjects,
    orgId
      ? {
          organizationId: orgId,
          includeArchived: true,
          shopLocationId: selectedShopLocationFilter,
        }
      : "skip",
  );
  const technicianWorkload = useQuery(
    api.capacity.getTechnicianWorkload,
    orgId
      ? { organizationId: orgId, shopLocationId: selectedShopLocationFilter }
      : "skip",
  );
  const planningFinancialSettings = useQuery(
    api.schedulerPlanning.getPlanningFinancialSettings,
    orgId ? { organizationId: orgId } : "skip",
  );
  const schedulingSettings = useQuery(
    api.capacity.getSchedulingSettings,
    orgId ? { organizationId: orgId } : "skip",
  );

  const upsertScheduleAssignment = useMutation(api.schedulerPlanning.upsertScheduleAssignment);
  const reorderBays = useMutation(api.hangarBays.reorderBays);
  const archiveScheduleAssignment = useMutation(
    api.schedulerPlanning.archiveScheduleAssignment,
  );
  const restoreScheduleAssignment = useMutation(
    api.schedulerPlanning.restoreScheduleAssignment,
  );
  const setScheduleDayModel = useMutation(api.schedulerPlanning.setScheduleDayModel);
  const upsertPlanningFinancialSettings = useMutation(
    api.schedulerPlanning.upsertPlanningFinancialSettings,
  );
  const upsertSchedulingSettings = useMutation(api.capacity.upsertSchedulingSettings);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      data === undefined ||
      bays === undefined ||
      plannerProjects === undefined ||
      technicianWorkload === undefined ||
      planningFinancialSettings === undefined ||
      schedulingSettings === undefined,
  });

  const workOrders = data ?? [];
  const allPlannerProjects = plannerProjects ?? [];
  const scheduledProjects = useMemo(
    () => allPlannerProjects.filter((project) => project.archivedAt === undefined),
    [allPlannerProjects],
  );
  const archivedProjects = useMemo(
    () => allPlannerProjects.filter((project) => project.archivedAt !== undefined),
    [allPlannerProjects],
  );

  const scheduledWoIds = useMemo(
    () => new Set(scheduledProjects.map((p) => p.workOrderId as string)),
    [scheduledProjects],
  );

  const unscheduledWorkOrders = useMemo(
    () =>
      workOrders.filter((wo) => {
        if (["closed", "cancelled", "voided"].includes(wo.status)) return false;
        return !scheduledWoIds.has(wo._id);
      }),
    [workOrders, scheduledWoIds],
  );

  const unscheduledCount = unscheduledWorkOrders.length;

  const magicCandidates = useMemo(
    () =>
      workOrders.filter(
        (wo) => !["closed", "cancelled", "voided"].includes(wo.status),
      ),
    [workOrders],
  );

  const quoteWorkspaceWorkOrders = useMemo(
    () =>
      workOrders
        .filter((wo) => !["closed", "cancelled", "voided"].includes(wo.status))
        .sort((a, b) => {
          const priorityWeight = (priority: "routine" | "urgent" | "aog") => {
            if (priority === "aog") return 0;
            if (priority === "urgent") return 1;
            return 2;
          };
          return (
            priorityWeight(a.priority) - priorityWeight(b.priority) ||
            a.workOrderNumber.localeCompare(b.workOrderNumber)
          );
        })
        .map((wo) => ({
          _id: String(wo._id),
          workOrderNumber: wo.workOrderNumber,
          description: wo.description,
          priority: wo.priority,
          aircraft: wo.aircraft,
          sourceQuoteId: wo.sourceQuoteId,
          quoteNumber: wo.quoteNumber,
          quoteStatus: wo.quoteStatus,
        })),
    [workOrders],
  );

  const initialQuoteWorkspaceWorkOrderId = useMemo(
    () => magicSelectedIds[0] ?? quoteWorkspaceWorkOrders[0]?._id,
    [magicSelectedIds, quoteWorkspaceWorkOrders],
  );

  const onboardingStorageKey = useMemo(() => {
    if (!orgId || !techId) return null;
    return `athelon:scheduling:onboarding:v${SCHEDULING_ONBOARDING_STORAGE_VERSION}:${orgId}:${techId}`;
  }, [orgId, techId]);

  const persistOnboardingRecord = useCallback(
    (patch: Partial<SchedulingOnboardingRecord>) => {
      if (!onboardingStorageKey || typeof window === "undefined") return;
      setOnboardingRecord((prev) => {
        const base: SchedulingOnboardingRecord = prev ?? {
          version: SCHEDULING_ONBOARDING_STORAGE_VERSION,
          seenAt: Date.now(),
        };
        const next: SchedulingOnboardingRecord = {
          ...base,
          ...patch,
          version: SCHEDULING_ONBOARDING_STORAGE_VERSION,
        };
        window.localStorage.setItem(onboardingStorageKey, JSON.stringify(next));
        return next;
      });
    },
    [onboardingStorageKey],
  );

  const markOnboardingSkipped = useCallback(() => {
    const now = Date.now();
    persistOnboardingRecord({
      skippedAt: now,
      completedAt: undefined,
    });
    setOnboardingSetupOpen(false);
    toast.info("Scheduling onboarding skipped for now");
  }, [persistOnboardingRecord]);

  const markOnboardingCompleted = useCallback(() => {
    const now = Date.now();
    persistOnboardingRecord({
      completedAt: now,
      skippedAt: undefined,
    });
    setOnboardingSetupOpen(false);
    toast.success("Scheduling onboarding complete");
  }, [persistOnboardingRecord]);

  useEffect(() => {
    const candidateIds = new Set(magicCandidates.map((wo) => String(wo._id)));
    setMagicSelectedIds((prev) => {
      const filtered = prev.filter((id) => candidateIds.has(id));
      if (filtered.length === prev.length && filtered.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return filtered;
    });
    setMagicPriorityOrder((prev) => {
      const filtered = prev.filter((id) => candidateIds.has(id));
      if (filtered.length === prev.length && filtered.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return filtered;
    });
  }, [magicCandidates]);

  useEffect(() => {
    if (!onboardingStorageKey || typeof window === "undefined") {
      setOnboardingRecord(null);
      return;
    }

    const raw = window.localStorage.getItem(onboardingStorageKey);
    const now = Date.now();
    let next: SchedulingOnboardingRecord | null = null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SchedulingOnboardingRecord;
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          typeof parsed.seenAt === "number" &&
          parsed.version === SCHEDULING_ONBOARDING_STORAGE_VERSION
        ) {
          next = parsed;
        }
      } catch {
        next = null;
      }
    }

    if (!next) {
      next = {
        version: SCHEDULING_ONBOARDING_STORAGE_VERSION,
        seenAt: now,
      };
      window.localStorage.setItem(onboardingStorageKey, JSON.stringify(next));
    }

    setOnboardingRecord(next);
  }, [onboardingStorageKey]);

  useEffect(() => {
    if (onboardingRecord?.completedAt || onboardingRecord?.skippedAt) {
      setOnboardingSetupOpen(false);
    }
  }, [onboardingRecord]);

  // ── Conflict detection ────────────────────────────────────────────────
  const conflicts = useMemo(() => {
    const scheduled: ScheduledWO[] = scheduledProjects.map((wo) => ({
      woId: wo.workOrderId,
      workOrderNumber: wo.workOrderNumber,
      bayId: wo.hangarBayId,
      startDate: wo.scheduledStartDate,
      endDate: wo.promisedDeliveryDate,
      promisedDeliveryDate: wo.promisedDeliveryDate,
    }));
    return detectConflicts(scheduled);
  }, [scheduledProjects]);

  useEffect(() => {
    if (!resizingPanel) return;
    const activeResize = resizingPanel;

    function handleMouseMove(e: MouseEvent) {
      const delta = activeResize.startY - e.clientY;
      const nextHeight = Math.max(100, Math.min(600, activeResize.startHeight + delta));
      setPanelHeights((prev) => ({ ...prev, [activeResize.target]: nextHeight }));
    }

    function handleMouseUp() {
      setResizingPanel(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingPanel]);

  useEffect(() => {
    if (!resizingRoster) return;
    const activeResize = resizingRoster;

    function handleMouseMove(e: MouseEvent) {
      const delta = activeResize.startX - e.clientX;
      const nextWidth = Math.max(220, Math.min(560, activeResize.startWidth + delta));
      setRosterWidth(nextWidth);
    }

    function handleMouseUp() {
      setResizingRoster(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingRoster]);

  const syncTimelineScroll = useCallback((scrollLeft: number) => {
    const refs = [ganttScrollRef, trackerScrollRef, capacityScrollRef];
    for (const ref of refs) {
      const node = ref.current;
      if (!node) continue;
      if (Math.abs(node.scrollLeft - scrollLeft) > 1) {
        node.scrollLeft = scrollLeft;
      }
    }
  }, []);

  const handleTimelineScroll = useCallback(
    (scrollLeft: number) => {
      syncTimelineScroll(scrollLeft);
    },
    [syncTimelineScroll],
  );

  const handlePanelTimelineScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      syncTimelineScroll(e.currentTarget.scrollLeft);
    },
    [syncTimelineScroll],
  );

  useEffect(() => {
    if (!ganttScrollRef.current) return;
    syncTimelineScroll(ganttScrollRef.current.scrollLeft);
  }, [timelineConfig, pnlPopout, capacityPopout, analyticsPopout, syncTimelineScroll]);

  const startPanelResize = useCallback(
    (e: ReactMouseEvent, target: "pnl" | "capacity" | "analytics") => {
      e.preventDefault();
      e.stopPropagation();
      setResizingPanel({
        target,
        startY: e.clientY,
        startHeight: panelHeights[target],
      });
    },
    [panelHeights],
  );

  const startRosterResize = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRoster({
      startX: e.clientX,
      startWidth: rosterWidth,
    });
  }, [rosterWidth]);

  const timelineStartMs = timelineConfig.timelineStartMs;
  const timelineTotalDays = Math.max(1, timelineConfig.totalDays);
  const timelineCellWidth = Math.max(4, timelineConfig.cellWidth);
  const currentTimelineDay = Math.max(0, Math.min(timelineConfig.todayIndex, timelineTotalDays - 1));

  const workOrderMap = useMemo(
    () => new Map(workOrders.map((wo) => [String(wo._id), wo])),
    [workOrders],
  );

  // Map bay ID → human-readable bay name (used in Magic Scheduler results)
  const bayNameMap = useMemo(
    () => new Map((bays ?? []).map((b) => [String(b._id), b.name])),
    [bays],
  );

  const planningRates = useMemo(() => {
    return {
      defaultShopRate: planningFinancialSettings?.defaultShopRate ?? 125,
      defaultLaborCostRate: planningFinancialSettings?.defaultLaborCostRate ?? 52,
      monthlyFixedOverhead: planningFinancialSettings?.monthlyFixedOverhead ?? 38000,
      monthlyVariableOverhead: planningFinancialSettings?.monthlyVariableOverhead ?? 12000,
      annualCapexAssumption: planningFinancialSettings?.annualCapexAssumption ?? 120000,
    };
  }, [planningFinancialSettings]);

  const laborProfiles = useMemo(() => {
    const dailyCapacityProfile = new Float32Array(7);
    const dailyLaborCostProfile = new Float32Array(7);
    const laborRate = planningRates.defaultLaborCostRate;

    for (const tech of technicianWorkload ?? []) {
      const shiftDays = tech.daysOfWeek ?? [];
      const shiftHours = Math.max(0, (tech.endHour ?? 0) - (tech.startHour ?? 0));
      const efficiency = tech.efficiencyMultiplier ?? 1;
      const productiveHours = shiftHours * efficiency;

      for (const dayIndex of shiftDays) {
        if (dayIndex < 0 || dayIndex > 6) continue;
        dailyCapacityProfile[dayIndex] += productiveHours;
        dailyLaborCostProfile[dayIndex] += shiftHours * laborRate;
      }
    }

    return { dailyCapacityProfile, dailyLaborCostProfile };
  }, [technicianWorkload, planningRates.defaultLaborCostRate]);

  const dailyCapacityData = useMemo<CapacityPoint[]>(() => {
    const loadHours = new Float32Array(timelineTotalDays);
    const capacityHours = new Float32Array(timelineTotalDays);

    for (let i = 0; i < timelineTotalDays; i++) {
      const date = new Date(timelineStartMs + i * DAY_MS);
      const dayOfWeek = date.getDay();
      capacityHours[i] = laborProfiles.dailyCapacityProfile[dayOfWeek] ?? 0;
    }

    for (const project of scheduledProjects) {
      if (["cancelled", "voided"].includes(project.workOrderStatus)) continue;

      const wo = workOrderMap.get(String(project.workOrderId));
      const totalHours = Math.max(
        0,
        wo?.remainingHours ?? wo?.effectiveEstimatedHours ?? 0,
      );

      const start = Math.floor((project.scheduledStartDate - timelineStartMs) / DAY_MS);
      const durationDays = Math.max(
        1,
        Math.ceil((project.promisedDeliveryDate - project.scheduledStartDate) / DAY_MS),
      );
      const end = start + durationDays;

      const effortByOffset = new Map<number, number>();
      for (const point of project.dailyEffort ?? []) {
        effortByOffset.set(point.dayOffset, Math.max(0, point.effortHours));
      }

      const nonWorkDays = new Set(project.nonWorkDays ?? []);
      const weights = new Array(durationDays).fill(1);
      let totalWeight = 0;
      for (let i = 0; i < durationDays; i++) {
        if (nonWorkDays.has(i)) {
          weights[i] = 0;
        } else if (effortByOffset.has(i)) {
          weights[i] = effortByOffset.get(i)!;
        }
        totalWeight += weights[i];
      }
      if (totalWeight <= 0) continue;

      const loopStart = Math.max(0, start);
      const loopEnd = Math.min(timelineTotalDays, end);
      for (let d = loopStart; d < loopEnd; d++) {
        const offset = d - start;
        const ratio = weights[offset] / totalWeight;
        loadHours[d] += ratio * totalHours;
      }
    }

    const points: CapacityPoint[] = new Array(timelineTotalDays);
    for (let i = 0; i < timelineTotalDays; i++) {
      const cap = capacityHours[i];
      const load = loadHours[i];
      points[i] = {
        day: i,
        capacity: cap,
        load,
        utilization: cap > 0 ? (load / cap) * 100 : load > 0 ? 100 : 0,
      };
    }

    return points;
  }, [
    timelineTotalDays,
    timelineStartMs,
    planningRates,
    laborProfiles,
    scheduledProjects,
    workOrderMap,
  ]);

  const dailyFinancialData = useMemo<DailyFinancialPoint[]>(() => {
    const loadByDay = new Float32Array(timelineTotalDays);
    const incomeByDay = new Float32Array(timelineTotalDays);
    const capacityByDay = new Float32Array(timelineTotalDays);
    const baseSpendByDay = new Float32Array(timelineTotalDays);

    const monthlyOverhead =
      planningRates.monthlyFixedOverhead +
      planningRates.monthlyVariableOverhead +
      planningRates.annualCapexAssumption / 12;
    const dailyOverhead = monthlyOverhead / 30;

    for (let i = 0; i < timelineTotalDays; i++) {
      const date = new Date(timelineStartMs + i * DAY_MS);
      const dayOfWeek = date.getDay();
      capacityByDay[i] = laborProfiles.dailyCapacityProfile[dayOfWeek] ?? 0;
      baseSpendByDay[i] =
        dailyOverhead + (laborProfiles.dailyLaborCostProfile[dayOfWeek] ?? 0);
    }

    for (const project of scheduledProjects) {
      if (["cancelled", "voided"].includes(project.workOrderStatus)) continue;

      const wo = workOrderMap.get(String(project.workOrderId));
      const totalHours = Math.max(
        0,
        wo?.remainingHours ?? wo?.effectiveEstimatedHours ?? 0,
      );
      const totalRevenue =
        (project.quoteTotal ?? 0) > 0
          ? Number(project.quoteTotal ?? 0)
          : totalHours * planningRates.defaultShopRate;

      const start = Math.floor((project.scheduledStartDate - timelineStartMs) / DAY_MS);
      const durationDays = Math.max(
        1,
        Math.ceil((project.promisedDeliveryDate - project.scheduledStartDate) / DAY_MS),
      );
      const end = start + durationDays;

      const effortByOffset = new Map<number, number>();
      for (const point of project.dailyEffort ?? []) {
        effortByOffset.set(point.dayOffset, Math.max(0, point.effortHours));
      }

      const nonWorkDays = new Set(project.nonWorkDays ?? []);
      const weights = new Array(durationDays).fill(1);
      let totalWeight = 0;
      for (let i = 0; i < durationDays; i++) {
        if (nonWorkDays.has(i)) {
          weights[i] = 0;
        } else if (effortByOffset.has(i)) {
          weights[i] = effortByOffset.get(i)!;
        }
        totalWeight += weights[i];
      }
      if (totalWeight <= 0) continue;

      const loopStart = Math.max(0, start);
      const loopEnd = Math.min(timelineTotalDays, end);
      for (let d = loopStart; d < loopEnd; d++) {
        const offset = d - start;
        const ratio = weights[offset] / totalWeight;
        loadByDay[d] += ratio * totalHours;
        incomeByDay[d] += ratio * totalRevenue;
      }
    }

    const points: DailyFinancialPoint[] = new Array(timelineTotalDays);
    const netHistory: number[] = [];
    const laborRate = planningRates.defaultLaborCostRate;

    for (let i = 0; i < timelineTotalDays; i++) {
      const cap = capacityByDay[i];
      const load = loadByDay[i];
      const otHours = load > cap ? load - cap : 0;
      const otCost = otHours * laborRate * 1.5;

      const totalSpend = baseSpendByDay[i] + otCost;
      const net = incomeByDay[i] - totalSpend;

      let netStandard = net;
      let netOvertime = 0;
      if (net > 0 && load > 0 && otHours > 0) {
        const otRatio = otHours / load;
        netOvertime = net * otRatio;
        netStandard = net - netOvertime;
      }

      netHistory.push(net);
      if (netHistory.length > 7) netHistory.shift();
      const trend = netHistory.reduce((sum, val) => sum + val, 0) / netHistory.length;

      points[i] = {
        day: i,
        income: incomeByDay[i],
        spend: totalSpend,
        net,
        netStandard,
        netOvertime,
        trend,
        baseSpend: baseSpendByDay[i],
        otCost,
        otHours,
        capacity: cap,
        load,
        otPercent: cap > 0 ? (otHours / cap) * 100 : load > 0 ? 100 : 0,
      };
    }

    return points;
  }, [
    timelineTotalDays,
    timelineStartMs,
    planningRates,
    laborProfiles,
    scheduledProjects,
    workOrderMap,
  ]);

  const analyticsMetrics = useMemo(() => {
    const quoteLinkedCount = scheduledProjects.filter((project) => !!project.sourceQuoteId).length;
    const quoteCoveragePercent =
      scheduledProjects.length > 0 ? (quoteLinkedCount / scheduledProjects.length) * 100 : 0;

    let utilizationTotal = 0;
    let utilizationDays = 0;
    let utilizationPeak = 0;
    for (const point of dailyCapacityData) {
      if (point.capacity > 0) {
        utilizationTotal += point.utilization;
        utilizationDays++;
      }
      if (point.utilization > utilizationPeak) {
        utilizationPeak = point.utilization;
      }
    }

    const projectedNet = dailyFinancialData.reduce((sum, point) => sum + point.net, 0);
    const overtimeHours = dailyFinancialData.reduce((sum, point) => sum + point.otHours, 0);
    const overtimeCost = dailyFinancialData.reduce((sum, point) => sum + point.otCost, 0);

    return {
      scheduledCount: scheduledProjects.length,
      unscheduledCount,
      conflictsCount: conflicts.length,
      quoteCoveragePercent,
      avgUtilization: utilizationDays > 0 ? utilizationTotal / utilizationDays : 0,
      peakUtilization: utilizationPeak,
      projectedNet,
      overtimeHours,
      overtimeCost,
    };
  }, [scheduledProjects, unscheduledCount, conflicts, dailyCapacityData, dailyFinancialData]);

  const rosterTechnicians = useMemo(
    () =>
      (technicianWorkload ?? []).map((tech) => ({
        technicianId: String(tech.technicianId),
        name: tech.name,
        employeeId: tech.employeeId,
        daysOfWeek: tech.daysOfWeek,
        startHour: tech.startHour,
        endHour: tech.endHour,
        efficiencyMultiplier: tech.efficiencyMultiplier,
        usingDefaultShift: tech.usingDefaultShift,
        assignedActiveCards: tech.assignedActiveCards,
        estimatedRemainingHours: tech.estimatedRemainingHours,
      })),
    [technicianWorkload],
  );

  const commandCenterRosterSummary = useMemo(
    () => ({
      activeTechnicians: rosterTechnicians.length,
      assignedCards: rosterTechnicians.reduce((sum, tech) => sum + tech.assignedActiveCards, 0),
      remainingHours: rosterTechnicians.reduce(
        (sum, tech) => sum + tech.estimatedRemainingHours,
        0,
      ),
    }),
    [rosterTechnicians],
  );

  const commandCenterConfigSummary = useMemo(
    () => ({
      baysCount: (bays ?? []).length,
      scheduledCount: scheduledProjects.length,
      unscheduledCount,
      conflictsCount: conflicts.length,
    }),
    [bays, scheduledProjects.length, unscheduledCount, conflicts.length],
  );

  const commandCenterFinancialSummary = useMemo(
    () => ({
      defaultShopRate: planningRates.defaultShopRate,
      defaultLaborCostRate: planningRates.defaultLaborCostRate,
      monthlyFixedOverhead: planningRates.monthlyFixedOverhead,
      monthlyVariableOverhead: planningRates.monthlyVariableOverhead,
      annualCapexAssumption: planningRates.annualCapexAssumption,
    }),
    [planningRates],
  );

  const commandCenterSchedulingSettings = useMemo(
    () => ({
      capacityBufferPercent: schedulingSettings?.capacityBufferPercent ?? 15,
      defaultStartHour: schedulingSettings?.defaultStartHour ?? 7,
      defaultEndHour: schedulingSettings?.defaultEndHour ?? 17,
      defaultEfficiencyMultiplier: schedulingSettings?.defaultEfficiencyMultiplier ?? 1,
    }),
    [schedulingSettings],
  );

  const onboardingDefaults = useMemo(
    () => ({
      capacityBufferPercent: schedulingSettings?.capacityBufferPercent ?? 15,
      defaultStartHour: schedulingSettings?.defaultStartHour ?? 7,
      defaultEndHour: schedulingSettings?.defaultEndHour ?? 17,
      defaultEfficiencyMultiplier: schedulingSettings?.defaultEfficiencyMultiplier ?? 1,
      defaultShopRate: planningRates.defaultShopRate,
    }),
    [schedulingSettings, planningRates.defaultShopRate],
  );

  // ── Auto-schedule handler ─────────────────────────────────────────────
  async function handleAutoSchedule() {
    if (!orgId) return;

    if (unscheduledWorkOrders.length === 0) {
      toast.info("All work orders are already scheduled");
      return;
    }

    if ((bays ?? []).length === 0) {
      toast.warning("Create at least one bay before auto-scheduling");
      return;
    }

    const bayList: { bayId: string; name: string; bookings: { startDate: number; endDate: number }[] }[] = (bays ?? []).map((b) => ({
      bayId: b._id,
      name: b.name,
      bookings: scheduledProjects
        .filter((wo) => wo.hangarBayId === b._id)
        .map((wo) => ({
          startDate: wo.scheduledStartDate,
          endDate: wo.promisedDeliveryDate,
        })),
    }));

    const assignments = autoSchedule(
      unscheduledWorkOrders.map((wo) => ({
        woId: wo._id,
        priority: wo.priority,
        promisedDeliveryDate: wo.promisedDeliveryDate,
        estimatedDurationDays: Math.max(1, Math.ceil(wo.effectiveEstimatedHours / 8)),
      })),
      bayList,
    );

    if (assignments.length === 0) {
      toast.warning("Could not find slots for any work orders");
      return;
    }

    setAutoScheduling(true);
    try {
      let successCount = 0;
      for (const a of assignments) {
        try {
          await upsertScheduleAssignment({
            organizationId: orgId,
            workOrderId: a.woId as any,
            hangarBayId: a.bayId as any,
            shopLocationId: selectedShopLocationIdForMutations,
            startDate: a.startDate,
            endDate: a.endDate,
          });
          successCount++;
        } catch {
          // Continue with remaining
        }
      }
      toast.success(`Auto-scheduled ${successCount} work order${successCount !== 1 ? "s" : ""}`);
    } finally {
      setAutoScheduling(false);
    }
  }

  async function handleScheduleChange(args: {
    workOrderId: string;
    startDate: number;
    endDate: number;
    hangarBayId: string;
    sourceQuoteId?: string;
  }) {
    if (!orgId) throw new Error("Missing organization context");
    await upsertScheduleAssignment({
      organizationId: orgId,
      workOrderId: args.workOrderId as any,
      hangarBayId: args.hangarBayId as any,
      shopLocationId: selectedShopLocationIdForMutations,
      startDate: args.startDate,
      endDate: args.endDate,
      sourceQuoteId: args.sourceQuoteId as any,
    });
  }

  const toggleScheduleEditMode = useCallback(() => {
    setScheduleEditMode((prev) => {
      const next = !prev;
      if (next) {
        setMagicSelectionMode(false);
      }
      return next;
    });
  }, []);

  const activateScheduleEditTool = useCallback((tool: "distribute" | "block") => {
    setScheduleEditTool(tool);
    setScheduleEditMode(true);
    setMagicSelectionMode(false);
  }, []);

  const toggleMagicSelectionMode = useCallback(() => {
    setMagicSelectionMode((prev) => {
      const next = !prev;
      if (next) {
        setScheduleEditMode(false);
        if (unscheduledCount > 0) {
          setBacklogOpen(true);
          setGraveyardOpen(false);
        }
      }
      return next;
    });
  }, [unscheduledCount]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (scheduleEditMode) {
        setScheduleEditMode(false);
      }
      if (magicSelectionMode) {
        setMagicSelectionMode(false);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [scheduleEditMode, magicSelectionMode]);

  const setFullscreen = useCallback(
    (enabled: boolean) => {
      const next = new URLSearchParams(searchParams);
      if (enabled) {
        next.set("view", "fullscreen");
      } else {
        next.delete("view");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleReorderBays = useCallback(
    async (orderedBayIds: string[]) => {
      if (!orgId) throw new Error("Missing organization context");
      await reorderBays({
        organizationId: orgId,
        orderedBayIds: orderedBayIds as Id<"hangarBays">[],
        shopLocationId: selectedShopLocationIdForMutations,
      });
    },
    [orgId, reorderBays, selectedShopLocationIdForMutations],
  );

  const handleArchiveAssignment = useCallback(
    async (assignmentId: string) => {
      await archiveScheduleAssignment({
        assignmentId: assignmentId as Id<"scheduleAssignments">,
      });
    },
    [archiveScheduleAssignment],
  );

  const handleRestoreAssignment = useCallback(
    async (assignmentId: string) => {
      await restoreScheduleAssignment({
        assignmentId: assignmentId as Id<"scheduleAssignments">,
      });
      toast.success("Assignment restored");
    },
    [restoreScheduleAssignment],
  );

  const handleApplyDayModelEdit = useCallback(
    async (args: {
      assignmentId: string;
      workOrderId: string;
      dayOffset: number;
      mode: "distribute" | "block";
      adjustment: 1 | -1;
    }) => {
      const project = scheduledProjects.find(
        (row) => String(row.assignmentId) === args.assignmentId,
      );
      if (!project) {
        toast.error("Assignment not found for day-model update");
        return;
      }

      const workOrder = workOrderMap.get(args.workOrderId);
      const totalHours = Math.max(
        0,
        workOrder?.remainingHours ?? workOrder?.effectiveEstimatedHours ?? 0,
      );
      const durationDays = Math.max(
        1,
        Math.ceil((project.promisedDeliveryDate - project.scheduledStartDate) / DAY_MS),
      );

      const modelInput = {
        durationDays,
        totalHours,
        dailyEffort: project.dailyEffort,
        nonWorkDays: project.nonWorkDays,
      };

      const beforeModel = buildNormalizedDayModel(modelInput);
      const nextModel =
        args.mode === "block"
          ? toggleBlockedDay({
              ...modelInput,
              dayOffset: args.dayOffset,
            })
          : applyDistributeStep({
              ...modelInput,
              dayOffset: args.dayOffset,
              deltaHours: args.adjustment,
            });

      const beforeSignature = `${beforeModel.nonWorkDays.join(",")}|${beforeModel.dailyEffortHours
        .map((hours) => hours.toFixed(2))
        .join(",")}`;
      const afterSignature = `${nextModel.nonWorkDays.join(",")}|${nextModel.dailyEffortHours
        .map((hours) => hours.toFixed(2))
        .join(",")}`;

      if (beforeSignature === afterSignature) {
        if (args.mode === "block") {
          toast.info("At least one active work day is required");
        } else {
          toast.info("No distributable effort available for this assignment");
        }
        return;
      }

      await setScheduleDayModel({
        assignmentId: args.assignmentId as Id<"scheduleAssignments">,
        dailyEffort: toDailyEffortRows(nextModel),
        nonWorkDays: nextModel.nonWorkDays,
      });

      toast.success(
        args.mode === "block"
          ? "Day model updated (block toggle)"
          : "Day model updated (effort redistributed)",
      );
    },
    [scheduledProjects, workOrderMap, setScheduleDayModel],
  );

  const handleSaveCommandCenterFinancial = useCallback(
    async (next: {
      defaultShopRate: number;
      defaultLaborCostRate: number;
      monthlyFixedOverhead: number;
      monthlyVariableOverhead: number;
      annualCapexAssumption: number;
    }) => {
      if (!orgId) throw new Error("Missing organization context");
      await upsertPlanningFinancialSettings({
        organizationId: orgId,
        defaultShopRate: next.defaultShopRate,
        defaultLaborCostRate: next.defaultLaborCostRate,
        monthlyFixedOverhead: next.monthlyFixedOverhead,
        monthlyVariableOverhead: next.monthlyVariableOverhead,
        annualCapexAssumption: next.annualCapexAssumption,
      });
    },
    [orgId, upsertPlanningFinancialSettings],
  );

  const handleSaveCommandCenterScheduling = useCallback(
    async (next: {
      capacityBufferPercent: number;
      defaultStartHour: number;
      defaultEndHour: number;
      defaultEfficiencyMultiplier: number;
    }) => {
      if (!orgId) throw new Error("Missing organization context");
      await upsertSchedulingSettings({
        organizationId: orgId,
        capacityBufferPercent: next.capacityBufferPercent,
        defaultStartHour: next.defaultStartHour,
        defaultEndHour: next.defaultEndHour,
        defaultEfficiencyMultiplier: next.defaultEfficiencyMultiplier,
      });
    },
    [orgId, upsertSchedulingSettings],
  );

  const handleApplyOnboardingDefaults = useCallback(
    async (next: {
      capacityBufferPercent: number;
      defaultStartHour: number;
      defaultEndHour: number;
      defaultEfficiencyMultiplier: number;
      defaultShopRate: number;
    }) => {
      if (!orgId) throw new Error("Missing organization context");

      await Promise.all([
        upsertSchedulingSettings({
          organizationId: orgId,
          capacityBufferPercent: next.capacityBufferPercent,
          defaultStartHour: next.defaultStartHour,
          defaultEndHour: next.defaultEndHour,
          defaultEfficiencyMultiplier: next.defaultEfficiencyMultiplier,
        }),
        upsertPlanningFinancialSettings({
          organizationId: orgId,
          defaultShopRate: next.defaultShopRate,
          defaultLaborCostRate: planningRates.defaultLaborCostRate,
          monthlyFixedOverhead: planningRates.monthlyFixedOverhead,
          monthlyVariableOverhead: planningRates.monthlyVariableOverhead,
          annualCapexAssumption: planningRates.annualCapexAssumption,
        }),
      ]);

      persistOnboardingRecord({
        defaultsAppliedAt: Date.now(),
      });
    },
    [
      orgId,
      planningRates.defaultLaborCostRate,
      planningRates.monthlyFixedOverhead,
      planningRates.monthlyVariableOverhead,
      planningRates.annualCapexAssumption,
      persistOnboardingRecord,
      upsertPlanningFinancialSettings,
      upsertSchedulingSettings,
    ],
  );

  function openMagicScheduler() {
    const candidateIds = magicCandidates.map((wo) => String(wo._id));
    const candidateSet = new Set(candidateIds);
    const selectedFromBoard = magicSelectedIds.filter((id) => candidateSet.has(id));
    const ids = selectedFromBoard.length > 0 ? selectedFromBoard : candidateIds;
    const nextPriority = [
      ...magicPriorityOrder.filter((id) => ids.includes(id)),
      ...ids.filter((id) => !magicPriorityOrder.includes(id)),
    ];

    setMagicSelectionMode(false);
    setMagicSelectedIds(ids);
    setMagicPriorityOrder(nextPriority.length > 0 ? nextPriority : ids);
    setMagicResults([]);
    setMagicOpen(true);
  }

  function toggleMagicSelection(workOrderId: string) {
    setMagicSelectedIds((prev) => {
      if (prev.includes(workOrderId)) {
        return prev.filter((id) => id !== workOrderId);
      }
      return [...prev, workOrderId];
    });
    setMagicPriorityOrder((prev) => {
      if (prev.includes(workOrderId)) {
        return prev;
      }
      return [...prev, workOrderId];
    });
  }

  function moveMagicPriority(workOrderId: string, direction: -1 | 1) {
    setMagicPriorityOrder((prev) => {
      const idx = prev.indexOf(workOrderId);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleRunMagicScheduler() {
    if (!orgId) return;
    if ((bays ?? []).length === 0) {
      toast.warning("Create at least one bay before running Magic Scheduler");
      return;
    }

    const selectedSet = new Set(magicSelectedIds);
    if (selectedSet.size === 0) {
      toast.warning("Select at least one work order");
      return;
    }

    const woMap = new Map(magicCandidates.map((wo) => [wo._id as string, wo]));
    const currentScheduleMap = new Map(
      scheduledProjects.map((p) => [p.workOrderId as string, p]),
    );

    const bayList: { bayId: string; bookings: { startDate: number; endDate: number }[] }[] = (
      bays ?? []
    ).map((b) => ({
      bayId: b._id,
      bookings: scheduledProjects
        .filter((p) => p.hangarBayId === b._id && !selectedSet.has(p.workOrderId as string))
        .map((p) => ({
          startDate: p.scheduledStartDate,
          endDate: p.promisedDeliveryDate,
        })),
    }));

    const orderedJobs = magicPriorityOrder
      .filter((id) => selectedSet.has(id))
      .map((id) => woMap.get(id))
      .filter((wo): wo is NonNullable<typeof wo> => !!wo)
      .map((wo) => ({
        woId: wo._id as string,
        estimatedDurationDays: Math.max(1, Math.ceil((wo.effectiveEstimatedHours ?? 0) / 8)),
      }));

    const assignments = magicSchedule(orderedJobs, bayList);
    if (assignments.length === 0) {
      toast.warning("No valid scheduling results were produced");
      return;
    }

    setMagicRunning(true);
    try {
      const appliedResults: Array<{
        workOrderId: string;
        workOrderNumber: string;
        oldEndDate: number | null;
        newEndDate: number;
        bayId: string;
      }> = [];

      for (const assignment of assignments) {
        const wo = woMap.get(assignment.woId);
        if (!wo) continue;

        await upsertScheduleAssignment({
          organizationId: orgId,
          workOrderId: assignment.woId as any,
          sourceQuoteId: wo.sourceQuoteId as any,
          hangarBayId: assignment.bayId as any,
          shopLocationId: selectedShopLocationIdForMutations,
          startDate: assignment.startDate,
          endDate: assignment.endDate,
        });

        const previous = currentScheduleMap.get(assignment.woId);
        appliedResults.push({
          workOrderId: assignment.woId,
          workOrderNumber: wo.workOrderNumber,
          oldEndDate: previous?.promisedDeliveryDate ?? null,
          newEndDate: assignment.endDate,
          bayId: assignment.bayId,
        });
      }

      setMagicResults(appliedResults);
      toast.success(`Magic Scheduler applied ${appliedResults.length} assignment(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Magic Scheduler failed");
    } finally {
      setMagicRunning(false);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="h-full flex flex-col" data-testid="page-loading-state">
        <GanttSkeleton />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Scheduling requires organization setup"
        missingInfo="Complete onboarding before creating or scheduling work orders."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (
    !orgId ||
    !data ||
    !bays ||
    !plannerProjects ||
    !technicianWorkload ||
    !planningFinancialSettings ||
    !schedulingSettings
  ) {
    return null;
  }

  if (workOrders.length === 0) {
    return (
      <ActionableEmptyState
        title="No work orders to schedule yet"
        missingInfo="Create your first work order to populate the Gantt board and assign bay time."
        primaryActionLabel="Create Work Order"
        primaryActionType="link"
        primaryActionTarget="/work-orders/new"
        secondaryActionLabel="Manage Bays"
        secondaryActionTarget="/scheduling/bays"
      />
    );
  }

  const onboardingVisible =
    !isFullscreen &&
    !!onboardingRecord &&
    !onboardingRecord.completedAt &&
    !onboardingRecord.skippedAt;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          : "h-full flex flex-col relative"
      }
    >
      {/* Sub-nav toolbar */}
      {!isFullscreen && (
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b border-border/30 bg-muted/20 flex-shrink-0">
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling">Gantt Board</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/bays">
            <Warehouse className="w-3.5 h-3.5" />
            Bays
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/capacity">Capacity</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/scheduling/financial-planning">Financial Planning</Link>
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={() => setFullscreen(true)}
          data-testid="scheduling-enter-fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Fullscreen
        </Button>

        <Button
          variant={commandCenterOpen ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setCommandCenterOpen(true)}
          data-testid="toggle-command-center"
        >
          <Command className="w-3.5 h-3.5" />
          Command Center
        </Button>

        <Button
          variant={quoteWorkspaceOpen ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setQuoteWorkspaceOpen(true)}
          disabled={quoteWorkspaceWorkOrders.length === 0}
          data-testid="toggle-quote-workspace"
        >
          <FileText className="w-3.5 h-3.5" />
          Quote Workspace
        </Button>

        <Button
          variant={scheduleEditMode ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={toggleScheduleEditMode}
          data-testid="toggle-schedule-edit-mode"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit Mode
        </Button>

        {scheduleEditMode && (
          <>
            <Button
              variant={scheduleEditTool === "distribute" ? "secondary" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => activateScheduleEditTool("distribute")}
              data-testid="schedule-edit-tool-distribute"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Distribute
            </Button>
            <Button
              variant={scheduleEditTool === "block" ? "secondary" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => activateScheduleEditTool("block")}
              data-testid="schedule-edit-tool-block"
            >
              <Ban className="w-3.5 h-3.5" />
              Block Days
            </Button>
          </>
        )}

        <Button
          variant={magicSelectionMode ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={toggleMagicSelectionMode}
          data-testid="toggle-magic-selection-mode"
        >
          <ListChecks className="w-3.5 h-3.5" />
          Board Select
          {magicSelectedIds.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {magicSelectedIds.length}
            </Badge>
          )}
        </Button>

        <Button
          variant={graveyardOpen ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => {
            setBacklogOpen(false);
            setGraveyardOpen((prev) => !prev);
          }}
        >
          <Archive className="w-3.5 h-3.5" />
          Graveyard
          {archivedProjects.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {archivedProjects.length}
            </Badge>
          )}
        </Button>

        <Button
          variant={analyticsOpen ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setAnalyticsOpen((prev) => !prev)}
          data-testid="toggle-analytics-panel"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analytics
        </Button>

        <Button
          variant={rosterOpen ? "secondary" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => setRosterOpen((prev) => !prev)}
          data-testid="toggle-roster-panel"
        >
          <Users className="w-3.5 h-3.5" />
          Roster
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={openMagicScheduler}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Magic Scheduler
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={handleAutoSchedule}
          disabled={autoScheduling}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {autoScheduling ? "Scheduling..." : "Auto Schedule"}
        </Button>
        </div>
      )}

      <SchedulingOnboardingPanel
        visible={onboardingVisible}
        setupOpen={onboardingSetupOpen}
        onSetupOpenChange={setOnboardingSetupOpen}
        defaults={onboardingDefaults}
        defaultsAppliedAt={onboardingRecord?.defaultsAppliedAt}
        onApplyDefaults={handleApplyOnboardingDefaults}
        onSkip={markOnboardingSkipped}
        onComplete={markOnboardingCompleted}
      />

      {isFullscreen && (
        <div className="absolute top-3 right-3 z-50">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 bg-background/85 backdrop-blur-sm"
            onClick={() => setFullscreen(false)}
            data-testid="scheduling-exit-fullscreen"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit Fullscreen
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <GanttBoard
              workOrders={workOrders}
              scheduledProjects={scheduledProjects}
              onOpenBacklog={() => {
                setGraveyardOpen(false);
                setBacklogOpen(true);
              }}
              unscheduledCount={unscheduledCount}
              onScheduleChange={handleScheduleChange}
              interactionMode={scheduleEditMode ? scheduleEditTool : "normal"}
              magicSelectionMode={magicSelectionMode}
              selectedMagicWorkOrderIds={magicSelectedIds}
              onToggleMagicWorkOrder={toggleMagicSelection}
              onApplyDayModelEdit={handleApplyDayModelEdit}
              onReorderBays={handleReorderBays}
              onArchiveAssignment={handleArchiveAssignment}
              bays={bays as { _id: string; name: string; type: string; status: string }[] | undefined}
              conflicts={conflicts}
              scrollRef={ganttScrollRef}
              onTimelineScroll={handleTimelineScroll}
              onTimelineConfigChange={setTimelineConfig}
            />
          </div>

          {!isFullscreen && (
            <div className="flex flex-col shrink-0 border-t border-slate-800 bg-slate-900 z-30 relative">
              {!pnlPopout && (
                <div id="panel-pnl" className="relative">
                  {pnlOpen && (
                    <div
                      className="h-1 w-full cursor-row-resize hover:bg-cyan-500/50 absolute top-0 left-0 z-50 transition-colors"
                      onMouseDown={(e) => startPanelResize(e, "pnl")}
                    />
                  )}
                  <DailyFinancialTracker
                    data={dailyFinancialData}
                    timelineStartMs={timelineStartMs}
                    cellWidth={timelineCellWidth}
                    isOpen={pnlOpen}
                    onToggle={() => setPnlOpen((prev) => !prev)}
                    isPoppedOut={false}
                    onPopOut={() => setPnlPopout(true)}
                    scrollRef={trackerScrollRef}
                    onScroll={handlePanelTimelineScroll}
                    height={panelHeights.pnl}
                    currentDayIndex={currentTimelineDay}
                    holidayDayIndexes={[]}
                  />
                </div>
              )}

              {!capacityPopout && (
                <div id="panel-capacity" className="relative">
                  {capacityOpen && (
                    <div
                      className="h-1 w-full cursor-row-resize hover:bg-cyan-500/50 absolute top-0 left-0 z-50 transition-colors"
                      onMouseDown={(e) => startPanelResize(e, "capacity")}
                    />
                  )}
                  <CapacityForecaster
                    data={dailyCapacityData}
                    timelineStartMs={timelineStartMs}
                    cellWidth={timelineCellWidth}
                    isOpen={capacityOpen}
                    onToggle={() => setCapacityOpen((prev) => !prev)}
                    isPoppedOut={false}
                    onPopOut={() => setCapacityPopout(true)}
                    scrollRef={capacityScrollRef}
                    onScroll={handlePanelTimelineScroll}
                    height={panelHeights.capacity}
                    currentDayIndex={currentTimelineDay}
                    holidayDayIndexes={[]}
                  />
                </div>
              )}

              {!analyticsPopout && (
                <div id="panel-analytics" className="relative">
                  {analyticsOpen && (
                    <div
                      className="h-1 w-full cursor-row-resize hover:bg-indigo-500/50 absolute top-0 left-0 z-50 transition-colors"
                      onMouseDown={(e) => startPanelResize(e, "analytics")}
                    />
                  )}
                  <SchedulingAnalyticsPanel
                    metrics={analyticsMetrics}
                    isOpen={analyticsOpen}
                    onToggle={() => setAnalyticsOpen((prev) => !prev)}
                    isPoppedOut={false}
                    onPopOut={() => setAnalyticsPopout(true)}
                    height={panelHeights.analytics}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {!isFullscreen && !rosterPopout && (
          <div id="panel-roster" className="h-full relative flex z-30">
            {rosterOpen && (
              <div
                className="w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                onMouseDown={startRosterResize}
              />
            )}
            <SchedulingRosterPanel
              technicians={rosterTechnicians}
              isOpen={rosterOpen}
              onToggle={() => setRosterOpen((prev) => !prev)}
              width={rosterWidth}
              isPoppedOut={false}
              onPopOut={() => setRosterPopout(true)}
            />
          </div>
        )}
      </div>

      {pnlPopout && (
        <DraggableWindow
          title="Daily Financial Tracker"
          onClose={() => {
            setPnlPopout(false);
            setPnlOpen(false);
          }}
          initialWidth={900}
          initialHeight={430}
        >
          <DailyFinancialTracker
            data={dailyFinancialData}
            timelineStartMs={timelineStartMs}
            cellWidth={Math.max(40, timelineCellWidth)}
            isOpen
            onToggle={() => {}}
            isPoppedOut
            onPopOut={() => {}}
            currentDayIndex={currentTimelineDay}
            holidayDayIndexes={[]}
          />
        </DraggableWindow>
      )}

      {capacityPopout && (
        <DraggableWindow
          title="Capacity Forecaster"
          onClose={() => {
            setCapacityPopout(false);
            setCapacityOpen(false);
          }}
          initialWidth={900}
          initialHeight={430}
        >
          <CapacityForecaster
            data={dailyCapacityData}
            timelineStartMs={timelineStartMs}
            cellWidth={Math.max(40, timelineCellWidth)}
            isOpen
            onToggle={() => {}}
            isPoppedOut
            onPopOut={() => {}}
            currentDayIndex={currentTimelineDay}
            holidayDayIndexes={[]}
          />
        </DraggableWindow>
      )}

      {analyticsPopout && (
        <DraggableWindow
          title="Scheduling Analytics"
          onClose={() => {
            setAnalyticsPopout(false);
            setAnalyticsOpen(false);
          }}
          initialWidth={900}
          initialHeight={420}
        >
          <SchedulingAnalyticsPanel
            metrics={analyticsMetrics}
            isOpen
            onToggle={() => {}}
            isPoppedOut
            onPopOut={() => {}}
          />
        </DraggableWindow>
      )}

      {rosterPopout && (
        <DraggableWindow
          title="Roster"
          onClose={() => {
            setRosterPopout(false);
            setRosterOpen(false);
          }}
          initialWidth={460}
          initialHeight={640}
        >
          <SchedulingRosterPanel
            technicians={rosterTechnicians}
            isOpen
            onToggle={() => {}}
            width={420}
            isPoppedOut
            onPopOut={() => {}}
          />
        </DraggableWindow>
      )}

      <BacklogSidebar
        workOrders={unscheduledWorkOrders}
        isOpen={backlogOpen}
        onClose={() => setBacklogOpen(false)}
        selectionMode={magicSelectionMode}
        selectedWorkOrderIds={magicSelectedIds}
        onToggleSelection={toggleMagicSelection}
      />

      <GraveyardSidebar
        projects={archivedProjects}
        isOpen={graveyardOpen}
        onClose={() => setGraveyardOpen(false)}
        onRestore={handleRestoreAssignment}
      />

      <SchedulingQuoteWorkspaceDialog
        open={quoteWorkspaceOpen}
        onOpenChange={setQuoteWorkspaceOpen}
        workOrders={quoteWorkspaceWorkOrders}
        initialWorkOrderId={initialQuoteWorkspaceWorkOrderId}
      />

      <SchedulingCommandCenterDialog
        open={commandCenterOpen}
        onOpenChange={setCommandCenterOpen}
        rosterSummary={commandCenterRosterSummary}
        configSummary={commandCenterConfigSummary}
        financialSummary={commandCenterFinancialSummary}
        schedulingSettingsSummary={commandCenterSchedulingSettings}
        onSaveFinancialSummary={handleSaveCommandCenterFinancial}
        onSaveSchedulingSettings={handleSaveCommandCenterScheduling}
      />

      <Dialog open={magicOpen} onOpenChange={setMagicOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Magic Scheduler</DialogTitle>
            <DialogDescription>
              Select work orders, reorder priority, and apply optimized bay assignments.{" "}
              <span className="font-medium text-foreground" data-testid="magic-selected-count">
                {magicSelectedIds.length} selected.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[48vh] overflow-y-auto border border-border/50 rounded-md">
            {magicPriorityOrder.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No eligible work orders found.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {magicPriorityOrder.map((id, idx) => {
                  const wo = magicCandidates.find((w) => String(w._id) === id);
                  if (!wo) return null;
                  const selected = magicSelectedIds.includes(id);
                  return (
                    <li key={id} className="flex items-center gap-3 p-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleMagicSelection(id)}
                        aria-label={`Select ${wo.workOrderNumber}`}
                      />
                      <div className="w-8 text-[11px] text-muted-foreground font-mono">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold font-mono truncate">
                            {wo.workOrderNumber}
                          </span>
                          {wo.quoteNumber && (
                            <Badge variant="outline" className="text-[10px]">
                              {wo.quoteNumber}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {wo.aircraft?.currentRegistration ?? "Unassigned aircraft"} • {wo.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => moveMagicPriority(id, -1)}
                          disabled={idx === 0}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => moveMagicPriority(id, 1)}
                          disabled={idx === magicPriorityOrder.length - 1}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {magicResults.length > 0 && (
            <div className="border border-border/50 rounded-md p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Latest Results
              </p>
              <ul className="space-y-1">
                {magicResults.map((row) => (
                  <li key={row.workOrderId} className="text-xs text-foreground">
                    <span className="font-mono">{row.workOrderNumber}</span>
                    {" → "}
                    <span className="text-muted-foreground">
                      {bayNameMap.get(row.bayId) ?? `Bay ${row.bayId.slice(0, 8)}…`}
                    </span>
                    {" • ends "}
                    <span className="font-mono">
                      {new Date(row.newEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {row.oldEndDate !== null && (
                      <span className="text-muted-foreground/60">
                        {" (was "}
                        {new Date(row.oldEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {")"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMagicOpen(false)}
              disabled={magicRunning}
            >
              Close
            </Button>
            <Button onClick={handleRunMagicScheduler} disabled={magicRunning}>
              <Sparkles className="w-3.5 h-3.5" />
              {magicRunning ? "Applying..." : "Apply Magic Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
