import { test, expect, request } from '@playwright/test';

/**
 * Pauses a running session and then resumes by answering questions.
 * When a provider is configured, the system should continue automatically.
 * When not configured, the resume endpoint still returns success and updates state.
 */
test('Resume flow returns to running state', async ({ page }) => {
  const api = await request.newContext({ baseURL: process.env.UI_ORIGIN ?? 'http://localhost:3000' });
  await page.goto('/');

  await page.locator('#prompt').fill('Create a small library with one function and a unit test.');
  await page.getByRole('button', { name: /Execute/i }).click();

  // Wait for Pause to be enabled
  const pauseButton = page.getByRole('button', { name: /^Pause$/ });
  await expect(pauseButton).toBeVisible();
  await expect(pauseButton).toBeEnabled();

  const sessionId = await page.evaluate(() => (globalThis as unknown as { activeSessionId?: string }).activeSessionId ?? null);
  expect(sessionId).toBeTruthy();

  // Pause via button to engage UI snapshot fetch as well
  await pauseButton.click();

  // Drawer becomes visible with questions (could be default single question)
  const drawer = page.locator('.resume-drawer');
  await expect(drawer).toBeVisible();

  // Fill all textareas with a generic answer
  const areas = page.locator('.resume-questions textarea');
  const count = await areas.count();
  for (let i = 0; i < count; i++) {
    await areas.nth(i).fill('Proceed with the best default.');
  }

  // Submit resume
  await page.locator('#resumeForm button[type="submit"]').click();

  // Drawer should hide and Pause re-enable (if still running)
  await expect(drawer).toBeHidden({ timeout: 5000 });

  // Snapshot should show paused=false fairly soon
  const start = Date.now();
  let unpaused = false;
  for (;;) {
    const r = await api.get(`/api/progress/snapshot/${sessionId}`);
    if (r.ok()) {
      const snap = await r.json();
      if (!snap.paused) {
        unpaused = true; break;
      }
    }
    if (Date.now() - start > 5000) break;
    await page.waitForTimeout(200);
  }

  expect(unpaused).toBeTruthy();
});
