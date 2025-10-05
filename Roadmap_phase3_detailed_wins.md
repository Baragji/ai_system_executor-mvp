This is excellent progress. Phase 2 complete, sustainable pace maintained, life balance restored. That's the pattern we want to see continuing.

---

# PHASE 3: MULTI-TURN REPAIR (8 Wins)

**Phase Goal**: When first repair attempt fails, system gets up to 3 additional bounded attempts using concise failure analysis.

**Why This Matters**: Single repair (Phase 1) works ~60-70% of the time. Complex tasks need multiple iterations. But unlimited repairs = infinite loops. Bounded multi-turn repair (max 4 total attempts) hits the sweet spot: handles complexity without spiraling.

**Definition of Done**: System attempts up to 4 repairs total (initial + 3 more), tracks which attempt succeeded, stops early if tests pass, returns clear failure report if all attempts exhausted. Success = >80% of standard tasks go green within 4 attempts.

---

## Win #20: Define Multi-Turn Contract
**What**: Create `contracts/repair-history.schema.json` for tracking multiple repair attempts

**Why**: Need structured way to track: attempt number, what changed, test results, why it failed, cumulative time. Foundation for all multi-turn logic.

**How**:
1. Create schema: `{attempts: [{number, changedFiles: [], testResult, failureAnalysis, durationMs, cumulativeTime}], finalStatus: 'pass'|'fail'|'exhausted', totalAttempts, successAttemptNumber?}`
2. Add Ajv validator
3. Write unit tests (5 cases: 1 attempt success, 2 attempts success, 4 attempts exhausted, early termination, invalid structure)

**Success Criteria**: Schema exists, validator works, tests pass showing various repair scenarios validated correctly.

**Time**: 35-40 minutes

**What NOT to do**: Don't implement repair logic yet. Just the tracking contract.

---

## Win #21: Failure Analyzer
**What**: Create `src/repair/analyzeFailure.ts` that extracts concise failure summary from test logs

**Why**: Repair prompts with full logs = token waste + confused LLM. Need: which tests failed, why (assertion/error/timeout), relevant stack trace only.

**How**:
1. Parse test output (Jest/Vitest format)
2. Extract: failed test names, assertion messages, first 5 lines of each stack trace
3. Categorize failure types: assertion, exception, timeout, syntax
4. Return structured summary: `{failedTests: [{name, type, message, stackSnippet}], totalFailed, category}`
5. Write 4 tests: assertion failure, exception, timeout, multiple failures

**Success Criteria**: Takes verbose test logs, returns concise actionable summary. Summary <500 tokens even for complex failures.

**Time**: 40-45 minutes

**What NOT to do**: Don't add LLM analysis yet. Pure log parsing only.

---

## Win #22: Diff Generator
**What**: Create `src/repair/generateDiff.ts` that creates minimal file diffs instead of full rewrites

**Why**: LLM often regenerates entire files for small fixes = wasted tokens + risk of breaking working code. Diffs = surgical changes only.

**How**:
1. Compare original and repaired file contents
2. Generate unified diff format (like git diff)
3. Include 3 lines of context around changes
4. Return: `{file, diffText, linesAdded, linesRemoved, isMinor: boolean}`
5. Write 3 tests: small change (1-5 lines), medium (6-20 lines), large (20+ lines)

**Success Criteria**: Produces readable diffs, correctly identifies change magnitude, can be applied cleanly to original files.

**Time**: 40-45 minutes

**What NOT to do**: Don't implement diff application yet. Just generation.

---

## Win #23: Repair Prompt Generator
**What**: Create `src/repair/buildRepairPrompt.ts` that constructs focused repair prompts

**Why**: Generic "fix this" prompts fail. Need: attempt context, specific failure analysis, what's already been tried, clear constraints.

