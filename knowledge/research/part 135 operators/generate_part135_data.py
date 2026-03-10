#!/usr/bin/env python3
"""
Aggregate FAA Part 135 Operators and Aircraft Excel data into a TypeScript static data file.

Input:  Part_135_Operators_and_Aircraft_5.xlsx (same directory)
Output: ../../apps/athelon-app/src/shared/data/part135Operators.ts

Usage:
    python3 generate_part135_data.py
"""

import json
import os
from collections import Counter
from pathlib import Path

import openpyxl

SCRIPT_DIR = Path(__file__).parent
EXCEL_PATH = SCRIPT_DIR / "Part_135_Operators_and_Aircraft_5.xlsx"
OUTPUT_PATH = (
    SCRIPT_DIR
    / ".."
    / ".."
    / ".."
    / "apps"
    / "athelon-app"
    / "src"
    / "shared"
    / "data"
    / "part135Operators.ts"
).resolve()

# Known turbine aircraft prefixes (FAA make/model/series patterns)
TURBINE_PREFIXES = [
    "BHT-",       # Bell helicopters (turbine)
    "CE-208",     # Cessna Caravan (turboprop)
    "CE-500",     # Cessna Citation series
    "CE-510",     # Citation Mustang
    "CE-525",     # CitationJet / CJ series
    "CE-550",     # Citation II/Bravo
    "CE-560",     # Citation V/Excel/XLS
    "CE-650",     # Citation III/VI/VII
    "CE-680",     # Citation Sovereign/Latitude
    "CE-700",     # Citation Continental
    "CE-750",     # Citation X
    "BD-100",     # Bombardier Challenger 300/350
    "BD-700",     # Bombardier Global series
    "CL-600",     # Bombardier Challenger 600/601/604/605/650
    "CL-30",      # Bombardier Learjet 30 series
    "CL-35",      # Bombardier Learjet 35
    "CL-45",      # Bombardier Learjet 45
    "CL-60",      # Bombardier Learjet 60
    "EMB-505",    # Embraer Phenom 300
    "EMB-500",    # Embraer Phenom 100
    "EMB-135",    # Embraer ERJ-135/Legacy
    "EMB-145",    # Embraer ERJ-145
    "AS-350",     # Airbus H125 (Eurocopter AStar)
    "EC-130",     # Airbus H130
    "ECD-EC135",  # Airbus H135
    "MBB-BK117",  # Airbus H145
    "SA-365",     # Airbus H155/H160
    "PC-12",      # Pilatus PC-12 (turboprop)
    "PC-24",      # Pilatus PC-24 (jet)
    "TBM-",       # Daher TBM series (turboprop)
    "BE-200",     # Beechcraft King Air 200/B200
    "BE-300",     # Beechcraft King Air 300/B300
    "BE-350",     # Beechcraft King Air 350
    "BE-400",     # Beechcraft Beechjet/Hawker 400
    "BE-390",     # Beechcraft Premier
    "HAWKER",     # Hawker 800/900 series
    "GVI",        # Gulfstream G650
    "GV-SP",      # Gulfstream G550
    "GIV-X",      # Gulfstream G450
    "GULFSTREAM", # Gulfstream (general)
    "G-IV",       # Gulfstream IV
    "G-V",        # Gulfstream V
    "G-200",      # Gulfstream G200
    "G-280",      # Gulfstream G280
    "HS-125",     # BAe 125 / Hawker
    "FALCON",     # Dassault Falcon
    "DA-900",     # Dassault Falcon 900
    "DA-2000",    # Dassault Falcon 2000
    "DA-50",      # Dassault Falcon 50
    "LR-",        # Learjet (legacy prefix)
    "S-76",       # Sikorsky S-76 (turbine helo)
    "S-92",       # Sikorsky S-92
    "AW-139",     # Leonardo AW139
    "AW109",      # Leonardo AW109
    "A-109",      # Leonardo A109
    "DHC-6",      # de Havilland Twin Otter (turboprop)
    "DHC-8",      # de Havilland Dash 8 (turboprop)
    "ATR-",       # ATR turboprop
    "PA-42",      # Piper Cheyenne (turboprop)
    "PA-46T",     # Piper Meridian (turboprop)
    "SW-",        # Swearingen/Fairchild Merlin/Metro (turboprop)
    "SA-227",     # Fairchild Metro (turboprop)
]


