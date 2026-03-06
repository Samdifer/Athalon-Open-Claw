# TEAM 2 — Source Log (CAMP Workflows / Compliance / Traceability)

Date collected: 2026-03-06 (UTC)

## Method
- Prioritized official CAMP pages for product/workflow claims.
- Added primary U.S. regulatory texts (eCFR) for Part 91/135/145 obligations.
- Added operator/integration and public user-feedback channels for implementation friction and real-world behavior.

## Source Register

| ID | Source | Type | Reliability | Key extracted evidence used |
|---|---|---|---|---|
| S1 | https://www.campsystems.com/maintenance | Vendor official | High (claims) | Analyst support + AD/SB review/apply claims; MTX positioning for tracking/planning/compliance. |
| S2 | https://www.campsystems.com/eworkorder | Vendor official | High (claims) | eWorkOrder builds monthly plan from due list; assign/update tasks; paperless workflow framing. |
| S3 | https://www.campsystems.com/training | Vendor official | High (claims) | MTX intro topics explicitly include due items, work order creation, and task compliance updates. |
| S4 | https://www.campsystems.com/ad-sb-manager | Vendor official | High (claims) | AD/SB lifecycle language: assess/plan/baseline/apply/report; integrated authority/OEM feed cadence. |
| S5 | https://www.campsystems.com/document-manager | Vendor official | High (claims) | Document Manager integrated in MTX; large annual compliance page submissions; one-stop doc workflow claim. |
| S6 | https://www.campsystems.com/mtx-calendar | Vendor official | High (claims) | Calendar displays due tasks/discrepancies, compliance/time remaining, recurring task visibility. |
| S7 | https://www.ecfr.gov/current/title-14/part-91/section-91.417 | Regulation | Very high | Required record elements incl. return-to-service signature/certificate #, AD status, retention & transfer with sale. |
| S8 | https://www.ecfr.gov/current/title-14/part-135/section-135.439 and /section-135.443 | Regulation | Very high | Part 135 recordkeeping tied to airworthiness release requirements; release/log entry signature + certification constraints. |
| S9 | https://www.ecfr.gov/current/title-14/part-145/section-145.219 | Regulation | Very high | Repair station recordkeeping, maintenance release copy to owner/operator, 2-year retention, inspectability. |
| S10 | https://www.reddit.com/r/aviationmaintenance/comments/1fld0o9/camp_work_ordersinventory/ | User feedback channel | Medium-low (anecdotal) | Reports of complexity/under-utilization; question over e-sign/work-order capability scope. |
| S11 | https://bluetail.aero/bluetales-blog/computerized-aircraft-maintenance-program/ | Industry vendor commentary | Medium | Notes CAMP strength in due forecasting; highlights record gaps when logs/support docs not consistently sent. |
| S12 | https://www.fl3xx.com/kb/camp | Integration KB | Medium-high (technical behavior) | Times/cycles push to CAMP, due-list pull windows, sync errors from mismatches, RTS/Task Group filter behavior. |
| S13 | https://www.campsystems.com/flight-scheduling | Vendor official | High (claims) | Ops scheduling context and logistics coordination; supports maintenance availability planning narrative. |
| S14 | https://www.campsystems.com/program-manager | Vendor official | High (claims) | Digitized maintenance program monitoring/control claim (AMP/AAIP style use case). |
| S15 | https://www.campsystems.com/support | Vendor official | High (claims) | Logbook review/enrollment support and service model context. |

## Key Quotes / Snippets Logged

1. **eWorkOrder workflow** (S2): “create a monthly plan directly from your due list… assign and update tasks… automated workflows.”  
2. **AD/SB in-system lifecycle** (S4): “Assess, plan, baseline, apply and report directly within CAMP… integrated with bi-weekly reports…”  
3. **Document volume and integration** (S5): “submit more than 11 million compliance pages annually… fully integrated into CAMP MTX.”  
4. **Part 91 record specifics** (S7): records must include work description/date/signature-certificate; maintain AD status incl. next recurring action; transfer certain records at sale.  
5. **Part 135 release linkage** (S8): maintenance recording must show requirements for airworthiness release are met; release/log entry must be signed by authorized personnel.  
6. **Part 145 retention** (S9): retain records at least 2 years and provide maintenance release copy to owner/operator.  
7. **Adoption friction (anecdotal)** (S10): reports of perceived complexity and uncertainty around e-sign/work-order depth.  
8. **Data completeness risk** (S11): if logs/support docs not regularly provided, CAMP records may show gaps.  
9. **Integration fragility + RTS tag behavior** (S12): sync may fail with serial/registration mismatches; RTS-tagged tasks passed but filtered in downstream tool views.

## Exclusions / Limitations
- CAMP gated product manuals were not directly accessible via public fetch during this run.
- Reddit page itself returned anti-bot fetch constraints; evidence taken from indexed snippets and result metadata.
- Browser automation was unavailable (gateway/browser control timeout), so page-level hidden UI text validation was limited.

## Confidence Grading
- **High**: Regulatory requirements (S7–S9), core CAMP module positioning (S1–S6, S14).  
- **Medium**: Integration behavior via third-party KB (S12), complementary records commentary (S11).  
- **Low-to-medium**: Frequency/severity of user complaints (S10; anecdotal, limited sample).
