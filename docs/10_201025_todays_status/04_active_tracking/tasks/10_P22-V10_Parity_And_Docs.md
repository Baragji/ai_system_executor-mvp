# Task Contract — P22-V10: Parity + docs

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Ensure root validate:all is green with services in place, and update the refactor status checklist/docs accordingly.

Constraints
- No breaking changes. Keep edits minimal and focused on docs and minor fixes.

Steps
1) Root validations: run lint, typecheck, tests, contract:check.
2) Update docs/10_201025_todays_status/04_active_tracking/STATUS_NEXT_BATCHES.md and .automation/refactor_progress.md to reflect completion.
3) Ensure docs/env/README.md and .env.example (root) list ORCHESTRATOR_URL and RUNNER_URL examples.

Validation Commands
```bash
npm run -s lint
npm run -s typecheck
npm -s test -- --coverage
npm run -s contract:check
```

Acceptance Criteria
- All root checks pass; coverage thresholds hold.
- Refactor tracker updated with completion notes for P22 V01–V10.

Evidence To Attach
- Command outputs and doc diffs.

Rollback
- If any check fails, halt and revert the last change; document the failure in the tracker.

