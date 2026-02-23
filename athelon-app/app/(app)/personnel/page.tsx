"use client";

import { Users, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: string): string {
  const map: Record<string, string> = {
    dom: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    inspector: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    amt: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    supervisor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    active: "bg-green-500/15 text-green-400 border-green-500/30",
    inactive: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return map[role] ?? "bg-muted text-muted-foreground border-border/30";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PersonnelSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonnelPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Certs expiring within 30 days
  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const isLoading = technicians === undefined;

  // Build a set of technicianIds with expiring certs for quick lookup
  const expiringTechIds = new Set(
    (expiringCerts ?? []).map((e) => e.technician?._id).filter(Boolean),
  );

  // Build a map of technicianId → cert expiry info for display
  const expiringCertMap = new Map(
    (expiringCerts ?? []).map((e) => [
      e.technician?._id,
      {
        iaExpiryDate: e.cert.iaExpiryDate,
        certNumber: e.cert.certificateNumber,
        daysUntilExpiry: e.cert.iaExpiryDate
          ? Math.ceil((e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      },
    ]),
  );

  const expiringCount = expiringTechIds.size;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          Personnel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? (
            <Skeleton className="h-3 w-48 inline-block" />
          ) : (
            <>
              {technicians.length} team member
              {technicians.length !== 1 ? "s" : ""}
              {expiringCount > 0 && (
                <span className="text-amber-400 font-medium">
                  {" "}
                  · {expiringCount} certificate
                  {expiringCount !== 1 ? "s" : ""} expiring soon
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {isLoading ? (
        <PersonnelSkeleton />
      ) : technicians.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No technicians found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {technicians.map((tech) => {
            const hasExpiringCert = expiringTechIds.has(tech._id);
            const certInfo = expiringCertMap.get(tech._id);
            const isCritical =
              certInfo?.daysUntilExpiry !== null &&
              certInfo?.daysUntilExpiry !== undefined &&
              certInfo.daysUntilExpiry <= 14;

            return (
              <Card
                key={tech._id}
                className={`border-border/60 ${
                  hasExpiringCert
                    ? isCritical
                      ? "border-l-4 border-l-red-500"
                      : "border-l-4 border-l-amber-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-muted">
                        {getInitials(tech.legalName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {tech.legalName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${getRoleBadge(tech.status)}`}
                        >
                          {tech.status}
                        </Badge>
                        {tech.employeeId && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{tech.employeeId}
                          </span>
                        )}
                      </div>

                      {hasExpiringCert && certInfo ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ShieldAlert
                            className={`w-3 h-3 flex-shrink-0 ${isCritical ? "text-red-400" : "text-amber-400"}`}
                          />
                          <span
                            className={`text-[11px] font-medium ${isCritical ? "text-red-400" : "text-amber-400"}`}
                          >
                            IA cert expires in {certInfo.daysUntilExpiry}d
                            {certInfo.certNumber
                              ? ` (${certInfo.certNumber})`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 mt-0.5">
                          {tech.email && (
                            <span className="text-[11px] text-muted-foreground">
                              {tech.email}
                            </span>
                          )}
                          {tech.phone && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {tech.phone}
                              </span>
                            </>
                          )}
                          {!tech.email && !tech.phone && (
                            <span className="text-[11px] text-muted-foreground">
                              No contact info
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
