% Phase 19 — Docs Reorganization Discovery Note

Scope: Reorganize docs/10_201025_todays_status into a clear hierarchy with core, guides, priorities, and archive. Update key references.

Integration Points
- docs/10_201025_todays_status (directory): all files in scope
- AGENTS.md (root): references to refactoring docs (lines 13–16)
- .automation/refactor_progress.md: references section (end of file)

Current Implementation (snippets)
- AGENTS.md:13: - **Refactoring Guidelines:** `docs/10_201025_todays_status/REFACTORING_GUIDELINES.md`
- AGENTS.md:15: - **Next Batches:** `docs/10_201025_todays_status/06_revised_batches_plan.md`
- AGENTS.md:16: - **Dependency Matrix:** `docs/10_201025_todays_status/07_refactor_dependency_matrix.md`
- .automation/refactor_progress.md: References point to the same three paths.

Planned Changes
- Create: 00_core/, 01_guides/, 02_priorities/, 03_archive/{old_task_based_approach,initial_assessments,planning_iterations}
- Move/Rename:
  - REFACTORING_GUIDELINES.md → 00_core/REFACTORING_GUIDELINES.md
  - 06_revised_batches_plan.md → 00_core/batches_plan.md
  - 07_refactor_dependency_matrix.md → 00_core/dependency_matrix.md
  - 08_rollback_triggers.md → 00_core/rollback_triggers.md
  - templates/batch_templates.md → 01_guides/batch_templates.md
  - parallel_execution_guide.md → 01_guides/parallel_execution.md
  - performance_baselines.md → 01_guides/performance_baselines.md
  - security_checklist.md → 01_guides/security_checklist.md
  - 05_priority1_must_fix_instructions.md → 02_priorities/priority1_must_fix.md
  - 09_priority1_completion_report.md → 02_priorities/priority1_report.md
  - 06_priority2_should_fix_instructions.md → 02_priorities/priority2_should_fix.md
  - 10_priority2_completion_report.md → 02_priorities/priority2_report.md
  - 07_priority3_nice_to_have_instructions.md → 02_priorities/priority3_nice_to_have.md
  - 11_priority3_completion_report.md → 02_priorities/priority3_report.md
  - refactor_tasks/* → 03_archive/old_task_based_approach/
  - status_context_files/* → 03_archive/initial_assessments/
  - 01_refactor_validation_template.md → 03_archive/planning_iterations/01_validation_template.md
  - 02_refactor_validation_complete.md → 03_archive/planning_iterations/02_validation_complete.md
  - 03_codex_execution_plan.md → 03_archive/planning_iterations/03_codex_execution_plan.md
  - 04_execution_plan_assessment.md → 03_archive/planning_iterations/04_execution_assessment.md
  - 08_fix1_delivery_report.md → 03_archive/planning_iterations/08_fix1_delivery.md

Dependencies & Impacts
- AGENTS.md requires path updates (CODEOWNERS-protected file)
- .automation/refactor_progress.md references updated
- Minor intra-doc link fixes in moved live docs (00_core/, 01_guides/)

Stack Compliance
- Language: Shell + Markdown only
- No new dependencies
- No schema/API changes

Justification
- Improves navigability, reduces cognitive load, and aligns with batch-based workflow. Low risk; reversible via git.

