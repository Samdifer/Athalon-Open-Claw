"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, Search, Check, UserCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Role definitions ───────────────────────────────────────────────────────

const MRO_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "shop_manager", label: "Shop Manager" },
  { value: "qcm_inspector", label: "QCM Inspector" },
  { value: "billing_manager", label: "Billing Manager" },
  { value: "lead_technician", label: "Lead Technician" },
  { value: "technician", label: "Technician" },
  { value: "parts_clerk", label: "Parts Clerk" },
  { value: "read_only", label: "Read Only" },
] as const;

type MroRoleValue = (typeof MRO_ROLES)[number]["value"];

function getRoleLabel(role: string): string {
  return MRO_ROLES.find((r) => r.value === role)?.label ?? role;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface PersonnelRolesTabProps {
  technicians: Array<{
    _id: string;
    legalName: string;
    status: string;
    employeeId?: string;
    role?: string;
  }>;
  canManageRoles: boolean;
  orgId: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PersonnelRolesTab({
  technicians,
  canManageRoles,
  orgId,
}: PersonnelRolesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleDraftByTechId, setRoleDraftByTechId] = useState<Record<string, string>>({});
  const [savingRoleTechId, setSavingRoleTechId] = useState<string | null>(null);
  const [togglingStatusTechId, setTogglingStatusTechId] = useState<string | null>(null);

  const assignRole = useMutation(api.roles.assignRole);
  const toggleStatus = useMutation(api.roles.toggleStatus);

  // Filter technicians by search
  const filtered = technicians.filter((tech) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tech.legalName.toLowerCase().includes(q) ||
      (tech.employeeId?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleSaveRole(techId: string) {
    const newRole = roleDraftByTechId[techId];
    if (!newRole) return;
    setSavingRoleTechId(techId);
    try {
      await assignRole({
        technicianId: techId as Id<"technicians">,
        role: newRole as MroRoleValue,
      });
      toast.success("Role updated");
      // Clear the draft after successful save
      setRoleDraftByTechId((prev) => {
        const next = { ...prev };
        delete next[techId];
        return next;
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update role",
      );
    } finally {
      setSavingRoleTechId(null);
    }
  }

  async function handleToggleStatus(techId: string) {
    setTogglingStatusTechId(techId);
    try {
      await toggleStatus({ technicianId: techId as Id<"technicians"> });
      toast.success("Status updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle status",
      );
    } finally {
      setTogglingStatusTechId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          Role Assignments
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage MRO role assignments and technician status
        </p>
      </div>

      {/* ── Admin guard banner ─────────────────────────────────────────────── */}
      {!canManageRoles && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/8 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Admin Access Required
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You need the admin role to modify role assignments and technician
              status. Contact your organization administrator.
            </p>
          </div>
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* ── Roles Table ────────────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    Employee ID
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    Current Role
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    New Role
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {searchQuery.trim()
                        ? "No technicians match your search"
                        : "No technicians found"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((tech) => {
                    const draftRole = roleDraftByTechId[tech._id];
                    const hasChange = draftRole !== undefined && draftRole !== (tech.role ?? "");
                    const isSaving = savingRoleTechId === tech._id;
                    const isToggling = togglingStatusTechId === tech._id;

                    return (
                      <tr
                        key={tech._id}
                        className="border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">
                            {tech.legalName}
                          </span>
                        </td>

                        {/* Employee ID */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {tech.employeeId ? `#${tech.employeeId}` : "—"}
                          </span>
                        </td>

                        {/* Status + toggle */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${
                                tech.status === "active"
                                  ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
                                  : "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30"
                              }`}
                            >
                              {tech.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              disabled={!canManageRoles || isToggling}
                              onClick={() => handleToggleStatus(tech._id)}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              {isToggling
                                ? "..."
                                : tech.status === "active"
                                  ? "Deactivate"
                                  : "Activate"}
                            </Button>
                          </div>
                        </td>

                        {/* Current Role */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-foreground/80">
                            {tech.role ? getRoleLabel(tech.role) : "None"}
                          </span>
                        </td>

                        {/* New Role Dropdown */}
                        <td className="px-4 py-3">
                          <Select
                            value={draftRole ?? tech.role ?? ""}
                            onValueChange={(v) =>
                              setRoleDraftByTechId((prev) => ({
                                ...prev,
                                [tech._id]: v,
                              }))
                            }
                            disabled={!canManageRoles || isSaving}
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-[180px] text-xs"
                            >
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {MRO_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          {hasChange && (
                            <Button
                              size="sm"
                              className="h-7 text-xs px-3"
                              disabled={!canManageRoles || isSaving}
                              onClick={() => handleSaveRole(tech._id)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
