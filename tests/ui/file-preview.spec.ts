import { test, expect } from "@playwright/test";

test.describe("File preview panel", () => {
  test("lists files and loads content with syntax highlighting", async ({ page }) => {
    await page.route("/api/clarify", async route => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) });
    });
    await page.route("/api/execute", async route => {
      const json = {
        ok: true,
        project: "demo",
        files_written: 2,
        browse_url: "/output/demo/",
        testResults: { initial: { status: "pass", passCount: 2, failCount: 0 } },
        planExecutionResult: { subtaskResults: [{ generatedFiles: ["src/index.ts", "README.md"] }] }
      };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.route(/\/api\/files\/demo\/.*/, async route => {
      const content = `export function add(a:number,b:number){return a+b}`;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content, size: content.length, modified: new Date().toISOString(), binary: false }) });
    });
    await page.goto("/");
    await page.fill('#prompt', 'Generate demo project');
    await page.getByRole('button', { name: 'Execute' }).click();
    // Open files
    await page.getByRole('button', { name: 'View files' }).click();
    const panel = page.locator('#filePreviewPanel');
    await expect(panel).toBeVisible();
    await page.locator('.file-tree .item', { hasText: 'src/index.ts' }).click();
    await expect(panel.locator('pre code')).toContainText('export function add');
  });
});
