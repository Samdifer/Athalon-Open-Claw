# WS21-C — v1.2 Backlog Prioritization
**Phase:** 21  
**Owner:** Nadia Solis (planning lead)  
**Contributors:** Rafael Ortega (build complexity), Marcus Webb (compliance priority), Tanya Birch (offline findings), Rosa Eaton (aviation ops), Bill Reardon (Day 1 input)  
**Input Sources:** Skyline NPS session (8 requests), High Desert Day 1 feedback, Tanya's offline matrix findings  
**Status:** ✅ v1.2 BACKLOG LOCKED

---

## Context

Nadia called the v1.2 planning session on 2026-03-10. The timing was intentional: High Desert was in its first week, the offline matrix was in final days, and she had eight feature requests out of the Skyline NPS session from February. The question was not "what do we build next" — there were too many answers to that. The question was "what is the right order, and why."

She set the session structure in advance: each feature scored on three axes. Customer impact (how many users, how much pain reduction, how immediate). Regulatory importance (does this touch a compliance surface; would it affect an FAA audit). Build complexity (Rafael's estimate, in sprint-weeks). The scoring was not purely quantitative — Nadia doesn't trust purely quantitative prioritization for a product with a compliance surface this complex — but it gave the team a common framework to argue from.

She gave Marcus a separate pass: rank the features in the order a compliance officer would want them built. Not the order customers asked for them. The order that reduced the most regulatory risk.

Marcus's list was different from Nadia's. That was expected. Documenting the tension was the point.

---

## Input Compilation

### Skyline NPS Session — 8 Feature Requests

From the February NPS session with Skyline (Carla, Troy, Danny, Teresa Varga, and three line mechanics):

1. **Photo attachments on maintenance records** — Multiple requesters. Carla: "I want a photo of the corrosion finding attached to the discrepancy, not sitting in someone's phone." Teresa: "When I receive a part, I want to photograph the 8130-3 and attach it." Troy: "Sometimes I find something and I need the context to stay with the record."
2. **IA expiry push notifications** — Danny: "The dashboard is great but I'm not staring at the dashboard. I want it to tell me when someone's IA is 30 days out." Carla: "Ninety days. I want ninety days."
3. **Customer portal discrepancy authorization UX polish** — Danny's sticky-note replacement is working, but the email notification the customer receives is generic. "It reads like a system email. Customers are confused about what they're being asked to approve."
4. **DOM personnel compliance dashboard** — Carla: "I still have an Excel sheet for cert tracking. I need Athelon to replace it. I need to see all six of my people, their certs, their IA status, their expiry dates, on one screen."
5. **8130-3 OCR for parts receiving** — Teresa Varga's request. Manual entry on the receiving dock is slow and error-prone. She's photographing 8130-3s and re-typing the data. "I shouldn't have to retype anything that's printed on the form."
6. **Multi-shop record sharing (read-only)** — Carla: "If Bill's shop did work on an aircraft that comes to me, I should be able to see it." (Flagged for v1.3 — multi-tenancy surface; not in scope for v1.2.)
7. **Scheduled maintenance forecast view** — Multiple. "Give me a list of what's coming due in the next 90 days across all my aircraft." (Scoped for v1.3.)
8. **Bulk aircraft import** — Operational request. For shops migrating from legacy systems. (Utility feature; backlog but not top-5.)

### High Desert Day 1 Feedback

Bill's first-week items (from his Friday voice memo + Rosa's field notes):

- **LLP dashboard enhancements:** Works well, but Bill wants configurable life limit alerts (not just visual — notification when a component crosses 80% life). *Merged with IA expiry notification work — push alert infrastructure shared.*
- **Photo attachments:** Bill raised it independently on Day 2. "When we document a discrepancy finding, we photograph it. Where does that go right now?" Nadia: "Email. Or someone's phone." Bill: "That's the answer I was afraid of."
- **Offline mode (not yet activated):** Bill's team is aware it's coming. No specific requests yet — they'll have them after P6 week.

