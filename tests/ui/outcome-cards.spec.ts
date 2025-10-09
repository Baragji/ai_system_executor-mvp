import { test, expect } from "@playwright/test";

test.describe("Outcome cards", () => {
  test("renders success card with modern styling", async ({ page }) => {
    await page.route("/api/clarify", async route => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) });
    });
    await page.route("/api/execute", async route => {
      const json = {
        ok: true,
        project: "demo",
        files_written: 3,
        browse_url: "/output/demo/",
        testResults: { initial: { status: "pass", passCount: 10, failCount: 0 } },
        planExecutionResult: { subtaskResults: [{ generatedFiles: ["README.md", "package.json", "src/index.ts"] }] }
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.goto("/");
    await page.fill('#prompt', 'Generate demo project');
    await page.getByRole('button', { name: 'Execute' }).click();
    await expect(page.locator('.outcome-card.outcome-card--success')).toBeVisible();
    await expect(page.locator('.outcome-card__icon svg')).toBeVisible();
  });

  test("renders partial card when tests fail", async ({ page }) => {
    await page.route("/api/clarify", async route => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) });
    });
    await page.route("/api/execute", async route => {
      const json = {
        ok: true,
        project: "demo",
        files_written: 2,
        browse_url: "/output/demo/",
        testResults: { initial: { status: "fail", passCount: 2, failCount: 1 } },
        planExecutionResult: { subtaskResults: [{ generatedFiles: ["package.json", "src/index.ts"] }] }
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.goto("/");
    await page.fill('#prompt', 'Generate demo project');
    await page.getByRole('button', { name: 'Execute' }).click();
    await expect(page.locator('.outcome-card.outcome-card--partial')).toBeVisible();
  });

  test("renders error card on backend error", async ({ page }) => {
    await page.route("/api/clarify", async route => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) });
    });
    await page.route("/api/execute", async route => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
    });
    await page.goto("/");
    await page.fill('#prompt', 'Generate demo project');
    await page.getByRole('button', { name: 'Execute' }).click();
    await expect(page.locator('.outcome-card.outcome-card--error')).toBeVisible();
  });
});
