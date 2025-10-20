# Docs Folder Reorganization Proposal

**Current Folder:** `docs/10_201025_todays_status`  
**Problem:** 25+ files with inconsistent numbering, mixed purposes, unclear hierarchy  
**Proposed Solution:** Clear categorization by purpose with intuitive naming

---

## Current Problems

1. **Inconsistent Numbering:**
   - Files numbered 01-11 (gaps: no 09 in some sequences)
   - Numbers don't reflect chronology or importance
   - `06_priority2` vs `06_revised_batches_plan` = confusing

2. **Mixed Purposes:**
   - Instructions (`05_priority1_must_fix_instructions.md`)
   - Reports (`09_priority1_completion_report.md`)
   - Guides (`parallel_execution_guide.md`)
   - Plans (`06_revised_batches_plan.md`)
   - All in same flat directory

3. **Obsolete/Duplicate Content:**
   - `refactor_tasks/` has 30 old task files (pre-batch approach)
   - `status_context_files/` has 5 old assessment docs
   - These conflict with current batch-based approach

4. **Unclear Active vs Archive:**
   - Can't tell what's current vs historical
   - No indication of workflow phase

---

## Proposed Structure

```
docs/10_201025_todays_status/
├── README.md                           # Navigation guide (NEW)
│
├── 00_core/                            # Always-active reference docs
│   ├── REFACTORING_GUIDELINES.md      # Core patterns (moved from root)
│   ├── batches_plan.md                # 53 batches (renamed from 06_revised...)
│   ├── dependency_matrix.md           # Batch dependencies (renamed from 07_refactor...)
│   └── rollback_triggers.md           # HALT conditions (renamed from 08_rollback...)
│
├── 01_guides/                          # How-to guides for execution
│   ├── batch_templates.md             # Template A/B (moved from templates/)
│   ├── parallel_execution.md          # Concurrency rules (renamed)
│   ├── performance_baselines.md       # Metrics tracking (kept)
│   └── security_checklist.md          # Proxy validation (kept)
│
├── 02_priorities/                      # Priority instructions (original + reports)
│   ├── priority1_must_fix.md          # Instructions (renamed from 05_priority1...)
│   ├── priority1_report.md            # Completion report (renamed from 09_priority1...)
│   ├── priority2_should_fix.md        # Instructions (renamed from 06_priority2...)
│   ├── priority2_report.md            # Completion report (renamed from 10_priority2...)
│   ├── priority3_nice_to_have.md      # Instructions (renamed from 07_priority3...)
│   └── priority3_report.md            # Completion report (renamed from 11_priority3...)
│
├── 03_archive/                         # Historical/superseded docs
│   ├── old_task_based_approach/       # refactor_tasks/ content (moved)
│   │   └── refactor_task_01-30.md     # 30 task files
│   ├── initial_assessments/           # status_context_files/ content (moved)
│   │   └── 02-05_*.md                 # 5 assessment files
│   └── planning_iterations/           # Early planning docs
│       ├── 01_validation_template.md  # Renamed from 01_refactor_validation_template
│       ├── 02_validation_complete.md  # Renamed from 02_refactor_validation_complete
│       ├── 03_codex_execution_plan.md # Kept name
│       ├── 04_execution_assessment.md # Renamed from 04_execution_plan_assessment
│       └── 08_fix1_delivery.md        # Renamed from 08_fix1_delivery_report
│
└── templates/                          # DELETED (merged into 01_guides/)
```

---

## Naming Conventions

### Prefixes (Removed)
- ❌ `01-11_` numbering → Creates false hierarchy
- ❌ `refactor_task_` prefix → Redundant (folder already says "refactor")
- ❌ `priority1_must_fix_instructions` → Verbose

### New Naming Rules
- ✅ **Descriptive names** without numbers (unless chronological sequence)
- ✅ **Underscores for multi-word** (consistency with existing conventions)
- ✅ **Shorter filenames** (e.g., `batches_plan.md` vs `06_revised_batches_plan.md`)
- ✅ **Folder structure provides context** (no need to repeat in filename)

---

## Migration Map

