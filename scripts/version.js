#!/usr/bin/env node
/**
 * version.js - Sync package version with ecCodes version
 */

const fs = require('fs');
const path = require('path');

const ECCODES_VERSION_FILE = path.join(__dirname, '..', 'eccodes', 'VERSION');
const PACKAGE_FILE = path.join(__dirname, '..', 'package.json');

console.log('Syncing package version with ecCodes version...');

// Read ecCodes version
if (!fs.existsSync(ECCODES_VERSION_FILE)) {
  console.error('❌ ecCodes/VERSION not found. Run: make setup or make download');
  process.exit(1);
}

const ecCodesVersion = fs.readFileSync(ECCODES_VERSION_FILE, 'utf8').trim();
console.log(`  ecCodes version: ${ecCodesVersion}`);

// Update package.json
const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));

if (pkg.version !== ecCodesVersion) {
  console.log(`  Updating package version: ${pkg.version} → ${ecCodesVersion}`);
  pkg.version = ecCodesVersion;
  fs.writeFileSync(PACKAGE_FILE, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✓ Package version updated');
} else {
  console.log('  Versions already match');
}

// Sync with Makefile VERSION variable
const MAKEFILE = path.join(__dirname, '..', 'Makefile');
const makefileContent = fs.readFileSync(MAKEFILE, 'utf8');

const updatedMakefile = makefileContent.replace(
  /^VERSION\s*:=.*$/m,
  `VERSION := ${ecCodesVersion}`
);

if (updatedMakefile !== makefileContent) {
  fs.writeFileSync(MAKEFILE, updatedMakefile);
  console.log('✓ Makefile VERSION updated');
}

process.exit(0);