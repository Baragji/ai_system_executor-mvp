import { APIRequestContext, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

export function makeSessionId(): string {
  return randomBytes(8).toString('hex');
}

export async function getSnapshot(api: APIRequestContext, sessionId: string) {
  const r = await api.get(`/api/progress/snapshot/${sessionId}`);
  if (!r.ok()) return null;
  return await r.json();
}

export async function waitForPaused(api: APIRequestContext, sessionId: string, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await getSnapshot(api, sessionId).catch(() => null);
    if (snap && snap.paused) return snap;
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('Timed out waiting for paused snapshot');
}

export async function postExecute(api: APIRequestContext, payload: Record<string, unknown>) {
  const response = await api.post('/api/execute', { data: payload });
  const status = response.status();

  if (status !== 202) {
    const body = await response.json().catch(() => ({} as unknown));
    return { status, body };
  }

  const location = response.headers()['location'];
  if (!location) {
    throw new Error('Missing Location header for async execution');
  }

  const deadline = Date.now() + 5000;
  let lastRecord: unknown = null;

  while (Date.now() <= deadline) {
    const poll = await api.get(location);
    if (!poll.ok()) {
      throw new Error(`Polling ${location} failed with status ${poll.status()}`);
    }

    const record = await poll.json().catch(() => null);
    lastRecord = record;
    if (record && record.status === 'completed') {
      return { status: 200, body: record.result };
    }
    if (record && record.status === 'failed') {
      throw new Error(`Execution failed: ${record.error ?? 'unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Execution did not complete in time: ${JSON.stringify(lastRecord)}`);
}

export async function postPause(api: APIRequestContext, sessionId: string) {
  const r = await api.post(`/api/sessions/${sessionId}/pause`, { data: { reason: 'Test pause' } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status(), body };
}

export async function postResume(api: APIRequestContext, sessionId: string, answers: Array<{ questionId: string; value: unknown }> = []) {
  const r = await api.post(`/api/sessions/${sessionId}/resume`, { data: { answers } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status(), body };
}

/**
 * UI helper to reliably resolve clarification prompts.
 * - Waits up to timeoutMs for the clarification section to appear
 * - Selects the first radio per group, fills empty text inputs/areas
 * - Prefers answering; falls back to Skip if no actionable inputs
 *
 * Returns: 'answered' | 'skipped' | 'none'
 */
export async function handleClarifications(
  page: Page,
  opts: { timeoutMs?: number; preferSkip?: boolean } = {}
): Promise<'answered' | 'skipped' | 'none'> {
  const { timeoutMs = 5000, preferSkip = false } = opts;
  const section = page.locator('#clarificationSection:not(.hidden)');

  // Poll for visibility with small sleeps to avoid flakiness
  const start = Date.now();
  let visible = false;
  while (Date.now() - start < timeoutMs) {
    if (await section.isVisible().catch(() => false)) { visible = true; break; }
    await page.waitForTimeout(150);
  }
  if (!visible) return 'none';

  const radios = await page.locator('input[type="radio"]').all();
  const chosen = new Set<string>();
  for (const radio of radios) {
    const disabled = await radio.isDisabled().catch(() => false);
    const name = await radio.getAttribute('name');
    if (disabled || !name || chosen.has(name)) continue;
    await radio.check().catch(() => undefined);
    chosen.add(name);
  }

  const textInputs = await page.locator('input[type="text"]').all();
  for (const input of textInputs) {
    const val = await input.inputValue().catch(() => '');
    if (!val) {
      await input.fill('test-value').catch(() => undefined);
    }
  }

  const textareas = await page.locator('textarea').all();
  for (const ta of textareas) {
    const val = await ta.inputValue().catch(() => '');
    if (!val) {
      await ta.fill('test-value').catch(() => undefined);
    }
  }

  // Decide whether to answer or skip based on available inputs or preference
  const hasAnswers = chosen.size > 0 || textInputs.length > 0 || textareas.length > 0;
  if (!preferSkip && hasAnswers) {
    const answerBtn = page.locator('#answerClarifications');
    if (await answerBtn.isVisible().catch(() => false)) {
      await answerBtn.click();
      await page.waitForTimeout(500);
      return 'answered';
    }
  }

  const skipBtn = page.locator('#skipClarifications');
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(300);
    return 'skipped';
  }

  return 'none';
}
