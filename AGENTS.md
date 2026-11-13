# Architecture rules

- Treat `Education_Stage` as educational progression and `Team_ID` as scouting-team membership; never derive scouting eligibility from educational-stage indices because the categories differ.
- Keep the new evaluation ledger separate from legacy patrol totals, badge bonuses and attendance-derived rankings; retrospective conversion requires an explicit reconciliation policy to prevent double-counting.
- Verify the existing signed session as identity only and enforce new privileged actions against protected authorization records, not browser storage or publicly mutable profile fields, because role re-fetching alone does not prevent escalation.