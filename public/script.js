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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    ok: true,
    status: "success",
    browse_url: "#",
    project: "demo-project",
    files_written: generatedFileMap.plan.length + generatedFileMap.generate.length,
    taskPlan: { subtasks },
    planExecutionResult: {
      status: "completed",
      progress: {
        completedSubtasks: subtasks.length,
        failedSubtasks: 0,
        percentComplete: 100,
      },
      subtaskResults: subtasks.map((subtask, index) => ({
        subtaskId: subtask.id,
        status: "completed",
        generatedFiles: generatedFileMap[subtask.id] || [],
        startedAt: new Date(now.getTime() - (index + 2) * 1000).toISOString(),
        completedAt: new Date(now.getTime() - (index + 1) * 1000).toISOString(),
      })),
      totalDurationMs: 4200,
    },
    timeEstimate: {
      estimatedCompletionTimestamp: now.toISOString(),
      estimatedRemainingMs: 0,
      confidenceLevel: "high",
    },
    testResults: { initial: testResult },
    repairHistory: {
      attempts: [
        {
          number: 1,
          status: "pass",
          summary: "Initial test run passed.",
          testResult,
          durationMs: 1800,
          changedFiles: [],
        },
      ],
      finalStatus: "pass",
      successAttemptNumber: 1,
      totalAttempts: 1,
    },
  };
}

const demoClarificationResponse = { questions: [] };

function fakeResponse(factory) {
  const payload = typeof factory === "function" ? factory() : factory;
  return {
    ok: true,
    status: 200,
    async json() {
      return clone(payload);
    },
  };
}


if (repairHistoryToggle) {
  repairHistoryToggle.addEventListener("click", () => {
    repairHistoryExpanded = !repairHistoryExpanded;
    setRepairHistoryVisibility(repairHistoryExpanded);
  });
}

// Legacy helper - kept for potential future use
// eslint-disable-next-line no-unused-vars
function renderLink(url) {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = "Open generated project";
  a.style.display = "inline-block";
  a.style.marginTop = "12px";
  a.style.color = "#a5b4fc";
  return a;
}

function renderStatus(runResult) {
  if (!runResult) return "Awaiting results";
  const span = document.createElement("span");
  const statusClass = runResult.status === "pass" ? "status-pass" : "status-fail";
  span.className = statusClass;
  span.textContent = runResult.status.toUpperCase();
  return span;
}

function statusIcon(status) {
  switch (status) {
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    case "in_progress":
      return "⚙️";
    default:
      return "⏳";
  }
}

