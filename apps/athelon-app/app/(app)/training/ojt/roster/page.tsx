"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type Enrollment = Doc<"ojtEnrollmentRoster">;

const CATEGORY_LABELS: Record<string, string> = {
  mechanic: "Mechanic",
  avionics: "Avionics",
  detailer: "Detailer",
  inspection: "Inspection",
  admin: "Admin",
  management: "Management",
  test_pilot: "Test Pilot",
};

function categoryBadge(category?: string) {
  if (!category) return <Badge variant="outline">—</Badge>;
  const label = CATEGORY_LABELS[category] ?? category;
  return <Badge variant="outline">{label}</Badge>;
}

function formatDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { timeZone: "UTC" });
}

export default function OjtRosterPage() {
  const { orgId } = useCurrentOrg();

  const roster = useQuery(api.ojtEnrollment.listRoster, orgId ? { organizationId: orgId } : "skip") ?? [];
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip") ?? [];

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [enrolledFilter, setEnrolledFilter] = useState("all");

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    technicians.forEach((t) => map.set(t._id, t.legalName));
    return map;
  }, [technicians]);

  const categories = useMemo(
    () => Array.from(new Set(roster.map((r) => r.personnelCategory).filter(Boolean))).sort() as string[],
    [roster],
  );

  const filtered = useMemo(() => {
    return roster.filter((r) => {
      const catOk = categoryFilter === "all" || r.personnelCategory === categoryFilter;
      const enrollOk = enrolledFilter === "all" || (enrolledFilter === "enrolled" ? r.isEnrolledInOjt : !r.isEnrolledInOjt);
      return catOk && enrollOk;
    });
  }, [roster, categoryFilter, enrolledFilter]);

  const enrolledCount = roster.filter((r) => r.isEnrolledInOjt).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="h-11 px-3">
            <Link to="/training/ojt">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="h-6 w-6" /> OJT Enrollment Roster
            </h1>
            <p className="text-sm text-muted-foreground">
              {enrolledCount} of {roster.length} personnel enrolled in OJT
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={enrolledFilter} onValueChange={setEnrolledFilter}>
            <SelectTrigger><SelectValue placeholder="Enrollment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>OJT Log Version</TableHead>
                <TableHead>Log Converted</TableHead>
                <TableHead>Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="font-medium">{techMap.get(entry.technicianId) ?? "Unknown"}</TableCell>
                  <TableCell>{categoryBadge(entry.personnelCategory)}</TableCell>
                  <TableCell>{entry.locationCode ?? "—"}</TableCell>
                  <TableCell>
                    {entry.isEnrolledInOjt ? (
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>{entry.ojtLogVersion ?? "—"}</TableCell>
                  <TableCell>
                    {entry.hasOjtLogConverted ? (
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(entry.lastDigitalUpdate)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No roster entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
