# Maintenance Findings: Phased Rollout Plan

**Date:** 2026-03-08
**Author:** Opus Team C
**Status:** Implementation-Ready
**Commit tag:** opus-c

---

## Phase 1 — Data Foundation + Triage MVP (2 weeks)

### Scope
Stand up the `maintenanceFindings` and `maintenanceFindingEvents` tables, core mutations, and a minimal triage UI.

### Deliverables

| # | Item | Owner Lane |
|---|------|-----------|
| 1.1 | Add `maintenanceFindings` table to `convex/schema.ts` | data |
| 1.2 | Add `maintenanceFindingEvents` table to `convex/schema.ts` | data |
| 1.3 | Implement `convex/maintenanceFindings.ts` — `createFinding`, `triageFinding`, `resolveFinding`, `listFindings`, `getFindingWithHistory` | workflow |
| 1.4 | Implement state machine transition guards (matching `dueEngine.ts` pattern) | workflow |
| 1.5 | Implement auto-generation of `findingNumber` (MF-YYYY-NNNN) | workflow |
| 1.6 | Build `/compliance/findings` list page with status/type/severity filters | ux |
| 1.7 | Build `/compliance/findings/[id]` detail page with timeline view | ux |
| 1.8 | Wire finding creation from existing AD/SB tracking page (`/compliance/ad-sb`) | workflow |
| 1.9 | Add finding count badge to compliance dashboard navigation | ux |
| 1.10 | Seed data: create sample findings in `seedComprehensive.ts` for dev/QA | data |

### Acceptance Criteria

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] Creating a finding generates a `maintenanceFindingEvent` with `eventType: "created"`
- [ ] State transitions follow the state machine — invalid transitions throw `INVALID_FINDING_TRANSITION`
- [ ] `findingNumber` auto-increments per org: MF-2026-0001, MF-2026-0002, etc.
- [ ] List page supports filtering by status, type, severity, and aircraft
- [ ] Detail page shows full event timeline in chronological order
- [ ] Deferral requires justification text + approver + expiry date
- [ ] Critical severity findings cannot be deferred
- [ ] Terminal states (closed_resolved, closed_not_applicable, superseded) block further mutations
- [ ] Closing as resolved requires at least one resolution linkage (WO, AD compliance, or maintenance record)

### QA Checklist — Phase 1

- [ ] Create finding → verify findingNumber format and event log entry
- [ ] Transition new → under_review → verify assignedToUserId is set
- [ ] Transition under_review → deferred → verify all deferral fields populated
- [ ] Attempt defer on critical severity → expect rejection
- [ ] Transition under_review → closed_not_applicable → verify evidenceNotes required
- [ ] Attempt invalid transition (new → closed_resolved) → expect error
- [ ] Verify list page loads with 0 findings (empty state)
- [ ] Verify list page loads with 50+ seeded findings (performance)
- [ ] Verify filter combinations: status=deferred + severity=high
- [ ] Verify detail page event timeline ordering
- [ ] Verify terminal state immutability (attempt mutation on closed finding)

---

## Phase 2 — Integration + Automation (2 weeks)

### Scope
Connect findings to existing maintenance workflows: predictions auto-create findings, carry-forward items bridge into findings, RTS checks block on overdue findings, and the dashboard surfaces KPIs.

### Deliverables

| # | Item | Owner Lane |
|---|------|-----------|
| 2.1 | Auto-create finding when `maintenancePrediction` with severity ≥ high is created | data |
| 2.2 | Bidirectional status sync: prediction ↔ finding (scheduled, resolved, dismissed) | workflow |
| 2.3 | Bridge `carryForwardItems` → findings on WO close (type: `carry_forward`) | workflow |
| 2.4 | Add overdue finding check to `returnToService` preconditions | compliance |
| 2.5 | Implement `getUnaccountedBacklog` query (count + age distribution) | data |
| 2.6 | Implement `getOverdueFindings` query with live aircraft hours comparison | data |
| 2.7 | Add finding KPI widget to `/dashboard` — unaccounted count, overdue count, aging | ux |
| 2.8 | Add findings tab to aircraft detail page (`/fleet/[tail]`) | ux |
| 2.9 | Wire AD supersession → auto-supersede linked findings | workflow |
| 2.10 | Implement deferral expiry scheduled job (move expired → under_review, bump severity) | workflow |
| 2.11 | Add triage SLA deadline computation on finding creation | workflow |
| 2.12 | Implement overdue notification events at 30d/14d/7d/0d windows | workflow |

