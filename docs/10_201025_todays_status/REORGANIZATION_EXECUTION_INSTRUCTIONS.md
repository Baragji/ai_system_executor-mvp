# Docs Reorganization Execution Instructions for Codex

**Objective:** Reorganize `docs/10_201025_todays_status/` from flat 25+ files to 4-folder structure with clear purpose hierarchy.

**Execution Environment:** Fresh VM with repo clone  
**Estimated Time:** 20-30 minutes (including validation)  
**Risk Level:** Low (docs only, git revert available)

---

## Pre-Execution Checklist

Before starting, verify:

- [ ] VM has Node.js 20+ installed
- [ ] VM has git installed
- [ ] Repo cloned: `git clone https://github.com/Baragji/ai_system_executor-mvp.git`
- [ ] On correct branch: `git checkout refactoring_before_merging_to_branch_fix/wf5`
- [ ] Clean working directory: `git status` shows no uncommitted changes
- [ ] All validation passing: `npm install && npm run -s lint && npm run -s typecheck && npm -s test`

---

## Step 1: Execute Migration Script

**Objective:** Move files to new folder structure and rename appropriately.

### 1.1 Navigate to Target Directory
```bash
cd docs/10_201025_todays_status
```

### 1.2 Create New Folder Structure
```bash
mkdir -p 00_core
mkdir -p 01_guides
mkdir -p 02_priorities
mkdir -p 03_archive/old_task_based_approach
mkdir -p 03_archive/initial_assessments
mkdir -p 03_archive/planning_iterations
```

### 1.3 Move Core Reference Docs
```bash
# Core patterns and plans (always active)
mv REFACTORING_GUIDELINES.md 00_core/
mv 06_revised_batches_plan.md 00_core/batches_plan.md
mv 07_refactor_dependency_matrix.md 00_core/dependency_matrix.md
mv 08_rollback_triggers.md 00_core/rollback_triggers.md
```

### 1.4 Move Execution Guides
```bash
# How-to guides for batch execution
mv templates/batch_templates.md 01_guides/
mv parallel_execution_guide.md 01_guides/parallel_execution.md
mv performance_baselines.md 01_guides/
mv security_checklist.md 01_guides/
```

### 1.5 Move Priority Docs (Paired: Instructions + Reports)
```bash
# Priority 1
mv 05_priority1_must_fix_instructions.md 02_priorities/priority1_must_fix.md
mv 09_priority1_completion_report.md 02_priorities/priority1_report.md

# Priority 2
mv 06_priority2_should_fix_instructions.md 02_priorities/priority2_should_fix.md
mv 10_priority2_completion_report.md 02_priorities/priority2_report.md

# Priority 3
mv 07_priority3_nice_to_have_instructions.md 02_priorities/priority3_nice_to_have.md
mv 11_priority3_completion_report.md 02_priorities/priority3_report.md
```

### 1.6 Archive Old Task-Based Approach
```bash
# 30 old task files (superseded by batch approach)
mv refactor_tasks/* 03_archive/old_task_based_approach/
```

### 1.7 Archive Initial Assessments
```bash
# 5 early assessment docs
mv status_context_files/* 03_archive/initial_assessments/
```

### 1.8 Archive Planning Iterations
```bash
# Early planning/validation docs
mv 01_refactor_validation_template.md 03_archive/planning_iterations/01_validation_template.md
mv 02_refactor_validation_complete.md 03_archive/planning_iterations/02_validation_complete.md
mv 03_codex_execution_plan.md 03_archive/planning_iterations/
mv 04_execution_plan_assessment.md 03_archive/planning_iterations/04_execution_assessment.md
mv 08_fix1_delivery_report.md 03_archive/planning_iterations/08_fix1_delivery.md
```

### 1.9 Remove Empty Folders
```bash
rmdir templates
rmdir refactor_tasks
rmdir status_context_files
```

### 1.10 Verify File Counts
```bash
# Should show 4 files
ls -1 00_core/ | wc -l

# Should show 4 files
ls -1 01_guides/ | wc -l

# Should show 6 files
ls -1 02_priorities/ | wc -l

# Should show 30 files
ls -1 03_archive/old_task_based_approach/ | wc -l

# Should show 5 files
ls -1 03_archive/initial_assessments/ | wc -l

# Should show 5 files
ls -1 03_archive/planning_iterations/ | wc -l
```

**Expected Output:**
```
4  # 00_core
4  # 01_guides
6  # 02_priorities
30 # old_task_based_approach
5  # initial_assessments
5  # planning_iterations
```

---

## Step 2: Create Navigation README

