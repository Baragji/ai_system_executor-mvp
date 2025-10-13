#!/usr/bin/env node

/**
 * Generate CycloneDX SBOM for Trust Spine compliance (Phase 19 T0)
 *
 * Generates a CycloneDX 1.6 format SBOM from package-lock.json
 * Output: sbom.cdx.json
 *
 * Usage: npm run sbom:cyclonedx
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const OUTPUT_FILE = 'sbom.cdx.json';
const PACKAGE_LOCK = 'package-lock.json';

async function main() {
  try {
    console.log('[CycloneDX] Starting SBOM generation...');

    // Verify package-lock.json exists
    if (!existsSync(PACKAGE_LOCK)) {
      console.error(`[CycloneDX] ERROR: ${PACKAGE_LOCK} not found. Run 'npm install' first.`);
      process.exit(1);
    }

    // Generate CycloneDX SBOM using @cyclonedx/cyclonedx-npm
    console.log('[CycloneDX] Generating CycloneDX 1.6 SBOM from package-lock.json...');

    const command = 'npx @cyclonedx/cyclonedx-npm --output-format JSON --output-file sbom.cdx.json';

    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    // Verify output file was created
    if (!existsSync(OUTPUT_FILE)) {
      console.error(`[CycloneDX] ERROR: ${OUTPUT_FILE} was not generated.`);
      process.exit(1);
    }

    // Read and validate the generated SBOM
    const sbomPath = resolve(process.cwd(), OUTPUT_FILE);
    const { readFileSync: readFileSyncForValidation } = await import('fs');
    const sbom = JSON.parse(readFileSyncForValidation(sbomPath, 'utf-8'));

    // Basic validation
    if (!sbom.bomFormat || sbom.bomFormat !== 'CycloneDX') {
      console.error('[CycloneDX] ERROR: Invalid SBOM format. Expected bomFormat=CycloneDX');
      process.exit(1);
    }

    if (!sbom.specVersion) {
      console.error('[CycloneDX] ERROR: Missing specVersion in SBOM');
      process.exit(1);
    }

    console.log(`[CycloneDX] ✅ SBOM generated successfully: ${OUTPUT_FILE}`);
    console.log(`[CycloneDX] Format: ${sbom.bomFormat} ${sbom.specVersion}`);
    console.log(`[CycloneDX] Components: ${sbom.components?.length || 0}`);
    console.log(`[CycloneDX] Serial Number: ${sbom.serialNumber}`);

    process.exit(0);
  } catch (error) {
    console.error('[CycloneDX] ERROR:', error.message);
    if (error.stderr) {
      console.error('[CycloneDX] stderr:', error.stderr.toString());
    }
    process.exit(1);
  }
}

main();
