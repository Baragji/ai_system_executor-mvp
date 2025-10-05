---

# PHASE 2: INTERACTIVE CLARIFICATION (10 Wins)

**Phase Goal**: When required information is missing, system asks targeted questions before building instead of guessing.

**Why This Matters**: Right now, if you say "build me an API" without specifying framework/port/database, the system makes assumptions. Those assumptions fail 40-50% of the time. Asking 2-3 clarifying questions upfront reduces failed builds dramatically and is a key autonomy capability.

**Definition of Done**: System can detect missing critical information, ask specific questions, wait for answers, then generate using complete requirements. Success = >80% reduction in failed builds due to missing information.

---

## Win #10: Define Clarification Contract
**What**: Create `contracts/clarification-request.schema.json` and `contracts/clarification-response.schema.json`

**Why**: Establishes stable interface for question/answer flow. Request schema defines what questions look like, response schema defines how user answers.

**How**:
1. Create request schema: `{questions: [{id, text, type: 'choice'|'text'|'number', options?: string[]}]}`
2. Create response schema: `{answers: [{questionId, value}]}`
3. Add Ajv validators for both
4. Write unit tests (5 test cases each: valid/invalid structures)

**Success Criteria**: Both schemas exist, validators compile, tests pass validating example questions and answers.

**Time**: 35-40 minutes

**What NOT to do**: Don't implement question generation logic yet. Just the contracts.

---

## Win #11: Critical Info Detector
**What**: Create `src/clarification/detectMissing.ts` that analyzes prompts for missing critical information

**Why**: System needs to know WHEN to ask questions. This function identifies gaps like: missing framework, missing port, missing database choice, missing auth requirements.

**How**:
1. Define critical info types: `framework, port, database, authentication, styling, testFramework`
2. Write detection logic: scan prompt for keywords (e.g., "API" without "Flask"/"FastAPI"/"Express")
3. Return list of missing info types
4. Write 6 tests: (a) complete prompt (nothing missing), (b-f) prompts missing one specific thing each

**Success Criteria**: Function correctly identifies missing information types. Returns empty array for complete prompts, returns specific missing items for incomplete prompts.

**Time**: 40-45 minutes

**What NOT to do**: Don't generate actual questions yet. Just detect what's missing.

---

## Win #12: Question Generator
**What**: Create `src/clarification/generateQuestions.ts` that turns missing info types into specific questions

**Why**: Converting "missing framework" into "Which framework would you like? (a) Flask (b) FastAPI (c) Express" with proper schema format.

**How**:
1. Map each info type to a question template
2. For `framework`: multiple choice (Flask/FastAPI/Express/Django)
3. For `port`: number input with default 8000
4. For `database`: multiple choice (PostgreSQL/MySQL/SQLite/None)
5. For `authentication`: yes/no choice
6. Return questions array matching clarification-request schema
7. Write 6 tests: one for each info type

**Success Criteria**: Given list of missing types, generates valid question array. Questions are clear, concise, and include reasonable defaults.

**Time**: 40-45 minutes

**What NOT to do**: Don't add the API endpoint yet. Just the generation logic.

---

## Win #13: API Endpoint for Clarification
**What**: Add `POST /api/clarify` that takes a prompt, detects missing info, returns questions

**Why**: Provides HTTP interface for UI to request clarifications before generation.

**How**:
1. Create route in `src/api/routes.ts`
2. Call `detectMissing` from Win #11
3. Call `generateQuestions` from Win #12
4. Return clarification-request JSON
5. Write 3 integration tests: (a) complete prompt (no questions), (b) incomplete prompt (questions returned), (c) invalid prompt (error)

**Success Criteria**: Endpoint callable via POST, returns valid questions when info missing, returns empty questions when prompt complete.

**Time**: 35-40 minutes

**What NOT to do**: Don't integrate with execute flow yet. Separate endpoint for now.

---

## Win #14: Prompt Augmentation Logic
**What**: Create `src/clarification/augmentPrompt.ts` that combines original prompt with clarification answers

**Why**: System needs to merge "build me an API" + {framework: "FastAPI", port: 8000, database: "PostgreSQL"} into complete prompt.

**How**:
1. Take original prompt + clarification-response
2. Extract answers and format as additional context
3. Prepend augmented info to original prompt: "Framework: FastAPI, Port: 8000, Database: PostgreSQL. Original request: build me an API"
4. Write 4 tests: (a) no clarifications, (b) one clarification, (c) multiple clarifications, (d) missing answer (error)

