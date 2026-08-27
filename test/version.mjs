/**
 * version.mjs - Verify version pinning for decoupled releases
 *
 * The npm package version and the built ecCodes version are decoupled:
 *   - package.json version is set by release tags (vX.Y.Z) or CI input
 *   - ECCODES_VERSION pins which ecCodes release CI builds against
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('ECCODES_VERSION pins a valid ecCodes release tag', () => {
  const pinned = readFileSync(join(repoRoot, 'ECCODES_VERSION'), 'utf8').trim();
  assert.match(
    pinned,
    /^\d+\.\d+\.\d+$/,
    `ECCODES_VERSION must be an X.Y.Z ecCodes tag, got: ${pinned}`,
  );
});

test('package.json version is valid semver', () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  assert.match(
    pkg.version,
    /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
    `unexpected package version: ${pkg.version}`,
  );
});
