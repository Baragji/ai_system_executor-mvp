# UI Validation Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      UI Validation Pipeline                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Developer Workflow   │
                    │  npm run test:ui OR    │
                    │  GitHub Actions CI     │
                    └────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │  Playwright Test │      │  Lighthouse CI   │
          │   (Visual + A11y)│      │ (Performance)    │
          └──────────────────┘      └──────────────────┘
                    │                         │
        ┌───────────┼───────────┐            │
        ▼           ▼           ▼            ▼
   ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
   │Visual  │ │  axe-   │ │Keyboard│ │Core Web  │
   │Regress.│ │  core   │ │  Nav   │ │Vitals    │
   └────────┘ └─────────┘ └────────┘ └──────────┘
        │           │           │            │
        └───────────┴───────────┴────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  UI Validation Runner  │
            │ (runUIValidation.ts)   │
            └────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Contract Validator    │
            │  (validateUIResult)    │
            └────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Compliance Report     │
            │ ui_compliance_report   │
            │        .json           │
            └────────────────────────┘
```

## Component Details

### 1. Playwright Test Layer

```
playwright.config.ts
├── Base URL: localhost:3000
├── Test Directory: tests/ui/
├── Visual Regression
│   ├── Max diff pixels: 100
│   ├── Threshold: 0.2
│   └── Full page snapshots
├── Reporters
│   ├── HTML: .automation/playwright-report/
│   ├── JSON: .automation/playwright-results.json
│   └── Console: stdout
└── Web Server
    ├── Command: npm run dev
    ├── Timeout: 120s
    └── Reuse in local dev
```

### 2. Test Structure

```
tests/ui/
├── home.spec.ts
│   ├── Visual regression test
│   ├── Accessibility scan (WCAG 2.1 AA)
│   ├── Form accessibility
│   └── Color contrast check
└── execution-flow.spec.ts
    ├── Complete workflow test
    ├── Results page accessibility
    ├── Loading state visual
    └── Keyboard navigation
```

### 3. Accessibility Testing (axe-core)

```
@axe-core/playwright
├── WCAG Tags
│   ├── wcag2a
│   ├── wcag2aa
│   ├── wcag21a
│   └── wcag21aa
├── Violation Detection
│   ├── Missing labels
│   ├── Low contrast
│   ├── Invalid ARIA
│   └── Keyboard traps
└── Reporting
    └── expect(violations).toEqual([])
```

### 4. Lighthouse CI Layer

```
lighthouserc.js
├── Collection
│   ├── URL: localhost:3000/
│   ├── Runs: 3 (for consistency)
│   └── Server: npm run dev
├── Assertions
│   ├── Performance: ≥75%
│   ├── Accessibility: ≥90%
│   ├── Best Practices: ≥85%
│   └── SEO: ≥85%
├── Resource Budgets
│   ├── Scripts: ≤300KB
│   ├── Stylesheets: ≤100KB
│   └── Total: ≤1MB
└── Upload
    └── .automation/lighthouse-reports/
```

### 5. Contract Schema

```
contracts/ui-validation-result.schema.json
├── timestamp: ISO-8601
├── status: pass|fail|error
├── playwright
│   ├── status: pass|fail|error|skipped
│   ├── totalTests: number
│   ├── passedTests: number
│   ├── failedTests: number
│   ├── durationMs: number
│   └── violations[]
│       ├── type: visual|accessibility
│       ├── test: string
│       └── message: string
├── lighthouse
│   ├── status: pass|fail|error|skipped
│   ├── performanceScore: 0-1
│   ├── accessibilityScore: 0-1
│   ├── bestPracticesScore: 0-1
│   └── seoScore: 0-1
└── notes: string[]
```

### 6. GitHub Actions Workflow

```
.github/workflows/ui-validation.yml
├── Job 1: playwright-tests
│   ├── Install Chromium
│   ├── Run Playwright tests
│   ├── Upload HTML report (7 days)
│   ├── Upload JSON results (7 days)
│   └── Upload screenshots/videos on fail
├── Job 2: lighthouse-ci
│   ├── Build application
│   ├── Run LHCI
│   └── Upload reports (7 days)
└── Job 3: ui-compliance-report
    ├── Download all artifacts
    ├── Generate consolidated report
    └── Upload report (30 days)
```

## Data Flow

### Visual Regression Flow

```
┌──────────────┐
│ Page Render  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     First Run?
│  Playwright  ├────────┬─────────┐
│  Screenshot  │        │         │
└──────────────┘       YES       NO
                        │         │
                        ▼         ▼
                 ┌──────────┐  ┌──────────┐
                 │  Create  │  │ Compare  │
                 │ Baseline │  │  with    │
                 │          │  │ Baseline │
                 └──────────┘  └────┬─────┘
                                    │
                        ┌───────────┼───────────┐
                        ▼           ▼           ▼
                    Match?     Threshold?    Pixels?
                    (Yes)      (Within)      (<100)
                      │            │            │
                      └────────────┴────────────┘
                                   │
                                   ▼
                              ┌─────────┐
                              │  Pass/  │
                              │  Fail   │
                              └─────────┘
```

### Accessibility Scan Flow

```
┌──────────────┐
│ Page Loaded  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  AxeBuilder  │
│  Initialize  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Apply Tags  │
│  (WCAG 2.1)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Analyze    │
│   DOM Tree   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Check Rules │
├──────────────┤
│ • Labels     │
│ • Contrast   │
│ • ARIA       │
│ • Keyboard   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Violations?  │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
  YES     NO
   │       │
   ▼       ▼
