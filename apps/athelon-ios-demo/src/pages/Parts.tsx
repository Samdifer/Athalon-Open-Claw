import { useState } from "react";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSearchBar } from "@/components/ios/IOSSearchBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import {
  Package,
  ClipboardCheck,
  FileText,
  Wrench,
  BarChart3,
  Truck,
  RotateCcw,
  HandHelping,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface PartItem {
  id: string;
  partNumber: string;
  name: string;
  qty: string;
  min?: number;
  lowStock?: boolean;
}

const lowStockParts: PartItem[] = [
  {
    id: "ls-1",
    partNumber: "MS20470AD4-4",
    name: "Rivets",
    qty: "Qty: 12",
    min: 50,
    lowStock: true,
  },
  {
    id: "ls-2",
    partNumber: "AN3-5A",
    name: "Bolt",
    qty: "Qty: 3",
    min: 25,
    lowStock: true,
  },
  {
    id: "ls-3",
    partNumber: "NAS1149F0363P",
    name: "Washer",
    qty: "Qty: 8",
    min: 30,
    lowStock: true,
  },
];

const recentParts: PartItem[] = [
  { id: "rp-1", partNumber: "SkyTec 149-NL", name: "Starter", qty: "Qty: 4" },
  { id: "rp-2", partNumber: "Champion REM37BY", name: "Spark Plug", qty: "Qty: 48" },
  { id: "rp-3", partNumber: "Aeroquip 303-4", name: "Hose Assy", qty: "Qty: 6" },
  { id: "rp-4", partNumber: "Mil-H-5606H", name: "Hydraulic Fluid", qty: "Qty: 12 gal" },
  { id: "rp-5", partNumber: "3M 2214-A1", name: "Adhesive", qty: "Qty: 3" },
];

// ---------------------------------------------------------------------------
// Parts Page
// ---------------------------------------------------------------------------

export default function Parts() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <IOSNavBar title="Parts" backHref="/more" backLabel="More">
        <IOSSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search parts..."
        />
      </IOSNavBar>

      <div className="pb-6 space-y-1">
        {/* Stats Row */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex gap-3">
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <div className="text-[24px] font-bold tabular-nums text-ios-label">
                1,247
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                Total Parts
              </div>
            </div>
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <div className="text-[24px] font-bold tabular-nums text-ios-red">
                23
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                Low Stock
              </div>
            </div>
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <div className="text-[24px] font-bold tabular-nums text-ios-blue">
                8
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                On Order
              </div>
            </div>
          </div>
        </div>

        {/* Parts List */}
        <IOSGroupedList
          sections={[
            {
              header: "Low Stock Alerts",
              items: lowStockParts.map((part) => (
                <IOSListRow
                  key={part.id}
                  title={`${part.partNumber} \u2014 ${part.name}`}
                  subtitle={`Min stock: ${part.min}`}
                  detail={
                    <span className="text-ios-red font-medium">{part.qty}</span>
                  }
                  icon={<Package className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-red"
                  accessory="disclosure"
                />
              )),
            },
            {
              header: "Recently Used",
              items: recentParts.map((part) => (
                <IOSListRow
                  key={part.id}
                  title={`${part.partNumber} \u2014 ${part.name}`}
                  detail={part.qty}
                  icon={<Package className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
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
              header: "Management",
              items: [
                <IOSListRow
                  key="receiving"
                  title="Receiving Inspection"
                  icon={<ClipboardCheck className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-green"
                  accessory="badge"
                  badgeCount={3}
                />,
                <IOSListRow
                  key="requests"
                  title="Part Requests"
                  icon={<FileText className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-orange"
                  accessory="badge"
                  badgeCount={7}
                />,
                <IOSListRow
                  key="tool-crib"
                  title="Tool Crib"
                  icon={<Wrench className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-purple"
                />,
                <IOSListRow
                  key="inventory"
                  title="Inventory Count"
                  icon={<BarChart3 className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-teal"
                />,
                <IOSListRow
                  key="core"
                  title="Core Tracking"
                  icon={<RotateCcw className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-indigo"
                />,
                <IOSListRow
                  key="shipping"
                  title="Shipping"
                  icon={<Truck className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-blue"
                />,
                <IOSListRow
                  key="rotables"
                  title="Rotables"
                  icon={<RotateCcw className="w-[17px] h-[17px]" />}
                  iconBg="bg-ios-orange"
                />,
                <IOSListRow
                  key="loaners"
                  title="Loaners"
                  icon={<HandHelping className="w-[17px] h-[17px]" />}
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
