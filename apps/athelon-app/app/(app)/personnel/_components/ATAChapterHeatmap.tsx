"use client";

type Row = {
  ataChapter: string;
  observe: number;
  assist: number;
  supervised: number;
  evaluated: number;
};

const LEVELS: Array<keyof Omit<Row, "ataChapter">> = ["observe", "assist", "supervised", "evaluated"];

function intensityClass(value: number) {
  if (value <= 0) return "bg-muted/40";
  if (value === 1) return "bg-blue-500/25";
  if (value <= 3) return "bg-blue-500/45";
  return "bg-blue-500/70";
}

export function ATAChapterHeatmap({ rows }: { rows: Row[] }) {
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
              <div key={level} className={`h-8 rounded-md border ${intensityClass(row[level])} flex items-center justify-center text-xs font-medium`}>
                {row[level]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
