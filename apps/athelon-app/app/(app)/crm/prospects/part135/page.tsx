"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  FileStack,
  Filter,
  Plane,
  PlaneTakeoff,
  Search,
  ShieldCheck,
  Target,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  part135Operators,
  part135ResearchPack,
} from "@/src/shared/data/part135Operators";
import type { Part135OperatorRecord } from "@/src/shared/data/part135Operators";
import { coloradoPart145Research } from "@/src/shared/data/coloradoPart145Research";

type CampaignFit = "high" | "medium" | "low" | "unknown";
type QualificationStatus =
  | "unreviewed"
  | "qualified"
  | "nurture"
  | "research"
  | "disqualified";
type ContactStrategy =
  | "call_first"
  | "email_first"
  | "multi_touch"
  | "warm_intro"
  | "research_first"
  | "site_visit"
  | "other";
type AssessmentStatusFilter = QualificationStatus | "all";
type OutreachTierFilter = "all" | "A" | "B" | "C";
type FleetSizeFilter = "all" | "small" | "medium" | "large" | "enterprise";
type TurbineFilter = "all" | "yes" | "no";
type ProspectViewMode = "tiles" | "list" | "expanded";

type ProspectAssessment = {
  _id: string;
  prospectEntityId: string;
  campaignKey: string;
  campaignName: string;
  campaignFit: CampaignFit;
  qualificationStatus: QualificationStatus;
  fitScore?: number;
  contactStrategy?: ContactStrategy;
  notes?: string;
  nextStep?: string;
  selectedOutreachTier?: "A" | "B" | "C";
  promotedCustomerId?: string;
  promotedAt?: number;
  reviewedByName?: string;
  updatedAt: number;
};

const DEFAULT_CAMPAIGN = "Part 135 Operator Outreach";
const VIEW_MODES: ProspectViewMode[] = ["tiles", "list", "expanded"];

const TIER_STYLES: Record<string, string> = {
  A: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  B: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  C: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const QUALIFICATION_STYLES: Record<QualificationStatus, string> = {
  unreviewed: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  qualified: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  nurture: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  research: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  disqualified: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
};

const CAMPAIGN_FIT_STYLES: Record<CampaignFit, string> = {
  high: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  low: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  unknown: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const CONTACT_STRATEGY_LABELS: Record<ContactStrategy, string> = {
  call_first: "Call first",
  email_first: "Email first",
  multi_touch: "Multi-touch",
  warm_intro: "Warm intro",
  research_first: "Research first",
  site_visit: "Site visit",
  other: "Other",
};

const QUALIFICATION_LABELS: Record<QualificationStatus, string> = {
  unreviewed: "Unreviewed",
  qualified: "Qualified",
  nurture: "Nurture",
  research: "Needs Research",
  disqualified: "Disqualified",
};

const CAMPAIGN_FIT_LABELS: Record<CampaignFit, string> = {
  high: "High fit",
  medium: "Medium fit",
  low: "Low fit",
  unknown: "Unknown fit",
};

const VIEW_MODE_LABELS: Record<ProspectViewMode, string> = {
  tiles: "Tiles",
  list: "List",
  expanded: "Expanded",
};

const FLEET_SIZE_LABELS: Record<string, string> = {
  small: "Small (1-3)",
  medium: "Medium (4-10)",
  large: "Large (11-30)",
  enterprise: "Enterprise (31+)",
};

function normalizeCampaignKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "general-qualification";
}

function formatTimestamp(value?: number) {
  if (!value) return "Not reviewed";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function humanize(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function readViewMode(value: string | null): ProspectViewMode {
  return VIEW_MODES.includes(value as ProspectViewMode)
    ? (value as ProspectViewMode)
    : "tiles";
}

function readAssessmentFilter(value: string | null): AssessmentStatusFilter {
  return value === "qualified" ||
    value === "nurture" ||
    value === "research" ||
    value === "disqualified" ||
    value === "unreviewed"
    ? value
    : "all";
}

function readOutreachTierFilter(value: string | null): OutreachTierFilter {
  return value === "A" || value === "B" || value === "C" ? value : "all";
}

function readFleetSizeFilter(value: string | null): FleetSizeFilter {
  return value === "small" || value === "medium" || value === "large" || value === "enterprise"
    ? value
    : "all";
}

function readTurbineFilter(value: string | null): TurbineFilter {
  return value === "yes" || value === "no" ? value : "all";
}

// Cross-reference Part 135 operators with Colorado Part 145 research
const part145NameIndex = new Map(
  coloradoPart145Research.map((r) => [r.legalName.toLowerCase().trim(), r]),
);

function ProspectListSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
        <Skeleton className="h-[720px]" />
        <Skeleton className="h-[720px]" />
      </div>
    </div>
  );
}

function OperatorStateBadges(props: {
  operator: Part135OperatorRecord;
  assessment?: ProspectAssessment;
  campaignFit?: CampaignFit;
}) {
  const { operator, assessment, campaignFit } = props;
  const effectiveStatus = assessment?.qualificationStatus ?? "unreviewed";

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className={TIER_STYLES[operator.outreachTier]}>
        Tier {operator.outreachTier}
      </Badge>
      <Badge variant="outline" className={QUALIFICATION_STYLES[effectiveStatus]}>
        {QUALIFICATION_LABELS[effectiveStatus]}
      </Badge>
      {campaignFit ? (
        <Badge variant="outline" className={CAMPAIGN_FIT_STYLES[campaignFit]}>
          {CAMPAIGN_FIT_LABELS[campaignFit]}
        </Badge>
      ) : null}
    </div>
  );
}

