import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LayoutList, Plus, Route } from "lucide-react";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { TemplateBuilder, type ConvexRoutingTemplate } from "./_components/TemplateBuilder";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _api = api as any;

export default function RoutingTemplatesPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { userId } = useAuth();
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"routingTemplates"> | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const templates = useQuery(
    _api.routingTemplates.listTemplates,
    orgId ? { organizationId: String(orgId) } : "skip",
  ) as ConvexRoutingTemplate[] | undefined;

  const createTemplate = useMutation(_api.routingTemplates.createTemplate);
  const deactivateTemplate = useMutation(_api.routingTemplates.deactivateTemplate);
  const updateTemplate = useMutation(_api.routingTemplates.updateTemplate);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false),
    );
  }, [templates, search]);

  const selectedTemplate = useMemo(
    () =>
      (templates ?? []).find((t) => t._id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  ) as ConvexRoutingTemplate | null;

  async function handleCreateTemplate() {
    if (!orgId || !userId) return;
    setCreating(true);
    try {
      const id = await createTemplate({
        organizationId: String(orgId),
        name: "New Template",
        steps: [],
        createdBy: userId,
      });
      setSelectedTemplateId(id);
      toast.success("Template created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivateTemplate(templateId: Id<"routingTemplates">) {
    try {
      await deactivateTemplate({ templateId });
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
      }
      toast.success("Template deactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate template.");
    }
  }

  async function handleRenameTemplate(templateId: Id<"routingTemplates">, name: string) {
    try {
      await updateTemplate({ templateId, name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename template.");
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data" || templates === undefined) {
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
            className="gap-1.5"
            onClick={handleCreateTemplate}
            disabled={creating}
          >
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

            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {templates.length === 0
                  ? "No templates yet. Create one to get started."
                  : "No templates match current filters."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template) => {
                  const isSelected = template._id === selectedTemplateId;
                  return (
                    <div
                      key={template._id}
                      className={`rounded-md border p-2.5 space-y-2 ${
                        isSelected ? "border-primary/50 bg-primary/5" : "border-border/60"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedTemplateId(template._id)}
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {template.name.trim() || "Untitled template"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {template.steps.length} steps
                          </Badge>
                          {!template.isActive && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {template.description}
                          </p>
                        )}
                      </button>

                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => {
                            const name = window.prompt("Rename template:", template.name);
                            if (name && name.trim()) {
                              void handleRenameTemplate(template._id, name.trim());
                            }
                          }}
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeactivateTemplate(template._id)}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <TemplateBuilder selectedTemplate={selectedTemplate} />
      </div>
    </div>
  );
}
