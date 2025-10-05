const runBtn = document.getElementById("runBtn");
const promptEl = document.getElementById("prompt");
const projEl = document.getElementById("projectName");
const resultEl = document.getElementById("result");
const testControlsEl = document.getElementById("testControls");
const runTestsBtn = document.getElementById("runTestsBtn");
const testStatusEl = document.getElementById("testStatus");
const repairTimelineEl = document.getElementById("repairTimeline");

let currentProjectSlug = null;

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

runBtn.addEventListener("click", async () => {
  const prompt = promptEl.value.trim();
  const projectName = projEl.value.trim();
  resultEl.textContent = "Running...";
  testControlsEl.classList.add("hidden");
  currentProjectSlug = null;

  try {
    const resp = await fetch("/api/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, projectName })
    });
    const data = await resp.json();
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
  } catch (e) {
    resultEl.textContent = String(e);
  }
});

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
