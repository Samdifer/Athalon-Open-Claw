"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  coloradoPart145Research,
  coloradoPart145ResearchPack,
} from "@/src/shared/data/coloradoPart145Research";

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

function ProspectListSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <Skeleton className="h-[760px]" />
        <Skeleton className="h-[760px]" />
      </div>
    </div>
  );
}

export default function CrmProspectIntelligencePage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const assessments = useQuery(
    api.crmProspects.listCampaignAssessments,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  ) as ProspectAssessment[] | undefined;
  const upsertAssessment = useMutation(api.crmProspects.upsertCampaignAssessment);
  const promoteProspect = useMutation(api.crmProspects.promoteProspectToCustomer);

  const [search, setSearch] = useState("");
  const [campaignName, setCampaignName] = useState(DEFAULT_CAMPAIGN);
  const [outreachTierFilter, setOutreachTierFilter] = useState<OutreachTierFilter>("all");
  const [assessmentFilter, setAssessmentFilter] = useState<AssessmentStatusFilter>("all");
  const [manualReviewFilter, setManualReviewFilter] = useState<ManualReviewFilter>("all");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [selectedProspectId, setSelectedProspectId] = useState<string>("");
  const [campaignFit, setCampaignFit] = useState<CampaignFit>("unknown");
  const [qualificationStatus, setQualificationStatus] = useState<QualificationStatus>("unreviewed");
  const [fitScore, setFitScore] = useState("");
  const [contactStrategy, setContactStrategy] = useState<ContactStrategy | "">("");
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

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

  useEffect(() => {
    if (filteredProspects.length === 0) {
      setSelectedProspectId("");
      return;
    }
    const stillVisible = filteredProspects.some((prospect) => prospect.entityId === selectedProspectId);
    if (!selectedProspectId || !stillVisible) {
      setSelectedProspectId(filteredProspects[0].entityId);
    }
  }, [filteredProspects, selectedProspectId]);

  const selectedProspect = filteredProspects.find(
    (prospect) => prospect.entityId === selectedProspectId,
  ) ?? filteredProspects[0];
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

  return (
    <div className="space-y-5" data-testid="crm-prospect-intelligence-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">
            Prospect Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-3xl">
            Colorado Part 145 research pack surfaced as a lead-qualification workspace.
            Review the evidence, score campaign fit, and promote qualified shops into CRM.
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
            <p className="text-xs text-muted-foreground mt-1">
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
          <CardTitle className="text-base flex items-center gap-2">
            <FileStack className="w-4 h-4 text-muted-foreground" />
            Research Documentation Area
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-sm">{coloradoPart145ResearchPack.validationSummary}</p>
              <p className="text-sm text-muted-foreground mt-2">
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
              placeholder="Colorado Part 145 Outreach"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Assessments persist per campaign name so reps can score the same shop differently for different plays.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                Lead Queue
              </CardTitle>
              <Badge variant="outline">{filteredProspects.length} visible</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search shop, cert, city, airport..."
                  className="h-9 pl-8"
                />
              </div>
              <Select value={outreachTierFilter} onValueChange={(value) => setOutreachTierFilter(value as OutreachTierFilter)}>
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
              <Select value={assessmentFilter} onValueChange={(value) => setAssessmentFilter(value as AssessmentStatusFilter)}>
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
              <Select value={manualReviewFilter} onValueChange={(value) => setManualReviewFilter(value as ManualReviewFilter)}>
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
              <Select value={contactFilter} onValueChange={(value) => setContactFilter(value as ContactFilter)}>
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

            <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
              {filteredProspects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                  No prospects match the current filters.
                </div>
              ) : (
                filteredProspects.map((prospect) => {
                  const assessment = assessmentMap.get(prospect.entityId);
                  const effectiveStatus = assessment?.qualificationStatus ?? "unreviewed";
                  const isSelected = prospect.entityId === selectedProspectId;

                  return (
                    <button
                      key={prospect.entityId}
                      type="button"
                      onClick={() => setSelectedProspectId(prospect.entityId)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:border-primary/30 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{prospect.legalName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {prospect.certNo ?? "No cert"} · {prospect.city}, {prospect.state}
                            {prospect.nearestAirportIcao ? ` · ${prospect.nearestAirportIcao}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={TIER_STYLES[prospect.outreachTier]}>
                            Tier {prospect.outreachTier}
                          </Badge>
                          <Badge variant="outline" className={assessmentBadge(effectiveStatus)}>
                            {QUALIFICATION_LABELS[effectiveStatus]}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{humanize(prospect.shopSizeClass)}</Badge>
                        <Badge variant="secondary">{humanize(prospect.airportDistanceBand)}</Badge>
                        <Badge variant="secondary">{humanize(prospect.contactCompleteness)}</Badge>
                        {prospect.manualReviewFlag ? (
                          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300">
                            Manual review
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center gap-1 ${prospect.hasPhone ? "" : "opacity-40"}`}>
                          <Phone className="h-3.5 w-3.5" />
                          Phone
                        </span>
                        <span className={`inline-flex items-center gap-1 ${prospect.hasEmail ? "" : "opacity-40"}`}>
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </span>
                        <span className={`inline-flex items-center gap-1 ${prospect.hasWebsite ? "" : "opacity-40"}`}>
                          <Globe className="h-3.5 w-3.5" />
                          Website
                        </span>
                        {assessment?.fitScore ? (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <UserRoundCheck className="h-3.5 w-3.5" />
                            Fit {assessment.fitScore}/5
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-4 self-start">
          {selectedProspect ? (
            <Card className="border-border/60">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base leading-tight">
                      {selectedProspect.legalName}
                    </CardTitle>
                    {selectedProspect.dbaName ? (
                      <p className="mt-1 text-sm text-muted-foreground">{selectedProspect.dbaName}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={TIER_STYLES[selectedProspect.outreachTier]}>
                      Tier {selectedProspect.outreachTier}
                    </Badge>
                    <Badge variant="outline" className={campaignFitBadge(campaignFit)}>
                      {CAMPAIGN_FIT_LABELS[campaignFit]}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {selectedProspect.street ? `${selectedProspect.street}, ` : ""}
                      {selectedProspect.city}, {selectedProspect.state} {selectedProspect.zip ?? ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {selectedProspect.certNo ?? "No cert"} · {selectedProspect.directVerificationStatus
                        ? humanize(selectedProspect.directVerificationStatus)
                        : "Verification status unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{formatPhone(selectedProspect.phone)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{selectedProspect.email ?? "No email listed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff className="h-4 w-4" />
                    <span>
                      {selectedProspect.nearestAirportIcao ?? "No airport code"} · {" "}
                      {selectedProspect.nearestAirportName ?? "Airport not specified"}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="brief" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="brief">Brief</TabsTrigger>
                    <TabsTrigger value="provenance">Provenance</TabsTrigger>
                    <TabsTrigger value="assessment">Assessment</TabsTrigger>
                  </TabsList>

                  <TabsContent value="brief" className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Campaign fit context</p>
                        <p className="mt-2 text-sm">
                          Research tier <span className="font-semibold">Tier {selectedProspect.outreachTier}</span> with{" "}
                          <span className="font-semibold">{formatPercent(selectedProspect.overallConfidence)}</span>{" "}
                          confidence and {selectedProspect.contactCompleteness} contact completeness.
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Observability</p>
                        <p className="mt-2 text-sm">
                          {formatPercent(selectedProspect.observabilityScore)} score · {selectedProspect.observabilityScoreMethod ?? "No method captured"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Aircraft and capability signals</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedProspect.aircraftWorkedOn.length > 0 ? (
                          selectedProspect.aircraftWorkedOn.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {humanize(tag)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Research pack did not verify platform scope.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Research flags</p>
                      {selectedProspect.manualReviewFlag ? (
                        <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                          Manual review required: {humanize(selectedProspect.manualReviewReason ?? "unspecified")}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No blocking review flags in the final research pack.
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="provenance" className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected source</p>
                        <p className="mt-2 text-sm font-medium">{selectedProspect.selectedSource}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedProspect.provenancePrecedenceRule}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Verification lane</p>
                        <p className="mt-2 text-sm">
                          {selectedProspect.certValidationStatus ? humanize(selectedProspect.certValidationStatus) : "Not captured"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedProspect.directVerificationStatus ? humanize(selectedProspect.directVerificationStatus) : "No direct verification in final pack"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Field provenance</p>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Identity:</span> {selectedProspect.provenanceLegalName ?? "Not captured"}</p>
                        <p><span className="font-medium">Part 145:</span> {selectedProspect.provenancePart145 ?? "Not captured"}</p>
                        <p><span className="font-medium">Shop size:</span> {selectedProspect.provenanceShopSizeClass ?? "Not captured"}</p>
                        <p><span className="font-medium">Aircraft scope:</span> {selectedProspect.provenanceAircraftWorkedOn ?? "Not captured"}</p>
                        <p><span className="font-medium">Airport profile:</span> {selectedProspect.provenanceAirportProximityProfile ?? "Not captured"}</p>
                        <p><span className="font-medium">Observability:</span> {selectedProspect.provenanceObservabilityScore ?? "Not captured"}</p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Source references</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProspect.sourceRefs.map((ref) => (
                          <Badge key={ref} variant="secondary">
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="assessment" className="space-y-4">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                      <p className="font-medium">Current campaign</p>
                      <p className="text-muted-foreground mt-1">{effectiveCampaignName}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Last reviewed {formatTimestamp(selectedAssessment?.updatedAt)}
                        {selectedAssessment?.reviewedByName ? ` by ${selectedAssessment.reviewedByName}` : ""}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
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
                        className="min-h-[140px]"
                      />
                    </div>

                    <div className="rounded-lg border border-border/60 p-3 text-sm">
                      <p className="font-medium">Promotion gate</p>
                      <p className="mt-1 text-muted-foreground">
                        Promote into CRM only after the lead is marked qualified for this campaign.
                      </p>
                      {selectedAssessment?.promotedCustomerId ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                          <span>
                            Linked to CRM account on {formatTimestamp(selectedAssessment.promotedAt)}
                          </span>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/crm/accounts/${selectedAssessment.promotedCustomerId}`}>
                              Open CRM account
                            </Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleSaveAssessment} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save assessment"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handlePromoteProspect}
                        disabled={isPromoting || qualificationStatus !== "qualified"}
                      >
                        {isPromoting ? "Promoting..." : "Promote to CRM account"}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Select a prospect to review the research pack and enter a qualification assessment.
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
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
      </div>
    </div>
  );
}