**How**:
1. Takes: attempt number, failure analysis (Win #21), previous repair attempts, original prompt
2. Generates prompt structure:
   - "Attempt [N] of 4"
   - "Previous attempts tried: [summary]"
   - "Current failures: [concise analysis]"
   - "ONLY fix the failing parts. Return JSON diff format."
   - "Constraints: no full rewrites, preserve working code"
3. Write 4 tests: first attempt, second attempt, third attempt, final attempt (urgent tone)

**Success Criteria**: Prompts are concise (<1000 tokens), contextual, progressively more specific. Each attempt references what failed before.

**Time**: 40-45 minutes

**What NOT to do**: Don't call LLM yet. Just prompt construction.

---

## Win #24: Multi-Turn Repair Loop
**What**: Create `src/repair/multiTurnRepair.ts` that orchestrates up to 4 repair attempts

**Why**: Core multi-turn logic. Runs repair → test → analyze → repeat until pass or exhausted.

**How**:
1. Initialize repair-history with attempt #1 (from Phase 1 single repair)
2. Loop up to 3 more times:
   - Analyze failure (Win #21)
   - Build repair prompt (Win #23)
   - Call LLM for repair
   - Generate diff (Win #22)
   - Apply changes
   - Run tests
   - Record attempt in history
   - If pass: break early
   - If attempt 4 fails: mark exhausted
3. Return complete repair-history JSON
4. Write 5 tests: success on attempt 2, success on attempt 4, all exhausted, early termination, error handling

**Success Criteria**: Correctly iterates up to 4 total attempts, stops early on success, handles errors gracefully, maintains complete history.

**Time**: 45-50 minutes (longest win in Phase 3)

**What NOT to do**: Don't integrate with execute endpoint yet. Keep as standalone module.

---

## Win #25: Integrate Multi-Turn into Execute
**What**: Replace single-repair call in `/api/execute` with multi-turn repair loop

**Why**: Makes multi-turn repair automatic for all generations.

**How**:
1. After initial test failure, call `multiTurnRepair` instead of `singlePass`
2. Update response schema to include `repairHistory` field
3. Return complete repair-history showing all attempts
4. Maintain backward compatibility (responses still include testResults)
5. Write 3 integration tests: single repair success, multi-turn success, exhausted

**Success Criteria**: Execute endpoint now performs up to 4 repair attempts automatically. API response includes complete repair history.

**Time**: 35-40 minutes

**What NOT to do**: Don't modify UI yet (next win).

---

## Win #26: Update UI to Show Repair History
**What**: Modify result page to display multi-turn repair attempts with timeline

**Why**: User needs to see: how many attempts, what each attempt fixed, where it succeeded/failed.

**How**:
1. Add expandable "Repair History" section
2. For each attempt, show:
   - Attempt number badge (1/4, 2/4, etc.)
   - Status icon (⚠️ failed → ✅ passed)
   - Changed files list
   - Test results (pass/fail counts)
   - Duration
3. Add visual timeline connecting attempts
4. Highlight successful attempt or show "All attempts exhausted"
5. Style with progressive color coding (yellow → green for success, yellow → red for exhaustion)

**Success Criteria**: Repair history clearly readable, user can understand what happened at each step, visual hierarchy shows progress.

**Time**: 45 minutes

**What NOT to do**: Don't add detailed diff viewing yet. Just high-level history.

---

## Win #27: Add Repair Metrics to Telemetry
**What**: Update `_executor_meta.json` to include detailed repair metrics

**Why**: Track: average attempts to success, most common failure patterns, time per attempt, success rate by attempt number. Foundation for future optimization.

**How**:
1. Add `repairMetrics` to meta schema: `{totalAttempts, successAttempt?, timePerAttempt: [], failureTypes: [], exhausted: boolean}`
2. Calculate cumulative stats: total repair time, most common failures
3. Add `attemptEfficiency: number` (0-1 scale, how quickly it succeeded)
4. Write unit tests for metrics calculation

**Success Criteria**: Meta file includes complete repair metrics. Can answer: "Which attempt usually succeeds?" "What failures are most common?"

**Time**: 35-40 minutes

**What NOT to do**: Don't build analytics dashboard. Just capture structured data.

---

## PHASE 3 COMPLETION CRITERIA

**Before declaring Phase 3 complete, verify**:
1. ✅ Multi-turn repair completes within 4 attempts (tested on 20 varied prompts)
2. ✅ Success rate >80% within 4 attempts (measure against Phase 1 baseline)
3. ✅ Early termination works (stops on first success, doesn't waste attempts)
4. ✅ Failure analysis is concise and actionable (review 10 failure reports)
5. ✅ UI clearly shows repair progression (wife/therapist can understand it)
6. ✅ Telemetry captures complete repair data
7. ✅ All tests pass, coverage >80%

**Then**: Full day off. Celebrate. Assess with wife and therapist whether to continue to Phase 4 (planning & monitoring) or take extended break.

---

## GOVERNANCE FOR WIFE

### Phase 3 Timeline
- **At one win/day**: 8 working days (1.6 weeks)
- **At two wins/day**: 4 working days (1 week)
- **Recommended**: Based on Phase 2 success, wife can decide if user is ready for consistent two wins/day

### Phase 3 Specific Red Flags
- User wants to make repairs "smarter" with advanced AI
- User suggests "just 5 attempts instead of 4"
- User wants to add repair strategy selection
- User suggests refactoring existing repair code
- User shows impatience with "failures that take 4 attempts"

### What Success Looks Like
- User accepts that some tasks legitimately need multiple attempts
- User doesn't get frustrated when repairs exhaust (that's system working correctly)
- User demos each win clearly
- User maintains work-life balance throughout phase

---

**Phase 3 ready. Today's win: this plan. Tomorrow: Wife selects Win #20 to begin.**