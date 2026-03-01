#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

function decodeJwtSub(token) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
  try {
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

function readUserIdFromAuthState() {
  const authFile = path.join(ROOT, "playwright/.auth/seeded-admin.json");
  if (!fs.existsSync(authFile)) return null;

  try {
    const state = JSON.parse(fs.readFileSync(authFile, "utf8"));
    const cookies = Array.isArray(state.cookies) ? state.cookies : [];
    const sessionCookie =
      cookies.find((c) => c?.name === "__session") ??
      cookies.find((c) => typeof c?.name === "string" && c.name.startsWith("__session_"));
    if (!sessionCookie?.value) return null;
    return decodeJwtSub(sessionCookie.value);
  } catch {
    return null;
  }
}

async function findClerkUserIdByEmail(email) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret || !email) return null;

  const url = `https://api.clerk.com/v1/users?limit=100&email_address[]=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;

  const users = await res.json();
  if (!Array.isArray(users)) return null;

  const target = email.trim().toLowerCase();
  for (const user of users) {
    const addresses = Array.isArray(user?.email_addresses) ? user.email_addresses : [];
    const match = addresses.some(
      (addr) => addr?.email_address?.trim?.().toLowerCase?.() === target,
    );
    if (match && typeof user.id === "string") {
      return user.id;
    }
  }

  return null;
}

function runConvex(functionName, args) {
  const argJson = JSON.stringify(args);
  const cmd = `npx convex run ${functionName} '${argJson}'`;
  return execSync(cmd, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
  }).trim();
}

async function main() {
  const scenarioKey = process.env.ATHELON_SCENARIO_KEY || "ATHELON-DEMO-KA-TBM-2LOC";

  let clerkUserId =
    process.env.PLAYWRIGHT_SEEDED_USER_ID ??
    process.env.PLAYWRIGHT_TEST_USER_ID ??
    process.env.ATHELON_SEED_CLERK_USER_ID ??
    null;

  if (!clerkUserId) {
    clerkUserId = readUserIdFromAuthState();
  }

  if (!clerkUserId) {
    clerkUserId = await findClerkUserIdByEmail(process.env.PLAYWRIGHT_SEEDED_EMAIL ?? "");
  }

  if (!clerkUserId) {
    throw new Error(
      "Unable to resolve Clerk user ID. Set ATHELON_SEED_CLERK_USER_ID or PLAYWRIGHT_SEEDED_USER_ID.",
    );
  }

  console.log(`Seeding repair-station scenario for Clerk user: ${clerkUserId}`);
  const seedOutput = runConvex("seedRepairStationScenario:seedKingAirTbmRepairStation", {
    clerkUserId,
    scenarioKey,
    targetOrgMode: "dedicated",
  });
  console.log(seedOutput);

  console.log("\nRunning coverage audit...");
  const coverageOutput = runConvex("seedAudit:getRepairStationSeedCoverage", { scenarioKey });
  console.log(coverageOutput);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
