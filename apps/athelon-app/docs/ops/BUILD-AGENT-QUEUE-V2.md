# BUILD-AGENT-QUEUE-V2.md — Feature Build Queue
# Source: research/Notes/FEATURE-RESEARCH-AND-READINESS-REPORT.md
# Created: 2026-03-04 16:30 UTC
# Max concurrent agents: 4

## Backend Wave 0 (Jarvis direct — must complete before frontend agents)
- [x] BQ2-001: Schema — 7 OJT tables + maintenancePrograms + voiceNotes + LLP fields
- [ ] BQ2-002: convex/ojt.ts — CRUD for curricula, sections, tasks, jackets, stage events, trainer auth, goals
- [ ] BQ2-003: convex/maintenancePrograms.ts — Chapter 5 interval CRUD, multi-trigger computation
- [ ] BQ2-004: convex/voiceNotes.ts — audio storage, transcript persistence
- [ ] BQ2-005: Deploy to Convex + verify

## Frontend Wave 1 — OJT Core (4 agents)
- [ ] BQ2-010: OJT Jacket Management — curricula CRUD, section/task editor, ATA code org
- [ ] BQ2-011: OJT Stage Sign-off — 4-stage workflow UI, trainer authorization, append-only events
- [ ] BQ2-012: OJT Radar Chart + Dashboard — recharts RadarChart, jacket overview, progress rings, multi-tech compare
- [ ] BQ2-013: LLP Dashboard + Fleet Alerts — remaining-life calcs, stoplight grid, stack leader, fleet-level view

## Frontend Wave 2 — Predictions & Efficiency (4 agents)
- [ ] BQ2-020: Predictive Maintenance Enhancement — maintenancePrograms viewer/editor, multi-trigger display, level loading viz
- [ ] BQ2-021: Voice-to-Text Upgrade — move VoiceNoteRecorder to Convex storage, Whisper integration UI, editable transcripts
- [ ] BQ2-022: Training Sign-off Persistence — wire TrainerSignOffQueue to Convex mutations, OKR tracking, trainer records
- [ ] BQ2-023: Efficiency Wiring — connect real timeEntries data, remove synthetic estimates, balanced KPI display

## Frontend Wave 3 — Career & Integrations (4 agents)
- [ ] BQ2-030: ADS-B Display — flight session viewer, utilization comparison, tach drift display, sync status
- [ ] BQ2-031: Sales Pipeline from Predictions — CRM opportunity auto-creation, configurable window, CSR notification
- [ ] BQ2-032: Repair Station Audit Dashboard — Part 145 readiness aggregation, training/tool/AD compliance metrics
- [ ] BQ2-033: Capabilities List — FAA OpSpecs format, ratings display, make/model/series authorizations

## Frontend Wave 4 — Business Ops & Gamification (4 agents)
- [ ] BQ2-040: FAA Diamond Award Tracking — AMT award hour tracking, org diamond eligibility, progress dashboard
- [ ] BQ2-041: Career Profile Dashboard — experience dashboard, certification display, time-per-aircraft rollups
- [ ] BQ2-042: Gamification Layer — progress rings, milestone badges, team dashboards, streak tracking, incentive templates
- [ ] BQ2-043: Part 145 Enhancements — agent-assisted inspection suggestions, override tracking, audit trail enrichment

## Total: 5 backend + 16 frontend = 21 build items
## Estimated: ~4-5 hours with 4 concurrent agents
