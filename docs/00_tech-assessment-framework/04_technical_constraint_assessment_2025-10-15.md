# Technical Constraint Assessment & Technology Adoption Guidelines

**Date:** October 15, 2025  
**Phase:** 19 (Autonomous Transition)  
**Purpose:** Evaluate current restrictions, assess when to introduce new technologies, and provide evidence-based recommendations for the UMCA Executor MVP.

---

## Executive Summary

The repository maintains **strict TypeScript-only, vanilla JS frontend constraints** by design—not by accident. After comprehensive analysis of the codebase (~12,231 lines backend TypeScript, ~2,382 lines frontend vanilla JS, 81 test files), current phase objectives (autonomous transition with LangGraph), and industry best practices, these restrictions should **remain in place** for the MVP with carefully controlled exceptions outlined below.

**Key Findings:**
- ✅ Current constraints align with Fortune 500-grade TypeScript agent systems (see Phase 19 research)
- ✅ Vanilla JS frontend is appropriate for current scale and complexity
- ⚠️ Strategic expansion points exist for future phases (not MVP)
- ❌ Python introduction would violate architectural coherence and CDI governance
- ✅ React/framework introduction premature but should be reassessed at ~5,000+ LOC frontend

---

## Current State Analysis

### Repository Metrics (October 2025)

| Metric | Value | Assessment |
|--------|-------|------------|
| **Backend TypeScript** | 12,231 lines | Mature, well-structured codebase |
| **Frontend (vanilla JS/CSS/HTML)** | 2,382 lines | Manageable without framework |
| **Test Files** | 81 test files | Comprehensive test coverage |
| **Test Coverage** | 80% line, 75% branch | Meets Fortune 500 standards |
| **Dependencies** | ~40 production deps | Lean, well-justified (Phase 19 contract) |
| **Active Phase** | Phase 19 + 20 | Trust Spine + LangGraph orchestration |
| **Node Version** | 20.10.0+ | Modern, stable runtime |
| **ESLint Warnings** | 0 tolerance | Strict quality enforcement |

### Current Stack Definition (`ai-stack.json`)

```json
{
  "language": "TypeScript",
  "allowed_extensions": [".ts", ".js", ".json", ".html", ".css", ".md"],
  "forbidden_extensions": [".py", ".rb", ".php", ".java"],
  "frontend": {
    "location": "/public",
    "allowed_frameworks": "none - vanilla JS/CSS only",
    "constraint": "No React, Vue, or other frameworks in /public"
  }
}
```

### Constraints Rationale (From Repository Documentation)

1. **TypeScript-Only Backend**
   - **Source:** `ai-stack.json`, `AGENTS.md`, Phase 19 contract
   - **Justification:** 
     - Fortune 500-grade TypeScript agent frameworks are production-ready (LangGraph.js, Vercel AI SDK 5, OpenAI Agents SDK)
     - Klarna (85M users), Uber, LinkedIn have validated TypeScript for autonomous systems
     - Maintains single-language stack for AI agent consistency
     - Full MCP v1.20.0, OpenTelemetry, OAuth 2.1 support in TypeScript
   - **Evidence:** `docs/Goal_&_Vision_inspirational_only/03_final_decisions/01a_final_research_Claude.md` (193 lines of enterprise validation)

2. **No Python**
   - **Source:** Protected by `CODEOWNERS`, enforced by CI
   - **Justification:**
     - Prevents language fragmentation in AI-powered code generation
     - TypeScript ecosystem achieved parity for orchestration and execution
     - Python retains dominance only in model training (out of scope for executor)
     - Microservices architecture preferred if Python-specific tools needed
   - **Current State:** No Python files exist; references only in test fixtures for clarification suggestions

3. **Vanilla JS Frontend**
   - **Source:** `ai-stack.json`, `AGENTS.md`
   - **Justification:**
     - Current frontend: 2,382 lines (manageable without framework)
     - Simple UI patterns: forms, SSE streaming, file preview, debugging panels
     - No complex state management, routing, or component reuse patterns yet
     - Framework overhead (~500KB React + bundler) not justified
   - **Future Threshold:** Consider frameworks when frontend exceeds ~5,000 LOC or requires complex state management

