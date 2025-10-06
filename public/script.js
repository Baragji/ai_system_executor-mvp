const runBtn = document.getElementById("runBtn");
const promptEl = document.getElementById("prompt");
const projEl = document.getElementById("projectName");
const resultEl = document.getElementById("result");
const testControlsEl = document.getElementById("testControls");
const runTestsBtn = document.getElementById("runTestsBtn");
const testStatusEl = document.getElementById("testStatus");
const repairTimelineEl = document.getElementById("repairTimeline");
const repairHistorySection = document.getElementById("repairHistorySection");
const repairHistoryTimeline = document.getElementById("repairHistoryTimeline");
const clarificationSection = document.getElementById("clarificationSection");
const clarificationForm = document.getElementById("clarificationForm");
const clarificationQuestionsEl = document.getElementById("clarificationQuestions");
const skipClarificationsBtn = document.getElementById("skipClarifications");

let currentProjectSlug = null;
let pendingQuestions = [];
let storedPrompt = "";
let storedProjectName = "";

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

function resetRepairHistory() {
  if (repairHistoryTimeline) {
    repairHistoryTimeline.innerHTML = "";
  }
  if (repairHistorySection) {
    repairHistorySection.classList.add("hidden");
  }
}

function statusEmoji(status) {
  switch (status) {
    case "pass":
      return "✅";
    case "fail":
      return "⚠️";
    default:
      return "❌";
  }
}

function renderRepairHistory(history, metrics) {
  if (!repairHistorySection || !repairHistoryTimeline) return;
  if (!history || !Array.isArray(history.attempts) || history.attempts.length === 0) {
    resetRepairHistory();
    return;
  }

  repairHistoryTimeline.innerHTML = "";
  const total = history.totalAttempts ?? history.attempts.length;

  history.attempts.forEach(attempt => {
    const item = document.createElement("div");
    item.className = "repair-history-item";
    if (history.successAttemptNumber && attempt.number === history.successAttemptNumber) {
      item.classList.add("repair-history-success");
    }
    if (history.finalStatus === "exhausted" && attempt.number === history.attempts.length) {
      item.classList.add("repair-history-exhausted");
    }

    const header = document.createElement("div");
    header.className = "repair-history-header";

    const badge = document.createElement("span");
    badge.className = "repair-history-badge";
    badge.textContent = `${attempt.number}/${total}`;
    header.appendChild(badge);

    const status = attempt.testResult?.status ?? "fail";
    const statusLabel = document.createElement("span");
    statusLabel.className = `repair-history-status status-${status}`;
    statusLabel.textContent = `${statusEmoji(status)} ${status.toUpperCase()}`;
    header.appendChild(statusLabel);

    item.appendChild(header);

    if (attempt.summary) {
      const summary = document.createElement("p");
      summary.className = "repair-history-summary";
      summary.textContent = attempt.summary;
      item.appendChild(summary);
    }

    if (Array.isArray(attempt.changedFiles) && attempt.changedFiles.length > 0) {
      const fileList = document.createElement("ul");
      fileList.className = "repair-history-files";
      attempt.changedFiles.forEach(file => {
        const li = document.createElement("li");
        li.textContent = file;
        fileList.appendChild(li);
      });
      item.appendChild(fileList);
    }

    if (attempt.testResult) {
      const testInfo = document.createElement("p");
      const passCount = attempt.testResult.passCount ?? 0;
      const failCount = attempt.testResult.failCount ?? 0;
      testInfo.textContent = `Tests: ${passCount} pass · ${failCount} fail`;
      item.appendChild(testInfo);
    }

    const duration = document.createElement("p");
    duration.className = "repair-history-duration";
    const attemptDuration = attempt.durationMs ?? attempt.testResult?.durationMs;
    const cumulative = attempt.cumulativeTime ?? attemptDuration ?? 0;
    if (attemptDuration != null) {
      duration.textContent = `Duration: ${attemptDuration}ms • Cumulative: ${cumulative}ms`;
    } else {
      duration.textContent = `Cumulative: ${cumulative}ms`;
    }
    item.appendChild(duration);

    repairHistoryTimeline.appendChild(item);
  });

  if (history.finalStatus === "exhausted") {
    const note = document.createElement("p");
    note.className = "repair-history-summary";
    note.textContent = "All attempts exhausted without passing tests.";
    repairHistoryTimeline.appendChild(note);
  }

  if (metrics && typeof metrics === "object" && metrics !== null) {
    const metricLine = document.createElement("p");
    metricLine.className = "repair-history-duration";
    const efficiency = typeof metrics.attemptEfficiency === "number"
      ? `Efficiency: ${(metrics.attemptEfficiency * 100).toFixed(0)}%`
      : null;
    const average = Array.isArray(metrics.timePerAttempt) && metrics.timePerAttempt.length > 0
      ? `Average duration: ${Math.round(metrics.timePerAttempt.reduce((acc, value) => acc + value, 0) / metrics.timePerAttempt.length)}ms`
      : null;
    const parts = [efficiency, average].filter(part => part && part.length > 0);
    if (parts.length > 0) {
      metricLine.textContent = parts.join(" • ");
      repairHistoryTimeline.appendChild(metricLine);
    }
  }

  repairHistorySection.classList.remove("hidden");
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
  testStatusEl.append("Latest result: ", renderStatus(latest));
  const stats = document.createElement("div");
  stats.textContent = `Pass: ${latest.passCount} | Fail: ${latest.failCount}`;
  testStatusEl.appendChild(document.createElement("br"));
  testStatusEl.appendChild(stats);
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
  resetRepairHistory();
  resultEl.textContent = "Generating project...";
  testControlsEl.classList.add("hidden");
  currentProjectSlug = null;

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
      resetRepairHistory();
      return;
    }

    resultEl.textContent = JSON.stringify(data, null, 2);
    if (data?.browse_url) {
      resultEl.appendChild(document.createElement("br"));
      resultEl.appendChild(renderLink(data.browse_url));
      currentProjectSlug = data.project;
      testControlsEl.classList.remove("hidden");
      renderTestLifecycle(data.testResults, data.repair);
      renderRepairHistory(data.repairHistory, data.repairMetrics);
    } else {
      currentProjectSlug = null;
      resetRepairHistory();
    }
  } catch (err) {
    resultEl.textContent = String(err);
    resetRepairHistory();
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
