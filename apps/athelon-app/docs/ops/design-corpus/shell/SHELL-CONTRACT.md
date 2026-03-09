# Shell Contract

This document defines the current shell contract and the constraints later redesign
waves should preserve.

## Current Shell Composition

The internal app shell is composed in `app/(app)/layout.tsx` as:

1. `SidebarProvider`
2. `AppSidebar`
3. `TopBar`
4. `OfflineStatusBanner`
5. main content area with `Outlet`
6. global overlays:
   - `CommandPalette`
   - `KeyboardShortcuts`
   - `PWAInstallPrompt`

`OrgContextProvider` sits above `AppLayout` in the router stack and is therefore part
of the effective shell contract.

## Stable Shell Zones

### Zone 1: Left navigation shell

- Owned by `AppSidebar.tsx`
- Provides major route-family access and sub-links
- Contains role-filtered navigation and location/org-related shell affordances

### Zone 2: Top action bar

- Owned by `TopBar.tsx`
- Current functions:
  - sidebar toggle
  - search trigger
  - global timer widget
  - theme toggle
  - notifications popover

### Zone 3: Connectivity and install state

- `OfflineStatusBanner`
- `PWAInstallPrompt`

### Zone 4: Main work area

- Scrollable routed content inside `<main>`
- Suspense fallback is owned by the shell, not by individual surfaces

### Zone 5: Global overlays and shortcuts

- `CommandPalette`
- `KeyboardShortcuts`

## Shell-Owned Data Subscriptions

The shell currently owns these live subscriptions or near-shell data seams:

- `OrgContextProvider`
  - `api.onboarding.getBootstrapStatus`
  - `api.technicians.getMyContext`
- `TopBar`
  - notifications
  - reorder alerts
- `CommandPalette`
  - `api.gapFixes.globalSearch`
- `GlobalTimerWidget`
  - active timer
  - active work orders
  - task cards for selected work order
- `LocationSwitcher`
  - `api.shopLocations.list`
  - localStorage-backed selection state

## Non-Negotiable Shell Behaviors

Later redesign waves should preserve these behaviors unless intentionally replaced:

1. Global search remains available from everywhere in the internal app
2. Timer state remains globally visible and operable
3. Notification state remains globally visible
4. Sidebar remains role-filtered
5. Org/bootstrap state is resolved before routed pages depend on it
6. Offline and PWA affordances remain outside individual page ownership

## Mode Expectations Inside the Shared Shell

- Execution-mode surfaces:
  - can be denser and more state-forward inside the content area
  - should still inherit the same global shell contract
- Office-mode surfaces:
  - can rely more heavily on predictable sidebar and top-bar rhythm
- Commercial-mode surfaces:
  - may want lighter interior treatments
  - should still preserve shell-level search, notifications, and navigation consistency

The shell should not be fully reskinned per role. The mode split should primarily
happen inside surfaces and in secondary navigation affordances.

## Shell Risks for Later Waves

- `AppSidebar.tsx` and `mro-access.ts` do not currently describe the same nav model
- Top-bar search and command palette overlap conceptually but are implemented separately
- Global timer and My Work / billing time views can drift if redesigned independently
- Location selection is shell-owned but only some surfaces currently honor it

## Follow-up Needed Before Wave 1+

- Decide whether shell-facing data hooks should be extracted for:
  - notifications
  - global search
  - timer state
  - location list
- Clarify whether role-specific landing pages should modify shell defaults or only initial route choice
