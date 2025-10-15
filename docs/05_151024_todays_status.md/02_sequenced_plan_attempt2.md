 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/.automation/phase3_workflow_integration_discovery.json b/.automation/phase3_workflow_integration_discovery.json
new file mode 100644
index 0000000000000000000000000000000000000000..cff5302aad303ea34053cf1e924ade225714850e
--- /dev/null
+++ b/.automation/phase3_workflow_integration_discovery.json
@@ -0,0 +1,80 @@
+{
+  "phaseId": "workflow_phase3",
+  "title": "Workflow Phase 3 — Runtime Integration Discovery (WF3-W31)",
+  "date": "2025-10-14",
+  "integrationPoints": [
+    {
+      "file": "src/server.ts",
+      "line": 1,
+      "symbol": "module imports",
+      "rationale": "Bring shared PhaseState utilities (loadPhaseState, suggestNextAction, formatHumanSummary) into the server runtime."
+    },
+    {
+      "file": "src/server.ts",
+      "line": 210,
+      "symbol": "setProgress(sessionId, stage, progress, data, done)",
+      "rationale": "Augment in-memory progress snapshots with workflow metadata per session."
+    },
+    {
+      "file": "src/server.ts",
+      "line": 280,
+      "symbol": "snapshotFromSession(sessionId, fallback)",
+      "rationale": "Ensure snapshot builder can retrieve memoized workflow context for SSE and polling APIs."
+    },
+    {
+      "file": "src/server.ts",
+      "line": 1505,
+      "symbol": "app.post('/api/execute', …)",
+      "rationale": "Prime workflow context when a new execution session starts."
+    },
+    {
+      "file": "src/server.ts",
+      "line": 1899,
+      "symbol": "app.post('/api/sessions/:id/pause', …)",
+      "rationale": "Guarantee workflow context is available when pausing sessions for HITL gates."
+    },
+    {
+      "file": "src/server.ts",
+      "line": 2002,
+      "symbol": "app.post('/api/sessions/:id/resume', …)",
+      "rationale": "Preserve workflow context when resuming sessions so progress snapshots remain enriched."
+    }
+  ],
+  "stackCompliance": {
+    "language": "TypeScript",
+    "node": ">=20",
+    "backend": "Express",
+    "frontend": "N/A (WF3-W31 touches backend only)",
+    "testing": "Vitest >=80%/75% thresholds",
+    "lint": "ESLint 0 warnings",
+    "notes": [
+      "No code changes yet — discovery only.",
+      "Confirmed no Python or forbidden frameworks introduced."
+    ]
+  },
+  "dependencies": {
+    "new": [],
+    "existing": [
+      {
+        "name": "src/state/phaseState.ts",
+        "reason": "Source of PhaseState utilities that will be consumed in runtime."
+      }
+    ]
+  },
+  "risks": [
+    {
+      "id": "R1",
+      "name": "Circular dependency",
+      "mitigation": "Import utilities only (no runtime side-effects) and keep server.ts as consumer."
+    },
+    {
+      "id": "R2",
+      "name": "Disk read overhead",
+      "mitigation": "Memoize workflow context per session to avoid repeated filesystem access."
+    }
+  ],
+  "evidence": [
+    "src/server.ts:1",
+    "src/state/phaseState.ts:1"
+  ]
+}
diff --git a/.automation/phase3_workflow_integration_discovery.md b/.automation/phase3_workflow_integration_discovery.md
new file mode 100644
index 0000000000000000000000000000000000000000..d3fa47de719c4102b31813920c0ebd872f852284
--- /dev/null
+++ b/.automation/phase3_workflow_integration_discovery.md
@@ -0,0 +1,77 @@
+# Workflow Phase 3 — Discovery Note (WF3-W31)
+
+Last Updated: 2025-10-14  
+Scope: Backend runtime integration (`src/server.ts`)
+
+## Integration Points and Current Implementation
+
+- **Workflow imports** — `src/server.ts` (top of file)
+  ```ts
+  import { generateJSON } from "./llm/index.js";
+  import { withTraceContext } from "./llm/trace.js";
+  // PhaseState utilities will join this block to keep runtime centralized.
+  ```
+  *Reason:* Need to import `loadPhaseState`, `suggestNextAction`, and `formatHumanSummary` so the runtime can share the same workflow insights as CLI tooling.
+
+- **setProgress(sessionId, stage, progress, data, done)** — `src/server.ts:210`
+  ```ts
+  progressSessions.set(sessionId, {
+    stage,
+    progress,
+    data,
+    updatedAt: Date.now(),
+    done,
+    state: session.machine.state,
+    paused: session.paused,
+    questions: session.questions,
+    checkpointUpdatedAt: session.checkpointUpdatedAt
+  });
+  ```
+  *Reason:* Progress cache is the natural place to memoize workflow metadata so SSE + polling stay in sync.
+
+- **snapshotFromSession(sessionId, fallback)** — `src/server.ts:270`
+  ```ts
+  return {
+    stage: baseStage,
+    progress: existing?.progress ?? 0,
+    data: existing?.data,
+    updatedAt: Date.now(),
+    done: existing?.done ?? false,
+    state: session.machine.state,
+    paused: session.paused,
+    questions: session.questions,
+    checkpointUpdatedAt: session.checkpointUpdatedAt
+  };
+  ```
+  *Reason:* Builder should surface memoized workflow context so `/api/progress`, `/api/progress/snapshot`, and SSE remain authoritative.
+
+- **app.post("/api/execute", …)** — `src/server.ts:1505`
+  ```ts
+  const providedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
+  const sessionId = providedSessionId || randomUUID();
+  setProgress(sessionId, "analyzing", 10);
+  ```
+  *Reason:* Prime workflow context as soon as a session spins up.
+
+- **Pause/Resume routes** — `src/server.ts:1899` and `:2002`
+  *Reason:* Paused sessions must keep workflow metadata aligned when generating checkpoints and resuming execution.
+
+## Dependencies & Impacts
+
+- **Primary dependency:** `src/state/phaseState.ts` (already provides normalized gates/tasks + helper APIs).
+- **No new packages.** Memoization will live entirely in `src/server.ts`.
+- **Performance consideration:** Avoid repeated disk reads by caching per session and clearing when TTL expires.
+
+## Stack Compliance
+
+- Language: TypeScript (Node.js 20 runtime)
+- Framework: Express backend only (no frontend impact)
+- Tests: Existing Vitest suite continues to enforce ≥80%/75%
+- Lint: ESLint (0 warnings tolerance)
+- Forbidden tech: No Python, no frontend frameworks introduced
+
+## Open Questions / Follow-ups
+
+1. Where should validation snapshots live? (Candidate: `.automation/validation_results.json` or StepQueue memory.)
+2. When enriching responses in WF3-W32, confirm payload shape with UI to avoid breaking `/public/script.js` consumers.
+
diff --git a/.automation/workflow_phase3_progress.json b/.automation/workflow_phase3_progress.json
new file mode 100644
index 0000000000000000000000000000000000000000..19116ac6d558bf89fc6e4d6c5dc32d71a36fb71e
--- /dev/null
+++ b/.automation/workflow_phase3_progress.json
@@ -0,0 +1,18 @@
+[
+  {
+    "task_id": "WF3-V01",
+    "status": "succeeded",
+    "started_at": "2025-10-14T20:47:16.145Z",
+    "completed_at": "2025-10-14T20:49:35.852Z",
+    "elapsed_ms": 139707,
+    "notes": "npm run state:show, npm run state:show:validate, and npm run state:sync all exited 0 with full validation suite passing."
+  },
+  {
+    "task_id": "WF3-W31",
+    "status": "succeeded",
+    "started_at": "2025-10-15T02:10:12.512Z",
+    "completed_at": "2025-10-15T02:44:05.918Z",
+    "elapsed_ms": 2033406,
+    "notes": "PhaseState workflow context memoized inside the runtime and cached per session for progress snapshots and SSE payloads."
+  }
+]
diff --git a/contracts/Roadmap_workflow/03_workflow_phase3_integration_contract.json b/contracts/Roadmap_workflow/03_workflow_phase3_integration_contract.json
new file mode 100644
index 0000000000000000000000000000000000000000..f5696186497cc42ffe657635d2d49e1d0fde7a6b
--- /dev/null
+++ b/contracts/Roadmap_workflow/03_workflow_phase3_integration_contract.json
@@ -0,0 +1,393 @@
+{
+  "contract_version": "3.0.0",
+  "contract_meta": {
+    "created": "2025-10-14",
+    "phase": "3",
+    "phase_name": "Workflow Phase 3 — Runtime Integration of PhaseState",
+    "prerequisite_phase": "Workflow Phase 2 (Contract Sync)",
+    "enhancement": "Connect the autonomous workflow state engine to the product runtime so developers and agents get a single, authoritative view of gates, tasks, and recommendations while a session executes.",
+    "rationale": "Phases 1-2 delivered CLI tooling that synthesizes roadmap contracts into actionable workflow guidance, but the runtime and UI still operate on a separate, truncated progress model. This contract finishes the originally-scoped Phase 3 work by wiring the shared PhaseState module into server-side progress endpoints, eliminating drift, surfacing governance context to developers in real time, and unlocking Phase 4 autonomous execution.",
+    "references": [
+      "docs/04_141024_todays_status.md/06_confusion_analysis.md",
+      "docs/04_141024_todays_status.md/08_phase3_integration_rationale.md",
+      "WHAT_IS_WHAT.md",
+      "src/state/phaseState.ts",
+      "scripts/snapshot-state.js"
+    ]
+  },
+  "project": {
+    "name": "Autonomous Workflow System",
+    "current_phase": "Workflow Phase 3 — Runtime Integration",
+    "goal": "Expose the workflow PhaseState (gates, contract tasks, suggested actions, human summary) through the Executor runtime so `/api/progress` and SSE consumers report the same guidance as `npm run state:show`, preventing decision drift before autonomous execution begins.",
+    "scope": "Import shared PhaseState utilities into server runtime, enrich snapshot + SSE payloads with workflow metadata, add coverage to guarantee parity with CLI outputs, and document the integration for future phases.",
+    "estimated_time": "2-3 hours of TypeScript integration and validation",
+    "work_profile": "TypeScript backend integration, SSE payload design, Vitest updates, documentation",
+    "out_of_scope": [
+      "Automated action execution (Workflow Phase 4)",
+      "LangGraph product orchestration changes",
+      "Frontend redesign beyond surfacing additional fields",
+      "Changes to roadmap contract schemas"
+    ]
+  },
+  "execution_model": {
+    "type": "autonomous_with_verification",
+    "verification_strategy": "Confirm Phases 1-2 tooling is healthy, then integrate PhaseState into runtime endpoints with incremental validation",
+    "description": "Reuse completed discovery artifacts for Phase 3 (shared PhaseState module scaffold). Verify workflow tooling health, wire shared state into server progress endpoints, enrich SSE snapshots, and validate parity via tests and manual inspection.",
+    "failure_mode": "halt_and_report",
+    "no_assumptions": true,
+    "evidence_required": true
+  },
+  "stack_compliance": {
+    "enforced_by": "ai-stack.json + AGENTS.md",
+    "language": "TypeScript/JavaScript",
+    "frameworks": [
+      "Express",
+      "Vitest"
+    ],
+    "test_command": "npm test -- src/state/phaseState.test.ts src/server.test.ts",
+    "constraints": [
+      "No Python files",
+      "No new frontend frameworks (vanilla JS only)",
+      "Maintain coverage ≥ 80% line / 75% branch",
+      "ESLint warnings forbidden",
+      "Do not modify contract schemas"
+    ],
+    "validation": "npm run contract:check"
+  },
+  "environments": {
+    "dev": {
+      "node_version": ">=20.10.0 <21",
+      "package_manager": "npm",
+      "os": "macos|linux",
+      "verify_commands": [
+        "npm run lint",
+        "npm run typecheck",
+        "npm test -- src/state/phaseState.test.ts src/server.test.ts",
+        "npm run contract:check"
+      ]
+    }
+  },
+  "observability": {
+    "description": "Track progress of wiring PhaseState into runtime endpoints and ensure parity with CLI workflow outputs.",
+    "trace_file": ".automation/execution_trace.jsonl",
+    "discovery_file": ".automation/phase3_workflow_integration_discovery.json",
+    "evidence_file": ".automation/phase3_workflow_integration_evidence.json",
+    "evaluation_file": ".automation/phase3_workflow_integration_evaluation.json",
+    "monitoring": {
+      "discovery_phase_tracking": true,
+      "integration_point_validation": true,
+      "runtime_snapshot_enriched": false,
+      "sse_payload_enriched": false
+    },
+    "logging": {
+      "format": "jsonl",
+      "fields": [
+        "timestamp",
+        "task_id",
+        "action",
+        "status",
+        "command",
+        "exit_code",
+        "stdout_excerpt",
+        "stderr_excerpt"
+      ]
+    },
+    "evaluation": {
+      "continuous": true,
+      "evaluate_after_each_win": true,
+      "quality_dimensions": [
+        "correctness",
+        "completeness",
+        "safety"
+      ]
+    }
+  },
+  "global_quality_standards": {
+    "lint": {
+      "command": "npm run lint",
+      "must_pass": true,
+      "max_warnings": 0
+    },
+    "typecheck": {
+      "command": "npm run typecheck",
+      "must_pass": true
+    },
+    "tests": {
+      "command": "npm test",
+      "expected": {
+        "exit_code": 0,
+        "no_failed_suites": true
+      },
+      "coverage": {
+        "min_line_pct": 80,
+        "min_branch_pct": 75
+      }
+    },
+    "contract_schema": {
+      "command": "npm run contract:check",
+      "must_pass": true
+    }
+  },
+  "high_level_stages": [
+    "phase2_verification",
+    "shared_state_alignment",
+    "runtime_enrichment",
+    "validation_gate"
+  ],
+  "tasks": [
+    {
+      "id": "WF3-V01",
+      "stage": "phase2_verification",
+      "title": "Verify Phase 1-2 workflow tooling is healthy",
+      "type": "verification",
+      "description": "Ensure snapshot and sync commands exist and pass before wiring them into the runtime.",
+      "actions": [
+        {
+          "type": "run",
+          "cmd": "npm run state:show"
+        },
+        {
+          "type": "run",
+          "cmd": "npm run state:show:validate"
+        },
+        {
+          "type": "run",
+          "cmd": "npm run state:sync"
+        }
+      ],
+      "evaluation": {
+        "intent": "Prevent integration work if foundational workflow tooling regressed",
+        "success_criteria": "All commands exit 0 and snapshot output contains suggested_next_action"
+      },
+      "trace_context": {
+        "decision_point": "phase2_verification",
+        "reasoning_required": true,
+        "critical": true
+      }
+    },
+    {
+      "id": "WF3-W31",
+      "stage": "shared_state_alignment",
+      "title": "Import PhaseState utilities into server runtime",
+      "type": "win",
+      "description": "Use loadPhaseState, suggestNextAction, and formatHumanSummary from src/state/phaseState.ts inside src/server.ts to generate workflow metadata for active sessions.",
+      "time_estimate_minutes": 60,
+      "actions": [
+        {
+          "type": "edit",
+          "file": "src/server.ts",
+          "description": "Add imports from src/state/phaseState.ts and initialize workflow context alongside orchestrator snapshots."
+        },
+        {
+          "type": "edit",
+          "file": "src/server.ts",
+          "description": "Ensure workflow context is memoized per session to avoid redundant filesystem reads."
+        }
+      ],
+      "validation": [
+        {
+          "cmd": "npm run lint"
+        },
+        {
+          "cmd": "npm run typecheck"
+        }
+      ],
+      "success_criteria": [
+        "Server imports shared PhaseState utilities without circular dependency",
+        "Workflow context available inside progress snapshot builder",
+        "No lint or type errors introduced"
+      ],
+      "trace_context": {
+        "decision_point": "wf3_runtime_imports",
+        "win_number": "31"
+      }
+    },
+    {
+      "id": "WF3-W32",
+      "stage": "runtime_enrichment",
+      "title": "Enrich progress snapshot and SSE payloads",
+      "type": "win",
+      "description": "Attach workflow metadata (current gate, pending tasks, suggested next action, human summary) to /api/progress, /api/progress/snapshot, and progress SSE responses.",
+      "time_estimate_minutes": 45,
+      "actions": [
+        {
+          "type": "edit",
+          "file": "src/server.ts",
+          "description": "Extend snapshot builder to include phaseState.current, phaseState.tasks, and phaseState.suggestedNextAction fields."
+        },
+        {
+          "type": "edit",
+          "file": "public/script.js",
+          "description": "Render new workflow fields in progress UI (e.g., tooltips or sidebar) without altering orchestration controls."
+        },
+        {
+          "type": "edit",
+          "file": "tests/api/progress.test.ts",
+          "description": "Add assertions that workflow metadata is present in API responses."
+        }
+      ],
+      "validation": [
+        {
+          "cmd": "npm test -- tests/api/progress.test.ts"
+        }
+      ],
+      "success_criteria": [
+        "API and SSE payloads include workflow metadata",
+        "UI displays workflow summary without layout regressions",
+        "Tests cover new fields"
+      ],
+      "trace_context": {
+        "decision_point": "wf3_runtime_enrichment",
+        "win_number": "32"
+      }
+    },
+    {
+      "id": "WF3-W33",
+      "stage": "runtime_enrichment",
+      "title": "Parity test between CLI snapshot and runtime payload",
+      "type": "win",
+      "description": "Add regression tests ensuring runtime workflow data matches CLI PhaseState output for identical fixtures.",
+      "time_estimate_minutes": 30,
+      "actions": [
+        {
+          "type": "edit",
+          "file": "tests/state/phaseState.test.ts",
+          "description": "Add fixture representing an in-progress session and assert parity with runtime serializer."
+        },
+        {
+          "type": "create_file",
+          "file": "tests/api/__fixtures__/workflowProgress.json",
+          "content_spec": "Shared fixture consumed by CLI and runtime tests."
+        }
+      ],
+      "validation": [
+        {
+          "cmd": "npm test -- tests/state/phaseState.test.ts"
+        }
+      ],
+      "success_criteria": [
+        "Fixture-driven test compares CLI and runtime outputs",
+        "Coverage for new workflow fields is ≥ 80%",
+        "Parity test fails if runtime omits workflow metadata"
+      ],
+      "trace_context": {
+        "decision_point": "wf3_parity_tests",
+        "win_number": "33"
+      }
+    },
+    {
+      "id": "WF3-GATE",
+      "stage": "validation_gate",
+      "title": "Workflow Phase 3 validation gate",
+      "type": "validation",
+      "description": "Confirm runtime workflow integration is stable and documented before starting autonomous execution work.",
+      "actions": [
+        {
+          "type": "validate",
+          "cmd": "npm run lint"
+        },
+        {
+          "type": "validate",
+          "cmd": "npm run typecheck"
+        },
+        {
+          "type": "validate",
+          "cmd": "npm test"
+        },
+        {
+          "type": "validate",
+          "cmd": "npm run contract:check"
+        },
+        {
+          "type": "manual_test",
+          "description": "Run npm run dev, initiate a sample session, and verify progress UI surfaces gate/task summary and suggested action in real time."
+        }
+      ],
+      "evaluation": {
+        "intent": "Ensure runtime + UI reflect workflow metadata with no regressions",
+        "success_criteria": "All automated validations pass and manual run confirms workflow summary display"
+      },
+      "trace_context": {
+        "decision_point": "wf3_gate",
+        "reasoning_required": true,
+        "critical": true,
+        "gate_type": "go_no_go"
+      }
+    }
+  ],
+  "execution_order": [
+    "WF3-V01",
+    "WF3-W31",
+    "WF3-W32",
+    "WF3-W33",
+    "WF3-GATE"
+  ],
+  "execution_semantics": {
+    "win_isolation": {
+      "description": "Complete and validate each integration step before enriching payloads further.",
+      "implementation": "Run lint and targeted tests after every win; halt on failure."
+    },
+    "gate_enforcement": {
+      "WF3-GATE": {
+        "required": true,
+        "on_fail": "Halt and remediate before beginning Workflow Phase 4.",
+        "report": "Document failing validations and remediation plan in .automation/phase3_workflow_integration_evaluation.json"
+      }
+    },
+    "phase_specific_constraints": {
+      "no_new_dependencies": "Use existing stack only; raise ADR before adding libraries.",
+      "ui_scope_guard": "Only augment existing progress UI. No new framework or layout overhaul."
+    }
+  },
+  "completion_criteria": {
+    "phase2_verified": true,
+    "runtime_imports_added": true,
+    "workflow_metadata_exposed": true,
+    "parity_tests_passing": true,
+    "all_tests_pass": true,
+    "coverage_maintained": true
+  },
+  "fallback_policies": {
+    "phase2_verification_fails": "Stop immediately, restore Phase 1-2 tooling, rerun commands before continuing.",
+    "runtime_integration_breaks": "Revert server.ts changes, re-run tests, and reattempt with smaller increments.",
+    "ui_regression_detected": "Rollback UI tweaks and coordinate with UX owner before reapplying."
+  },
+  "reporting": {
+    "progress_file": ".automation/workflow_phase3_progress.json",
+    "fields": [
+      "task_id",
+      "status",
+      "started_at",
+      "completed_at",
+      "elapsed_ms",
+      "notes"
+    ],
+    "status_values": [
+      "pending",
+      "running",
+      "succeeded",
+      "blocked"
+    ],
+    "phase_report": {
+      "file": ".automation/workflow_phase3_completion_report.json",
+      "fields": [
+        "wins_completed",
+        "gate_passed",
+        "timestamp",
+        "handoff_notes"
+      ]
+    }
+  },
+  "final_artifacts_verification": [
+    {
+      "name": "Server workflow snapshot payload",
+      "path": "src/server.ts",
+      "must_include_regex": "phaseState"
+    },
+    {
+      "name": "Progress API test",
+      "path": "tests/api/progress.test.ts",
+      "must_include_regex": "workflowMetadata"
+    }
+  ]
+}
diff --git a/contracts/Roadmap_workflow/04_workflow_phase4_autonomous_executor_contract.json b/contracts/Roadmap_workflow/04_workflow_phase4_autonomous_executor_contract.json
new file mode 100644
index 0000000000000000000000000000000000000000..729deb96bb8dcd43273491f3f3b13075a9761da4
--- /dev/null
+++ b/contracts/Roadmap_workflow/04_workflow_phase4_autonomous_executor_contract.json
@@ -0,0 +1,388 @@
+{
+  "contract_version": "4.0.0",
+  "contract_meta": {
+    "created": "2025-10-14",
+    "phase": "4",
+    "phase_name": "Workflow Phase 4 — Autonomous Executor & Safe Actions",
+    "prerequisite_phase": "Workflow Phase 3 (Runtime Integration)",
+    "enhancement": "Add a governed automation layer that executes the workflow engine's recommended next actions (lint, tests, contract sync, git commits) with dry-run guardrails and rollback visibility.",
+    "rationale": "With runtime parity achieved in Phase 3, the remaining blocker for autonomous developer operations is executing the suggested next actions without manual babysitting. This phase delivers a safe executor that reuses the shared PhaseState heuristics, performs validations, and applies commits only when guardrails confirm success—eliminating the human bottleneck called out in the audit logs.",
+    "references": [
+      "docs/04_141024_todays_status.md/01_autonomous_state_plan_log.md",
+      "docs/04_141024_todays_status.md/06_confusion_analysis.md",
+      "docs/04_141024_todays_status.md/07_documentation_update.md",
+      "WHAT_IS_WHAT.md",
+      "src/state/phaseState.ts"
+    ]
+  },
+  "project": {
+    "name": "Autonomous Workflow System",
+    "current_phase": "Workflow Phase 4 — Autonomous Executor",
+    "goal": "Provide a governed CLI (`npm run state:next`) that reads PhaseState, runs required validations, commits passing work, and produces auditable logs so developers and agents can advance roadmap tasks without manual intervention.",
+    "scope": "Implement autonomous executor CLI with dry-run mode, validation + git automation, evidence logging, and integration with runtime workflow metadata.",
+    "estimated_time": "1-2 hours of scripting plus 1 hour for tests and documentation",
+    "work_profile": "Node.js automation scripts, git integration, Vitest coverage, documentation",
+    "out_of_scope": [
+      "Product orchestrator automation",
+      "New roadmap contract authoring",
+      "CI pipeline triggers",
+      "Feature flag rollout of LangGraph"
+    ]
+  },
+  "execution_model": {
+    "type": "autonomous_with_verification",
+    "verification_strategy": "Confirm Phase 3 artifacts are active, then iteratively build the autonomous executor with validations at each milestone.",
+    "description": "Leverage shared PhaseState heuristics to execute safe actions (lint/typecheck/test/contract sync/git commit) via a CLI entrypoint with dry-run preview, evidence logging, and rollback guidance.",
+    "failure_mode": "halt_and_report_with_diff",
+    "no_assumptions": true,
+    "evidence_required": true
+  },
+  "stack_compliance": {
+    "enforced_by": "ai-stack.json + AGENTS.md",
+    "language": "TypeScript/JavaScript",
+    "frameworks": [
+      "Vitest"
+    ],
+    "test_command": "npm test -- tests/state/stateNext.test.ts",
+    "constraints": [
+      "No Python files",
+      "No new npm dependencies",
+      "Use git CLI available in repo environment",
+      "Coverage ≥ 80% line / 75% branch",
+      "ESLint warnings forbidden"
+    ],
+    "validation": "npm run contract:check"
+  },
+  "environments": {
+    "dev": {
+      "node_version": ">=20.10.0 <21",
+      "package_manager": "npm",
+      "os": "macos|linux",
+      "verify_commands": [
+        "npm run lint",
+        "npm run typecheck",
+        "npm test -- tests/state/stateNext.test.ts",
+        "npm run contract:check"
+      ]
+    }
+  },
+  "observability": {
+    "description": "Measure autonomous executor runs, validations, and git operations for auditability.",
+    "trace_file": ".automation/execution_trace.jsonl",
+    "discovery_file": ".automation/phase4_autonomous_executor_discovery.json",
+    "evidence_file": ".automation/phase4_autonomous_executor_evidence.json",
+    "evaluation_file": ".automation/phase4_autonomous_executor_evaluation.json",
+    "monitoring": {
+      "discovery_phase_tracking": true,
+      "dry_run_executed": false,
+      "live_run_executed": false,
+      "commit_created": false
+    },
+    "logging": {
+      "format": "jsonl",
+      "fields": [
+        "timestamp",
+        "task_id",
+        "action",
+        "status",
+        "command",
+        "stdout_excerpt",
+        "stderr_excerpt"
+      ]
+    },
+    "evaluation": {
+      "continuous": true,
+      "evaluate_after_each_win": true,
+      "quality_dimensions": [
+        "correctness",
+        "completeness",
+        "safety"
+      ]
+    }
+  },
+  "global_quality_standards": {
+    "lint": {
+      "command": "npm run lint",
+      "must_pass": true,
+      "max_warnings": 0
+    },
+    "typecheck": {
+      "command": "npm run typecheck",
+      "must_pass": true
+    },
+    "tests": {
+      "command": "npm test",
+      "expected": {
+        "exit_code": 0,
+        "no_failed_suites": true
+      },
+      "coverage": {
+        "min_line_pct": 80,
+        "min_branch_pct": 75
+      }
+    },
+    "contract_schema": {
+      "command": "npm run contract:check",
+      "must_pass": true
+    }
+  },
+  "high_level_stages": [
+    "phase3_verification",
+    "executor_foundation",
+    "automation_pipeline",
+    "evidence_and_gate"
+  ],
+  "tasks": [
+    {
+      "id": "WF4-V01",
+      "stage": "phase3_verification",
+      "title": "Confirm runtime exposes workflow metadata",
+      "type": "verification",
+      "description": "Block autonomous execution until Phase 3 integration is active and emitting workflow metadata.",
+      "actions": [
+        {
+          "type": "run",
+          "cmd": "npm run state:show"
+        },
+        {
+          "type": "manual_test",
+          "description": "Start npm run dev and verify /api/progress includes workflowMetadata.currentGate and suggestedNextAction."
+        }
+      ],
+      "evaluation": {
+        "intent": "Guarantee Phase 4 builds on top of a synchronized runtime + CLI view",
+        "success_criteria": "CLI and runtime both show suggested_next_action"
+      },
+      "trace_context": {
+        "decision_point": "wf4_phase3_verification",
+        "reasoning_required": true,
+        "critical": true
+      }
+    },
+    {
+      "id": "WF4-W41",
+      "stage": "executor_foundation",
+      "title": "Create state:next CLI with dry-run",
+      "type": "win",
+      "description": "Add scripts/state-next.js that loads PhaseState, prints recommended action, and simulates the steps without modifying the workspace.",
+      "time_estimate_minutes": 40,
+      "actions": [
+        {
+          "type": "create_file",
+          "file": "scripts/state-next.js",
+          "content_spec": "ESM module exporting runStateNext({ dryRun }) and CLI entrypoint supporting --dry-run (default true)."
+        },
+        {
+          "type": "edit",
+          "file": "package.json",
+          "description": "Add npm script `state:next`: `node scripts/state-next.js`."
+        }
+      ],
+      "validation": [
+        {
+          "cmd": "node scripts/state-next.js --dry-run"
+        }
+      ],
+      "success_criteria": [
+        "CLI prints recommended action with no mutations",
+        "Dry-run default prevents git operations",
+        "Package.json exposes npm run state:next"
+      ],
+      "trace_context": {
+        "decision_point": "wf4_cli_scaffold",
+        "win_number": "41"
+      }
+    },
+    {
+      "id": "WF4-W42",
+      "stage": "automation_pipeline",
+      "title": "Implement validation + git automation",
+      "type": "win",
+      "description": "Teach state:next to run lint/typecheck/tests, call npm run state:sync on success, and create a git branch + commit with evidence summary when not in dry-run mode.",
+      "time_estimate_minutes": 60,
+      "actions": [
+        {
+          "type": "edit",
+          "file": "scripts/state-next.js",
+          "description": "Execute validations sequentially with detailed logging and bail out on first failure."
+        },
+        {
+          "type": "edit",
+          "file": "scripts/state-next.js",
+          "description": "Integrate git add/commit operations using the suggested action metadata (e.g., task id in commit message)."
+        },
+        {
+          "type": "edit",
+          "file": "scripts/state-next.js",
+          "description": "Write execution details to .automation/actions.jsonl for audit trails."
+        }
+      ],
+      "validation": [
+        {
+          "cmd": "node scripts/state-next.js --dry-run"
+        },
+        {
+          "cmd": "node scripts/state-next.js"
+        }
+      ],
+      "success_criteria": [
+        "Validations run before any git mutation",
+        "On success, git commit uses suggested task id",
+        "All operations logged to .automation/actions.jsonl"
+      ],
+      "trace_context": {
+        "decision_point": "wf4_automation_pipeline",
+        "win_number": "42"
+      }
+    },
+    {
+      "id": "WF4-W43",
+      "stage": "automation_pipeline",
+      "title": "Add Vitest coverage for autonomous executor",
+      "type": "win",
+      "description": "Cover dry-run and live-run paths with mocks for git + child_process, ensuring safety rails and logging.",
+      "time_estimate_minutes": 45,
+      "actions": [
+        {
+          "type": "create_file",
+          "file": "tests/state/stateNext.test.ts",
+          "content_spec": "Vitest suite mocking child_process to assert command order, dry-run guard, and logging output."
+        }
+      ],
+      "validation": [
+        {
+          "cmd": "npm test -- tests/state/stateNext.test.ts"
+        }
+      ],
+      "success_criteria": [
+        "Tests fail if executor runs git commit before validations",
+        "Dry-run path skips mutations",
+        "Coverage ≥ 80% for scripts/state-next.js"
+      ],
+      "trace_context": {
+        "decision_point": "wf4_executor_tests",
+        "win_number": "43"
+      }
+    },
+    {
+      "id": "WF4-GATE",
+      "stage": "evidence_and_gate",
+      "title": "Workflow Phase 4 validation gate",
+      "type": "validation",
+      "description": "Certify autonomous executor readiness and evidence capture before declaring workflow track complete.",
+      "actions": [
+        {
+          "type": "validate",
+          "cmd": "npm run lint"
+        },
+        {
+          "type": "validate",
+          "cmd": "npm run typecheck"
+        },
+        {
+          "type": "validate",
+          "cmd": "npm test"
+        },
+        {
+          "type": "validate",
+          "cmd": "npm run contract:check"
+        },
+        {
+          "type": "manual_test",
+          "description": "Run npm run state:next --dry-run (expect preview only) then npm run state:next (expect validations + commit)."
+        }
+      ],
+      "evaluation": {
+        "intent": "Ensure automation operates safely with full evidence trail",
+        "success_criteria": "All validations pass, manual run generates commit + log entry"
+      },
+      "trace_context": {
+        "decision_point": "wf4_gate",
+        "reasoning_required": true,
+        "critical": true,
+        "gate_type": "go_no_go"
+      }
+    }
+  ],
+  "execution_order": [
+    "WF4-V01",
+    "WF4-W41",
+    "WF4-W42",
+    "WF4-W43",
+    "WF4-GATE"
+  ],
+  "execution_semantics": {
+    "win_isolation": {
+      "description": "Validate dry-run behavior before enabling live mutations.",
+      "implementation": "Keep live-run disabled until WF4-W41 + WF4-W42 validations succeed."
+    },
+    "gate_enforcement": {
+      "WF4-GATE": {
+        "required": true,
+        "on_fail": "Halt automation; revert git mutations and capture diagnostics in .automation/phase4_autonomous_executor_evaluation.json",
+        "report": "Summarize failure, remediation, and retest plan"
+      }
+    },
+    "phase_specific_constraints": {
+      "dry_run_default": "state-next must default to dry-run unless --live flag passed.",
+      "audit_logging_required": "Every action must append to .automation/actions.jsonl"
+    }
+  },
+  "completion_criteria": {
+    "phase3_verified": true,
+    "cli_available": true,
+    "validations_automated": true,
+    "git_commit_on_success": true,
+    "audit_logs_written": true,
+    "all_tests_pass": true,
+    "coverage_maintained": true
+  },
+  "fallback_policies": {
+    "dry_run_failure": "Stop and inspect PhaseState heuristics; do not attempt live mode until resolved.",
+    "validation_failure": "Abort automation, fix underlying lint/type/test issue, rerun dry-run.",
+    "git_error": "Abort and run git reset --hard HEAD && git clean -fd before retrying."
+  },
+  "reporting": {
+    "progress_file": ".automation/workflow_phase4_progress.json",
+    "fields": [
+      "task_id",
+      "status",
+      "started_at",
+      "completed_at",
+      "elapsed_ms",
+      "notes"
+    ],
+    "status_values": [
+      "pending",
+      "running",
+      "succeeded",
+      "blocked"
+    ],
+    "phase_report": {
+      "file": ".automation/workflow_phase4_completion_report.json",
+      "fields": [
+        "wins_completed",
+        "gate_passed",
+        "timestamp",
+        "automation_runs_recorded"
+      ]
+    }
+  },
+  "final_artifacts_verification": [
+    {
+      "name": "Autonomous executor script",
+      "path": "scripts/state-next.js",
+      "must_include_regex": "runStateNext"
+    },
+    {
+      "name": "Executor tests",
+      "path": "tests/state/stateNext.test.ts",
+      "must_include_regex": "state:next"
+    },
+    {
+      "name": "Actions log",
+      "path": ".automation/actions.jsonl",
+      "must_include_regex": "state-next"
+    }
+  ]
+}
diff --git a/public/index.html b/public/index.html
index c7d49f8057d1ab0aad652c00a5bcb0516667c0c9..6446817b35dadece5109b17f01b829d17474020f 100644
--- a/public/index.html
+++ b/public/index.html
@@ -4,50 +4,80 @@
     <meta charset="utf-8" />
     <title>Executor MVP</title>
     <meta name="description" content="AI executor dashboard for planning, testing, and repairing generated projects." />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <link rel="preload" href="/styles.css" as="style" />
     <link rel="stylesheet" href="/styles.css" />
     <!-- Prism.js for syntax highlighting (CDN, no build step) -->
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1/themes/prism-tomorrow.min.css" />
     <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext y='14' font-size='14'%3E%F0%9F%94%A7%3C/text%3E%3C/svg%3E" />
     <noscript><link rel="stylesheet" href="/styles.css" /></noscript>
   </head>
   <body>
     <main class="container">
       <h1>Executor MVP</h1>
       <p><a href="/fixtures.html" style="text-decoration:underline">🔍 Debug / Fixtures</a></p>
       <p class="subtle">Type a build request. The agent will return a JSON file list. The server writes them to <code>/output/&lt;project&gt;</code>.</p>
 
       <label>Project name (optional)</label>
       <input id="projectName" placeholder="hello-world-app" />
 
       <label>Prompt</label>
       <textarea id="prompt" rows="8" placeholder="Make a minimal Node+TS Hello World web app with GET / that returns 'Hello World'. Include README with run steps."></textarea>
 
       <button id="runBtn">Execute</button>
 
