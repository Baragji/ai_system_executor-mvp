#!/usr/bin/env node

/**
 * Contract Schema Validation Script
 * 
 * Validates Phase contracts against the roadmap_phase.schema.json schema
 * using Ajv (JSON Schema 2020-12 validator)
 * 
 * Exit codes:
 *   0 - All contracts valid
 *   1 - Validation failed or error occurred
 */

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Configuration
const SCHEMA_PATH = 'contracts/schemas/roadmap_phase.schema.json';
const CONTRACTS_DIR = 'contracts/Roadmap_execution';
const INCLUDE_LEGACY = process.env.CONTRACT_INCLUDE_LEGACY === '1';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

const TASK_STATUS_VALUES = new Set(['pending', 'in_progress', 'complete', 'blocked']);
const GATE_STATUS_VALUES = new Set(['not_started', 'in_progress', 'partial', 'passed', 'failed', 'blocked']);

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`❌ Failed to load ${filePath}: ${error.message}`, 'red');
    throw error;
  }
}

function collectStatusWarnings(contract) {
  const warnings = [];

  const gates = Array.isArray(contract.gates) ? contract.gates : [];
  gates.forEach((gate, index) => {
    const status = gate?.status;
    if (status && !GATE_STATUS_VALUES.has(status)) {
      warnings.push(`Gate[${index}] (${gate?.id ?? 'unknown'}) has unsupported status '${status}'.`);
    }
  });

  const tasks = Array.isArray(contract.tasks) ? contract.tasks : [];
  tasks.forEach((task, index) => {
    if (!task || typeof task !== 'object') return;

    const status = task.status;
    if (status && !TASK_STATUS_VALUES.has(status)) {
      warnings.push(`Task[${index}] (${task.id ?? 'unknown'}) has unsupported status '${status}'.`);
    }

    const completedAt = task.completed_at;
    if (status === 'complete' && !completedAt) {
      warnings.push(`Task[${index}] (${task.id ?? 'unknown'}) marked complete without completed_at timestamp.`);
    }
    if (completedAt && status !== 'complete') {
      warnings.push(`Task[${index}] (${task.id ?? 'unknown'}) has completed_at timestamp but status='${status ?? 'undefined'}'.`);
    }

    const validationEntries = Array.isArray(task.validation) ? task.validation : [];
    const validationCommands = new Set(
      validationEntries
        .map((entry) => (entry && typeof entry === 'object' ? entry.cmd : entry))
        .filter((cmd) => typeof cmd === 'string' && cmd.length > 0)
    );

    const validationResults = Array.isArray(task.validation_results) ? task.validation_results : [];

    if (status === 'complete' && validationCommands.size > 0 && validationResults.length === 0) {
      warnings.push(`Task[${index}] (${task.id ?? 'unknown'}) completed without recorded validation_results.`);
    }

    validationResults.forEach((result, resultIndex) => {
      const cmd = result?.cmd;
      if (cmd && validationCommands.size > 0 && !validationCommands.has(cmd)) {
        warnings.push(`Task[${index}] (${task.id ?? 'unknown'}) validation_results[${resultIndex}] cmd='${cmd}' not declared in validation list.`);
      }
      if (typeof result?.exit_code === 'number' && status === 'complete' && result.exit_code !== 0) {
        warnings.push(`Task[${index}] (${task.id ?? 'unknown'}) marked complete but validation_results[${resultIndex}] exit_code=${result.exit_code}.`);
      }
    });
  });

  return warnings;
}

function validateContract(validateFn, contractPath) {
  log(`\n📋 Validating: ${contractPath}`, 'blue');

  const contract = loadJson(contractPath);
  const valid = validateFn(contract);

  if (valid) {
    log(`✅ Valid - ${path.basename(contractPath)}`, 'green');
    const warnings = collectStatusWarnings(contract);
    warnings.forEach((warning) => {
      log(`  ⚠️  ${warning}`, 'yellow');
    });
    return true;
  } else {
    log(`❌ Invalid - ${path.basename(contractPath)}`, 'red');
    log(`\nValidation Errors:`, 'yellow');

    validateFn.errors.forEach((error, index) => {
      log(`\n  Error ${index + 1}:`, 'yellow');
      log(`    Path: ${error.instancePath || '(root)'}`, 'reset');
      log(`    Message: ${error.message}`, 'reset');
      if (error.params) {
        log(`    Params: ${JSON.stringify(error.params, null, 2)}`, 'reset');
      }
    });
    
    return false;
  }
}

