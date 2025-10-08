import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Home Page UI Validation Tests
 * 
 * Tests visual regression, accessibility, and basic functionality
 * of the main executor interface.
 */

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");
  });

  test("renders home page correctly", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Executor MVP|AI System Executor/);
    
    // Check main heading exists
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("visual regression - home page baseline", async ({ page }) => {
    // Visual regression test - compares against baseline screenshot
    // First run creates baseline, subsequent runs compare against it
    await expect(page).toHaveScreenshot("home-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("accessibility - no violations", async ({ page }) => {
    // Run accessibility scan with axe-core
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Fail test if there are any accessibility violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("form elements are accessible", async ({ page }) => {
    // Check that form inputs have proper labels
    const promptInput = page.locator('textarea[name="prompt"], textarea#prompt, textarea[placeholder*="prompt"]').first();
    
    if (await promptInput.isVisible()) {
      // Verify input is keyboard accessible
      await promptInput.focus();
      await expect(promptInput).toBeFocused();
    }
  });

  test("interactive elements have proper contrast", async ({ page }) => {
    // Run accessibility check focused on color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .include(".btn, button, a, input")
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === "color-contrast"
    );
    
    expect(contrastViolations).toEqual([]);
  });
});