| Current Path | New Path | Reason |
|--------------|----------|--------|
| `REFACTORING_GUIDELINES.md` | `00_core/REFACTORING_GUIDELINES.md` | Core reference, always active |
| `06_revised_batches_plan.md` | `00_core/batches_plan.md` | Core reference, shorter name |
| `07_refactor_dependency_matrix.md` | `00_core/dependency_matrix.md` | Core reference, remove prefix |
| `08_rollback_triggers.md` | `00_core/rollback_triggers.md` | Core reference |
| `templates/batch_templates.md` | `01_guides/batch_templates.md` | Guide, not separate folder |
| `parallel_execution_guide.md` | `01_guides/parallel_execution.md` | Guide, shorter name |
| `performance_baselines.md` | `01_guides/performance_baselines.md` | Guide |
| `security_checklist.md` | `01_guides/security_checklist.md` | Guide |
| `05_priority1_must_fix_instructions.md` | `02_priorities/priority1_must_fix.md` | Shorter, clearer |
| `09_priority1_completion_report.md` | `02_priorities/priority1_report.md` | Shorter, paired with instructions |
| `06_priority2_should_fix_instructions.md` | `02_priorities/priority2_should_fix.md` | Shorter, clearer |
| `10_priority2_completion_report.md` | `02_priorities/priority2_report.md` | Shorter, paired |
| `07_priority3_nice_to_have_instructions.md` | `02_priorities/priority3_nice_to_have.md` | Shorter, clearer |
| `11_priority3_completion_report.md` | `02_priorities/priority3_report.md` | Shorter, paired |
| `refactor_tasks/*.md` (30 files) | `03_archive/old_task_based_approach/*.md` | Archive old approach |
| `status_context_files/*.md` (5 files) | `03_archive/initial_assessments/*.md` | Archive early work |
| `01_refactor_validation_template.md` | `03_archive/planning_iterations/01_validation_template.md` | Archive planning |
| `02_refactor_validation_complete.md` | `03_archive/planning_iterations/02_validation_complete.md` | Archive planning |
| `03_codex_execution_plan.md` | `03_archive/planning_iterations/03_codex_execution_plan.md` | Archive planning |
| `04_execution_plan_assessment.md` | `03_archive/planning_iterations/04_execution_assessment.md` | Archive planning |
| `08_fix1_delivery_report.md` | `03_archive/planning_iterations/08_fix1_delivery.md` | Archive planning |

---

## Benefits

### 1. Clear Purpose Hierarchy
```
00_core/        → Always-active reference (4 files)
01_guides/      → How-to execute (4 files)
02_priorities/  → Planning & completion (6 files)
03_archive/     → Historical context (40+ files)
```

### 2. Easier Navigation
- New contributors: Start with `README.md` → `00_core/` → `01_guides/`
- AI agents: Reference `00_core/batches_plan.md` (not `06_revised_batches_plan.md`)
- Stakeholders: Review `02_priorities/*_report.md` for status

### 3. Reduced Cognitive Load
- Before: 25 files in flat directory, unclear which to read
- After: 4 folders, clear purpose, README navigation guide

### 4. Cleaner Git History
- Archive folder clearly separates old from new
- Current work in `00_core/` and `01_guides/` (minimal files)

### 5. Scalability
- Add new guides → `01_guides/`
- Add new priorities → `02_priorities/`
- Archive old iterations → `03_archive/planning_iterations/`

---

## Migration Script

```bash
#!/bin/bash
# Run from: docs/10_201025_todays_status/

# Create new structure
mkdir -p 00_core 01_guides 02_priorities 03_archive/{old_task_based_approach,initial_assessments,planning_iterations}

# Move core docs
mv REFACTORING_GUIDELINES.md 00_core/
mv 06_revised_batches_plan.md 00_core/batches_plan.md
mv 07_refactor_dependency_matrix.md 00_core/dependency_matrix.md
mv 08_rollback_triggers.md 00_core/rollback_triggers.md

# Move guides
mv templates/batch_templates.md 01_guides/
mv parallel_execution_guide.md 01_guides/parallel_execution.md
mv performance_baselines.md 01_guides/
mv security_checklist.md 01_guides/

# Move priorities
mv 05_priority1_must_fix_instructions.md 02_priorities/priority1_must_fix.md
mv 09_priority1_completion_report.md 02_priorities/priority1_report.md
mv 06_priority2_should_fix_instructions.md 02_priorities/priority2_should_fix.md
mv 10_priority2_completion_report.md 02_priorities/priority2_report.md
mv 07_priority3_nice_to_have_instructions.md 02_priorities/priority3_nice_to_have.md
mv 11_priority3_completion_report.md 02_priorities/priority3_report.md

# Archive old tasks
mv refactor_tasks/* 03_archive/old_task_based_approach/

# Archive old assessments
mv status_context_files/* 03_archive/initial_assessments/

# Archive planning iterations
mv 01_refactor_validation_template.md 03_archive/planning_iterations/01_validation_template.md
mv 02_refactor_validation_complete.md 03_archive/planning_iterations/02_validation_complete.md
mv 03_codex_execution_plan.md 03_archive/planning_iterations/
mv 04_execution_plan_assessment.md 03_archive/planning_iterations/04_execution_assessment.md
mv 08_fix1_delivery_report.md 03_archive/planning_iterations/08_fix1_delivery.md

# Remove empty folders
rmdir templates refactor_tasks status_context_files

# Create README
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

### `00_core/` - Always-Active Reference
Core documents that define the refactoring approach. Read these first.

- **REFACTORING_GUIDELINES.md** - Service extraction & proxy patterns (5-step checklists)
- **batches_plan.md** - All 53 batches with dependencies and validations
- **dependency_matrix.md** - Batch dependencies for parallel execution
- **rollback_triggers.md** - 7 HALT conditions and decision tree

### `01_guides/` - Execution How-Tos
Practical guides for executing batches safely and efficiently.

- **batch_templates.md** - Template A (extraction) & Template B (proxy) checklists
- **parallel_execution.md** - Concurrency rules, branching strategy, conflict avoidance
- **performance_baselines.md** - Boot time/memory/latency measurement commands
- **security_checklist.md** - 8-item proxy validation checklist

### `02_priorities/` - Planning & Reports
Priority breakdown, instructions, and completion evidence.

- **priority1_must_fix.md** + **priority1_report.md** - Discovery, batches, guidelines, matrix
- **priority2_should_fix.md** + **priority2_report.md** - Validations, tracker, regression, rollback
- **priority3_nice_to_have.md** + **priority3_report.md** - Templates, parallel, performance, security

### `03_archive/` - Historical Context
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

echo "✅ Migration complete!"
echo "📁 New structure:"
tree -L 2 -I '*.md'
```

