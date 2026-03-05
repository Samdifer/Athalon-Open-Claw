import { Badge } from "@/components/ui/badge";

interface HealthScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md";
}

function getScoreStyle(score: number): { label: string; className: string } {
  if (score >= 75) {
    return {
      label: "Excellent",
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    };
  }
  if (score >= 50) {
    return {
      label: "Good",
      className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
  }
  return {
    label: "At Risk",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  };
}

export function HealthScoreBadge({ score, size = "sm" }: HealthScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <Badge
        variant="outline"
        className={`font-medium border bg-muted text-muted-foreground border-muted-foreground/30 ${
          size === "sm" ? "text-[10px]" : "text-xs"
        }`}
      >
        N/A
      </Badge>
    );
  }

  const style = getScoreStyle(score);

  return (
    <Badge
      variant="outline"
      className={`font-medium border ${style.className} ${
        size === "sm" ? "text-[10px]" : "text-xs"
      }`}
    >
      {score} &middot; {style.label}
    </Badge>
  );
}
