type AircraftThumbnailInput = {
  registration?: string | null;
  make?: string | null;
  model?: string | null;
  series?: string | null;
  imageUrl?: string | null;
};

type PartThumbnailInput = {
  partNumber?: string | null;
  partName?: string | null;
  description?: string | null;
  serialNumber?: string | null;
  condition?: string | null;
  location?: string | null;
  isSerialized?: boolean;
  isLifeLimited?: boolean;
  isOwnerSupplied?: boolean;
  imageUrl?: string | null;
};

type AircraftKind =
  | "piston-high-wing"
  | "utility-turboprop"
  | "single-turboprop"
  | "twin-turboprop"
  | "helicopter"
  | "light-jet"
  | "business-jet"
  | "generic-aircraft";

type PartKind =
  | "fluid"
  | "filter"
  | "hardware"
  | "seal"
  | "landing-gear"
  | "propulsion"
  | "powerplant"
  | "avionics"
  | "airframe"
  | "tooling"
  | "generic-part";

type Palette = {
  from: string;
  to: string;
  accent: string;
  ink: string;
  surface: string;
  line: string;
};

const cache = new Map<string, string>();

const AIRCRAFT_PALETTES: Record<AircraftKind, Palette> = {
  "piston-high-wing": {
    from: "#d9f3ff",
    to: "#5f9dc9",
    accent: "#f5a531",
    ink: "#183247",
    surface: "#ffffff",
    line: "#9cd8f5",
  },
  "utility-turboprop": {
    from: "#ddf7ee",
    to: "#1b7e75",
    accent: "#f0b54d",
    ink: "#123b3d",
    surface: "#f9fffc",
    line: "#7fddc0",
  },
  "single-turboprop": {
    from: "#dfe7ff",
    to: "#4256c8",
    accent: "#ffd071",
    ink: "#1b2b62",
    surface: "#fbfcff",
    line: "#a3b8ff",
  },
  "twin-turboprop": {
    from: "#d9eff3",
    to: "#0e5567",
    accent: "#ffbf5b",
    ink: "#123845",
    surface: "#f7feff",
    line: "#8fd3dd",
  },
  helicopter: {
    from: "#fff0d5",
    to: "#cf8d36",
    accent: "#1f2d4a",
    ink: "#3b2614",
    surface: "#fffaf2",
    line: "#ffd08b",
  },
  "light-jet": {
    from: "#efe5ff",
    to: "#6153bc",
    accent: "#ff7e6b",
    ink: "#2b255d",
    surface: "#fcf9ff",
    line: "#bdaef8",
  },
  "business-jet": {
    from: "#e8edf5",
    to: "#1d2738",
    accent: "#d5b164",
    ink: "#1d2738",
    surface: "#fafcff",
    line: "#aebed2",
  },
  "generic-aircraft": {
    from: "#e9eef3",
    to: "#60748b",
    accent: "#ffb45c",
    ink: "#253648",
    surface: "#fbfcfd",
    line: "#bfd0df",
  },
};

const PART_PALETTES: Record<PartKind, Palette> = {
  fluid: {
    from: "#dff7ff",
    to: "#2990b5",
    accent: "#ffbe62",
    ink: "#103b4a",
    surface: "#f8fdff",
    line: "#90dbf4",
  },
  filter: {
    from: "#e5f6ea",
    to: "#2f7e51",
    accent: "#ffd677",
    ink: "#173a28",
    surface: "#fbfffc",
    line: "#9addb0",
  },
  hardware: {
    from: "#e9edf2",
    to: "#596a7a",
    accent: "#f0aa53",
    ink: "#24313d",
    surface: "#fafcfd",
    line: "#bcc8d2",
  },
  seal: {
    from: "#f4ebff",
    to: "#6f57bf",
    accent: "#ff8a67",
    ink: "#362462",
    surface: "#fcfaff",
    line: "#c6b6f6",
  },
  "landing-gear": {
    from: "#f1f6dd",
    to: "#6d8e2f",
    accent: "#ffc85d",
    ink: "#2f4316",
    surface: "#fbfef4",
    line: "#cae48e",
  },
  propulsion: {
    from: "#e3f7f4",
    to: "#177a7b",
    accent: "#ffd76b",
    ink: "#0d4042",
    surface: "#f7fffd",
    line: "#8bdcd4",
  },
  powerplant: {
    from: "#ffe6df",
    to: "#b45334",
    accent: "#2d3e6d",
    ink: "#4f2217",
    surface: "#fffaf8",
    line: "#f1ab93",
  },
  avionics: {
    from: "#e4eeff",
    to: "#3766c4",
    accent: "#ff9e67",
    ink: "#1f3565",
    surface: "#f9fbff",
    line: "#abc3ff",
  },
  airframe: {
    from: "#f5ede2",
    to: "#8b6a45",
    accent: "#3f8497",
    ink: "#43311d",
    surface: "#fffcf8",
    line: "#ddc49d",
  },
  tooling: {
    from: "#ebf0f8",
    to: "#546783",
    accent: "#ffd26d",
    ink: "#24334d",
    surface: "#fbfcff",
    line: "#b8c4d9",
  },
  "generic-part": {
    from: "#ebeff3",
    to: "#687989",
    accent: "#f0b15f",
    ink: "#2a3745",
    surface: "#fafcfd",
    line: "#c1ccd7",
  },
};

