# Following 12 files have been added/modified:

1. .automation/phaseA_fix_discovery.json
Ny

2. .automation/phaseA_fix_discovery_note.md
Ny

3. playwright.config.ts
+1
-0

4. public/icons.js
Ny

5. public/index.html
+41
-36

6. public/script.js
+489
-177

6. public/styles.css
+269
-205

7. sbom.spdx.json
+205
-31

8. tests/ui/execution-flow.spec.ts-snapshots/execution-results-chromium-linux.png
Ny

9. tests/ui/home.spec.ts-snapshots/home-page-chromium-linux.png
Ny

10. tests/ui/outcome-state-machine.test.ts
+15
-2

11. tests/ui/presentation-policy.playwright.ts
Ny


# The complete diff: 

 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/.automation/phaseA_fix_discovery.json b/.automation/phaseA_fix_discovery.json
new file mode 100644
index 0000000000000000000000000000000000000000..e58a878291f9c393f85011613209f459d82790df
--- /dev/null
+++ b/.automation/phaseA_fix_discovery.json
@@ -0,0 +1,53 @@
+{
+  "w26_debug_disclosure": {
+    "file": "public/index.html",
+    "elements": ["#taskPlanSection", "#testControls", "#repairHistorySection"],
+    "current_structure": "Sections rendered sequentially after <pre id=\"result\"> without grouping.",
+    "planned_change": "Wrap sections in <details id='debugDisclosure'> with <summary>🔧 Debug Info (Advanced)</summary> and ensure closed by default via script.",
+    "dependencies": ["public/styles.css for disclosure styling", "public/script.js to toggle visibility"],
+    "risks": "Must preserve existing IDs for script hooks."
+  },
+  "w27_card_modernization": {
+    "file": "public/styles.css",
+    "classes": [".success-card", ".partial-card", ".error-card"],
+    "current_style": "Flat backgrounds, emoji icons, minimal spacing.",
+    "planned_change": "Adopt modern card layout with accent border, SVG icons (from new public/icons.js), typography hierarchy, hover states.",
+    "dependencies": ["renderSuccessCard", "renderPartialCard", "renderErrorCard"],
+    "risks": "Need to update Playwright visual baselines."
+  },
+  "w28_file_preview": {
+    "files": ["public/index.html", "public/script.js", "src/server.ts"],
+    "current_state": "No file preview UI; server lacks file fetch endpoint.",
+    "planned_change": "Add Prism CDN links, create file preview panel, implement renderFilePreview(files) with tree interactions, add GET /api/files/:project/* route returning sanitized file content.",
+    "dependencies": ["Prism.js global", "fetch API", "slug-based project paths"],
+    "risks": "Ensure path traversal protection and handle binary files gracefully."
+  },
+  "w29_progress_stages": {
+    "file": "public/script.js",
+    "function": "updateLoadingPhase",
+    "current_state": "Displays spinner with static messages.",
+    "planned_change": "Replace with renderProgressStages(stage, snapshot) timeline fed by SSE/polling events from /api/execute, update CSS timeline in public/styles.css, extend server to emit progress.",
+    "dependencies": ["execute flow in public/script.js", "app.post('/api/execute')"],
+    "risks": "SSE must not break existing JSON response; fallback polling required."
+  },
+  "w30_scaffold_validation": {
+    "files": ["src/validation/validateScaffold.ts", "src/server.ts", "src/repair/strategySelector.ts"],
+    "current_state": "No preflight scaffold validation; missing package.json bug persists.",
+    "planned_change": "Introduce validateScaffold helper, call before writeFiles in execute flow, trigger MISSING_SCAFFOLD repair strategy on failure, add targeted Vitest coverage.",
+    "dependencies": ["ExecutorOutput.files", "multiTurnRepair"],
+    "risks": "Must avoid infinite repair loops; ensure validation integrates with planning branch as well."
+  },
+  "w31_ui_validation": {
+    "files": ["playwright.config.ts", "tests/ui/*"],
+    "current_state": "Existing Playwright suite covers home page and execution flow only.",
+    "planned_change": "Add focused specs for outcome cards, debug disclosure, file preview, loading states, accessibility; enable multi-browser projects per contract.",
+    "dependencies": ["npm scripts", "CI performance"],
+    "risks": "Test runtime increases; manage timeouts and baseline artifacts."
+  },
+  "stack_compliance_check": {
+    "language": "TypeScript/JavaScript only",
+    "no_python": true,
+    "frontend_frameworks": "None introduced",
+    "dependency_policy": "CDN Prism only; no npm additions without approval"
+  }
+}
diff --git a/.automation/phaseA_fix_discovery_note.md b/.automation/phaseA_fix_discovery_note.md
new file mode 100644
index 0000000000000000000000000000000000000000..4753298751ddd3656fe93e6d02ef6742276f50dc
--- /dev/null
+++ b/.automation/phaseA_fix_discovery_note.md
@@ -0,0 +1,61 @@
+# Phase A-FIX Discovery Note
+
+## Scope
+Implement Wins 26-31 from `12_phase_a_fix_contract-2.json`, covering presentation policy, modern outcome cards, file preview, progressive loading states, scaffold validation, and expanded UI validation.
+
+## Integration Points
+
+### public/index.html
+- Lines 34-78 currently render Task Plan (`#taskPlanSection`), Test Controls (`#testControls`), and Repair History within main flow; must be wrapped inside a new `<details id="debugDisclosure">` container (`W26`).
+- After `<section id="testControls">` (line ~60) there is no container for advanced tools; we will insert the `<details>` wrapper and relocate sections inside (`W26`).
+- Need to add Prism CSS/JS CDN links in `<head>` and create `<div id="filePreviewPanel" class="file-preview-panel" hidden>` after the outcome result area (`<pre id="result">`) to host preview UI (`W28`).
+
+### public/styles.css
+- Existing task/test/repair styling around lines 1-180 will stay but requires new selectors for `#debugDisclosure` and children to style disclosure summary subtly (`W26`).
+- Outcome card classes `.success-card`, `.partial-card`, `.error-card` defined roughly lines 120-220 rely on emoji icons and older styling; will be reworked for modern card design with accent bars, new typography, and icon placeholders (`W27`).
+- Need to add `.file-preview-panel`, `.file-tree`, `.file-preview` styles around new component (`W28`).
+- Spinner-based `.loading-state` styles around lines 200-240 will be replaced with `.progress-stages` timeline, stage badges, animated progress bar, and skeleton loaders (`W29`).
+
+### public/script.js
+- `renderSuccessCard`, `renderPartialCard`, `renderErrorCard` (~lines 520-1090) build DOM with emoji icons and simple layouts; update to consume shared icon templates (new `public/icons.js`) and align with updated styles plus richer metrics and CTA buttons (`W27`).
+- `updateLoadingPhase` (~lines 1055-1105) currently injects spinner; will be replaced by `renderProgressStages(stage, snapshot)` with stage definitions, progress bar, skeletons, and SSE/polling integration (`W29`).
+- Need initialization hook near top to close debug disclosure by default and adjust references that append to `taskPlanSection`, `testControls`, and repair history to mount inside debug container (`W26`).
+- Introduce file preview module: functions to build file tree, handle click → fetch `/api/files/:project/:path`, render code with Prism, and copy-to-clipboard toast; integrate with outcome card flows to show/hide panel (`W28`).
+- Update event listeners for SSE progress in `handleExecute` pipeline near `handleExecuteSuccess` (~lines 1140+) to process progress events and call `renderProgressStages` (`W29`).
+
+### public/icons.js
+- New module exporting inline SVG template strings for success/partial/error/file/folder icons; consumed by updated card rendering (`W27`).
+
+### src/server.ts
+- `app.post("/api/execute")` currently performs full generation synchronously with no progress streaming; must emit SSE updates when `Accept: text/event-stream` or manage progress sessions for polling fallback, plus track session IDs for UI to fetch progress (`W29`).
+- Need new GET route `/api/files/:project/*` (since project slug uses slugify) that sanitizes path, ensures file inside `output/<project>`, reads file, returns metadata; place near other routes (after static middleware) (`W28`).
+- Before `writeFiles`, add scaffold validation by invoking new `validateScaffold` helper; on failure, trigger repair strategy (requires `repair` module integration) to regenerate minimal scaffold or abort with error (`W30`).
+- Track progress snapshots so SSE/polling can reflect stage transitions and final state updates.
+
+### src/validation/validateScaffold.ts (new)
+- Export `validateScaffold(files: ExecutorFile[]): ValidationResult` ensuring `package.json` exists, is valid JSON, includes `name`, `version`, and `scripts`. Provide optional devDependencies checks based on `hasTests` metadata (`W30`).
+
+### src/repair/strategySelector.ts
+- Extend failure categories to include `MISSING_SCAFFOLD` and map to scaffold repair strategy metadata for runtime usage (`W30`).
+
+### tests additions
+- `tests/api/files.test.ts` integration tests for new file fetch endpoint using Supertest (`W28`).
+- `tests/validation/validateScaffold.test.ts` verifying validation outcomes including malformed JSON scenarios (`W30`).
+- New/updated Playwright specs under `tests/ui` covering outcome cards, debug disclosure, file preview, loading states, and accessibility. Need to align with existing Playwright setup (already has `playwright.config.ts`) and add snapshots as required (`W26-W31`).
+
+## Dependencies & Compliance
+- All changes remain in TypeScript/JavaScript. No backend frameworks added. Prism.js will be loaded via CDN (no npm dependency), aligning with "no new dependencies" rule.
+- SSE/polling logic will be implemented with Node streams in existing Express server; no external libraries.
+- Validate modifications maintain compatibility with `ai-stack.json` (Node 20, TS/JS stack).
+
+## Risks & Mitigations
+- Introducing SSE/progress sessions could disrupt existing `/api/execute` response flow; mitigate by maintaining JSON response for non-SSE clients and thoroughly testing existing Vitest suites.
+- File preview endpoint must guard against path traversal; will normalize using `path.resolve` + prefix check.
+- Scaffold validation/repair should not regress multi-turn planner path; ensure validation only applies to single-shot branch and plan flow (if plan results already produce files) by integrating after generation but before disk write.
+- Large UI overhaul may break existing Playwright baselines; update snapshots intentionally and document.
+
+## Evidence Plan
+- Implement unit tests for scaffold validation and API route, extend Vitest coverage for new helpers.
+- Expand Playwright suites with new specs; update config to enable Firefox/WebKit per contract and adjust screenshot thresholds for new UI.
+- Run full validation commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run contract:check`, `npm run sbom`, `npm run test:ui` (ensuring environment capabilities).
+
diff --git a/playwright.config.ts b/playwright.config.ts
index 843faaf5d3fbfdda33f3fb00d1c47ae875c00485..7766ac6c577f874ab9bac514d5a5be00cd25dd1e 100644
--- a/playwright.config.ts
+++ b/playwright.config.ts
@@ -1,38 +1,39 @@
 import { defineConfig, devices } from "@playwright/test";
 
 /**
  * Playwright configuration for UI validation
  * - Visual regression testing with screenshot comparison
  * - Accessibility testing with axe-core
  * - Cross-browser testing (Chromium, Firefox, WebKit)
  * 
  * See https://playwright.dev/docs/test-configuration
  */
 export default defineConfig({
   // Test directory
   testDir: "./tests/ui",
+  testIgnore: ["**/*.test.ts"],
   
   // Run tests in files in parallel
   fullyParallel: false,
   
   // Fail the build on CI if you accidentally left test.only in the source code
   forbidOnly: !!process.env.CI,
   
   // Retry on CI only
   retries: process.env.CI ? 2 : 0,
   
   // Opt out of parallel tests on CI
   workers: process.env.CI ? 1 : undefined,
   
   // Reporter to use
   reporter: [
     ["html", { outputFolder: ".automation/playwright-report" }],
     ["json", { outputFile: ".automation/playwright-results.json" }],
     ["list"]
   ],
   
   // Shared settings for all the projects below
   use: {
     // Base URL to use in actions like `await page.goto('/')`
     baseURL: process.env.UI_ORIGIN ?? "http://localhost:3000",
     
diff --git a/public/icons.js b/public/icons.js
new file mode 100644
index 0000000000000000000000000000000000000000..13c1ba53d3d8992beee3e3c1ffb980d97ffb39c1
--- /dev/null
+++ b/public/icons.js
@@ -0,0 +1,37 @@
+export const successIcon = `
+  <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
+    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15"></circle>
+    <path d="M17.5 8.75 10.8 15.5 7 11.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
+  </svg>
+`;
+
+export const partialIcon = `
+  <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
+    <path d="M12 3.5 20.5 19a1 1 0 0 1-.87 1.5H4.37A1 1 0 0 1 3.5 19l8.5-15.5Z" stroke="currentColor" stroke-width="1.6" fill="currentColor" opacity="0.12"></path>
+    <path d="M12 9.25v4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
+    <circle cx="12" cy="16.75" r="1" fill="currentColor"></circle>
+  </svg>
+`;
+
+export const errorIcon = `
+  <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
+    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.15"></circle>
+    <path d="m15.5 8.5-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
+    <path d="m8.5 8.5 7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
+  </svg>
+`;
+
+export const fileIcon = `
+  <svg viewBox="0 0 20 20" role="img" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
+    <path d="M11.5 2.5H6.75a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6.75 17.5h6.5a2.25 2.25 0 0 0 2.25-2.25V7.75L11.5 2.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity="0.4"></path>
+    <path d="M11.5 2.5v3.25a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
+  </svg>
+`;
+
+export const folderIcon = `
+  <svg viewBox="0 0 20 20" role="img" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
+    <path d="M3.5 6.25A1.75 1.75 0 0 1 5.25 4.5H8l1.7 2H14.5a2 2 0 0 1 2 2v1.25H4a1.5 1.5 0 0 1-1.5-1.5V6.25Z" fill="currentColor" opacity="0.15"></path>
+    <path d="M2.5 8.5h15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>
+    <path d="M3.5 6.25A1.75 1.75 0 0 1 5.25 4.5H8l1.7 2H14.5a2 2 0 0 1 2 2v6.75a2 2 0 0 1-2 2H5.25a1.75 1.75 0 0 1-1.75-1.75V6.25Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity="0.4"></path>
+  </svg>
+`;
diff --git a/public/index.html b/public/index.html
index 1caacf1697b84a491ccd61ee1c77e32573494928..45cdc26d6869c1aa89962a351fbdbb53896c72bf 100644
--- a/public/index.html
+++ b/public/index.html
@@ -15,67 +15,72 @@
       <h1>Executor MVP</h1>
       <p class="subtle">Type a build request. The agent will return a JSON file list. The server writes them to <code>/output/&lt;project&gt;</code>.</p>
 
       <label>Project name (optional)</label>
       <input id="projectName" placeholder="hello-world-app" />
 
       <label>Prompt</label>
       <textarea id="prompt" rows="8" placeholder="Make a minimal Node+TS Hello World web app with GET / that returns 'Hello World'. Include README with run steps."></textarea>
 
       <button id="runBtn">Execute</button>
 
       <section id="clarificationSection" class="clarification hidden">
         <h2>Clarification Needed</h2>
         <p class="clarification-hint">Answer the questions below so the agent can build exactly what you need.</p>
         <form id="clarificationForm">
           <div id="clarificationQuestions" class="clarification-questions"></div>
           <div class="clarification-actions">
             <button type="submit" id="answerClarifications">Answer Questions</button>
             <button type="button" id="skipClarifications" class="skip-button">Skip Questions</button>
           </div>
         </form>
       </section>
 
       <pre id="result" class="result"></pre>
 
-      <section id="taskPlanSection" class="task-plan hidden">
-        <h2>Task Plan Progress</h2>
-        <div class="plan-overview">
-          <div class="progress-container">
-            <div id="taskPlanProgressFill" class="progress-fill"></div>
-          </div>
-          <div id="taskPlanSummary" class="plan-summary"></div>
-        </div>
-        <div class="plan-meta">
-          <div>
-            <span class="meta-label">Current Subtask:</span>
-            <span id="currentSubtaskLabel" class="meta-value">Not started</span>
-          </div>
-          <div>
-            <span class="meta-label">Estimated Completion:</span>
-            <span id="estimatedCompletionLabel" class="meta-value">Pending</span>
-          </div>
-        </div>
-        <ul id="subtaskList" class="subtask-list"></ul>
-      </section>
+      <details id="debugDisclosure" class="debug-disclosure hidden">
+        <summary>🔧 Debug Info (Advanced)</summary>
+        <div id="debugContent" class="debug-content">
+          <section id="taskPlanSection" class="task-plan hidden">
+            <h2>Task Plan Progress</h2>
+            <div class="plan-overview">
+              <div class="progress-container">
+                <div id="taskPlanProgressFill" class="progress-fill"></div>
+              </div>
+              <div id="taskPlanSummary" class="plan-summary"></div>
+            </div>
+            <div class="plan-meta">
+              <div>
+                <span class="meta-label">Current Subtask:</span>
+                <span id="currentSubtaskLabel" class="meta-value">Not started</span>
+              </div>
+              <div>
+                <span class="meta-label">Estimated Completion:</span>
+                <span id="estimatedCompletionLabel" class="meta-value">Pending</span>
+              </div>
+            </div>
+            <ul id="subtaskList" class="subtask-list"></ul>
+          </section>
 
-      <section id="testControls" class="test-controls hidden">
-        <h2>Test &amp; Repair Timeline</h2>
-        <button id="runTestsBtn" class="run-tests">Run Tests</button>
-        <div id="testStatus" class="test-status"></div>
-        <div id="repairTimeline" class="repair-timeline"></div>
-        <section id="repairHistorySection" class="repair-history hidden">
-          <div class="repair-history-header">
-            <h3>Repair History</h3>
-            <span id="repairHistorySummary" class="history-summary-label"></span>
-            <button id="toggleRepairHistory" type="button" class="history-toggle">Show</button>
-          </div>
-          <div id="repairHistoryContent" class="repair-history-content hidden">
-            <div id="repairHistoryTimeline" class="history-timeline"></div>
-          </div>
-        </section>
-      </section>
+          <section id="testControls" class="test-controls hidden">
+            <h2>Test &amp; Repair Timeline</h2>
+            <button id="runTestsBtn" class="run-tests">Run Tests</button>
+            <div id="testStatus" class="test-status"></div>
+            <div id="repairTimeline" class="repair-timeline"></div>
+            <section id="repairHistorySection" class="repair-history hidden">
+              <div class="repair-history-header">
+                <h3>Repair History</h3>
+                <span id="repairHistorySummary" class="history-summary-label"></span>
+                <button id="toggleRepairHistory" type="button" class="history-toggle">Show</button>
+              </div>
+              <div id="repairHistoryContent" class="repair-history-content hidden">
+                <div id="repairHistoryTimeline" class="history-timeline"></div>
+              </div>
+            </section>
+          </section>
+        </div>
+      </details>
     </main>
     <link rel="modulepreload" href="/script.js" />
     <script type="module" src="/script.js"></script>
   </body>
 </html>
diff --git a/public/script.js b/public/script.js
index be9875ed0d2c73aa77e74640fb161afeca85188b..167c98d272799e064587299a8d78b80cb8428eb6 100644
--- a/public/script.js
+++ b/public/script.js
@@ -1,48 +1,51 @@
+import { successIcon, partialIcon, errorIcon, fileIcon } from "./icons.js";
+
 const runBtn = document.getElementById("runBtn");
 const promptEl = document.getElementById("prompt");
 const projEl = document.getElementById("projectName");
 const resultEl = document.getElementById("result");
 const testControlsEl = document.getElementById("testControls");
 const runTestsBtn = document.getElementById("runTestsBtn");
 const testStatusEl = document.getElementById("testStatus");
 const repairTimelineEl = document.getElementById("repairTimeline");
 const clarificationSection = document.getElementById("clarificationSection");
 const clarificationForm = document.getElementById("clarificationForm");
 const clarificationQuestionsEl = document.getElementById("clarificationQuestions");
 const skipClarificationsBtn = document.getElementById("skipClarifications");
 const repairHistorySection = document.getElementById("repairHistorySection");
 const repairHistoryContent = document.getElementById("repairHistoryContent");
 const repairHistoryTimeline = document.getElementById("repairHistoryTimeline");
 const repairHistoryToggle = document.getElementById("toggleRepairHistory");
 const repairHistorySummaryEl = document.getElementById("repairHistorySummary");
 const taskPlanSection = document.getElementById("taskPlanSection");
 const taskPlanProgressFill = document.getElementById("taskPlanProgressFill");
 const taskPlanSummary = document.getElementById("taskPlanSummary");
 const subtaskListEl = document.getElementById("subtaskList");
 const currentSubtaskLabel = document.getElementById("currentSubtaskLabel");
 const estimatedCompletionLabel = document.getElementById("estimatedCompletionLabel");
+const debugDisclosure = document.getElementById("debugDisclosure");
 
 let currentProjectSlug = null;
 let pendingQuestions = [];
 let storedPrompt = "";
 let storedProjectName = "";
 let repairHistoryExpanded = false;
 let loadingPhaseTimer = null;
 let loadingPhase = 0;
 
 const DEFAULT_APP_PORT = "3000";
 const currentPort = typeof window !== "undefined" && window.location ? window.location.port : "";
 const isDemoMode = Boolean(currentPort && currentPort !== DEFAULT_APP_PORT);
 
 function clone(value) {
   return JSON.parse(JSON.stringify(value));
 }
 
 function escapeHtml(value) {
   return String(value)
     .replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;")
     .replace(/'/g, "&#39;");
 }
@@ -166,51 +169,75 @@ function statusIcon(status) {
       return "✅";
     case "failed":
       return "❌";
     case "in_progress":
       return "⚙️";
     default:
       return "⏳";
   }
 }
 
 function formatDuration(ms) {
   if (!ms || ms <= 0) {
     return "-";
   }
   if (ms < 1000) {
     return `${ms}ms`;
   }
   const seconds = ms / 1000;
   if (seconds < 60) {
     return `${seconds.toFixed(1)}s`;
   }
   const minutes = seconds / 60;
   return `${minutes.toFixed(1)}m`;
 }
 
+function hideDebugDisclosure() {
+  if (debugDisclosure) {
+    debugDisclosure.classList.add("hidden");
+    debugDisclosure.removeAttribute("open");
+  }
+}
+
+function revealDebugDisclosure() {
+  if (debugDisclosure) {
+    debugDisclosure.classList.remove("hidden");
+  }
+}
+
+hideDebugDisclosure();
+
+function emphasizeSection(section) {
+  if (!section) return;
+  section.classList.add("is-highlighted");
+  setTimeout(() => {
+    section.classList.remove("is-highlighted");
+  }, 1200);
+}
+
 function resetTaskPlanUI() {
+  hideDebugDisclosure();
   if (taskPlanSection) {
     taskPlanSection.classList.add("hidden");
   }
   if (taskPlanProgressFill) {
     taskPlanProgressFill.style.width = "0%";
   }
   if (taskPlanSummary) {
     taskPlanSummary.textContent = "";
   }
   if (currentSubtaskLabel) {
     currentSubtaskLabel.textContent = "Not started";
   }
   if (estimatedCompletionLabel) {
     estimatedCompletionLabel.textContent = "Pending";
   }
   if (subtaskListEl) {
     subtaskListEl.innerHTML = "";
   }
 }
 
 function formatEstimate(estimate) {
   if (!estimate) return "Unknown";
   const when = new Date(estimate.estimatedCompletionTimestamp);
   const remainingMinutes = estimate.estimatedRemainingMs / 60000;
   const isValidDate = !Number.isNaN(when.getTime());
@@ -283,50 +310,51 @@ function renderTaskPlan(taskPlan, executionResult, timeEstimate) {
       listItem.appendChild(header);
 
       const description = document.createElement("p");
       description.textContent = subtask.description;
       listItem.appendChild(description);
 
       if (Array.isArray(subtask.dependencies) && subtask.dependencies.length > 0) {
         const dependency = document.createElement("span");
         dependency.className = "dependency";
         dependency.textContent = `Depends on: ${subtask.dependencies.join(" → ")}`;
         listItem.appendChild(dependency);
       }
 
       const result = resultMap.get(subtask.id);
       if (result?.durationMs) {
         const duration = document.createElement("span");
         duration.className = "subtask-duration";
         duration.textContent = `Duration: ${formatDuration(result.durationMs)}`;
         listItem.appendChild(duration);
       }
 
       subtaskListEl.appendChild(listItem);
     });
   }
 
+  revealDebugDisclosure();
   taskPlanSection.classList.remove("hidden");
 }
 
 function renderTimelineEntry(label, runResult) {
   const entry = document.createElement("div");
   entry.className = "timeline-entry";
   const title = document.createElement("h3");
   title.textContent = label;
   entry.appendChild(title);
 
   if (!runResult) {
     const p = document.createElement("p");
     p.textContent = "No run recorded.";
     entry.appendChild(p);
     return entry;
   }
 
   const statusLine = document.createElement("p");
   statusLine.append("Status: ", renderStatus(runResult));
   entry.appendChild(statusLine);
 
   const counts = document.createElement("p");
   counts.textContent = `Pass: ${runResult.passCount} | Fail: ${runResult.failCount}`;
   entry.appendChild(counts);
 
@@ -368,50 +396,51 @@ function summarizeRepairHistory(history) {
   if (history.successAttemptNumber) {
     return `Success on attempt ${history.successAttemptNumber}`;
   }
   if (history.finalStatus === "pass") {
     return "Repair succeeded";
   }
   return `Final status: ${history.finalStatus}`;
 }
 
 function renderRepairHistory(history) {
   if (!repairHistorySection || !repairHistoryTimeline || !repairHistorySummaryEl) {
     return;
   }
 
   if (!history || !Array.isArray(history.attempts) || history.attempts.length === 0) {
     repairHistorySection.classList.add("hidden");
     repairHistoryTimeline.innerHTML = "";
     if (repairHistorySummaryEl) {
       repairHistorySummaryEl.textContent = "";
     }
     setRepairHistoryVisibility(false);
     repairHistoryExpanded = false;
     return;
   }
 
+  revealDebugDisclosure();
   repairHistorySection.classList.remove("hidden");
   repairHistoryExpanded = true;
   setRepairHistoryVisibility(true);
 
   repairHistorySummaryEl.textContent = summarizeRepairHistory(history);
   repairHistoryTimeline.innerHTML = "";
 
   const totalAttempts = history.totalAttempts || history.attempts.length;
 
   history.attempts.forEach(attempt => {
     const attemptEl = document.createElement("div");
     const statusClass = attempt.status === "pass"
       ? "status-pass"
       : attempt.status === "fail"
         ? "status-fail"
         : attempt.status === "error"
           ? "status-error"
           : "";
     attemptEl.className = `history-attempt ${statusClass}`.trim();
     if (history.successAttemptNumber === attempt.number) {
       attemptEl.classList.add("attempt-success");
     }
 
     const header = document.createElement("div");
     header.className = "history-attempt-header";
@@ -494,308 +523,390 @@ function renderRepairHistory(history) {
     footer.textContent = `Final status: ${history.finalStatus}.`;
   }
   repairHistoryTimeline.appendChild(footer);
 }
 
 /**
  * Outcome State Machine - Authoritative determination of generation result
  * Returns exactly ONE of three states based on actual test results
  * @param {Object} data - Execution response from backend
  * @returns {'success' | 'partial' | 'error'} - Outcome state
  */
 function computeOutcome(data) {
   // 1. Generation failed or no files produced → ERROR
   if (!data || data.error || !data.files_written || data.files_written === 0) {
     return 'error';
   }
 
   // 2. Files generated + tests executed
   if (data.testResults?.initial?.executed) {
     const testStatus = data.testResults.initial.status?.toUpperCase();
     
     // Tests passed → SUCCESS
     if (testStatus === 'PASS' || testStatus === 'PASSED') {
       return 'success';
     }
-    
+
+    if (testStatus === 'ERROR' || testStatus === 'ERRORED' || testStatus === 'CRASHED') {
+      return 'error';
+    }
+
     // Tests failed → PARTIAL (files exist but quality issue)
     return 'partial';
   }
 
   // 3. Files generated but tests not executed → ERROR (incomplete build)
   return 'error';
 }
 
+function getGeneratedFiles(data) {
+  return Array.from(
+    new Set(
+      (data?.planExecutionResult?.subtaskResults || [])
+        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
+        .filter(Boolean)
+    )
+  );
+}
+
 function renderSuccessCard(data) {
   if (!data || !data.ok || !data.files_written) {
     return false;
   }
 
   resultEl.innerHTML = "";
 
-  const card = document.createElement("div");
-  card.className = "success-card";
+  const card = document.createElement("article");
+  card.className = "outcome-card success-card";
+
+  const header = document.createElement("header");
+  header.className = "outcome-header";
+
+  const iconWrap = document.createElement("span");
+  iconWrap.className = "outcome-icon";
+  iconWrap.innerHTML = successIcon;
+  header.appendChild(iconWrap);
+
+  const headingGroup = document.createElement("div");
+  headingGroup.className = "outcome-heading";
 
-  const header = document.createElement("div");
-  header.className = "success-header";
-  const icon = document.createElement("span");
-  icon.className = "success-icon";
-  icon.textContent = "✅";
   const heading = document.createElement("h2");
-  heading.textContent = "Project Generated Successfully!";
-  header.append(icon, heading);
+  heading.className = "outcome-title";
+  heading.textContent = "Project ready to ship";
+
+  const testStatus = data.testResults?.initial?.status?.toUpperCase() ?? "NOT RUN";
+  const subtitle = document.createElement("p");
+  subtitle.className = "outcome-subtitle";
+  subtitle.textContent = `${data.files_written} files created · Initial tests ${testStatus}`;
+
+  headingGroup.append(heading, subtitle);
+  header.appendChild(headingGroup);
   card.appendChild(header);
 
   const metrics = document.createElement("div");
-  metrics.className = "success-metrics";
-
+  metrics.className = "outcome-metrics";
   const metricItems = [
-    { value: data.files_written, label: "Files Generated" },
-    {
-      value: data.testResults?.initial
-        ? `${data.testResults.initial.status?.toUpperCase() || "UNKNOWN"}`
-        : "NOT RUN",
-      label: "Initial Tests",
-    },
+    { label: "Files generated", value: data.files_written },
     {
+      label: "Build duration",
       value: formatDuration(
         data.planExecutionResult?.totalDurationMs ?? data.timeEstimate?.estimatedRemainingMs
       ),
-      label: "Build Duration",
     },
+    { label: "Tests", value: testStatus },
   ];
 
-  metricItems.forEach(metricData => {
+  metricItems.forEach(({ label, value }) => {
     const metric = document.createElement("div");
-    metric.className = "metric";
+    metric.className = "outcome-metric";
     const metricValue = document.createElement("span");
-    metricValue.className = "metric-value";
-    metricValue.textContent = String(metricData.value ?? "--");
+    metricValue.className = "outcome-metric-value";
+    metricValue.textContent = String(value ?? "--");
     const metricLabel = document.createElement("span");
-    metricLabel.className = "metric-label";
-    metricLabel.textContent = metricData.label;
+    metricLabel.className = "outcome-metric-label";
+    metricLabel.textContent = label;
     metric.append(metricValue, metricLabel);
     metrics.appendChild(metric);
   });
 
   card.appendChild(metrics);
 
-  const files = Array.from(
-    new Set(
-      (data.planExecutionResult?.subtaskResults || [])
-        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
-        .filter(Boolean)
-    )
-  );
-
-  const fileList = document.createElement("div");
-  fileList.className = "file-list";
+  const files = getGeneratedFiles(data);
+  const fileSection = document.createElement("section");
+  fileSection.className = "outcome-section";
   const fileHeading = document.createElement("h3");
-  fileHeading.textContent = "Generated Files";
-  fileList.appendChild(fileHeading);
+  fileHeading.className = "outcome-section-title";
+  fileHeading.textContent = "Generated files";
+  fileSection.appendChild(fileHeading);
+
+  const fileList = document.createElement("ul");
+  fileList.className = "outcome-file-list";
 
-  const fileUl = document.createElement("ul");
   if (files.length > 0) {
     files.forEach(fileName => {
       const item = document.createElement("li");
-      item.textContent = `📄 ${fileName}`;
-      fileUl.appendChild(item);
+      item.className = "outcome-file";
+      const icon = document.createElement("span");
+      icon.className = "outcome-file-icon";
+      icon.innerHTML = fileIcon;
+      const name = document.createElement("span");
+      name.className = "outcome-file-name";
+      name.textContent = fileName;
+      item.append(icon, name);
+      fileList.appendChild(item);
     });
   } else {
-    const item = document.createElement("li");
-    item.textContent = "Files will be available after generation completes.";
-    fileUl.appendChild(item);
+    const empty = document.createElement("li");
+    empty.className = "outcome-file muted";
+    empty.textContent = "Files will be available after generation completes.";
+    fileList.appendChild(empty);
   }
-  fileList.appendChild(fileUl);
-  card.appendChild(fileList);
+
+  fileSection.appendChild(fileList);
+  card.appendChild(fileSection);
 
   const actions = document.createElement("div");
-  actions.className = "action-buttons";
+  actions.className = "outcome-actions";
 
   if (data.browse_url) {
     const openLink = document.createElement("a");
     openLink.className = "btn btn-primary";
     openLink.href = data.browse_url;
     openLink.target = "_blank";
     openLink.rel = "noopener";
-    openLink.textContent = "Open Project";
+    openLink.textContent = "Open project";
     actions.appendChild(openLink);
   }
 
+  const viewFilesButton = document.createElement("button");
+  viewFilesButton.type = "button";
+  viewFilesButton.className = "btn btn-secondary";
+  viewFilesButton.textContent = "View files";
+  viewFilesButton.addEventListener("click", () => {
+    fileSection.scrollIntoView({ behavior: "smooth", block: "start" });
+    emphasizeSection(fileSection);
+  });
+  actions.appendChild(viewFilesButton);
+
   const runTestsButton = document.createElement("button");
   runTestsButton.type = "button";
-  runTestsButton.className = "btn btn-secondary";
-  runTestsButton.textContent = "Run Tests";
+  runTestsButton.className = "btn btn-ghost";
+  runTestsButton.textContent = "Run tests";
   runTestsButton.addEventListener("click", () => {
     if (runTestsBtn) {
       runTestsBtn.click();
       runTestsBtn.scrollIntoView({ behavior: "smooth", block: "center" });
     }
   });
   actions.appendChild(runTestsButton);
 
   card.appendChild(actions);
 
   const rawJson = document.createElement("details");
-  rawJson.className = "raw-json";
+  rawJson.className = "outcome-disclosure";
   const summary = document.createElement("summary");
-  summary.textContent = "View Raw Response";
+  summary.textContent = "Technical details";
   const pre = document.createElement("pre");
   pre.textContent = JSON.stringify(data, null, 2);
   rawJson.append(summary, pre);
   card.appendChild(rawJson);
 
   resultEl.appendChild(card);
   return true;
 }
 
 /**
  * Render Partial Success Card - Files generated but tests failed
  * Yellow/amber theme to indicate caution without panic
  */
+/**
+ * Render Partial Success Card - Files generated but tests failed
+ */
 function renderPartialCard(data) {
   if (!data || !data.files_written) {
     return false;
   }
 
   resultEl.innerHTML = "";
 
-  const card = document.createElement("div");
-  card.className = "partial-card";
+  const card = document.createElement("article");
+  card.className = "outcome-card partial-card";
 
-  const header = document.createElement("div");
-  header.className = "partial-header";
-  const icon = document.createElement("span");
-  icon.className = "partial-icon";
-  icon.textContent = "⚠️";
+  const header = document.createElement("header");
+  header.className = "outcome-header";
+  const iconWrap = document.createElement("span");
+  iconWrap.className = "outcome-icon";
+  iconWrap.innerHTML = partialIcon;
+  header.appendChild(iconWrap);
+
+  const headingGroup = document.createElement("div");
+  headingGroup.className = "outcome-heading";
   const heading = document.createElement("h2");
-  heading.textContent = "Project Created - Tests Need Attention";
-  header.append(icon, heading);
+  heading.className = "outcome-title";
+  heading.textContent = "Project created – tests need attention";
+  const failCount = data.testResults?.initial?.failCount ?? 0;
+  const passCount = data.testResults?.initial?.passCount ?? 0;
+  const subtitle = document.createElement("p");
+  subtitle.className = "outcome-subtitle";
+  subtitle.textContent = `${failCount} failing, ${passCount} passing`;
+  headingGroup.append(heading, subtitle);
+  header.appendChild(headingGroup);
   card.appendChild(header);
 
   const message = document.createElement("p");
-  message.className = "partial-message";
-  const failCount = data.testResults?.initial?.failCount || 0;
-  const passCount = data.testResults?.initial?.passCount || 0;
-  message.textContent = `Files generated successfully, but ${failCount} test${failCount !== 1 ? 's' : ''} failed (${passCount} passed). Review failures below and fix manually or re-run.`;
+  message.className = "outcome-message";
+  message.textContent = "Files are ready, but automated checks highlighted issues. Review the failing tests and apply the fixes before re-running.";
   card.appendChild(message);
 
-  const metrics = document.createElement("div");
-  metrics.className = "partial-metrics";
+  const viewResultsButton = document.createElement("button");
+  viewResultsButton.type = "button";
+  viewResultsButton.className = "btn btn-ghost";
+  viewResultsButton.textContent = "View test results";
+  viewResultsButton.addEventListener("click", () => {
+    if (debugDisclosure) {
+      debugDisclosure.setAttribute("open", "");
+      debugDisclosure.scrollIntoView({ behavior: "smooth", block: "start" });
+    }
+    if (testControlsEl) {
+      testControlsEl.classList.remove("hidden");
+      testControlsEl.scrollIntoView({ behavior: "smooth", block: "start" });
+      emphasizeSection(testControlsEl);
+    }
+  });
+  card.appendChild(viewResultsButton);
 
+  const metrics = document.createElement("div");
+  metrics.className = "outcome-metrics";
   const metricItems = [
-    { value: data.files_written, label: "Files Generated" },
-    { value: failCount, label: "Tests Failed" },
-    { value: passCount, label: "Tests Passed" },
+    { label: "Files generated", value: data.files_written },
+    { label: "Tests failed", value: failCount },
+    { label: "Tests passed", value: passCount },
   ];
 
-  metricItems.forEach(metricData => {
+  metricItems.forEach(({ label, value }) => {
     const metric = document.createElement("div");
-    metric.className = "metric";
+    metric.className = "outcome-metric";
     const metricValue = document.createElement("span");
-    metricValue.className = "metric-value";
-    metricValue.textContent = String(metricData.value ?? "0");
+    metricValue.className = "outcome-metric-value";
+    metricValue.textContent = String(value ?? "0");
     const metricLabel = document.createElement("span");
-    metricLabel.className = "metric-label";
-    metricLabel.textContent = metricData.label;
+    metricLabel.className = "outcome-metric-label";
+    metricLabel.textContent = label;
     metric.append(metricValue, metricLabel);
     metrics.appendChild(metric);
   });
 
   card.appendChild(metrics);
 
-  const files = Array.from(
-    new Set(
-      (data.planExecutionResult?.subtaskResults || [])
-        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
-        .filter(Boolean)
-    )
-  );
-
-  const fileList = document.createElement("div");
-  fileList.className = "file-list";
+  const files = getGeneratedFiles(data);
+  const fileSection = document.createElement("section");
+  fileSection.className = "outcome-section";
   const fileHeading = document.createElement("h3");
-  fileHeading.textContent = "Generated Files";
-  fileList.appendChild(fileHeading);
+  fileHeading.className = "outcome-section-title";
+  fileHeading.textContent = "Generated files";
+  fileSection.appendChild(fileHeading);
+
+  const fileList = document.createElement("ul");
+  fileList.className = "outcome-file-list";
 
-  const fileUl = document.createElement("ul");
   if (files.length > 0) {
     files.forEach(fileName => {
       const item = document.createElement("li");
-      item.textContent = `📄 ${fileName}`;
-      fileUl.appendChild(item);
+      item.className = "outcome-file";
+      const icon = document.createElement("span");
+      icon.className = "outcome-file-icon";
+      icon.innerHTML = fileIcon;
+      const name = document.createElement("span");
+      name.className = "outcome-file-name";
+      name.textContent = fileName;
+      item.append(icon, name);
+      fileList.appendChild(item);
     });
   } else {
-    const item = document.createElement("li");
-    item.textContent = "Files list not available.";
-    fileUl.appendChild(item);
+    const empty = document.createElement("li");
+    empty.className = "outcome-file muted";
+    empty.textContent = "Files list not available.";
+    fileList.appendChild(empty);
   }
-  fileList.appendChild(fileUl);
-  card.appendChild(fileList);
+
+  fileSection.appendChild(fileList);
+  card.appendChild(fileSection);
 
   const actions = document.createElement("div");
-  actions.className = "action-buttons";
+  actions.className = "outcome-actions";
 
   if (data.browse_url) {
     const openLink = document.createElement("a");
     openLink.className = "btn btn-primary";
     openLink.href = data.browse_url;
     openLink.target = "_blank";
     openLink.rel = "noopener";
-    openLink.textContent = "Open Project";
+    openLink.textContent = "Open project";
     actions.appendChild(openLink);
   }
 
   const rerunButton = document.createElement("button");
   rerunButton.type = "button";
   rerunButton.className = "btn btn-secondary";
-  rerunButton.textContent = "Fix & Re-run";
+  rerunButton.textContent = "Fix & re-run";
   rerunButton.addEventListener("click", () => {
-    if (runBtn) {
-      window.scrollTo({ top: 0, behavior: "smooth" });
-      promptEl.focus();
+    if (runTestsBtn) {
+      runTestsBtn.click();
+      runTestsBtn.scrollIntoView({ behavior: "smooth", block: "center" });
     }
   });
   actions.appendChild(rerunButton);
 
+  const viewFilesButton = document.createElement("button");
+  viewFilesButton.type = "button";
+  viewFilesButton.className = "btn btn-ghost";
+  viewFilesButton.textContent = "View files";
+  viewFilesButton.addEventListener("click", () => {
+    fileSection.scrollIntoView({ behavior: "smooth", block: "start" });
+    emphasizeSection(fileSection);
+  });
+  actions.appendChild(viewFilesButton);
+
   card.appendChild(actions);
 
   const rawJson = document.createElement("details");
-  rawJson.className = "raw-json";
+  rawJson.className = "outcome-disclosure";
   const summary = document.createElement("summary");
-  summary.textContent = "View Raw Response";
+  summary.textContent = "Technical details";
   const pre = document.createElement("pre");
   pre.textContent = JSON.stringify(data, null, 2);
   rawJson.append(summary, pre);
   card.appendChild(rawJson);
 
   resultEl.appendChild(card);
   return true;
 }
 
+
 function renderTestLifecycle(testResults, repair) {
   if (!testResults) return;
+  revealDebugDisclosure();
   testStatusEl.innerHTML = "";
   repairTimelineEl.innerHTML = "";
 
   const initialEntry = renderTimelineEntry("Initial Test Run", testResults.initial);
   repairTimelineEl.appendChild(initialEntry);
 
   if (repair?.attempted) {
     const repairEntry = document.createElement("div");
     repairEntry.className = "timeline-entry";
     const heading = document.createElement("h3");
     heading.textContent = "Repair Attempt";
     repairEntry.appendChild(heading);
 
     const summary = document.createElement("p");
     summary.textContent = repair.repaired
       ? "Repair succeeded"
       : repair.error
       ? `Repair failed: ${repair.error}`
       : "Repair attempted but tests still failing";
     repairEntry.appendChild(summary);
 
     if (repair.notes?.length) {
       const notesHeading = document.createElement("p");
       notesHeading.textContent = `Notes: ${repair.notes.join(", ")}`;
       repairEntry.appendChild(notesHeading);
@@ -918,169 +1029,370 @@ function collectClarificationAnswers() {
     if (question.type === "number") {
       if (!input.value) {
         input.reportValidity();
         throw new Error("Please provide all required clarification details.");
       }
       const parsed = Number(input.value);
       if (!Number.isFinite(parsed)) {
         input.focus();
         throw new Error("Please enter a valid number.");
       }
       answers.push({ questionId: question.id, value: parsed });
       continue;
     }
 
     const value = input.value.trim();
     if (!value) {
       input.reportValidity();
       throw new Error("Please provide all required clarification details.");
     }
     answers.push({ questionId: question.id, value });
   }
 
   return { answers };
 }
 
-function formatError(error) {
+function normalizeErrorData(raw) {
   const errorMap = {
     "Failed to fetch": {
-      title: "Connection Error",
-      message: "Unable to connect to server",
-      action: "Check server is running: npm run dev",
+      title: "Connection issue detected",
+      message: "We couldn't reach the executor service.",
+      action: "Ensure the dev server is running locally (npm run dev).",
     },
     ERR_CONNECTION_REFUSED: {
-      title: "Server Not Running",
-      message: "Backend service not responding",
-      action: "Start server: npm run dev",
+      title: "Executor offline",
+      message: "The backend service declined the request.",
+      action: "Start the executor service before retrying.",
     },
     timeout: {
-      title: "Request Timeout",
-      message: "Operation took too long",
-      action: "Try simpler request or check logs",
+      title: "Generation timed out",
+      message: "The request took longer than expected.",
+      action: "Try a smaller prompt or inspect the logs for long-running tasks.",
     },
     NetworkError: {
-      title: "Network Error",
-      message: "Network connection lost",
-      action: "Check internet connection",
+      title: "Network error",
+      message: "A network hiccup interrupted the request.",
+      action: "Check your connection and retry the request.",
     },
   };
 
-  const errorText = error instanceof Error ? error.message : String(error ?? "");
-  const normalized = errorText.toLowerCase();
-  const match = Object.entries(errorMap).find(([key]) =>
+  let primary = raw;
+  if (raw && typeof raw === "object" && !(raw instanceof Error)) {
+    if (raw.error) {
+      primary = raw.error;
+    } else if (raw.message) {
+      primary = raw.message;
+    }
+  }
+
+  const errorMessage =
+    primary instanceof Error
+      ? primary.message
+      : String(primary ?? "").trim();
+
+  const normalized = errorMessage.toLowerCase();
+  const descriptor = Object.entries(errorMap).find(([key]) =>
     normalized.includes(key.toLowerCase())
   );
 
-  const { title, message, action } = match ? match[1] : {
-    title: "Unexpected Error",
-    message: "Something went wrong while generating your project.",
-    action: "Please retry or review the details below.",
+  const baseInfo = descriptor
+    ? descriptor[1]
+    : {
+        title: "Generation failed",
+        message: "The executor couldn't complete this request.",
+        action: "Review the technical details and try again.",
+      };
+
+  const subtitle = errorMessage || baseInfo.message;
+
+  const debugDetails =
+    raw instanceof Error
+      ? { message: raw.message, stack: raw.stack }
+      : primary instanceof Error
+      ? { message: primary.message, stack: primary.stack }
+      : raw && typeof raw === "object"
+      ? raw
+      : { error: subtitle };
+
+  let technicalDetails;
+  if (primary instanceof Error && primary.stack) {
+    technicalDetails = primary.stack;
+  } else if (raw instanceof Error && raw.stack) {
+    technicalDetails = raw.stack;
+  } else if (typeof debugDetails === "string") {
+    technicalDetails = debugDetails;
+  } else {
+    try {
+      technicalDetails = JSON.stringify(debugDetails, null, 2);
+    } catch {
+      technicalDetails = subtitle;
+    }
+  }
+
+  const filesWritten =
+    raw && typeof raw === "object" && typeof raw.files_written === "number"
+      ? raw.files_written
+      : 0;
+
+  const testStatus =
+    raw && typeof raw === "object" && raw.testResults?.initial?.executed
+      ? `Yes (${String(raw.testResults.initial.status ?? "unknown").toUpperCase()})`
+      : "No";
+
+  const stage =
+    raw && typeof raw === "object" && typeof raw.planExecutionResult?.status === "string"
+      ? raw.planExecutionResult.status
+      : "Unknown";
+
+  const suggestions = Array.from(
+    new Set(
+      [
+        baseInfo.action,
+        "Inspect the technical details below for stack traces or API responses.",
+        "Ensure the UMCA executor backend is running locally (npm run dev).",
+      ].filter(Boolean)
+    )
+  );
+
+  return {
+    title: baseInfo.title,
+    message: baseInfo.message,
+    subtitle,
+    technicalDetails,
+    filesWritten,
+    testStatus,
+    stage,
+    suggestions,
   };
+}
+
+function formatError(error) {
+  const details = normalizeErrorData(error);
+
+  const metricsHtml = [
+    { label: "Files generated", value: details.filesWritten },
+    { label: "Tests executed", value: details.testStatus },
+    { label: "Last stage", value: details.stage },
+  ]
+    .map(
+      ({ label, value }) => `
+        <div class="outcome-metric">
+          <span class="outcome-metric-value">${escapeHtml(String(value ?? "--"))}</span>
+          <span class="outcome-metric-label">${escapeHtml(label)}</span>
+        </div>
+      `
+    )
+    .join("");
+
+  const suggestionsHtml = details.suggestions
+    .map(item => `<li>${escapeHtml(item)}</li>`)
+    .join("");
 
-  const technicalDetails = error instanceof Error && error.stack ? error.stack : errorText || String(error);
+  const suggestionSection = suggestionsHtml
+    ? `
+      <section class="outcome-section">
+        <h3 class="outcome-section-title">Next steps</h3>
+        <ul class="outcome-list">${suggestionsHtml}</ul>
+      </section>
+    `
+    : "";
 
   return `
