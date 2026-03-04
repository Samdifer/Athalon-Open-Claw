import { clsx } from "clsx";

const statusColors: Record<string, string> = {
  // Work order statuses
  open: "bg-ios-gray5 text-ios-gray",
  draft: "bg-ios-gray5 text-ios-gray",
  in_progress: "bg-blue-50 text-ios-blue",
  on_hold: "bg-orange-50 text-ios-orange",
  pending_inspection: "bg-purple-50 text-ios-purple",
  pending_signoff: "bg-indigo-50 text-ios-indigo",
  closed: "bg-green-50 text-ios-green",
  completed: "bg-green-50 text-ios-green",

  // Aircraft statuses
  airworthy: "bg-green-50 text-ios-green",
  "airworthy_with_limitations": "bg-yellow-50 text-ios-orange",
  in_maintenance: "bg-blue-50 text-ios-blue",
  out_of_service: "bg-red-50 text-ios-red",
  aog: "bg-red-50 text-ios-red",
  AOG: "bg-red-50 text-ios-red",

  // Generic
  active: "bg-green-50 text-ios-green",
  inactive: "bg-ios-gray5 text-ios-gray",
  overdue: "bg-red-50 text-ios-red",
  at_risk: "bg-orange-50 text-ios-orange",
  on_track: "bg-green-50 text-ios-green",

  // Compliance
  compliant: "bg-green-50 text-ios-green",
  non_compliant: "bg-red-50 text-ios-red",
  deferred: "bg-yellow-50 text-ios-orange",

  // Billing
  paid: "bg-green-50 text-ios-green",
  sent: "bg-blue-50 text-ios-blue",
  unpaid: "bg-red-50 text-ios-red",
};

function formatLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface IOSStatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function IOSStatusBadge({
  status,
  label,
  className,
}: IOSStatusBadgeProps) {
  const colors = statusColors[status] || "bg-ios-gray5 text-ios-gray";
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium",
        colors,
        className
      )}
    >
      {label || formatLabel(status)}
    </span>
  );
}