4. **Minimal Dependency Philosophy**
   - **Source:** Phase 19 contract, CDI infrastructure
   - **Justification:**
     - Every dependency requires explicit justification in discovery notes
     - Supply chain security via SBOM (SPDX + CycloneDX) and SLSA provenance
     - Phase 19 added 8 justified deps for Trust Spine (OpenTelemetry, CycloneDX, SLSA tooling)
   - **Governance:** New deps require discovery note + CODEOWNERS approval for protected files

---

## When to Introduce New Technologies: Decision Framework

### Framework for Technology Adoption

```
┌─────────────────────────────────────────────────────────────┐
│                   Technology Adoption Matrix                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: REJECT                                           │
│  ├─ Violates stack constraints (Python, forbidden langs)   │
│  ├─ Solves problem already solved in current stack        │
│  └─ No Fortune 500 production evidence                     │
│                                                             │
│  Phase 2: DEFER (Future Phase)                            │
│  ├─ Valid use case but premature for MVP                   │
│  ├─ Complexity threshold not yet reached                   │
│  └─ Document in backlog with specific trigger conditions   │
│                                                             │
│  Phase 3: PILOT (Feature-Flagged)                         │
│  ├─ Strong justification with evidence                     │
│  ├─ Non-breaking, additive change                          │
│  ├─ Feature flag for safe rollback                         │
│  └─ Requires discovery note + CODEOWNERS approval          │
│                                                             │
│  Phase 4: ADOPT (Full Integration)                        │
│  ├─ Pilot successful with evidence bundle                  │
│  ├─ Update ai-stack.json and governance docs              │
│  ├─ Add to CDI validation pipeline                         │
│  └─ Train team, update onboarding materials               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Evaluation Criteria (Scored 0-5 Each)

| Criterion | Weight | Threshold |
|-----------|--------|-----------|
| **Business Value** | 3x | Must score ≥4 |
| **Technical Maturity** | 2x | Must score ≥4 |
| **Team Expertise** | 1x | Score ≥3 (team proficient in most languages) |
| **Maintainability Impact** | 2x | Must score ≥3 |
| **Security/Compliance** | 3x | Must score ≥4 |
| **Ecosystem Fit** | 2x | Must score ≥3 |

**Scoring Guide:**
- **5:** Exceptional - Industry best practice, proven at scale
- **4:** Strong - Production-ready with Fortune 500 adoption
- **3:** Adequate - Mature but not dominant
- **2:** Weak - Experimental or niche
- **1:** Poor - Unstable or uncommon
- **0:** Unacceptable - Violates constraints or unproven

**Weighted Score Formula:** `(Business*3 + Technical*2 + Team*1 + Maintainability*2 + Security*3 + Ecosystem*2) / 13`

**Decision Thresholds:**
- **≥4.0:** PILOT (with feature flag)
- **3.0-3.9:** DEFER (document in backlog)
- **<3.0:** REJECT

---

## Specific Technology Assessments

### 1. Python Integration

**Scenario:** "We need a Python library for [specific task]"

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Business Value | 2 | Rare - TypeScript ecosystem covers 95% of executor needs |
| Technical Maturity | 5 | Python ML ecosystem is industry-leading |
| Team Expertise | 5 | Team proficient in Python |
| Maintainability | 1 | Language fragmentation breaks AI agent coherence |
| Security/Compliance | 2 | Complicates SBOM, increases supply chain surface |
| Ecosystem Fit | 0 | **VIOLATES** stack constraints (forbidden_extensions) |

**Weighted Score:** `(2*3 + 5*2 + 5*1 + 1*2 + 2*3 + 0*2) / 13 = 2.46`

**Decision:** ❌ **REJECT**

**Rationale:**
- Violates protected `ai-stack.json` constraints
- TypeScript agent frameworks achieved Fortune 500 production parity (LangGraph.js at Klarna/Uber/LinkedIn)
- Python dominance limited to model training (out of scope for executor MVP)
- CDI governance enforces single-language stack for AI-powered code generation consistency

**Alternative Approaches:**
1. **Find TypeScript equivalent** - Check npm for comparable libraries
2. **Microservices architecture** - If absolutely necessary, deploy Python service separately with API interface
3. **WebAssembly** - Compile Python libraries to WASM (experimental, not recommended for MVP)
4. **Re-evaluate in Phase 21+** - If model training/fine-tuning becomes in-scope

**When Python Would Be Justified:**
- Model training infrastructure (e.g., fine-tuning Claude/GPT on executor-specific tasks)
- Advanced ML pipelines requiring PyTorch/TensorFlow
- Research prototypes (separate from production executor)
- Explicitly scoped as Python microservice with API contract

---

### 2. React/Vue/Angular Frontend Framework

**Scenario:** "Frontend is getting complex, should we introduce React?"

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Business Value | 3 | Marginal - current UI is manageable |
| Technical Maturity | 5 | React is industry standard |
| Team Expertise | 5 | Team proficient in React |
| Maintainability | 3 | Improves component reuse but adds build complexity |
| Security/Compliance | 4 | Mature security practices, large dependency tree |
| Ecosystem Fit | 2 | Current stack explicitly forbids frameworks in /public |

**Weighted Score:** `(3*3 + 5*2 + 5*1 + 3*2 + 4*3 + 2*2) / 13 = 3.69`

**Decision:** ⏸️ **DEFER** (until threshold reached)

**Rationale:**
- Frontend is only 2,382 lines - manageable with vanilla JS
- Current UI patterns are simple: forms, SSE, file preview, debug panels
- No complex state management, routing, or deeply nested components
- Framework overhead (~500KB minified + build tooling) not justified yet
- Phase 19 Strategy explicitly calls for "vanilla JS chat UI" without frameworks

**Specific Thresholds to Trigger Re-evaluation:**

| Threshold | Current | Target | Status |
|-----------|---------|--------|--------|
| **Frontend LOC** | 2,382 | 5,000+ | ✅ Not reached |
| **Number of distinct UI "pages"** | 3-4 | 10+ | ✅ Not reached |
| **Component reuse instances** | Low | High (5+ components used 3+ times) | ✅ Not reached |
| **State management complexity** | Simple (local + SSE) | Redux-level complexity | ✅ Not reached |
| **Team velocity bottleneck** | No | Yes (vanilla JS slowing development) | ✅ Not reached |
| **External developer contributions** | Internal only | Open-source contributors | ✅ Not reached |

**Decision Protocol When Threshold Reached:**

```markdown
## Frontend Framework Adoption - Discovery Phase

