# Athelon — Organized Feature List

> Extracted from: "Athelon out and global adoption notes" + "id 345 nate and sam athelon story and early review"

---

## 1. Work Order Management

- **Work order lifecycle** — Quote creation → acceptance → indoc → inspection → repair → review → test flight → release
- **Task cards** — Create, assign, track tasks within work orders; upload step-by-step instructions from repair station forms
- **Squawks** — Create and track discrepancies within work orders
- **Work order assignment** — Assign technicians to work orders, assign specific tasks within WOs
- **WIP dashboard** — View work in progress for teams, switch leads/shifts
- **Drag-and-drop scheduling** — Visual drag-and-drop interface for work order scheduling
- **Gantt chart view** — Timeline visualization of work order scheduling
- **Logbook entry generation** — Auto-generate logbook entries based on work order completion (equipment list, sign-offs, common squawks, references)
- **Agent-assisted inspections** — AI suggests common inspection items per aircraft type, Chapter 5 recommendations, FARs; flags missed items (e.g., expired transponder battery)
- **Override tracking** — If technician overrides an AI suggestion, log who/why with history and access level verification

---

## 2. Fleet & Aircraft Management

- **Fleet view** — Overview of all aircraft in fleet with status
- **Aircraft onboarding wizard** — Multi-step wizard to add aircraft (FAA N-number lookup, auto-populate from FAA registry)
- **Aircraft detail** — Times and cycles, engine type, operator info, total airframe time, Part 91/135 designation, base location
- **ADS-B integration** — Track real-time flight data; estimate time-in-air, cycles, hops; update maintenance predictions automatically
- **Customer/aircraft association** — Link aircraft to customer accounts
- **Loaner aircraft tracking** — On loan, maintenance, retired states

---

## 3. Predictive Maintenance & Scheduling

- **Chapter 5 maintenance schedule ingestion** — Parse aircraft maintenance manual Chapter 5 to derive approved maintenance schedules per serial number
- **Multi-trigger tracking** — Handle date-based, time-based, and cycle-based maintenance triggers (whichever comes first/greater)
- **Phase inspection support** — Large aircraft on phase inspections vs. annual inspections for Part 91
- **Life-limited component tracking** — Track LLPs, inspections, preventative maintenance items
- **Predictive maintenance projections** — Project future maintenance events 3+ years out based on usage profile and ADS-B data
- **AD tracking & compliance** — Track Airworthiness Directives, service bulletin compliance
- **Maintenance reminders** — Auto-schedule reminders for upcoming maintenance; auto-book customers
- **Work scope pre-calculation** — When aircraft comes in, work scope already calculated based on predictions
- **Level loading optimization** — Balance maintenance events across calendar to avoid over/under-production
- **Drop-dead vs. ideal timing** — Optimize maintenance windows between earliest opportunity and latest deadline
- **ADS-B usage correction** — Correction factor from ADS-B estimated time to tach time
- **Logbook scanning/OCR** — Upload historical aircraft logbooks; OCR text recognition; create operational history profile (à la Blue Tail Aviation)
- **Pre-buy inspection service** — Ancillary service using compiled operational history

---

## 4. Scheduling & Capacity Planning

- **Drag-and-drop scheduler** — Visual scheduling board (week/month views)
- **Bay management** — Configure maintenance bays/locations
- **Capacity view** — Visual capacity overview across teams and bays
- **Auto-schedule (magic scheduler)** — AI-assisted scheduling optimization
- **Financial planning integration** — Revenue forecasting tied to scheduling
- **Team composition analysis** — AI analyzes team skill mix vs. work order requirements; warns if mismatch (e.g., sheet metal project needs 4 specialists but only 1 assigned)
- **Critical path tracking** — PMBOK + Lean principles applied to work order project management

---

## 5. OJT Training & Technician Development

