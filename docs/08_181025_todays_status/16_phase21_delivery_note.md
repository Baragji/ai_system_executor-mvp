Phase 21 CDI setup complete. I created the contract, roadmap, discovery note, and updated the ledger, then validated the contract schema.

Files added

contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json
docs/Planning_roadmap_signature/21_multi_node_langgraph_roadmap.md
.automation/phase21_discovery.json
Ledger update

.automation/GATES_LEDGER.md: Added “Gate G3.1: Multi-Node Implementation” with status 🟡 IN PROGRESS, prerequisites, acceptance criteria, and evidence pointers.
Key contents (evidence-focused)

Contract (21_phase21_multi_node_langgraph_contract.json)

Phase: 21 “Multi-Node LangGraph Orchestration”
Deliverables mapped to tasks:
P21-V01: Discovery (complete)
P21-V02: D21.1 Multi-node graph (in_progress)
P21-V03: D21.2 real LLM e2e + D21.3 planning optimization (pending)
Gate G3.1 defined with acceptance + evidence
Execution model, stack, observability, completion criteria included
Roadmap (21_multi_node_langgraph_roadmap.md)

Under 100 lines; explains Why/What/How/Success/Deliverables/Timeline
Discovery note (.automation/phase21_discovery.json)

Integration points with exact lines:
src/orchestrator/graph.ts: 90–132 (single-node block), 114–117 (edges), 119–131 (invoke/complete)
src/server.ts: 1555 (flag), 1751–1790 (invoke + 202)
Function signatures verified:
generateQuestions, decomposeTask, runInSandbox, multiTurnRepair
Dependencies reflect 1.0.0 runtime already installed
Contract validation

npm run contract:check → All contracts valid (exit 0)
Next step

Awaiting your approval to start implementation (Step 2: multi‑node graph), per contract and roadmap.
Optional note

Real LLM proof already exists (tests/e2e/llm-live-openai.test.ts passed). The HTTP e2e hits 202 + polling; full completion may need a longer window or a dev flag to speed installs/tests (can add during validation task P21‑V03 if you want).