"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutList, Plus, Route } from "lucide-react";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import {
  TemplateBuilder,
  loadRoutingTemplatesFromStorage,
  persistRoutingTemplatesToStorage,
  type RoutingTemplate,
} from "./_components/TemplateBuilder";

function createTemplateDraft(): RoutingTemplate {
  return {
    id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    aircraftType: "",
    inspectionType: "",
    taskCards: [],
    updatedAt: Date.now(),
  };
}

export default function RoutingTemplatesPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded,
  });

  const [templates, setTemplates] = useState<RoutingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState("all");

  useEffect(() => {
    if (!orgId) {
      setTemplates([]);
      setSelectedTemplateId(null);
      return;
    }

    const loaded = loadRoutingTemplatesFromStorage(String(orgId));
    setTemplates(loaded);
    setSelectedTemplateId((prev) => {
      if (prev && loaded.some((template) => template.id === prev)) {
        return prev;
      }
      return loaded[0]?.id ?? null;
    });
  }, [orgId]);

  function commit(next: RoutingTemplate[]) {
    setTemplates(next);
    persistRoutingTemplatesToStorage(orgId ? String(orgId) : undefined, next);
  }

  function handleCreateTemplate() {
    const nextTemplate = createTemplateDraft();
    const next = [nextTemplate, ...templates];
    commit(next);
    setSelectedTemplateId(nextTemplate.id);
  }

  function handleDeleteTemplate(templateId: string) {
    const next = templates.filter((template) => template.id !== templateId);
    commit(next);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(next[0]?.id ?? null);
    }
  }

  const aircraftTypeOptions = useMemo(() => {
    const options = new Set<string>();
    for (const template of templates) {
      const value = template.aircraftType.trim();
      if (value) options.add(value);
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (aircraftFilter !== "all" && template.aircraftType !== aircraftFilter) {
        return false;
      }
      if (!query) return true;
      return (
        template.name.toLowerCase().includes(query) ||
        template.aircraftType.toLowerCase().includes(query) ||
        template.inspectionType.toLowerCase().includes(query)
      );
    });
  }, [aircraftFilter, search, templates]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Routing templates require organization setup"
        missingInfo="Complete onboarding before managing standard work-order routing templates."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Route className="h-5 w-5 text-muted-foreground" />
            Routing Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build and manage standard work order task sequences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => toast.info("Apply from WO creation — coming soon")}
          >
            Apply Template to WO
          </Button>
          <Button type="button" className="gap-1.5" onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-border/60 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              Template List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              className="h-8 text-sm"
            />

            <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Filter by aircraft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All aircraft types</SelectItem>
                {aircraftTypeOptions.map((aircraftType) => (
                  <SelectItem key={aircraftType} value={aircraftType}>
                    {aircraftType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No templates match current filters.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template) => {
                  const isSelected = template.id === selectedTemplateId;
                  return (
                    <div
                      key={template.id}
                      className={`rounded-md border p-2.5 space-y-2 ${
                        isSelected ? "border-primary/50 bg-primary/5" : "border-border/60"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {template.name.trim() || "Untitled template"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {template.aircraftType.trim() || "Any aircraft"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {template.inspectionType.trim() || "General"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {template.taskCards.length} work cards
                        </p>
                      </button>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <TemplateBuilder
          orgId={String(orgId)}
          selectedTemplateId={selectedTemplateId}
          templates={templates}
          onTemplatesChange={commit}
        />
      </div>
    </div>
  );
}
