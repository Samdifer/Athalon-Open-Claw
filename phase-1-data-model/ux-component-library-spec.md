# Athelon — UX Component Library Specification
**Author:** Finn Calloway, UX/UI Designer
**Contributing:** Tanya Birch (Mobile constraints), Nadia Solis (Compliance review)
**Date:** 2026-02-22
**Phase:** 1 — Foundation
**Status:** Draft — For Chloe Park / Frontend Review

---

> *This document defines the component vocabulary. It is not a Figma file — that comes next week. This is the specification that Chloe needs to start making decisions about the component architecture, and that I need to have agreed upon before I spend a day pushing pixels. Every decision here is justified. If Chloe thinks a component decision is wrong from an implementation standpoint, I want to know before we build it, not after. — FC*
>
> *Side note: After the Corridor teardown session, I told Chloe that "aviation always is" more interesting than it looks. I stand by that. This component library is going to be the most interesting design system I've ever worked on — not because the components are novel, but because the environment in which they have to survive is genuinely extreme. A status badge that doesn't work at 30% screen brightness in a cold hangar is not a status badge. It's a decoration. — FC*

---

## Part 1: Where Competitors Go Wrong — and What We're Doing Instead

Before specifying components, let me name the competitor failures that these components are explicitly designed to avoid. These are the five patterns I will not reproduce in Athelon.

### 1.1 The Color-Only Status Indicator (Corridor failure)

Corridor's work order list uses 8×8px colored squares to indicate status. Grey. Blue. Yellow. Green. Red. No labels. No icons. No hierarchy. Accessible only to users who've memorized the color map and are viewing the software in a well-lit environment on a calibrated monitor.

**What we're doing instead:** Every status is communicated by three independent channels — color, icon, and text label. Remove any one of them and the other two still communicate the meaning. This is the POUR principle (Perceivable by multiple means) applied to status. It's also just correct design.

### 1.2 The Multi-Save Form Pattern (Corridor failure)

Corridor's task card edit splits a single logical record into 4–6 independently-saved sections. Editing task description + parts required + labor = 6 user-initiated actions (3 edits + 3 saves). If any save fails silently, data is lost.

**What we're doing instead:** Forms autosave on change, with visible sync state. The only explicit user action is the sign-off, which is intentionally high-friction (it's a legal certification) and must be intentional. For non-sign-off data entry, we save in the background and confirm with a subtle "Saved" indicator. No form has a "Save" button in the middle of the flow.

### 1.3 The Timestamp Without Timezone (Both competitors)

Both Corridor and EBIS 5 display timestamps in local time only. When a DOM runs a compliance review, she's looking at records from mechanics in different time zones, aircraft that departed from different locations, and events that the FAA will evaluate against Zulu time. Local-only timestamps are ambiguous for any regulatory purpose.

**What we're doing instead:** Zulu time is always shown on any timestamp with compliance significance. Local time is secondary context. Format: `2026-02-25 19:32Z (14:32 MST)`. The mechanic sees the local time first because that's cognitively easier; the compliance record shows Zulu.

### 1.4 The Cryptic Error Message (EBIS 5 failure)

"Error 3021: No current record. Contact your database administrator." This error appeared — verbatim — to a mechanic trying to issue a part in a screen recording Nadia shared. The mechanic stared at it for 8 seconds, then called Carlos.

**What we're doing instead:** Every error in Athelon follows a three-part format:
1. **What happened** (plain English)
2. **Why it happened** (the actual cause)
3. **What to do next** (a specific action, not "contact support")

No error code is ever shown in the primary UI. Error codes are available in a collapsed "Technical Details" accordion for support escalation — but the mechanic never sees them unless they choose to.

### 1.5 The Desktop-First Signature Flow (Corridor mobile failure)

Corridor's mobile signature requires typed username and password — a keyboard interaction that is essentially unusable with gloves, in poor lighting, while standing at an aircraft. The "accessible on mobile" bar clears easily; the "usable in a hangar" bar is much higher.

**What we're doing instead:** The sign-off flow is designed for hangar conditions as the primary case. Biometric authentication (Face ID / fingerprint) is the first option. A large-button PIN entry (6-digit, dialpad layout, 60px buttons) is the fallback. Typed password is the last resort and is labeled as such. There is no text entry in the standard sign-off path.

---

## Part 2: Typography

### 2.1 Typeface Selection

**Primary typeface: Inter**
Rationale: Inter was designed for screen readability, has excellent coverage for technical characters (numerals, part numbers, aviation codes), renders well at small sizes, and has a variable font version. It is not distinctive or branded — that is a feature, not a bug. Aviation technicians are not impressed by a unique typeface. They are impressed by text they can read while wearing bifocals in a dark hangar.

