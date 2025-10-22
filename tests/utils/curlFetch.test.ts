import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: unknown, out: string, errout: string) => void;
    // Simulate a redirect followed by final response
    const out = [
      'HTTP/1.1 302 Found',
      'Location: /next',
      '',
      'HTTP/1.1 200 OK',
      'Content-Type: application/json',
      'X-Test: yes',
      '',
      '{"ok":true}',
    ].join('\r\n');
    cb(null, out, '');
  }
}));

import { curlFetch } from '../../src/utils/curlFetch.ts';

describe('curlFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses status, headers, and body', async () => {
    const res = await curlFetch('https://example.com/api', { method: 'POST', body: { a: 1 } });
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.headers.get('content-type')).toBe('application/json');
    const text = await res.text();
    expect(text).toBe('{"ok":true}');
  });
});
