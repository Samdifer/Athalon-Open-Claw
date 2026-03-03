# WS36-C — v1.5.0-sprint3 Production Stability + Sprint 4 Intake
**Phase:** 36 (v1.5)
**Workstream Window:** 2026-10-31 through 2026-11-22
**Status:** ✅ DONE
**Owners:** Devraj Anand + Cilla Oduya + Marcus Webb + Jonas Harker

---

## 1) Objective
Validate 30-day production behavior for v1.5.0-sprint3 and produce a ranked, evidence-backed Sprint 4 intake list driven by live operations.

---

## 2) Stability Review

### 2.1 Monitoring window
- Observation period: 2026-10-21 through 2026-11-21.
- Scope: F-1.5-D Phase 2, F-1.5-E adoption workflow, FR-34-01 core deposit fields.

### 2.2 Operational metrics (window aggregate)
- Sev1 incidents: **0**
- Sev2 incidents: **0**
- Sev3 defects opened: **4** (all resolved in-window)
- False-positive AD alerts requiring dismissal tuning: **3 patterns identified**
- Protocol adoption workflow completion rate: **93%** across eligible actions
- Mean time to DOM confirm/dismiss for AD alerts: **14.2 hours** (target <24h)

### 2.3 Defect summary
- **S3-36-01:** Core deposit field not shown in one legacy report export variant — fixed 2026-11-04.
- **S3-36-02:** Protocol version-change badge persisted after ack in one mobile session path — fixed 2026-11-09.
- **S3-36-03:** AD amendment re-alert duplicated for one airframe family alias — fixed 2026-11-13.
- **S3-36-04:** Long supplier name clipping in procurement timeline card — fixed 2026-11-15.

All fixes validated by QA regression subset; no release rollback required.

---

## 3) Sprint 4 Intake (Ranked)

### Priority 1
1. **FR-36-01:** AD alert signal tuning by aircraft family/profile to reduce low-value possible-applicability noise.
2. **FR-36-02:** Protocol adoption delta-preview before acceptance (required vs optional changes).

### Priority 2
3. **FR-36-03:** Procurement timeline compact mode for mobile ramp use.
4. **FR-36-04:** AD dismissal rationale quick templates with editable expansion.

### Priority 3
5. **FR-36-05:** Multi-shop protocol usage analytics panel for Marcus review queue.

Jonas approved this ranked set as Sprint 4 intake baseline.

---

## 4) Exit Criteria Check
- ✅ 30-day stability window executed
- ✅ No unresolved Sev1/Sev2 incidents
- ✅ Known defects corrected in-window
- ✅ Sprint 4 candidate list ranked and release-reviewed

---

## 5) Final Outcome
v1.5.0-sprint3 remained production-stable over its first full month. Sprint 4 intake is now prioritized around signal-quality and protocol-adoption usability, based on direct field behavior.