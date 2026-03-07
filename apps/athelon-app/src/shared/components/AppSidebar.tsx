import { Link, useLocation } from "react-router-dom";
import {
  OrganizationSwitcher,
  UserButton,
  useOrganization,
  useUser,
} from "@clerk/clerk-react";
import {
  LayoutDashboard,
  PlaneTakeoff,
  Plane,
  ClipboardList,
  Package,
  ReceiptText,
  ShieldCheck,
  Users,
  Settings,
  Wrench,
  CalendarDays,
  Hammer,
  FileBarChart,
  GraduationCap,
  ChevronRight,
  Shield,
  Award,
  TrendingUp,
  ClipboardCheck,
  Trophy,
  Contact2,
  MessageSquare,
  BarChart3,
  Warehouse,
} from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  ROLE_BADGE_STYLES,
  ROLE_LABELS,
  type MroRole,
} from "@/lib/mro-constants";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LocationSwitcher } from "@/components/LocationSwitcher";

import type React from "react";

type NavSection =
  | "dashboard"
  | "fleet"
  | "work-orders"
  | "scheduling"
  | "parts"
  | "billing"
  | "sales"
  | "crm"
  | "compliance"
  | "personnel"
  | "my-work"
  | "reports"
  | "settings";

type NavItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section: NavSection;
  children: NavItem[];
};

type NavEntry =
  | (NavItem & {
      section: NavSection;
      icon: React.ComponentType<{ className?: string }>;
    })
  | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const mainNav: NavEntry[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "dashboard",
  },
  {
    title: "My Work",
    href: "/my-work",
    icon: Hammer,
    section: "my-work",
    children: [
      { title: "My Time", href: "/my-work/time" },
    ],
  },
  {
    title: "Lead Center",
    href: "/lead",
    icon: Shield,
    section: "work-orders",
  },
  {
    title: "Fleet",
    href: "/fleet",
    icon: PlaneTakeoff,
    section: "fleet",
    children: [
      { title: "Calendar", href: "/fleet/calendar" },
      { title: "Predictions", href: "/fleet/predictions" },
      { title: "Maintenance Programs", href: "/fleet/maintenance-programs", icon: CalendarDays },
      { title: "Life-Limited Parts", href: "/fleet/llp", icon: Shield },
      { title: "ADS-B Tracking", href: "/settings/adsb", icon: Plane },
    ],
  },
  {
    title: "Work Orders",
    href: "/work-orders",
    icon: ClipboardList,
    section: "work-orders",
    children: [
      { title: "Lead Workspace", href: "/work-orders/lead" },
      { title: "Shift Handoff", href: "/work-orders/handoff" },
      { title: "Dashboard", href: "/work-orders/dashboard" },
      { title: "Kanban", href: "/work-orders/kanban" },
    ],
  },
  {
    title: "Schedule",
    href: "/scheduling",
    icon: CalendarDays,
    section: "scheduling",
    children: [
      { title: "Due-List Workbench", href: "/scheduling/due-list" },
      { title: "Roster & Teams", href: "/scheduling/roster" },
      { title: "Quote Workspace", href: "/scheduling/quotes" },
      { title: "Seed Audit", href: "/scheduling/seed-audit" },
    ],
  },
  {
    title: "Parts",
    href: "/parts",
    icon: Package,
    section: "parts",
    children: [
      { title: "Receiving Inspection", href: "/parts/receiving" },
      { title: "PO Receiving", href: "/parts/receiving/po" },
      { title: "Part Requests", href: "/parts/requests" },
      { title: "Tool Crib", href: "/parts/tools" },
      { title: "Inventory Count", href: "/parts/inventory-count" },
      { title: "Core Tracking", href: "/parts/cores" },
      { title: "Shipping", href: "/parts/shipping" },
      { title: "Rotables", href: "/parts/rotables" },
      { title: "Loaners", href: "/parts/loaners" },
      { title: "Lots & Batches", href: "/parts/lots" },
      { title: "Warehouse Locations", href: "/parts/warehouse", icon: Warehouse },
      { title: "Tags", href: "/parts/tags" },
      { title: "Alerts", href: "/parts/alerts" },
    ],
  },
  {
    title: "Sales",
    href: "/sales/dashboard",
    icon: TrendingUp,
    section: "sales",
    children: [
      { title: "Dashboard", href: "/sales/dashboard", icon: LayoutDashboard },
      { title: "Sales Ops", href: "/sales/ops", icon: BarChart3 },
      { title: "Quotes", href: "/sales/quotes", icon: ReceiptText },
      { title: "Training", href: "/sales/training", icon: GraduationCap },
      { title: "CRM Pipeline", href: "/crm/pipeline", icon: TrendingUp },
    ],
  },
  {
    title: "Billing",
    href: "/billing/invoices",
    icon: ReceiptText,
    section: "billing",
    children: [
      { title: "Invoices", href: "/billing/invoices" },
      { title: "Customers", href: "/billing/customers" },
      { title: "Vendors", href: "/billing/vendors" },
      { title: "AR Dashboard", href: "/billing/ar-dashboard" },
      { title: "Analytics", href: "/billing/analytics" },
      { title: "Credit Memos", href: "/billing/credit-memos" },
      { title: "Time Clock", href: "/billing/time-clock" },
      { title: "Time Approval", href: "/billing/time-approval" },
      { title: "Deposits", href: "/billing/deposits" },
      { title: "Recurring", href: "/billing/recurring" },
      { title: "Purchase Orders", href: "/billing/purchase-orders" },
      { title: "Counter Sales", href: "/billing/otc" },
      { title: "Labor Kits", href: "/billing/labor-kits" },
      { title: "Pricing", href: "/billing/pricing" },
      { title: "Tax Config", href: "/billing/tax-config" },
      { title: "Warranty Claims", href: "/billing/warranty" },
      { title: "Settings", href: "/billing/settings" },
      { title: "Customer Portal", href: "/portal" },
      { title: "Customer Requests", href: "/billing/customer-requests" },
    ],
  },
  {
    title: "CRM",
    href: "/crm/dashboard",
    icon: TrendingUp,
    section: "crm",
    children: [
      { title: "Dashboard", href: "/crm/dashboard", icon: LayoutDashboard },
      { title: "Accounts", href: "/crm/accounts", icon: Users },
      { title: "Contacts", href: "/crm/contacts", icon: Contact2 },
      { title: "Interactions", href: "/crm/interactions", icon: MessageSquare },
      { title: "Sales Pipeline", href: "/crm/pipeline", icon: TrendingUp },
      { title: "Analytics", href: "/crm/analytics", icon: BarChart3 },
      { title: "Sales Training", href: "/sales/training", icon: GraduationCap },
    ],
  },
  {
    title: "Compliance",
    href: "/compliance",
    icon: ShieldCheck,
    section: "compliance",
    children: [
      { title: "Audit Readiness", href: "/compliance/audit-readiness", icon: ClipboardCheck },
      { title: "Diamond Award", href: "/compliance/diamond-award", icon: Trophy },
      { title: "AD/SB Tracking", href: "/compliance/ad-sb" },
      { title: "Audit Trail", href: "/compliance/audit-trail" },
      { title: "QCM Review", href: "/compliance/qcm-review" },
    ],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileBarChart,
    section: "reports",
    children: [
      { title: "Financials", href: "/reports/financials" },
      { title: "Forecast", href: "/reports/financials/forecast" },
      { title: "Profitability", href: "/reports/financials/profitability" },
      { title: "Runway", href: "/reports/financials/runway" },
      { title: "Inventory", href: "/reports/inventory" },
      { title: "Revenue", href: "/reports/revenue" },
      { title: "Throughput", href: "/reports/throughput" },
    ],
  },
];

