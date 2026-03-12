import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, ClipboardList } from "lucide-react";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export function SetupChecklist() {
  const { orgId, org } = useCurrentOrg();

  const shops = useQuery(
    api.shopLocations.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const stationWorkspace = useQuery(
    api.stationConfig.getStationConfigWorkspace,
    orgId ? { organizationId: orgId } : "skip",
  );

  if (!orgId || !org) return null;

  const primaryShop = shops?.find((s) => s.isPrimary) ?? shops?.[0] ?? null;
  const hasCertNumber = Boolean(primaryShop?.certificateNumber ?? (org as Record<string, unknown>).certificateNumber);
  const hasPrimaryLocation = Boolean(primaryShop);
  const hasTeamMembers = (technicians?.length ?? 0) > 1;
  const hasCapabilities = (stationWorkspace?.supportedAircraft?.length ?? 0) > 0;

  const items: ChecklistItem[] = [
    {
      id: "faa_cert",
      label: "FAA certificate number",
      done: hasCertNumber,
      href: "/settings/shop",
    },
    {
      id: "primary_location",
      label: "Primary location configured",
      done: hasPrimaryLocation,
      href: "/settings/locations",
    },
    {
      id: "team_members",
      label: "Team members invited",
      done: hasTeamMembers,
      href: "/settings/users",
    },
    {
      id: "capabilities",
      label: "Capabilities defined",
      done: hasCapabilities,
      href: "/settings/capabilities",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) return null;

  return (
    <Card className="border-border/60 border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-500" />
          Setup Checklist
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {doneCount} / {items.length} complete
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            )}
            {item.done ? (
              <span className="text-sm text-muted-foreground line-through">{item.label}</span>
            ) : (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm font-normal text-foreground hover:text-primary"
                asChild
              >
                <Link to={item.href} className="flex items-center gap-1">
                  {item.label}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
