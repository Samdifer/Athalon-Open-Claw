import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  { label: "Parts", path: "/parts", icon: Package },
  { label: "Parts Requests", path: "/parts/requests", icon: Package },
  { label: "Parts Receiving", path: "/parts/receiving", icon: Package },
  { label: "Scheduling", path: "/scheduling", icon: CalendarDays },
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

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
      navigate(path);
    },
    [navigate],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
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