export function resolveAircraftThumbnailUrl(input: AircraftThumbnailInput): string {
  if (input.imageUrl?.trim()) return input.imageUrl;
  const key = [
    "aircraft",
    input.registration ?? "",
    input.make ?? "",
    input.model ?? "",
    input.series ?? "",
  ].join("|");
  return fromCache(key, () => buildAircraftSvg(input));
}

export function resolvePartThumbnailUrl(input: PartThumbnailInput): string {
  if (input.imageUrl?.trim()) return input.imageUrl;
  const key = [
    "part",
    input.partNumber ?? "",
    input.partName ?? "",
    input.serialNumber ?? "",
    input.condition ?? "",
    input.location ?? "",
    input.isSerialized ? "serialized" : "",
    input.isLifeLimited ? "llp" : "",
    input.isOwnerSupplied ? "owner" : "",
  ].join("|");
  return fromCache(key, () => buildPartSvg(input));
}

function fromCache(key: string, build: () => string) {
  const existing = cache.get(key);
  if (existing) return existing;
  const next = build();
  cache.set(key, next);
  return next;
}

function buildAircraftSvg(input: AircraftThumbnailInput): string {
  const kind = classifyAircraft(input.make, input.model);
  const colors = AIRCRAFT_PALETTES[kind];
  const hash = hashString(
    `${input.registration ?? ""}|${input.make ?? ""}|${input.model ?? ""}|${input.series ?? ""}`,
  );
  const title = clipText(input.registration?.toUpperCase() || "DEMO", 12);
  const subtitle = clipText(
    [input.make, input.model].filter(Boolean).join(" ").trim() || "Aircraft placeholder",
    28,
  );
  const detail = clipText(input.series || aircraftLabel(kind), 28);
  const flareX = 860 + (hash % 180);
  const flareY = 90 + (hash % 90);
  const stripeOffset = 12 + (hash % 24);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeXml(`${title} ${subtitle}`)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.from}" />
      <stop offset="100%" stop-color="${colors.to}" />
    </linearGradient>
    <radialGradient id="flare" cx="${flareX}" cy="${flareY}" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${colors.surface}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${colors.surface}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="haze" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${colors.surface}" stop-opacity="0.05" />
      <stop offset="100%" stop-color="${colors.surface}" stop-opacity="0.3" />
    </linearGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M 96 0 L 0 0 0 96" fill="none" stroke="${colors.line}" stroke-width="1.5" stroke-opacity="0.24" />
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="${colors.ink}" flood-opacity="0.22" />
    </filter>
  </defs>
  <rect width="1200" height="900" rx="48" fill="url(#bg)" />
  <rect width="1200" height="900" fill="url(#grid)" />
  <rect width="1200" height="900" fill="url(#flare)" />
  <path d="M0 640 C220 610 360 670 560 642 C760 614 910 548 1200 602 L1200 900 L0 900 Z" fill="${colors.ink}" opacity="0.09" />
  <path d="M0 724 C192 680 326 740 558 712 C814 680 966 594 1200 642 L1200 900 L0 900 Z" fill="url(#haze)" />
  <g opacity="0.45">
    <rect x="88" y="704" width="190" height="6" rx="3" fill="${colors.surface}" />
    <rect x="342" y="704" width="132" height="6" rx="3" fill="${colors.surface}" />
    <rect x="538" y="704" width="164" height="6" rx="3" fill="${colors.surface}" />
  </g>
  <g transform="translate(110 158)" filter="url(#shadow)">
    ${renderAircraftSilhouette(kind, colors, stripeOffset)}
  </g>
  <g>
    <rect x="72" y="64" width="244" height="44" rx="22" fill="${colors.ink}" fill-opacity="0.12" />
    <text x="98" y="92" font-family="Avenir Next, Segoe UI, sans-serif" font-size="24" font-weight="700" letter-spacing="2.2" fill="${colors.surface}">${escapeXml(aircraftLabel(kind).toUpperCase())}</text>
  </g>
  <text x="72" y="764" font-family="Avenir Next Condensed, Avenir Next, Segoe UI, sans-serif" font-size="92" font-weight="800" letter-spacing="4" fill="${colors.surface}">${escapeXml(title)}</text>
  <text x="72" y="822" font-family="Avenir Next, Segoe UI, sans-serif" font-size="34" font-weight="700" fill="${colors.surface}">${escapeXml(subtitle)}</text>
  <text x="72" y="862" font-family="Menlo, Consolas, monospace" font-size="22" letter-spacing="1.6" fill="${colors.surface}" fill-opacity="0.8">${escapeXml(detail)}</text>
