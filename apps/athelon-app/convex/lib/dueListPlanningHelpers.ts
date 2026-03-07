const DAY_MS = 86_400_000;

export function toUtcDayStart(ts: number): number {
  const date = new Date(ts);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(startTs: number, endTs: number): number {
  return Math.ceil((toUtcDayStart(endTs) - toUtcDayStart(startTs)) / DAY_MS);
}

export function formatAircraftLabel(aircraft: any): string {
  return aircraft.currentRegistration ?? `${aircraft.make} ${aircraft.model} (${aircraft.serialNumber})`;
}

export function getAircraftTypeTokens(aircraft: any): string[] {
  const tokens = [
    `${aircraft.make} ${aircraft.model}`,
    `${aircraft.make} ${aircraft.model} ${aircraft.series ?? ""}`.trim(),
    aircraft.model,
  ];
  return Array.from(new Set(tokens.map((t) => t.trim()).filter(Boolean)));
}
