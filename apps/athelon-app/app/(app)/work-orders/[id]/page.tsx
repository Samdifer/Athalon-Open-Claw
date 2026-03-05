"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  FileText,
  ShieldCheck,
  XCircle,
  Play,
  Square,
  User,
  Calendar,
  TrendingUp,
  Paperclip,
  CheckCircle2,
  MessageSquare,
  Video,
  Plus,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { HandoffNotesPanel } from "@/components/HandoffNotesPanel";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { DownloadPDFButton } from "@/src/shared/components/pdf/DownloadPDFButton";
import { WorkOrderPDF } from "@/src/shared/components/pdf/WorkOrderPDF";
import { PrintButton } from "@/src/shared/components/PrintButton";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  WO_TYPE_LABEL,
  type WoStatus,
  type WoType,
} from "@/lib/mro-constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WorkItemsList,
  type WorkItem,
  type TaskCardItem,
  type DiscrepancyItem,
} from "@/app/(app)/work-orders/[id]/_components/WorkItemsList";
import { WOComplianceTab } from "@/app/(app)/work-orders/[id]/_components/WOComplianceTab";
import { DocumentsPanel } from "@/app/(app)/work-orders/[id]/_components/DocumentsPanel";
import { InDockEvidenceHub } from "@/app/(app)/work-orders/[id]/_components/InDockEvidenceHub";
import { CloseReadinessPanel } from "@/components/CloseReadinessPanel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { ActivityTimeline } from "@/app/(app)/work-orders/[id]/_components/ActivityTimeline";
import { DiscrepancyList } from "@/app/(app)/work-orders/[id]/_components/DiscrepancyList";
import { DeferredMaintenanceCaptureDialog } from "@/app/(app)/work-orders/[id]/_components/DeferredMaintenanceCaptureDialog";
import { VoiceNotesPanel } from "@/components/VoiceNotesPanel";
import { WOHeaderKPI } from "@/app/(app)/work-orders/[id]/_components/WOHeaderKPI";
import { WOPartsLifecycleBoard } from "@/app/(app)/work-orders/[id]/_components/WOPartsLifecycleBoard";
import { CostEstimationPanel } from "@/app/(app)/work-orders/[id]/_components/CostEstimationPanel";
import { PartRequestDialog } from "@/app/(app)/work-orders/[id]/_components/PartRequestDialog";
import type { PartsRequestRecord } from "@/app/(app)/parts/_components/PartsRequestForm";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import {
  readVoiceNotesForWorkOrder,
  writeVoiceNotesForWorkOrder,
  type StoredVoiceNote,
} from "@/lib/voiceNotes";

type AuditEventForTimeline = {
  _id: string;
  eventType: string;
  notes?: string | null;
  userId?: string | null;
  timestamp: number;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
};

/** Shape of a workOrderParts record from the live query. */
type WoPartLiveRecord = {
  _id: string;
  partNumber: string;
  partName: string;
  status: string;
  quantityRequested: number;
  notes?: string;
  createdAt: number;
};

type RiskLevel = "overdue" | "at_risk" | "on_track" | "no_date";
type WorkOrderStageFlow = {
  key: string;
  label: string;
  statusMappings: string[];
};
type WorkOrderTab = "squawks" | "compliance" | "parts" | "cost" | "evidence" | "documents" | "notes";
type PartsTabView = "list" | "board";
type PartLifecycleStatus =
  | "requested_not_ordered"
  | "ordered_not_received"
  | "received_not_installed"
  | "installed"
  | "returned_to_stock";
type LinkedSquawk = { id: string; number: string };
type PartLifecycleItem = {
  id: string;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  supplier?: string;
  quantity?: number;
  source: "request" | "inventory";
  status: PartLifecycleStatus;
  requestStatus?: PartsRequestRecord["status"];
  location?: string;
  linkedSquawks: LinkedSquawk[];
};
type WorkOrderPart = {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  supplier?: string;
  location: string;
  quantity?: number;
  quantityOnHand?: number;
  receivingWorkOrderId?: Id<"workOrders">;
  reservedForWorkOrderId?: Id<"workOrders">;
  installedByWorkOrderId?: Id<"workOrders">;
  installedOnWorkOrderId?: Id<"workOrders">;
  removedByWorkOrderId?: Id<"workOrders">;
};

const PARTS_LIFECYCLE_ORDER: PartLifecycleStatus[] = [
  "requested_not_ordered",
  "ordered_not_received",
  "received_not_installed",
  "installed",
  "returned_to_stock",
];

function getPartsRequestStorageKey(orgId: string) {
  return `athelon:parts-requests:${orgId}`;
}