-    <div class="error-card">
-      <div class="error-header">
-        <span class="error-icon">⚠️</span>
-        <h3 class="error-title">${escapeHtml(title)}</h3>
+    <article class="outcome-card error-card">
+      <header class="outcome-header">
+        <span class="outcome-icon">${errorIcon}</span>
+        <div class="outcome-heading">
+          <h2 class="outcome-title">${escapeHtml(details.title)}</h2>
+          <p class="outcome-subtitle">${escapeHtml(details.subtitle)}</p>
+        </div>
+      </header>
+      <p class="outcome-message">${escapeHtml(details.message)}</p>
+      ${suggestionSection}
+      <div class="outcome-metrics">
+        ${metricsHtml}
       </div>
-      <p class="error-message">${escapeHtml(message)}</p>
-      <div class="error-action">${escapeHtml(action)}</div>
-      <details>
+      <details class="outcome-disclosure">
         <summary>Technical details</summary>
-        <pre>${escapeHtml(technicalDetails)}</pre>
+        <pre>${escapeHtml(details.technicalDetails)}</pre>
       </details>
-    </div>
+    </article>
   `;
 }
 
 /**
  * Render Error Card - Generation failed completely
  * Used when no files produced or system error occurred
  */
 function renderErrorCard(data) {
   resultEl.innerHTML = "";
-  
-  const errorMessage = data?.error || data?.message || "Generation failed";
-  const card = document.createElement("div");
-  card.className = "error-card";
-
-  const header = document.createElement("div");
-  header.className = "error-header";
-  const icon = document.createElement("span");
-  icon.className = "error-icon";
-  icon.textContent = "❌";
-  const heading = document.createElement("h3");
-  heading.className = "error-title";
-  heading.textContent = "Generation Failed";
-  header.append(icon, heading);
+
+  const details = normalizeErrorData(data);
+
+  const card = document.createElement("article");
+  card.className = "outcome-card error-card";
+
+  const header = document.createElement("header");
+  header.className = "outcome-header";
+
+  const iconWrap = document.createElement("span");
+  iconWrap.className = "outcome-icon";
+  iconWrap.innerHTML = errorIcon;
+  header.appendChild(iconWrap);
+
+  const headingGroup = document.createElement("div");
+  headingGroup.className = "outcome-heading";
+
+  const heading = document.createElement("h2");
+  heading.className = "outcome-title";
+  heading.textContent = details.title;
+
+  const subtitle = document.createElement("p");
+  subtitle.className = "outcome-subtitle";
+  subtitle.textContent = details.subtitle;
+
+  headingGroup.append(heading, subtitle);
+  header.appendChild(headingGroup);
   card.appendChild(header);
 
   const message = document.createElement("p");
-  message.className = "error-message";
-  message.textContent = typeof errorMessage === 'string' ? errorMessage : "Unable to generate project files.";
+  message.className = "outcome-message";
+  message.textContent = details.message;
   card.appendChild(message);
 
-  const actionList = document.createElement("div");
-  actionList.className = "error-action-list";
-  const actionHeading = document.createElement("p");
-  actionHeading.textContent = "Suggested actions:";
-  actionList.appendChild(actionHeading);
-  
-  const suggestions = document.createElement("ul");
-  suggestions.innerHTML = `
-    <li>→ Simplify your prompt and try again</li>
-    <li>→ Check that the server is running</li>
-    <li>→ Review technical details below for specific errors</li>
-  `;
-  actionList.appendChild(suggestions);
-  card.appendChild(actionList);
+  if (details.suggestions.length > 0) {
+    const section = document.createElement("section");
+    section.className = "outcome-section";
+
+    const sectionTitle = document.createElement("h3");
+    sectionTitle.className = "outcome-section-title";
+    sectionTitle.textContent = "Next steps";
+    section.appendChild(sectionTitle);
+
+    const list = document.createElement("ul");
+    list.className = "outcome-list";
+    details.suggestions.forEach(item => {
+      const li = document.createElement("li");
+      li.textContent = item;
+      list.appendChild(li);
+    });
+    section.appendChild(list);
+    card.appendChild(section);
+  }
+
+  const metrics = document.createElement("div");
+  metrics.className = "outcome-metrics";
+  [
+    { label: "Files generated", value: details.filesWritten },
+    { label: "Tests executed", value: details.testStatus },
+    { label: "Last stage", value: details.stage },
+  ].forEach(({ label, value }) => {
+    const metric = document.createElement("div");
+    metric.className = "outcome-metric";
+    const metricValue = document.createElement("span");
+    metricValue.className = "outcome-metric-value";
+    metricValue.textContent = String(value ?? "--");
+    const metricLabel = document.createElement("span");
+    metricLabel.className = "outcome-metric-label";
+    metricLabel.textContent = label;
+    metric.append(metricValue, metricLabel);
+    metrics.appendChild(metric);
+  });
+  card.appendChild(metrics);
+
+  const disclosure = document.createElement("details");
+  disclosure.className = "outcome-disclosure";
+  const summary = document.createElement("summary");
+  summary.textContent = "Technical details";
+  const pre = document.createElement("pre");
+  pre.textContent = details.technicalDetails;
+  disclosure.append(summary, pre);
 
   const actions = document.createElement("div");
-  actions.className = "action-buttons";
+  actions.className = "outcome-actions";
 
   const retryButton = document.createElement("button");
   retryButton.type = "button";
   retryButton.className = "btn btn-primary";
-  retryButton.textContent = "Try Again";
+  retryButton.textContent = "Try again";
   retryButton.addEventListener("click", () => {
     window.scrollTo({ top: 0, behavior: "smooth" });
     promptEl.focus();
   });
   actions.appendChild(retryButton);
 
-  card.appendChild(actions);
+  const viewDetailsButton = document.createElement("button");
+  viewDetailsButton.type = "button";
+  viewDetailsButton.className = "btn btn-secondary";
+  viewDetailsButton.textContent = "View details";
+  viewDetailsButton.addEventListener("click", () => {
+    disclosure.setAttribute("open", "");
+    pre.scrollIntoView({ behavior: "smooth", block: "center" });
+  });
+  actions.appendChild(viewDetailsButton);
+
+  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
+    const copyButton = document.createElement("button");
+    copyButton.type = "button";
+    copyButton.className = "btn btn-ghost";
+    copyButton.textContent = "Copy summary";
+    copyButton.addEventListener("click", async () => {
+      try {
+        const html = formatError(data);
+        const template = document.createElement("template");
+        template.innerHTML = html;
+        const text = template.content.textContent?.replace(/\s+/g, " ").trim() || details.subtitle;
+        await navigator.clipboard.writeText(text);
+        copyButton.textContent = "Copied!";
+        setTimeout(() => {
+          copyButton.textContent = "Copy summary";
+        }, 1800);
+      } catch (copyError) {
+        console.error("Failed to copy error summary", copyError);
+        copyButton.textContent = "Copy failed";
+        setTimeout(() => {
+          copyButton.textContent = "Copy summary";
+        }, 1800);
+      }
+    });
+    actions.appendChild(copyButton);
+  }
 
-  const technicalDetails = document.createElement("details");
-  technicalDetails.className = "raw-json";
-  const summary = document.createElement("summary");
-  summary.textContent = "Technical details";
-  const pre = document.createElement("pre");
-  pre.textContent = JSON.stringify(data, null, 2);
-  technicalDetails.append(summary, pre);
-  card.appendChild(technicalDetails);
+  if (debugDisclosure) {
+    const openDebugButton = document.createElement("button");
+    openDebugButton.type = "button";
+    openDebugButton.className = "btn btn-ghost";
+    openDebugButton.textContent = "Open debug panel";
+    openDebugButton.addEventListener("click", () => {
+      debugDisclosure.classList.remove("hidden");
+      debugDisclosure.setAttribute("open", "");
+      debugDisclosure.scrollIntoView({ behavior: "smooth", block: "start" });
+      emphasizeSection(debugDisclosure);
+    });
+    actions.appendChild(openDebugButton);
+  }
+
+  card.append(actions, disclosure);
 
   resultEl.appendChild(card);
   return true;
 }
 
 function updateLoadingPhase() {
   if (!resultEl) {
     return null;
   }
 
   const phases = [
     {
       title: "Analyzing your request...",
       hint: "Reading requirements and preparing plan. (typically 10-20 seconds)",
     },
     {
       title: "Creating execution plan...",
       hint: "Breaking down into manageable steps. (typically 10-30 seconds)",
     },
     {
       title: "Building your project...",
       hint: "Generating files and running tests. This may take several minutes.",
     },
   ];
 
@@ -1158,102 +1470,102 @@ async function executeRequest({ prompt, projectName, clarifications }) {
       case 'error':
         rendered = renderErrorCard(data);
         break;
       default:
         console.error('Unknown outcome:', outcome);
         rendered = renderErrorCard({ error: 'Unknown outcome state' });
     }
 
     // Fallback to JSON if render failed (shouldn't happen with state machine)
     if (!rendered) {
       resultEl.textContent = JSON.stringify(data, null, 2);
     }
 
     // Always render task plan and test lifecycle (will be hidden in W26)
     renderTaskPlan(data.taskPlan, data.planExecutionResult, data.timeEstimate);
     
     if (data?.browse_url) {
       currentProjectSlug = data.project;
       testControlsEl.classList.remove("hidden");
       renderTestLifecycle(data.testResults, data.repair);
       renderRepairHistory(data.repairHistory);
     } else {
       currentProjectSlug = null;
     }
   } catch (err) {
-    resultEl.innerHTML = formatError(err);
+    renderErrorCard(err);
   } finally {
     if (loadingPhaseTimer) {
       clearInterval(loadingPhaseTimer);
       loadingPhaseTimer = null;
     }
   }
 }
 
 async function startClarificationFlow() {
   const rawPrompt = promptEl.value;
   const prompt = rawPrompt.trim();
   const projectName = projEl.value.trim();
 
   storedPrompt = rawPrompt;
   storedProjectName = projectName;
 
   if (!prompt) {
     resultEl.textContent = "Please enter a prompt before executing.";
     return;
   }
 
   resultEl.textContent = "Checking requirements...";
   testControlsEl.classList.add("hidden");
   currentProjectSlug = null;
   resetClarificationUI();
 
   try {
     const resp = isDemoMode
       ? fakeResponse(demoClarificationResponse)
       : await fetch("/api/clarify", {
           method: "POST",
           headers: { "content-type": "application/json" },
           body: JSON.stringify({ prompt: rawPrompt }),
         });
     const data = await resp.json();
 
     if (!resp.ok) {
       resultEl.textContent = `Error: ${data?.error || resp.statusText}`;
       return;
     }
 
     const questions = Array.isArray(data?.questions) ? data.questions : [];
     if (questions.length === 0) {
       await executeRequest({ prompt: rawPrompt, projectName });
       return;
     }
 
     renderClarificationQuestions(questions);
     resultEl.textContent = "Clarifications required before generation.";
   } catch (err) {
-    resultEl.innerHTML = formatError(err);
+    renderErrorCard(err);
   }
 }
 
 runBtn.addEventListener("click", async () => {
   await startClarificationFlow();
 });
 
 if (clarificationForm) {
   clarificationForm.addEventListener("submit", async event => {
     event.preventDefault();
     if (!pendingQuestions.length) {
       await executeRequest({ prompt: storedPrompt, projectName: storedProjectName });
       return;
     }
 
     try {
       const clarifications = collectClarificationAnswers();
       await executeRequest({
         prompt: storedPrompt,
         projectName: storedProjectName,
         clarifications
       });
     } catch (err) {
       resultEl.textContent = err instanceof Error ? err.message : String(err);
     }
diff --git a/public/styles.css b/public/styles.css
index 5ae9432a2f07539795065d57af65deeb630cec1f..58e8870146ad75926030b6c5af9b7c9141472c6a 100644
--- a/public/styles.css
+++ b/public/styles.css
@@ -1,38 +1,77 @@
 * { box-sizing: border-box; }
 body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; margin: 0; background: #0b0f19; color: #e6e9ef; }
 .container { max-width: 820px; margin: 40px auto; padding: 24px; background: #111827; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
 h1 { margin-top: 0; font-size: 28px; }
 .subtle { color: #9aa4b2; }
 label { display:block; margin: 16px 0 8px; color:#cbd5e1; }
 input, textarea { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color:#e6e9ef; outline: none; }
 input:focus, textarea:focus { border-color: #64748b; }
 button { margin-top: 16px; padding: 12px 16px; border: none; border-radius: 12px; background: #4f46e5; color: white; font-weight: 600; cursor: pointer; }
 button:hover { filter: brightness(1.05); }
 .result { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 12px; margin-top: 16px; overflow: auto; max-height: 420px; }
 code { background: #0f172a; padding: 2px 6px; border-radius: 6px; border:1px solid #334155; }
 .hidden { display: none; }
+
+#debugDisclosure {
+  margin-top: 2rem;
+  border: 1px solid rgba(51, 65, 85, 0.6);
+  border-radius: 16px;
+  background: rgba(15, 23, 42, 0.6);
+  padding: 0 1.25rem 1.25rem;
+}
+
+#debugDisclosure summary {
+  list-style: none;
+  display: flex;
+  align-items: center;
+  gap: 0.5rem;
+  padding: 1.1rem 0;
+  color: #6b7280;
+  font-size: 0.875rem;
+  font-weight: 500;
+  cursor: pointer;
+  user-select: none;
+}
+
+#debugDisclosure summary::-webkit-details-marker {
+  display: none;
+}
+
+#debugDisclosure summary:hover {
+  color: #374151;
+}
+
+#debugDisclosure[open] summary {
+  color: #94a3b8;
+  margin-bottom: 1rem;
+}
+
+.debug-content {
+  display: grid;
+  gap: 1.5rem;
+}
 .test-controls { margin-top: 24px; padding: 16px; border: 1px solid #334155; border-radius: 12px; background: rgba(15, 23, 42, 0.7); }
 .test-controls h2 { margin-top: 0; }
 .run-tests { margin-top: 0; background: #16a34a; }
 .test-status { margin-top: 16px; padding: 12px; border-radius: 10px; background: rgba(30, 41, 59, 0.8); border: 1px solid #1e293b; font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
 .test-status .status-pass { color: #22c55e; font-weight: 600; }
 .test-status .status-fail { color: #f97316; font-weight: 600; }
 .repair-timeline { margin-top: 16px; display: grid; gap: 12px; }
 .timeline-entry { padding: 12px; border-radius: 10px; border: 1px solid #1f2937; background: rgba(17, 24, 39, 0.85); }
 .timeline-entry h3 { margin: 0 0 8px; font-size: 16px; }
 .timeline-entry p { margin: 4px 0; }
 .repair-history { margin-top: 20px; padding: 14px; border: 1px solid #334155; border-radius: 12px; background: rgba(15, 23, 42, 0.8); }
 .repair-history-header { display: flex; align-items: center; gap: 12px; }
 .repair-history-header h3 { margin: 0; font-size: 18px; }
 .history-summary-label { flex: 1; font-size: 14px; color: #cbd5e1; }
 .history-toggle { background: #1f2937; border: 1px solid #334155; padding: 6px 12px; border-radius: 8px; color: #e2e8f0; font-weight: 500; margin-top: 0; }
 .history-toggle:hover { filter: brightness(1.1); }
 .repair-history-content { margin-top: 16px; }
 .history-timeline { position: relative; display: grid; gap: 16px; border-left: 2px solid rgba(51, 65, 85, 0.6); padding-left: 18px; }
 .history-attempt { position: relative; padding: 12px 16px; border-radius: 10px; border: 1px solid #1f2937; background: rgba(15, 23, 42, 0.9); color: #e2e8f0; }
 .history-attempt::before { content: ""; position: absolute; left: -24px; top: 18px; width: 10px; height: 10px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
 .history-attempt-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
 .history-attempt-badge { width: 44px; height: 44px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); }
 .history-status-icon { font-size: 20px; }
 .history-summary { margin: 0 0 6px; font-weight: 500; }
 .history-files { margin: 8px 0 0; padding-left: 18px; color: #cbd5e1; }
@@ -54,329 +93,354 @@ code { background: #0f172a; padding: 2px 6px; border-radius: 6px; border:1px sol
 .clarification-hint { margin: 0 0 16px; color: #cbd5e1; font-size: 14px; }
 .clarification-questions { display: grid; gap: 16px; }
 .clarification-question { display: grid; gap: 8px; }
 .clarification-options { display: grid; gap: 8px; }
 .clarification-option { display: flex; align-items: center; gap: 8px; }
 .clarification-actions { display: flex; gap: 12px; margin-top: 20px; }
 .skip-button { background: #475569; }
 .task-plan { margin-top: 24px; padding: 16px; border-radius: 12px; border: 1px solid #334155; background: rgba(15, 23, 42, 0.7); }
 .task-plan h2 { margin: 0 0 12px; }
 .plan-overview { display: grid; gap: 12px; }
 .progress-container { width: 100%; height: 12px; border-radius: 999px; background: rgba(30, 41, 59, 0.8); overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.3); }
 .progress-fill { height: 100%; background: linear-gradient(90deg, #34d399, #60a5fa); transition: width 0.3s ease; width: 0%; }
 .plan-summary { font-size: 14px; color: #cbd5e1; }
 .plan-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; font-size: 14px; color: #cbd5e1; }
 .meta-label { font-weight: 600; margin-right: 6px; }
 .meta-value { color: #e2e8f0; }
 .subtask-list { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 10px; }
 .subtask-item { padding: 12px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(17, 24, 39, 0.9); display: grid; gap: 6px; }
 .subtask-item.current { border-color: rgba(52, 211, 153, 0.6); box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.25); }
 .subtask-header { display: flex; align-items: center; gap: 10px; font-weight: 600; }
 .status-icon { font-size: 18px; }
 .dependency { font-size: 12px; color: #94a3b8; }
 .subtask-duration { font-size: 12px; color: #a1a1aa; }
 .task-plan.hidden { display: none; }
 
-.success-card {
-  background: rgba(34, 197, 94, 0.1);
-  border: 1px solid rgba(34, 197, 94, 0.3);
-  border-radius: 8px;
-  padding: 24px;
-  margin-top: 16px;
+.outcome-card {
+  --accent-color: #6366f1;
+  --accent-color-soft: rgba(99, 102, 241, 0.18);
+  --accent-surface: rgba(15, 23, 42, 0.9);
+  --accent-text: #e0e7ff;
+  position: relative;
+  margin-top: 2rem;
+  padding: 2rem;
+  border-radius: 1rem;
+  border: 1px solid rgba(148, 163, 184, 0.25);
+  border-left: 6px solid var(--accent-color);
+  background: linear-gradient(135deg, var(--accent-color-soft), var(--accent-surface));
+  box-shadow: 0 24px 50px rgba(8, 11, 18, 0.38);
+  display: grid;
+  gap: 1.6rem;
+  transition: transform 0.2s ease, box-shadow 0.2s ease;
+  overflow: hidden;
 }
 
-.success-header {
-  display: flex;
-  align-items: center;
-  gap: 12px;
-  margin-bottom: 20px;
+.outcome-card:hover {
+  transform: translateY(-2px);
+  box-shadow: 0 28px 56px rgba(8, 11, 18, 0.44);
 }
 
-.success-header .success-icon {
-  font-size: 32px;
+.outcome-card.success-card {
+  --accent-color: #10b981;
+  --accent-color-soft: rgba(16, 185, 129, 0.18);
+  --accent-text: #bbf7d0;
 }
 
-.success-header h2 {
-  margin: 0;
-  color: #a7f3d0;
+.outcome-card.partial-card {
+  --accent-color: #f59e0b;
+  --accent-color-soft: rgba(245, 158, 11, 0.18);
+  --accent-text: #fef3c7;
 }
 
-.success-metrics {
-  display: grid;
-  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
-  gap: 16px;
-  margin-bottom: 24px;
+.outcome-card.error-card {
+  --accent-color: #ef4444;
+  --accent-color-soft: rgba(239, 68, 68, 0.16);
+  --accent-text: #fecaca;
 }
 
-.metric {
-  text-align: center;
-  padding: 12px;
-  background: rgba(0, 0, 0, 0.3);
-  border-radius: 6px;
+.outcome-header {
+  display: flex;
+  align-items: center;
+  gap: 1.2rem;
 }
 
-.metric-value {
-  display: block;
-  font-size: 28px;
-  font-weight: bold;
-  color: #a7f3d0;
+.outcome-icon {
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  width: 3rem;
+  height: 3rem;
+  border-radius: 999px;
+  background: rgba(15, 23, 42, 0.55);
+  color: var(--accent-color);
+  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.25);
 }
 
-.metric-label {
-  display: block;
-  font-size: 14px;
-  color: #94a3b8;
-  margin-top: 4px;
+.outcome-icon svg {
+  width: 2rem;
+  height: 2rem;
 }
 
-.file-list {
-  margin-bottom: 24px;
+.outcome-heading {
+  display: grid;
+  gap: 0.35rem;
 }
 
-.file-list h3 {
-  color: #e2e8f0;
-  font-size: 16px;
-  margin-bottom: 12px;
+.outcome-title {
+  margin: 0;
+  font-size: 1.5rem;
+  font-weight: 600;
+  color: #f8fafc;
 }
 
-.file-list ul {
-  list-style: none;
-  padding: 0;
+.outcome-subtitle {
   margin: 0;
+  font-size: 0.95rem;
+  color: rgba(226, 232, 240, 0.82);
 }
 
-.file-list li {
-  padding: 6px 0;
-  color: #cbd5e1;
-  font-family: "Monaco", "Courier New", monospace;
-  font-size: 14px;
+.outcome-message {
+  margin: 0;
+  font-size: 1rem;
+  line-height: 1.6;
+  color: rgba(226, 232, 240, 0.92);
 }
 
-.action-buttons {
-  display: flex;
-  gap: 12px;
-  margin-bottom: 16px;
+.outcome-metrics {
+  display: grid;
+  gap: 1rem;
+  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
 }
 
-.action-buttons .btn {
-  padding: 10px 20px;
-  border-radius: 6px;
-  text-decoration: none;
-  font-weight: 500;
-  transition: all 0.2s ease;
+.outcome-metric {
+  padding: 1rem;
+  border-radius: 0.85rem;
+  background: rgba(15, 23, 42, 0.65);
+  border: 1px solid rgba(148, 163, 184, 0.25);
+  display: grid;
+  gap: 0.35rem;
 }
 
-.action-buttons .btn-primary {
-  background: #3b82f6;
-  color: #ffffff;
+.outcome-metric-value {
+  font-size: 1.4rem;
+  font-weight: 600;
+  color: var(--accent-text);
 }
 
-.action-buttons .btn-primary:hover {
-  background: #2563eb;
-  transform: translateY(-1px);
+.outcome-metric-label {
+  font-size: 0.85rem;
+  text-transform: uppercase;
+  letter-spacing: 0.05em;
+  color: rgba(148, 163, 184, 0.85);
 }
 
-.action-buttons .btn-secondary {
-  background: rgba(255, 255, 255, 0.1);
-  color: #e2e8f0;
-  border: none;
-  cursor: pointer;
+.outcome-section {
+  border-top: 1px solid rgba(148, 163, 184, 0.18);
+  padding-top: 1.25rem;
+  display: grid;
+  gap: 0.85rem;
 }
 
-.action-buttons .btn-secondary:hover {
-  background: rgba(255, 255, 255, 0.15);
+.outcome-section-title {
+  margin: 0;
+  font-size: 0.95rem;
+  letter-spacing: 0.04em;
+  text-transform: uppercase;
+  color: rgba(203, 213, 225, 0.88);
 }
 
-.raw-json {
-  margin-top: 16px;
+.outcome-list {
+  margin: 0;
+  padding-left: 1.2rem;
+  display: grid;
+  gap: 0.5rem;
+  color: rgba(226, 232, 240, 0.9);
 }
 
-.raw-json summary {
-  color: #94a3b8;
-  cursor: pointer;
-  font-size: 14px;
+.outcome-list li {
+  position: relative;
+  line-height: 1.5;
 }
 
-.raw-json pre {
-  margin-top: 12px;
-  max-height: 300px;
-  overflow-y: auto;
+.outcome-section .outcome-list li::marker {
+  color: var(--accent-color);
 }
 
-.loading-state {
-  text-align: center;
-  padding: 40px 20px;
+.outcome-file-list {
+  list-style: none;
+  margin: 0;
+  padding: 0;
+  display: grid;
+  gap: 0.6rem;
 }
 
-.spinner {
-  width: 40px;
-  height: 40px;
-  margin: 0 auto 20px;
-  border: 4px solid rgba(148, 163, 184, 0.3);
-  border-top-color: #3b82f6;
-  border-radius: 50%;
-  animation: spin 0.8s linear infinite;
+.outcome-file {
+  display: flex;
+  align-items: center;
+  gap: 0.75rem;
+  padding: 0.6rem 0.75rem;
+  border-radius: 0.75rem;
+  background: rgba(15, 23, 42, 0.55);
+  border: 1px solid rgba(148, 163, 184, 0.18);
+  color: rgba(226, 232, 240, 0.92);
 }
 
-@keyframes spin {
-  to {
-    transform: rotate(360deg);
-  }
+.outcome-file-icon {
+  display: inline-flex;
+  color: var(--accent-color);
 }
 
-.loading-state h3 {
-  color: #e2e8f0;
-  font-size: 20px;
-  margin: 0 0 12px 0;
+.outcome-file-icon svg {
+  width: 1.1rem;
+  height: 1.1rem;
 }
 
-.loading-hint {
-  color: #94a3b8;
-  font-size: 14px;
-  max-width: 400px;
-  margin: 0 auto;
-  line-height: 1.5;
+.outcome-file-name {
+  font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
+  font-size: 0.9rem;
 }
 
-.error-card {
-  background: rgba(239, 68, 68, 0.1);
-  border: 1px solid rgba(239, 68, 68, 0.3);
-  border-radius: 8px;
-  padding: 24px;
-  margin-top: 16px;
+.outcome-file.muted {
+  color: rgba(148, 163, 184, 0.75);
+  background: rgba(15, 23, 42, 0.4);
+  border-style: dashed;
 }
 
-.error-card .error-header {
+.outcome-actions {
   display: flex;
+  flex-wrap: wrap;
+  gap: 0.75rem;
   align-items: center;
-  gap: 12px;
-  margin-bottom: 16px;
 }
 
-.error-card .error-icon {
-  font-size: 24px;
+.outcome-card > .btn {
+  justify-self: flex-start;
 }
 
-.error-card .error-title {
+.btn {
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  gap: 0.5rem;
+  padding: 0.75rem 1.4rem;
+  border-radius: 999px;
+  font-size: 0.95rem;
+  font-weight: 600;
+  border: 1px solid transparent;
+  background: rgba(148, 163, 184, 0.14);
+  color: rgba(226, 232, 240, 0.95);
+  cursor: pointer;
+  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
+  text-decoration: none;
   margin: 0;
-  color: #fca5a5;
-  font-size: 20px;
 }
 
-.error-card .error-message {
-  color: #fecaca;
-  margin-bottom: 16px;
-  line-height: 1.6;
+button.btn {
+  background: rgba(148, 163, 184, 0.14);
 }
 
-.error-card .error-action {
-  color: #cbd5e1;
-  background: rgba(0, 0, 0, 0.3);
-  padding: 12px;
-  border-radius: 6px;
-  margin-bottom: 16px;
-  font-family: "Monaco", monospace;
-  font-size: 14px;
+.btn-primary {
+  background: var(--accent-color);
+  color: #0b0f19;
+  box-shadow: 0 18px 30px rgba(16, 24, 39, 0.35);
 }
 
-.error-card details {
-  margin-top: 16px;
+.btn-primary:hover {
+  transform: translateY(-1px);
+  box-shadow: 0 22px 36px rgba(16, 24, 39, 0.45);
 }
 
-.error-card summary {
-  color: #94a3b8;
-  cursor: pointer;
-  font-size: 14px;
+.btn-secondary {
+  background: rgba(15, 23, 42, 0.65);
+  border-color: rgba(148, 163, 184, 0.35);
 }
 
-.error-card pre {
-  margin-top: 12px;
-  color: #94a3b8;
-  font-size: 12px;
-  max-height: 200px;
-  overflow-y: auto;
+.btn-secondary:hover {
+  transform: translateY(-1px);
+  background: rgba(15, 23, 42, 0.75);
 }
 
-/* Partial Card - Files created but tests failed */
-.partial-card {
-  background: rgba(245, 158, 11, 0.1);
-  border: 1px solid rgba(245, 158, 11, 0.3);
-  border-radius: 8px;
-  padding: 24px;
-  margin-top: 16px;
+.btn-ghost {
+  background: transparent;
+  color: var(--accent-color);
 }
 
-.partial-header {
-  display: flex;
-  align-items: center;
-  gap: 12px;
-  margin-bottom: 16px;
+.btn-ghost:hover {
+  background: rgba(148, 163, 184, 0.12);
 }
 
-.partial-header .partial-icon {
-  font-size: 32px;
+.outcome-disclosure {
+  border-radius: 0.85rem;
+  border: 1px solid rgba(148, 163, 184, 0.2);
+  background: rgba(15, 23, 42, 0.6);
+  padding: 1rem 1.25rem;
 }
 
-.partial-header h2 {
-  margin: 0;
-  color: #fcd34d;
-  font-size: 22px;
+.outcome-disclosure summary {
+  cursor: pointer;
+  color: rgba(203, 213, 225, 0.9);
+  font-weight: 500;
 }
 
-.partial-message {
-  color: #fde68a;
-  margin-bottom: 20px;
+.outcome-disclosure pre {
+  margin: 1rem 0 0;
+  max-height: 240px;
+  overflow-y: auto;
+  font-size: 0.85rem;
   line-height: 1.6;
-  font-size: 15px;
+  background: rgba(15, 23, 42, 0.85);
+  padding: 1rem;
+  border-radius: 0.75rem;
+  border: 1px solid rgba(148, 163, 184, 0.2);
+  color: rgba(226, 232, 240, 0.88);
 }
 
-.partial-metrics {
-  display: flex;
-  gap: 24px;
-  margin-bottom: 24px;
-  padding: 16px;
-  background: rgba(0, 0, 0, 0.2);
-  border-radius: 8px;
-  border: 1px solid rgba(245, 158, 11, 0.2);
+.is-highlighted {
+  animation: highlight-flash 1.2s ease;
 }
 
-.partial-metrics .metric {
-  display: flex;
-  flex-direction: column;
-  gap: 4px;
-}
-
-.partial-metrics .metric-value {
-  font-size: 24px;
-  font-weight: 700;
-  color: #fbbf24;
+@keyframes highlight-flash {
+  0% {
+    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.55);
+  }
+  50% {
+    box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.25);
+  }
+  100% {
+    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
+  }
 }
 
-.partial-metrics .metric-label {
-  font-size: 12px;
-  color: #cbd5e1;
-  text-transform: uppercase;
-  letter-spacing: 0.5px;
+.loading-state {
+  text-align: center;
+  padding: 40px 20px;
 }
 
-.error-action-list {
-  margin: 16px 0;
-  padding: 12px;
-  background: rgba(0, 0, 0, 0.2);
-  border-radius: 6px;
+.spinner {
+  width: 40px;
+  height: 40px;
+  margin: 0 auto 20px;
+  border: 4px solid rgba(148, 163, 184, 0.3);
+  border-top-color: var(--accent-color, #6366f1);
+  border-radius: 50%;
+  animation: spin 0.8s linear infinite;
 }
 
-.error-action-list p {
-  margin: 0 0 8px;
-  color: #cbd5e1;
-  font-weight: 600;
+@keyframes spin {
+  to {
+    transform: rotate(360deg);
+  }
 }
 
-.error-action-list ul {
-  margin: 0;
-  padding-left: 20px;
+.loading-state h3 {
   color: #e2e8f0;
+  font-size: 20px;
+  margin: 0 0 12px 0;
 }
 
-.error-action-list li {
-  margin: 4px 0;
+.loading-hint {
+  color: #94a3b8;
+  font-size: 14px;
+  max-width: 400px;
+  margin: 0 auto;
+  line-height: 1.5;
 }
diff --git a/sbom.spdx.json b/sbom.spdx.json
index f9c2f1d5dbc244e31039f587148e290c8ffc7715..4bcdca19c6fde2f18cafb4c8036a6b6eda7d1166 100644
--- a/sbom.spdx.json
+++ b/sbom.spdx.json
@@ -1,603 +1,777 @@
 {
   "spdxVersion": "SPDX-2.3",
   "dataLicense": "CC0-1.0",
   "SPDXID": "SPDXRef-DOCUMENT",
   "name": "executor-mvp@0.1.0",
-  "documentNamespace": "http://spdx.org/spdxdocs/executor-mvp-0.1.0-3ac53b42-fb79-43ba-8ed1-6a050f1a26e5",
+  "documentNamespace": "http://spdx.org/spdxdocs/executor-mvp-0.1.0-2903e1af-ee5d-49a7-bc92-cdfcc0f6d2fb",
   "creationInfo": {
-    "created": "2025-10-08T19:58:03.355Z",
+    "created": "2025-10-09T02:19:46.368Z",
     "creators": [
       "Tool: npm/cli-11.4.2"
     ]
   },
   "documentDescribes": [
     "SPDXRef-Package-executor-mvp-0.1.0"
   ],
   "packages": [
     {
       "name": "executor-mvp",
       "SPDXID": "SPDXRef-Package-executor-mvp-0.1.0",
       "versionInfo": "0.1.0",
       "packageFileName": "",
       "primaryPackagePurpose": "LIBRARY",
       "downloadLocation": "NOASSERTION",
       "filesAnalyzed": false,
       "homepage": "NOASSERTION",
       "licenseDeclared": "NOASSERTION",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/executor-mvp@0.1.0"
         }
       ]
     },
     {
       "name": "@anthropic-ai/sdk",
       "SPDXID": "SPDXRef-Package-anthropic-ai.sdk-0.21.1",
       "versionInfo": "0.21.1",
       "packageFileName": "node_modules/@anthropic-ai/sdk",
       "description": "The official TypeScript library for the Anthropic API",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/@anthropic-ai/sdk/-/sdk-0.21.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/anthropics/anthropic-sdk-typescript#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/%40anthropic-ai/sdk@0.21.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "7ea76def84537699676853988703638cafc4734f43aaff5e918afb3ee0ba19d855d515a4ce2a9ba4905ec27e3609862a0abf7625e5fa83e2175605e6abd97b5d"
+        }
       ]
     },
     {
       "name": "@types/node",
       "SPDXID": "SPDXRef-Package-types.node-18.19.129",
       "versionInfo": "18.19.129",
       "packageFileName": "node_modules/@anthropic-ai/sdk/node_modules/@types/node",
       "description": "TypeScript definitions for node",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/@types/node/-/node-18.19.129.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/%40types/node@18.19.129"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "86b9a2e635addb0eb46b2a31de2217c293049df52f38b24246dace3db1ed1f5e674e3bceeee8677a5beb740b3474ed3fce5e4367765b6a189a5c455be7871afc"
+        }
       ]
     },
     {
       "name": "undici-types",
       "SPDXID": "SPDXRef-Package-undici-types-5.26.5",
       "versionInfo": "5.26.5",
       "packageFileName": "node_modules/@anthropic-ai/sdk/node_modules/undici-types",
       "description": "A stand-alone types package for Undici",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/undici-types/-/undici-types-5.26.5.tgz",
       "filesAnalyzed": false,
       "homepage": "https://undici.nodejs.org",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/undici-types@5.26.5"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "26508c3be7a174420aaa517193a21f568014566833edc53bcc3fe1f57674ab37a8b121e650954ecd242fbd84985979055c2f887cb29221f7e1bf4b1566ea7aa4"
+        }
       ]
     },
     {
       "name": "@types/node-fetch",
       "SPDXID": "SPDXRef-Package-types.node-fetch-2.6.13",
       "versionInfo": "2.6.13",
       "packageFileName": "node_modules/@types/node-fetch",
       "description": "TypeScript definitions for node-fetch",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/@types/node-fetch/-/node-fetch-2.6.13.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node-fetch",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/%40types/node-fetch@2.6.13"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "406a51569cd2694b37d0905218f8ce83852f7aedfce1eadb1c1a13d7378e36fc827f043122452c84b00ea8dfe4f448c6be23d19964d37ba687daac9258a4d54b"
+        }
       ]
     },
     {
       "name": "abort-controller",
       "SPDXID": "SPDXRef-Package-abort-controller-3.0.0",
       "versionInfo": "3.0.0",
       "packageFileName": "node_modules/abort-controller",
       "description": "An implementation of WHATWG AbortController interface.",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/abort-controller/-/abort-controller-3.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/mysticatea/abort-controller#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/abort-controller@3.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "87c950f2d69c6589d1def3504e089b8feb4e0c7239ffe974e80bb63dcae2bff1a67add1e6a3e13c161f8d6c3bdc271c3890b048f5f6ad1daf375675e007b707a"
+        }
       ]
     },
     {
       "name": "agentkeepalive",
       "SPDXID": "SPDXRef-Package-agentkeepalive-4.6.0",
       "versionInfo": "4.6.0",
       "packageFileName": "node_modules/agentkeepalive",
       "description": "Missing keepalive http.Agent",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/agentkeepalive/-/agentkeepalive-4.6.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/node-modules/agentkeepalive#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/agentkeepalive@4.6.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "9236bc8fb3e39a770e36a693b01f1f43ec04da6494d8327d0f85caa09e4f15621d44c6ba48b48dd5f7f898eaf88c26df452b3147891e222c92254d0df53e6121"
+        }
       ]
     },
     {
       "name": "ajv",
       "SPDXID": "SPDXRef-Package-ajv-8.17.1",
       "versionInfo": "8.17.1",
       "packageFileName": "node_modules/ajv",
       "description": "Another JSON Schema Validator",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/ajv/-/ajv-8.17.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://ajv.js.org",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/ajv@8.17.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "07f801b8d8394a2313acf902f80dbe716d11b33c316269fa558c41fe29e5052b52e67c7ac4722dfde84a46120c86abac97b6bc2e34286678c2b39be1c31390d6"
+        }
       ]
     },
     {
       "name": "ajv-formats",
       "SPDXID": "SPDXRef-Package-ajv-formats-3.0.1",
       "versionInfo": "3.0.1",
       "packageFileName": "node_modules/ajv-formats",
       "description": "Format validation for Ajv v7+",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/ajv-formats/-/ajv-formats-3.0.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/ajv-validator/ajv-formats#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/ajv-formats@3.0.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "f2252a979d04511fae51c7514371c3a9ae84572a3776870bf20e5627714d7169aeeb621b90652e7bfa44c8b056f1518a2ae7133e0a9e92ce1f214d43038ca8c1"
+        }
       ]
     },
     {
       "name": "basic-auth",
       "SPDXID": "SPDXRef-Package-basic-auth-2.0.1",
       "versionInfo": "2.0.1",
       "packageFileName": "node_modules/basic-auth",
       "description": "node.js basic auth parser",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/basic-auth/-/basic-auth-2.0.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/jshttp/basic-auth#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/basic-auth@2.0.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "345f9ea6e11d9d4615946ba16b16dbabe76f26db702e7198f988b195794c1392a94395b70a75c0e5c5539de63748f6cf0d191c8cc6e27ebc261587029603997a"
+        }
       ]
     },
     {
       "name": "safe-buffer",
       "SPDXID": "SPDXRef-Package-safe-buffer-5.1.2",
       "versionInfo": "5.1.2",
       "packageFileName": "node_modules/basic-auth/node_modules/safe-buffer",
       "description": "Safer Node.js Buffer API",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/feross/safe-buffer",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/safe-buffer@5.1.2"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "19dd94641243917958ec66c9c5fb04f3f9ef2a45045351b7f1cd6c88de903fa6bd3d3f4c98707c1a7a6c71298c252a05f0b388aedf2e77fc0fb688f2b381bafa"
+        }
       ]
     },
     {
       "name": "cors",
       "SPDXID": "SPDXRef-Package-cors-2.8.5",
       "versionInfo": "2.8.5",
       "packageFileName": "node_modules/cors",
       "description": "Node.js CORS middleware",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/cors/-/cors-2.8.5.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/expressjs/cors#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/cors@2.8.5"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "2881db2c9aaeef7446aff8676eb3bdb817a2c4d1aebd2423ba5fe3745bd2fca152207d615957759e0ef3387c7e62b11f2272c6eeae27e861d0f5c0edc6ffcfea"
+        }
       ]
     },
     {
       "name": "diff",
       "SPDXID": "SPDXRef-Package-diff-5.2.0",
       "versionInfo": "5.2.0",
       "packageFileName": "node_modules/diff",
       "description": "A JavaScript text diff implementation.",
       "downloadLocation": "https://registry.npmjs.org/diff/-/diff-5.2.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/kpdecker/jsdiff#readme",
       "licenseDeclared": "BSD-3-Clause",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/diff@5.2.0"
         }
       ],
       "checksums": [
         {
           "algorithm": "SHA512",
           "checksumValue": "b88143c6aa5164667a4e13a4f388447ea5a81f1d9d7af445be94d97131eeafce6f2267dac546d35bd4728780a90ae0e74e838fd4212d5ca220cad1c13d57dfe4"
         }
       ]
     },
     {
       "name": "dotenv",
       "SPDXID": "SPDXRef-Package-dotenv-16.6.1",
       "versionInfo": "16.6.1",
       "packageFileName": "node_modules/dotenv",
       "description": "Loads environment variables from .env file",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/dotenv/-/dotenv-16.6.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/motdotla/dotenv#readme",
       "licenseDeclared": "BSD-2-Clause",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/dotenv@16.6.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "b81ab87a05874dc4eddf76bbdafa521b4cf71e73ee225e8da98713aca120d9ace81329768695b4cea971cacab6a4af47943207c87c9a91e61a627480c1df1ba3"
+        }
       ]
     },
     {
       "name": "event-target-shim",
       "SPDXID": "SPDXRef-Package-event-target-shim-5.0.1",
       "versionInfo": "5.0.1",
       "packageFileName": "node_modules/event-target-shim",
       "description": "An implementation of WHATWG EventTarget interface.",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/event-target-shim/-/event-target-shim-5.0.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/mysticatea/event-target-shim",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/event-target-shim@5.0.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "8bfd976e74b3feec51094ebe35d54980a5834cce36efe32a61b910cc3df6d43b8240952a3ae24a200d08336f96db1b581dd28e999e1d47a7c4c6c7784972fe59"
+        }
       ]
     },
     {
       "name": "fast-uri",
       "SPDXID": "SPDXRef-Package-fast-uri-3.1.0",
       "versionInfo": "3.1.0",
       "packageFileName": "node_modules/fast-uri",
       "description": "Dependency-free RFC 3986 URI toolbox",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/fastify/fast-uri",
       "licenseDeclared": "BSD-3-Clause",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/fast-uri@3.1.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "88f79e0ca25259fe0810e6ac555ae49d7a5a055d08029cff829ed2d9b6fb6782e58db976306251a889d9894ad0c15d7a729cf0fc3dd2e63e49ba58ff813e7600"
+        }
       ]
     },
     {
       "name": "form-data-encoder",
       "SPDXID": "SPDXRef-Package-form-data-encoder-1.7.2",
       "versionInfo": "1.7.2",
       "packageFileName": "node_modules/form-data-encoder",
       "description": "Encode FormData content into the multipart/form-data format",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/form-data-encoder/-/form-data-encoder-1.7.2.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/octet-stream/form-data-encoder#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/form-data-encoder@1.7.2"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "a9faad61a9f7af1ae70a4d5561a0381fe32cf717693eabcb65aeb198c805be13b7db1effdc9fc4c5c4ddeaaa71334bc7d8674c23ea687a1c8166fa9f313b68f0"
+        }
       ]
     },
     {
       "name": "formdata-node",
       "SPDXID": "SPDXRef-Package-formdata-node-4.4.1",
       "versionInfo": "4.4.1",
       "packageFileName": "node_modules/formdata-node",
       "description": "Spec-compliant FormData implementation for Node.js",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/formdata-node/-/formdata-node-4.4.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/octet-stream/form-data#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/formdata-node@4.4.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "d228ab669dee5438d51adf69e3d6936aa8e4f384eb82510d103baa7dd959435ae80bd09694f93a02f7fc1049d935c02a3e89f0906df9c789f7c30ff54c760079"
+        }
       ]
     },
     {
       "name": "web-streams-polyfill",
       "SPDXID": "SPDXRef-Package-web-streams-polyfill-4.0.0-beta.3",
       "versionInfo": "4.0.0-beta.3",
       "packageFileName": "node_modules/formdata-node/node_modules/web-streams-polyfill",
       "description": "Web Streams, based on the WHATWG spec reference implementation",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/web-streams-polyfill/-/web-streams-polyfill-4.0.0-beta.3.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/MattiasBuelens/web-streams-polyfill#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/web-streams-polyfill@4.0.0-beta.3"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "416f794c24da1e6b187c70f26c63303b920920cf7723feaf4d193e75a1d35853e1c21f82f0283b8fb5f22abc2b8fc21beaf6177b4a1c60dae6cd8e3100037aba"
+        }
       ]
     },
     {
       "name": "humanize-ms",
       "SPDXID": "SPDXRef-Package-humanize-ms-1.2.1",
       "versionInfo": "1.2.1",
       "packageFileName": "node_modules/humanize-ms",
       "description": "transform humanize time to ms",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/humanize-ms/-/humanize-ms-1.2.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/node-modules/humanize-ms#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/humanize-ms@1.2.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "165ef4bd8b6c0056ff0b4e8f4d2f5d641a3b8a16aef93bbf0cd0a4fcec8785e6b4ed2f9a78c5a914591469745af1f23e49c65b108f1d7d2c7063b83167d48055"
+        }
       ]
     },
     {
       "name": "json-schema-traverse",
       "SPDXID": "SPDXRef-Package-json-schema-traverse-1.0.0",
       "versionInfo": "1.0.0",
       "packageFileName": "node_modules/json-schema-traverse",
       "description": "Traverse JSON Schema passing each schema object to callback",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-1.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/epoberezkin/json-schema-traverse#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/json-schema-traverse@1.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "34cf3f3fd9f75e35e12199f594b86415a0024ce5114178d6855e0103f4673aff31be0aadaa9017f483b89914314b1d51968e2dab37aa6f4b0e96bb9a3b2dddba"
+        }
       ]
     },
     {
       "name": "morgan",
       "SPDXID": "SPDXRef-Package-morgan-1.10.1",
       "versionInfo": "1.10.1",
       "packageFileName": "node_modules/morgan",
       "description": "HTTP request logger middleware for node.js",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/morgan/-/morgan-1.10.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/expressjs/morgan#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/morgan@1.10.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "db6ddd31126d23f976e5d24a5a98228f670cb72c2e1bf5a250a5ddbf07db846281872d69b804aa5f017399667bf8aef7bd43e847b492d90cf6708fe0f4c2b0d0"
+        }
       ]
     },
     {
       "name": "debug",
       "SPDXID": "SPDXRef-Package-debug-2.6.9",
       "versionInfo": "2.6.9",
       "packageFileName": "node_modules/morgan/node_modules/debug",
       "description": "small debugging utility",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/visionmedia/debug#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/debug@2.6.9"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "6c2ec496b7496899cf6c03fed44a2d62fa99b1bdde725e708ba05f8ba0494d470da30a7a72fb298348d7ce74532838e6fc4ec076014155e00f54c35c286b0730"
+        }
       ]
     },
     {
       "name": "ms",
       "SPDXID": "SPDXRef-Package-ms-2.0.0",
       "versionInfo": "2.0.0",
       "packageFileName": "node_modules/morgan/node_modules/ms",
       "description": "Tiny milisecond conversion utility",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/zeit/ms#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/ms@2.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "4e9a7ad0fe885090d3b8eabfe59f1c76c93326e8dfc2a7ce4e4af02308fb211212a679099d3e92c89e0f08f9c63281630bd75d85a979295218b40b7dee2c74e4"
+        }
       ]
     },
     {
       "name": "on-finished",
       "SPDXID": "SPDXRef-Package-on-finished-2.3.0",
       "versionInfo": "2.3.0",
       "packageFileName": "node_modules/morgan/node_modules/on-finished",
       "description": "Execute a callback when a request closes, finishes, or errors",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/on-finished/-/on-finished-2.3.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/jshttp/on-finished#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/on-finished@2.3.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "8a4a9d906000c9ffd7fe03e15c6bdf800cad0d9b436ebf9b90d509d0df61e4c23f7667600acde5ea1a07adc52fe35b1129ec378c8c2ba78a900d788af7d52dc3"
+        }
       ]
     },
     {
       "name": "node-domexception",
       "SPDXID": "SPDXRef-Package-node-domexception-1.0.0",
       "versionInfo": "1.0.0",
       "packageFileName": "node_modules/node-domexception",
       "description": "An implementation of the DOMException class from NodeJS",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/node-domexception/-/node-domexception-1.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/jimmywarting/node-domexception#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/node-domexception@1.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "fe3299a0ca70d05f06470978fde2d138f03771f717b4b0293f44332e6513fc7b8f0995b207b218f59acc78ac363bf9c522a3d00773d533d6989b4177d760170d"
+        }
       ]
     },
     {
       "name": "object-assign",
       "SPDXID": "SPDXRef-Package-object-assign-4.1.1",
       "versionInfo": "4.1.1",
       "packageFileName": "node_modules/object-assign",
       "description": "ES2015 `Object.assign()` ponyfill",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/sindresorhus/object-assign#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/object-assign@4.1.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "ac98134279149c7d6c170f324fa552537cc3dec5a6bbab19848b1e63c557f8646edcfe85ec5bbe24d0e85df9251256cb2529dcdc55101d57b8714e618fe05c52"
+        }
       ]
     },
     {
       "name": "openai",
       "SPDXID": "SPDXRef-Package-openai-4.104.0",
       "versionInfo": "4.104.0",
       "packageFileName": "node_modules/openai",
       "description": "The official TypeScript library for the OpenAI API",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/openai/-/openai-4.104.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/openai/openai-node#readme",
       "licenseDeclared": "Apache-2.0",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/openai@4.104.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "a7df4414db00ff25fa52154ef777f9909b0344b020f824c0d9106a7472b846d2bcbb9209c37d87c9bd9d4c629b9e71669eea01bf9afb676094448f6c199a52b8"
+        }
       ]
     },
     {
       "name": "require-from-string",
       "SPDXID": "SPDXRef-Package-require-from-string-2.0.2",
       "versionInfo": "2.0.2",
       "packageFileName": "node_modules/require-from-string",
       "description": "Require module from string",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/require-from-string/-/require-from-string-2.0.2.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/floatdrop/require-from-string#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/require-from-string@2.0.2"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "5dfd2759ee91b1ece214cbbe029f5b8a251b9a996ae92f7fa7eef0ed85cffc904786b5030d48706bebc0372b9bbaa7d9593bde53ffc36151ac0c6ed128bfef13"
+        }
       ]
     },
     {
       "name": "slugify",
       "SPDXID": "SPDXRef-Package-slugify-1.6.6",
       "versionInfo": "1.6.6",
       "packageFileName": "node_modules/slugify",
       "description": "Slugifies a String",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/slugify/-/slugify-1.6.6.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/simov/slugify",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/slugify@1.6.6"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "87ecfb1ca1d85e3eb0254f809d2ffe207f1487d7dd717d4bae1835fd531d7fd3f0a0141715c5e201db32dad48ad0fea02b024b5e9d36afdd1a8540aa1e4f6baf"
+        }
       ]
     },
     {
       "name": "web-streams-polyfill",
       "SPDXID": "SPDXRef-Package-web-streams-polyfill-3.3.3",
       "versionInfo": "3.3.3",
       "packageFileName": "node_modules/web-streams-polyfill",
       "description": "Web Streams, based on the WHATWG spec reference implementation",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/web-streams-polyfill/-/web-streams-polyfill-3.3.3.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/MattiasBuelens/web-streams-polyfill#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/web-streams-polyfill@3.3.3"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "7762562c28af999613488a207bd32c805099aede7bd418a47161989230b59219656d3783946a99d83f2f0fc13f9496bc58659b6fb3e59bcfd725857b2091d967"
+        }
       ]
     }
   ],
   "relationships": [
     {
       "spdxElementId": "SPDXRef-DOCUMENT",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DESCRIBES"
     },
     {
       "spdxElementId": "SPDXRef-Package-anthropic-ai.sdk-0.21.1",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DEPENDENCY_OF"
     },
     {
       "spdxElementId": "SPDXRef-Package-ajv-8.17.1",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DEPENDENCY_OF"
     },
     {
       "spdxElementId": "SPDXRef-Package-ajv-formats-3.0.1",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DEPENDENCY_OF"
     },
     {
diff --git a/tests/ui/execution-flow.spec.ts-snapshots/execution-results-chromium-linux.png b/tests/ui/execution-flow.spec.ts-snapshots/execution-results-chromium-linux.png
new file mode 100644
index 0000000000000000000000000000000000000000..2469f9edd64dc7672a389b53f797f8f5a2e7d4df
GIT binary patch
literal 96929
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
YC94`ul5WOQfluhJ=o#sjYdeJf7p)P4<^TWy