function formatDuration(ms) {
  if (!ms || ms <= 0) {
    return "-";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
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

  const progress = executionResult?.progress;
  const completed = progress?.completedSubtasks ?? Array.from(resultMap.values()).filter(r => r.status === "completed").length;
  const failed = progress?.failedSubtasks ?? Array.from(resultMap.values()).filter(r => r.status === "failed").length;
  const percent = Math.min(
    100,
    Math.round(
      progress?.percentComplete ?? (completed / taskPlan.subtasks.length) * 100
    )
  );
  if (taskPlanProgressFill) {
    taskPlanProgressFill.style.width = `${percent}%`;
  }

  if (taskPlanSummary) {
    taskPlanSummary.textContent = `Completed ${completed} of ${taskPlan.subtasks.length} · Failed ${failed} · Status: ${executionResult?.status ?? "pending"}`;
  }

  if (currentSubtaskLabel) {
    const current = progress?.currentSubtask
      ?? taskPlan.subtasks.find(subtask => (resultMap.get(subtask.id)?.status ?? subtask.status) === "in_progress")
      ?? taskPlan.subtasks.find(subtask => (resultMap.get(subtask.id)?.status ?? subtask.status) === "pending");
    currentSubtaskLabel.textContent = current ? current.title : "Complete";
  }

  if (estimatedCompletionLabel) {
    estimatedCompletionLabel.textContent = formatEstimate(timeEstimate);
  }

  if (subtaskListEl) {
    subtaskListEl.innerHTML = "";
    taskPlan.subtasks.forEach(subtask => {
      const listItem = document.createElement("li");
      listItem.className = "subtask-item";
      const executionStatus = resultMap.get(subtask.id)?.status ?? subtask.status ?? "pending";
      if (executionStatus === "in_progress") {
        listItem.classList.add("current");
      }

      const header = document.createElement("div");
      header.className = "subtask-header";
      const icon = document.createElement("span");
      icon.className = "status-icon";
      icon.textContent = statusIcon(executionStatus);
      const title = document.createElement("span");
      title.textContent = subtask.title;
      header.append(icon, title);
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

  const duration = document.createElement("p");
  duration.textContent = `Duration: ${runResult.durationMs}ms`;
  entry.appendChild(duration);

  if (runResult.logsPath) {
    const logsLink = document.createElement("p");
    const link = document.createElement("a");
    link.href = `/output/${currentProjectSlug}/${runResult.logsPath}`;
    link.textContent = "View logs";
    link.target = "_blank";
    logsLink.appendChild(link);
    entry.appendChild(logsLink);
  }

  return entry;
}

function setRepairHistoryVisibility(expanded) {
  if (!repairHistorySection || !repairHistoryContent || !repairHistoryToggle) return;
  if (expanded) {
    repairHistorySection.classList.remove("collapsed");
    repairHistoryContent.classList.remove("hidden");
    repairHistoryToggle.textContent = "Hide";
  } else {
    repairHistorySection.classList.add("collapsed");
    repairHistoryContent.classList.add("hidden");
    repairHistoryToggle.textContent = "Show";
  }
}

function summarizeRepairHistory(history) {
  if (!history) return "";
  if (history.finalStatus === "exhausted") {
    return "All attempts exhausted";
  }
  if (history.successAttemptNumber) {
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

    const badge = document.createElement("span");
    badge.className = "history-attempt-badge";
    badge.textContent = `${attempt.number}/${totalAttempts}`;
    header.appendChild(badge);

    const icon = document.createElement("span");
    icon.className = "history-status-icon";
    icon.textContent = attempt.status === "pass" ? "✅" : attempt.status === "fail" ? "⚠️" : "❌";
    header.appendChild(icon);

    const title = document.createElement("h4");
    title.textContent = `Attempt ${attempt.number}`;
    header.appendChild(title);

    attemptEl.appendChild(header);

    if (attempt.summary) {
      const summary = document.createElement("p");
      summary.className = "history-summary";
      summary.textContent = attempt.summary;
      attemptEl.appendChild(summary);
    }

    const counts = document.createElement("p");
    const testResult = attempt.testResult || {};
    counts.textContent = `Pass: ${testResult.passCount ?? 0} | Fail: ${testResult.failCount ?? 0}`;
    attemptEl.appendChild(counts);

    const duration = document.createElement("span");
    duration.className = "duration";
    duration.textContent = `Duration: ${attempt.durationMs ?? 0}ms`;
    attemptEl.appendChild(duration);

    const filesHeading = document.createElement("p");
    filesHeading.textContent = "Changed files:";
    attemptEl.appendChild(filesHeading);

    const filesList = document.createElement("ul");
    filesList.className = "history-files";
    if (Array.isArray(attempt.changedFiles) && attempt.changedFiles.length > 0) {
      attempt.changedFiles.forEach(file => {
        const item = document.createElement("li");
        item.textContent = file;
        filesList.appendChild(item);
      });
    } else {
      const item = document.createElement("li");
      item.textContent = "No files changed";
      filesList.appendChild(item);
    }
    attemptEl.appendChild(filesList);

    if (testResult.logsPath && currentProjectSlug) {
      const logs = document.createElement("p");
      const link = document.createElement("a");
      link.href = `/output/${currentProjectSlug}/${testResult.logsPath}`;
      link.textContent = "View logs";
      link.target = "_blank";
      logs.appendChild(link);
      attemptEl.appendChild(logs);
    }

    repairHistoryTimeline.appendChild(attemptEl);
  });

  const footer = document.createElement("div");
  footer.className = "history-footer";
  if (history.finalStatus === "exhausted") {
    footer.classList.add("exhausted");
    footer.textContent = "All attempts exhausted without a passing result.";
  } else if (history.successAttemptNumber) {
    footer.textContent = `Repair succeeded on attempt ${history.successAttemptNumber}.`;
  } else if (history.finalStatus === "pass") {
    footer.textContent = "Repair succeeded.";
  } else {
    footer.textContent = `Final status: ${history.finalStatus}.`;
  }
  repairHistoryTimeline.appendChild(footer);
}

/**
 * Outcome State Machine - Authoritative determination of generation result
 * Returns exactly ONE of three states based on actual test results
 * @param {Object} data - Execution response from backend
 * @returns {'success' | 'partial' | 'error'} - Outcome state
 */
function computeOutcome(data) {
  // 1. Generation failed or no files produced → ERROR
  if (!data || data.error || !data.files_written || data.files_written === 0) {
    return 'error';
  }

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

  const card = document.createElement("div");
  card.className = "success-card";

  const header = document.createElement("div");
  header.className = "success-header";
  const icon = document.createElement("span");
  icon.className = "success-icon";
  icon.textContent = "✅";
  const heading = document.createElement("h2");
  heading.textContent = "Project Generated Successfully!";
  header.append(icon, heading);
  card.appendChild(header);

  const metrics = document.createElement("div");
  metrics.className = "success-metrics";

  const metricItems = [
    { value: data.files_written, label: "Files Generated" },
    {
      value: data.testResults?.initial
        ? `${data.testResults.initial.status?.toUpperCase() || "UNKNOWN"}`
        : "NOT RUN",
      label: "Initial Tests",
    },
    {
      value: formatDuration(
        data.planExecutionResult?.totalDurationMs ?? data.timeEstimate?.estimatedRemainingMs
      ),
      label: "Build Duration",
    },
  ];

  metricItems.forEach(metricData => {
    const metric = document.createElement("div");
    metric.className = "metric";
    const metricValue = document.createElement("span");
    metricValue.className = "metric-value";
    metricValue.textContent = String(metricData.value ?? "--");
    const metricLabel = document.createElement("span");
    metricLabel.className = "metric-label";
    metricLabel.textContent = metricData.label;
    metric.append(metricValue, metricLabel);
    metrics.appendChild(metric);
  });

  card.appendChild(metrics);

  const files = Array.from(
    new Set(
      (data.planExecutionResult?.subtaskResults || [])
        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
        .filter(Boolean)
    )
  );

  const fileList = document.createElement("div");
  fileList.className = "file-list";
  const fileHeading = document.createElement("h3");
  fileHeading.textContent = "Generated Files";
  fileList.appendChild(fileHeading);

  const fileUl = document.createElement("ul");
  if (files.length > 0) {
    files.forEach(fileName => {
      const item = document.createElement("li");
      item.textContent = `📄 ${fileName}`;
      fileUl.appendChild(item);
    });
  } else {
    const item = document.createElement("li");
    item.textContent = "Files will be available after generation completes.";
    fileUl.appendChild(item);
  }
  fileList.appendChild(fileUl);
  card.appendChild(fileList);

  const actions = document.createElement("div");
  actions.className = "action-buttons";

  if (data.browse_url) {
    const openLink = document.createElement("a");
    openLink.className = "btn btn-primary";
    openLink.href = data.browse_url;
    openLink.target = "_blank";
    openLink.rel = "noopener";
    openLink.textContent = "Open Project";
    actions.appendChild(openLink);
  }

  const runTestsButton = document.createElement("button");
  runTestsButton.type = "button";
  runTestsButton.className = "btn btn-secondary";
  runTestsButton.textContent = "Run Tests";
  runTestsButton.addEventListener("click", () => {
    if (runTestsBtn) {
      runTestsBtn.click();
      runTestsBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  actions.appendChild(runTestsButton);

  card.appendChild(actions);

  const rawJson = document.createElement("details");
  rawJson.className = "raw-json";
  const summary = document.createElement("summary");
  summary.textContent = "View Raw Response";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  rawJson.append(summary, pre);
  card.appendChild(rawJson);

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

  const card = document.createElement("div");
  card.className = "partial-card";

  const header = document.createElement("div");
  header.className = "partial-header";
  const icon = document.createElement("span");
  icon.className = "partial-icon";
  icon.textContent = "⚠️";
  const heading = document.createElement("h2");
  heading.textContent = "Project Created - Tests Need Attention";
  header.append(icon, heading);
  card.appendChild(header);

  const message = document.createElement("p");
  message.className = "partial-message";
  const failCount = data.testResults?.initial?.failCount || 0;
  const passCount = data.testResults?.initial?.passCount || 0;
  message.textContent = `Files generated successfully, but ${failCount} test${failCount !== 1 ? 's' : ''} failed (${passCount} passed). Review failures below and fix manually or re-run.`;
  card.appendChild(message);

  const metrics = document.createElement("div");
  metrics.className = "partial-metrics";

  const metricItems = [
    { value: data.files_written, label: "Files Generated" },
    { value: failCount, label: "Tests Failed" },
    { value: passCount, label: "Tests Passed" },
  ];

  metricItems.forEach(metricData => {
    const metric = document.createElement("div");
    metric.className = "metric";
    const metricValue = document.createElement("span");
    metricValue.className = "metric-value";
    metricValue.textContent = String(metricData.value ?? "0");
    const metricLabel = document.createElement("span");
    metricLabel.className = "metric-label";
    metricLabel.textContent = metricData.label;
    metric.append(metricValue, metricLabel);
    metrics.appendChild(metric);
  });

  card.appendChild(metrics);

  const files = Array.from(
    new Set(
      (data.planExecutionResult?.subtaskResults || [])
        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
        .filter(Boolean)
    )
  );

  const fileList = document.createElement("div");
  fileList.className = "file-list";
  const fileHeading = document.createElement("h3");
  fileHeading.textContent = "Generated Files";
  fileList.appendChild(fileHeading);

  const fileUl = document.createElement("ul");
  if (files.length > 0) {
    files.forEach(fileName => {
      const item = document.createElement("li");
      item.textContent = `📄 ${fileName}`;
      fileUl.appendChild(item);
    });
  } else {
    const item = document.createElement("li");
    item.textContent = "Files list not available.";
    fileUl.appendChild(item);
  }
  fileList.appendChild(fileUl);
  card.appendChild(fileList);

  const actions = document.createElement("div");
  actions.className = "action-buttons";

  if (data.browse_url) {
    const openLink = document.createElement("a");
    openLink.className = "btn btn-primary";
    openLink.href = data.browse_url;
    openLink.target = "_blank";
    openLink.rel = "noopener";
    openLink.textContent = "Open Project";
    actions.appendChild(openLink);
  }

  const rerunButton = document.createElement("button");
  rerunButton.type = "button";
  rerunButton.className = "btn btn-secondary";
  rerunButton.textContent = "Fix & Re-run";
  rerunButton.addEventListener("click", () => {
    if (runBtn) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      promptEl.focus();
    }
  });
  actions.appendChild(rerunButton);

  card.appendChild(actions);

  const rawJson = document.createElement("details");
  rawJson.className = "raw-json";
  const summary = document.createElement("summary");
  summary.textContent = "View Raw Response";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  rawJson.append(summary, pre);
  card.appendChild(rawJson);

  resultEl.appendChild(card);
  return true;
}

function renderTestLifecycle(testResults, repair) {
  if (!testResults) return;
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
    }

    repairTimelineEl.appendChild(repairEntry);
  }

  if (testResults.afterRepair) {
    const afterEntry = renderTimelineEntry("After Repair", testResults.afterRepair);
    repairTimelineEl.appendChild(afterEntry);
  }

  const latest = testResults.afterRepair || testResults.initial;
  if (latest) {
    testStatusEl.append("Latest result: ", renderStatus(latest));
    const stats = document.createElement("div");
    stats.textContent = `Pass: ${latest.passCount} | Fail: ${latest.failCount}`;
    testStatusEl.appendChild(document.createElement("br"));
    testStatusEl.appendChild(stats);
  } else {
    testStatusEl.textContent = "No tests executed for this generation.";
  }
}

function resetClarificationUI() {
  pendingQuestions = [];
  if (clarificationQuestionsEl) {
    clarificationQuestionsEl.innerHTML = "";
  }
  if (clarificationSection) {
    clarificationSection.classList.add("hidden");
  }
}

function renderClarificationQuestions(questions) {
  if (!clarificationSection || !clarificationQuestionsEl) return;
  clarificationQuestionsEl.innerHTML = "";
  pendingQuestions = Array.isArray(questions) ? questions : [];

  for (const question of pendingQuestions) {
    const wrapper = document.createElement("div");
    wrapper.className = "clarification-question";

    const label = document.createElement("label");
    label.textContent = question.text;
    wrapper.appendChild(label);

    if (question.type === "choice" && Array.isArray(question.options)) {
      const optionsContainer = document.createElement("div");
      optionsContainer.className = "clarification-options";
      question.options.forEach((option, index) => {
        const optionWrapper = document.createElement("div");
        optionWrapper.className = "clarification-option";
        const optionId = `clarification-${question.id}-${index}`;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `clarification-${question.id}`;
        input.value = option;
        input.id = optionId;
        input.required = true;

        const optionLabel = document.createElement("label");
        optionLabel.setAttribute("for", optionId);
        optionLabel.textContent = option;

        optionWrapper.append(input, optionLabel);
        optionsContainer.appendChild(optionWrapper);
      });
      if (question.options.length > 0) {
        label.htmlFor = `clarification-${question.id}-0`;
      }
      wrapper.appendChild(optionsContainer);
    } else {
      const input = document.createElement("input");
      input.name = `clarification-${question.id}`;
      input.id = `clarification-${question.id}`;
      input.required = true;
      if (question.type === "number") {
        input.type = "number";
        input.inputMode = "numeric";
      } else {
        input.type = "text";
      }
      label.htmlFor = input.id;
      wrapper.appendChild(input);
    }

    clarificationQuestionsEl.appendChild(wrapper);
  }

  clarificationSection.classList.remove("hidden");
}

function collectClarificationAnswers() {
  if (!clarificationForm) {
    return { answers: [] };
  }

  const answers = [];
  for (const question of pendingQuestions) {
    if (question.type === "choice") {
      const selected = clarificationForm.querySelector(
        `input[name="clarification-${question.id}"]:checked`
      );
      if (!selected) {
        throw new Error("Please answer all clarification questions.");
      }
      answers.push({ questionId: question.id, value: selected.value });
      continue;
    }

    const input = clarificationForm.querySelector(
      `input[name="clarification-${question.id}"]`
    );
    if (!(input instanceof HTMLInputElement)) {
      continue;
    }

    if (question.type === "number") {
      if (!input.value) {
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
    "Failed to fetch": {
      title: "Connection Error",
      message: "Unable to connect to server",
      action: "Check server is running: npm run dev",
    },
    ERR_CONNECTION_REFUSED: {
      title: "Server Not Running",
      message: "Backend service not responding",
      action: "Start server: npm run dev",
    },
    timeout: {
      title: "Request Timeout",
      message: "Operation took too long",
      action: "Try simpler request or check logs",
    },
    NetworkError: {
      title: "Network Error",
      message: "Network connection lost",
      action: "Check internet connection",
    },
  };

  const errorText = error instanceof Error ? error.message : String(error ?? "");
  const normalized = errorText.toLowerCase();
  const match = Object.entries(errorMap).find(([key]) =>
    normalized.includes(key.toLowerCase())
  );

  const { title, message, action } = match ? match[1] : {
    title: "Unexpected Error",
    message: "Something went wrong while generating your project.",
    action: "Please retry or review the details below.",
  };

  const technicalDetails = error instanceof Error && error.stack ? error.stack : errorText || String(error);

  return `
    <div class="error-card">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <h3 class="error-title">${escapeHtml(title)}</h3>
      </div>
      <p class="error-message">${escapeHtml(message)}</p>
      <div class="error-action">${escapeHtml(action)}</div>
      <details>
        <summary>Technical details</summary>
        <pre>${escapeHtml(technicalDetails)}</pre>
      </details>
    </div>
  `;
}

/**
 * Render Error Card - Generation failed completely
 * Used when no files produced or system error occurred
 */
function renderErrorCard(data) {
  resultEl.innerHTML = "";
  
  const errorMessage = data?.error || data?.message || "Generation failed";
  const card = document.createElement("div");
  card.className = "error-card";

  const header = document.createElement("div");
  header.className = "error-header";
  const icon = document.createElement("span");
  icon.className = "error-icon";
  icon.textContent = "❌";
  const heading = document.createElement("h3");
  heading.className = "error-title";
  heading.textContent = "Generation Failed";
  header.append(icon, heading);
  card.appendChild(header);

  const message = document.createElement("p");
  message.className = "error-message";
  message.textContent = typeof errorMessage === 'string' ? errorMessage : "Unable to generate project files.";
  card.appendChild(message);

  const actionList = document.createElement("div");
  actionList.className = "error-action-list";
  const actionHeading = document.createElement("p");
  actionHeading.textContent = "Suggested actions:";
  actionList.appendChild(actionHeading);
  
  const suggestions = document.createElement("ul");
  suggestions.innerHTML = `
    <li>→ Simplify your prompt and try again</li>
    <li>→ Check that the server is running</li>
    <li>→ Review technical details below for specific errors</li>
  `;
  actionList.appendChild(suggestions);
  card.appendChild(actionList);

  const actions = document.createElement("div");
  actions.className = "action-buttons";

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "btn btn-primary";
  retryButton.textContent = "Try Again";
  retryButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    promptEl.focus();
  });
  actions.appendChild(retryButton);

  card.appendChild(actions);

  const technicalDetails = document.createElement("details");
  technicalDetails.className = "raw-json";
  const summary = document.createElement("summary");
  summary.textContent = "Technical details";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  technicalDetails.append(summary, pre);
  card.appendChild(technicalDetails);

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

  const phaseIndex = Math.min(loadingPhase, phases.length - 1);
  const phase = phases[phaseIndex];

  resultEl.innerHTML = "";
  const container = document.createElement("div");
  container.className = "loading-state";

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  container.appendChild(spinner);

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
    const outcome = computeOutcome(data);
    let rendered = false;
    
    switch (outcome) {
      case 'success':
        rendered = renderSuccessCard(data);
        break;
      case 'partial':
        rendered = renderPartialCard(data);
        break;
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
    resultEl.innerHTML = formatError(err);
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
    resultEl.innerHTML = formatError(err);
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
  });
}

if (skipClarificationsBtn) {
  skipClarificationsBtn.addEventListener("click", async () => {
    if (!storedPrompt.trim()) {
      resultEl.textContent = "No prompt available to execute.";
      return;
    }
    await executeRequest({ prompt: storedPrompt, projectName: storedProjectName });
  });
}

runTestsBtn.addEventListener("click", async () => {
  if (!currentProjectSlug) return;
  testStatusEl.textContent = "Running manual tests...";
  try {
    const resp = isDemoMode
      ? fakeResponse(createDemoTestResult)
      : await fetch("/api/run-tests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project: currentProjectSlug }),
        });
    if (!resp.ok) {
      const error = await resp.json();
      testStatusEl.textContent = `Error: ${error?.error || resp.statusText}`;
      return;
    }
    const runResult = await resp.json();
    renderTestLifecycle({ initial: runResult, afterRepair: null }, null);
  } catch (err) {
    testStatusEl.textContent = String(err);
  }
});
