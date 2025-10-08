# TRUST ENGINE + PREMIUM UX ROADMAP

## CONTEXT: WHERE WE ARE NOW

**Current System**: A fully functional autonomous coding system with:
- ✅ Self-testing loop (Phase 1 complete)
- ✅ Interactive clarification (Phase 2 complete)
- ✅ Multi-turn repair (Phase 3 complete)
- ✅ Task planning & progress (Phase 4 complete)
- ✅ Telemetry, metrics, and evidence collection
- ✅ Multi-agent coordination (RA/AA/IA/QA/SA/DBA/DA)

**What Needs Work**:
- 🔴 UI feels broken during long operations (no incremental progress)
- 🔴 Success output is raw JSON dump
- 🔴 No verification confidence scoring (users must manually verify)
- ⚠️ Missing signature "Trust Engine" capability

**Core Insight**: Your past projects (Save Guard, Encyclopedia, Dependency Checker) ARE the Trust Engine components. We're bringing them back together in a coherent architecture.

---

## PART 1: SIX-PHASE OVERVIEW (The Complete Journey)

### Phase A: UI Baseline Fixes (NEXT - 3 wins, ~3 hours)
**Goal**: Fix the most embarrassing UI issues that make the system look unprofessional.
**Success**: Success card instead of JSON dump, loading spinner with phases, better error messages.
**Timeline**: Single afternoon

### Phase B: Trust Engine Foundation (8 wins, ~6-8 hours)
**Goal**: Build the core verification spine - code generated WITH proof of correctness.
**Success**: Every generation includes: auto-generated tests, security scan, dependency validation, confidence score. No more manual verification.
**Timeline**: 2-3 days
**Why this matters**: This is your signature moment. The thing that makes your tool different from everyone else.

### Phase C: Real-Time Progress (SSE + Monitoring) (6 wins, ~5-6 hours)
**Goal**: Users see incremental progress during long operations instead of frozen screen.
**Success**: Task Plan UI updates in real-time, progress bar advances, subtasks show completion status.
**Timeline**: 2 days

### Phase D: Save Guard Revival (Pre-Save Validation) (7 wins, ~6-7 hours)
**Goal**: Resurrect Save Guard concept - validate code BEFORE it's written to disk.
**Success**: AI can't save files with lint errors, security issues, or pattern violations. Auto-fix engine handles minor issues. Waiver system for edge cases.
**Timeline**: 2-3 days
**Why this matters**: Prevents bad code from ever entering the repository.

### Phase E: Encyclopedia Integration (Pattern Enforcement) (6 wins, ~5-6 hours)
**Goal**: Resurrect Encyclopedia concept - enforce coding standards through knowledge base.
**Success**: AI follows project-specific patterns, coding standards are consistent, no context drift.
**Timeline**: 2 days

### Phase F: Advanced Trust Features (Optional) (8+ wins, ~8-10 hours)
**Goal**: Property-based testing, formal verification, architectural compliance.
**Success**: Highest confidence possible - mathematical proofs for critical paths.
**Timeline**: 3-4 days
**Note**: Only if you want "trust on steroids"

**Total Journey**: ~30-40 hours from current state to "Trust Engine + Premium UX"

---

## PART 2: PHASE A DETAILED BREAKDOWN (UI Baseline Fixes - 3 Wins)

**Phase A Goal**: Fix embarrassing UI issues FAST so you can demo without apologizing.

---

### Win #A1: Success Card (Replace JSON Dump)
**What**: Replace raw JSON output with formatted success card showing metrics, files, actions.

**Why**: After 5-minute wait, users deserve better than wall of text. This is the most visible problem.

**Who**: Lead developer (you + AI)

**How**:
1. Create `renderSuccessCard()` function in `script.js`
2. Detect success: `if (data.ok && data.files_written > 0)`
3. Build card with:
   - Header: "✅ Project Generated Successfully!"
   - Metrics: Files created, tests passed, generation time
   - File list: Formatted with icons (📄/📁)
   - Action buttons: "Open Project" and "Run Tests"
   - Collapsed `<details>` for raw JSON
4. Add CSS for `.success-card` with proper spacing/colors
5. Test with 3 different generation results

**When**: 60-90 minutes

**Success Criteria**: 
- No more raw JSON in primary view
- Metrics are scannable at a glance
- Files are easy to read
- JSON still accessible for debugging

