# Phase 16 — Pause Polling Discovery

- Goal: Stop progress polling while paused to eliminate 304 spam, and restart after resume.
- Stack: Vanilla JS in `/public`. No backend/API changes.

## Integration Points
- Frontend state update: `public/script.js:236` `updateOrchestrationState(snapshot)` — receives `paused` signal.
- Execute polling loop: `public/script.js:1308` (loop around `fetch(/api/progress/snapshot/:id)`).
- SSE hookup: `public/script.js:1353` `new EventSource(/api/progress/:id)`.
- Resume handler: `public/script.js:196` `handleResumeSubmit()`.

## Current Behavior (before)
- Polling loop continues during paused state; SSE remains open; repeated 304s in server logs.
- UI shows resume drawer correctly.

## Change
- Add global controls `progressStopFlag`, `progressEventSource`, `progressFillEl`.
- On paused: set `progressStopFlag = true`, close SSE.
- On resume success: restart polling loop and SSE with active session and existing progress bar element.
- On 202 from `/api/execute`: stop streams immediately (paused flow).

## Impact
- Reduces server log noise (304 spam) while paused.
- Does not change API contract or backend behavior.
- UI resumes updates after resume action.

## Compliance
- Language/stack unchanged (vanilla JS).
- No new dependencies. No protected files touched.
