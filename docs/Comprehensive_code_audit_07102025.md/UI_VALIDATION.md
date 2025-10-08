# UI Validation Infrastructure

## Overview

This project implements production-ready UI validation using industry-standard tools following October 2025 best practices:

- **Playwright** with MCP server support for browser automation and visual regression testing
- **@axe-core/playwright** for automated accessibility testing (WCAG 2.1 AA compliance)
- **Lighthouse CI** for performance, SEO, and PWA validation
- **GitHub Actions** workflows for automated testing on every PR

## Architecture

```
┌─────────────────────────────────────────────────┐
│          UI Validation Pipeline                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Visual Regression Testing (Playwright)      │
│     ├─ Screenshot comparison                    │
│     ├─ Cross-browser testing                    │
│     └─ Visual diff reporting                    │
│                                                 │
│  2. Accessibility Testing (axe-core)            │
│     ├─ WCAG 2.1 AA compliance checks           │
│     ├─ Keyboard navigation validation          │
│     └─ Screen reader compatibility             │
│                                                 │
│  3. Performance Testing (Lighthouse)            │
│     ├─ Core Web Vitals                         │
│     ├─ Performance budgets                     │
│     ├─ SEO validation                          │
│     └─ Best practices checks                   │
│                                                 │
│  4. Compliance Reporting                       │
│     └─ .automation/ui_compliance_report.json   │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Setup

### Prerequisites

- Node.js >= 20.10.0
- npm >= 9.x
- Chromium browser (installed via Playwright)

### Installation

1. Install dependencies:
```bash
npm ci
```

2. Install Playwright browsers:
```bash
npx playwright install chromium --with-deps
```

3. Verify installation:
```bash
npm run test:ui -- --list
```

## Usage

### Running UI Tests Locally

**Run all UI tests:**
```bash
npm run test:ui
```

**Run in headed mode (see browser):**
```bash
npm run test:ui:headed
```

**Debug specific test:**
```bash
npm run test:ui:debug -- tests/ui/home.spec.ts
```

**Update visual baselines:**
```bash
npx playwright test --update-snapshots
```

### Running Lighthouse CI

**Run performance audits:**
```bash
npm run test:lighthouse
```

**Run full UI validation:**
```bash
npm run validate:ui
```

## Test Structure

```
tests/ui/
├── home.spec.ts              # Home page visual & a11y tests
├── execution-flow.spec.ts    # User flow E2E tests
└── [future tests...]

.automation/
├── playwright-report/        # Visual test results & screenshots
├── playwright-results.json   # Machine-readable test results
├── lighthouse-reports/       # Performance audit reports
└── ui_compliance_report.json # Consolidated compliance report
```

## Configuration Files

### `playwright.config.ts`

Main Playwright configuration:
- Test directory: `tests/ui/`
- Base URL: `http://localhost:3000` (or `process.env.UI_ORIGIN`)
- Visual regression settings:
  - Max diff pixels: 100
  - Threshold: 0.2 (20% difference allowed)
- Reporters: HTML, JSON, console
- Automatic dev server startup

### `lighthouserc.js`

Lighthouse CI configuration:
- Performance budget: 75% minimum score
- Accessibility budget: 90% minimum score
- Best practices: 85% minimum score
- SEO: 85% minimum score
- Resource budgets:
  - Scripts: 300KB max
  - Stylesheets: 100KB max
  - Total: 1MB max

## Writing Tests

### Visual Regression Test Example

```typescript
import { test, expect } from "@playwright/test";

test("page renders correctly", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  // Compare against baseline
  await expect(page).toHaveScreenshot("page-name.png", {
    fullPage: true,
    animations: "disabled",
  });
});
```