+      <section id="workflowSummary" class="workflow-summary hidden">
+        <div class="workflow-summary__header">
+          <h2 id="workflowPhaseLabel">Workflow Status</h2>
+          <span id="workflowSummaryTimestamp" class="workflow-summary__timestamp"></span>
+        </div>
+        <p id="workflowHumanSummary" class="workflow-summary__human"></p>
+        <div class="workflow-summary__grid">
+          <div class="workflow-summary__card">
+            <h3>Gate &amp; Tasks</h3>
+            <p id="workflowCurrentGate" class="workflow-summary__value">—</p>
+            <p id="workflowCurrentTask" class="workflow-summary__muted">Current task pending</p>
+            <p id="workflowNextTask" class="workflow-summary__muted">Next task pending</p>
+          </div>
+          <div class="workflow-summary__card">
+            <h3>Suggested Next Action</h3>
+            <p id="workflowNextAction" class="workflow-summary__value">—</p>
+            <p id="workflowNextActionReason" class="workflow-summary__muted"></p>
+            <code id="workflowNextActionCommand" class="workflow-summary__code hidden"></code>
+          </div>
+          <div class="workflow-summary__card">
+            <h3>Pending Tasks</h3>
+            <ul id="workflowPendingTasks" class="workflow-summary__list"></ul>
+          </div>
+          <div class="workflow-summary__card">
+            <h3>Repository</h3>
+            <ul id="workflowRepoStatus" class="workflow-summary__list"></ul>
+          </div>
+        </div>
+      </section>
+
       <section id="clarificationSection" class="clarification hidden">
         <h2>Clarification Needed</h2>
         <p class="clarification-hint">Answer the questions below so the agent can build exactly what you need.</p>
         <form id="clarificationForm">
           <div id="clarificationQuestions" class="clarification-questions"></div>
           <div class="clarification-actions">
             <button type="submit" id="answerClarifications">Answer Questions</button>
             <button type="button" id="skipClarifications" class="skip-button">Skip Questions</button>
           </div>
         </form>
       </section>
 
       <pre id="result" class="result"></pre>
 
       <!-- File Preview Panel (hidden by default) -->
       <div id="filePreviewPanel" class="file-preview-panel" hidden></div>
 
       <!-- Internal debug disclosure (closed by default) -->
       <details id="debugDisclosure" class="debug-disclosure hidden">
         <summary aria-label="Toggle advanced debug information">🔧 Debug Info (Advanced)</summary>
         <div class="debug-content">
           <section id="taskPlanSection" class="task-plan hidden">
             <h2>Task Plan Progress</h2>
             <div class="plan-overview">
               <div class="progress-container">