### Acceptance Criteria

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] Creating a high-severity prediction auto-creates a `predicted_maintenance` finding
- [ ] Scheduling a predicted finding moves the source prediction to `scheduled` status
- [ ] Resolving a predicted finding moves the source prediction to `resolved` status
- [ ] Dismissing a prediction moves the linked finding to `closed_not_applicable`
- [ ] Carry-forward items created at WO close generate corresponding findings
- [ ] RTS page shows "Overdue maintenance findings" block when applicable
- [ ] Dashboard KPI widget renders unaccounted count and overdue count
- [ ] Aircraft detail findings tab lists findings scoped to that tail
- [ ] AD supersession (via `handleAdSupersession`) creates superseded finding + new finding
- [ ] Expired deferrals auto-transition to `under_review` with severity bump
- [ ] Triage SLA deadlines: critical=24h, high=72h, medium=7d, low=30d

### QA Checklist — Phase 2

- [ ] Create prediction with severity=high → verify finding auto-created
- [ ] Create prediction with severity=low → verify NO auto-finding
- [ ] Schedule predicted finding → verify prediction status = "scheduled"
- [ ] Resolve predicted finding → verify prediction status = "resolved"
- [ ] Close WO with carry-forward items → verify findings created per item
- [ ] Attempt RTS with overdue finding → verify hard block
- [ ] Attempt RTS with no overdue findings → verify no block
- [ ] Dashboard widget: verify counts match actual finding data
- [ ] Trigger AD supersession → verify old finding superseded, new finding created
- [ ] Create deferred finding with 1-day expiry → wait → verify auto-escalation
- [ ] Verify triage SLA deadline appears on finding detail page
- [ ] Verify overdue notification events fire at correct thresholds
- [ ] Performance: `getUnaccountedBacklog` with 500+ findings < 200ms
- [ ] Performance: `getOverdueFindings` with 100+ aircraft < 500ms

---

## Phase 3 — Dashboarding + Observability (1 week)

### Scope
Build the full findings dashboard with KPI metrics, aging charts, and compliance posture reporting. Integrate into audit readiness score.

### Deliverables

| # | Item | Owner Lane |
|---|------|-----------|
| 3.1 | Build `/compliance/findings/dashboard` — full KPI dashboard page | ux |
| 3.2 | Implement aging distribution chart (0-7d, 7-30d, 30-90d, 90d+) | ux |
| 3.3 | Implement findings by type breakdown (pie/bar chart) | ux |
| 3.4 | Implement predicted-to-WO conversion rate metric | data |
| 3.5 | Implement triage SLA compliance rate metric | data |
| 3.6 | Implement closure cycle time metric (discovered → closed) | data |
| 3.7 | Integrate findings backlog into audit readiness score (`/compliance/audit-readiness`) | compliance |
| 3.8 | Add findings CSV export to findings list page | ux |
| 3.9 | Add findings section to pre-audit checklist generator (`AuditChecklistGenerator`) | compliance |
| 3.10 | Update compliance cross-navigation to include Findings page | ux |

### Acceptance Criteria

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] Dashboard page renders all KPI cards: backlog count, overdue count, aging median, conversion rate, SLA compliance rate, closure cycle time
- [ ] Aging chart shows correct distribution across 4 buckets
- [ ] Type breakdown chart renders with correct proportions
- [ ] Predicted-to-WO conversion rate = (predicted findings that reached scheduled or closed_resolved) / (total predicted findings)
- [ ] Triage SLA compliance = (findings triaged before triageDeadline) / (total triaged findings)
- [ ] Closure cycle time = median(closedAt - discoveredAt) for resolved findings
- [ ] Audit readiness score penalized by overdue findings (same weight as AD non-compliance)
- [ ] CSV export includes: findingNumber, title, type, severity, status, discoveredAt, closedAt, aircraft registration
- [ ] Pre-audit checklist includes "Unaccounted Findings: X open" with pass/fail threshold
- [ ] Compliance cross-nav includes Findings link from all compliance subpages

### QA Checklist — Phase 3

- [ ] Dashboard loads with 0 findings (empty state with guidance)
- [ ] Dashboard loads with 200+ findings (performance < 1s)
- [ ] Aging chart: create findings at different dates → verify bucket assignment
- [ ] Conversion rate: create 10 predicted findings, resolve 3 → verify rate = 30%
- [ ] SLA compliance: create findings, triage some before/after deadline → verify rate
- [ ] Audit readiness: add 5 overdue findings → verify score decrease
- [ ] CSV export: verify all columns present and dates formatted correctly
- [ ] Pre-audit checklist: verify findings line item with count
- [ ] Cross-nav: verify Findings link appears on AD/SB, Audit Trail, QCM Review, Audit Readiness, Diamond Award pages

---

## KPI / Observability Framework

### Primary KPIs

| KPI | Definition | Target | Alert Threshold |
|-----|-----------|--------|-----------------|
| **Unaccounted Backlog** | Count of findings in non-terminal status | < 20 per aircraft | > 50 total |
| **Aging Median** | Median days from `discoveredAt` to now for open findings | < 14 days | > 30 days |
| **AD/SB Overdue Count** | Findings with `findingType` in `[ad_identified, sb_received]` and overdue | 0 | > 0 (critical alert) |
| **Predicted-to-WO Conversion Rate** | `(scheduled + closed_resolved) / total` for `predicted_maintenance` type | > 40% | < 20% |
| **Triage SLA Compliance** | `(triaged before triageDeadline) / total` | > 90% | < 75% |
| **Closure Cycle Time (Median)** | Median `closedAt - discoveredAt` for resolved findings | < 30 days | > 60 days |

