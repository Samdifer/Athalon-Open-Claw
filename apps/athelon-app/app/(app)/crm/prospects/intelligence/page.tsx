"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  FileStack,
  Filter,
  Globe,
  Mail,
  MapPin,
  Phone,
  PlaneTakeoff,
  Radio,
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
  coloradoPart145Research,
  coloradoPart145ResearchPack,
} from "@/src/shared/data/coloradoPart145Research";
import type { ColoradoProspectRecord } from "@/src/shared/data/coloradoPart145Research";

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
type ManualReviewFilter = "all" | "manual_review" | "ready_for_outreach";
type ContactFilter = "all" | "full" | "good" | "partial" | "none";
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

const DEFAULT_CAMPAIGN = "Colorado Part 145 Outreach";
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

function normalizeCampaignKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "general-qualification";
}

function formatPhone(value: string | null) {
  if (!value) return "No phone listed";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function formatPercent(value: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
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

function assessmentBadge(status: QualificationStatus) {
  return QUALIFICATION_STYLES[status];
}

function campaignFitBadge(fit: CampaignFit) {
  return CAMPAIGN_FIT_STYLES[fit];
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

function readManualReviewFilter(value: string | null): ManualReviewFilter {
  return value === "manual_review" || value === "ready_for_outreach" ? value : "all";
}

function readContactFilter(value: string | null): ContactFilter {
  return value === "full" || value === "good" || value === "partial" || value === "none"
    ? value
    : "all";
}

function normalizeWebsiteUrl(value: string | null) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function compactWebsiteLabel(value: string | null) {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized) return "Website not verified";
  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return normalized;
  }
}

function compactSourceLabel(value: string) {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname !== "/" ? url.pathname : ""}`;
  } catch {
    return value;
  }
}

function phoneHref(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
}

function emailHref(value: string | null) {
  return value ? `mailto:${value}` : null;
}

function sourceRefHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : null;
}

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

function ProspectStateBadges(props: {
  prospect: ColoradoProspectRecord;
  assessment?: ProspectAssessment;
  campaignFit?: CampaignFit;
}) {
  const { prospect, assessment, campaignFit } = props;
  const effectiveStatus = assessment?.qualificationStatus ?? "unreviewed";

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className={TIER_STYLES[prospect.outreachTier]}>
        Tier {prospect.outreachTier}
      </Badge>
      <Badge variant="outline" className={assessmentBadge(effectiveStatus)}>
        {QUALIFICATION_LABELS[effectiveStatus]}
      </Badge>
      {campaignFit ? (
        <Badge variant="outline" className={campaignFitBadge(campaignFit)}>
          {CAMPAIGN_FIT_LABELS[campaignFit]}
        </Badge>
      ) : null}
    </div>
  );
}

function ProspectSignalStrip(props: {
  prospect: ColoradoProspectRecord;
  assessment?: ProspectAssessment;
}) {
  const { prospect, assessment } = props;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Radio className="h-3.5 w-3.5" />
        Observability {formatPercent(prospect.observabilityScore)}
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" />
        {humanize(prospect.confidenceLabel)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Target className="h-3.5 w-3.5" />
        {humanize(prospect.profileArchetype ?? "general-mro")}
      </span>
      {assessment?.fitScore ? (
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <UserRoundCheck className="h-3.5 w-3.5" />
          Fit {assessment.fitScore}/5
        </span>
      ) : null}
    </div>
  );
}

function ProspectContactAvailability(props: { prospect: ColoradoProspectRecord }) {
  const { prospect } = props;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className={`inline-flex items-center gap-1 ${prospect.hasPhone ? "" : "opacity-40"}`}>
        <Phone className="h-3.5 w-3.5" />
        {prospect.hasPhone ? formatPhone(prospect.phone) : "Phone missing"}
      </span>
      <span className={`inline-flex items-center gap-1 ${prospect.hasEmail ? "" : "opacity-40"}`}>
        <Mail className="h-3.5 w-3.5" />
        {prospect.hasEmail ? prospect.email : "Email missing"}
      </span>
      <span className={`inline-flex items-center gap-1 ${prospect.hasWebsite ? "" : "opacity-40"}`}>
        <Globe className="h-3.5 w-3.5" />
        {compactWebsiteLabel(prospect.website)}
      </span>
    </div>
  );
}

function ProspectPrimaryActions(props: {
  prospect: ColoradoProspectRecord;
  detailHref: string;
  compact?: boolean;
}) {
  const { prospect, detailHref, compact = false } = props;
  const websiteUrl = normalizeWebsiteUrl(prospect.website);

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size={compact ? "sm" : "default"}>
        <Link to={detailHref}>Open full profile</Link>
      </Button>
      {websiteUrl ? (
        <Button asChild variant="outline" size={compact ? "sm" : "default"}>
          <a href={websiteUrl} target="_blank" rel="noreferrer">
            Website
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function ProspectTileCard(props: {
  prospect: ColoradoProspectRecord;
  assessment?: ProspectAssessment;
  detailHref: string;
}) {
  const { prospect, assessment, detailHref } = props;

  return (
    <Card className="border-border/60 h-full">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">{prospect.legalName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {prospect.certNo ?? "No cert"} · {prospect.city}, {prospect.state}
            </p>
            {prospect.dbaName ? (
              <p className="mt-1 text-xs text-muted-foreground">{prospect.dbaName}</p>
            ) : null}
          </div>
          <ProspectStateBadges prospect={prospect} assessment={assessment} />
        </div>

        <ProspectSignalStrip prospect={prospect} assessment={assessment} />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{humanize(prospect.shopSizeClass)}</Badge>
          <Badge variant="secondary">{humanize(prospect.airportDistanceBand)}</Badge>
          <Badge variant="secondary">{humanize(prospect.contactCompleteness)}</Badge>
          {prospect.manualReviewFlag ? (
            <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300">
              Manual review
            </Badge>
          ) : null}
        </div>

        <ProspectContactAvailability prospect={prospect} />

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {prospect.nearestAirportIcao ?? "No airport code"}
            {prospect.nearestAirportName ? ` · ${prospect.nearestAirportName}` : ""}
          </div>
          <ProspectPrimaryActions prospect={prospect} detailHref={detailHref} compact />
        </div>
      </CardContent>
    </Card>
  );
}

function ProspectListRow(props: {
  prospect: ColoradoProspectRecord;
  assessment?: ProspectAssessment;
  detailHref: string;
}) {
  const { prospect, assessment, detailHref } = props;

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-sm font-semibold leading-tight">{prospect.legalName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {prospect.certNo ?? "No cert"} · {prospect.city}, {prospect.state}
              {prospect.nearestAirportIcao ? ` · ${prospect.nearestAirportIcao}` : ""}
            </p>
          </div>
          <ProspectStateBadges prospect={prospect} assessment={assessment} />
          <ProspectSignalStrip prospect={prospect} assessment={assessment} />
        </div>

        <div className="space-y-3 lg:min-w-[320px] lg:text-right">
          <ProspectContactAvailability prospect={prospect} />
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Badge variant="secondary">{humanize(prospect.contactCompleteness)}</Badge>
            <Badge variant="secondary">{humanize(prospect.shopSizeClass)}</Badge>
            {prospect.manualReviewFlag ? (
              <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300">
                Manual review
              </Badge>
            ) : null}
          </div>
          <div className="flex justify-start lg:justify-end">
            <ProspectPrimaryActions prospect={prospect} detailHref={detailHref} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProspectExpandedCard(props: {
  prospect: ColoradoProspectRecord;
  assessment?: ProspectAssessment;
  detailHref: string;
}) {
  const { prospect, assessment, detailHref } = props;

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">{prospect.legalName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {prospect.certNo ?? "No cert"} · {prospect.city}, {prospect.state}
              {prospect.nearestAirportIcao ? ` · ${prospect.nearestAirportIcao}` : ""}
            </p>
            {prospect.dbaName ? (
              <p className="mt-1 text-xs text-muted-foreground">{prospect.dbaName}</p>
            ) : null}
          </div>
          <ProspectStateBadges prospect={prospect} assessment={assessment} />
        </div>

        <ProspectSignalStrip prospect={prospect} assessment={assessment} />

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
            <p className="mt-2 text-sm">
              {prospect.street ? `${prospect.street}, ` : ""}
              {prospect.city}, {prospect.state} {prospect.zip ?? ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {prospect.nearestAirportName ?? "Airport not specified"}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact coverage</p>
            <div className="mt-2 space-y-2 text-sm">
              <p>{formatPhone(prospect.phone)}</p>
              <p>{prospect.email ?? "No email listed"}</p>
              <p>{compactWebsiteLabel(prospect.website)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Research profile</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{humanize(prospect.shopSizeClass)}</Badge>
              <Badge variant="secondary">{humanize(prospect.airportDistanceBand)}</Badge>
              <Badge variant="secondary">{humanize(prospect.contactCompleteness)}</Badge>
              <Badge variant="secondary">{humanize(prospect.confidenceLabel)}</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Aircraft and capability signals</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {prospect.aircraftWorkedOn.length > 0 ? (
              prospect.aircraftWorkedOn.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {humanize(tag)}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                Research pack did not verify aircraft scope.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProspectContactAvailability prospect={prospect} />
          <ProspectPrimaryActions prospect={prospect} detailHref={detailHref} />
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

export default function CrmProspectIntelligencePage() {
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
  const manualReviewFilter = readManualReviewFilter(searchParams.get("review"));
  const contactFilter = readContactFilter(searchParams.get("contact"));

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

  const filteredProspects = coloradoPart145Research
    .filter((prospect) => {
      const assessment = assessmentMap.get(prospect.entityId);
      const effectiveStatus = assessment?.qualificationStatus ?? "unreviewed";
      const query = deferredSearch.trim().toLowerCase();

      if (query) {
        const searchBlob = [
          prospect.legalName,
          prospect.dbaName,
          prospect.city,
          prospect.certNo,
          prospect.nearestAirportIcao,
          prospect.nearestAirportName,
          prospect.profileArchetype,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchBlob.includes(query)) return false;
      }

      if (outreachTierFilter !== "all" && prospect.outreachTier !== outreachTierFilter) {
        return false;
      }
      if (assessmentFilter !== "all" && effectiveStatus !== assessmentFilter) {
        return false;
      }
      if (
        manualReviewFilter === "manual_review" &&
        !prospect.manualReviewFlag
      ) {
        return false;
      }
      if (
        manualReviewFilter === "ready_for_outreach" &&
        prospect.manualReviewFlag
      ) {
        return false;
      }
      if (contactFilter !== "all" && prospect.contactCompleteness !== contactFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const tierWeight = { A: 0, B: 1, C: 2 } as const;
      const tierDelta = tierWeight[a.outreachTier as keyof typeof tierWeight]
        - tierWeight[b.outreachTier as keyof typeof tierWeight];
      if (tierDelta !== 0) return tierDelta;
      return (b.overallConfidence ?? 0) - (a.overallConfidence ?? 0);
    });

  const selectedProspect = prospectId
    ? coloradoPart145Research.find((prospect) => prospect.entityId === prospectId)
    : undefined;
  const selectedAssessment = selectedProspect
    ? assessmentMap.get(selectedProspect.entityId)
    : undefined;

  useEffect(() => {
    if (!selectedProspect) return;
    setCampaignFit(selectedAssessment?.campaignFit ?? "unknown");
    setQualificationStatus(selectedAssessment?.qualificationStatus ?? "unreviewed");
    setFitScore(selectedAssessment?.fitScore ? String(selectedAssessment.fitScore) : "");
    setContactStrategy(selectedAssessment?.contactStrategy ?? "");
    setNotes(selectedAssessment?.notes ?? "");
    setNextStep(selectedAssessment?.nextStep ?? "");
  }, [selectedAssessment, selectedProspect]);

  if (!orgId || !isLoaded || assessments === undefined) {
    return <ProspectListSkeleton />;
  }

  const assessedCount = campaignAssessments.length;
  const coveragePercent = Math.round(
    (assessedCount / coloradoPart145ResearchPack.totalProspects) * 100,
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
  const backHref = `/crm/prospects/intelligence${searchString ? `?${searchString}` : ""}`;
  const buildProspectHref = (entityId: string) =>
    `/crm/prospects/intelligence/${encodeURIComponent(entityId)}${searchString ? `?${searchString}` : ""}`;

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
    if (!selectedProspect) return;

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
        prospectEntityId: selectedProspect.entityId,
        prospectLegalName: selectedProspect.legalName,
        campaignName: effectiveCampaignName,
        campaignFit,
        qualificationStatus,
        fitScore: parsedFitScore,
        contactStrategy: contactStrategy || undefined,
        notes: notes.trim() || undefined,
        nextStep: nextStep.trim() || undefined,
        selectedOutreachTier: selectedProspect.outreachTier as "A" | "B" | "C",
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
    if (!selectedProspect) return;
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
        prospectEntityId: selectedProspect.entityId,
        prospectLegalName: selectedProspect.legalName,
        campaignName: effectiveCampaignName,
        campaignFit,
        qualificationStatus,
        fitScore: parsedFitScore,
        contactStrategy: contactStrategy || undefined,
        notes: notes.trim() || undefined,
        nextStep: nextStep.trim() || undefined,
        selectedOutreachTier: selectedProspect.outreachTier as "A" | "B" | "C",
      });

      const result = await promoteProspect({
        organizationId: orgId as Id<"organizations">,
        prospectEntityId: selectedProspect.entityId,
        legalName: selectedProspect.legalName,
        dbaName: selectedProspect.dbaName ?? undefined,
        campaignName: effectiveCampaignName,
        street: selectedProspect.street ?? undefined,
        city: selectedProspect.city,
        state: selectedProspect.state,
        zip: selectedProspect.zip ?? undefined,
        phone: selectedProspect.phone ?? undefined,
        email: selectedProspect.email ?? undefined,
        certNo: selectedProspect.certNo ?? undefined,
        nearestAirportName: selectedProspect.nearestAirportName ?? undefined,
        nearestAirportIcao: selectedProspect.nearestAirportIcao ?? undefined,
        profileArchetype: selectedProspect.profileArchetype ?? undefined,
        selectedOutreachTier: selectedProspect.outreachTier as "A" | "B" | "C",
        sourceRefs: selectedProspect.sourceRefs,
      });
      toast.success(
        result.existed
          ? "Prospect linked to an existing CRM account."
          : "Prospect promoted into CRM accounts.",
      );
    } catch (error) {
      toast.error("Failed to promote prospect.", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPromoting(false);
    }
  }

  if (prospectId && !selectedProspect) {
    return (
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link to={backHref}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to all prospects
          </Link>
        </Button>
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <p className="text-base font-medium">Prospect not found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The requested intelligence record does not exist in the current research pack.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedProspect) {
    const websiteUrl = normalizeWebsiteUrl(selectedProspect.website);
    const missingSignals = [
      !selectedProspect.hasWebsite ? "Website link still missing from the research pack." : null,
      !selectedProspect.hasEmail ? "Email contact still missing." : null,
      !selectedProspect.hasPhone ? "Phone contact still missing." : null,
      selectedProspect.aircraftWorkedOn.length === 0
        ? "Aircraft and capability scope still needs verification."
        : null,
      selectedProspect.identityAmbiguityFlag
        ? "Identity ambiguity flagged and should be manually resolved."
        : null,
    ].filter(Boolean) as string[];

    return (
      <div className="space-y-5" data-testid="crm-prospect-intelligence-page">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="px-0">
              <Link to={backHref}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to all prospects
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
                {selectedProspect.legalName}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Full intelligence brief with campaign assignment, verified contact actions, and
                source provenance for this prospect.
              </p>
            </div>
          </div>
          <ProspectStateBadges
            prospect={selectedProspect}
            assessment={selectedAssessment}
            campaignFit={campaignFit}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
          <Card className="border-border/60">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base leading-tight">
                    {selectedProspect.legalName}
                  </CardTitle>
                  {selectedProspect.dbaName ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedProspect.dbaName}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className={TIER_STYLES[selectedProspect.outreachTier]}>
                  Tier {selectedProspect.outreachTier}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {phoneHref(selectedProspect.phone) ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={phoneHref(selectedProspect.phone) ?? undefined}>
                      <Phone className="mr-1 h-4 w-4" />
                      Call
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Phone className="mr-1 h-4 w-4" />
                    No phone
                  </Button>
                )}
                {emailHref(selectedProspect.email) ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={emailHref(selectedProspect.email) ?? undefined}>
                      <Mail className="mr-1 h-4 w-4" />
                      Email
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Mail className="mr-1 h-4 w-4" />
                    No email
                  </Button>
                )}
                {websiteUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={websiteUrl} target="_blank" rel="noreferrer">
                      <Globe className="mr-1 h-4 w-4" />
                      Open website
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Globe className="mr-1 h-4 w-4" />
                    No website
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailInfoRow
                  icon={MapPin}
                  label="Address"
                  value={`${selectedProspect.street ? `${selectedProspect.street}, ` : ""}${selectedProspect.city}, ${selectedProspect.state} ${selectedProspect.zip ?? ""}`.trim()}
                />
                <DetailInfoRow
                  icon={ShieldCheck}
                  label="Repair station"
                  value={`${selectedProspect.certNo ?? "No cert"} · ${selectedProspect.directVerificationStatus ? humanize(selectedProspect.directVerificationStatus) : "Verification status unknown"}`}
                />
                <DetailInfoRow
                  icon={PlaneTakeoff}
                  label="Nearest airport"
                  value={`${selectedProspect.nearestAirportIcao ?? "No airport code"} · ${selectedProspect.nearestAirportName ?? "Airport not specified"}`}
                />
                <DetailInfoRow
                  icon={Building2}
                  label="Website"
                  value={websiteUrl ?? "Website not verified in current research pack"}
                />
              </div>

              {selectedProspect.manualReviewFlag ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                  Manual review required: {humanize(selectedProspect.manualReviewReason ?? "unspecified")}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Research fit context</p>
                  <p className="mt-2 text-sm">
                    Tier {selectedProspect.outreachTier} lead with{" "}
                    {formatPercent(selectedProspect.overallConfidence)} overall confidence and{" "}
                    {selectedProspect.contactCompleteness} contact completeness.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{humanize(selectedProspect.shopSizeClass)}</Badge>
                    <Badge variant="secondary">{humanize(selectedProspect.airportDistanceBand)}</Badge>
                    <Badge variant="secondary">{humanize(selectedProspect.profileArchetype ?? "general-mro")}</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Observability</p>
                  <p className="mt-2 text-sm">
                    {formatPercent(selectedProspect.observabilityScore)} score
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedProspect.observabilityScoreMethod ?? "No method captured"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 xl:sticky xl:top-4 self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campaign assignment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Assign this prospect to a campaign, set qualification status, and promote it into
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
                placeholder="Call DOM and confirm current tooling/process"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment-notes">Sales assessment notes</Label>
              <Textarea
                id="assessment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Capture pain signals, fit gaps, warm intro paths, and why this shop does or does not belong in the current campaign."
                className="min-h-[160px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Open-source contact coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Phone:</span> {formatPhone(selectedProspect.phone)}
              </p>
              <p>
                <span className="font-medium">Email:</span> {selectedProspect.email ?? "No email listed"}
              </p>
              <p>
                <span className="font-medium">Website:</span>{" "}
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {websiteUrl}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  "No website captured"
                )}
              </p>
              {missingSignals.length > 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="font-medium text-amber-700 dark:text-amber-300">Missing intelligence</p>
                  <div className="mt-2 space-y-2 text-amber-700 dark:text-amber-300">
                    {missingSignals.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-border/60 bg-muted/20 p-3 text-muted-foreground">
                  Website, phone, email, and operating scope are all present in the current pack.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aircraft and capability signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedProspect.aircraftWorkedOn.length > 0 ? (
                  selectedProspect.aircraftWorkedOn.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {humanize(tag)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Research pack did not verify platform scope.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Research provenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Selected source:</span> {selectedProspect.selectedSource}
              </p>
              <p>
                <span className="font-medium">Precedence rule:</span>{" "}
                {selectedProspect.provenancePrecedenceRule ?? "Not captured"}
              </p>
              <p>
                <span className="font-medium">Certificate validation:</span>{" "}
                {selectedProspect.certValidationStatus
                  ? humanize(selectedProspect.certValidationStatus)
                  : "Not captured"}
              </p>
              <p>
                <span className="font-medium">Direct verification:</span>{" "}
                {selectedProspect.directVerificationStatus
                  ? humanize(selectedProspect.directVerificationStatus)
                  : "No direct verification in final pack"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Field provenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="font-medium">Identity:</span> {selectedProspect.provenanceLegalName ?? "Not captured"}</p>
              <p><span className="font-medium">Part 145:</span> {selectedProspect.provenancePart145 ?? "Not captured"}</p>
              <p><span className="font-medium">Shop size:</span> {selectedProspect.provenanceShopSizeClass ?? "Not captured"}</p>
              <p><span className="font-medium">Aircraft scope:</span> {selectedProspect.provenanceAircraftWorkedOn ?? "Not captured"}</p>
              <p><span className="font-medium">Airport profile:</span> {selectedProspect.provenanceAirportProximityProfile ?? "Not captured"}</p>
              <p><span className="font-medium">Observability:</span> {selectedProspect.provenanceObservabilityScore ?? "Not captured"}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source references</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {selectedProspect.sourceRefs.map((ref) => {
              const href = sourceRefHref(ref);
              if (!href) {
                return (
                  <Badge key={ref} variant="secondary">
                    {ref}
                  </Badge>
                );
              }

              return (
                <Button key={ref} asChild variant="outline" size="sm">
                  <a href={href} target="_blank" rel="noreferrer">
                    {compactSourceLabel(ref)}
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="crm-prospect-intelligence-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
            Prospect Intelligence
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Browse the full Colorado Part 145 research pack as tiles, a compact list, or expanded
            briefs. Open any prospect into a full-page intelligence workspace to assign campaigns,
            review evidence, and act on contact data.
          </p>
        </div>
        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300">
          Research pack · {coloradoPart145ResearchPack.totalProspects} prospects
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tier A / Ready Now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{coloradoPart145ResearchPack.outreachTiers.A}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Manual Review Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{coloradoPart145ResearchPack.manualReviewQueue}</p>
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
              {assessedCount} of {coloradoPart145ResearchPack.totalProspects} reviewed
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
            <CardTitle className="text-sm text-muted-foreground">Source Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              team-g {coloradoPart145ResearchPack.selectedSourceDistribution["team-g"]}
            </p>
            <p className="text-sm text-muted-foreground">
              team-h {coloradoPart145ResearchPack.selectedSourceDistribution["team-h"]}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-4 w-4 text-muted-foreground" />
            Research Documentation Area
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-sm">{coloradoPart145ResearchPack.validationSummary}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {coloradoPart145ResearchPack.recommendation}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {coloradoPart145ResearchPack.documentationRefs.map((ref) => (
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
              Assessments persist per campaign name so reps can score the same shop differently for different plays.
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
                  Lead Queue
                </CardTitle>
                <Badge variant="outline">{filteredProspects.length} visible</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Open any prospect to work it in a full-page intelligence brief with a dedicated back path.
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
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateQueryParam("q", event.target.value || null)}
                placeholder="Search shop, cert, city, airport..."
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
            <Select
              value={manualReviewFilter}
              onValueChange={(value) => updateQueryParam("review", value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Review state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All review states</SelectItem>
                <SelectItem value="manual_review">Manual review only</SelectItem>
                <SelectItem value="ready_for_outreach">Ready for outreach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Contact completeness</span>
            <Select
              value={contactFilter}
              onValueChange={(value) => updateQueryParam("contact", value === "all" ? null : value)}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Contact completeness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contact states</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No prospects match the current filters.
            </div>
          ) : viewMode === "tiles" ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProspects.map((prospect) => (
                <ProspectTileCard
                  key={prospect.entityId}
                  prospect={prospect}
                  assessment={assessmentMap.get(prospect.entityId)}
                  detailHref={buildProspectHref(prospect.entityId)}
                />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {filteredProspects.map((prospect) => (
                <ProspectListRow
                  key={prospect.entityId}
                  prospect={prospect}
                  assessment={assessmentMap.get(prospect.entityId)}
                  detailHref={buildProspectHref(prospect.entityId)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProspects.map((prospect) => (
                <ProspectExpandedCard
                  key={prospect.entityId}
                  prospect={prospect}
                  assessment={assessmentMap.get(prospect.entityId)}
                  detailHref={buildProspectHref(prospect.entityId)}
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
            Tier A leads are ready for outbound now. Tier B leads should be worked with
            caution and a tighter QA loop. Tier C leads need research completion before outbound.
          </p>
          <p>
            Use the campaign-fit score to separate shop relevance from raw research quality.
            A high-confidence record can still be a low-fit lead for the current play.
          </p>
          <p>
            Manual-review flags and no-contact-channel records should not be promoted until
            the missing operating context is resolved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
