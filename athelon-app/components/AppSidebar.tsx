"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useOrganization } from "@clerk/nextjs";
import {
  LayoutDashboard,
  PlaneTakeoff,
  ClipboardList,
  ClipboardCheck,
  Package,
  AlertTriangle,
  ShieldCheck,
  Users,
  Settings,
  ChevronRight,
  Wrench,
  FileText,
  Receipt,
  ShoppingCart,
  Clock,
  Building2,
  Tag,
  BarChart3,
  FileX,
  Percent,
  Landmark,
  RefreshCw,
  LayoutTemplate,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const mainNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Fleet",
    href: "/fleet",
    icon: PlaneTakeoff,
  },
  {
    title: "Work Orders",
    href: "/work-orders",
    icon: ClipboardList,
  },
  {
    title: "Templates",
    href: "/work-orders/templates",
    icon: LayoutTemplate,
  },
  {
    title: "My Work",
    href: "/my-work",
    icon: ClipboardCheck,
  },
  {
    title: "Parts",
    href: "/parts/requests",
    icon: Package,
  },
  {
    title: "Squawks",
    href: "/squawks",
    icon: AlertTriangle,
    badgeCount: 1, // Demo: 1 open squawk
    badgeVariant: "destructive" as const,
  },
  {
    title: "Compliance",
    href: "/compliance/audit-trail",
    icon: ShieldCheck,
  },
  {
    title: "QCM Review",
    href: "/compliance/qcm-review",
    icon: ShieldCheck,
  },
];

const billingNav = [
  {
    title: "AR Dashboard",
    href: "/billing/ar-dashboard",
    icon: AlertTriangle,
  },
  {
    title: "Quotes",
    href: "/billing/quotes",
    icon: FileText,
  },
  {
    title: "Invoices",
    href: "/billing/invoices",
    icon: Receipt,
  },
  {
    title: "Credit Memos",
    href: "/billing/credit-memos",
    icon: FileX,
  },
  {
    title: "Customers",
    href: "/billing/customers",
    icon: Users,
  },
  {
    title: "Purchase Orders",
    href: "/billing/purchase-orders",
    icon: ShoppingCart,
  },
  {
    title: "Time Clock",
    href: "/billing/time-clock",
    icon: Clock,
  },
  {
    title: "Vendors",
    href: "/billing/vendors",
    icon: Building2,
  },
  {
    title: "Pricing",
    href: "/billing/pricing",
    icon: Tag,
  },
  {
    title: "Tax Config",
    href: "/billing/tax-config",
    icon: Percent,
  },
  {
    title: "Analytics",
    href: "/billing/analytics",
    icon: BarChart3,
  },
  {
    title: "Deposits",
    href: "/billing/deposits",
    icon: Landmark,
  },
  {
    title: "Time Approval",
    href: "/billing/time-approval",
    icon: ClipboardCheck,
  },
  {
    title: "Recurring",
    href: "/billing/recurring",
    icon: RefreshCw,
  },
  {
    title: "Settings",
    href: "/billing/settings",
    icon: Settings,
  },
];

const bottomNav = [
  {
    title: "Personnel",
    href: "/personnel",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings/shop",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { organization } = useOrganization();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50" aria-label="Main navigation">
      {/* Header — Logo + Org Name */}
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
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
              {mainNav.map((item) => {
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
                      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                        <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1">{item.title}</span>
                        {item.badgeCount !== undefined &&
                          item.badgeCount > 0 && (
                            <Badge
                              variant={item.badgeVariant ?? "secondary"}
                              className="ml-auto h-4.5 min-w-[18px] px-1 text-[10px] font-medium group-data-[collapsible=icon]:hidden"
                              aria-label={`${item.badgeCount} ${item.title.toLowerCase()} items`}
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

        {/* Billing Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 py-1 group-data-[collapsible=icon]:hidden">
            Billing
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {billingNav.map((item) => {
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
                      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                        <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{item.title}</span>
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
              {bottomNav.map((item) => {
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
                      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                        <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
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
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" aria-hidden="true" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
