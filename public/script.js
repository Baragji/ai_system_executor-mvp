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

if (repairHistoryToggle) {
  repairHistoryToggle.addEventListener("click", () => {
    repairHistoryExpanded = !repairHistoryExpanded;
    setRepairHistoryVisibility(repairHistoryExpanded);
  });
}

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

async function executeRequest({ prompt, projectName, clarifications }) {
  resetClarificationUI();
  resultEl.textContent = "Planning and executing your project... This may take several minutes for complex requests.";
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
    const resp = await fetch("/api/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      resultEl.textContent = `Error: ${data?.error || resp.statusText}`;
      return;
    }

    resultEl.textContent = JSON.stringify(data, null, 2);
    renderTaskPlan(data.taskPlan, data.planExecutionResult, data.timeEstimate);
    if (data?.browse_url) {
      resultEl.appendChild(document.createElement("br"));
      resultEl.appendChild(renderLink(data.browse_url));
      currentProjectSlug = data.project;
      testControlsEl.classList.remove("hidden");
      renderTestLifecycle(data.testResults, data.repair);
      renderRepairHistory(data.repairHistory);
    } else {
      currentProjectSlug = null;
    }
  } catch (err) {
    resultEl.textContent = String(err);
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
    const resp = await fetch("/api/clarify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: rawPrompt })
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
    resultEl.textContent = String(err);
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
    const resp = await fetch("/api/run-tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: currentProjectSlug })
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
