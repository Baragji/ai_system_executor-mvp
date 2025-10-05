const runBtn = document.getElementById('runBtn');
const promptEl = document.getElementById('prompt');
const projEl = document.getElementById('projectName');
const resultEl = document.getElementById('result');

runBtn.addEventListener('click', async () => {
  const prompt = promptEl.value.trim();
  const projectName = projEl.value.trim();
  resultEl.textContent = 'Running...';
  try {
    const resp = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, projectName })
    });
    const data = await resp.json();
    resultEl.textContent = JSON.stringify(data, null, 2);
    if (data?.browse_url) {
      const a = document.createElement('a');
      a.href = data.browse_url;
      a.textContent = 'Open generated project';
      a.style.display = 'inline-block';
      a.style.marginTop = '12px';
      a.style.color = '#a5b4fc';
      resultEl.appendChild(document.createElement('br'));
      resultEl.appendChild(a);
    }
  } catch (e) {
    resultEl.textContent = String(e);
  }
});
