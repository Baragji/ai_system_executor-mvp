import { describe, expect, it } from 'vitest';
import { detectEvidence, normalizeActionEntry } from '../../scripts/detect-evidence.js';

type RawEntry = Record<string, unknown>;

function makeEntry(raw: RawEntry, source = 'actions.jsonl') {
  return normalizeActionEntry({ timestamp: '2025-10-15T00:00:00.000Z', ...raw }, source);
}

describe('detectEvidence', () => {
  it('detects G2 SBOM generation', () => {
    const entries = [makeEntry({ cmd: 'npm run sbom:cyclonedx', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      gate: 'G2',
      criterion: 'CycloneDX 1.6 SBOM generated via `npm run sbom:cyclonedx`'
    });
  });

  it('detects G2 Provenance generation', () => {
    const entries = [makeEntry({ cmd: 'npm run provenance', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      gate: 'G2',
      criterion: 'SLSA v1.0 provenance emitted via `npm run provenance`'
    });
  });

  it('detects langgraph parity test (combined command)', () => {
    const entries = [makeEntry({ cmd: 'AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      gate: 'G3',
      criterion: 'POST `/api/execute` LangGraph integration (awaits G2 Trust Spine completion)'
    });
  });

  it('requires success exit codes', () => {
    const entries = [makeEntry({ cmd: 'npm run sbom:cyclonedx', exit_code: 1 })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(0);
  });

  it('detects trust spine artifacts as separate criteria', () => {
    const entries = [
      makeEntry({ cmd: 'npm run sbom', exit_code: 0, timestamp: '2025-10-15T00:00:01.000Z' }),
      makeEntry({ cmd: 'npm run provenance', exit_code: 0, timestamp: '2025-10-15T00:00:02.000Z' })
    ];
    const evidence = detectEvidence(entries);
    // Now returns 2 separate criteria (SBOM + Provenance), not aggregated
    expect(evidence).toHaveLength(2);
    expect(evidence.some(e => e.criterion.includes('SBOM'))).toBe(true);
    expect(evidence.some(e => e.criterion.includes('provenance'))).toBe(true);
  });

  it('handles combined sbom and provenance command as separate evidence', () => {
    const entries = [makeEntry({ cmd: 'npm run sbom && npm run provenance', exit_code: 0 })];
    const evidence = detectEvidence(entries);
    // Command contains both, so both rules match -> 2 evidence entries
    expect(evidence).toHaveLength(2);
    expect(evidence.some(e => e.gate === 'G2' && e.criterion.includes('SBOM'))).toBe(true);
    expect(evidence.some(e => e.gate === 'G2' && e.criterion.includes('provenance'))).toBe(true);
  });

  it('prefers latest matching evidence for duplicate commands', () => {
    const older = makeEntry({ cmd: 'npm run sbom:cyclonedx', exit_code: 0, timestamp: '2025-10-14T23:59:00.000Z' });
    const newer = makeEntry({ cmd: 'npm run sbom:cyclonedx', exit_code: 0, timestamp: '2025-10-15T01:00:00.000Z' });
    const evidence = detectEvidence([older, newer]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].timestamp).toBe('2025-10-15T01:00:00.000Z');
  });

  it('treats pass status as success when exit code missing', () => {
    const entries = [makeEntry({ cmd: 'npm run provenance', status: 'pass' })];
    const evidence = detectEvidence(entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      gate: 'G2',
      criterion: 'SLSA v1.0 provenance emitted via `npm run provenance`'
    });
  });

  it('aggregates G3 evidence from separate /api/execute and test entries', () => {
    const apiExecute = makeEntry({
      cmd: 'curl -X POST http://localhost:3000/api/execute -H "content-type: application/json" -d \'{"input":"test"}\'',
      exit_code: 0,
      timestamp: '2025-10-15T10:00:00.000Z'
    });
    const parityTest = makeEntry({
      cmd: 'npm test tests/api/executions.test.ts',
      exit_code: 0,
      timestamp: '2025-10-15T10:05:00.000Z'
    });

    const evidence = detectEvidence([apiExecute, parityTest]);
    const g3Evidence = evidence.filter(e => e.gate === 'G3');

    expect(g3Evidence.length).toBeGreaterThan(0);
    expect(g3Evidence[0].criterion).toBe('POST `/api/execute` LangGraph integration (awaits G2 Trust Spine completion)');
    // Command should preserve real curl, not placeholder
    expect(g3Evidence[0].command).toContain('curl');
    expect(g3Evidence[0].command).toContain('/api/execute');
  });
});
