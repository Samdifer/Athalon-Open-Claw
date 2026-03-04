# Build Agent Queue — Auto-Dispatch

This file tracks which features have been dispatched to build agents and which are queued.
The watchdog cron reads this to decide what to spawn next.

## Status Legend
- `queued` — ready to build
- `dispatched` — agent spawned, in progress
- `done` — agent completed, code landed
- `skip` — external dependency or backend-only

## Completed (Waves 1-3)
| MBP | Feature | Status |
|-----|---------|--------|
| MBP-0017 | RBAC permission matrix | done |
| MBP-0105 | MRO role definitions | done |
| MBP-0106 | Admin invite flow | done |
| MBP-0107 | Role-based sidebar nav | done |
| MBP-0108 | Route authorization guards | done |
| MBP-0109 | Role display in personnel | done |
| MBP-0003 | Voice notes + transcript | done |
| MBP-0004 | Spell-check + MRO dictionary | done |
| MBP-0077 | Invoice PDF generation | done |
| MBP-0078 | Quote PDF generation | done |
| MBP-0079 | RTS document PDF | done |
| MBP-0080 | WO summary PDF | done |
| MBP-0061 | CSV export on all list pages | done |
| MBP-0062 | Date range filter on exports | done |

## Queue (Priority Order)

### Wave 4 — P0 Core
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0051 | WO header KPI + date commitments | P0 | done |
| MBP-0053 | Secondary quote + squawk identity | P0 | done |
| MBP-0032 | WO docs + compliance separation | P0 | done |
| MBP-0033 | Task execution + signoff enhancements | P0 | done |

### Wave 5 — P0 Parts + Inspection
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0035 | Task-level parts traceability | P0 | done |
| MBP-0037 | Parts request intake control | P0 | done |
| MBP-0049 | Receiving inspection workflow | P0 | done |
| MBP-0021 | Inventory master tab | P0 | done |

### Wave 6 — P0 Lead + Evidence
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0041 | Lead technician workspace | P0 | done |
| MBP-0045 | In-dock + RTS evidence hub | P0 | done |
| MBP-0055 | completeStep authorization | P0 | done |
| MBP-0136 | WO routing templates + standard minutes | P0 | done |

### Wave 7 — P1 Enhancements
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0012 | Logbook entry generation | P1 | done |
| MBP-0034 | Time visibility (est vs actual) | P1 | done |
| MBP-0081 | Download PDF button integration | P1 | done |
| MBP-0082 | Print button with print CSS | P1 | done |

### Wave 8 — P1 Parts + Workflow
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0038 | Parts status color labels | P1 | done |
| MBP-0036 | WO parts lifecycle board | P1 | done |
| MBP-0048 | Part return-to-parts workflow | P1 | done |
| MBP-0132 | Quote builder + WO cost estimation | P1 | done |

### Wave 9 — P1 Training + Analytics
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0005 | Trainer sign-off queue | P1 | done |
| MBP-0006 | Efficiency baseline by experience | P1 | done |
| MBP-0007 | Growth curve dashboard | P1 | done |
| MBP-0040 | Turnover notes + AI assist | P1 | done |

### Wave 10 — P1 Integration + Advanced
| MBP | Feature | Priority | Status |
|-----|---------|----------|--------|
| MBP-0025 | Training compliance records | P1 | done |
| MBP-0121 | Approved data ref on task step | P1 | done |
| MBP-0124 | Raise finding from task card | P1 | done |
| MBP-0020 | Inventory control + Kanban | P1 | done |
