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

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

// Configuration
const SCHEMA_PATH = 'contracts/schemas/roadmap_phase.schema.json';
const CONTRACTS_DIR = 'contracts/Roadmap_execution';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

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

function validateContract(ajv, schema, contractPath) {
  log(`\n📋 Validating: ${contractPath}`, 'blue');
  
  const contract = loadJson(contractPath);
  const validate = ajv.compile(schema);
  const valid = validate(contract);
  
  if (valid) {
    log(`✅ Valid - ${path.basename(contractPath)}`, 'green');
    return true;
  } else {
    log(`❌ Invalid - ${path.basename(contractPath)}`, 'red');
    log(`\nValidation Errors:`, 'yellow');
    
    validate.errors.forEach((error, index) => {
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

function findContracts(dir) {
  if (!fs.existsSync(dir)) {
    log(`⚠️  Contracts directory not found: ${dir}`, 'yellow');
    return [];
  }
  
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dir, file));
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
  
  // Find contracts
  const contracts = findContracts(CONTRACTS_DIR);
  
  if (contracts.length === 0) {
    log(`\n⚠️  No contracts found in ${CONTRACTS_DIR}`, 'yellow');
    log(`This is expected if you haven't created any contracts yet.`, 'yellow');
    process.exit(0);
  }
  
  log(`\n📚 Found ${contracts.length} contract(s) to validate\n`, 'blue');
  
  // Validate all contracts
  let allValid = true;
  const results = {
    total: contracts.length,
    valid: 0,
    invalid: 0
  };
  
  for (const contractPath of contracts) {
    const isValid = validateContract(ajv, schema, contractPath);
    if (isValid) {
      results.valid++;
    } else {
      results.invalid++;
      allValid = false;
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
    log('\n✅ All contracts are valid!\n', 'green');
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