**Objective:** Add README.md to guide users through new structure.

### 2.1 Create README.md
```bash
cat > README.md << 'EOF'
# Microservices Refactoring Documentation

**Purpose:** Organize all documentation for the monolith → 7 services refactoring effort.

---

## Quick Start

1. **New to refactoring?** Start with `00_core/REFACTORING_GUIDELINES.md`
2. **Executing batches?** Use `00_core/batches_plan.md` + `01_guides/`
3. **Checking status?** Read `02_priorities/*_report.md`
4. **Historical context?** Browse `03_archive/`

---

## Folder Structure

### `00_core/` - Always-Active Reference (4 files)
Core documents that define the refactoring approach. Read these first.

- **REFACTORING_GUIDELINES.md** - Service extraction & proxy patterns (5-step checklists)
- **batches_plan.md** - All 53 batches with dependencies and validations
- **dependency_matrix.md** - Batch dependencies for parallel execution
- **rollback_triggers.md** - 7 HALT conditions and decision tree

### `01_guides/` - Execution How-Tos (4 files)
Practical guides for executing batches safely and efficiently.

- **batch_templates.md** - Template A (extraction) & Template B (proxy) checklists
- **parallel_execution.md** - Concurrency rules, branching strategy, conflict avoidance
- **performance_baselines.md** - Boot time/memory/latency measurement commands
- **security_checklist.md** - 8-item proxy validation checklist

### `02_priorities/` - Planning & Reports (6 files)
Priority breakdown, instructions, and completion evidence.

- **priority1_must_fix.md** + **priority1_report.md** - Discovery, batches, guidelines, matrix
- **priority2_should_fix.md** + **priority2_report.md** - Validations, tracker, regression, rollback
- **priority3_nice_to_have.md** + **priority3_report.md** - Templates, parallel, performance, security

### `03_archive/` - Historical Context (40+ files)
Superseded approaches and early planning iterations. For reference only.

- **old_task_based_approach/** - 30 task files (pre-batch approach)
- **initial_assessments/** - 5 early assessment docs
- **planning_iterations/** - 5 early planning/validation docs

---

## Current Status

- ✅ Priority 1 (MUST FIX): Complete
- ✅ Priority 2 (SHOULD FIX): Complete
- ✅ Priority 3 (NICE TO HAVE): Complete
- 📋 Batch 0: Discovery complete
- ⏭️ Next: Batch 1a (validation scripts, 30 min, low risk)

---

## Key Commands

```bash
# Show current status
npm run state:show

# Validate all changes
npm run -s lint && npm run -s typecheck && npm -s test

# Progress tracker
cat ../../.automation/refactor_progress.md
```

---

## Cross-References

- **AGENTS.md** - Universal system prompt (points here for refactoring work)
- **CDI_INFRASTRUCTURE.md** - Contract-driven integration framework
- **.automation/refactor_progress.md** - Live progress tracker ([ ] [~] [x])
- **services/** - 7 service scaffolds (destination for extracted code)

---

**Last Updated:** 2025-10-20  
**Phase:** Microservices Refactoring (Preparation Complete)
EOF
```

### 2.2 Verify README Created
```bash
ls -lh README.md
# Should show file size ~2.5KB
```

---

## Step 3: Update Cross-References

**Objective:** Fix path references in AGENTS.md and .automation/refactor_progress.md.

### 3.1 Update AGENTS.md (Protected File)
```bash
cd ../../  # Back to repo root

# Update refactoring doc paths (3 replacements)
sed -i '' 's|docs/10_201025_todays_status/REFACTORING_GUIDELINES.md|docs/10_201025_todays_status/00_core/REFACTORING_GUIDELINES.md|g' AGENTS.md
sed -i '' 's|docs/10_201025_todays_status/06_revised_batches_plan.md|docs/10_201025_todays_status/00_core/batches_plan.md|g' AGENTS.md
sed -i '' 's|docs/10_201025_todays_status/07_refactor_dependency_matrix.md|docs/10_201025_todays_status/00_core/dependency_matrix.md|g' AGENTS.md

# Add README reference to "Current Work" section
# (Manual step - verify paths after sed, add README.md reference if needed)
```

### 3.2 Update .automation/refactor_progress.md
```bash
# Update batch plan reference
sed -i '' 's|06_revised_batches_plan.md|00_core/batches_plan.md|g' .automation/refactor_progress.md
sed -i '' 's|07_refactor_dependency_matrix.md|00_core/dependency_matrix.md|g' .automation/refactor_progress.md
```

### 3.3 Verify Cross-References Updated
```bash
# Check AGENTS.md has new paths
grep "00_core" AGENTS.md
# Should show 3 lines with new paths

# Check progress tracker updated
grep "00_core" .automation/refactor_progress.md
# Should show references to new paths (if any existed)
```

---

## Step 4: Validation Suite

**Objective:** Ensure no regressions from reorganization.

### 4.1 Lint Check
```bash
npm run -s lint
```
**Expected:** Exit code 0, no warnings

### 4.2 TypeScript Check
```bash
npm run -s typecheck
```
**Expected:** Exit code 0, no errors

### 4.3 Test Suite
```bash
npm -s test
```
**Expected:** 
- Exit code 0
- Lines ≥ 80% coverage
- Branches ≥ 75% coverage

### 4.4 Contract Validation
```bash
npm run -s contract:check
```
**Expected:** 10/10 contracts valid

### 4.5 Manual Spot Checks
```bash
# Verify new structure exists
tree docs/10_201025_todays_status -L 2

# Check no orphaned files in root
ls docs/10_201025_todays_status/*.md
# Should only show: README.md, REORGANIZATION_PROPOSAL.md

# Verify AGENTS.md paths correct
grep "10_201025_todays_status" AGENTS.md
```

---

## Step 5: Git Commit

**Objective:** Atomic commit with clear message.

### 5.1 Stage All Changes
```bash
git add -A
```

### 5.2 Review Staged Changes
```bash
git status
# Should show:
# - renamed files (old path → new path)
# - modified: AGENTS.md
# - modified: .automation/refactor_progress.md
# - new file: docs/10_201025_todays_status/README.md
# - deleted: empty folders (templates/, refactor_tasks/, status_context_files/)
```

### 5.3 Commit with Descriptive Message
```bash
git commit -m "docs: reorganize 10_201025_todays_status into 00_core, 01_guides, 02_priorities, 03_archive

- Move 4 core docs to 00_core/ (guidelines, batches, deps, rollback)
- Move 4 execution guides to 01_guides/ (templates, parallel, perf, security)
- Move 6 priority docs to 02_priorities/ (paired instructions + reports)
- Archive 40+ legacy docs to 03_archive/ (old tasks, assessments, planning)
- Rename files for clarity (remove number prefixes, shorten verbose names)
- Add README.md with navigation guide and quick start
- Update AGENTS.md cross-references to new paths
- Update .automation/refactor_progress.md references

Benefits:
- Clear purpose hierarchy (core, guides, priorities, archive)
- Easier navigation (4 folders vs 25 flat files)
- Paired docs (instructions next to reports)
- Shorter filenames (batches_plan.md vs 06_revised_batches_plan.md)

Breaking changes: None (docs only, no code changes)
Validation: All checks passing (lint, typecheck, tests, contracts)"
```

### 5.4 Verify Commit
```bash
git log -1 --stat
# Should show ~54 file changes (renames + additions + deletions)
```

---

## Step 6: Final Verification

**Objective:** Confirm everything works post-commit.

### 6.1 Re-run Full Validation
```bash
npm run -s lint && npm run -s typecheck && npm -s test && npm run -s contract:check
```
**Expected:** All passing (exit code 0)

### 6.2 Verify Directory Structure
```bash
tree docs/10_201025_todays_status -L 2 -I '*.md'
```
**Expected Output:**
```
docs/10_201025_todays_status
├── 00_core
├── 01_guides
├── 02_priorities
└── 03_archive
    ├── initial_assessments
    ├── old_task_based_approach
    └── planning_iterations
```

### 6.3 Test Navigation
```bash
# Open README and verify paths work
cat docs/10_201025_todays_status/README.md

# Verify core docs accessible
ls -1 docs/10_201025_todays_status/00_core/
# Should show:
# REFACTORING_GUIDELINES.md
# batches_plan.md
# dependency_matrix.md
# rollback_triggers.md

# Verify guides accessible
ls -1 docs/10_201025_todays_status/01_guides/
# Should show:
# batch_templates.md
# parallel_execution.md
# performance_baselines.md
# security_checklist.md
```

### 6.4 Check AGENTS.md Integration
```bash
# Verify AGENTS.md "Current Work" section references new paths
grep -A 5 "Current Work" AGENTS.md
# Should show references to 00_core/ paths
```

---

## Step 7: Push to Remote (Optional)

**Objective:** Publish reorganization to remote branch.

### 7.1 Push Commit
```bash
git push origin refactoring_before_merging_to_branch_fix/wf5
```

### 7.2 Verify on GitHub
- Navigate to branch on GitHub
- Confirm new folder structure visible
- Verify README.md renders correctly
- Check no broken links in rendered markdown

---

## Rollback Procedure (If Needed)

If any issues discovered:

### Option A: Git Revert (Safest)
```bash
git revert HEAD
git push origin refactoring_before_merging_to_branch_fix/wf5
```

### Option B: Hard Reset (If Not Pushed)
```bash
git reset --hard HEAD~1
```

### Option C: Manual Restore (Last Resort)
```bash
cd docs/10_201025_todays_status

# Move everything back
mv 00_core/* .
mv 01_guides/* .
mv 02_priorities/* .
mv 03_archive/old_task_based_approach/* refactor_tasks/
mv 03_archive/initial_assessments/* status_context_files/
mv 03_archive/planning_iterations/* .

# Restore old names (reverse renames)
mv batches_plan.md 06_revised_batches_plan.md
mv dependency_matrix.md 07_refactor_dependency_matrix.md
mv parallel_execution.md parallel_execution_guide.md
mv priority1_must_fix.md 05_priority1_must_fix_instructions.md
mv priority1_report.md 09_priority1_completion_report.md
# ... (continue for all renames)

# Remove new folders
rm -rf 00_core 01_guides 02_priorities 03_archive
rm README.md

# Revert AGENTS.md and progress tracker
git checkout HEAD -- ../../AGENTS.md
git checkout HEAD -- ../../.automation/refactor_progress.md
```

---

## Success Criteria

Migration is complete when:

- ✅ All 54 files moved/renamed successfully
- ✅ 4 folders created: `00_core/`, `01_guides/`, `02_priorities/`, `03_archive/`
- ✅ README.md created with navigation guide
- ✅ AGENTS.md updated with new paths (3 replacements)
- ✅ `.automation/refactor_progress.md` updated (if needed)
- ✅ All validation passing: lint, typecheck, tests, contracts
- ✅ No orphaned files in `docs/10_201025_todays_status/` root (except README + proposal)
- ✅ Empty folders deleted: `templates/`, `refactor_tasks/`, `status_context_files/`
- ✅ Git commit created with descriptive message
- ✅ (Optional) Pushed to remote branch

---

## Expected File Changes Summary

| Change Type | Count | Details |
|-------------|-------|---------|
| Renames | 48 | Files moved to new folders with some renamed |
| New Files | 1 | README.md |
| Modified | 2 | AGENTS.md, .automation/refactor_progress.md |
| Deleted Folders | 3 | templates/, refactor_tasks/, status_context_files/ |
| New Folders | 7 | 00_core/, 01_guides/, 02_priorities/, 03_archive/ + 3 subdirs |

---

## Troubleshooting

### Issue: sed command not working (Linux vs macOS)
**Solution:** Use appropriate sed syntax:
- macOS/BSD: `sed -i '' 's|old|new|g' file`
- Linux/GNU: `sed -i 's|old|new|g' file`

### Issue: File not found during move
**Solution:** 
```bash
# Check if file exists
ls -la docs/10_201025_todays_status/ | grep <filename>
# Skip move if already moved or doesn't exist
```

### Issue: Validation fails after migration
**Solution:**
```bash
# Check what changed
git diff HEAD

# If docs-only changes, validation should still pass
# If unexpected changes, revert and investigate
git checkout -- <unexpected-file>
```

### Issue: Empty folder won't delete
**Solution:**
```bash
# Force delete with contents
rm -rf templates refactor_tasks status_context_files
```

---

## Post-Migration Notes

After successful migration:

1. **Update your local bookmarks** - New paths for frequently accessed docs
2. **Inform team** - Share new structure via README.md
3. **Archive proposal** - Move `REORGANIZATION_PROPOSAL.md` to `03_archive/` if desired
4. **Monitor for broken links** - Check if any external docs reference old paths

---

## Execution Checklist for Codex

Copy this checklist and mark items as complete:

- [ ] Step 1: Execute migration script (all moves complete)
- [ ] Step 2: Create README.md
- [ ] Step 3: Update cross-references (AGENTS.md + progress tracker)
- [ ] Step 4: Run validation suite (all passing)
- [ ] Step 5: Git commit (atomic, descriptive message)
- [ ] Step 6: Final verification (structure correct, no orphans)
- [ ] Step 7: Push to remote (optional)
- [ ] Report back: Success/failure with evidence (validation outputs, tree output)

---

**End of Instructions**

**Execution Time:** ~20-30 minutes  
**Last Updated:** 2025-10-20  
**Version:** 1.0
