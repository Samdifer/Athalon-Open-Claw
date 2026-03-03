export type RosterFocus = {
  dateMode: "today" | "focus";
  focusDateMs: number;
  focusDateKey: string;
  focusDay: number;
  observedHoliday:
    | {
        id: string;
        name: string;
        dateKey: string;
      }
    | null;
};

export type RosterShiftRow = {
  shiftId: string;
  name: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  teamCount: number;
  activeToday: boolean;
  sortOrder: number;
};

export type RosterTeamRow = {
  teamId: string;
  name: string;
  colorToken: string;
  shiftId: string;
  shiftName?: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  memberCount: number;
  onShiftCount: number;
  hasSupervisorCoverage: boolean;
  isUnsupervised: boolean;
};

export type RosterTechnicianRow = {
  technicianId: string;
  name: string;
  employeeId?: string;
  role?: string;
  teamId?: string;
  teamName?: string;
  teamColorToken?: string;
  shiftId?: string;
  shiftName?: string;
  shiftSource: "technician_override" | "team_shift" | "org_default";
  usingDefaultShift: boolean;
  usingTeamShift: boolean;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  isSupervisor: boolean;
  isOnShiftToday: boolean;
  assignedActiveCards: number;
  estimatedRemainingHours: number;
};

export type RosterHolidayRow = {
  _id: string;
  shopLocationId?: string;
  dateKey: string;
  name: string;
  isObserved: boolean;
  notes?: string;
};

export type RosterAnalysis = {
  activeTechnicians: number;
  activeTeams: number;
  unsupervisedTeams: number;
  onShiftTechnicians: number;
  assignedCards: number;
  remainingHours: number;
  averageEfficiency: number;
  supervisorCoveragePercent: number;
};

export type RosterWorkspaceViewModel = {
  feature: {
    rosterWorkspaceEnabled: boolean;
    rosterWorkspaceBootstrappedAt?: number;
  };
  focus: RosterFocus;
  shifts: RosterShiftRow[];
  teams: RosterTeamRow[];
  technicians: RosterTechnicianRow[];
  holidays: RosterHolidayRow[];
  analysis: RosterAnalysis;
};
