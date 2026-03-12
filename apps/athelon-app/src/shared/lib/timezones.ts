export const AVIATION_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET) — America/New_York" },
  { value: "America/Detroit", label: "Eastern (ET) — America/Detroit" },
  { value: "America/Indiana/Indianapolis", label: "Eastern (ET) — America/Indianapolis" },
  { value: "America/Chicago", label: "Central (CT) — America/Chicago" },
  { value: "America/Menominee", label: "Central (CT) — America/Menominee" },
  { value: "America/Denver", label: "Mountain (MT) — America/Denver" },
  { value: "America/Phoenix", label: "Mountain (no DST) — America/Phoenix" },
  { value: "America/Boise", label: "Mountain (MT) — America/Boise" },
  { value: "America/Los_Angeles", label: "Pacific (PT) — America/Los_Angeles" },
  { value: "America/Anchorage", label: "Alaska (AKT) — America/Anchorage" },
  { value: "America/Juneau", label: "Alaska (AKT) — America/Juneau" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST) — Pacific/Honolulu" },
  { value: "America/Puerto_Rico", label: "Atlantic (AST) — America/Puerto_Rico" },
  { value: "America/Toronto", label: "Eastern (ET) — America/Toronto" },
  { value: "America/Winnipeg", label: "Central (CT) — America/Winnipeg" },
  { value: "America/Edmonton", label: "Mountain (MT) — America/Edmonton" },
  { value: "America/Vancouver", label: "Pacific (PT) — America/Vancouver" },
  { value: "UTC", label: "UTC / Zulu" },
] as const;

export type AviationTimezone = (typeof AVIATION_TIMEZONES)[number]["value"];
