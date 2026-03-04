const TERM_DEFINITIONS = {
  TSOH: "Time Since Overhaul — hours/cycles since the last major overhaul.",
  TSO: "Technical Standard Order — FAA minimum performance standard for specified materials/parts.",
  TBO: "Time Between Overhaul — manufacturer-recommended service interval before overhaul.",
  TTAF: "Total Time Airframe — cumulative airframe time in service.",
  TTSN: "Time Since New — accumulated time since the component/aircraft was new.",
  MEL: "Minimum Equipment List — approved list of inoperative items allowed for dispatch.",
  CDL: "Configuration Deviation List — approved deviations from normal exterior configuration.",
  NEF: "Nonessential Equipment and Furnishings — items that may be inoperative under approved procedures.",
  AFM: "Aircraft Flight Manual — approved operating limitations and procedures.",
  POH: "Pilot's Operating Handbook — aircraft operating information for pilots.",
  "P/N": "Part Number — unique identifier assigned to a specific part configuration.",
  "S/N": "Serial Number — unique identifier for a specific physical unit.",
  "8130-3": "FAA Authorized Release Certificate / Airworthiness Approval Tag.",
  "EASA FORM 1": "EASA Authorized Release Certificate for parts/components.",
  "C OF C": "Certificate of Conformity — certifies the part conforms to required specs.",
  "14 CFR": "Title 14 of the Code of Federal Regulations governing aviation.",
  FAR: "Federal Aviation Regulations (commonly used term for 14 CFR).",
  AD: "Airworthiness Directive — legally enforceable corrective action from the authority.",
  SB: "Service Bulletin — manufacturer-issued maintenance or modification instruction.",
  STC: "Supplemental Type Certificate — approved major modification to type design.",
  PMA: "Parts Manufacturer Approval — FAA approval to produce replacement/modification parts.",
  TCDS: "Type Certificate Data Sheet — official type design and limitations reference.",
  ICA: "Instructions for Continued Airworthiness — required maintenance instructions.",
  NDT: "Non-Destructive Testing — inspection without damaging the part.",
  BORESCOPE: "Visual internal inspection using a borescope camera.",
  "EDDY CURRENT": "NDT method using electromagnetic induction to detect flaws.",
  "DYE PENETRANT": "NDT method where dye reveals surface-breaking defects.",
  RADIOGRAPHIC: "NDT method using X-ray/gamma imaging to inspect internal structure.",
  AOG: "Aircraft On Ground — aircraft grounded and unavailable for service.",
  ETA: "Estimated Time of Arrival or completion.",
  RTS: "Return To Service — approved release after maintenance completion.",
  WO: "Work Order — controlled package of maintenance tasks and records.",
  MRO: "Maintenance, Repair, and Overhaul operations.",
  FBO: "Fixed-Base Operator — airport service provider.",
  "A&P": "Airframe & Powerplant mechanic certificate.",
  IA: "Inspection Authorization — additional authority for certain inspections/approvals.",
  RIII: "Required Inspection Item — task requiring independent inspection signoff.",
  DAR: "Designated Airworthiness Representative — delegated authority for airworthiness functions.",
} as const

export const MRO_TERMS: string[] = Object.keys(TERM_DEFINITIONS)

const toCanonical = (word: string): string =>
  word
    .trim()
    .toUpperCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[()\[\],.;:!?]/g, "")
    .replace(/\s+/g, " ")

const collapseToken = (word: string): string =>
  toCanonical(word)
    .replace(/[\s\-/&]/g, "")

const TERM_LOOKUP = new Map<string, string>()

for (const term of MRO_TERMS) {
  const canonical = toCanonical(term)
  TERM_LOOKUP.set(canonical, term)
  TERM_LOOKUP.set(collapseToken(canonical), term)
}

export function isMroTerm(word: string): boolean {
  if (!word) return false
  const canonical = toCanonical(word)
  return TERM_LOOKUP.has(canonical) || TERM_LOOKUP.has(collapseToken(canonical))
}

export function getMroTermDefinition(term: string): string | undefined {
  if (!term) return undefined

  const canonical = toCanonical(term)
  const normalizedTerm =
    TERM_LOOKUP.get(canonical) ?? TERM_LOOKUP.get(collapseToken(canonical))

  if (!normalizedTerm) return undefined
  return TERM_DEFINITIONS[normalizedTerm as keyof typeof TERM_DEFINITIONS]
}
