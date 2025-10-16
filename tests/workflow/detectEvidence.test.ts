import { describe, expect, it } from 'vitest';
import { detectEvidence, normalizeActionEntry } from '../../scripts/detect-evidence.js';

type RawEntry = Record<string, unknown>;

function makeEntry(raw: RawEntry, source = 'actions.jsonl') {
  return normalizeActionEntry({ timestamp: '2025-10-15T00:00:00.000Z', ...raw }, source);
}

describe('detectEvidence', () => {
  it('detects lint success', () => {
    const entries = [makeEntry({ cmd: 'npm run lint', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G0', criterion: 'Lint passing' });
  });

  it('detects typecheck success', () => {
    const entries = [makeEntry({ cmd: 'npm run typecheck', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G0', criterion: 'TypeScript typecheck passing' });
  });

  it('detects general npm test success', () => {
    const entries = [makeEntry({ cmd: 'npm test', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G0', criterion: 'Test suite passing' });
  });

  it('detects langgraph parity test and does not double count general tests', () => {
    const entries = [makeEntry({ cmd: 'AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G3', criterion: 'LangGraph parity tests passing' });
  });

  it('detects contract validation', () => {
    const entries = [makeEntry({ cmd: 'npm run contract:check', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G1', criterion: 'Contracts validated' });
  });

  it('requires success exit codes', () => {
    const entries = [makeEntry({ cmd: 'npm run lint', exit_code: 1 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(0);
  });

  it('detects trust spine artifacts when sbom and provenance succeed separately', () => {
    const entries = [
      makeEntry({ cmd: 'npm run sbom', exit_code: 0, timestamp: '2025-10-15T00:00:01.000Z' }),
      makeEntry({ cmd: 'npm run provenance', exit_code: 0, timestamp: '2025-10-15T00:00:02.000Z' })
    ];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G2', criterion: 'Trust Spine artifacts generated (SBOM + provenance)' });
  });

  it('handles combined sbom and provenance command', () => {
    const entries = [makeEntry({ cmd: 'npm run sbom && npm run provenance', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G2', criterion: 'Trust Spine artifacts generated (SBOM + provenance)' });
  });

  it('prefers latest matching evidence for duplicate commands', () => {
    const older = makeEntry({ cmd: 'npm run lint', exit_code: 0, timestamp: '2025-10-14T23:59:00.000Z' });
    const newer = makeEntry({ cmd: 'npm run lint', exit_code: 0, timestamp: '2025-10-15T01:00:00.000Z' });
    const evidence = detectEvidence([older, newer]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].timestamp).toBe('2025-10-15T01:00:00.000Z');
  });

  it('treats pass status as success when exit code missing', () => {
    const entries = [makeEntry({ cmd: 'npm test', status: 'pass' })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ gate: 'G0', criterion: 'Test suite passing' });
  });
});
