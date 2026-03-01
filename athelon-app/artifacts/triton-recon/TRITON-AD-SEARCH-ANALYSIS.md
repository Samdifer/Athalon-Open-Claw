# Triton Aviation Data — AD Search Feature Analysis

**Source:** https://tritonaviationdata.com
**Date Captured:** 2026-03-01
**Purpose:** Document Triton's AD search features to inform Athelon feature development

---

## Platform Overview

Triton Aviation Data is a subscription-based "Complete Small Aircraft IA Library" that has been operating since 2007. It serves IAs (Inspection Authorization holders) and FAA Part 145 Certified Repair Stations with access to Airworthiness Directives, Service Bulletins, Type Certificates, FARs, Advisory Circulars, and editable FAA forms.

**Key stats:**
- 376,610 searchable documents
- 82,179+ Supplemental Type Certificates indexed
- 90,000+ small aircraft AD-related service bulletins
- Daily updates
- Pricing: $398/yr for 2 users

---

## Subscriber Dashboard

The main dashboard after login (`/html/access.html`) presents a grid of feature cards:

| Feature | Description |
|---------|-------------|
| **Make/Model Search** | AD search by airframe make and model |
| **Aircraft Profiles** | Save AD/SB/Prop profiles by N-number |
| **Appliance** | Search ADs for aircraft appliances |
| **Single AD** | Look up a specific AD by number |
| **Full Text Search** | Search the entire AD library by text |
| **Old AD Search** | Legacy AD search tools |
| **FARs** | Federal Aviation Regulations (links to eCFR) |
| **Type Certificates** | TCDS lookup |
| **Service Bulletins** | Indexed by manufacturer |
| **Advisory Circulars** | 100+ maintenance ACs |
| **Tips & Tricks** | Usage guides |
| **FAA Forms** | Editable FAA form collection |
| **Video Tutorials** | How-to videos |
| **News** | Announcements |

**Sub-navigation bar** (persistent across all library pages):
Make/Model Search | Aircraft Profiles | FARs | STCs | Type Certificates | Service Bulletins | Advisory Circulars

---

## Core AD Search Features

### 1. Make/Model AD Search
**URL:** `b.tritonaviationdata.com/subscribers/makemodel.php`

The primary AD search tool. Multi-step workflow:

**Step 1:** Select a group category via buttons:
- **Airframe** (Small Aircraft)
- **Engine**
- **Propeller**
- **Appliance**

**Step 2:** (After selecting group) Select specific make/model from a list.

**Step 3:** System generates an AD compliance summary for that make/model.

**Key design details:**
- Combines "Series" and "Model" ADs into a single summary (e.g., selecting "Cessna 172D" returns all 172 Series ADs + 172D-specific ADs)
- Goes to "dash number" level (based on FAA Type Certificate Data Sheets)
- **Recent Searches** sidebar shows previously searched models (e.g., "Textron Aviation-Cessna 172M", "Piper Aircraft Corp. PA-22-160")
- Has a "Help" button with usage guidance
- Links to "old version of search" for legacy workflow
- Model identifiers use numeric format: `execute?ModelNo=11-145-7826-7826`

**Data model insight:** Models are identified by a compound numeric ID that encodes group-manufacturer-model-variant. The URL pattern `execute?ModelNo=XX-XXX-XXXX-XXXX` suggests a hierarchical categorization system.

---

### 2. Appliance AD Search
**URL:** `b.tritonaviationdata.com/subscribers/appliance_ads.php`

A massive alphabetical index of aircraft appliance categories. Each appliance type has a table with checkboxes (`ADX[]` array) to select specific ADs.

**UI pattern:**
- 234 tables of appliance categories listed alphabetically
- Each table row is a specific appliance AD with a checkbox
- "Submit" and "Reset" buttons at top
- "Display Only Selected ADs" button to filter
- User checks appliances of interest, then submits to view relevant ADs

**Scale:** This is the largest page in the system — the full-page screenshot is 97,000+ pixels tall, indicating hundreds of appliance categories with multiple ADs each.

---

### 3. Single AD Lookup
**URL:** `b.tritonaviationdata.com/subscribers/singlead.php`

Simple direct lookup by document ID.

**Form:**
- Single text input: "Enter Document ID"
- Searches: ADs, TCDS, NPRM, and other document types
- AD format: `1999-15-05` (no "AD" prefix needed)
- TCDS format: `1A3`
- Action: `POST /subscribers/singlead.php/search`

**Use case:** When a technician already knows the specific AD number they need to reference.

---

### 4. Full Text AD Search ("AirResearch Search Engine")
**URL:** `b.tritonaviationdata.com/subscribers/fullsearch.php`

Full-text search across all 376,610 documents.

**Form:**
- Text input: "Search for" (free text query)
- Category dropdown with 10 options:
  1. All categories
  2. Airworthiness Directives
  3. Service Bulletins
  4. FAR's and CAR's
  5. Advisory Circulars
  6. Type Certificate data sheets
  7. Notices of Proposed Rule Making
  8. Order
  9. SAIB documents
  10. EASA ADs

**Examples shown:**
- `2023-02-17` — Search for references to AD 2023-02-17
- `Cessna 120` — Search for references to Cessna 120

**Note:** This also searches EASA ADs, which is a differentiator (international compliance).

---

### 5. Old AD Search Tools (Legacy)
**URL:** `tritonaviationdata.com/data/small_ads.php3`

Legacy version of the AD search with the same four category buttons:
- Airframe
- Engine
- Propeller
- Appliance

