% Refactor Progress Tracker

Legend: [ ] not-started | [~] in-progress | [x] completed

- Batch 0: Discovery — [x] (artifacts committed; validations passed)
- Batch 1a: Validation scripts (services) — [x] (2025-10-20, all 7 services already have validate:all)
- Batch 1b: Validation scripts (root) — [x] (2025-10-20, root validate:all already exists)
- Batch 2a: Discovery docs index — [ ]
- Batch 2b: Service .env templates — [x] (2025-10-20, clarified coverage and added missing clarification template)
- Batch 2c: Env docs consolidation — [x] (2025-10-20, created docs/env/README.md with service + monolith mapping)
- Batch 3a–3e: LLM extraction — [ ] [ ] [ ] [ ] [ ]
- Batch 4a–4e: Planning extraction — [ ] [ ] [ ] [ ] [ ]
- Batch 5a–5e: Repair extraction — [ ] [ ] [ ] [ ] [ ]
- Batch 6a–6e: Runner extraction — [ ] [ ] [ ] [ ] [ ]
- Batch 7a–7e: LLM proxy — [ ] [ ] [ ] [ ] [ ]
- Batch 8a–8e: Planning proxy — [ ] [ ] [ ] [ ] [ ]
- Batch 9a–9e: Repair proxy — [ ] [ ] [ ] [ ] [ ]
- Batch 10a–10e: Runner proxy — [ ] [ ] [ ] [ ] [ ]
- Batch 11a–11c: Orchestrator integration — [ ] [ ] [ ]
- Batch 12a–12b: Executor integration — [ ] [ ]
- Batch 13a–13b: Clarification integration — [ ] [ ]

Update rules:
- After each batch completes, change its entry to [x] with a short note and commit.
- If a batch is currently underway, mark [~] and include a timestamp + branch name.

References:
- Guidelines: docs/10_201025_todays_status/00_core/REFACTORING_GUIDELINES.md
- Batches Plan: docs/10_201025_todays_status/00_core/batches_plan.md
- Dependency Matrix: docs/10_201025_todays_status/00_core/dependency_matrix.md