---

## README.md Content

Created as part of migration script above. Provides:
- Quick start for different personas (new contributors, executors, reviewers)
- Folder descriptions with file inventories
- Current status snapshot
- Key commands
- Cross-references to related docs

---

## Breaking Changes & Mitigations

### 1. AGENTS.md References
**Problem:** AGENTS.md currently points to old paths:
```markdown
- **Refactoring Guidelines:** `docs/10_201025_todays_status/00_core/REFACTORING_GUIDELINES.md`
- **Progress Tracking:** `.automation/refactor_progress.md`
- **Next Batches:** `docs/10_201025_todays_status/00_core/batches_plan.md`
```

**Solution:** Update AGENTS.md after migration:
```markdown
- **Refactoring Guidelines:** `docs/10_201025_todays_status/00_core/REFACTORING_GUIDELINES.md`
- **Progress Tracking:** `.automation/refactor_progress.md` (unchanged)
- **Next Batches:** `docs/10_201025_todays_status/00_core/batches_plan.md`
- **Navigation:** `docs/10_201025_todays_status/README.md`
```

### 2. .automation/refactor_progress.md References
**Problem:** Progress tracker may reference old file paths in notes.

**Solution:** Update references during migration:
```bash
# In .automation/refactor_progress.md
sed -i '' 's|06_revised_batches_plan.md|00_core/batches_plan.md|g' ../../.automation/refactor_progress.md
sed -i '' 's|07_refactor_dependency_matrix.md|00_core/dependency_matrix.md|g' ../../.automation/refactor_progress.md
```

### 3. Priority Reports Cross-References
**Problem:** Reports (09/10/11) reference old paths in evidence sections.

**Solution:** No update needed - reports are historical snapshots, paths reflect state at creation time.

---

## Rollback Plan

If reorganization causes issues:

```bash
#!/bin/bash
# Run from: docs/10_201025_todays_status/

# Revert via git (safest)
git checkout HEAD -- .

# Or manual restore
mv 00_core/* .
mv 01_guides/* .
mv 02_priorities/* .
mv 03_archive/old_task_based_approach/* refactor_tasks/
mv 03_archive/initial_assessments/* status_context_files/
mv 03_archive/planning_iterations/* .
rmdir 00_core 01_guides 02_priorities 03_archive/{old_task_based_approach,initial_assessments,planning_iterations} 03_archive
rm README.md

# Restore old names
mv batches_plan.md 06_revised_batches_plan.md
mv dependency_matrix.md 07_refactor_dependency_matrix.md
# ... (full reverse mapping)
```

---

## Validation Checklist

After migration:

- [ ] All files moved to new locations (0 orphans)
- [ ] `00_core/` has 4 files
- [ ] `01_guides/` has 4 files
- [ ] `02_priorities/` has 6 files
- [ ] `03_archive/` has 40+ files in 3 subdirs
- [ ] `templates/`, `refactor_tasks/`, `status_context_files/` deleted
- [ ] AGENTS.md updated with new paths
- [ ] `.automation/refactor_progress.md` updated (if needed)
- [ ] README.md created and accurate
- [ ] `npm run -s lint && npm run -s typecheck && npm -s test` passes
- [ ] No broken links in any `.md` file

---

## Next Steps

1. **Review this proposal** - Confirm approach makes sense
2. **Execute migration script** - Run from `docs/10_201025_todays_status/`
3. **Update AGENTS.md** - Fix path references
4. **Validate** - Check all items in checklist above
5. **Commit** - Single atomic commit: `refactor: reorganize 10_201025_todays_status docs`

---

**Estimated Migration Time:** 10-15 minutes (script execution + validation)  
**Risk:** Low (git revert available, no code changes)  
**Benefit:** Massive improvement in navigability and maintainability