1. **Quantify Current Pain Points**
   - Measure: Lines of duplicated UI code
   - Measure: Time spent on manual DOM manipulation
   - Measure: Bug density in frontend vs backend
   - Evidence: Developer survey on velocity bottlenecks

2. **Create Discovery Note**
   - Document: Exact files/patterns that need framework
   - Prototype: Small conversion (e.g., clarification form → React)
   - Benchmark: Bundle size impact, load time impact
   - Compliance: Verify framework doesn't break CSP, accessibility

3. **Framework Selection Criteria**
   - **React:** Industry standard, mature ecosystem (preferred)
   - **Preact:** Lightweight (3KB), React-compatible API (good for MVP scale)
   - **Lit:** Web Components, smallest footprint (1.5KB), future-proof
   - **Alpine.js:** Minimal (~15KB), keeps HTML-first approach (compromise)

4. **Pilot Implementation**
   - Feature flag: `FRONTEND_FRAMEWORK=react|preact|lit|none`
   - Scope: Convert one complex component (e.g., repair timeline)
   - Evidence: Before/after metrics (LOC, maintainability, performance)
   - Duration: 1-2 weeks max

5. **Adoption Gate**
   - Required evidence:
     - 20%+ reduction in frontend maintenance time
     - No regression in Lighthouse scores
     - No accessibility violations (axe-core)
     - Team consensus (4/5 developers approve)
   - Update: `ai-stack.json` → `"frontend.allowed_frameworks": ["react"]`
   - Update: `AGENTS.md`, `.github/copilot-instructions.md`
   - Add: Build pipeline, ESLint rules, Vitest React testing utils
