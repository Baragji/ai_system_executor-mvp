import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Execution Flow UI Validation Tests
 * 
 * Tests the complete user journey of submitting a prompt
 * and viewing results.
 */

test.describe("Execution Flow", () => {
  test("complete execution workflow", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find and fill the prompt textarea
    const promptInput = page.locator('textarea[name="prompt"], textarea#prompt, textarea').first();
    await promptInput.fill("Build a simple hello world function");

    // Find and click the execute/submit button
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Generate"), button[type="submit"]').first();
    
    if (await executeButton.isVisible()) {
      await executeButton.click();

      // Wait for some response (spinner, success message, or error)
      // Use a reasonable timeout for the operation
      await page.waitForTimeout(2000);

      // Take screenshot of the results view for visual regression
      await expect(page).toHaveScreenshot("execution-results.png", {
        mask: [page.locator(".timestamp, .duration, time")],
        animations: "disabled",
      });
    }
  });

  test("results page accessibility", async ({ page }) => {
    await page.goto("/");
    
    // Check if there are any previous results or output visible
    const resultsSection = page.locator("#output, .results, .output-container").first();
    
    if (await resultsSection.isVisible()) {
      // Run accessibility scan on results area
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include("#output, .results, .output-container")
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test("loading state visual regression", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const promptInput = page.locator('textarea[name="prompt"], textarea#prompt, textarea').first();
    await promptInput.fill("test prompt");

    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Generate"), button[type="submit"]').first();
    
    if (await executeButton.isVisible()) {
      // Click and immediately capture loading state
      await executeButton.click();
      await page.waitForTimeout(100); // Brief wait to capture loading state

      // Check for loading indicator
      const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"]').first();
      if (await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(page).toHaveScreenshot("loading-state.png", {
          animations: "disabled",
        });
      }
    }
  });

  test("keyboard navigation works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Test keyboard navigation through interactive elements
    await page.keyboard.press("Tab");
    
    // Verify focus is on an interactive element
    const focusedElement = await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const element = document.activeElement;
      return element?.tagName;
    });

    // Should be on a form element or link
    expect(["TEXTAREA", "INPUT", "BUTTON", "A"]).toContain(focusedElement);
  });
});
