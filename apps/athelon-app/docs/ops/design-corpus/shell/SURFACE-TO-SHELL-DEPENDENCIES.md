# Surface to Shell Dependencies

This document maps Wave 0 surfaces to the shell capabilities they currently rely on.

## Dependency Table

| Surface | Org/bootstrap context | Sidebar/nav | Top bar | Command / shortcuts | Global timer | Location switcher | Notifications / alerts | Notes |
|---|---|---|---|---|---|---|---|---|
| Work Orders | Yes | Yes | Yes | Yes | Yes | indirect only | indirect | Deepest shell coupling in Wave 0 because of timer, notes, voice, and route depth |
| Lead Workspace | Yes | Yes | Yes | Yes | indirect | no primary dependency | indirect | Sits between execution and coordination; depends heavily on shell navigation |
| My Work | Yes | Yes | Yes | Yes | Yes | no | indirect | Personal execution surface overlaps with global timer semantics |
| Scheduling | Yes | Yes | Yes | Yes | no direct timer dependency | Yes | indirect | Strongest location dependency in Wave 0 |
| Parts | Yes | Yes | Yes | indirect | no direct timer dependency | Yes | Yes | Top-bar reorder alert links directly into this route family |
| Compliance | Yes | Yes | Yes | indirect | no | no | indirect | More hub-like than command-heavy, but still shell-dependent for context and navigation |

## Surface Notes

### Work Orders

- Assumes global navigation, shell context, and timer continuity
- Uses shell-adjacent shared panels, which makes it more coupled than a plain routed page

### Lead Workspace

- Depends on shell routing to move into Work Orders, Scheduling, and Training
- Could later warrant specialized secondary nav but should remain inside the shared shell

### My Work

- Depends on org and technician identity from the shell
- Any timer redesign has to account for both My Work and the top-bar widget

### Scheduling

- Uses the shared selected-location state directly
- Also creates its own internal page-nav and workbench layers inside the main content area

### Parts

- Uses selected location and benefits from global reorder alerts
- Combines shell context with scan-and-operate interaction patterns

### Compliance

- Less dependent on shell controls than Scheduling or Work Orders
- Still depends on shell context and sibling-route navigation for multi-step review work

## Cross-Surface Shell Seams To Protect

- Timer seam:
  - Work Orders
  - My Work
  - Billing time views
- Location seam:
  - Scheduling
  - Parts
  - selected filtered list views elsewhere
- Search seam:
  - Work Orders
  - Fleet
  - task-card navigation
- Notification seam:
  - Parts alerts
  - work-order and billing status notifications