- **Training jacket system** — Per-aircraft training curriculum organized by: Initial → Basics → Intermediate → Advanced → Specialties
- **ATA code organization** — Tasks arranged by ATA code in ascending order within sections
- **Specialty modules** — Sheet metal, avionics installations, AC servicing, aircraft painting, troubleshooting, etc.
- **4-stage training flow per task** — (1) Trainer demonstrates while tech watches → (2) Tech performs with trainer assisting → (3) Tech performs solo while trainer observes → (4) Oral/practical test → Signed off
- **Scoring system** — 1–6 points per task (1 point per stage completed); rolls up to charts/graphs
- **Digital sign-off workflow** — Tech marks completion → Authorized trainer verifies → Chief inspector updates master record (replaces physical binder system)
- **Multi-aircraft training** — Shared tasks across aircraft types; individual training flows per aircraft; cross-aircraft completion rollups
- **Trainer dashboard** — Trainers see items needing sign-off; add notes; maintain personal training record of how many/who they've trained
- **OKR integration** — Leads set weekly/monthly/yearly training goals for technicians
- **Asynchronous training** — Techs can work with different authorized trainers; system detects pending sign-offs automatically
- **Reporting** — Completion by ATA code, by category, by aircraft; radar chart of skill areas; bar graphs; team composition views

---

## 6. Technician Efficiency & Growth

- **Efficiency scoring** — New hires start at reduced utilization; adjusted based on experience assessment (resume + quiz)
- **Growth curves** — Customizable efficiency growth targets per technician over time
- **Efficiency dashboard** — Current efficiency number, target chart, actual vs. expected growth
- **Radar chart** — Visual breakdown of training completion by skill category per aircraft/engine
- **Gamification** — Training progress visible and comparable; motivates through visibility
- **Incentive templates** — Standardized templates for distributing rewards based on training achievement
- **Balanced KPIs** — Primary: on-time delivery + first-time fix rate (NOT billable hours/efficiency as primary KPI)
- **Self-organizing training** — Visibility into available training allows techs to pursue preferred specialties
- **Run/taxi qualifications** — Track run-up procedures, safety checklists, instructor sign-offs, pilot authorizations for uncertificated personnel

---

## 7. Technician Profile & Career Platform

- **Career experience dashboard** — Comprehensive view of all aircraft worked on, systems proficiency, depth of experience
- **Resume parsing (Elevate MRO)** — Upload resume → AI identifies prior companies → correlates with FAA aircraft database → suggests aircraft experience
- **Standardized nomenclature index** — Single source of truth for airframe, powerplant, engine, avionics naming across industry
- **Experience time calculation** — Roll up total time per aircraft across multiple employers
- **Interactive experience dashboard** — Add, modify, arrange all airframe/powerplant/avionics entries
- **Active/updated resume** — Combines OJT training + career history into always-current resume
- **Discoverable profiles** — Employers can find and recruit technicians through marketplace
- **IA renewal tracking** — Track Inspector Authorization renewal status, required inspections, evidence gathering
- **Repairman certificate tracking** — Track certifications outside of employer
- **Part 91/experimental experience** — Log non-employer maintenance experience (personal aircraft, experimental builds)
- **Mechanic logbook** — Self-recording system for unverified experience outside an organization
- **Military skill bridge** — Program for military mechanics converting to FAA A&P license (school or testing path)
- **Interview prep AI** — Iterative AI-guided interview practice; evaluates answers; recommends learning opportunities
- **Auto resume generation** — Generate compelling resume from all captured experience data
- **Gap analysis** — AI identifies resume gaps and recommends ways to fill them before job applications

---

## 8. Certifications & Awards

- **FAA Diamond Award tracking** — Track 12+ hours of approved training per employee; auto-apply via FAA FAST system AMT Corner
- **In-house training hours** — Record and apply for FAA AMT credit for internal training
- **Wyvern Wingman certification** — Track organizational safety certification
- **IS-BAO inspection tracking** — International safety audit standards
- **Individual mechanic awards** — Track annual training completion for individual FAA awards
- **Custom industry certification standard** — Athelon-created certification for organizations and individuals based on OJT completion and audit
- **AI-assisted audit** — Organizations self-report against standards; AI audits and provides provisional score; human review for final certificate
- **Common language standard** — Bridge nomenclature gaps between helicopter/fixed-wing, jet/piston, turboprop/ultra-long-range

---

## 9. Parts, Inventory & Tool Management

