"use client";

import { Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Color dot mapping per category type ──────────────────────────────────────

const CATEGORY_DOT_COLORS: Record<string, string> = {
  aircraft_type: "bg-blue-500",
  engine_type: "bg-orange-500",
  ata_chapter: "bg-green-500",
  component_type: "bg-purple-500",
  custom: "bg-gray-400",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TagCategoryTabsProps {
  categories: Array<{
    _id: string;
    name: string;
    categoryType: string;
    isSystem: boolean;
  }>;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TagCategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: TagCategoryTabsProps) {
  if (categories.length === 0) return null;

  return (
    <Tabs
      value={selectedCategoryId ?? undefined}
      onValueChange={onSelectCategory}
    >
      <TabsList className="flex-wrap h-auto gap-1">
        {categories.map((category) => {
          const dotColor =
            CATEGORY_DOT_COLORS[category.categoryType] ?? "bg-gray-400";

          return (
            <TabsTrigger key={category._id} value={category._id}>
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${dotColor}`}
                />
                {category.name}
                {category.isSystem && (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