**Monospace typeface: JetBrains Mono**
Rationale: Part numbers, serial numbers, certificate numbers, and work order IDs must be visually distinct from prose text. Monospace font makes part number fields instantly recognizable. JetBrains Mono is designed for readability at small sizes and has consistent character widths that make part numbers easy to compare visually.

### 2.2 Type Scale

The scale is deliberately compressed at the small end. We never go below 13px because that size is already a compromise in hangar lighting. Default body size is 16px — larger than most web applications, justified by environment.

```
Display   32px / Inter 600   Line-height: 1.2
Heading 1 24px / Inter 600   Line-height: 1.3
Heading 2 20px / Inter 600   Line-height: 1.3
Heading 3 18px / Inter 500   Line-height: 1.4
Body      16px / Inter 400   Line-height: 1.6
Body SM   14px / Inter 400   Line-height: 1.5
Label     13px / Inter 500   Line-height: 1.4  (uppercase tracking: 0.05em)
Mono      14px / JetBrains Mono 400  (part numbers, IDs)
```

**Mobile adjustments:** Body increases to 17px on screens under 768px wide. Everything else remains the same — we do not scale down for mobile.

### 2.3 Typography Principles

- **Never use weight below Inter 400 in production.** Light (300) and Thin (100) weights are illegible in the environments our users work in.
- **Uppercase labels only for category-level labels.** Not for body text. Not for button labels. Category labels: `TASK CARDS`, `PARTS REQUIRED`, `SIGN-OFF`. Buttons: `Sign off task card`, `Request part`.
- **Numeric displays use tabular numerals.** Hours logged, part quantities, airframe times — all use `font-variant-numeric: tabular-nums`. Column alignment matters when scanning lists of numbers.
- **Part numbers and IDs use JetBrains Mono.** Always. No exceptions. If it's a number the FAA might ask about, it's in mono.

---

## Part 3: Color System

### 3.1 Philosophy

The color system has two jobs: communicate status clearly, and survive hangar environments.

Hangar environments mean: variable lighting (fluorescent, natural, LED work lights), potential for dirty or smudged screens, and users with all levels of color perception. We do not rely on color perception alone. But color still matters — it provides fast visual parsing when it's working.

### 3.2 Background and Surface Colors

```
Background base:       #0F1117  (near-black, not pure black)
Surface 1:             #1A1E28  (card backgrounds)
Surface 2:             #242936  (elevated surfaces, dropdowns)
Surface 3:             #2E3445  (hover states, selected items)
Border subtle:         #363D4E  (card outlines, dividers)
Border strong:         #4A5264  (input fields, active borders)
```

Dark mode is the primary theme. This is not a stylistic decision — it's an environment decision. In a hangar with variable lighting, a bright white interface creates glare against dark surroundings and makes the screen harder to read from an angle. Dark backgrounds with high-contrast text perform better in mixed lighting conditions.

Light mode will be available (for DOM office use, for Owner on an iPad in daylight) but dark is default.

### 3.3 Status Colors

Status colors carry meaning. They must be:
- Distinguishable from each other by users with deuteranopia (red-green color blindness affects ~8% of men)
- Readable as both background (for badges) and as text (for labels)
- Used only for their designated meaning — no "I needed a green and it was available" repurposing

```
Status: Active / Online / Success
  Background:  #16A34A  (green-600)
  Text on bg:  #FFFFFF
  Text color:  #4ADE80  (green-400, for use on dark surfaces)
  Icon:        ● (filled circle)

Status: Warning / Attention / On Hold  
  Background:  #D97706  (amber-600)
  Text on bg:  #FFFFFF
  Text color:  #FCD34D  (amber-300, for use on dark surfaces)
  Icon:        ⚠ (triangle-exclamation)

Status: Error / Overdue / Blocked
  Background:  #DC2626  (red-600)
  Text on bg:  #FFFFFF
  Text color:  #F87171  (red-400, for use on dark surfaces)
  Icon:        ✕ (x-circle)

Status: Pending / Awaiting / Neutral
  Background:  #2563EB  (blue-600)
  Text on bg:  #FFFFFF
  Text color:  #60A5FA  (blue-400, for use on dark surfaces)
  Icon:        ○ (open circle)

Status: Complete / Signed / Closed
  Background:  #16A34A  (same as Active, context distinguishes)
  Text on bg:  #FFFFFF
  Text color:  #4ADE80
  Icon:        ✓ (checkmark, not circle)

Status: Cancelled / Deferred / Inactive
  Background:  #4B5563  (grey-600)
  Text on bg:  #FFFFFF
  Text color:  #9CA3AF  (grey-400, for use on dark surfaces)
  Icon:        — (dash)
```

