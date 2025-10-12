#!/usr/bin/env node
/**
 * Executor AI Runner (Session Orchestration)
 *
 * This script automates the pre-flight check for the AI's workflow.
 * - It loads the session plan and the tracker.
 * - It identifies the next pending work item ("slice").
 * - It generates a stub report from the template for the AI to fill out.
 * - It updates the tracker to mark the session as "PENDING".
 *
 * This ensures the AI always has a clean, well-defined task to execute
 * when activated with the "Proceed" command.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';
import crypto from 'node:crypto';

// --- Configuration ---
// Note: These paths are relative to the location of this script.
const ROOT_DIR = path.resolve(path.dirname(''), '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const SESSIONS_DIR = path.join(ROOT_DIR, 'sessions');
const TRACKER_FILE = path.join(ROOT_DIR, 'tracker', 'session_tracker.yaml');
const SESSION_PLAN_FILE = path.join(CONFIG_DIR, 'session_plan.yaml');
// ---

const loadYaml = async (filePath) => yaml.parse(await fs.readFile(filePath, 'utf8'));
const getCurrentTimestamp = () => new Date().toISOString();

async function readTracker() {
  try {
    return await loadYaml(TRACKER_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Tracker file not found, creating a new one.');
      return { schema: 'executor_ai.tracker.v1', project: 'Universal Executor Project', sessions: [] };
    }
    throw error;
  }
}

function findNextSlice(plan, tracker) {
  const completedIds = new Set((tracker.sessions || []).map(s => s.id));
  for (const objective of plan.objectives) {
    for (const slice of objective.slices) {
      if (!completedIds.has(slice.id)) {
        return { objective, slice };
      }
    }
  }
  return null; // No pending slices
}

async function renderTemplate(templatePath, context) {
  let templateContent = await fs.readFile(templatePath, 'utf8');
  for (const [key, value] of Object.entries(context)) {
    templateContent = templateContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
  }
  return templateContent;
}

async function main() {
  console.log('--- Executor AI Session Runner ---');

  const plan = await loadYaml(SESSION_PLAN_FILE);
  const tracker = await readTracker();
  const nextItem = findNextSlice(plan, tracker);

  if (!nextItem) {
    console.log('All objectives completed. Nothing to prepare.');
    return;
  }

  const { objective, slice } = nextItem;
  const sessionId = slice.id;
  const spanRoot = `executor.session.${sessionId}.${new Date().toISOString().replace(/[-:.]/g, '')}`;

  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  const reportPath = path.join(SESSIONS_DIR, `${sessionId}.md`);
  const templatePath = path.join(TEMPLATES_DIR, 'session_report_template.md');

  const reportContent = await renderTemplate(templatePath, {
    SESSION_ID: sessionId,
    OBJECTIVE_TITLE: objective.title,
    SLICE_TITLE: slice.title,
    SPAN_ROOT: spanRoot,
    START_ISO: getCurrentTimestamp(),
    END_ISO: '',
    DIFF_SNIPPET: '<!-- AI will populate this -->',
    FINDING: '<!-- AI will populate this -->',
    COMPONENT: '<!-- AI will populate this -->',
    FILE: '<!-- AI will populate this -->',
    START_LINE: '',
    END_LINE: '',
    IMPACT: '<!-- AI will populate this -->',
    SSDF_ASVS_MAPPING: '<!-- AI will populate this -->',
    LINT_STATUS: 'PENDING',
    BUILD_STATUS: 'PENDING',
    TEST_STATUS: 'PENDING',
    VALIDATION_STATUS: 'PENDING',
    NEXT_ACTION: '<!-- AI will populate this -->'
  });

  await fs.writeFile(reportPath, reportContent, 'utf8');

  tracker.sessions.push({
    id: sessionId,
    title: slice.title,
    status: 'PENDING',
    span_root: spanRoot,
    started_at: getCurrentTimestamp(),
    report: path.relative(ROOT_DIR, reportPath)
  });

  await fs.writeFile(TRACKER_FILE, yaml.stringify(tracker), 'utf8');

  console.log(`✅ Session [${sessionId}] prepared successfully.`);
  console.log(`   - Report stub created at: ${path.relative(process.cwd(), reportPath)}`);
  console.log(`   - Tracker updated.`);
  console.log('The AI is now ready for the "Proceed" command.');
}

main().catch((error) => {
  console.error('Failed to prepare session:', error);
  process.exit(1);
});
