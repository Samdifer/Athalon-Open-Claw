# Team Bravo User Journey - Production Control and Scheduling

## Scenario

Morning planning meeting across DEN and COS with 30 active work orders and limited bay capacity.

## Journey Timeline

1. Controller opens `/scheduling`, reviews unscheduled backlog and lane occupancy.
2. Scheduler drags unscheduled work into bay lanes and reorders row priorities.
3. Team opens analytics and roster side panels for labor visibility.
4. Director opens command center, adjusts capacity buffer and shop-rate assumptions.
5. Team switches locations and validates assignment partitioning by station.

## What Worked

- Board interactions supported fast schedule adjustments.
- Row reordering and archive/restore mechanics matched planner mental model.
- Fullscreen board mode improved shared-screen operations.

## Friction and User Reactions

| Step | Friction | User Narrative |
| --- | --- | --- |
| 2 | Drag-drop feedback was visually subtle in crowded lanes | "I need clearer drop confirmation before I move on." |
| 3 | Panel popout state was easy to lose after context switches | "I keep reopening panels after every board reset." |
| 4 | Financial assumptions saved separately from scheduling assumptions | "I want one apply-all profile for shift-level what-if planning." |
| 5 | Location scope confidence required manual spot checks | "Show me a location lock indicator I can trust." |

## Anticipated Edge Failures

- Assignment appears in wrong location after rapid switch + drag sequence.
- Command center defaults overwrite local planner preference without warning.

## User Story Extracts

- As production control, I want stronger visual lane-drop confirmations so I can avoid accidental misplacement.
- As a scheduler, I want persistent panel workspace presets so I can recover quickly after interruptions.
- As leadership, I want explicit location lock state so cross-station planning mistakes are prevented.
