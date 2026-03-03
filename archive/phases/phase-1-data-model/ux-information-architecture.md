# Athelon — UX Information Architecture
**Author:** Finn Calloway, UX/UI Designer
**Contributing:** Nadia Solis (PM), Tanya Birch (Mobile)
**Date:** 2026-02-22
**Phase:** 1 — Foundation
**Status:** Draft — Internal Review

---

> *This document is the floor plan before the furniture. We are defining where every screen lives, how users navigate between them, and what each screen is responsible for showing. I am writing this before touching Figma because the navigation model needs to be defensible before any individual screen gets designed. Everything here has been stress-tested against the five personas. Where Nadia or Tanya pushed back or flagged a divergence, I've noted it. — FC*

---

## Part 1: Design Principles Recap (Navigation-Specific)

Before the architecture, the constraints that shaped it:

1. **≤2 taps to the most common action for any persona.** Not 3. Not "usually 2." Two.
2. **Universal search from any screen.** The tail number is the universal key. Type it anywhere and land on the aircraft.
3. **No navigation destroys context.** A mechanic looking at a task card can look at parts history without losing the task card. Browser back always works.
4. **Status is always visible.** Work orders, task cards, parts requests — their state is readable from the list view without opening the record.
5. **Mobile is not a reduced experience.** Every action available on desktop is available on the same URL on a phone. The layout adapts. The capability doesn't change.

*Nadia note: Principle 5 is the one I'll hold the team to most strictly. The EBIS Web failure — where the "web version" is explicitly a read-only view — is the pattern we're running from. If a mechanic can't sign off a task card from their phone, we haven't built a mobile interface, we've built a brochure.*

---

## Part 2: Core Navigation Model

### 2.1 Top-Level Structure

Athelon's navigation has six top-level sections. That's it. Six.

Everything in MRO software wants to be its own section. Corridor has 11 top-level sections. EBIS 5 has a collapsible tree that expands to somewhere between 15 and "too many to count, depending on module." We are not doing that.

The six sections:

```
┌─────────────────────────────────────────┐
│  ATHELON                   [Search ⌘K]  │
├──────────┬──────────────────────────────┤
│          │                              │
│  Dashboard                              │
│  Fleet                                  │
│  Work Orders                            │
│  Parts                                  │
│  Squawks                                │
│  Compliance                             │
│                                         │
│  ─────────────────────                  │
│  Settings                               │
│  Personnel                              │
└──────────┴──────────────────────────────┘
```

**Why these six:**
- **Dashboard** — the daily starting point for DOM and Owner. Live shop status.
- **Fleet** — all aircraft the shop maintains. The aircraft record is the organizing spine.
- **Work Orders** — the core operational unit. Everything meaningful happens inside a work order.
- **Parts** — inventory, requests, POs, receiving. Carlos's domain.
- **Squawks** — open discrepancies that don't yet have a work order, or discrepancies flagged mid-inspection.
- **Compliance** — certificates, audit trails, RTS records, regulatory document references.

Settings and Personnel are in a secondary tier — accessed less frequently, don't need top-level prominence.

### 2.2 Sidebar Behavior

On desktop (≥1024px wide): sidebar is always visible, collapsed by default to icon-only mode, expandable to label mode.

```
Collapsed (icon mode):          Expanded (label mode):
┌────┐                          ┌──────────────────┐
│ 📊 │  Dashboard               │ 📊  Dashboard     │
│ ✈️  │  Fleet                   │ ✈️   Fleet         │
│ 📋 │  Work Orders             │ 📋  Work Orders   │
│ 🔧 │  Parts                   │ 🔧  Parts         │
│ ⚠️  │  Squawks                 │ ⚠️   Squawks       │
│ ✅ │  Compliance              │ ✅  Compliance    │
└────┘                          └──────────────────┘
```

On tablet (768–1023px): sidebar starts collapsed, user can expand.

On mobile (≤767px): sidebar is replaced by a bottom tab bar with five items (Dashboard, Work Orders, Parts, Squawks, + More). The "More" tab reveals Fleet and Compliance.

*Tanya note: Bottom tab bar on mobile is non-negotiable. The sidebar-as-hamburger menu pattern requires a tap to open it, a tap to find the item, and a tap to navigate — three taps for something that should be zero taps. Bottom tabs are one tap from anywhere. The six-section problem solves itself by putting the most AMT-relevant sections in the primary five slots.*

