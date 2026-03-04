"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Plus, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Jacket = Doc<"ojtJackets">;

type CurriculumWithStats = Doc<"ojtCurricula"> & {
  activeJacketsCount: number;
  taskCount: number;
};

export default function OjtDashboardPage() {
  const { user } = useUser();
  const { orgId, techId } = useCurrentOrg();
  const convex = useConvex();

  const curricula = useQuery(api.ojt.listCurricula, orgId ? { organizationId: orgId } : "skip") ?? [];
  const createCurriculum = useMutation(api.ojt.createCurriculum);

  const [aircraftFilter, setAircraftFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [saving, setSaving] = useState(false);

  const [taskCountMap, setTaskCountMap] = useState<Map<string, number>>(new Map());
  const [jacketCountMap, setJacketCountMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (curricula.length === 0) {
        setTaskCountMap(new Map());
        setJacketCountMap(new Map());
        return;
      }
      const taskMap = new Map<string, number>();
      const activeJacketMap = new Map<string, number>();
      const taskRows = await Promise.all(
        curricula.map((c) => convex.query(api.ojt.listTasksByCurriculum, { curriculumId: c._id })),
      );
      const jacketRows = await Promise.all(
        curricula.map((c) => convex.query(api.ojt.listJacketsByCurriculum, { curriculumId: c._id })),
      );
      curricula.forEach((curriculum, idx) => {
        taskMap.set(curriculum._id, taskRows[idx].length);
        activeJacketMap.set(
          curriculum._id,
          jacketRows[idx].filter((j: Jacket) => j.status === "in_progress").length,
        );
      });
      if (!cancelled) {
        setTaskCountMap(taskMap);
        setJacketCountMap(activeJacketMap);
      }
    }

    void loadStats().catch((error) => {
      if (!cancelled) {
        toast.error(error instanceof Error ? error.message : "Failed to load curriculum stats");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [convex, curricula]);

  const rows: CurriculumWithStats[] = useMemo(() => {
    return curricula.map((c) => ({
      ...c,
      activeJacketsCount: jacketCountMap.get(c._id) ?? 0,
      taskCount: taskCountMap.get(c._id) ?? 0,
    }));
  }, [curricula, jacketCountMap, taskCountMap]);

  const aircraftOptions = useMemo(
    () => Array.from(new Set(curricula.map((c) => c.aircraftType))).sort(),
    [curricula],
  );

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      const aircraftOk = aircraftFilter === "all" || c.aircraftType === aircraftFilter;
      const activeOk =
        activeFilter === "all" ||
        (activeFilter === "active" ? c.isActive !== false : c.isActive === false);
      return aircraftOk && activeOk;
    });
  }, [rows, aircraftFilter, activeFilter]);

  const onCreate = async () => {
    if (!orgId) return toast.error("Organization context is required");
    if (!name.trim() || !aircraftType.trim()) {
      toast.error("Name and aircraft type are required");
      return;
    }
    setSaving(true);
    try {
      await createCurriculum({
        organizationId: orgId,
        name: name.trim(),
        aircraftType: aircraftType.trim().toUpperCase(),
        createdByTechnicianId: techId as Id<"technicians"> | undefined,
      });
      toast.success("Curriculum created");
      setShowCreate(false);
      setName("");
      setAircraftType("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create curriculum");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" /> OJT Training
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage curricula and training jackets{user?.firstName ? ` for ${user.firstName}` : ""}.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Curriculum
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-center">
          <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Aircraft type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All aircraft</SelectItem>
              {aircraftOptions.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs
            value={activeFilter}
            onValueChange={(v) => setActiveFilter(v as "all" | "active" | "inactive")}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" asChild className="md:ml-auto">
            <Link to="/training/ojt/jackets">View Jackets</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Link key={c._id} to={`/training/ojt/${c._id}`}>
            <Card className="h-full hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.name}</span>
                  <Badge variant={c.isActive === false ? "outline" : "default"}>
                    {c.isActive === false ? "Inactive" : "Active"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>Aircraft Type: <span className="text-foreground font-medium">{c.aircraftType}</span></div>
                <div>Task Count: <span className="text-foreground font-medium">{c.taskCount}</span></div>
                <div>Active Jackets: <span className="text-foreground font-medium">{c.activeJacketsCount}</span></div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Curriculum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="curr-name">Name</Label>
              <Input id="curr-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="curr-aircraft">Aircraft Type</Label>
              <Input
                id="curr-aircraft"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                placeholder="e.g. G650"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button onClick={onCreate} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
