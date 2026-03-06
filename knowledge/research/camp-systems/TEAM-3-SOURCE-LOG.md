# TEAM 3 — Source Log (CAMP Integrations & Data Flows)

**Research window:** 2026-03-06 UTC  
**Method:** official/vendor pages first, then third-party implementation references.  
**Legend:**
- **Type:** Official / Vendor marketing / Third-party implementation / Marketplace
- **Evidence strength:** High (direct factual statement), Medium (marketing claim), Low (indirect signal)

| # | Source | URL | Type | What it contributed | Evidence strength | Accessed (UTC) |
|---|---|---|---|---|---|---|
| 1 | CORRIDOR – CAMP Connect Module | https://www.corridor.aero/camp-connect-module/ | Vendor marketing (official CORRIDOR) | Core CAMP Connect claims: automates CAMP MTX↔CORRIDOR workflow; download tasks from CAMP; upload compliance data to CAMP; reduction of re-entry/paper process. | Medium | 2026-03-06 16:30 |
| 2 | CORRIDOR Blog – Growing the CAMP ecosystem (CAMP acquires ILS) | https://blog.corridor.aero/camp-acquires-ils | Vendor blog (official CORRIDOR) | States CAMP is CORRIDOR’s parent company; explicit claim of sharing due lists, digitally signed task cards, logbook entries, compliance documentation via CAMP Connect. | High (relationship statement), Medium (capability claims) | 2026-03-06 16:30 |
| 3 | CORRIDOR About Us | https://www.corridor.aero/about-us/ | Official CORRIDOR | States CORRIDOR/Continuum is in CAMP Systems family; mentions “robust API suite” and integration posture. | High | 2026-03-06 16:31 |
| 4 | CAMP press release – Eagle Copters selects CAMP | https://www.campsystems.com/eagle-copters-selects-camp-systems-to-support-their-50-helicopter-fleet | Official CAMP | CAMP-side mention of “seamless integration with CORRIDOR.” | High | 2026-03-06 16:30 |
| 5 | CAMP OEM Partnerships | https://www.campsystems.com/oem-partnerships | Official CAMP | States CAMP is expanding electronic integration so compliance documentation flows from service center to aircraft profile in CAMP. | High | 2026-03-06 16:30 |
| 6 | CAMP MTX Web API landing | https://icampapp.campsystems.com/webapi115 | Official CAMP-hosted app page | Public signal that CAMP MTX Web API exists (application selector shown). | Medium (presence signal only) | 2026-03-06 16:31 |
| 7 | CAMP Privacy Notice | https://www.campsystems.com/privacynotice | Official CAMP legal | Explicit language: CAMP enables APIs and data exchanges with affiliate and third-party systems for customer services. | High | 2026-03-06 16:31 |
| 8 | FL3XX KB – CAMP integration | https://www.fl3xx.com/kb/camp | Third-party implementation reference | Detailed practical data flows: post-flight actuals push (hours/cycles), due-list pulls, per-tail setup, serial matching, sync constraints/errors. | High (for FL3XX implementation behavior) | 2026-03-06 16:30 |
| 9 | FL3XX KB – Onboarding CAMP | https://www.fl3xx.com/kb/onboarding-camp | Third-party implementation reference | Activation mechanics: CAMP-issued API credentials, aircraft flags, initialization-date process, serial strictness, workflow gating. | High (for implementation complexity) | 2026-03-06 16:30 |
| 10 | AirSuite/Cirro – CAMP integration | https://air-suite.com/cirro/integrations/maintenance-tracking/camp/ | Third-party integration page | Corroborates credentialed API access pattern, aircraft-scoped enablement, technical record signing and aircraft-time update workflow. | Medium-High | 2026-03-06 16:30 |
| 11 | CAMP About Us | https://www.campsystems.com/about-us | Official CAMP | Ecosystem position (scale, OEM endorsements) relevant to market gravity/lock-in context. | High | 2026-03-06 16:31 |

## Notes on excluded/limited sources

- `https://www.corridor.aero/wp-content/uploads/2024/08/CAMP-Connect.pdf` was identified but not fully machine-extracted due payload size constraints in tooling. Claims used were cross-checked against accessible HTML page/blog text.
- Search snippets (e.g., marketplace listings) were used only as discovery pointers, not primary evidence unless content was directly fetched.

## Evidence handling approach

- **Verified fact** labels were used only where direct text was captured from accessible source pages.
- **Claim** labels were retained for marketing language not backed by publicly available protocol/spec detail.
- **Inference** (lock-in/complexity) required at least two independent signals (official + third-party implementation docs where possible).
