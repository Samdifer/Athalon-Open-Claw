"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Copy, Power, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuoteBuilderSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteBuilderSettingsDialog({
  open,
  onOpenChange,
}: QuoteBuilderSettingsDialogProps) {
  const { orgId } = useCurrentOrg();
  const templates = useQuery(api.quoteTemplates.list, orgId ? { orgId } : "skip");
  const createTemplate = useMutation(api.quoteTemplates.create);
  const duplicateTemplate = useMutation(api.quoteTemplates.duplicate);
  const toggleActive = useMutation(api.quoteTemplates.toggleActive);

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAircraftFilter, setNewAircraftFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (templates ?? []).filter((t) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.aircraftTypeFilter ?? "").toLowerCase().includes(q),
    );
  }, [templates, search]);

  async function handleCreate() {
    if (!orgId || !newName.trim()) return;
    setCreating(true);
    try {
      await createTemplate({
        orgId,
        name: newName.trim(),
        aircraftTypeFilter: newAircraftFilter.trim() || undefined,
        lineItems: [],
      });
      toast.success("Template created.");
      setNewName("");
      setNewAircraftFilter("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Quote Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Template list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No templates found.
              </p>
            ) : (
              filtered.map((t) => (
                <div
                  key={String(t._id)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      {t.aircraftTypeFilter && (
                        <Badge variant="outline" className="text-[10px]">
                          {t.aircraftTypeFilter}
                        </Badge>
                      )}
                      {!t.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t.lineItems.length} line item{t.lineItems.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={t.isActive ? "Deactivate" : "Activate"}
                      onClick={async () => {
                        try {
                          await toggleActive({ templateId: t._id as Id<"quoteTemplates"> });
                          toast.success(t.isActive ? "Template deactivated" : "Template activated");
                        } catch {
                          toast.error("Failed to toggle template.");
                        }
                      }}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Duplicate"
                      onClick={async () => {
                        try {
                          await duplicateTemplate({ templateId: t._id as Id<"quoteTemplates"> });
                          toast.success("Template duplicated.");
                        } catch {
                          toast.error("Failed to duplicate template.");
                        }
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick create */}
          <div className="border-t border-border/40 pt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Quick Create
            </p>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Template name"
                className="h-8 text-xs flex-1"
              />
              <Input
                value={newAircraftFilter}
                onChange={(e) => setNewAircraftFilter(e.target.value)}
                placeholder="Aircraft filter (optional)"
                className="h-8 text-xs w-40"
              />
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={creating || !newName.trim()}
                onClick={handleCreate}
              >
                <Plus className="w-3 h-3" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