### Accessibility Test Example

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("no accessibility violations", async ({ page }) => {
  await page.goto("/");
  
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
    
  expect(results.violations).toEqual([]);
});
```

### Keyboard Navigation Test Example

```typescript
test("keyboard navigation works", async ({ page }) => {
  await page.goto("/");
  
  // Tab through interactive elements
  await page.keyboard.press("Tab");
  
  // Verify focus is visible
  const focusedElement = page.locator(":focus");
  await expect(focusedElement).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/ui-validation.yml` workflow runs automatically on:
- Every push to any branch
- Every pull request
- Manual trigger via workflow_dispatch

**Jobs:**
1. **playwright-tests**: Runs visual regression and accessibility tests
2. **lighthouse-ci**: Runs performance and SEO audits
3. **ui-compliance-report**: Generates consolidated compliance report

**Artifacts:**
- `playwright-report`: Interactive HTML report
- `playwright-results`: JSON test results
- `lighthouse-reports`: Performance audit reports
- `ui-compliance-report`: Consolidated JSON report

### Viewing Results

1. Go to GitHub Actions tab
2. Select the UI Validation workflow run
3. Download artifacts from the run summary
4. Open `playwright-report/index.html` in a browser

## Playwright MCP Server

The Playwright MCP (Model Context Protocol) server enables AI agents to:
- Open and control real browsers
- Interact with the UI like a human user
- Capture screenshots and DOM state
- Run accessibility scans
- Execute visual regression tests

### MCP Server Setup

1. Install MCP server:
```bash
npx @playwright/mcp@latest
```

2. Register in your AI agent client (Copilot, Cursor, etc.)
3. Agents can now invoke browser automation tools

### Agent Use Cases

- **Visual QA**: Agent reviews UI changes and flags regressions
- **Accessibility audit**: Agent scans for WCAG violations
- **UX review**: Agent provides qualitative feedback on user flows
- **Cross-browser testing**: Agent tests across different browsers

## Best Practices

### Visual Regression
✅ **DO:**
- Use `animations: "disabled"` for consistent screenshots
- Mask dynamic content (timestamps, dates)
- Use full-page screenshots for layout changes
- Update baselines when intentional changes are made

❌ **DON'T:**
- Include timestamps or dynamic data in screenshots
- Use screenshots for content verification (use text assertions)
- Commit baseline images to main without review

### Accessibility
✅ **DO:**
- Run axe-core on every page and interactive state
- Test keyboard navigation flows
- Verify focus indicators are visible
- Check color contrast programmatically

❌ **DON'T:**
- Ignore accessibility violations
- Skip keyboard navigation tests
- Assume screen readers work without testing

### Performance
✅ **DO:**
- Set realistic performance budgets
- Monitor Core Web Vitals trends
- Test on representative hardware
- Optimize images and scripts

❌ **DON'T:**
- Set unrealistic budgets that block all PRs
- Ignore performance regressions
- Test only on high-end hardware

## Troubleshooting

### Playwright browser install fails

**Problem**: `Error: Failed to download Chromium`

**Solution**:
```bash
# Try with different mirror
PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.playwright.dev npx playwright install chromium

# Or use system browser
npx playwright install chromium --no-download
```

### Visual regression test fails unexpectedly

**Problem**: Screenshot differs but visually looks identical

**Solutions**:
1. Check if fonts are loaded properly
2. Disable animations: `animations: "disabled"`
3. Increase threshold: `threshold: 0.3`
4. Mask dynamic content: `mask: [page.locator(".timestamp")]`

### Lighthouse CI times out

**Problem**: `Error: Lighthouse CI timed out`

**Solutions**:
1. Increase timeout in `lighthouserc.js`
2. Reduce number of runs: `numberOfRuns: 1`
3. Check if dev server is starting properly

### Tests pass locally but fail in CI

**Problem**: Different behavior in CI environment

**Solutions**:
1. Use `process.env.CI` to detect CI mode
2. Disable parallel execution in CI: `workers: 1`
3. Increase timeouts for slower CI runners
4. Check environment variables are set

## Evidence & Validation

All UI validation runs produce evidence artifacts:

1. **Visual Regression Evidence**
   - Baseline screenshots: `tests/ui/*.spec.ts-snapshots/`
   - Diff images: `.automation/playwright-report/`
   - Test results: `.automation/playwright-results.json`

2. **Accessibility Evidence**
   - axe-core violations: Embedded in Playwright report
   - WCAG compliance: `.automation/ui_compliance_report.json`

3. **Performance Evidence**
   - Lighthouse reports: `.automation/lighthouse-reports/`
   - Core Web Vitals: Embedded in reports
   - Resource budgets: Pass/fail in LHCI output

4. **Contract Compliance**
   - Schema: `contracts/ui-validation-result.schema.json`
   - Validator: `src/contracts/validators.ts`
   - Report: `.automation/ui_compliance_report.json`

## Maintenance

### Updating Baselines

When UI changes are intentional:
```bash
npm run test:ui -- --update-snapshots
git add tests/ui/*.spec.ts-snapshots/
git commit -m "chore: update visual baselines"
```

### Updating Budgets

Edit `lighthouserc.js` assertions:
```javascript
assertions: {
  "categories:performance": ["error", { minScore: 0.80 }], // Increased
  "resource-summary:total:size": ["warn", { maxNumericValue: 1500000 }], // Relaxed
}
```

### Adding New Tests

1. Create test file: `tests/ui/feature-name.spec.ts`
2. Follow existing patterns (see examples above)
3. Run locally to create baselines
4. Commit baselines with PR
5. Verify CI passes

## References

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [axe-core Playwright Integration](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Model Context Protocol (MCP)](https://microsoft.github.io/mcp/)
- [Playwright MCP Server](https://github.com/microsoft/playwright/tree/main/packages/playwright-mcp)

## Support

For issues or questions:
1. Check this documentation
2. Review existing test files for patterns
3. Check Playwright/Lighthouse CI documentation
4. Open an issue with evidence artifacts
