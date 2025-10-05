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
      return;
    }

    resultEl.textContent = JSON.stringify(data, null, 2);
    if (data?.browse_url) {
      resultEl.appendChild(document.createElement("br"));
      resultEl.appendChild(renderLink(data.browse_url));
      currentProjectSlug = data.project;
      testControlsEl.classList.remove("hidden");
      renderTestLifecycle(data.testResults, data.repair);
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
