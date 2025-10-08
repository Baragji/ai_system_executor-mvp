import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * UI Validation Result structure
 */
export interface UIValidationResult {
  timestamp: string;
  status: "pass" | "fail" | "error";
  playwright: {
    status: "pass" | "fail" | "error" | "skipped";
    totalTests: number;
    passedTests: number;
    failedTests: number;
    durationMs: number;
    reportPath?: string;
    violations: Array<{
      type: "visual" | "accessibility";
      test: string;
      message: string;
    }>;
  };
  lighthouse: {
    status: "pass" | "fail" | "error" | "skipped";
    performanceScore: number;
    accessibilityScore: number;
    bestPracticesScore: number;
    seoScore: number;
    reportPath?: string;
  };
  notes: string[];
}

/**
 * Run Playwright tests for UI validation
 */
async function runPlaywrightTests(projectRoot: string): Promise<UIValidationResult["playwright"]> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const playwrightProcess = spawn(
      "npx",
      ["playwright", "test", "--reporter=json"],
      {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 120000,
      }
    );

    let stdout = "";
    let stderr = "";

    playwrightProcess.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    playwrightProcess.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    playwrightProcess.on("close", (code) => {
      const durationMs = Date.now() - startTime;
      
      // Parse Playwright JSON output
      let results = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
      };
      
      try {
        // Try to parse JSON from stdout
        const lines = stdout.split("\n");
        for (const line of lines) {
          if (line.trim().startsWith("{")) {
            const json = JSON.parse(line);
            if (json.stats) {
              results.totalTests = json.stats.total || 0;
              results.passedTests = json.stats.expected || 0;
              results.failedTests = json.stats.unexpected || 0;
            }
          }
        }
      } catch {
        // If parsing fails, extract basic info from stderr/stdout
        const testMatch = (stdout + stderr).match(/(\d+) passed/);
        if (testMatch && testMatch[1]) {
          results.passedTests = parseInt(testMatch[1], 10);
          results.totalTests = results.passedTests;
        }
      }

      const violations: UIValidationResult["playwright"]["violations"] = [];
      
      // Parse accessibility violations from output
      if (stderr.includes("accessibility") || stdout.includes("violations")) {
        violations.push({
          type: "accessibility",
          test: "unknown",
          message: "Accessibility violations detected. Check full report.",
        });
      }

      resolve({
        status: code === 0 ? "pass" : "fail",
        totalTests: results.totalTests,
        passedTests: results.passedTests,
        failedTests: results.failedTests,
        durationMs,
        reportPath: ".automation/playwright-report",
        violations,
      });
    });

    playwrightProcess.on("error", () => {
      resolve({
        status: "error",
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        durationMs: Date.now() - startTime,
        violations: [],
      });
    });
  });
}

/**
 * Run Lighthouse CI for performance validation
 */
async function runLighthouseCI(projectRoot: string): Promise<UIValidationResult["lighthouse"]> {
  return new Promise((resolve) => {
    const lhciProcess = spawn(
      "npx",
      ["lhci", "autorun", "--config=lighthouserc.js"],
      {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180000,
      }
    );

    lhciProcess.stdout?.on("data", () => {
      // Lighthouse output captured but not used currently
    });

    lhciProcess.stderr?.on("data", () => {
      // Lighthouse errors captured but not used currently
    });

    lhciProcess.on("close", async (code) => {
      // Try to parse scores from output or report files
      let scores = {
        performanceScore: 0,
        accessibilityScore: 0,
        bestPracticesScore: 0,
        seoScore: 0,
      };

      // Look for JSON report files
      const reportsDir = path.join(projectRoot, ".automation/lighthouse-reports");
      try {
        const files = await fs.readdir(reportsDir);
        const jsonReports = files.filter((f) => f.endsWith(".json"));
        
        if (jsonReports.length > 0 && jsonReports[0]) {
          const reportPath = path.join(reportsDir, jsonReports[0]);
          const reportData = await fs.readFile(reportPath, "utf-8");
          const report = JSON.parse(reportData);
          
          if (report.categories) {
            scores.performanceScore = report.categories.performance?.score || 0;
            scores.accessibilityScore = report.categories.accessibility?.score || 0;
            scores.bestPracticesScore = report.categories["best-practices"]?.score || 0;
            scores.seoScore = report.categories.seo?.score || 0;
          }
        }
      } catch {
        // Ignore errors reading report
      }

      resolve({
        status: code === 0 ? "pass" : "fail",
        ...scores,
        reportPath: ".automation/lighthouse-reports",
      });
    });

    lhciProcess.on("error", () => {
      resolve({
        status: "error",
        performanceScore: 0,
        accessibilityScore: 0,
        bestPracticesScore: 0,
        seoScore: 0,
      });
    });
  });
}

/**
 * Main function to run complete UI validation
 * 
 * @param projectRoot - Root directory of the project
 * @param options - Validation options
 */
export async function runUIValidation(
  projectRoot: string,
  options: {
    skipPlaywright?: boolean;
    skipLighthouse?: boolean;
  } = {}
): Promise<UIValidationResult> {
  const timestamp = new Date().toISOString();
  const notes: string[] = [];

  // Run Playwright tests
  let playwrightResult: UIValidationResult["playwright"];
  if (options.skipPlaywright) {
    playwrightResult = {
      status: "skipped",
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      durationMs: 0,
      violations: [],
    };
    notes.push("Playwright tests skipped by option");
  } else {
    notes.push("Running Playwright visual and accessibility tests...");
    playwrightResult = await runPlaywrightTests(projectRoot);
    notes.push(`Playwright: ${playwrightResult.passedTests}/${playwrightResult.totalTests} tests passed`);
  }

  // Run Lighthouse CI
  let lighthouseResult: UIValidationResult["lighthouse"];
  if (options.skipLighthouse) {
    lighthouseResult = {
      status: "skipped",
      performanceScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      seoScore: 0,
    };
    notes.push("Lighthouse CI skipped by option");
  } else {
    notes.push("Running Lighthouse performance and SEO checks...");
    lighthouseResult = await runLighthouseCI(projectRoot);
    notes.push(`Lighthouse: Performance ${Math.round(lighthouseResult.performanceScore * 100)}%, Accessibility ${Math.round(lighthouseResult.accessibilityScore * 100)}%`);
  }

  // Determine overall status
  const status = 
    playwrightResult.status === "pass" && lighthouseResult.status === "pass" 
      ? "pass" 
      : playwrightResult.status === "error" || lighthouseResult.status === "error"
      ? "error"
      : "fail";

  return {
    timestamp,
    status,
    playwright: playwrightResult,
    lighthouse: lighthouseResult,
    notes,
  };
}

/**
 * Write UI validation results to compliance report
 */
export async function writeUIComplianceReport(
  result: UIValidationResult,
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf-8");
}
