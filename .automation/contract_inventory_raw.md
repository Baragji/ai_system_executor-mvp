# executor-mvp
Contract File: contracts/Roadmap_execution/01_remediation_contract_v2.json
Acceptance Criteria:
- phase0_complete: true
- tests_green: true
- lint_zero_warnings: true
- typecheck_clean: true
- schemas_validated: true
- single_repair_flow_demonstrated: true
- ui_manual_run_tests: true
- ui_repair_timeline: true
- meta_file_contains_checksums_and_testRuns: true
- telemetry_events_emitted: true
- e2e_phase1_test_passes: true
Deliverables:
- Name: Phase 0 Verification Report | Path: .automation/phase0_verification_report.json | Field: gate_passed | Must Exist: true
- Name: RunResult schema | Path: contracts/run-result.schema.json | Regex: "status"
- Name: Repair module | Path: src/repair/repairOnce.ts | Regex: export async function repairOnce
- Name: E2E test | Path: tests/e2e/phase1.test.ts | Regex: phase1
- Name: UI run tests button | Path: public/index.html | Regex: runTestsBtn
- Name: Execution trace | Path: .automation/execution_trace.jsonl | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/02_phase2a_contract.json
Acceptance Criteria:
- phase1_verified: true
- contracts_created: true
- detection_logic_works: true
- question_generation_works: true
- api_endpoint_functional: true
- all_tests_pass: true
- coverage_maintained: true
- manual_test_passes: true
Deliverables:
- Name: Clarification Request Schema | Path: contracts/clarification-request.schema.json | Regex: questions
- Name: Clarification Response Schema | Path: contracts/clarification-response.schema.json | Regex: answers
- Name: Detection Module | Path: src/clarification/detectMissing.ts | Regex: export function detectMissing
- Name: Question Generator | Path: src/clarification/generateQuestions.ts | Regex: export function generateQuestions
- Name: Phase 2A Report | Path: .automation/phase2a_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/03_phase2a_observability_fix.json
Acceptance Criteria:
- phase2a_verified: true
- trace_location_fixed: true
- evaluation_logging_fixed: true
- both_files_populate: true
- all_tests_pass: true
- coverage_maintained: true
- manual_verification_passes: true
Deliverables:
- Name: Dual-write Telemetry Module | Path: src/telemetry/events.ts | Regex: execution_trace\.jsonl
- Name: Evaluation Logger | Path: src/evaluation/logResults.ts | Regex: export.*function logEvaluationResult
- Name: Execution Trace File | Path: .automation/execution_trace.jsonl | Must Exist: true
- Name: Evaluation Results File | Path: .automation/evaluation_results.json | Must Exist: true
- Name: Observability Fix Report | Path: .automation/observability_fix_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/04_phase2b_contract.json
Acceptance Criteria:
- phase2a_verified: true
- augment_prompt_works: true
- execute_integration_works: true
- ui_form_functional: true
- end_to_end_flow_works: true
- all_tests_pass: true
- coverage_maintained: true
- manual_demos_approved: true
- no_scope_creep_detected: true
- checkpoint_passed: true
Deliverables:
- Name: Prompt Augmentation Module | Path: src/clarification/augmentPrompt.ts | Regex: export function augmentPrompt
- Name: Execute Integration | Path: src/server.ts | Regex: clarifications
- Name: UI Clarification Section | Path: public/index.html | Regex: clarificationSection
- Name: UI Clarification Logic | Path: public/script.js | Regex: /api/clarify
- Name: Phase 2B Report | Path: .automation/phase2b_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/05_phase2c_contract.json
Acceptance Criteria:
- phase2b_verified: true
- clarification_telemetry_added: true
- smart_defaults_implemented: true
- all_tests_pass: true
- coverage_maintained: true
- manual_demos_approved: true
- phase2_metrics_met: true
Deliverables:
- Name: Clarification Telemetry Schema | Path: contracts/executor-output.schema.json | Regex: clarification
- Name: Smart Defaults Module | Path: src/clarification/suggestDefaults.ts | Regex: export function suggestDefaults
- Name: Enhanced Generate Questions | Path: src/clarification/generateQuestions.ts | Regex: suggestDefaults
- Name: Phase 2C Report | Path: .automation/phase2c_completion_report.json | Field: gate_passed | Must Exist: true
- Name: Phase 2 Final Report | Path: .automation/phase2_completion_report.json | Field: celebration_earned | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/06_phase3a_contract.json
Acceptance Criteria:
- phase2_verified: true
- repair_history_schema_created: true
- failure_analyzer_works: true
- diff_generator_works: true
- repair_prompts_work: true
- all_tests_pass: true
- coverage_maintained: true
- manual_demos_approved: true
Deliverables:
- Name: Repair History Schema | Path: contracts/repair-history.schema.json | Regex: attempts
- Name: Failure Analyzer | Path: src/repair/analyzeFailure.ts | Regex: export function analyzeFailure
- Name: Diff Generator | Path: src/repair/generateDiff.ts | Regex: export function generateDiff
- Name: Repair Prompt Builder | Path: src/repair/buildRepairPrompt.ts | Regex: export function buildRepairPrompt
- Name: Phase 3A Report | Path: .automation/phase3a_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/07_phase3b_contract.json
Acceptance Criteria:
- phase3a_verified: true
- multi_turn_loop_works: true
- execute_integration_works: true
- ui_repair_history_functional: true
- repair_metrics_captured: true
- success_rate_met: true
- all_tests_pass: true
- coverage_maintained: true
- manual_demos_approved: true
Deliverables:
- Name: Multi-Turn Loop | Path: src/repair/multiTurnRepair.ts | Regex: export async function multiTurnRepair
- Name: Execute Integration | Path: src/server.ts | Regex: multiTurnRepair
- Name: UI Repair History | Path: public/index.html | Regex: repairHistorySection
- Name: Repair Metrics Schema | Path: contracts/executor-output.schema.json | Regex: repairMetrics
- Name: Phase 3B Report | Path: .automation/phase3b_completion_report.json | Field: gate_passed | Must Exist: true
- Name: Phase 3 Final Report | Path: .automation/phase3_completion_report.json | Field: celebration_earned | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# contracts/Roadmap_execution/08_phase4a_contract.json
Contract File: contracts/Roadmap_execution/08_phase4a_contract.json
⚠️ Failed to parse JSON: Expected ',' or ']' after array element in JSON at position 11714
---

