# Task Contract — P22-V09: Per-service CI/QA

Context
- Phase: 22 — Service Extraction Core (Orchestrator + Runner)
- Contract: contracts/Roadmap_execution/22_phase22_service_extraction_contract.json
- Goal: Run validate:all in orchestrator and runner services, record evidence, and ensure zero warnings.

Constraints
- No code changes unless needed to fix lint/type/test within the timebox.

Steps
1) Run service validations and capture outputs as artifacts.
2) If any failures, fix minimal issues (types, lint, flaky test), keeping changes small.
3) Re-run until green; attach evidence.

Validation Commands
```bash
cd services/orchestrator && npm run -s validate:all; cd -
cd services/runner && npm run -s validate:all; cd -
```

Acceptance Criteria
- Both services pass validate:all with zero ESLint warnings.
- Coverage thresholds (≥80% line, ≥75% branch) met.

Evidence To Attach
- Command outputs, coverage summary, and any small fix diffs.

Rollback
- If a service cannot be made green within the timebox, revert any partial fixes and log blockers.

