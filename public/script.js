/* global Prism */
import { successIcon, partialIcon, errorIcon } from "./icons.js";

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
const debugDisclosure = document.getElementById("debugDisclosure");
const filePreviewPanel = document.getElementById("filePreviewPanel");

const mainContainer = document.querySelector("main");
let orchestrationSection = null;
let pauseSessionButton = null;
let resumeDrawer = null;
let resumeFormEl = null;
let resumeQuestionsEl = null;
let resumeMessageEl = null;

let activeSessionId = null;
let orchestrationQuestions = [];

let currentProjectSlug = null;
let pendingQuestions = [];
let storedPrompt = "";
let storedProjectName = "";
let repairHistoryExpanded = false;
// legacy loading state removed

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

function hideDebugDisclosure() {
  if (debugDisclosure) {
    debugDisclosure.classList.add("hidden");
    debugDisclosure.removeAttribute("open");
  }
}

function revealDebugDisclosure() {
  if (debugDisclosure) {
    debugDisclosure.classList.remove("hidden");
  }
}

hideDebugDisclosure();

function resetOrchestrationControls() {
  orchestrationQuestions = [];
  activeSessionId = null;
  if (pauseSessionButton) {
    pauseSessionButton.disabled = true;
  }
  hideResumeDrawer();
  orchestrationSection?.classList.add("hidden");
}

function hideResumeDrawer() {
  if (resumeDrawer) {
    resumeDrawer.classList.add("hidden");
  }
  if (resumeQuestionsEl) {
    resumeQuestionsEl.innerHTML = "";
  }
  if (resumeMessageEl) {
    resumeMessageEl.textContent = "Session paused. Provide answers to resume.";
    resumeMessageEl.classList.remove("error");
  }
  orchestrationQuestions = [];
}

function renderResumeQuestions(questions) {
  if (!resumeQuestionsEl) return;
  resumeQuestionsEl.innerHTML = "";
  orchestrationQuestions = Array.isArray(questions) ? questions : [];

  for (const question of orchestrationQuestions) {
    const wrapper = document.createElement("div");
    wrapper.className = "resume-question";

    const label = document.createElement("label");
    const inputId = `resume-${question.id}`;
    label.setAttribute("for", inputId);
    label.textContent = question.question;
    wrapper.appendChild(label);

    if (question.type) {
      const hint = document.createElement("div");
      hint.className = "resume-question__hint";
      hint.textContent = `Type: ${question.type}`;
      wrapper.appendChild(hint);
    }

    const input = document.createElement("textarea");
    input.id = inputId;
    input.name = inputId;
    input.required = true;
    input.rows = 3;
    wrapper.appendChild(input);

    resumeQuestionsEl.appendChild(wrapper);
  }
}

function showResumeDrawer(questions) {
  if (!resumeDrawer) return;
  renderResumeQuestions(questions);
  resumeDrawer.classList.remove("hidden");
}

function collectResumeAnswers() {
  if (!resumeFormEl) return [];
  const answers = [];
  for (const question of orchestrationQuestions) {
    const input = resumeFormEl.querySelector(`#resume-${question.id}`);
    if (!(input instanceof HTMLTextAreaElement)) {
      continue;
    }
    const value = input.value.trim();
    if (!value) {
      input.reportValidity();
      throw new Error("Please answer all questions to resume.");
    }
    answers.push({ questionId: question.id, value });
  }
  return answers;
}

async function handlePauseClick() {
  if (!activeSessionId || !pauseSessionButton) return;
  pauseSessionButton.disabled = true;
  try {
    const resp = await fetch(`/api/sessions/${activeSessionId}/pause`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Manual pause requested" })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw data;
    }
    const questions = data?.checkpoint?.payload?.pendingQuestions ?? [];
    showResumeDrawer(questions);
    
    // Immediately fetch updated progress snapshot to ensure UI reflects paused state
    // This eliminates the 900ms polling delay that causes UI to appear frozen
    try {
      const snapshotResp = await fetch(`/api/progress/snapshot/${activeSessionId}`);
      if (snapshotResp.ok) {
        const snapshot = await snapshotResp.json();
        updateOrchestrationState(snapshot);
      }
    } catch (snapshotErr) {
      console.warn("Failed to fetch snapshot after pause:", snapshotErr);
    }
  } catch (err) {
    resultEl.innerHTML = formatError(err);
    pauseSessionButton.disabled = false;
  }
}

