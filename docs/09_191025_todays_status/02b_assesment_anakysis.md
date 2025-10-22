I ran the analysis, mapped the work, and compiled the decision report below.

1. Current Repository Metrics

Total LOC: 12617 (TypeScript in src)
Number of .ts files: 75
Largest file: src/server.ts (2404 lines)
Files > 500 LOC: 5+ (e.g., server.ts:2404, repair/multiTurnRepair.ts:659, …)
Cross‑module imports (from ../): 66
Test count: 98
Test runtime: real 10.53s (user 43.74s, sys 8.42s)
Coverage (recent run): All files lines ~82.25%
Command outputs

Total LOC and largest files: see TOP 20 list in analysis command output (server.ts:2404; others 659…205)
Cross‑module imports (regex “from ['"]..”): 66
Test runtime (time npm test): real 10.53
2. Phase 21 Task Distribution

llm-gateway-service: 1 task
task_01_fix_openai_validation.md
orchestrator-service: 12 tasks
task_02_implement_clarify_node.md
task_03_implement_plan_node.md
task_04_implement_generate_node.md
task_05_implement_test_node.md
task_06_implement_repair_node.md
task_07_implement_deliver_node.md
task_08_wire_stategraph_nodes.md
task_09_add_stategraph_telemetry.md
task_10_migrate_stepqueue_logic.md
task_11_execute_replay_tests.md
task_12_execute_benchmarks.md
task_13_execute_real_llm_e2e.md
telemetry-service: 2 tasks
task_14_update_gates_ledger.md
task_15_run_contract_validation.md
planning/repair/executor/runner/clarification/ui: 0 directly (their logic integrates through orchestration in these tasks)
Interpretation

80% of Phase 21 tasks target the orchestrator. The monolith is a bottleneck and will centralize more complexity if we continue Phase 21 in‑place.

3. Technical Debt Projection (TDI)
Formula: TDI = (LOC in largest file) × (cross‑module imports) ÷ (test coverage%)

Current:

Largest file = 2404
Cross imports = 66
Coverage = 82.25
Current TDI ≈ 2404 × 66 ÷ 82.25 ≈ 1928
After Phase 21 (no refactor), conservative projection:

Largest file likely remains server.ts at 2404 (new nodes live under orchestrator, not server.ts)
Cross‑module imports +15% (≈ 76) due to new node wiring + telemetry + repair loop
Coverage ~82.25 (stable)
TDI_after_P21 ≈ 2404 × 76 ÷ 82.25 ≈ 2220 (+15%)
After Refactor (post Phase 1 extraction):

Per‑service focus (target: each service < 2000 LOC; largest file ~500 LOC)
Cross imports per service ≈ 12 (within service boundary)
Coverage per service ≈ 80%
TDI_after_refactor ≈ 500 × 12 ÷ 80 = 75 (≈ −96% vs current)
Notes

Even with cautious estimates, debt trends upward if we complete Phase 21 inside the monolith; refactor collapses TDI by orders of magnitude because the largest file no longer dominates.
4. Decision Matrix

Time to complete Phase 21
Refactor Now: ❌ (longer before P21 sign‑off)
Phase 21 First: ✅ (11–12 hours for listed tasks)
Context fit for AI
Refactor Now: ✅ (bounded services fit context)
Phase 21 First: ❌ (monolith keeps growing)
Risk of bad code spreading
Refactor Now: ✅ (blast radius containment)
Phase 21 First: ❌ (centralized orchestrator edits)
Parallel AI development
Refactor Now: ✅ (one AI per service)
Phase 21 First: ⚠️ (contention on orchestrator files)
Test isolation
Refactor Now: ✅ (per‑service suites)
Phase 21 First: ⚠️ (global suites)
Rollback capability
Refactor Now: ✅ (service‑level rollback)
Phase 21 First: ❌ (monolith rollbacks are coarse)
Migration risk
Refactor Now: ❌ (distributed complexity)
Phase 21 First: ✅ (lower immediate risk)
Deployment complexity
Refactor Now: ❌ (more moving parts)
Phase 21 First: ✅ (status quo)
Overall: Refactor Now wins on AI context, blast radius, parallelism, and long‑term velocity; Phase 21 First wins on short‑term speed and lower immediate risk.

5. Risk Assessment

If refactor now:
Risks: distributed debugging, service boundaries design, infra scripts
Mitigations: keep monolith running; start with HTTP; enforce OTel + trace IDs + RFC 9457 across services; one AI per service; CI templates per service
If Phase 21 first:
Risks: larger orchestrator diff increases merge conflicts; rising TDI; more fragile debugging; refactor later will be harder
Mitigations: minimize edits in server.ts; isolate orchestration logic into a new module to ease later extraction; keep strict tests around orchestrator
6. Contract Compliance Check

Contract file: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json:1
Scope: “Backend orchestration only; feature‑flagged runtime behind POST /api/execute …”
No requirement to remain monolithic; microservice refactor is permissible and aligns with feature flag gating.
No hard external deadlines indicated in the contract metadata.
7. Recent Failure Patterns

Telemetry tail shows earlier provider instability (“invalid_response_shape” and EMPTY_MESSAGE) now fixed; a recent log shows a repair_abort invalid_delete entry (repair domain).
Module errors (grep “Error:”): runner, repair, planning each showed 1 recent match; issues do span multiple domains, suggesting isolation would reduce cascade risk.
8. Recommendation

Recommendation: REFACTOR NOW (Phase 1), then complete Phase 21 inside the new orchestrator‑service.
Rationale
Largest file already 2404 LOC (>1000 LOC critical trigger).
12/15 Phase 21 tasks centralize on orchestrator — debt will cluster in the most coupled area.
Current TDI ≈ 1928; projected TDI grows (~+15%) if we finish Phase 21 in the monolith; refactor reduces TDI to ~75 per service.
Microservices match your AI‑only dev model: bounded context per AI, smaller blast radius, easier rollback.
Timeline

Refactor Phase 1 (orchestrator + llm‑gateway + runner): 1–2 weeks
Week 1: Extract llm‑gateway‑service + runner‑service; keep HTTP calls; pass tests
Week 2: Extract orchestrator‑service; route /api/execute via UI‑BFF; re‑enable LangGraph flag; pass tests
Then complete Phase 21 (multi‑node graph) in orchestrator‑service: ~1–1.5 days for node wiring + tests
Replay + perf + e2e evidence: ~0.5–1 day
Success Criteria

Each service < 2000 LOC; largest file < 500 LOC
100% tests green per service; total runtime per service < 30s
OTel traces + correlation IDs propagate across services
RFC 9457 error envelopes across all public endpoints
Phase 21 G3.1 “PASSED” with recorded evidence
Notes for execution

Start with HTTP REST between services; keep BullMQ available for async flows later.
Enforce trace IDs in logs and problem+json everywhere.
Maintain feature flags (AGENTS_RUNTIME) and API parity (202 + Location + polling).
Keep the monolith in “compat mode” during extraction; CI runs both until cutover.
If you want, I can:

Scaffold the three Phase 1 services (orchestrator-service, llm-gateway-service, runner-service) with Express + OTel + RFC 9457 middleware, including per-service package.json and tsconfig, and wire a proxy layer in the current server to route to them.