import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { MRO_ROLES, type MRORole } from "@/lib/roles";
import { RoleGuard } from "@/components/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type TechnicianRow = {
  _id: Id<"technicians">;
  legalName: string;
  email?: string;
  role?: MRORole;
  status: "active" | "inactive" | "terminated";
  userId?: string;
  createdAt: number;
  updatedAt: number;
};

type InviteDraft = {
  id: string;
  email: string;
  name: string;
  role: MRORole;
  createdAt: number;
  status: "pending" | "accepted" | "expired";
};

const INVITES_KEY = "athelon:user-invites";

export function UserInvitePanel({ technicians }: { technicians: TechnicianRow[] }) {
  const { orgId, tech } = useCurrentOrg();
  const deactivateUser = useMutation(api.roles.toggleStatus);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MRORole>("technician");
  const [invites, setInvites] = useState<InviteDraft[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(INVITES_KEY) ?? "[]") as InviteDraft[];
    } catch {
      return [];
    }
  });

  const saveInvites = (next: InviteDraft[]) => {
    setInvites(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INVITES_KEY, JSON.stringify(next));
    }
  };

  const pendingInvites = useMemo(
    () =>
      invites.map((invite) => ({
        ...invite,
        status:
          invite.status === "accepted"
            ? "accepted"
            : Date.now() - invite.createdAt > 1000 * 60 * 60 * 24 * 7
              ? "expired"
              : "pending",
      })),
    [invites],
  );

  const handleInvite = async () => {
    if (!orgId) return;
    if (!email.trim() || !name.trim()) {
      toast.error("Name and email are required");
      return;
    }

    // No dedicated invite mutation exists yet in current backend API, so we track draft invites locally.
    const nextInvite: InviteDraft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      createdAt: Date.now(),
      status: "pending",
    };

    saveInvites([nextInvite, ...invites]);
    setEmail("");
    setName("");
    setRole("technician");
    toast.success("Invite queued");
  };

  const handleRevoke = (inviteId: string) => {
    saveInvites(invites.filter((i) => i.id !== inviteId));
    toast.success("Invite revoked");
  };

  const handleDeactivate = async (technicianId: Id<"technicians">, legalName: string) => {
    try {
      await deactivateUser({ technicianId });
      toast.success(`${legalName} deactivated`);
    } catch {
      toast.error("Failed to deactivate user");
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Invite User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select value={role} onValueChange={(v) => setRole(v as MRORole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MRO_ROLES).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleInvite}>
              Send Invite
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invites yet.</p>
            ) : (
              pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <div className="text-sm font-medium">{invite.name}</div>
                    <div className="text-xs text-muted-foreground">{invite.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invite.status === "accepted" ? "default" : invite.status === "expired" ? "secondary" : "outline"}>
                      {invite.status}
                    </Badge>
                    {invite.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleRevoke(invite.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {technicians
              .filter((t) => t.status === "active" && t._id !== tech?._id)
              .map((t) => (
                <div key={t._id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <div className="text-sm font-medium">{t.legalName}</div>
                    <div className="text-xs text-muted-foreground">{t.email ?? "—"}</div>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleDeactivate(t._id, t.legalName)}>
                    Deactivate
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
