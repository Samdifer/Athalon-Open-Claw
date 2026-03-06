"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PartTagBadgesProps {
  partId: string; // Id<"parts">
  maxVisible?: number; // default 3
}

type CategoryType =
  | "aircraft_type"
  | "engine_type"
  | "ata_chapter"
  | "component_type"
  | "custom";

const CATEGORY_COLORS: Record<CategoryType, string> = {
  aircraft_type: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  engine_type: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  ata_chapter: "bg-green-500/15 text-green-400 border-green-500/25",
  component_type: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  custom: "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

function getCategoryColor(categoryName: string): string {
  // Attempt to infer the category type from the denormalized category name.
  // The partTags junction stores categoryName (e.g. "Aircraft Type") not the
  // enum key. We also fall back to the "custom" color for unknown categories.
  const normalized = categoryName.toLowerCase().replace(/\s+/g, "_");

  if (normalized in CATEGORY_COLORS) {
    return CATEGORY_COLORS[normalized as CategoryType];
  }

  // Handle human-readable names → enum keys
  if (normalized.includes("aircraft")) return CATEGORY_COLORS.aircraft_type;
  if (normalized.includes("engine")) return CATEGORY_COLORS.engine_type;
  if (normalized.includes("ata")) return CATEGORY_COLORS.ata_chapter;
  if (normalized.includes("component")) return CATEGORY_COLORS.component_type;

  return CATEGORY_COLORS.custom;
}

function formatTagLabel(tagName: string, subtagName?: string): string {
  if (subtagName) {
    return `${tagName} / ${subtagName}`;
  }
  return tagName;
}

export function PartTagBadges({
  partId,
  maxVisible = 3,
}: PartTagBadgesProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const partTags = useQuery(api.partTags.getTagsForPart, {
    partId: partId as Id<"parts">,
  });

  // Loading state: render nothing
  if (partTags === undefined) {
    return null;
  }

  // No tags: render nothing
  if (partTags.length === 0) {
    return null;
  }

  const visibleTags = partTags.slice(0, maxVisible);
  const overflowCount = partTags.length - maxVisible;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleTags.map((pt) => (
        <Badge
          key={pt._id}
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${getCategoryColor(pt.categoryName)}`}
        >
          {formatTagLabel(pt.tagName, pt.subtagName)}
        </Badge>
      ))}

      {overflowCount > 0 && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              +{overflowCount}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto max-w-xs p-3"
          >
            <p className="text-xs font-medium text-muted-foreground mb-2">
              All tags ({partTags.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {partTags.map((pt) => (
                <Badge
                  key={pt._id}
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${getCategoryColor(pt.categoryName)}`}
                >
                  {formatTagLabel(pt.tagName, pt.subtagName)}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
