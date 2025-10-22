import { test, expect, request } from '@playwright/test';
import { handleClarifications } from './helpers.js';

/**
 * Verifies that clicking Pause immediately updates orchestration state via snapshot fetch,
 * without waiting for the next polling tick or SSE update.
 */
test('Pause UX immediacy', async ({ page }) => {
  const api = await request.newContext({ baseURL: process.env.UI_ORIGIN ?? 'http://localhost:3000' });
  await page.goto('/');

  // Enter a simple prompt to start a run
  await page.locator('#prompt').fill('Create a simple Node web server that says Hello');
  const executeButton = page.getByRole('button', { name: /Execute/i });

  // Start the run
  await executeButton.click();

  // Resolve clarifications reliably before expecting Pause button
  await handleClarifications(page, { timeoutMs: 5000 });

  // Wait until orchestration controls appear and Pause is enabled
  const pauseButton = page.getByRole('button', { name: /^Pause$/ });
  await expect(pauseButton).toBeVisible({ timeout: 10000 });
  await expect(pauseButton).toBeEnabled();

  // Grab session id from the client context
  const sessionId = await page.evaluate(() => (globalThis as unknown as { activeSessionId?: string }).activeSessionId ?? null);
  expect(sessionId, 'session id should be defined after run starts').toBeTruthy();

  // Wait for server to register progress snapshot to avoid 404 on pause
  // sessionId already captured above
  const startWait = Date.now();
  for (;;) {
    const r = await api.get(`/api/progress/snapshot/${sessionId}`);
    if (r.ok()) break;
    if (Date.now() - startWait > 3000) throw new Error('Timed out waiting for snapshot');
    await page.waitForTimeout(100);
  }

  // Measure time to resume drawer appearance after clicking pause
  const t0 = Date.now();
  await pauseButton.click();

  // Drawer should become visible quickly (< 500ms target, allow 1000ms in CI)
  const drawer = page.locator('.resume-drawer');
  await expect(drawer).toBeVisible({ timeout: process.env.CI ? 1000 : 500 });

  // Snapshot should reflect paused state as well
  const snapResp = await api.get(`/api/progress/snapshot/${sessionId}`);
  expect(snapResp.ok()).toBeTruthy();
  const snap = await snapResp.json();
  expect(Boolean(snap.paused)).toBeTruthy();
  expect(snap.state === 'PAUSED' || snap.stage === 'paused').toBeTruthy();

  const elapsed = Date.now() - t0;
  test.info().annotations.push({ type: 'pause-immediacy-ms', description: String(elapsed) });
});