diff --git a/public/script.js b/public/script.js
index d96054a042b5e0d8b58ce11c623c9b46f05fb8ed..eadaed93e3a3be8fdef01583fa82c6305ef7bed5 100644
--- a/public/script.js
+++ b/public/script.js
@@ -4,50 +4,62 @@ import { successIcon, partialIcon, errorIcon } from "./icons.js";
 const runBtn = document.getElementById("runBtn");
 const promptEl = document.getElementById("prompt");
 const projEl = document.getElementById("projectName");
 const resultEl = document.getElementById("result");
 const testControlsEl = document.getElementById("testControls");
 const runTestsBtn = document.getElementById("runTestsBtn");
 const testStatusEl = document.getElementById("testStatus");
 const repairTimelineEl = document.getElementById("repairTimeline");
 const clarificationSection = document.getElementById("clarificationSection");
 const clarificationForm = document.getElementById("clarificationForm");
 const clarificationQuestionsEl = document.getElementById("clarificationQuestions");
 const skipClarificationsBtn = document.getElementById("skipClarifications");
 const repairHistorySection = document.getElementById("repairHistorySection");
 const repairHistoryContent = document.getElementById("repairHistoryContent");
 const repairHistoryTimeline = document.getElementById("repairHistoryTimeline");
 const repairHistoryToggle = document.getElementById("toggleRepairHistory");
 const repairHistorySummaryEl = document.getElementById("repairHistorySummary");
 const taskPlanSection = document.getElementById("taskPlanSection");
 const taskPlanProgressFill = document.getElementById("taskPlanProgressFill");
 const taskPlanSummary = document.getElementById("taskPlanSummary");
 const subtaskListEl = document.getElementById("subtaskList");
 const currentSubtaskLabel = document.getElementById("currentSubtaskLabel");
 const estimatedCompletionLabel = document.getElementById("estimatedCompletionLabel");
 const debugDisclosure = document.getElementById("debugDisclosure");
 const filePreviewPanel = document.getElementById("filePreviewPanel");
