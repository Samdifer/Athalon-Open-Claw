import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Banknote,
  Clock,
  Users,
  Package,
  Shield,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Report sections configuration
// ---------------------------------------------------------------------------

interface ReportItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  iconBg: string;
}

const financialReports: ReportItem[] = [
  {
    id: "financials",
    title: "Financials Dashboard",
    icon: <BarChart3 className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-blue",
  },
  {
    id: "revenue-forecast",
    title: "Revenue Forecast",
    icon: <TrendingUp className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-green",
  },
  {
    id: "profitability",
    title: "Profitability Analysis",
    icon: <PieChart className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-purple",
  },
  {
    id: "cash-runway",
    title: "Cash Runway",
    icon: <Banknote className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-orange",
  },
];

const operationalReports: ReportItem[] = [
  {
    id: "turnaround",
    title: "Turnaround Time",
    icon: <Clock className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-teal",
  },
  {
    id: "tech-utilization",
    title: "Tech Utilization",
    icon: <Users className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-indigo",
  },
  {
    id: "parts-usage",
    title: "Parts Usage",
    icon: <Package className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-pink",
  },
];

const complianceReports: ReportItem[] = [
  {
    id: "ad-sb-status",
    title: "AD/SB Status",
    icon: <Shield className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-red",
  },
  {
    id: "audit-history",
    title: "Audit History",
    icon: <FileText className="w-[17px] h-[17px]" />,
    iconBg: "bg-ios-gray",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Reports() {
  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar
        title="Reports"
        backHref="/more"
        backLabel="More"
        largeTitle
      />

      {/* Report sections */}
      <div className="pb-6">
        <IOSGroupedList
          sections={[
            {
              header: "Financial Reports",
              items: financialReports.map((report) => (
                <IOSListRow
                  key={report.id}
                  title={report.title}
                  icon={report.icon}
                  iconBg={report.iconBg}
                  accessory="disclosure"
                />
              )),
            },
            {
              header: "Operational Reports",
              items: operationalReports.map((report) => (
                <IOSListRow
                  key={report.id}
                  title={report.title}
                  icon={report.icon}
                  iconBg={report.iconBg}
                  accessory="disclosure"
                />
              )),
            },
            {
              header: "Compliance Reports",
              items: complianceReports.map((report) => (
                <IOSListRow
                  key={report.id}
                  title={report.title}
                  icon={report.icon}
                  iconBg={report.iconBg}
                  accessory="disclosure"
                />
              )),
            },
          ]}
        />
      </div>
    </div>
  );
}
