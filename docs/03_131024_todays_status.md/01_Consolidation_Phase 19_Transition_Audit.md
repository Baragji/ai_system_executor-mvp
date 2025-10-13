Consolidated Analysis & Implementation Plan: Phase 19/20 Autonomous Transition
Updated with Phase 20 Evidence
Executive Summary
After comprehensive analysis of your repository and the Phase 20 work completed, I've consolidated the three reviews and identified what's actually happening vs. what the reviews claim: Reality Check: ✅ Phase 19/20 implementation is ACTIVELY PROGRESSING (not just documentation)
✅ Infrastructure is being built incrementally (adapter, graph stub, executions store)
✅ Discovery-first CDI is being followed (phase19/phase20 discovery artifacts exist)
⚠️ But governance docs are outdated and no Phase 19 contract exists to formalize this work
Evidence-Based Findings
1. Active Development Progress ✅ CONFIRMED
Phase 19 Infrastructure (Completed):
src/orchestrator/adapter.ts:23: Feature-flagged AGENTS_RUNTIME switch
src/orchestrator/graph.ts:27: LangGraph stub runtime
src/telemetry/otel.ts:18: OTEL_ENABLED guard (placeholder)
.automation/phase19_autonomous_transition_discovery.json: 8 integration points mapped
Phase 20 Infrastructure (Just Completed):
src/orchestrator/executionsStore.ts: In-memory execution tracking (65 lines)
src/server.ts:427: GET /api/executions/:id endpoint
tests/api/executions.test.ts: End-to-end test for 202 + Location polling
.automation/phase20_langgraph_exec_discovery_note.md: Discovery completed
Validation Status: Your assistant reports:
✅ Lint: OK
✅ Typecheck: OK  
✅ Tests: OK (thresholds met)
✅ Contract check: OK
✅ SBOM: generated
2. Documentation Lag ⚠️ CONFIRMED
Outdated Files:
AGENTS.md:4: Last updated 2025-10-08, no mention of:
AGENTS_RUNTIME flag (implemented)
OTEL_ENABLED flag (implemented)
CycloneDX SBOM (required by Phase 19)
RFC 9457 error envelopes (implemented in server.ts)
CDI_INFRASTRUCTURE.md:5: States "Current Phase: A (UI Baseline Fixes)"
Reality: You're executing Phase 19/20 work
Missing: Trust Spine requirements, feature flag guidance, GATES_LEDGER/EVIDENCE_LOG templates
3. Missing Authoritative Contract ❌ CRITICAL GAP
Contract Status:
22 legacy contracts in contracts/Roadmap_execution/ (Phase 0–E, 4B1–4B4, 11–16)
NO Phase 19 contract codifying:
Trust Spine track (CycloneDX, RFC 9457, OTel, JSONL logs)
LangGraph orchestration milestones (M1)
HITL/MCP tooling (U1)
Policy gates (P1), Observability (O1), Multi-Agent (MA2)
NO Phase 20 contract formalizing executions store/endpoint work
Problem: Work is happening outside the contract system, creating:
No formal gate criteria for Phase 19/20 milestones
No evidence requirements defined
No rollback plan documented
Contract compliance report can't track progress
4. Strategic Documentation Complete ✅ CONFIRMED
Phase 19 Artifacts (in docs/.../03_final_decisions/):
phase19_autonomous_transition_strategy.md (18KB): Decision framework, roadmap, dependencies
phase19_autonomous_transition_masterplan.md (17KB): Milestones T0→MA2, risk register, go/no-go criteria
ADR-019: Architecture decision record
Gate_Checklist_Phase19_2025-10-12.json: G0–G4 gate definitions
These exist but aren't formalized as executable contracts
5. Compliance Automation Broken ⚠️ CONFIRMED
Evidence: .automation/contract_compliance_report.json:3
{
  "timestamp": "2025-10-07T07:03:41.858Z",
  "overall_status": "fail",
  "wins_passed": 0,
  "observed": "Command not executed during audit; manual evidence required"
}
Root Cause: Audit script doesn't execute validation commands—relies on stale snapshots from Oct 7. Impact:
Can't verify Phase 19/20 work is compliant
Can't track milestone completion
Undermines contract credibility
Reconciling the Three Reviews
What the Reviews Got RIGHT ✅
All three reviews correctly identified:
Documentation drift: AGENTS.md, CDI_INFRASTRUCTURE.md outdated
Missing Phase 19 contract: No executable contract exists
Naming inconsistency: Contract files use mixed conventions
Compliance report failure: Automation not tracking current work
Strategic clarity: Phase 19 masterplan/strategy are complete and valid
What the Reviews MISSED ⚠️
The reviews treated Phase 19 as "aspirational documentation" when active implementation is underway:
Phase 19 discovery: Completed (8 integration points mapped)
Phase 20 discovery: Completed (executions endpoint mapped)
Infrastructure: Adapter, graph stub, executions store implemented
Tests: Full coverage with passing validation
Feature flags: Implemented and working
Interpretation: Your team is executing Phase 19/20 pragmatically (building infrastructure incrementally) rather than waiting for perfect governance alignment.
Updated Recommendations (Evidence-Based)
✅ Priority 1: Codify Active Work as Contracts (URGENT)
You have completed work without contracts. Need to formalize: A. Phase 19 Contract (contracts/Roadmap_execution/19_autonomous_transition_contract.json) Encode completed milestones:
M1-PARTIAL (LangGraph Pilot Infrastructure): ✅ DONE
Adapter with AGENTS_RUNTIME flag: src/orchestrator/adapter.ts
Graph stub: src/orchestrator/graph.ts
Executions store: src/orchestrator/executionsStore.ts
Tests: tests/api/executions.test.ts
Discovery: phase19/phase20 artifacts
Encode pending milestones:
T0 (Trust Spine): Partially complete
✅ RFC 9457: src/middleware/problemDetails.ts
✅ OTel placeholder: src/telemetry/otel.ts
❌ CycloneDX SBOM (still SPDX only)
❌ JSONL action logs (not dual-writing yet)
❌ SLSA provenance (not generated)
U1 (HITL/MCP): Not started
P1 (Policy Gates): Not started
O1 (Observability): Not started
MA2 (Multi-Agent): Not started
Contract should:
Reference ADR-019 and gate checklist
Define acceptance criteria for each milestone
Specify evidence requirements (discovery notes, tests, SBOM, traces)
Document rollback plan (revert to AGENTS_RUNTIME=stepqueue)
B. Phase 20 Contract (contracts/Roadmap_execution/20_langgraph_executions_contract.json) Encode completed work:
Executions store implementation
GET /api/executions/:id endpoint
Tests proving 202 + Location + polling flow
Discovery artifacts
Mark as: COMPLETE, awaiting evidence ledger update
✅ Priority 2: Update Governance Documents (HIGH)
AGENTS.md needs 6 additions:
Feature Flags Section:
## Feature Flags

