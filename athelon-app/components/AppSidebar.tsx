import { Link, useLocation } from "react-router-dom";
import { UserButton, useOrganization } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  PlaneTakeoff,
  ClipboardList,
  Package,
  ReceiptText,
  ShieldCheck,
  Users,
  Settings,
  ChevronRight,
  Wrench,
  CalendarDays,
  Hammer,
  FileBarChart,
  Upload,
  Calendar,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessNav, type NavSection } from "@/lib/roles";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: NavSection;
  badgeCount?: number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
};

import type React from "react";

const mainNav: NavItem[] = [
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
  },
  {
    title: "Fleet Calendar",
    href: "/fleet/calendar",
    icon: Calendar,
    section: "fleet",
  },
  {
    title: "Work Orders",
    href: "/work-orders",
    icon: ClipboardList,
    section: "work-orders",
  },
  {
    title: "Schedule",
    href: "/scheduling",
    icon: CalendarDays,
    section: "scheduling",
  },
  {
    title: "Parts",
    href: "/parts/requests",
    icon: Package,
    section: "parts",
  },
  {
    title: "Billing",
    href: "/billing/invoices",
    icon: ReceiptText,
    section: "billing",
  },
  {
    title: "Repair Station Compliance",
    href: "/compliance/audit-trail",
    icon: ShieldCheck,
    section: "compliance",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileBarChart,
    section: "reports",
  },
];

const bottomNav: NavItem[] = [
  {
    title: "Personnel",
    href: "/personnel",
    icon: Users,
    section: "personnel",
  },
  {
    title: "Settings",
    href: "/settings/shop",
    icon: Settings,
    section: "settings",
  },
  {
    title: "Import Data",
    href: "/settings/import",
    icon: Upload,
    section: "settings",
  },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { organization } = useOrganization();
  const { role } = useUserRole();

  const filteredMainNav = mainNav.filter(
    (item) => !item.section || canAccessNav(role ?? undefined, item.section),
  );
  const filteredBottomNav = bottomNav.filter(
    (item) => !item.section || canAccessNav(role ?? undefined, item.section),
  );

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
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-9 gap-2.5",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/15"
                      )}
                    >
                      <Link to={item.href}>
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badgeCount !== undefined &&
                          item.badgeCount > 0 && (
                            <Badge
                              variant={item.badgeVariant ?? "secondary"}
                              className="ml-auto h-4.5 min-w-[18px] px-1 text-[10px] font-medium group-data-[collapsible=icon]:hidden"
                            >
                              {item.badgeCount}
                            </Badge>
                          )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Bottom Nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredBottomNav.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-9 gap-2.5",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/15"
                      )}
                    >
                      <Link to={item.href}>
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — User Menu */}
      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Account"
              className="h-10 gap-2.5 w-full"
            >
              <div className="flex items-center gap-2.5 w-full">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-6 h-6",
                    },
                  }}
                />
                <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="text-xs font-medium text-foreground truncate">
                    My Account
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    Director of Maintenance
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
