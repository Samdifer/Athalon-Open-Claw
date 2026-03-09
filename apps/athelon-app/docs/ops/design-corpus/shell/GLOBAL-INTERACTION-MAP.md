# Global Interaction Map

This document maps the global interactions that shape user experience across all
internal surfaces.

## Command Search and Navigation

### TopBar search trigger

- Lives in `TopBar.tsx`
- Opens a command dialog from the header
- Supports:
  - hard-coded example work-order and fleet jumps in the current implementation
  - notification access in the same shell zone

### Global command palette

- Lives in `CommandPalette.tsx`
- Opens on `Cmd/Ctrl+K`
- Role-filters navigation and action items via `canRoleAccessPath`
- Queries `api.gapFixes.globalSearch` when search length >= 2
- Search result groups:
  - Work Orders
  - Aircraft
  - Work Cards
- Navigation/action groups include:
  - dashboard
  - work orders
  - fleet
  - parts
  - scheduling
  - billing
  - sales
  - CRM prospect intelligence
  - reports
  - settings

## Keyboard Shortcuts

- Lives in `KeyboardShortcuts.tsx`
- Ignores input/textarea/select targets
- Current combos:
  - `?` -> shortcuts help
  - `nw` -> `/work-orders/new`
  - `ni` -> `/billing/invoices/new`
  - `gd` -> `/dashboard`
  - `gw` -> `/work-orders`
- This is a lightweight, global, mnemonic shortcut layer rather than a per-page hotkey system

## Global Timer

- Lives in `GlobalTimerWidget.tsx`
- Current capabilities:
  - show active or paused timer
  - start timer from shop, work-order, task, or step context
  - pause, resume, or stop timer
- Uses:
  - `api.timeClock.getActiveTimerForTechnician`
  - `api.workOrders.listActive`
  - `api.taskCards.listTaskCardsForWorkOrder`
- This is a cross-surface control plane for labor capture

## Notifications

- Lives in `TopBar.tsx`
- Current capabilities:
  - unread badge count
  - recent notification list
  - mark one or all as read
  - direct link-out into relevant surfaces
  - inline reorder-alert shortcut into Parts Alerts
- Notification types currently include:
  - work-order changes
  - quotes
  - invoices
  - discrepancies
  - parts
  - RTS readiness
  - assignments
  - system messages

## Location Selection

- Lives in `LocationSwitcher.tsx`
- Selection is persisted in localStorage per org
- Uses `api.shopLocations.list`
- Surfaces confirmed to depend on selected location:
  - Scheduling
  - Parts
  - some shop-location filtered list views

## Org and Bootstrap Context

- Lives in `OrgContextProvider.tsx`
- Combines bootstrap readiness and technician/org identity
- Drives:
  - whether the app is ready
  - whether profile linkage is missing
  - the org and technician IDs many pages use to decide whether they can query

## Connectivity and Install Signals

- `OfflineStatusBanner`
- `PWAInstallPrompt`

These are shell-level signals and should not be reimplemented inside individual pages.

## Risks To Watch

- TopBar command dialog and CommandPalette may diverge in behavior if redesigned separately
- Timer context can drift from My Work and billing time workflows
- Location selection can become misleading if more surfaces ignore the shared state than honor it
