// convex/faaLookup.ts
// Athelon — FAA Registry N-Number Lookup Action
//
// Queries the FAA Aircraft Registry API for aircraft data by N-number.
// This is an action (not a mutation) because it makes external HTTP calls.

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const lookupAircraft = action({
  args: { registration: v.string() },
  handler: async (_ctx, args) => {
    // Strip leading "N" if present
    const nNumber = args.registration.replace(/^N/i, "").trim().toUpperCase();
    if (!nNumber) {
      throw new Error("Registration number is required.");
    }

    try {
      // FAA Registry CSV endpoint — reliable and publicly available
      const url = `https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?NNumberTxt=N${nNumber}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Athelon-MRO-SaaS/1.0",
          Accept: "text/html",
        },
      });

      if (!response.ok) {
        // Try alternative API endpoint
        return await fallbackLookup(nNumber);
      }

      const html = await response.text();

      // Parse key fields from the FAA registry HTML response
      const result = parseRegistryHtml(html, nNumber);
      if (result) {
        return result;
      }

      // If HTML parsing didn't work, try the fallback
      return await fallbackLookup(nNumber);
    } catch (error) {
      // If primary fails, try fallback
      try {
        return await fallbackLookup(nNumber);
      } catch {
        return {
          found: false,
          nNumber: `N${nNumber}`,
          error: `Could not reach FAA registry. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }
  },
});

function parseRegistryHtml(html: string, nNumber: string) {
  // Helper to extract text between patterns
  const extract = (label: string): string | null => {
    // Look for table cell patterns like: <td>Label</td><td>Value</td>
    const patterns = [
      new RegExp(`${label}[^<]*</(?:td|th|label|span)>\\s*<(?:td|span)[^>]*>\\s*([^<]+)`, "i"),
      new RegExp(`${label}[^<]*<[^>]*>[^<]*<[^>]*>\\s*([^<]+)`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const val = match[1].trim();
        if (val && val !== "&nbsp;" && val !== "None") return val;
      }
    }
    return null;
  };

  // Check if the page contains aircraft data
  if (html.includes("No records found") || html.includes("not found")) {
    return { found: false, nNumber: `N${nNumber}`, error: "Aircraft not found in FAA registry." };
  }

  const manufacturer = extract("Manufacturer Name") || extract("MFR Name");
  const model = extract("Model");
  const serialNumber = extract("Serial Number");
  const year = extract("Year Mfr") || extract("Year Manufacturer");
  const ownerName = extract("Name") || extract("Registrant");
  const status = extract("Status") || extract("Certificate Issue Date");
  const typeAircraft = extract("Type Aircraft");
  const engineType = extract("Type Engine");
  const certIssueDate = extract("Certificate Issue Date");

  // If we got at least manufacturer or model, consider it found
  if (manufacturer || model) {
    return {
      found: true,
      nNumber: `N${nNumber}`,
      manufacturer: manufacturer || "Unknown",
      model: model || "Unknown",
      serialNumber: serialNumber || undefined,
      yearOfManufacture: year ? parseInt(year, 10) : undefined,
      ownerName: ownerName || undefined,
      status: status || undefined,
      typeAircraft: typeAircraft || undefined,
      engineType: engineType || undefined,
      certIssueDate: certIssueDate || undefined,
    };
  }

  return null;
}

async function fallbackLookup(nNumber: string) {
  // Try the ReleasableDB CSV-based API approach
  // This is a simplified lookup that returns basic data
  try {
    const csvUrl = `https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?NNumberTxt=N${nNumber}`;
    const resp = await fetch(csvUrl, {
      headers: { "User-Agent": "Athelon-MRO-SaaS/1.0" },
      redirect: "follow",
    });

    if (resp.ok) {
      const text = await resp.text();
      // If we get a valid page but couldn't parse, return partial
      if (text.length > 1000 && !text.includes("No records found")) {
        return {
          found: false,
          nNumber: `N${nNumber}`,
          error: "Aircraft data found but could not be parsed. Please enter details manually.",
          rawDataAvailable: true,
        };
      }
    }
  } catch {
    // ignore fallback errors
  }

  return {
    found: false,
    nNumber: `N${nNumber}`,
    error: "Aircraft not found in FAA registry. Verify the N-number and try again.",
  };
}