</svg>`;

  return svgToDataUri(svg);
}

function buildPartSvg(input: PartThumbnailInput): string {
  const kind = classifyPart(input);
  const colors = PART_PALETTES[kind];
  const hash = hashString(
    `${input.partNumber ?? ""}|${input.partName ?? ""}|${input.serialNumber ?? ""}|${input.location ?? ""}`,
  );
  const title = clipText(input.partName || "Shop stock item", 30);
  const partNumber = clipText(input.partNumber?.toUpperCase() || "TEMP-PART", 24);
  const badge =
    input.isLifeLimited
      ? "LLP"
      : input.isOwnerSupplied
        ? "OWNER"
        : input.isSerialized
          ? "SERIAL"
          : readableLocation(input.location);
  const accentBand = 130 + (hash % 90);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeXml(`${partNumber} ${title}`)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.from}" />
      <stop offset="100%" stop-color="${colors.to}" />
    </linearGradient>
    <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.surface}" stop-opacity="0.98" />
      <stop offset="100%" stop-color="${colors.surface}" stop-opacity="0.82" />
    </linearGradient>
    <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse">
      <path d="M 52 0 L 0 0 0 52" fill="none" stroke="${colors.line}" stroke-width="1.2" stroke-opacity="0.34" />
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="${colors.ink}" flood-opacity="0.2" />
    </filter>
  </defs>
  <rect width="1200" height="900" rx="48" fill="url(#bg)" />
  <rect width="1200" height="900" fill="url(#grid)" opacity="0.6" />
  <rect x="0" y="${accentBand}" width="1200" height="18" fill="${colors.accent}" fill-opacity="0.92" />
  <g transform="translate(122 122)" filter="url(#shadow)">
    <rect x="0" y="0" width="520" height="520" rx="38" fill="${colors.surface}" fill-opacity="0.18" stroke="${colors.surface}" stroke-opacity="0.3" />
    ${renderPartIllustration(kind, colors)}
  </g>
  <g>
    <rect x="700" y="96" width="160" height="42" rx="21" fill="${colors.ink}" fill-opacity="0.14" />
    <text x="728" y="123" font-family="Avenir Next, Segoe UI, sans-serif" font-size="22" font-weight="700" letter-spacing="1.8" fill="${colors.surface}">${escapeXml(partLabel(kind).toUpperCase())}</text>
    <rect x="902" y="96" width="188" height="42" rx="21" fill="${colors.surface}" fill-opacity="0.2" />
    <text x="936" y="123" font-family="Menlo, Consolas, monospace" font-size="20" font-weight="700" letter-spacing="1.6" fill="${colors.surface}">${escapeXml(badge)}</text>
  </g>
  <rect x="650" y="616" width="482" height="178" rx="30" fill="url(#panel)" />
  <text x="698" y="690" font-family="Menlo, Consolas, monospace" font-size="30" font-weight="700" letter-spacing="1.4" fill="${colors.ink}">${escapeXml(partNumber)}</text>
  <text x="698" y="746" font-family="Avenir Next, Segoe UI, sans-serif" font-size="38" font-weight="800" fill="${colors.ink}">${escapeXml(title)}</text>
  <text x="698" y="794" font-family="Avenir Next, Segoe UI, sans-serif" font-size="22" font-weight="600" fill="${colors.ink}" fill-opacity="0.7">${escapeXml(partDescriptor(input))}</text>
</svg>`;

  return svgToDataUri(svg);
}

