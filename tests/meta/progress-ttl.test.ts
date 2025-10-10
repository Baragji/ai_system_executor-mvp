import { describe, it, expect } from 'vitest';
import { __progressTest } from '../../src/server.js';

describe('progressSessions TTL purge', () => {
  it('purges completed sessions older than TTL and keeps fresh/active ones', () => {
    const now = Date.now();
    const ttl = __progressTest.ttl();
    const old = now - ttl - 10;
    const fresh = now - Math.floor(ttl / 2);

    __progressTest.set('old-done', { stage: 'x', progress: 100, updatedAt: old, done: true });
    __progressTest.set('fresh-done', { stage: 'x', progress: 100, updatedAt: fresh, done: true });
    __progressTest.set('active', { stage: 'running', progress: 50, updatedAt: old, done: false });

    __progressTest.purge(now);

    expect(__progressTest.get('old-done')).toBeNull();
    expect(__progressTest.get('fresh-done')).not.toBeNull();
    expect(__progressTest.get('active')).not.toBeNull();
  });
});

