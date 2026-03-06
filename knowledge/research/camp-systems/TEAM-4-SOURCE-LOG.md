# TEAM 4 — Source Log (Market/UX/Pricing Intelligence)

Date: 2026-03-06 (UTC)
Researcher: Team 4 subagent

## Source quality legend
- **A (High)**: First-party vendor pages / official announcements / primary product listings
- **B (Medium)**: Reputable third-party industry coverage or indexed snippets from known domains
- **C (Directional)**: Community anecdotes/snippets; useful for themes, not definitive truth

---

## A) Primary sources used directly (web fetch)

1. **CAMP Maintenance (MTX)**  
   URL: https://www.campsystems.com/maintenance  
   Used for: analyst-assisted model, iCAMP references, positioning language.  
   Quality: A

2. **CAMP Homepage**  
   URL: https://www.campsystems.com/  
   Used for: “Expert Analysts / Powerful Tools / Quality Control” positioning.  
   Quality: A

3. **CAMP Training**  
   URL: https://www.campsystems.com/training  
   Used for: breadth of training modules (MTX, iCAMP, IMS, AD/SB portal, EHM) as adoption complexity signal.  
   Quality: A

4. **CAMP News**  
   URL: https://www.campsystems.com/news  
   Used for: ecosystem and add-on signal (“SalesEdge Quoting is a web-based module for Quantum and Corridor”).  
   Quality: A

5. **CAMP iCAMP product page**  
   URL: https://www.campsystems.com/icamp  
   Used for: mobile app capabilities and data-insight claims.  
   Quality: A

6. **Apple App Store — iCAMP**  
   URL: https://apps.apple.com/us/app/icamp/id542306737  
   Used for: app rating signal (3.5/5 at capture time), listed mobile features, update notes.  
   Quality: A/B

7. **Traxxall homepage**  
   URL: https://traxxall.com/  
   Used for: quote/demo procurement motion, partner positioning.  
   Quality: A

8. **Traxxall request quote page**  
   URL: https://traxxall.com/request-quote/  
   Used for: quote-led sales, switch-buyout offer, subscription framing, OEM promo terms.  
   Quality: A

9. **Traxxall training (Academy)**  
   URL: https://traxxall.com/training/  
   Used for: ongoing enablement model (live sessions, onboarding, help walkthroughs).  
   Quality: A

10. **Veryon homepage**  
    URL: https://veryon.com/  
    Used for: subscription SaaS model, onboarding/integration support signals, uptime/support posture.  
    Quality: A

11. **Veryon Tracking (product page)**  
    URL: https://www.veryon.com/products/veryon-tracking/  
    Used for: pricing-positioning claim (“priced lower”), workflow flexibility, mobile app value claims.  
    Quality: A

12. **Corridor homepage**  
    URL: https://www.corridor.aero/  
    Used for: modular solutions, services (support/professional services/deployment options), CAMP backing context.  
    Quality: A

13. **Corridor CAMP Connect module**  
    URL: https://www.corridor.aero/camp-connect-module/  
    Used for: interoperability/migration-friction signals (task transfer automation, reduced re-entry/faxing).  
    Quality: A

---

## B) Third-party/industry context and indexed signals (web search)

14. **AIN Online: CAMP acquires Corridor**  
    URL: https://www.ainonline.com/aviation-news/business-aviation/2015-05-08/camp-systems-acquires-corridor-maintenance-software  
    Used for: historical ecosystem context (not deeply quoted due limited fetch in this run).  
    Quality: B

15. **Hearst announcement: CAMP acquires Avinode/FBO software portfolio**  
    URL: https://www.hearst.com/-/hearst-s-camp-systems-international-agrees-to-acquire-avinode-group-and-aviation-fbo-software-products-from-world-kinect-corporation  
    Used for: platform-consolidation context.  
    Quality: B

16. **Traxxall/JSSI acquisition announcement references**  
    URL: https://traxxall.com/jssi-accelerates-digital-strategy-with-traxxall-acquisition/  
    URL: https://jetsupport.com/jssi-accelerates-digital-strategy-with-traxxall-acquisition/  
    Used for: competitive ownership context.  
    Quality: B

---

## C) Community/review directional signals (web search snippets)

17. **Reddit thread: Camp vs Flight Docs vs Traxxall**  
    URL: https://www.reddit.com/r/aviationmaintenance/comments/sfb7tg/im_trying_to_select_a_maintenance_tracking/  
    Used for: directional UX theme (CAMP common/user-friendly, but inventory/material workflow complaints; Traxxall material management praised by some users).  
    Quality: C

18. **Reddit thread: CAMP work orders/inventory**  
    URL: https://www.reddit.com/r/aviationmaintenance/comments/1fld0o9/camp_work_ordersinventory/  
    Used for: directional adoption friction theme (“too complicated / already using spreadsheets”).  
    Quality: C

19. **Reddit thread: CAMP cost anecdote**  
    URL: https://www.reddit.com/r/aviationmaintenance/comments/x4ya4d/bizav_folks_anyone_have_intel_on_what_camps_costs/  
    Used for: directional only anecdotal price signal (not treated as definitive pricing).  
    Quality: C

20. **Web-indexed snippet for veryon.com/flightdocs**  
    URL: https://veryon.com/flightdocs  
    Used for: directional pricing structure note (“annual subscription per aircraft varying by make/model; request quote”).  
    Quality: B/C (snippet-level in this run)

---

## Access limitations encountered

- Capterra and SourceForge were blocked by anti-bot controls during fetch attempts.
- Reddit direct fetch was blocked; only search-index snippets were available for those threads.
- Browser automation service was unavailable in this session, limiting fallback UI extraction.

Implication: review sentiment and specific numeric price points are treated as **directional**, not definitive.
