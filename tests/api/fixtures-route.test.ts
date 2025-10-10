import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/server.js';

describe('fixtures endpoints', () => {
  it('lists fixtures for project (empty ok)', async () => {
    const res = await request(app).get('/api/fixtures/passing');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessions');
  });

  it('replay repair returns 404 when context missing', async () => {
    const res = await request(app).post('/api/replay/repair').send({ project: 'passing', sessionId: 'nope' });
    expect(res.status).toBe(404);
  });

  // Intentionally skip deep repair replay to avoid LLM/network; covered by unit paths
});
