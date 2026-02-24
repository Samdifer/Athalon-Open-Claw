"use client";

/**
 * DiscrepancyList.tsx
 * Extracted from work-orders/[id]/page.tsx (TD-009).
 * Renders the "Squawks / Discrepancies" tab content.
 */

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ─── Prop types ───────────────────────────────────────────────────────────────

interface Discrepancy {
  _id: string;
  _creationTime: number;
  discrepancyNumber?: string;
  status: string;
  description: string;
  disposition?: string;
}

export interface DiscrepancyListProps {
  discrepancies: Discrepancy[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscrepancyList({ discrepancies }: DiscrepancyListProps) {
  return (
    <div className="space-y-2">
      {discrepancies.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No squawks on this work order
            </p>
          </CardContent>
        </Card>
      ) : (
        discrepancies.map((sq) => (
          <Card
            key={sq._id}
            className="border-l-4 border-l-red-500 border-border/60"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {sq.discrepancyNumber ?? sq._id}
                    </span>
                    <Badge
                      className={`border text-[10px] ${
                        sq.status === "open"
                          ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {sq.status === "open" ? "Open" : sq.status}
                    </Badge>
                    {sq.disposition && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-400 border-amber-500/30"
                      >
                        {sq.disposition}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{sq.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Found {new Date(sq._creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 text-xs border-border/60 border-dashed gap-1.5 mt-2"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Log Squawk
      </Button>
    </div>
  );
}