### Secondary Metrics

| Metric | Definition |
|--------|-----------|
| **Deferral Rate** | % of findings that pass through `deferred` status |
| **Re-triage Rate** | % of deferred findings that return to `under_review` |
| **Auto-creation Rate** | % of findings created automatically (prediction/carry-forward/supersession) vs manual |
| **Evidence Completeness** | % of closed findings with ≥1 linked resolution record |
| **Severity Distribution** | Breakdown of open findings by severity level |

### Observability Implementation

```typescript
// Query: getMaintenanceFindingsKPIs
export const getKPIs = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const allFindings = await ctx.db
      .query("maintenanceFindings")
      .withIndex("by_org_status", q => q.eq("organizationId", args.organizationId))
      .collect();

    const now = Date.now();
    const open = allFindings.filter(f =>
      !["closed_resolved", "closed_not_applicable", "superseded"].includes(f.status)
    );
    const resolved = allFindings.filter(f => f.status === "closed_resolved");
    const predicted = allFindings.filter(f => f.findingType === "predicted_maintenance");
    const adSb = open.filter(f =>
      ["ad_identified", "sb_received"].includes(f.findingType)
    );

    // Aging
    const ageDays = open.map(f => (now - f.discoveredAt) / 86_400_000);
    const agingMedian = median(ageDays);

    // AD/SB overdue
    const overdue = adSb.filter(f =>
      f.complianceDeadline && f.complianceDeadline < now
    );

    // Predicted-to-WO conversion
    const predictedConverted = predicted.filter(f =>
      ["scheduled", "in_progress", "closed_resolved"].includes(f.status)
    );
    const conversionRate = predicted.length > 0
      ? predictedConverted.length / predicted.length
      : null;

    // Triage SLA
    const triaged = allFindings.filter(f =>
      f.status !== "new" && f.triageDeadline
    );
    const triagedOnTime = triaged.filter(f => {
      const events = /* fetch first non-"new" event */;
      return events[0]?.occurredAt <= f.triageDeadline;
    });
    const slaRate = triaged.length > 0
      ? triagedOnTime.length / triaged.length
      : null;

    // Closure cycle time
    const cycleTimes = resolved
      .filter(f => f.closedAt)
      .map(f => (f.closedAt! - f.discoveredAt) / 86_400_000);
    const closureCycleMedian = median(cycleTimes);

    return {
      unaccountedBacklog: open.length,
      agingMedianDays: agingMedian,
      adSbOverdueCount: overdue.length,
      predictedToWoConversion: conversionRate,
      triageSlaCompliance: slaRate,
      closureCycleTimeDays: closureCycleMedian,
      // Distributions
      agingBuckets: {
        "0-7d": ageDays.filter(d => d <= 7).length,
        "7-30d": ageDays.filter(d => d > 7 && d <= 30).length,
        "30-90d": ageDays.filter(d => d > 30 && d <= 90).length,
        "90d+": ageDays.filter(d => d > 90).length,
      },
      byType: groupCount(open, "findingType"),
      bySeverity: groupCount(open, "severity"),
    };
  },
});
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema migration on existing Convex deployment | Medium | High | New tables only (additive); no existing table modifications in Phase 1 |
| Performance with large finding counts | Low | Medium | Indexed queries; pagination on list views |
| Deferral abuse (indefinite deferrals) | Medium | High | Mandatory expiry dates; auto-escalation on expiry |
| Prediction spam creating too many findings | Medium | Medium | Only auto-create for severity ≥ high; configurable threshold |
| RTS block false positives | Low | High | Only block on overdue + regulatory basis; clear override path for DOM/IA |

---

## Dependencies

| Dependency | Required By | Status |
|-----------|------------|--------|
| `maintenancePredictions` table | Phase 2 (auto-create) | ✅ Exists |
| `carryForwardItems` table | Phase 2 (bridge) | ✅ Exists |
| `adCompliance` module | Phase 2 (supersession) | ✅ Exists |
| `returnToService` preconditions | Phase 2 (RTS block) | ✅ Exists |
| `dueEngine.ts` transition guards | Phase 1 (pattern reference) | ✅ Exists |
| `complianceLedgerEvents` table | Phase 1 (pattern reference) | ✅ Exists |
| `AuditChecklistGenerator` component | Phase 3 | ✅ Exists |
| Audit readiness score computation | Phase 3 | ✅ Exists |

---

*All acceptance criteria and QA checklists are designed to be executable against the existing Convex + Vite + React architecture. Phase 1 is purely additive (new tables + new files), requiring no modifications to existing schema tables.*
