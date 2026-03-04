"use client";

type Row = {
  ataChapter: string;
  observe: number;
  assist: number;
  supervised: number;
  evaluated: number;
};

const LEVELS: Array<keyof Omit<Row, "ataChapter">> = ["observe", "assist", "supervised", "evaluated"];

function intensityClass(value: number, maxValue: number) {
  if (value <= 0) return "bg-muted/40";
  const normalized = maxValue > 0 ? value / maxValue : 0;
  if (normalized <= 0.25) return "bg-blue-500/20";
  if (normalized <= 0.5) return "bg-blue-500/40";
  if (normalized <= 0.75) return "bg-blue-500/60";
  return "bg-blue-500/80";
}

export function ATAChapterHeatmap({ rows }: { rows: Row[] }) {
  const maxValue = Math.max(1, ...rows.flatMap((r) => LEVELS.map((l) => r[l])));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] gap-2 text-xs text-muted-foreground">
        <div>ATA Chapter</div>
        {LEVELS.map((l) => (
          <div key={l} className="capitalize">{l}</div>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.ataChapter}
            className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] gap-2 items-center"
          >
            <div className="text-sm font-medium">ATA {row.ataChapter}</div>
            {LEVELS.map((level) => (
              <div key={level} className={`h-8 rounded-md border ${intensityClass(row[level], maxValue)} flex items-center justify-center text-xs font-medium`}>
                {row[level]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
