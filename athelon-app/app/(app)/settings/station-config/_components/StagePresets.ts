export type WorkStage = {
  id: string;
  label: string;
  description: string;
  color: string; // Tailwind bg class like "bg-blue-500"
  sortOrder: number;
};

export type StagePreset = {
  id: string;
  name: string;
  description: string;
  stages: Omit<WorkStage, "id" | "sortOrder">[];
};

export const STAGE_COLORS: string[] = [
  "bg-slate-500",
  "bg-gray-500",
  "bg-zinc-500",
  "bg-neutral-500",
  "bg-stone-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

export const STAGE_PRESETS: StagePreset[] = [
  {
    id: "standard-mro",
    name: "Standard MRO",
    description: "Standard Part 145 repair station workflow",
    stages: [
      { label: "Quoting", description: "Customer quote preparation and approval", color: "bg-slate-500" },
      { label: "In-Dock", description: "Aircraft received and inducted into shop", color: "bg-sky-500" },
      { label: "Inspection", description: "Initial and progressive inspections", color: "bg-amber-500" },
      { label: "Repair", description: "Active maintenance and repair work", color: "bg-blue-500" },
      { label: "Return to Service", description: "Final inspection, paperwork, and RTS sign-off", color: "bg-emerald-500" },
      { label: "Review & Improvement", description: "Post-completion review and process improvement", color: "bg-violet-500" },
    ],
  },
  {
    id: "heavy-maintenance",
    name: "Heavy Maintenance",
    description: "Extended workflow for heavy checks and overhauls",
    stages: [
      { label: "Quote & Intake", description: "Scope definition and customer approval", color: "bg-slate-500" },
      { label: "Induction", description: "Aircraft received, access panels opened", color: "bg-sky-500" },
      { label: "Structural Inspection", description: "Detailed structural survey", color: "bg-amber-500" },
      { label: "NDT/DT", description: "Non-destructive and destructive testing", color: "bg-orange-500" },
      { label: "Repair & Modification", description: "Structural repairs and SB compliance", color: "bg-blue-500" },
      { label: "Systems Test", description: "Functional checks and operational tests", color: "bg-indigo-500" },
      { label: "Paint", description: "Strip, prime, and paint", color: "bg-purple-500" },
      { label: "RTS", description: "Return to service certification", color: "bg-emerald-500" },
      { label: "Final QA", description: "Quality assurance review and records close-out", color: "bg-teal-500" },
    ],
  },
  {
    id: "line-maintenance",
    name: "Line Maintenance",
    description: "Simplified workflow for quick-turn line work",
    stages: [
      { label: "Intake", description: "Aircraft received on ramp", color: "bg-sky-500" },
      { label: "Service", description: "Scheduled or unscheduled maintenance", color: "bg-blue-500" },
      { label: "RTS", description: "Return to service", color: "bg-emerald-500" },
    ],
  },
  {
    id: "component-overhaul",
    name: "Component Overhaul",
    description: "Workflow for component/engine shop work",
    stages: [
      { label: "Teardown", description: "Disassembly and cleaning", color: "bg-slate-500" },
      { label: "Inspection", description: "Dimensional and visual inspection", color: "bg-amber-500" },
      { label: "Parts Order", description: "Replacement parts procurement", color: "bg-orange-500" },
      { label: "Repair/Replace", description: "Component repair or replacement", color: "bg-blue-500" },
      { label: "Assembly", description: "Reassembly per manufacturer specs", color: "bg-indigo-500" },
      { label: "Test", description: "Functional and performance testing", color: "bg-cyan-500" },
      { label: "Certification", description: "8130-3 tag and documentation", color: "bg-emerald-500" },
    ],
  },
];
