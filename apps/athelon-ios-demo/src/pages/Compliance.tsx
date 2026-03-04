import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { IOSProgressRing } from "@/components/ios/IOSProgressRing";
import {
  FileText,
  ClipboardCheck,
  Download,
  Shield,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface ADItem {
  id: string;
  adNumber: string;
  description: string;
  status: "compliant" | "non_compliant" | "deferred";
}

const adItems: ADItem[] = [
  {
    id: "ad-1",
    adNumber: "AD 2025-22-08",
    description: "Engine mount inspection",
    status: "compliant",
  },
  {
    id: "ad-2",
    adNumber: "AD 2024-15-06",
    description: "Fuel tank sealant check",
    status: "non_compliant",
  },
  {
    id: "ad-3",
    adNumber: "AD 2025-03-12",
    description: "Propeller blade crack check",
    status: "compliant",
  },
  {
    id: "ad-4",
    adNumber: "AD 2024-28-14",
    description: "Landing gear retract mechanism",
    status: "deferred",
  },
  {
    id: "ad-5",
    adNumber: "AD 2025-18-03",
    description: "Exhaust system inspection",
    status: "compliant",
  },
  {
    id: "ad-6",
    adNumber: "AD 2025-11-22",
    description: "Magneto impulse coupling",
    status: "non_compliant",
  },
];

// ---------------------------------------------------------------------------
// Compliance Page
// ---------------------------------------------------------------------------

export default function Compliance() {
  return (
    <div>
      <IOSNavBar title="Compliance" backHref="/more" backLabel="More" />

      <div className="pb-6 space-y-1">
        {/* Summary Cards */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex gap-3">
            {/* Fleet Compliance */}
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <IOSProgressRing
                value={87}
                size={64}
                strokeWidth={7}
                color="var(--color-ios-green)"
                label="Fleet Score"
              />
            </div>

            {/* Open ADs */}
            <div className="ios-card flex-1 flex flex-col items-center justify-center py-3">
              <div className="text-[28px] font-bold tabular-nums text-ios-red">
                4
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                Open ADs
              </div>
            </div>

            {/* Upcoming */}
            <div className="ios-card flex-1 flex flex-col items-center justify-center py-3">
              <div className="text-[28px] font-bold tabular-nums text-ios-orange">
                7
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                Due in 30 days
              </div>
            </div>
          </div>
        </div>

        {/* AD/SB Tracking */}
        <IOSGroupedList
          sections={[
            {
              header: "Active Directives",
              items: adItems.map((ad) => (
                <IOSListRow
                  key={ad.id}
                  title={ad.adNumber}
                  subtitle={ad.description}
                  icon={<Shield className="w-[17px] h-[17px]" />}
                  iconBg={
                    ad.status === "compliant"
                      ? "bg-ios-green"
                      : ad.status === "non_compliant"
                        ? "bg-ios-red"
                        : "bg-ios-orange"
                  }
                  detail={<IOSStatusBadge status={ad.status} />}
                  accessory="disclosure"
                />
              )),
            },
          ]}
        />

        {/* Navigation Section */}
        <IOSGroupedList
          sections={[
            {
              header: "Tools",
              items: [
                <IOSListRow
                  key="audit"
                  title="Audit Trail"
                  icon={<FileText className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                />,
                <IOSListRow
                  key="qcm"
                  title="QCM Review"
                  icon={<ClipboardCheck className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-purple"
                />,
                <IOSListRow
                  key="export"
                  title="Export Report"
                  icon={<Download className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-teal"
                />,
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