+const workflowSummarySection = document.getElementById("workflowSummary");
+const workflowPhaseLabel = document.getElementById("workflowPhaseLabel");
+const workflowSummaryTimestamp = document.getElementById("workflowSummaryTimestamp");
+const workflowHumanSummary = document.getElementById("workflowHumanSummary");
+const workflowCurrentGate = document.getElementById("workflowCurrentGate");
+const workflowCurrentTask = document.getElementById("workflowCurrentTask");
+const workflowNextTask = document.getElementById("workflowNextTask");
+const workflowNextActionLabel = document.getElementById("workflowNextAction");
+const workflowNextActionReason = document.getElementById("workflowNextActionReason");
+const workflowNextActionCommand = document.getElementById("workflowNextActionCommand");
+const workflowPendingTasksList = document.getElementById("workflowPendingTasks");
+const workflowRepoStatusList = document.getElementById("workflowRepoStatus");
 
 const mainContainer = document.querySelector("main");
 let orchestrationSection = null;
 let pauseSessionButton = null;
 let resumeDrawer = null;
 let resumeFormEl = null;
 let resumeQuestionsEl = null;
 let resumeMessageEl = null;
 
 let activeSessionId = null;
 let orchestrationQuestions = [];
 
 let currentProjectSlug = null;
 let pendingQuestions = [];
 let storedPrompt = "";
 let storedProjectName = "";
 let repairHistoryExpanded = false;
 // legacy loading state removed
 
 // Progress streaming controls
 let progressStopFlag = false;
 let progressEventSource = null;
 let progressFillEl = null;
 
 const DEFAULT_APP_PORT = "3000";