literal 0
HcmV?d00001

diff --git a/tests/ui/home.spec.ts-snapshots/home-page-chromium-linux.png b/tests/ui/home.spec.ts-snapshots/home-page-chromium-linux.png
new file mode 100644
index 0000000000000000000000000000000000000000..9dba51f9f01b6db20d45fb6a94bc08024abcc7be
GIT binary patch
literal 39731
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
UGvVhqK7|&<+mq>0zJ`71&*URScK`qY

literal 0
HcmV?d00001

diff --git a/tests/ui/outcome-state-machine.test.ts b/tests/ui/outcome-state-machine.test.ts
index fa343fe3611c03d7e46e5803158dc0edf07d8dac..1e59b40f51fa857aa52304249fc23ef287e97ba1 100644
--- a/tests/ui/outcome-state-machine.test.ts
+++ b/tests/ui/outcome-state-machine.test.ts
@@ -97,61 +97,74 @@ describe('Outcome State Machine', () => {
         testResults: {
           initial: {
             executed: true,
             status: 'PASSED'
           }
         }
       };
       expect(computeOutcome(data)).toBe('success');
     });
 
     it('should return "partial" when files written but tests fail', () => {
       const data = {
         files_written: 5,
         testResults: {
           initial: {
             executed: true,
             status: 'FAIL',
             failCount: 2,
             passCount: 3
           }
         }
       };
       expect(computeOutcome(data)).toBe('partial');
     });
 
