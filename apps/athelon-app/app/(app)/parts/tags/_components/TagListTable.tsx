"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Plane,
  Cog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTagDialog } from "./CreateTagDialog";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TagListTableProps {
  categoryId: string;
  categoryType?: string;
}

// ─── Subtag Row (rendered inside the collapsible) ─────────────────────────────

function SubtagSection({
  tagId,
  categoryType,
}: {
  tagId: string;
  categoryType?: string;
}) {
  const { orgId } = useCurrentOrg();

  const subtags = useQuery(
    api.partTags.listSubtags,
    orgId ? { organizationId: orgId, tagId: tagId as Id<"tags"> } : "skip",
  );

  const [createSubtagOpen, setCreateSubtagOpen] = useState(false);

  if (subtags === undefined) {
    return (
      <div className="pl-10 py-2 space-y-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
    );
  }

  return (
    <div className="pl-10 py-2 space-y-2">
      {subtags.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No subtags yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Subtag Name</TableHead>
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subtags
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((subtag) => (
                <TableRow key={subtag._id}>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1.5">
                      {subtag.name}
                      {subtag.aircraftSeries && (
                        <span className="text-xs text-muted-foreground">
                          ({subtag.aircraftSeries})
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {subtag.code ?? "---"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {subtag.description ?? "---"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={subtag.isActive ? "outline" : "secondary"}
                      className={
                        subtag.isActive
                          ? "bg-green-500/10 text-green-500 border-green-500/30 text-xs"
                          : "text-xs"
                      }
                    >
                      {subtag.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => setCreateSubtagOpen(true)}
      >
        <Plus className="w-3 h-3 mr-1" />
        Add Subtag
      </Button>

      <CreateTagDialog
        open={createSubtagOpen}
        onOpenChange={setCreateSubtagOpen}
        level="subtag"
        tagId={tagId}
        categoryType={categoryType}
      />
    </div>
  );
}

// ─── Tag Row (expandable) ─────────────────────────────────────────────────────

function TagRow({
  tag,
  partCount,
  categoryType,
}: {
  tag: {
    _id: string;
    name: string;
    code?: string;
    description?: string;
    aircraftMake?: string;
    aircraftModel?: string;
    engineMake?: string;
    engineModel?: string;
    isActive: boolean;
    displayOrder: number;
  };
  partCount: number;
  categoryType?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasAircraftMeta = tag.aircraftMake || tag.aircraftModel;
  const hasEngineMeta = tag.engineMake || tag.engineModel;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <TableRow className="cursor-pointer hover:bg-muted/50">
        <TableCell>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 w-full text-left"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-medium text-sm">{tag.name}</span>
                {hasAircraftMeta && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Plane className="w-3 h-3" />
                    {[tag.aircraftMake, tag.aircraftModel]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                )}
                {hasEngineMeta && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Cog className="w-3 h-3" />
                    {[tag.engineMake, tag.engineModel]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                )}
              </div>
            </button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell className="font-mono text-sm text-muted-foreground">
          {tag.code ?? "---"}
        </TableCell>
        <TableCell>
          {partCount > 0 ? (
            <Badge
              variant="secondary"
              className="text-xs"
            >
              {partCount} part{partCount !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">0</span>
          )}
        </TableCell>
        <TableCell>
          <Badge
            variant={tag.isActive ? "outline" : "secondary"}
            className={
              tag.isActive
                ? "bg-green-500/10 text-green-500 border-green-500/30 text-xs"
                : "text-xs"
            }
          >
            {tag.isActive ? "Active" : "Inactive"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              {expanded ? "Collapse" : "Expand"}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
      </TableRow>

      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={5} className="p-0 border-0">
          <CollapsibleContent>
            <SubtagSection tagId={tag._id} categoryType={categoryType} />
          </CollapsibleContent>
        </TableCell>
      </TableRow>
    </Collapsible>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TagListTable({ categoryId, categoryType }: TagListTableProps) {
  const { orgId } = useCurrentOrg();

  const tags = useQuery(
    api.partTags.listTags,
    orgId
      ? {
          organizationId: orgId,
          categoryId: categoryId as Id<"tagCategories">,
        }
      : "skip",
  );

  const tagCounts = useQuery(
    api.partTags.getTagCounts,
    orgId
      ? {
          organizationId: orgId,
          categoryId: categoryId as Id<"tagCategories">,
        }
      : "skip",
  );

  const [createTagOpen, setCreateTagOpen] = useState(false);

  if (tags === undefined || tagCounts === undefined) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  // Build a lookup map: tagId -> part count
  const countMap = new Map<string, number>();
  for (const entry of tagCounts) {
    countMap.set(entry.tagId, entry.count);
  }

  const sortedTags = [...tags].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tags.length} tag{tags.length !== 1 ? "s" : ""} in this category
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateTagOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Tag
        </Button>
      </div>

      {sortedTags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No tags in this category yet. Add one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTags.map((tag) => (
              <TagRow
                key={tag._id}
                tag={tag}
                partCount={countMap.get(tag._id) ?? 0}
                categoryType={categoryType}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <CreateTagDialog
        open={createTagOpen}
        onOpenChange={setCreateTagOpen}
        level="tag"
        categoryId={categoryId}
        categoryType={categoryType}
      />
    </div>
  );
}
