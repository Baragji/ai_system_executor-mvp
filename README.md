# Executor MVP (Local)

A tiny, local *Executor Agent* that turns your prompt into a set of files (via LLM), validates them against a JSON schema, writes them into `./output/<project>`, and serves them for browsing.

## Quickstart

```bash
cp .env.example .env
# set your API key(s) and model in .env

pnpm i   # or: npm i
pnpm dev # or: npm run dev

# open:
http://localhost:3000
```

Use a prompt like:  
**Make a minimal Node+TypeScript Hello World HTTP server exposing GET / returning "Hello World". Include README.md with run steps.**

Files are written to `./output/<project>`.

## 📍 Quick Navigation

**Confused about what you're working on?** Start here:
- **[WHAT_IS_WHAT.md](WHAT_IS_WHAT.md)** - Category clarification: Product vs Workflow (3 min read)

**New to this repo?** Start here:
- **[FILE_INDEX.md](FILE_INDEX.md)** - Quick map: what's where (2 min read)
- **[CDI_INFRASTRUCTURE.md](CDI_INFRASTRUCTURE.md)** - CDI pattern overview (5 min read)

**Working on Phase A?**
- Contract: `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json`
- Stack rules: `ai-stack.json`
- AI instructions: `.github/copilot-instructions.md`

**Need to validate something?**
```bash
npm run contract:check    # Validate contracts
npm run sbom              # Generate SBOM
npm run validate:all      # Run all checks
```
- **New:** [Technical Validation Checklist template](.github/ISSUE_TEMPLATE/technical_validation_checklist.md) for running the full workflow + executor review.

**Workflow State Management (Autonomous System)**
```bash
npm run state:show        # Show current workflow state
npm run state:sync        # Sync contract statuses with evidence
npm run state:next:dry    # Show suggested next action (dry-run)
npm run state:next        # Execute next action (interactive)
```

**Working on evidence detection or gates?**
- **[docs/detector_behavior_changes.md](docs/detector_behavior_changes.md)** - Recent detector changes & migration guide
- `.automation/GATES_LEDGER.md` - Gate definitions (canonical source)
- `scripts/detect-evidence.js` - Evidence detection logic
- `scripts/check-detector-constants.js` - Guard against hard-coded criteria

## Contract
- `contracts/executor-output.schema.json`
- `src/executor/systemPrompt.md`

## UI Validation

This project includes production-ready UI validation infrastructure:

### Features
- **Visual Regression Testing** - Playwright with screenshot comparison
- **Accessibility Testing** - axe-core for WCAG 2.1 AA compliance
- **Performance Testing** - Lighthouse CI with budgets for Core Web Vitals
- **Automated CI/CD** - GitHub Actions workflows for every PR

### Quick Start

```bash
# Install Playwright browsers
npx playwright install chromium --with-deps

# Run UI tests locally
npm run test:ui

# Run performance audits
npm run test:lighthouse

# Run complete UI validation
npm run validate:ui
```

### Documentation
See [docs/UI_VALIDATION.md](docs/UI_VALIDATION.md) for:
- Complete setup guide
- Test writing patterns
- Playwright MCP server integration
- Troubleshooting tips
- Best practices

### Evidence & Compliance
All UI validation runs generate artifacts in `.automation/`:
- `playwright-report/` - Visual test results and screenshots
- `lighthouse-reports/` - Performance audit reports
- `ui_compliance_report.json` - Consolidated compliance report

Contract schema: `contracts/ui-validation-result.schema.json`
