import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type MissingPrereqKind =
  | "needs_org_context"
  | "needs_technician_profile"
  | `needs_seed_data:${string}`;

interface MissingPrereqBannerProps {
  kind: MissingPrereqKind;
  actionLabel?: string;
  actionTarget?: string;
  className?: string;
}

function getCopy(kind: MissingPrereqKind): { title: string; description: string } {
  if (kind === "needs_org_context") {
    return {
      title: "Organization setup required",
      description: "Complete onboarding to continue using this page.",
    };
  }
  if (kind === "needs_technician_profile") {
    return {
      title: "Technician profile required",
      description: "Link your account to a technician profile to use this action.",
    };
  }
  return {
    title: "Data setup required",
    description: "This feature needs initial data before it can be used.",
  };
}

export function MissingPrereqBanner({
  kind,
  actionLabel,
  actionTarget,
  className,
}: MissingPrereqBannerProps) {
  const copy = getCopy(kind);

  return (
    <Card className={className ?? "border-amber-500/30 bg-amber-500/5"}>
      <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{copy.title}</p>
            <p className="text-xs text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        {actionLabel && actionTarget && (
          <Button asChild size="sm" variant="outline">
            <Link to={actionTarget}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
