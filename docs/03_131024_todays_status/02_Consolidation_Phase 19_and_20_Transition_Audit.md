Final Consolidated Plan: Phase 19/20 Implementation
Answering Your Questions + Complete Roadmap
Question 1: CycloneDX/SLSA - Now or Defer?
Your Answer: "No placeholders - bad practice, causes drift. Transitioning to production soon."
✅ Recommendation: Implement NOW (Not Placeholders)
Why I agree:
You're right about drift: Placeholders create technical debt and confusion
Fortune 500 readiness: Production deployments REQUIRE actual SBOMs, not stubs
Gate G2 blocks everything: Trust Spine must complete before HITL/MCP work
Dependencies are lightweight: No heavy frameworks, just CLI tools
Implementation Plan: CycloneDX + SLSA
A. CycloneDX SBOM (1-2 hours)
Install dependencies:
npm install --save-dev @cyclonedx/cyclonedx-npm
Create script: scripts/generate-cyclonedx.js
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

try {
  const result = execSync('npx @cyclonedx/cyclonedx-npm --output-file sbom.cdx.json', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('✅ CycloneDX SBOM generated: sbom.cdx.json');
} catch (error) {
  console.error('❌ CycloneDX generation failed:', error.message);
  process.exit(1);
}
Add npm script (package.json):
{
  "scripts": {
    "sbom:cyclonedx": "node scripts/generate-cyclonedx.js",
    "sbom:all": "npm run sbom && npm run sbom:cyclonedx"
  }
}
Update CI (.github/workflows/cdi-validation.yml):
- name: Generate CycloneDX SBOM
  run: npm run sbom:cyclonedx
- name: Upload CycloneDX SBOM
  uses: actions/upload-artifact@v3
  with:
    name: sbom-cyclonedx
    path: sbom.cdx.json
Evidence location: .automation/evidence/G2/sbom.cdx.json
B. SLSA Provenance (1-2 hours)
Install dependencies:
npm install --save-dev @sigstore/cli  # or use slsa-github-generator
Create script: scripts/generate-provenance.js
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Generate SHA256 of build artifacts
function generateArtifactHashes() {
  const artifacts = ['dist/', 'sbom.spdx.json', 'sbom.cdx.json'];
  return artifacts.map(path => {
    try {
      const content = readFileSync(path, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');
      return { name: path, sha256: hash };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// SLSA v1.0 provenance (simplified)
const provenance = {
  _type: "https://in-toto.io/Statement/v1",
  subject: generateArtifactHashes(),
  predicateType: "https://slsa.dev/provenance/v1",
  predicate: {
    buildDefinition: {
      buildType: "https://github.com/yousef/executor-mvp/build/v1",
      externalParameters: {
        source: { uri: process.env.GITHUB_REPOSITORY || "local" },
        ref: process.env.GITHUB_REF || "main"
      }
    },
    runDetails: {
      builder: { id: "https://github.com/actions/runner/v2" },
      metadata: {
        invocationId: process.env.GITHUB_RUN_ID || "local",
        startedOn: new Date().toISOString()
      }
    }
  }
};

writeFileSync('provenance.intoto.jsonl', JSON.stringify(provenance) + '\n');
console.log('✅ SLSA provenance generated: provenance.intoto.jsonl');
Add npm script:
{
  "scripts": {
    "provenance": "node scripts/generate-provenance.js"
  }
}
Evidence location: .automation/evidence/G2/provenance.intoto.jsonl
C. JSONL Action Logs (30 min)
Extend existing: src/telemetry/events.ts:70 Add dual-write:
import { appendFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

function actionLogEnabled(): boolean {
  return process.env.ACTION_LOG_JSONL === '1' || process.env.ACTION_LOG_JSONL === 'true';
}

export async function logEvent(event: string, metadata?: Record<string, unknown>): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, event, ...metadata };
  
  // Existing trace.jsonl logic...
  await appendFile(path.join(AUTOMATION_DIR, 'execution_trace.jsonl'), JSON.stringify(entry) + '\n');
  
  // NEW: Dual-write to actions.jsonl when enabled
  if (actionLogEnabled()) {
    try {
      const actionsPath = path.join(AUTOMATION_DIR, 'actions.jsonl');
      mkdirSync(path.dirname(actionsPath), { recursive: true });
      appendFileSync(actionsPath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      console.warn('⚠️ Failed to write action log:', err);
    }
  }
}
Evidence location: .automation/evidence/G2/actions.jsonl
D. OTel GenAI Spans (2-3 hours)
Install dependencies:
npm install --save @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-http
npm install --save-dev @opentelemetry/sdk-trace-base
Implement in: src/telemetry/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export function maybeInitTelemetry(): void {
  if (started || !isTelemetryEnabled()) return;
  
  try {
    const exporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    });
    
    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'executor-mvp',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0'
      }),
      traceExporter: exporter
    });
    
    sdk.start();
    console.log('✅ OpenTelemetry initialized');
    started = true;
  } catch (err) {
    console.warn('⚠️ OTel init failed (continuing without tracing):', err);
  }
}

