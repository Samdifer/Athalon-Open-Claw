# Prospect Intelligence SANA Enrichment Plan

## Goal

Build a repeatable SANA-agent workflow that enriches each CRM prospect with verifiable open-source intelligence, then writes the results back into Prospect Intelligence with clickable links and source-backed contact data.

## Problems to Solve

- Website presence is currently binary in many records instead of being surfaced as a clickable URL.
- Contact coverage is incomplete across phone, email, and company-level web presence.
- Prospect entries do not yet hold people-level intelligence such as decision-maker names, titles, or role-specific contacts.
- The current research pack captures source provenance, but it is not structured for ongoing re-enrichment or field-by-field source verification.

## Recommended Agent Topology

### 1. Registry Match Agent

Purpose: Confirm the company identity against FAA repair station data and normalize the prospect entity before any web lookup.

Inputs:
- `entityId`
- legal name
- certificate number
- city/state

Outputs:
- canonical legal name
- canonical certificate reference
- identity confidence
- disambiguation notes

### 2. Official Web Discovery Agent

Purpose: Find the official website and the best click target for the business, not just a homepage guess.

Required outputs:
- `websiteUrl`
- `websiteStatus` (`verified`, `candidate`, `missing`)
- `websiteSourceUrl`
- `contactPageUrl`
- `careersPageUrl`
- `servicesPageUrl`

Guardrails:
- prefer official domains over directories, maps, and resellers
- require a source URL for every accepted website
- reject websites that do not match the company identity or location

### 3. Contact Channel Agent

Purpose: Extract and normalize top-level contact channels from the verified website and supporting public sources.

Required outputs:
- primary phone
- secondary phone(s)
- generic email(s)
- contact form URL
- street address confirmation

For each field:
- store the value
- store the exact source URL
- store a confidence score

### 4. People and Role Mapping Agent

Purpose: Find specific humans and their likely buying or operational roles.

Target roles:
- owner / president
- DOM / maintenance director
- QA manager
- avionics manager
- operations manager
- sales / customer-facing contact

Required outputs per person:
- `name`
- `title`
- `contactType` (`decision_maker`, `technical_buyer`, `gatekeeper`, `general_contact`)
- `email` if publicly available
- `phone` if publicly available
- `linkedinUrl` if relevant
- `sourceUrl`
- `confidence`

### 5. Verification and Merge Agent

Purpose: Compare all collected evidence, reject weak claims, and produce one CRM-safe prospect patch.

Rules:
- no field is promoted without at least one source URL
- person-level contact info must remain null if only inferred
- conflicting websites or people records stay in a review queue instead of overwriting trusted data
- agent must emit field-level confidence and a merge decision log

## Data Model Additions

Extend each prospect record with:

- `websiteUrl`
- `websiteSourceUrl`
- `contactPageUrl`
- `websiteLastVerifiedAt`
- `openSourceContacts[]`
- `contactChannels[]`
- `missingIntel[]`
- `fieldVerification[]`
- `lastEnrichedAt`
- `enrichmentRunId`

Suggested `openSourceContacts[]` shape:

```ts
type ProspectContact = {
  name: string | null;
  title: string | null;
  contactType: "decision_maker" | "technical_buyer" | "gatekeeper" | "general_contact";
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  sourceUrl: string;
  confidence: "high" | "medium" | "low";
};
```

## Workflow

1. Start with Tier A prospects, then Tier B, then manual-review records.
2. Run Registry Match Agent to lock identity.
3. Run Official Web Discovery Agent.
4. Run Contact Channel Agent against official pages first.
5. Run People and Role Mapping Agent using official pages plus high-trust external sources.
6. Run Verification and Merge Agent.
7. Write the enrichment snapshot to Convex and preserve every source link used.
8. Recompute `contactCompleteness`, `hasWebsite`, `hasEmail`, and `hasPhone`.

## UI Integration

The Prospect Intelligence detail page should consume the new fields in these sections:

- top contact action bar: clickable website, phone, email
- open-source contact coverage: verified company channels plus missing intel
- people and roles: named contacts with title, contact type, and source links
- provenance: field-level verification history

## Definition of Done

- Every prospect with a verified website shows a clickable URL in-app.
- Every promoted contact field has a stored source URL.
- People-level contacts appear only when source-backed.
- Missing data is explicit instead of implied by empty UI.
- Tier A prospects are fully enriched before broader rollout.

## Execution Order

1. Add Convex fields and ingestion path for enriched prospect metadata.
2. Build the SANA enrichment pipeline and verification output contract.
3. Run a pilot on Tier A prospects.
4. QA the pilot for false matches and stale links.
5. Roll forward to the rest of the research pack.
