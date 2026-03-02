"use client";

import { useEffect, useState } from "react";
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
import { Rocket, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type OnboardingDefaults = {
  capacityBufferPercent: number;
  defaultStartHour: number;
  defaultEndHour: number;
  defaultEfficiencyMultiplier: number;
  defaultShopRate: number;
};

interface SchedulingOnboardingPanelProps {
  visible: boolean;
  setupOpen: boolean;
  onSetupOpenChange: (open: boolean) => void;
  defaults: OnboardingDefaults;
  defaultsAppliedAt?: number;
  onApplyDefaults: (next: OnboardingDefaults) => Promise<void>;
  onSkip: () => void;
  onComplete: () => void;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SchedulingOnboardingPanel({
  visible,
  setupOpen,
  onSetupOpenChange,
  defaults,
  defaultsAppliedAt,
  onApplyDefaults,
  onSkip,
  onComplete,
}: SchedulingOnboardingPanelProps) {
  const [capacityBufferPercent, setCapacityBufferPercent] = useState(
    String(defaults.capacityBufferPercent),
  );
  const [defaultStartHour, setDefaultStartHour] = useState(String(defaults.defaultStartHour));
  const [defaultEndHour, setDefaultEndHour] = useState(String(defaults.defaultEndHour));
  const [defaultEfficiencyMultiplier, setDefaultEfficiencyMultiplier] = useState(
    String(defaults.defaultEfficiencyMultiplier),
  );
  const [defaultShopRate, setDefaultShopRate] = useState(String(defaults.defaultShopRate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!setupOpen) return;
    setCapacityBufferPercent(String(defaults.capacityBufferPercent));
    setDefaultStartHour(String(defaults.defaultStartHour));
    setDefaultEndHour(String(defaults.defaultEndHour));
    setDefaultEfficiencyMultiplier(String(defaults.defaultEfficiencyMultiplier));
    setDefaultShopRate(String(defaults.defaultShopRate));
  }, [setupOpen, defaults]);

  async function handleApplyDefaults() {
    setSaving(true);
    try {
      await onApplyDefaults({
        capacityBufferPercent: clampNumber(
          Number(capacityBufferPercent) || defaults.capacityBufferPercent,
          0,
          50,
        ),
        defaultStartHour: clampNumber(Number(defaultStartHour) || defaults.defaultStartHour, 0, 23),
        defaultEndHour: clampNumber(Number(defaultEndHour) || defaults.defaultEndHour, 0, 23),
        defaultEfficiencyMultiplier: clampNumber(
          Number(defaultEfficiencyMultiplier) || defaults.defaultEfficiencyMultiplier,
          0.5,
          2.5,
        ),
        defaultShopRate: clampNumber(Number(defaultShopRate) || defaults.defaultShopRate, 0, 10000),
      });
      toast.success("Scheduling onboarding defaults applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply onboarding defaults");
    } finally {
      setSaving(false);
    }
  }

  if (!visible && !setupOpen) return null;

  return (
    <>
      {visible && (
        <div className="px-2 sm:px-4 pt-2" data-testid="scheduling-onboarding-banner">
          <Card className="border-cyan-500/40 bg-cyan-500/8">
            <CardContent className="py-3 px-3 sm:px-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-cyan-400" />
                  Welcome to Scheduling
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run quick setup defaults, then mark onboarding complete.
                </p>
                {defaultsAppliedAt && (
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    Defaults applied{" "}
                    {new Date(defaultsAppliedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onSkip}
                  data-testid="onboarding-skip-banner"
                >
                  Skip for now
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
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={setupOpen} onOpenChange={onSetupOpenChange}>
        <DialogContent className="max-w-xl" data-testid="scheduling-onboarding-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Scheduling Setup Defaults
            </DialogTitle>
            <DialogDescription>
              Configure baseline scheduling and financial assumptions for your planning surface.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-capacity-buffer">Capacity Buffer %</Label>
              <Input
                id="onboarding-capacity-buffer"
                value={capacityBufferPercent}
                onChange={(event) => setCapacityBufferPercent(event.target.value)}
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
              <Label htmlFor="onboarding-efficiency">Default Efficiency Multiplier</Label>
              <Input
                id="onboarding-efficiency"
                value={defaultEfficiencyMultiplier}
                onChange={(event) => setDefaultEfficiencyMultiplier(event.target.value)}
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
