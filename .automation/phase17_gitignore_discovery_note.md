# Phase 17 – Ignore Volatile Automation Artifacts

Date: 2025-10-12

## Context
Tests and code generation produce many transient artifacts under `.automation/` and `.telemetry/`. These files are valuable locally and in CI job artifacts but create noise in Git commits.

## Integration Point
- File: `.gitignore`
- Added entries:
  ```
  .automation/checkpoints/
  .automation/fixtures/
  .automation/manifests/
  .automation/execution_trace.jsonl
  .automation/evaluation_results.json
  .automation/playwright-results.json
  .telemetry/
  ```

## Rationale
- Keep curated evidence (e.g., `.automation/phase*_*.md/json`) tracked for CDI, while ignoring volatile outputs that change on every run.
- Reduces repo noise and risk of committing large/irrelevant artifacts.

## Compliance Check (ai-stack.json)
- Language/stack: No code changes, ignore rules only (OK)
- No new dependencies (OK)
- Frontend untouched (OK)
- Contracts unchanged (OK)
- Not a protected file per CODEOWNERS (OK)

