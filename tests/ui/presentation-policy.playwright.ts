import { test, expect } from "@playwright/test";

test.describe("Presentation policy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("debug disclosure is hidden by default", async ({ page }) => {
    const disclosure = page.locator("#debugDisclosure");
    await expect(disclosure).toBeHidden();
    await expect(disclosure).not.toHaveAttribute("open", /.+/);

    const taskPlan = page.locator("#taskPlanSection");
    await expect(taskPlan).toHaveClass(/.*hidden.*/);
    const testControls = page.locator("#testControls");
    await expect(testControls).toHaveClass(/.*hidden.*/);
  });

  test("user can opt into debug info via disclosure", async ({ page }) => {
    const disclosure = page.locator("#debugDisclosure");

    // Simulate data arrival: remove the hidden class as renderTaskPlan would
    await page.evaluate(() => {
      const doc = globalThis.document;
      const el = doc?.getElementById("debugDisclosure");
      el?.classList.remove("hidden");
    });

    const summary = disclosure.locator("summary");
    await expect(summary).toBeVisible();
    await expect(disclosure).not.toHaveAttribute("open", /.+/);

    await summary.click();
    await expect(disclosure).toHaveAttribute("open", "");
  });
});