Preserved for users who prefer the old workflow. The `.php3` extension suggests this is the original system from 2007.

---

## Aircraft Profiles
**URL:** `b.tritonaviationdata.com/subscribers/profile.php`

Saved aircraft profiles — the closest thing to "fleet management" in Triton.

**Table columns:**
| N-Number/Serial | Contacts | Aircraft Make | Model | Label | Marked Seen | New ADs | Reports |

**Features:**
- **Create** button to add new aircraft profiles
- **Search filter** for N-number, Serial, Contacts
- **"New ADs"** column — flags when new ADs are published for that aircraft's make/model
- **"Marked Seen"** column — tracking which ADs the user has reviewed
- **"Reports"** column — generates compliance reports for that aircraft
- **Help** button

**This is the most Athelon-relevant feature** — it's essentially a per-aircraft AD compliance tracker.

---

## STC Search
**URL:** `tritonaviationdata.com/features/stcsearch.php`

Database of 82,179+ Supplemental Type Certificates.

**5 search methods:**
1. **By AC Mfr** — Search by aircraft manufacturer, model, and keywords
2. **By STC No.** — Search by STC certificate number
3. **By TC No.** — Search by Type Certificate number
4. **By STC Holder** — Search by STC holder name
5. **Browse Index** — Alphabetic index of STC holders

**Data fields:** Aircraft Make/Model, STC Description, TC Number, STC Number, STC Holder

**Indexes:** STC Number, TC Number, STC Holder, Aircraft Make and Model

**Common uses:**
- Search by Make, Model, and Product/Component keywords in STC Description
- Determine the existence of an STC
- Find STCs for any specific Aircraft Make/Model
- Find STC Holder's Name and Address

---

## Supporting Features

### FAA Forms
**URL:** `tritonaviationdata.com/data/Forms/Forms2.htm`
Collection of editable FAA forms organized in 5 tables. Forms are downloadable/fillable.

### Advisory Circulars
**URL:** `tritonaviationdata.com/data/advc_mlst2.htm`
100+ maintenance-related Advisory Circulars in a single table.

### Type Certificates
**URL:** `tritonaviationdata.com/data/Type_Cert.htm`
Type Certificate Data Sheet lookup.

### Service Bulletins
Indexed by manufacturer — 200+ manufacturers with their service bulletins organized alphabetically.

---

## Mapping to Athelon

### Already in Athelon
| Triton Feature | Athelon Equivalent | Status |
|---------------|-------------------|--------|
| Aircraft profiles (N-number) | `aircraft` table + fleet pages | Live |
| AD compliance tracking | `adCompliance` table + queries | Backend ready, UI partial |
| Document storage | `documents` table + file storage | Built |

### High-Value Features to Add

1. **AD Search by Make/Model** — Triton's core feature. Athelon could integrate an AD lookup by aircraft type/model, pulling from FAA AD data. The multi-step flow (Group → Make → Model → AD list) is the established UX pattern.

2. **Aircraft AD Profile / "New ADs" Alerts** — Triton tracks which ADs a user has "seen" and flags new ones. Athelon's aircraft records could track AD review status and surface new ADs automatically.

3. **Full Text Search Across Documents** — A search engine across ADs, SBs, ACs, TCDS, NPRMs, and EASA ADs. Triton indexes 376K+ documents. This could be an integration point rather than building from scratch.

4. **Appliance AD Tracking** — Separate from airframe/engine/prop ADs. Athelon's AD compliance currently doesn't distinguish appliance ADs as a category.

5. **STC Search** — 82K+ STCs searchable by multiple criteria. Relevant for determining what modifications are approved for an aircraft.

6. **Compliance Report Generation** — Triton generates downloadable compliance reports per aircraft profile. Athelon could add similar export functionality from its `adCompliance` data.

7. **AD Review Status ("Marked Seen")** — Simple but valuable: mark individual ADs as reviewed/acknowledged per aircraft. Creates an audit trail of compliance review.

### Integration Opportunity
Rather than rebuilding Triton's 376K-document search engine, Athelon could:
- Link to FAA AD database APIs for real-time AD data
- Integrate with Triton (or similar) as a data source
- Focus on the **compliance workflow** (tracking, sign-off, audit trail) which is Athelon's strength, while sourcing the raw AD data externally

---

## Screenshots Reference

All screenshots saved to `athelon-app/artifacts/triton-recon/`:

| Page | File |
|------|------|
| Subscriber Dashboard | `tritonaviationdata-com-html-access-html.png` |
| Make/Model AD Search | `b-tritonaviationdata-com-subscribers-makemodel-php.png` |
| Appliance AD Search | `b-tritonaviationdata-com-subscribers-appliance-ads-php.png` |
| Single AD Lookup | `b-tritonaviationdata-com-subscribers-singlead-php.png` |
| Full Text Search | `b-tritonaviationdata-com-subscribers-fullsearch-php.png` |
| Aircraft Profiles | `b-tritonaviationdata-com-subscribers-profile-php.png` |
| STC Search | `tritonaviationdata-com-features-stcsearch-php.png` |
| Old AD Search | `tritonaviationdata-com-data-small-ads-php3.png` |
| FAA Forms | `tritonaviationdata-com-data-Forms-Forms2-htm.png` |
| Advisory Circulars | `tritonaviationdata-com-data-advc-mlst2-htm.png` |
| Type Certificates | `tritonaviationdata-com-data-Type-Cert-htm.png` |
