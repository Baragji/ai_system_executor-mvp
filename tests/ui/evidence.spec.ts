import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.describe('@evidence Generate A-FIX screenshots', () => {
  test.beforeAll(async () => {
    await fs.mkdir('.automation/phase_a_fix_screenshots', { recursive: true });
  });

  test('success card screenshot', async ({ page }) => {
    await page.route('/api/clarify', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [] }) });
    });
    await page.route('/api/execute', async route => {
      const json = { ok: true, project: 'demo', files_written: 2, browse_url: '/output/demo/', testResults: { initial: { status: 'pass', passCount: 2, failCount: 0 } }, planExecutionResult: { subtaskResults: [{ generatedFiles: ['README.md', 'package.json'] }] } };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });
    await page.goto('/');
    await page.fill('#prompt', 'demo');
    await page.getByRole('button', { name: 'Execute' }).click();
    await expect(page.locator('.outcome-card.outcome-card--success')).toBeVisible();
    await page.screenshot({ path: '.automation/phase_a_fix_screenshots/success-card.png' });
  });

  test('partial card screenshot', async ({ page }) => {
    await page.route('/api/clarify', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [] }) });
    });
    await page.route('/api/execute', async route => {
      const json = { ok: true, project: 'demo', files_written: 2, browse_url: '/output/demo/', testResults: { initial: { status: 'fail', passCount: 0, failCount: 2 } }, planExecutionResult: { subtaskResults: [{ generatedFiles: ['README.md', 'package.json'] }] } };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });
    await page.goto('/');
    await page.fill('#prompt', 'demo');
    await page.getByRole('button', { name: 'Execute' }).click();
    await expect(page.locator('.outcome-card.outcome-card--partial')).toBeVisible();
    await page.screenshot({ path: '.automation/phase_a_fix_screenshots/partial-card.png' });
  });

  test('error card screenshot', async ({ page }) => {
    await page.route('/api/execute', async route => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) });
    });
    await page.goto('/');
    await page.fill('#prompt', 'demo');
    await page.getByRole('button', { name: 'Execute' }).click();
    await expect(page.locator('.outcome-card.outcome-card--error')).toBeVisible();
    await page.screenshot({ path: '.automation/phase_a_fix_screenshots/error-card.png' });
  });
});

