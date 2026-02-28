// app/(app)/settings/users/page.tsx — Admin User & Role Management

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { RoleGuard } from "@/components/RoleGuard";
import { MRO_ROLES, type MRORole } from "@/lib/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, UserPlus, ShieldCheck } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const roleOptions = Object.entries(MRO_ROLES).map(([key, val]) => ({
  value: key as MRORole,
  label: val.label,
  description: val.description,
}));

export default function UsersSettingsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <UsersSettingsContent />
    </RoleGuard>
  );
}

function UsersSettingsContent() {
  const { orgId } = useCurrentOrg();
  const technicians = useQuery(
    api.roles.listRoles,
    orgId ? { organizationId: orgId } : "skip",
  );
  const assignRole = useMutation(api.roles.assignRole);
  const removeRole = useMutation(api.roles.removeRole);
  const toggleStatus = useMutation(api.roles.toggleStatus);

  const handleRoleChange = async (
    techId: Id<"technicians">,
    role: string,
    name: string,
  ) => {
    try {
      if (role === "none") {
        await removeRole({ technicianId: techId });
        toast.success(`Removed role from ${name}`);
      } else {
        await assignRole({ technicianId: techId, role: role as MRORole });
        toast.success(`Assigned ${MRO_ROLES[role as MRORole].label} to ${name}`);
      }
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleToggleStatus = async (
    techId: Id<"technicians">,
    name: string,
  ) => {
    try {
      await toggleStatus({ technicianId: techId });
      toast.success(`Toggled status for ${name}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members and their roles
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            toast.info("To invite users, go to your Clerk organization dashboard")
          }
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {/* Role Legend */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Roles
          </CardTitle>
          <CardDescription>
            Assign roles to control what each team member can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {roleOptions.map((r) => (
              <div
                key={r.value}
                className="text-xs p-2 rounded-md border bg-muted/20 border-border/50"
              >
                <div className="font-medium">{r.label}</div>
                <div className="text-muted-foreground">{r.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {!technicians ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.map((tech) => (
                  <TableRow key={tech._id}>
                    <TableCell className="font-medium">
                      {tech.legalName}
                      {tech.employeeId && (
                        <span className="text-xs text-muted-foreground ml-2">
                          #{tech.employeeId}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {tech.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tech.role ?? "none"}
                        onValueChange={(val) =>
                          handleRoleChange(tech._id, val, tech.legalName)
                        }
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="No role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No role</SelectItem>
                          {roleOptions.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tech.status === "active"
                            ? "default"
                            : tech.status === "inactive"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {tech.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {tech.status !== "terminated" && (
                        <Switch
                          checked={tech.status === "active"}
                          onCheckedChange={() =>
                            handleToggleStatus(tech._id, tech.legalName)
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {technicians.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
