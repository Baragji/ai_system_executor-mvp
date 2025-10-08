import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Lighthouse CI Configuration
 *
 * Defines performance budgets and quality gates for:
 * - Performance
 * - Accessibility
 * - Best Practices
 * - SEO
 * - PWA (if applicable)
 */

const moduleDir = dirname(fileURLToPath(import.meta.url));
const chromeWrapper = resolve(moduleDir, "scripts", "chrome-with-flags.sh");

export default {
  ci: {
    collect: {
      staticDistDir: null,
      // URL patterns to test
      url: ["http://localhost:3000/"],
      // Number of runs per URL for consistent results
      numberOfRuns: 3,
      chromePath: chromeWrapper,
      // Start dev server before collecting
      startServerCommand: "npm run dev",
      startServerReadyPattern: "listening",
      startServerReadyTimeout: 60000,
      settings: {
        chromeFlags: "--headless=new",
        // Use the same screen emulation as Playwright to keep metrics consistent
        formFactor: "desktop",
        screenEmulation: {
          disabled: false,
          width: 1280,
          height: 720,
          deviceScaleFactor: 1,
          mobile: false,
        },
      },
    },
    assert: {
      // Performance budgets - fail CI if these thresholds aren't met
      assertions: {
        // Core Web Vitals
        "categories:performance": ["error", { minScore: 0.75 }],
        "categories:accessibility": ["error", { minScore: 0.90 }],
        "categories:best-practices": ["error", { minScore: 0.85 }],
        "categories:seo": ["error", { minScore: 0.85 }],

        // Specific metrics
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],

        // Accessibility - must have no errors
        "color-contrast": "off", // Can be strict, handled by axe-core in Playwright

        // Resource budgets
        "resource-summary:script:size": ["warn", { maxNumericValue: 300000 }], // 300KB
        "resource-summary:stylesheet:size": ["warn", { maxNumericValue: 100000 }], // 100KB
        "resource-summary:document:size": ["warn", { maxNumericValue: 50000 }], // 50KB
        "resource-summary:image:size": ["warn", { maxNumericValue: 200000 }], // 200KB
        "resource-summary:total:size": ["warn", { maxNumericValue: 1000000 }], // 1MB total
      },
      // Preset: Use recommended budgets
      preset: "lighthouse:recommended",
    },
    upload: {
      // Store results locally
      target: "filesystem",
      outputDir: ".automation/lighthouse-reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%",
      extraHeaders: {
        // Ensure reports remain accessible when served from artifact downloads
        "Cache-Control": "no-store",
      },
    },
  },
};