### 2.3 The Search Bar

Omnipresent. Every screen. Keyboard shortcut: ⌘K (desktop), tap the magnifying glass (mobile).

What universal search returns, in ranked order:
1. Aircraft (by tail number, manufacturer, model)
2. Work Orders (by WO number, aircraft tail, customer)
3. Task Cards (by title, reference document number)
4. Parts (by part number, description, NSN)
5. Squawks (by description, tail number)
6. Customers (by name)
7. Personnel (by name, certificate number)

Results show the record type, primary identifier, and status badge. Selecting a result navigates directly to that record — not to the list with that record selected. Directly to the record.

This is the single most important navigation feature in the application. Ray finding N456AB's work order in 8 seconds (his current benchmark) should become N456AB in the search box, one result, one tap. Under 4 seconds.

---

## Part 3: URL Patterns

URL structure is deliberate. It must be shareable, bookmarkable, and back-button-trustworthy.

```
/                              → redirects to /dashboard
/dashboard                     → Live shop dashboard

/fleet                         → Aircraft list
/fleet/[tailNumber]            → Individual aircraft record
/fleet/[tailNumber]/history    → Maintenance history for this aircraft
/fleet/[tailNumber]/schedule   → Maintenance due schedule for this aircraft

/work-orders                   → Work order list (filtered by status)
/work-orders/new               → Create new work order
/work-orders/[id]              → Individual work order
/work-orders/[id]/tasks        → Task card list for this work order
/work-orders/[id]/tasks/[tid]  → Individual task card
/work-orders/[id]/parts        → Parts linked to this work order
/work-orders/[id]/sign-off     → Return-to-service sign-off screen

/parts                         → Parts module home (defaults to Requests queue)
/parts/requests                → Outstanding parts requests
/parts/inventory               → Inventory browser
/parts/inventory/[partId]      → Individual part record
/parts/purchase-orders         → PO list
/parts/purchase-orders/[id]    → Individual PO
/parts/receiving               → Receiving queue

/squawks                       → Open squawk list
/squawks/[id]                  → Individual squawk

/compliance                    → Compliance home
/compliance/audit-trail        → Audit log (read-only, filterable)
/compliance/certificates       → Personnel certificate tracking
/compliance/rts-records        → Return-to-service records
/compliance/documents          → Regulatory document library

/personnel                     → Team roster
/personnel/[id]                → Individual personnel record

/settings                      → Settings home
/settings/shop                 → Shop profile, ratings, location
/settings/roles                → RBAC configuration
/settings/billing              → Subscription and billing (Phase 4)
/settings/integrations         → External integrations (Phase 5)
```

**URL principles:**
- Tail numbers in URLs are URL-encoded as-is (N123AB → `/fleet/N123AB`). No slugification. Mechanics expect to type tail numbers, not slugs.
- Work order IDs are 8-character alphanumeric codes that are human-readable when spoken aloud (WO-2026-0042). The URL uses the ID, not a database UUID.
- Deep links work from any context. A DOM sharing `/work-orders/WO-2026-0042/tasks/TC-017` with a mechanic should land them on that exact task card, with appropriate role-based access applied.

*Nadia note: The DOM shares links constantly. "Here's the task card, sign it" should be a URL in a text message. This is how actual shops communicate — not through the software's notification system, but through iMessage and Teams and sometimes literal sticky notes. If our URLs are shareable, we become the communication layer by default.*

---

## Part 4: Page Inventory for MVP

Every screen in the MVP. Listed with: purpose, primary user, and key actions available.

---

### 4.1 Dashboard

**Purpose:** Live shop status overview. The morning screen. Tells you what needs attention right now without navigating anywhere.

**Primary user:** DOM (Sandra). Secondary: Owner (Dale).

**Key actions:**
- See all active work orders with current status
- See open squawks requiring authorization
- See parts requests awaiting parts manager action
- See any compliance flags (unsigned task cards, certificates expiring)
- Navigate to any flagged item in one tap