function classifyAircraft(make?: string | null, model?: string | null): AircraftKind {
  const text = `${make ?? ""} ${model ?? ""}`.toLowerCase();
  if (
    text.includes("bell") ||
    text.includes("robinson") ||
    text.includes("airbus helicopter") ||
    text.includes("helicopter") ||
    text.includes("206b")
  ) {
    return "helicopter";
  }
  if (
    text.includes("208") ||
    text.includes("caravan") ||
    text.includes("kodiak")
  ) {
    return "utility-turboprop";
  }
  if (
    text.includes("172") ||
    text.includes("182") ||
    text.includes("stationair") ||
    text.includes("skylane")
  ) {
    return "piston-high-wing";
  }
  if (
    text.includes("king air") ||
    text.includes("b200") ||
    text.includes("350") ||
    text.includes("250") ||
    text.includes("c90")
  ) {
    return "twin-turboprop";
  }
  if (
    text.includes("tbm") ||
    text.includes("pc-12") ||
    text.includes("pc12") ||
    text.includes("meridian") ||
    text.includes("m500") ||
    text.includes("m600")
  ) {
    return "single-turboprop";
  }
  if (
    text.includes("citation") ||
    text.includes("phenom") ||
    text.includes("learjet") ||
    text.includes("hondajet")
  ) {
    return "light-jet";
  }
  if (
    text.includes("gulfstream") ||
    text.includes("challenger") ||
    text.includes("falcon") ||
    text.includes("global")
  ) {
    return "business-jet";
  }
  return "generic-aircraft";
}

function classifyPart(input: PartThumbnailInput): PartKind {
  const text = `${input.partNumber ?? ""} ${input.partName ?? ""} ${input.description ?? ""}`.toLowerCase();
  if (
    text.includes("fluid") ||
    text.includes("oil") ||
    text.includes("sealant") ||
    text.includes("adhesive") ||
    text.includes("compound") ||
    text.includes("grease") ||
    text.includes("skydrol")
  ) {
    return "fluid";
  }
  if (text.includes("filter")) return "filter";
  if (
    text.includes("washer") ||
    text.includes("bolt") ||
    text.includes("nut") ||
    text.includes("rivet") ||
    text.includes("screw") ||
    text.includes("cotter") ||
    text.includes("pin")
  ) {
    return "hardware";
  }
  if (
    text.includes("o-ring") ||
    text.includes("oring") ||
    text.includes("gasket") ||
    text.includes("seal kit") ||
    text.includes("seal")
  ) {
    return "seal";
  }
  if (
    text.includes("brake") ||
    text.includes("wheel") ||
    text.includes("gear") ||
    text.includes("oleo") ||
    text.includes("actuator")
  ) {
    return "landing-gear";
  }
  if (
    text.includes("blade") ||
    text.includes("prop") ||
    text.includes("rotor") ||
    text.includes("governor") ||
    text.includes("hub")
  ) {
    return "propulsion";
  }
  if (
    text.includes("pt6") ||
    text.includes("engine") ||
    text.includes("igniter") ||
    text.includes("nozzle") ||
    text.includes("turbine") ||
    text.includes("fcu") ||
    text.includes("fuel pump") ||
    text.includes("starter generator") ||
    text.includes("generator") ||
    text.includes("torque sensor") ||
    text.includes("bleed valve") ||
    text.includes("exhaust")
  ) {
    return "powerplant";
  }
  if (
    text.includes("adc") ||
    text.includes("ahrs") ||
    text.includes("transponder") ||
    text.includes("nav/com") ||
    text.includes("nav") ||
    text.includes("servo") ||
    text.includes("module") ||
    text.includes("battery") ||
    text.includes("inverter") ||
    text.includes("light") ||
    text.includes("radar") ||
    text.includes("fan") ||
    text.includes("avionics")
  ) {
    return "avionics";
  }
  if (
    text.includes("pressure") ||
    text.includes("door") ||
    text.includes("deice") ||
    text.includes("trim") ||
    text.includes("latch") ||
    text.includes("control") ||
    text.includes("valve") ||
    text.includes("bushing")
  ) {
    return "airframe";
  }
  if (
    text.includes("tester") ||
    text.includes("wrench") ||
    text.includes("borescope") ||
    text.includes("multimeter") ||
    text.includes("caliper") ||
    text.includes("stand")
  ) {
    return "tooling";
  }
  return "generic-part";
}

function aircraftLabel(kind: AircraftKind): string {
  switch (kind) {
    case "piston-high-wing":
      return "Piston high wing";
    case "utility-turboprop":
      return "Utility turboprop";
    case "single-turboprop":
      return "Single turboprop";
    case "twin-turboprop":
      return "Twin turboprop";
    case "helicopter":
      return "Light helicopter";
    case "light-jet":
      return "Light jet";
    case "business-jet":
      return "Business jet";
    default:
      return "Demo fleet";
  }
}

