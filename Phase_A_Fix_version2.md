# Following 12 files have been added/modified:

1. .automation/evaluation_results.json
+12
-0

2. .automation/execution_trace.jsonl
+198
-0

3. .automation/phase_a_fix_discovery.json
Ny

4. .automation/phase_a_fix_discovery_note.md
Ny

5. telemetry/events.log
+7
-29

6. playwright.config.ts
+1
-0

7. public/icons.js
Ny

8. public/index.html
+41
-36

9. public/script.js
+359
-266

10. public/styles.css
+260
-212

11. sbom.spdx.json
+205
-31

12. tests/ui/presentation-policy.playwright.ts

# the entire diff: 
 
 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/.automation/evaluation_results.json b/.automation/evaluation_results.json
index ef2e5a72a9481533da3c4295bc11ebe0a5993c4f..59431707affc9b15b39a004bb9c58096eebf7317 100644
--- a/.automation/evaluation_results.json
+++ b/.automation/evaluation_results.json
@@ -299,25 +299,37 @@
 {"timestamp":"2025-10-08T19:31:53.519Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-08T19:31:53.786Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:failing","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-08T19:31:53.896Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-08T19:31:54.042Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hang","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":false},"notes":"Process timed out after 200ms"}
 {"timestamp":"2025-10-08T19:37:52.388Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:test-prompt-api","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-08T19:38:00.992Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hello-world-function","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:30:49.375Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:30:49.431Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:30:50.739Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:30:51.187Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:failing","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:30:51.452Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hang","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":false},"notes":"Process timed out after 200ms"}
 {"timestamp":"2025-10-09T01:30:51.494Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:40:51.305Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:40:51.361Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:40:52.688Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:40:53.053Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:failing","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:40:53.315Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hang","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":false},"notes":"Process timed out after 200ms"}
 {"timestamp":"2025-10-09T01:40:53.379Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:42:04.567Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hello-world","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:47:44.249Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:47:44.272Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:47:45.621Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:47:45.961Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:failing","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":true}}
 {"timestamp":"2025-10-09T01:47:46.097Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
 {"timestamp":"2025-10-09T01:47:46.219Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hang","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":false},"notes":"Process timed out after 200ms"}
