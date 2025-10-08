#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const inputDir = process.env.LH_INPUT_DIR || 'lighthouse-reports';
  const outputDir = process.env.OUTPUT_DIR || '.automation';
  const outFolder = path.join(outputDir, 'lighthouse-reports');
  await fs.mkdir(outFolder, { recursive: true });

  // Try to find Lighthouse JSON results in inputDir
  const entries = await fs.readdir(inputDir).catch(() => []);
  const jsons = entries.filter(f => f.endsWith('.json'));

  const summary = {
    created_at: new Date().toISOString(),
    inputs_dir: inputDir,
    reports: [],
    overall: {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      pwa: null,
    },
  };

  for (const file of jsons) {
    const p = path.join(inputDir, file);
    try {
      const data = JSON.parse(await fs.readFile(p, 'utf8'));
      const cats = data.categories || {};
      const entry = {
        file,
        url: data.requestedUrl || data.finalUrl,
        performance: cats.performance?.score ?? null,
        accessibility: cats.accessibility?.score ?? null,
        bestPractices: cats['best-practices']?.score ?? null,
        seo: cats.seo?.score ?? null,
        pwa: cats.pwa?.score ?? null,
      };
      summary.reports.push(entry);
    } catch (err) {
      // Skip malformed/invalid report files; optional debug logging
      if (process.env.DEBUG_LH_COMPLIANCE === '1') {
        const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
        console.warn(`Skipping report ${file}: ${msg}`);
      }
    }
  }

  // Compute simple averages if multiple reports
  if (summary.reports.length > 0) {
    const avg = (k) => {
      const vals = summary.reports.map(r => r[k]).filter(v => typeof v === 'number');
      return vals.length ? Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3)) : null;
    };
    summary.overall.performance = avg('performance');
    summary.overall.accessibility = avg('accessibility');
    summary.overall.bestPractices = avg('bestPractices');
    summary.overall.seo = avg('seo');
    summary.overall.pwa = avg('pwa');
  }

  const outPath = path.join(outFolder, 'ui-compliance-report.json');
  await fs.writeFile(outPath, JSON.stringify(summary, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