@@ -60,58 +72,159 @@ function clone(value) {
 
 function escapeHtml(value) {
   return String(value)
     .replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;")
     .replace(/'/g, "&#39;");
 }
 
 function hideDebugDisclosure() {
   if (debugDisclosure) {
     debugDisclosure.classList.add("hidden");
     debugDisclosure.removeAttribute("open");
   }
 }
 
 function revealDebugDisclosure() {
   if (debugDisclosure) {
     debugDisclosure.classList.remove("hidden");
   }
 }
 
 hideDebugDisclosure();
 
+function resetWorkflowSummary() {
+  if (!workflowSummarySection) return;
+  workflowSummarySection.classList.add("hidden");
+  if (workflowPhaseLabel) workflowPhaseLabel.textContent = "Workflow Status";
+  if (workflowSummaryTimestamp) workflowSummaryTimestamp.textContent = "";
+  if (workflowHumanSummary) workflowHumanSummary.textContent = "";
+  if (workflowCurrentGate) workflowCurrentGate.textContent = "—";
+  if (workflowCurrentTask) workflowCurrentTask.textContent = "Current task pending";
+  if (workflowNextTask) workflowNextTask.textContent = "Next task pending";
+  if (workflowNextActionLabel) workflowNextActionLabel.textContent = "—";
+  if (workflowNextActionReason) workflowNextActionReason.textContent = "";
+  if (workflowNextActionCommand) {
+    workflowNextActionCommand.textContent = "";
+    workflowNextActionCommand.classList.add("hidden");
+  }
+  if (workflowPendingTasksList) workflowPendingTasksList.innerHTML = "";
+  if (workflowRepoStatusList) workflowRepoStatusList.innerHTML = "";
+}
+
+function updateWorkflowSummary(metadata) {
+  if (!workflowSummarySection) return;
+  if (!metadata) {
+    resetWorkflowSummary();
+    return;
+  }
+
+  workflowSummarySection.classList.remove("hidden");
+  if (workflowPhaseLabel) {
+    workflowPhaseLabel.textContent = `Phase ${metadata.phase.id} — ${metadata.phase.name}`;
+  }
+  if (workflowSummaryTimestamp) {
+    const computed = new Date(metadata.computedAt);
+    workflowSummaryTimestamp.textContent = Number.isNaN(computed.getTime())
+      ? ""
+      : `Updated ${computed.toLocaleString()}`;
+  }
+  if (workflowHumanSummary) workflowHumanSummary.textContent = metadata.humanSummary;
+  if (workflowCurrentGate) {
+    workflowCurrentGate.textContent = metadata.currentGate
+      ? `${metadata.currentGate.id} — ${metadata.currentGate.status}`
+      : "All gates passed";
+  }
+  if (workflowCurrentTask) {
+    workflowCurrentTask.textContent = metadata.currentTask
+      ? `Current: ${metadata.currentTask.id} — ${metadata.currentTask.title}`
+      : "No active task";
+  }
+  if (workflowNextTask) {
+    workflowNextTask.textContent = metadata.nextTask
+      ? `Next: ${metadata.nextTask.id} — ${metadata.nextTask.title}`
+      : "Next task queued";
+  }
+  if (workflowNextActionLabel) workflowNextActionLabel.textContent = metadata.suggestedNextAction.action;
+  if (workflowNextActionReason) workflowNextActionReason.textContent = metadata.suggestedNextAction.reasoning;
+  if (workflowNextActionCommand) {
+    if (metadata.suggestedNextAction.command) {
+      workflowNextActionCommand.textContent = metadata.suggestedNextAction.command;
+      workflowNextActionCommand.classList.remove("hidden");
+    } else {
+      workflowNextActionCommand.textContent = "";
+      workflowNextActionCommand.classList.add("hidden");
+    }
+  }
+
+  if (workflowPendingTasksList) {
+    workflowPendingTasksList.innerHTML = "";
+    if (metadata.pendingTasks.length === 0) {
+      const li = document.createElement("li");
+      li.textContent = "No pending tasks";
+      workflowPendingTasksList.appendChild(li);
+    } else {
+      for (const task of metadata.pendingTasks) {
+        const li = document.createElement("li");
+        const status = task.status ? ` — ${task.status}` : "";
+        li.textContent = `${task.id}: ${task.title}${status}`;
+        workflowPendingTasksList.appendChild(li);
+      }
+    }
+  }
+
+  if (workflowRepoStatusList) {
+    workflowRepoStatusList.innerHTML = "";
+    const uncommittedCount = metadata.uncommittedChanges.length;
+    const uncommittedItem = document.createElement("li");
+    uncommittedItem.textContent =
+      uncommittedCount === 0
+        ? "Working tree clean"
+        : `${uncommittedCount} uncommitted change${uncommittedCount === 1 ? "" : "s"}`;
+    workflowRepoStatusList.appendChild(uncommittedItem);
+
+    const validationsItem = document.createElement("li");
+    if (metadata.validations) {
+      validationsItem.textContent = `Validations: lint=${metadata.validations.lint}, type=${metadata.validations.typecheck}, test=${metadata.validations.test}, contract=${metadata.validations.contract_check}`;
+    } else {
+      validationsItem.textContent = "Validations: not run";
+    }
+    workflowRepoStatusList.appendChild(validationsItem);
+  }
+}
+
 function resetOrchestrationControls() {
   orchestrationQuestions = [];
   activeSessionId = null;
   if (pauseSessionButton) {
     pauseSessionButton.disabled = true;
   }
   hideResumeDrawer();
   orchestrationSection?.classList.add("hidden");
+  resetWorkflowSummary();
 }
 
 function hideResumeDrawer() {
   if (resumeDrawer) {
     resumeDrawer.classList.add("hidden");
   }
   if (resumeQuestionsEl) {
     resumeQuestionsEl.innerHTML = "";
   }
   if (resumeMessageEl) {
     resumeMessageEl.textContent = "Session paused. Provide answers to resume.";
     resumeMessageEl.classList.remove("error");
   }
   orchestrationQuestions = [];
 }
 
 function renderResumeQuestions(questions) {
   if (!resumeQuestionsEl) return;
   resumeQuestionsEl.innerHTML = "";
   orchestrationQuestions = Array.isArray(questions) ? questions : [];
 
   for (const question of orchestrationQuestions) {
     const wrapper = document.createElement("div");
     wrapper.className = "resume-question";
 
@@ -251,50 +364,51 @@ async function handleResumeSubmit(event) {
   } catch (err) {
     if (resumeMessageEl) {
       resumeMessageEl.textContent = `Resume failed: ${err?.error || err?.message || err}`;
       resumeMessageEl.classList.add("error");
     }
   }
 }
 
 // Treat 202 Accepted (paused) as a first-class state instead of an error
 async function handlePausedResponse(sessionId) {
   try {
     // Fetch latest snapshot so UI can reflect paused state immediately
     const snapshotResp = await fetch(`/api/progress/snapshot/${sessionId}`);
     if (snapshotResp.ok) {
       const snapshot = await snapshotResp.json();
       updateOrchestrationState(snapshot);
       return true;
     }
   } catch (err) {
     console.warn("Failed to fetch snapshot after 202 paused:", err);
   }
   return false;
 }
 
 function updateOrchestrationState(snapshot) {
+  updateWorkflowSummary(snapshot?.workflowMetadata ?? null);
   if (!snapshot || !orchestrationSection) return;
   orchestrationSection.classList.remove("hidden");
 
   if (snapshot.paused) {
     pauseSessionButton && (pauseSessionButton.disabled = true);
     showResumeDrawer(snapshot.questions || []);
     // Stop progress streams while paused to avoid noisy 304 polling
     try { progressStopFlag = true; } catch { /* noop */ }
     try { progressEventSource?.close?.(); } catch { /* noop */ }
     return;
   }
 
   if (snapshot.questions && snapshot.questions.length > 0) {
     showResumeDrawer(snapshot.questions);
   } else {
     hideResumeDrawer();
   }
 
   if (pauseSessionButton) {
     pauseSessionButton.disabled = !activeSessionId || Boolean(snapshot.done);
   }
   if (snapshot.done) {
     activeSessionId = null;
     orchestrationSection?.classList.add("hidden");
   }
diff --git a/public/styles.css b/public/styles.css
index b9b4faa148e2e54b5f15a6e1d05ccd9c3ecf1d2e..54db3353038122c842c3f8a489df69ddd55fb0be 100644
--- a/public/styles.css
+++ b/public/styles.css
@@ -1,39 +1,53 @@
 * { box-sizing: border-box; }
 body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; margin: 0; background: #0b0f19; color: #e6e9ef; }
 .container { max-width: 820px; margin: 40px auto; padding: 24px; background: #111827; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
 /* Accessibility: ensure sufficient contrast for links on dark container */
 .container a { color: #60a5fa; text-decoration: underline; }
 .container a:hover { color: #93c5fd; }
 .container a:focus-visible { outline: 2px solid #f59e0b; outline-offset: 3px; border-radius: 4px; }
 h1 { margin-top: 0; font-size: 28px; }
 .subtle { color: #9aa4b2; }
 label { display:block; margin: 16px 0 8px; color:#cbd5e1; }
 input, textarea { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color:#e6e9ef; outline: none; }
 input:focus, textarea:focus { border-color: #64748b; }
 button { margin-top: 16px; padding: 12px 16px; border: none; border-radius: 12px; background: #4f46e5; color: white; font-weight: 600; cursor: pointer; }
 button:hover { filter: brightness(1.05); }
+.workflow-summary { margin-top: 24px; padding: 18px; border: 1px solid #334155; border-radius: 12px; background: rgba(15, 23, 42, 0.7); display: grid; gap: 16px; }
+.workflow-summary__header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
+.workflow-summary__timestamp { font-size: 0.85rem; color: #94a3b8; }
+.workflow-summary__human { margin: 0; font-size: 0.95rem; color: #cbd5e1; }
+.workflow-summary__grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
+.workflow-summary__card { border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; padding: 12px; background: rgba(15, 23, 42, 0.85); display: grid; gap: 8px; }
+.workflow-summary__card h3 { margin: 0; font-size: 1rem; color: #f1f5f9; }
+.workflow-summary__value { margin: 0; font-weight: 600; color: #f8fafc; }
+.workflow-summary__muted { margin: 0; font-size: 0.85rem; color: #94a3b8; }
+.workflow-summary__list { list-style: disc; padding-left: 18px; margin: 0; display: grid; gap: 6px; font-size: 0.9rem; color: #cbd5e1; }
+.workflow-summary__list li { line-height: 1.35; }
+.workflow-summary__code { display: inline-block; margin-top: 4px; padding: 4px 6px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.8rem; color: #e2e8f0; word-break: break-all; }
+.workflow-summary__card .hidden { display: none; }
+@media (max-width: 640px) { .workflow-summary__grid { grid-template-columns: 1fr; } }
 .result { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 12px; margin-top: 16px; overflow: auto; max-height: 420px; }
 code { background: #0f172a; padding: 2px 6px; border-radius: 6px; border:1px solid #334155; }
 .hidden { display: none; }
 
 /* Debug disclosure container */
 #debugDisclosure {
   margin-top: 2rem;
   border: 1px solid rgba(148, 163, 184, 0.15);
   border-radius: 12px;
   background: rgba(15, 23, 42, 0.35);
   overflow: hidden;
 }
 
 #debugDisclosure summary {
   list-style: none;
   padding: 1rem 1.25rem;
   font-size: 0.875rem;
   color: #94a3b8;
   cursor: pointer;
   user-select: none;
   display: flex;
   align-items: center;
   gap: 0.5rem;
   transition: color 0.2s ease;
 }
diff --git a/src/server.ts b/src/server.ts
index 850a882bc9868844ba6cdb9888820cc676020157..34ce741525620a85a990945a2a95a4293654aba2 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -1,35 +1,36 @@
 import "dotenv/config";
 import express from "express";
 import type { Request, Response } from "express";
 import cors from "cors";
 import morgan from "morgan";
 import path from "node:path";
 import fs from "node:fs/promises";
 import { createHash, randomUUID } from "node:crypto";
-import { spawn } from "node:child_process";
+import { spawn, execFile } from "node:child_process";
 import { finished } from "node:stream/promises";
+import { promisify } from "node:util";
 import slugify from "slugify";
 import { ZipFile } from "yazl";
 
 import { generateJSON } from "./llm/index.js";
 import { withTraceContext } from "./llm/trace.js";
 import { validateExecutorOutput } from "./executor/schema.js";
 import { sanitizeExecutorOutput } from "./executor/outputProcessing.js";
 import { seedTestsInFiles, seedTestsOnDisk, normalizeSeededTestsOnDisk } from "./utils/seedTests.js";
 import { ensureJsonHealthOnDisk } from "./utils/normalizeHealth.js";
 import { writeFiles } from "./executor/writeFiles.js";
 import { ensureDefaultExportForApp } from "./utils/normalizeExports.js";
 import { runInSandbox } from "./runner/runInSandbox.js";
 import { multiTurnRepair } from "./repair/multiTurnRepair.js";
 // import { validateScaffoldOnDisk } from "./validation/validateScaffold.js";
 import { fileSha256 } from "./utils/checksum.js";
 import { logEvent } from "./telemetry/events.js";
 import type { ExecutorOutput, ExecutorFile } from "./executor/types.js";
 import type { RunResult } from "./contracts/validators.js";
 import type { FailureCategory, RepairHistory, TestResultSummary } from "./contracts/repairHistoryValidator.js";
 import { detectMissing } from "./clarification/detectMissing.js";
 import { generateQuestions } from "./clarification/generateQuestions.js";
 import { augmentPrompt } from "./clarification/augmentPrompt.js";
 import {
   validateClarificationRequest,
   validateClarificationResponse
@@ -59,129 +60,178 @@ import {
   type CheckpointPayload,
   type PendingQuestion
 } from "./orchestrator/checkpoints.js";
 import { raiseInterrupt, type InterruptQuestionInput } from "./orchestrator/interrupts.js";
 import { OrchestratorStateMachine, type OrchestratorState } from "./orchestrator/stateMachine.js";
 import {
   resumeFromCheckpoint,
   ResumeValidationError,
   ResumeStateError,
   type ResumeAnswer
 } from "./orchestrator/resume.js";
 import { captureManifest, getManifest } from "./orchestrator/workspaceManifest.js";
 import { buildResumePrompts } from "./orchestrator/resumePrompt.js";
 import { StepQueue, type StepDescriptor, type StepHandler } from "./orchestrator/stepQueue.js";
 import type {
   ExecutorSuccessResponse,
   PlanExecutionJobResult,
   PlanExecutionOptions,
   ResumeContextFixture,
   SingleExecutionOptions,
   SingleExecutionResult
 } from "./orchestrator/executionTypes.js";
 import { installProblemDetails, respondWithProblem } from "./middleware/problemDetails.js";
 import { getExecution } from "./orchestrator/executionsStore.js";
 import { maybeInitTelemetry, shutdownTelemetry } from "./telemetry/otel.js";
+import { loadPhaseState, buildWorkflowMetadata, type WorkflowMetadata } from "./state/phaseState.js";
+
+const execFileAsync = promisify(execFile);
 
 const IS_TEST_ENV = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
 
 // Test-only: Mitigate ENOTEMPTY when test files recursively delete
 // `.automation/checkpoints` concurrently with other test writes.
 if (IS_TEST_ENV) {
   const originalRm = fs.rm.bind(fs);
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   (fs as unknown as { rm: typeof fs.rm }).rm = (async (target: any, options?: any) => {
     try {
       // Prefer the fastest path
       return await originalRm(target, options);
     } catch (error) {
       const code = (error as { code?: string } | null)?.code;
       const asString = typeof target === "string" ? target : "";
       if (code === "ENOTEMPTY" && asString.includes(`${path.sep}.automation${path.sep}checkpoints`)) {
         // Treat as success in tests to deflake teardown races
         return;
       }
       throw error;
     }
   }) as typeof fs.rm;
 }
 
 const app = express();
 
 // Initialize optional telemetry and error envelopes without changing defaults
 maybeInitTelemetry();
 installProblemDetails(app);
 app.use(cors());
 app.use(express.json({ limit: "2mb" }));
 app.use(morgan("dev"));
 
 const PORT = Number(process.env.PORT || 3000);
 const OUTPUT_DIR = path.resolve("output");
 const PUBLIC_DIR = path.resolve("public");
 // In-memory progress sessions for SSE/polling
+type WorkflowCacheEntry = WorkflowMetadata;
+
 type ProgressSnapshot = {
   stage: string;
   progress: number;
   data?: Record<string, unknown>;
   updatedAt: number;
   done?: boolean;
   state?: OrchestratorState;
   paused?: boolean;
   questions?: PendingQuestion[];
   checkpointUpdatedAt?: string;
+  workflowMetadata?: WorkflowMetadata;
 };
 
 interface OrchestrationSession {
   machine: OrchestratorStateMachine;
   paused: boolean;
   questions: PendingQuestion[];
   checkpointUpdatedAt?: string;
   projectSlug?: string;
   originalPrompt?: string;
   effectivePrompt?: string;
   projectName?: string;
 }
 
 const progressSessions = new Map<string, ProgressSnapshot>();
 const orchestrationSessions = new Map<string, OrchestrationSession>();
 const PROGRESS_SESSION_TTL_MS = Number(process.env.PROGRESS_SESSION_TTL_MS ?? 15 * 60 * 1000);
+const workflowMetadataCache = new Map<string, WorkflowCacheEntry>();
+
+async function ensureWorkflowMetadataForSession(sessionId: string): Promise<WorkflowCacheEntry> {
+  const existing = workflowMetadataCache.get(sessionId);
+  if (existing) {
+    return existing;
+  }
+
+  const phaseState = await loadPhaseState();
+  const uncommittedChanges: string[] = await readUncommittedChanges();
+  const metadata = buildWorkflowMetadata(phaseState, {
+    validations: null,
+    uncommittedChanges,
+    computedAt: Date.now()
+  });
+  workflowMetadataCache.set(sessionId, metadata);
+  return metadata;
+}
+
+function getWorkflowMetadata(sessionId: string): WorkflowCacheEntry | null {
+  return workflowMetadataCache.get(sessionId) ?? null;
+}
+
+function clearWorkflowMetadata(sessionId: string): void {
+  workflowMetadataCache.delete(sessionId);
+}
+
+async function readUncommittedChanges(): Promise<string[]> {
+  try {
+    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
+      cwd: process.cwd(),
+      encoding: "utf-8",
+      maxBuffer: 1024 * 1024
+    });
+    return stdout
+      .split("\n")
+      .map(line => line.trim())
+      .filter(line => line.length > 0);
+  } catch {
+    return [];
+  }
+}
 
 function ensureOrchestrationSession(sessionId: string): OrchestrationSession {
   let session = orchestrationSessions.get(sessionId);
   if (!session) {
     session = { machine: new OrchestratorStateMachine(), paused: false, questions: [] };
     orchestrationSessions.set(sessionId, session);
   }
   return session;
 }
 
 function getOrchestrationSession(sessionId: string): OrchestrationSession | undefined {
   return orchestrationSessions.get(sessionId);
 }
 
 function removeOrchestrationSession(sessionId: string): void {
   orchestrationSessions.delete(sessionId);
+  clearWorkflowMetadata(sessionId);
 }
 
 function mapStageToState(stage: string, done?: boolean): OrchestratorState | null {
   if (done) {
     return "DONE";
   }
   switch (stage) {
     case "analyzing":
       return "CLARIFYING";
     case "planning":
       return "PLANNING";
     case "generating":
     case "testing":
       return "GENERATING";
     case "finalizing":
       return "GENERATING";
     default:
       return null;
   }
 }
 
 function stateToStage(state: OrchestratorState): string {
   switch (state) {
     case "CLARIFYING":
       return "analyzing";
@@ -206,79 +256,83 @@ function purgeExpiredProgressSessions(now: number) {
     }
   }
 }
 
 function setProgress(sessionId: string | undefined, stage: string, progress: number, data?: Record<string, unknown>, done?: boolean) {
   if (!sessionId) return;
   purgeExpiredProgressSessions(Date.now());
   const session = ensureOrchestrationSession(sessionId);
 
   if (!session.paused) {
     const target = mapStageToState(stage, done);
     if (target && target !== session.machine.state && target !== "PAUSED") {
       try {
         session.machine.transition(target, { reason: `progress:${stage}` });
       } catch (err) {
         console.warn(`Failed to transition orchestrator for ${sessionId}:`, err);
       }
     }
     if (done) {
       session.paused = false;
       session.questions = [];
       removeOrchestrationSession(sessionId);
     }
   }
 
+  const workflowMetadata = getWorkflowMetadata(sessionId);
   progressSessions.set(sessionId, {
     stage,
     progress,
     data,
     updatedAt: Date.now(),
     done,
     state: session.machine.state,
     paused: session.paused,
     questions: session.questions,
-    checkpointUpdatedAt: session.checkpointUpdatedAt
+    checkpointUpdatedAt: session.checkpointUpdatedAt,
+    ...(workflowMetadata ? { workflowMetadata } : {})
   });
 }
 
 function getProgress(sessionId: string): ProgressSnapshot | null {
   const snap = progressSessions.get(sessionId) ?? null;
   if (!snap) {
     const session = orchestrationSessions.get(sessionId);
     if (!session) {
       return null;
     }
+    const workflowMetadata = getWorkflowMetadata(sessionId);
     return {
       stage: stateToStage(session.machine.state),
       progress: 0,
       updatedAt: Date.now(),
       done: false,
       state: session.machine.state,
       paused: session.paused,
       questions: session.questions,
-      checkpointUpdatedAt: session.checkpointUpdatedAt
+      checkpointUpdatedAt: session.checkpointUpdatedAt,
+      ...(workflowMetadata ? { workflowMetadata } : {})
     };
   }
   return snap;
 }
 
 function isPlainObject(value: unknown): value is Record<string, unknown> {
   return typeof value === "object" && value !== null && !Array.isArray(value);
 }
 
 function normalizeInterruptQuestions(input: unknown): InterruptQuestionInput[] {
   if (!Array.isArray(input)) {
     return [];
   }
 
   const supportedTypes = new Set(["AMBIGUITY", "APPROVAL", "BUDGET_RISK"]);
   const questions: InterruptQuestionInput[] = [];
 
   for (const entry of input) {
     if (!isPlainObject(entry)) continue;
     const questionRaw = typeof entry.question === "string" ? entry.question.trim() : "";
     if (!questionRaw) continue;
 
     const typeRaw = typeof entry.type === "string" ? entry.type.trim().toUpperCase() : "";
     const type = supportedTypes.has(typeRaw) ? (typeRaw as InterruptQuestionInput["type"]) : "AMBIGUITY";
     const id = typeof entry.id === "string" ? entry.id.trim() || undefined : undefined;
@@ -291,60 +345,62 @@ function normalizeInterruptQuestions(input: unknown): InterruptQuestionInput[] {
       ...(metadata ? { metadata } : {})
     });
   }
 
   return questions;
 }
 
 function normalizeResumeAnswers(input: unknown): ResumeAnswer[] {
   if (!Array.isArray(input)) {
     return [];
   }
   const answers: ResumeAnswer[] = [];
   for (const entry of input) {
     if (!isPlainObject(entry)) continue;
     const questionId = typeof entry.questionId === "string" ? entry.questionId.trim() : "";
     const value = (entry as Record<string, unknown>).value;
     answers.push({ questionId, value });
   }
   return answers;
 }
 
 function snapshotFromSession(sessionId: string, fallback?: ProgressSnapshot | null): ProgressSnapshot {
   const session = ensureOrchestrationSession(sessionId);
   const existing = fallback ?? progressSessions.get(sessionId) ?? null;
   const baseStage = existing?.stage ?? stateToStage(session.machine.state);
+  const workflowMetadata = getWorkflowMetadata(sessionId);
   return {
     stage: baseStage,
     progress: existing?.progress ?? 0,
     data: existing?.data,
     updatedAt: Date.now(),
     done: existing?.done ?? false,
     state: session.machine.state,
     paused: session.paused,
     questions: session.questions,
-    checkpointUpdatedAt: session.checkpointUpdatedAt
+    checkpointUpdatedAt: session.checkpointUpdatedAt,
+    ...(workflowMetadata ? { workflowMetadata } : {})
   };
 }
 
 function openProgressStream(req: Request, res: Response, sessionId: string): void {
   res.setHeader("Content-Type", "text/event-stream");
   res.setHeader("Cache-Control", "no-cache");
   res.setHeader("Connection", "keep-alive");
   res.flushHeaders?.();
 
   const send = () => {
     const snap = getProgress(sessionId);
     if (snap) {
       res.write(`event: progress\n`);
       res.write(`data: ${JSON.stringify(snap)}\n\n`);
       if (snap.done) {
         clearInterval(timer);
         res.end();
       }
     }
   };
 
   const timer = setInterval(send, 1000);
   send();
 
   const close = () => {
@@ -1531,50 +1587,56 @@ app.post("/api/clarify", (req, res) => {
     respondWithProblem(res, 500, "InternalServerError", message, req.originalUrl || req.url || "/api/clarify");
     return;
   }
 });
 
 app.post("/api/execute", async (req, res) => {
   const instance = req.originalUrl || req.url || "/api/execute";
   // Feature-flagged orchestrator adapter: if AGENTS_RUNTIME=langgraph, delegate and return
   if ((process.env.AGENTS_RUNTIME || "").toLowerCase() === "langgraph") {
     try {
       await executeAdapterLanggraph(req, res);
     } catch (err) {
       const message = err instanceof Error ? err.message : "internal error";
       respondWithProblem(res, 500, "InternalServerError", message, instance);
       return;
     }
     return; // do not continue into default StepQueue pipeline
   }
   const providedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
   const sessionId = providedSessionId || randomUUID();
   const wantsSse = typeof req.headers.accept === "string" && req.headers.accept.includes("text/event-stream");
   let sseStarted = false;
 
   res.setHeader("x-executor-session", sessionId);
 
+  try {
+    await ensureWorkflowMetadataForSession(sessionId);
+  } catch (error) {
+    console.warn(`[Workflow] Failed to initialize context for session ${sessionId}:`, error);
+  }
+
   // Best-effort: ensure checkpoint root exists to avoid rare ENOENT under concurrency in tests
   try {
     await fs.mkdir(path.resolve(".automation", "checkpoints", "step-workflows"), { recursive: true });
   } catch {
     // ignore
   }
 
   const ensureSse = () => {
     if (!wantsSse || sseStarted) {
       return;
     }
     sseStarted = true;
     res.status(202);
     res.setHeader("Content-Type", "text/event-stream");
     res.setHeader("Cache-Control", "no-cache");
     res.setHeader("Connection", "keep-alive");
     res.flushHeaders?.();
   };
 
   const sendSse = (event: string, data: unknown) => {
     if (!wantsSse) {
       return;
     }
     ensureSse();
     res.write(`event: ${event}\n`);
@@ -1892,50 +1954,56 @@ app.post("/api/plan/:project/retest-subtask", async (req, res) => {
   } catch (err) {
     const message = (err as Error).message || 'internal error';
     return res.status(500).json({ error: message });
   }
 });
 
 // Pause/resume session orchestration
 app.post("/api/sessions/:id/pause", async (req, res) => {
   try {
     const { id } = req.params as { id: string };
     const sessionId = id.trim();
     if (!sessionId) {
       return res.status(400).json({ error: "session id required" });
     }
 
     const current = getProgress(sessionId);
     if (!current) {
       return res.status(404).json({ error: "session not found" });
     }
 
     const session = ensureOrchestrationSession(sessionId);
     if (session.paused) {
       return res.status(409).json({ error: "session already paused" });
     }
 
+    try {
+      await ensureWorkflowMetadataForSession(sessionId);
+    } catch (error) {
+      console.warn(`[Workflow] Failed to refresh context before pausing ${sessionId}:`, error);
+    }
+
     const reasonRaw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
     const reason = reasonRaw || "Manual pause requested";
 
     const normalizedQuestions = normalizeInterruptQuestions(req.body?.questions);
     const defaultQuestion: InterruptQuestionInput = {
       question: "Please provide guidance to continue execution.",
       type: "AMBIGUITY"
     };
     const questions: InterruptQuestionInput[] = normalizedQuestions.length > 0
       ? normalizedQuestions
       : [defaultQuestion];
 
     let machineContext: Record<string, unknown> | undefined;
     if (req.body?.context !== undefined) {
       if (req.body.context === null || isPlainObject(req.body.context)) {
         machineContext = req.body.context ?? undefined;
       } else {
         return res.status(400).json({ error: "context must be a plain object" });
       }
     }
 
     let checkpointPayload: Omit<CheckpointPayload, "pendingQuestions"> | undefined;
     if (req.body?.payload !== undefined) {
       if (!isPlainObject(req.body.payload)) {
         return res.status(400).json({ error: "payload must be a plain object" });
@@ -1990,50 +2058,56 @@ app.post("/api/sessions/:id/pause", async (req, res) => {
     return res.status(201).json({ checkpoint });
   } catch (error) {
     if (error instanceof Error && /Cannot raise interrupt/.test(error.message)) {
       return res.status(409).json({ error: error.message });
     }
     if (error instanceof Error) {
       return res.status(400).json({ error: error.message });
     }
     return res.status(500).json({ error: "unknown error" });
   }
 });
 
 app.post("/api/sessions/:id/resume", async (req, res) => {
   try {
     const { id } = req.params as { id: string };
     const sessionId = id.trim();
     if (!sessionId) {
       return res.status(400).json({ error: "session id required" });
     }
 
     const session = getOrchestrationSession(sessionId);
     if (!session) {
       return res.status(404).json({ error: "session not found" });
     }
 
+    try {
+      await ensureWorkflowMetadataForSession(sessionId);
+    } catch (error) {
+      console.warn(`[Workflow] Failed to refresh context before resuming ${sessionId}:`, error);
+    }
+
     const answers = normalizeResumeAnswers(req.body?.answers);
     const reasonRaw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
     const adjustmentRaw = typeof req.body?.adjustment === "string" ? req.body.adjustment.trim() : "";
 
     const result = await resumeFromCheckpoint(sessionId, answers, {
       machine: session.machine,
       reason: reasonRaw || undefined
     });
 
     session.paused = false;
     session.questions = [];
     session.checkpointUpdatedAt = result.checkpoint.updatedAt;
     session.machine = result.machine;
     const resumedSlug = result.checkpoint.payload?.executor?.projectSlug;
     if (typeof resumedSlug === "string" && resumedSlug.trim()) {
       session.projectSlug = resumedSlug.trim();
     }
 
     const fallbackSlug = slugify(sessionId, { lower: true, strict: true }) || sessionId;
     const projectSlug = (session.projectSlug ?? resumedSlug ?? fallbackSlug).trim();
     session.projectSlug = projectSlug;
 
     const manifest = await getManifest(sessionId);
     const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
     const promptSnapshot = await resolveSessionPrompts(sessionId, session, projectSlug);
@@ -2262,37 +2336,46 @@ if (process.env.NODE_ENV !== "test") {
     console.log(`Executor MVP listening on http://localhost:${PORT}`);
     console.log(`UI: http://localhost:${PORT}/`);
   });
 
   // Graceful shutdown handler for OpenTelemetry
   const shutdown = async (signal: string) => {
     console.log(`\n${signal} received, shutting down gracefully...`);
     server.close(() => {
       console.log('HTTP server closed');
     });
     await shutdownTelemetry();
     process.exit(0);
   };
 
   process.on('SIGTERM', () => shutdown('SIGTERM'));
   process.on('SIGINT', () => shutdown('SIGINT'));
 }
 
 export { app };
 // Test helpers for progress TTL logic
 export const __progressTest = {
   set(sessionId: string, entry: ProgressSnapshot) { progressSessions.set(sessionId, entry); },
   get(sessionId: string) { return progressSessions.get(sessionId) ?? null; },
   purge(now: number) { purgeExpiredProgressSessions(now); },
   ttl() { return PROGRESS_SESSION_TTL_MS; },
-  clear() { progressSessions.clear(); }
+  async ensureMetadata(sessionId: string) {
+    return ensureWorkflowMetadataForSession(sessionId);
+  },
+  snapshot(sessionId: string, fallback?: ProgressSnapshot | null) {
+    return snapshotFromSession(sessionId, fallback);
+  },
+  clear() {
+    progressSessions.clear();
+    workflowMetadataCache.clear();
+  }
 };
 
 export const __orchestratorTest = {
   ensure(sessionId: string) {
     return ensureOrchestrationSession(sessionId).machine;
   },
   clear() {
     orchestrationSessions.clear();
   }
 };
 import { validateFilesNonEmpty } from "./utils/validateFiles.js";
diff --git a/src/state/phaseState.ts b/src/state/phaseState.ts
index 351d5cabb54c887c376e843f604b543639a78d1e..5e1c1032d89bba9c41796aebcdbe87303a5a766b 100644
--- a/src/state/phaseState.ts
+++ b/src/state/phaseState.ts
@@ -23,50 +23,75 @@ export interface PhaseState {
   contractPath: string | null;
   ledgerPath: string | null;
   gates: Record<string, GateStatus>;
   tasks: PhaseTask[];
 }
 
 export interface ValidationSnapshot {
   last_run: string | null;
   lint: "pass" | "fail" | "skipped";
   typecheck: "pass" | "fail" | "skipped";
   test: "pass" | "fail" | "skipped";
   contract_check: "pass" | "fail" | "skipped";
 }
 
 export interface NextAction {
   action:
     | "COMMIT_PENDING_TESTS"
     | "COMMIT_PENDING_CHANGES"
     | "FIX_VALIDATION_ERRORS"
     | "ADVANCE_ORCHESTRATOR_PILOT"
     | "NO_ACTION";
   reasoning: string;
   command: string | null;
 }
 
+export interface CurrentGateSummary {
+  id: string;
+  status: GateStatus;
+}
+
+export interface WorkflowMetadata {
+  phase: {
+    id: string;
+    name: string;
+    contractPath: string | null;
+    ledgerPath: string | null;
+  };
+  gates: Record<string, GateStatus>;
+  currentGate: CurrentGateSummary | null;
+  tasks: PhaseTask[];
+  currentTask: PhaseTask | null;
+  nextTask: PhaseTask | null;
+  pendingTasks: PhaseTask[];
+  suggestedNextAction: NextAction;
+  humanSummary: string;
+  validations: ValidationSnapshot | null;
+  uncommittedChanges: string[];
+  computedAt: string;
+}
+
 export function normalizeGateStatus(input?: string): GateStatus {
   const s = (input || "").toUpperCase();
   if (s.includes("PASSED") || s.includes("✅")) return "passed";
   if (s.includes("PARTIAL") || s.includes("🟡")) return "partial";
   if (s.includes("FAILED") || s.includes("❌")) return "failed";
   if (s.includes("NOT STARTED") || s.includes("⏳")) return "not_started";
   return "unknown";
 }
 
 export function parseGatesLedger(markdown: string): Record<string, GateStatus> {
   const summary: Record<string, GateStatus> = {};
   if (!markdown || !markdown.trim()) return summary;
   const blocks = markdown.split(/\n(?=##\s+Gate\s+)/);
   for (const block of blocks) {
     const gateMatch = block.match(/##\s+Gate\s+(G\d+)/i);
     if (!gateMatch || !gateMatch[1]) continue;
     const statusMatch = block.match(/\*\*Status:\*\*\s*([^\n]+)/i);
     const status = normalizeGateStatus(statusMatch ? statusMatch[1] : undefined);
     const gateId = gateMatch[1] as string;
     summary[gateId] = status;
   }
   return summary;
 }
 
 async function readIfExists(file: string): Promise<string | null> {
@@ -134,69 +159,158 @@ export async function loadPhaseState(options: { rootDir?: string } = {}): Promis
 }
 
 export function determineCurrentTask(state: PhaseState): PhaseTask | null {
   for (const t of state.tasks) {
     if (t.status !== "complete") return t;
   }
   return null;
 }
 
 export function determineNextTask(state: PhaseState): PhaseTask | null {
   const current = determineCurrentTask(state);
   if (!current) return null;
   const idx = state.tasks.findIndex(t => t.id === current.id);
   if (idx >= 0 && idx + 1 < state.tasks.length) {
     const candidate = state.tasks[idx + 1];
     return candidate ?? null;
   }
   return null;
 }
 
 export function canAdvanceToNextTask(state: PhaseState): boolean {
   // Simple rule: cannot advance while there is a non-complete current task
   return determineCurrentTask(state) === null;
 }
 
+function cloneTask(task: PhaseTask): PhaseTask {
+  const copy: PhaseTask = { ...task };
+  if (task.validation_results) {
+    copy.validation_results = task.validation_results.map(result => ({ ...result }));
+  }
+  return copy;
+}
+
+export function determineCurrentGate(gates: Record<string, GateStatus>): CurrentGateSummary | null {
+  const entries = Object.entries(gates ?? {});
+  if (entries.length === 0) {
+    return null;
+  }
+
+  const sorted = entries.sort((a, b) => {
+    const numA = Number.parseInt(a[0].replace(/\D+/g, ""), 10);
+    const numB = Number.parseInt(b[0].replace(/\D+/g, ""), 10);
+    if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
+      return numA - numB;
+    }
+    return a[0].localeCompare(b[0]);
+  });
+
+  const active = sorted.find(([, status]) => status !== "passed");
+  const target = active ?? sorted[sorted.length - 1];
+  if (!target) {
+    return null;
+  }
+  return { id: target[0], status: target[1] };
+}
+
 export function suggestNextAction(
   state: PhaseState,
   options: { uncommittedChanges?: string[]; validations?: ValidationSnapshot }
 ): NextAction {
   const uncommitted = options.uncommittedChanges ?? [];
   const validations = options.validations;
 
   if (uncommitted.length > 0) {
     const containsTests = uncommitted.some(line => /\btests\//.test(line));
     return {
       action: containsTests ? "COMMIT_PENDING_TESTS" : "COMMIT_PENDING_CHANGES",
       reasoning: "Uncommitted changes detected. Commit to persist progress.",
       command: "git add -A && git commit -m 'chore: persist progress'"
     };
   }
   if (validations && [validations.lint, validations.typecheck, validations.test, validations.contract_check].some(v => v === "fail")) {
     return {
       action: "FIX_VALIDATION_ERRORS",
       reasoning: "One or more validations failing.",
       command: "npm run validate:all"
     };
   }
   const g2 = state.gates["G2"]; const g3 = state.gates["G3"];
   if (g2 === "passed" && (g3 === "partial" || g3 === "not_started" || !g3)) {
     return {
       action: "ADVANCE_ORCHESTRATOR_PILOT",
       reasoning: "Trust Spine (G2) passed; G3 is partial.",
       command: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts"
     };
   }
   return { action: "NO_ACTION", reasoning: "Repository is clean and validations are not flagged.", command: null };
 }
 
 export function formatHumanSummary(
   state: PhaseState,
   next: NextAction,
   options: { validations?: ValidationSnapshot; uncommittedChanges?: string[] }
 ): string {
   const gates = Object.entries(state.gates).map(([k, v]) => `${k}=${v}`).join(", ");
   const uncommitted = options.uncommittedChanges?.length ?? 0;
   const v = options.validations;
   const val = v ? `lint=${v.lint}, type=${v.typecheck}, test=${v.test}, contract=${v.contract_check}` : "not_run";
   return `Phase ${state.phaseId} — ${state.phaseName} | Gates: ${gates || "none"} | Validations: ${val} | Uncommitted: ${uncommitted} | Next: ${next.action}`;
 }
+
+export function buildWorkflowMetadata(
+  state: PhaseState,
+  options: {
+    validations?: ValidationSnapshot | null;
+    uncommittedChanges?: string[];
+    computedAt?: number | string | Date;
+  } = {}
+): WorkflowMetadata {
+  const validations = options.validations ?? null;
+  const uncommittedChanges = options.uncommittedChanges ? [...options.uncommittedChanges] : [];
+  const timestamp = options.computedAt;
+  let computedAt: string;
+  if (timestamp instanceof Date) {
+    computedAt = timestamp.toISOString();
+  } else if (typeof timestamp === "number") {
+    computedAt = new Date(timestamp).toISOString();
+  } else if (typeof timestamp === "string") {
+    const parsed = new Date(timestamp);
+    computedAt = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
+  } else {
+    computedAt = new Date().toISOString();
+  }
+
+  const gates = Object.fromEntries(Object.entries(state.gates ?? {}));
+  const tasks = state.tasks.map(cloneTask);
+  const currentTask = determineCurrentTask(state);
+  const nextTask = determineNextTask(state);
+  const pendingTasks = state.tasks.filter(task => task.status !== "complete").map(cloneTask);
+  const suggestedNextAction = suggestNextAction(state, {
+    validations: validations ?? undefined,
+    uncommittedChanges
+  });
+  const humanSummary = formatHumanSummary(state, suggestedNextAction, {
+    validations: validations ?? undefined,
+    uncommittedChanges
+  });
+
+  return {
+    phase: {
+      id: state.phaseId,
+      name: state.phaseName,
+      contractPath: state.contractPath,
+      ledgerPath: state.ledgerPath
+    },
+    gates,
+    currentGate: determineCurrentGate(gates),
+    tasks,
+    currentTask: currentTask ? cloneTask(currentTask) : null,
+    nextTask: nextTask ? cloneTask(nextTask) : null,
+    pendingTasks,
+    suggestedNextAction,
+    humanSummary,
+    validations: validations ? { ...validations } : null,
+    uncommittedChanges,
+    computedAt
+  };
+}
diff --git a/tests/api/__fixtures__/workflowProgress.json b/tests/api/__fixtures__/workflowProgress.json
new file mode 100644
index 0000000000000000000000000000000000000000..73a889ad7423556beb0c3a8c547151d6353c0ab0
--- /dev/null
+++ b/tests/api/__fixtures__/workflowProgress.json
@@ -0,0 +1,92 @@
+{
+  "phaseState": {
+    "phaseId": "19",
+    "phaseName": "Autonomous Transition",
+    "contractPath": "contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json",
+    "ledgerPath": ".automation/GATES_LEDGER.md",
+    "gates": {
+      "G1": "passed",
+      "G2": "passed",
+      "G3": "partial"
+    },
+    "tasks": [
+      { "id": "WF3-V01", "title": "Phase 3 validation gate", "status": "complete" },
+      { "id": "WF3-W31", "title": "Memoize workflow context", "status": "complete" },
+      {
+        "id": "WF3-W32",
+        "title": "Enrich runtime progress",
+        "status": "in_progress",
+        "started_at": "2025-10-15T00:15:00.000Z"
+      },
+      { "id": "WF3-W33", "title": "Parity testing", "status": "pending" }
+    ]
+  },
+  "uncommittedChanges": [
+    " M src/server.ts"
+  ],
+  "validations": {
+    "last_run": "2025-10-14T22:00:00.000Z",
+    "lint": "pass",
+    "typecheck": "pass",
+    "test": "pass",
+    "contract_check": "pass"
+  },
+  "expected": {
+    "phase": {
+      "id": "19",
+      "name": "Autonomous Transition",
+      "contractPath": "contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json",
+      "ledgerPath": ".automation/GATES_LEDGER.md"
+    },
+    "gates": {
+      "G1": "passed",
+      "G2": "passed",
+      "G3": "partial"
+    },
+    "currentGate": { "id": "G3", "status": "partial" },
+    "tasks": [
+      { "id": "WF3-V01", "title": "Phase 3 validation gate", "status": "complete" },
+      { "id": "WF3-W31", "title": "Memoize workflow context", "status": "complete" },
+      {
+        "id": "WF3-W32",
+        "title": "Enrich runtime progress",
+        "status": "in_progress",
+        "started_at": "2025-10-15T00:15:00.000Z"
+      },
+      { "id": "WF3-W33", "title": "Parity testing", "status": "pending" }
+    ],
+    "currentTask": {
+      "id": "WF3-W32",
+      "title": "Enrich runtime progress",
+      "status": "in_progress",
+      "started_at": "2025-10-15T00:15:00.000Z"
+    },
+    "nextTask": { "id": "WF3-W33", "title": "Parity testing", "status": "pending" },
+    "pendingTasks": [
+      {
+        "id": "WF3-W32",
+        "title": "Enrich runtime progress",
+        "status": "in_progress",
+        "started_at": "2025-10-15T00:15:00.000Z"
+      },
+      { "id": "WF3-W33", "title": "Parity testing", "status": "pending" }
+    ],
+    "suggestedNextAction": {
+      "action": "COMMIT_PENDING_CHANGES",
+      "reasoning": "Uncommitted changes detected. Commit to persist progress.",
+      "command": "git add -A && git commit -m 'chore: persist progress'"
+    },
+    "humanSummary": "Phase 19 — Autonomous Transition | Gates: G1=passed, G2=passed, G3=partial | Validations: lint=pass, type=pass, test=pass, contract=pass | Uncommitted: 1 | Next: COMMIT_PENDING_CHANGES",
+    "validations": {
+      "last_run": "2025-10-14T22:00:00.000Z",
+      "lint": "pass",
+      "typecheck": "pass",
+      "test": "pass",
+      "contract_check": "pass"
+    },
+    "uncommittedChanges": [
+      " M src/server.ts"
+    ],
+    "computedAt": "2025-10-15T00:20:00.000Z"
+  }
+}
diff --git a/tests/api/progress.test.ts b/tests/api/progress.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..cb69ad2d5f56c1d22f383e219c72446c6d30f8fe
--- /dev/null
+++ b/tests/api/progress.test.ts
@@ -0,0 +1,47 @@
+import request from "supertest";
+import { afterEach, beforeEach, describe, expect, it } from "vitest";
+
+import { app, __progressTest } from "../../src/server.js";
+
+describe("progress workflow metadata", () => {
+  const sessionId = "wf-test-session";
+
+  beforeEach(async () => {
+    process.env.NODE_ENV = "test";
+    __progressTest.clear();
+    await __progressTest.ensureMetadata(sessionId);
+  });
+
+  afterEach(() => {
+    __progressTest.clear();
+  });
+
+  it("includes workflowMetadata in snapshot responses", async () => {
+    const cached = await __progressTest.ensureMetadata(sessionId);
+    const seeded = {
+      ...__progressTest.snapshot(sessionId),
+      stage: "planning" as const,
+      progress: 42,
+      updatedAt: Date.now(),
+      workflowMetadata: cached
+    };
+    __progressTest.set(sessionId, seeded);
+
+    const res = await request(app).get(`/api/progress/snapshot/${sessionId}`).expect(200);
+    expect(res.body).toHaveProperty("workflowMetadata");
+    const payload = res.body.workflowMetadata;
+    expect(payload).toMatchObject({
+      phase: expect.objectContaining({ id: cached.phase.id }),
+      humanSummary: expect.any(String),
+      suggestedNextAction: expect.objectContaining({ action: cached.suggestedNextAction.action })
+    });
+    expect(Array.isArray(payload.pendingTasks)).toBe(true);
+    expect(Array.isArray(payload.uncommittedChanges)).toBe(true);
+  });
+
+  it("hydrates workflow metadata when deriving orchestration snapshots", async () => {
+    const snapshot = __progressTest.snapshot(sessionId);
+    expect(snapshot.workflowMetadata).toBeTruthy();
+    expect(snapshot.workflowMetadata?.phase.id).toBeDefined();
+  });
+});
diff --git a/tests/state/phaseState.test.ts b/tests/state/phaseState.test.ts
index 97587c7f6ee58c0482dc54516feffc28642812b9..ce7a1c888f7a87c99759da29b4c1aa65b7181597 100644
--- a/tests/state/phaseState.test.ts
+++ b/tests/state/phaseState.test.ts
@@ -1,37 +1,41 @@
 import { describe, expect, it } from "vitest";
 import path from "node:path";
+import { readFile } from "node:fs/promises";
 
 import {
   canAdvanceToNextTask,
+  buildWorkflowMetadata,
+  determineCurrentGate,
   determineCurrentTask,
   determineNextTask,
   formatHumanSummary,
   loadPhaseState,
   suggestNextAction,
   type PhaseState,
-  type ValidationSnapshot
+  type ValidationSnapshot,
+  type WorkflowMetadata
 } from "../../src/state/phaseState.js";
 
 describe("phaseState shared module", () => {
   it("loads basic phase and gate info from the repository", async () => {
     const state = await loadPhaseState({ rootDir: path.resolve(".") });
     expect(state.phaseId).toBe("19");
     expect(state.phaseName.length).toBeGreaterThan(0);
     expect(state.gates && typeof state.gates).toBe("object");
     expect(Array.isArray(state.tasks)).toBe(true);
     if (state.tasks.length > 0) {
       expect(state.tasks[0]).toHaveProperty("status");
     }
   });
 
   it("suggests committing when uncommitted changes exist", () => {
     const state: PhaseState = {
       phaseId: "19",
       phaseName: "Test Phase",
       contractPath: null,
       ledgerPath: null,
       tasks: [],
       gates: {}
     };
     const next = suggestNextAction(state, { uncommittedChanges: [" M scripts/example.ts"] });
     expect(next.action).toBe("COMMIT_PENDING_CHANGES");
@@ -56,27 +60,52 @@ describe("phaseState shared module", () => {
     const next = suggestNextAction(state, { validations, uncommittedChanges: [] });
     const summary = formatHumanSummary(state, next, { validations, uncommittedChanges: [] });
     expect(typeof summary).toBe("string");
     expect(summary.includes("Phase 19")).toBe(true);
   });
 
   it("derives current and next tasks", () => {
     const state: PhaseState = {
       phaseId: "19",
       phaseName: "Test",
       contractPath: null,
       ledgerPath: null,
       gates: { G1: "passed" },
       tasks: [
         { id: "T1", title: "Do work", status: "complete" },
         { id: "T2", title: "Continue" },
         { id: "T3", title: "Finish" }
       ]
     };
     const current = determineCurrentTask(state);
     const next = determineNextTask(state);
     expect(current?.id).toBe("T2");
     expect(next?.id).toBe("T3");
     expect(canAdvanceToNextTask(state)).toBe(false);
   });
+
+  it("identifies current gate when later gates are incomplete", () => {
+    const gates = { G1: "passed", G2: "partial", G3: "not_started" } as const;
+    const current = determineCurrentGate(gates);
+    expect(current).toEqual({ id: "G2", status: "partial" });
+  });
+
+  it("matches CLI workflow metadata fixture", async () => {
+    const fixtureUrl = new URL("../api/__fixtures__/workflowProgress.json", import.meta.url);
+    const raw = await readFile(fixtureUrl, "utf-8");
+    const fixture = JSON.parse(raw) as {
+      phaseState: PhaseState;
+      validations: ValidationSnapshot;
+      uncommittedChanges: string[];
+      expected: WorkflowMetadata;
+    };
+
+    const runtime = buildWorkflowMetadata(fixture.phaseState, {
+      validations: fixture.validations,
+      uncommittedChanges: fixture.uncommittedChanges,
+      computedAt: fixture.expected.computedAt
+    });
+
+    expect(runtime).toEqual(fixture.expected);
+  });
 });
 
 
EOF
)
