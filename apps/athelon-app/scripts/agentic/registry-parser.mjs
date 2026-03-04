#!/usr/bin/env node

import fs from "node:fs";

export const REGISTRY_A_HEADING = "## Registry A — Master Features";
export const REGISTRY_B_HEADING = "## Registry B — Atomic Features";

export function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function formatRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

export function findHeadingIndex(lines, headingPrefix) {
  return lines.findIndex((line) => line.trim().startsWith(headingPrefix));
}

export function getTableRange(lines, headingPrefix, headerPrefix) {
  const headingIndex = findHeadingIndex(lines, headingPrefix);
  if (headingIndex === -1) {
    throw new Error(`Heading not found: ${headingPrefix}`);
  }

  let i = headingIndex + 1;
  while (i < lines.length && !lines[i].trim().startsWith(headerPrefix)) {
    i += 1;
  }
  if (i >= lines.length) {
    throw new Error(`Table header not found under heading: ${headingPrefix}`);
  }

  const header = splitRow(lines[i]);
  const dividerIndex = i + 1;
  if (!lines[dividerIndex] || !lines[dividerIndex].trim().startsWith("|")) {
    throw new Error(`Malformed markdown table under heading: ${headingPrefix}`);
  }

  let dataStart = i + 2;
  let dataEnd = dataStart;
  while (dataEnd < lines.length && lines[dataEnd].trim().startsWith("|")) {
    dataEnd += 1;
  }

  return {
    headingIndex,
    headerIndex: i,
    dividerIndex,
    dataStart,
    dataEnd,
    header,
  };
}

export function tableRowsToObjects(lines, table) {
  const rows = [];
  for (let i = table.dataStart; i < table.dataEnd; i += 1) {
    const cells = splitRow(lines[i]);
    if (cells.length !== table.header.length) continue;
    const row = {};
    for (let c = 0; c < table.header.length; c += 1) {
      row[table.header[c]] = cells[c];
    }
    row.__lineIndex = i;
    rows.push(row);
  }
  return rows;
}

export function parseMasterSpec(masterPath) {
  const lines = fs.readFileSync(masterPath, "utf8").split(/\r?\n/);
  const registryATable = getTableRange(lines, REGISTRY_A_HEADING, "| fs_id |");
  const registryBTable = getTableRange(lines, REGISTRY_B_HEADING, "| mbp_id |");

  const registryARows = tableRowsToObjects(lines, registryATable);
  const registryBRows = tableRowsToObjects(lines, registryBTable);

  return {
    lines,
    registryATable,
    registryBTable,
    registryARows,
    registryBRows,
  };
}

export function safeJsonArray(cell) {
  if (!cell || cell === "[]" || cell === "—") return [];
  try {
    const parsed = JSON.parse(cell);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFsLinks(fsLinksCell) {
  if (!fsLinksCell || fsLinksCell === "—") return [];
  return fsLinksCell
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^FS-\d{4}$/.test(item));
}

export function cleanCell(value) {
  const out = String(value ?? "—")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "/")
    .trim();
  return out || "—";
}

export function tableHeaderIndexMap(header) {
  const map = new Map();
  header.forEach((name, idx) => map.set(name, idx));
  return map;
}

export function applyRowUpdates(lines, table, keyColumn, updatesById) {
  const headerIndex = tableHeaderIndexMap(table.header);
  const keyIndex = headerIndex.get(keyColumn);
  if (typeof keyIndex !== "number") {
    throw new Error(`Key column ${keyColumn} not found in table`);
  }

  let touched = 0;
  for (let i = table.dataStart; i < table.dataEnd; i += 1) {
    const cells = splitRow(lines[i]);
    const rowKey = cells[keyIndex];
    const update = updatesById.get(rowKey);
    if (!update) continue;

    for (const [column, value] of Object.entries(update)) {
      const colIdx = headerIndex.get(column);
      if (typeof colIdx !== "number") continue;
      cells[colIdx] = cleanCell(value);
    }

    lines[i] = formatRow(cells);
    touched += 1;
  }

  return touched;
}

export function writeMasterSpec(masterPath, lines) {
  fs.writeFileSync(masterPath, `${lines.join("\n")}\n`, "utf8");
}

export function loadCrosswalkGroupStatuses(crosswalkPath) {
  if (!fs.existsSync(crosswalkPath)) return new Map();
  const lines = fs.readFileSync(crosswalkPath, "utf8").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === "## Group Rollup");
  if (headingIndex === -1) return new Map();

  let i = headingIndex + 1;
  while (i < lines.length && !lines[i].trim().startsWith("| Group ID |")) i += 1;
  if (i >= lines.length) return new Map();

  i += 2;
  const map = new Map();
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const cells = splitRow(lines[i]);
    if (cells.length >= 4 && /^GRP-\d{3}$/.test(cells[0])) {
      map.set(cells[0], {
        group_id: cells[0],
        group_name: cells[1],
        target_wave: cells[2],
        rollup_status: cells[3],
      });
    }
    i += 1;
  }

  return map;
}

export function buildMbpIndex(registryBRows) {
  const map = new Map();
  for (const row of registryBRows) {
    map.set(row.mbp_id, row);
  }
  return map;
}

export function buildFsIndex(registryARows) {
  const map = new Map();
  for (const row of registryARows) {
    map.set(row.fs_id, row);
  }
  return map;
}

export function getMbpDependencies(row) {
  return safeJsonArray(row.dependencies);
}