export function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}
Wire into server.ts:
import { maybeInitTelemetry, shutdownTelemetry } from './telemetry/otel.js';

// Early in server.ts startup
maybeInitTelemetry();

// Add graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  process.exit(0);
});
Evidence location: .automation/evidence/G2/otel_trace_export.json (sample span export)
E. RFC 9457 Fixes (30 min)
Current issues in src/middleware/problemDetails.ts:19:
Extension naming: "urn:ts" should be "occurred_at" (no colons)
Title for about:blank: Should use HTTP reason phrase ("Bad Request", not "BadRequest")
Validation errors: Need structured format
Fixed version:
export function toProblem(
  status: number, 
  title: string, 
  detail: string, 
  instance: string, 
  type = "about:blank",
  extras?: Record<string, unknown>
): ProblemDetails {
  // RFC 9457: When type is about:blank, title SHOULD be HTTP reason phrase
  const normalizedTitle = type === "about:blank" ? getHttpReasonPhrase(status) : title;
  
  return {
    type,
    title: normalizedTitle,
    status,
    detail,
    instance,
    occurred_at: new Date().toISOString(),  // Fixed: no colons in extension names
    ...(extras || {})
  };
}

function getHttpReasonPhrase(status: number): string {
  const phrases: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error"
  };
  return phrases[status] || "Error";
}

