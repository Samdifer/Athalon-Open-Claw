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

// BUG-DOM-122: getDaysInMonth/getFirstDayOfWeek previously used local-tz Date
// constructors. Because scheduledStartDate/promisedDeliveryDate are stored as
// UTC-midnight timestamps, and event placement uses UTC accessors, the calendar
// grid layout and query range must also use UTC. A shop in UTC-5 at 11 PM local
// time would compute the wrong number of days or first-day offset for the next
// UTC month, causing events to shift into the wrong cell or disappear entirely.
function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
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
  // BUG-DOM-123: Calendar state (year/month) must use UTC to stay consistent
  // with the UTC-based isToday highlight and event placement. Using local-tz
  // getMonth()/getFullYear() caused the "Today" button and grid highlight to
  // disagree near midnight in non-UTC timezones.
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());

  // BUG-DOM-122: Range boundaries must use UTC to match UTC-stored timestamps.
  // Local-tz boundaries caused first/last-day events to fall outside the query
  // window for shops west of UTC (e.g. UTC-5 missed March 1 events because
  // local midnight March 1 = 05:00 UTC March 1, excluding 00:00-04:59 UTC).
  const rangeStart = Date.UTC(year, month, 1);
  const rangeEnd = Date.UTC(year, month + 1, 0, 23, 59, 59, 999);

  const workOrders = useQuery(
    api.fleetCalendar.listScheduledWorkOrders,
    orgId ? { organizationId: orgId, rangeStartMs: rangeStart, rangeEndMs: rangeEnd } : "skip",
  );

  const events = useMemo<ScheduleEvent[]>(() => {
    if (!workOrders) return [];
    const result: ScheduleEvent[] = [];
    // BUG-DOM-127: `today` previously used local-tz midnight (setHours(0,0,0,0))
    // while all event dates are UTC timestamps rendered with UTC accessors.
    // A shop in UTC-5 at 3 PM local (8 PM UTC) would see today's scheduled WOs
    // marked "overdue" because local midnight > UTC midnight for the same date.
    // Use UTC midnight for consistency with the rest of the calendar logic.
    const nowUtc = new Date();
    const today = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));

    for (const wo of workOrders) {
      const dateMs = wo.scheduledStartDate ?? wo.promisedDeliveryDate;
      if (!dateMs) continue;

      // BUG-DOM-057: scheduledStartDate is stored as a UTC midnight timestamp.
      // Using local-timezone getDate()/getMonth() causes events to appear on the
      // wrong calendar day for shops in non-UTC timezones (e.g. US Eastern sees
      // a March 2 event on March 1). Use UTC accessors to build the date string.
      const d = new Date(dateMs);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

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

  // BUG-DOM-121: Missing org context showed a plain unstyled div — inconsistent
  // with the rest of the app which uses Card-based empty states with recovery actions.
  // A DOM landing here without org context gets no guidance on what to do next.
  if (!orgId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Fleet Calendar</h1>
        </div>
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No organization context available
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Complete onboarding or ask your administrator to link your account.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/onboarding">Complete Setup</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          {(month !== now.getUTCMonth() || year !== now.getUTCFullYear()) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs ml-1"
              onClick={() => { setMonth(now.getUTCMonth()); setYear(now.getUTCFullYear()); }}
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
          {workOrders.length === 0 && (
            <div className="px-4 pt-3 pb-1 text-xs text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
              No scheduled work orders in {MONTHS[month]} {year} — work orders with a scheduled start or promised delivery date will appear here.
            </div>
          )}
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
                // BUG-DOM-118: isToday used local-timezone accessors (getDate, getMonth)
                // while event placement uses UTC accessors (getUTCDate, getUTCMonth).
                // A shop in UTC-5 at 11 PM local (4 AM UTC next day) would see the
                // "today" highlight on a different day than where today's events appear.
                // Use UTC accessors for consistency with the event date logic.
                const isToday =
                  day === now.getUTCDate() &&
                  month === now.getUTCMonth() &&
                  year === now.getUTCFullYear();

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
                          {/* BUG-DOM-055: work-orders list page does not parse ?from=&to= query params
                              so the previous link silently navigated to an unfiltered WO list,
                              confusing the DOM. Link to /work-orders directly so the user lands
                              on the list and can filter manually. The tooltip on hover shows the
                              remaining tails/WOs so the DOM isn't left wondering what they are. */}
                          {dayEvents.length > 3 && (
                            <Link
                              to="/work-orders"
                              title={dayEvents.slice(3).map((e) => e.woNumber ? `${e.tail} — ${e.woNumber}` : e.tail).join("\n")}
                              className="block text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 px-1"
                            >
                              +{dayEvents.length - 3} more
                            </Link>
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
