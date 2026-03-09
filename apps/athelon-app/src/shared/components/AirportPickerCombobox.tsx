"use client";

import { useState, useCallback, useEffect, useDeferredValue } from "react";
import { ChevronsUpDown, Plane, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { FaaAirportRecord } from "@/src/shared/data/faaAirportTypes";
import { searchAirports, getAirport } from "@/src/shared/data/faaAirportIndex";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AirportPickerComboboxProps {
  /** Currently selected airport FAA Loc Id or ICAO code */
  value?: string | null;
  /** Called when an airport is selected or cleared */
  onChange: (record: FaaAirportRecord | null) => void;
  /** Filter to a specific facility type */
  facilityType?: "AIRPORT" | "HELIPORT" | "SEAPLANE BASE" | string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function repairBadge(level: string | null) {
  if (!level || level === "NONE") return null;
  const color =
    level === "MAJOR"
      ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10"
      : "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
  return (
    <Badge variant="outline" className={`text-[9px] ${color}`}>
      {level}
    </Badge>
  );
}

function facilityTypeBadge(type: string) {
  if (type === "AIRPORT") return null;
  return (
    <Badge variant="outline" className="text-[9px]">
      {type}
    </Badge>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AirportPickerCombobox({
  value,
  onChange,
  facilityType,
  placeholder = "Search airport...",
  disabled = false,
  className,
}: AirportPickerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<FaaAirportRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FaaAirportRecord | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);

  // Resolve initial value to a record
  useEffect(() => {
    if (value && !selectedRecord) {
      getAirport(value).then((record) => {
        if (record) setSelectedRecord(record);
      });
    } else if (!value) {
      setSelectedRecord(null);
    }
  }, [value, selectedRecord]);

  // Search when deferred term changes
  useEffect(() => {
    if (!open || deferredSearch.trim().length < 2) {
      setResults([]);
      return;
    }
    searchAirports(deferredSearch, {
      limit: 20,
      facilityType: facilityType,
    }).then(setResults);
  }, [deferredSearch, open, facilityType]);

  const handleSelect = useCallback(
    (record: FaaAirportRecord) => {
      setSelectedRecord(record);
      onChange(record);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setSelectedRecord(null);
    onChange(null);
    setOpen(true);
  }, [onChange]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) setSearchTerm("");
  }, [open]);

  // ─── Render selected state ──────────────────────────────────────────────

  if (selectedRecord) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-1.5 ${className ?? ""}`}
      >
        <Plane className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold">
              {selectedRecord.icaoId ?? selectedRecord.faaLocId}
            </span>
            {facilityTypeBadge(selectedRecord.facilityType)}
            {repairBadge(selectedRecord.airframeRepair)}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {selectedRecord.facilityName} — {selectedRecord.city},{" "}
            {selectedRecord.state}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
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
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type ICAO, FAA ID, name, or city..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {searchTerm.trim().length < 2
                ? "Type at least 2 characters..."
                : "No matching airports found."}
            </CommandEmpty>

            {results.length > 0 && (
              <CommandGroup heading="Airports">
                {results.map((record) => (
                  <CommandItem
                    key={record.faaLocId}
                    value={record.faaLocId}
                    onSelect={() => handleSelect(record)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold">
                            {record.icaoId ?? record.faaLocId}
                          </span>
                          {record.icaoId && record.faaLocId !== record.icaoId && (
                            <span className="font-mono text-[9px] text-muted-foreground">
                              ({record.faaLocId})
                            </span>
                          )}
                          {facilityTypeBadge(record.facilityType)}
                          {repairBadge(record.airframeRepair)}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {record.facilityName} — {record.city},{" "}
                          {record.state}
                        </p>
                      </div>
                      {record.npiasHubClass &&
                        record.npiasHubClass !== "N/A" && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] flex-shrink-0"
                          >
                            {record.npiasHubClass}
                          </Badge>
                        )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
