"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ColumnProgress = {
  columnNumber: number;
  trainerId: string;
  trainerSignedAt: number | undefined;
};

type FiveColumnTaskRowProps = {
  description: string;
  ataChapter: string;
  columnProgress: ColumnProgress[];
  techniciansMap: Map<string, string>;
  onColumnClick: (columnNumber: number) => void;
};

function formatDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FiveColumnTaskRow({
  description,
  ataChapter,
  columnProgress,
  techniciansMap,
  onColumnClick,
}: FiveColumnTaskRowProps) {
  const completedColumns = new Map<number, ColumnProgress>();
  for (const cp of columnProgress) {
    if (cp.trainerSignedAt) {
      completedColumns.set(cp.columnNumber, cp);
    }
  }

  // Determine next available column
  const nextColumn = (() => {
    for (let i = 1; i <= 5; i++) {
      if (!completedColumns.has(i)) return i;
    }
    return null;
  })();

  const allComplete = completedColumns.size === 5;

  return (
    <div
      className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
        allComplete ? "border-green-500/30 bg-green-500/5" : "hover:bg-muted/30"
      }`}
    >
      {/* Task description + ATA */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate" title={description}>
          {description}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">ATA {ataChapter}</p>
      </div>

      {/* 5 column circles */}
      <TooltipProvider>
        <div className="flex items-center gap-1.5 shrink-0">
          {[1, 2, 3, 4, 5].map((col) => {
            const isCompleted = completedColumns.has(col);
            const progress = completedColumns.get(col);
            const isNext = col === nextColumn;
            const isAuth = col === 5;
            const label = isAuth ? "Auth" : String(col);

            if (isCompleted && progress) {
              const trainerName = techniciansMap.get(progress.trainerId) ?? "Unknown";
              return (
                <Tooltip key={col}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-medium cursor-default"
                      aria-label={`Column ${col} signed off by ${trainerName}`}
                    >
                      {label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{trainerName}</p>
                    <p className="text-xs opacity-80">{formatDate(progress.trainerSignedAt)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <button
                key={col}
                type="button"
                disabled={!isNext}
                onClick={() => {
                  if (isNext) onColumnClick(col);
                }}
                className={`flex items-center justify-center h-8 w-8 rounded-full border text-xs font-medium transition-colors ${
                  isNext
                    ? "border-blue-500/50 text-blue-400 hover:bg-blue-500/15 cursor-pointer"
                    : "border-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed"
                }`}
                aria-label={
                  isNext
                    ? `Sign off column ${col}${isAuth ? " (Authorization)" : ""}`
                    : `Column ${col} locked`
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