function OperatorSignalStrip(props: {
  operator: Part135OperatorRecord;
  assessment?: ProspectAssessment;
}) {
  const { operator, assessment } = props;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Plane className="h-3.5 w-3.5" />
        {operator.fleetSize} aircraft
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" />
        {humanize(operator.fleetSizeClass)}
      </span>
      {operator.hasTurbine ? (
        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
          <PlaneTakeoff className="h-3.5 w-3.5" />
          Turbine
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <PlaneTakeoff className="h-3.5 w-3.5" />
          Piston/Other
        </span>
      )}
      {operator.topModel ? (
        <span className="inline-flex items-center gap-1">
          <Target className="h-3.5 w-3.5" />
          {operator.topModel}
        </span>
      ) : null}
      {assessment?.fitScore ? (
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <UserRoundCheck className="h-3.5 w-3.5" />
          Fit {assessment.fitScore}/5
        </span>
      ) : null}
    </div>
  );
}

function OperatorTileCard(props: {
  operator: Part135OperatorRecord;
  assessment?: ProspectAssessment;
  detailHref: string;
}) {
  const { operator, assessment, detailHref } = props;

  return (
    <Card className="border-border/60 h-full">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">{operator.legalName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {operator.certificateDesignator} · {operator.faaDistrictOffice}
            </p>
          </div>
          <OperatorStateBadges operator={operator} assessment={assessment} />
        </div>

        <OperatorSignalStrip operator={operator} assessment={assessment} />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{FLEET_SIZE_LABELS[operator.fleetSizeClass] ?? humanize(operator.fleetSizeClass)}</Badge>
          {operator.hasTurbine ? (
            <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              Turbine fleet
            </Badge>
          ) : null}
          <Badge variant="secondary">{operator.uniqueModelCount} model{operator.uniqueModelCount !== 1 ? "s" : ""}</Badge>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {operator.fleetSize} aircraft · {operator.faaDistrictOffice}
          </div>
          <Button asChild size="sm">
            <Link to={detailHref}>Open profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OperatorListRow(props: {
  operator: Part135OperatorRecord;
  assessment?: ProspectAssessment;
  detailHref: string;
}) {
  const { operator, assessment, detailHref } = props;

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-sm font-semibold leading-tight">{operator.legalName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {operator.certificateDesignator} · {operator.faaDistrictOffice}
            </p>
          </div>
          <OperatorStateBadges operator={operator} assessment={assessment} />
          <OperatorSignalStrip operator={operator} assessment={assessment} />
        </div>

        <div className="space-y-3 lg:min-w-[320px] lg:text-right">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Badge variant="secondary">{FLEET_SIZE_LABELS[operator.fleetSizeClass] ?? humanize(operator.fleetSizeClass)}</Badge>
            {operator.hasTurbine ? (
              <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                Turbine fleet
              </Badge>
            ) : null}
          </div>
          <div className="flex justify-start lg:justify-end">
            <Button asChild size="sm">
              <Link to={detailHref}>Open profile</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OperatorExpandedCard(props: {
  operator: Part135OperatorRecord;
  assessment?: ProspectAssessment;
  detailHref: string;
}) {
  const { operator, assessment, detailHref } = props;

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">{operator.legalName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {operator.certificateDesignator} · {operator.faaDistrictOffice}
            </p>
          </div>
          <OperatorStateBadges operator={operator} assessment={assessment} />
        </div>

        <OperatorSignalStrip operator={operator} assessment={assessment} />

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">FAA District</p>
            <p className="mt-2 text-sm">{operator.faaDistrictOffice}</p>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fleet Profile</p>
            <div className="mt-2 space-y-1 text-sm">
              <p>{operator.fleetSize} aircraft ({humanize(operator.fleetSizeClass)})</p>
              <p>{operator.uniqueModelCount} unique model{operator.uniqueModelCount !== 1 ? "s" : ""}</p>
              {operator.topModel ? <p>Primary: {operator.topModel}</p> : null}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Propulsion</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {operator.hasTurbine ? (
                <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  Turbine fleet
                </Badge>
              ) : (
                <Badge variant="secondary">Piston/Other</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Aircraft models</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {operator.aircraftModels.slice(0, 12).map((model) => (
              <Badge key={model} variant="secondary">
                {model}
              </Badge>
            ))}
            {operator.aircraftModels.length > 12 ? (
              <Badge variant="outline">+{operator.aircraftModels.length - 12} more</Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            N-numbers: {operator.registrationNumbers.slice(0, 5).join(", ")}
            {operator.registrationNumbers.length > 5 ? ` +${operator.registrationNumbers.length - 5} more` : ""}
          </div>
          <Button asChild>
            <Link to={detailHref}>Open full profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailInfoRow(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const { icon: Icon, label, value } = props;

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-start gap-2 text-sm">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <span>{value}</span>
      </div>
    </div>
  );
}

export default function Part135IntelligencePage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { prospectId } = useParams<{ prospectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const assessments = useQuery(
    api.crmProspects.listCampaignAssessments,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  ) as ProspectAssessment[] | undefined;
  const upsertAssessment = useMutation(api.crmProspects.upsertCampaignAssessment);
  const promoteProspect = useMutation(api.crmProspects.promoteProspectToCustomer);

  const [campaignName, setCampaignName] = useState(DEFAULT_CAMPAIGN);
  const [campaignFit, setCampaignFit] = useState<CampaignFit>("unknown");
  const [qualificationStatus, setQualificationStatus] = useState<QualificationStatus>("unreviewed");
  const [fitScore, setFitScore] = useState("");
  const [contactStrategy, setContactStrategy] = useState<ContactStrategy | "">("");
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const search = searchParams.get("q") ?? "";
  const viewMode = readViewMode(searchParams.get("view"));
  const outreachTierFilter = readOutreachTierFilter(searchParams.get("tier"));
  const assessmentFilter = readAssessmentFilter(searchParams.get("assessment"));
  const fleetSizeFilter = readFleetSizeFilter(searchParams.get("fleet"));
  const turbineFilter = readTurbineFilter(searchParams.get("turbine"));

  const deferredSearch = useDeferredValue(search);
  const effectiveCampaignName = campaignName.trim() || DEFAULT_CAMPAIGN;
  const currentCampaignKey = normalizeCampaignKey(effectiveCampaignName);
  const allAssessments = assessments ?? [];
  const campaignAssessments = allAssessments.filter(
    (assessment) => assessment.campaignKey === currentCampaignKey,
  );
  const assessmentMap = new Map(
    campaignAssessments.map((assessment) => [assessment.prospectEntityId, assessment]),
  );

  const filteredOperators = part135Operators
    .filter((operator) => {
      const assessment = assessmentMap.get(operator.entityId);
      const effectiveStatus = assessment?.qualificationStatus ?? "unreviewed";
      const query = deferredSearch.trim().toLowerCase();

      if (query) {
        const searchBlob = [
          operator.legalName,
          operator.certificateDesignator,
          operator.faaDistrictOffice,
          operator.topModel,
          ...operator.aircraftModels.slice(0, 5),
          ...operator.registrationNumbers.slice(0, 5),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchBlob.includes(query)) return false;
      }

      if (outreachTierFilter !== "all" && operator.outreachTier !== outreachTierFilter) {
        return false;
      }
      if (assessmentFilter !== "all" && effectiveStatus !== assessmentFilter) {
        return false;
      }
      if (fleetSizeFilter !== "all" && operator.fleetSizeClass !== fleetSizeFilter) {
        return false;
      }
      if (turbineFilter === "yes" && !operator.hasTurbine) {
        return false;
      }
      if (turbineFilter === "no" && operator.hasTurbine) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const tierWeight = { A: 0, B: 1, C: 2 } as const;
      const tierDelta = tierWeight[a.outreachTier as keyof typeof tierWeight]
        - tierWeight[b.outreachTier as keyof typeof tierWeight];
      if (tierDelta !== 0) return tierDelta;
      return b.fleetSize - a.fleetSize;
    });

  const selectedOperator = prospectId
    ? part135Operators.find((op) => op.entityId === prospectId)
    : undefined;
  const selectedAssessment = selectedOperator
    ? assessmentMap.get(selectedOperator.entityId)
    : undefined;

  useEffect(() => {
    if (!selectedOperator) return;
    setCampaignFit(selectedAssessment?.campaignFit ?? "unknown");
    setQualificationStatus(selectedAssessment?.qualificationStatus ?? "unreviewed");
    setFitScore(selectedAssessment?.fitScore ? String(selectedAssessment.fitScore) : "");
    setContactStrategy(selectedAssessment?.contactStrategy ?? "");
    setNotes(selectedAssessment?.notes ?? "");
    setNextStep(selectedAssessment?.nextStep ?? "");
  }, [selectedAssessment, selectedOperator]);

  if (!orgId || !isLoaded || assessments === undefined) {
    return <ProspectListSkeleton />;
  }

  const assessedCount = campaignAssessments.length;
  const coveragePercent = Math.round(
    (assessedCount / part135ResearchPack.totalOperators) * 100,
  );
  const qualifiedCount = campaignAssessments.filter(
    (assessment) => assessment.qualificationStatus === "qualified",
  ).length;
  const nurtureCount = campaignAssessments.filter(
    (assessment) => assessment.qualificationStatus === "nurture",
  ).length;
  const researchCount = campaignAssessments.filter(
    (assessment) => assessment.qualificationStatus === "research",
  ).length;
  const disqualifiedCount = campaignAssessments.filter(
    (assessment) => assessment.qualificationStatus === "disqualified",
  ).length;

  const searchString = searchParams.toString();
  const backHref = `/crm/prospects/part135${searchString ? `?${searchString}` : ""}`;
  const buildOperatorHref = (entityId: string) =>
    `/crm/prospects/part135/${encodeURIComponent(entityId)}${searchString ? `?${searchString}` : ""}`;

  function updateQueryParam(name: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next, { replace: true });
  }

  async function handleSaveAssessment() {
    if (!selectedOperator) return;

    const parsedFitScore = fitScore.trim() ? Number(fitScore) : undefined;
    if (
      parsedFitScore !== undefined &&
      (!Number.isFinite(parsedFitScore) ||
        !Number.isInteger(parsedFitScore) ||
        parsedFitScore < 1 ||
        parsedFitScore > 5)
    ) {
      toast.error("Fit score must be a whole value from 1 to 5.");
      return;
    }

    setIsSaving(true);
    try {
      await upsertAssessment({
        organizationId: orgId as Id<"organizations">,
        prospectEntityId: selectedOperator.entityId,
        prospectLegalName: selectedOperator.legalName,
        campaignName: effectiveCampaignName,
        campaignFit,
        qualificationStatus,
        fitScore: parsedFitScore,
        contactStrategy: contactStrategy || undefined,
        notes: notes.trim() || undefined,
        nextStep: nextStep.trim() || undefined,
        selectedOutreachTier: selectedOperator.outreachTier as "A" | "B" | "C",
      });
      toast.success("Lead assessment saved.");
    } catch (error) {
      toast.error("Failed to save assessment.", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePromoteProspect() {
    if (!selectedOperator) return;
    if (qualificationStatus !== "qualified") {
      toast.error("Mark the lead as qualified before promoting it into CRM.");
      return;
    }

    const parsedFitScore = fitScore.trim() ? Number(fitScore) : undefined;
    if (
      parsedFitScore !== undefined &&
      (!Number.isFinite(parsedFitScore) ||
        !Number.isInteger(parsedFitScore) ||
        parsedFitScore < 1 ||
        parsedFitScore > 5)
    ) {
      toast.error("Fit score must be a whole value from 1 to 5.");
      return;
    }

    setIsPromoting(true);
    try {
      await upsertAssessment({
        organizationId: orgId as Id<"organizations">,
        prospectEntityId: selectedOperator.entityId,
        prospectLegalName: selectedOperator.legalName,
        campaignName: effectiveCampaignName,
        campaignFit,
        qualificationStatus,
        fitScore: parsedFitScore,
        contactStrategy: contactStrategy || undefined,
        notes: notes.trim() || undefined,
        nextStep: nextStep.trim() || undefined,
        selectedOutreachTier: selectedOperator.outreachTier as "A" | "B" | "C",
      });

      const result = await promoteProspect({
        organizationId: orgId as Id<"organizations">,
        prospectEntityId: selectedOperator.entityId,
        legalName: selectedOperator.legalName,
        campaignName: effectiveCampaignName,
        customerType: "charter_operator",
        certificateDesignator: selectedOperator.certificateDesignator,
        faaDistrictOffice: selectedOperator.faaDistrictOffice,
        fleetSize: selectedOperator.fleetSize,
        selectedOutreachTier: selectedOperator.outreachTier as "A" | "B" | "C",
        sourceRefs: [`FAA Part 135 Operators and Aircraft / UPDATED ${part135ResearchPack.dataAsOf}`],
      });
      toast.success(
        result.existed
          ? "Operator linked to an existing CRM account."
          : "Operator promoted into CRM accounts.",
      );
    } catch (error) {
      toast.error("Failed to promote operator.", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPromoting(false);
    }
  }

  // --- Detail view for a selected operator ---
  if (prospectId && !selectedOperator) {
    return (
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link to={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to all operators
          </Link>
        </Button>
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <p className="text-base font-medium">Operator not found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The requested Part 135 operator does not exist in the current data pack.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedOperator) {
    const crossRef = part145NameIndex.get(selectedOperator.legalName.toLowerCase().trim());

    return (
      <div className="space-y-5" data-testid="part135-intelligence-page">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="px-0">
              <Link to={backHref}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to all operators
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
                {selectedOperator.legalName}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Part 135 operator intelligence brief with fleet profile, campaign assignment,
                and promotion actions.
              </p>
            </div>
          </div>
          <OperatorStateBadges
            operator={selectedOperator}
            assessment={selectedAssessment}
            campaignFit={campaignFit}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
          {/* Left column — operator detail */}
          <Card className="border-border/60">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base leading-tight">
                    {selectedOperator.legalName}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Certificate: {selectedOperator.certificateDesignator}
                  </p>
                </div>
                <Badge variant="outline" className={TIER_STYLES[selectedOperator.outreachTier]}>
                  Tier {selectedOperator.outreachTier}
                </Badge>
              </div>

              {crossRef ? (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Also in Colorado Part 145 research pack
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link to={`/crm/prospects/intelligence/${encodeURIComponent(crossRef.entityId)}`}>
                      View Part 145 profile
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailInfoRow
                  icon={Building2}
                  label="FAA District Office"
                  value={selectedOperator.faaDistrictOffice}
                />
                <DetailInfoRow
                  icon={ShieldCheck}
                  label="Certificate Designator"
                  value={selectedOperator.certificateDesignator}
                />
                <DetailInfoRow
                  icon={Plane}
                  label="Fleet Size"
                  value={`${selectedOperator.fleetSize} aircraft (${humanize(selectedOperator.fleetSizeClass)})`}
                />
                <DetailInfoRow
                  icon={PlaneTakeoff}
                  label="Primary Model"
                  value={selectedOperator.topModel ?? "No dominant model"}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Fleet composition</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOperator.hasTurbine ? (
                      <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        Turbine fleet
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Piston/Other</Badge>
                    )}
                    <Badge variant="secondary">{selectedOperator.uniqueModelCount} unique model{selectedOperator.uniqueModelCount !== 1 ? "s" : ""}</Badge>
                    <Badge variant="secondary">{selectedOperator.fleetSize} N-number{selectedOperator.fleetSize !== 1 ? "s" : ""}</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Outreach fit context</p>
                  <p className="mt-2 text-sm">
                    Tier {selectedOperator.outreachTier} lead.{" "}
                    {selectedOperator.hasTurbine
                      ? "Turbine fleet indicates higher maintenance complexity and spend."
                      : "Non-turbine fleet — maintenance volumes may be lower."}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Aircraft models operated</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedOperator.aircraftModels.map((model) => (
                    <Badge key={model} variant="secondary">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Registration numbers</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedOperator.registrationNumbers.join(", ")}
                </p>
              </div>

              {/* Contact data warning */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="font-medium text-amber-700 dark:text-amber-300">No contact data available</p>
                <div className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  <p>FAA Part 135 operator data does not include phone, email, or website information.</p>
                  <p>Manual enrichment required before outreach: check LinkedIn, AOPA directory, company websites, or FAA registry lookup.</p>
                </div>
              </div>

              {/* Data staleness footnote */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="font-medium text-amber-700 dark:text-amber-300">Data currency notice</p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  {part135ResearchPack.dataUpdateNote}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right column — campaign assignment panel */}
          <Card className="border-border/60 xl:sticky xl:top-4 self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campaign assignment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Assign this operator to a campaign, set qualification status, and promote it into
                CRM when it is ready.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-name-detail">Campaign name</Label>
                <Input
                  id="campaign-name-detail"
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder={DEFAULT_CAMPAIGN}
                />
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="font-medium">Active campaign</p>
                <p className="mt-1 text-muted-foreground">{effectiveCampaignName}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last reviewed {formatTimestamp(selectedAssessment?.updatedAt)}
                  {selectedAssessment?.reviewedByName ? ` by ${selectedAssessment.reviewedByName}` : ""}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>Campaign fit</Label>
                  <Select value={campaignFit} onValueChange={(value) => setCampaignFit(value as CampaignFit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High fit</SelectItem>
                      <SelectItem value="medium">Medium fit</SelectItem>
                      <SelectItem value="low">Low fit</SelectItem>
                      <SelectItem value="unknown">Unknown fit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Qualification status</Label>
                  <Select
                    value={qualificationStatus}
                    onValueChange={(value) => setQualificationStatus(value as QualificationStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unreviewed">Unreviewed</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="nurture">Nurture</SelectItem>
                      <SelectItem value="research">Needs research</SelectItem>
                      <SelectItem value="disqualified">Disqualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fit-score">Fit score (1-5)</Label>
                  <Input
                    id="fit-score"
                    value={fitScore}
                    onChange={(event) => setFitScore(event.target.value)}
                    inputMode="numeric"
                    placeholder="4"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Contact strategy</Label>
                  <Select
                    value={contactStrategy}
                    onValueChange={(value) => setContactStrategy(value as ContactStrategy)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTACT_STRATEGY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveAssessment} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save assignment"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePromoteProspect}
                  disabled={isPromoting || qualificationStatus !== "qualified"}
                >
                  {isPromoting ? "Promoting..." : "Promote to CRM account"}
                </Button>
              </div>

              {selectedAssessment?.promotedCustomerId ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck className="h-4 w-4" />
                    Linked to CRM account on {formatTimestamp(selectedAssessment.promotedAt)}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to={`/crm/accounts/${selectedAssessment.promotedCustomerId}`}>
                      Open CRM account
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Campaign notes */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campaign notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="next-step">Next step</Label>
              <Input
                id="next-step"
                value={nextStep}
                onChange={(event) => setNextStep(event.target.value)}
                placeholder="Look up DOM contact, confirm current MX tracking tool"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment-notes">Sales assessment notes</Label>
              <Textarea
                id="assessment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Capture pain signals, fleet complexity, current EBIS/Cordor usage, and why this operator does or does not belong in the current campaign."
                className="min-h-[160px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="space-y-5" data-testid="part135-intelligence-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
            Part 135 Operators
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Browse FAA Part 135 operators as prospective Athelon customers. These operators
            manage their own aircraft maintenance and are likely using legacy tools like EBIS or Cordor.
          </p>
        </div>
        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300">
          FAA data · {part135ResearchPack.totalOperators.toLocaleString()} operators
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tier A / High Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{part135ResearchPack.outreachTiers.A}</p>
            <p className="mt-1 text-xs text-muted-foreground">10+ aircraft, turbine fleet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Turbine Operators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{part135ResearchPack.turbineOperators}</p>
            <p className="mt-1 text-xs text-muted-foreground">of {part135ResearchPack.totalOperators.toLocaleString()} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Campaign Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold">{coveragePercent}%</p>
            <Progress value={coveragePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {assessedCount} of {part135ResearchPack.totalOperators.toLocaleString()} reviewed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Qualified in Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{qualifiedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {nurtureCount} nurture · {researchCount} research · {disqualifiedCount} disqualified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Fleet Aircraft</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{part135ResearchPack.totalAircraft.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">across all operators</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-4 w-4 text-muted-foreground" />
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Data currency notice</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {part135ResearchPack.dataUpdateNote}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-sm">
                {part135ResearchPack.dataSource} as of {part135ResearchPack.dataAsOf}.{" "}
                {part135ResearchPack.totalOperators.toLocaleString()} operators across {part135ResearchPack.totalDistrictOffices} FAA district offices.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Part 135 operators manage their own aircraft maintenance programs. Operators with
                turbine fleets and 10+ aircraft are the strongest Athelon prospects, as they have
                complex maintenance tracking needs currently served by EBIS, Cordor, or paper-based systems.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {part135ResearchPack.documentationRefs.map((ref) => (
                <Badge key={ref} variant="secondary" className="max-w-full overflow-hidden text-ellipsis">
                  {ref}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Active Sales Campaign</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              placeholder={DEFAULT_CAMPAIGN}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Assessments persist per campaign name so reps can score the same operator differently for different plays.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  Operator Queue
                </CardTitle>
                <Badge variant="outline">{filteredOperators.length} visible</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Open any operator to work it in a full-page intelligence brief.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-1">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateQueryParam("view", mode === "tiles" ? null : mode)}
                  aria-pressed={viewMode === mode}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    viewMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {VIEW_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateQueryParam("q", event.target.value || null)}
                placeholder="Search operator, designator, model..."
                className="h-9 pl-8"
              />
            </div>
            <Select
              value={outreachTierFilter}
              onValueChange={(value) => updateQueryParam("tier", value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Outreach tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="A">Tier A</SelectItem>
                <SelectItem value="B">Tier B</SelectItem>
                <SelectItem value="C">Tier C</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={fleetSizeFilter}
              onValueChange={(value) => updateQueryParam("fleet", value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Fleet size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All fleet sizes</SelectItem>
                <SelectItem value="small">Small (1-3)</SelectItem>
                <SelectItem value="medium">Medium (4-10)</SelectItem>
                <SelectItem value="large">Large (11-30)</SelectItem>
                <SelectItem value="enterprise">Enterprise (31+)</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={turbineFilter}
              onValueChange={(value) => updateQueryParam("turbine", value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Turbine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All propulsion</SelectItem>
                <SelectItem value="yes">Turbine only</SelectItem>
                <SelectItem value="no">Non-turbine only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={assessmentFilter}
              onValueChange={(value) => updateQueryParam("assessment", value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Assessment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assessments</SelectItem>
                <SelectItem value="unreviewed">Unreviewed</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="nurture">Nurture</SelectItem>
                <SelectItem value="research">Needs research</SelectItem>
                <SelectItem value="disqualified">Disqualified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredOperators.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No operators match the current filters.
            </div>
          ) : viewMode === "tiles" ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredOperators.map((operator) => (
                <OperatorTileCard
                  key={operator.entityId}
                  operator={operator}
                  assessment={assessmentMap.get(operator.entityId)}
                  detailHref={buildOperatorHref(operator.entityId)}
                />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {filteredOperators.map((operator) => (
                <OperatorListRow
                  key={operator.entityId}
                  operator={operator}
                  assessment={assessmentMap.get(operator.entityId)}
                  detailHref={buildOperatorHref(operator.entityId)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOperators.map((operator) => (
                <OperatorExpandedCard
                  key={operator.entityId}
                  operator={operator}
                  assessment={assessmentMap.get(operator.entityId)}
                  detailHref={buildOperatorHref(operator.entityId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Campaign Guardrails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tier A operators (10+ aircraft, turbine fleet) are the highest-value prospects.
            These operators have complex maintenance tracking needs and are most likely to
            benefit from migrating off EBIS or Cordor.
          </p>
          <p>
            FAA Part 135 data contains no contact information. All operators require manual
            enrichment (LinkedIn, AOPA directory, company website lookup) before outreach
            can begin.
          </p>
          <p>
            Use the campaign-fit score to separate operator relevance from fleet size.
            A large fleet does not automatically mean high fit — consider aircraft types,
            geographic proximity, and maintenance program complexity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
