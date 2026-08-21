#!/usr/bin/env node
/**
 * prepublish-check.js - Verify build exists before publishing
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build', 'eccodes');

const requiredFiles = [
  'eccodes.js',
  'eccodes.wasm',
  'index.js',
];

console.log('Checking WASM build for NPM publish...');

const missing = [];
for (const file of requiredFiles) {
  const filePath = path.join(BUILD_DIR, file);
  if (!fs.existsSync(filePath)) {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error('❌ Missing build artifacts:');
  missing.forEach(f => console.error(`   - ${f}`));
  console.error('');
  console.error('Please run: make release');
  process.exit(1);
}

// Check file sizes
const wasmPath = path.join(BUILD_DIR, 'eccodes.wasm');
const wasmStats = fs.statSync(wasmPath);
const wasmSizeMB = (wasmStats.size / 1024 / 1024).toFixed(2);

console.log('✓ All required files present');
console.log(`  eccodes.wasm: ${wasmSizeMB} MB`);
console.log('');
console.log('Ready to publish to NPM');
process.exit(0);