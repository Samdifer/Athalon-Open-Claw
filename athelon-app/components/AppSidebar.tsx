import { Link, useLocation } from "react-router-dom";
import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  PlaneTakeoff,
  ClipboardList,
  Package,
  ReceiptText,
  ShieldCheck,
  Users,
  Settings,
  Wrench,
  GraduationCap,
  CalendarDays,
  Hammer,
  FileBarChart,
  Upload,
  ShoppingCart,
  Calendar,
  ClipboardCheck,
  Boxes,
  RotateCcw,
  Link2,
  MapPin,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessNav, type NavSection, type MRORole } from "@/lib/roles";
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

type NavEntry = (NavItem & { section: NavSection; icon: React.ComponentType<{ className?: string }> }) | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

// --- Main navigation data ---

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
  },
  {
    title: "Fleet",
    href: "/fleet",
    icon: PlaneTakeoff,
    section: "fleet",
    children: [
      { title: "Calendar", href: "/fleet/calendar" },
      { title: "Predictions", href: "/fleet/predictions" },
    ],
  },
  {
    title: "Work Orders",
    href: "/work-orders",
    icon: ClipboardList,
    section: "work-orders",
    children: [
      { title: "Lead Workspace", href: "/work-orders/lead" },
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
      { title: "Part Requests", href: "/parts/requests" },
      { title: "Tool Crib", href: "/parts/tools" },
      { title: "Inventory Count", href: "/parts/inventory-count" },
      { title: "Core Tracking", href: "/parts/cores" },
      { title: "Shipping", href: "/parts/shipping" },
      { title: "Rotables", href: "/parts/rotables" },
      { title: "Loaners", href: "/parts/loaners" },
    ],
  },
  {
    title: "Billing",
    href: "/billing/invoices",
    icon: ReceiptText,
    section: "billing",
    children: [
      { title: "Invoices", href: "/billing/invoices" },
      { title: "Quotes", href: "/billing/quotes" },
      { title: "Customers", href: "/billing/customers" },
      { title: "AR Dashboard", href: "/billing/ar-dashboard" },
      { title: "Analytics", href: "/billing/analytics" },
      { title: "Credit Memos", href: "/billing/credit-memos" },
      { title: "Time Approval", href: "/billing/time-approval" },
      { title: "Deposits", href: "/billing/deposits" },
      { title: "Recurring", href: "/billing/recurring" },
      { title: "Purchase Orders", href: "/billing/purchase-orders" },
      { title: "Counter Sales", href: "/billing/otc" },
      { title: "Labor Kits", href: "/billing/labor-kits" },
      { title: "Warranty Claims", href: "/billing/warranty" },
      { title: "Customer Portal", href: "/portal" },
    ],
  },
  {
    title: "Compliance",
    href: "/compliance",
    icon: ShieldCheck,
    section: "compliance",
    children: [
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
    ],
  },
  {
    title: "Settings",
    href: "/settings/shop",
    icon: Settings,
    section: "settings",
    children: [
      { title: "Import Data", href: "/settings/import" },
      { title: "QuickBooks", href: "/settings/quickbooks" },
      { title: "Locations", href: "/settings/locations" },
    ],
  },
];

// --- Components ---

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
  const isGroupActive =
    pathname === group.href || pathname.startsWith(group.href);
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
            <Link
              to={group.href}
              className="flex w-full min-w-0 items-center gap-2.5"
            >
              <group.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{group.title}</span>
              <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </Link>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.children.map((child) => {
              const isActive =
                pathname === child.href || pathname.startsWith(child.href);
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/15",
                    )}
                  >
                    <Link
                      to={child.href}
                      className="flex w-full min-w-0 items-center"
                    >
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
  role: MRORole | null | undefined;
}) {
  return (
    <>
      {entries
        .filter((entry) => canAccessNav(role ?? undefined, entry.section))
        .map((entry) =>
          isGroup(entry) ? (
            <NavGroupItem key={entry.href} group={entry} pathname={pathname} />
          ) : (
            <NavStandaloneItem
              key={entry.href}
              item={entry}
              pathname={pathname}
            />
          ),
        )}
    </>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { organization } = useOrganization();
  const { role } = useUserRole();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      {/* Header — Logo + Org Name */}
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

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavSection entries={mainNav} pathname={pathname} role={role} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Bottom Nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavSection
                entries={bottomNav}
                pathname={pathname}
                role={role}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — User Menu */}
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
            <UserButton
              showName
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  userButtonTrigger:
                    "peer/menu-button ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 flex h-10 w-full items-center justify-start gap-2.5 rounded-md px-2 text-left group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2",
                  avatarBox: "w-6 h-6",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
