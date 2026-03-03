export type TimelineCursor = {
  id: string;
  label: string;
  dayOffset: number; // positive = future, negative = past, 0 = today
  color: string; // Tailwind bg class
  enabled: boolean;
};

export type CursorPreset = {
  id: string;
  name: string;
  description: string;
  cursors: Omit<TimelineCursor, "id">[];
};

export const CURSOR_COLORS: string[] = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
];

export const CURSOR_PRESETS: CursorPreset[] = [
  {
    id: "standard-planning",
    name: "Standard Planning Horizons",
    description: "Common planning milestones for day-to-day scheduling",
    cursors: [
      { label: "This Week", dayOffset: 0, color: "bg-emerald-500", enabled: true },
      { label: "2-Week Out", dayOffset: 14, color: "bg-amber-500", enabled: true },
      { label: "30-Day Horizon", dayOffset: 30, color: "bg-sky-500", enabled: true },
      { label: "90-Day Planning", dayOffset: 90, color: "bg-violet-500", enabled: false },
    ],
  },
  {
    id: "aog-rush",
    name: "AOG / Rush Priority",
    description: "Short-horizon markers for urgent and AOG turnarounds",
    cursors: [
      { label: "24-Hour Rush", dayOffset: 1, color: "bg-red-500", enabled: true },
      { label: "48-Hour AOG", dayOffset: 2, color: "bg-orange-500", enabled: true },
      { label: "1-Week Target", dayOffset: 7, color: "bg-amber-500", enabled: true },
    ],
  },
  {
    id: "heavy-check",
    name: "Heavy Check Milestones",
    description: "Key milestones for heavy maintenance checks",
    cursors: [
      { label: "Induction", dayOffset: 0, color: "bg-sky-500", enabled: true },
      { label: "Parts Cutoff", dayOffset: 14, color: "bg-amber-500", enabled: true },
      { label: "Mid-Check Review", dayOffset: 21, color: "bg-violet-500", enabled: true },
      { label: "RTS Target", dayOffset: 42, color: "bg-emerald-500", enabled: true },
    ],
  },
];