┌─────┐ ┌─────┐
│FAIL │ │PASS │
└─────┘ └─────┘
```

### Performance Audit Flow

```
┌──────────────┐
│  Start App   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Lighthouse  │
│  Navigate    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Collect Data │
├──────────────┤
│ • Network    │
│ • Paint      │
│ • Layout     │
│ • Scripts    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Calculate   │
│   Metrics    │
├──────────────┤
│ • FCP        │
│ • LCP        │
│ • CLS        │
│ • TBT        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Check vs    │
│   Budgets    │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
  Pass   Fail
   │       │
   ▼       ▼
┌─────┐ ┌─────┐
│GREEN│ │ RED │
│ CI  │ │ CI  │
└─────┘ └─────┘
```

## Integration Points

### MCP Server Integration

```
┌─────────────────┐
│   AI Agent      │
│ (Copilot, etc.) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Protocol   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Playwright MCP  │
│     Server      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Browser │ │  DOM   │
│Control │ │ Access │
└────────┘ └────────┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│   Automation    │
│   Test Results  │
└─────────────────┘
```

### CI/CD Pipeline Integration

```
┌─────────────────┐
│   Git Push      │
│   or PR Open    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│    Trigger      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Playwrht│ │Lightho-│
│ Tests  │ │use CI  │
└───┬────┘ └────┬───┘
    │           │
    └─────┬─────┘
          ▼
    ┌──────────┐
    │ All Pass?│
    └─────┬────┘
      ┌───┴───┐
      │       │
     YES     NO
      │       │
      ▼       ▼
  ┌──────┐ ┌──────┐
  │Merge │ │Block │
  │Allow │ │ PR   │
  └──────┘ └──────┘
```

## File Structure

```
ai_system_executor-mvp/
├── playwright.config.ts          # Playwright configuration
├── lighthouserc.js               # Lighthouse CI config
├── package.json                  # Dependencies + scripts
├── .github/
│   └── workflows/
│       └── ui-validation.yml     # CI workflow
├── contracts/
│   └── ui-validation-result.schema.json  # Contract
├── src/
│   ├── contracts/
│   │   └── validators.ts         # +validateUIValidationResult
│   └── runner/
│       └── runUIValidation.ts    # Runner module
├── tests/
│   ├── ui/
│   │   ├── home.spec.ts          # Home tests
│   │   └── execution-flow.spec.ts # Flow tests
│   └── contracts/
│       └── ui-validation-result.test.ts # Schema tests
├── docs/
│   ├── UI_VALIDATION.md          # Main guide
│   ├── UI_VALIDATION_IMPLEMENTATION_EVIDENCE.md
│   ├── PROBLEM_STATEMENT_ALIGNMENT.md
│   └── UI_VALIDATION_ARCHITECTURE.md  # This file
└── .automation/
    ├── playwright-report/        # HTML reports
    ├── playwright-results.json   # JSON results
    ├── lighthouse-reports/       # Lighthouse reports
    └── ui_compliance_report.json # Compliance
```

## Execution Sequence

### Local Development

```
1. Developer: npm run test:ui
2. Playwright: Start dev server (npm run dev)
3. Playwright: Wait for localhost:3000
4. Playwright: Open Chromium browser
5. For each test file:
   a. Navigate to page
   b. Take screenshot OR run accessibility scan
   c. Compare with baseline OR check violations
   d. Record result
6. Playwright: Generate HTML report
7. Playwright: Exit with code (0=pass, 1=fail)
8. Developer: View .automation/playwright-report/index.html
```

### CI Pipeline

```
1. GitHub: Trigger workflow (push/PR)
2. Actions: Checkout code
3. Actions: Setup Node.js 20.x
4. Actions: npm ci
5. Job 1 (Playwright):
   a. Install browsers
   b. Run tests
   c. Upload artifacts
6. Job 2 (Lighthouse):
   a. Build app
   b. Run LHCI
   c. Upload reports
7. Job 3 (Compliance):
   a. Download artifacts
   b. Generate report
   c. Upload report
8. GitHub: Update PR status
   ✅ All pass → Allow merge
   ❌ Any fail → Block merge
```

## Error Handling

```
┌──────────────┐
│  Test Error  │
└──────┬───────┘
       │
   ┌───┴───────────┐
   │               │
   ▼               ▼
Playwright      Lighthouse
   │               │
   │               ▼
   │          ┌─────────┐
   │          │ Timeout?│
   │          └────┬────┘
   │              YES
   ▼               │
┌─────────┐        │
│ Retry?  │        │
└────┬────┘        │
    YES            │
     │             │
     ▼             ▼
┌──────────────────┐
│   Record Error   │
│  Continue Tests  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate Report │
│  (with failures) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Exit Code 1    │
│   (CI fails)     │
└──────────────────┘
```

## Evidence Trail

```
Test Run
   │
   ├─► Screenshot baseline (committed)
   │
   ├─► Screenshot diff (if fail)
   │   └─► .automation/playwright-report/
   │
   ├─► Accessibility violations JSON
   │   └─► Embedded in HTML report
   │
   ├─► Lighthouse JSON report
   │   └─► .automation/lighthouse-reports/
   │
   ├─► Compliance report JSON
   │   └─► .automation/ui_compliance_report.json
   │
   └─► GitHub Actions artifacts
       ├─► playwright-report (7 days)
       ├─► lighthouse-reports (7 days)
       └─► ui-compliance-report (30 days)
```

## Summary

This architecture provides:
- ✅ **Separation of concerns** (visual, a11y, performance)
- ✅ **Parallel execution** (Playwright + Lighthouse)
- ✅ **Evidence collection** (artifacts at every step)
- ✅ **Contract validation** (schema-driven compliance)
- ✅ **CI/CD integration** (automated gates)
- ✅ **Agent-ready** (MCP protocol support)

All components work together to provide comprehensive UI validation while maintaining independence and testability.
