import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ClipboardList,
  PlaneTakeoff,
  Package,
  ReceiptText,
  Users,
  Settings,
  CalendarDays,
  ShieldCheck,
  FileBarChart,
  Hammer,
  Plus,
  Clock,
  FileText,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Work", path: "/my-work", icon: Hammer },
  { label: "Work Orders", path: "/work-orders", icon: ClipboardList },
  { label: "Fleet", path: "/fleet", icon: PlaneTakeoff },
  { label: "Fleet Calendar", path: "/fleet/calendar", icon: CalendarDays },
  { label: "Maintenance Programs", path: "/fleet/maintenance-programs", icon: CalendarDays },
  { label: "Parts", path: "/parts", icon: Package },
  { label: "Parts Requests", path: "/parts/requests", icon: Package },
  { label: "Parts Receiving", path: "/parts/receiving", icon: Package },
  { label: "Scheduling", path: "/scheduling", icon: CalendarDays },
  { label: "Roster & Teams", path: "/scheduling/roster", icon: Users },
  { label: "Quote Workspace", path: "/scheduling/quotes", icon: FileText },
  { label: "Invoices", path: "/billing/invoices", icon: ReceiptText },
  { label: "Quotes", path: "/billing/quotes", icon: FileText },
  { label: "Customers", path: "/billing/customers", icon: Users },
  { label: "Vendors", path: "/billing/vendors", icon: Users },
  { label: "Purchase Orders", path: "/billing/purchase-orders", icon: FileText },
  { label: "AR Dashboard", path: "/billing/ar-dashboard", icon: ReceiptText },
  { label: "Billing Analytics", path: "/billing/analytics", icon: FileBarChart },
  { label: "Compliance", path: "/compliance", icon: ShieldCheck },
  { label: "Audit Trail", path: "/compliance/audit-trail", icon: ShieldCheck },
  { label: "Reports", path: "/reports", icon: FileBarChart },
  { label: "Personnel", path: "/personnel", icon: Users },
  { label: "Settings", path: "/settings/shop", icon: Settings },
  { label: "Import Data", path: "/settings/import", icon: Settings },
];

const ACTION_ITEMS = [
  { label: "New Work Order", path: "/work-orders/new", icon: Plus },
  { label: "New Invoice", path: "/billing/invoices/new", icon: Plus },
  { label: "New Quote", path: "/billing/quotes/new", icon: Plus },
  { label: "New Part", path: "/parts/new", icon: Plus },
  { label: "Time Clock", path: "/billing/time-clock", icon: Clock },
];

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { orgId } = useCurrentOrg();

  const debouncedSearch = useDebounce(search, 300);

  const searchResults = useQuery(
    api.gapFixes.globalSearch,
    orgId && debouncedSearch.length >= 2
      ? { organizationId: orgId, query: debouncedSearch }
      : "skip",
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const runCommand = useCallback(
    (path: string) => {
      setOpen(false);
      setSearch("");
      navigate(path);
    },
    [navigate],
  );

  const hasResults =
    searchResults &&
    (searchResults.workOrders.length > 0 ||
      searchResults.aircraft.length > 0 ||
      searchResults.taskCards.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <CommandInput
        placeholder="Search pages, work orders, aircraft…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Global search results */}
        {hasResults && searchResults && (
          <>
            {searchResults.workOrders.length > 0 && (
              <CommandGroup heading="Work Orders">
                {searchResults.workOrders.map((wo) => (
                  <CommandItem
                    key={wo._id}
                    value={`wo ${wo.workOrderNumber} ${wo.description}`}
                    onSelect={() => runCommand(`/work-orders/${wo._id}`)}
                    className="gap-2"
                  >
                    <ClipboardList className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{wo.workOrderNumber}</span>
                    <span className="text-xs text-muted-foreground truncate">{wo.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searchResults.aircraft.length > 0 && (
              <CommandGroup heading="Aircraft">
                {searchResults.aircraft.map((ac) => (
                  <CommandItem
                    key={ac._id}
                    value={`aircraft ${ac.currentRegistration} ${ac.make} ${ac.model}`}
                    onSelect={() => runCommand(`/fleet/${ac._id}`)}
                    className="gap-2"
                  >
                    <PlaneTakeoff className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{ac.currentRegistration}</span>
                    <span className="text-xs text-muted-foreground">{ac.make} {ac.model}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searchResults.taskCards.length > 0 && (
              <CommandGroup heading="Task Cards">
                {searchResults.taskCards.map((tc) => (
                  <CommandItem
                    key={tc._id}
                    value={`task ${tc.taskCardNumber} ${tc.title}`}
                    onSelect={() => runCommand(`/work-orders/${tc.workOrderId}/tasks/${tc._id}`)}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{tc.taskCardNumber}</span>
                    <span className="text-xs text-muted-foreground truncate">{tc.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={`navigate ${item.label}`}
              onSelect={() => runCommand(item.path)}
              className="gap-2"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {ACTION_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={`action ${item.label}`}
              onSelect={() => runCommand(item.path)}
              className="gap-2"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
