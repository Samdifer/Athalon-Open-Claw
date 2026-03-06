"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Plane,
  Calendar,
  FileText,
  Package,
  Settings,
  Search,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteBuilderLeftSidebarProps {
  // Quote details
  customerId: string;
  aircraftId: string;
  onCustomerChange: (id: string) => void;
  onAircraftChange: (id: string) => void;
  customers: Array<{ _id: string; name: string; companyName?: string }>;
  aircraft: Array<{
    _id: string;
    currentRegistration?: string;
    make: string;
    model: string;
  }>;

  // Metadata
  projectTitle: string;
  onProjectTitleChange: (val: string) => void;
  priority: "routine" | "urgent" | "aog";
  onPriorityChange: (val: "routine" | "urgent" | "aog") => void;
  requestedStartDate: string;
  onStartDateChange: (val: string) => void;
  requestedEndDate: string;
  onEndDateChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;

  // Deadline suggestion
  totalHours: number;
  onApplyDeadlineSuggestion: (dateStr: string) => void;

  // Service library
  templates: Array<{
    _id: string;
    name: string;
    aircraftTypeFilter?: string;
    lineItems: Array<unknown>;
    isActive: boolean;
  }>;
  laborKits: Array<{
    _id: string;
    name: string;
    aircraftType?: string;
    ataChapter?: string;
    laborItems: Array<{ estimatedHours: number }>;
    requiredParts: Array<unknown>;
    externalServices?: Array<unknown>;
    isActive: boolean;
  }>;
  selectedAircraftModel?: string;
  onAddTemplate: (templateId: string) => void;
  onAddLaborKit: (kitId: string) => void;
  onOpenTemplateSettings: () => void;
}

function computeSuggestedDeadline(
  startDate: string,
  totalHours: number
): { dateStr: string; label: string; totalDays: number } | null {
  if (!startDate || totalHours <= 0) return null;

  const businessDays = Math.ceil(totalHours / 8) + 5;
  const start = new Date(startDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;

  let added = 0;
  const current = new Date(start);
  while (added < businessDays) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }

  const formatted = current.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const diffMs = current.getTime() - start.getTime();
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return {
    dateStr: current.toISOString().split("T")[0],
    label: `Suggested: ${formatted} (~${totalDays} days)`,
    totalDays,
  };
}