async function handleResumeSubmit(event) {
  event.preventDefault();
  if (!activeSessionId || !resumeFormEl) return;
  try {
    const answers = collectResumeAnswers();
    const resp = await fetch(`/api/sessions/${activeSessionId}/resume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw data;
    }
    hideResumeDrawer();
    if (pauseSessionButton) {
      pauseSessionButton.disabled = false;
    }
  } catch (err) {
    if (resumeMessageEl) {
      resumeMessageEl.textContent = `Resume failed: ${err?.error || err?.message || err}`;
      resumeMessageEl.classList.add("error");
    }
  }
}

function updateOrchestrationState(snapshot) {
  if (!snapshot || !orchestrationSection) return;
  orchestrationSection.classList.remove("hidden");

  if (snapshot.paused) {
    pauseSessionButton && (pauseSessionButton.disabled = true);
    showResumeDrawer(snapshot.questions || []);
    return;
  }

  if (snapshot.questions && snapshot.questions.length > 0) {
    showResumeDrawer(snapshot.questions);
  } else {
    hideResumeDrawer();
  }

  if (pauseSessionButton) {
    pauseSessionButton.disabled = !activeSessionId || Boolean(snapshot.done);
  }
  if (snapshot.done) {
    activeSessionId = null;
    orchestrationSection?.classList.add("hidden");
  }
}

function createOrchestrationControls() {
  if (!mainContainer || orchestrationSection) return;
  orchestrationSection = document.createElement("section");
  orchestrationSection.className = "orchestration hidden";

  const header = document.createElement("div");
  header.className = "orchestration__header";
  const heading = document.createElement("h2");
  heading.textContent = "Execution Control";
  header.appendChild(heading);

  pauseSessionButton = document.createElement("button");
  pauseSessionButton.type = "button";
  pauseSessionButton.className = "btn btn-secondary";
  pauseSessionButton.textContent = "Pause";
  pauseSessionButton.disabled = true;
  pauseSessionButton.addEventListener("click", handlePauseClick);
  header.appendChild(pauseSessionButton);

  orchestrationSection.appendChild(header);

  resumeDrawer = document.createElement("div");
  resumeDrawer.className = "resume-drawer hidden";

  resumeMessageEl = document.createElement("p");
  resumeMessageEl.className = "resume-message";
  resumeMessageEl.textContent = "Session paused. Provide answers to resume.";
  resumeDrawer.appendChild(resumeMessageEl);

  resumeFormEl = document.createElement("form");
  resumeFormEl.id = "resumeForm";
  resumeFormEl.addEventListener("submit", handleResumeSubmit);

  resumeQuestionsEl = document.createElement("div");
  resumeQuestionsEl.className = "resume-questions";
  resumeFormEl.appendChild(resumeQuestionsEl);

  const resumeActions = document.createElement("div");
  resumeActions.className = "resume-actions";

  const resumeButton = document.createElement("button");
  resumeButton.type = "submit";
  resumeButton.className = "btn btn-primary";
  resumeButton.textContent = "Resume";
  resumeActions.appendChild(resumeButton);

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn btn-ghost";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", hideResumeDrawer);
  resumeActions.appendChild(cancelButton);

  resumeFormEl.appendChild(resumeActions);
  resumeDrawer.appendChild(resumeFormEl);
  orchestrationSection.appendChild(resumeDrawer);

  mainContainer.insertBefore(orchestrationSection, resultEl);
}

createOrchestrationControls();

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

function getGeneratedFiles(data) {
  return Array.from(
    new Set(
      (data?.planExecutionResult?.subtaskResults || [])
        .flatMap(result => (Array.isArray(result.generatedFiles) ? result.generatedFiles : []))
        .filter(Boolean)
    )
  );
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

// old success card removed in favor of modern outcome-card implementation

/**
 * Render Partial Success Card - Files generated but tests failed
 * Yellow/amber theme to indicate caution without panic
 */
function renderPartialCard(data) {
  if (!data || !data.files_written) {
    return false;
  }
  resultEl.innerHTML = "";
  const card = document.createElement("article");
  card.className = "outcome-card outcome-card--partial";
  const header = document.createElement("div");
  header.className = "outcome-card__header";
  const iconWrap = document.createElement("span");
  iconWrap.className = "outcome-card__icon";
  iconWrap.innerHTML = partialIcon;
  header.appendChild(iconWrap);
  const heading = document.createElement("div");
  heading.className = "outcome-card__heading";
  const title = document.createElement("h2");
  title.className = "outcome-card__title";
  title.textContent = "Project created – tests need attention";
  const failCount = data.testResults?.initial?.failCount ?? 0;
  const passCount = data.testResults?.initial?.passCount ?? 0;
  const subtitle = document.createElement("p");
  subtitle.className = "outcome-card__subtitle";
  subtitle.textContent = `${failCount} failing, ${passCount} passing`;
  heading.append(title, subtitle);
  header.appendChild(heading);
  card.appendChild(header);

  const message = document.createElement("p");
  message.className = "outcome-card__message";
  message.textContent = "Files are ready, but automated checks highlighted issues. Review the failing tests and apply fixes before re-running.";
  card.appendChild(message);

  const metrics = document.createElement("div");
  metrics.className = "outcome-card__metrics";
  [
    { label: "Files generated", value: data.files_written },
    { label: "Tests failed", value: failCount },
    { label: "Tests passed", value: passCount }
  ].forEach(m => {
    const metric = document.createElement("div");
    metric.className = "outcome-card__metric";
    const mv = document.createElement("span");
    mv.className = "outcome-card__metric-value";
    mv.textContent = String(m.value ?? 0);
    const ml = document.createElement("span");
    ml.className = "outcome-card__metric-label";
    ml.textContent = m.label;
    metric.append(mv, ml);
    metrics.appendChild(metric);
  });
  card.appendChild(metrics);

  const actions = document.createElement("div");
  actions.className = "outcome-card__actions button-group";
  if (data.browse_url) {
    const openLink = document.createElement("a");
    openLink.href = data.browse_url;
    openLink.target = "_blank";
    openLink.rel = "noopener";
    openLink.className = "btn btn-primary";
    openLink.textContent = "Open Project";
    actions.appendChild(openLink);
  }
  const viewResultsButton = document.createElement("button");
  viewResultsButton.type = "button";
  viewResultsButton.className = "btn btn-secondary";
  viewResultsButton.textContent = "View test results";
  viewResultsButton.addEventListener("click", () => {
    revealDebugDisclosure();
    debugDisclosure?.setAttribute("open", "");
    testControlsEl?.classList.remove("hidden");
    testControlsEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.appendChild(viewResultsButton);
  const openDebugButton = document.createElement("button");
  openDebugButton.type = "button";
  openDebugButton.className = "btn btn-ghost";
  openDebugButton.textContent = "Open debug panel";
  openDebugButton.addEventListener("click", () => {
    revealDebugDisclosure();
    debugDisclosure?.setAttribute("open", "");
    debugDisclosure?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.appendChild(openDebugButton);
  card.appendChild(actions);

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

function computeOutcome(data) {
  if (!data || data.error) return 'error';
  const files = Number(data.files_written || 0);
  if (!files) return 'error';
  const initial = data.testResults?.initial;
  const passCount = Number(initial?.passCount ?? 0);
  const failCount = Number(initial?.failCount ?? 0);
  const executed = passCount + failCount > 0;
  const status = String(initial?.status ?? '').toUpperCase();
  if (executed && (status === 'PASS' || status === 'PASSED')) return 'success';
  if (executed && status === 'FAIL') return 'partial';
  return 'error';
}

function renderSuccessCard(data) {
  if (!data || !data.ok || !data.files_written) return false;
  resultEl.innerHTML = "";
  const card = document.createElement("article");
  card.className = "outcome-card outcome-card--success";
  const header = document.createElement("div");
  header.className = "outcome-card__header";
  const iconWrap = document.createElement("span");
  iconWrap.className = "outcome-card__icon";
  iconWrap.innerHTML = successIcon;
  header.appendChild(iconWrap);
  const heading = document.createElement("div");
  heading.className = "outcome-card__heading";
  const title = document.createElement("h2");
  title.className = "outcome-card__title";
  title.textContent = "Project generated successfully";
  const testsStatus = data.testResults?.initial?.status?.toUpperCase() ?? "NOT RUN";
  const subtitle = document.createElement("p");
  subtitle.className = "outcome-card__subtitle";
  subtitle.textContent = `${data.files_written} files created · Initial tests ${testsStatus}`;
  heading.append(title, subtitle);
  header.appendChild(heading);
  card.appendChild(header);

  const metrics = document.createElement("div");
  metrics.className = "outcome-card__metrics";
  [
    { label: "Files generated", value: data.files_written },
    { label: "Tests passed", value: data.testResults?.initial?.passCount ?? 0 }
  ].forEach(m => {
    const metric = document.createElement("div");
    metric.className = "outcome-card__metric";
    const mv = document.createElement("span");
    mv.className = "outcome-card__metric-value";
    mv.textContent = String(m.value ?? 0);
    const ml = document.createElement("span");
    ml.className = "outcome-card__metric-label";
    ml.textContent = m.label;
    metric.append(mv, ml);
    metrics.appendChild(metric);
  });
  card.appendChild(metrics);

  const actions = document.createElement("div");
  actions.className = "outcome-card__actions button-group";
  if (data.browse_url) {
    const openLink = document.createElement("a");
    openLink.href = data.browse_url;
    openLink.target = "_blank";
    openLink.rel = "noopener";
    openLink.className = "btn btn-primary";
    openLink.textContent = "Open Project";
    actions.appendChild(openLink);
  }
  const viewFilesBtn = document.createElement("button");
  viewFilesBtn.type = "button";
  viewFilesBtn.className = "btn btn-secondary";
  viewFilesBtn.textContent = "View files";
  const files = getGeneratedFiles(data);
  viewFilesBtn.addEventListener("click", () => renderFilePreview(files));
  actions.appendChild(viewFilesBtn);

  const openDebugButton = document.createElement("button");
  openDebugButton.type = "button";
  openDebugButton.className = "btn btn-ghost";
  openDebugButton.textContent = "Open debug panel";
  openDebugButton.addEventListener("click", () => {
    revealDebugDisclosure();
    debugDisclosure?.setAttribute("open", "");
    debugDisclosure?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.appendChild(openDebugButton);

  card.appendChild(actions);
  resultEl.appendChild(card);
  return true;
}

function formatError(data) {
  try {
    const message = typeof data === 'string' ? data : (data?.error ?? 'Unknown error');
    const details = typeof data === 'string' ? '' : (data?.details ?? '');
    return `<div><strong>${escapeHtml(String(message))}</strong>${details ? `<pre>${escapeHtml(String(details))}</pre>` : ''}</div>`;
  } catch {
    return `<div><strong>${escapeHtml(String(data))}</strong></div>`;
  }
}

function renderErrorCard(data) {
  resultEl.innerHTML = "";
  const card = document.createElement("article");
  card.className = "outcome-card outcome-card--error";
  const header = document.createElement("div");
  header.className = "outcome-card__header";
  const iconWrap = document.createElement("span");
  iconWrap.className = "outcome-card__icon";
  iconWrap.innerHTML = errorIcon;
  header.appendChild(iconWrap);
  const heading = document.createElement("div");
  heading.className = "outcome-card__heading";
  const title = document.createElement("h2");
  title.className = "outcome-card__title";
  title.textContent = "We couldn't complete your request";
  const subtitle = document.createElement("p");
  subtitle.className = "outcome-card__subtitle";
  subtitle.textContent = "Something went wrong during generation or testing.";
  heading.append(title, subtitle);
  header.appendChild(heading);
  card.appendChild(header);
  const message = document.createElement("p");
  message.className = "outcome-card__message";
  message.innerHTML = formatError(data);
  card.appendChild(message);
  const actions = document.createElement("div");
  actions.className = "outcome-card__actions button-group";
  const retry = document.createElement("button");
  retry.className = "btn btn-primary";
  retry.textContent = "Try again";
  retry.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    promptEl.focus();
  });
  actions.appendChild(retry);
  const openDebugButton = document.createElement("button");
  openDebugButton.type = "button";
  openDebugButton.className = "btn btn-ghost";
  openDebugButton.textContent = "Open debug panel";
  openDebugButton.addEventListener("click", () => {
    revealDebugDisclosure();
    debugDisclosure?.setAttribute("open", "");
    debugDisclosure?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.appendChild(openDebugButton);
  card.appendChild(actions);
  resultEl.appendChild(card);
  return true;
}

function renderFilePreview(files) {
  if (!filePreviewPanel) return;
  filePreviewPanel.innerHTML = "";
  filePreviewPanel.classList.add("active");
  filePreviewPanel.removeAttribute("hidden");
  const tree = document.createElement("div");
  tree.className = "file-tree";
  const preview = document.createElement("div");
  preview.className = "file-preview";
  const meta = document.createElement("div");
  meta.className = "meta";
  const codePre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "language-js";
  codePre.appendChild(code);
  const copy = document.createElement("button");
  copy.className = "btn btn-secondary copy-btn";
  copy.textContent = "Copy";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent || "");
      copy.textContent = "Copied!";
      setTimeout(() => (copy.textContent = "Copy"), 1200);
    } catch {
      copy.textContent = "Copy failed";
      setTimeout(() => (copy.textContent = "Copy"), 1200);
    }
  });
  preview.append(meta, copy, codePre);

  files.forEach(filePath => {
    const item = document.createElement("div");
    item.className = "item";
    item.textContent = filePath;
    item.addEventListener("click", async () => {
      document.querySelectorAll('.file-tree .item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      meta.textContent = "Loading...";
      const project = currentProjectSlug || "";
      const encodedPath = encodeURIComponent(filePath);
      try {
        const resp = await fetch(`/api/files/${project}/${encodedPath}`);
        if (!resp.ok) {
          meta.textContent = `Error ${resp.status}`;
          return;
        }
        const data = await resp.json();
        meta.textContent = `${filePath} • ${data.size} bytes • ${new Date(data.modified).toLocaleString()}${data.binary ? ' • binary' : ''}`;
        if (data.binary) {
          code.textContent = "Binary file preview not supported.";
        } else {
          const ext = filePath.split('.').pop() || 'txt';
          code.className = `language-${ext}`;
          code.textContent = data.content;
          if (window.Prism && Prism.highlightAllUnder) {
            Prism.highlightAllUnder(preview);
          }
        }
      } catch (e) {
        meta.textContent = `Failed to load file: ${e}`;
      }
    });
    tree.appendChild(item);
  });

  filePreviewPanel.append(tree, preview);
}

function renderProgressStages() {
  const container = document.createElement('div');
  container.className = 'progress-stages';
  const stages = ['analyzing','planning','generating','testing','finalizing'];
  stages.forEach(stage => {
    const row = document.createElement('div');
    row.className = `stage stage-${stage}`;
    const dot = document.createElement('div');
    dot.className = 'dot';
    const label = document.createElement('div');
    label.textContent = stage.charAt(0).toUpperCase()+stage.slice(1);
    row.append(dot,label);
    container.appendChild(row);
  });
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  const fill = document.createElement('span');
  bar.appendChild(fill);
  container.appendChild(bar);
  resultEl.innerHTML = '';
  resultEl.appendChild(container);
  return { container, fill };
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

// legacy formatError removed (modern formatError used above)

/**
 * Render Error Card - Generation failed completely
 * Used when no files produced or system error occurred
 */
// old error card removed in favor of modern outcome-card implementation

// removed legacy updateLoadingPhase (replaced by renderProgressStages)

async function executeRequest({ prompt, projectName, clarifications }) {
  resetClarificationUI();
  testControlsEl.classList.add("hidden");
  currentProjectSlug = null;
  renderRepairHistory(null);
  resetTaskPlanUI();
  resetOrchestrationControls();

  // Start progress UI and polling
  const { fill } = renderProgressStages();
  const sessionId = (() => {
    const arr = new Uint8Array(8);
    (window.crypto || self.crypto).getRandomValues(arr);
    return Array.from(arr).map(n => n.toString(16).padStart(2,'0')).join('');
  })();
  activeSessionId = sessionId;
  orchestrationSection?.classList.remove("hidden");
  if (pauseSessionButton) {
    pauseSessionButton.disabled = false;
  }
  let stopPolling = false;
  (async () => {
    while (!stopPolling) {
      try {
        const r = await fetch(`/api/progress/snapshot/${sessionId}`);
        if (r.ok) {
          const p = await r.json();
          const percent = Math.max(0, Math.min(100, Number(p.progress || 0)));
          fill.style.width = `${percent}%`;
          const current = p.stage || 'analyzing';
          document.querySelectorAll('.progress-stages .stage').forEach(node => node.classList.remove('current','completed'));
          const order = ['analyzing','planning','generating','testing','finalizing'];
          const idx = order.indexOf(current);
          order.forEach((name,i) => {
            const el = document.querySelector(`.stage-${name}`);
            if (!el) return;
            if (i < idx) el.classList.add('completed');
            if (i === idx) el.classList.add('current');
          });
          updateOrchestrationState(p);
          if (p.done) break;
        }
      } catch {
        /* ignore */ void 0;
      }
      await new Promise(r => setTimeout(r, 900));
    }
  })();

  // Try EventSource (SSE) for real-time progress; fallback polling remains
  try {
    const es = new EventSource(`/api/progress/${sessionId}`);
    es.onmessage = ev => {
      try {
        const p = JSON.parse(ev.data);
        const percent = Math.max(0, Math.min(100, Number(p.progress || 0)));
        fill.style.width = `${percent}%`;
        const current = p.stage || 'analyzing';
        document.querySelectorAll('.progress-stages .stage').forEach(node => node.classList.remove('current','completed'));
        const order = ['analyzing','planning','generating','testing','finalizing'];
        const idx = order.indexOf(current);
        order.forEach((name,i) => {
          const el = document.querySelector(`.stage-${name}`);
          if (!el) return;
          if (i < idx) el.classList.add('completed');
          if (i === idx) el.classList.add('current');
        });
        updateOrchestrationState(p);
        if (p.done) {
          stopPolling = true;
          es.close();
        }
      } catch {
        /* ignore */ void 0;
      }
    };
    es.onerror = () => {
      es.close();
    };
  } catch {
    // silently fall back to polling only
  }

  const payload = { prompt, sessionId };
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

    // Always render task plan and test lifecycle (in debug disclosure)
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
    renderErrorCard({ error: err });
  } finally {
    stopPolling = true;
    if (pauseSessionButton) {
      pauseSessionButton.disabled = true;
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
  resetOrchestrationControls();

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
