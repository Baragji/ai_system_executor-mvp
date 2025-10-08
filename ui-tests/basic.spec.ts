import { test, expect } from '@playwright/test';

test.describe('UI Smoke', () => {
  test('loads home and shows key controls', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Executor MVP/i);

    // Core UI elements exist
    await expect(page.getByRole('heading', { name: /Executor MVP/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Execute/i })).toBeVisible();

    // Prompt textarea is usable
    const prompt = page.locator('#prompt');
    await expect(prompt).toBeVisible();
    await prompt.fill('Say hello');
    await expect(prompt).toHaveValue('Say hello');
  });
});