**What NOT to do**: Don't add animations yet. Keep it simple and clean.

---

### Win #A2: Loading States (Phase-Aware Messages)
**What**: Add spinner and phase-aware loading messages instead of static "Planning..."

**Why**: Users need visual confirmation system is working, not frozen.

**Who**: Lead developer

**How**:
1. Add spinning CSS animation (use simple border spinner)
2. Implement phase detection in `executeRequest()`:
   - Phase 1 (0-10s): "Analyzing your request..."
   - Phase 2 (10-30s): "Creating execution plan..."
   - Phase 3 (30s+): "Building your project..." (shown until Task Plan appears)
3. Update loading message every 10 seconds
4. Add "typically takes X seconds" hint
5. Style with proper hierarchy (h3 for phase, p for hint)

**When**: 45-60 minutes

**Success Criteria**:
- Animated spinner visible immediately
- Loading message updates at least twice
- Time estimates feel accurate
- No "stuck" feeling

**What NOT to do**: Don't add progress percentage yet (that's Phase C).

---

### Win #A3: Error Message Formatting
**What**: Convert technical errors into user-friendly messages with actionable guidance.

**Why**: "TypeError: Failed to fetch" tells users nothing. Help them fix it.

**Who**: Lead developer

**How**:
1. Create `formatError(error)` function with error map:
   ```javascript
   const errorMap = {
     'Failed to fetch': {
       title: 'Connection Error',
       message: 'Unable to connect to server',
       action: 'Check that server is running: npm run dev'
     },
     'timeout': {
       title: 'Request Timeout',
       message: 'Operation took too long',
       action: 'Try simpler request or check server logs'
     }
     // ... more mappings
   }
   ```
2. Wrap errors in `.error-card` with structured layout
3. Show technical details in collapsed section
4. Test with: connection refused, timeout, invalid prompt, server error

**When**: 45-60 minutes

**Success Criteria**:
- All common errors have friendly messages
- Action steps are clear and specific
- Technical details available but hidden
- Error styling is clear but not alarming

**What NOT to do**: Don't handle every possible error. Cover top 5 most common.

---

## PHASE A COMPLETION CRITERIA

**Before declaring Phase A complete, verify**:
1. ✅ Can show system to someone without apologizing for JSON dump
2. ✅ Loading states feel responsive and informative
3. ✅ Errors are understandable and actionable
4. ✅ All changes tested with real generations
5. ✅ No regressions in existing functionality

**Then**: Commit, push, celebrate small win. Phase A took ~3 hours, not 3 days.

---

## PART 3: PHASE B DETAILED BREAKDOWN (Trust Engine Foundation - 8 Wins)

**Phase B Goal**: Build verification spine so generated code comes with proof of correctness.

**Definition of Done**: Every generation includes confidence score based on: tests passing, security clean, dependencies valid, patterns followed. Users can ship without manual verification.

---

### Win #B1: Define Trust Score Contract
**What**: Create `contracts/trust-score.schema.json` defining structure for confidence scoring.

**Why**: Establishes stable interface for all trust components to feed into.

**How**:
1. Define schema:
   ```json
   {
     "overallConfidence": 0-100,
     "components": {
       "tests": { "score": 0-100, "status": "pass|fail|error", "reason": "..." },
       "security": { "score": 0-100, "issues": [], "severity": "none|low|medium|high|critical" },
       "dependencies": { "score": 0-100, "vulnerabilities": [], "conflicts": [] },
       "patterns": { "score": 0-100, "violations": [] }
     },
     "recommendation": "ship|review|fix"
   }
   ```
2. Add Ajv validator
3. Write 5 unit tests (perfect score, failing tests, security issues, dep conflicts, pattern violations)

**When**: 30-40 minutes

**Success Criteria**: Schema validates all trust score scenarios correctly.

**What NOT to do**: Don't implement scoring logic yet. Just the contract.

---

### Win #B2: Test Coverage Analyzer
**What**: Create `src/trust/testCoverage.ts` that analyzes test quality for confidence scoring.

**Why**: Tests are foundation of trust. Need to know: do tests exist? Do they cover the code? Do they pass?

