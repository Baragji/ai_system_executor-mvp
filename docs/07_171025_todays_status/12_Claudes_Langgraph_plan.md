Claude’s Plan
Fix G3 Test Failures - LangGraph Stub Completion
Problem Diagnosis
Graph.ts is a STUB (line 49: "LangGraph runtime stub invoked. Replace with real graph implementation")
BUT: ADR-019 says to use @langchain/langgraph@0.6.10 - the REAL library
Phase 19 M1 is INCOMPLETE: Should have real LangGraph StateGraph, not a 10ms setTimeout stub
Parity test fails: StepQueue path throws 500 error (separate bug)
Perf test times out: Stub's setTimeout(..., 10) never completes properly in test environment
Root Cause
Phase 19 M1 deliverable was NOT completed. Per ADR-019:
"Create src/orchestrator/graph.ts" - ✅ File exists
"Wire POST /api/execute to call adapter when AGENTS_RUNTIME=langgraph" - ✅ Done
"Map nodes to existing modules" - ❌ MISSING - stub has no nodes
"Overhead < 500ms/transition" - ❌ CAN'T MEASURE - no real graph
Solution Plan
Option A: Implement Real LangGraph (Correct per ADR-019) - 2-3 days
Install @langchain/langgraph@0.6.10 (approved in ADR-019)
Build StateGraph with nodes: Clarify → Plan → Generate → Test → Repair → Deliver
Wire to existing modules (planning, executor, runner, repair as documented)
Add checkpoint serialization for pause/resume
Update tests to validate graph execution
Evidence: Real graph traces, node timings, proper async completion
Option B: Fix Stub to Pass Tests (Pragmatic, but NOT compliant) - 2 hours
Make setTimeout callback update execution store properly
Fix StepQueue 500 error in parity test (separate bug in server.ts)
Tests pass, ledger updates, G3 advances
BUT: ADR-019 not fulfilled, technical debt incurred
Recommendation: Option A
Rationale:
ADR-019 explicitly requires @langchain/langgraph with StateGraph
Phase 19 M1 acceptance criteria: "deterministic replay, parity tests, perf budget"
Can't measure real performance or parity with a 10ms stub
Fortune 500 systems don't ship stubs to gate checkpoints
CDI principle: "Ship perfect or never"
Implementation Steps (Option A)
1. Install LangGraph (5 min)
npm install @langchain/langgraph@0.6.10
2. Rewrite graph.ts (~4 hours)
Import StateGraph, StateGraphArgs from langgraph
Define state interface matching ExecutionState
Create nodes calling existing modules:
clarifyNode → detectMissing + generateQuestions
planNode → decomposeTask
generateNode → executor/generateCode
testNode → runner/runInSandbox
repairNode → repair/multiTurnRepair
deliverNode → complete execution
Add edges with conditional routing
Implement checkpoint adapter for pause/resume
3. Update Tests (~2 hours)
Make parity test resilient to async graph execution
Add deterministic seed injection to graph config
Increase perf test timeout to 30s (real graph is slower than 10ms stub)
Add graph-specific validation tests
4. Validate (~1 hour)
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/parity.test.ts  
AGENTS_RUNTIME=langgraph npm test tests/benchmarks/perf-overhead.test.ts
npm run state:next:auto  # Should detect evidence and update ledger
5. Document (~30 min)
Update discovery note with LangGraph integration
Add evidence to G3 ledger (traces, timing data)
Mark M1 acceptance criteria complete
Timeline
Option A (Real LangGraph): 2-3 days
Option B (Fix Stub): 2 hours but perpetuates debt
Next Action
Confirm Option A, then:
Create discovery note for LangGraph integration
Install @langchain/langgraph
Implement StateGraph per ADR-019
Run tests and collect evidence
Advance G3 gate