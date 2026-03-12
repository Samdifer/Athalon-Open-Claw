import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/scheduling", label: "Gantt Board", exact: true },
  { to: "/scheduling/bays", label: "Bays", exact: false },
  { to: "/scheduling/capacity", label: "Capacity", exact: false },
  { to: "/scheduling/roster", label: "Roster & Teams", exact: false },
  { to: "/scheduling/due-list", label: "Due-List", exact: false },
  { to: "/scheduling/financial-planning", label: "Financial Planning", exact: false },
  { to: "/scheduling/quotes", label: "Quote Workspace", exact: false },
] as const;

export function SchedulingSubNav() {
  const { pathname } = useLocation();

  function isActive(to: string, exact: boolean) {
    if (exact) return pathname === to;
    return pathname.startsWith(to);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-border/30 pb-2">
      {NAV_ITEMS.map(({ to, label, exact }) => (
        <Button
          key={to}
          variant={isActive(to, exact) ? "secondary" : "ghost"}
          size="sm"
          className="text-xs h-7"
          asChild
        >
          <Link to={to}>{label}</Link>
        </Button>
      ))}
    </div>
  );
}
