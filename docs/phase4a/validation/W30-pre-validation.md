# W30-PRE — Decomposition Validator Approach Validation

## Quality Metrics
- **Coverage**: All key requirements from original prompt represented (keywords mapping, success criteria). Use keyword heuristics and required feature detectors (e.g., presence of auth/database when prompt mentions them).
- **Clarity**: Subtask descriptions must be 10-500 chars. Flag if <20 chars (too vague) or >300 chars (too granular detail).
- **Granularity**: Detect "setup everything" / "do the thing" patterns for vagueness and repeated atomic steps for over-granularity.
- **Dependency Logic**: Ensure acyclic graph, dependencies only on prior or independent subtasks, highlight isolated nodes.
- **Critical Steps**: Prompt-specific heuristics for auth, data persistence, testing. Always require testing step.
- **Balance Score**: Start at 100, subtract 10 per issue, 5 per warning; <70 triggers human review.

## Bad Decomposition Patterns to Flag
- Too vague: high-level steps lacking actionable verbs/nouns.
- Too granular: dozens of micro-steps (e.g., "create directory", "open file").
- Missing critical features: e.g., todo app without persistence/auth.
- Circular dependencies or dependencies on unknown tasks.
- Subtask count outside 2-10 bounds.

## Validation Approach
1. Run structural checks (count, description length, dependency acyclicity).
2. Analyze coverage by matching prompt keywords to subtasks + success criteria.
3. Evaluate granularity by heuristics on word counts and repeated tokens.
4. Collect issues (blocking) and warnings (needs review) for borderline cases.
5. Compute score = max(0, 100 - issues*10 - warnings*5).
6. Flag `requiresHumanReview` if score < 70 or any critical missing-step issue triggered.

Validated the metrics across sample decompositions from W29-PRE and intentionally bad ones. Approach catches all enumerated bad patterns.
