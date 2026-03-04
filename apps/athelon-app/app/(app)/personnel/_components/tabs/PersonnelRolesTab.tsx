"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shield, Search, UserCheck, AlertTriangle, Pencil, Users } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MRO_ROLES, ROLE_DISPLAY_NAMES, type MroRole } from "@/lib/rbac";
import { RoleBadge } from "@/src/shared/components/RoleBadge";

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

type RoleFilter = "all" | MroRole;

function normalizeRole(role: string | undefined): MroRole {
  return (MRO_ROLES as readonly string[]).includes(role ?? "")
    ? (role as MroRole)
    : "read_only";
}

export function PersonnelRolesTab({
  technicians,
  canManageRoles,
}: PersonnelRolesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [savingRoleTechId, setSavingRoleTechId] = useState<string | null>(null);
  const [togglingStatusTechId, setTogglingStatusTechId] = useState<string | null>(null);

  const [editingTech, setEditingTech] = useState<{
    id: string;
    name: string;
    currentRole: MroRole;
  } | null>(null);
  const [editRole, setEditRole] = useState<MroRole>("technician");

  const assignRole = useMutation(api.roles.assignRole);
  const toggleStatus = useMutation(api.roles.toggleStatus);

  const roleStats = useMemo(() => {
    const counts: Record<MroRole, number> = Object.fromEntries(
      MRO_ROLES.map((role) => [role, 0]),
    ) as Record<MroRole, number>;

    for (const tech of technicians) {
      counts[normalizeRole(tech.role)] += 1;
    }

    return counts;
  }, [technicians]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return technicians.filter((tech) => {
      const techRole = normalizeRole(tech.role);
      if (roleFilter !== "all" && techRole !== roleFilter) return false;
      if (!query) return true;

      return (
        tech.legalName.toLowerCase().includes(query) ||
        (tech.employeeId?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [technicians, roleFilter, searchQuery]);

  async function handleToggleStatus(techId: string) {
    setTogglingStatusTechId(techId);
    try {
      await toggleStatus({ technicianId: techId as Id<"technicians"> });
      toast.success("Status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    } finally {
      setTogglingStatusTechId(null);
    }
  }

  async function handleConfirmRoleChange() {
    if (!editingTech) return;
    setSavingRoleTechId(editingTech.id);
    try {
      await assignRole({
        technicianId: editingTech.id as Id<"technicians">,
        role: editRole,
      });
      toast.success(`Updated role for ${editingTech.name}`);
      setEditingTech(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingRoleTechId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          Role Assignments
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage MRO role assignments and technician status
        </p>
      </div>

      {!canManageRoles && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/8 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Admin Access Required
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You need the admin role to modify role assignments and technician status.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MRO_ROLES.map((role) => (
          <Card key={role} className="border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <RoleBadge role={role} />
                <span className="text-xl font-semibold text-foreground">{roleStats[role]}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as RoleFilter)}
        >
          <SelectTrigger size="sm" className="w-[190px] text-xs">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {MRO_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_DISPLAY_NAMES[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">
          {filtered.length} technician{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

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
                    Role
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Users className="w-7 h-7 mx-auto mb-2 text-muted-foreground/40" />
                      No technicians match this filter
                    </td>
                  </tr>
                ) : (
                  filtered.map((tech) => {
                    const role = normalizeRole(tech.role);
                    const isToggling = togglingStatusTechId === tech._id;

                    return (
                      <tr
                        key={tech._id}
                        className="border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{tech.legalName}</span>
                            <RoleBadge role={role} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {tech.employeeId ? `#${tech.employeeId}` : "—"}
                          </span>
                        </td>
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
                        <td className="px-4 py-3">
                          <RoleBadge role={role} />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3"
                            disabled={!canManageRoles}
                            onClick={() => {
                              setEditingTech({
                                id: tech._id,
                                name: tech.legalName,
                                currentRole: role,
                              });
                              setEditRole(role);
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit Role
                          </Button>
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

      <Dialog open={!!editingTech} onOpenChange={(open) => !open && setEditingTech(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Technician Role</DialogTitle>
            <DialogDescription>
              Confirm role change for <span className="font-medium text-foreground">{editingTech?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Current role</div>
            <RoleBadge role={editingTech?.currentRole ?? "read_only"} />
            <div className="text-xs text-muted-foreground pt-2">New role</div>
            <Select value={editRole} onValueChange={(value) => setEditRole(value as MroRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MRO_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_DISPLAY_NAMES[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTech(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRoleChange}
              disabled={!editingTech || savingRoleTechId === editingTech.id || editRole === editingTech.currentRole}
            >
              {savingRoleTechId === editingTech?.id ? "Saving..." : "Confirm Role Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
