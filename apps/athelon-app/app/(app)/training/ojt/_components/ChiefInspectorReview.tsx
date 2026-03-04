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
import { Badge } from "@/components/ui/badge";

type Props = {
  jacketId: Id<"ojtJackets">;
};

export function ChiefInspectorReview({ jacketId }: Props) {
  const { orgId } = useCurrentOrg();
  const { user } = useUser();
  const [submittingId, setSubmittingId] = useState<Id<"ojtStageEvents"> | null>(null);

  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const events = useQuery(api.ojt.listStageEvents, { jacketId });
  const countersign = useMutation(api.ojt.chiefInspectorCountersign);

  const currentTech = useMemo(
    () => (technicians ?? []).find((t) => t.userId && user?.id && t.userId === user.id),
    [technicians, user?.id],
  );

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians ?? []) map.set(t._id, t.legalName);
    return map;
  }, [technicians]);

  const pendingRows = useMemo(
    () => (events ?? []).filter((e) => e.stage === "evaluated" && !e.chiefInspectorSignedAt),
    [events],
  );

  async function handleCountersign(eventId: Id<"ojtStageEvents">) {
    if (!currentTech) return toast.error("No technician profile mapped to your user");
    setSubmittingId(eventId);
    try {
      await countersign({ eventId, chiefInspectorId: currentTech._id });
      toast.success("Event countersigned");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to countersign");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chief Inspector Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evaluated stage events pending countersign.</p>
        ) : (
          pendingRows.map((event) => (
            <div key={event._id} className="border rounded-md p-3 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Task: {event.taskId}</p>
                <p className="text-xs text-muted-foreground">
                  Tech: {techMap.get(event.technicianId) ?? event.technicianId} · Trainer: {techMap.get(event.trainerId) ?? event.trainerId}
                </p>
                <p className="text-xs text-muted-foreground">Date: {new Date(event.createdAt).toLocaleString("en-US", { timeZone: "UTC" })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30">Pending</Badge>
                <Button className="h-11" onClick={() => handleCountersign(event._id)} disabled={submittingId === event._id}>
                  Countersign
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
