import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type React from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}

const TREND_CONFIG = {
  up: { Icon: ArrowUp, className: "text-emerald-600" },
  down: { Icon: ArrowDown, className: "text-red-600" },
  neutral: { Icon: Minus, className: "text-muted-foreground" },
} as const;

export function CrmKpiCard({ title, value, subtitle, icon: Icon, trend }: KpiCardProps) {
  const trendConfig = trend ? TREND_CONFIG[trend] : null;

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold">{value}</p>
          {trendConfig ? (
            <trendConfig.Icon
              className={cn("w-4 h-4", trendConfig.className)}
            />
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
