"use client";

/**
 * FAA N-Number Lookup Button + Preview Card
 *
 * Reusable component that calls the faaLookup.lookupAircraft action
 * and displays results in a preview card. Optionally provides an
 * onAutoFill callback to populate parent form fields.
 */

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface FaaLookupResult {
  found: boolean;
  nNumber: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  yearOfManufacture?: number;
  ownerName?: string;
  status?: string;
  typeAircraft?: string;
  engineType?: string;
  certIssueDate?: string;
  error?: string;
}

interface FaaLookupButtonProps {
  registration: string;
  onResult?: (result: FaaLookupResult) => void;
  onAutoFill?: (data: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    yearOfManufacture?: number;
    ownerName?: string;
  }) => void;
  size?: "sm" | "default";
  className?: string;
}

export function FaaLookupButton({
  registration,
  onResult,
  onAutoFill,
  size = "sm",
  className,
}: FaaLookupButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FaaLookupResult | null>(null);

  const lookupAircraft = useAction(api.faaLookup.lookupAircraft);

  async function handleLookup() {
    if (!registration.trim()) {
      toast.error("Enter an N-number first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = (await lookupAircraft({ registration })) as FaaLookupResult;
      setResult(res);
      onResult?.(res);

      if (res.found) {
        toast.success(`Found: ${res.manufacturer} ${res.model}`);
      } else {
        toast.error(res.error || "Aircraft not found in FAA registry.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      toast.error(msg);
      setResult({ found: false, nNumber: registration, error: msg });
    } finally {
      setLoading(false);
    }
  }

  function handleAutoFill() {
    if (!result?.found || !onAutoFill) return;
    onAutoFill({
      manufacturer: result.manufacturer,
      model: result.model,
      serialNumber: result.serialNumber,
      yearOfManufacture: result.yearOfManufacture,
      ownerName: result.ownerName,
    });
    toast.success("Fields auto-filled from FAA data.");
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleLookup}
        disabled={loading || !registration.trim()}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
        {loading ? "Looking up..." : "FAA Lookup"}
      </Button>

      {result && (
        <Card className="mt-3 border-border/60">
          <CardContent className="p-3">
            {result.found ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold">{result.nNumber}</span>
                  <Badge variant="outline" className="text-[10px]">
                    FAA Registry
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {result.manufacturer && (
                    <>
                      <span className="text-muted-foreground">Manufacturer</span>
                      <span className="font-medium">{result.manufacturer}</span>
                    </>
                  )}
                  {result.model && (
                    <>
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{result.model}</span>
                    </>
                  )}
                  {result.serialNumber && (
                    <>
                      <span className="text-muted-foreground">Serial Number</span>
                      <span className="font-medium">{result.serialNumber}</span>
                    </>
                  )}
                  {result.yearOfManufacture && (
                    <>
                      <span className="text-muted-foreground">Year</span>
                      <span className="font-medium">{result.yearOfManufacture}</span>
                    </>
                  )}
                  {result.ownerName && (
                    <>
                      <span className="text-muted-foreground">Owner</span>
                      <span className="font-medium">{result.ownerName}</span>
                    </>
                  )}
                  {result.typeAircraft && (
                    <>
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">{result.typeAircraft}</span>
                    </>
                  )}
                  {result.engineType && (
                    <>
                      <span className="text-muted-foreground">Engine</span>
                      <span className="font-medium">{result.engineType}</span>
                    </>
                  )}
                </div>
                {onAutoFill && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAutoFill}
                    className="mt-2 w-full gap-1.5 text-xs"
                  >
                    <Plane className="h-3 w-3" />
                    Auto-fill Form Fields
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">
                  {result.error || "Not found"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
