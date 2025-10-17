# Phase 16 Discovery Note — Accessibility & Pause Clarification Contract

## Integration Point 1 — Home Link Contrast
- **File:** `public/index.html:16`
- **Context:** Main container renders the Fixtures link with inline styling but default link colour

```html
16   <main class="container">
17     <h1>Executor MVP</h1>
18     <p><a href="/fixtures.html" style="text-decoration:underline">🔍 Debug / Fixtures</a></p>
19     <p class="subtle">Type a build request. The agent will return a JSON file list. The server writes them to <code>/output/<project></code>.</p>
20
21     <label>Project name (optional)</label>
22     <input id="projectName" placeholder="hello-world-app" />
```

**Notes:** Anchor inherits browser blue (`#0000ee`) against `.container` background `#111827`, creating the 1.88:1 contrast violation flagged by axe-core.

## Integration Point 2 — Container Link Styles
- **File:** `public/styles.css:1`
- **Context:** Global typography and container styles are in place; there is no explicit rule for anchors inside `.container`

```css
1  * { box-sizing: border-box; }
2  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; margin: 0; background: #0b0f19; color: #e6e9ef; }
3  .container { max-width: 820px; margin: 40px auto; padding: 24px; background: #111827; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
4  h1 { margin-top: 0; font-size: 28px; }
5  .subtle { color: #9aa4b2; }
6  label { display:block; margin: 16px 0 8px; color:#cbd5e1; }
7  input, textarea { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color:#e6e9ef; outline: none; }
```

**Notes:** Adding `.container a` + focus styles with lighter hues (e.g. `#60a5fa`) will meet ≥4.5:1 contrast and keep underlined affordance.

## Integration Point 3 — Pause Immediacy Clarification Handling
- **File:** `tests/ui/pause-immediacy.spec.ts:11`
- **Context:** Test only waits 1s for clarifications and immediately skips if visible

```ts
11   await page.locator('#prompt').fill('Create a simple Node web server that says Hello');
12   const executeButton = page.getByRole('button', { name: /Execute/i });
13   await executeButton.click();
14 
15   // If clarifications UI appears, skip to start execution
16   const clarSection = page.locator('#clarificationSection:not(.hidden)');
17   if (await clarSection.isVisible({ timeout: 1000 }).catch(() => false)) {
18     const skipBtn = page.locator('#skipClarifications');
19     if (await skipBtn.isVisible().catch(() => false)) {
20       await skipBtn.click();
21     }
22   }
```

**Notes:** Clarifications often arrive slightly after 1s; helper should wait up to ~5s and answer when required so `Pause` button is reachable.

## Integration Point 4 — Pause/Resume E2E Clarification Flow
- **File:** `tests/ui/pause-resume-e2e.spec.ts:21` (first test) & `:144` (multi-cycle loop)

```ts
21   // Handle clarification modal if it appears
22   await page.waitForTimeout(3000); // Wait longer for clarifications to load
23   const clarificationSection = page.locator('#clarificationSection');
24   const isClarificationVisible = await clarificationSection.isVisible().catch(() => false);
...
60   const answerButton = page.locator('#answerClarifications');
61   await answerButton.click();
62   console.log("  Submitted clarifications");
...
144  // Pause and resume twice
145  for (let i = 1; i <= 2; i++) {
146    await page.waitForTimeout(2000);
147
148    const pauseButton = page.locator('button.btn.btn-secondary:has-text("Pause")');
149    await expect(pauseButton).toBeVisible({ timeout: 15000 });
```

**Notes:** First scenario has inline clarification logic; multi-cycle test never clears prompts. New helper should run before loop and inside other specs to ensure execution starts.

## Integration Point 5 — Shared Test Helpers
- **File:** `tests/ui/helpers.ts:1`
- **Context:** Helper exports cover API utilities only; no UI clarification driver

```ts
1  import { APIRequestContext } from '@playwright/test';
2  import { randomBytes } from 'node:crypto';
...
24 export async function postExecute(api: APIRequestContext, payload: Record<string, unknown>) {
25   const r = await api.post('/api/execute', { data: payload });
26   const body = await r.json().catch(() => ({} as unknown));
27   return { status: r.status(), body };
28 }
```

**Notes:** Extending this module with `handleClarifications(page, strategy)` keeps specs DRY and consistent.

## Integration Point 6 — Visual Regression Baselines
- **Files:** `tests/ui/home.spec.ts-snapshots/` & `tests/ui/execution-flow.spec.ts-snapshots/`
- **Observation:** Baselines predate orchestration UI. Current files (e.g. `home-page-chromium.png`, `execution-results-firefox.png`) disagree with new UI by ~2% pixels, causing repeated Playwright diffs.

**Notes:** Contract should call for manual verification followed by `npx playwright test --update-snapshots` and commit of refreshed PNG artefacts.

## Stack Compliance Verification
- ✓ `ai-stack.json` enforces TypeScript/JS, Node 20, vanilla frontend — planned edits stay within scope.
- ✓ No Python or new dependencies required; work limited to `/public`, `tests/ui`, and `contracts`.
- ✓ No API surface changes identified; only UI/test adjustments and contract authoring.
