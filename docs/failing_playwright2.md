$ bash -lc 'npm run test:ui --silent'

Running 51 tests using 4 workers

  â   3 [chromium] âº tests/ui/accessibility.spec.ts:5:3 âº Accessibility âº home page has no critical violations (1.3s)
  â   4 [chromium] âº tests/ui/home.spec.ts:19:3 âº Home Page âº renders home page correctly (1.4s)
  â   6 [chromium] âº tests/ui/home.spec.ts:28:3 âº Home Page âº visual regression - home page baseline (970ms)
  â   7 [chromium] âº tests/ui/home.spec.ts:37:3 âº Home Page âº accessibility - no violations (1.1s)
  â   2 [chromium] âº tests/ui/execution-flow.spec.ts:12:3 âº Execution Flow âº complete execution workflow (3.8s)
  â   8 [chromium] âº tests/ui/home.spec.ts:47:3 âº Home Page âº form elements are accessible (868ms)
  â   9 [chromium] âº tests/ui/execution-flow.spec.ts:38:3 âº Execution Flow âº results page accessibility (348ms)
  â  10 [chromium] âº tests/ui/home.spec.ts:58:3 âº Home Page âº interactive elements have proper contrast (1.0s)
  â  11 [chromium] âº tests/ui/execution-flow.spec.ts:54:3 âº Execution Flow âº loading state visual regression (961ms)
  â  13 [chromium] âº tests/ui/execution-flow.spec.ts:78:3 âº Execution Flow âº keyboard navigation works (807ms)
  â  14 [chromium] âº tests/ui/presentation-policy.playwright.ts:9:3 âº Presentation policy âº debug disclosure is hidden by default (281ms)
  â   5 [chromium] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight (5.6s)
  â  15 [chromium] âº tests/ui/presentation-policy.playwright.ts:20:3 âº Presentation policy âº user can opt into debug info via disclosure (353ms)
  â  16 [firefox] âº tests/ui/accessibility.spec.ts:5:3 âº Accessibility âº home page has no critical violations (2.1s)
  â  12 [chromium] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling (5.5s)
  â  17 [firefox] âº tests/ui/execution-flow.spec.ts:12:3 âº Execution Flow âº complete execution workflow (4.0s)
  â  20 [firefox] âº tests/ui/execution-flow.spec.ts:38:3 âº Execution Flow âº results page accessibility (398ms)
  â  21 [firefox] âº tests/ui/execution-flow.spec.ts:54:3 âº Execution Flow âº loading state visual regression (1.1s)
  â  22 [firefox] âº tests/ui/execution-flow.spec.ts:78:3 âº Execution Flow âº keyboard navigation works (943ms)
  â  23 [firefox] âº tests/ui/home.spec.ts:19:3 âº Home Page âº renders home page correctly (907ms)
  â  24 [firefox] âº tests/ui/home.spec.ts:28:3 âº Home Page âº visual regression - home page baseline (1.0s)
  â  19 [chromium] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail (5.6s)
  â  25 [firefox] âº tests/ui/home.spec.ts:37:3 âº Home Page âº accessibility - no violations (1.4s)
  â  27 [firefox] âº tests/ui/home.spec.ts:47:3 âº Home Page âº form elements are accessible (930ms)
  â  28 [firefox] âº tests/ui/home.spec.ts:58:3 âº Home Page âº interactive elements have proper contrast (1.2s)
  â  26 [chromium] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error (5.6s)
  â  29 [firefox] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight (5.5s)
  â  31 [firefox] âº tests/ui/presentation-policy.playwright.ts:9:3 âº Presentation policy âº debug disclosure is hidden by default (996ms)
  â  32 [firefox] âº tests/ui/presentation-policy.playwright.ts:20:3 âº Presentation policy âº user can opt into debug info via disclosure (483ms)
  â  30 [firefox] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling (6.3s)
  â   1 [chromium] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting (31.7s)
  â  33 [webkit] âº tests/ui/accessibility.spec.ts:5:3 âº Accessibility âº home page has no critical violations (1.3s)
  â  36 [webkit] âº tests/ui/execution-flow.spec.ts:12:3 âº Execution Flow âº complete execution workflow (3.4s)
  â  37 [webkit] âº tests/ui/execution-flow.spec.ts:38:3 âº Execution Flow âº results page accessibility (438ms)
  â  38 [webkit] âº tests/ui/execution-flow.spec.ts:54:3 âº Execution Flow âº loading state visual regression (1.1s)
  â  39 [webkit] âº tests/ui/execution-flow.spec.ts:78:3 âº Execution Flow âº keyboard navigation works (879ms)
  â  40 [webkit] âº tests/ui/home.spec.ts:19:3 âº Home Page âº renders home page correctly (930ms)
  â  34 [firefox] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail (7.2s)
  â  41 [webkit] âº tests/ui/home.spec.ts:28:3 âº Home Page âº visual regression - home page baseline (986ms)
  â  18 [firefox] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting (30.1s)
  â  42 [webkit] âº tests/ui/home.spec.ts:37:3 âº Home Page âº accessibility - no violations (1.4s)
  â  45 [webkit] âº tests/ui/home.spec.ts:47:3 âº Home Page âº form elements are accessible (886ms)
  â  46 [webkit] âº tests/ui/home.spec.ts:58:3 âº Home Page âº interactive elements have proper contrast (1.2s)
  â  44 [webkit] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight (5.7s)
  â  48 [webkit] âº tests/ui/presentation-policy.playwright.ts:9:3 âº Presentation policy âº debug disclosure is hidden by default (668ms)
  â  43 [firefox] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error (6.3s)
  â  49 [webkit] âº tests/ui/presentation-policy.playwright.ts:20:3 âº Presentation policy âº user can opt into debug info via disclosure (481ms)
  â  47 [webkit] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling (5.4s)
  â  50 [webkit] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail (5.7s)
  â  51 [webkit] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error (5.6s)
  â  35 [webkit] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting (30.2s)


  1) [chromium] âº tests/ui/execution-flow.spec.ts:12:3 âº Execution Flow âº complete execution workflow 

    Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveScreenshot[2m([22m[32mexpected[39m[2m)[22m failed

      3729 pixels (ratio 0.01 of all image pixels) are different.

      Snapshot: execution-results.png

    Call log:
    [2m  - Expect "toHaveScreenshot(execution-results.png)" with timeout 5000ms[22m
    [2m    - verifying given screenshot expectation[22m
    [2m  - taking page screenshot[22m
    [2m    - disabled all CSS animations[22m
    [2m  - waiting for fonts to load...[22m
    [2m  - fonts loaded[22m
    [2m  - 3729 pixels (ratio 0.01 of all image pixels) are different.[22m
    [2m  - waiting 100ms before taking screenshot[22m
    [2m  - taking page screenshot[22m
    [2m    - disabled all CSS animations[22m
    [2m  - waiting for fonts to load...[22m
    [2m  - fonts loaded[22m
    [2m  - captured a stable screenshot[22m
    [2m  - 3729 pixels (ratio 0.01 of all image pixels) are different.[22m


      29 |
      30 |       // Take screenshot of the results view for visual regression
    > 31 |       await expect(page).toHaveScreenshot("execution-results.png", {
         |                          ^
      32 |         mask: [page.locator(".timestamp, .duration, time")],
      33 |         animations: "disabled",
      34 |       });
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/execution-flow.spec.ts:31:26

    attachment #1: execution-results (image/png) âââââââââââââââââââââââââââââââââââââââââââââââââââ
    Expected: tests/ui/execution-flow.spec.ts-snapshots/execution-results-chromium-darwin.png
    Received: test-results/execution-flow-Execution-Flow-complete-execution-workflow-chromium/execution-results-actual.png
    Diff:     test-results/execution-flow-Execution-Flow-complete-execution-workflow-chromium/execution-results-diff.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/execution-flow-Execution-Flow-complete-execution-workflow-chromium/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #3: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/execution-flow-Execution-Flow-complete-execution-workflow-chromium/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/execution-flow-Execution-Flow-complete-execution-workflow-chromium/error-context.md

  2) [chromium] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting 

    [31mTest timeout of 30000ms exceeded.[39m

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
    [2m  - waiting for getByRole('button', { name: 'View files' })[22m


      24 |     await page.getByRole('button', { name: 'Execute' }).click();
      25 |     // Open files
    > 26 |     await page.getByRole('button', { name: 'View files' }).click();
         |                                                            ^
      27 |     const panel = page.locator('#filePreviewPanel');
      28 |     await expect(panel).toBeVisible();
      29 |     await page.locator('.file-tree .item', { hasText: 'src/index.ts' }).click();
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/file-preview.spec.ts:26:60

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-chromium/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-chromium/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-chromium/error-context.md

  3) [chromium] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.progress-bar > span')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.progress-bar > span')[22m


      28 |     await page.getByRole('button', { name: 'Execute' }).click();
      29 |     const bar = page.locator('.progress-bar > span');
    > 30 |     await expect(bar).toBeVisible();
         |                       ^
      31 |   });
      32 | });
      33 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/loading-states.spec.ts:30:23

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-chromium/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-chromium/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-chromium/error-context.md

  4) [chromium] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--success')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--success')[22m


      19 |     await page.goto("/");
      20 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 21 |     await expect(page.locator('.outcome-card.outcome-card--success')).toBeVisible();
         |                                                                       ^
      22 |     await expect(page.locator('.outcome-card__icon svg')).toBeVisible();
      23 |   });
      24 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:21:71

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-chromium/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-chromium/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-chromium/error-context.md

  5) [chromium] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--partial')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--partial')[22m


      40 |     await page.goto("/");
      41 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 42 |     await expect(page.locator('.outcome-card.outcome-card--partial')).toBeVisible();
         |                                                                       ^
      43 |   });
      44 |
      45 |   test("renders error card on backend error", async ({ page }) => {
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:42:71

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-chromium/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-chromium/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-chromium/error-context.md

  6) [chromium] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--error')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--error')[22m


      52 |     await page.goto("/");
      53 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 54 |     await expect(page.locator('.outcome-card.outcome-card--error')).toBeVisible();
         |                                                                     ^
      55 |   });
      56 | });
      57 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:54:69

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-chromium/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-chromium/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-chromium/error-context.md

  7) [firefox] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting 

    [31mTest timeout of 30000ms exceeded.[39m

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
    [2m  - waiting for getByRole('button', { name: 'View files' })[22m


      24 |     await page.getByRole('button', { name: 'Execute' }).click();
      25 |     // Open files
    > 26 |     await page.getByRole('button', { name: 'View files' }).click();
         |                                                            ^
      27 |     const panel = page.locator('#filePreviewPanel');
      28 |     await expect(panel).toBeVisible();
      29 |     await page.locator('.file-tree .item', { hasText: 'src/index.ts' }).click();
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/file-preview.spec.ts:26:60

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-firefox/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-firefox/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-firefox/error-context.md

  8) [firefox] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.progress-bar > span')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.progress-bar > span')[22m


      28 |     await page.getByRole('button', { name: 'Execute' }).click();
      29 |     const bar = page.locator('.progress-bar > span');
    > 30 |     await expect(bar).toBeVisible();
         |                       ^
      31 |   });
      32 | });
      33 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/loading-states.spec.ts:30:23

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-firefox/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-firefox/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-firefox/error-context.md

  9) [firefox] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--success')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--success')[22m


      19 |     await page.goto("/");
      20 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 21 |     await expect(page.locator('.outcome-card.outcome-card--success')).toBeVisible();
         |                                                                       ^
      22 |     await expect(page.locator('.outcome-card__icon svg')).toBeVisible();
      23 |   });
      24 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:21:71

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-firefox/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-firefox/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-firefox/error-context.md

  10) [firefox] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--partial')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--partial')[22m


      40 |     await page.goto("/");
      41 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 42 |     await expect(page.locator('.outcome-card.outcome-card--partial')).toBeVisible();
         |                                                                       ^
      43 |   });
      44 |
      45 |   test("renders error card on backend error", async ({ page }) => {
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:42:71

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-firefox/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-firefox/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-firefox/error-context.md

  11) [firefox] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--error')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--error')[22m


      52 |     await page.goto("/");
      53 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 54 |     await expect(page.locator('.outcome-card.outcome-card--error')).toBeVisible();
         |                                                                     ^
      55 |   });
      56 | });
      57 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:54:69

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-firefox/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-firefox/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-firefox/error-context.md

  12) [webkit] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting 

    [31mTest timeout of 30000ms exceeded.[39m

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
    [2m  - waiting for getByRole('button', { name: 'View files' })[22m


      24 |     await page.getByRole('button', { name: 'Execute' }).click();
      25 |     // Open files
    > 26 |     await page.getByRole('button', { name: 'View files' }).click();
         |                                                            ^
      27 |     const panel = page.locator('#filePreviewPanel');
      28 |     await expect(panel).toBeVisible();
      29 |     await page.locator('.file-tree .item', { hasText: 'src/index.ts' }).click();
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/file-preview.spec.ts:26:60

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-webkit/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-webkit/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/file-preview-File-preview--3e63c-nt-with-syntax-highlighting-webkit/error-context.md

  13) [webkit] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.progress-bar > span')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.progress-bar > span')[22m


      28 |     await page.getByRole('button', { name: 'Execute' }).click();
      29 |     const bar = page.locator('.progress-bar > span');
    > 30 |     await expect(bar).toBeVisible();
         |                       ^
      31 |   });
      32 | });
      33 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/loading-states.spec.ts:30:23

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-webkit/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-webkit/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/loading-states-Loading-sta-d0487-ate-while-request-in-flight-webkit/error-context.md

  14) [webkit] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--success')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--success')[22m


      19 |     await page.goto("/");
      20 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 21 |     await expect(page.locator('.outcome-card.outcome-card--success')).toBeVisible();
         |                                                                       ^
      22 |     await expect(page.locator('.outcome-card__icon svg')).toBeVisible();
      23 |   });
      24 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:21:71

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-webkit/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-webkit/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-a652b-ss-card-with-modern-styling-webkit/error-context.md

  15) [webkit] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--partial')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--partial')[22m


      40 |     await page.goto("/");
      41 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 42 |     await expect(page.locator('.outcome-card.outcome-card--partial')).toBeVisible();
         |                                                                       ^
      43 |   });
      44 |
      45 |   test("renders error card on backend error", async ({ page }) => {
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:42:71

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-webkit/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-webkit/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-5e54c-artial-card-when-tests-fail-webkit/error-context.md

  16) [webkit] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: locator('.outcome-card.outcome-card--error')
    Expected: visible
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
    [2m  - Expect "toBeVisible" with timeout 5000ms[22m
    [2m  - waiting for locator('.outcome-card.outcome-card--error')[22m


      52 |     await page.goto("/");
      53 |     await page.getByRole('button', { name: 'Execute' }).click();
    > 54 |     await expect(page.locator('.outcome-card.outcome-card--error')).toBeVisible();
         |                                                                     ^
      55 |   });
      56 | });
      57 |
        at /Users/Yousef_1/Downloads/ai_system_executor-mvp/tests/ui/outcome-cards.spec.ts:54:69

    attachment #1: screenshot (image/png) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-webkit/test-failed-1.png
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    attachment #2: video (video/webm) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-webkit/video.webm
    ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    Error Context: test-results/outcome-cards-Outcome-card-dc430-error-card-on-backend-error-webkit/error-context.md

  16 failed
    [chromium] âº tests/ui/execution-flow.spec.ts:12:3 âº Execution Flow âº complete execution workflow 
    [chromium] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting 
    [chromium] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight 
    [chromium] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling 
    [chromium] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail 
    [chromium] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error 
    [firefox] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting 
    [firefox] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight 
    [firefox] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling 
    [firefox] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail 
    [firefox] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error 
    [webkit] âº tests/ui/file-preview.spec.ts:4:3 âº File preview panel âº lists files and loads content with syntax highlighting 
    [webkit] âº tests/ui/loading-states.spec.ts:4:3 âº Loading stages âº progress stages update while request in flight 
    [webkit] âº tests/ui/outcome-cards.spec.ts:4:3 âº Outcome cards âº renders success card with modern styling 
    [webkit] âº tests/ui/outcome-cards.spec.ts:25:3 âº Outcome cards âº renders partial card when tests fail 
    [webkit] âº tests/ui/outcome-cards.spec.ts:45:3 âº Outcome cards âº renders error card on backend error 
  35 passed (1.1m)

  Serving HTML report at http://localhost:54816. Press Ctrl+C to quit.
