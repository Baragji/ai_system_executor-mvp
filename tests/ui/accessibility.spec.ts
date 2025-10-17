import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe('Accessibility', () => {
  test('home page has no critical violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical.length).toBe(0);
  });
});