function partLabel(kind: PartKind): string {
  switch (kind) {
    case "fluid":
      return "Fluids";
    case "filter":
      return "Filter";
    case "hardware":
      return "Hardware";
    case "seal":
      return "Seals";
    case "landing-gear":
      return "Gear and brakes";
    case "propulsion":
      return "Propulsion";
    case "powerplant":
      return "Powerplant";
    case "avionics":
      return "Avionics";
    case "airframe":
      return "Airframe";
    case "tooling":
      return "Tooling";
    default:
      return "Inventory";
  }
}

function partDescriptor(input: PartThumbnailInput): string {
  if (input.serialNumber) return `S/N ${clipText(input.serialNumber.toUpperCase(), 20)}`;
  if (input.isLifeLimited) return "Life-limited component";
  if (input.isOwnerSupplied) return "Owner supplied material";
  const location = readableLocation(input.location);
  if (location) return location;
  return "Temporary demo thumbnail";
}

function readableLocation(location?: string | null) {
  if (!location) return "";
  switch (location) {
    case "inventory":
      return "Inventory";
    case "installed":
      return "Installed";
    case "pending_inspection":
      return "Pending inspection";
    case "removed_pending_disposition":
      return "Removed";
    case "quarantine":
      return "Quarantine";
    case "scrapped":
      return "Scrapped";
    case "returned_to_vendor":
      return "RTV";
    default:
      return clipText(location.replace(/_/g, " "), 18);
  }
}

