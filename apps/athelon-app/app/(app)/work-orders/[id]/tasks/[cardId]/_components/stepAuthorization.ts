export type StepAuthorizationType =
  | "airframe"
  | "powerplant"
  | "inspection"
  | "ndt"
  | "borescope";

export const STEP_AUTHORIZATION_META: Record<
  StepAuthorizationType,
  {
    badgeLabel: string;
    requirementLabel: string;
    badgeClassName: string;
  }
> = {
  airframe: {
    badgeLabel: "Airframe",
    requirementLabel: "airframe rating",
    badgeClassName: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  powerplant: {
    badgeLabel: "Powerplant",
    requirementLabel: "powerplant rating",
    badgeClassName: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  inspection: {
    badgeLabel: "IA",
    requirementLabel: "IA authorization",
    badgeClassName: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  ndt: {
    badgeLabel: "NDT",
    requirementLabel: "NDT training",
    badgeClassName: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  borescope: {
    badgeLabel: "Borescope",
    requirementLabel: "borescope training",
    badgeClassName: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

const NDT_PATTERN =
  /\bndt\b|non[-\s]?destructive|eddy\s?current|ultrasonic|magnetic\s+particle|dye\s+penetrant|liquid\s+penetrant/i;
const BORESCOPE_PATTERN = /\bborescope\b|\bboroscope\b/i;
const POWERPLANT_PATTERN =
  /\bpowerplant\b|\bengine\b|\bturbine\b|\bcompressor\b|\bcombustor\b|\bhot section\b|\bpropeller\b|\bfuel nozzle\b/i;

export function resolveStepAuthorizationType(args: {
  description: string;
  signOffRequiresIa: boolean;
  specialToolReference?: string | null;
  aircraftSystem?: string | null;
}): StepAuthorizationType {
  const search = `${args.description} ${args.specialToolReference ?? ""}`.toLowerCase();

  if (BORESCOPE_PATTERN.test(search)) return "borescope";
  if (NDT_PATTERN.test(search)) return "ndt";
  if (args.signOffRequiresIa) return "inspection";

  if (
    args.aircraftSystem === "engine_left" ||
    args.aircraftSystem === "engine_right" ||
    args.aircraftSystem === "engine_center" ||
    args.aircraftSystem === "engine_single" ||
    POWERPLANT_PATTERN.test(search)
  ) {
    return "powerplant";
  }

  return "airframe";
}

export function buildAuthorizationMissingMessage(
  requiredType: StepAuthorizationType,
  currentRatings: string[],
): string {
  const requiredLabel = STEP_AUTHORIZATION_META[requiredType].requirementLabel;
  const current = currentRatings.length > 0 ? currentRatings.join(", ") : "none";
  return `This step requires ${requiredLabel} authorization. Your current ratings: [${current}]`;
}
