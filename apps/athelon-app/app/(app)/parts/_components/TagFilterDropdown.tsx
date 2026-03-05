"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tags, X } from "lucide-react";

interface TagFilterDropdownProps {
  onFilterChange: (
    filter: { tagId?: string; subtagId?: string } | null,
  ) => void;
}

export function TagFilterDropdown({
  onFilterChange,
}: TagFilterDropdownProps) {
  const { orgId } = useCurrentOrg();

  const [categoryId, setCategoryId] = useState<
    Id<"tagCategories"> | undefined
  >(undefined);
  const [tagId, setTagId] = useState<Id<"tags"> | undefined>(undefined);
  const [subtagId, setSubtagId] = useState<Id<"subtags"> | undefined>(
    undefined,
  );

  // ── Queries ────────────────────────────────────────────────────────────────

  const categories = useQuery(
    api.partTags.listTagCategories,
    orgId ? { organizationId: orgId } : "skip",
  );

  const tags = useQuery(
    api.partTags.listTags,
    orgId && categoryId
      ? { organizationId: orgId, categoryId }
      : "skip",
  );

  const subtags = useQuery(
    api.partTags.listSubtags,
    orgId && tagId
      ? { organizationId: orgId, tagId }
      : "skip",
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCategoryChange = useCallback(
    (id: string) => {
      setCategoryId(id as Id<"tagCategories">);
      setTagId(undefined);
      setSubtagId(undefined);
      onFilterChange(null);
    },
    [onFilterChange],
  );

  const handleTagChange = useCallback(
    (id: string) => {
      const newTagId = id as Id<"tags">;
      setTagId(newTagId);
      setSubtagId(undefined);
      onFilterChange({ tagId: newTagId });
    },
    [onFilterChange],
  );

  const handleSubtagChange = useCallback(
    (id: string) => {
      const newSubtagId = id as Id<"subtags">;
      setSubtagId(newSubtagId);
      onFilterChange({
        tagId: tagId as string,
        subtagId: newSubtagId,
      });
    },
    [onFilterChange, tagId],
  );

  const handleClear = useCallback(() => {
    setCategoryId(undefined);
    setTagId(undefined);
    setSubtagId(undefined);
    onFilterChange(null);
  }, [onFilterChange]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!orgId) {
    return null;
  }

  const hasActiveFilter = categoryId !== undefined;

  return (
    <div className="flex items-center gap-2">
      <Tags className="size-4 shrink-0 text-muted-foreground" />

      {/* Category */}
      <Select
        value={categoryId ?? ""}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {(categories ?? []).map((c) => (
            <SelectItem key={c._id} value={c._id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag */}
      <Select
        value={tagId ?? ""}
        onValueChange={handleTagChange}
        disabled={!categoryId}
      >
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="Tag" />
        </SelectTrigger>
        <SelectContent>
          {(tags ?? []).map((t) => (
            <SelectItem key={t._id} value={t._id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Subtag (optional) */}
      <Select
        value={subtagId ?? ""}
        onValueChange={handleSubtagChange}
        disabled={!tagId}
      >
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="Subtag" />
        </SelectTrigger>
        <SelectContent>
          {(subtags ?? []).map((st) => (
            <SelectItem key={st._id} value={st._id}>
              {st.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