```
┌─────────────────────────────────────────────────────┐
│  Good morning, Sandra.          Mon Feb 23, 2026    │
│  Desert Raptor Aviation         07:42 MST            │
├────────────────┬────────────────┬───────────────────┤
│   Active WOs   │  Open Squawks  │  Parts Requests   │
│      12        │       3        │        7          │
│  (2 overdue)   │  (1 auth req.) │  (2 pending PO)   │
├────────────────┴────────────────┴───────────────────┤
│  REQUIRES YOUR ATTENTION                            │
│  ───────────────────────────────────────────────    │
│  ⚠️  N447DE  Additional discrepancy auth needed      │
│      Cracked exhaust manifold — Mia Chen, 09:14     │
│      [REVIEW & AUTHORIZE]                           │
│                                                     │
│  ⚠️  N192AK  Open task card unsigned >24h           │
│      100-hr inspection Item 14 — Ray Kowalski       │
│      [VIEW TASK CARD]                               │
│                                                     │
│  📋  WO-2026-0038  N88SQ — OVERDUE (was due 2/21)  │
│      Cessna 182 annual — waiting on magneto        │
│      [VIEW WORK ORDER]                              │
├─────────────────────────────────────────────────────┤
│  ACTIVE WORK ORDERS (12)             [+ NEW WO]    │
│  ─────────────────────────────────────────────────  │
│  N447DE  King Air C90  Annual         🟡 ON HOLD    │
│  N192AK  C172          100-hr         🟢 ACTIVE     │
│  N88SQ   C182          Annual         🔴 OVERDUE    │
│  N23TK   PA-28         Unscheduled    🟢 ACTIVE     │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

**Mobile layout:** The three stat cards stack vertically. "Requires Attention" items appear first, then Active WOs. The new WO button is a floating action button (+) in the bottom right.

---

### 4.2 Fleet / Aircraft List

**Purpose:** All aircraft the shop currently maintains or has a record for.

**Primary user:** DOM, Lead AMT.

**Key actions:**
- Search / filter by aircraft type, customer, status
- Navigate to individual aircraft record
- See at-a-glance: how many open WOs per aircraft, any compliance flags
- Add new aircraft to fleet

```
┌─────────────────────────────────────────────────────┐
│  Fleet                                    [+ ADD]   │
│  ─────────────────────────────────────────────────  │
│  [Search aircraft...]  [Filter ▾]                   │
├─────────────────────────────────────────────────────┤
│  N447DE  •  King Air C90  •  Western Flight LLC     │
│  1 active WO  •  Annual due in 0 days  🔴 OVERDUE  │
│                                                     │
│  N192AK  •  Cessna 172S  •  Sky Ranch Flying Club   │
│  1 active WO  •  100-hr due in 38hr TT             │
│                                                     │
│  N88SQ   •  Cessna 182T  •  James Whitmore (pvt)   │
│  1 active WO  •  Annual due in 112 days             │
│                                                     │
│  N23TK   •  Piper Cherokee  •  Tucson Air Tours     │
│  1 active WO  •  100-hr due in 67hr TT             │
└─────────────────────────────────────────────────────┘
```

---

### 4.3 Aircraft Record

**Purpose:** The aircraft's complete record. Hub for everything associated with this tail number.

**Primary user:** DOM, Lead AMT.

**Key actions:**
- View active and historical work orders
- View squawk history
- View maintenance due schedule
- View component/equipment list (with overhaul tracking)
- Start new work order for this aircraft

```
┌─────────────────────────────────────────────────────┐
│  ← Fleet   N447DE                     [+ NEW WO]   │
│  ─────────────────────────────────────────────────  │
│  King Air C90 • 1978 • S/N LJ-562                   │
│  Owner: Western Flight LLC                          │
│  Airframe TT: 14,287.4 hr    Hobbs: 14,291.2       │
├────────────────────────────────────────────────────-┤
│  [WORK ORDERS]  [SQUAWKS]  [SCHEDULE]  [EQUIPMENT]  │
├─────────────────────────────────────────────────────┤
│  (Work Orders tab active)                           │
│                                                     │
│  WO-2026-0041  Annual Inspection    🟡 ON HOLD      │
│  Opened 2026-02-14  •  Mia Chen, Ray Kowalski       │
│  Waiting on: Left magneto (PO-2026-0089)            │
│                                                     │
│  WO-2025-0312  100-hr Inspection   ✅ COMPLETE      │
│  Closed 2025-11-03  •  Ray Kowalski (RTS sign-off)  │
│                                                     │
│  WO-2025-0201  Unscheduled: Nose strut  ✅ COMPLETE │
│  Closed 2025-08-17  •  Ray Kowalski                 │
└─────────────────────────────────────────────────────┘
```

---

### 4.4 Work Order List

**Purpose:** All work orders, filterable by status, mechanic, aircraft, date range.

**Primary user:** DOM (full view). AMT (filtered to their assignments).

**Key actions:**
- Filter by status (Active, On Hold, Pending Auth, Awaiting Parts, Complete, Closed)
- Sort by date opened, due date, aircraft
- Navigate to a work order
- Create new work order

**Status filter tabs appear at the top. Default: "Active" — not "All." New users won't search in the wrong bucket (the Corridor mistake).**

---

### 4.5 Work Order Detail

**Purpose:** The core operational view. Shows everything about a work order in progress.

**Primary user:** Lead AMT (primary operator). DOM (reviewer/approver). Young AMT (individual task worker).

**Key actions:**
- View all task cards and their status
- Add a task card
- View and request parts
- Log notes or discrepancies
- Initiate return-to-service sign-off (DOM/IA only)
- View customer authorization status

```
┌─────────────────────────────────────────────────────┐
│  ← Work Orders                                      │
│  WO-2026-0041  •  N447DE Annual Inspection          │
│  Opened 2026-02-14  •  Customer: Western Flight LLC  │
│  ─────────────────────────────────────────────────  │
│  🟡 ON HOLD — Awaiting parts (1 PO open)            │
│                                                     │
│  Authorization: ✅ Signed — Dale Harrington 2/14    │
│  Est. completion: 2026-03-01 (overdue)              │
├─────────────────────────────────────────────────────┤
│  [TASK CARDS(14)] [PARTS(7)] [NOTES(3)] [SIGN-OFF]  │
├─────────────────────────────────────────────────────┤
│  TASK CARDS                     [+ ADD TASK CARD]  │
│  ─────────────────────────────────────────────────  │
│  TC-001  Airframe visual inspection  ✅ SIGNED       │
│          Ray Kowalski • 2026-02-15 • 2.3 hr         │
│                                                     │
│  TC-002  Engine compression check   ✅ SIGNED       │
│          Mia Chen • 2026-02-15 • 1.8 hr             │
│                                                     │
│  TC-007  Left magneto inspection    🔴 UNSIGNED     │
│          Assigned: Ray Kowalski • 0.0 hr logged     │
│          ⚠️  Part on order — cannot sign until inst. │
│                                                     │
│  TC-008  Right magneto inspection   ✅ SIGNED       │
│          Ray Kowalski • 2026-02-16 • 0.7 hr         │
│                                                     │
│  ...13 more                                         │
├─────────────────────────────────────────────────────┤
│  LABOR SUMMARY                                      │
│  Ray Kowalski    14.2 hr  •  Mia Chen    6.8 hr    │
│  Total: 21.0 hr  •  Est. remaining: 4.0 hr          │
└─────────────────────────────────────────────────────┘
```

*Nadia note: The "cannot sign until part installed" warning on TC-007 is not optional. It's the kind of gate that Corridor enforces and that prevents a mechanic from signing off a task that physically couldn't have been done. This must be enforced at the data model level, not just the UI level — a future API call cannot be used to bypass it.*

---

### 4.6 Task Card Detail

**Purpose:** The individual maintenance task. The document a mechanic works against and eventually signs.

**Primary user:** AMT (worker). DOM (reviewer).

**Key actions:**
- Read task description and reference documents
- Log time (start timer or manual entry)
- Enter notes / findings
- Request a part (in context, not navigating away)
- Attach photos
- Sign off the task card (primary call to action)

```
┌─────────────────────────────────────────────────────┐
│  ← WO-2026-0041                                     │
│  TC-007  Left Magneto Inspection & Replacement      │
│  ─────────────────────────────────────────────────  │
│  Reference: King Air Maintenance Manual 61-20-01    │
│  AMM Section: Ignition System                       │
│  Assigned: Ray Kowalski                             │
├─────────────────────────────────────────────────────┤
│  TASK DESCRIPTION                                   │
│  ─────────────────────────────────────────────────  │
│  Inspect left magneto per MM 61-20-01. Check points, │
│  condenser, timing. Replace if points show pitting  │
│  or timing out of tolerance.                        │
│                                                     │
│  Tolerance: Timing 25° ±2° BTDC                    │
├─────────────────────────────────────────────────────┤
│  TIME LOG                            [▶ START TIMER]│
│  ─────────────────────────────────────────────────  │
│  No time logged yet                                 │
│  [+ ADD TIME MANUALLY]                              │
├─────────────────────────────────────────────────────┤
│  PARTS REQUIRED                                     │
│  ─────────────────────────────────────────────────  │
│  Slick 4370 Magneto  •  P/N 4370  •  QTY 1         │
│  Status: 🟡 ON ORDER — PO-2026-0089                 │
│  ETA: 2026-02-25                                    │
│  [REQUEST ANOTHER PART]                             │
├─────────────────────────────────────────────────────┤
│  FINDINGS / NOTES                     [+ ADD NOTE]  │
│  ─────────────────────────────────────────────────  │
│  No findings logged yet                             │
├─────────────────────────────────────────────────────┤
│  PHOTOS                              [📷 ADD PHOTO] │
│  ─────────────────────────────────────────────────  │
│  No photos attached                                 │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │  ⚠️  CANNOT SIGN — PART NOT YET RECEIVED    │   │
│  │  Slick 4370 must be received and issued      │   │
│  │  before this task card can be signed off.   │   │
│  │  ETA: 2026-02-25                            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

