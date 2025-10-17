(function () {
  function $(id) { return document.getElementById(id); }
  function setOut(data) { $('output').textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }

  async function loadFixtures() {
    const project = $('project').value.trim();
    if (!project) return setOut('Enter project');
    const res = await fetch(`/api/fixtures/${encodeURIComponent(project)}`);
    const data = await res.json();
    if (!res.ok) return setOut(data);
    renderSessions(project, data.sessions || {});
  }

  function renderSessions(project, sessions) {
    const root = $('sessions');
    root.innerHTML = '';
    const entries = Object.entries(sessions);
    if (entries.length === 0) {
      root.textContent = 'No fixtures found.';
      return;
    }
    for (const [sessionId, files] of entries) {
      const wrap = document.createElement('div');
      wrap.style.marginBottom = '12px';
      const title = document.createElement('div');
      title.textContent = `Session: ${sessionId} (${files.length} files)`;
      const actions = document.createElement('div');
      actions.className = 'row';
      const btnRetest = document.createElement('button');
      btnRetest.textContent = 'Retest Project';
      btnRetest.onclick = async () => {
        const res = await fetch('/api/plan/' + encodeURIComponent(project) + '/retest-subtask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        setOut(await res.json());
      };
      const btnRepair = document.createElement('button');
      btnRepair.textContent = 'Replay Repair';
      btnRepair.onclick = async () => {
        const res = await fetch('/api/replay/repair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, sessionId }) });
        setOut(await res.json());
      };
      actions.appendChild(btnRetest);
      actions.appendChild(btnRepair);
      wrap.appendChild(title);
      wrap.appendChild(actions);
      root.appendChild(wrap);
    }
  }

  async function replaySubtask() {
    const project = $('project').value.trim();
    const sessionId = $('sessionId').value.trim();
    const subtaskId = $('subtaskId').value.trim();
    if (!project || !sessionId || !subtaskId) return setOut('Enter project, sessionId, subtaskId');
    const res = await fetch('/api/replay/subtask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, sessionId, subtaskId }) });
    setOut(await res.json());
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('load').addEventListener('click', loadFixtures);
    $('replaySubtask').addEventListener('click', replaySubtask);
  });
})();