**How**:
1. Check if test files exist in project
2. Count test files vs source files ratio
3. Run tests if they exist
4. Parse test results for pass/fail/error counts
5. Calculate score:
   - 100: Tests exist, full coverage, all pass
   - 80: Tests exist, good coverage, all pass
   - 60: Tests exist, partial coverage, all pass
   - 40: Tests exist but some fail
   - 20: Tests exist but mostly fail
   - 0: No tests
6. Return trust component matching schema from B1

**When**: 45-60 minutes

**Success Criteria**: Can analyze any generated project and return test confidence score with reason.

**What NOT to do**: Don't integrate with generation yet. Just the analysis function.

---

### Win #B3: Security Scanner Integration
**What**: Create `src/trust/securityScan.ts` that runs static security analysis.

**Why**: Security vulnerabilities destroy trust. Must scan before declaring safe.

**How**:
1. Install security tools:
   - Python: `bandit` (already in system)
   - Node: `npm audit`
   - TypeScript: `eslint-plugin-security`
2. Detect project language from package.json/requirements.txt
3. Run appropriate scanner
4. Parse results for vulnerability count by severity
5. Calculate score:
   - 100: No issues
   - 80: Only low severity
   - 60: Medium severity issues
   - 40: High severity issues
   - 0: Critical vulnerabilities
6. Return trust component with issues list

**When**: 60-75 minutes

**Success Criteria**: Can scan Python/Node/TypeScript projects and return security confidence score.

**What NOT to do**: Don't add every possible scanner. Focus on critical languages.

---

### Win #B4: Dependency Validator
**What**: Create `src/trust/dependencyCheck.ts` that validates all dependencies are safe and compatible.

**Why**: AI can specify outdated/vulnerable/conflicting packages. Must verify before trusting.

**How**:
1. Parse package.json/requirements.txt for dependencies
2. Check each package exists in registry (npm/PyPI)
3. Run `npm audit` or `pip-audit` for known vulnerabilities
4. Check for version conflicts
5. Verify licenses are acceptable (no GPL in MIT project, etc.)
6. Calculate score:
   - 100: All deps valid, no vulnerabilities, no conflicts
   - 80: Minor version warnings
   - 60: Medium vulnerabilities or conflicts
   - 40: High vulnerabilities
   - 0: Critical vulnerabilities or missing packages
7. Return trust component with vulnerability list

**When**: 60-75 minutes

**Success Criteria**: Can validate any package.json/requirements.txt and return dependency confidence score.

**What NOT to do**: Don't try to auto-fix vulnerabilities yet. Just detect and score.

---

### Win #B5: Trust Score Calculator
**What**: Create `src/trust/calculateScore.ts` that combines all components into overall confidence.

**Why**: Need single number users can trust. Weighted combination of all trust signals.

**How**:
1. Take results from: testCoverage, securityScan, dependencyCheck
2. Apply weights:
   - Tests: 40% (most important - proves it works)
   - Security: 35% (critical for production)
   - Dependencies: 25% (important but fixable)
3. Calculate weighted average
4. Add penalties:
   - -20 if any critical security issue
   - -15 if tests don't exist
   - -10 if tests fail
5. Return overall score + recommendation:
   - ≥90: "Ship with confidence"
   - 70-89: "Review recommended"
   - <70: "Needs fixes before shipping"
6. Include breakdown of which components hurt/helped score

**When**: 45-60 minutes

**Success Criteria**: Can take 3 component scores and return meaningful overall confidence with explanation.

**What NOT to do**: Don't add complex ML. Simple weighted math is fine.

---

### Win #B6: Integrate Trust Scoring into Generation
**What**: Modify `/api/execute` to run trust scoring after generation completes.

**Why**: Make trust scoring automatic, not optional.

**How**:
1. After files written and tests run, call trust scoring:
   ```typescript
   const trustScore = await calculateTrustScore({
     projectPath,
     testResults,
     language
   });
   ```
2. Include trustScore in API response
3. Add to `_executor_meta.json` telemetry
4. Don't block generation on score - just report it
5. Write integration test: generate → verify trust score in response

**When**: 45-60 minutes

**Success Criteria**: Every generation includes trust score in response and meta file.

**What NOT to do**: Don't make trust scoring block generation. Run it, report it, continue.

---

### Win #B7: Trust Score UI Component
**What**: Add trust score display to success card in UI.

**Why**: Users need to SEE the confidence score prominently.