Phase 19+ work uses feature flags for safe rollout:

- `AGENTS_RUNTIME`: Set to `langgraph` to enable LangGraph orchestrator (default: `stepqueue`)
- `OTEL_ENABLED`: Set to `true|1` to enable OpenTelemetry tracing (default: disabled)
- `MCP_ENABLED`: Set to `true|1` to enable MCP tool governance (default: disabled, not yet implemented)
- `ACTION_LOG_JSONL`: Set to `true|1` to dual-write JSONL action logs (default: disabled, not yet implemented)
- `PROBLEM_DETAILS_ENABLED`: Set to `true|1` to use RFC 9457 error responses (default: legacy JSON)
Evidence Requirements Update:
4. **SBOM Artifacts**
   - SPDX: `npm run sbom` → `sbom.spdx.json`
   - CycloneDX: `npm run sbom:cyclonedx` → `sbom.cdx.json` (Phase 19+)
   - SLSA Provenance: `npm run provenance` → `provenance.intoto.jsonl` (Phase 19+)
Add RFC 9457 Requirement:
5. **Error Handling**
   - Use RFC 9457 problem details via `respondWithProblem()` helper
   - Test with `PROBLEM_DETAILS_ENABLED=1`
Add MCP Policy Requirement (for future):
6. **MCP Tool Governance** (Phase 19 U1+)
   - All MCP tools must be in allow-list: `.automation/mcp_policy.json`
   - Tool calls must be audited in action logs
Update "Last Updated": 2025-10-13 (today)
Add Phase 19 reference:
## Current Work