**Deuteranopia check:** Active (green) and Error (red) are the most commonly confused pair. They are distinguished by icon (● vs ✕) and label. Never place a green badge adjacent to a red badge without other distinguishing information.

### 3.4 Accent and Interactive Colors

```
Primary action:        #2563EB  (blue-600)
Primary hover:         #1D4ED8  (blue-700)
Primary text:          #DBEAFE  (blue-100, on primary bg)

Destructive action:    #DC2626  (red-600)
Destructive hover:     #B91C1C  (red-700)

Link text:             #60A5FA  (blue-400)
Link hover:            #93C5FD  (blue-300)

Focus ring:            #3B82F6  with 3px offset, 2px width
                       (highly visible, exceeds WCAG 3:1 non-text contrast)
```

### 3.5 Text Colors

```
Text primary:          #F9FAFB  (near-white)
Text secondary:        #D1D5DB  (grey-300)
Text tertiary:         #9CA3AF  (grey-400, supporting labels)
Text disabled:         #6B7280  (grey-500)
Text on-surface inv.:  #111827  (for light mode or light badges)
```

---

## Part 4: Core Components

### 4.1 Status Badge

The most used component in the application. Appears in every list view, every record header, every notification.

**Structure:** `[icon] [label]` on a rounded-corner pill background.

```
ANATOMY:
┌──────────────────────┐
│  ● ACTIVE            │  ← icon (8px) + label (13px/mono) + padding 6px 10px
└──────────────────────┘
  height: 24px
  border-radius: 4px (not fully round — aviation tools aren't bubbly)
  font: Inter 500, 13px, uppercase, letter-spacing 0.04em
```

**All badge variants:**
```
● ACTIVE        (green bg, white text)
○ PENDING       (blue bg, white text)
⚠ ON HOLD       (amber bg, white text)
✕ OVERDUE       (red bg, white text)
✓ SIGNED        (green bg, white text)
✓ COMPLETE      (green bg, white text)
— DEFERRED      (grey bg, white text)
— CANCELLED     (grey bg, white text)
⚠ AWAITING AUTH (amber bg, white text)
○ ON ORDER      (blue bg, white text)
✓ IN STOCK      (green bg, white text)
✕ OUT OF STOCK  (red bg, white text)
⚠ SHELF LIFE ⚠  (red bg, white text, pulsing for critical)
```

**Sizing:**
- Default (list views, record headers): 24px height
- Large (standalone status displays on dashboard): 32px height, 15px font
- Small (compact tables, secondary info): 20px height, 11px font (minimum — do not go smaller)

**Usage rules:**
- One badge per record in list views. If a record has multiple status concerns, show the most critical one. Tap to see all statuses.
- Badge text is never truncated. If the label doesn't fit, the badge width expands.
- Never use color-only (no icon, no label). The component system should make this impossible.

### 4.2 Task Card Component

Task cards appear in two contexts: the work order task list (collapsed view) and the full task card detail.

**Collapsed (list view):**
```
┌─────────────────────────────────────────────────────┐
│  ✓ SIGNED  TC-007                                   │
│  Left Magneto Inspection & Replacement              │
│  Ray Kowalski  •  2026-02-25  •  1.4 hr  •  Slick 4370 S/N 87291  │
└─────────────────────────────────────────────────────┘
  Tap target: full row width × 72px minimum height
  Status badge: left-aligned, vertically centered
  Task ID: JetBrains Mono, grey-400
  Task name: Inter 600, text-primary, 16px
  Metadata line: Inter 400, text-secondary, 14px
  Right edge: chevron (›) if tappable
```

**Unsigned task card — ready to sign:**
```
┌─────────────────────────────────────────────────────┐
│  ○ PENDING  TC-012                                  │
│  Oil System Servicing                               │
│  Assigned: Ray Kowalski  •  2.1 hr logged           │
│  ─────────────────────────────────────────────────  │
│                           [SIGN OFF ›]              │
└─────────────────────────────────────────────────────┘
  The [SIGN OFF] button appears inline in the card
  when signOffReady === true.
  Button: primary (blue), 48px height, right-aligned
  This is the affordance: you see it's ready to sign
  without opening the record.
```

