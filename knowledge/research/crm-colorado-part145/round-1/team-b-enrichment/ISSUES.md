# ISSUES

1. **Baseline dependency unavailable**
   - `team-a-registry/OUTPUT.csv` was empty at run time, so this pass used independent discovery.

2. **FAA master-list cross-check incomplete in this pass**
   - Attempted use of FAA repair station resources, but machine-readable extraction was limited during this run.
   - Mitigation: retained conservative confidence where direct Part 145 cert text was not cleanly parsed.

3. **Duncan Denver certificate parsing limitation**
   - Direct fetch of the certificate PDF returned binary/non-readable output in this environment.
   - Used public location page + search-discovered FAA CRS/OS certificate URL as proxy; confidence kept at medium.

4. **Potential location/entity granularity drift**
   - Some brands have multiple Colorado operating points (e.g., West Star GJT + Denver satellite).
   - Current output treats them as a single prospect row when evidence is brand-level.

5. **Temporal recency caveat**
   - Some evidence is press-release based; certificate status may change over time.
   - Recommended next pass: authoritative FAA CRS number validation + active status timestamp.