**How**:
1. Add trust score section to success card:
   ```html
   <div class="trust-score">
     <div class="score-badge score-high">98%</div>
     <div class="score-label">Confidence Score</div>
     <div class="score-recommendation">Ship with confidence ✓</div>
   </div>
   ```
2. Color code by score:
   - ≥90: Green (ship)
   - 70-89: Yellow (review)
   - <70: Red (fix)
3. Add expandable breakdown showing component scores
4. Style prominently - this is THE signature moment
5. Test with different scores (high/medium/low)

**When**: 60 minutes

**Success Criteria**: Trust score is immediately visible and understandable. Users know if they can ship.

**What NOT to do**: Don't hide it in details. Make it prominent.

---

### Win #B8: Trust Score Telemetry & Analytics
**What**: Log all trust scores to telemetry for analysis and improvement.

**Why**: Track which projects score high/low, identify patterns, improve scoring over time.

**How**:
1. Add trust score events to `events.log`:
   ```json
   {
     "event": "trust_score_calculated",
     "projectId": "...",
     "overallScore": 98,
     "components": {...},
     "timestamp": "..."
   }
   ```
2. Create `metrics/trust/*.csv` tracking:
   - Score distribution over time
   - Component contribution to scores
   - Projects that shipped vs needed review
3. Add to meta file for permanent record
4. Write test verifying telemetry capture

**When**: 45 minutes

**Success Criteria**: Every trust score is logged with full detail for future analysis.

**What NOT to do**: Don't build dashboard yet. Just capture data.

---

## PHASE B COMPLETION CRITERIA

**Before declaring Phase B complete, verify**:
1. ✅ Every generation includes trust score (tests + security + deps)
2. ✅ Score is visible and understandable in UI
3. ✅ Can explain to anyone: "This number tells you if code is safe to ship"
4. ✅ Telemetry captures all scores for improvement
5. ✅ Score matches reality (high scores = actually good code)
6. ✅ All tests pass, no regressions

**Then**: Full day off. You just built your signature moment.

---

## PART 4: PHASE C DETAILED BREAKDOWN (Real-Time Progress - 6 Wins)

**Phase C Goal**: Show users incremental progress during long operations via SSE.

---

### Win #C1: SSE Progress Event Contract
**What**: Define event schema for streaming progress updates.

**Why**: Establishes structure for all progress events (subtask updates, time estimates, status changes).

**How**:
1. Create `contracts/progress-event.schema.json`:
   ```json
   {
     "type": "plan_progress" | "subtask_start" | "subtask_complete" | "estimate_update",
     "timestamp": "ISO8601",
     "data": {
       "currentSubtask": "...",
       "completedSubtasks": number,
       "totalSubtasks": number,
       "percentComplete": 0-100,
       "estimatedRemainingMs": number,
       "estimatedCompletionTimestamp": "ISO8601"
     }
   }
   ```
2. Add validator
3. Write tests for each event type

**When**: 30 minutes

**Success Criteria**: Schema validates all progress event types.

---

### Win #C2: SSE Endpoint Implementation
**What**: Add `GET /api/execute/stream/:projectId` endpoint that streams progress events.

**Why**: Allows frontend to receive real-time updates during generation.

**How**:
1. Add SSE endpoint in `server.ts`:
   ```typescript
   app.get('/api/execute/stream/:projectId', (req, res) => {
     res.setHeader('Content-Type', 'text/event-stream');
     res.setHeader('Cache-Control', 'no-cache');
     res.setHeader('Connection', 'keep-alive');
     
     // Subscribe to progress events for this project
     // Send events as they occur
     // Handle client disconnect
   });
   ```
2. Integrate with existing telemetry/event system
3. Send event every time subtask completes
4. Include progress percentage and time estimate
5. Test with curl to verify events stream correctly

**When**: 60-75 minutes

**Success Criteria**: Can connect to endpoint and receive progress events in real-time.

**What NOT to do**: Don't build complex event bus yet. Direct event emission is fine.

---

### Win #C3: Frontend SSE Client
**What**: Add SSE connection logic to `script.js` that updates UI in real-time.

**Why**: Receive progress events and update Task Plan UI without polling.