# executor-mvp
Contract File: contracts/Roadmap_execution/09_phase4b_contract.json
Acceptance Criteria:
- phase4a_verified: true
- subtask_executor_works: true
- sequential_orchestrator_works: true
- time_estimator_works: true
- ui_progress_display_functional: true
- planning_integrated: true
- all_tests_pass: true
- coverage_maintained: true
- manual_demos_approved: true
- decomposition_quality_met: true
Deliverables:
- Name: Subtask Executor | Path: src/planning/executeSubtask.ts | Regex: export async function executeSubtask
- Name: Sequential Orchestrator | Path: src/planning/executeTaskPlan.ts | Regex: export async function executeTaskPlan
- Name: Time Estimator | Path: src/planning/estimateCompletion.ts | Regex: export function estimateCompletion
- Name: UI Progress Display | Path: public/index.html | Regex: taskPlanSection
- Name: Planning Integration | Path: src/server.ts | Regex: decomposeTask|executeTaskPlan
- Name: Phase 4B Report | Path: .automation/phase4b_completion_report.json | Field: gate_passed | Must Exist: true
- Name: Phase 4 Final Report | Path: .automation/phase4_completion_report.json | Field: celebration_earned | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/4B1_adaptive_repair_contract.json
Acceptance Criteria:
- strategy_selector_exists: true
- prompts_adaptive: true
- tests_green: true
- coverage_maintained: true
Deliverables:
- Name: Strategy Selector | Path: src/repair/strategySelector.ts | Regex: export function selectStrategy
- Name: Prompt Integration | Path: src/repair/buildRepairPrompt.ts | Regex: strategyGuidance
- Name: Phase 4B1 Report | Path: .automation/phase4b1_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/4B2_sandbox_install_contract.json
Acceptance Criteria:
- safe_install: true
- command_detection: true
- tests_green: true
- coverage_maintained: true
Deliverables:
- Name: Install helper | Path: src/runner/installDeps.ts | Regex: ensureDependencies
- Name: Detect test command | Path: src/runner/detectTestCommand.ts | Regex: detectTestCommand
- Name: Phase 4B2 Report | Path: .automation/phase4b2_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/4B3_subtask_resilience_contract.json
Acceptance Criteria:
- wrapper_exists: true
- context_integrated: true
- tests_green: true
- coverage_maintained: true
Deliverables:
- Name: Wrapper | Path: src/planning/generateSubtaskOutput.ts | Regex: generateSubtaskOutputWithRetry
- Name: Phase 4B3 Report | Path: .automation/phase4b3_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/4B4_planning_telemetry_contract.json
Acceptance Criteria:
- trace_schema: true
- field_mapping: true
- tests_green: true
- coverage_maintained: true
Deliverables:
- Name: Trace validator | Path: src/contracts/executionTraceValidator.ts | Regex: validateExecutionTrace
- Name: Phase 4B4 Report | Path: .automation/phase4b4_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/11_phaseA_contract.json
Acceptance Criteria:
- phase4_verified: true
- success_card_works: true
- loading_states_work: true
- error_formatting_works: true
- no_raw_json_visible: true
- all_tests_pass: true
- lint_passes: true
- manual_demos_approved: true
Deliverables:
- Name: Success Card Function | Path: public/script.js | Regex: function renderSuccessCard
- Name: Loading Phase Function | Path: public/script.js | Regex: function updateLoadingPhase
- Name: Error Formatter Function | Path: public/script.js | Regex: function formatError
- Name: Success Card Styles | Path: public/styles.css | Regex: \.success-card
- Name: Spinner Styles | Path: public/styles.css | Regex: @keyframes spin
- Name: Error Card Styles | Path: public/styles.css | Regex: \.error-card
- Name: Phase A Report | Path: .automation/phaseA_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---

