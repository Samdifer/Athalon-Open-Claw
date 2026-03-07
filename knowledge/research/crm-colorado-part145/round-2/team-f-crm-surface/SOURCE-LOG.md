# SOURCE-LOG

## Scope
Round 2 / Team F implementation architecture spec for in-app CRM prospect intelligence surfaces.

## Sources consulted

1. `knowledge/plans/2026-03-07-colorado-part145-osint-crm-plan.md`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Program goals, required surfaces, proposed field families, rollout phases.  
   - Confidence: High

2. `knowledge/research/crm-colorado-part145/round-1/team-a-registry/OUTPUT.csv` + `TRANSFORM-NOTES.md`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Baseline registry field structure and certificate/location/contact primitives.  
   - Confidence: High

3. `knowledge/research/crm-colorado-part145/round-1/team-b-enrichment/OUTPUT.csv` + `TRANSFORM-NOTES.md`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Shop-size, archetype, aircraft focus, observability signal candidates.  
   - Confidence: Medium-High

4. `knowledge/research/crm-colorado-part145/round-1/team-c-geo/OUTPUT.csv` + `TRANSFORM-NOTES.md`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Airport proximity model (`distance_band`), nearest airport code/name semantics.  
   - Confidence: Medium

5. `apps/athelon-app/convex/schema.ts`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Current tables/indices (`customers`, `crmContacts`, `crmInteractions`, `crmOpportunities`, `crmHealthSnapshots`) and feasible extension points.  
   - Confidence: High

6. `apps/athelon-app/convex/crm.ts`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Existing CRM query/mutation contracts and where to extend (`listAccountsWithMetrics`, analytics, account summary).  
   - Confidence: High

7. `apps/athelon-app/app/(app)/crm/accounts/page.tsx`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Existing account filters/sorts/columns; insertion points for prospect filters/badges.  
   - Confidence: High

8. `apps/athelon-app/app/(app)/crm/accounts/[id]/page.tsx`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Existing detail tabs and interaction model; insertion point for Research Traceability tab.  
   - Confidence: High

9. `apps/athelon-app/app/(app)/crm/analytics/page.tsx`  
   - Retrieved: 2026-03-07 UTC  
   - Use: Existing analytics surface where prospect intelligence cards/charts can be appended.  
   - Confidence: High

10. `knowledge/research/crm-colorado-part145/round-2/team-e-qa-packaging/OUTPUT.csv`  
    - Retrieved: 2026-03-07 UTC  
    - Use: Intended canonical input for mapping table.  
    - Confidence: Low (file currently empty; fallback mapping required)