### Tanya's Offline Matrix Findings — UX Backlog Items

From OFX-001/002/003 and Troy's field feedback:

- **Per-item sync confirmation** (UX-FEEDBACK-001): Shipped in Phase 21 as part of matrix fix. Not a backlog item.
- **Offline conflict visualization:** If two mechanics sign off the same task card from different offline devices and both sync — the system resolves this correctly (first-write wins, second triggers a conflict flag), but the mechanic doesn't see a clear visual explaining what happened. Raised for v1.2 backlog.
- **Sync failure retry UI:** When a sync item fails (network error, server error), the current behavior is a generic retry prompt. Troy asked for: item-level retry with a visible failure reason. Filed as UX-FEEDBACK-002.

---

## Scoring Matrix

Nadia ran the scoring session with the full team on 2026-03-10.

**Axes:**
- **Customer impact (CI):** 1–5. (5 = both shops asked independently, affects every work session; 1 = nice to have, low frequency)
- **Regulatory importance (RI):** 1–5. (5 = directly affects compliance surface or audit readiness; 1 = pure UX)
- **Build complexity (BC):** 1–5. (5 = highest complexity, most sprint-weeks; 1 = straightforward)

**Priority score = (CI × RI) / BC** (normalized)

| # | Feature | CI | RI | BC | Score | Notes |
|---|---|---|---|---|---|---|
| 1 | Photo attachments on maintenance records | 5 | 4 | 2 | 10.0 | Both shops asked independently; Teresa (receiving) + Carla (discrepancy) + Bill (findings) |
| 2 | IA expiry proactive notifications | 4 | 5 | 2 | 10.0 | Compliance-critical; shared infra with LLP alerts (Bill's ask) |
| 3 | Customer portal discrepancy auth UX polish | 4 | 3 | 1 | 12.0 | High score but lower reg importance; Danny's ask |
| 4 | DOM personnel compliance dashboard | 4 | 5 | 3 | 6.7 | Carla's Excel replacement; high compliance value |
| 5 | 8130-3 OCR for parts receiving | 3 | 4 | 3 | 4.0 | Teresa's ask; reduces manual entry error |
| 6 | Offline conflict visualization | 3 | 3 | 2 | 4.5 | Tanya's matrix finding; UX clarity |
| 7 | Sync failure retry UI (per-item) | 3 | 3 | 1 | 9.0 | Troy's feedback; UX |
| 8 | Scheduled maintenance forecast | 3 | 2 | 4 | 1.5 | Popular ask; complex; v1.3 |

The customer portal UX polish scored highest on the formula (low complexity, good impact), but Nadia made a judgment call: raw score doesn't account for the fact that the underlying portal *works* — it's a polish job, not a critical gap. She reordered.

---

## Top 5 v1.2 Features — Nadia's Final Ranking

### 1. Photo Attachments on Maintenance Records
**Owner:** Devraj + Chloe  
**Rafael's estimate:** 2.5 sprint-weeks (image storage pipeline + record linking + mobile capture UI)  
**Why #1:** Both shops asked independently, without prompting. Teresa Varga originally surfaced it in Phase 15 for receiving dock use. Carla wants it for discrepancy documentation. Bill wants it for findings. Troy uses it informally now (phone photos, not linked to records). The gap is real and daily.

Regulatory angle (Marcus): A photograph attached to a maintenance record and hash-verified as part of the record packet is admissible evidence in an FAA inquiry. An unlinked phone photo is not. This is a compliance upgrade, not just a UX upgrade.

### 2. IA Expiry Proactive Notifications (Push Alerts)
**Owner:** Devraj + Jonas  
**Rafael's estimate:** 2 sprint-weeks (notification infrastructure; some of this is shared with LLP alert work)  
**Why #2:** The dashboard exists. Carla and Danny both said the dashboard is not enough. "I'm not looking at the dashboard at 6 PM when I'm thinking about crew scheduling for next week. I need it to tell me." Bill's LLP alert request uses the same notification infrastructure — building the push alert system for IA expiry unlocks LLP threshold alerts for free.

Regulatory angle (Marcus): An expired IA performing a return-to-service is a §65.93 violation. Proactive notification 90 and 30 days out, with DOM acknowledgment required, creates a documented process that demonstrates active oversight. This is the kind of thing that impresses a FSDO examiner.

### 3. Customer Portal Discrepancy Authorization UX Polish
**Owner:** Chloe + Finn  
**Rafael's estimate:** 1 sprint-week (email template redesign + confirmation flow clarity)  
**Why #3:** The feature works. Danny's sticky-note replacement is live and functional. The problem is the email the customer gets. It's generic. Customers don't understand what they're authorizing. Two of Carla's aircraft owners have called asking what the email means. A customer who doesn't understand the authorization email either ignores it (creating a delay) or calls the shop (creating work). A clear, context-specific email template with plain-language explanation of the discrepancy and the authorization decision — that's a one-week fix with high daily impact.

### 4. DOM Personnel Compliance Dashboard
**Owner:** Chloe + Devraj  
**Rafael's estimate:** 3 sprint-weeks (cert tracking data model, expiry logic, dashboard UI, DOM workflow)  
**Why #4:** Carla still has an Excel spreadsheet for cert tracking. This is the last Excel spreadsheet. "I want to close the last spreadsheet," she said in the NPS session. The DOM dashboard would track all certificated personnel, their certificate types, IA status, last 24-month activity requirement, and expiry dates — with the same notification infrastructure being built for #2.

Regulatory angle (Marcus): DOM oversight documentation is a Part 145 requirement. If a DOM can show the FAA a complete, timestamped personnel compliance record pulled from the same system that generated all their work orders, that's a materially better audit posture than an Excel file.

### 5. 8130-3 OCR for Parts Receiving
**Owner:** Devraj  
**Rafael's estimate:** 3 sprint-weeks (OCR pipeline, field extraction, receiving dock integration, tolerance/correction UI)  
**Why #5:** Teresa Varga requested this in Phase 15. She's been photographing 8130-3s and re-typing. The volume is real — a busy shop receives dozens of components a week, each with an 8130-3 or equivalent conformity document. OCR reduces manual entry error and shortens receiving cycle time. The regulatory importance is high because 8130-3 data integrity (part number, serial, release authorization) is a direct traceability link in the audit record.

The complexity is real — OCR field extraction on FAA form formats requires training data and tolerance handling for handwritten fields. Rafael's 3-week estimate is honest.

---

## Rafael's Build Complexity Notes

Rafael walked through each of the top 5 after Nadia's ranking:

**Photo attachments:** "The storage pipeline is the hard part. We need to decide on storage provider, implement hash-at-upload (so the photo is part of the verifiable record), handle mobile bandwidth constraints, and make sure the record PDF export includes embedded thumbnails. Two and a half weeks is tight but doable if we don't scope-creep to video."

**IA notifications:** "One week for the notification service itself. One week to hook it to the IA expiry data model. The LLP threshold alerts are a half-week extension once the infra exists. This one gets cheaper as we add features on top of it."

**Portal UX polish:** "One week. Honest one week. It's template work and UX copy. Devraj doesn't need to touch it — this is Chloe and Finn."

**DOM compliance dashboard:** "Three weeks. The data model for cert tracking is new — we don't have it today. We need certificate types, IA authorization records, 24-month activity tracking. This is not small. I'd rather do it right in three weeks than rush it in two."

**8130-3 OCR:** "Three weeks if we're doing this correctly, which means training the OCR model on real 8130-3 variants, not just one form version. Teresa has forms going back fifteen years with different layouts. We need tolerance handling. We need a correction UI for when OCR confidence is low. This is the most technically interesting item on the list."

---

## Marcus's Priority Order (Compliance-First Ranking)

Marcus filed his compliance-priority ordering separately:

1. **DOM personnel compliance dashboard** — "This is the one that matters most to a Part 145 auditor. DOM oversight documentation is a primary inspection item."
2. **IA expiry proactive notifications** — "An expired IA signing off an RTS is a §65.93 violation. Prevention infrastructure is critical."
3. **Photo attachments** — "Admissible evidence upgrade. Material for audit defense."
4. **8130-3 OCR** — "Traceability integrity. Reduces manual entry error on a compliance-critical document."
5. **Customer portal UX polish** — "Compliance-relevant (authorization documentation), but the underlying feature already meets the regulatory requirement. This is polish."

**The tension:** Marcus ranked the DOM dashboard #1. Nadia ranked it #4. The difference comes down to one judgment call: the DOM dashboard has the highest compliance value but the highest build complexity. Nadia's view is that shipping three high-value, lower-complexity features first (photos + notifications + portal polish) creates more immediate impact and gets both shops onto the new features before the more complex build starts. Marcus's view is that the compliance surface should drive the sequence, not the build calendar.

**Resolution:** The team agreed on a hybrid. Photo attachments and IA notifications ship first (both start in the same sprint, as they share the notification infrastructure). DOM dashboard starts immediately after — not after all five features, but overlapping with portal polish in sprint 2. 8130-3 OCR is the final feature of the v1.2 cycle.

**Revised Sprint Plan:**
- **Sprint 1:** Photo attachments + IA notifications (shared infra; parallel)
- **Sprint 2:** DOM compliance dashboard + Portal UX polish (parallel — different teams)
- **Sprint 3:** 8130-3 OCR

Marcus signed off on the hybrid plan. "I'll take it. The compliance features are earlier in the sequence than I expected from a pure impact-ranking session. That's progress."

---

## v1.2 Backlog — Locked Feature List

| Rank | Feature | Owner | Sprint | Rafael Estimate | Marcus Priority |
|---|---|---|---|---|---|
| 1 | Photo attachments on maintenance records | Devraj + Chloe | Sprint 1 | 2.5 weeks | 3rd |
| 2 | IA expiry proactive notifications | Devraj + Jonas | Sprint 1 | 2 weeks | 2nd |
| 3 | Customer portal discrepancy auth UX polish | Chloe + Finn | Sprint 2 | 1 week | 5th |
| 4 | DOM personnel compliance dashboard | Chloe + Devraj | Sprint 2 | 3 weeks | 1st |
| 5 | 8130-3 OCR for parts receiving | Devraj | Sprint 3 | 3 weeks | 4th |

**Offline conflict visualization** and **sync failure retry UI** (from Tanya's matrix): Added to v1.2 backlog as engineering items alongside Sprint 1, not counted in the top 5 but scoped for same cycle. Rafael estimate: 1 week combined.

---

## Nadia's Sequencing Rationale (Filed 2026-03-13)

> "v1.2 is the moment we stop being a product that does the basics and start being a product that actively manages compliance posture for a shop operator. Photos make records defensible. Notifications make expiry management proactive instead of reactive. The DOM dashboard closes the last spreadsheet.
>
> Marcus and I disagreed on order. I think we were both right and the hybrid is actually better than either of our original rankings. Starting two high-velocity features in Sprint 1 — features that share infrastructure and that both shops have already asked for independently — means High Desert and Skyline both see meaningful new capability in the first two weeks after v1.2 ships. That matters for adoption. And starting DOM dashboard in Sprint 2 means Marcus's #1 priority ships in the same release cycle, not a release later.
>
> Teresa's OCR request is last not because it's unimportant — it's important — but because it's the most technically uncertain item. If we hit trouble, I'd rather have four features shipped and one deferred than an OCR bug delaying the whole release.
>
> v1.2 backlog is locked."

**STATUS: v1.2 BACKLOG LOCKED**