function renderAircraftSilhouette(kind: AircraftKind, colors: Palette, stripeOffset: number) {
  switch (kind) {
    case "helicopter":
      return `
        <g fill="${colors.ink}" fill-opacity="0.88">
          <path d="M190 338 C236 280 414 274 490 316 C525 336 538 365 534 395 C527 442 476 472 379 476 L282 478 C220 478 184 466 160 444 C128 414 133 376 190 338 Z" />
          <path d="M491 374 L744 358 L756 380 L501 404 Z" />
          <path d="M734 330 L798 312 L806 326 L752 352 Z" />
          <path d="M776 288 L792 220 L816 220 L804 290 Z" />
          <rect x="440" y="208" width="18" height="118" rx="9" />
          <rect x="226" y="182" width="438" height="14" rx="7" />
          <rect x="118" y="186" width="246" height="10" rx="5" transform="rotate(-8 118 186)" />
          <rect x="520" y="186" width="246" height="10" rx="5" transform="rotate(8 520 186)" />
          <rect x="212" y="500" width="224" height="18" rx="9" />
          <rect x="360" y="500" width="162" height="18" rx="9" />
          <rect x="232" y="426" width="18" height="90" rx="9" transform="rotate(12 232 426)" />
          <rect x="444" y="420" width="18" height="104" rx="9" transform="rotate(-10 444 420)" />
          <circle cx="808" cy="324" r="22" fill="${colors.accent}" />
        </g>
        <path d="M242 330 C280 298 416 294 472 322" fill="none" stroke="${colors.surface}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.28" />
      `;
    case "piston-high-wing":
      return `
        <g fill="${colors.ink}" fill-opacity="0.9">
          <path d="M174 396 C230 354 406 344 612 350 C684 352 742 362 806 384 L862 396 L892 410 L860 422 L806 428 C740 456 644 468 500 470 L280 470 C208 470 158 458 136 436 C112 414 124 398 174 396 Z" />
          <path d="M590 350 L670 266 L704 270 L670 356 Z" />
          <path d="M640 388 L740 352 L776 360 L680 404 Z" />
          <path d="M274 280 L612 280 L708 300 L258 300 Z" />
          <circle cx="132" cy="410" r="56" fill="${colors.surface}" fill-opacity="0.18" />
          <rect x="126" y="356" width="12" height="110" rx="6" fill="${colors.accent}" />
          <rect x="88" y="405" width="88" height="12" rx="6" fill="${colors.accent}" />
          <rect x="336" y="300" width="10" height="142" rx="5" transform="rotate(8 336 300)" />
          <rect x="548" y="300" width="10" height="144" rx="5" transform="rotate(-8 548 300)" />
          <rect x="300" y="420" width="18" height="86" rx="9" transform="rotate(8 300 420)" />
          <rect x="548" y="420" width="18" height="86" rx="9" transform="rotate(-7 548 420)" />
          <circle cx="322" cy="510" r="28" />
          <circle cx="562" cy="510" r="28" />
          <circle cx="454" cy="518" r="18" />
        </g>
        <path d="M208 392 C290 366 538 366 708 380" fill="none" stroke="${colors.surface}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.28" />
        <rect x="258" y="382" width="180" height="16" rx="8" fill="${colors.surface}" fill-opacity="0.18" />
      `;
    case "utility-turboprop":
      return `
        <g fill="${colors.ink}" fill-opacity="0.92">
          <path d="M150 398 C198 348 420 338 678 342 C792 344 876 360 946 392 L984 404 L1008 418 L982 430 L942 436 C868 466 752 482 552 486 L246 486 C190 486 148 472 126 450 C102 428 108 408 150 398 Z" />
          <path d="M650 342 L734 246 L774 252 L740 350 Z" />
          <path d="M706 388 L818 350 L852 356 L742 408 Z" />
          <path d="M282 266 L700 266 L838 296 L266 296 Z" />
          <circle cx="188" cy="400" r="58" fill="${colors.surface}" fill-opacity="0.18" />
          <rect x="182" y="344" width="12" height="112" rx="6" fill="${colors.accent}" />
          <rect x="142" y="396" width="92" height="12" rx="6" fill="${colors.accent}" />
          <rect x="400" y="296" width="12" height="170" rx="6" transform="rotate(8 400 296)" />
          <rect x="636" y="296" width="12" height="170" rx="6" transform="rotate(-8 636 296)" />
          <rect x="328" y="430" width="22" height="102" rx="11" transform="rotate(8 328 430)" />
          <rect x="658" y="430" width="22" height="102" rx="11" transform="rotate(-8 658 430)" />
          <circle cx="352" cy="542" r="34" />
          <circle cx="682" cy="540" r="34" />
        </g>
        <path d="M216 392 C320 360 682 362 866 382" fill="none" stroke="${colors.surface}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.26" />
        <rect x="274" y="378" width="220" height="18" rx="9" fill="${colors.surface}" fill-opacity="0.16" />
      `;
    case "single-turboprop":
      return `
        <g fill="${colors.ink}" fill-opacity="0.92">
          <path d="M184 402 C252 356 484 346 698 360 C768 364 816 378 874 402 L926 410 L956 424 L924 438 L864 444 C820 470 748 482 626 486 L364 486 C258 486 188 468 150 438 C124 418 136 402 184 402 Z" />
          <path d="M420 414 L602 292 L734 304 L608 432 Z" />
          <path d="M692 362 L792 298 L826 304 L762 386 Z" />
          <circle cx="154" cy="420" r="64" fill="${colors.surface}" fill-opacity="0.18" />
          <rect x="148" y="356" width="12" height="128" rx="6" fill="${colors.accent}" />
          <rect x="108" y="414" width="92" height="12" rx="6" fill="${colors.accent}" />
          <rect x="424" y="432" width="20" height="98" rx="10" transform="rotate(8 424 432)" />
          <circle cx="444" cy="536" r="30" />
        </g>
        <path d="M206 398 C290 370 566 366 760 380" fill="none" stroke="${colors.surface}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.26" />
      `;
    case "twin-turboprop":
      return `
        <g fill="${colors.ink}" fill-opacity="0.94">
          <path d="M176 404 C254 360 512 348 742 360 C826 364 890 380 956 410 L1000 420 L1024 434 L996 446 L948 452 C894 476 800 488 642 490 L320 490 C242 490 184 474 148 446 C122 426 126 410 176 404 Z" />
          <path d="M386 420 L540 294 L784 316 L620 436 Z" />
          <path d="M742 360 L842 292 L882 298 L806 392 Z" />
          <circle cx="420" cy="394" r="46" fill="${colors.surface}" fill-opacity="0.18" />
          <circle cx="692" cy="398" r="46" fill="${colors.surface}" fill-opacity="0.18" />
          <rect x="414" y="344" width="12" height="100" rx="6" fill="${colors.accent}" />
          <rect x="374" y="390" width="92" height="12" rx="6" fill="${colors.accent}" />
          <rect x="686" y="348" width="12" height="100" rx="6" fill="${colors.accent}" />
          <rect x="646" y="394" width="92" height="12" rx="6" fill="${colors.accent}" />
          <rect x="450" y="438" width="18" height="90" rx="9" transform="rotate(7 450 438)" />
          <rect x="698" y="436" width="18" height="90" rx="9" transform="rotate(-7 698 436)" />
          <circle cx="472" cy="536" r="28" />
          <circle cx="714" cy="530" r="28" />
        </g>
        <path d="M216 400 C324 366 680 366 902 390" fill="none" stroke="${colors.surface}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.24" />
      `;
    case "light-jet":
    case "business-jet":
      return `
        <g fill="${colors.ink}" fill-opacity="0.94">
          <path d="M172 420 C254 372 530 364 796 374 C858 376 920 388 990 420 L1050 430 L1086 444 L1048 456 L986 462 C928 484 822 494 650 494 L314 494 C238 494 184 480 148 454 C122 434 126 420 172 420 Z" />
          <path d="M476 430 L644 314 L770 326 L612 444 Z" />
          <path d="M778 382 L846 326 L878 330 L822 412 Z" />
          <rect x="768" y="396" width="88" height="34" rx="17" />
          <rect x="836" y="400" width="88" height="34" rx="17" />
          <rect x="518" y="450" width="16" height="80" rx="8" transform="rotate(8 518 450)" />
          <rect x="748" y="446" width="16" height="80" rx="8" transform="rotate(-8 748 446)" />
          <circle cx="530" cy="532" r="24" />
          <circle cx="760" cy="526" r="24" />
        </g>
        <path d="M206 416 C330 382 742 382 958 404" fill="none" stroke="${colors.surface}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.24" />
      `;
    default:
      return `
        <g fill="${colors.ink}" fill-opacity="0.9">
          <path d="M176 404 C244 360 484 350 710 364 C802 370 886 388 962 420 L1004 430 L1030 444 L998 456 L950 460 C872 486 764 494 610 494 L298 494 C224 494 176 482 142 456 C118 438 126 414 176 404 Z" />
          <path d="M420 422 L596 304 L772 320 L610 438 Z" />
          <circle cx="168" cy="420" r="56" fill="${colors.surface}" fill-opacity="0.16" />
          <rect x="162" y="362" width="12" height="116" rx="6" fill="${colors.accent}" />
          <rect x="122" y="414" width="92" height="12" rx="6" fill="${colors.accent}" />
          <rect x="462" y="440" width="18" height="88" rx="9" transform="rotate(7 462 440)" />
          <circle cx="482" cy="536" r="28" />
        </g>
      `;
  }
}

