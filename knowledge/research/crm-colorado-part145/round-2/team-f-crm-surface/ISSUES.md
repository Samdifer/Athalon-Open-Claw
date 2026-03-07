# ISSUES

## Blocking / high-impact

1. **TEAM-E-OUTPUT-EMPTY**  
   - Description: `round-2/team-e-qa-packaging/OUTPUT.csv` is empty (0 bytes).  
   - Impact: Cannot produce definitive field-by-field mapping from final QA package; mapping in this round is provisional.  
   - Mitigation: Implement adapter layer + configurable mapping; finalize once Team E publishes canonical columns.

## Medium-impact

2. **CERT-IDENTITY-COLLISION-RISK**  
   - Description: Same/near-same legal names may represent multiple certificates/facilities.  
   - Impact: Risk of incorrect upsert merge in CRM.  
   - Mitigation: Use deterministic `sourceEntityKey` (cert + normalized legal_name + city) and manual-review queue for collisions.

3. **GEO-PRECISION-GAP**  
   - Description: Current geo data emphasizes distance bands, not exact NM distances.  
   - Impact: Numeric distance sort/filter may mislead users.  
   - Mitigation: Keep band-based UI as default; gate numeric distance behind a later geocode enrichment pass.

4. **OBSERVABILITY-SCORE-STABILITY**  
   - Description: Score algorithm not yet canonically defined in team outputs.  
   - Impact: Potential ranking drift across imports.  
   - Mitigation: Store score version in snapshots and expose last-updated metadata.
