% Parallel Execution Guide

This guide explains when and how to run refactoring batches in parallel while keeping changes safe and conflict-free.

## What can run concurrently

Use the dependency matrix as the source of truth:
- Reference: `docs/10_201025_todays_status/00_core/dependency_matrix.md`
- Examples:
  - Planning extraction (4a–4e) can run in parallel with Repair extraction (5a–5e) and Runner extraction (6a–6e) once validation tooling (1a,1b) is complete.
  - Proxy batches (7x–10x) may run in parallel across services after each service’s boot test is green (3e/4e/5e/6e).

## Branching strategy

- One batch per branch
- Naming: `batch-<N>-<service>-<action>` (e.g., `batch-5c-repair-route-wiring`)
- Keep commits focused and small; squash on merge if appropriate

## Merge strategy

- Merge only after all validations pass:
  - `npm run -s lint`
  - `npm run -s typecheck`
  - `npm -s test` (≥80% line / ≥75% branch)
  - `npm run -s contract:check`
- Require human sign-off for every batch PR

## Conflict avoidance

- Never modify the same service in two parallel batches
- Never edit `AGENTS.md` in parallel; protected + CODEOWNERS
- Avoid cross-cutting file edits (e.g., shared scripts) within parallel batches

## Rollback alignment

- If a parallel batch fails any validation, HALT and rollback per:
  - `docs/10_201025_todays_status/08_rollback_triggers.md`
- Update `.automation/refactor_progress.md` with [~] or [x] and notes

