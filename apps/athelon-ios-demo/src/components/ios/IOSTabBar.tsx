import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  PlaneTakeoff,
  ReceiptText,
  Ellipsis,
} from "lucide-react";

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", exact: true },
  { label: "Work Orders", icon: ClipboardList, path: "/work-orders" },
  { label: "Fleet", icon: PlaneTakeoff, path: "/fleet" },
  { label: "Billing", icon: ReceiptText, path: "/billing" },
  { label: "More", icon: Ellipsis, path: "/more" },
];

interface IOSTabBarProps {
  badges?: Record<string, number>;
}

export function IOSTabBar({ badges }: IOSTabBarProps) {
  const location = useLocation();

  function isActive(tab: (typeof tabs)[0]) {
    if (tab.exact) return location.pathname === tab.path;
    return location.pathname.startsWith(tab.path);
  }

  return (
    <nav className="ios-tab-bar">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const badge = badges?.[tab.path];
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className="flex flex-col items-center justify-center pt-1.5 pb-0.5 px-3 min-w-[64px] relative"
          >
            <div className="relative">
              <tab.icon
                className={`w-[22px] h-[22px] transition-colors ${
                  active ? "text-ios-blue" : "text-ios-gray"
                }`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {badge && badge > 0 && (
                <span className="ios-badge absolute -top-1.5 -right-2 text-[10px] min-w-[16px] h-[16px]">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 leading-none ${
                active
                  ? "text-ios-blue font-medium"
                  : "text-ios-gray"
              }`}
            >
              {tab.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
