# WF5S3-C — Default Enablement & Evidence Publication — Discovery Note
Date: 2025-10-16
Scope: Finalize Phase 5 auto-update by relaxing G3 detection, default-enabling ledger writes, updating guidance, and publishing a refreshed validation report.
## Integration Points
- `scripts/detect-evidence.js` (lines ~18-120)
  - Current G3 rule requires the literal token `AGENTS_RUNTIME=langgraph` alongside the LangGraph parity test command. Need to relax matching so `/api/execute` traffic + successful exit code is sufficient, while keeping canonical criterion text loaded from `workflow/lib/gateCriteria`.
- `tests/scripts/detect-evidence.test.ts` & `tests/workflow/detectEvidence.test.ts`
  - Both suites assert the old `AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts` command. Update fixtures to reflect `/api/execute` evidence and keep regression coverage for canonical lookup + success filtering.
- `workflow/lib/phaseState.ts` (function `suggestNextAction`, ~220-260) and `scripts/snapshot-state.js` (state snapshot payload, ~150-190)
  - Suggested command for `ADVANCE_ORCHESTRATOR_PILOT` still references the LangGraph flag. Update suggested command to a direct `/api/execute` exercise so automation guidance aligns with the relaxed detector.
- `scripts/update-gate.js` (`isAutoUpdateEnabled` guard around line ~100 and CLI error at ~480)
  - Writes currently default to disabled unless `GATE_AUTO_UPDATE` is truthy. Flip default to "enabled" and only block when flag explicitly opt-outs (`0`, `false`, etc.). Update messaging to reflect opt-out model.
- `scripts/gate-auto-update.js` (pre-flight guard around lines 15-35)
  - Logger text still instructs users to set `GATE_AUTO_UPDATE=1`. Adjust to state that auto-update runs by default and describe how to disable (`GATE_AUTO_UPDATE=0`).
- `AGENTS.md` (Feature Flags section around lines 60-110)
  - Document the new default behaviour for `GATE_AUTO_UPDATE`, including how to opt out and expectations for evidence capture.
- `docs/06_161025_todays_status/02_phase5_validation_report.md`
  - Existing report highlights the detector mismatch. Need a v2 follow-up (`05_phase5_validation_report_v2.md`) summarizing canonical alignment, default enablement, and captured evidence (state:next → ledger diff → state:show).
- `.automation` evidence artifacts
  - Contract expects trace/evidence/evaluation files: `.automation/phase5_auto_update_trace.jsonl`, `.automation/phase5_auto_update_evidence.json`, `.automation/phase5_auto_update_evaluation.json`. Need to write structured entries covering detector run, auto-update, and state commands executed during this session.
## Current Behaviour & Risks
- Detector misses legitimate `/api/execute` executions without the LangGraph flag, so automation stays partial even when API tests succeed.
- `GATE_AUTO_UPDATE` default-off workflow demands manual env exports; easy to forget, leading to skipped ledger writes in CI/automation.
- AGENTS guidance still frames auto-update as opt-in, risking drift after we flip default.
- No refreshed validator report capturing the end-to-end proof required by Session 3 exit criteria.
## Planned Actions
1. Update detector rule + fixtures to key off `/api/execute` while keeping canonical text from ledger constants.
2. Revise workflow guidance (`phaseState`, snapshot, AGENTS) to surface the new command recommendation.
3. Flip `isAutoUpdateEnabled` default, update gating script messaging, and extend tests to cover opt-out semantics.
4. Run detector + auto-update with `ACTION_LOG_JSONL=1`, record trace/evidence/evaluation artifacts, and capture `state:next` → ledger diff → `state:show` outputs.
5. Author `docs/06_161025_todays_status/05_phase5_validation_report_v2.md` summarizing the evidence and default enablement change.
## Compliance Check
- Language: TypeScript/JavaScript only ✅
- No new npm dependencies ✅
- Lint/type/test commands unchanged ✅
- Documentation confined to `docs/` ✅
- Feature flag semantics remain consistent with contracts ✅
