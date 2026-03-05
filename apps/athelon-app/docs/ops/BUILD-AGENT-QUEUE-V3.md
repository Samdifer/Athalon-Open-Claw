# Build Agent Queue V3 — Feature Build Sprint
# Generated: 2026-03-05 13:40 UTC
# Model: anthropic/claude-opus-4-6
# Max concurrent agents: 4
# Agents MAY modify convex/ files — deploy with: npx convex dev --once --typecheck=disable

## Queue

### Wave 1 — File Upload Foundation + Photos (2 agents)
- [x] TEAM-A: MBP-0063 (Convex file storage), MBP-0064 (FileUpload component), MBP-0065 (photo on step sign-off), MBP-0066 (photo on discrepancy) ✅ 3438143
- [x] TEAM-B: MBP-0067 (WO document attachment), MBP-0068 (photo gallery lightbox), MBP-0117 (conformityInspections table), MBP-0118 (conformity mutations) ✅ 5a1623a

### Wave 2 — Notifications + PDF (2 agents)
- [x] TEAM-C: MBP-0071 (notifications table), MBP-0072 (bell icon), MBP-0073 (dropdown panel), MBP-0074 (auto-notifications), MBP-0075 (mark read), MBP-0076 (preferences) ✅
- [x] TEAM-D: MBP-0077 (invoice PDF), MBP-0078 (quote PDF), MBP-0079 (RTS PDF), MBP-0080 (WO PDF), MBP-0081 (download button), MBP-0082 (print button) ✅

### Wave 3 — Dashboard + Billing Wiring (2 agents)
- [ ] TEAM-E: MBP-0056 (WO pie chart), MBP-0057 (revenue trend), MBP-0058 (TAT bar), MBP-0059 (tech utilization), MBP-0060 (billing analytics)
- [ ] TEAM-F: MBP-0069 (labor rate auto-apply), MBP-0070 (pricing→invoice wiring), MBP-0119 (tax calculation), MBP-0120 (computeTaxForInvoice), MBP-0061 (CSV exports), MBP-0062 (date range filter)

### Wave 4 — Scheduling + Reports (2 agents)
- [ ] TEAM-G: MBP-0110 (Gantt drag-drop), MBP-0111 (skill matching), MBP-0112 (bay allocation), MBP-0113 (bay conflict), MBP-0114 (auto-schedule), MBP-0115 (TAT estimation), MBP-0116 (snapshot compare)
- [ ] TEAM-H: MBP-0103 (monthly revenue report), MBP-0104 (WO throughput report), MBP-0048 (part return workflow), MBP-0037 (parts request intake), MBP-0125 (shift handoff notes)

### Wave 5 — Customer Portal (2 agents)
- [ ] TEAM-I: MBP-0096 (customer login), MBP-0097 (customer dashboard), MBP-0098 (WO tracking), MBP-0099 (quote approve/decline)
- [ ] TEAM-J: MBP-0100 (invoice view), MBP-0101 (download PDFs), MBP-0102 (message submission), MBP-0055 (completeStep auth)

### Wave 6 — P0 Partial Completion (2 agents)
- [ ] TEAM-K: MBP-0032 (WO docs completion), MBP-0033 (task execution completion), MBP-0035 (parts traceability), MBP-0045 (evidence hub)
- [ ] TEAM-L: MBP-0041 (lead workspace completion), MBP-0049 (receiving inspection), MBP-0051 (WO header KPI), MBP-0053 (secondary quote)

### Wave 7 — Polish + P2 (2 agents)
- [ ] TEAM-M: MBP-0083 (dark mode), MBP-0084 (Cmd-K palette), MBP-0085 (activity timeline), MBP-0086 (keyboard shortcuts), MBP-0088 (bulk CSV import)
- [ ] TEAM-N: MBP-0089 (parts reorder alerts), MBP-0090 (MEL deferral tracking), MBP-0091 (shift handoff dashboard), MBP-0092 (fleet calendar), MBP-0087 (PWA offline)
