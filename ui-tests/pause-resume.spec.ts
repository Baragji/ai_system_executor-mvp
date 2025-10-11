import { test, expect } from '@playwright/test';

test.describe('Pause and resume UX', () => {
  test('freezes progress on pause and resumes polling after resume', async ({ page }) => {
    let sessionId = '';
    let snapshotRequests = 0;
    let resumed = false;

    const pausedSnapshot = () => ({
      stage: 'generating',
      progress: 42,
      paused: true,
      updatedAt: Date.now(),
      questions: [
        { id: 'clarify-1', question: 'Provide the target environment details.', type: 'AMBIGUITY' }
      ],
      checkpointUpdatedAt: new Date().toISOString(),
      data: { provider: 'openai', reason: 'Awaiting your guidance.' }
    });

    const resumedSnapshot = () => ({
      stage: 'testing',
      progress: 78,
      paused: false,
      updatedAt: Date.now(),
      questions: [],
      done: false
    });

    await page.route('**/api/execute', async route => {
      const payload = JSON.parse(route.request().postData() ?? '{}');
      sessionId = payload.sessionId;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ paused: true, sessionId })
      });
    });

    await page.route('**/api/progress/**', async route => {
      const url = route.request().url();
      if (url.includes('/snapshot/')) {
        if (!sessionId || !url.includes(sessionId)) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'not found' })
          });
          return;
        }
        snapshotRequests += 1;
        const body = resumed ? resumedSnapshot() : pausedSnapshot();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body)
        });
        return;
      }
      await route.fulfill({ status: 404, body: '' });
    });

    await page.route('**/api/sessions/*/resume', async route => {
      resumed = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resumed: true, checkpoint: { updatedAt: new Date().toISOString() }, answeredQuestions: [] })
      });
    });

    await page.goto('/');
    await page.fill('#prompt', 'Create a durable pause/resume demo project.');
    await page.click('#runBtn');

    const resumeDrawer = page.locator('.resume-drawer');
    await expect(resumeDrawer).toBeVisible();

    const providerBadge = page.locator('.provider-badge');
    await expect(providerBadge).toBeVisible();
    await expect(providerBadge).toHaveText(/openai/i);

    const statusMessage = page.locator('.orchestration__status-message');
    await expect(statusMessage).toContainText(/Paused/i);

    const progressBar = page.locator('.progress-bar');
    await expect(progressBar).toHaveClass(/paused/);

    const pausedSnapshotCount = snapshotRequests;
    await page.waitForTimeout(1100);
    expect(snapshotRequests).toBe(pausedSnapshotCount);

    const answerField = page.locator('textarea#resume-clarify-1');
    await answerField.fill('Continue with integration tests.');
    await page.click('button:has-text("Resume")');

    await expect(statusMessage).toContainText(/Resume request accepted|Resumed/i);

    await expect.poll(() => snapshotRequests).toBeGreaterThan(1);

    await expect(statusMessage).toContainText(/Resumed/i);

    await expect(resumeDrawer).toHaveClass(/hidden/);
    await expect(providerBadge).toHaveClass(/hidden/);
    await expect(progressBar).not.toHaveClass(/paused/);

    await expect(page.locator('#result')).not.toContainText(/Error/i);
  });
});