+{"timestamp":"2025-10-09T03:22:17.400Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
+{"timestamp":"2025-10-09T03:22:17.448Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
+{"timestamp":"2025-10-09T03:22:24.145Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
+{"timestamp":"2025-10-09T03:22:24.928Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:failing","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":true}}
+{"timestamp":"2025-10-09T03:22:25.203Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hang","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":false},"notes":"Process timed out after 200ms"}
+{"timestamp":"2025-10-09T03:22:27.876Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
+{"timestamp":"2025-10-09T03:23:31.049Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
+{"timestamp":"2025-10-09T03:23:31.070Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:demo","status":"pass","quality_dimensions":{"correctness":true,"completeness":false,"safety":true}}
+{"timestamp":"2025-10-09T03:23:37.848Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
+{"timestamp":"2025-10-09T03:23:38.633Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:failing","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":true}}
+{"timestamp":"2025-10-09T03:23:38.901Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:hang","status":"fail","quality_dimensions":{"correctness":false,"completeness":false,"safety":false},"notes":"Process timed out after 200ms"}
+{"timestamp":"2025-10-09T03:23:41.430Z","phase":"2A-OBSERVABILITY-FIX","task_id":"run-tests:passing","status":"pass","quality_dimensions":{"correctness":true,"completeness":true,"safety":true}}
diff --git a/.automation/execution_trace.jsonl b/.automation/execution_trace.jsonl
index 82a309c17c609e4fbb0a9ee97b61d42a6e50f7d6..1887044c0438031ff279eab4131cff9882dd132c 100644
--- a/.automation/execution_trace.jsonl
+++ b/.automation/execution_trace.jsonl
@@ -2464,25 +2464,223 @@
 {"timestamp":"2025-10-09T01:47:43.959Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
 {"timestamp":"2025-10-09T01:47:43.964Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
 {"timestamp":"2025-10-09T01:47:43.967Z","task_id":"phase1-demo","action":"test_run","status":"fail"}
 {"timestamp":"2025-10-09T01:47:43.969Z","task_id":"telemetry-demo","action":"generation_complete","status":"fail"}
 {"timestamp":"2025-10-09T01:47:43.969Z","task_id":"phase1-demo","action":"repair_attempt","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:43.973Z","task_id":"phase1-demo","action":"test_run","status":"fail"}
 {"timestamp":"2025-10-09T01:47:43.977Z","task_id":"phase1-demo","action":"test_run","status":"pass"}
 {"timestamp":"2025-10-09T01:47:43.991Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:43.995Z","task_id":"phase1-demo","action":"generation_complete","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.011Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.015Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.014Z","task_id":"clarify-demo","action":"generation_start","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.019Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.022Z","task_id":"clarify-demo","action":"test_run","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.041Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.043Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.043Z","task_id":"clarify-demo","action":"repair_attempt","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.044Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.048Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.057Z","task_id":"clarify-demo","action":"generation_complete","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.098Z","task_id":"clarify-demo","action":"generation_start","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.120Z","task_id":"clarify-demo","action":"test_run","status":"pass"}
 {"timestamp":"2025-10-09T01:47:44.131Z","task_id":"clarify-demo","action":"repair_attempt","status":"unknown"}
 {"timestamp":"2025-10-09T01:47:44.134Z","task_id":"clarify-demo","action":"generation_complete","status":"pass"}
 {"timestamp":"2025-10-09T01:47:46.099Z","task_id":"passing","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.649Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.651Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.652Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.657Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.711Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.743Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.746Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.747Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.750Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.761Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.762Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.763Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.763Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.763Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.764Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.765Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.773Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.777Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.777Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.778Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.778Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.778Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.779Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.780Z","task_id":"multi-turn-demo","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.787Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.788Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.788Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.789Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.790Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.795Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.796Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:08.796Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:08.796Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:08.797Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:09.562Z","task_id":"fallback-project","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:09.566Z","task_id":"fallback-project","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:09.567Z","task_id":"fallback-project","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:09.569Z","task_id":"fallback-project","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:09.591Z","task_id":"build-todo-app-with-auth","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:09.592Z","task_id":"build-todo-app-with-auth","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:09.600Z","task_id":"fallback-project","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:09.601Z","task_id":"fallback-project","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:09.602Z","task_id":"fallback-project","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:09.603Z","task_id":"fallback-project","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:09.608Z","task_id":"build-app","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:09.608Z","task_id":"build-app","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.012Z","task_id":"metrics-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:11.014Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.014Z","task_id":"metrics-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:11.014Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.015Z","task_id":"metrics-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:11.016Z","task_id":"metrics-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:11.034Z","task_id":"metrics-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:11.035Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.035Z","task_id":"metrics-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:11.035Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.035Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.035Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.036Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.036Z","task_id":"metrics-demo","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:22:11.041Z","task_id":"metrics-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:11.042Z","task_id":"metrics-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:11.042Z","task_id":"metrics-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:11.043Z","task_id":"metrics-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:13.753Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.756Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:13.759Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.761Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:13.773Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.774Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:13.784Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.784Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:13.785Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:13.785Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:13.785Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:13.786Z","task_id":"telemetry-demo","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:22:13.792Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.793Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:13.794Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.794Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:13.798Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.799Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:13.800Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:13.800Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:14.747Z","task_id":"clarify-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:14.768Z","task_id":"clarify-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:14.776Z","task_id":"clarify-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:14.779Z","task_id":"clarify-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:14.807Z","task_id":"clarify-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:14.808Z","task_id":"clarify-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:14.808Z","task_id":"clarify-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:14.814Z","task_id":"clarify-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:16.250Z","task_id":"phase1-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:16.253Z","task_id":"phase1-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:16.253Z","task_id":"phase1-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:22:16.254Z","task_id":"phase1-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:22:16.254Z","task_id":"phase1-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:22:16.256Z","task_id":"phase1-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:22:27.884Z","task_id":"passing","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.103Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.106Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.107Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.109Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.153Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.154Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.155Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.155Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.156Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.162Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.163Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.163Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.163Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.164Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.164Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.166Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.171Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.172Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.173Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.173Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.173Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.173Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.173Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.174Z","task_id":"multi-turn-demo","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.179Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.179Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.180Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.180Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.181Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.186Z","task_id":"multi-turn-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.187Z","task_id":"multi-turn-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:22.187Z","task_id":"multi-turn-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:22.188Z","task_id":"multi-turn-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:22.188Z","task_id":"multi-turn-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:23.105Z","task_id":"fallback-project","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:23.108Z","task_id":"fallback-project","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:23.109Z","task_id":"fallback-project","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:23.114Z","task_id":"fallback-project","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:23.148Z","task_id":"build-todo-app-with-auth","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:23.150Z","task_id":"build-todo-app-with-auth","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:23.171Z","task_id":"fallback-project","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:23.182Z","task_id":"fallback-project","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:23.182Z","task_id":"fallback-project","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:23.184Z","task_id":"fallback-project","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:23.207Z","task_id":"build-app","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:23.208Z","task_id":"build-app","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.589Z","task_id":"metrics-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:24.592Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.592Z","task_id":"metrics-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:24.593Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.593Z","task_id":"metrics-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:24.596Z","task_id":"metrics-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:24.650Z","task_id":"metrics-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:24.651Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.652Z","task_id":"metrics-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:24.652Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.652Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.652Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.652Z","task_id":"metrics-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.653Z","task_id":"metrics-demo","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:23:24.659Z","task_id":"metrics-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:24.659Z","task_id":"metrics-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:24.660Z","task_id":"metrics-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:24.660Z","task_id":"metrics-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:27.295Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.297Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:27.301Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.304Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:27.324Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.327Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:27.352Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.355Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:27.355Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:27.356Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:27.357Z","task_id":"telemetry-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:27.359Z","task_id":"telemetry-demo","action":"generation_complete","status":"fail"}
+{"timestamp":"2025-10-09T03:23:27.370Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.373Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:27.374Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.375Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:27.380Z","task_id":"telemetry-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.382Z","task_id":"telemetry-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:27.382Z","task_id":"telemetry-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:27.383Z","task_id":"telemetry-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:28.282Z","task_id":"clarify-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:28.285Z","task_id":"clarify-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:28.288Z","task_id":"clarify-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:28.290Z","task_id":"clarify-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:28.308Z","task_id":"clarify-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:28.309Z","task_id":"clarify-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:28.309Z","task_id":"clarify-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:28.310Z","task_id":"clarify-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:29.893Z","task_id":"phase1-demo","action":"generation_start","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:29.897Z","task_id":"phase1-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:29.900Z","task_id":"phase1-demo","action":"repair_attempt","status":"unknown"}
+{"timestamp":"2025-10-09T03:23:29.901Z","task_id":"phase1-demo","action":"test_run","status":"fail"}
+{"timestamp":"2025-10-09T03:23:29.901Z","task_id":"phase1-demo","action":"test_run","status":"pass"}
+{"timestamp":"2025-10-09T03:23:29.903Z","task_id":"phase1-demo","action":"generation_complete","status":"pass"}
+{"timestamp":"2025-10-09T03:23:41.445Z","task_id":"passing","action":"test_run","status":"pass"}
diff --git a/.automation/phase_a_fix_discovery.json b/.automation/phase_a_fix_discovery.json
new file mode 100644
index 0000000000000000000000000000000000000000..73342a520bdca624bbb5c891b457323b8e1e7ecc
--- /dev/null
+++ b/.automation/phase_a_fix_discovery.json
@@ -0,0 +1,166 @@
+{
+  "wins": {
+    "W26": {
+      "description": "Hide task/test telemetry behind debug disclosure",
+      "integration_points": [
+        {
+          "file": "public/index.html",
+          "line_start": 38,
+          "line_end": 76,
+          "context": "Task plan, test controls, and repair history sections rendered inline in main layout"
+        },
+        {
+          "file": "public/styles.css",
+          "line_start": 60,
+          "line_end": 158,
+          "context": "Existing task plan and button styles without debug disclosure selectors"
+        },
+        {
+          "file": "public/script.js",
+          "line_start": 224,
+          "line_end": 339,
+          "context": "renderTaskPlan attaches content directly to #taskPlanSection in main flow"
+        }
+      ],
+      "dependencies": ["Task plan DOM nodes", "Repair history toggles", "Clarification flow reset"],
+      "risks": "Need to preserve existing behaviour for debug viewers while hiding by default"
+    },
+    "W27": {
+      "description": "Modernize outcome cards with iconography and CTA hierarchy",
+      "integration_points": [
+        {
+          "file": "public/styles.css",
+          "line_start": 79,
+          "line_end": 382,
+          "context": "Current card styling uses flat backgrounds, emoji icons, and lacks accent bar"
+        },
+        {
+          "file": "public/script.js",
+          "line_start": 528,
+          "line_end": 720,
+          "context": "renderSuccessCard / renderPartialCard build legacy markup with emoji icons"
+        },
+        {
+          "file": "public/script.js",
+          "line_start": 1001,
+          "line_end": 1064,
+          "context": "renderErrorCard uses plain text and emoji"
+        }
+      ],
+      "dependencies": ["Outcome state machine", "Button event handlers", "Existing CSS variables"],
+      "risks": "Switching to SVG icon imports requires new module (public/icons.js)"
+    },
+    "W28": {
+      "description": "Add Prism-powered file preview panel",
+      "integration_points": [
+        {
+          "file": "public/index.html",
+          "line_start": 8,
+          "line_end": 78,
+          "context": "Head lacks Prism assets; no file preview container after result"
+        },
+        {
+          "file": "public/script.js",
+          "line_start": 1,
+          "line_end": 120,
+          "context": "Top-level DOM refs omit file preview panel; no renderFilePreview helper"
+        },
+        {
+          "file": "public/script.js",
+          "line_start": 720,
+          "line_end": 900,
+          "context": "Outcome renderers don't drive preview updates"
+        },
+        {
+          "file": "public/styles.css",
+          "line_start": 400,
+          "line_end": 520,
+          "context": "No styles for .file-preview-panel or tree"
+        },
+        {
+          "file": "src/server.ts",
+          "line_start": 485,
+          "line_end": 660,
+          "context": "API lacks /api/files endpoint; only /api/execute and /api/run-tests"
+        }
+      ],
+      "dependencies": ["Output directory structure", "fetch /api/execute responses", "Prism global"],
+      "risks": "Need to sanitize file paths to prevent traversal"
+    },
+    "W29": {
+      "description": "Progress timeline loading state with streaming updates",
+      "integration_points": [
+        {
+          "file": "public/script.js",
+          "line_start": 1067,
+          "line_end": 1120,
+          "context": "updateLoadingPhase() renders spinner with timer instead of staged timeline"
+        },
+        {
+          "file": "public/styles.css",
+          "line_start": 160,
+          "line_end": 250,
+          "context": "No timeline/progress bar styles"
+        },
+        {
+          "file": "src/server.ts",
+          "line_start": 511,
+          "line_end": 640,
+          "context": "POST /api/execute writes files synchronously without emitting progress events"
+        }
+      ],
+      "dependencies": ["Fetch lifecycle", "Server streaming capability", "Existing timers"],
+      "risks": "SSE + fallback must not break existing JSON response"
+    },
+    "W30": {
+      "description": "Validate scaffold before writing files and add repair strategy",
+      "integration_points": [
+        {
+          "file": "src/server.ts",
+          "line_start": 590,
+          "line_end": 650,
+          "context": "Single execution path calls writeFiles() with no preflight validation"
+        },
+        {
+          "file": "src/planning/executeSubtask.ts",
+          "line_start": 171,
+          "line_end": 220,
+          "context": "Plan subtasks write files immediately"
+        },
+        {
+          "file": "src/repair/strategySelector.ts",
+          "line_start": 1,
+          "line_end": 70,
+          "context": "FailureCategory enum mapping lacks MISSING_SCAFFOLD"
+        }
+      ],
+      "dependencies": ["ExecutorOutput.files structure", "Repair flow", "GeneratedFile type"],
+      "risks": "Need to ensure validation errors trigger scaffold repair without infinite loop"
+    },
+    "W31": {
+      "description": "Playwright UI validation coverage",
+      "integration_points": [
+        {
+          "file": "tests/ui",
+          "line_start": 0,
+          "line_end": 0,
+          "context": "Existing suite limited to home/execution flow; lacks dedicated outcome/debug/file-preview specs"
+        },
+        {
+          "file": "playwright.config.ts",
+          "line_start": 1,
+          "line_end": 160,
+          "context": "Shared config may need project updates to align with new tests"
+        }
+      ],
+      "dependencies": ["npm test:ui script", "Baseline snapshots"],
+      "risks": "Higher flake risk due to multi-state flows; need deterministic fixtures"
+    }
+  },
+  "stack_compliance": {
+    "language": "TypeScript/JavaScript only",
+    "frontend_scope": "All UI changes remain under /public with vanilla JS/CSS",
+    "backend_scope": "Express routes in src/server.ts (no new frameworks)",
+    "testing": "Vitest + Playwright already in toolchain"
+  }
+}
diff --git a/.automation/phase_a_fix_discovery_note.md b/.automation/phase_a_fix_discovery_note.md
new file mode 100644
index 0000000000000000000000000000000000000000..d2880101a2252d86794d03f305300cbf057111ac
--- /dev/null
+++ b/.automation/phase_a_fix_discovery_note.md
@@ -0,0 +1,57 @@
+# Phase A-FIX Discovery Note
+
+## Scope Overview
+Wins 26-31 reshape the Executor MVP UI to follow the Phase A-FIX contract: hide internal telemetry by default, redesign outcome cards, add file previews, stream progress, harden scaffold validation, and expand Playwright coverage.
+
+## Integration Points
+
+### W26 – Debug Disclosure
+- **public/index.html (lines 38-76):** Task plan, test controls, and repair history currently render directly in the main layout. Plan is to wrap these sections inside a `<details id="debugDisclosure">` container with a `<summary>` that defaults to closed.
+- **public/styles.css (lines 60-158):** Styles define task/test panels but no disclosure-specific rules. Need new selectors for `#debugDisclosure` summary/spacing plus hidden-by-default behaviour.
+- **public/script.js (lines 224-339):** `renderTaskPlan` and related helpers manipulate `#taskPlanSection` directly. We'll refactor them to inject content inside the disclosure body and reset disclosure state when new results arrive.
+
+### W27 – Modern Outcome Cards
+- **public/styles.css (lines 79-382):** Success/partial/error cards use emoji and low-contrast backgrounds. We'll rebuild these blocks with accent borders, modern shadows, typography, and hoverable CTA buttons.
+- **public/script.js (lines 528-720 & 1001-1064):** Renderers currently output emoji icons and minimal structure. We'll swap to SVG icons sourced from a new `public/icons.js`, add subtitle/metadata rows, and align CTA buttons with the revised design system.
+
+### W28 – File Preview + Prism
+- **public/index.html (lines 8-78):** Head lacks Prism CSS/JS and there's no preview panel after the outcome container. We'll load Prism via CDN links and add a hidden `<div id="filePreviewPanel">` placeholder.
+- **public/script.js (top-level & lines 720-900):** Need new DOM references (`filePreviewPanel`) plus helper functions to build a tree, fetch file content via `/api/files`, and highlight with `Prism.highlightAllUnder` once content renders.
+- **public/styles.css (lines 400-520):** Will introduce `.file-preview-panel`, tree item, and responsive layout styles.
+- **src/server.ts (lines 485-660):** Server currently only exposes `/api/execute` and `/api/run-tests`. We'll add `GET /api/files/:project/*` with path sanitisation and binary detection, plus associated telemetry.
+
+### W29 – Streaming Progress Timeline
+- **public/script.js (lines 1067-1120):** `updateLoadingPhase()` rotates between static messages via timer. Replace with `renderProgressStages()` that draws a vertical stage timeline, updates from SSE/polling events, and shows progress bar & ETA.
+- **public/styles.css (lines 160-250):** Need new `.progress-stages`, `.stage` state classes, animated connectors, and skeleton loaders for file list.
+- **src/server.ts (lines 511-640):** Execution flow writes files synchronously without progress updates. We'll emit `text/event-stream` updates (analyzing → planning → generating → testing → finalizing) and provide `/api/progress/:sessionId` fallback storage.
+
+### W30 – Scaffold Validation
+- **src/server.ts (lines 590-650):** Prior to `writeFiles(...)` we'll call new `validateScaffold()`; failures trigger scaffold-specific repair strategy and halt writes if unresolved.
+- **src/planning/executeSubtask.ts (lines 171-220):** Need validation hook before writing each subtask's files to disk when plan flow runs without scaffold.
+- **src/repair/strategySelector.ts (lines 1-70):** Extend categories to include `MISSING_SCAFFOLD` mapped to `scaffoldRepair` strategy. New validation errors must integrate with repair selector.
+- **New file:** `src/validation/validateScaffold.ts` providing validation logic + types shared by server and planning.
+
+### W31 – Playwright Validation Expansion
+- **tests/ui/** currently has `home.spec.ts` and execution flow coverage only. We'll create dedicated specs for outcome cards, debug disclosure, file preview, loading stages, and accessibility (axe-core).
+- **playwright.config.ts:** Ensure configuration supports multi-browser runs, screenshot capture, and slowMo overrides for deterministic animations.
+
+## Dependencies & Constraints
+- Must stay within vanilla JS/CSS for frontend updates per repository AGENTS policy.
+- Prism will load via CDN `<link>`/`<script>` without bundling; ensure CSP compatibility.
+- SSE feature must gracefully degrade to polling for environments that can't keep streaming connections.
+- Validation logic should reuse existing types (`ExecutorFile`, `GeneratedFile`) and avoid altering core generator contracts.
+- Tests must remain deterministic; consider seeding fixtures or mocking network responses where necessary.
+
+## Impact Assessment
+- UI restructuring touches central rendering paths; thorough regression testing required (Vitest + Playwright + Lighthouse as per contract).
+- Backend changes introduce new endpoints and state; ensure express app handles cleanup of progress sessions to avoid leaks.
+- Scaffold validation adds synchronous checks; monitor performance and avoid blocking event loop with large file reads.
+
+## Next Steps
+1. Implement W26 and verify hiding behaviour via DOM inspection and Playwright tests.
+2. Layer W27 styling/icon updates, ensuring accessible color contrast.
+3. Build file preview infrastructure (W28) including backend endpoint and unit/integration tests.
+4. Replace loading flow with streamed progress stages (W29) and update frontend accordingly.
+5. Introduce scaffold validation + repair strategy (W30) with unit coverage.
+6. Expand Playwright suite (W31) and refresh CI baselines.
+7. Run full validation gates (lint, typecheck, vitest, contract check, sbom, playwright, lighthouse).
diff --git a/.telemetry/events.log b/.telemetry/events.log
index cf4eacb58fa9fe71a8dbc979e565ef80655881e8..ac4e29f152f8ba02a60118b266cebfdb4513ccce 100644
--- a/.telemetry/events.log
+++ b/.telemetry/events.log
@@ -1,29 +1,7 @@
-{"name":"repair_attempt","timestamp":"2025-10-09T01:47:43.940Z","payload":{"project":"telemetry-demo","attempts":4,"finalStatus":"exhausted","successAttempt":null}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.950Z","payload":{"project":"telemetry-demo","stage":"repair-1","status":"fail"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.953Z","payload":{"project":"telemetry-demo","stage":"repair-2","status":"fail"}}
-{"name":"generation_start","timestamp":"2025-10-09T01:47:43.958Z","payload":{"project":"phase1-demo"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.959Z","payload":{"project":"telemetry-demo","stage":"repair-3","status":"fail"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.964Z","payload":{"project":"telemetry-demo","stage":"repair-4","status":"fail"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.967Z","payload":{"project":"phase1-demo","stage":"initial","status":"fail"}}
-{"name":"generation_complete","timestamp":"2025-10-09T01:47:43.969Z","payload":{"project":"telemetry-demo","status":"fail"}}
-{"name":"repair_attempt","timestamp":"2025-10-09T01:47:43.969Z","payload":{"project":"phase1-demo","attempts":2,"finalStatus":"pass","successAttempt":2}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.973Z","payload":{"project":"phase1-demo","stage":"repair-1","status":"fail"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:43.977Z","payload":{"project":"phase1-demo","stage":"repair-2","status":"pass"}}
-{"name":"generation_start","timestamp":"2025-10-09T01:47:43.991Z","payload":{"project":"telemetry-demo"}}
-{"name":"generation_complete","timestamp":"2025-10-09T01:47:43.995Z","payload":{"project":"phase1-demo","status":"pass"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:44.011Z","payload":{"project":"telemetry-demo","stage":"initial","status":"pass"}}
-{"name":"generation_start","timestamp":"2025-10-09T01:47:44.014Z","payload":{"project":"clarify-demo"}}
-{"name":"repair_attempt","timestamp":"2025-10-09T01:47:44.015Z","payload":{"project":"telemetry-demo","attempts":1,"finalStatus":"pass","successAttempt":1}}
-{"name":"generation_complete","timestamp":"2025-10-09T01:47:44.019Z","payload":{"project":"telemetry-demo","status":"pass"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:44.022Z","payload":{"project":"clarify-demo","stage":"initial","status":"pass"}}
-{"name":"generation_start","timestamp":"2025-10-09T01:47:44.041Z","payload":{"project":"telemetry-demo"}}
-{"name":"repair_attempt","timestamp":"2025-10-09T01:47:44.043Z","payload":{"project":"clarify-demo","attempts":1,"finalStatus":"pass","successAttempt":1}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:44.043Z","payload":{"project":"telemetry-demo","stage":"initial","status":"pass"}}
-{"name":"repair_attempt","timestamp":"2025-10-09T01:47:44.044Z","payload":{"project":"telemetry-demo","attempts":1,"finalStatus":"pass","successAttempt":1}}
-{"name":"generation_complete","timestamp":"2025-10-09T01:47:44.048Z","payload":{"project":"telemetry-demo","status":"pass"}}
-{"name":"generation_complete","timestamp":"2025-10-09T01:47:44.057Z","payload":{"project":"clarify-demo","status":"pass"}}
-{"name":"generation_start","timestamp":"2025-10-09T01:47:44.098Z","payload":{"project":"clarify-demo"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:44.120Z","payload":{"project":"clarify-demo","stage":"initial","status":"pass"}}
-{"name":"repair_attempt","timestamp":"2025-10-09T01:47:44.131Z","payload":{"project":"clarify-demo","attempts":1,"finalStatus":"pass","successAttempt":1}}
-{"name":"generation_complete","timestamp":"2025-10-09T01:47:44.134Z","payload":{"project":"clarify-demo","status":"pass"}}
-{"name":"test_run","timestamp":"2025-10-09T01:47:46.099Z","payload":{"project":"passing","stage":"manual","status":"pass"}}
+{"name":"generation_start","timestamp":"2025-10-09T03:23:29.893Z","payload":{"project":"phase1-demo"}}
+{"name":"test_run","timestamp":"2025-10-09T03:23:29.897Z","payload":{"project":"phase1-demo","stage":"initial","status":"fail"}}
+{"name":"repair_attempt","timestamp":"2025-10-09T03:23:29.900Z","payload":{"project":"phase1-demo","attempts":2,"finalStatus":"pass","successAttempt":2}}
+{"name":"test_run","timestamp":"2025-10-09T03:23:29.901Z","payload":{"project":"phase1-demo","stage":"repair-1","status":"fail"}}
+{"name":"test_run","timestamp":"2025-10-09T03:23:29.901Z","payload":{"project":"phase1-demo","stage":"repair-2","status":"pass"}}
+{"name":"generation_complete","timestamp":"2025-10-09T03:23:29.903Z","payload":{"project":"phase1-demo","status":"pass"}}
+{"name":"test_run","timestamp":"2025-10-09T03:23:41.445Z","payload":{"project":"passing","stage":"manual","status":"pass"}}
diff --git a/playwright.config.ts b/playwright.config.ts
index 843faaf5d3fbfdda33f3fb00d1c47ae875c00485..cec6738bc5528e1adbae82572e4828a7ecdfae6b 100644
--- a/playwright.config.ts
+++ b/playwright.config.ts
@@ -1,38 +1,39 @@
 import { defineConfig, devices } from "@playwright/test";
 
 /**
  * Playwright configuration for UI validation
  * - Visual regression testing with screenshot comparison
  * - Accessibility testing with axe-core
  * - Cross-browser testing (Chromium, Firefox, WebKit)
  * 
  * See https://playwright.dev/docs/test-configuration
  */
 export default defineConfig({
   // Test directory
   testDir: "./tests/ui",
+  testMatch: ["**/*.spec.ts", "**/*.playwright.ts"],
   
   // Run tests in files in parallel
   fullyParallel: false,
   
   // Fail the build on CI if you accidentally left test.only in the source code
   forbidOnly: !!process.env.CI,
   
   // Retry on CI only
   retries: process.env.CI ? 2 : 0,
   
   // Opt out of parallel tests on CI
   workers: process.env.CI ? 1 : undefined,
   
   // Reporter to use
   reporter: [
     ["html", { outputFolder: ".automation/playwright-report" }],
     ["json", { outputFile: ".automation/playwright-results.json" }],
     ["list"]
   ],
   
   // Shared settings for all the projects below
   use: {
     // Base URL to use in actions like `await page.goto('/')`
     baseURL: process.env.UI_ORIGIN ?? "http://localhost:3000",
     
diff --git a/public/icons.js b/public/icons.js
new file mode 100644
index 0000000000000000000000000000000000000000..f3281d76a8ba2d5e6d8a0f7042d59a42fc363b99
--- /dev/null
+++ b/public/icons.js
@@ -0,0 +1,35 @@
+export const successIcon = `
+  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
+    <circle cx="12" cy="12" r="9" />
+    <path d="m9 12 2.25 2.25L15 10.5" />
+  </svg>
+`;
+
+export const partialIcon = `
+  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
+    <path d="M12 3 2.5 19h19z" />
+    <path d="M12 8v5" />
+    <path d="M12 16h.01" />
+  </svg>
+`;
+
+export const errorIcon = `
+  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
+    <circle cx="12" cy="12" r="9" />
+    <path d="m9 9 6 6" />
+    <path d="m15 9-6 6" />
+  </svg>
+`;
+
+export const fileIcon = `
+  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
+    <path d="M5 2.75h6.5L15 6.25v11a1.25 1.25 0 0 1-1.25 1.25H5A1.25 1.25 0 0 1 3.75 17.25V4A1.25 1.25 0 0 1 5 2.75z" />
+    <path d="M11.5 2.75V6h3.25" />
+  </svg>
+`;
+
+export const folderIcon = `
+  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
+    <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5H9l2 2.5h8.25A1.75 1.75 0 0 1 21 9.25v8.5A1.75 1.75 0 0 1 19.25 19.5H4.75A1.75 1.75 0 0 1 3 17.75z" />
+  </svg>
+`;
diff --git a/public/index.html b/public/index.html
index 1caacf1697b84a491ccd61ee1c77e32573494928..24a2d4e6521e93b011c04f099757b3a538534a9b 100644
--- a/public/index.html
+++ b/public/index.html
@@ -15,67 +15,72 @@
       <h1>Executor MVP</h1>
       <p class="subtle">Type a build request. The agent will return a JSON file list. The server writes them to <code>/output/&lt;project&gt;</code>.</p>
 
       <label>Project name (optional)</label>
       <input id="projectName" placeholder="hello-world-app" />
 
       <label>Prompt</label>
       <textarea id="prompt" rows="8" placeholder="Make a minimal Node+TS Hello World web app with GET / that returns 'Hello World'. Include README with run steps."></textarea>
 
       <button id="runBtn">Execute</button>
 
       <section id="clarificationSection" class="clarification hidden">
         <h2>Clarification Needed</h2>
         <p class="clarification-hint">Answer the questions below so the agent can build exactly what you need.</p>
         <form id="clarificationForm">
           <div id="clarificationQuestions" class="clarification-questions"></div>
           <div class="clarification-actions">
             <button type="submit" id="answerClarifications">Answer Questions</button>
             <button type="button" id="skipClarifications" class="skip-button">Skip Questions</button>
           </div>
         </form>
       </section>
 
       <pre id="result" class="result"></pre>
 
-      <section id="taskPlanSection" class="task-plan hidden">
-        <h2>Task Plan Progress</h2>
-        <div class="plan-overview">
-          <div class="progress-container">
-            <div id="taskPlanProgressFill" class="progress-fill"></div>
-          </div>
-          <div id="taskPlanSummary" class="plan-summary"></div>
-        </div>
-        <div class="plan-meta">
-          <div>
-            <span class="meta-label">Current Subtask:</span>
-            <span id="currentSubtaskLabel" class="meta-value">Not started</span>
-          </div>
-          <div>
-            <span class="meta-label">Estimated Completion:</span>
-            <span id="estimatedCompletionLabel" class="meta-value">Pending</span>
-          </div>
-        </div>
-        <ul id="subtaskList" class="subtask-list"></ul>
-      </section>
+      <details id="debugDisclosure" class="debug-disclosure hidden">
+        <summary aria-label="Toggle advanced debug information">🔧 Debug Info (Advanced)</summary>
+        <div class="debug-content">
+          <section id="taskPlanSection" class="task-plan hidden">
+            <h2>Task Plan Progress</h2>
+            <div class="plan-overview">
+              <div class="progress-container">
+                <div id="taskPlanProgressFill" class="progress-fill"></div>
+              </div>
+              <div id="taskPlanSummary" class="plan-summary"></div>
+            </div>
+            <div class="plan-meta">
+              <div>
+                <span class="meta-label">Current Subtask:</span>
+                <span id="currentSubtaskLabel" class="meta-value">Not started</span>
+              </div>
+              <div>
+                <span class="meta-label">Estimated Completion:</span>
+                <span id="estimatedCompletionLabel" class="meta-value">Pending</span>
+              </div>
+            </div>
+            <ul id="subtaskList" class="subtask-list"></ul>
+          </section>
 
-      <section id="testControls" class="test-controls hidden">
-        <h2>Test &amp; Repair Timeline</h2>
-        <button id="runTestsBtn" class="run-tests">Run Tests</button>
-        <div id="testStatus" class="test-status"></div>
-        <div id="repairTimeline" class="repair-timeline"></div>
-        <section id="repairHistorySection" class="repair-history hidden">
-          <div class="repair-history-header">
-            <h3>Repair History</h3>
-            <span id="repairHistorySummary" class="history-summary-label"></span>
-            <button id="toggleRepairHistory" type="button" class="history-toggle">Show</button>
-          </div>
-          <div id="repairHistoryContent" class="repair-history-content hidden">
-            <div id="repairHistoryTimeline" class="history-timeline"></div>
-          </div>
-        </section>
-      </section>
+          <section id="testControls" class="test-controls hidden">
+            <h2>Test &amp; Repair Timeline</h2>
+            <button id="runTestsBtn" class="run-tests">Run Tests</button>
+            <div id="testStatus" class="test-status"></div>
+            <div id="repairTimeline" class="repair-timeline"></div>
+            <section id="repairHistorySection" class="repair-history hidden">
+              <div class="repair-history-header">
+                <h3>Repair History</h3>
+                <span id="repairHistorySummary" class="history-summary-label"></span>
+                <button id="toggleRepairHistory" type="button" class="history-toggle">Show</button>
+              </div>
+              <div id="repairHistoryContent" class="repair-history-content hidden">
+                <div id="repairHistoryTimeline" class="history-timeline"></div>
+              </div>
+            </section>
+          </section>
+        </div>
+      </details>
     </main>
     <link rel="modulepreload" href="/script.js" />
     <script type="module" src="/script.js"></script>
   </body>
 </html>
diff --git a/public/script.js b/public/script.js
index be9875ed0d2c73aa77e74640fb161afeca85188b..d47e43ff62fd77157b1d26b6a05f4823a9f34098 100644
--- a/public/script.js
+++ b/public/script.js
@@ -1,74 +1,68 @@
+import { successIcon, partialIcon, errorIcon, fileIcon } from "./icons.js";
+
 const runBtn = document.getElementById("runBtn");
 const promptEl = document.getElementById("prompt");
 const projEl = document.getElementById("projectName");
 const resultEl = document.getElementById("result");
 const testControlsEl = document.getElementById("testControls");
 const runTestsBtn = document.getElementById("runTestsBtn");
 const testStatusEl = document.getElementById("testStatus");
 const repairTimelineEl = document.getElementById("repairTimeline");
 const clarificationSection = document.getElementById("clarificationSection");
 const clarificationForm = document.getElementById("clarificationForm");
 const clarificationQuestionsEl = document.getElementById("clarificationQuestions");
 const skipClarificationsBtn = document.getElementById("skipClarifications");
 const repairHistorySection = document.getElementById("repairHistorySection");
 const repairHistoryContent = document.getElementById("repairHistoryContent");
 const repairHistoryTimeline = document.getElementById("repairHistoryTimeline");
 const repairHistoryToggle = document.getElementById("toggleRepairHistory");
 const repairHistorySummaryEl = document.getElementById("repairHistorySummary");
 const taskPlanSection = document.getElementById("taskPlanSection");
 const taskPlanProgressFill = document.getElementById("taskPlanProgressFill");
 const taskPlanSummary = document.getElementById("taskPlanSummary");
 const subtaskListEl = document.getElementById("subtaskList");
 const currentSubtaskLabel = document.getElementById("currentSubtaskLabel");
 const estimatedCompletionLabel = document.getElementById("estimatedCompletionLabel");
+const debugDisclosure = document.getElementById("debugDisclosure");
 
 let currentProjectSlug = null;
 let pendingQuestions = [];
 let storedPrompt = "";
 let storedProjectName = "";
 let repairHistoryExpanded = false;
 let loadingPhaseTimer = null;
 let loadingPhase = 0;
 
 const DEFAULT_APP_PORT = "3000";
 const currentPort = typeof window !== "undefined" && window.location ? window.location.port : "";
 const isDemoMode = Boolean(currentPort && currentPort !== DEFAULT_APP_PORT);
 
 function clone(value) {
   return JSON.parse(JSON.stringify(value));
 }
 
-function escapeHtml(value) {
-  return String(value)
-    .replace(/&/g, "&amp;")
-    .replace(/</g, "&lt;")
-    .replace(/>/g, "&gt;")
-    .replace(/"/g, "&quot;")
-    .replace(/'/g, "&#39;");
-}
-
 function createDemoTestResult() {
   const now = new Date();
   const startedAt = new Date(now.getTime() - 1500).toISOString();
   return {
     status: "pass",
     passCount: 12,
     failCount: 0,
     startedAt,
     completedAt: now.toISOString(),
     details: [{ name: "Unit tests", status: "passed" }],
   };
 }
 
 function createDemoExecutionResponse() {
   const testResult = createDemoTestResult();
   const now = new Date();
   const subtasks = [
     { id: "plan", title: "Plan solution", status: "completed" },
     { id: "generate", title: "Generate files", status: "completed" },
   ];
   const generatedFileMap = {
     plan: ["README.md", "package.json"],
     generate: ["src/index.ts", "src/index.test.ts", "public/index.html"],
   };
   return {
@@ -187,50 +181,150 @@ function formatDuration(ms) {
   const minutes = seconds / 60;
   return `${minutes.toFixed(1)}m`;
 }
 
 function resetTaskPlanUI() {
   if (taskPlanSection) {
     taskPlanSection.classList.add("hidden");
   }
   if (taskPlanProgressFill) {
     taskPlanProgressFill.style.width = "0%";
   }
   if (taskPlanSummary) {
     taskPlanSummary.textContent = "";
   }
   if (currentSubtaskLabel) {
     currentSubtaskLabel.textContent = "Not started";
   }
   if (estimatedCompletionLabel) {
     estimatedCompletionLabel.textContent = "Pending";
   }
   if (subtaskListEl) {
     subtaskListEl.innerHTML = "";
   }
 }
 
+function resetDebugDisclosure() {
+  if (debugDisclosure) {
+    debugDisclosure.classList.add("hidden");
+    debugDisclosure.removeAttribute("open");
+  }
+}
+
+function revealDebugDisclosure() {
+  if (debugDisclosure) {
+    debugDisclosure.classList.remove("hidden");
+  }
+}
+
+function createActionButton({ text, variant = "primary", onClick, href, target }) {
+  const className = `btn btn-${variant}`;
+  if (href) {
+    const link = document.createElement("a");
+    link.href = href;
+    link.className = className;
+    link.textContent = text;
+    if (target) {
+      link.target = target;
+      link.rel = "noopener";
+    }
+    return link;
+  }
+
+  const button = document.createElement("button");
+  button.type = "button";
+  button.className = className;
+  button.textContent = text;
+  if (typeof onClick === "function") {
+    button.addEventListener("click", onClick);
+  }
+  return button;
+}
+
+function createMetric(label, value) {
+  const metric = document.createElement("div");
+  metric.className = "outcome-card__metric";
+
+  const metricValue = document.createElement("span");
+  metricValue.className = "outcome-card__metric-value";
+  metricValue.textContent = String(value ?? "--");
+
+  const metricLabel = document.createElement("span");
+  metricLabel.className = "outcome-card__metric-label";
+  metricLabel.textContent = label;
+
+  metric.append(metricValue, metricLabel);
+  return metric;
+}
+
+function collectGeneratedFiles(data) {
+  if (!data) return [];
+  const fromPlan = (data.planExecutionResult?.subtaskResults || [])
+    .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
+    .filter(Boolean);
+  const fromSummary = Array.isArray(data.generatedFiles) ? data.generatedFiles : [];
+  const files = new Set([...fromPlan, ...fromSummary]);
+  if (typeof data.browse_url === "string") {
+    // keep set stable
+  }
+  return Array.from(files);
+}
+
+function createFileList(files, headingText = "Generated files") {
+  const wrapper = document.createElement("div");
+  wrapper.className = "file-list";
+
+  const heading = document.createElement("h3");
+  heading.className = "file-list__title";
+  heading.textContent = headingText;
+  wrapper.appendChild(heading);
+
+  const list = document.createElement("ul");
+  list.className = "file-list__items";
+
+  if (!files.length) {
+    const empty = document.createElement("li");
+    empty.className = "file-list__item file-list__item--empty";
+    empty.textContent = "Files will be available after generation completes.";
+    list.appendChild(empty);
+  } else {
+    files.forEach(fileName => {
+      const item = document.createElement("li");
+      item.className = "file-list__item";
+      item.innerHTML = `${fileIcon}<span>${fileName}</span>`;
+      list.appendChild(item);
+    });
+  }
+
+  wrapper.appendChild(list);
+  return wrapper;
+}
+
+function pluralize(count, singular, plural = `${singular}s`) {
+  return `${count} ${count === 1 ? singular : plural}`;
+}
+
 function formatEstimate(estimate) {
   if (!estimate) return "Unknown";
   const when = new Date(estimate.estimatedCompletionTimestamp);
   const remainingMinutes = estimate.estimatedRemainingMs / 60000;
   const isValidDate = !Number.isNaN(when.getTime());
   const timePart = Number.isFinite(remainingMinutes)
     ? `${remainingMinutes.toFixed(1)} minutes`
     : "--";
   const whenText = isValidDate ? when.toLocaleTimeString() : "Unknown time";
   return `${whenText} (${timePart}, confidence ${estimate.confidenceLevel})`;
 }
 
 function renderTaskPlan(taskPlan, executionResult, timeEstimate) {
   if (!taskPlanSection || !taskPlan || !Array.isArray(taskPlan.subtasks) || taskPlan.subtasks.length === 0) {
     resetTaskPlanUI();
     return;
   }
 
   const resultMap = new Map();
   if (executionResult?.subtaskResults) {
     executionResult.subtaskResults.forEach(result => {
       resultMap.set(result.subtaskId, result);
     });
   }
 
@@ -283,50 +377,51 @@ function renderTaskPlan(taskPlan, executionResult, timeEstimate) {
       listItem.appendChild(header);
 
       const description = document.createElement("p");
       description.textContent = subtask.description;
       listItem.appendChild(description);
 
       if (Array.isArray(subtask.dependencies) && subtask.dependencies.length > 0) {
         const dependency = document.createElement("span");
         dependency.className = "dependency";
         dependency.textContent = `Depends on: ${subtask.dependencies.join(" → ")}`;
         listItem.appendChild(dependency);
       }
 
       const result = resultMap.get(subtask.id);
       if (result?.durationMs) {
         const duration = document.createElement("span");
         duration.className = "subtask-duration";
         duration.textContent = `Duration: ${formatDuration(result.durationMs)}`;
         listItem.appendChild(duration);
       }
 
       subtaskListEl.appendChild(listItem);
     });
   }
 
+  revealDebugDisclosure();
   taskPlanSection.classList.remove("hidden");
 }
 
 function renderTimelineEntry(label, runResult) {
   const entry = document.createElement("div");
   entry.className = "timeline-entry";
   const title = document.createElement("h3");
   title.textContent = label;
   entry.appendChild(title);
 
   if (!runResult) {
     const p = document.createElement("p");
     p.textContent = "No run recorded.";
     entry.appendChild(p);
     return entry;
   }
 
   const statusLine = document.createElement("p");
   statusLine.append("Status: ", renderStatus(runResult));
   entry.appendChild(statusLine);
 
   const counts = document.createElement("p");
   counts.textContent = `Pass: ${runResult.passCount} | Fail: ${runResult.failCount}`;
   entry.appendChild(counts);
 
@@ -369,50 +464,51 @@ function summarizeRepairHistory(history) {
     return `Success on attempt ${history.successAttemptNumber}`;
   }
   if (history.finalStatus === "pass") {
     return "Repair succeeded";
   }
   return `Final status: ${history.finalStatus}`;
 }
 
 function renderRepairHistory(history) {
   if (!repairHistorySection || !repairHistoryTimeline || !repairHistorySummaryEl) {
     return;
   }
 
   if (!history || !Array.isArray(history.attempts) || history.attempts.length === 0) {
     repairHistorySection.classList.add("hidden");
     repairHistoryTimeline.innerHTML = "";
     if (repairHistorySummaryEl) {
       repairHistorySummaryEl.textContent = "";
     }
     setRepairHistoryVisibility(false);
     repairHistoryExpanded = false;
     return;
   }
 
   repairHistorySection.classList.remove("hidden");
+  revealDebugDisclosure();
   repairHistoryExpanded = true;
   setRepairHistoryVisibility(true);
 
   repairHistorySummaryEl.textContent = summarizeRepairHistory(history);
   repairHistoryTimeline.innerHTML = "";
 
   const totalAttempts = history.totalAttempts || history.attempts.length;
 
   history.attempts.forEach(attempt => {
     const attemptEl = document.createElement("div");
     const statusClass = attempt.status === "pass"
       ? "status-pass"
       : attempt.status === "fail"
         ? "status-fail"
         : attempt.status === "error"
           ? "status-error"
           : "";
     attemptEl.className = `history-attempt ${statusClass}`.trim();
     if (history.successAttemptNumber === attempt.number) {
       attemptEl.classList.add("attempt-success");
     }
 
     const header = document.createElement("div");
     header.className = "history-attempt-header";
 
@@ -510,292 +606,247 @@ function computeOutcome(data) {
 
   // 2. Files generated + tests executed
   if (data.testResults?.initial?.executed) {
     const testStatus = data.testResults.initial.status?.toUpperCase();
     
     // Tests passed → SUCCESS
     if (testStatus === 'PASS' || testStatus === 'PASSED') {
       return 'success';
     }
     
     // Tests failed → PARTIAL (files exist but quality issue)
     return 'partial';
   }
 
   // 3. Files generated but tests not executed → ERROR (incomplete build)
   return 'error';
 }
 
 function renderSuccessCard(data) {
   if (!data || !data.ok || !data.files_written) {
     return false;
   }
 
   resultEl.innerHTML = "";
 
-  const card = document.createElement("div");
-  card.className = "success-card";
+  const card = document.createElement("article");
+  card.className = "outcome-card outcome-card--success";
 
   const header = document.createElement("div");
-  header.className = "success-header";
-  const icon = document.createElement("span");
-  icon.className = "success-icon";
-  icon.textContent = "✅";
-  const heading = document.createElement("h2");
-  heading.textContent = "Project Generated Successfully!";
-  header.append(icon, heading);
+  header.className = "outcome-card__header";
+  const iconWrap = document.createElement("span");
+  iconWrap.className = "outcome-card__icon";
+  iconWrap.innerHTML = successIcon;
+  header.appendChild(iconWrap);
+
+  const heading = document.createElement("div");
+  heading.className = "outcome-card__heading";
+  const title = document.createElement("h2");
+  title.className = "outcome-card__title";
+  title.textContent = "Project generated successfully";
+  const testsStatus = data.testResults?.initial?.status?.toUpperCase();
+  const testsPhrase = testsStatus === "PASS" || testsStatus === "PASSED"
+    ? "Tests passed"
+    : testsStatus
+      ? `Tests ${testsStatus.toLowerCase()}`
+      : "Tests not run";
+  const subtitle = document.createElement("p");
+  subtitle.className = "outcome-card__subtitle";
+  subtitle.textContent = `${pluralize(data.files_written, "file")} created • ${testsPhrase}`;
+  heading.append(title, subtitle);
+  header.appendChild(heading);
   card.appendChild(header);
 
   const metrics = document.createElement("div");
-  metrics.className = "success-metrics";
-
-  const metricItems = [
-    { value: data.files_written, label: "Files Generated" },
-    {
-      value: data.testResults?.initial
-        ? `${data.testResults.initial.status?.toUpperCase() || "UNKNOWN"}`
-        : "NOT RUN",
-      label: "Initial Tests",
-    },
-    {
-      value: formatDuration(
+  metrics.className = "outcome-card__metrics";
+  metrics.append(
+    createMetric("Files generated", data.files_written),
+    createMetric("Initial tests", testsStatus ?? "NOT RUN"),
+    createMetric(
+      "Build duration",
+      formatDuration(
         data.planExecutionResult?.totalDurationMs ?? data.timeEstimate?.estimatedRemainingMs
-      ),
-      label: "Build Duration",
-    },
-  ];
-
-  metricItems.forEach(metricData => {
-    const metric = document.createElement("div");
-    metric.className = "metric";
-    const metricValue = document.createElement("span");
-    metricValue.className = "metric-value";
-    metricValue.textContent = String(metricData.value ?? "--");
-    const metricLabel = document.createElement("span");
-    metricLabel.className = "metric-label";
-    metricLabel.textContent = metricData.label;
-    metric.append(metricValue, metricLabel);
-    metrics.appendChild(metric);
-  });
-
-  card.appendChild(metrics);
-
-  const files = Array.from(
-    new Set(
-      (data.planExecutionResult?.subtaskResults || [])
-        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
-        .filter(Boolean)
+      )
     )
   );
+  card.appendChild(metrics);
 
-  const fileList = document.createElement("div");
-  fileList.className = "file-list";
-  const fileHeading = document.createElement("h3");
-  fileHeading.textContent = "Generated Files";
-  fileList.appendChild(fileHeading);
-
-  const fileUl = document.createElement("ul");
-  if (files.length > 0) {
-    files.forEach(fileName => {
-      const item = document.createElement("li");
-      item.textContent = `📄 ${fileName}`;
-      fileUl.appendChild(item);
-    });
-  } else {
-    const item = document.createElement("li");
-    item.textContent = "Files will be available after generation completes.";
-    fileUl.appendChild(item);
-  }
-  fileList.appendChild(fileUl);
-  card.appendChild(fileList);
+  const files = collectGeneratedFiles(data);
+  card.appendChild(createFileList(files));
 
   const actions = document.createElement("div");
-  actions.className = "action-buttons";
+  actions.className = "outcome-card__actions button-group";
 
   if (data.browse_url) {
-    const openLink = document.createElement("a");
-    openLink.className = "btn btn-primary";
-    openLink.href = data.browse_url;
-    openLink.target = "_blank";
-    openLink.rel = "noopener";
-    openLink.textContent = "Open Project";
-    actions.appendChild(openLink);
+    actions.appendChild(
+      createActionButton({
+        text: "Open project",
+        variant: "primary",
+        href: data.browse_url,
+        target: "_blank"
+      })
+    );
   }
 
-  const runTestsButton = document.createElement("button");
-  runTestsButton.type = "button";
-  runTestsButton.className = "btn btn-secondary";
-  runTestsButton.textContent = "Run Tests";
-  runTestsButton.addEventListener("click", () => {
-    if (runTestsBtn) {
-      runTestsBtn.click();
-      runTestsBtn.scrollIntoView({ behavior: "smooth", block: "center" });
-    }
-  });
-  actions.appendChild(runTestsButton);
+  actions.appendChild(
+    createActionButton({
+      text: "View files",
+      variant: "secondary",
+      onClick: () => {
+        const list = card.querySelector(".file-list");
+        if (list) {
+          list.scrollIntoView({ behavior: "smooth", block: "start" });
+        }
+      }
+    })
+  );
 
   card.appendChild(actions);
 
-  const rawJson = document.createElement("details");
-  rawJson.className = "raw-json";
+  const details = document.createElement("details");
+  details.className = "outcome-card__details";
   const summary = document.createElement("summary");
-  summary.textContent = "View Raw Response";
+  summary.textContent = "View raw response";
   const pre = document.createElement("pre");
   pre.textContent = JSON.stringify(data, null, 2);
-  rawJson.append(summary, pre);
-  card.appendChild(rawJson);
+  details.append(summary, pre);
+  card.appendChild(details);
 
   resultEl.appendChild(card);
   return true;
 }
 
 /**
  * Render Partial Success Card - Files generated but tests failed
  * Yellow/amber theme to indicate caution without panic
  */
 function renderPartialCard(data) {
   if (!data || !data.files_written) {
     return false;
   }
 
   resultEl.innerHTML = "";
 
-  const card = document.createElement("div");
-  card.className = "partial-card";
+  const card = document.createElement("article");
+  card.className = "outcome-card outcome-card--partial";
 
   const header = document.createElement("div");
-  header.className = "partial-header";
-  const icon = document.createElement("span");
-  icon.className = "partial-icon";
-  icon.textContent = "⚠️";
-  const heading = document.createElement("h2");
-  heading.textContent = "Project Created - Tests Need Attention";
-  header.append(icon, heading);
+  header.className = "outcome-card__header";
+  const iconWrap = document.createElement("span");
+  iconWrap.className = "outcome-card__icon";
+  iconWrap.innerHTML = partialIcon;
+  header.appendChild(iconWrap);
+
+  const heading = document.createElement("div");
+  heading.className = "outcome-card__heading";
+  const title = document.createElement("h2");
+  title.className = "outcome-card__title";
+  title.textContent = "Project created — tests need attention";
+  const failCount = data.testResults?.initial?.failCount ?? 0;
+  const subtitle = document.createElement("p");
+  subtitle.className = "outcome-card__subtitle";
+  subtitle.textContent = `${pluralize(data.files_written, "file")} generated • ${pluralize(failCount, "test")} failing`;
+  heading.append(title, subtitle);
+  header.appendChild(heading);
   card.appendChild(header);
 
   const message = document.createElement("p");
-  message.className = "partial-message";
-  const failCount = data.testResults?.initial?.failCount || 0;
-  const passCount = data.testResults?.initial?.passCount || 0;
-  message.textContent = `Files generated successfully, but ${failCount} test${failCount !== 1 ? 's' : ''} failed (${passCount} passed). Review failures below and fix manually or re-run.`;
+  message.className = "outcome-card__message";
+  const passCount = data.testResults?.initial?.passCount ?? 0;
+  message.textContent = `The executor produced your files, but ${pluralize(failCount, "test")} failed (${passCount} passed). Review the failing cases, apply fixes, and re-run when ready.`;
   card.appendChild(message);
 
   const metrics = document.createElement("div");
-  metrics.className = "partial-metrics";
-
-  const metricItems = [
-    { value: data.files_written, label: "Files Generated" },
-    { value: failCount, label: "Tests Failed" },
-    { value: passCount, label: "Tests Passed" },
-  ];
-
-  metricItems.forEach(metricData => {
-    const metric = document.createElement("div");
-    metric.className = "metric";
-    const metricValue = document.createElement("span");
-    metricValue.className = "metric-value";
-    metricValue.textContent = String(metricData.value ?? "0");
-    const metricLabel = document.createElement("span");
-    metricLabel.className = "metric-label";
-    metricLabel.textContent = metricData.label;
-    metric.append(metricValue, metricLabel);
-    metrics.appendChild(metric);
-  });
-
+  metrics.className = "outcome-card__metrics";
+  metrics.append(
+    createMetric("Files generated", data.files_written),
+    createMetric("Tests failed", failCount),
+    createMetric("Tests passed", passCount)
+  );
   card.appendChild(metrics);
 
-  const files = Array.from(
-    new Set(
-      (data.planExecutionResult?.subtaskResults || [])
-        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
-        .filter(Boolean)
-    )
+  const files = collectGeneratedFiles(data);
+  card.appendChild(createFileList(files));
+
+  const insightActions = document.createElement("div");
+  insightActions.className = "button-group button-group--inline";
+  insightActions.appendChild(
+    createActionButton({
+      text: "View test results",
+      variant: "ghost",
+      onClick: () => {
+        revealDebugDisclosure();
+        debugDisclosure?.setAttribute("open", "");
+        testControlsEl?.scrollIntoView({ behavior: "smooth", block: "start" });
+      }
+    })
   );
-
-  const fileList = document.createElement("div");
-  fileList.className = "file-list";
-  const fileHeading = document.createElement("h3");
-  fileHeading.textContent = "Generated Files";
-  fileList.appendChild(fileHeading);
-
-  const fileUl = document.createElement("ul");
-  if (files.length > 0) {
-    files.forEach(fileName => {
-      const item = document.createElement("li");
-      item.textContent = `📄 ${fileName}`;
-      fileUl.appendChild(item);
-    });
-  } else {
-    const item = document.createElement("li");
-    item.textContent = "Files list not available.";
-    fileUl.appendChild(item);
-  }
-  fileList.appendChild(fileUl);
-  card.appendChild(fileList);
+  card.appendChild(insightActions);
 
   const actions = document.createElement("div");
-  actions.className = "action-buttons";
+  actions.className = "outcome-card__actions button-group";
 
   if (data.browse_url) {
-    const openLink = document.createElement("a");
-    openLink.className = "btn btn-primary";
-    openLink.href = data.browse_url;
-    openLink.target = "_blank";
-    openLink.rel = "noopener";
-    openLink.textContent = "Open Project";
-    actions.appendChild(openLink);
+    actions.appendChild(
+      createActionButton({
+        text: "Open project",
+        variant: "primary",
+        href: data.browse_url,
+        target: "_blank"
+      })
+    );
   }
 
-  const rerunButton = document.createElement("button");
-  rerunButton.type = "button";
-  rerunButton.className = "btn btn-secondary";
-  rerunButton.textContent = "Fix & Re-run";
-  rerunButton.addEventListener("click", () => {
-    if (runBtn) {
-      window.scrollTo({ top: 0, behavior: "smooth" });
-      promptEl.focus();
-    }
-  });
-  actions.appendChild(rerunButton);
+  actions.appendChild(
+    createActionButton({
+      text: "Fix & re-run",
+      variant: "secondary",
+      onClick: () => {
+        window.scrollTo({ top: 0, behavior: "smooth" });
+        promptEl.focus();
+      }
+    })
+  );
 
   card.appendChild(actions);
 
-  const rawJson = document.createElement("details");
-  rawJson.className = "raw-json";
+  const details = document.createElement("details");
+  details.className = "outcome-card__details";
   const summary = document.createElement("summary");
-  summary.textContent = "View Raw Response";
+  summary.textContent = "View raw response";
   const pre = document.createElement("pre");
   pre.textContent = JSON.stringify(data, null, 2);
-  rawJson.append(summary, pre);
-  card.appendChild(rawJson);
+  details.append(summary, pre);
+  card.appendChild(details);
 
   resultEl.appendChild(card);
   return true;
 }
 
 function renderTestLifecycle(testResults, repair) {
   if (!testResults) return;
+  revealDebugDisclosure();
   testStatusEl.innerHTML = "";
   repairTimelineEl.innerHTML = "";
 
   const initialEntry = renderTimelineEntry("Initial Test Run", testResults.initial);
   repairTimelineEl.appendChild(initialEntry);
 
   if (repair?.attempted) {
     const repairEntry = document.createElement("div");
     repairEntry.className = "timeline-entry";
     const heading = document.createElement("h3");
     heading.textContent = "Repair Attempt";
     repairEntry.appendChild(heading);
 
     const summary = document.createElement("p");
     summary.textContent = repair.repaired
       ? "Repair succeeded"
       : repair.error
       ? `Repair failed: ${repair.error}`
       : "Repair attempted but tests still failing";
     repairEntry.appendChild(summary);
 
     if (repair.notes?.length) {
       const notesHeading = document.createElement("p");
       notesHeading.textContent = `Notes: ${repair.notes.join(", ")}`;
       repairEntry.appendChild(notesHeading);
@@ -920,167 +971,208 @@ function collectClarificationAnswers() {
         input.reportValidity();
         throw new Error("Please provide all required clarification details.");
       }
       const parsed = Number(input.value);
       if (!Number.isFinite(parsed)) {
         input.focus();
         throw new Error("Please enter a valid number.");
       }
       answers.push({ questionId: question.id, value: parsed });
       continue;
     }
 
     const value = input.value.trim();
     if (!value) {
       input.reportValidity();
       throw new Error("Please provide all required clarification details.");
     }
     answers.push({ questionId: question.id, value });
   }
 
   return { answers };
 }
 
 function formatError(error) {
   const errorMap = {
-    "Failed to fetch": {
-      title: "Connection Error",
-      message: "Unable to connect to server",
-      action: "Check server is running: npm run dev",
+    "failed to fetch": {
+      title: "Connection error",
+      message: "We couldn't reach the executor service.",
+      action: "Verify the backend server is running (npm run dev).",
     },
-    ERR_CONNECTION_REFUSED: {
-      title: "Server Not Running",
-      message: "Backend service not responding",
-      action: "Start server: npm run dev",
+    "err_connection_refused": {
+      title: "Server unavailable",
+      message: "The executor service is not responding.",
+      action: "Start the server locally or confirm network access.",
     },
     timeout: {
-      title: "Request Timeout",
-      message: "Operation took too long",
-      action: "Try simpler request or check logs",
+      title: "Request timed out",
+      message: "The operation is taking longer than expected.",
+      action: "Retry with a smaller scope or inspect debug telemetry.",
     },
-    NetworkError: {
-      title: "Network Error",
-      message: "Network connection lost",
-      action: "Check internet connection",
+    networkerror: {
+      title: "Network error",
+      message: "The network connection was interrupted.",
+      action: "Check your internet connection and retry.",
     },
   };
 
-  const errorText = error instanceof Error ? error.message : String(error ?? "");
-  const normalized = errorText.toLowerCase();
-  const match = Object.entries(errorMap).find(([key]) =>
-    normalized.includes(key.toLowerCase())
-  );
+  const rawMessage = (() => {
+    if (typeof error === "string") return error;
+    if (error instanceof Error) return error.message;
+    if (error && typeof error === "object") {
+      if (typeof error.error === "string") return error.error;
+      if (typeof error.message === "string") return error.message;
+    }
+    return "";
+  })();
 
-  const { title, message, action } = match ? match[1] : {
-    title: "Unexpected Error",
+  const normalized = rawMessage.toLowerCase();
+  const match = Object.entries(errorMap).find(([key]) => normalized.includes(key));
+
+  const fallback = {
+    title: "Unexpected error",
     message: "Something went wrong while generating your project.",
-    action: "Please retry or review the details below.",
+    action: "Review the details below or try running the request again.",
   };
 
-  const technicalDetails = error instanceof Error && error.stack ? error.stack : errorText || String(error);
-
-  return `
-    <div class="error-card">
-      <div class="error-header">
-        <span class="error-icon">⚠️</span>
-        <h3 class="error-title">${escapeHtml(title)}</h3>
-      </div>
-      <p class="error-message">${escapeHtml(message)}</p>
-      <div class="error-action">${escapeHtml(action)}</div>
-      <details>
-        <summary>Technical details</summary>
-        <pre>${escapeHtml(technicalDetails)}</pre>
-      </details>
-    </div>
-  `;
+  const { title, message, action } = match ? match[1] : fallback;
+
+  let technicalDetails;
+  if (error instanceof Error && error.stack) {
+    technicalDetails = error.stack;
+  } else if (typeof error === "string") {
+    technicalDetails = error;
+  } else if (error && typeof error === "object") {
+    try {
+      technicalDetails = JSON.stringify(error, null, 2);
+    } catch {
+      technicalDetails = String(rawMessage || error);
+    }
+  } else {
+    technicalDetails = rawMessage || "Unknown error";
+  }
+
+  return { title, message, action, technicalDetails };
 }
 
 /**
  * Render Error Card - Generation failed completely
  * Used when no files produced or system error occurred
  */
 function renderErrorCard(data) {
   resultEl.innerHTML = "";
-  
-  const errorMessage = data?.error || data?.message || "Generation failed";
-  const card = document.createElement("div");
-  card.className = "error-card";
+
+  const info = formatError(data?.error ?? data);
+  const card = document.createElement("article");
+  card.className = "outcome-card outcome-card--error";
 
   const header = document.createElement("div");
-  header.className = "error-header";
-  const icon = document.createElement("span");
-  icon.className = "error-icon";
-  icon.textContent = "❌";
-  const heading = document.createElement("h3");
-  heading.className = "error-title";
-  heading.textContent = "Generation Failed";
-  header.append(icon, heading);
+  header.className = "outcome-card__header";
+  const iconWrap = document.createElement("span");
+  iconWrap.className = "outcome-card__icon";
+  iconWrap.innerHTML = errorIcon;
+  header.appendChild(iconWrap);
+
+  const heading = document.createElement("div");
+  heading.className = "outcome-card__heading";
+  const title = document.createElement("h2");
+  title.className = "outcome-card__title";
+  title.textContent = "Generation failed";
+  const subtitle = document.createElement("p");
+  subtitle.className = "outcome-card__subtitle";
+  subtitle.textContent = info.title;
+  heading.append(title, subtitle);
+  header.appendChild(heading);
   card.appendChild(header);
 
   const message = document.createElement("p");
-  message.className = "error-message";
-  message.textContent = typeof errorMessage === 'string' ? errorMessage : "Unable to generate project files.";
+  message.className = "outcome-card__message";
+  message.textContent = info.message;
   card.appendChild(message);
 
-  const actionList = document.createElement("div");
-  actionList.className = "error-action-list";
-  const actionHeading = document.createElement("p");
-  actionHeading.textContent = "Suggested actions:";
-  actionList.appendChild(actionHeading);
-  
+  const hint = document.createElement("p");
+  hint.className = "outcome-card__hint";
+  hint.textContent = info.action;
+  card.appendChild(hint);
+
   const suggestions = document.createElement("ul");
-  suggestions.innerHTML = `
-    <li>→ Simplify your prompt and try again</li>
-    <li>→ Check that the server is running</li>
-    <li>→ Review technical details below for specific errors</li>
-  `;
-  actionList.appendChild(suggestions);
-  card.appendChild(actionList);
+  suggestions.className = "outcome-card__suggestions";
+  [
+    "Refine the prompt with concrete requirements or acceptance criteria.",
+    "Open Debug Info to inspect the execution timeline and error logs.",
+    "Review recent test output before running the request again.",
+  ].forEach(text => {
+    const item = document.createElement("li");
+    item.textContent = text;
+    suggestions.appendChild(item);
+  });
+  card.appendChild(suggestions);
 
   const actions = document.createElement("div");
-  actions.className = "action-buttons";
-
-  const retryButton = document.createElement("button");
-  retryButton.type = "button";
-  retryButton.className = "btn btn-primary";
-  retryButton.textContent = "Try Again";
-  retryButton.addEventListener("click", () => {
-    window.scrollTo({ top: 0, behavior: "smooth" });
-    promptEl.focus();
+  actions.className = "outcome-card__actions button-group";
+
+  const retryButton = createActionButton({
+    text: "Try again",
+    variant: "primary",
+    onClick: () => {
+      window.scrollTo({ top: 0, behavior: "smooth" });
+      promptEl.focus();
+    }
   });
   actions.appendChild(retryButton);
 
+  const debugButton = createActionButton({
+    text: "View debug info",
+    variant: "secondary",
+    onClick: () => {
+      revealDebugDisclosure();
+      debugDisclosure?.setAttribute("open", "");
+      debugDisclosure?.scrollIntoView({ behavior: "smooth", block: "start" });
+    }
+  });
+  actions.appendChild(debugButton);
+
+  const reportLink = createActionButton({
+    text: "Report issue",
+    variant: "ghost",
+    href: "https://github.com/yousefbaragji/ai_system_executor-mvp/issues/new",
+    target: "_blank"
+  });
+  actions.appendChild(reportLink);
+
   card.appendChild(actions);
 
-  const technicalDetails = document.createElement("details");
-  technicalDetails.className = "raw-json";
+  const details = document.createElement("details");
+  details.className = "outcome-card__details";
   const summary = document.createElement("summary");
   summary.textContent = "Technical details";
   const pre = document.createElement("pre");
-  pre.textContent = JSON.stringify(data, null, 2);
-  technicalDetails.append(summary, pre);
-  card.appendChild(technicalDetails);
+  pre.textContent = typeof info.technicalDetails === "string"
+    ? info.technicalDetails
+    : JSON.stringify(info.technicalDetails, null, 2);
+  details.append(summary, pre);
+  card.appendChild(details);
 
   resultEl.appendChild(card);
   return true;
 }
 
 function updateLoadingPhase() {
   if (!resultEl) {
     return null;
   }
 
   const phases = [
     {
       title: "Analyzing your request...",
       hint: "Reading requirements and preparing plan. (typically 10-20 seconds)",
     },
     {
       title: "Creating execution plan...",
       hint: "Breaking down into manageable steps. (typically 10-30 seconds)",
     },
     {
       title: "Building your project...",
       hint: "Generating files and running tests. This may take several minutes.",
     },
   ];
 
@@ -1098,50 +1190,51 @@ function updateLoadingPhase() {
   const title = document.createElement("h3");
   title.textContent = phase.title;
   container.appendChild(title);
 
   const hint = document.createElement("p");
   hint.className = "loading-hint";
   hint.textContent = phase.hint;
   container.appendChild(hint);
 
   resultEl.appendChild(container);
   return container;
 }
 
 async function executeRequest({ prompt, projectName, clarifications }) {
   resetClarificationUI();
   loadingPhase = 0;
   updateLoadingPhase();
   loadingPhaseTimer = setInterval(() => {
     loadingPhase += 1;
     updateLoadingPhase();
   }, 10000);
   testControlsEl.classList.add("hidden");
   currentProjectSlug = null;
   renderRepairHistory(null);
   resetTaskPlanUI();
+  resetDebugDisclosure();
 
   const payload = { prompt };
   if (projectName) {
     payload.projectName = projectName;
   }
   if (clarifications && clarifications.answers.length > 0) {
     payload.clarifications = clarifications;
   }
 
   try {
     const resp = isDemoMode
       ? fakeResponse(createDemoExecutionResponse)
       : await fetch("/api/execute", {
           method: "POST",
           headers: { "content-type": "application/json" },
           body: JSON.stringify(payload),
         });
 
     const data = await resp.json();
     if (!resp.ok) {
       renderErrorCard({ error: data?.error || resp.statusText });
       return;
     }
 
     // Use outcome state machine to determine which card to render
@@ -1158,102 +1251,102 @@ async function executeRequest({ prompt, projectName, clarifications }) {
       case 'error':
         rendered = renderErrorCard(data);
         break;
       default:
         console.error('Unknown outcome:', outcome);
         rendered = renderErrorCard({ error: 'Unknown outcome state' });
     }
 
     // Fallback to JSON if render failed (shouldn't happen with state machine)
     if (!rendered) {
       resultEl.textContent = JSON.stringify(data, null, 2);
     }
 
     // Always render task plan and test lifecycle (will be hidden in W26)
     renderTaskPlan(data.taskPlan, data.planExecutionResult, data.timeEstimate);
     
     if (data?.browse_url) {
       currentProjectSlug = data.project;
       testControlsEl.classList.remove("hidden");
       renderTestLifecycle(data.testResults, data.repair);
       renderRepairHistory(data.repairHistory);
     } else {
       currentProjectSlug = null;
     }
   } catch (err) {
-    resultEl.innerHTML = formatError(err);
+    renderErrorCard({ error: err });
   } finally {
     if (loadingPhaseTimer) {
       clearInterval(loadingPhaseTimer);
       loadingPhaseTimer = null;
     }
   }
 }
 
 async function startClarificationFlow() {
   const rawPrompt = promptEl.value;
   const prompt = rawPrompt.trim();
   const projectName = projEl.value.trim();
 
   storedPrompt = rawPrompt;
   storedProjectName = projectName;
 
   if (!prompt) {
     resultEl.textContent = "Please enter a prompt before executing.";
     return;
   }
 
   resultEl.textContent = "Checking requirements...";
   testControlsEl.classList.add("hidden");
   currentProjectSlug = null;
   resetClarificationUI();
 
   try {
     const resp = isDemoMode
       ? fakeResponse(demoClarificationResponse)
       : await fetch("/api/clarify", {
           method: "POST",
           headers: { "content-type": "application/json" },
           body: JSON.stringify({ prompt: rawPrompt }),
         });
     const data = await resp.json();
 
     if (!resp.ok) {
       resultEl.textContent = `Error: ${data?.error || resp.statusText}`;
       return;
     }
 
     const questions = Array.isArray(data?.questions) ? data.questions : [];
     if (questions.length === 0) {
       await executeRequest({ prompt: rawPrompt, projectName });
       return;
     }
 
     renderClarificationQuestions(questions);
     resultEl.textContent = "Clarifications required before generation.";
   } catch (err) {
-    resultEl.innerHTML = formatError(err);
+    renderErrorCard({ error: err });
   }
 }
 
 runBtn.addEventListener("click", async () => {
   await startClarificationFlow();
 });
 
 if (clarificationForm) {
   clarificationForm.addEventListener("submit", async event => {
     event.preventDefault();
     if (!pendingQuestions.length) {
       await executeRequest({ prompt: storedPrompt, projectName: storedProjectName });
       return;
     }
 
     try {
       const clarifications = collectClarificationAnswers();
       await executeRequest({
         prompt: storedPrompt,
         projectName: storedProjectName,
         clarifications
       });
     } catch (err) {
       resultEl.textContent = err instanceof Error ? err.message : String(err);
     }
diff --git a/public/styles.css b/public/styles.css
index 5ae9432a2f07539795065d57af65deeb630cec1f..a7790a8c2403d9b5d872c7f017d859f43f096753 100644
--- a/public/styles.css
+++ b/public/styles.css
@@ -1,38 +1,79 @@
 * { box-sizing: border-box; }
 body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; margin: 0; background: #0b0f19; color: #e6e9ef; }
 .container { max-width: 820px; margin: 40px auto; padding: 24px; background: #111827; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
 h1 { margin-top: 0; font-size: 28px; }
 .subtle { color: #9aa4b2; }
 label { display:block; margin: 16px 0 8px; color:#cbd5e1; }
 input, textarea { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color:#e6e9ef; outline: none; }
 input:focus, textarea:focus { border-color: #64748b; }
 button { margin-top: 16px; padding: 12px 16px; border: none; border-radius: 12px; background: #4f46e5; color: white; font-weight: 600; cursor: pointer; }
 button:hover { filter: brightness(1.05); }
 .result { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 12px; margin-top: 16px; overflow: auto; max-height: 420px; }
 code { background: #0f172a; padding: 2px 6px; border-radius: 6px; border:1px solid #334155; }
 .hidden { display: none; }
+
+#debugDisclosure {
+  margin-top: 2rem;
+  border: 1px solid rgba(148, 163, 184, 0.15);
+  border-radius: 12px;
+  background: rgba(15, 23, 42, 0.35);
+  overflow: hidden;
+}
+
+#debugDisclosure summary {
+  list-style: none;
+  padding: 1rem 1.25rem;
+  font-size: 0.875rem;
+  color: #94a3b8;
+  cursor: pointer;
+  user-select: none;
+  display: flex;
+  align-items: center;
+  gap: 0.5rem;
+  transition: color 0.2s ease;
+}
+
+#debugDisclosure summary::-webkit-details-marker {
+  display: none;
+}
+
+#debugDisclosure summary:hover {
+  color: #e2e8f0;
+}
+
+#debugDisclosure[open] summary {
+  margin-bottom: 0.5rem;
+  font-weight: 500;
+  color: #f8fafc;
+}
+
+#debugDisclosure .debug-content {
+  padding: 0 1.25rem 1.25rem;
+  display: grid;
+  gap: 1.5rem;
+}
 .test-controls { margin-top: 24px; padding: 16px; border: 1px solid #334155; border-radius: 12px; background: rgba(15, 23, 42, 0.7); }
 .test-controls h2 { margin-top: 0; }
 .run-tests { margin-top: 0; background: #16a34a; }
 .test-status { margin-top: 16px; padding: 12px; border-radius: 10px; background: rgba(30, 41, 59, 0.8); border: 1px solid #1e293b; font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
 .test-status .status-pass { color: #22c55e; font-weight: 600; }
 .test-status .status-fail { color: #f97316; font-weight: 600; }
 .repair-timeline { margin-top: 16px; display: grid; gap: 12px; }
 .timeline-entry { padding: 12px; border-radius: 10px; border: 1px solid #1f2937; background: rgba(17, 24, 39, 0.85); }
 .timeline-entry h3 { margin: 0 0 8px; font-size: 16px; }
 .timeline-entry p { margin: 4px 0; }
 .repair-history { margin-top: 20px; padding: 14px; border: 1px solid #334155; border-radius: 12px; background: rgba(15, 23, 42, 0.8); }
 .repair-history-header { display: flex; align-items: center; gap: 12px; }
 .repair-history-header h3 { margin: 0; font-size: 18px; }
 .history-summary-label { flex: 1; font-size: 14px; color: #cbd5e1; }
 .history-toggle { background: #1f2937; border: 1px solid #334155; padding: 6px 12px; border-radius: 8px; color: #e2e8f0; font-weight: 500; margin-top: 0; }
 .history-toggle:hover { filter: brightness(1.1); }
 .repair-history-content { margin-top: 16px; }
 .history-timeline { position: relative; display: grid; gap: 16px; border-left: 2px solid rgba(51, 65, 85, 0.6); padding-left: 18px; }
 .history-attempt { position: relative; padding: 12px 16px; border-radius: 10px; border: 1px solid #1f2937; background: rgba(15, 23, 42, 0.9); color: #e2e8f0; }
 .history-attempt::before { content: ""; position: absolute; left: -24px; top: 18px; width: 10px; height: 10px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
 .history-attempt-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
 .history-attempt-badge { width: 44px; height: 44px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); }
 .history-status-icon { font-size: 20px; }
 .history-summary { margin: 0 0 6px; font-weight: 500; }
 .history-files { margin: 8px 0 0; padding-left: 18px; color: #cbd5e1; }
@@ -54,329 +95,336 @@ code { background: #0f172a; padding: 2px 6px; border-radius: 6px; border:1px sol
 .clarification-hint { margin: 0 0 16px; color: #cbd5e1; font-size: 14px; }
 .clarification-questions { display: grid; gap: 16px; }
 .clarification-question { display: grid; gap: 8px; }
 .clarification-options { display: grid; gap: 8px; }
 .clarification-option { display: flex; align-items: center; gap: 8px; }
 .clarification-actions { display: flex; gap: 12px; margin-top: 20px; }
 .skip-button { background: #475569; }
 .task-plan { margin-top: 24px; padding: 16px; border-radius: 12px; border: 1px solid #334155; background: rgba(15, 23, 42, 0.7); }
 .task-plan h2 { margin: 0 0 12px; }
 .plan-overview { display: grid; gap: 12px; }
 .progress-container { width: 100%; height: 12px; border-radius: 999px; background: rgba(30, 41, 59, 0.8); overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.3); }
 .progress-fill { height: 100%; background: linear-gradient(90deg, #34d399, #60a5fa); transition: width 0.3s ease; width: 0%; }
 .plan-summary { font-size: 14px; color: #cbd5e1; }
 .plan-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; font-size: 14px; color: #cbd5e1; }
 .meta-label { font-weight: 600; margin-right: 6px; }
 .meta-value { color: #e2e8f0; }
 .subtask-list { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 10px; }
 .subtask-item { padding: 12px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(17, 24, 39, 0.9); display: grid; gap: 6px; }
 .subtask-item.current { border-color: rgba(52, 211, 153, 0.6); box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.25); }
 .subtask-header { display: flex; align-items: center; gap: 10px; font-weight: 600; }
 .status-icon { font-size: 18px; }
 .dependency { font-size: 12px; color: #94a3b8; }
 .subtask-duration { font-size: 12px; color: #a1a1aa; }
 .task-plan.hidden { display: none; }
 
-.success-card {
-  background: rgba(34, 197, 94, 0.1);
-  border: 1px solid rgba(34, 197, 94, 0.3);
-  border-radius: 8px;
-  padding: 24px;
-  margin-top: 16px;
+.loading-state {
+  text-align: center;
+  padding: 40px 20px;
 }
 
-.success-header {
-  display: flex;
-  align-items: center;
-  gap: 12px;
-  margin-bottom: 20px;
+.spinner {
+  width: 40px;
+  height: 40px;
+  margin: 0 auto 20px;
+  border: 4px solid rgba(148, 163, 184, 0.3);
+  border-top-color: #3b82f6;
+  border-radius: 50%;
+  animation: spin 0.8s linear infinite;
 }
 
-.success-header .success-icon {
-  font-size: 32px;
+@keyframes spin {
+  to {
+    transform: rotate(360deg);
+  }
 }
 
-.success-header h2 {
-  margin: 0;
-  color: #a7f3d0;
+.loading-state h3 {
+  color: #e2e8f0;
+  font-size: 20px;
+  margin: 0 0 12px 0;
 }
 
-.success-metrics {
-  display: grid;
-  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
-  gap: 16px;
-  margin-bottom: 24px;
+.loading-hint {
+  color: #94a3b8;
+  font-size: 14px;
+  max-width: 400px;
+  margin: 0 auto;
+  line-height: 1.5;
 }
-
-.metric {
-  text-align: center;
-  padding: 12px;
-  background: rgba(0, 0, 0, 0.3);
-  border-radius: 6px;
+.outcome-card {
+  --accent-color: #38bdf8;
+  --accent-hover: #0ea5e9;
+  --accent-contrast: #0f172a;
+  background: rgba(17, 24, 39, 0.88);
+  border: 1px solid rgba(148, 163, 184, 0.15);
+  border-left: 4px solid var(--accent-color);
+  border-radius: 0.75rem;
+  padding: 1.75rem;
+  margin-top: 1.75rem;
+  box-shadow: 0 24px 48px rgba(2, 6, 23, 0.35);
+  display: grid;
+  gap: 1.5rem;
 }
 
-.metric-value {
-  display: block;
-  font-size: 28px;
-  font-weight: bold;
-  color: #a7f3d0;
+.outcome-card--success {
+  --accent-color: #10b981;
+  --accent-hover: #059669;
+  --accent-contrast: #022c22;
 }
 
-.metric-label {
-  display: block;
-  font-size: 14px;
-  color: #94a3b8;
-  margin-top: 4px;
+.outcome-card--success .outcome-card__icon {
+  background: rgba(16, 185, 129, 0.18);
 }
 
-.file-list {
-  margin-bottom: 24px;
+.outcome-card--partial {
+  --accent-color: #f59e0b;
+  --accent-hover: #d97706;
+  --accent-contrast: #422006;
 }
 
-.file-list h3 {
-  color: #e2e8f0;
-  font-size: 16px;
-  margin-bottom: 12px;
+.outcome-card--partial .outcome-card__icon {
+  background: rgba(245, 158, 11, 0.2);
 }
 
-.file-list ul {
-  list-style: none;
-  padding: 0;
-  margin: 0;
+.outcome-card--error {
+  --accent-color: #ef4444;
+  --accent-hover: #dc2626;
+  --accent-contrast: #ffffff;
 }
 
-.file-list li {
-  padding: 6px 0;
-  color: #cbd5e1;
-  font-family: "Monaco", "Courier New", monospace;
-  font-size: 14px;
+.outcome-card--error .outcome-card__icon {
+  background: rgba(239, 68, 68, 0.18);
 }
 
-.action-buttons {
+.outcome-card__header {
   display: flex;
-  gap: 12px;
-  margin-bottom: 16px;
+  gap: 1rem;
+  align-items: flex-start;
 }
 
-.action-buttons .btn {
-  padding: 10px 20px;
-  border-radius: 6px;
-  text-decoration: none;
-  font-weight: 500;
-  transition: all 0.2s ease;
+.outcome-card__icon {
+  width: 3rem;
+  height: 3rem;
+  border-radius: 0.75rem;
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  background: rgba(148, 163, 184, 0.18);
+  color: var(--accent-color);
 }
 
-.action-buttons .btn-primary {
-  background: #3b82f6;
-  color: #ffffff;
+.outcome-card__icon svg {
+  width: 1.8rem;
+  height: 1.8rem;
 }
 
-.action-buttons .btn-primary:hover {
-  background: #2563eb;
-  transform: translateY(-1px);
+.outcome-card__heading {
+  display: grid;
+  gap: 0.25rem;
 }
 
-.action-buttons .btn-secondary {
-  background: rgba(255, 255, 255, 0.1);
-  color: #e2e8f0;
-  border: none;
-  cursor: pointer;
+.outcome-card__title {
+  margin: 0;
+  font-size: 1.35rem;
+  font-weight: 600;
+  color: #f8fafc;
 }
 
-.action-buttons .btn-secondary:hover {
-  background: rgba(255, 255, 255, 0.15);
+.outcome-card__subtitle {
+  margin: 0;
+  font-size: 0.95rem;
+  color: rgba(226, 232, 240, 0.85);
 }
 
-.raw-json {
-  margin-top: 16px;
+.outcome-card__message {
+  margin: 0;
+  font-size: 0.95rem;
+  color: rgba(226, 232, 240, 0.9);
+  line-height: 1.65;
 }
 
-.raw-json summary {
-  color: #94a3b8;
-  cursor: pointer;
-  font-size: 14px;
+.outcome-card__hint {
+  margin: 0;
+  font-size: 0.9rem;
+  color: rgba(226, 232, 240, 0.7);
 }
 
-.raw-json pre {
-  margin-top: 12px;
-  max-height: 300px;
-  overflow-y: auto;
+.outcome-card__metrics {
+  display: grid;
+  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
+  gap: 1rem;
 }
 
-.loading-state {
-  text-align: center;
-  padding: 40px 20px;
+.outcome-card__metric {
+  background: rgba(15, 23, 42, 0.65);
+  border: 1px solid rgba(148, 163, 184, 0.18);
+  border-radius: 0.75rem;
+  padding: 1rem;
+  display: grid;
+  gap: 0.25rem;
 }
 
-.spinner {
-  width: 40px;
-  height: 40px;
-  margin: 0 auto 20px;
-  border: 4px solid rgba(148, 163, 184, 0.3);
-  border-top-color: #3b82f6;
-  border-radius: 50%;
-  animation: spin 0.8s linear infinite;
+.outcome-card__metric-value {
+  font-size: 1.6rem;
+  font-weight: 600;
+  color: #f8fafc;
 }
 
-@keyframes spin {
-  to {
-    transform: rotate(360deg);
-  }
+.outcome-card__metric-label {
+  font-size: 0.75rem;
+  text-transform: uppercase;
+  letter-spacing: 0.06em;
+  color: rgba(148, 163, 184, 0.8);
 }
 
-.loading-state h3 {
-  color: #e2e8f0;
-  font-size: 20px;
-  margin: 0 0 12px 0;
+.file-list {
+  background: rgba(15, 23, 42, 0.6);
+  border: 1px solid rgba(148, 163, 184, 0.15);
+  border-radius: 0.75rem;
+  padding: 1.25rem;
+  display: grid;
+  gap: 0.75rem;
 }
 
-.loading-hint {
-  color: #94a3b8;
-  font-size: 14px;
-  max-width: 400px;
-  margin: 0 auto;
-  line-height: 1.5;
+.file-list__title {
+  margin: 0;
+  font-size: 0.95rem;
+  font-weight: 600;
+  color: #e2e8f0;
 }
 
-.error-card {
-  background: rgba(239, 68, 68, 0.1);
-  border: 1px solid rgba(239, 68, 68, 0.3);
-  border-radius: 8px;
-  padding: 24px;
-  margin-top: 16px;
+.file-list__items {
+  list-style: none;
+  padding: 0;
+  margin: 0;
+  display: grid;
+  gap: 0.75rem;
 }
 
-.error-card .error-header {
+.file-list__item {
   display: flex;
   align-items: center;
-  gap: 12px;
-  margin-bottom: 16px;
-}
-
-.error-card .error-icon {
-  font-size: 24px;
+  gap: 0.75rem;
+  padding: 0.65rem 0.75rem;
+  border-radius: 0.65rem;
+  background: rgba(2, 6, 23, 0.6);
+  border: 1px solid rgba(148, 163, 184, 0.12);
+  color: rgba(226, 232, 240, 0.9);
+  font-family: "Monaco", "Courier New", monospace;
+  font-size: 0.85rem;
 }
 
-.error-card .error-title {
-  margin: 0;
-  color: #fca5a5;
-  font-size: 20px;
+.file-list__item svg {
+  width: 1.1rem;
+  height: 1.1rem;
 }
 
-.error-card .error-message {
-  color: #fecaca;
-  margin-bottom: 16px;
-  line-height: 1.6;
+.file-list__item--empty {
+  border-style: dashed;
+  background: transparent;
+  color: rgba(148, 163, 184, 0.7);
+  font-style: italic;
 }
 
-.error-card .error-action {
-  color: #cbd5e1;
-  background: rgba(0, 0, 0, 0.3);
-  padding: 12px;
-  border-radius: 6px;
-  margin-bottom: 16px;
-  font-family: "Monaco", monospace;
-  font-size: 14px;
+.button-group {
+  display: flex;
+  flex-wrap: wrap;
+  gap: 0.75rem;
+  align-items: center;
 }
 
-.error-card details {
-  margin-top: 16px;
+.button-group--inline {
+  justify-content: flex-start;
 }
 
-.error-card summary {
-  color: #94a3b8;
+.btn {
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+  border-radius: 999px;
+  border: 1px solid transparent;
+  font-weight: 600;
+  font-size: 0.9rem;
+  padding: 0.65rem 1.4rem;
   cursor: pointer;
-  font-size: 14px;
-}
-
-.error-card pre {
-  margin-top: 12px;
-  color: #94a3b8;
-  font-size: 12px;
-  max-height: 200px;
-  overflow-y: auto;
-}
-
-/* Partial Card - Files created but tests failed */
-.partial-card {
-  background: rgba(245, 158, 11, 0.1);
-  border: 1px solid rgba(245, 158, 11, 0.3);
-  border-radius: 8px;
-  padding: 24px;
-  margin-top: 16px;
+  text-decoration: none;
+  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
 }
 
-.partial-header {
-  display: flex;
-  align-items: center;
-  gap: 12px;
-  margin-bottom: 16px;
+.btn-primary {
+  background: var(--accent-color);
+  color: var(--accent-contrast);
+  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.25);
 }
 
-.partial-header .partial-icon {
-  font-size: 32px;
+.btn-primary:hover {
+  background: var(--accent-hover);
+  transform: translateY(-1px);
+  box-shadow: 0 16px 32px rgba(2, 6, 23, 0.3);
 }
 
-.partial-header h2 {
-  margin: 0;
-  color: #fcd34d;
-  font-size: 22px;
+.btn-secondary {
+  background: rgba(148, 163, 184, 0.16);
+  border-color: rgba(148, 163, 184, 0.3);
+  color: #e2e8f0;
 }
 
-.partial-message {
-  color: #fde68a;
-  margin-bottom: 20px;
-  line-height: 1.6;
-  font-size: 15px;
+.btn-secondary:hover {
+  background: rgba(148, 163, 184, 0.24);
+  border-color: rgba(148, 163, 184, 0.4);
 }
 
-.partial-metrics {
-  display: flex;
-  gap: 24px;
-  margin-bottom: 24px;
-  padding: 16px;
-  background: rgba(0, 0, 0, 0.2);
-  border-radius: 8px;
-  border: 1px solid rgba(245, 158, 11, 0.2);
+.btn-ghost {
+  background: transparent;
+  color: rgba(226, 232, 240, 0.78);
 }
 
-.partial-metrics .metric {
-  display: flex;
-  flex-direction: column;
-  gap: 4px;
+.btn-ghost:hover {
+  color: #f8fafc;
+  background: rgba(148, 163, 184, 0.1);
 }
 
-.partial-metrics .metric-value {
-  font-size: 24px;
-  font-weight: 700;
-  color: #fbbf24;
+.outcome-card__suggestions {
+  list-style: none;
+  margin: 0;
+  padding: 0;
+  display: grid;
+  gap: 0.75rem;
+  color: rgba(226, 232, 240, 0.8);
 }
 
-.partial-metrics .metric-label {
-  font-size: 12px;
-  color: #cbd5e1;
-  text-transform: uppercase;
-  letter-spacing: 0.5px;
+.outcome-card__suggestions li {
+  position: relative;
+  padding-left: 1.2rem;
 }
 
-.error-action-list {
-  margin: 16px 0;
-  padding: 12px;
-  background: rgba(0, 0, 0, 0.2);
-  border-radius: 6px;
+.outcome-card__suggestions li::before {
+  content: "→";
+  position: absolute;
+  left: 0;
+  top: 0;
+  color: var(--accent-color);
 }
 
-.error-action-list p {
-  margin: 0 0 8px;
-  color: #cbd5e1;
-  font-weight: 600;
+.outcome-card__details {
+  border-top: 1px solid rgba(148, 163, 184, 0.15);
+  padding-top: 0.75rem;
 }
 
-.error-action-list ul {
-  margin: 0;
-  padding-left: 20px;
-  color: #e2e8f0;
+.outcome-card__details summary {
+  color: rgba(226, 232, 240, 0.75);
+  cursor: pointer;
+  font-size: 0.85rem;
 }
 
-.error-action-list li {
-  margin: 4px 0;
+.outcome-card__details pre {
+  margin-top: 0.85rem;
+  max-height: 260px;
+  overflow-y: auto;
+  background: rgba(15, 23, 42, 0.7);
+  border: 1px solid rgba(148, 163, 184, 0.2);
+  border-radius: 0.65rem;
+  padding: 0.85rem;
+  font-size: 0.75rem;
+  color: rgba(226, 232, 240, 0.85);
 }
diff --git a/sbom.spdx.json b/sbom.spdx.json
index f9c2f1d5dbc244e31039f587148e290c8ffc7715..d24e18088b229e9561dfe247f84ab10ee560f6b2 100644
--- a/sbom.spdx.json
+++ b/sbom.spdx.json
@@ -1,603 +1,777 @@
 {
   "spdxVersion": "SPDX-2.3",
   "dataLicense": "CC0-1.0",
   "SPDXID": "SPDXRef-DOCUMENT",
   "name": "executor-mvp@0.1.0",
-  "documentNamespace": "http://spdx.org/spdxdocs/executor-mvp-0.1.0-3ac53b42-fb79-43ba-8ed1-6a050f1a26e5",
+  "documentNamespace": "http://spdx.org/spdxdocs/executor-mvp-0.1.0-46954d19-2c88-4d1d-bc90-63b18591ef87",
   "creationInfo": {
-    "created": "2025-10-08T19:58:03.355Z",
+    "created": "2025-10-09T03:23:50.270Z",
     "creators": [
       "Tool: npm/cli-11.4.2"
     ]
   },
   "documentDescribes": [
     "SPDXRef-Package-executor-mvp-0.1.0"
   ],
   "packages": [
     {
       "name": "executor-mvp",
       "SPDXID": "SPDXRef-Package-executor-mvp-0.1.0",
       "versionInfo": "0.1.0",
       "packageFileName": "",
       "primaryPackagePurpose": "LIBRARY",
       "downloadLocation": "NOASSERTION",
       "filesAnalyzed": false,
       "homepage": "NOASSERTION",
       "licenseDeclared": "NOASSERTION",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/executor-mvp@0.1.0"
         }
       ]
     },
     {
       "name": "@anthropic-ai/sdk",
       "SPDXID": "SPDXRef-Package-anthropic-ai.sdk-0.21.1",
       "versionInfo": "0.21.1",
       "packageFileName": "node_modules/@anthropic-ai/sdk",
       "description": "The official TypeScript library for the Anthropic API",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/@anthropic-ai/sdk/-/sdk-0.21.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/anthropics/anthropic-sdk-typescript#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/%40anthropic-ai/sdk@0.21.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "7ea76def84537699676853988703638cafc4734f43aaff5e918afb3ee0ba19d855d515a4ce2a9ba4905ec27e3609862a0abf7625e5fa83e2175605e6abd97b5d"
+        }
       ]
     },
     {
       "name": "@types/node",
       "SPDXID": "SPDXRef-Package-types.node-18.19.129",
       "versionInfo": "18.19.129",
       "packageFileName": "node_modules/@anthropic-ai/sdk/node_modules/@types/node",
       "description": "TypeScript definitions for node",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/@types/node/-/node-18.19.129.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/%40types/node@18.19.129"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "86b9a2e635addb0eb46b2a31de2217c293049df52f38b24246dace3db1ed1f5e674e3bceeee8677a5beb740b3474ed3fce5e4367765b6a189a5c455be7871afc"
+        }
       ]
     },
     {
       "name": "undici-types",
       "SPDXID": "SPDXRef-Package-undici-types-5.26.5",
       "versionInfo": "5.26.5",
       "packageFileName": "node_modules/@anthropic-ai/sdk/node_modules/undici-types",
       "description": "A stand-alone types package for Undici",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/undici-types/-/undici-types-5.26.5.tgz",
       "filesAnalyzed": false,
       "homepage": "https://undici.nodejs.org",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/undici-types@5.26.5"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "26508c3be7a174420aaa517193a21f568014566833edc53bcc3fe1f57674ab37a8b121e650954ecd242fbd84985979055c2f887cb29221f7e1bf4b1566ea7aa4"
+        }
       ]
     },
     {
       "name": "@types/node-fetch",
       "SPDXID": "SPDXRef-Package-types.node-fetch-2.6.13",
       "versionInfo": "2.6.13",
       "packageFileName": "node_modules/@types/node-fetch",
       "description": "TypeScript definitions for node-fetch",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/@types/node-fetch/-/node-fetch-2.6.13.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node-fetch",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/%40types/node-fetch@2.6.13"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "406a51569cd2694b37d0905218f8ce83852f7aedfce1eadb1c1a13d7378e36fc827f043122452c84b00ea8dfe4f448c6be23d19964d37ba687daac9258a4d54b"
+        }
       ]
     },
     {
       "name": "abort-controller",
       "SPDXID": "SPDXRef-Package-abort-controller-3.0.0",
       "versionInfo": "3.0.0",
       "packageFileName": "node_modules/abort-controller",
       "description": "An implementation of WHATWG AbortController interface.",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/abort-controller/-/abort-controller-3.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/mysticatea/abort-controller#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/abort-controller@3.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "87c950f2d69c6589d1def3504e089b8feb4e0c7239ffe974e80bb63dcae2bff1a67add1e6a3e13c161f8d6c3bdc271c3890b048f5f6ad1daf375675e007b707a"
+        }
       ]
     },
     {
       "name": "agentkeepalive",
       "SPDXID": "SPDXRef-Package-agentkeepalive-4.6.0",
       "versionInfo": "4.6.0",
       "packageFileName": "node_modules/agentkeepalive",
       "description": "Missing keepalive http.Agent",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/agentkeepalive/-/agentkeepalive-4.6.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/node-modules/agentkeepalive#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/agentkeepalive@4.6.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "9236bc8fb3e39a770e36a693b01f1f43ec04da6494d8327d0f85caa09e4f15621d44c6ba48b48dd5f7f898eaf88c26df452b3147891e222c92254d0df53e6121"
+        }
       ]
     },
     {
       "name": "ajv",
       "SPDXID": "SPDXRef-Package-ajv-8.17.1",
       "versionInfo": "8.17.1",
       "packageFileName": "node_modules/ajv",
       "description": "Another JSON Schema Validator",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/ajv/-/ajv-8.17.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://ajv.js.org",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/ajv@8.17.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "07f801b8d8394a2313acf902f80dbe716d11b33c316269fa558c41fe29e5052b52e67c7ac4722dfde84a46120c86abac97b6bc2e34286678c2b39be1c31390d6"
+        }
       ]
     },
     {
       "name": "ajv-formats",
       "SPDXID": "SPDXRef-Package-ajv-formats-3.0.1",
       "versionInfo": "3.0.1",
       "packageFileName": "node_modules/ajv-formats",
       "description": "Format validation for Ajv v7+",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/ajv-formats/-/ajv-formats-3.0.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/ajv-validator/ajv-formats#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/ajv-formats@3.0.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "f2252a979d04511fae51c7514371c3a9ae84572a3776870bf20e5627714d7169aeeb621b90652e7bfa44c8b056f1518a2ae7133e0a9e92ce1f214d43038ca8c1"
+        }
       ]
     },
     {
       "name": "basic-auth",
       "SPDXID": "SPDXRef-Package-basic-auth-2.0.1",
       "versionInfo": "2.0.1",
       "packageFileName": "node_modules/basic-auth",
       "description": "node.js basic auth parser",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/basic-auth/-/basic-auth-2.0.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/jshttp/basic-auth#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/basic-auth@2.0.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "345f9ea6e11d9d4615946ba16b16dbabe76f26db702e7198f988b195794c1392a94395b70a75c0e5c5539de63748f6cf0d191c8cc6e27ebc261587029603997a"
+        }
       ]
     },
     {
       "name": "safe-buffer",
       "SPDXID": "SPDXRef-Package-safe-buffer-5.1.2",
       "versionInfo": "5.1.2",
       "packageFileName": "node_modules/basic-auth/node_modules/safe-buffer",
       "description": "Safer Node.js Buffer API",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/feross/safe-buffer",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/safe-buffer@5.1.2"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "19dd94641243917958ec66c9c5fb04f3f9ef2a45045351b7f1cd6c88de903fa6bd3d3f4c98707c1a7a6c71298c252a05f0b388aedf2e77fc0fb688f2b381bafa"
+        }
       ]
     },
     {
       "name": "cors",
       "SPDXID": "SPDXRef-Package-cors-2.8.5",
       "versionInfo": "2.8.5",
       "packageFileName": "node_modules/cors",
       "description": "Node.js CORS middleware",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/cors/-/cors-2.8.5.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/expressjs/cors#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/cors@2.8.5"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "2881db2c9aaeef7446aff8676eb3bdb817a2c4d1aebd2423ba5fe3745bd2fca152207d615957759e0ef3387c7e62b11f2272c6eeae27e861d0f5c0edc6ffcfea"
+        }
       ]
     },
     {
       "name": "diff",
       "SPDXID": "SPDXRef-Package-diff-5.2.0",
       "versionInfo": "5.2.0",
       "packageFileName": "node_modules/diff",
       "description": "A JavaScript text diff implementation.",
       "downloadLocation": "https://registry.npmjs.org/diff/-/diff-5.2.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/kpdecker/jsdiff#readme",
       "licenseDeclared": "BSD-3-Clause",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/diff@5.2.0"
         }
       ],
       "checksums": [
         {
           "algorithm": "SHA512",
           "checksumValue": "b88143c6aa5164667a4e13a4f388447ea5a81f1d9d7af445be94d97131eeafce6f2267dac546d35bd4728780a90ae0e74e838fd4212d5ca220cad1c13d57dfe4"
         }
       ]
     },
     {
       "name": "dotenv",
       "SPDXID": "SPDXRef-Package-dotenv-16.6.1",
       "versionInfo": "16.6.1",
       "packageFileName": "node_modules/dotenv",
       "description": "Loads environment variables from .env file",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/dotenv/-/dotenv-16.6.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/motdotla/dotenv#readme",
       "licenseDeclared": "BSD-2-Clause",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/dotenv@16.6.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "b81ab87a05874dc4eddf76bbdafa521b4cf71e73ee225e8da98713aca120d9ace81329768695b4cea971cacab6a4af47943207c87c9a91e61a627480c1df1ba3"
+        }
       ]
     },
     {
       "name": "event-target-shim",
       "SPDXID": "SPDXRef-Package-event-target-shim-5.0.1",
       "versionInfo": "5.0.1",
       "packageFileName": "node_modules/event-target-shim",
       "description": "An implementation of WHATWG EventTarget interface.",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/event-target-shim/-/event-target-shim-5.0.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/mysticatea/event-target-shim",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/event-target-shim@5.0.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "8bfd976e74b3feec51094ebe35d54980a5834cce36efe32a61b910cc3df6d43b8240952a3ae24a200d08336f96db1b581dd28e999e1d47a7c4c6c7784972fe59"
+        }
       ]
     },
     {
       "name": "fast-uri",
       "SPDXID": "SPDXRef-Package-fast-uri-3.1.0",
       "versionInfo": "3.1.0",
       "packageFileName": "node_modules/fast-uri",
       "description": "Dependency-free RFC 3986 URI toolbox",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/fastify/fast-uri",
       "licenseDeclared": "BSD-3-Clause",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/fast-uri@3.1.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "88f79e0ca25259fe0810e6ac555ae49d7a5a055d08029cff829ed2d9b6fb6782e58db976306251a889d9894ad0c15d7a729cf0fc3dd2e63e49ba58ff813e7600"
+        }
       ]
     },
     {
       "name": "form-data-encoder",
       "SPDXID": "SPDXRef-Package-form-data-encoder-1.7.2",
       "versionInfo": "1.7.2",
       "packageFileName": "node_modules/form-data-encoder",
       "description": "Encode FormData content into the multipart/form-data format",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/form-data-encoder/-/form-data-encoder-1.7.2.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/octet-stream/form-data-encoder#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/form-data-encoder@1.7.2"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "a9faad61a9f7af1ae70a4d5561a0381fe32cf717693eabcb65aeb198c805be13b7db1effdc9fc4c5c4ddeaaa71334bc7d8674c23ea687a1c8166fa9f313b68f0"
+        }
       ]
     },
     {
       "name": "formdata-node",
       "SPDXID": "SPDXRef-Package-formdata-node-4.4.1",
       "versionInfo": "4.4.1",
       "packageFileName": "node_modules/formdata-node",
       "description": "Spec-compliant FormData implementation for Node.js",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/formdata-node/-/formdata-node-4.4.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/octet-stream/form-data#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/formdata-node@4.4.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "d228ab669dee5438d51adf69e3d6936aa8e4f384eb82510d103baa7dd959435ae80bd09694f93a02f7fc1049d935c02a3e89f0906df9c789f7c30ff54c760079"
+        }
       ]
     },
     {
       "name": "web-streams-polyfill",
       "SPDXID": "SPDXRef-Package-web-streams-polyfill-4.0.0-beta.3",
       "versionInfo": "4.0.0-beta.3",
       "packageFileName": "node_modules/formdata-node/node_modules/web-streams-polyfill",
       "description": "Web Streams, based on the WHATWG spec reference implementation",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/web-streams-polyfill/-/web-streams-polyfill-4.0.0-beta.3.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/MattiasBuelens/web-streams-polyfill#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/web-streams-polyfill@4.0.0-beta.3"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "416f794c24da1e6b187c70f26c63303b920920cf7723feaf4d193e75a1d35853e1c21f82f0283b8fb5f22abc2b8fc21beaf6177b4a1c60dae6cd8e3100037aba"
+        }
       ]
     },
     {
       "name": "humanize-ms",
       "SPDXID": "SPDXRef-Package-humanize-ms-1.2.1",
       "versionInfo": "1.2.1",
       "packageFileName": "node_modules/humanize-ms",
       "description": "transform humanize time to ms",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/humanize-ms/-/humanize-ms-1.2.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/node-modules/humanize-ms#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/humanize-ms@1.2.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "165ef4bd8b6c0056ff0b4e8f4d2f5d641a3b8a16aef93bbf0cd0a4fcec8785e6b4ed2f9a78c5a914591469745af1f23e49c65b108f1d7d2c7063b83167d48055"
+        }
       ]
     },
     {
       "name": "json-schema-traverse",
       "SPDXID": "SPDXRef-Package-json-schema-traverse-1.0.0",
       "versionInfo": "1.0.0",
       "packageFileName": "node_modules/json-schema-traverse",
       "description": "Traverse JSON Schema passing each schema object to callback",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-1.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/epoberezkin/json-schema-traverse#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/json-schema-traverse@1.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "34cf3f3fd9f75e35e12199f594b86415a0024ce5114178d6855e0103f4673aff31be0aadaa9017f483b89914314b1d51968e2dab37aa6f4b0e96bb9a3b2dddba"
+        }
       ]
     },
     {
       "name": "morgan",
       "SPDXID": "SPDXRef-Package-morgan-1.10.1",
       "versionInfo": "1.10.1",
       "packageFileName": "node_modules/morgan",
       "description": "HTTP request logger middleware for node.js",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/morgan/-/morgan-1.10.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/expressjs/morgan#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/morgan@1.10.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "db6ddd31126d23f976e5d24a5a98228f670cb72c2e1bf5a250a5ddbf07db846281872d69b804aa5f017399667bf8aef7bd43e847b492d90cf6708fe0f4c2b0d0"
+        }
       ]
     },
     {
       "name": "debug",
       "SPDXID": "SPDXRef-Package-debug-2.6.9",
       "versionInfo": "2.6.9",
       "packageFileName": "node_modules/morgan/node_modules/debug",
       "description": "small debugging utility",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/visionmedia/debug#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/debug@2.6.9"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "6c2ec496b7496899cf6c03fed44a2d62fa99b1bdde725e708ba05f8ba0494d470da30a7a72fb298348d7ce74532838e6fc4ec076014155e00f54c35c286b0730"
+        }
       ]
     },
     {
       "name": "ms",
       "SPDXID": "SPDXRef-Package-ms-2.0.0",
       "versionInfo": "2.0.0",
       "packageFileName": "node_modules/morgan/node_modules/ms",
       "description": "Tiny milisecond conversion utility",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/zeit/ms#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/ms@2.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "4e9a7ad0fe885090d3b8eabfe59f1c76c93326e8dfc2a7ce4e4af02308fb211212a679099d3e92c89e0f08f9c63281630bd75d85a979295218b40b7dee2c74e4"
+        }
       ]
     },
     {
       "name": "on-finished",
       "SPDXID": "SPDXRef-Package-on-finished-2.3.0",
       "versionInfo": "2.3.0",
       "packageFileName": "node_modules/morgan/node_modules/on-finished",
       "description": "Execute a callback when a request closes, finishes, or errors",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/on-finished/-/on-finished-2.3.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/jshttp/on-finished#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/on-finished@2.3.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "8a4a9d906000c9ffd7fe03e15c6bdf800cad0d9b436ebf9b90d509d0df61e4c23f7667600acde5ea1a07adc52fe35b1129ec378c8c2ba78a900d788af7d52dc3"
+        }
       ]
     },
     {
       "name": "node-domexception",
       "SPDXID": "SPDXRef-Package-node-domexception-1.0.0",
       "versionInfo": "1.0.0",
       "packageFileName": "node_modules/node-domexception",
       "description": "An implementation of the DOMException class from NodeJS",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/node-domexception/-/node-domexception-1.0.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/jimmywarting/node-domexception#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/node-domexception@1.0.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "fe3299a0ca70d05f06470978fde2d138f03771f717b4b0293f44332e6513fc7b8f0995b207b218f59acc78ac363bf9c522a3d00773d533d6989b4177d760170d"
+        }
       ]
     },
     {
       "name": "object-assign",
       "SPDXID": "SPDXRef-Package-object-assign-4.1.1",
       "versionInfo": "4.1.1",
       "packageFileName": "node_modules/object-assign",
       "description": "ES2015 `Object.assign()` ponyfill",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/sindresorhus/object-assign#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/object-assign@4.1.1"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "ac98134279149c7d6c170f324fa552537cc3dec5a6bbab19848b1e63c557f8646edcfe85ec5bbe24d0e85df9251256cb2529dcdc55101d57b8714e618fe05c52"
+        }
       ]
     },
     {
       "name": "openai",
       "SPDXID": "SPDXRef-Package-openai-4.104.0",
       "versionInfo": "4.104.0",
       "packageFileName": "node_modules/openai",
       "description": "The official TypeScript library for the OpenAI API",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/openai/-/openai-4.104.0.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/openai/openai-node#readme",
       "licenseDeclared": "Apache-2.0",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/openai@4.104.0"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "a7df4414db00ff25fa52154ef777f9909b0344b020f824c0d9106a7472b846d2bcbb9209c37d87c9bd9d4c629b9e71669eea01bf9afb676094448f6c199a52b8"
+        }
       ]
     },
     {
       "name": "require-from-string",
       "SPDXID": "SPDXRef-Package-require-from-string-2.0.2",
       "versionInfo": "2.0.2",
       "packageFileName": "node_modules/require-from-string",
       "description": "Require module from string",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/require-from-string/-/require-from-string-2.0.2.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/floatdrop/require-from-string#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/require-from-string@2.0.2"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "5dfd2759ee91b1ece214cbbe029f5b8a251b9a996ae92f7fa7eef0ed85cffc904786b5030d48706bebc0372b9bbaa7d9593bde53ffc36151ac0c6ed128bfef13"
+        }
       ]
     },
     {
       "name": "slugify",
       "SPDXID": "SPDXRef-Package-slugify-1.6.6",
       "versionInfo": "1.6.6",
       "packageFileName": "node_modules/slugify",
       "description": "Slugifies a String",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/slugify/-/slugify-1.6.6.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/simov/slugify",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/slugify@1.6.6"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "87ecfb1ca1d85e3eb0254f809d2ffe207f1487d7dd717d4bae1835fd531d7fd3f0a0141715c5e201db32dad48ad0fea02b024b5e9d36afdd1a8540aa1e4f6baf"
+        }
       ]
     },
     {
       "name": "web-streams-polyfill",
       "SPDXID": "SPDXRef-Package-web-streams-polyfill-3.3.3",
       "versionInfo": "3.3.3",
       "packageFileName": "node_modules/web-streams-polyfill",
       "description": "Web Streams, based on the WHATWG spec reference implementation",
-      "downloadLocation": "NOASSERTION",
+      "downloadLocation": "https://registry.npmjs.org/web-streams-polyfill/-/web-streams-polyfill-3.3.3.tgz",
       "filesAnalyzed": false,
       "homepage": "https://github.com/MattiasBuelens/web-streams-polyfill#readme",
       "licenseDeclared": "MIT",
       "externalRefs": [
         {
           "referenceCategory": "PACKAGE-MANAGER",
           "referenceType": "purl",
           "referenceLocator": "pkg:npm/web-streams-polyfill@3.3.3"
         }
+      ],
+      "checksums": [
+        {
+          "algorithm": "SHA512",
+          "checksumValue": "7762562c28af999613488a207bd32c805099aede7bd418a47161989230b59219656d3783946a99d83f2f0fc13f9496bc58659b6fb3e59bcfd725857b2091d967"
+        }
       ]
     }
   ],
   "relationships": [
     {
       "spdxElementId": "SPDXRef-DOCUMENT",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DESCRIBES"
     },
     {
       "spdxElementId": "SPDXRef-Package-anthropic-ai.sdk-0.21.1",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DEPENDENCY_OF"
     },
     {
       "spdxElementId": "SPDXRef-Package-ajv-8.17.1",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DEPENDENCY_OF"
     },
     {
       "spdxElementId": "SPDXRef-Package-ajv-formats-3.0.1",
       "relatedSpdxElement": "SPDXRef-Package-executor-mvp-0.1.0",
       "relationshipType": "DEPENDENCY_OF"
     },
     {
diff --git a/tests/ui/presentation-policy.playwright.ts b/tests/ui/presentation-policy.playwright.ts
new file mode 100644
index 0000000000000000000000000000000000000000..9dd0ff4951e65c962f5c9faecf80ff0d3f33d280
--- /dev/null
+++ b/tests/ui/presentation-policy.playwright.ts
@@ -0,0 +1,37 @@
+import { test, expect } from "@playwright/test";
+
+test.describe("Presentation policy", () => {
+  test.beforeEach(async ({ page }) => {
+    await page.goto("/");
+    await page.waitForLoadState("domcontentloaded");
+  });
+
+  test("debug disclosure is hidden by default", async ({ page }) => {
+    const disclosure = page.locator("#debugDisclosure");
+    await expect(disclosure).toHaveClass(/.*hidden.*/);
+    await expect(disclosure).not.toHaveAttribute("open", /.+/);
+
+    const taskPlan = page.locator("#taskPlanSection");
+    await expect(taskPlan).toHaveClass(/.*hidden.*/);
+    const testControls = page.locator("#testControls");
+    await expect(testControls).toHaveClass(/.*hidden.*/);
+  });
+
+  test("user can opt into debug info via disclosure", async ({ page }) => {
+    const disclosure = page.locator("#debugDisclosure");
+
+    // Simulate data arrival: remove the hidden class as renderTaskPlan would
+    await page.evaluate(() => {
+      const doc = globalThis.document;
+      const el = doc?.getElementById("debugDisclosure");
+      el?.classList.remove("hidden");
+    });
+
+    const summary = disclosure.locator("summary");
+    await expect(summary).toBeVisible();
+    await expect(disclosure).not.toHaveAttribute("open", /.+/);
+
+    await summary.click();
+    await expect(disclosure).toHaveAttribute("open", "");
+  });
+});
 
EOF
)