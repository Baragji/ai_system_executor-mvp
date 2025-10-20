Acknowledged. I implemented your updated Priority 1 approach and aligned the repo.

What I changed

Refactoring guidelines doc added
docs/10_201025_todays_status/REFACTORING_GUIDELINES.md: comprehensive patterns for extraction, proxy, validation, rollback, prohibited actions, and references.
AGENTS.md minimal update proposal
docs/10_201025_todays_status/AGENTS_CURRENT_WORK_UPDATE.md: “Current Work” section snippet that points to guidelines, progress, batches plan, and dependency matrix.
docs/10_201025_todays_status/AGENTS_update_LINK.md: updated to reflect the “Current Work only” PR and the correct links.
Progress tracker
.automation/refactor_progress.md: initialized; marks Batch 0 complete and next steps (1a, 1b).
Removed prior (now superseded) AGENTS proposal
Deleted: docs/10_201025_todays_status/AGENTS_refactoring_guidelines_proposed.md
No change needed to must-fix doc

docs/10_201025_todays_status/05_priority1_must_fix_instructions.md already reflected your updated guidance (5 tasks: discovery, resized plan, guidelines doc, AGENTS.md “Current Work” PR, dependency matrix).
All validations pass

Lint: ok
Typecheck: ok
Tests: ok (Lines 82.25%, Branches 75.75%)
Contracts: ok
Where to look

Refactoring guidelines: docs/10_201025_todays_status/REFACTORING_GUIDELINES.md
AGENTS “Current Work” patch text: docs/10_201025_todays_status/AGENTS_CURRENT_WORK_UPDATE.md
PR link placeholder: docs/10_201025_todays_status/AGENTS_update_LINK.md
Progress tracker: .automation/refactor_progress.md
Batches plan (done earlier): docs/10_201025_todays_status/06_revised_batches_plan.md
Dependency matrix (done earlier): docs/10_201025_todays_status/07_refactor_dependency_matrix.md
Next actions

Open a PR to update AGENTS.md “Current Work” only using the snippet in docs/10_201025_todays_status/AGENTS_CURRENT_WORK_UPDATE.md, then paste the PR URL into docs/10_201025_todays_status/AGENTS_update_LINK.md.
Want me to start Batch 1a/1b (validation scripts) now?
5 files changed
+101
-385


refactor_progress.md
+19
-0

AGENTS_CURRENT_WORK_UPDATE.md
+15
-73

AGENTS_refactoring_guidelines_proposed.md
+0
-49

AGENTS_update_LINK.md
+6
-4

REFACTORING_GUIDELINES.md
+61
-259