```

**Immediate Actions:**
- ✅ Document threshold in `issues/backlog.md`
- ✅ Set up LOC tracking in CI (warn when >4,000 lines)
- ✅ Create `.automation/frontend_framework_decision_template.md` for future use

---

### 3. Additional Backend Dependencies (e.g., LangGraph, Temporal, Kafka)

**Phase 19 Already Approved (via Contract):**
- ✅ `@langchain/langgraph@0.6.10` - LangGraph orchestrator (feature-flagged)
- ✅ `@opentelemetry/*` packages - Trust Spine observability
- ✅ `@cyclonedx/cyclonedx-npm` - SBOM generation
- ✅ `@sigstore/cli` - SLSA provenance

**Future Considerations:**

#### Temporal (Workflow Orchestration)

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Business Value | 4 | Strong for durable, long-running agent workflows |
| Technical Maturity | 5 | Production-proven at Uber, Netflix, Stripe |
| Team Expertise | 3 | Learning curve but team is proficient |
| Maintainability | 3 | Adds operational complexity (Temporal server required) |
| Security/Compliance | 4 | Enterprise-grade, used in Fortune 500 |
| Ecosystem Fit | 4 | TypeScript SDK production-ready, OpenAI Agents SDK integration |

**Weighted Score:** `(4*3 + 5*2 + 3*1 + 3*2 + 4*3 + 4*2) / 13 = 3.92`

**Decision:** ⏸️ **DEFER** (Phase 21+ - if LangGraph checkpoints prove insufficient)

**Trigger Conditions:**
- LangGraph checkpoints cannot handle >1 hour workflow pauses
- Need for workflow versioning with live migration
- Multi-cluster deployment with global state coordination

#### Kafka/Redis Streams (Event Streaming)

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Business Value | 2 | BullMQ + Redis already handles current queue needs |
| Technical Maturity | 5 | Industry standard for event streaming |
| Team Expertise | 4 | Team proficient |
| Maintainability | 2 | Significant operational overhead (cluster management) |
| Security/Compliance | 4 | Mature but complex |
| Ecosystem Fit | 3 | Overkill for current scale |

**Weighted Score:** `(2*3 + 5*2 + 4*1 + 2*2 + 4*3 + 3*2) / 13 = 3.31`

**Decision:** ⏸️ **DEFER** (Phase 22+ - if event volume exceeds BullMQ capacity)

**Trigger Conditions:**
- Event throughput >10,000 jobs/minute sustained
- Need for event replay/time-travel debugging at scale
- Multi-tenant isolation requirements exceed Redis capabilities

---

### 4. Python for Model Training/Fine-Tuning (Separate Service)

**Scenario:** "We want to fine-tune Claude on executor-specific code patterns"

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Business Value | 5 | High - improves agent quality over time |
| Technical Maturity | 5 | Python is dominant in ML training |
| Team Expertise | 5 | Team proficient in Python |
| Maintainability | 4 | Isolated service with API contract (acceptable) |
| Security/Compliance | 4 | Mature ML security practices in Python |
| Ecosystem Fit | 4 | **Acceptable if deployed as separate microservice** |

**Weighted Score:** `(5*3 + 5*2 + 5*1 + 4*2 + 4*3 + 4*2) / 13 = 4.54`

**Decision:** ✅ **PILOT** (Phase 22+ - when training becomes in-scope)

**Architecture Requirements:**

```
┌────────────────────────────────────────────────────┐
│              UMCA Executor (TypeScript)            │
│  ├─ Express API                                    │
│  ├─ LangGraph Orchestrator                        │
│  ├─ StepQueue Pipeline                            │
│  └─ ...                                            │
└─────────────────┬──────────────────────────────────┘
                  │ HTTP/gRPC API Contract
                  │ (OpenAPI 3.1 spec)
                  ▼
┌────────────────────────────────────────────────────┐
│         Training Service (Python)                  │
│  ├─ FastAPI                                        │
│  ├─ PyTorch/TensorFlow                            │
│  ├─ Fine-tuning pipelines                         │
│  └─ Model versioning                              │
└────────────────────────────────────────────────────┘
       │                              │
       ▼                              ▼
   PostgreSQL                    S3/Cloud Storage
  (training data)               (model artifacts)
```

**Governance for Python Microservice:**
1. ✅ **Separate repository** - `umca-training-service` (does not violate executor stack)
2. ✅ **API contract** - OpenAPI 3.1 spec, versioned endpoints
3. ✅ **Independent deployment** - Docker, Kubernetes, or serverless
4. ✅ **SBOM + Provenance** - Same standards as TypeScript (CycloneDX, SLSA)
5. ✅ **Monitoring** - OpenTelemetry integration with executor traces
6. ✅ **Discovery note** - Documents integration points in executor

**Example API Contract:**

```typescript
// In executor (TypeScript) - client for training service
interface TrainingServiceClient {
  submitTrainingJob(params: {
    trainingData: string[]; // S3 URIs
    modelType: 'claude-3.5-sonnet' | 'gpt-4';
    hyperparameters: Record<string, unknown>;
  }): Promise<{ jobId: string }>;

  getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    metrics?: { loss: number; accuracy: number };
  }>;

  downloadModel(jobId: string): Promise<{ modelUri: string }>;
}
```

**Why This Is Acceptable:**
- Does not introduce Python into executor codebase
- Maintains TypeScript-only constraint for AI-powered code generation
- Follows microservices best practices
- Each service maintains language-appropriate tech stack
- Clear API boundaries enable independent evolution

---

## Industry Best Practices Alignment

### Fortune 500 TypeScript Agent Systems

**Production Deployments (from Phase 19 Research):**

1. **Klarna** - 85M users, LangGraph.js
   - Tech: TypeScript orchestration, Claude backend
   - Scale: 80% faster customer resolution (700 FTE equivalent)
   - Lesson: TypeScript is production-ready for autonomous systems

2. **Uber** - Developer tools
   - Tech: LangGraph.js for internal coding assistants
   - Impact: 21,000 hours saved
   - Lesson: TypeScript handles complex multi-agent workflows

3. **LinkedIn** - SQL Bot
   - Tech: TypeScript-based agent for self-service data access
   - Lesson: Type safety critical for enterprise reliability

**Key Insights:**
- ✅ TypeScript achieved parity with Python for orchestration/execution
- ✅ Python dominance limited to model training (outside executor scope)
- ✅ Single-language stacks preferred for AI agent coherence
- ✅ Feature flags + observability essential for enterprise rollout

### Maintainability at Scale

**Industry Thresholds for Framework Adoption:**

| Scale | Frontend Strategy | Justification |
|-------|-------------------|---------------|
| **<3,000 LOC** | Vanilla JS | Overhead not justified |
| **3,000-5,000 LOC** | Consider lightweight (Alpine.js, Lit) | Evaluate on pain points |
| **5,000-10,000 LOC** | Adopt framework (React, Preact) | Component reuse critical |
| **>10,000 LOC** | Full framework + state management | Essential for maintainability |

**Executor MVP Status:** 2,382 LOC → Vanilla JS appropriate ✅

### Security & Compliance

**OWASP Top 10 for LLM Applications 2025:**
- ✅ **LLM01 Prompt Injection** - TypeScript has `vard`, `llm-guard` libraries
- ✅ **LLM03 Supply Chain** - SBOM (SPDX, CycloneDX) + SLSA provenance implemented
- ✅ **LLM06 Excessive Agency** - MCP governance planned (Phase 19 U1)
- ✅ **LLM08 Vector/Embeddings** - TypeScript RAG libraries available

**NIST SP 800-218A (AI/ML Security):**
- ✅ Isolated environments - Docker, Cloudflare Workers sandboxing
- ✅ Model versioning - Supports via artifact storage
- ✅ Data provenance - SBOM tracks data dependencies
- ⚠️ Adversarial testing - Fewer TypeScript tools vs Python (addressable via microservices)

**EU AI Act Compliance (August 2025 active):**
- ✅ Technical documentation - TypeScript supports
- ✅ Transparency - Audit logs via OpenTelemetry
- ✅ Human oversight - HITL planned (Phase 19 U1)
- ✅ Risk management - Feature flags + rollback plans

**Assessment:** TypeScript meets Fortune 500 compliance standards (4/5 rating from Claude research)

---

## Recommendations

### Immediate (MVP / Phase 19-20)

1. ✅ **MAINTAIN Current Constraints**
   - TypeScript-only backend
   - Vanilla JS frontend
   - No Python in executor codebase
   - Minimal, justified dependencies

2. ✅ **Complete Phase 19 Deliverables**
   - Trust Spine (CycloneDX, SLSA, OpenTelemetry, RFC 9457)
   - LangGraph infrastructure (feature-flagged)
   - Executions endpoint (Phase 20 - complete)
   - Evidence collection for Gate G2

3. ✅ **Document Future Thresholds**
   - Create `issues/backlog.md` entry: "Frontend Framework Evaluation"
   - Trigger: Frontend >5,000 LOC
   - Template: `.automation/frontend_framework_decision_template.md`

4. ✅ **Set Up Monitoring**
   - CI job: Track frontend LOC growth
   - Alert: Warn at 4,000 LOC (1 phase before threshold)
   - Dashboard: Display metrics in `WHERE_AM_I.json`

### Short-Term (Phase 21-22)

1. ⏸️ **Re-evaluate Frontend Framework** (if threshold reached)
   - Conduct discovery phase per template
   - Pilot: React component conversion (1-2 weeks)
   - Evidence: Maintainability metrics, performance impact
   - Decision: Adopt or extend vanilla JS patterns

2. ⏸️ **Assess Temporal Integration** (if LangGraph insufficient)
   - Use case: Workflows >1 hour pause duration
   - Discovery: Integration with existing checkpoint system
   - Pilot: Feature-flagged for long-running tasks

3. ✅ **Evaluate Edge Deployment** (Phase 19 E2 - optional)
   - Cloudflare Workers or Vercel Edge Functions
   - Use case: Global latency requirements
   - Evidence: Cost analysis, performance benchmarks

### Long-Term (Phase 23+)

1. ⏸️ **Training Service (Python Microservice)** - if fine-tuning in-scope
   - Separate repository: `umca-training-service`
   - API contract: OpenAPI 3.1 spec
   - Architecture: Microservices with clear boundaries
   - Governance: Same SBOM/provenance standards

2. ⏸️ **Multi-Agent Specialization** (Phase 19 MA2)
   - Planner, Implementer, Tester, Critic, Security agents
   - Architecture: LangGraph subgraphs
   - No new languages required (TypeScript-based)

3. ⏸️ **Advanced Observability**
   - Langfuse dashboards (already planned)
   - Custom eval frameworks
   - A/B testing infrastructure

---

## Anti-Patterns to Avoid

### ❌ Don't Do This

1. **"Let's add Python because it's easier"**
   - Violates architectural coherence
   - TypeScript ecosystem is sufficient for 95% of executor needs
   - If truly necessary, use microservices architecture

2. **"React will solve our frontend problems"**
   - Framework won't fix poor component design
   - Adds complexity without measuring current pain
   - Wait for objective thresholds (>5,000 LOC, reuse patterns)

3. **"Everyone else uses [technology], so should we"**
   - Context matters: executor is AI-powered code generation
   - Single-language stack critical for AI agent consistency
   - Fortune 500 TypeScript adoption validates current approach

4. **"We'll refactor to proper architecture later"**
   - Phase-based development requires evidence at each gate
   - CDI governance prevents "move fast and break things"
   - Quality over speed: "Ship perfect or never"

5. **"This is just a quick experiment"**
   - Every code change requires discovery note
   - Feature flags mandatory for new runtimes
   - No assumptions - document integration points

### ✅ Do This Instead

1. **Evidence-Driven Decisions**
   - Quantify pain points with metrics
   - Prototype with feature flags
   - Collect evidence before adoption

2. **Phased Rollout**
   - Discovery → Pilot → Adopt
   - Rollback plans for every change
   - Gate reviews with evidence bundles

3. **Architectural Coherence**
   - Maintain TypeScript-first for executor
   - Use microservices for language-specific needs
   - Clear API contracts between services

4. **Team Collaboration**
   - Document decision frameworks
   - Share threshold templates
   - Consensus-based adoption (4/5 developers)

---

## Conclusion

The repository's **TypeScript-only, vanilla JS frontend constraints are well-founded** and should remain in place for the MVP. These restrictions:

1. ✅ Align with Fortune 500 TypeScript agent deployments (Klarna, Uber, LinkedIn)
2. ✅ Support autonomous system requirements (LangGraph, OpenTelemetry, MCP)
3. ✅ Enable supply chain security (SBOM, SLSA, RFC 9457)
4. ✅ Maintain architectural coherence for AI-powered code generation
5. ✅ Keep complexity appropriate for current scale (2,382 LOC frontend)

**Strategic expansion is appropriate when:**
- Frontend exceeds 5,000 LOC with measurable reuse patterns
- LangGraph checkpoints insufficient for >1 hour workflow pauses
- Model training becomes in-scope (Python microservice, not in executor)
- Edge deployment justifies Temporal orchestration

**The team's proficiency in multiple languages is an asset** - but should be applied via microservices architecture when language-specific tools are needed, not by fragmenting the executor codebase.

**Next Steps:**
1. Complete Phase 19 Trust Spine deliverables
2. Document thresholds in `issues/backlog.md`
3. Set up LOC monitoring in CI pipeline
4. Create decision templates for future evaluations

---

## Appendix: Decision Templates

### A. Frontend Framework Evaluation Template

**Location:** `.automation/frontend_framework_decision_template.md`

```markdown
# Frontend Framework Evaluation - [Date]

## Trigger Conditions Met
- [ ] Frontend LOC >5,000 (current: X)
- [ ] Component reuse instances >5 (current: X)
- [ ] State management complexity high
- [ ] Team velocity bottleneck identified

## Pain Points (Quantified)
1. [Metric]: [Value] (e.g., "Lines of duplicated code: 450")
2. [Metric]: [Value]
3. [Metric]: [Value]

## Framework Candidates
- [ ] React - Industry standard, large ecosystem
- [ ] Preact - Lightweight (3KB), React-compatible
- [ ] Lit - Web Components, future-proof (1.5KB)
- [ ] Alpine.js - Minimal (15KB), HTML-first

## Pilot Scope
- Component to convert: [Name]
- Duration: 1-2 weeks
- Feature flag: `FRONTEND_FRAMEWORK=[value]`

## Evidence Required
- [ ] 20%+ reduction in maintenance time
- [ ] No Lighthouse score regression
- [ ] No accessibility violations (axe-core)
- [ ] Team consensus (4/5 developers approve)

## Decision
- [ ] Adopt (update ai-stack.json, AGENTS.md)
- [ ] Extend pilot (specific concerns to address)
- [ ] Reject (maintain vanilla JS, document rationale)
```

### B. New Dependency Evaluation Template

**Location:** `.automation/dependency_evaluation_template.md`

```markdown
# Dependency Evaluation - [Package Name]

## Scoring Matrix

| Criterion | Score (0-5) | Justification |
|-----------|-------------|---------------|
| Business Value | X | |
| Technical Maturity | X | |
| Team Expertise | X | |
| Maintainability Impact | X | |
| Security/Compliance | X | |
| Ecosystem Fit | X | |

**Weighted Score:** [Calculate per formula]

## Decision
- [ ] PILOT (score ≥4.0)
- [ ] DEFER (score 3.0-3.9)
- [ ] REJECT (score <3.0)

## Integration Plan (if PILOT)
- Feature flag: [Name]
- Affected files: [List]
- Rollback plan: [Steps]
- Test coverage: [%]
- Evidence artifacts: [List]

## References
- [ ] Discovery note created
- [ ] CDI compliance verified
- [ ] CODEOWNERS approval (if protected files)
```

---

**Approved By:** [Pending MCA review]  
**Next Review:** After Phase 20 completion (Gate G2)  
**Living Document:** Update as new evidence emerges
