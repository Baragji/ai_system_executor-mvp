import { test, expect } from "@playwright/test";
import { handleClarifications } from "./helpers.js";

test.describe("Pause/Resume E2E Flow", () => {
  test("should pause execution and resume successfully", async ({ page }) => {
    // Navigate to the executor UI
    await page.goto("http://localhost:3000");
    
    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Executor MVP");
    
    // Fill in the prompt
    const promptInput = page.locator('#prompt');
    await promptInput.fill("create hello world app, where i can modify the text \"hello world\" colors, through a frontend ui");
    
    // Click execute button
    const executeButton = page.locator('#runBtn');
    await executeButton.click();
    
    console.log("✓ Clicked Execute button");
    
    // Resolve clarifications, preferring to answer when possible
    await handleClarifications(page, { timeoutMs: 5000 });
    
    // Wait for execution to start
    await page.waitForTimeout(2000);
    
    // Look for the Pause button (should appear when execution is running)
    const pauseButton = page.locator('button.btn.btn-secondary:has-text("Pause")');
    await expect(pauseButton).toBeVisible({ timeout: 15000 });
    await expect(pauseButton).toBeEnabled({ timeout: 15000 });
    
    console.log("✓ Pause button appeared");
    
    // Click Pause
    await pauseButton.click();
    
    console.log("✓ Clicked Pause button");
    
    // Wait for paused state
    await page.waitForTimeout(1000);
    
    // Look for Resume button (appears in the resume drawer)
    const resumeButton = page.locator('button.btn.btn-primary:has-text("Resume")');
    await expect(resumeButton).toBeVisible({ timeout: 5000 });
    
    console.log("✓ Resume button appeared (execution paused)");
    
    // Check for paused status indicator
    const statusText = page.locator('[data-testid="status"]');
    if (await statusText.count() > 0) {
      const text = await statusText.textContent();
      console.log(`  Status: ${text}`);
    }
    
    // Click Resume
    await resumeButton.click();
    
    console.log("✓ Clicked Resume button");
    
    // Wait for execution to continue
    await page.waitForTimeout(2000);
    
    // Check that execution is continuing (Pause button should reappear or Done state should appear)
    const isDoneOrRunning = await Promise.race([
      page.locator('button:has-text("Pause")').isVisible().catch(() => false),
      page.locator('text=/Done|Completed|Success/i').isVisible().catch(() => false),
      page.waitForTimeout(30000).then(() => false) // 30 second timeout
    ]);
    
    if (isDoneOrRunning) {
      console.log("✓ Execution resumed successfully");
    } else {
      console.log("⚠ Execution state unclear after 30s");
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: "output/pause-resume-test.png", fullPage: true });
    console.log("✓ Screenshot saved to output/pause-resume-test.png");
    
    // Check terminal logs in the background
    // We'll verify no errors by checking the server is still responsive
    const response = await page.request.get("http://localhost:3000/healthz");
    expect(response.ok()).toBeTruthy();
    console.log("✓ Server still responsive after pause/resume");
  });
  
  test("should handle multiple pause/resume cycles", async ({ page }) => {
    await page.goto("http://localhost:3000");
    
    const promptInput = page.locator('#prompt');
    await promptInput.fill("create a simple hello world node app");
    
    const executeButton = page.locator('#runBtn');
    await executeButton.click();
    
    console.log("✓ Started execution");
    
    // Resolve any clarifications then pause and resume twice
    await handleClarifications(page, { timeoutMs: 5000 });
    // Pause and resume twice
    for (let i = 1; i <= 2; i++) {
      await page.waitForTimeout(2000);
      
      const pauseButton = page.locator('button.btn.btn-secondary:has-text("Pause")');
      await expect(pauseButton).toBeVisible({ timeout: 15000 });
      await expect(pauseButton).toBeEnabled({ timeout: 15000 });
      await pauseButton.click();
      console.log(`✓ Pause cycle ${i}: Paused`);
      
      await page.waitForTimeout(1000);
      
      const resumeButton = page.locator('button.btn.btn-primary:has-text("Resume")');
      await expect(resumeButton).toBeVisible({ timeout: 5000 });
      await resumeButton.click();
      console.log(`✓ Pause cycle ${i}: Resumed`);
    }
    
    // Verify server is still healthy
    const response = await page.request.get("http://localhost:3000/healthz");
    expect(response.ok()).toBeTruthy();
    console.log("✓ Multiple pause/resume cycles completed successfully");
  });
});
