#!/usr/bin/env node

/**
 * Generate SLSA v1.0 provenance attestation for Trust Spine compliance (Phase 19 T0)
 *
 * Generates SLSA provenance in in-toto format with artifact hashes
 * Output: provenance.intoto.jsonl
 *
 * Usage: npm run provenance
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';

const OUTPUT_FILE = 'provenance.intoto.jsonl';
const DIST_DIR = 'dist';

/**
 * Calculate SHA256 hash of a file
 */
function hashFile(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Recursively collect all files in a directory
 */
function collectFiles(dir, baseDir = dir) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else if (stat.isFile()) {
      files.push({
        path: relative(baseDir, fullPath),
        hash: hashFile(fullPath),
      });
    }
  }

  return files;
}

/**
 * Get git commit SHA if available
 */
function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get git repository URL if available
 */
function getGitRepo() {
  try {
    return execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

try {
  console.log('[Provenance] Starting SLSA v1.0 provenance generation...');

  // Collect artifact hashes
  console.log(`[Provenance] Scanning ${DIST_DIR}/ for build artifacts...`);
  const distFiles = collectFiles(DIST_DIR);

  // Add SBOM files if they exist
  const sbomFiles = [];
  if (existsSync('sbom.spdx.json')) {
    sbomFiles.push({
      path: 'sbom.spdx.json',
      hash: hashFile('sbom.spdx.json'),
    });
  }
  if (existsSync('sbom.cdx.json')) {
    sbomFiles.push({
      path: 'sbom.cdx.json',
      hash: hashFile('sbom.cdx.json'),
    });
  }

  const allArtifacts = [...distFiles, ...sbomFiles];

  console.log(`[Provenance] Found ${allArtifacts.length} artifacts`);

  // Get git metadata
  const gitCommit = getGitCommit();
  const gitRepo = getGitRepo();

  // Generate SLSA v1.0 provenance
  const provenance = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: allArtifacts.map(file => ({
      name: file.path,
      digest: {
        sha256: file.hash,
      },
    })),
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType: 'https://executor-mvp.com/build-types/npm@v1',
        externalParameters: {
          repository: gitRepo,
          ref: gitCommit,
        },
        internalParameters: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        resolvedDependencies: [
          {
            uri: 'pkg:npm/package-lock.json',
            digest: {
              sha256: existsSync('package-lock.json') ? hashFile('package-lock.json') : 'unknown',
            },
          },
        ],
      },
      runDetails: {
        builder: {
          id: 'https://executor-mvp.com/builders/local@v1',
        },
        metadata: {
          invocationId: `build-${Date.now()}`,
          startedOn: new Date().toISOString(),
          finishedOn: new Date().toISOString(),
        },
      },
    },
  };

  // Write as JSONL (one JSON object per line)
  const jsonlContent = JSON.stringify(provenance) + '\n';
  writeFileSync(OUTPUT_FILE, jsonlContent, 'utf-8');

  console.log(`[Provenance] ✅ SLSA v1.0 provenance generated: ${OUTPUT_FILE}`);
  console.log(`[Provenance] Artifacts: ${allArtifacts.length}`);
  console.log(`[Provenance] Git commit: ${gitCommit.substring(0, 8)}`);
  console.log(`[Provenance] Predicate type: ${provenance.predicateType}`);

  process.exit(0);
} catch (error) {
  console.error('[Provenance] ERROR:', error.message);
  if (error.stack) {
    console.error('[Provenance] Stack:', error.stack);
  }
  process.exit(1);
}
