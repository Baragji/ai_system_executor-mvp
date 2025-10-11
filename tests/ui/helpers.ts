import { APIRequestContext } from '@playwright/test';
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
  const r = await api.post('/api/execute', { data: payload });
  const body = await r.json().catch(() => ({} as unknown));
  return { status: r.status(), body };
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
