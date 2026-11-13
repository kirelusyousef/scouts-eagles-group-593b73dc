# Architecture rules

- Treat `Education_Stage` as educational progression and `Team_ID` as scouting-team membership; never derive scouting eligibility from educational-stage indices because the categories differ.
- Keep the new evaluation ledger separate from legacy patrol totals, badge bonuses and attendance-derived rankings; retrospective conversion requires an explicit reconciliation policy to prevent double-counting.
- Verify the existing signed session as identity only and enforce new privileged actions against protected authorization records, not browser storage or publicly mutable profile fields, because role re-fetching alone does not prevent escalation.
- Keep evaluation tables service-role-only until identity hardening and explicit protected grants are activated; do not seed administrative access from existing mutable user rows.
- Record every points submission and review with database triggers and lock a pending transaction during review; reviewed records are immutable and corrections must be separate ledger entries.