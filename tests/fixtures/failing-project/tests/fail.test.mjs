import test from 'node:test';
import assert from 'node:assert/strict';

test('fails intentionally', () => {
  assert.equal(1 + 1, 3);
});