-    it('should return "partial" when tests executed with error status', () => {
+    it('should return "error" when tests executed with error status', () => {
       const data = {
         files_written: 4,
         testResults: {
           initial: {
             executed: true,
             status: 'ERROR'
           }
         }
       };
-      expect(computeOutcome(data)).toBe('partial');
+      expect(computeOutcome(data)).toBe('error');
+    });
+
+    it('should return "error" when tests crash during execution', () => {
+      const data = {
+        files_written: 2,
+        testResults: {
+          initial: {
+            executed: true,
+            status: 'CRASHED'
+          }
+        }
+      };
+      expect(computeOutcome(data)).toBe('error');
     });
 
     it('should return "error" when files written but tests not executed', () => {
       const data = {
         files_written: 5,
         testResults: {
           initial: {
             executed: false,
             status: 'NOT_RUN'
           }
         }
       };
       expect(computeOutcome(data)).toBe('error');
     });
 
     it('should return "error" when files written but testResults missing', () => {
       const data = {
         files_written: 5
       };
       expect(computeOutcome(data)).toBe('error');
     });
 
     it('should return "error" when testResults.initial is missing', () => {
       const data = {
         files_written: 5,
diff --git a/tests/ui/presentation-policy.playwright.ts b/tests/ui/presentation-policy.playwright.ts
new file mode 100644
index 0000000000000000000000000000000000000000..9fc6fa7d56f14484a7544534e165928a4888e1a8
--- /dev/null
+++ b/tests/ui/presentation-policy.playwright.ts
@@ -0,0 +1,36 @@
+import { test, expect } from "@playwright/test";
+
+test.describe("Presentation policy", () => {
+  test("debug disclosure is closed by default", async ({ page }) => {
+    await page.goto("/");
+    const debugDisclosure = page.locator("#debugDisclosure");
+
+    await expect(debugDisclosure).toBeVisible();
+    await expect(debugDisclosure).not.toHaveAttribute("open", /.+/);
+    await expect(page.locator("#taskPlanSection")).toBeHidden();
+    await expect(page.locator("#testControls")).toBeHidden();
+  });
+
+  test("opening disclosure reveals internal state when available", async ({ page }) => {
+    await page.goto("/");
+
+    await page.evaluate(() => {
+      const doc = globalThis.document;
+      doc?.getElementById("taskPlanSection")?.classList.remove("hidden");
+      doc?.getElementById("testControls")?.classList.remove("hidden");
+    });
+
+    const debugDisclosure = page.locator("#debugDisclosure");
+    const summary = debugDisclosure.locator("summary");
+
+    await expect(debugDisclosure).not.toHaveAttribute("open", /.+/);
+    await expect(page.locator("#taskPlanSection")).not.toBeVisible();
+    await expect(page.locator("#testControls")).not.toBeVisible();
+
+    await summary.click();
+
+    await expect(debugDisclosure).toHaveAttribute("open", "");
+    await expect(page.locator("#taskPlanSection")).toBeVisible();
+    await expect(page.locator("#testControls")).toBeVisible();
+  });
+});
 
EOF
)