- **Parts tracking** — Receiving, inspection, disposition (approve → move to inventory)
- **Parts states** — Fiber move, pending disposition, approved, in inventory
- **Rotables management** — Track rotable components; record actions (installs, serviceable, in shop, at vendor)
- **Inventory counting** — Physical inventory count workflows
- **Core tracking** — Track core returns
- **Shipping & receiving** — Inbound/outbound parts logistics
- **Tool crib management** — Centralized tool tracking; check-out/check-in
- **Calibration tracking** — Tools due for calibration; send for cal workflows; vendor management for calibration
- **QR code generation** — Generate QR codes for tools linked to vendor/calibration data
- **Two-bin Kanban system** — Consumables management with automatic reorder triggers
- **Consumable ordering** — Single place to order all consumables integrated into scheduling
- **Predictive consumable spend** — Annual forecasting of consumable/deal spend based on schedule
- **Message alerts** — Notifications for inventory events, reorder points
- **Counter sales** — Over-the-counter parts sales with auto-numbering, sales history, void capability

---

## 10. Customer Relationship Management

- **Customer portal** — Customer login to view: dashboard, work orders (with stage tracking), quotes, invoices, fleet of aircraft
- **Customer history** — Complete interaction history, research, staleness indicators, upcoming maintenance
- **Sales pipeline from predictions** — Use predictive maintenance data to create proactive sales pipeline; contact customers before maintenance events
- **Customer onboarding** — Aircraft profile creation for new customers with predictive maintenance auto-populated
- **Email notifications (SendGrid)** — Email updates for customers who don't want to log into app
- **Institutional knowledge retention** — CRM data persists when CSR leaves; replacement staff has full context
- **Vendor reverse-audit** — Operators can audit/rate maintenance organizations; build backup vendor lists

---

## 11. Financial & Business Operations

- **Billing & invoicing** — Create invoices linked to work orders
- **Labor kits** — Prepare labor kits for work orders
- **Warranty claims** — Initiate and track part defect warranty claims
- **QuickBooks integration** — Sync financial data; push transactions for small shops
- **Cash/accrual accounting views** — CFO-level financial visibility
- **Revenue forecasting** — Forecasted revenue, profitability, runway metrics
- **Quote management** — Create, track, customer acceptance flow
- **Accurate quoting from industry data** — Use aggregate industry task-time data for quoting accuracy

---

## 12. Industry-Wide Data & Benchmarking (Platform Scale)

- **Labeled task-time data collection** — Anonymized data on how long specific maintenance tasks take across industry
- **Industry benchmark quote book** — Common reference for task durations by aircraft type, adjusted for technician experience/efficiency
- **Price mapping** — Composite price comparison across the industry
- **Tool/facility requirements database** — Recommended tools per job from manufacturer + actual industry practice
- **KPI benchmarks** — Industry-wide efficiency, training, compliance benchmarks
- **Adoption/workforce trend tracking** — Track technology adoption, workforce efficiency changes across industry

---

## 13. Repair Station & Compliance

- **Repair station audit dashboard** — Seeded data for 145 repair station audits
- **Capabilities list management** — Track which aircraft/systems the organization is authorized to maintain
- **User role-based access** — Granular privilege assignment (mechanic vs. lead vs. inspector vs. admin vs. counter sales); context-aware UI (hide irrelevant sections)
- **Multi-location support** — Configure multiple shop locations with separate or shared data

---

## 14. UX & Accessibility

- **Voice-to-text notes** — Whisper or similar AI transcription for mechanic notes throughout the app
- **Spell checking** — Integrated spell check (Grammarly-like) for all text input; accommodate dyslexic users
- **Simple, modular design** — Easy navigation for complex tasks; balance modularity with granularity
- **Plain-language descriptions** — Every feature should explain itself without requiring expert knowledge
- **Human-in-the-loop decision making** — AI suggestions always deferring to human authority on sign-offs and safety decisions

---

## 15. Marketplace & Recruiting (Separate Product)

- **Mechanic job marketplace** — Technicians discovered by employers based on profile/skills
- **Employer portal** — Post jobs, view candidate profiles, recruit
- **AI-powered matching** — High-likelihood job matching based on deep profile data, not just preferences
- **Career path discovery** — Wiki-style content explaining career options, day-to-day realities, progression paths
- **White-collar → blue-collar pipeline** — Recruitment pipeline targeting career-changers into aviation maintenance
- **Open source + closed source intelligence** — Synthetic data on market needs, organizational health ratings, matching algorithms
- **AMT school student profiles** — Students build profiles during school, present to employers at graduation
