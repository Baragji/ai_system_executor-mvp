import { test, expect, request } from '@playwright/test';
import { randomBytes } from 'node:crypto';

/**
 * Deterministic API checks for pause/resume flows without UI.
 */

test.describe('API pause/resume deterministic', () => {
  test('pause => 201, snapshot paused; resume => 200, snapshot unpaused', async () => {
    const api = await request.newContext({ baseURL: process.env.UI_ORIGIN ?? 'http://localhost:3000' });
    const sessionId = randomBytes(8).toString('hex');

    // Seed a progress snapshot by hitting /api/execute with a simple prompt
    const exec = await api.post('/api/execute', { data: { prompt: 'Generate a tiny JS file', sessionId } });
    // It may not respond immediately if we pause; we won't await outcome here yet.

    // Poll snapshot until available
    const start = Date.now();
    for (;;) {
      const r = await api.get(`/api/progress/snapshot/${sessionId}`);
      if (r.ok()) break;
      if (Date.now() - start > 5000) throw new Error('Timed out waiting for snapshot');
      await new Promise(r => setTimeout(r, 100));
    }

    // Pause
    const pauseResp = await api.post(`/api/sessions/${sessionId}/pause`, { data: { reason: 'API test pause' } });
    expect([201, 409]).toContain(pauseResp.status());

    const snap1 = await (await api.get(`/api/progress/snapshot/${sessionId}`)).json();
    expect(snap1.paused).toBeTruthy();

    // Resume by answering default question if present (else empty array should 400)
    const checkpoint = await pauseResp.json().catch(() => ({ checkpoint: { payload: {} } }));
    const qs = checkpoint?.checkpoint?.payload?.pendingQuestions ?? [];
    if (Array.isArray(qs) && qs.length > 0) {
      const answers = qs.map((q: { id: string }) => ({ questionId: q.id, value: 'Proceed' }));
      const resumeResp = await api.post(`/api/sessions/${sessionId}/resume`, { data: { answers } });
      expect(resumeResp.status()).toBe(200);
    } else {
      const resumeResp = await api.post(`/api/sessions/${sessionId}/resume`, { data: { answers: [] } });
      expect(resumeResp.status()).toBe(400);
      // Provide default single answer to move forward
      const resume2 = await api.post(`/api/sessions/${sessionId}/resume`, { data: { answers: [{ questionId: 'q1', value: 'OK' }] } });
      expect([200, 400]).toContain(resume2.status());
    }

    // Snapshot should eventually show paused=false
    const start2 = Date.now();
    let unpaused = false;
    for (;;) {
      const r = await api.get(`/api/progress/snapshot/${sessionId}`);
      if (r.ok()) {
        const s = await r.json();
        if (!s.paused) { unpaused = true; break; }
      }
      if (Date.now() - start2 > 7000) break;
      await new Promise(r => setTimeout(r, 150));
    }
    expect(unpaused).toBeTruthy();

    // Await the original execute response if still pending
    try { await exec; } catch { /* may be 202 paused */ }
  });
});