**How**:
1. After execute starts, connect to SSE endpoint:
   ```javascript
   const eventSource = new EventSource(`/api/execute/stream/${projectId}`);
   eventSource.onmessage = (event) => {
     const data = JSON.parse(event.data);
     updateTaskPlanProgress(data);
   };
   ```
2. Handle different event types (subtask_start, subtask_complete, etc.)
3. Update progress bar smoothly
4. Update subtask status icons (⏳ → ⚙️ → ✅)
5. Update time estimate countdown
6. Close connection when complete
7. Test with long-running generation

**When**: 60 minutes

**Success Criteria**: UI updates in real-time as subtasks complete. No more frozen screen.

**What NOT to do**: Don't add reconnection logic yet. Basic connection is enough.

---

### Win #C4: Polling Fallback
**What**: Add fallback to polling if SSE not supported (old browsers).

**Why**: SSE isn't supported in IE11 and some corporate proxies block it.

**How**:
1. Detect if SSE fails to connect
2. Fall back to polling `/api/execute/status/:projectId` every 5 seconds
3. Return same progress data as SSE events
4. Update UI identically
5. Test in browser with SSE disabled

**When**: 45 minutes

**Success Criteria**: Works in browsers without SSE support.

**What NOT to do**: Don't optimize polling frequency yet. 5 seconds is fine.

---

### Win #C5: Show Task Plan Early
**What**: Display Task Plan UI as soon as plan is generated (10-20 seconds), not after completion.

**Why**: Users should see plan immediately, then watch it execute.

**How**:
1. Remove `hidden` class from `taskPlanSection` as soon as plan received
2. Show all subtasks in "pending" state (⏳ icons)
3. As events arrive, update individual subtasks to "in progress" (⚙️) then "completed" (✅)
4. Highlight current subtask with CSS animation
5. Test: verify plan appears within 20 seconds of execution start

**When**: 30 minutes

**Success Criteria**: Task Plan visible early in execution, updates in real-time.

**What NOT to do**: Don't change Task Plan rendering logic. Just timing of when it shows.

---

### Win #C6: Progress Bar Animation
**What**: Add smooth animation to progress bar as it advances.

**Why**: Abrupt jumps feel jarring. Smooth transitions feel professional.

**How**:
1. Add CSS transition to `.progress-fill`:
   ```css
   .progress-fill {
     transition: width 0.5s ease-out;
   }
   ```
2. Update width gradually instead of instantly
3. Add subtle gradient that moves (feels active)
4. Test with rapid progress updates

**When**: 20-30 minutes

**Success Criteria**: Progress bar advances smoothly, not in jumps.

**What NOT to do**: Don't add complex animations. Simple is better.

---

## PHASE C COMPLETION CRITERIA

**Before declaring Phase C complete, verify**:
1. ✅ Users see Task Plan within 20 seconds
2. ✅ Subtasks update in real-time (every 30-60s)
3. ✅ Progress bar advances smoothly
4. ✅ Time estimate counts down
5. ✅ Works in old browsers (polling fallback)
6. ✅ No "is it frozen?" confusion
7. ✅ All tests pass

**Then**: Celebrate. The system now FEELS responsive, not just IS functional.

---

## PART 5: PHASE D - SAVE GUARD REVIVAL (Optional but Recommended)

**Phase D Goal**: Prevent bad code from ever being written to disk.

**Note**: Only proceed if you want maximum code quality. This is where we resurrect Save Guard.

I'll detail this phase if you want to implement it. Should I continue with Phase D details, or is Phase A-C enough for now?

---

## FINAL RECOMMENDATIONS

### Immediate Path (This Week)
1. **Day 1**: Phase A (UI fixes) - 3 hours
2. **Days 2-3**: Phase B (Trust Engine) - 8 hours
3. **Days 4-5**: Phase C (Real-time progress) - 6 hours

**Total**: ~17 hours to go from "functional but rough" to "signature experience"

### What This Achieves
- ✅ Professional UI that doesn't embarrass you
- ✅ Trust Engine signature moment (your competitive advantage)
- ✅ Real-time progress (eliminates "is it working?" anxiety)
- ✅ Zero manual verification needed (confidence score tells you)

### What You Can Say
"Our system generates code WITH proof of correctness. See that 98% confidence score? That's automatic tests, security scans, and dependency validation. You can ship without manual review."

**That's your signature moment. That's what makes you different.**

---

Ready to start? Should I create the Phase A contracts for you?