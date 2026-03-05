"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  Plus,
  Tags,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagCategoryTabs } from "./_components/TagCategoryTabs";
import { TagListTable } from "./_components/TagListTable";

// ─── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TagsManagementPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const categories = useQuery(
    api.partTags.listTagCategories,
    orgId ? { organizationId: orgId } : "skip",
  );

  const seedDefaultCategories = useMutation(api.partTags.seedDefaultCategories);
  const createTagCategory = useMutation(api.partTags.createTagCategory);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] =
    useState(false);
  const [seeding, setSeeding] = useState(false);

  // Category creation form state
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Auto-select the first category when loaded
  useEffect(() => {
    if (categories && categories.length > 0 && selectedCategoryId === null) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

  // Auto-generate slug from name
  useEffect(() => {
    setCatSlug(toSlug(catName));
  }, [catName]);

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (!isLoaded || categories === undefined) {
    return (
      <div className="p-6 space-y-3" data-testid="page-loading-state">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  // ─── Seed handler ───────────────────────────────────────────────────────────

  async function handleSeedDefaults() {
    if (!orgId) return;
    setSeeding(true);
    try {
      await seedDefaultCategories({ organizationId: orgId });
      toast.success("Default tag categories initialized");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to initialize default categories.",
      );
    } finally {
      setSeeding(false);
    }
  }

  // ─── Create category handler ────────────────────────────────────────────────

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !catName.trim()) return;

    setCatSaving(true);
    try {
      const nextOrder = categories ? categories.length + 1 : 1;
      await createTagCategory({
        organizationId: orgId,
        name: catName.trim(),
        slug: catSlug || toSlug(catName),
        categoryType: "custom",
        description: catDescription.trim() || undefined,
        displayOrder: nextOrder,
      });
      toast.success(`Category "${catName.trim()}" created`);
      setCatName("");
      setCatSlug("");
      setCatDescription("");
      setCreateCategoryDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create category.",
      );
    } finally {
      setCatSaving(false);
    }
  }

  // ─── Find the selected category object for passing categoryType ─────────────

  const selectedCategory = categories?.find(
    (c) => c._id === selectedCategoryId,
  );

  // ─── Empty state: no categories at all ──────────────────────────────────────

  if (categories.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tags className="h-6 w-6" /> Parts Tags
            </h1>
            <p className="text-muted-foreground text-sm">
              Organize parts with hierarchical tags for aircraft types, engine
              types, ATA chapters, and more.
            </p>
          </div>
        </div>

        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="py-10 text-center space-y-4">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div>
              <h2 className="text-lg font-semibold">No Tag Categories Yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                The tagging system organizes parts into categories like Aircraft
                Type, Engine Type, ATA Chapter, and Component Type. Initialize
                the default system categories to get started, or create a custom
                category.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button onClick={handleSeedDefaults} disabled={seeding}>
                {seeding && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Initialize Default Categories
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateCategoryDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Custom Category
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Category Dialog (also reachable from empty state) */}
        <CreateCategoryDialog
          open={createCategoryDialogOpen}
          onOpenChange={setCreateCategoryDialogOpen}
          catName={catName}
          setCatName={setCatName}
          catSlug={catSlug}
          setCatSlug={setCatSlug}
          catDescription={catDescription}
          setCatDescription={setCatDescription}
          catSaving={catSaving}
          onSubmit={handleCreateCategory}
        />
      </div>
    );
  }

  // ─── Main content: categories + tag table ───────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6" /> Parts Tags
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage hierarchical tags for organizing parts inventory
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setCreateCategoryDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Category
        </Button>
      </div>

      {/* Category Tabs */}
      <TagCategoryTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Tag List Table for selected category */}
      {selectedCategoryId && (
        <TagListTable
          categoryId={selectedCategoryId}
          categoryType={selectedCategory?.categoryType}
        />
      )}

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={createCategoryDialogOpen}
        onOpenChange={setCreateCategoryDialogOpen}
        catName={catName}
        setCatName={setCatName}
        catSlug={catSlug}
        setCatSlug={setCatSlug}
        catDescription={catDescription}
        setCatDescription={setCatDescription}
        catSaving={catSaving}
        onSubmit={handleCreateCategory}
      />
    </div>
  );
}

// ─── Create Category Dialog (extracted for reuse in empty + normal states) ───

function CreateCategoryDialog({
  open,
  onOpenChange,
  catName,
  setCatName,
  catSlug,
  setCatSlug,
  catDescription,
  setCatDescription,
  catSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catName: string;
  setCatName: (v: string) => void;
  catSlug: string;
  setCatSlug: (v: string) => void;
  catDescription: string;
  setCatDescription: (v: string) => void;
  catSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
            <DialogDescription>
              Create a new custom tag category for organizing parts. System
              categories (Aircraft Type, Engine Type, etc.) are created via the
              seed process.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Modification Kit"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="auto-generated from name"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from the name. Used as a unique identifier.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Optional description for this category"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category Type</Label>
              <Input value="Custom" disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Only custom categories can be created manually. System categories
                are initialized via the seed process.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={catSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={catSaving || !catName.trim()}>
              {catSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