// NEW: Validation error helper
export function toValidationProblem(
  instance: string,
  errors: Array<{ pointer: string; detail: string }>
): ProblemDetails {
  return {
    type: "https://api.executor-mvp.com/problems/validation-error",
    title: "Bad Request",
    status: 400,
    detail: "Request validation failed",
    instance,
    occurred_at: new Date().toISOString(),
    errors  // JSON Pointer format per RFC 9457
  };
}
Evidence location: .automation/evidence/G2/errors_rfc9457.jsonl (sample error responses)
Gate G2 Acceptance Criteria (Trust Spine Complete)
From Gate_Checklist_Phase19:42-54: ✅ CycloneDX 1.6 SBOM generated → npm run sbom:cyclonedx produces sbom.cdx.json
✅ SLSA v1.0 provenance emitted → npm run provenance produces provenance.intoto.jsonl
✅ OTel GenAI traces visible → OTEL_ENABLED=1 npm run dev exports spans to collector
✅ JSONL action logs stored → ACTION_LOG_JSONL=1 dual-writes to actions.jsonl
✅ RFC 9457 error envelopes present → Tests validate Content-Type: application/problem+json CI Commands (must pass):
npm run lint           # 0 warnings
npm run typecheck      # 0 errors
npm test               # >80% line, >75% branch
npm run sbom:all       # Both SPDX + CycloneDX
npm run provenance     # SLSA attestation
npm run contract:check # Schema valid
Evidence Bundle:
.automation/evidence/G2/
├── sbom.cdx.json                    # CycloneDX SBOM
├── provenance.intoto.jsonl          # SLSA provenance
├── otel_trace_export.json           # Sample span export
├── actions.jsonl                    # Action log sample
└── errors_rfc9457.jsonl             # Problem details samples
Question 2: Trust Spine T0 "Done" Criteria?
Your Answer: "Industry best practice, Fortune 500 approved quality."
✅ Gate G2 Defines "Done" (Already Documented)
Evidence: Gate_Checklist_Phase19:38-54 T0 is COMPLETE when:
All 5 artifacts generated:
CycloneDX SBOM (1.6+)
SLSA provenance (v1.0+)
OTel traces (exportable)
JSONL action logs
RFC 9457 error samples
CI passes with new commands:
npm run sbom:cyclonedx  # Exit 0
npm run provenance      # Exit 0
OTEL_ENABLED=1 npm test # No failures
ACTION_LOG_JSONL=1 npm run dev  # Logs dual-write
Evidence bundle uploaded:
Copy artifacts to .automation/evidence/G2/
Validate with ls -la .automation/evidence/G2/ (5 files minimum)
GATES_LEDGER updated:
Mark G2 status: "passed"
Attach evidence paths
Timestamp completion
No regression:
Existing tests pass
No new warnings
Coverage thresholds maintained
Industry Standards Met:
CycloneDX 1.6: OWASP-approved SBOM format (https://cyclonedx.org)
SLSA v1.0: Supply chain security framework (https://slsa.dev)
RFC 9457: HTTP API error standard (IETF)
OTel GenAI: LLM observability (https://opentelemetry.io/docs/specs/semconv/gen-ai/)
Question 3: Contract Naming & Backfilling?
Your Answer: "Hiring new devs soon - current naming causes confusion."
✅ Standardize NOW + Backfill Optional
Recommendation:
Document standard immediately (blocks confusion)
Apply to new contracts (Phase 19/20+)
Backfill legacy contracts = OPTIONAL (low priority)
A. Contract Naming Standard (Document in contracts/README.md)
File Naming:
NN_phase<ID>_<slug>_contract.json

Where:
- NN = Zero-padded sequential number (01, 02, ..., 19, 20)
- <ID> = Phase identifier (matches contract_meta.phase)
- <slug> = Kebab-case short description
Examples:
✅ 19_phase19_autonomous_transition_contract.json
✅ 20_phase20_langgraph_executions_contract.json
✅ 21_phase21_trust_spine_contract.json

❌ 4B1_adaptive_repair_contract.json (letter-number hybrid)
❌ 14b_PA-FIX2_dependency_preflight.json (lowercase, caps mix)
Contract Metadata (Inside JSON):
{
  "contract_version": "19.0.0",  // Semantic versioning
  "contract_meta": {
    "created": "2025-10-13",
    "phase": "19",               // Matches filename <ID>
    "phase_name": "Autonomous Transition",
    "prerequisite_phase": "Phase A, E",
    "supersedes": null,          // Or reference to old contract
    "status": "active"           // active | deprecated | completed
  }
}
B. Backfilling Legacy Contracts (OPTIONAL)
Option 1: Leave As-Is (Recommended for onboarding)
Pros: No risk, no work
Cons: Two naming styles coexist
Mitigation: Add README explaining both styles
Option 2: Rename + Redirect
Rename: 4B1_adaptive_repair_contract.json → 10_phase4b1_adaptive_repair_contract.json
Add deprecation notice in old location
Effort: ~2 hours for 22 contracts
Risk: Break automation if paths hardcoded
Recommended: Option 1 + Clear README README.md Example:
# Contract Naming

## Current Standard (Phase 19+)
`NN_phase<ID>_<slug>_contract.json`

Examples: `19_phase19_autonomous_transition_contract.json`

## Legacy Naming (Phase 0-16)
Mixed formats: `01_remediation_contract_v2.json`, `4B1_adaptive_repair_contract.json`

**For new developers**: Start with contracts 19+. Legacy contracts (01-16) use historical naming.

## Finding Contracts
- **By Phase**: Look for `"phase": "19"` in `contract_meta`
- **Active Work**: Check `CDI_INFRASTRUCTURE.md` "Current Phase" section
- **Contract Status**: `"status": "active"` = current execution
Question 4: Problem Details Default in Non-Prod?
Your Answer: "Probably yes - helps new devs pinpoint errors."
✅ Enable by Default in Dev/Test (Recommended)
Why I agree:
Better DX: Structured errors easier to debug than generic { error: "..." }
RFC compliant: Fortune 500 expects RFC 9457
No breaking change: Only affects dev/test environments
Future-proof: Prod rollout easier when clients already handle it
Implementation: RFC 9457 Corrections + Default-On
A. Fix Current Implementation
Issues in src/middleware/problemDetails.ts:
✅ Line 19: "urn:ts" → "occurred_at" (RFC 9457 extension naming)
✅ Line 12: title for about:blank should be HTTP reason phrase
✅ Missing validation error format (JSON Pointer)
Complete Fixed Version: (See Question 1 RFC 9457 section above for full code)
B. Environment-Based Defaults
Update src/middleware/problemDetails.ts:29:
export function problemDetailsEnabled(): boolean {
  // Explicit override
  if (process.env.PROBLEM_DETAILS_ENABLED !== undefined) {
    return truthy(process.env.PROBLEM_DETAILS_ENABLED);
  }
  
  // Default-on in dev/test, default-off in production
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  return nodeEnv === 'development' || nodeEnv === 'test';
}
Result:
Dev (NODE_ENV=development): RFC 9457 ON by default
Test (NODE_ENV=test): RFC 9457 ON by default
Prod (NODE_ENV=production): RFC 9457 OFF (requires explicit PROBLEM_DETAILS_ENABLED=1)
Override: Set PROBLEM_DETAILS_ENABLED=0 to force off in dev
C. Client Updates
Update tests (tests/api/*.test.ts):
it('returns RFC 9457 problem details on error', async () => {
  const res = await request(app)
    .get('/api/executions/invalid-id')
    .expect(404)
    .expect('Content-Type', /application\/problem\+json/);
  
  expect(res.body).toMatchObject({
    type: 'about:blank',  // or specific problem URI
    title: 'Not Found',   // HTTP reason phrase
    status: 404,          // Matches HTTP status
    detail: expect.any(String),
    instance: '/api/executions/invalid-id',
    occurred_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
  });
});
Update UI (public/index.html fetch handlers):
async function callAPI(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json'  // Signal support
    },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const contentType = res.headers.get('Content-Type');
    
    if (contentType?.includes('application/problem+json')) {
      const problem = await res.json();
      // Use structured error: problem.title, problem.detail, problem.errors
      showError(`${problem.title}: ${problem.detail}`);
      if (problem.errors) {
        problem.errors.forEach(err => console.error(`${err.pointer}: ${err.detail}`));
      }
    } else {
      // Fallback for legacy format
      const data = await res.json();
      showError(data.error || 'Unknown error');
    }
  }
}
D. Documentation: Problem Types
Create: docs/api/problem_types.md
# Problem Types

## Validation Error
**Type**: `https://api.executor-mvp.com/problems/validation-error`
**Status**: 400
**When**: Request body fails schema validation

**Example**:
```json
{
  "type": "https://api.executor-mvp.com/problems/validation-error",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/execute",
  "occurred_at": "2025-10-13T10:00:00Z",
  "errors": [
    { "pointer": "#/prompt", "detail": "Required field missing" }
  ]
}
Not Found
Type: about:blank (generic) Status: 404 When: Resource doesn't exist
Internal Error
Type: about:blank (generic) Status: 500 When: Unexpected server error

**Link from AGENTS.md**:
```markdown
## Error Handling (Phase 19+)

Use RFC 9457 problem details for all API errors:
- Helper: `respondWithProblem()` in `src/middleware/problemDetails.ts`
- Enabled by default in dev/test
- Documentation: `docs/api/problem_types.md`
- RFC: https://www.rfc-editor.org/rfc/rfc9457.html
Summary: RFC 9457 Rollout
Environment	Default	Override	Client Support
Development	✅ ON	PROBLEM_DETAILS_ENABLED=0	UI updated to parse
Test	✅ ON	PROBLEM_DETAILS_ENABLED=0	Tests assert RFC 9457 format
Production	❌ OFF	PROBLEM_DETAILS_ENABLED=1	Gradual rollout after client readiness
Benefits:
New devs see structured errors immediately
Tests validate correct RFC 9457 format
Prod rollout low-risk (explicit opt-in)
Fortune 500 compliance achieved
Complete Implementation Plan
Phase 1: Documentation & Governance (Day 1)
Create contracts (2-3 hours):
19_phase19_autonomous_transition_contract.json
20_phase20_langgraph_executions_contract.json
Update AGENTS.md (1 hour):
Add feature flags section
Add RFC 9457 requirement
Add CycloneDX/SLSA SBOM requirements
Update "Last Updated" to 2025-10-13
Update CDI_INFRASTRUCTURE.md (1 hour):
Change "Current Phase" to 19/20
Add Trust Spine section
Add feature flag workflow
Add problem types documentation link
Document contract naming (30 min):
Create contracts/README.md
Explain both legacy and new naming
Provide examples
Phase 2: Trust Spine Implementation (Day 2-3)
Install dependencies (10 min):
npm install --save-dev @cyclonedx/cyclonedx-npm @sigstore/cli
npm install --save @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-http
Implement CycloneDX (1 hour):
Create scripts/generate-cyclonedx.js
Add npm run sbom:cyclonedx
Test generation
Copy to evidence: .automation/evidence/G2/sbom.cdx.json
Implement SLSA (1-2 hours):
Create scripts/generate-provenance.js
Add npm run provenance
Test generation
Copy to evidence: .automation/evidence/G2/provenance.intoto.jsonl
Implement JSONL logs (30 min):
Extend src/telemetry/events.ts:logEvent()
Add ACTION_LOG_JSONL flag check
Test dual-write
Copy sample to evidence: .automation/evidence/G2/actions.jsonl
Implement OTel (2-3 hours):
Complete src/telemetry/otel.ts (replace placeholder)
Wire into src/server.ts startup
Add graceful shutdown
Export sample trace to evidence: .automation/evidence/G2/otel_trace_export.json
Fix RFC 9457 (1 hour):
Update src/middleware/problemDetails.ts with corrections
Add toValidationProblem() helper
Enable by default in dev/test
Copy error samples to evidence: .automation/evidence/G2/errors_rfc9457.jsonl
Phase 3: Testing & Validation (Day 4)
Add tests (2-3 hours):
Test CycloneDX generation
Test SLSA provenance
Test JSONL action log dual-write
Test OTel initialization (with/without flag)
Test RFC 9457 response format
Update existing tests (1 hour):
Update API tests to assert application/problem+json
Validate status matches HTTP status code
Check occurred_at timestamp format
Update UI (1 hour):
Add Accept: application/problem+json header
Parse structured errors
Display problem.errors for validation failures
Run full validation (30 min):
npm run lint           # Must: 0 warnings
npm run typecheck      # Must: 0 errors
npm test               # Must: >80% line, >75% branch
npm run sbom:all       # Must: Generate both SBOMs
npm run provenance     # Must: Generate SLSA
npm run contract:check # Must: Validate schemas
Phase 4: Evidence & Gates (Day 5)
Collect evidence (1 hour):
mkdir -p .automation/evidence/G2
cp sbom.cdx.json .automation/evidence/G2/
cp provenance.intoto.jsonl .automation/evidence/G2/
cp .automation/actions.jsonl .automation/evidence/G2/
# Export sample OTel trace
# Capture sample RFC 9457 error responses
Update GATES_LEDGER (30 min):
Create .automation/GATES_LEDGER.md (if not exists)
Mark G2 status: "passed"
Attach evidence paths
Timestamp: 2025-10-13
Update compliance report (30 min):
Fix audit script to run validation commands
Re-run: npm run audit:contracts (or equivalent)
Publish new report with timestamp
Create Phase 19/20 completion notes (30 min):
Document what was completed
Document what's pending (U1, P1, O1, MA2)
Note any deviations from plan
Phase 5: Rollout (Day 6+)
Merge to main:
Create PR with all Phase 19/20 work
Include evidence bundle
Reference contracts 19 + 20
Get approval (CODEOWNERS if needed)
Update onboarding docs:
Add "Getting Started with Phase 19" section
Explain feature flags
Link to problem types documentation
Provide troubleshooting guide
Team handoff:
Share contract naming standard
Demonstrate feature flag usage
Show evidence bundle structure
Review Trust Spine components
Deliverables Summary
Contracts:
✅ 19_phase19_autonomous_transition_contract.json (NEW)
✅ 20_phase20_langgraph_executions_contract.json (NEW)
Documentation:
✅ AGENTS.md (UPDATED: feature flags, RFC 9457, CycloneDX)
✅ CDI_INFRASTRUCTURE.md (UPDATED: Phase 19/20, Trust Spine)
✅ contracts/README.md (NEW: naming standard)
✅ docs/api/problem_types.md (NEW: RFC 9457 types)
Trust Spine (G2):
✅ CycloneDX SBOM generation
✅ SLSA provenance generation
✅ OTel GenAI span tracing
✅ JSONL action log dual-write
✅ RFC 9457 error responses (corrected)
Evidence:
✅ .automation/evidence/G2/sbom.cdx.json
✅ .automation/evidence/G2/provenance.intoto.jsonl
✅ .automation/evidence/G2/otel_trace_export.json
✅ .automation/evidence/G2/actions.jsonl
✅ .automation/evidence/G2/errors_rfc9457.jsonl
Tests:
✅ CycloneDX generation test
✅ SLSA provenance test
✅ RFC 9457 format validation
✅ OTel initialization test
✅ JSONL action log test
Risk Mitigation
Risk	Impact	Mitigation
New deps break build	High	Test in isolated branch; pin versions; validate in CI
OTel overhead	Medium	Env-gated; sampling configurable; monitor in dev first
RFC 9457 client breakage	Low	Default-off in prod; dual format support during transition
Contract naming confusion	Medium	Clear README; examples for new devs
Evidence collection missed	Medium	Automate in CI; checklist in PR template
Success Criteria
Trust Spine (G2) PASSED when:
✅ All 5 evidence artifacts generated
✅ CI validation passes (lint, typecheck, test, SBOM, provenance)
✅ No regressions (existing tests pass)
✅ GATES_LEDGER updated
✅ Documentation current
Ready for Next Milestone (U1: HITL/MCP) when:
✅ G2 passed
✅ Contracts 19/20 merged
✅ Team trained on new tooling
✅ Onboarding docs updated
Timeline
Phase	Duration	Dependencies	Blocker Risk
Documentation	4-5 hours	None	Low
Trust Spine	8-10 hours	Docs complete	Medium (new deps)
Testing	4-5 hours	Trust Spine	Low
Evidence	2-3 hours	Testing	Low
Rollout	2-3 hours	Evidence	Low
TOTAL	20-26 hours	Sequential	-
Estimated: 3-4 working days (assuming single developer, full-time)
Your Approval Needed
Ready to proceed with:
✅ Implement CycloneDX/SLSA NOW (no placeholders)
✅ Use Gate G2 criteria as "done" definition
✅ Document contract naming standard (backfill optional)
✅ Enable RFC 9457 by default in dev/test
Next step: I'll create the Phase 19/20 contracts and updated documentation files when you confirm.