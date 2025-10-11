import { test, expect, request } from '@playwright/test';
import { randomBytes } from 'node:crypto';

/**
 * Forces single execution flow with a very simple prompt; pauses during GENERATING/TESTING
 * and expects the execute endpoint to return 202 paused via server logic.
 */
test('Single execution pause handling', async ({ page }) => {
  const baseURL = process.env.UI_ORIGIN ?? 'http://localhost:3000';
  const api = await request.newContext({ baseURL });

  await page.goto('/');
  const simplePrompt = 'Say hello world in a Node app with a single endpoint';

  // Generate a fresh session id to coordinate API calls
  const sessionId = randomBytes(8).toString('hex');

  // Kick off execution via API to observe the 202 on pause
  const execPromise = api.post('/api/execute', { data: { prompt: simplePrompt, sessionId } });

  // Wait a tiny bit to ensure server is generating
  await page.waitForTimeout(400);

  // Pause
  // Try pause; if 404 snapshot not yet ready, retry a couple times
  let pauseStatus: number | null = null;
  for (let i = 0; i < 3; i++) {
    const r = await api.post(`/api/sessions/${sessionId}/pause`, { data: { reason: 'Pause single' } });
    pauseStatus = r.status();
    if (pauseStatus === 201 || pauseStatus === 409) break;
    await page.waitForTimeout(200);
  }
  expect([201, 409]).toContain(pauseStatus!);

  // Assert 202 from /api/execute
  const resp = await execPromise;
  const body = await resp.json().catch(() => ({}));
  expect(resp.status()).toBe(202);
  expect(body?.paused).toBeTruthy();
});