**Blocked task card:**
```
┌─────────────────────────────────────────────────────┐
│  ⚠ BLOCKED  TC-007                                  │
│  Left Magneto Inspection & Replacement              │
│  ⚠  Part on order (PO-2026-0089) — cannot sign until │
│     part received and installed.  ETA: Feb 25       │
└─────────────────────────────────────────────────────┘
  Amber left border (4px)
  Warning text inline, not a tooltip — always visible
```

### 4.3 Sign-Off Flow

The highest-stakes interaction in the application. Designed with three phases: **Review → Confirm → Authenticate**.

```
PHASE 1: REVIEW (scroll to bottom of task card)
┌──────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────┐  │
│  │  READY TO SIGN OFF                            │  │
│  │                                                │  │
│  │  Task: Left Magneto Inspection & Replacement  │  │
│  │  Aircraft: N447DE  •  King Air C90            │  │
│  │  Work Order: WO-2026-0041                      │  │
│  │  Reference: King Air MM 61-20-01              │  │
│  │                                                │  │
│  │  Part installed:                              │  │
│  │  Slick 4370  P/N 4370  S/N 87291             │  │
│  │  8130-3 Ref: Doc #293847                      │  │
│  │                                                │  │
│  │  Time logged: 1.4 hr                          │  │
│  │  Date: 2026-02-25                              │  │
│  │                                                │  │
│  │  By signing, you certify that this work was   │  │
│  │  performed by you in accordance with the      │  │
│  │  reference above and applicable FAA            │  │
│  │  regulations. This signature is permanent     │  │
│  │  and legally binding.                         │  │
│  │                                                │  │
│  │  Your identity: Ray Kowalski                  │  │
│  │  Certificate: A&P #3892045                    │  │
│  │                                                │  │
│  │  [CANCEL]          [PROCEED TO SIGN]          │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

```
PHASE 2: AUTHENTICATE
┌──────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────┐  │
│  │  CONFIRM YOUR IDENTITY                        │  │
│  │                                                │  │
│  │  Signing: TC-007 on N447DE                    │  │
│  │                                                │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │                                         │  │  │
│  │  │   [Face ID / Fingerprint]               │  │  │
│  │  │   Use biometrics to sign                │  │  │
│  │  │                                         │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │             ─── or ───                        │  │
│  │                                                │  │
│  │  ┌───┐  ┌───┐  ┌───┐                          │  │
│  │  │ 1 │  │ 2 │  │ 3 │                          │  │
│  │  └───┘  └───┘  └───┘                          │  │
│  │  ┌───┐  ┌───┐  ┌───┐                          │  │
│  │  │ 4 │  │ 5 │  │ 6 │   ← PIN entry            │  │
│  │  └───┘  └───┘  └───┘   64px × 64px buttons    │  │
│  │  ┌───┐  ┌───┐  ┌───┐                          │  │
│  │  │ 7 │  │ 8 │  │ 9 │                          │  │
│  │  └───┘  └───┘  └───┘                          │  │
│  │         ┌───┐                                  │  │
│  │         │ 0 │                                  │  │
│  │         └───┘                                  │  │
│  │                                                │  │
│  │  [CANCEL]                [USE PASSWORD ›]     │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

*Tanya note: The PIN buttons are 64px because that's what I need for glove-mode reliability. The Face ID button is large and the primary call-to-action. "Use Password" is the tertiary option, visually demoted — it should feel like the option you only use when you've forgotten your PIN. Typed passwords introduce keyboard display which reduces usable screen space and requires precise typing. We want mechanics choosing biometrics or PIN 95% of the time.*

