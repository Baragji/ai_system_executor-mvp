# Microservices Refactoring Documentation

**Purpose:** Organize all documentation for the monolith → 7 services refactoring effort.

---

## Quick Start

1. New to refactoring? Start with `00_core/REFACTORING_GUIDELINES.md`
2. Executing batches? Use `00_core/batches_plan.md` + `01_guides/`
3. Checking status? Read `02_priorities/*_report.md`
4. Historical context? Browse `03_archive/`

---

## Folder Structure

### `00_core/` - Always-Active Reference
- REFACTORING_GUIDELINES.md — Service extraction & proxy patterns
- batches_plan.md — All batches with dependencies and validations
- dependency_matrix.md — Batch dependencies for parallel execution
- rollback_triggers.md — HALT conditions and decision tree

### `01_guides/` - Execution How-Tos
- batch_templates.md — Template A (extraction) & Template B (proxy) checklists
- parallel_execution.md — Concurrency rules, branching strategy, conflict avoidance
- performance_baselines.md — Boot time/memory/latency measurement commands
- security_checklist.md — Proxy validation checklist

### `02_priorities/` - Planning & Reports
- priority1_must_fix.md + priority1_report.md
- priority2_should_fix.md + priority2_report.md
- priority3_nice_to_have.md + priority3_report.md

### `03_archive/` - Historical Context
- old_task_based_approach/ — 30 task files (pre-batch)
- initial_assessments/ — 5 early assessment docs
- planning_iterations/ — early planning/validation docs

### `04_active_tracking/` - Live Progress Monitoring
Real-time batch execution status, next steps, and detailed instructions. Updated frequently during active work.

- STATUS_NEXT_BATCHES.md — Current status + next 10 files/tasks
- BATCH_*_EXECUTION.md — Detailed execution instructions per batch
- NEXT_BATCH_*.md — Quick reference for upcoming batch

---

## Key Commands

```bash
# Show current status
npm run state:show

# Validate code
npm run -s lint && npm run -s typecheck && npm -s test

# Progress tracker
cat ../../.automation/refactor_progress.md
```

---

Last Updated: 2025-10-20
Phase: Microservices Refactoring (Preparation Complete)
