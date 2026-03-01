"use client";

const MIN_WIDTH_FOR_TEXT = 40;

interface GanttProgressBarProps {
  progress: number;
  barWidth: number;
  color?: string;
  className?: string;
}

export function GanttProgressBar({
  progress,
  barWidth,
  color = "rgba(255,255,255,0.3)",
  className = "",
}: GanttProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const fillWidth = Math.round((clamped / 100) * barWidth);
  const showText = fillWidth >= MIN_WIDTH_FOR_TEXT;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}% complete`}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-[inherit] transition-[width] duration-200 ease-out"
        style={{ width: fillWidth, backgroundColor: color }}
      />
      {showText && (
        <span
          className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold leading-none text-white drop-shadow-sm select-none"
          style={{ maxWidth: fillWidth - 4 }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