```
PHASE 3: CONFIRMATION (after successful auth)
┌──────────────────────────────────────────────────────┐
│                                                      │
│                       ✓                              │
│                                                      │
│           Task card signed successfully.             │
│                                                      │
│  TC-007  Left Magneto Inspection & Replacement       │
│  N447DE  •  2026-02-25 19:32Z                        │
│  Ray Kowalski  •  A&P #3892045                       │
│  Signature ID: 9f3c7a2b-4d1e-4a2f-b7c3-...          │
│                                                      │
│  [VIEW SIGNED RECORD]    [BACK TO WORK ORDER]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The confirmation screen is full-page, not a toast. This is intentional. A mechanic who has just signed a legal certification document deserves a confirmation that communicates the weight of what just happened — not a green snackbar that disappears in 3 seconds.

**Sign-off rules enforced at component level:**
- Sign button is not rendered if any `signOffBlocker` conditions exist (part not installed, required fields empty, time not logged)
- Sign button is disabled (not just hidden) if the user's role doesn't have sign-off permission for this task type
- The certification statement is generated from live record data, not a static string — the mechanic is always seeing what they're actually signing

### 4.4 Part Number Display Component

Used wherever a part number appears: task cards, parts requests, inventory browser, receiving queue.

```
PART REFERENCE BLOCK:
┌──────────────────────────────────────────────────┐
│  Slick Magneto                                   │
│  P/N  4370           ← JetBrains Mono, 14px     │
│  S/N  87291-A        ← JetBrains Mono, 14px     │
│  NSN  2920-00-839-2127  ← Mono, grey-400, 13px  │
│  8130-3  Doc #293847  ← Mono, grey-400, 13px    │
│  Condition: NEW ● AIRWORTHY                      │
└──────────────────────────────────────────────────┘
```

**Rules:**
- Part number is never truncated. Never. If the container is too small, the container grows.
- S/N and NSN lines appear only if data exists (no empty "S/N: —" lines)
- 8130-3 reference is always shown if the part was received with traceability documentation
- Condition uses a status badge: `● AIRWORTHY`, `⚠ SERVICEABLE-USED`, `✕ UNAIRWORTHY`
- Tapping a part number block expands it to show full receiving history and traceability chain

### 4.5 Time Entry and Timer Component

Two modes: **Running timer** and **Manual time entry**.

```
TIMER (running):
┌──────────────────────────────────────────────────┐
│  ⏱  1:24:07   [■ STOP]                           │
│  Started: 2026-02-25 13:08 MST                   │
│                     Task: TC-012 Oil Servicing    │
└──────────────────────────────────────────────────┘
  Timer text: 24px Inter 500, monospace numerals
  Stop button: 64px width, 48px height, red background
  Persist in header across all screens while running
```

When the mechanic stops the timer, they see:

```
TIME LOGGED:
┌──────────────────────────────────────────────────┐
│  Time logged for TC-012:  1h 24m                 │
│  Start: 13:08 MST  •  Stop: 14:32 MST            │
│  Total today on this task: 3h 12m                │
│                                                  │
│  Add a note about this session? (optional)       │
│  [.....................................]          │
│                                                  │
│                              [SAVE TIME LOG]     │
└──────────────────────────────────────────────────┘
```

The note field is optional, surfaced but not required. No task should require narrative for every time log — but the affordance is there for when a mechanic finds something notable.

**Manual entry (for Ray's "I did 3 hours and forgot to start the timer" problem):**

```
MANUAL TIME ENTRY:
┌──────────────────────────────────────────────────┐
│  Log time manually for TC-012                    │
│                                                  │
│  Duration:  [  3  ]  hr  [  0  ]  min            │
│             ↑ large steppers, +/- buttons 48px   │
│                                                  │
│  Start time: [13:00]  End time: [16:00]           │
│              (optional — for accuracy)           │
│                                                  │
│  Date: [2026-02-25]                              │
│                                                  │
│  [CANCEL]                       [LOG TIME]       │
└──────────────────────────────────────────────────┘
```

Duration entry uses large steppers (+/-) rather than a keyboard input. One tap adds 15 minutes. Hold to increase faster. This works with gloves. A keyboard number input requires precise tapping on a small target.

### 4.6 Date and Time Display Component

Zulu time is truth. Local time is context.

```
PRIMARY (for compliance records, sign-offs):
  2026-02-25 19:32Z
  (14:32 MST)

SECONDARY (for due dates, calendar events):
  2026-03-15
  (no time displayed — date-level granularity only)

RELATIVE (for "how long ago / how soon"):
  3 days ago
  in 12 days
  (shown alongside absolute date: "2026-02-22 • 3 days ago")

AIRFRAME TIME (hours-based durations):
  14,287.4 hr   (comma separator, 1 decimal, always "hr")
  Due at: 14,300.0 hr  (highlighted if < 50hr away)
  Remaining: 12.6 hr
```

**Never abbreviate month names in data contexts.** `Feb` is acceptable in UI labels (`Next inspection: Feb 25`). `2026-02-25` is required in all record-level displays. The FAA does not accept `Feb` as unambiguous — international date format ambiguity is a real compliance concern.

### 4.7 Squawk Card Component

Squawks are discrepancies. They have urgency. Their visual treatment reflects this.

```
OPEN SQUAWK:
┌─────────────────────────────────────────────────────┐
│  ⚠ OPEN  N447DE  •  2026-02-23 09:14Z               │
│                                                     │
│  Cracked exhaust manifold — left engine             │
│  Mia Chen  •  Visual inspection during 100-hr       │
│                                                     │
│  [Photo attached: 2 images]                         │
│                                                     │
│  ⚠  Awaiting DOM authorization to proceed          │
│  [AUTHORIZE REPAIR]  [DEFER WITH MEL]  [VIEW]       │
└─────────────────────────────────────────────────────┘
  Left border: 4px amber
  Action buttons visible in list view (DOM role only)
  AMT role: [VIEW] only, no auth buttons
