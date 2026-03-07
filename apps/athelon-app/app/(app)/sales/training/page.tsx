"use client";

import type { ComponentType } from "react";
import {
  BadgeCheck,
  BarChart3,
  BookCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  Database,
  Handshake,
  HelpCircle,
  MessageSquare,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type Module = {
  id: string;
  title: string;
  focus: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  progress: number;
  checklist: string[];
  scriptTemplate: string;
  guardrail: string;
};

const modules: Module[] = [
  {
    id: "M1",
    title: "ICP & Research",
    focus: "Find fit-first accounts with clear pain and decision capacity.",
    icon: Target,
    progress: 20,
    checklist: [
      "Define one primary ICP segment and buying trigger",
      "Confirm pain intensity, budget reality, and urgency window",
      "Capture account context in CRM before first outreach",
    ],
    scriptTemplate:
      "Research brief: 'Based on your [fleet/operation profile], I see likely pressure around [specific issue]. Is this currently a priority to solve in the next [timeframe]?'",
    guardrail:
      "Do not force-fit low-pain accounts into active pipeline just to increase volume.",
  },
  {
    id: "M2",
    title: "Discovery & Qualification",
    focus: "Use structured discovery to confirm fit before pitching.",
    icon: Users,
    progress: 15,
    checklist: [
      "Open with clear agenda and permission",
      "Run C-L-O discovery sequence (clarify, label, overview)",
      "Score BANT fields (Budget, Authority, Need, Timeline) and route: close / nurture / disqualify",
    ],
    scriptTemplate:
      "Discovery opener: 'Before solutions, I want to understand your current process, what you've tried, and what a successful outcome looks like for you. Is that fair?'",
    guardrail:
      "Discovery is diagnostic, not manipulative. If there is no fit, disqualify early.",
  },
  {
    id: "M3",
    title: "Offer & Pitch",
    focus: "Present outcome-led offer with clear value and delivery path.",
    icon: MessageSquare,
    progress: 10,
    checklist: [
      "Map pitch to dream outcome and key constraints",
      "Use 3-pillar structure in plain language",
      "Anchor on business value; add bonuses, avoid discounting",
    ],
    scriptTemplate:
      "3-pillar frame: 'To reach [goal], we need three things: [pillar 1], [pillar 2], and [pillar 3]. Here is how our process maps to each one.'",
    guardrail:
      "Never inflate outcomes or hide delivery requirements to win commitment.",
  },
  {
    id: "M4",
    title: "Objection Handling",
    focus: "Resolve concerns with AAA: acknowledge, associate, ask.",
    icon: HelpCircle,
    progress: 5,
    checklist: [
      "Identify objection type: price, trust, timing, authority, fit",
      "Run one AAA cycle before restating solution",
      "Document objection + resolution outcome in CRM",
    ],
    scriptTemplate:
      "AAA prompt: 'I hear your concern around [objection]. That's a reasonable question. What would you need to see to make this decision confident?'",
    guardrail:
      "Use real examples only. Do not manufacture urgency or social proof.",
  },
  {
    id: "M5",
    title: "Close & Follow-Up",
    focus: "Close cleanly, then reinforce and execute disciplined follow-up.",
    icon: Handshake,
    progress: 0,
    checklist: [
      "Ask directly for next-step commitment",
      "When yes: stop selling and move to onboarding actions",
      "When no decision: run 30-day follow-up cadence",
    ],
    scriptTemplate:
      "Close question: 'Based on what we covered, are you ready to move forward with [agreed scope], or is there one issue we still need to resolve?'",
    guardrail:
      "Respect a final no. Preserve relationship and schedule future check-in when appropriate.",
  },
  {
    id: "M6",
    title: "CRM Hygiene & KPI Discipline",
    focus: "Run weekly constraint-first reviews using stage conversion data.",
    icon: Database,
    progress: 0,
    checklist: [
      "Track set, show, offer, and close rates by rep and source",
      "Enforce required fields (BANT, objections, stage timestamps)",
      "Review weakest funnel stage weekly and coach that constraint",
    ],
    scriptTemplate:
      "Manager review script: 'Our biggest gap this week is [stage KPI]. What behavior change this week would most improve that single constraint?'",
    guardrail:
      "Do not reward metric gaming. Tie incentives to quality outcomes, not vanity activity.",
  },
];

const objectionQuickRefs = [
  {
    objection: "Price",
    response: "Re-anchor to cost of inaction and expected business value.",
  },
  {
    objection: "Trust",
    response: "Use specific proof and realistic guarantee terms.",
  },
  {
    objection: "Timing",
    response: "Surface true blocker; separate delay from disinterest.",
  },
  {
    objection: "Authority",
    response: "Coach champion and include decision stakeholders early.",
  },
  {
    objection: "Fit",
    response: "Map solution to current stage or disqualify honestly.",
  },
];

/** Derive a badge variant based on completion percentage. */
function progressBadgeVariant(pct: number): "secondary" | "outline" | "default" {
  if (pct === 0) return "outline";
  if (pct >= 100) return "default";
  return "secondary";
}

export default function SalesTrainingPage() {
  const averageProgress = Math.round(
    modules.reduce((acc, module) => acc + module.progress, 0) / modules.length,
  );

  return (
    <div className="space-y-6" data-testid="sales-training-page">
      <section className="space-y-2" aria-labelledby="sales-training-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            id="sales-training-heading"
            className="text-lg sm:text-xl md:text-2xl font-semibold"
          >
            Sales Training Curriculum
          </h1>
          <Badge variant="outline" className="text-xs">Operator-ready</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-4xl">
          Practical sales operating playbook from ICP research through close, follow-up, and KPI discipline.
          Designed for consistent execution, ethical communication, and future LMS progress tracking.
        </p>
      </section>

      {/* ── Curriculum Progress Snapshot ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookCheck className="w-4 h-4 text-muted-foreground" aria-hidden />
            Curriculum Progress Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground" id="avg-progress-label">
              Average completion (team view)
            </span>
            <span className="font-medium" aria-live="polite">{averageProgress}%</span>
          </div>
          <Progress
            value={averageProgress}
            className="h-2"
            aria-labelledby="avg-progress-label"
            aria-valuenow={averageProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <p className="text-xs text-muted-foreground">
            Placeholder progress model for LMS integration (module status, quizzes, sign-off) — no backend dependency yet.
          </p>
        </CardContent>
      </Card>

      {/* ── Module Cards ───────────────────────────────────────────────── */}
      <div
        className="grid gap-4 grid-cols-1 xl:grid-cols-2"
        role="list"
        aria-label="Training modules"
      >
        {modules.map((module) => {
          const Icon = module.icon;
          const progressLabelId = `module-progress-label-${module.id}`;
          return (
            <Card
              key={module.id}
              id={`module-${module.id.toLowerCase()}`}
              role="listitem"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" aria-hidden />
                      {module.id}: {module.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{module.focus}</p>
                  </div>
                  <Badge
                    variant={progressBadgeVariant(module.progress)}
                    className="shrink-0"
                    aria-label={`${module.progress}% complete`}
                  >
                    {module.progress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress
                  value={module.progress}
                  className="h-1.5"
                  aria-label={`${module.id} ${module.title} progress`}
                  aria-valuenow={module.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />

                {/* Checklist */}
                <div>
                  <p
                    className="text-xs uppercase tracking-wide text-muted-foreground mb-1"
                    id={progressLabelId}
                  >
                    Checklist
                  </p>
                  <ul
                    className="space-y-1.5"
                    aria-labelledby={progressLabelId}
                  >
                    {module.checklist.map((item, idx) => (
                      <li
                        key={`${module.id}-checklist-${idx}`}
                        className="text-sm flex items-start gap-2"
                      >
                        {/* Circle indicates an uncompleted checklist item */}
                        <Circle
                          className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Script Template */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Script template
                  </p>
                  <blockquote className="text-sm rounded-md border border-border/60 bg-muted/30 p-2.5 not-italic">
                    {module.scriptTemplate}
                  </blockquote>
                </div>

                {/* Guardrail */}
                <div
                  className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5"
                  role="note"
                  aria-label="Guardrail"
                >
                  <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">
                    Guardrail
                  </p>
                  <p className="text-sm">{module.guardrail}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Objection Quick-Reference ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" aria-hidden />
            Objection Quick-Reference (AAA Ready)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            aria-label="Objection handling quick reference"
          >
            {objectionQuickRefs.map((item) => (
              <li key={item.objection} className="rounded-lg border border-border/60 p-3 list-none">
                <p className="text-sm font-medium">{item.objection}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.response}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── KPI Discipline Targets ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" aria-hidden />
            KPI Discipline Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="KPI discipline targets"
          >
            {[
              { label: "Show Rate", target: ">= 70%" },
              { label: "Offer Rate", target: ">= 95%" },
              { label: "Close Rate", target: ">= 40%" },
              { label: "Weekly Constraint", target: "1 stage focus" },
            ].map((metric) => (
              <li key={metric.label} className="rounded-lg border border-border/60 p-3 list-none">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{metric.label}</p>
                <p className="text-lg font-semibold mt-1">{metric.target}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Source Attribution ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-muted-foreground" aria-hidden />
            Source Attribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This curriculum is synthesized from the internal Hormozi sales corpus:</p>
          <ul className="space-y-1" aria-label="Source teams">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>Team A — Offer &amp; Value Mechanics</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>Team B — Playbooks &amp; Scripts</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>Team C — Objections &amp; Closing Psychology</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>Team D — Systems, KPIs &amp; Management Cadence</span>
            </li>
          </ul>
          <p className="text-xs">
            Guidance emphasizes ethical selling, real constraints, and fit-first qualification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
