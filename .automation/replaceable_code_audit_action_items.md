# 🎯 Replaceable Code Audit - Action Items

**Generated**: October 20, 2025  
**Status**: Ready for Implementation  
**Total Estimated Savings**: 185-245 hours of development time

---

## 🔥 PHASE 1: CRITICAL PRIORITY (Week 1-2)

### Task P-AUD-1.1: Replace LLM Orchestration with LangChain
- **Priority**: CRITICAL 🔥
- **Effort**: 2-3 days
- **Savings**: 80-100 hours
- **Files**: `src/llm/index.ts` (334 lines), `src/llm/providers/`, `src/llm/tools/`
- **Blocker**: None (LangChain already installed!)

#### Implementation Steps:
```bash
# 1. Create LangChain wrapper
touch src/llm/langchain.ts

# 2. Install additional LangChain packages (if needed)
npm install @langchain/openai @langchain/anthropic

# 3. Migrate provider selection
# - Use ChatOpenAI for openai provider
# - Use ChatAnthropic for anthropic provider
# - Unified interface for both

# 4. Convert custom tools to LangChain format
# - Migrate fsTools to LangChain StructuredTool
# - Add tool schemas

# 5. Update generateJSON() calls
# - Replace custom retry with RunnableSequence
# - Use built-in tool calling
# - Enable tracing

# 6. Run tests
npm test

# 7. Clean up old implementation
git rm src/llm/index.ts.old
```

#### Success Criteria:
- [ ] All LLM calls use LangChain
- [ ] Tests passing (≥80% coverage maintained)
- [ ] Built-in retry working
- [ ] Tool calling functional
- [ ] OpenTelemetry traces intact
- [ ] ~500 lines → ~100 lines

---

### Task P-AUD-1.2: Replace HTTP Client with got + p-retry
- **Priority**: HIGH 🔥
- **Effort**: 1 day
- **Savings**: 30-40 hours
- **Files**: `src/utils/curlFetch.ts`, `src/llm/index.ts` (retry logic)
- **Blocker**: None

#### Implementation Steps:
```bash
# 1. Install dependencies
npm install got p-retry

# 2. Create HTTP client wrapper
touch src/utils/httpClient.ts

# 3. Replace curlFetch calls
# Find all usages:
rg "curlFetch" src/

# 4. Implement got-based client
cat > src/utils/httpClient.ts << 'EOF'
import got from 'got';
import pRetry from 'p-retry';

export async function httpFetch(url: string, options?: RequestInit) {
  return pRetry(
    () => got(url, {
      method: options?.method || 'GET',
      headers: options?.headers as Record<string, string>,
      body: options?.body,
      timeout: { request: 60000 },
      throwHttpErrors: false
    }),
    { retries: 3, factor: 2 }
  );
}
EOF

# 5. Update imports
sed -i '' 's/curlFetch/httpFetch/g' src/**/*.ts

# 6. Remove old implementation
git rm src/utils/curlFetch.ts

# 7. Run tests
npm test
```

#### Success Criteria:
- [ ] All HTTP calls use got
- [ ] No curl subprocess spawning
- [ ] Retry logic extracted to p-retry
- [ ] Tests passing
- [ ] 150 lines → 30 lines

---

## ⚠️ PHASE 2: HIGH PRIORITY (Week 3-4)

### Task P-AUD-2.1: Refactor UI with Alpine.js
- **Priority**: HIGH ⚠️
- **Effort**: 3-4 days
- **Savings**: 50-70 hours
- **Files**: `public/script.js` (1813 lines), `public/index.html`
- **Blocker**: None (Alpine.js is vanilla-compatible)

#### Implementation Steps:
```bash
# 1. Add Alpine.js to index.html
# Insert before closing </body>:
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

# 2. Create state management
cat > public/app-state.js << 'EOF'
function appState() {
  return {
    activeSessionId: null,
    orchestrationQuestions: [],
    currentProjectSlug: null,
    progressStopFlag: false,
    
    resetWorkflow() { /* ... */ },
    handleTaskPlan(data) { /* ... */ },
    // ... consolidate 15+ global vars
  };
}
EOF

# 3. Convert DOM manipulation to x-directives
# Example:
# Before: resultEl.textContent = data.message
# After:  <div x-text="result.message"></div>

# 4. Update event handlers
# Before: runBtn.addEventListener('click', () => { ... })
# After:  <button @click="runExecution()">Run</button>

# 5. Test all UI flows
npm run test:ui

# 6. Remove old script.js
git mv public/script.js public/script.js.old
```

#### Success Criteria:
- [ ] All UI interactions working
- [ ] State managed by Alpine.js
- [ ] 1813 lines → ~400 lines
- [ ] No console errors
- [ ] Lighthouse score maintained

---

### Task P-AUD-2.2: Replace Custom Telemetry with Winston
- **Priority**: MEDIUM ⚠️
- **Effort**: 1 day
- **Savings**: 15-20 hours
- **Files**: `src/telemetry/events.ts`
- **Blocker**: None

