"use client";

import { type RefObject, type UIEvent, useEffect, useMemo, useState } from "react";
import { Bar, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer } from "recharts";
import {
  AlertTriangle,
  ChevronsDown,
  ChevronsUp,
  Clock,
  ExternalLink,
  TrendingUp,
} from "lucide-react";

const DOLLAR_SIGN = "$";
const STICKY_COL_WIDTH = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PlannerCursor = {
  id: string;
  dayOffset: number;
  colorClass: string;
  enabled: boolean;
};

export type DailyFinancialPoint = {
  day: number;
  income: number;
  spend: number;
  net: number;
  netStandard: number;
  netOvertime: number;
  trend: number;
  baseSpend: number;
  otCost: number;
  otHours: number;
  capacity: number;
  load: number;
  otPercent: number;
};

interface DailyFinancialTrackerProps {
  data: DailyFinancialPoint[];
  timelineStartMs: number;
  cellWidth: number;
  isPoppedOut: boolean;
  onPopOut: () => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onToggle: () => void;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  height?: number;
  currentDayIndex: number;
  holidayDayIndexes?: number[];
  cursors?: PlannerCursor[];
}

export default function DailyFinancialTracker({
  data,
  timelineStartMs,
  cellWidth,
  isPoppedOut,
  onPopOut,
  scrollRef,
  isOpen,
  onToggle,
  onScroll,
  height = 208,
  currentDayIndex,
  holidayDayIndexes,
  cursors,
}: DailyFinancialTrackerProps) {
  const [now, setNow] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const totalDays = data.length;

  const realTimeDayIndex = useMemo(() => {
    if (timelineStartMs <= 0) return -1;
    return (now.getTime() - timelineStartMs) / DAY_MS;
  }, [now, timelineStartMs]);

  const displayDayIndex = hoveredDay !== null ? hoveredDay : currentDayIndex;
  const clampedDisplayDay = Math.max(0, Math.min(displayDayIndex, totalDays - 1));
  const currentStats =
    data[clampedDisplayDay] ?? {
      income: 0,
      spend: 0,
      net: 0,
      otHours: 0,
      otCost: 0,
      otPercent: 0,
      netStandard: 0,
      netOvertime: 0,
      trend: 0,
      baseSpend: 0,
      capacity: 0,
      load: 0,
      day: 0,
    };

  const holidaySet = useMemo(() => new Set(holidayDayIndexes ?? []), [holidayDayIndexes]);

  const handleMouseMove = (e: any) => {
    if (e && e.activeTooltipIndex !== undefined) {
      setHoveredDay(e.activeTooltipIndex);
    }
  };

  return (
    <div
      className={`bg-slate-900 flex flex-col shrink-0 select-none relative z-20 w-full transition-all duration-300 ease-in-out overflow-hidden ${
        isPoppedOut ? "h-full flex-1 border-none" : "border-t border-slate-700"
      }`}
      style={isPoppedOut ? undefined : { height: isOpen ? height : 32 }}
      data-testid="daily-pnl-panel"
    >
      <div
        onClick={!isPoppedOut ? onToggle : undefined}
        className={`px-3 py-2 bg-slate-900/50 border-b border-slate-700/50 flex justify-between items-center shrink-0 z-30 transition-colors group h-8 ${
          !isPoppedOut ? "cursor-pointer hover:bg-slate-800/50" : ""
        }`}
      >
        <h3 className="text-[10px] font-bold text-cyan-400 font-tactical uppercase tracking-widest flex items-center gap-2">
          {isOpen ? <TrendingUp size={12} /> : null}
          <span>{isOpen ? "Daily P&L (Net + Overtime)" : "Daily P&L"}</span>
        </h3>
        <div className="flex items-center gap-2">
          {isOpen && (
            <span className="text-[10px] text-slate-500 italic hidden sm:inline mr-2">
              Timeline Synced
            </span>
          )}
          {isOpen && !isPoppedOut && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPopOut();
              }}
              className="text-slate-500 hover:text-cyan-400"
              aria-label="Pop out daily P&L"
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
              className="text-slate-500 hover:text-cyan-400"
              aria-label={isOpen ? "Collapse daily P&L" : "Expand daily P&L"}
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
          className="bg-slate-900 border-r border-slate-700 shrink-0 flex flex-col px-2 py-2 justify-center gap-2 shadow-sm z-20"
          style={{ width: STICKY_COL_WIDTH, minWidth: STICKY_COL_WIDTH }}
        >
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase mb-0.5 font-tactical">
              Daily Net Profit
            </div>
            <div
              className={`text-lg font-mono font-bold leading-none ${
                currentStats.net >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {currentStats.net >= 0 ? "+" : ""}
              {DOLLAR_SIGN}
              {Math.round(currentStats.net).toLocaleString()}
            </div>
          </div>

          <div
            className={`border-l-2 pl-2 ${
              currentStats.otHours > 0 ? "border-amber-500" : "border-slate-800 opacity-50"
            }`}
          >
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase mb-0.5 font-tactical">
              {currentStats.otHours > 0 ? (
                <AlertTriangle size={8} className="text-amber-500" />
              ) : (
                <Clock size={8} />
              )}
              OT Impact
            </div>
            <div className="flex flex-col gap-0.5">
              <div
                className={`text-xs font-mono font-bold ${
                  currentStats.otHours > 0 ? "text-amber-400" : "text-slate-600"
                }`}
              >
                {currentStats.otHours.toFixed(1)}h{" "}
                <span className="text-[9px] opacity-70">({Math.round(currentStats.otPercent)}%)</span>
              </div>
              {currentStats.otCost > 0 && (
                <div className="text-[9px] text-rose-400 font-mono">
                  -{DOLLAR_SIGN}
                  {Math.round(currentStats.otCost).toLocaleString()} Cost
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 relative min-w-0 bg-slate-950">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="absolute inset-0 overflow-x-auto custom-scrollbar z-10 overscroll-x-none"
            data-testid="daily-pnl-timeline-scroll"
          >
            <div className="relative h-full" style={{ width: totalDays * cellWidth }}>
              <div className="absolute inset-0 flex pointer-events-none">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const date = new Date(timelineStartMs + i * DAY_MS);
                  const isHoliday = holidaySet.has(i);
                  const isWeekend = date.getDay() === 6 || date.getDay() === 0;
                  const bgClass = isHoliday
                    ? "bg-rose-900/20 pattern-diagonal-lines"
                    : isWeekend
                      ? "bg-slate-800/20"
                      : "";
                  return (
                    <div
                      key={i}
                      style={{ width: cellWidth }}
                      className={`h-full border-r border-slate-800/20 ${bgClass}`}
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

              <div className="absolute inset-0" style={{ width: totalDays * cellWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredDay(null)}
                    barGap={0}
                    barCategoryGap={0}
                  >
                    <ReferenceLine y={0} stroke="#334155" />

                    <Bar dataKey="netStandard" stackId="profit" isAnimationActive={false}>
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-std-${index}`}
                          fill={entry.net >= 0 ? "#10b981" : "#f43f5e"}
                        />
                      ))}
                    </Bar>

                    <Bar
                      dataKey="netOvertime"
                      stackId="profit"
                      fill="#eab308"
                      isAnimationActive={false}
                    />

                    <Line
                      type="step"
                      dataKey="otHours"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      strokeOpacity={0.8}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
