% Rollback Triggers & Decision Tree

When to HALT and rollback immediately:
1) `npm test` fails (with flags OFF)
2) `npm run -s typecheck` fails
3) Coverage drops below thresholds (≥80% line / ≥75% branch)
4) Service won’t boot after extraction batch (`/healthz` not 200)
5) Deep imports remain after an extraction batch (`../../../../src/` found)
6) New dependency installation fails
7) API contract break detected (`npm run -s contract:check` fails)

Decision tree:
- If any of the above: stop → revert batch branch → document failure → request human guidance → do not continue

Failure report template (paste into PR/issue):

```
Title: [Batch <id>] Rollback Triggered — <short_reason>

Batch: <id and title>
Branch: <branch_name>
Timestamp: <YYYY-MM-DD HH:mm TZ>

Observed Failure:
- What failed: <lint/type/tests/contracts/boot/coverage/deep-imports/deps/api>
- Evidence: <logs, stack traces, grep output, coverage summary>

Environment:
- Flags: <AGENTS_RUNTIME, OTEL_ENABLED, etc.>
- Node: <node -v>

Steps Taken:
1) HALT further work
2) Reverted batch changes
3) Captured evidence (attached)

Requested Guidance:
- <questions or decisions needed>

Links:
- Commit/PR: <link>
- CI run: <link>
- Related docs: docs/10_201025_todays_status/00_core/batches_plan.md, .automation/refactor_progress.md
```

