"use client";

import { useState } from "react";
import {
  ClipboardList,
  CalendarDays,
  PlaneTakeoff,
  ShieldCheck,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
  FileBarChart,
  AlertTriangle,
  Wrench,
  Search,
  ChevronRight,
  ChevronDown,
  Globe,
  Lock,
  Settings,
  GraduationCap,
  Target,
  ArrowRight,
  CheckCircle2,
  Plane,
  Clock,
  BarChart3,
  Wifi,
  Database,
  FolderKey,
  Tablet,
  Building2,
  Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

// ── Types & Data ────────────────────────────────────────────────────────────

type Module = {
  title: string;
  summary: string;
  icon: LucideIcon;
  accent: string;
  capabilities: {
    name: string;
    detail: string;
  }[];
};

// ── Workflow Phases (the MRO lifecycle) ──────────────────────────────────────

const WORKFLOW_PHASES = [
  { label: "Intake", sub: "Quote & Schedule", icon: ClipboardList },
  { label: "Plan", sub: "Bay & Resource", icon: CalendarDays },
  { label: "Execute", sub: "Task & Parts", icon: Wrench },
  { label: "Inspect", sub: "QC & Compliance", icon: ShieldCheck },
  { label: "Release", sub: "RTS & Billing", icon: CheckCircle2 },
] as const;

// ── Modules by Tab ──────────────────────────────────────────────────────────

const SHOP_FLOOR: Module[] = [
  {
    title: "Work Orders",
    summary:
      "Full lifecycle management from aircraft intake through Return-to-Service. Task cards with step-level sign-off, shift handoff, and complete audit trail.",
    icon: ClipboardList,
    accent: "border-l-sky-500",
    capabilities: [
      { name: "Task Card Execution", detail: "Multi-step routing with inspector dual sign-off and stamp tracking" },
      { name: "Gantt & Kanban Views", detail: "Visual work order boards for shop managers and leads" },
      { name: "Shift Handoff", detail: "Structured context transfer between shifts with status snapshots" },
      { name: "Document Management", detail: "Attach 8130-3s, photos, and PDFs directly to work orders" },
      { name: "Lead Workspace", detail: "Supervisor-only view aggregating team workload and blockers" },
      { name: "WO Templates", detail: "Create reusable templates from completed work orders" },
      { name: "Maintenance Records", detail: "Timestamped history timeline for every work order action" },
      { name: "Certificate Generation", detail: "Automated RTS and airworthiness certificate output" },
    ],
  },
  {
    title: "Fleet Management",
    summary:
      "Centralized aircraft profiles with maintenance program tracking, life-limited parts monitoring, and ADS-B position data.",
    icon: PlaneTakeoff,
    accent: "border-l-indigo-500",
    capabilities: [
      { name: "Aircraft Profiles", detail: "Registration, type, serial, status, and full maintenance history per tail" },
      { name: "Maintenance Programs", detail: "Track inspection intervals, compliance windows, and program applicability" },
      { name: "Life-Limited Parts", detail: "Monitor time-controlled and cycle-controlled components approaching limits" },
      { name: "Predictive Forecasting", detail: "Project upcoming maintenance events and resource needs" },
      { name: "ADS-B Tracking", detail: "Real-time aircraft position data integrated from ADS-B feeds" },
      { name: "Fleet Calendar", detail: "Unified calendar view of upcoming events across the fleet" },
      { name: "Logbook Management", detail: "Digital aircraft logbook with entry tracking" },
    ],
  },
  {
    title: "Parts & Inventory",
    summary:
      "End-to-end parts lifecycle from receiving inspection through shipping. Warehouse bin management, lot traceability, and automated stock alerts.",
    icon: Package,
    accent: "border-l-teal-500",
    capabilities: [
      { name: "Receiving Inspection", detail: "Inspect inbound parts against PO, verify certifications, assign bins" },
      { name: "Warehouse Locations", detail: "Hierarchical bin/shelf/zone structure with barcode-ready identifiers" },
      { name: "Part Requests", detail: "Technicians request parts directly from task cards, linked to WOs" },
      { name: "Rotables & Loaners", detail: "Track exchange units, loaner agreements, and swap history" },
      { name: "Core Tracking", detail: "Manage core returns, credits, and vendor core bank balances" },
      { name: "Tool Crib", detail: "Calibrated tool checkout, return tracking, and calibration schedules" },
      { name: "Lots & Batches", detail: "Full batch traceability from manufacturer lot through consumption" },
      { name: "Tags & 8130-3", detail: "Generate and manage FAA serviceability tags and documentation" },
      { name: "Stock Alerts", detail: "Automated reorder points, min/max tracking, and shortage notifications" },
      { name: "Shipping", detail: "Outbound shipment creation, tracking numbers, and delivery confirmation" },
    ],
  },
  {
    title: "Findings & Discrepancies",
    summary:
      "Unified squawk management with aircraft system classification, origin tracking, and direct linkage to parent work orders and task cards.",
    icon: AlertTriangle,
    accent: "border-l-orange-500",
    capabilities: [
      { name: "Centralized Findings", detail: "Single list of all open and resolved discrepancies across active WOs" },
      { name: "System Classification", detail: "ATA chapter and aircraft system tagging for trend analysis" },
      { name: "Origin Tracking", detail: "Distinguish customer-reported, found-in-shop, and RTS-found items" },
      { name: "Inspection Flagging", detail: "Mark items requiring inspector review before work proceeds" },
      { name: "WO & Task Linkage", detail: "Direct association to parent work order and originating task card" },
    ],
  },
];

const SCHEDULING: Module[] = [
  {
    title: "Scheduling Engine",
    summary:
      "Constraint-aware scheduling with drag-and-drop Gantt boards, bay assignment, and capacity planning across locations.",
    icon: CalendarDays,
    accent: "border-l-violet-500",
    capabilities: [
      { name: "Gantt Board", detail: "Drag-and-drop work order scheduling with dependency visualization" },
      { name: "Bay Assignment", detail: "Assign aircraft to hangar bays with conflict detection" },
      { name: "Capacity Planning", detail: "Visualize labor hours vs. availability across time horizons" },
      { name: "Due-List Workbench", detail: "Filter and prioritize upcoming maintenance by due date, aircraft, and type" },
      { name: "Schedule Optimization", detail: "Constraint solver considering skills, parts, bays, and customer priority" },
      { name: "Financial Planning", detail: "Revenue and labor cost projections tied to the schedule" },
    ],
  },
  {
    title: "Roster & Teams",
    summary:
      "Manage technician assignments, team composition, skill matching, and shift coverage for optimal shop floor staffing.",
    icon: Users,
    accent: "border-l-blue-500",
    capabilities: [
      { name: "Team Composition", detail: "Build teams with the right mix of A&P, IA, and specialist certifications" },
      { name: "Shift Management", detail: "Define shift patterns and track coverage across time periods" },
      { name: "Skill Matching", detail: "Match technician authorizations to task card requirements" },
      { name: "Workload Balancing", detail: "Distribute assignments evenly based on availability and hours" },
    ],
  },
  {
    title: "Quote Workspace",
    summary:
      "Build customer quotes with labor estimates, parts markup, and scope breakdowns. Convert approved quotes directly into scheduled work orders.",
    icon: ReceiptText,
    accent: "border-l-emerald-500",
    capabilities: [
      { name: "Quote Builder", detail: "Line-item labor and parts estimation with configurable markup" },
      { name: "Scope Breakdown", detail: "Structured task groupings with individual pricing" },
      { name: "Quote-to-WO Conversion", detail: "One-click conversion of approved quotes into work orders" },
      { name: "Template Library", detail: "Reusable quote templates for common inspection types" },
    ],
  },
];

const BACK_OFFICE: Module[] = [
  {
    title: "Billing & Finance",
    summary:
      "Integrated invoicing, accounts receivable, time tracking, and purchase orders with QuickBooks synchronization.",
    icon: ReceiptText,
    accent: "border-l-green-500",
    capabilities: [
      { name: "Invoicing", detail: "Generate invoices from WO labor and parts, with line-item detail" },
      { name: "Accounts Receivable", detail: "Aging dashboard, payment tracking, and collection workflows" },
      { name: "Time Clock", detail: "Technician clock-in/out with automatic labor capture per task" },
      { name: "Time Approval", detail: "Manager review and approval queue for submitted labor hours" },
      { name: "Purchase Orders", detail: "Create, send, and receive POs with 3-way match to invoices" },
      { name: "Credit Memos", detail: "Issue credits against invoices with reason tracking" },
      { name: "Deposits & Recurring", detail: "Upfront deposit tracking and recurring billing schedules" },
      { name: "Counter Sales", detail: "Over-the-counter parts and service sales for walk-in work" },
      { name: "Labor Kits & Pricing", detail: "Predefined labor packages with configurable rate structures" },
      { name: "Warranty Claims", detail: "Track warranty status, file claims, and manage reimbursement" },
      { name: "Tax Configuration", detail: "Multi-jurisdiction tax rules with exemption handling" },
      { name: "QuickBooks Sync", detail: "Bi-directional sync of invoices, payments, and chart of accounts" },
    ],
  },
  {
    title: "CRM & Sales",
    summary:
      "Aviation-specific pipeline management with prospect intelligence for Part 145 MRO shops and Part 135 air operators.",
    icon: TrendingUp,
    accent: "border-l-cyan-500",
    capabilities: [
      { name: "Accounts & Contacts", detail: "Customer account profiles with contact directory and history" },
      { name: "Sales Pipeline", detail: "Visual deal stages with drag-and-drop progression and win/loss tracking" },
      { name: "Prospect Intelligence", detail: "FAA registry data enrichment for Part 145 and Part 135 prospects" },
      { name: "Interaction Log", detail: "Track calls, emails, meetings, and notes per account" },
      { name: "Sales Analytics", detail: "Conversion rates, pipeline velocity, and revenue attribution" },
      { name: "Sales Training", detail: "Onboarding modules and performance tracking for sales team" },
    ],
  },
  {
    title: "Reports & Analytics",
    summary:
      "Executive dashboards covering financial performance, inventory health, revenue trends, and shop throughput metrics.",
    icon: FileBarChart,
    accent: "border-l-rose-500",
    capabilities: [
      { name: "Financial Dashboard", detail: "Revenue, expenses, and margin overview with period comparison" },
      { name: "Cash Flow Forecast", detail: "Forward-looking cash position based on receivables and pipeline" },
      { name: "Profitability Analysis", detail: "Per-WO and per-customer margin breakdown" },
      { name: "Cash Runway", detail: "Months of operating runway based on burn rate and reserves" },
      { name: "Inventory Reports", detail: "Valuation, turnover, and dead-stock identification" },
      { name: "Throughput Metrics", detail: "WO cycle time, bay utilization, and labor efficiency" },
    ],
  },
];

const COMPLIANCE_MODULES: Module[] = [
  {
    title: "FAA Compliance",
    summary:
      "Purpose-built for Part 145 regulatory requirements. AD/SB tracking, audit readiness scoring, QCM review queues, and Diamond Award progress.",
    icon: ShieldCheck,
    accent: "border-l-amber-500",
    capabilities: [
      { name: "AD/SB Tracking", detail: "Airworthiness Directive and Service Bulletin applicability and status" },
      { name: "Audit Readiness", detail: "Scored dashboard measuring preparedness across FAA audit categories" },
      { name: "QCM Review", detail: "Inspector review queues with approval workflows and rejection notes" },
      { name: "Diamond Award", detail: "Track progress toward FAA Diamond Award of Excellence criteria" },
      { name: "Audit Trail", detail: "Immutable log of every user action, sign-off, and status change" },
      { name: "Task Compliance Items", detail: "Per-task regulatory references with status tracking" },
    ],
  },
  {
    title: "Personnel & Training",
    summary:
      "Technician workforce management with A&P certification tracking, OJT curriculum, career progression, and training compliance analytics.",
    icon: GraduationCap,
    accent: "border-l-pink-500",
    capabilities: [
      { name: "Personnel Roster", detail: "Technician profiles with certifications, authorizations, and employment data" },
      { name: "Certification Tracking", detail: "A&P, IA, and specialty authorization expiration monitoring" },
      { name: "OJT Curriculum", detail: "Build structured on-the-job training programs with task sign-off" },
      { name: "Training Jackets", detail: "Individual training records with completion tracking and expiration" },
      { name: "Career Progression", detail: "Track advancement from apprentice through lead technician" },
      { name: "Training Analytics", detail: "Compliance rates, completion trends, and gap identification" },
    ],
  },
];

const PORTAL_FEATURES = [
  { title: "Fleet Overview", detail: "Customers view their aircraft, current maintenance status, and service history.", icon: Plane },
  { title: "Work Order Tracking", detail: "Real-time progress visibility with task-level status updates and ETAs.", icon: ClipboardList },
  { title: "Quotes & Approvals", detail: "Review scope, approve quotes, or request changes without calling the shop.", icon: ReceiptText },
  { title: "Invoice & Payment History", detail: "Access current and past invoices, payment records, and account statements.", icon: FileBarChart },
  { title: "Messaging", detail: "Threaded conversations tied to specific work orders for organized communication.", icon: Globe },
  { title: "Branded Experience", detail: "Portal reflects your repair station's logo, colors, and identity.", icon: Building2 },
];

// ── Role Access Matrix ──────────────────────────────────────────────────────

const ROLE_MATRIX = {
  roles: ["Admin", "Shop Mgr", "QCM", "Billing Mgr", "Lead Tech", "Technician", "Parts Clerk", "Read Only"],
  modules: [
    { name: "Work Orders", access: [true, true, true, false, true, true, false, true] },
    { name: "Scheduling", access: [true, true, false, false, true, false, false, true] },
    { name: "Fleet", access: [true, true, true, false, true, true, false, true] },
    { name: "Parts & Inventory", access: [true, true, false, false, false, true, true, true] },
    { name: "Billing & Finance", access: [true, false, false, true, false, false, false, true] },
    { name: "CRM & Sales", access: [true, true, false, false, false, false, false, true] },
    { name: "Compliance", access: [true, true, true, false, false, false, false, true] },
    { name: "Personnel", access: [true, true, true, false, false, false, false, true] },
    { name: "Reports", access: [true, true, true, true, false, false, false, true] },
    { name: "Settings", access: [true, false, false, false, false, false, false, false] },
  ],
};

// ── Sub-Components ──────────────────────────────────────────────────────────

function ModuleSection({ module, index }: { module: Module; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = module.icon;

  return (
    <div
      className={cn(
        "border-l-2 rounded-lg border border-border/50 bg-card transition-all duration-200",
        module.accent,
        isOpen && "shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 group"
      >
        <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-[13px] font-semibold text-foreground">{module.title}</h3>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {module.capabilities.length} capabilities
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{module.summary}</p>
        </div>
        <div className="flex-shrink-0 mt-1.5">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="border-t border-border/30 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {module.capabilities.map((cap) => (
                <div key={cap.name} className="group/cap">
                  <div className="flex items-baseline gap-2">
                    <CheckCircle2 className="w-3 h-3 text-primary/50 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-foreground">{cap.name}</span>
                      <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                        {cap.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabSection({ modules, emptyMsg }: { modules: Module[]; emptyMsg?: string }) {
  if (modules.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">{emptyMsg}</div>
    );
  }
  return (
    <div className="space-y-3 mt-4">
      {modules.map((mod, idx) => (
        <ModuleSection key={mod.title} module={mod} index={idx} />
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformFeaturesPage() {
  const totalCapabilities = [
    ...SHOP_FLOOR,
    ...SCHEDULING,
    ...BACK_OFFICE,
    ...COMPLIANCE_MODULES,
  ].reduce((sum, mod) => sum + mod.capabilities.length, 0);

  const totalModules =
    SHOP_FLOOR.length + SCHEDULING.length + BACK_OFFICE.length + COMPLIANCE_MODULES.length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
              Athelon Product Scope
            </h1>
            <p className="text-xs text-muted-foreground">
              FAA Part 145 MRO Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── MRO Workflow Coverage ────────────────────────────────── */}
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              End-to-End MRO Workflow Coverage
            </p>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-stretch gap-0">
              {WORKFLOW_PHASES.map((phase, i) => {
                const Icon = phase.icon;
                return (
                  <div key={phase.label} className="flex items-center flex-1 min-w-0">
                    <div className="flex-1 min-w-0 text-center py-3 px-2 rounded-lg bg-primary/[0.06] border border-primary/10">
                      <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">{phase.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{phase.sub}</p>
                    </div>
                    {i < WORKFLOW_PHASES.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border/30 px-4 py-2.5 flex items-center justify-between bg-muted/20">
            <span className="text-[11px] text-muted-foreground">
              Athelon covers every phase of the maintenance cycle in a single platform.
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground font-tactical">{totalModules}</span> modules
              </span>
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground font-tactical">{totalCapabilities}</span> capabilities
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Module Detail Tabs ───────────────────────────────────── */}
      <Tabs defaultValue="shop-floor">
        <TabsList variant="line">
          <TabsTrigger value="shop-floor">Shop Floor</TabsTrigger>
          <TabsTrigger value="scheduling">Planning</TabsTrigger>
          <TabsTrigger value="back-office">Back Office</TabsTrigger>
          <TabsTrigger value="compliance">Compliance & People</TabsTrigger>
          <TabsTrigger value="portal">Customer Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="shop-floor">
          <TabSection modules={SHOP_FLOOR} />
        </TabsContent>

        <TabsContent value="scheduling">
          <TabSection modules={SCHEDULING} />
        </TabsContent>

        <TabsContent value="back-office">
          <TabSection modules={BACK_OFFICE} />
        </TabsContent>

        <TabsContent value="compliance">
          <TabSection modules={COMPLIANCE_MODULES} />
        </TabsContent>

        <TabsContent value="portal">
          <div className="mt-4 space-y-3">
            <div className="px-1">
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                A branded self-service portal for your customers. Aircraft owners and operators
                get 24/7 visibility into maintenance progress, quote approvals, and invoice
                history without calling the shop.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PORTAL_FEATURES.map((pf) => {
                const Icon = pf.icon;
                return (
                  <div
                    key={pf.title}
                    className="p-3.5 rounded-lg border border-border/50 bg-card hover:border-amber-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-400/80" />
                      <span className="text-xs font-semibold text-foreground">{pf.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      {pf.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Role Access Matrix ───────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Role Access Matrix
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Eight MRO-specific roles with granular module access. Every screen enforces role permissions.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-t border-border/30">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground sticky left-0 bg-card z-10">
                    Module
                  </th>
                  {ROLE_MATRIX.roles.map((role) => (
                    <th
                      key={role}
                      className="px-2 py-2 font-medium text-muted-foreground text-center whitespace-nowrap"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_MATRIX.modules.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={cn(
                      "border-t border-border/20",
                      idx % 2 === 0 && "bg-muted/10",
                    )}
                  >
                    <td className="px-4 py-1.5 font-medium text-foreground/80 sticky left-0 bg-inherit z-10">
                      {row.name}
                    </td>
                    {row.access.map((has, i) => (
                      <td key={ROLE_MATRIX.roles[i]} className="px-2 py-1.5 text-center">
                        {has ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary/70 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Platform Architecture ────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Platform Architecture</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { icon: Wifi, title: "Real-Time Sync", desc: "Every change propagates instantly to all connected users. No refresh, no polling." },
              { icon: FolderKey, title: "Enterprise SSO", desc: "Clerk-based authentication with multi-organization support and session management." },
              { icon: Building2, title: "Multi-Location", desc: "Configure and switch between station locations. Per-location bays, teams, and capabilities." },
              { icon: Link2, title: "Integrations", desc: "QuickBooks accounting sync, ADS-B position feeds, and data import/export tools." },
              { icon: Tablet, title: "Shop Floor Ready", desc: "Responsive design optimized for hangar tablets. Zero local software to install or maintain." },
              { icon: Database, title: "Audit Trail", desc: "Immutable event log for every mutation. Timestamp, user, and change delta for compliance." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3 py-1">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground/70 leading-snug">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/50 pb-2">
        <span>Athelon Product Scope &middot; FAA Part 145 MRO Platform</span>
        <span>athelon.io</span>
      </div>
    </div>
  );
}
