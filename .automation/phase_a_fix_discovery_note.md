# Phase A‑FIX Discovery Note

Scope: Implement W25–W31 per `contracts/Roadmap_execution/12_phase_a_fix_contract-2.json`.

Key Integration Points

- public/index.html: Added Prism CDN assets, `#filePreviewPanel`, and `<details id="debugDisclosure">` wrapping Task Plan/Test Controls.
- public/styles.css: Added `#debugDisclosure` styles; modern `.outcome-card` design system; `.progress-stages`; `.file-preview-panel` responsive styles.
- public/icons.js: New SVG icon exports (`successIcon`, `partialIcon`, `errorIcon`, `fileIcon`).
- public/script.js:
  - Added `computeOutcome()` and routed render via state machine in `executeRequest()`.
  - Replaced legacy card UIs with modern success/partial/error renderers, accessible structure, and "Open debug panel" CTA.
  - Implemented `renderFilePreview(files)` + copy button; integrates Prism highlighting.
  - Implemented `renderProgressStages()` and progress polling using `sessionId` sent with `/api/execute`.
  - Disclosure helpers: `hideDebugDisclosure()` (default), `revealDebugDisclosure()`.
- src/server.ts:
  - Progress sessions map; `GET /api/progress/:sessionId` (polling) and SSE `GET /api/progress/stream/:sessionId` (content-type `text/event-stream`).
  - `/api/execute` publishes staged snapshots (`analyzing`→`planning`→`generating`→`testing`→`finalizing`).
  - `GET /api/files/:project/:path(*)` with traversal protection, binary detection, and metadata.
  - Post-write scaffold validation with minimal fallback `package.json` when missing.
- src/validation/validateScaffold.ts: Exports `validateScaffold(files)` and `validateScaffoldOnDisk(projectRoot)`.
- tests:
  - Vitest: `tests/api/files.test.ts`, `tests/ui/outcome-state-machine.test.ts` (unit), expectations aligned to contract mapping.
  - Playwright: `outcome-cards.spec.ts`, `presentation-policy.playwright.ts`, `file-preview.spec.ts`, `loading-states.spec.ts`, `accessibility.spec.ts`.
- playwright.config.ts: Enabled Chromium, Firefox, WebKit.

Dependencies & Impacts

- No new npm dependencies; Prism via CDN per contract. No frontend frameworks.
- Backend route additions are non-breaking; `/api/execute` JSON shape preserved, plus optional `sessionId` handling.
- Accessibility improved with semantic markup and aria-label on debug disclosure summary.

Stack Compliance

- Language: TypeScript/JavaScript only. Frontend under `/public` (vanilla).
- No Python; no frameworks added. Lint/typecheck/test run locally.

Rationale

- Version 2 UI architecture and outcome mapping match contract intent (W25). Version 1’s mapping for error states would mislabel outcomes; corrected to `partial` when files exist and tests executed with non-pass status.