```

```
DEFERRED SQUAWK:
┌─────────────────────────────────────────────────────┐
│  — DEFERRED  N447DE  •  2026-02-23                  │
│                                                     │
│  Cracked exhaust manifold — left engine             │
│  Deferred per MEL 77-10-01  •  Valid until: N/A     │
│  Authorized by: Sandra Mercado DOM  •  2026-02-23   │
│                                                     │
│  [VIEW DEFERRED SQUAWK]                             │
└─────────────────────────────────────────────────────┘
  Left border: 4px grey
  Clearly labeled as deferred — not disappeared
```

A resolved squawk shows the resolution record. A deferred squawk is never hidden — it persists in the aircraft record until it is either resolved or the deferral expires.

*Nadia note: The pattern where squawks "close" and disappear from view is a compliance anti-pattern. An open squawk that has been deferred is still an open squawk. It must remain visible and traceable. DOMs I've spoken with say this is one of the most common sources of FAA finding — a squawk was deferred, the deferral expired, and nobody noticed because the software moved it off the active list.*

---

## Part 5: Density Decisions

### 5.1 The Density Problem in Aviation MRO

Aviation MRO data is dense. A work order for an annual inspection has 40+ task cards. A parts receiving record has 16 line items. An aircraft maintenance history spans hundreds of records. Both competitors (Corridor and EBIS 5) solved this by defaulting to maximum density — small text, minimal padding, maximum rows per screen.

This was the right call when the users were always at a desktop and always had two hands free. It is the wrong call for Athelon's primary use case (mobile, one hand, hangar environment).

We are solving this with **density modes**, not a single density compromise.

### 5.2 Density Modes

**Comfortable (default on mobile, tablet):**
- Row height: 72px minimum
- Body text: 16px
- Cell padding: 16px
- Visible rows on a 390px-wide phone: ~7 (acceptable — scroll is not failure)

**Compact (available on desktop for power users like Carlos):**
- Row height: 48px
- Body text: 14px
- Cell padding: 10px
- Visible rows on a 1440px desktop: ~20

**Scan mode (DOM dashboard, owner overview):**
- Large status, minimal detail
- Row height: 56px (between comfortable and compact)
- Only the most critical information shown
- Optimized for "read the room" at a glance

Density is a per-user setting, persisted to their account. The mechanic's phone defaults to Comfortable. The DOM's desktop defaults to Compact. The owner's iPad defaults to Scan.

*Tanya note: Density mode switching must not require navigating to settings. Power users who switch between mobile and desktop need to switch density modes as part of their workflow. A tap-accessible density toggle in the main header works. Something like: ☰ (comfortable) / ≡ (compact) icon that's tappable without going to settings.*

---

## Part 6: Error and Empty States

### 6.1 The Aviation Principle for Error States

Aviation has a principle: **"No silent failures."** If something goes wrong in a flight system, you want to know immediately, loudly, and with specificity. The same principle applies to aviation maintenance software.

Errors in Athelon are never:
- A toast notification that disappears in 3 seconds
- A grey "Something went wrong" message
- A loading spinner that never resolves
- A blank page with no explanation

Errors in Athelon are always:
- Persistent until resolved or dismissed
- Specific about what went wrong
- Actionable — they tell you what to do next
- Visually distinct — you cannot confuse an error state with an empty state

### 6.2 Error State Taxonomy

**Tier 1: Blocking Error (prevents action)**
```
┌──────────────────────────────────────────────────────┐
│  ✕  Cannot sign off this task card                  │
│                                                      │
│  This task requires a part installation record.     │
│  Slick 4370 Magneto (P/N 4370) was listed as        │
│  required, but no installation record exists.        │
│                                                      │
│  What to do:                                         │
│  1. Confirm the part was installed                   │
│  2. Ask your parts manager to record the issue       │
│     in Athelon (Parts → Issue to Work Order)         │
│  3. Return here once the installation is recorded   │
│                                                      │
│  If this is incorrect, contact your DOM.            │
│  [CONTACT DOM]           [DISMISS]                  │
└──────────────────────────────────────────────────────┘
  Background: red-950 (#450a0a)
  Border: red-600
  Icon: ✕ in red-500 circle, 24px
  Action button: "CONTACT DOM" sends a Athelon notification
  — not an email, not a phone call prompt. In-app alert.
```

**Tier 2: Warning (action possible, but attention needed)**
```
┌──────────────────────────────────────────────────────┐
│  ⚠  Airframe time not updated                        │
│                                                      │
│  N447DE's airframe total time has not been           │
│  updated since this work order was opened            │
│  (12 days ago). Required for RTS sign-off.           │
│                                                      │
│  Current recorded time: 14,287.4 hr                  │
│  [UPDATE NOW]                      [REMIND LATER]   │
└──────────────────────────────────────────────────────┘
  Background: amber-950
  Border: amber-600
  Dismissible (unlike Tier 1)
  "Remind Later" sets a reminder for 4 hours from now
```

**Tier 3: Informational (no action required)**
```
┌──────────────────────────────────────────────────────┐
│  ℹ  Awaiting parts manager action                   │
│  Parts request PO-2026-0089 has been submitted.     │
│  Carlos Vega will be notified.                       │
└──────────────────────────────────────────────────────┘
  Background: blue-950
  Border: blue-600
  Auto-dismisses after 8 seconds (not 3 — give people time to read)
  Can be manually dismissed
```

**Connectivity Error (Tanya's specific requirement):**
```
┌──────────────────────────────────────────────────────┐
│  📵 Working offline                                  │
│                                                      │
│  No internet connection. Your changes are saved      │
│  locally and will sync when you reconnect.           │
│                                                      │
│  3 actions queued:                                   │
│  • TC-012 time log (1h 24m)                          │
│  • Squawk note on N447DE                             │
│  • Parts request for Champion REM37BY               │
│                                                      │
│  [VIEW QUEUE]                                        │
└──────────────────────────────────────────────────────┘
  Persistent banner — does not dismiss until online
  Does not block current view
  "View Queue" shows what's pending sync
```

### 6.3 Empty States

Empty states are not errors. But they must not be invisible. An empty list can look like a loaded list with no results — which in a compliance context is catastrophically ambiguous ("is there actually nothing here, or did something fail to load?").

**Empty state anatomy:**
```
         ┌──────────────────────────────────┐
         │                                  │
         │           [Illustration]         │
         │           (simple, contextual)   │
         │                                  │
         │    No task cards on this         │
         │    work order yet.               │
         │                                  │
         │    Add your first task card      │
         │    to get started.               │
         │                                  │
         │         [+ ADD TASK CARD]        │
         │                                  │
         └──────────────────────────────────┘
```

Every empty state must include:
- A clear statement of what's empty (not just "No results")
- Why it might be empty (is this expected? Is something missing?)
- An action (if the user can add/create) or an explanation (if this view is legitimately empty)

**Aviation-critical empty states that need special treatment:**

*Empty compliance audit trail for a date range:*
```
No audit records found for N447DE between 2024-02-01 and 2026-02-25.

This may mean:
• No work was performed on this aircraft in this period, OR
• Records were created before Athelon was set up for this aircraft

If you expected to see records here, verify that historical
data was imported correctly. Contact support if records are missing.

[CHECK IMPORT STATUS]   [CONTACT SUPPORT]
```

This is not "No records found." It is specific, it acknowledges what might be wrong, and it provides an action. An FAA inspector asking for records cannot see a blank screen without an explanation.

*Empty parts inventory (for a required part):*
```
No inventory found for P/N 4370 (Slick Magneto).

This part is required by TC-007 on WO-2026-0041.

Either: This part has not been received into inventory,
or the part number was entered differently at receiving.

[CHECK PURCHASE ORDERS]   [REQUEST PART]   [SEARCH VARIANTS]
```

---

## Part 7: Interaction Patterns

### 7.1 Forms and Field Behavior

- **Autosave:** All form fields in record edit mode autosave after 500ms of inactivity. No save button. Sync state shows in the header: `Saving...` → `Saved ✓` → (disappears after 2s).
- **Inline editing:** Click/tap on a field to edit it. No "Edit mode" toggle. The record is always editable by users with permission.
- **Required fields:** Marked with a red asterisk before the label, not after. Users who are used to paper forms expect the asterisk before the field name.
- **Validation:** Real-time validation as the user types, but errors appear on field blur (not on keystroke). Typing a part number doesn't show "invalid" until you've left the field.

### 7.2 Confirmation Dialogs

Reserved for **destructive or irreversible actions only**. Not for saving. Not for navigation. Only for:
- Deleting a record
- Voiding a work order
- Overriding a compliance block

```
CONFIRMATION DIALOG:
┌──────────────────────────────────────────────────┐
│  Delete this time log entry?                     │
│                                                  │
│  This will remove 1h 24m logged by Ray Kowalski  │
│  on TC-012, 2026-02-25. This action cannot       │
│  be undone.                                      │
│                                                  │
│  [CANCEL]              [DELETE TIME LOG]         │
└──────────────────────────────────────────────────┘
  Destructive button: red background, white text
  Cancel: text button (no background), left-aligned
  "Cannot be undone" is stated explicitly — always
  Modal is centered on desktop, bottom sheet on mobile
```

### 7.3 Navigation and Context Preservation

Browser back button always works. This is not negotiable — Corridor's failure on this (pressing back in Corridor ENVISION sometimes destroys unsaved work) is one of the most complained-about behaviors in our teardown sessions.

Implementation note for Chloe: URL state should encode enough information that a hard refresh returns the user to their exact previous state (specific tab, filters, scroll position where practical). This means filter state, active tab, and open drawer/panel state should be in the URL query string.

### 7.4 Notifications and Alerts

In-app notification center: bell icon in the header. Badge count. Tapping opens a panel with recent notifications.

Push notifications (mobile): reserved for high-priority actions requiring the user's attention:
- Authorization request (DOM: "Mia flagged a squawk requiring your authorization")
- Parts received (Carlos: "Slick 4370 has been received, PO-2026-0089 closed")
- Task card ready to sign (AMT: "TC-012 parts are now installed and ready for sign-off")
- Compliance flag (DOM: "IA certificate for Ray Kowalski expires in 30 days")

Push notifications never fire for:
- Someone logging time
- Parts requests being submitted (Carlos sees these in his queue, not as push)
- Work order status changes unless they require immediate action

*Nadia note: Push notification fatigue is real. If we push too much, the DOM turns off notifications — and then she misses the authorization request that's blocking a mechanic. We should err heavily toward fewer, higher-signal notifications. The test: "If Sandra is in a meeting, would she step out to handle this?" Only push if yes.*

---

## Part 8: Component Tokens (Design System Foundation)

For Chloe to start the Storybook build, here are the base tokens. These are decisions, not suggestions.

```
Spacing:
  --space-1:   4px
  --space-2:   8px
  --space-3:   12px
  --space-4:   16px
  --space-5:   20px
  --space-6:   24px
  --space-8:   32px
  --space-10:  40px
  --space-12:  48px
  --space-16:  64px

Border Radius:
  --radius-sm:   4px   (badges, chips)
  --radius-md:   8px   (cards, inputs)
  --radius-lg:   12px  (modals, drawers)
  --radius-full: 9999px (only for avatars — nothing in the core UI)

Shadow (for elevated surfaces):
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.5)
  --shadow-md:  0 4px 12px rgba(0,0,0,0.4)
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.35)

