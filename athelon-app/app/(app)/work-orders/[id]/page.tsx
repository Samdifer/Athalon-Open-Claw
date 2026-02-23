import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  AlertTriangle,
  Package,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  Wrench,
  ChevronRight,
  PenLine,
  ShieldCheck,
  XCircle,
  Timer,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Demo data — will be replaced with Convex queries
const demoWO = {
  "WO-2026-0041": {
    number: "WO-2026-0041",
    aircraft: "N192AK",
    aircraftMake: "Cessna",
    aircraftModel: "172S",
    aircraftSerial: "172S11234",
    customer: "High Country Charter LLC",
    description:
      "100-hour inspection per Cessna 172S Maintenance Manual. Includes engine compression check, oil change, brake inspection, and required AD compliance checks.",
    type: "100_hour",
    typeLabel: "100-Hour Inspection",
    status: "in_progress",
    statusLabel: "In Progress",
    priority: "normal",
    openedDate: "Feb 20, 2026",
    aircraftHoursAtOpen: 3847.2,
    assignedTechs: ["Ray Kowalski", "Sandra Mercado"],
    taskCards: [
      {
        id: "tc-1",
        number: "TC-001",
        title: "Engine Compression Check — All Cylinders",
        type: "Inspection",
        status: "complete",
        statusLabel: "Signed",
        stepsComplete: 3,
        stepsTotal: 3,
        signedBy: "Ray Kowalski",
        signedAt: "Feb 21, 2026 14:22Z",
        href: "/work-orders/WO-2026-0041/tasks/TC-001",
      },
      {
        id: "tc-2",
        number: "TC-002",
        title: "Engine Oil Change & Filter Replacement",
        type: "Maintenance",
        status: "complete",
        statusLabel: "Signed",
        stepsComplete: 4,
        stepsTotal: 4,
        signedBy: "Ray Kowalski",
        signedAt: "Feb 21, 2026 16:05Z",
        href: "/work-orders/WO-2026-0041/tasks/TC-002",
      },
      {
        id: "tc-3",
        number: "TC-003",
        title: "Brake System Inspection — Main & Nose",
        type: "Inspection",
        status: "in_progress",
        statusLabel: "In Progress",
        stepsComplete: 2,
        stepsTotal: 5,
        signedBy: null,
        signedAt: null,
        href: "/work-orders/WO-2026-0041/tasks/TC-003",
      },
      {
        id: "tc-4",
        number: "TC-004",
        title: "Airworthiness Directive Compliance Review",
        type: "Compliance",
        status: "not_started",
        statusLabel: "Not Started",
        stepsComplete: 0,
        stepsTotal: 2,
        signedBy: null,
        signedAt: null,
        href: "/work-orders/WO-2026-0041/tasks/TC-004",
      },
    ],
    parts: [
      {
        id: "p-1",
        partNumber: "AV-OIL-W80",
        name: "Aviation Oil 15W-50 AeroShell W80",
        qty: "6 qt",
        status: "installed",
        statusLabel: "Installed",
        eightOneThirty: "8130-RMTS-2026-0412",
      },
      {
        id: "p-2",
        partNumber: "AV17-FILTER-CH48109-1",
        name: "Engine Oil Filter — Champion CH48109-1",
        qty: "1 ea",
        status: "installed",
        statusLabel: "Installed",
        eightOneThirty: "8130-RMTS-2026-0413",
      },
      {
        id: "p-3",
        partNumber: "MIL-PRF-5606-QT",
        name: "Hydraulic Fluid MIL-PRF-5606",
        qty: "1 qt",
        status: "inventory",
        statusLabel: "In Storeroom",
        eightOneThirty: null,
      },
    ],
    squawks: [
      {
        id: "sq-1",
        number: "SQ-2026-041-001",
        description:
          "Right main gear shimmy dampener shows intermittent hesitation on taxi. Suspect worn piston seal.",
        severity: "airworthiness",
        status: "open",
        statusLabel: "Open",
        foundBy: "Ray Kowalski",
        foundDate: "Feb 22, 2026",
        requiresCustomerAuth: true,
      },
    ],
    auditEvents: [
      {
        id: "ev-1",
        event: "status_changed",
        description: "Status changed: open → in_progress (first task card created)",
        user: "Devraj A.",
        timestamp: "Feb 21, 2026 13:47Z",
      },
      {
        id: "ev-2",
        event: "task_signed",
        description: "TC-001 signed by Ray Kowalski — Engine compression check complete",
        user: "Ray Kowalski",
        timestamp: "Feb 21, 2026 14:22Z",
      },
      {
        id: "ev-3",
        event: "task_signed",
        description: "TC-002 signed by Ray Kowalski — Oil change complete",
        user: "Ray Kowalski",
        timestamp: "Feb 21, 2026 16:05Z",
      },
      {
        id: "ev-4",
        event: "discrepancy_created",
        description: "SQ-2026-041-001 opened — shimmy dampener finding",
        user: "Ray Kowalski",
        timestamp: "Feb 22, 2026 09:14Z",
      },
    ],
    closeReadiness: {
      canClose: false,
      blockers: [
        "2 task cards not yet signed (TC-003, TC-004)",
        "1 open squawk requires disposition (SQ-2026-041-001)",
      ],
    },
  },
};

