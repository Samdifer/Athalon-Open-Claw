// BUG-DOM-HUNT-140: Removed "use client" Next.js directive — this is a Vite+React
// app and the directive is a no-op that misleads contributors into thinking the
// project uses Next.js conventions (same issue as BUG-DOM-120 on OJT dashboard).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Jacket = Doc<"ojtJackets">;

// BUG-DOM-HUNT-141: formatDate used toLocaleDateString() with no options — producing
// inconsistent date format (e.g. "3/5/2026" vs "Mar 5, 2026" everywhere else) and
// missing timeZone:"UTC" causing dates to display one day early for non-UTC shops.
// OJT jacket start/qualification dates are stored as UTC timestamps; rendering them
// in local timezone shifts them for any shop west of UTC.
function formatDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusBadge(status: string) {
  if (status === "fully_qualified") return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Fully Qualified</Badge>;
  if (status === "in_progress") return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">In Progress</Badge>;
  if (status === "suspended") return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Suspended</Badge>;
  return <Badge variant="outline">Not Started</Badge>;
}

export default function OjtJacketsPage() {
  const { user } = useUser();
  const { orgId } = useCurrentOrg();
  const navigate = useNavigate();
  const convex = useConvex();

  const curricula = useQuery(api.ojt.listCurricula, orgId ? { organizationId: orgId } : "skip") ?? [];
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip") ?? [];
  const createJacket = useMutation(api.ojt.createJacket);

  const [jackets, setJackets] = useState<Jacket[]>([]);
  const [loadingJackets, setLoadingJackets] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [curriculumFilter, setCurriculumFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");

  const [showAssign, setShowAssign] = useState(false);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAllJackets() {
      if (!curricula.length) {
        setJackets([]);
        return;
      }
      setLoadingJackets(true);
      try {
        // BUG-DOM-129: Promise.all() meant one corrupt/deleted curriculum record
        // would prevent ALL jackets from loading. The DOM opens the jackets list
        // and sees an empty table with an error toast — even if 19 of 20 curricula
        // loaded fine. Use Promise.allSettled() so partial failures are isolated
        // and successfully-loaded jackets still appear.
        const results = await Promise.allSettled(
          curricula.map((curriculum) =>
            convex.query(api.ojt.listJacketsByCurriculum, { curriculumId: curriculum._id }),
          ),
        );
        if (cancelled) return;
        const merged = results.flatMap((r) =>
          r.status === "fulfilled" ? r.value : [],
        );
        const map = new Map<string, Jacket>();
        merged.forEach((row) => map.set(row._id, row));
        setJackets(Array.from(map.values()));
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load jackets");
      } finally {
        if (!cancelled) setLoadingJackets(false);
      }
    }
    void loadAllJackets();
    return () => {
      cancelled = true;
    };
  }, [convex, curricula]);

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    technicians.forEach((t) => map.set(t._id, t.legalName));
    return map;
  }, [technicians]);

  const curriculumMap = useMemo(() => {
    const map = new Map<string, string>();
    curricula.forEach((c) => map.set(c._id, c.name));
    return map;
  }, [curricula]);

  const filtered = useMemo(() => {
    return jackets.filter((j) => {
      const statusOk = statusFilter === "all" || j.status === statusFilter;
      const curriculumOk = curriculumFilter === "all" || j.curriculumId === curriculumFilter;
      const techOk = technicianFilter === "all" || j.technicianId === technicianFilter;
      return statusOk && curriculumOk && techOk;
    });
  }, [jackets, statusFilter, curriculumFilter, technicianFilter]);

  const onAssign = async () => {
    if (!orgId || !selectedCurriculumId || !selectedTechId) {
      toast.error("Technician and curriculum are required");
      return;
    }
    setAssigning(true);
    try {
      await createJacket({
        organizationId: orgId,
        technicianId: selectedTechId as Id<"technicians">,
        curriculumId: selectedCurriculumId as Id<"ojtCurricula">,
      });
      toast.success("Jacket assigned");
      setShowAssign(false);
      setSelectedCurriculumId("");
      setSelectedTechId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign jacket");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Training Jackets</h1>
          <p className="text-sm text-muted-foreground">
            Assign and monitor OJT jacket status{user?.firstName ? ` for ${user.firstName}` : ""}.
          </p>
        </div>
        <Button onClick={() => setShowAssign(true)}>
          <Plus className="h-4 w-4 mr-2" /> Assign Jacket
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="fully_qualified">Fully Qualified</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
            <SelectTrigger><SelectValue placeholder="Curriculum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Curricula</SelectItem>
              {curricula.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
            <SelectTrigger><SelectValue placeholder="Technician" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians.map((t) => <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Jackets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technician</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Qualification Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loadingJackets && filtered.map((jacket) => (
                <TableRow
                  key={jacket._id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/training/ojt/jackets/${jacket._id}`)}
                >
                  <TableCell>{techMap.get(jacket.technicianId) ?? "Unknown"}</TableCell>
                  <TableCell>{curriculumMap.get(jacket.curriculumId) ?? "Unknown"}</TableCell>
                  <TableCell>{statusBadge(jacket.status)}</TableCell>
                  <TableCell>{formatDate(jacket.startedAt)}</TableCell>
                  <TableCell>{formatDate(jacket.qualifiedAt)}</TableCell>
                </TableRow>
              ))}
              {!loadingJackets && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No jackets found.
                  </TableCell>
                </TableRow>
              )}
              {loadingJackets && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading jackets…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Jacket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Technician</Label>
              <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Curriculum</Label>
              <Select value={selectedCurriculumId} onValueChange={setSelectedCurriculumId}>
                <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
                <SelectContent>
                  {curricula.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)} disabled={assigning}>Cancel</Button>
            <Button onClick={onAssign} disabled={assigning}>{assigning ? "Assigning…" : "Assign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
