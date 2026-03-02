"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

type ScheduleEvent = {
  date: string; // YYYY-MM-DD
  tail: string;
  woNumber?: string;
  woId?: string;
  type: "routine" | "overdue" | "upcoming";
};

export default function FleetCalendarPage() {
  const { orgId } = useCurrentOrg();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const rangeStart = new Date(year, month, 1).getTime();
  const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  const workOrders = useQuery(
    api.fleetCalendar.listScheduledWorkOrders,
    orgId ? { organizationId: orgId, rangeStartMs: rangeStart, rangeEndMs: rangeEnd } : "skip",
  );

  const events = useMemo<ScheduleEvent[]>(() => {
    if (!workOrders) return [];
    const result: ScheduleEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const wo of workOrders) {
      const dateMs = wo.scheduledStartDate ?? wo.promisedDeliveryDate;
      if (!dateMs) continue;

      const d = new Date(dateMs);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const tail = wo.tailNumber ?? "N/A";

      let type: ScheduleEvent["type"] = "routine";
      if (d < today && wo.status !== "closed" && wo.status !== "cancelled") {
        type = "overdue";
      } else {
        const diff = d.getTime() - today.getTime();
        const daysUntil = diff / (1000 * 60 * 60 * 24);
        if (daysUntil <= 7 && daysUntil >= 0) type = "upcoming";
      }

      result.push({
        date: dateStr,
        tail,
        woNumber: wo.workOrderNumber,
        woId: String(wo._id),
        type,
      });
    }
    return result;
  }, [workOrders]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  if (!orgId) {
    return <div className="p-6 text-muted-foreground">Select an organization first.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Fleet Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {(month !== now.getMonth() || year !== now.getFullYear()) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs ml-1"
              onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Routine</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Overdue</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Upcoming (≤7d)</span>
      </div>

      {!workOrders ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            {/* Header row */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 auto-rows-[minmax(80px,1fr)]">
              {cells.map((day, i) => {
                const dateStr = day
                  ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : "";
                const dayEvents = day ? eventsByDate.get(dateStr) ?? [] : [];
                const isToday =
                  day === now.getDate() &&
                  month === now.getMonth() &&
                  year === now.getFullYear();

                return (
                  <div
                    key={i}
                    className={`border-r border-b last:border-r-0 p-1 min-h-[80px] ${
                      !day ? "bg-muted/20" : ""
                    }`}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${
                            isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev, j) => {
                            const color =
                              ev.type === "overdue"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                                : ev.type === "upcoming"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
                            return (
                              <Link
                                key={j}
                                to={ev.woId ? `/work-orders/${ev.woId}` : `/fleet/${ev.tail}`}
                                className={`block text-[10px] leading-tight px-1 py-0.5 rounded border truncate hover:opacity-80 ${color}`}
                                title={ev.woNumber ? `${ev.tail} — ${ev.woNumber}` : ev.tail}
                              >
                                <span className="font-semibold">{ev.tail}</span>
                                {ev.woNumber && (
                                  <span className="opacity-70 ml-0.5">·{ev.woNumber}</span>
                                )}
                              </Link>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{dayEvents.length - 3} more
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