def is_turbine(model: str) -> bool:
    """Check if an aircraft model string indicates a turbine-powered aircraft."""
    upper = model.upper()
    return any(upper.startswith(p.upper()) for p in TURBINE_PREFIXES)


def classify_fleet_size(n: int) -> str:
    if n <= 3:
        return "small"
    if n <= 10:
        return "medium"
    if n <= 30:
        return "large"
    return "enterprise"


def assign_outreach_tier(fleet_size: int, has_turbine: bool) -> str:
    if fleet_size >= 10 and has_turbine:
        return "A"
    if fleet_size >= 4 or (fleet_size >= 2 and has_turbine):
        return "B"
    return "C"


def parse_excel():
    """Parse the Excel file and return grouped operator data."""
    wb = openpyxl.load_workbook(str(EXCEL_PATH), read_only=True)
    ws = wb["Part 135 Operators and Aircraft"]
    rows = list(ws.iter_rows(values_only=True))

    # Row 0 = title, Row 1 = headers, Row 2+ = data
    operators = {}
    for row in rows[2:]:
        cols = list(row) + [None] * 8  # pad for safety
        name = cols[0]
        designator = cols[1]
        cfr = cols[2]
        district = cols[3]
        reg_num = cols[4]
        serial = cols[5]
        model = cols[6]

        if not designator:
            continue

        designator = str(designator).strip()
        if designator not in operators:
            operators[designator] = {
                "legalName": str(name).strip() if name else designator,
                "faaDistrictOffice": str(district).strip() if district else "",
                "cfrBasis": set(),
                "registrationNumbers": [],
                "aircraftModels": [],
                "modelCounter": Counter(),
            }

        op = operators[designator]
        if cfr:
            op["cfrBasis"].add(str(cfr).strip())
        if reg_num:
            reg = str(reg_num).strip()
            if reg not in op["registrationNumbers"]:
                op["registrationNumbers"].append(reg)
        if model:
            m = str(model).strip()
            op["aircraftModels"].append(m)
            op["modelCounter"][m] += 1

    wb.close()
    return operators


def build_records(operators):
    """Build typed operator records from grouped data."""
    records = []
    for designator, op in sorted(operators.items(), key=lambda x: x[1]["legalName"]):
        fleet_size = len(op["registrationNumbers"])
        unique_models = sorted(set(op["aircraftModels"]))
        top_model = op["modelCounter"].most_common(1)[0][0] if op["modelCounter"] else None
        has_turbine = any(is_turbine(m) for m in unique_models)

        records.append({
            "entityId": designator,
            "legalName": op["legalName"],
            "certificateDesignator": designator,
            "faaDistrictOffice": op["faaDistrictOffice"],
            "fleetSize": fleet_size,
            "fleetSizeClass": classify_fleet_size(fleet_size),
            "registrationNumbers": sorted(op["registrationNumbers"]),
            "aircraftModels": unique_models,
            "uniqueModelCount": len(unique_models),
            "topModel": top_model,
            "hasTurbine": has_turbine,
            "cfrBasis": sorted(op["cfrBasis"]),
            "outreachTier": assign_outreach_tier(fleet_size, has_turbine),
            "website": None,
        })

    return records