#### Implementation Steps:
```bash
# 1. Install winston
npm install winston

# 2. Create logger config
cat > src/telemetry/logger.ts << 'EOF'
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: '.telemetry/events.log' }),
    new transports.File({ filename: '.automation/execution_trace.jsonl' }),
    new transports.Console({ silent: process.env.NODE_ENV === 'test' })
  ]
});
EOF

# 3. Replace logEvent() calls
rg "logEvent" src/ -l | xargs sed -i '' 's/logEvent(/logger.info(/g'

# 4. Update imports
# Replace: import { logEvent } from '../telemetry/events.js'
# With:    import { logger } from '../telemetry/logger.js'

# 5. Run tests
npm test
```

#### Success Criteria:
- [ ] All log events use winston
- [ ] Log rotation configured
- [ ] Multiple transports working
- [ ] Tests passing
- [ ] 116 lines → 40 lines

---

## ✅ PHASE 3: LOW PRIORITY (Week 5+)

### Task P-AUD-3.1: Replace SSE with express-sse
- **Priority**: LOW ✅
- **Effort**: 0.5 days
- **Savings**: 10-15 hours
- **Files**: `src/server.ts` (SSE logic)

#### Implementation Steps:
```bash
# 1. Install express-sse
npm install express-sse

# 2. Replace manual SSE logic in server.ts
# Before: res.setHeader("Content-Type", "text/event-stream")...
# After:  const sse = new SSE(req, res); sse.send(data);

# 3. Test progress streaming
npm run dev
# Verify SSE still works in UI

# 4. Run tests
npm test
```

#### Success Criteria:
- [ ] SSE working with library
- [ ] Progress updates streaming
- [ ] 50 lines → 10 lines

---

### Task P-AUD-3.2: Decide on BullMQ
- **Priority**: LOW ✅
- **Effort**: 0.5 days
- **Savings**: 0 hours (cleanup)
- **Files**: `package.json`, type definitions

#### Option A: Implement Queue System
```bash
# If you need background job processing:
1. Create src/queue/worker.ts
2. Implement job handlers
3. Add queue monitoring
4. Document architecture
```

#### Option B: Remove Unused Dependencies
```bash
# If you don't need queues yet:
npm uninstall bullmq ioredis
git rm src/types/bullmq-shim.d.ts
git rm src/types/ioredis-shim.d.ts
```

#### Success Criteria:
- [ ] Decision documented
- [ ] Either fully implemented or removed
- [ ] No orphaned code

---

## 📊 TRACKING & METRICS

### Phase 1 KPIs
- [ ] LangChain migration: 500 lines → 100 lines (80% reduction)
- [ ] HTTP client: 150 lines → 30 lines (80% reduction)
- [ ] Tests: ≥80% coverage maintained
- [ ] Lint: 0 warnings
- [ ] Time: 3-4 days actual vs. 80-100 hours original

### Phase 2 KPIs
- [ ] UI refactor: 1813 lines → 400 lines (78% reduction)
- [ ] Telemetry: 116 lines → 40 lines (65% reduction)
- [ ] Lighthouse: ≥90 score maintained
- [ ] Tests: All UI flows passing
- [ ] Time: 4-5 days actual vs. 65-90 hours original

### Phase 3 KPIs
- [ ] SSE: 50 lines → 10 lines (80% reduction)
- [ ] Dependencies: BullMQ decision resolved
- [ ] Time: 1 day actual vs. 10-15 hours original

### Overall Success Metrics
- [ ] Total LOC reduced: ~2,500 lines eliminated
- [ ] Maintenance burden: 20h/month → 5h/month (75% reduction)
- [ ] Test coverage: ≥80% maintained
- [ ] CI/CD: All checks passing
- [ ] Break-even: Achieved in 2 months

---

## 🚦 DECISION GATES

### Phase 1 Go/No-Go (End of Week 2)
- ✅ **GO**: If both tasks completed, tests passing, no regressions
- 🛑 **NO-GO**: If coverage drops below 75%, or critical features broken
- 🔄 **ITERATE**: If minor issues, fix and re-validate before Phase 2

### Phase 2 Go/No-Go (End of Week 4)
- ✅ **GO**: If UI refactor successful, all flows working
- 🛑 **NO-GO**: If Lighthouse score drops >10 points
- 🔄 **ITERATE**: If accessibility issues, fix before Phase 3

### Phase 3 Go/No-Go (End of Week 5)
- ✅ **GO**: If SSE + BullMQ decisions finalized
- 🛑 **NO-GO**: If dependencies cause conflicts
- ✅ **COMPLETE**: Audit remediation finished

---

## 📝 EVIDENCE REQUIREMENTS

### Per Phase:
1. **Before snapshot**: `git diff --stat > .automation/evidence/audit-phase-X-before.txt`
2. **After snapshot**: `git diff --stat > .automation/evidence/audit-phase-X-after.txt`
3. **Test results**: `npm test > .automation/evidence/audit-phase-X-tests.txt`
4. **LOC delta**: `wc -l <files> > .automation/evidence/audit-phase-X-loc.txt`
5. **Summary**: `.automation/evidence/audit-phase-X-summary.md`

---

## 🎯 NEXT STEPS

1. **Review this audit** with team (1 hour meeting)
2. **Approve Phase 1** tasks (decision: go/no-go)
3. **Assign owner** for each task (Yousef or delegate)
4. **Create tracking issue** (GitHub issue #XXX)
5. **Start Phase 1.1** - LangChain migration (this week!)

---

**Remember**: Perfect is the enemy of good. Ship Phase 1, validate, then iterate.