# executor-mvp
Contract File: contracts/Roadmap_execution/11_phaseA_contract_enhanced.json
Acceptance Criteria:
- phase4_verified: true
- discovery_completed: true
- all_integration_points_documented: true
- success_card_works: true
- loading_states_work: true
- error_formatting_works: true
- no_raw_json_visible: true
- all_tests_pass: true
- lint_passes: true
- contract_validates: true
- sbom_generated: true
- evidence_artifacts_present: true
- stack_compliant: true
- manual_demos_approved: true
Deliverables:
- Name: Discovery JSON | Path: .automation/phaseA_discovery.json | Field: win_a1_integration | Must Exist: true
- Name: Discovery Note | Path: .automation/phaseA_discovery_note.md | Must Exist: true
- Name: Evidence Compilation | Path: .automation/phaseA_evidence.json | Field: discovery_note | Must Exist: true
- Name: SBOM Artifact | Path: sbom.spdx.json | Must Exist: true
- Name: Success Card Function | Path: public/script.js | Regex: function renderSuccessCard
- Name: Loading Phase Function | Path: public/script.js | Regex: function updateLoadingPhase
- Name: Error Formatter Function | Path: public/script.js | Regex: function formatError
- Name: Success Card Styles | Path: public/styles.css | Regex: \.success-card
- Name: Spinner Styles | Path: public/styles.css | Regex: @keyframes spin
- Name: Error Card Styles | Path: public/styles.css | Regex: \.error-card
- Name: Phase A Report | Path: .automation/phaseA_completion_report.json | Field: gate_passed | Must Exist: true
Test Requirements:
- Command: npm test
- Expected: {"exit_code":0,"no_failed_suites":true}
- Coverage: {"min_line_pct":80,"min_branch_pct":75}
Success Metrics:
- Test exit code must be 0
- No failed test suites: true
- Line coverage >= 80
- Branch coverage >= 75
- Lint warnings <= 0
- Typecheck must_pass: true

---
