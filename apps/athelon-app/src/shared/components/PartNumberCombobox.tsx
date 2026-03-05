"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChevronsUpDown, Package, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartSelection =
  | {
      type: "inventory";
      partId: Id<"parts">;
      partNumber: string;
      partName: string;
    }
  | { type: "provisional"; partNumber: string; partName: string };

type SourceContext =
  | "work_order_request"
  | "purchase_order"
  | "rotable_create"
  | "loaner_create"
  | "core_return"
  | "warranty_claim"
  | "release_certificate"
  | "parts_request";

export interface PartNumberComboboxProps {
  organizationId: Id<"organizations">;
  onSelect: (selection: PartSelection) => void;
  value?: PartSelection | null;
  allowCreate?: boolean;
  sourceContext?: SourceContext;
  sourceReferenceId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PartNumberCombobox({
  organizationId,
  onSelect,
  value,
  allowCreate = true,
  sourceContext = "parts_request",
  sourceReferenceId,
  placeholder = "Search part number...",
  disabled = false,
  className,
}: PartNumberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [creating, setCreating] = useState(false);

  const createProvisional = useMutation(api.partSearch.createProvisionalPart);

  // Search query — only fires when popover is open and term >= 2 chars
  const searchResults = useQuery(
    api.partSearch.searchParts,
    open && searchTerm.trim().length >= 2
      ? { organizationId, searchTerm: searchTerm.trim() }
      : "skip",
  );

  // Check if typed term exactly matches an existing result
  const hasExactMatch =
    searchResults?.some(
      (p) => p.partNumber.toUpperCase() === searchTerm.trim().toUpperCase(),
    ) ?? false;

  // Reset create form when popover closes
  useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      setNewPartName("");
      setSearchTerm("");
    }
  }, [open]);

  const handleSelectInventory = useCallback(
    (part: NonNullable<typeof searchResults>[number]) => {
      onSelect({
        type: "inventory",
        partId: part._id,
        partNumber: part.partNumber,
        partName: part.partName,
      });
      setOpen(false);
    },
    [onSelect],
  );

  const handleCreateProvisional = useCallback(async () => {
    const pn = searchTerm.trim().toUpperCase();
    const name = newPartName.trim();
    if (!pn || !name) return;

    setCreating(true);
    try {
      await createProvisional({
        organizationId,
        partNumber: pn,
        partName: name,
        sourceContext,
        sourceReferenceId,
      });
      onSelect({ type: "provisional", partNumber: pn, partName: name });
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }, [
    searchTerm,
    newPartName,
    organizationId,
    sourceContext,
    sourceReferenceId,
    createProvisional,
    onSelect,
  ]);

  const handleClear = useCallback(() => {
    onSelect(null as unknown as PartSelection);
    setOpen(true);
  }, [onSelect]);

  // ─── Render selected state ──────────────────────────────────────────────

  if (value) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 ${className ?? ""}`}
      >
        <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-mono text-xs font-semibold">
            {value.partNumber}
          </span>
          <span className="text-xs text-muted-foreground ml-2 truncate">
            {value.partName}
          </span>
          {value.type === "provisional" && (
            <Badge
              variant="outline"
              className="ml-2 text-[9px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
            >
              Provisional
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground px-2"
          onClick={handleClear}
          disabled={disabled}
        >
          Change
        </Button>
      </div>
    );
  }

  // ─── Render combobox ────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between text-xs font-normal h-8 ${className ?? ""}`}
          disabled={disabled}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        {!showCreateForm ? (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type part number or name..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {searchTerm.trim().length < 2
                  ? "Type at least 2 characters..."
                  : "No matching parts found."}
              </CommandEmpty>

              {searchResults && searchResults.length > 0 && (
                <CommandGroup heading="Inventory">
                  {searchResults.map((part) => (
                    <CommandItem
                      key={part._id}
                      value={`${part.partNumber} ${part.partName}`}
                      onSelect={() => handleSelectInventory(part)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold">
                              {part.partNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] capitalize"
                            >
                              {part.condition}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {part.partName}
                          </p>
                        </div>
                        {part.quantityOnHand != null &&
                          part.quantityOnHand > 0 && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                              Qty {part.quantityOnHand}
                            </span>
                          )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {allowCreate &&
                searchTerm.trim().length >= 2 &&
                !hasExactMatch && (
                  <CommandGroup heading="New Part">
                    <CommandItem
                      onSelect={() => setShowCreateForm(true)}
                      className="text-primary"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add &quot;{searchTerm.trim().toUpperCase()}&quot; as new
                      part...
                    </CommandItem>
                  </CommandGroup>
                )}
            </CommandList>
          </Command>
        ) : (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium">Add Provisional Part</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Part Number
              </label>
              <div className="font-mono text-xs font-semibold bg-muted/30 px-2 py-1.5 rounded-md border border-border/40">
                {searchTerm.trim().toUpperCase()}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Part Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder="e.g. Universal Head Rivet"
                className="h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCreateProvisional}
                disabled={creating || !newPartName.trim()}
              >
                {creating && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                Add Part
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