const bottomNav: NavEntry[] = [
  {
    title: "Personnel",
    href: "/personnel",
    icon: Users,
    section: "personnel",
    children: [
      { title: "Training", href: "/personnel/training" },
      { title: "Time Management", href: "/personnel/time-management" },
    ],
  },
  {
    title: "OJT Training",
    href: "/training/ojt",
    icon: GraduationCap,
    section: "personnel",
  },
  {
    title: "Settings",
    href: "/settings/shop",
    icon: Settings,
    section: "settings",
    children: [
      { title: "Station Config", href: "/settings/station-config" },
      { title: "Capabilities List", href: "/settings/capabilities", icon: Award },
      { title: "Routing Templates", href: "/settings/routing-templates" },
      { title: "Import Data", href: "/settings/import" },
      { title: "QuickBooks", href: "/settings/quickbooks" },
      { title: "Locations", href: "/settings/locations" },
    ],
  },
];

const ROLE_SECTION_ACCESS: Partial<Record<MroRole, NavSection[]>> = {
  admin: undefined,
  shop_manager: [
    "dashboard",
    "my-work",
    "fleet",
    "work-orders",
    "scheduling",
    "parts",
    "billing",
    "sales",
    "crm",
    "compliance",
    "reports",
    "personnel",
  ],
  qcm_inspector: ["compliance", "fleet", "work-orders", "personnel", "reports"],
  billing_manager: ["billing", "sales", "crm", "work-orders", "reports"],
  lead_technician: ["my-work", "work-orders", "scheduling", "fleet", "personnel", "parts"],
  technician: ["my-work", "work-orders", "parts", "fleet"],
  parts_clerk: ["parts", "billing", "sales"],
  read_only: ["dashboard", "fleet", "reports"],
};

const ROLE_CHILD_ACCESS: Partial<Record<MroRole, Record<string, string[]>>> = {
  qcm_inspector: {
    "/personnel": ["/personnel/training"],
  },
  technician: {
    "/parts": ["/parts/requests"],
  },
  parts_clerk: {
    "/billing/invoices": ["/billing/purchase-orders"],
  },
};

const LEAD_WORKSPACE_ROLES = new Set<MroRole>([
  "lead_technician",
  "shop_manager",
  "admin",
]);

