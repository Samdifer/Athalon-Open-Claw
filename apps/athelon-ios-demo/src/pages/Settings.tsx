import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import {
  Award,
  Building,
  PlaneTakeoff,
  GitBranch,
  Users,
  Lock,
  Link,
  Mail,
  Upload,
  MapPin,
  Bell,
  Inbox,
  HelpCircle,
  Info,
  Shield,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function Settings() {
  return (
    <div>
      <IOSNavBar title="Settings" backHref="/more" backLabel="More" />

      <div className="pb-6 space-y-1">
        {/* Shop Profile Card */}
        <div className="px-4 pt-2 pb-1">
          <div className="ios-card flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-[14px] bg-ios-blue flex items-center justify-center flex-shrink-0">
              <Shield className="w-[28px] h-[28px] text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-semibold text-ios-label leading-[25px]">
                Summit Aviation MRO
              </div>
              <div className="text-[15px] text-ios-label-secondary leading-[20px]">
                FAA Cert: SUMR123B
              </div>
              <div className="text-[13px] text-ios-label-tertiary leading-[18px]">
                4850 Airport Rd, Eagle, CO 81631
              </div>
            </div>
          </div>
        </div>

        {/* Station Configuration */}
        <IOSGroupedList
          sections={[
            {
              header: "Station Configuration",
              items: [
                <IOSListRow
                  key="cert"
                  title="Repair Station Certificate"
                  icon={<Award className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                />,
                <IOSListRow
                  key="facilities"
                  title="Facilities & Bays"
                  icon={<Building className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-purple"
                  detail="4 bays"
                />,
                <IOSListRow
                  key="aircraft-types"
                  title="Supported Aircraft"
                  icon={<PlaneTakeoff className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-teal"
                  detail="12 types"
                />,
                <IOSListRow
                  key="stages"
                  title="Work Stages"
                  icon={<GitBranch className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-orange"
                />,
              ],
            },
          ]}
        />

        {/* Users & Access */}
        <IOSGroupedList
          sections={[
            {
              header: "Users & Access",
              items: [
                <IOSListRow
                  key="users"
                  title="Users & Roles"
                  icon={<Users className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                  detail="24 users"
                />,
                <IOSListRow
                  key="permissions"
                  title="Permissions"
                  icon={<Lock className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-red"
                />,
              ],
            },
          ]}
        />

        {/* Integrations */}
        <IOSGroupedList
          sections={[
            {
              header: "Integrations",
              items: [
                <IOSListRow
                  key="quickbooks"
                  title="QuickBooks"
                  icon={<Link className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-green"
                  detail="Connected"
                />,
                <IOSListRow
                  key="email"
                  title="Email"
                  icon={<Mail className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                  detail="SMTP"
                />,
              ],
            },
          ]}
        />

        {/* Data */}
        <IOSGroupedList
          sections={[
            {
              header: "Data",
              items: [
                <IOSListRow
                  key="import"
                  title="Import Data"
                  icon={<Upload className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-orange"
                />,
                <IOSListRow
                  key="locations"
                  title="Locations"
                  icon={<MapPin className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-purple"
                  detail="2 locations"
                />,
                <IOSListRow
                  key="notifications"
                  title="Notifications"
                  icon={<Bell className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-red"
                />,
              ],
            },
          ]}
        />

        {/* Support */}
        <IOSGroupedList
          sections={[
            {
              header: "Support",
              items: [
                <IOSListRow
                  key="email-log"
                  title="Email Log"
                  icon={<Inbox className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-gray"
                />,
                <IOSListRow
                  key="help"
                  title="Help & Documentation"
                  icon={<HelpCircle className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                />,
                <IOSListRow
                  key="about"
                  title="About Athalon"
                  icon={<Info className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-gray"
                />,
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