def compute_pack_metadata(records):
    """Compute summary statistics for the research pack."""
    total = len(records)
    tiers = Counter(r["outreachTier"] for r in records)
    size_classes = Counter(r["fleetSizeClass"] for r in records)
    total_aircraft = sum(r["fleetSize"] for r in records)
    turbine_count = sum(1 for r in records if r["hasTurbine"])

    # Top models across all operators
    all_models = Counter()
    for r in records:
        for m in r["aircraftModels"]:
            all_models[m] += 1

    districts = Counter(r["faaDistrictOffice"] for r in records)

    return {
        "totalOperators": total,
        "totalAircraft": total_aircraft,
        "totalDistrictOffices": len(districts),
        "outreachTiers": {"A": tiers.get("A", 0), "B": tiers.get("B", 0), "C": tiers.get("C", 0)},
        "fleetSizeDistribution": {
            "small": size_classes.get("small", 0),
            "medium": size_classes.get("medium", 0),
            "large": size_classes.get("large", 0),
            "enterprise": size_classes.get("enterprise", 0),
        },
        "turbineOperators": turbine_count,
        "topModels": [
            {"model": m, "count": c} for m, c in all_models.most_common(10)
        ],
        "topDistrictOffices": [
            {"office": d, "count": c} for d, c in districts.most_common(10)
        ],
        "dataSource": "FAA Part 135 Operators and Aircraft",
        "dataAsOf": "2025-03-01",
        "dataUpdateNote": (
            "This dataset was last published by the FAA on 3/1/2025. "
            "The FAA 2026 operator list has not yet been released. "
            "Update this file when the FAA publishes updated data."
        ),
        "documentationRefs": [
            "knowledge/research/part 135 operators/Part_135_Operators_and_Aircraft_5.xlsx",
        ],
    }


def emit_typescript(records, pack_meta):
    """Write the TypeScript data file."""
    lines = []
    lines.append(
        "// Auto-generated from knowledge/research/part 135 operators/Part_135_Operators_and_Aircraft_5.xlsx"
    )
    lines.append(
        "// Regenerate by running: python3 knowledge/research/part\\ 135\\ operators/generate_part135_data.py"
    )
    lines.append(
        "//"
    )
    lines.append(
        "// NOTE: This dataset was last published by the FAA on 3/1/2025."
    )
    lines.append(
        "// The FAA 2026 operator list has not yet been released. Update this file when new data is available."
    )
    lines.append("")

    # Type definition
    lines.append("export type Part135OperatorRecord = {")
    lines.append('  entityId: string;')
    lines.append('  legalName: string;')
    lines.append('  certificateDesignator: string;')
    lines.append('  faaDistrictOffice: string;')
    lines.append('  fleetSize: number;')
    lines.append('  fleetSizeClass: "small" | "medium" | "large" | "enterprise";')
    lines.append('  registrationNumbers: string[];')
    lines.append('  aircraftModels: string[];')
    lines.append('  uniqueModelCount: number;')
    lines.append('  topModel: string | null;')
    lines.append('  hasTurbine: boolean;')
    lines.append('  cfrBasis: string[];')
    lines.append('  outreachTier: "A" | "B" | "C";')
    lines.append('  website: string | null;')
    lines.append("};")
    lines.append("")

    # Data array
    lines.append("export const part135Operators: Part135OperatorRecord[] = ")
    # Use json.dumps for the array, with indentation
    json_str = json.dumps(records, indent=2, ensure_ascii=False)
    lines.append(json_str + ";")
    lines.append("")

    # Pack metadata
    lines.append("export const part135ResearchPack = ")
    pack_json = json.dumps(pack_meta, indent=2, ensure_ascii=False)
    lines.append(pack_json + " as const;")
    lines.append("")

    content = "\n".join(lines)

    os.makedirs(OUTPUT_PATH.parent, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    return OUTPUT_PATH


def main():
    print(f"Reading: {EXCEL_PATH}")
    operators = parse_excel()
    print(f"Found {len(operators)} unique operators")

    records = build_records(operators)
    pack_meta = compute_pack_metadata(records)

    print(f"\nPack summary:")
    print(f"  Total operators: {pack_meta['totalOperators']}")
    print(f"  Total aircraft:  {pack_meta['totalAircraft']}")
    print(f"  District offices: {pack_meta['totalDistrictOffices']}")
    print(f"  Outreach tiers:  A={pack_meta['outreachTiers']['A']}, B={pack_meta['outreachTiers']['B']}, C={pack_meta['outreachTiers']['C']}")
    print(f"  Fleet sizes:     small={pack_meta['fleetSizeDistribution']['small']}, medium={pack_meta['fleetSizeDistribution']['medium']}, large={pack_meta['fleetSizeDistribution']['large']}, enterprise={pack_meta['fleetSizeDistribution']['enterprise']}")
    print(f"  Turbine ops:     {pack_meta['turbineOperators']}")

    output_path = emit_typescript(records, pack_meta)
    print(f"\nWrote: {output_path}")
    print("Done.")


if __name__ == "__main__":
    main()