When the part is installed and the task is ready for sign-off, the bottom section becomes:

```
│  ┌──────────────────────────────────────────────┐   │
│  │          SIGN OFF THIS TASK CARD            │   │
│  │                                              │   │
│  │  You are certifying that:                   │   │
│  │  Left Magneto Inspection & Replacement was   │   │
│  │  performed on N447DE on 2026-02-25           │   │
│  │  per King Air MM 61-20-01                    │   │
│  │  by Ray Kowalski, A&P Cert. #3892045         │   │
│  │                                              │   │
│  │  Time logged: 1.4 hr                         │   │
│  │  Part installed: Slick 4370 S/N 87291       │   │
│  │                                              │   │
│  │  [SIGN WITH FACE ID]  or  [USE PIN]         │   │
│  └──────────────────────────────────────────────┘   │
```

*Tanya note: The sign-off section must be sticky at the bottom on mobile — visible without scrolling when the task is ready to be signed. On a tall task card with findings and photos, the mechanic should not have to scroll to find the sign button. Implementation: sticky bottom bar that appears when `signOffReady === true`.*

---

### 4.7 Parts Requests Queue

**Purpose:** Carlos's primary view. All outstanding parts requests from open work orders, in one place.

**Primary user:** Parts Manager (Carlos).

**Key actions:**
- View all requests, sorted by priority / work order status
- Mark a request as ordered (create PO)
- Mark a request as sourced (part is in inventory, ready to issue)
- Issue a part to a work order
- See the work order context for each request (don't make Carlos navigate away)

```
┌─────────────────────────────────────────────────────┐
│  Parts — Requests Queue               [+ NEW PO]   │
│  ─────────────────────────────────────────────────  │
│  [REQUESTS (7)] [INVENTORY] [PURCHASE ORDERS] [RCV]  │
│  ─────────────────────────────────────────────────  │
│  Slick 4370 Magneto  •  QTY 1                       │
│  For: N447DE Annual  •  WO-2026-0041  •  TC-007     │
│  Requested by: Ray Kowalski  •  2026-02-14          │
│  Status: 🟡 ON ORDER — PO-2026-0089 (ETA Feb 25)   │
│  [VIEW PO]                                          │
│  ─────────────────────────────────────────────────  │
│  Champion REM37BY Spark Plug  •  QTY 16             │
│  For: N192AK 100-hr  •  WO-2026-0044               │
│  Requested by: Mia Chen  •  2026-02-21              │
│  Status: 🔵 NEW REQUEST — Not yet ordered           │
│  [ORDER NOW]  [PULL FROM INVENTORY]                 │
│  ─────────────────────────────────────────────────  │
│  Lycoming LW-12334 Oil Filter  •  QTY 1             │
│  For: N88SQ Annual  •  WO-2026-0038                │
│  Status: ✅ IN STOCK — Ready to issue               │
│  [ISSUE TO WORK ORDER]                              │
└─────────────────────────────────────────────────────┘
```

*Nadia note: "Issue to Work Order" is one action, not three screens. When Carlos taps it, a drawer opens: confirm quantity, confirm 8130-3 data (auto-populated from receiving record), confirm issue. Tap "Confirm Issue." Done. The parts request/order/issue taxonomy from Corridor is the right model — but the UI transitions between states in-context, not by navigating to a new section.*

---

### 4.8 Inventory Browser

**Purpose:** See all parts on hand. Search, filter, find, view location and condition.

**Primary user:** Parts Manager (Carlos). Secondary: AMT (read-only lookup).

**Key actions:**
- Search by part number, description, NSN
- Filter by location, condition, quantity
- View individual part record with full traceability
- Initiate a physical inventory count
- See which parts are approaching shelf-life limits

---

### 4.9 Receiving Queue

**Purpose:** Process incoming shipments against open POs.

**Primary user:** Parts Manager (Carlos).

**Key actions:**
- Scan barcode or enter tracking number
- Confirm receipt against PO (full or partial)
- Enter 8130-3 / traceability document number
- Attach photo of received documentation
- Move part to storeroom location

Partial receipt is a first-class workflow. Not an edge case. Receiving 8 of 16 ordered spark plugs is a normal thing. The PO stays open for the remaining 8.

---

### 4.10 Squawk Detail

**Purpose:** Document and track a discrepancy. May or may not be linked to a work order.

**Primary user:** AMT (reporter). DOM (reviewer/authorizer).

**Key actions:**
- View squawk details and photos
- Link squawk to a work order
- Authorize repair (DOM action)
- Defer squawk (with MEL reference if applicable)
- Mark squawk resolved (when repair is complete)

The squawk is the first thing that happens when Mia finds a crack in an exhaust manifold at the aircraft. It takes 45 seconds: open app, + New Squawk, photo, description, aircraft, submit. That's the whole flow from her side.

---

### 4.11 Return to Service Sign-Off

**Purpose:** The final step on a work order. The IA or DOM certifies that all work is complete and the aircraft is airworthy.

**Primary user:** DOM / IA (Sandra). This is a high-stakes screen.

**Key actions:**
- Review completeness (all task cards signed, all parts traced, no open squawks)
- Enter current airframe time and Hobbs
- Confirm completion date
- Sign off with certificate number (auto-populated from personnel record)

This screen cannot be reached if there are unsigned task cards. The system enforces this — it's not a warning, it's a block.

---

### 4.12 Compliance — Audit Trail

**Purpose:** Immutable log of all actions on every record. The screen an FAA inspector might ask to see.

**Primary user:** DOM (Sandra). Inspector.

**Key actions:**
- Filter by aircraft, date range, user, record type
- View any action with timestamp, user, and before/after state
- Export filtered results to PDF

Read-only. No editing. Ever.

---

### 4.13 Personnel Record

**Purpose:** Track each team member's certificates, currency, and role assignments.

**Primary user:** DOM.

**Key actions:**
- View certificate type and number (A&P, IA, repairman)
- Track IA renewal date
- View hours logged by time period
- Assign role (AMT, DOM, Parts, Inspector, Owner)

---

## Part 5: Data Display Patterns for Aviation Context

### 5.1 Work Order Card (List View)

Every work order in a list view shows exactly this, no more:

```
┌─────────────────────────────────────────────────────┐
│  🟢  WO-2026-0044          ACTIVE                   │
│  N192AK  Cessna 172S  •  100-hr Inspection          │
│  Customer: Sky Ranch Flying Club                    │
│  Opened 2026-02-21  •  Mia Chen, Ray Kowalski       │
│  Task Cards: 8/14 signed  •  Parts: 3 on order      │
└─────────────────────────────────────────────────────┘
```

Color + status label. Progress expressed as X/N signed (not a percentage — percentages imply uniform task weight, which is false in MRO). Parts status is always visible from the list without opening the record.

### 5.2 Task Card Summary (Within Work Order)

```
TC-002  Engine compression check   ✅ SIGNED
        Mia Chen  •  2026-02-15  •  1.8 hr logged
        Cyl 1: 76/80  Cyl 2: 74/80  Cyl 3: 77/80 ...
```

One line for status. One line for who/when/time. One line for findings (if any). Truncated at one line — tap to expand.

### 5.3 Part Number Display

Part numbers are sacred. They must be:
- Displayed in monospace font
- Never truncated
- Always shown with associated NSN when available
- Accompanied by description in plain text

```
P/N:  APS 107-350-1                    
NSN:  2910-00-857-5142
Desc: Filter, Fuel, 35-Micron
S/N:  AF-29847-22 (if serialized)
8130-3: Ref Doc #293847
```

### 5.4 Sign-Off Record (Permanent)

Once signed, a task card shows a permanent, uneditable sign-off block:

```
┌──────────────────────────────────────────────────┐
│  ✅ SIGNED OFF                                    │
│  Ray Kowalski  •  A&P Cert. #3892045             │
│  2026-02-25  •  14:32 MST (19:32Z)               │
│  Signature ID: 9f3c7a2b-...                       │
│  This record is cryptographically locked.         │
└──────────────────────────────────────────────────┘
```

Both local time and Zulu time are always shown on signed records. The signature ID is a UUID that references the cryptographic record in the audit trail. Mechanics who ask "what does that signature ID mean?" get a tooltip: "This ID proves this signature cannot be altered. It is your legal certification."

### 5.5 Date and Time Display

**Zulu time is always shown.** This is non-negotiable for aviation records. Local time is shown as secondary context.

Pattern: `2026-02-25 19:32Z (14:32 MST)`

- ISO 8601 date format. Always. No ambiguous "Feb 25" without year.
- Z suffix on Zulu timestamps. Always.
- For maintenance due dates where time-of-day doesn't matter: `2026-03-15` (date only — no time, no timezone confusion).
- For flight hours / Hobbs: `14,287.4 hr` (comma separator, one decimal place, always "hr" suffix).

---

## Part 6: Mobile Web Considerations

*This section documents the specific constraints Tanya Birch has flagged for hangar use. These are not optional — they reflect real failure modes we've seen in field software at ServiceMax.*

### 6.1 Touch Target Sizing

Minimum interactive element size: **60×60px** (logical pixels, not device pixels). Preferred for primary actions: **72×72px**.

This applies to:
- All buttons
- List row tap targets (the entire row, not just the text)
- Checkboxes and radio buttons
- Navigation items in the bottom tab bar

Spacing between adjacent interactive elements: minimum **12px**. No two tappable elements can be closer than 12px edge-to-edge.

*Tanya: The 48px minimum you see cited in Material Design guidelines was tested in controlled conditions. In a hangar, with a thumb in a work glove, using a tablet mounted on a cart at chest height, 48px is too small. 60px is the floor. 72px is the target for anything a mechanic will tap more than twice per session.*

### 6.2 One-Handed Operation

Every primary workflow — log time, create squawk, request part, sign task card — must be completable with one thumb on a phone held in one hand.

Implementation constraints:
- Primary actions are at the bottom of the screen, in thumb reach
- No critical action requires reaching the top of the screen on a phone
- Bottom sheet / drawer pattern for confirmations (not center-screen modals that require precise dismissal)
- Scroll direction for primary workflows: vertical only. No horizontal scrolling for required content.
- The sign-off PIN entry uses a numeric keypad layout (like a phone dialpad), large buttons, at the bottom of the screen

### 6.3 Offline States

*Tanya's constraint: Design as if connectivity will drop mid-workflow. Not "might drop." "Will drop."*

Every screen must define behavior in three states:
- **Online:** Normal operation
- **Degraded (intermittent):** Read from local cache, queue writes, show sync status indicator
- **Offline:** Read from local cache only, queue writes, show clear offline banner

Offline-capable actions (Phase 2 implementation, but design must accommodate):
- View current work order and task cards (read)
- Log time (queued write, syncs on reconnect)
- Add a note to a task card (queued write)
- Create a squawk with photo (queued write)
- Sign off a task card (queued write — cryptographically signed locally, confirmed by server)

Actions that require connectivity:
- Create a new work order (requires server validation)
- Issue a part from inventory (requires real-time inventory state)
- View audit trail (always server-authoritative)

**Offline indicator design:**

```
┌─────────────────────────────────────────────────────┐
│  📵 OFFLINE — 3 actions queued for sync             │
│  Your changes will sync when connected.  [DETAILS]  │
└─────────────────────────────────────────────────────┘
```

Banner at top of screen. Amber background. Persistent until online. Dismissible to a status dot in the header. Never disappears silently.

*Nadia note: This matters more than the product team instinctively thinks it does. A mechanic who signs a task card while offline, loses connectivity, and doesn't know whether the signature went through — and then drives home — has created a compliance gap that everyone will blame on the software. The offline queue must be visible, explicit, and persistent.*

### 6.4 Glove-Friendly Specific Design Calls

- **No swipe-to-delete.** Swipe gestures are unreliable with gloves. Destructive actions use an explicit delete button with a confirmation.
- **No drag-and-drop for required workflows.** Reordering task cards can use drag-and-drop as an enhancement. It cannot be the only way.
- **Pinch-to-zoom disabled** in the app shell (no meta viewport zooming). Zoom is a separate control where needed (e.g., photo viewer).
- **Large click targets extend into gutters.** A list item's tap target extends to the full width of the screen. The visible card is narrower, but the tap target is the full row width.
- **Keyboard suggestions accepted.** On iOS and Android, auto-suggest is not suppressed for free-text fields (notes, descriptions). Suppressing it forces more precise typing — a glove-mode failure.

### 6.5 Screen Brightness and Legibility

Designs must be tested at 30% screen brightness (realistic outdoors near an aircraft on a sunny day) and at maximum brightness (inside a hangar with poor lighting).

Minimum contrast ratios:
- Body text on background: 7:1 (WCAG AAA)
- Status labels: 4.5:1 minimum, 7:1 preferred
- Error states: 7:1 (no silent failures under poor lighting)

Font size minimums on mobile:
- Body text: 16px
- Supporting labels: 14px (never smaller)
- Status badges: 13px with icon (never text-only)

---

## Part 7: Role-Based View Differences

The same URL renders differently based on the authenticated user's role. This is not separate page inventory — it's the same pages with filtered actions and content.

| Screen | DOM | Lead AMT | AMT | Parts | Owner |
|---|---|---|---|---|---|
| Dashboard | Full view + attention queue | My WOs + open squawks | My assigned tasks | Parts requests queue | Financial summary (Phase 4) |
| Work Order | All actions + sign-off | Log time, sign tasks | Log time, sign tasks | Parts only | Read-only |
| Task Card | All actions + override | Log time, sign | Log time, sign (if assigned) | Read-only | Read-only |
| Parts — Requests | Read + approve | Request only | Request only | Full queue | Read-only |
| Compliance | Full | Read-only | Read-only | Read-only | Read-only |
| Personnel | Manage | View own | View own | View own | View all |
| Settings — Roles | Full control | — | — | — | — |

---

## Part 8: Navigation Flows by Persona

### Ray (Lead AMT) — Start a timer on a task card
1. Opens Athelon on his phone. Sees his assigned tasks on dashboard.
2. Taps the task card he's about to work on.
3. Taps "Start Timer."
Done. 3 taps. He puts the phone in his pocket.

### Mia (Young AMT) — Document a discrepancy with photo
1. Finds a crack. Opens Athelon.
2. Taps + (FAB) → New Squawk.
3. Taps camera icon. Takes photo. Adds description. Links to aircraft. Submits.
Done. 4 taps + description. 45 seconds.

### Sandra (DOM) — Authorize additional discrepancy from her phone
1. Receives push notification: "Additional authorization needed: N447DE."
2. Taps notification → lands directly on the squawk detail.
3. Reviews. Taps "Authorize." Confirms with Face ID or PIN.
Done. 3 taps + auth.

### Carlos (Parts) — Process a received shipment
1. Opens Athelon → Parts → Receiving.
2. Scans barcode on box (or enters tracking number).
3. Matches to PO-2026-0089. Reviews line items. Enters 8130-3 number. Taps photo of document. Confirms receipt.
Done. One screen. No navigation away.

### Dale (Owner) — Check shop status from his iPad
1. Opens Athelon. Sees dashboard: 12 active WOs, 2 overdue, estimated billing $18,400 this week.
2. Doesn't need to tap anything. Information delivered.
Done. 0 taps. He knows.

---

*Next: Component Library Spec. Finn Calloway. Same week.*