Transition:
  --transition-fast:   100ms ease
  --transition-normal: 200ms ease
  --transition-slow:   350ms ease

  Nothing animation-heavy. Nothing that makes a mechanic
  wait for a component to finish before they can interact.
  Transitions are for feedback, not delight.

Z-index layers:
  --z-base:    0
  --z-sticky:  100   (sticky headers, timer bar)
  --z-drawer:  200   (side drawers, bottom sheets)
  --z-modal:   300   (confirmation dialogs)
  --z-overlay: 400   (sign-off overlay)
  --z-toast:   500   (notifications)
```

---

## Part 9: Interaction Checklist — Every Component Must Pass

Before a component is considered complete, it passes this checklist. This is the equivalent of a task card for UI components.

```
□  Works at 30% screen brightness (dark mode, high contrast text)
□  Tap targets ≥60px on mobile
□  Status communicated by color + icon + text (not color alone)
□  Works with VoiceOver / TalkBack (ARIA labels present)
□  Keyboard navigable (Tab order logical, Enter/Space trigger actions)
□  Error state designed and implemented (not just happy path)
□  Empty state designed and implemented
□  Offline state considered (does the component show stale data gracefully?)
□  No animation blocks interaction (click registered before animation completes)
□  Zulu time shown on any timestamp with compliance significance
□  Part numbers and IDs use monospace font
□  Destructive actions have confirmation dialogs
□  Sign-off flow includes full certification statement (not just "confirm?")
```

*This checklist lives in Storybook as a documentation requirement on every component story. A component without passing the checklist is not shippable. No exceptions. — FC*

---

*Finn Calloway, 2026-02-22. Next step: Figma component library build, starting with StatusBadge, TaskCard, SignOffFlow, and PartReference. Target for Chloe review: Week 3, Day 2.*
