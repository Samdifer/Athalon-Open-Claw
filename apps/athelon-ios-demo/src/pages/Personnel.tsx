import { useState } from "react";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSearchBar } from "@/components/ios/IOSSearchBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";

// ---------------------------------------------------------------------------
// Initials avatar component
// ---------------------------------------------------------------------------

function InitialsAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-bold text-white ${color}`}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo personnel data
// ---------------------------------------------------------------------------

interface PersonnelEntry {
  id: string;
  name: string;
  role: string;
  detail: string;
  color: string;
}

const inspectors: PersonnelEntry[] = [
  { id: "i-1", name: "James Henderson", role: "IA \u2022 A&P", detail: "IA-2847561", color: "bg-ios-blue" },
  { id: "i-2", name: "Robert Kowalski", role: "IA \u2022 A&P", detail: "IA-1923847", color: "bg-ios-indigo" },
  { id: "i-3", name: "Patricia Morales", role: "IA \u2022 A&P", detail: "IA-3028174", color: "bg-ios-purple" },
];

const leadMechanics: PersonnelEntry[] = [
  { id: "l-1", name: "Michael Torres", role: "A&P Lead", detail: "Day Shift", color: "bg-ios-green" },
  { id: "l-2", name: "David Nakamura", role: "A&P Lead", detail: "Day Shift", color: "bg-ios-teal" },
  { id: "l-3", name: "Sarah Whitfield", role: "A&P Lead", detail: "Swing Shift", color: "bg-ios-orange" },
  { id: "l-4", name: "Anthony Brooks", role: "A&P Lead", detail: "Night Shift", color: "bg-ios-red" },
];

const mechanics: PersonnelEntry[] = [
  { id: "m-1", name: "Carlos Rivera", role: "Airframe Specialist", detail: "A&P", color: "bg-ios-blue" },
  { id: "m-2", name: "Jason Whitaker", role: "Powerplant Specialist", detail: "A&P", color: "bg-ios-green" },
  { id: "m-3", name: "Emily Chen", role: "Avionics Technician", detail: "A&P", color: "bg-ios-purple" },
  { id: "m-4", name: "Marcus Jennings", role: "Sheet Metal", detail: "A&P", color: "bg-ios-orange" },
  { id: "m-5", name: "Linda Okafor", role: "Composites & NDT", detail: "A&P", color: "bg-ios-teal" },
  { id: "m-6", name: "Tyler Benson", role: "Engine Overhaul", detail: "A&P", color: "bg-ios-indigo" },
  { id: "m-7", name: "Rachel Dominguez", role: "Hydraulics & Fuel", detail: "A&P", color: "bg-ios-red" },
  { id: "m-8", name: "Kevin Sturgill", role: "Propeller Shop", detail: "A&P", color: "bg-ios-blue" },
];

const apprentices: PersonnelEntry[] = [
  { id: "a-1", name: "Brandon Lee", role: "Apprentice \u2022 Year 2", detail: "Airframe", color: "bg-ios-gray" },
  { id: "a-2", name: "Samantha Cruz", role: "Apprentice \u2022 Year 1", detail: "Powerplant", color: "bg-ios-gray" },
  { id: "a-3", name: "Derek Holloway", role: "Apprentice \u2022 Year 3", detail: "General", color: "bg-ios-gray" },
];

// ---------------------------------------------------------------------------
// Personnel Page
// ---------------------------------------------------------------------------

export default function Personnel() {
  const [search, setSearch] = useState("");

  // Filter personnel across all groups
  const q = search.toLowerCase().trim();

  function filterGroup(group: PersonnelEntry[]): PersonnelEntry[] {
    if (!q) return group;
    return group.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q),
    );
  }

  const filteredInspectors = filterGroup(inspectors);
  const filteredLeads = filterGroup(leadMechanics);
  const filteredMechanics = filterGroup(mechanics);
  const filteredApprentices = filterGroup(apprentices);

  // Build sections only for groups that have results
  const sections: Array<{ header: string; items: React.ReactNode[] }> = [];

  if (filteredInspectors.length > 0) {
    sections.push({
      header: `Inspectors (IA) \u2014 ${filteredInspectors.length}`,
      items: filteredInspectors.map((p) => (
        <IOSListRow
          key={p.id}
          title={p.name}
          subtitle={p.role}
          detail={p.detail}
          icon={<InitialsAvatar name={p.name} color={p.color} />}
          iconBg="bg-transparent"
          accessory="disclosure"
        />
      )),
    });
  }

  if (filteredLeads.length > 0) {
    sections.push({
      header: `Lead Mechanics \u2014 ${filteredLeads.length}`,
      items: filteredLeads.map((p) => (
        <IOSListRow
          key={p.id}
          title={p.name}
          subtitle={p.role}
          detail={p.detail}
          icon={<InitialsAvatar name={p.name} color={p.color} />}
          iconBg="bg-transparent"
          accessory="disclosure"
        />
      )),
    });
  }

  if (filteredMechanics.length > 0) {
    sections.push({
      header: `Mechanics \u2014 ${filteredMechanics.length}`,
      items: filteredMechanics.map((p) => (
        <IOSListRow
          key={p.id}
          title={p.name}
          subtitle={p.role}
          detail={p.detail}
          icon={<InitialsAvatar name={p.name} color={p.color} />}
          iconBg="bg-transparent"
          accessory="disclosure"
        />
      )),
    });
  }

  if (filteredApprentices.length > 0) {
    sections.push({
      header: `Apprentices \u2014 ${filteredApprentices.length}`,
      items: filteredApprentices.map((p) => (
        <IOSListRow
          key={p.id}
          title={p.name}
          subtitle={p.role}
          detail={p.detail}
          icon={<InitialsAvatar name={p.name} color={p.color} />}
          iconBg="bg-transparent"
          accessory="disclosure"
        />
      )),
    });
  }

  return (
    <div>
      <IOSNavBar title="Personnel" backHref="/more" backLabel="More">
        <IOSSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search personnel..."
        />
      </IOSNavBar>

      <div className="pb-6 space-y-1">
        {/* Stats */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex gap-3">
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <div className="text-[24px] font-bold tabular-nums text-ios-blue">
                24
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                Total
              </div>
            </div>
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <div className="text-[24px] font-bold tabular-nums text-ios-green">
                18
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                On Duty
              </div>
            </div>
            <div className="ios-card flex-1 flex flex-col items-center py-3">
              <div className="text-[24px] font-bold tabular-nums text-ios-purple">
                6
              </div>
              <div className="text-[11px] font-medium text-ios-label-secondary mt-0.5">
                Certified IAs
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        {sections.length > 0 && <IOSGroupedList sections={sections} />}
      </div>
    </div>
  );
}