function renderPartIllustration(kind: PartKind, colors: Palette) {
  switch (kind) {
    case "fluid":
      return `
        <g transform="translate(78 44)">
          <rect x="136" y="56" width="124" height="76" rx="18" fill="${colors.ink}" />
          <rect x="96" y="116" width="204" height="282" rx="46" fill="${colors.ink}" />
          <path d="M198 166 C142 238 146 318 198 374 C250 318 254 238 198 166 Z" fill="${colors.accent}" />
          <rect x="116" y="244" width="164" height="14" rx="7" fill="${colors.surface}" fill-opacity="0.22" />
        </g>
      `;
    case "filter":
      return `
        <g transform="translate(82 68)">
          <ellipse cx="178" cy="116" rx="120" ry="38" fill="${colors.ink}" />
          <rect x="58" y="116" width="240" height="226" rx="34" fill="${colors.ink}" />
          <ellipse cx="178" cy="342" rx="120" ry="38" fill="${colors.ink}" />
          <g stroke="${colors.accent}" stroke-width="12" stroke-linecap="round">
            <line x1="102" y1="146" x2="102" y2="314" />
            <line x1="132" y1="138" x2="132" y2="322" />
            <line x1="162" y1="132" x2="162" y2="328" />
            <line x1="194" y1="132" x2="194" y2="328" />
            <line x1="224" y1="138" x2="224" y2="322" />
            <line x1="254" y1="146" x2="254" y2="314" />
          </g>
        </g>
      `;
    case "hardware":
      return `
        <g transform="translate(60 78)">
          <path d="M118 222 L196 144 L236 184 L158 262 L118 262 L118 222 Z" fill="${colors.accent}" />
          <rect x="178" y="164" width="212" height="64" rx="28" fill="${colors.ink}" transform="rotate(45 178 164)" />
          <path d="M270 256 L326 200 L382 256 L326 312 L270 312 L214 256 Z" fill="${colors.ink}" />
          <circle cx="326" cy="256" r="34" fill="${colors.surface}" fill-opacity="0.22" />
        </g>
      `;
    case "seal":
      return `
        <g transform="translate(70 74)">
          <circle cx="184" cy="214" r="118" fill="${colors.ink}" />
          <circle cx="184" cy="214" r="64" fill="${colors.surface}" fill-opacity="0.2" />
          <circle cx="314" cy="306" r="82" fill="${colors.accent}" />
          <circle cx="314" cy="306" r="38" fill="${colors.surface}" fill-opacity="0.22" />
        </g>
      `;
    case "landing-gear":
      return `
        <g transform="translate(76 54)">
          <circle cx="168" cy="344" r="72" fill="${colors.ink}" />
          <circle cx="168" cy="344" r="28" fill="${colors.surface}" fill-opacity="0.22" />
          <rect x="214" y="152" width="24" height="224" rx="12" fill="${colors.ink}" transform="rotate(16 214 152)" />
          <rect x="246" y="138" width="164" height="34" rx="17" fill="${colors.accent}" />
          <rect x="354" y="176" width="40" height="170" rx="20" fill="${colors.ink}" />
          <circle cx="374" cy="366" r="54" fill="${colors.ink}" />
          <circle cx="374" cy="366" r="18" fill="${colors.surface}" fill-opacity="0.24" />
        </g>
      `;
    case "propulsion":
      return `
        <g transform="translate(82 68)">
          <circle cx="178" cy="222" r="44" fill="${colors.ink}" />
          <path d="M178 92 C224 102 248 154 224 194 C202 174 162 170 136 190 C116 150 132 108 178 92 Z" fill="${colors.ink}" />
          <path d="M294 286 C248 302 194 276 178 232 C212 230 242 204 248 168 C288 188 314 238 294 286 Z" fill="${colors.accent}" />
          <path d="M76 284 C54 244 72 190 112 172 C122 206 150 232 184 236 C164 276 114 306 76 284 Z" fill="${colors.ink}" />
        </g>
      `;
    case "powerplant":
      return `
        <g transform="translate(78 64)">
          <circle cx="182" cy="224" r="128" fill="${colors.ink}" />
          <circle cx="182" cy="224" r="38" fill="${colors.accent}" />
          <g fill="${colors.surface}" fill-opacity="0.22">
            <path d="M182 112 L214 172 L182 190 L150 172 Z" />
            <path d="M282 174 L236 186 L222 154 L260 134 Z" />
            <path d="M282 274 L224 258 L236 226 L286 238 Z" />
            <path d="M182 336 L150 278 L182 260 L214 278 Z" />
            <path d="M82 274 L128 262 L142 294 L94 312 Z" />
            <path d="M82 174 L138 192 L126 224 L78 212 Z" />
          </g>
        </g>
      `;
    case "avionics":
      return `
        <g transform="translate(76 62)">
          <rect x="66" y="94" width="232" height="232" rx="34" fill="${colors.ink}" />
          <rect x="118" y="146" width="128" height="82" rx="16" fill="${colors.surface}" fill-opacity="0.2" />
          <path d="M126 254 C146 228 166 268 188 240 C206 216 224 248 240 236" fill="none" stroke="${colors.accent}" stroke-width="14" stroke-linecap="round" />
          <g stroke="${colors.ink}" stroke-width="18" stroke-linecap="round">
            <line x1="38" y1="134" x2="66" y2="134" />
            <line x1="38" y1="188" x2="66" y2="188" />
            <line x1="38" y1="242" x2="66" y2="242" />
            <line x1="298" y1="134" x2="326" y2="134" />
            <line x1="298" y1="188" x2="326" y2="188" />
            <line x1="298" y1="242" x2="326" y2="242" />
          </g>
        </g>
      `;
    case "airframe":
      return `
        <g transform="translate(74 76)">
          <rect x="56" y="120" width="272" height="180" rx="34" fill="${colors.ink}" />
          <path d="M126 212 L236 130 L292 144 L224 246 Z" fill="${colors.accent}" />
          <rect x="106" y="330" width="178" height="34" rx="17" fill="${colors.ink}" />
          <rect x="256" y="286" width="42" height="110" rx="18" fill="${colors.ink}" />
          <circle cx="278" cy="412" r="32" fill="${colors.accent}" />
        </g>
      `;
    case "tooling":
      return `
        <g transform="translate(74 66)">
          <path d="M124 118 C160 82 220 82 256 112 L216 152 L246 182 C278 152 332 152 364 184 C326 220 326 274 364 310 C332 342 278 342 246 312 L146 412 C126 432 94 432 74 412 C54 392 54 360 74 340 L174 240 C144 208 132 162 124 118 Z" fill="${colors.ink}" />
          <rect x="248" y="90" width="128" height="176" rx="24" fill="${colors.accent}" />
          <rect x="278" y="126" width="68" height="54" rx="12" fill="${colors.surface}" fill-opacity="0.22" />
        </g>
      `;
    default:
      return `
        <g transform="translate(78 74)">
          <rect x="78" y="104" width="228" height="220" rx="34" fill="${colors.ink}" />
          <rect x="130" y="156" width="124" height="112" rx="20" fill="${colors.surface}" fill-opacity="0.18" />
          <path d="M78 164 L194 92 L306 164" fill="${colors.accent}" />
        </g>
      `;
  }
}

function clipText(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function hashString(value: string) {
  let hash = 0;
  for (let idx = 0; idx < value.length; idx += 1) {
    hash = (hash * 31 + value.charCodeAt(idx)) >>> 0;
  }
  return hash;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s+/g, "\n").trim())}`;
}
