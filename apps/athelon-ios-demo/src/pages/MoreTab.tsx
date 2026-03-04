import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import {
  Package,
  Shield,
  Calendar,
  Users,
  CheckSquare,
  BarChart3,
  Globe,
  Settings as SettingsIcon,
} from "lucide-react";

export default function MoreTab() {
  return (
    <div>
      <IOSNavBar title="More" largeTitle />

      <div className="pb-6">
        <IOSGroupedList
          sections={[
            {
              header: "Operations",
              items: [
                <IOSListRow
                  key="parts"
                  title="Parts"
                  icon={<Package className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-orange"
                  href="/more/parts"
                />,
                <IOSListRow
                  key="compliance"
                  title="Compliance"
                  icon={<Shield className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-red"
                  href="/more/compliance"
                />,
                <IOSListRow
                  key="scheduling"
                  title="Scheduling"
                  icon={<Calendar className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                  href="/more/scheduling"
                />,
              ],
            },
            {
              header: "People",
              items: [
                <IOSListRow
                  key="personnel"
                  title="Personnel"
                  icon={<Users className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-purple"
                  href="/more/personnel"
                />,
                <IOSListRow
                  key="my-work"
                  title="My Work"
                  icon={<CheckSquare className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-green"
                  href="/more/my-work"
                />,
              ],
            },
            {
              header: "Business",
              items: [
                <IOSListRow
                  key="reports"
                  title="Reports"
                  icon={<BarChart3 className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-teal"
                  href="/more/reports"
                />,
                <IOSListRow
                  key="portal"
                  title="Customer Portal"
                  icon={<Globe className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-indigo"
                  href="/more/portal"
                />,
              ],
            },
            {
              header: "System",
              items: [
                <IOSListRow
                  key="settings"
                  title="Settings"
                  icon={<SettingsIcon className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-gray"
                  href="/more/settings"
                />,
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
