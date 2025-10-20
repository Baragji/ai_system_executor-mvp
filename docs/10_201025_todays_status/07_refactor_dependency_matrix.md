# Refactor Dependency Matrix (~53 batches)

| Batch | Depends On | Can Run In Parallel | Blocks |
|-------|------------|---------------------|--------|
| 0 (Discovery) | None | N/A | 1a,1b,2a,2b,2c,3a,4a,5a,6a,7a,8a,9a,10a,11a,12a,13a |
| 1a (Validation scripts – services) | 0 | 1b,2a,2b,2c | 3a,4a,5a,6a |
| 1b (Validation scripts – root) | 1a | 2a,2b,2c | 3a,4a,5a,6a |
| 2a (Discovery Docs Index) | 0 | 2b,2c | - |
| 2b (Service .env templates) | 0 | 2a,2c | 3e,4e,5e,6e |
| 2c (Env docs consolidation) | 0 | 2a,2b | - |
| 3a (LLM copy domain) | 1b | 4a,5a,6a | 3b |
| 3b (LLM fix imports) | 3a | - | 3c |
| 3c (LLM update routes) | 3b | - | 3d,3e,7a |
| 3d (LLM deps audit) | 3c | - | 3e,7a |
| 3e (LLM boot test) | 3d,2b | 4e,5e,6e | 7a |
| 4a (Planning copy core) | 1b | 3a,5a,6a | 4b |
| 4b (Planning support utils) | 4a | - | 4c |
| 4c (Planning boundaries) | 4b | - | 4d |
| 4d (Planning update routes) | 4c | - | 4e,8a |
| 4e (Planning boot test) | 4d,2b | 3e,5e,6e | 8a |
| 5a (Repair copy domain) | 1b | 3a,4a,6a | 5b |
| 5b (Repair contracts decouple) | 5a | - | 5c |
| 5c (Repair route wiring) | 5b | - | 5d,5e,9a |
| 5d (Repair deps audit) | 5c | - | 5e,9a |
| 5e (Repair boot test) | 5d,2b | 3e,4e,6e | 9a |
| 6a (Runner copy domain) | 1b | 3a,4a,5a | 6b |
| 6b (Runner telemetry) | 6a | - | 6c |
| 6c (Runner route wiring) | 6b | - | 6d,6e,10a |
| 6d (Runner deps audit) | 6c | - | 6e,10a |
| 6e (Runner boot test) | 6d,2b | 3e,4e,5e | 10a |
| 7a (LLM proxy skeleton) | 3e | 8a,9a,10a | 7b |
| 7b (LLM client lib) | 7a | - | 7c,7d |
| 7c (LLM env/docs) | 7b | - | 7d |
| 7d (LLM tests) | 7c | - | 7e |
| 7e (LLM integration test) | 7d | - | 11a |
| 8a (Planning proxy skeleton) | 4e | 7a,9a,10a | 8b |
| 8b (Planning client lib) | 8a | - | 8c,8d |
| 8c (Planning env/docs) | 8b | - | 8d |
| 8d (Planning tests) | 8c | - | 8e |
| 8e (Planning integration test) | 8d | - | 11a |
| 9a (Repair proxy skeleton) | 5e | 7a,8a,10a | 9b |
| 9b (Repair client lib) | 9a | - | 9c,9d |
| 9c (Repair env/docs) | 9b | - | 9d |
| 9d (Repair tests) | 9c | - | 9e |
| 9e (Repair integration test) | 9d | - | 11a |
| 10a (Runner proxy skeleton) | 6e | 7a,8a,9a | 10b |
| 10b (Runner client lib) | 10a | - | 10c,10d |
| 10c (Runner env/docs) | 10b | - | 10d |
| 10d (Runner tests) | 10c | - | 10e |
| 10e (Runner integration test) | 10d | - | 11a |
| 11a (Orchestrator client wiring) | 7e,8e,9e,10e | - | 11b,11c,12a,13a |
| 11b (Orchestrator error paths) | 11a | - | 11c |
| 11c (Orchestrator E2E smoke) | 11b | - | 12a,13a |
| 12a (Executor client wiring) | 11a | - | 12b |
| 12b (Executor E2E smoke) | 12a | - | - |
| 13a (Clarification client wiring) | 11a | - | 13b |
| 13b (Clarification E2E smoke) | 13a | - | - |

Notes:
- Parallel groups: {3x,4x,5x,6x} extraction can overlap across services once validation scripts are stable. Proxy batches {7x–10x} can run in parallel if their respective service boot tests are green.
- Linear blockers: Orchestrator integration (11x) depends on all service proxies being tested.