function normalizeRefToken(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

function normalizePartToken(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

const DEFAULT_WORK_ORDER_STAGE_FLOW: WorkOrderStageFlow[] = [
  { key: "quoting", label: "Quoting", statusMappings: ["draft"] },
  { key: "in_dock", label: "In-dock", statusMappings: ["open"] },
  { key: "inspection", label: "Inspection", statusMappings: ["pending_inspection"] },
  {
    key: "repair",
    label: "Repair",
    statusMappings: ["in_progress", "on_hold", "open_discrepancies"],
  },
  { key: "return_to_service", label: "Return to Service", statusMappings: ["pending_signoff"] },
  {
    key: "review_and_improvement",
    label: "Review & Improvement",
    statusMappings: ["closed", "cancelled", "voided"],
  },
];

function isWorkOrderNumberRef(value: string): boolean {
  return /^WO-/i.test(value.trim());
}

function isConvexIdLike(value: string): boolean {
  return /^[A-Za-z0-9]{10,}$/.test(value);
}

function getScheduleRiskLevel(promisedDeliveryDateMs: number | null | undefined): RiskLevel {
  if (!promisedDeliveryDateMs) return "no_date";
  const now = Date.now();
  if (promisedDeliveryDateMs < now) return "overdue";
  const daysLeft = (promisedDeliveryDateMs - now) / (1000 * 60 * 60 * 24);
  return daysLeft <= 2 ? "at_risk" : "on_track";
}

function normalizeDiscrepancyStatus(
  status: string,
  disposition?: string,
): "open" | "deferred" | "corrected" {
  if (status !== "dispositioned") return "open";
  if (disposition === "deferred_mel" || disposition === "deferred_grounded") return "deferred";
  return "corrected";
}

function mapRequestStatusToLifecycle(status: PartsRequestRecord["status"]): PartLifecycleStatus {
  if (status === "requested") return "requested_not_ordered";
  if (status === "ordered" || status === "shipped") return "ordered_not_received";
  return "received_not_installed";
}

function mapPartToLifecycle(part: WorkOrderPart, workOrderId: Id<"workOrders">): PartLifecycleStatus {
  const installedOnThisWorkOrder =
    part.location === "installed" &&
    (part.installedByWorkOrderId === workOrderId || part.installedOnWorkOrderId === workOrderId);
  if (installedOnThisWorkOrder) return "installed";
  if (part.location === "inventory" && part.removedByWorkOrderId === workOrderId) {
    return "returned_to_stock";
  }
  return "received_not_installed";
}

function mapLifecycleToBadgeStatus(status: PartLifecycleStatus): string {
  if (status === "requested_not_ordered") return "requested";
  if (status === "ordered_not_received") return "ordered";
  if (status === "received_not_installed") return "received";
  if (status === "installed") return "installed";
  return "returned";
}

function mapLifecycleToBoardStatus(status: PartLifecycleStatus): "requested" | "ordered" | "received" | "issued" | "installed" {
  if (status === "requested_not_ordered") return "requested";
  if (status === "ordered_not_received") return "ordered";
  if (status === "received_not_installed") return "received";
  if (status === "installed") return "installed";
  return "issued";
}

function mapStatusToStageIndex(status: string, stageFlow: WorkOrderStageFlow[]): number {
  const stageIndex = stageFlow.findIndex((stage) => stage.statusMappings.includes(status));
  return stageIndex >= 0 ? stageIndex : 0;
}

function ScheduleRiskChip({ riskLevel }: { riskLevel: RiskLevel }) {
  if (riskLevel === "no_date") return null;
  const styles = {
    overdue: "bg-red-500/15 text-red-400 border-red-500/30",
    at_risk: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    on_track: "bg-green-500/15 text-green-400 border-green-500/30",
  } as const;
  const labels = { overdue: "Overdue", at_risk: "At Risk", on_track: "On Track" } as const;
  return (
    <Badge variant="outline" className={`text-[10px] font-medium border gap-1 ${styles[riskLevel]}`}>
      <TrendingUp className="w-2.5 h-2.5" />
      {labels[riskLevel]}
    </Badge>
  );
}

export default function WorkOrderDetailPage() {
  const { id: routeRef = "" } = useParams<{ id: string }>();
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkOrderTab>("squawks");
  const [pendingSquawkId, setPendingSquawkId] = useState<string | null>(null);
  const [timerActionLoading, setTimerActionLoading] = useState<"start" | "stop" | null>(null);
  const [deferredCaptureOpen, setDeferredCaptureOpen] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<StoredVoiceNote[]>([]);
  const [partsRequests, setPartsRequests] = useState<PartsRequestRecord[]>([]);
  const [partsTabView, setPartsTabView] = useState<PartsTabView>("list");
  const [partRequestDialogOpen, setPartRequestDialogOpen] = useState(false);

  const legacyResolution = useQuery(
    api.workOrders.resolveWorkOrderRef,
    orgId && isWorkOrderNumberRef(routeRef)
      ? { organizationId: orgId, workOrderRef: routeRef }
      : "skip",
  );

  const workOrderId = useMemo(() => {
    if (!routeRef) return undefined;
    if (isWorkOrderNumberRef(routeRef)) return legacyResolution?.workOrderId;
    if (isConvexIdLike(routeRef)) return routeRef as Id<"workOrders">;
    return undefined;
  }, [legacyResolution?.workOrderId, routeRef]);

  useEffect(() => {
    setActiveTab("squawks");
    setPendingSquawkId(null);
    setPartsTabView("list");
  }, [workOrderId]);

  useEffect(() => {
    if (!orgId) {
      setPartsRequests([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(getPartsRequestStorageKey(orgId));
      setPartsRequests(raw ? (JSON.parse(raw) as PartsRequestRecord[]) : []);
    } catch {
      setPartsRequests([]);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !workOrderId) {
      setVoiceNotes([]);
      return;
    }
    setVoiceNotes(readVoiceNotesForWorkOrder({ orgId, workOrderId: String(workOrderId) }));
  }, [orgId, workOrderId]);

  useEffect(() => {
    if (activeTab !== "squawks" || !pendingSquawkId) return;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(`squawk-${pendingSquawkId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setPendingSquawkId(null);
    }, 120);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, pendingSquawkId]);

  const data = useQuery(
    api.workOrders.getWorkOrder,
    orgId && workOrderId ? { workOrderId, organizationId: orgId } : "skip",
  );

  // BUG-FD-001: Front desk needs to see the customer name on a work order and
  // click through to their profile. The WO doesn't store customerId directly —
  // the customer relationship lives on the aircraft. Load the customer record
  // via the aircraft's customerId so we can display name + link.
  const aircraftForCustomer = data?.aircraft;
  const customer = useQuery(
    api.customers.getCustomer,
    aircraftForCustomer?.customerId
      ? { customerId: aircraftForCustomer.customerId }
      : "skip",
  );

  const closeReadiness = useQuery(
    api.workOrders.getCloseReadiness,
    orgId && workOrderId ? { workOrderId, organizationId: orgId } : "skip",
  );
  const configuredStageFlow = useQuery(
    api.stationConfig.getWorkOrderStageConfig,
    orgId ? { organizationId: orgId } : "skip",
  );

  const allParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Live workOrderParts data for this WO
  // NOTE: api.workOrderParts types resolve after `convex dev` regenerates types
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const woPartsLive: WoPartLiveRecord[] | undefined = useQuery(
    (api as any).workOrderParts?.listForWorkOrder,
    workOrderId ? { workOrderId } : "skip",
  ) as WoPartLiveRecord[] | undefined;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const activeTimer = useQuery(
    api.timeClock.getActiveTimerForTechnician,
    orgId && techId ? { orgId, technicianId: techId } : "skip",
  );

  const timeLogs = useQuery(
    api.timeClock.getTimeEntriesForWorkOrder,
    orgId && workOrderId ? { orgId, workOrderId } : "skip",
  );
  const startTimer = useMutation(api.timeClock.startTimer);
  const stopTimer = useMutation(api.timeClock.stopTimer);

  const isLegacyRefResolving =
    isWorkOrderNumberRef(routeRef) && orgId && legacyResolution === undefined;
  const isDataLoading = Boolean(orgId && workOrderId && data === undefined);

  if (!isLoaded || isLegacyRefResolving || isDataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to resolve organization context.
        </CardContent>
      </Card>
    );
  }

  if (!workOrderId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">Invalid work order reference</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ref: <span className="font-mono">{routeRef || "—"}</span>
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/work-orders">Back to Work Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">Work order not found</p>
          <p className="text-xs text-muted-foreground mt-1">
            ID: <span className="font-mono">{String(workOrderId)}</span>
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/work-orders">Back to Work Orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const wo = data.workOrder;
  const aircraft = data.aircraft;
  const taskCards = data.taskCards ?? [];
  const discrepancies = data.discrepancies ?? [];
  const auditEvents = data.auditEvents ?? [];

  const isTerminalStatus = ["closed", "voided", "cancelled"].includes(wo.status);

  const riskLevel = getScheduleRiskLevel(wo.promisedDeliveryDate);

  const workItems: WorkItem[] = [
    ...taskCards.map(
      (tc): TaskCardItem => ({
        kind: "task",
        id: String(tc._id),
        number: tc.taskCardNumber,
        title: tc.title,
        status: tc.status,
        taskType: tc.taskType,
        stepCount: tc.stepCount ?? tc.steps.length,
        completedStepCount:
          tc.completedStepCount ??
          tc.steps.filter((s) => s.status === "completed" || s.status === "na").length,
        aircraftSystem: tc.aircraftSystem,
        isInspectionItem: tc.isInspectionItem,
        isCustomerReported: tc.isCustomerReported,
      }),
    ),
    ...discrepancies.map(
      (sq): DiscrepancyItem => ({
        kind: "finding",
        id: String(sq._id),
        number: sq.discrepancyNumber,
        description: sq.description,
        status: normalizeDiscrepancyStatus(sq.status, sq.disposition),
        disposition: sq.disposition,
        foundBy: sq.foundByTechnicianId,
        foundDate: formatDate(sq.foundAt),
        aircraftSystem: sq.aircraftSystem,
        squawkOrigin: sq.squawkOrigin,
        isCustomerReported: sq.isCustomerReported,
        foundDuringRts: sq.foundDuringRts,
      }),
    ),
  ];

  const partsForThisWorkOrder = ((allParts ?? []) as WorkOrderPart[]).filter(
    (part) =>
      part.receivingWorkOrderId === workOrderId ||
      part.reservedForWorkOrderId === workOrderId ||
      part.installedByWorkOrderId === workOrderId ||
      part.installedOnWorkOrderId === workOrderId ||
      part.removedByWorkOrderId === workOrderId,
  );

  const requestsForThisWorkOrder = useMemo(() => {
    const workOrderRefTokens = new Set(
      [wo.workOrderNumber, String(workOrderId), routeRef]
        .map((value) => normalizeRefToken(value))
        .filter(Boolean),
    );
    return partsRequests.filter((request) =>
      workOrderRefTokens.has(normalizeRefToken(request.workOrderRef)),
    );
  }, [partsRequests, routeRef, wo.workOrderNumber, workOrderId]);

  const partLinkedSquawks = useMemo(() => {
    const linkedByKey = new Map<string, Map<string, LinkedSquawk>>();
    const discrepancyById = new Map(
      discrepancies.map((discrepancy: any) => [String(discrepancy._id), discrepancy]),
    );

    const upsertSquawkLinks = (keys: string[], squawks: any[]) => {
      for (const key of keys) {
        if (!key) continue;
        if (!linkedByKey.has(key)) {
          linkedByKey.set(key, new Map<string, LinkedSquawk>());
        }
        const bucket = linkedByKey.get(key);
        if (!bucket) continue;
        for (const squawk of squawks) {
          const squawkId = String(squawk._id);
          bucket.set(squawkId, {
            id: squawkId,
            number: squawk.discrepancyNumber ?? squawkId,
          });
        }
      }
    };

    for (const taskCard of taskCards as any[]) {
      for (const step of (taskCard.steps ?? []) as any[]) {
        const squawksForStep = ((step.discrepancyIds ?? []) as any[])
          .map((discrepancyId) => discrepancyById.get(String(discrepancyId)))
          .filter(Boolean);
        if (squawksForStep.length === 0) continue;
        const stepParts = [
          ...((step.partsInstalled ?? []) as any[]),
          ...((step.partsRemoved ?? []) as any[]),
        ];
        for (const stepPart of stepParts) {
          const partNumber = normalizePartToken(stepPart.partNumber);
          const serialNumber = normalizePartToken(stepPart.serialNumber);
          upsertSquawkLinks(
            [
              stepPart.partId ? `id:${String(stepPart.partId)}` : "",
              partNumber ? `pn:${partNumber}` : "",
              partNumber && serialNumber ? `pn:${partNumber}|sn:${serialNumber}` : "",
            ],
            squawksForStep as any[],
          );
        }
      }
    }

    for (const discrepancy of discrepancies as any[]) {
      const componentPartNumber = normalizePartToken(discrepancy.componentPartNumber);
      const componentSerialNumber = normalizePartToken(discrepancy.componentSerialNumber);
      if (!componentPartNumber) continue;
      upsertSquawkLinks(
        [
          `pn:${componentPartNumber}`,
          componentSerialNumber ? `pn:${componentPartNumber}|sn:${componentSerialNumber}` : "",
        ],
        [discrepancy],
      );
    }

    return linkedByKey;
  }, [discrepancies, taskCards]);

  const partsLifecycleItems = useMemo<PartLifecycleItem[]>(() => {
    const resolveSquawks = (
      partNumber?: string,
      serialNumber?: string,
      partId?: string,
    ): LinkedSquawk[] => {
      const links = new Map<string, LinkedSquawk>();
      const normalizedPartNumber = normalizePartToken(partNumber);
      const normalizedSerialNumber = normalizePartToken(serialNumber);
      const keys = [
        partId ? `id:${partId}` : "",
        normalizedPartNumber ? `pn:${normalizedPartNumber}` : "",
        normalizedPartNumber && normalizedSerialNumber
          ? `pn:${normalizedPartNumber}|sn:${normalizedSerialNumber}`
          : "",
      ].filter(Boolean);
      for (const key of keys) {
        const bucket = partLinkedSquawks.get(key);
        if (!bucket) continue;
        for (const [squawkId, linked] of bucket) {
          links.set(squawkId, linked);
        }
      }
      return Array.from(links.values()).sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: "base" }),
      );
    };

    const installedPartNumbers = new Set(
      partsForThisWorkOrder
        .filter((part) => mapPartToLifecycle(part, workOrderId) === "installed")
        .map((part) => normalizePartToken(part.partNumber))
        .filter(Boolean),
    );

    const requestItems = requestsForThisWorkOrder
      .filter((request) => {
        const requestLifecycle = mapRequestStatusToLifecycle(request.status);
        if (requestLifecycle !== "received_not_installed") return true;
        return !installedPartNumbers.has(normalizePartToken(request.partNumber));
      })
      .map(
        (request): PartLifecycleItem => ({
          id: `request:${request.id}`,
          partNumber: request.partNumber,
          partName: request.description,
          supplier: request.manufacturer,
          quantity: request.quantity,
          source: "request",
          status: mapRequestStatusToLifecycle(request.status),
          requestStatus: request.status,
          linkedSquawks: resolveSquawks(request.partNumber),
        }),
      );

    const inventoryItems = partsForThisWorkOrder.map(
      (part): PartLifecycleItem => ({
        id: `inventory:${String(part._id)}`,
        partNumber: part.partNumber,
        partName: part.partName,
        serialNumber: part.serialNumber,
        supplier: part.supplier,
        quantity:
          typeof part.quantityOnHand === "number"
            ? part.quantityOnHand
            : typeof part.quantity === "number"
              ? part.quantity
              : undefined,
        source: "inventory",
        status: mapPartToLifecycle(part, workOrderId),
        location: part.location,
        linkedSquawks: resolveSquawks(part.partNumber, part.serialNumber, String(part._id)),
      }),
    );

    return [...requestItems, ...inventoryItems].sort((a, b) =>
      a.partNumber.localeCompare(b.partNumber, undefined, { sensitivity: "base" }),
    );
  }, [partLinkedSquawks, partsForThisWorkOrder, requestsForThisWorkOrder, workOrderId]);

  const lifecycleItemsByStatus = useMemo(() => {
    return PARTS_LIFECYCLE_ORDER.reduce<Record<PartLifecycleStatus, PartLifecycleItem[]>>(
      (acc, status) => {
        acc[status] = partsLifecycleItems.filter((item) => item.status === status);
        return acc;
      },
      {
        requested_not_ordered: [],
        ordered_not_received: [],
        received_not_installed: [],
        installed: [],
        returned_to_stock: [],
      },
    );
  }, [partsLifecycleItems]);

  const partsBoardItems = useMemo(
    () =>
      partsLifecycleItems.map((item) => ({
        id: item.id,
        partNumber: item.partNumber,
        partName: item.partName,
        serialNumber: item.serialNumber,
        supplier: item.supplier,
        quantity: item.quantity,
        status: mapLifecycleToBoardStatus(item.status),
      })),
    [partsLifecycleItems],
  );

  const readinessBlockers = closeReadiness?.blockers ?? [];
  const canClose = closeReadiness?.canClose ?? false;

  const activeTimerEntry = activeTimer?.entry;
  const activeTimerOnThisWorkOrder =
    activeTimerEntry &&
    (activeTimerEntry.entryType ?? "work_order") === "work_order" &&
    activeTimerEntry.workOrderId === workOrderId;

  const workOrderStageFlow = useMemo<WorkOrderStageFlow[]>(() => {
    if (!configuredStageFlow || configuredStageFlow.length === 0) {
      return DEFAULT_WORK_ORDER_STAGE_FLOW;
    }
    const mapped = configuredStageFlow
      .map((stage, idx) => ({
        key: stage.id || `stage-${idx + 1}`,
        label: stage.label || `Stage ${idx + 1}`,
        statusMappings: stage.statusMappings ?? [],
        sortOrder: stage.sortOrder ?? idx,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ key, label, statusMappings }) => ({ key, label, statusMappings }));
    return mapped.length > 0 ? mapped : DEFAULT_WORK_ORDER_STAGE_FLOW;
  }, [configuredStageFlow]);

  const activeStageIndex = useMemo(
    () => mapStatusToStageIndex(wo.status, workOrderStageFlow),
    [wo.status, workOrderStageFlow],
  );

  const handleStartWorkOrderTimer = async () => {
    if (!orgId || !techId || !workOrderId) return;
    setTimerActionLoading("start");
    try {
      await startTimer({
        orgId,
        technicianId: techId,
        entryType: "work_order",
        workOrderId,
        source: "work_order_page",
      });
      toast.success("Work order timer started.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start work order timer.");
    } finally {
      setTimerActionLoading(null);
    }
  };

  const handleStopActiveTimer = async () => {
    if (!orgId || !activeTimerEntry) return;
    setTimerActionLoading("stop");
    try {
      await stopTimer({
        orgId,
        timeEntryId: activeTimerEntry._id,
      });
      toast.success("Active timer stopped.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop timer.");
    } finally {
      setTimerActionLoading(null);
    }
  };

  const handleJumpToSquawk = (squawkId: string) => {
    setActiveTab("squawks");
    setPendingSquawkId(squawkId);
  };

  // AI-003: Compute live compliance indicator for the Compliance tab badge.
  // red   → has active blockers preventing close
  // green → fully ready to close (all clear)
  // amber → loading or indeterminate state
  // null  → no indicator needed (tab not relevant)
  const complianceIndicator: "red" | "amber" | "green" | null =
    closeReadiness === undefined
      ? "amber"          // still loading
      : readinessBlockers.length > 0
        ? "red"          // has blocking conditions
        : canClose
          ? "green"      // fully compliant, ready to close
          : "amber";     // something pending but not blocking

  const handleUpdateVoiceNoteTranscript = async (noteId: string, transcript: string) => {
    if (!orgId || !workOrderId) return;
    setVoiceNotes((prev) => {
      const next = prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              transcript,
              updatedAt: Date.now(),
            }
          : note,
      );
      writeVoiceNotesForWorkOrder({ orgId, workOrderId: String(workOrderId) }, next);
      return next;
    });
  };

  const handleDeleteVoiceNote = async (noteId: string) => {
    if (!orgId || !workOrderId) return;
    setVoiceNotes((prev) => {
      const next = prev.filter((note) => note.id !== noteId);
      writeVoiceNotesForWorkOrder({ orgId, workOrderId: String(workOrderId) }, next);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-3 text-xs text-muted-foreground">
          <Link to="/work-orders">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Orders
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold font-mono text-foreground">{wo.workOrderNumber}</h1>
              <Badge
                variant="outline"
                className={`text-[11px] font-medium border ${
                  WO_STATUS_STYLES[wo.status as WoStatus] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/40">
                {WO_TYPE_LABEL[wo.workOrderType as WoType] ?? wo.workOrderType}
              </Badge>
              <ScheduleRiskChip riskLevel={riskLevel} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* BUG-FD-002: Aircraft registration was plain text — front desk couldn't
                  click through to the fleet detail page to check aircraft status, times,
                  or maintenance history. Now a link. */}
              {aircraft?.currentRegistration ? (
                <Link
                  to={`/fleet/${encodeURIComponent(aircraft.currentRegistration)}`}
                  className="font-mono font-bold text-2xl text-foreground hover:text-primary transition-colors"
                >
                  {aircraft.currentRegistration}
                </Link>
              ) : (
                <span className="font-mono font-bold text-2xl text-foreground">—</span>
              )}
              {aircraft && (
                <span className="text-base text-muted-foreground">
                  {aircraft.make} {aircraft.model}
                </span>
              )}
              {aircraft?.serialNumber && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">S/N {aircraft.serialNumber}</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{wo.description}</p>
            {/* BUG-FD-001: Show customer name with link to their billing profile.
                Front desk needs to identify the customer and navigate to their
                profile in one click — previously this info was invisible on WOs. */}
            {customer && (
              <div className="flex items-center gap-1.5 mt-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <Link
                  to={`/billing/customers/${customer._id}`}
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {customer.name}
                  {customer.companyName ? ` — ${customer.companyName}` : ""}
                </Link>
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto flex-shrink-0 flex flex-col gap-2">
            {activeTimerEntry ? (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] border ${
                    activeTimerOnThisWorkOrder
                      ? "bg-green-500/15 text-green-400 border-green-500/30"
                      : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                  }`}
                >
                  {activeTimerOnThisWorkOrder ? "Clocked to this WO" : `Active ${activeTimerEntry.entryType ?? "timer"}`}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={handleStopActiveTimer}
                  disabled={timerActionLoading === "stop"}
                >
                  <Square className="w-3.5 h-3.5" />
                  {timerActionLoading === "stop" ? "Stopping..." : "Stop Timer"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                onClick={handleStartWorkOrderTimer}
                disabled={timerActionLoading === "start"}
              >
                <Play className="w-3.5 h-3.5" />
                {timerActionLoading === "start" ? "Clocking..." : "Clock to WO"}
              </Button>
            )}

            <div className="flex items-center gap-2">
              <DownloadPDFButton
                label="Download WO Pack"
                fileName={`WO-${wo.workOrderNumber}.pdf`}
                document={(
                  <WorkOrderPDF
                    workOrder={wo}
                    aircraft={aircraft}
                    customer={customer ?? null}
                    taskCards={taskCards}
                    steps={taskCards.flatMap((tc) => tc.steps ?? []).map((s) => ({
                      taskCardId: String(s.taskCardId ?? ""),
                      description: s.description,
                      status: s.status,
                      partsInstalled: s.partsInstalled,
                    }))}
                    discrepancies={discrepancies}
                    timeLogs={timeLogs ?? []}
                    parts={partsForThisWorkOrder}
                  />
                )}
              />
              <PrintButton />
            </div>
            <Button variant="outline" asChild className="gap-2">
              <Link to={`/work-orders/${workOrderId}/execution`}>
                <Calendar className="w-4 h-4" />
                Execution Planning
              </Link>
            </Button>
            {isTerminalStatus ? (
              // BUG-SM-006: For closed/voided/cancelled WOs, replace the disabled
              // "Sign Off & Close" button with a direct link to the RTS record.
              // The disabled button was confusing on historical WOs (implied
              // something was wrong with a job that already completed).
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/work-orders/${workOrderId}/rts`}>
                  <ShieldCheck className="w-4 h-4" />
                  View RTS Record
                </Link>
              </Button>
            ) : canClose ? (
              // BUG-QCM-001: Previously this went to /signature without returnTo
              // or intendedTable params. After entering their PIN, the QCM had no
              // "Continue to Sign-Off" button (it only renders when returnTo is set),
              // so they were stranded on the signature page with an active 5-min
              // token and nowhere to go. The token would expire unused and they'd
              // have to know to manually navigate to /rts. Going directly to /rts
              // is the correct entry point — that page has the proper link to the
              // signature page with returnTo + intendedTable set, so the redirect
              // back to /rts?authEventId=... flows correctly.
              <Button className="gap-2" onClick={() => setDeferredCaptureOpen(true)}>
                <ShieldCheck className="w-4 h-4" />
                Sign Off & Close
              </Button>
            ) : (
              <Button variant="outline" disabled className="gap-2 opacity-50">
                <ShieldCheck className="w-4 h-4" />
                Sign Off & Close
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="px-4 sm:px-8 py-5">
          <div className="flex items-start w-full overflow-x-auto">
            {workOrderStageFlow.map((stage, idx) => {
              const isComplete = idx < activeStageIndex;
              const isCurrent = idx === activeStageIndex;
              const isLast = idx === workOrderStageFlow.length - 1;
              return (
                <div key={stage.key} className={`flex items-start min-w-0 ${isLast ? "" : "flex-1"}`}>
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isComplete
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? "✓" : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 text-center leading-tight whitespace-nowrap ${
                        isCurrent
                          ? "text-foreground font-medium"
                          : isComplete
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 mt-4 min-w-3 mx-1 ${
                        isComplete ? "bg-green-400 dark:bg-green-500" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <WOHeaderKPI
        workOrder={wo}
        taskCards={taskCards}
        timeEntries={timeLogs ?? []}
        parts={partsForThisWorkOrder}
      />

      {!canClose && readinessBlockers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-1">
                  Cannot close WO — {readinessBlockers.length} blockers
                </p>
                <ul className="space-y-0.5">
                  {readinessBlockers.map((b) => (
                    <li key={b} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="squawks">
        <TabsList className="h-9 bg-muted/40 p-0.5 mb-4 overflow-x-auto max-w-full flex-wrap">
          {(
            [
              { value: "squawks", label: "Tasks & Findings", Icon: AlertTriangle, count: workItems.length, indicator: null as "red" | "amber" | "green" | null },
              { value: "compliance", label: "Compliance", Icon: ShieldCheck, count: null, indicator: complianceIndicator },
              { value: "parts", label: "Parts", Icon: Package, count: partsForThisWorkOrder.length, indicator: null as "red" | "amber" | "green" | null },
              { value: "cost", label: "Cost Estimate", Icon: CheckCircle2, count: null, indicator: null as "red" | "amber" | "green" | null },
              { value: "evidence", label: "Evidence", Icon: Video, count: null, indicator: null as "red" | "amber" | "green" | null },
              { value: "documents", label: "Documents", Icon: Paperclip, count: null, indicator: null as "red" | "amber" | "green" | null },
              { value: "notes", label: "Notes & Activity", Icon: FileText, count: auditEvents.length + voiceNotes.length, indicator: null as "red" | "amber" | "green" | null },
            ]
          ).map(({ value, label, Icon, count, indicator }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-8 px-3.5 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count !== null && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-[16px] px-1 text-[9px] bg-muted-foreground/20 text-muted-foreground"
                >
                  {count}
                </Badge>
              )}
              {indicator === "red" && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
              {indicator === "amber" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              {indicator === "green" && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="squawks" className="mt-0">
          {/* AI-053/054: Pass org/tech context for Log Squawk + FindingRow disposition */}
          <WorkItemsList
            items={workItems}
            workOrderId={String(workOrderId)}
            workOrderIdTyped={workOrderId}
            orgId={orgId}
            techId={techId ?? undefined}
            aircraftCurrentHours={wo.aircraftTotalTimeAtOpen ?? null}
            workOrderStatus={wo.status}
          />
          <div className="mt-4">
            <DiscrepancyList
              discrepancies={discrepancies}
              orgId={orgId}
              techId={techId}
              workOrderId={workOrderId}
              aircraftCurrentHours={wo.aircraftTotalTimeAtOpen}
            />
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-0">
          <WOComplianceTab workOrderId={String(workOrderId)} />
        </TabsContent>

        <TabsContent value="parts" className="mt-0 space-y-3">
          <div className="flex justify-between gap-2">
            <div className="inline-flex items-center gap-1 rounded-md border border-border/60 p-1">
              <Button
                size="sm"
                variant={partsTabView === "list" ? "default" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setPartsTabView("list")}
              >
                List
              </Button>
              <Button
                size="sm"
                variant={partsTabView === "board" ? "default" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setPartsTabView("board")}
              >
                Board
              </Button>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={() => setPartRequestDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Request Part
            </Button>
          </div>

          {/* Live WO parts from workOrderParts table */}
          {(woPartsLive ?? []).length > 0 && partsTabView === "list" && (
            <div className="space-y-2">
              {(woPartsLive ?? [])
                .filter((r) => r.status !== "cancelled")
                .map((record) => (
                  <Card key={record._id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              P/N: {record.partNumber}
                            </span>
                            <PartStatusBadge status={record.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">{record.partName}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">Qty: {record.quantityRequested}</span>
                            {record.notes && (
                              <span className="text-[11px] text-muted-foreground">{record.notes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {(woPartsLive ?? []).length > 0 && partsTabView === "board" && (
            <WOPartsLifecycleBoard workOrderId={workOrderId} />
          )}

          {/* Legacy: inventory-linked parts (existing behavior) */}
          {partsLifecycleItems.length === 0 && (woPartsLive ?? []).length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No parts currently linked to this work order.
              </CardContent>
            </Card>
          ) : partsLifecycleItems.length > 0 && partsTabView === "board" && (woPartsLive ?? []).length === 0 ? (
            <WOPartsLifecycleBoard items={partsBoardItems} />
          ) : partsLifecycleItems.length > 0 && partsTabView === "list" ? (
            <div className="space-y-2">
              {PARTS_LIFECYCLE_ORDER.map((status) => {
                const items = lifecycleItemsByStatus[status];
                if (items.length === 0) return null;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <PartStatusBadge status={mapLifecycleToBadgeStatus(status)} />
                      <span className="text-xs text-muted-foreground">{items.length}</span>
                    </div>
                    {items.map((item) => (
                      <Card key={item.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  P/N: {item.partNumber}
                                </span>
                                <PartStatusBadge status={mapLifecycleToBadgeStatus(item.status)} />
                              </div>
                              <p className="text-sm text-muted-foreground">{item.partName}</p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {item.serialNumber && (
                                  <span className="text-[11px] font-mono text-muted-foreground">S/N: {item.serialNumber}</span>
                                )}
                                {item.supplier && (
                                  <span className="text-[11px] text-muted-foreground">Supplier: {item.supplier}</span>
                                )}
                                {typeof item.quantity === "number" && (
                                  <span className="text-[11px] text-muted-foreground">Qty: {item.quantity}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Part Request Dialog */}
          {orgId && (
            <PartRequestDialog
              open={partRequestDialogOpen}
              onClose={() => setPartRequestDialogOpen(false)}
              workOrderId={workOrderId}
              organizationId={orgId}
              technicianId={techId ?? undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="cost" className="mt-0">
          <CostEstimationPanel
            orgId={orgId}
            workOrderId={workOrderId}
            workOrderNumber={wo.workOrderNumber}
            timeEntries={(timeLogs ?? []) as any[]}
            parts={partsForThisWorkOrder}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <DocumentsPanel workOrderId={String(workOrderId)} />
        </TabsContent>

        <TabsContent value="evidence" className="mt-0">
          <InDockEvidenceHub workOrderId={String(workOrderId)} />
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          {/* BUG-SM-090 (re-applied): HandoffNotesPanel was rendered OUTSIDE the
              Tabs component at page bottom, invisible to anyone on the Notes tab.
              Moved here so shift handoff notes appear first (more time-sensitive
              than audit history), followed by the audit activity timeline. */}
          <div className="space-y-4 mb-4">
            {taskCards.length > 0 && (
              <>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Shift Handoff Notes
              </h3>
              {taskCards.map((tc) => (
                <div key={tc._id}>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {tc.taskCardNumber} — {tc.title}
                  </p>
                  <HandoffNotesPanel
                    taskCardId={tc._id}
                    notes={(tc.handoffNotes as { technicianId: string; technicianName: string; note: string; createdAt: number }[]) ?? []}
                  />
                </div>
              ))}
              </>
            )}
            <VoiceNotesPanel
              notes={voiceNotes}
              onUpdateTranscript={handleUpdateVoiceNoteTranscript}
              onDelete={handleDeleteVoiceNote}
            />
          </div>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Work Order Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ActivityTimeline events={auditEvents as AuditEventForTimeline[]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Close Readiness Panel — hidden for terminal-status WOs (BUG-SM-005) */}
      {!isTerminalStatus && (
        <CloseReadinessPanel
          workOrderId={workOrderId}
          organizationId={orgId}
        />
      )}

      {/* Deferred Maintenance Capture Dialog (Wave 5) */}
      <DeferredMaintenanceCaptureDialog
        open={deferredCaptureOpen}
        onOpenChange={setDeferredCaptureOpen}
        workOrderId={workOrderId}
        organizationId={orgId}
        onComplete={() => {
          setDeferredCaptureOpen(false);
          // BUG-QCM-C17: was window.location.href which triggered a full page
          // reload — Convex dropped all subscriptions, Clerk re-validated the
          // session, and any unsaved state was lost. Use the SPA router instead
          // so the navigation is instant and Convex subscriptions stay alive.
          navigate(`/work-orders/${workOrderId}/rts`);
        }}
      />
    </div>
  );
}
