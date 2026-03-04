"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function TrainerAuthPanel() {
  const { orgId } = useCurrentOrg();
  const { user } = useUser();

  const [technicianId, setTechnicianId] = useState("");
  const [scope, setScope] = useState<"task" | "section" | "curriculum" | "all">("all");
  const [scopeRefId, setScopeRefId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [revokeReason, setRevokeReason] = useState<Record<string, string>>({});

  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const authz = useQuery(api.ojt.listTrainerAuthorizations, orgId ? { organizationId: orgId } : "skip");

  const grantAuth = useMutation(api.ojt.grantTrainerAuthorization);
  const revokeAuth = useMutation(api.ojt.revokeTrainerAuthorization);

  const currentTech = useMemo(
    () => (technicians ?? []).find((t) => t.userId && user?.id && t.userId === user.id),
    [technicians, user?.id],
  );

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians ?? []) map.set(t._id, t.legalName);
    return map;
  }, [technicians]);

  const activeAuth = useMemo(
    () => (authz ?? []).filter((a) => !a.revokedAt).sort((a, b) => b.createdAt - a.createdAt),
    [authz],
  );

  async function handleGrant() {
    if (!orgId || !technicianId) return toast.error("Select technician");
    if (!currentTech) return toast.error("No technician profile mapped to your user");

    try {
      await grantAuth({
        organizationId: orgId,
        technicianId: technicianId as Id<"technicians">,
        scope,
        scopeRefId: scope !== "all" ? scopeRefId || undefined : undefined,
        grantedByTechnicianId: currentTech._id,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
        notes: notes || undefined,
      });
      toast.success("Authorization granted");
      setTechnicianId("");
      setScope("all");
      setScopeRefId("");
      setExpiresAt("");
      setNotes("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to grant authorization");
    }
  }

  async function handleRevoke(id: Id<"ojtTrainerAuthorizations">) {
    if (!currentTech) return toast.error("No technician profile mapped to your user");
    try {
      const reason = revokeReason[id];
      await revokeAuth({
        id,
        revokedByTechnicianId: currentTech._id,
      });
      toast.success(reason ? `Authorization revoked: ${reason}` : "Authorization revoked");
      setRevokeReason((prev) => ({ ...prev, [id]: "" }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke authorization");
    }
  }

  if (!orgId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trainer Authorizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-md">
          <div className="space-y-2">
            <label className="text-sm font-medium">Technician</label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select technician" /></SelectTrigger>
              <SelectContent>
                {(technicians ?? []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Scope</label>
            <Select value={scope} onValueChange={(v) => setScope(v as "task" | "section" | "curriculum" | "all")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="section">Section</SelectItem>
                <SelectItem value="curriculum">Curriculum</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope !== "all" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Scope Ref ID</label>
              <Input className="h-11" value={scopeRefId} onChange={(e) => setScopeRefId(e.target.value)} placeholder="Task/Section/Curriculum ID" />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry</label>
            <Input className="h-11" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-2">
            <Button className="h-11" onClick={handleGrant}>Grant Authorization</Button>
          </div>
        </div>

        <div className="space-y-2">
          {activeAuth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active trainer authorizations.</p>
          ) : (
            activeAuth.map((row) => (
              <div key={row._id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{techMap.get(row.technicianId) ?? row.technicianId}</p>
                    <p className="text-xs text-muted-foreground">
                      Scope: {row.scope}{row.scopeRefId ? ` (${row.scopeRefId})` : ""} · Granted {new Date(row.grantedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    className="h-11"
                    value={revokeReason[row._id] ?? ""}
                    onChange={(e) => setRevokeReason((prev) => ({ ...prev, [row._id]: e.target.value }))}
                    placeholder="Revocation reason"
                  />
                  <Button variant="destructive" className="h-11" onClick={() => handleRevoke(row._id)}>
                    Revoke
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
