import { test, expect, request } from '@playwright/test';
import { randomBytes } from 'node:crypto';

/**
 * Uses a complex prompt to trigger planning; pauses during planning and asserts 202 paused
 * without falling back to single execution (no browse_url in response).
 */
test('Planning pause short-circuits (no single fallback)', async ({ page }) => {
  const baseURL = process.env.UI_ORIGIN ?? 'http://localhost:3000';
  const api = await request.newContext({ baseURL });
  await page.goto('/');

  // Use a complex prompt with multiple features to force planning code path
  const promptText = 'Build a dashboard module with auth and an API, with unit tests and database stubs. Include modules A and B.';

  // Kick off via API so we can capture /api/execute response immediately
  const sessionId = randomBytes(8).toString('hex');

  // Start execute request but do not await yet
  const executePromise = api.post('/api/execute', {
    data: { prompt: promptText, sessionId }
  });

  // Give the server a moment to enter planning
  await page.waitForTimeout(200);

  // Pause the session
  const pauseResp = await api.post(`/api/sessions/${sessionId}/pause`, { data: { reason: 'Test pause during planning' } });
  expect([201, 409]).toContain(pauseResp.status()); // 409 if already paused

  // Await the execute response and assert paused
  const resp = await executePromise;
  const status = resp.status();
  const body = await resp.json().catch(() => ({}));
  expect(status).toBe(202);
  expect(body?.paused).toBeTruthy();

  // Ensure no single fallback artifacts in the response
  expect(body?.browse_url).toBeFalsy();
});