function getTaskStatusBadge(status: string, label: string) {
  const map: Record<string, string> = {
    complete: "bg-green-500/15 text-green-400 border-green-500/30",
    in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    not_started: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    voided: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium border ${map[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status === "complete" && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
      {status === "in_progress" && <Circle className="w-2.5 h-2.5 mr-1" />}
      {label}
    </Badge>
  );
}

function getPartStatusBadge(status: string, label: string) {
  const map: Record<string, string> = {
    installed: "bg-green-500/15 text-green-400 border-green-500/30",
    inventory: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    on_order: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium border ${map[status] ?? "bg-muted"}`}
    >
      {label}
    </Badge>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const wo = demoWO[id as keyof typeof demoWO] ?? demoWO["WO-2026-0041"];

  const tasksComplete = wo.taskCards.filter((tc) => tc.status === "complete").length;
  const tasksTotal = wo.taskCards.length;

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-3 text-xs text-muted-foreground">
          <Link href="/work-orders">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Work Orders
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-semibold font-mono text-foreground">
                {wo.number}
              </h1>
              <Badge
                variant="outline"
                className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-[11px] font-medium"
              >
                {wo.statusLabel}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground border-border/40"
              >
                {wo.typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-2xl text-foreground">
                {wo.aircraft}
              </span>
              <span className="text-base text-muted-foreground">
                {wo.aircraftMake} {wo.aircraftModel}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">S/N {wo.aircraftSerial}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{wo.customer}</p>
          </div>

          {/* Close Readiness / Sign-Off Button */}
          <div className="flex-shrink-0">
            {wo.closeReadiness.canClose ? (
              <Button asChild className="gap-2">
                <Link href={`/work-orders/${wo.number}/sign-off`}>
                  <ShieldCheck className="w-4 h-4" />
                  Sign Off & Close
                </Link>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Task Progress</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {tasksComplete}/{tasksTotal}
              </span>
              <Progress
                value={(tasksComplete / tasksTotal) * 100}
                className="h-1.5 flex-1"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Open Squawks</p>
            <span className={`text-lg font-bold ${wo.squawks.length > 0 ? "text-red-400" : "text-foreground"}`}>
              {wo.squawks.filter((s) => s.status === "open").length}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Parts On Order</p>
            <span className="text-lg font-bold text-foreground">
              {wo.parts.filter((p) => p.status === "on_order").length}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Hours at Open</p>
            <span className="text-lg font-bold font-mono text-foreground">
              {wo.aircraftHoursAtOpen.toFixed(1)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Close Readiness Warning */}
      {!wo.closeReadiness.canClose && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400 mb-1">
                  Cannot close WO — {wo.closeReadiness.blockers.length} blockers
                </p>
                <ul className="space-y-0.5">
                  {wo.closeReadiness.blockers.map((b, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                    >
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

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="h-9 bg-muted/40 p-0.5 mb-4">
          {(
            [
              { value: "tasks", label: "Task Cards", Icon: ClipboardList, count: tasksComplete, total: tasksTotal },
              { value: "squawks", label: "Squawks", Icon: AlertTriangle, count: wo.squawks.filter(s => s.status === "open").length, total: null },
              { value: "parts", label: "Parts", Icon: Package, count: null, total: null },
              { value: "notes", label: "Notes & Activity", Icon: FileText, count: null, total: null },
            ] as const
          ).map(({ value, label, Icon, count, total }) => (
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
                  {total !== null ? `${count}/${total}` : count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Task Cards Tab */}
        <TabsContent value="tasks" className="mt-0">
          <div className="space-y-2">
            {wo.taskCards.map((tc) => (
              <Link key={tc.id} href={tc.href}>
                <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground font-medium">
                            {tc.number}
                          </span>
                          {getTaskStatusBadge(tc.status, tc.statusLabel)}
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-border/40"
                          >
                            {tc.type}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {tc.title}
                        </p>
                        {tc.signedBy && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Signed by {tc.signedBy} · {tc.signedAt}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        {tc.stepsTotal > 0 && (
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 mb-1 justify-end">
                              <span className="text-[11px] text-muted-foreground">
                                {tc.stepsComplete}/{tc.stepsTotal} steps
                              </span>
                            </div>
                            <Progress
                              value={(tc.stepsComplete / tc.stepsTotal) * 100}
                              className="h-1 w-16"
                            />
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            <Button variant="outline" size="sm" className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2">
              <Wrench className="w-3.5 h-3.5" />
              Add Task Card
            </Button>
          </div>
        </TabsContent>

        {/* Squawks Tab */}
        <TabsContent value="squawks" className="mt-0">
          <div className="space-y-2">
            {wo.squawks.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-10 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No squawks on this work order</p>
                </CardContent>
              </Card>
            ) : (
              wo.squawks.map((sq) => (
                <Card key={sq.id} className="border-l-4 border-l-red-500 border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {sq.number}
                          </span>
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px]">
                            Open
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-400 border-amber-500/30"
                          >
                            Airworthiness
                          </Badge>
                          {sq.requiresCustomerAuth && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border/40"
                            >
                              Customer Auth Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{sq.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Found by {sq.foundBy} · {sq.foundDate}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs flex-shrink-0">
                        <Link href={`/squawks/${sq.id}`}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Log Squawk
            </Button>
          </div>
        </TabsContent>

        {/* Parts Tab */}
        <TabsContent value="parts" className="mt-0">
          <div className="space-y-2">
            {wo.parts.map((part) => (
              <Card key={part.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          P/N: {part.partNumber}
                        </span>
                        {getPartStatusBadge(part.status, part.statusLabel)}
                      </div>
                      <p className="text-sm text-muted-foreground">{part.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                          Qty: {part.qty}
                        </span>
                        {part.eightOneThirty && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              8130-3: {part.eightOneThirty}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2">
              <Package className="w-3.5 h-3.5" />
              Request Part
            </Button>
          </div>
        </TabsContent>

        {/* Notes & Activity Tab */}
        <TabsContent value="notes" className="mt-0">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Work Order Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {wo.auditEvents.map((ev, i) => (
                  <div key={ev.id}>
                    {i > 0 && <Separator className="opacity-30 mb-3" />}
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">{ev.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground">
                            {ev.user}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-mono text-[10px] text-muted-foreground/70">
                            {ev.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
