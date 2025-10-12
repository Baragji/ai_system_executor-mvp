#!/usr/bin/env node
/**
 * Executor AI Metrics Calculator
 *
 * This script computes Key Performance Indicators (KPIs) from the session tracker
 * and OpenTelemetry logs. It provides a data-driven view of the AI's performance,
 * helping to measure its autonomy, speed, and reliability.
 *
 * Outputs:
 * - artifacts/metrics.json: A machine-readable summary of current KPIs.
 * - artifacts/metrics-YYYY-W##.md: A human-readable weekly snapshot.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';

// --- Configuration ---
const ROOT_DIR = path.resolve(path.dirname(''), '..');
const TRACKER_FILE = path.join(ROOT_DIR, 'tracker', 'session_tracker.yaml');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts');
// ---

const loadYaml = async (filePath) => yaml.parse(await fs.readFile(filePath, 'utf8'));

async function loadSpans() {
  const spansFile = path.join(LOGS_DIR, 'otel-spans.ndjson');
  try {
    const content = await fs.readFile(spansFile, 'utf8');
    return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const median = (arr) => {
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  const nums = [...arr].sort((a, b) => a - b);
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};

const getWeekStamp = (d = new Date()) => {
  const year = d.getUTCFullYear();
  const firstJan = new Date(Date.UTC(year, 0, 1));
  const dayNum = Math.floor((d - firstJan) / 86400000);
  const weekNum = Math.ceil((dayNum + firstJan.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
};

async function computeKPIs(tracker, spans) {
  const sessions = tracker.sessions || [];
  const total = sessions.length;
  if (total === 0) return { autonomy_rate: 0, lead_time_ms_median: 0, change_failure_rate: 0 };

  const successfulSessions = sessions.filter(s => s.status === 'SUCCESS');
  const failedSessions = sessions.filter(s => s.status === 'BLOCKED' || s.status === 'PARTIAL');

  // Autonomy Rate: % of successful sessions. (Future enhancement: check for human intervention flags)
  const autonomy_rate = total > 0 ? (successfulSessions.length / total) * 100 : 0;

  // Lead Time: Median time from start to completion for successful sessions.
  const leadTimes = successfulSessions
    .filter(s => s.started_at && s.completed_at)
    .map(s => new Date(s.completed_at).getTime() - new Date(s.started_at).getTime());
  const lead_time_ms_median = median(leadTimes);

  // Change Failure Rate: % of sessions that were not fully successful.
  const change_failure_rate = total > 0 ? (failedSessions.length / total) * 100 : 0;

  return {
    autonomy_rate: parseFloat(autonomy_rate.toFixed(2)),
    lead_time_ms_median: Math.round(lead_time_ms_median),
    change_failure_rate: parseFloat(change_failure_rate.toFixed(2)),
    total_sessions: total,
    successful_sessions: successfulSessions.length,
    failed_sessions: failedSessions.length,
  };
}

async function writeArtifacts(kpis) {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const metricsJsonPath = path.join(ARTIFACTS_DIR, 'metrics.json');
  const jsonData = { generated_at: new Date().toISOString(), kpis };
  await fs.writeFile(metricsJsonPath, JSON.stringify(jsonData, null, 2));

  const weekStamp = getWeekStamp();
  const reportMdPath = path.join(ARTIFACTS_DIR, `metrics-${weekStamp}.md`);
  const mdContent = `
# Weekly Metrics Report: ${weekStamp}

- **Autonomy Rate**: ${kpis.autonomy_rate}%
- **Median Lead Time**: ${kpis.lead_time_ms_median} ms
- **Change Failure Rate**: ${kpis.change_failure_rate}%

---
*Based on ${kpis.total_sessions} total sessions (${kpis.successful_sessions} successful, ${kpis.failed_sessions} failed/partial).*
`;
  await fs.writeFile(reportMdPath, mdContent.trim());
  console.log(`✅ Metrics artifacts written to: ${path.relative(process.cwd(), ARTIFACTS_DIR)}`);
}

async function main() {
  console.log('--- Executor AI Metrics Calculator ---');
  const tracker = await loadYaml(TRACKER_FILE);
  const spans = await loadSpans();
  const kpis = await computeKPIs(tracker, spans);
  await writeArtifacts(kpis);
}

main().catch(error => {
  console.error("Failed to calculate metrics:", error);
  process.exit(1);
});
