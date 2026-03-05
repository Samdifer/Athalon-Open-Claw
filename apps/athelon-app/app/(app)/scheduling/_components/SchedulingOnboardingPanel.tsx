"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  Settings2,
  Sparkles,
  Warehouse,
  Plane,
  ClipboardList,
  GripHorizontal,
  Check,
  ChevronRight,
  SkipForward,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING STEPS
// ─────────────────────────────────────────────────────────────────────────────

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  ctaLabel: string;
  ctaLink?: string;
  ctaAction?: "open-setup";
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "hangar",
    title: "Create your first hangar bay",
    description:
      "Hangar bays are physical spaces where aircraft are worked on. Create one or use sample data.",
    icon: <Warehouse className="h-5 w-5 text-cyan-400" />,
    ctaLabel: "Manage Bays",
    ctaLink: "/scheduling/bays",
  },
  {
    id: "aircraft",
    title: "Add an aircraft",
    description:
      "Register an aircraft so you can assign work orders to it.",
    icon: <Plane className="h-5 w-5 text-cyan-400" />,
    ctaLabel: "Add Aircraft",
    ctaLink: "/aircraft/new",
  },
  {
    id: "workorder",
    title: "Create a work order",
    description:
      "Work orders define the maintenance tasks to be performed. Create your first one.",
    icon: <ClipboardList className="h-5 w-5 text-cyan-400" />,
    ctaLabel: "New Work Order",
    ctaLink: "/work-orders/new",
  },
  {
    id: "schedule",
    title: "Drag it onto the schedule",
    description:
      "Open the backlog sidebar and drag a work order onto a bay in the Gantt board.",
    icon: <GripHorizontal className="h-5 w-5 text-cyan-400" />,
    ctaLabel: "Open Backlog",
  },
];

const STORAGE_KEY_PREFIX = "athelon:scheduling:onboarding-steps:";

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

type OnboardingDefaults = {
  capacityBufferPercent: number;
  defaultStartHour: number;
  defaultEndHour: number;
  defaultEfficiencyMultiplier: number;
  defaultShopRate: number;
};

type OnboardingLocationOption = {
  id: string;
  name: string;
  code: string;
  certificateNumber?: string;
  repairStationCertificateNumber?: string;
};

