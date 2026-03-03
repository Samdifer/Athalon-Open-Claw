export type AircraftType = {
  id: string;
  make: string;
  model: string;
  series?: string;
  category:
    | "single-engine"
    | "multi-engine"
    | "turboprop"
    | "light-jet"
    | "midsize-jet"
    | "large-jet"
    | "helicopter";
};

export type AircraftTypePackage = {
  id: string;
  name: string;
  manufacturer: string;
  aircraft: Omit<AircraftType, "id">[];
};

export const AIRCRAFT_TYPE_PACKAGES: AircraftTypePackage[] = [
  {
    id: "cessna-single",
    name: "Cessna Single-Engine",
    manufacturer: "Cessna",
    aircraft: [
      { make: "Cessna", model: "172", series: "Skyhawk", category: "single-engine" },
      { make: "Cessna", model: "182", series: "Skylane", category: "single-engine" },
      { make: "Cessna", model: "206", series: "Stationair", category: "single-engine" },
      { make: "Cessna", model: "208", series: "Caravan", category: "turboprop" },
    ],
  },
  {
    id: "beechcraft",
    name: "Beechcraft",
    manufacturer: "Beechcraft",
    aircraft: [
      { make: "Beechcraft", model: "King Air 350", category: "turboprop" },
      { make: "Beechcraft", model: "King Air 250", category: "turboprop" },
      { make: "Beechcraft", model: "Baron", series: "G58", category: "multi-engine" },
      { make: "Beechcraft", model: "Bonanza", series: "G36", category: "single-engine" },
    ],
  },
  {
    id: "cirrus",
    name: "Cirrus",
    manufacturer: "Cirrus",
    aircraft: [
      { make: "Cirrus", model: "SR20", category: "single-engine" },
      { make: "Cirrus", model: "SR22", category: "single-engine" },
      { make: "Cirrus", model: "SR22T", category: "single-engine" },
      { make: "Cirrus", model: "Vision Jet", series: "SF50", category: "light-jet" },
    ],
  },
  {
    id: "bombardier",
    name: "Bombardier",
    manufacturer: "Bombardier",
    aircraft: [
      { make: "Bombardier", model: "Challenger 300", category: "large-jet" },
      { make: "Bombardier", model: "Challenger 350", category: "large-jet" },
      { make: "Bombardier", model: "Global 6000", category: "large-jet" },
      { make: "Bombardier", model: "Learjet 75", category: "midsize-jet" },
    ],
  },
  {
    id: "embraer",
    name: "Embraer",
    manufacturer: "Embraer",
    aircraft: [
      { make: "Embraer", model: "Phenom 100", category: "light-jet" },
      { make: "Embraer", model: "Phenom 300", category: "light-jet" },
      { make: "Embraer", model: "Praetor 500", category: "midsize-jet" },
      { make: "Embraer", model: "Legacy 450", category: "midsize-jet" },
    ],
  },
  {
    id: "pilatus",
    name: "Pilatus",
    manufacturer: "Pilatus",
    aircraft: [
      { make: "Pilatus", model: "PC-12", category: "turboprop" },
      { make: "Pilatus", model: "PC-24", category: "light-jet" },
    ],
  },
];
