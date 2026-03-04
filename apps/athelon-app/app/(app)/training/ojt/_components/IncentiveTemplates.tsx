"use client";

import { useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { Gift } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Trigger = "first_signoff" | "section_complete" | "halfway" | "fully_qualified" | "multi_type";

type Template = {
  id: string;
  trigger: Trigger;
  reward: string;
  active: boolean;
};

type TechMilestones = Record<string, { name: string; first_signoff: boolean; section_complete: boolean; halfway: boolean; fully_qualified: boolean; multi_type: boolean }>;

const triggerLabel: Record<Trigger, string> = {
  first_signoff: "First Sign-off",
  section_complete: "Section Complete",
  halfway: "Halfway There",
  fully_qualified: "Fully Qualified",
  multi_type: "Multi-Type Certified",
};

export function IncentiveTemplates() {
  const convex = useConvex();
  const { orgId } = useCurrentOrg();
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [trigger, setTrigger] = useState<Trigger>("section_complete");
  const [reward, setReward] = useState("");
  const [milestones, setMilestones] = useState<TechMilestones>({});

  useEffect(() => {
    let cancelled = false;

    async function loadMilestones() {
      if (!technicians) return;

      const results: TechMilestones = {};
      for (const tech of technicians) {
        const jackets = await convex.query(api.ojt.listJacketsByTechnician, { technicianId: tech._id });
        const m = {
          name: tech.legalName,
          first_signoff: false,
          section_complete: false,
          halfway: false,
          fully_qualified: false,
          multi_type: false,
        };

        const qualifiedAircraft = new Set<string>();

        for (const jacket of jackets) {
          const [tasks, sections, events, curriculum] = await Promise.all([
            convex.query(api.ojt.listTasksByCurriculum, { curriculumId: jacket.curriculumId }),
            convex.query(api.ojt.listSections, { curriculumId: jacket.curriculumId }),
            convex.query(api.ojt.listStageEvents, { jacketId: jacket._id }),
            convex.query(api.ojt.getCurriculum, { id: jacket.curriculumId }),
          ]);

          if (events.some((event) => Boolean(event.trainerSignedAt))) m.first_signoff = true;

          const stageByTask = new Map<string, Set<string>>();
          for (const event of events) {
            if (!event.trainerSignedAt) continue;
            const key = String(event.taskId);
            const set = stageByTask.get(key) ?? new Set<string>();
            set.add(event.stage);
            stageByTask.set(key, set);
          }

          const mastered = tasks.filter((task) => (stageByTask.get(String(task._id))?.size ?? 0) === 4).length;
          if (tasks.length > 0 && mastered / tasks.length >= 0.5) m.halfway = true;

          if (jacket.status === "fully_qualified" || (tasks.length > 0 && mastered === tasks.length)) {
            m.fully_qualified = true;
            if (curriculum?.aircraftType) qualifiedAircraft.add(curriculum.aircraftType);
          }

          const sectionComplete = sections.some((section) => {
            const sectionTasks = tasks.filter((task) => task.sectionId === section._id);
            if (sectionTasks.length === 0) return false;
            return sectionTasks.every((task) => (stageByTask.get(String(task._id))?.size ?? 0) === 4);
          });
          if (sectionComplete) m.section_complete = true;
        }

        m.multi_type = qualifiedAircraft.size >= 2;
        results[String(tech._id)] = m;
      }

      if (!cancelled) setMilestones(results);
    }

    void loadMilestones();
    return () => {
      cancelled = true;
    };
  }, [convex, technicians]);

  const earnersByTemplate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const template of templates.filter((t) => t.active)) {
      const earners = Object.values(milestones)
        .filter((m) => m[template.trigger])
        .map((m) => m.name);
      map.set(template.id, earners);
    }
    return map;
  }, [templates, milestones]);

  const addTemplate = () => {
    if (!reward.trim()) return;
    setTemplates((prev) => [
      {
        id: crypto.randomUUID(),
        trigger,
        reward: reward.trim(),
        active: true,
      },
      ...prev,
    ]);
    setReward("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Incentive Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Create Reward Template</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Milestone Trigger</Label>
              <Select value={trigger} onValueChange={(value) => setTrigger(value as Trigger)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Reward Description</Label>
              <div className="flex gap-2">
                <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g., $100 tool credit" />
                <Button onClick={addTemplate}>
                  <Gift className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Templates</p>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : templates.map((template) => {
            const earners = earnersByTemplate.get(template.id) ?? [];
            return (
              <div key={template.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{triggerLabel[template.trigger]}</p>
                    <p className="text-xs text-muted-foreground">Reward: {template.reward}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, active: !t.active } : t));
                  }}>
                    {template.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {earners.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No earners yet</span>
                  ) : earners.map((name) => <Badge key={`${template.id}-${name}`} variant="secondary">{name}</Badge>)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