export function QuoteBuilderLeftSidebar({
  customerId,
  aircraftId,
  onCustomerChange,
  onAircraftChange,
  customers,
  aircraft,
  projectTitle,
  onProjectTitleChange,
  priority,
  onPriorityChange,
  requestedStartDate,
  onStartDateChange,
  requestedEndDate,
  onEndDateChange,
  notes,
  onNotesChange,
  totalHours,
  onApplyDeadlineSuggestion,
  templates,
  laborKits,
  selectedAircraftModel,
  onAddTemplate,
  onAddLaborKit,
  onOpenTemplateSettings,
}: QuoteBuilderLeftSidebarProps) {
  const [librarySearch, setLibrarySearch] = useState("");

  const deadlineSuggestion = useMemo(
    () => computeSuggestedDeadline(requestedStartDate, totalHours),
    [requestedStartDate, totalHours]
  );

  const searchLower = librarySearch.toLowerCase();

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (!t.isActive) return false;
      if (
        selectedAircraftModel &&
        t.aircraftTypeFilter &&
        t.aircraftTypeFilter !== selectedAircraftModel
      ) {
        return false;
      }
      if (searchLower && !t.name.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });
  }, [templates, selectedAircraftModel, searchLower]);

  const filteredLaborKits = useMemo(() => {
    return laborKits.filter((k) => {
      if (!k.isActive) return false;
      if (
        selectedAircraftModel &&
        k.aircraftType &&
        k.aircraftType !== selectedAircraftModel
      ) {
        return false;
      }
      if (searchLower && !k.name.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });
  }, [laborKits, selectedAircraftModel, searchLower]);

  const priorityOptions: Array<{
    value: "routine" | "urgent" | "aog";
    label: string;
  }> = [
    { value: "routine", label: "Routine" },
    { value: "urgent", label: "Urgent" },
    { value: "aog", label: "AOG" },
  ];

  return (
    <div className="flex h-full w-[300px] min-w-[300px] flex-col border-r bg-muted/30">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 space-y-4">
        {/* ── Quote Details ── */}
        <section className="space-y-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quote Details
          </h3>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <User className="h-3 w-3" />
              Customer
            </Label>
            <Select value={customerId} onValueChange={onCustomerChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c._id} value={c._id} className="text-xs">
                    {c.companyName ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Plane className="h-3 w-3" />
              Aircraft
            </Label>
            <Select value={aircraftId} onValueChange={onAircraftChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select aircraft" />
              </SelectTrigger>
              <SelectContent>
                {aircraft.map((a) => (
                  <SelectItem key={a._id} value={a._id} className="text-xs">
                    {a.currentRegistration
                      ? `${a.currentRegistration} - ${a.make} ${a.model}`
                      : `${a.make} ${a.model}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="border-t" />

        {/* ── Project Metadata ── */}
        <section className="space-y-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Project Metadata
          </h3>

          <div className="space-y-1.5">
            <Label className="text-xs">Project Title</Label>
            <Input
              className="h-8 text-xs"
              value={projectTitle}
              onChange={(e) => onProjectTitleChange(e.target.value)}
              placeholder="e.g. Annual Inspection + Avionics Upgrade"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <div className="flex gap-1">
              {priorityOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={priority === opt.value ? "default" : "outline"}
                  className={cn(
                    "h-7 flex-1 text-[11px]",
                    priority === opt.value &&
                      opt.value === "aog" &&
                      "bg-destructive text-white hover:bg-destructive/90",
                    priority === opt.value &&
                      opt.value === "urgent" &&
                      "bg-amber-600 text-white hover:bg-amber-600/90"
                  )}
                  onClick={() => onPriorityChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3 w-3" />
              Start Date
            </Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={requestedStartDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3 w-3" />
              End Date
            </Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={requestedEndDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
            {deadlineSuggestion && (
              <button
                type="button"
                className="mt-0.5 text-[11px] text-primary hover:underline cursor-pointer"
                onClick={() =>
                  onApplyDeadlineSuggestion(deadlineSuggestion.dateStr)
                }
              >
                {deadlineSuggestion.label}
              </button>
            )}
          </div>
        </section>

        <div className="border-t" />

        {/* ── Notes ── */}
        <section className="space-y-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="mr-1 inline h-3 w-3" />
            Notes
          </h3>
          <Textarea
            className="resize-none text-xs"
            rows={3}
            placeholder="Internal notes for this quote..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </section>

        <div className="border-t" />

        {/* ── Service Library ── */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Package className="mr-1 inline h-3 w-3" />
              Service Library
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={onOpenTemplateSettings}
            >
              <Settings className="mr-1 h-3 w-3" />
              Manage
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              placeholder="Search templates & kits..."
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
            />
          </div>

          {/* Templates */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Templates
            </p>
            {filteredTemplates.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-1">
                No matching templates
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredTemplates.map((t) => (
                  <li
                    key={t._id}
                    className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-xs font-medium">{t.name}</p>
                      <div className="flex items-center gap-1.5">
                        {t.aircraftTypeFilter && (
                          <Badge
                            variant="secondary"
                            className="px-1 py-0 text-[10px]"
                          >
                            {t.aircraftTypeFilter}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {t.lineItems.length}{" "}
                          {t.lineItems.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 shrink-0 p-0"
                      onClick={() => onAddTemplate(t._id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Labor Kits */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Labor Kits
            </p>
            {filteredLaborKits.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-1">
                No matching labor kits
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredLaborKits.map((k) => {
                  const totalKitHours = k.laborItems.reduce(
                    (sum, li) => sum + li.estimatedHours,
                    0
                  );
                  return (
                    <li
                      key={k._id}
                      className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-xs font-medium">
                          {k.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {k.ataChapter && (
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[10px]"
                            >
                              ATA {k.ataChapter}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {totalKitHours}h
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 shrink-0 p-0"
                        onClick={() => onAddLaborKit(k._id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
