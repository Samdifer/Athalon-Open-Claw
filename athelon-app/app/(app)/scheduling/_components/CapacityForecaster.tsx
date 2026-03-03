"use client";

import { type RefObject, type UIEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  Briefcase,
  CheckCircle,
  ChevronsDown,
  ChevronsUp,
  ExternalLink,
  TrendingUp,
  Users,
} from "lucide-react";
import type { PlannerCursor } from "./DailyFinancialTracker";

const STICKY_COL_WIDTH = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type CapacityPoint = {
  day: number;
  capacity: number;
  load: number;
  utilization: number;
};

interface CapacityForecasterProps {
  data: CapacityPoint[];
  timelineStartMs: number;
  cellWidth: number;
  isPoppedOut: boolean;
  onPopOut: () => void;
  showPopOutAction?: boolean;
  statusText?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onToggle: () => void;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  height?: number;
  currentDayIndex: number;
  holidayDayIndexes?: number[];
  cursors?: PlannerCursor[];
}

export default function CapacityForecaster({
  data,
  timelineStartMs,
  cellWidth,
  isPoppedOut,
  onPopOut,
  showPopOutAction = true,
  statusText = "Timeline Synced",
  scrollRef,
  isOpen,
  onToggle,
  onScroll,
  height = 176,
  currentDayIndex,
  holidayDayIndexes,
  cursors,
}: CapacityForecasterProps) {
  const CHART_HEIGHT = 120;

  const [hoverInfo, setHoverInfo] = useState<{ day: number; x: number; y: number } | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const totalDays = data.length;

  const realTimeDayIndex = useMemo(() => {
    if (timelineStartMs <= 0) return -1;
    return (now.getTime() - timelineStartMs) / DAY_MS;
  }, [now, timelineStartMs]);

  const { capacityBarPath, safeLoadBarPath, overloadBarPath, loadTrendPath, maxVal } = useMemo(() => {
    let max = 100;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.capacity > max) max = d.capacity;
      if (d.load > max) max = d.load;
    }
    max *= 1.2;
    const safeMax = max || 1;

    let capBarPath = "";
    let safeLdBarPath = "";
    let overLdBarPath = "";

    const ldTrendPts: [number, number][] = [];
    const windowSize = 7;
    const ldHist: number[] = [];
    const padding = Math.max(1, cellWidth * 0.15);
    const barWidth = cellWidth - padding * 2;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      ldHist.push(d.load);
      if (ldHist.length > windowSize) ldHist.shift();
      const avgLd = ldHist.reduce((a, b) => a + b, 0) / ldHist.length;
      const cx = i * cellWidth + cellWidth / 2;
      ldTrendPts.push([cx, avgLd]);

      if (cellWidth > 4) {
        const xStart = i * cellWidth + padding;
        const capH = (d.capacity / safeMax) * CHART_HEIGHT;
        const capY = CHART_HEIGHT - capH;
        if (capH > 0) {
          capBarPath += `M${xStart},${CHART_HEIGHT} L${xStart},${capY} L${xStart + barWidth},${capY} L${xStart + barWidth},${CHART_HEIGHT} Z `;
        }

        const safeLoad = Math.min(d.load, d.capacity);
        const overload = Math.max(0, d.load - d.capacity);

        const safeH = (safeLoad / safeMax) * CHART_HEIGHT;
        const safeY = CHART_HEIGHT - safeH;
        if (safeH > 0) {
          safeLdBarPath += `M${xStart},${CHART_HEIGHT} L${xStart},${safeY} L${xStart + barWidth},${safeY} L${xStart + barWidth},${CHART_HEIGHT} Z `;
        }
        if (overload > 0) {
          const totalLoadH = (d.load / safeMax) * CHART_HEIGHT;
          const totalLoadY = CHART_HEIGHT - totalLoadH;
          overLdBarPath += `M${xStart},${safeY} L${xStart},${totalLoadY} L${xStart + barWidth},${totalLoadY} L${xStart + barWidth},${safeY} Z `;
        }
      }
    }

    const makeLine = (pts: [number, number][]) =>
      pts
        .map((p, i) => {
          const y = CHART_HEIGHT - (p[1] / safeMax) * CHART_HEIGHT;
          return `${i === 0 ? "M" : "L"} ${p[0]} ${y}`;
        })
        .join(" ");

    return {
      capacityBarPath: capBarPath,
      safeLoadBarPath: safeLdBarPath,
      overloadBarPath: overLdBarPath,
      loadTrendPath: makeLine(ldTrendPts),
      maxVal: safeMax,
    };
  }, [data, cellWidth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const dayIndex = Math.floor(x / cellWidth);
    if (dayIndex >= 0 && dayIndex < totalDays) {
      setHoverInfo({ day: dayIndex, x, y: e.clientY - bounds.top });
    }
  };

  const clampedCurrentDay = Math.max(0, Math.min(currentDayIndex, totalDays - 1));
  const currentStats =
    data[clampedCurrentDay] ?? {
      capacity: 0,
      load: 0,
      utilization: 0,
      day: 0,
    };

  const isOverCapacity = currentStats.load > currentStats.capacity + 0.1;
  const isUnderUtilized = currentStats.utilization < 70 && currentStats.capacity > 0;

  const holidaySet = useMemo(() => new Set(holidayDayIndexes ?? []), [holidayDayIndexes]);

  return (
    <div
      className={`bg-card flex flex-col shrink-0 select-none relative z-20 w-full transition-all duration-300 ease-in-out overflow-hidden ${
        isPoppedOut ? "h-full flex-1 border-none" : "border-t border-border/60"
      }`}
      style={isPoppedOut ? undefined : { height: isOpen ? height : 32 }}
      data-testid="capacity-forecaster-panel"
    >
      <div
        onClick={!isPoppedOut ? onToggle : undefined}
        className={`px-3 py-2 bg-muted/30 border-b border-border/40 flex justify-between items-center shrink-0 z-30 transition-colors group h-8 ${
          !isPoppedOut ? "cursor-pointer hover:bg-muted/50" : ""
        }`}
      >
        <h3 className="text-[10px] font-bold text-primary font-tactical uppercase tracking-widest flex items-center gap-2">
          {isOpen ? <BatteryCharging size={12} /> : null}
          <span>{isOpen ? "Capacity Forecaster" : "Capacity & Load"}</span>
        </h3>
        <div className="flex items-center gap-2">
          {isOpen && (
            <span className="text-[10px] text-muted-foreground italic hidden sm:inline mr-2">
              {statusText}
            </span>
          )}
          {isOpen && !isPoppedOut && showPopOutAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPopOut();
              }}
              className="text-muted-foreground hover:text-primary"
              aria-label="Pop out capacity forecaster"
            >
              <ExternalLink size={16} />
            </button>
          )}
          {!isPoppedOut && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="text-muted-foreground hover:text-primary"
              aria-label={isOpen ? "Collapse capacity forecaster" : "Expand capacity forecaster"}
            >
              {isOpen ? <ChevronsDown size={16} /> : <ChevronsUp size={16} />}
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex flex-1 min-h-0 relative transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="bg-card border-r border-border/60 shrink-0 flex flex-col px-2 py-3 justify-center gap-2 shadow-sm z-20"
          style={{ width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH }}
        >
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase mb-0.5">
              <Users size={10} /> Available Cap.
            </div>
            <div className="text-base font-mono font-bold text-amber-600 dark:text-amber-500 leading-none">
              {Math.round(currentStats.capacity)} <span className="text-[10px] text-muted-foreground/60">hrs</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase mb-0.5">
              <Briefcase size={10} /> Planned Load
            </div>
            <div
              className={`text-base font-mono font-bold leading-none ${
                isOverCapacity ? "text-rose-600 dark:text-rose-500" : "text-emerald-600 dark:text-emerald-500"
              }`}
            >
              {Math.round(currentStats.load)} <span className="text-[10px] text-muted-foreground/60">hrs</span>
            </div>
          </div>
          <div
            className={`mt-1 p-1.5 rounded text-[9px] font-bold text-center leading-tight ${
              isOverCapacity
                ? "status-critical"
                : isUnderUtilized
                  ? "status-active"
                  : "status-signed"
            }`}
          >
            {isOverCapacity ? (
              <span className="flex items-center justify-center gap-1">
                <AlertTriangle size={8} /> OVERLOAD
              </span>
            ) : isUnderUtilized ? (
              <span className="flex items-center justify-center gap-1">
                <TrendingUp size={8} /> SELL MORE
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <CheckCircle size={8} /> OPTIMAL
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 relative min-w-0 bg-background">
          <div
            className="absolute bottom-4 left-0 right-0 z-0 pointer-events-none"
            style={{ height: CHART_HEIGHT }}
          >
            <div className="w-full h-px bg-border/60 absolute top-0" />
            <div className="w-full h-px bg-border/60 absolute top-1/2" />
            <div className="w-full h-px bg-border/60 absolute bottom-0" />
            <span className="absolute top-0 right-1 text-[9px] text-muted-foreground/60">{Math.round(maxVal)}h</span>
          </div>

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="absolute inset-0 overflow-x-auto custom-scrollbar z-10 overscroll-x-none"
            data-testid="capacity-forecaster-timeline-scroll"
          >
            <div
              className="relative h-full"
              style={{ width: totalDays * cellWidth }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverInfo(null)}
            >
              <div className="absolute inset-0 flex pointer-events-none">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const date = new Date(timelineStartMs + i * DAY_MS);
                  const isHoliday = holidaySet.has(i);
                  const isWeekend = date.getDay() === 6 || date.getDay() === 0;
                  const bgClass = isHoliday
                    ? "bg-red-500/10 dark:bg-rose-900/20 pattern-diagonal-lines"
                    : isWeekend
                      ? "bg-muted/30"
                      : "";
                  return (
                    <div
                      key={i}
                      style={{ width: cellWidth }}
                      className={`h-full border-r border-border/10 ${bgClass}`}
                    />
                  );
                })}
              </div>

              {realTimeDayIndex >= 0 && realTimeDayIndex < totalDays && (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none border-l-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                  style={{ left: realTimeDayIndex * cellWidth }}
                >
                  <div className="absolute top-0 left-0 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-bold font-tactical px-1 py-0.5 rounded-sm shadow-sm whitespace-nowrap z-50">
                    NOW
                  </div>
                </div>
              )}

              {currentDayIndex >= 0 && currentDayIndex < totalDays && (
                <div
                  className="absolute top-0 bottom-0 border-l border-amber-500 z-10 pointer-events-none shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  style={{ left: currentDayIndex * cellWidth + cellWidth / 2 }}
                />
              )}

              {cursors?.map((cursor) => {
                if (!cursor.enabled) return null;
                const targetDay = Math.floor(realTimeDayIndex) + cursor.dayOffset;
                if (targetDay < 0 || targetDay >= totalDays) return null;

                return (
                  <div
                    key={cursor.id}
                    className={`absolute top-0 bottom-0 z-20 pointer-events-none border-l border-dashed opacity-60 ${cursor.colorClass}`}
                    style={{ left: targetDay * cellWidth + cellWidth / 2 }}
                  />
                );
              })}

              <svg
                className="absolute bottom-4 left-0 pointer-events-none"
                style={{ width: totalDays * cellWidth, height: CHART_HEIGHT, overflow: "visible" }}
              >
                <path d={capacityBarPath} fill="#f59e0b" opacity={0.25} />
                <path d={safeLoadBarPath} fill="#22c55e" opacity={0.85} />
                <path d={overloadBarPath} fill="#dc2626" opacity={0.9} />
                <path
                  d={loadTrendPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.6}
                />
              </svg>

              {hoverInfo && data[hoverInfo.day] && (
                <div
                  className="absolute z-50 bg-popover/95 border border-border text-popover-foreground rounded p-2 text-xs shadow-xl pointer-events-none whitespace-nowrap backdrop-blur-md"
                  style={{
                    left: hoverInfo.x + 10,
                    top: 10,
                    transform: hoverInfo.x > totalDays * cellWidth - 150 ? "translateX(-100%)" : "none",
                  }}
                >
                  <div className="font-bold text-popover-foreground mb-1 border-b border-border/60 pb-1">
                    {(() => {
                      const date = new Date(timelineStartMs + hoverInfo.day * DAY_MS);
                      return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-500 font-bold text-right">
                      {Math.round(data[hoverInfo.day].capacity)}h
                    </span>
                    <span className="text-muted-foreground">Planned:</span>
                    <span
                      className={`font-mono font-bold text-right ${
                        data[hoverInfo.day].load > data[hoverInfo.day].capacity
                          ? "text-rose-600 dark:text-rose-500"
                          : "text-emerald-600 dark:text-emerald-500"
                      }`}
                    >
                      {Math.round(data[hoverInfo.day].load)}h
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
