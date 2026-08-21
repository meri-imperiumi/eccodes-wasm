/**
 * Basic WASM module tests
 *
 * Tests that don't require external GRIB files
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// We'll dynamically import after build check
let eccodes;

describe('WASM Module Initialization', { timeout: 30000 }, () => {

  it('should import the module', async () => {
    eccodes = (await import('../wasm/eccodes.js')).createEccodes;
    assert.ok(eccodes, 'module should be imported');
  });

  it('should initialize the WASM module', async () => {
    const instance = await eccodes();
    assert.ok(instance, 'instance should be created');
    assert.ok(instance.getVersion, 'instance should have getVersion');
    assert.ok(instance.mountFilesystem, 'instance should have mountFilesystem');
  });

  it('should get version', async () => {
    const instance = await eccodes();
    const version = instance.getVersion();
    assert.strictEqual(typeof version, 'number', 'version should be a number');
    assert.ok(version >= 20000, `version ${version} should be >= 2.0.0`);
  });

  it('should have EccodesError class', async () => {
    // Import the module and check exports
    const module = (await import('../wasm/eccodes.js'));
    assert.ok(module.EccodesError, 'EccodesError should be exported');
    assert.ok(module.CodesHandle, 'CodesHandle should be exported');
  });

  it('should have proper error class', async () => {
    const { EccodesError } = await import('../wasm/eccodes.js');
    const err = new EccodesError('test error', 123);
    assert.strictEqual(err.name, 'EccodesError', 'error name should be EccodesError');
    assert.strictEqual(err.message, 'test error', 'error message should match');
    assert.strictEqual(err.code, 123, 'error code should match');
  });

});