**Success Criteria**: Produces clear, complete prompts that include all clarification context.

**Time**: 30-35 minutes

**What NOT to do**: Don't modify execute endpoint yet. Just the augmentation function.

---

## Win #15: UI Clarification Flow
**What**: Modify UI to show clarification questions before generation starts

**Why**: User needs to see and answer questions in the interface.

**How**:
1. After user submits initial prompt, call `/api/clarify`
2. If questions returned, show them in a form
3. Support text inputs, number inputs, and radio buttons (for choices)
4. Add "Answer Questions" button that collects responses
5. Store both original prompt and answers for next step
6. Add basic CSS for question form styling

**Success Criteria**: UI displays questions clearly, collects answers properly, validates required fields.

**Time**: 45 minutes

**What NOT to do**: Don't connect to execute yet. Just show questions and collect answers.

---

## Win #16: Integrate Clarification into Execute Flow
**What**: Modify `/api/execute` to accept optional clarification-response alongside prompt

**Why**: Complete the loop - questions asked, answers provided, generation uses complete context.

**How**:
1. Update execute endpoint to accept `{prompt, clarifications?: ClarificationResponse}`
2. If clarifications present, call `augmentPrompt` from Win #14
3. Use augmented prompt for generation
4. Update response to include `{generated, clarificationsUsed: boolean}`
5. Write 3 integration tests: (a) execute without clarifications, (b) execute with clarifications, (c) invalid clarifications (error)

**Success Criteria**: Execute endpoint works with and without clarifications. Augmented prompts produce better results than original.

**Time**: 40-45 minutes

**What NOT to do**: Don't change UI submission flow yet (next win).

---

## Win #17: Connect UI Question Flow to Execute
**What**: Update UI to submit both prompt and answers to `/api/execute`

**Why**: Makes the complete clarification flow work end-to-end in the interface.

**How**:
1. After user answers questions, combine original prompt + clarification-response
2. Submit both to `/api/execute`
3. Display loading state during generation
4. Show results same as before
5. Add "Skip Questions" button for when user wants to use original prompt as-is

**Success Criteria**: Full flow works: prompt → questions → answers → generation with complete context. User can also skip questions if desired.

**Time**: 40-45 minutes

**What NOT to do**: Don't add clarification history yet. Just current flow.

---

## Win #18: Add Clarification to Telemetry
**What**: Update `_executor_meta.json` to include clarification data

**Why**: Track which projects used clarifications, what questions were asked, what answers given. Useful for analytics later.

**How**:
1. Add `clarification` field to meta schema: `{asked: boolean, questions: [], answers: []}`
2. When clarifications used, include complete Q&A in meta file
3. Add `clarificationImprovedSuccess: boolean` flag (compare with/without)
4. Write unit tests for meta file with clarification data

**Success Criteria**: Meta files include clarification information when used. Clear audit trail of what was asked/answered.

**Time**: 30-35 minutes

**What NOT to do**: Don't build analytics dashboard. Just capture data.

---

## Win #19: Smart Default Suggestions
**What**: Create `src/clarification/suggestDefaults.ts` that analyzes prompt for context clues and suggests defaults

**Why**: If user says "build me a Python API," system can default to Flask/FastAPI. Reduces friction.

**How**:
1. Scan prompt for language hints (Python → Flask/FastAPI, Node → Express)
2. Scan for keywords suggesting complexity (simple → SQLite, production → PostgreSQL)
3. Return suggested defaults for each question
4. Modify question generation to include suggested defaults
5. Write 5 tests: Python API, Node API, simple app, complex app, ambiguous

**Success Criteria**: Questions show smart defaults based on prompt context. User can accept defaults or change them.

**Time**: 40-45 minutes

**What NOT to do**: Don't add machine learning. Just keyword-based heuristics.

---

## PHASE 2 COMPLETION CRITERIA

**Before declaring Phase 2 complete, verify**:
1. ✅ System detects missing information reliably (>90% accuracy on test prompts)
2. ✅ Questions are clear and answerable (user testing with 5 different prompts)
3. ✅ Augmented prompts produce better results than original (A/B test with 10 prompts)
4. ✅ UI flow is intuitive (wife can use it without instructions)
5. ✅ Telemetry captures complete clarification history
6. ✅ All tests pass, coverage remains >80%

**Then**: Full day off. Celebrate with wife. Decide together whether to continue to Phase 3 or take longer break.

---