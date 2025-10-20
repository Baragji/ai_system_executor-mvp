# Copy/Paste Task Queue — Phase 22 Service Extraction

Use these 10 standalone task contracts exactly as single-file prompts. One task per session. The assistant should execute the steps, validate (lint, typecheck, tests, contract:check), and halt on any failure with diagnostics.

Workflow
- Copy the file contents for Task 01 into your coding assistant.
- Let it run to completion and deliver evidence (commands + artifacts).
- Move on to Task 02, and so on.

References
- Batches Plan: docs/10_201025_todays_status/00_core/batches_plan.md
- Dependency Matrix: docs/10_201025_todays_status/00_core/dependency_matrix.md
- Refactor Guidelines: docs/10_201025_todays_status/00_core/REFACTORING_GUIDELINES.md
- Security Checklist: docs/10_201025_todays_status/01_guides/security_checklist.md
- Performance Baselines: docs/10_201025_todays_status/01_guides/performance_baselines.md
- Contract (Phase 22): contracts/Roadmap_execution/22_phase22_service_extraction_contract.json

Tasks
1) 01_P22-V01_Map_Orchestrator_Extraction_Points.md
2) 02_P22-V02_Scaffold_Orchestrator_Service.md
3) 03_P22-V03_Extract_Executions_Store_And_Endpoints.md
4) 04_P22-V04_Extract_StepQueue_Adapter.md
5) 05_P22-V05_Wire_Monolith_To_Orchestrator.md
6) 06_P22-V06_Scaffold_Runner_Service.md
7) 07_P22-V07_Extract_Runner_Endpoints.md
8) 08_P22-V08_Wire_Monolith_To_Runner.md
9) 09_P22-V09_Per_Service_CI_QA.md
10) 10_P22-V10_Parity_And_Docs.md

Notes
- Some items may already be partially complete. The assistant must detect current state, keep changes minimal, and still produce validation evidence.
- Follow Discovery-First Protocol: generate discovery JSON/MD before making code changes.

