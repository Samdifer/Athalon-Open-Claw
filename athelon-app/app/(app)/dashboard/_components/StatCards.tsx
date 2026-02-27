"use client";

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardsProps {
  openWoCount: number | undefined;
  squawkCount: number;
  partsCount: number;
  expiringCertCount: number;
  isLoading: boolean;
}

export function StatCards({
  openWoCount,
  squawkCount,
  partsCount,
  expiringCertCount,
  isLoading,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Open Work Orders */}
      <Link to="/work-orders">
        <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Open Work Orders
                </p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {isLoading ? (
                    <Skeleton className="h-7 w-10 inline-block" />
                  ) : (
                    (openWoCount ?? 0)
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  active
                </p>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10">
                <ClipboardList className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Active Squawks */}
      <Link to="/squawks">
        <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Active Squawks
                </p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {isLoading ? (
                    <Skeleton className="h-7 w-10 inline-block" />
                  ) : (
                    squawkCount
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  open
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Parts Pending */}
      <Link to="/parts/requests">
        <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Parts Pending
                </p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {isLoading ? (
                    <Skeleton className="h-7 w-10 inline-block" />
                  ) : (
                    partsCount
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  awaiting inspection
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Certs Expiring */}
      <Link to="/personnel">
        <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Certs Expiring
                </p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {isLoading ? (
                    <Skeleton className="h-7 w-10 inline-block" />
                  ) : (
                    expiringCertCount
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  within 30 days
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