interface SchedulingOnboardingPanelProps {
  visible: boolean;
  setupOpen: boolean;
  onSetupOpenChange: (open: boolean) => void;
  defaults: OnboardingDefaults;
  defaultsAppliedAt?: number;
  onApplyDefaults: (
    next: OnboardingDefaults,
    options?: { selectedLocationIds: string[] },
  ) => Promise<void>;
  onSkip: () => void;
  onComplete: () => void;
  /** Used to open backlog from step 4 */
  onOpenBacklog?: () => void;
  locationOptions?: OnboardingLocationOption[];
  selectedLocationIds?: string[];
  onSelectedLocationIdsChange?: (ids: string[]) => void;
  onCreateLocation?: (input: {
    name: string;
    code: string;
    repairStationCertificateNumber?: string;
  }) => Promise<void>;
  /** Unique key for localStorage scoping (orgId:techId) */
  storageKey?: string;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function SchedulingOnboardingPanel({
  visible,
  setupOpen,
  onSetupOpenChange,
  defaults,
  defaultsAppliedAt,
  onApplyDefaults,
  onSkip,
  onComplete,
  onOpenBacklog,
  locationOptions = [],
  selectedLocationIds = [],
  onSelectedLocationIdsChange,
  onCreateLocation,
  storageKey = "default",
}: SchedulingOnboardingPanelProps) {
  // ── Step completion state ──────────────────────────────────────────────
  const stepsStorageKey = `${STORAGE_KEY_PREFIX}${storageKey}`;
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(stepsStorageKey);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {}
    return new Set();
  });

  const [currentStepIdx, setCurrentStepIdx] = useState(() => {
    const firstIncomplete = ONBOARDING_STEPS.findIndex(
      (s) => !completedSteps.has(s.id),
    );
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });

  const persistSteps = useCallback(
    (next: Set<string>) => {
      setCompletedSteps(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          stepsStorageKey,
          JSON.stringify(Array.from(next)),
        );
      }
    },
    [stepsStorageKey],
  );

  const markStepComplete = useCallback(
    (stepId: string) => {
      const next = new Set(completedSteps);
      next.add(stepId);
      persistSteps(next);

      // Auto-advance
      const nextIncomplete = ONBOARDING_STEPS.findIndex(
        (s) => !next.has(s.id),
      );
      if (nextIncomplete >= 0) {
        setCurrentStepIdx(nextIncomplete);
      }

      // Auto-dismiss when all complete
      if (next.size >= ONBOARDING_STEPS.length) {
        onComplete();
      }
    },
    [completedSteps, persistSteps, onComplete],
  );

  const skipStep = useCallback(() => {
    const nextIdx = Math.min(currentStepIdx + 1, ONBOARDING_STEPS.length - 1);
    setCurrentStepIdx(nextIdx);
  }, [currentStepIdx]);

  const progressPercent =
    (completedSteps.size / ONBOARDING_STEPS.length) * 100;

  // ── Setup dialog state ─────────────────────────────────────────────────
  const [capacityBufferPercent, setCapacityBufferPercent] = useState(
    String(defaults.capacityBufferPercent),
  );
  const [defaultStartHour, setDefaultStartHour] = useState(
    String(defaults.defaultStartHour),
  );
  const [defaultEndHour, setDefaultEndHour] = useState(
    String(defaults.defaultEndHour),
  );
  const [defaultEfficiencyMultiplier, setDefaultEfficiencyMultiplier] = useState(
    String(defaults.defaultEfficiencyMultiplier),
  );
  const [defaultShopRate, setDefaultShopRate] = useState(
    String(defaults.defaultShopRate),
  );
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCode, setNewLocationCode] = useState("");
  const [newLocationCert, setNewLocationCert] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeLocationIds = useMemo(
    () => locationOptions.map((location) => location.id),
    [locationOptions],
  );
  const normalizedSelectedLocationIds = useMemo(
    () => selectedLocationIds.filter((id) => activeLocationIds.includes(id)),
    [selectedLocationIds, activeLocationIds],
  );

  useEffect(() => {
    if (!setupOpen) return;
    setCapacityBufferPercent(String(defaults.capacityBufferPercent));
    setDefaultStartHour(String(defaults.defaultStartHour));
    setDefaultEndHour(String(defaults.defaultEndHour));
    setDefaultEfficiencyMultiplier(String(defaults.defaultEfficiencyMultiplier));
    setDefaultShopRate(String(defaults.defaultShopRate));
    setNewLocationName("");
    setNewLocationCode("");
    setNewLocationCert("");

    if (onSelectedLocationIdsChange && locationOptions.length > 0 && selectedLocationIds.length === 0) {
      onSelectedLocationIdsChange(activeLocationIds);
    }
  }, [
    setupOpen,
    defaults,
    onSelectedLocationIdsChange,
    locationOptions.length,
    selectedLocationIds.length,
    activeLocationIds,
  ]);

  function toggleLocationSelection(locationId: string) {
    if (!onSelectedLocationIdsChange) return;

    const next = normalizedSelectedLocationIds.includes(locationId)
      ? normalizedSelectedLocationIds.filter((id) => id !== locationId)
      : [...normalizedSelectedLocationIds, locationId];

    onSelectedLocationIdsChange(next);
  }

  async function handleCreateLocation() {
    if (!onCreateLocation) return;

    const trimmedName = newLocationName.trim();
    const trimmedCode = newLocationCode.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) {
      toast.error("Location name and code are required");
      return;
    }

    setAddingLocation(true);
    try {
      await onCreateLocation({
        name: trimmedName,
        code: trimmedCode,
        repairStationCertificateNumber: newLocationCert.trim() || undefined,
      });
      setNewLocationName("");
      setNewLocationCode("");
      setNewLocationCert("");
      toast.success("Location added to scheduling onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setAddingLocation(false);
    }
  }

  async function handleApplyDefaults() {
    setSaving(true);
    try {
      await onApplyDefaults({
        capacityBufferPercent: clampNumber(
          Number(capacityBufferPercent) || defaults.capacityBufferPercent,
          0,
          50,
        ),
        defaultStartHour: clampNumber(
          Number(defaultStartHour) || defaults.defaultStartHour,
          0,
          23,
        ),
        defaultEndHour: clampNumber(
          Number(defaultEndHour) || defaults.defaultEndHour,
          0,
          23,
        ),
        defaultEfficiencyMultiplier: clampNumber(
          Number(defaultEfficiencyMultiplier) ||
            defaults.defaultEfficiencyMultiplier,
          0.5,
          2.5,
        ),
        defaultShopRate: clampNumber(
          Number(defaultShopRate) || defaults.defaultShopRate,
          0,
          10000,
        ),
      }, {
        selectedLocationIds:
          normalizedSelectedLocationIds.length > 0
            ? normalizedSelectedLocationIds
            : activeLocationIds,
      });
      toast.success("Scheduling onboarding defaults applied");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to apply onboarding defaults",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!visible && !setupOpen) return null;

  const currentStep = ONBOARDING_STEPS[currentStepIdx];

  return (
    <>
      {visible && (
        <div className="px-2 sm:px-4 pt-2" data-testid="scheduling-onboarding-banner">
          <Card className="border-cyan-500/40 bg-cyan-500/8">
            <CardContent className="py-3 px-3 sm:px-4 space-y-3">
              {/* Header row */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-cyan-400" />
                    Welcome to Scheduling
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete these steps to get your scheduling board ready.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onSkip}
                    data-testid="onboarding-skip-banner"
                  >
                    Skip All
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onSetupOpenChange(true)}
                    data-testid="onboarding-run-setup"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Run Setup
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {completedSteps.size} of {ONBOARDING_STEPS.length} steps
                  </span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>

              {/* Step cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {ONBOARDING_STEPS.map((step, idx) => {
                  const isComplete = completedSteps.has(step.id);
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`flex items-start gap-2 rounded-md border p-2 text-left transition-colors ${
                        isComplete
                          ? "border-green-500/40 bg-green-500/5 opacity-70"
                          : isCurrent
                            ? "border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/30"
                            : "border-border/40 bg-background/30 opacity-60"
                      }`}
                      onClick={() => {
                        if (!isComplete) setCurrentStepIdx(idx);
                      }}
                      data-testid={`onboarding-step-${step.id}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isComplete ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium block truncate">
                          {step.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current step detail */}
              {currentStep && !completedSteps.has(currentStep.id) && (
                <div className="flex items-center gap-3 rounded-md border border-cyan-400/30 bg-cyan-500/5 p-3">
                  <div className="flex-shrink-0">{currentStep.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{currentStep.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {currentStep.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => skipStep()}
                    >
                      <SkipForward className="w-3 h-3" />
                      Skip
                    </Button>
                    {currentStep.ctaLink ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                        onClick={() => markStepComplete(currentStep.id)}
                      >
                        <Link to={currentStep.ctaLink}>
                          {currentStep.ctaLabel}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (currentStep.id === "schedule") {
                            onOpenBacklog?.();
                          }
                          markStepComplete(currentStep.id);
                        }}
                      >
                        {currentStep.ctaLabel}
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {defaultsAppliedAt && (
                <Badge variant="outline" className="text-[10px]">
                  Defaults applied{" "}
                  {new Date(defaultsAppliedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup dialog */}
      <Dialog open={setupOpen} onOpenChange={onSetupOpenChange}>
        <DialogContent className="max-w-xl" data-testid="scheduling-onboarding-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Scheduling Setup Defaults
            </DialogTitle>
            <DialogDescription>
              Configure baseline scheduling and financial assumptions for your
              planning surface.
            </DialogDescription>
          </DialogHeader>

          {locationOptions.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Scheduling locations</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => onSelectedLocationIdsChange?.(activeLocationIds)}
                >
                  Select all
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Choose one or more locations for onboarding context.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {locationOptions.map((location) => {
                  const selected = normalizedSelectedLocationIds.includes(location.id);
                  const cert =
                    location.repairStationCertificateNumber ?? location.certificateNumber;
                  return (
                    <Button
                      key={location.id}
                      type="button"
                      variant={selected ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => toggleLocationSelection(location.id)}
                    >
                      {location.name}
                      <span className="text-[10px] text-muted-foreground">{location.code}</span>
                      {cert && (
                        <span className="hidden sm:inline text-[10px] text-muted-foreground">
                          • {cert}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-md border border-border/50 p-3">
            <p className="text-xs font-semibold">Add location</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Location name"
                value={newLocationName}
                onChange={(event) => setNewLocationName(event.target.value)}
              />
              <Input
                placeholder="Code"
                value={newLocationCode}
                onChange={(event) => setNewLocationCode(event.target.value)}
              />
              <Input
                placeholder="Repair cert # (optional)"
                value={newLocationCert}
                onChange={(event) => setNewLocationCert(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCreateLocation}
              disabled={!onCreateLocation || addingLocation}
            >
              {addingLocation ? "Adding..." : "Add Location"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-capacity-buffer">
                Capacity Buffer %
              </Label>
              <Input
                id="onboarding-capacity-buffer"
                value={capacityBufferPercent}
                onChange={(event) =>
                  setCapacityBufferPercent(event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-shop-rate">Default Shop Rate</Label>
              <Input
                id="onboarding-shop-rate"
                value={defaultShopRate}
                onChange={(event) => setDefaultShopRate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-start-hour">Default Start Hour</Label>
              <Input
                id="onboarding-start-hour"
                value={defaultStartHour}
                onChange={(event) => setDefaultStartHour(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-end-hour">Default End Hour</Label>
              <Input
                id="onboarding-end-hour"
                value={defaultEndHour}
                onChange={(event) => setDefaultEndHour(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="onboarding-efficiency">
                Default Efficiency Multiplier
              </Label>
              <Input
                id="onboarding-efficiency"
                value={defaultEfficiencyMultiplier}
                onChange={(event) =>
                  setDefaultEfficiencyMultiplier(event.target.value)
                }
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onSkip}
                className="h-8 text-xs"
                data-testid="onboarding-skip-dialog"
              >
                Skip
              </Button>
              <Button
                variant="secondary"
                onClick={onComplete}
                className="h-8 text-xs"
                data-testid="onboarding-complete"
              >
                Mark Complete
              </Button>
            </div>
            <Button
              onClick={handleApplyDefaults}
              disabled={saving}
              className="h-8 text-xs"
              data-testid="onboarding-apply-defaults"
            >
              {saving ? "Applying..." : "Apply Setup Defaults"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
