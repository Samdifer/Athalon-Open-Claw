"use client";

import { type ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

type SectionAccordionProps = {
  name: string;
  sectionType: string | undefined;
  completedCount: number;
  totalCount: number;
  isSubSection?: boolean;
  proficiencyTier?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

const TIER_COLORS: Record<string, string> = {
  initial: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  basic: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  intermediate: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  advanced: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  specialization: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function SectionAccordion({
  name,
  sectionType,
  completedCount,
  totalCount,
  isSubSection = false,
  proficiencyTier,
  defaultOpen = true,
  children,
}: SectionAccordionProps) {
  const allComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <div className={isSubSection ? "ml-4" : ""}>
      <Collapsible defaultOpen={defaultOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=closed]_&]:-rotate-90" />
                <span className="font-medium text-sm">{name}</span>

                {proficiencyTier && TIER_COLORS[proficiencyTier] && (
                  <Badge className={TIER_COLORS[proficiencyTier]}>
                    {tierLabel(proficiencyTier)}
                  </Badge>
                )}

                {sectionType === "reference" && (
                  <Badge variant="outline" className="text-xs">
                    Reference
                  </Badge>
                )}

                {sectionType === "procedural" && (
                  <Badge variant="outline" className="text-xs">
                    Procedural
                  </Badge>
                )}

                <Badge
                  variant="outline"
                  className={
                    allComplete
                      ? "bg-green-500/15 text-green-400 border-green-500/30"
                      : ""
                  }
                >
                  {completedCount}/{totalCount} complete
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-1">
              {children}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