function isContract(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contract = JSON.parse(content);
    
    const version = contract.contract_version;
    if (typeof version !== 'string' || version.length === 0) return false;
    const modernMatch = /^[A-Z]\.\d+\.\d+$/.test(version);
    const numericMatch = /^\d+\.\d+\.\d+$/.test(version);
    if (INCLUDE_LEGACY) return modernMatch || numericMatch;
    return modernMatch;
  } catch {
    return false; // If can't parse, skip
  }
}

function findContracts(dir) {
  if (!fs.existsSync(dir)) {
    log(`⚠️  Contracts directory not found: ${dir}`, 'yellow');
    return [];
  }
  
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dir, file))
    .filter(isContract);
}

async function main() {
  log('═══════════════════════════════════════════', 'bold');
  log('  CONTRACT SCHEMA VALIDATION', 'bold');
  log('═══════════════════════════════════════════\n', 'bold');
  
  // Check schema exists
  if (!fs.existsSync(SCHEMA_PATH)) {
    log(`❌ Schema not found: ${SCHEMA_PATH}`, 'red');
    log(`\nPlease create the schema file first.`, 'yellow');
    process.exit(1);
  }
  
  // Load schema
  log(`📖 Loading schema: ${SCHEMA_PATH}`, 'blue');
  const schema = loadJson(SCHEMA_PATH);
  log(`✅ Schema loaded`, 'green');
  
  // Initialize Ajv with JSON Schema 2020-12 support
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    verbose: true
  });
  addFormats(ajv);

  const validateFn = ajv.compile(schema);

  // Find contracts
  const contracts = findContracts(CONTRACTS_DIR);
  
  if (contracts.length === 0) {
    log(`\n⚠️  No CDI contracts found in ${CONTRACTS_DIR}`, 'yellow');
    log(`Set CONTRACT_INCLUDE_LEGACY=1 to include legacy-numbered contracts.`, 'yellow');
    process.exit(0);
  }
  
  log(`\n📚 Found ${contracts.length} contract(s) to validate`, 'blue');
  log(INCLUDE_LEGACY ? `(Including legacy-numbered contracts)\n` : `(Skipping legacy-numbered contracts)\n`, 'blue');
  
  // Validate all contracts
  let allValid = true;
  const results = {
    total: contracts.length,
    valid: 0,
    invalid: 0
  };

  for (const contractPath of contracts) {
    const isValid = validateContract(validateFn, contractPath);
    if (isValid) {
      results.valid++;
    } else {
      results.invalid++;
      allValid = false;
    }
  }

  const phase19Path = path.join(CONTRACTS_DIR, '19_phase19_autonomous_transition_contract.json');
  if (fs.existsSync(phase19Path)) {
    log(`\n📋 Analyzing status metadata (Phase 19 pilot): ${phase19Path}`, 'blue');
    try {
      const phase19 = loadJson(phase19Path);
      const warnings = collectStatusWarnings(phase19);
      if (warnings.length === 0) {
        log('  ✅ Status metadata check passed (no issues detected)', 'green');
      } else {
        warnings.forEach((warning) => {
          log(`  ⚠️  ${warning}`, 'yellow');
        });
      }
    } catch (error) {
      log(`  ⚠️  Unable to analyze Phase 19 contract: ${error.message}`, 'yellow');
    }
  }
  
  // Summary
  log('\n═══════════════════════════════════════════', 'bold');
  log('  VALIDATION SUMMARY', 'bold');
  log('═══════════════════════════════════════════', 'bold');
  log(`Total:   ${results.total}`);
  log(`Valid:   ${results.valid}`, 'green');
  log(`Invalid: ${results.invalid}`, results.invalid > 0 ? 'red' : 'reset');
  
  if (allValid) {
    log('\n✅ All CDI contracts are valid!\n', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some contracts failed validation. Please fix errors above.\n', 'red');
    process.exit(1);
  }
}

// Run validation
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