- **Active Phase**: Phase 19 (Autonomous Transition) + Phase 20 (Executions Endpoint)
- **Contract**: `contracts/Roadmap_execution/19_autonomous_transition_contract.json` (pending)
- **Strategy**: `docs/.../phase19_autonomous_transition_strategy.md`
CDI_INFRASTRUCTURE.md needs 4 updates:
Change Line 5:
> **Current Phase:** Phase 19/20 (Autonomous Transition - Infrastructure Build)
Add Trust Spine Section:
### Trust Spine (Phase 19 T0)
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `src/middleware/problemDetails.ts` | RFC 9457 error responses | Standardized error format for observability |
| `src/telemetry/otel.ts` | OpenTelemetry bootstrap (env-gated) | GenAI span tracing (placeholder) |
| `scripts/generate-cyclonedx.js` | CycloneDX SBOM generation | Supply chain compliance (pending) |
| `scripts/generate-provenance.js` | SLSA provenance | Build attestation (pending) |
Add Feature Flag Guidance:
### Feature Flag Workflow
**Testing new runtimes:**
```bash
# Enable LangGraph runtime
export AGENTS_RUNTIME=langgraph
npm run dev

# Test executions endpoint
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' \
  -v  # Check for 202 + Location header

# Poll status
curl http://localhost:3000/api/executions/{id}
Rollback:
unset AGENTS_RUNTIME  # or set to "stepqueue"

4. **Add Phase 19 Contract Reference**:
```markdown
### Contracts
| File | What It Does | Why It Matters |
|------|--------------|----------------|
| `contracts/Roadmap_execution/19_autonomous_transition_contract.json` | Phase 19 autonomous transition roadmap | Governs LangGraph, HITL, MCP, policy gates (pending creation) |
| `contracts/Roadmap_execution/20_langgraph_executions_contract.json` | Phase 20 executions endpoint | Formalizes executions store and polling API (pending creation) |
✅ Priority 3: Fix Compliance Automation (MEDIUM)
Problem: .automation/contract_compliance_report.json shows 100% failure because audit script doesn't run validation commands. Fix (requires script modification):
Update audit script to actually execute:
npm run lint
npm run typecheck
npm test
npm run contract:check
npm run sbom
Add Phase 19 validation hooks:
# If OTEL_ENABLED, check for otel bootstrap
# If AGENTS_RUNTIME=langgraph, check for graph.ts
# If contracts/19_*.json exists, validate against schema
Re-run audit and publish timestamped report
Automate in CI: Add weekly scheduled run
✅ Priority 4: Standardize Contract Naming (LOW)
Current naming inconsistency (examples):
01_remediation_contract_v2.json (version in filename)
4B1_adaptive_repair_contract.json (letter-number hybrid)
14b_PA-FIX2_dependency_preflight.json (lowercase prefix)
Proposed standard:
NN_phase<ID>_<slug>_contract.json
Phase 19/20 Examples:
19_phase19_autonomous_transition_contract.json
20_phase20_langgraph_executions_contract.json
Implementation:
Document standard in contracts/README.md
Optionally rename existing (low priority)
Enforce in new contracts
✅ Priority 5: Complete Trust Spine (T0) (NEXT MILESTONE)
What's done:
✅ RFC 9457 middleware
✅ OTel placeholder with OTEL_ENABLED guard
What's missing (from Phase 19 masterplan):
CycloneDX SBOM:
Add script: scripts/generate-cyclonedx.js
Add npm script: "sbom:cyclonedx": "node scripts/generate-cyclonedx.js"
Output: sbom.cdx.json
SLSA Provenance:
Add script: scripts/generate-provenance.js
Add npm script: "provenance": "node scripts/generate-provenance.js"
Output: provenance.intoto.jsonl
JSONL Action Logs:
Extend src/telemetry/events.ts:70 logEvent()
Add dual-write when ACTION_LOG_JSONL=1
Output: .automation/actions.jsonl
OTel Implementation:
Install: @opentelemetry/api, @opentelemetry/sdk-node, @opentelemetry/instrumentation-openai
Wire in src/telemetry/otel.ts
Add Langfuse exporter (optional)
Gate Criteria (from ADR-019):
G2 passes: CycloneDX SBOM, SLSA provenance, OTel traces, JSONL logs, RFC 9457 samples in evidence
Implementation Sequence (Updated)
Immediate Actions (0-2 days):
Create Phase 19 Contract → Formalizes existing + pending work
Create Phase 20 Contract → Marks executions endpoint as complete
Update AGENTS.md → Add feature flags, RFC 9457, CycloneDX requirements
Update CDI_INFRASTRUCTURE.md → Change "Current Phase" to 19/20, add trust spine section
Short-Term (1 week):
Complete Trust Spine (T0):
CycloneDX SBOM script
SLSA provenance script
JSONL action log dual-write
OTel implementation (or mark as deferred milestone)
Fix Compliance Automation → Script to execute validation commands
Medium-Term (2-4 weeks):
HITL/MCP Track (U1): Vanilla JS chat UI, MCP server scaffold
Policy Gates (P1): Semgrep, Gitleaks, npm audit integration
Observability (O1): Langfuse dashboards, eval logging
Long-Term (1-3 months):
Multi-Agent Specialization (MA2): Role-specific agents with evidence bundles
Edge Deployment (E2): Optional Cloudflare/Vercel adapters
What Makes This Different from the Original Plan
Original Plan Assumed: Phase 19 was "aspirational" and needed everything built from scratch. Reality:
Phase 19/20 infrastructure already partially built
Work is validated and tested
Missing piece is governance formalization (contracts, docs)
New Plan:
Catch up governance to match implementation reality
Formalize completed work as contracts
Define next milestones (Trust Spine completion)
Continue incremental rollout behind feature flags
Summary: What You'll Get
By following this plan:
✅ Governance alignment: AGENTS.md, CDI_INFRASTRUCTURE.md reflect Phase 19/20 work
✅ Contract formalization: Phase 19/20 contracts codify completed + pending work
✅ Evidence tracking: Compliance automation can track progress
✅ Clear next steps: Trust Spine (T0) completion is defined
✅ Continued safety: Feature flags enable rollback at any time

You'll have:
Authoritative Phase 19/20 contracts governing autonomous transition
Updated docs agents can follow without confusion
Working compliance reports showing real progress
Clear milestone tracking via GATES_LEDGER
Validated infrastructure ready for Trust Spine completion

Your Decision
Approve to proceed with:
Creating Phase 19/20 contracts
Updating AGENTS.md and CDI_INFRASTRUCTURE.md
Documenting Trust Spine completion requirements
Or ask: Questions about specific findings, trade-offs, or implementation details.