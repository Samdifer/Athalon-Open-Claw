import { Users, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const demoPersonnel = [
  {
    id: "t-1",
    name: "Sandra Mercado",
    role: "Director of Maintenance",
    mroRole: "dom",
    certType: "A&P + IA",
    certNumber: "IA-2019-CO-00847",
    certExpiry: "Mar 2, 2026",
    certExpiryDays: 8,
    status: "active",
    initials: "SM",
  },
  {
    id: "t-2",
    name: "Ray Kowalski",
    role: "Lead AMT",
    mroRole: "amt",
    certType: "A&P",
    certNumber: "AP-2002-081345",
    certExpiry: "No expiry",
    certExpiryDays: null,
    status: "active",
    initials: "RK",
  },
  {
    id: "t-3",
    name: "Mia Chen",
    role: "QC Inspector",
    mroRole: "inspector",
    certType: "A&P + IA",
    certNumber: "IA-2023-CO-01204",
    certExpiry: "Feb 8, 2027",
    certExpiryDays: 350,
    status: "active",
    initials: "MC",
  },
  {
    id: "t-4",
    name: "Carlos Vega",
    role: "Parts Manager",
    mroRole: "supervisor",
    certType: "A&P",
    certNumber: "AP-2012-063891",
    certExpiry: "No expiry",
    certExpiryDays: null,
    status: "active",
    initials: "CV",
  },
];

function getRoleBadge(role: string) {
  const map: Record<string, string> = {
    dom: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    inspector: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    amt: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    supervisor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return map[role] ?? "bg-muted text-muted-foreground";
}

export default function PersonnelPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          Personnel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {demoPersonnel.length} team members · 1 certificate expiring soon
        </p>
      </div>

      <div className="space-y-2">
        {demoPersonnel.map((tech) => {
          const certWarning =
            tech.certExpiryDays !== null && tech.certExpiryDays <= 30;
          return (
            <Card
              key={tech.id}
              className={`border-border/60 ${certWarning ? "border-l-4 border-l-amber-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-muted">
                      {tech.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-foreground">
                        {tech.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${getRoleBadge(tech.mroRole)}`}
                      >
                        {tech.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {tech.certType} · {tech.certNumber}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span
                        className={`text-[11px] flex items-center gap-1 ${certWarning ? "text-amber-400 font-medium" : "text-muted-foreground"}`}
                      >
                        {certWarning && (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        Expires: {tech.certExpiry}
                        {certWarning && ` (${tech.certExpiryDays}d)`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
