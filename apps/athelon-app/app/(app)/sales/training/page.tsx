"use client";

import type { ComponentType } from "react";
import {
  BadgeCheck,
  BarChart3,
  BookCheck,
  CheckCircle2,
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
  icon: ComponentType<{ className?: string }>;
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
      "Score BANT fields and route: close / nurture / disqualify",
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

export default function SalesTrainingPage() {
  const averageProgress = Math.round(
    modules.reduce((acc, module) => acc + module.progress, 0) / modules.length,
  );

  return (
    <div className="space-y-6" data-testid="sales-training-page">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Sales Training Curriculum</h1>
          <Badge variant="outline" className="text-xs">Operator-ready</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-4xl">
          Practical sales operating playbook from ICP research through close, follow-up, and KPI discipline.
          Designed for consistent execution, ethical communication, and future LMS progress tracking.
        </p>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookCheck className="w-4 h-4 text-muted-foreground" />
            Curriculum Progress Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Average completion (team view)</span>
            <span className="font-medium">{averageProgress}%</span>
          </div>
          <Progress value={averageProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Placeholder progress model for LMS integration (module status, quizzes, sign-off) — no backend dependency yet.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {module.id}: {module.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{module.focus}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{module.progress}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={module.progress} className="h-1.5" />

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Checklist</p>
                  <ul className="space-y-1.5">
                    {module.checklist.map((item) => (
                      <li key={item} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Script template</p>
                  <p className="text-sm rounded-md border border-border/60 bg-muted/30 p-2.5">
                    {module.scriptTemplate}
                  </p>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">Guardrail</p>
                  <p className="text-sm">{module.guardrail}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            Objection Quick-Reference (AAA Ready)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {objectionQuickRefs.map((item) => (
            <div key={item.objection} className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">{item.objection}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.response}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            KPI Discipline Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Show Rate", target: ">= 70%" },
            { label: "Offer Rate", target: ">= 95%" },
            { label: "Close Rate", target: ">= 40%" },
            { label: "Weekly Constraint", target: "1 stage focus" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{metric.label}</p>
              <p className="text-lg font-semibold mt-1">{metric.target}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-muted-foreground" />
            Source Attribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This curriculum is synthesized from the internal Hormozi sales corpus:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />Team A — Offer & Value Mechanics</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />Team B — Playbooks & Scripts</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />Team C — Objections & Closing Psychology</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />Team D — Systems, KPIs & Management Cadence</li>
          </ul>
          <p className="text-xs">
            Guidance emphasizes ethical selling, real constraints, and fit-first qualification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
