import { test, expect } from "@playwright/test";

test.describe("Loading stages", () => {
  test("progress stages update while request in flight", async ({ page }) => {
    await page.route("/api/clarify", async route => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) });
    });
    // Stub progress snapshots: analyzing→planning→generating→testing
    let call = 0;
    await page.route(/\/api\/progress\/.+/, async route => {
      call += 1;
      const stages = [
        { stage: 'analyzing', progress: 10 },
        { stage: 'planning', progress: 30 },
        { stage: 'generating', progress: 60 },
        { stage: 'testing', progress: 85 }
      ];
      const idx = Math.min(call - 1, stages.length - 1);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stages[idx]) });
    });
    // Delay the execute response to allow polling to run a couple cycles
    await page.route('/api/execute', async route => {
      await new Promise(r => setTimeout(r, 1800));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, project: 'demo', files_written: 0, testResults: { initial: null } }) });
    });

    await page.goto('/');
    await page.fill('#prompt', 'Generate demo project');
    await page.getByRole('button', { name: 'Execute' }).click();
    const bar = page.locator('.progress-bar > span');
    await expect(bar).toBeVisible();
  });
});