function canAccessSection(role: MroRole | null | undefined, section: NavSection) {
  if (!role) return true;
  const allowed = ROLE_SECTION_ACCESS[role];
  if (!allowed) return true;
  return allowed.includes(section);
}

function filterChildrenForRole(
  role: MroRole | null | undefined,
  groupHref: string,
  children: NavItem[],
) {
  if (!role) return children;

  let scoped = children;

  // Keep sidebar route visibility aligned with page RBAC for lead workspaces.
  if (!LEAD_WORKSPACE_ROLES.has(role)) {
    scoped = scoped.filter(
      (child) => child.href !== "/work-orders/lead",
    );
  }

  const rules = ROLE_CHILD_ACCESS[role];
  if (!rules || !rules[groupHref]) return scoped;
  const allowedHrefs = new Set(rules[groupHref]);
  return scoped.filter((child) => allowedHrefs.has(child.href));
}

function NavStandaloneItem({
  item,
  pathname,
}: {
  item: NavItem & { icon: React.ComponentType<{ className?: string }> };
  pathname: string;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={cn(
          "h-9 gap-2.5",
          isActive && "bg-primary/10 text-primary hover:bg-primary/15",
        )}
      >
        <Link to={item.href} className="flex w-full min-w-0 items-center gap-2.5">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 min-w-0 truncate">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroupItem({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const isGroupActive = pathname === group.href || pathname.startsWith(group.href);
  const isChildActive = group.children.some(
    (child) => pathname === child.href || pathname.startsWith(child.href),
  );
  const isOpen = isGroupActive || isChildActive;

  return (
    <Collapsible defaultOpen={isOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            asChild
            isActive={isGroupActive && !isChildActive}
            tooltip={group.title}
            className={cn(
              "h-9 gap-2.5",
              isGroupActive &&
                !isChildActive &&
                "bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <Link to={group.href} className="flex w-full min-w-0 items-center gap-2.5">
              <group.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{group.title}</span>
              <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </Link>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.children.map((child) => {
              const isActive = pathname === child.href || pathname.startsWith(child.href);
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive}
                    className={cn(isActive && "bg-primary/10 text-primary hover:bg-primary/15")}
                  >
                    <Link to={child.href} className="flex w-full min-w-0 items-center gap-1.5">
                      {child.icon ? <child.icon className="w-3.5 h-3.5" /> : null}
                      <span className="min-w-0 truncate">{child.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavSection({
  entries,
  pathname,
  role,
}: {
  entries: NavEntry[];
  pathname: string;
  role: MroRole | null | undefined;
}) {
  const filteredEntries: NavEntry[] = entries
    .filter((entry) => canAccessSection(role, entry.section))
    .filter((entry) => {
      // Hide Lead Center from non-lead roles
      if (!isGroup(entry) && entry.href === "/lead" && role && !LEAD_WORKSPACE_ROLES.has(role)) {
        return false;
      }
      return true;
    })
    .map((entry) => {
      if (!isGroup(entry)) return entry;
      const children = filterChildrenForRole(role, entry.href, entry.children);
      return { ...entry, children };
    })
    .filter((entry) => !isGroup(entry) || entry.children.length > 0);

  return (
    <>
      {filteredEntries.map((entry) =>
        isGroup(entry) ? (
          <NavGroupItem key={entry.href} group={entry} pathname={pathname} />
        ) : (
          <NavStandaloneItem key={entry.href} item={entry} pathname={pathname} />
        ),
      )}
    </>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { organization } = useOrganization();
  const { user } = useUser();
  const { tech } = useCurrentOrg();
  const role = (tech?.role as MroRole | null | undefined) ?? null;

  const roleLabel = role ? ROLE_LABELS[role] ?? role : null;
  const roleBadgeClass = role ? ROLE_BADGE_STYLES[role] : "";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-foreground leading-tight truncate">
              Athelon
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight truncate">
              {organization?.name ?? "MRO Platform"}
            </span>
          </div>
        </div>
        <div className="mt-2 px-1 group-data-[collapsible=icon]:hidden">
          <LocationSwitcher />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavSection entries={mainNav} pathname={pathname} role={role} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavSection entries={bottomNav} pathname={pathname} role={role} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <OrganizationSwitcher
              hidePersonal={false}
              afterSelectOrganizationUrl="/dashboard"
              appearance={{
                elements: {
                  organizationSwitcherTrigger:
                    "peer/menu-button ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-xs group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2",
                  organizationSwitcherTriggerIcon:
                    "w-3.5 h-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden",
                },
              }}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    userButtonTrigger:
                      "ring-sidebar-ring focus-visible:ring-2 rounded-md group-data-[collapsible=icon]:size-8",
                    avatarBox: "w-6 h-6",
                  },
                }}
              />
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium truncate text-foreground">
                    {user?.fullName ?? user?.username ?? "User"}
                  </span>
                  {roleLabel ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                        roleBadgeClass,
                      )}
                    >
                      {roleLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
