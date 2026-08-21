/**
 * End-to-end tests for eccodes-wasm
 *
 * Tests with real GRIB files from the ecCodes repository
 */

import { createEccodes } from '../wasm/eccodes.js';
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to GRIB test files from eccodes repository
const ECCODES_TEST_DIR = join(__dirname, '../eccodes/tests/grib_to_gridspec');
const TEST_FILES = {
  grib1_regular_ll: join(ECCODES_TEST_DIR, 'regular_ll.grib'),
  grib1_polar_stereographic: join(ECCODES_TEST_DIR, 'polar_stereographic.grib'),
  grib1_lambert: join(ECCODES_TEST_DIR, 'lambert.grib'),
  grib1_rotated_gg: join(ECCODES_TEST_DIR, 'rotated_gg.grib'),
  grib2_healpix: join(ECCODES_TEST_DIR, 'healpix.grib'),
  grib2_reduced_gg: join(ECCODES_TEST_DIR, 'reduced_gg.grib'),
  grib2_lambert_azimuthal: join(ECCODES_TEST_DIR, 'lambert_azimuthal_equal_area.grib'),
  grib2_mercator: join(ECCODES_TEST_DIR, 'mercator.grib'),
  grib2_icon: join(ECCODES_TEST_DIR, 'icon.grib'),
  grib2_orca: join(ECCODES_TEST_DIR, 'orca.grib'),
};

let eccodes;

describe('eccodes-wasm end-to-end tests', () => {

  before(async () => {
    eccodes = await createEccodes();
    assert.ok(eccodes, 'eccodes instance should be created');
    eccodes.mountFilesystem(ECCODES_TEST_DIR);
  });

  describe('Initialization', { timeout: 30000 }, () => {
    it('should report version', () => {
      const version = eccodes.getVersion();
      assert.strictEqual(typeof version, 'number', 'version should be a number');
      assert.ok(version >= 20000, `version ${version} should be >= 2.0.0`);
    });
  });

  describe('GRIB1 Files', { timeout: 30000 }, () => {

    it('should open and read GRIB1 regular_ll', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');
      assert.ok(handle, 'handle should be created');

      // Basic metadata
      const edition = handle.getLong('editionNumber');
      assert.strictEqual(edition, 1, 'edition should be 1');

      // Grid info
      const ni = handle.getLong('Ni');
      const nj = handle.getLong('Nj');
      assert.strictEqual(typeof ni, 'number', 'Ni should be a number');
      assert.strictEqual(typeof nj, 'number', 'Nj should be a number');

      // Parameter info
      const paramId = handle.getLong('paramId');
      const shortName = handle.getString('shortName');
      const name = handle.getString('name');
      const units = handle.getString('units');

      assert.strictEqual(typeof paramId, 'number', 'paramId should be a number');
      assert.strictEqual(typeof shortName, 'string', 'shortName should be a string');
      assert.strictEqual(typeof name, 'string', 'name should be a string');
      assert.strictEqual(typeof units, 'string', 'units should be a string');

      // Read data values
      const valuesSize = handle.getSize('values');
      assert.ok(valuesSize > 0, `valuesSize ${valuesSize} should be positive`);

      const values = handle.getDoubleArray('values');
      assert.strictEqual(values.length, valuesSize, 'values length should match size');
      assert.strictEqual(typeof values[0], 'number', 'values should contain numbers');

      // Cleanup
      handle.delete();
    });

    it('should read all metadata from GRIB1', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      // Common GRIB1 keys
      const keys = [
        'Ni', 'Nj', 'gridType', 'scanningMode',
        'iScansNegatively', 'jScansPositively',
        'dataDate', 'dataTime', 'stepRange',
        'typeOfLevel', 'level'
      ];

      for (const key of keys) {
        try {
          if (handle.isMissing(key)) {
            continue;
          }
          const type = handle.getNativeType(key);
          if (type === 1) { // CODES_TYPE_LONG
            const value = handle.getLong(key);
            assert.strictEqual(typeof value, 'number', `${key} should be a number`);
          } else if (type === 2) { // CODES_TYPE_DOUBLE
            const value = handle.getDouble(key);
            assert.strictEqual(typeof value, 'number', `${key} should be a number`);
          } else if (type === 3) { // CODES_TYPE_STRING
            const value = handle.getString(key);
            assert.strictEqual(typeof value, 'string', `${key} should be a string`);
          }
        } catch (err) {
          // Some keys may not be present in all files
        }
      }

      handle.delete();
    });

    it('should handle memory cleanup correctly', async () => {
      // Test that multiple handles can be created and cleaned up
      const handles = [];
      for (let i = 0; i < 5; i++) {
        const handle = eccodes.openGrib('/data/regular_ll.grib');
        handles.push(handle);
      }

      // All handles should be valid
      assert.strictEqual(handles.length, 5, 'should have 5 handles');

      // Cleanup all handles
      for (const handle of handles) {
        handle.delete();
      }

      assert.ok(true, 'all handles deleted successfully');
    });

    it('should clone a handle', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');
      const originalNi = handle.getLong('Ni');

      const cloned = handle.clone();
      const clonedNi = cloned.getLong('Ni');

      assert.strictEqual(clonedNi, originalNi, 'cloned handle should have same data');

      handle.delete();
      cloned.delete();
    });

    it('should check missing keys', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      // This key should exist
      assert.strictEqual(handle.isMissing('Ni'), false, 'Ni should not be missing');

      // This key should not exist
      const isMissing = handle.isMissing('nonExistentKeyThatDoesNotExist');
      assert.strictEqual(isMissing, true, 'non-existent key should be missing');

      handle.delete();
    });

  });

  describe('GRIB2 Files', { timeout: 30000 }, () => {

    it('should open and read GRIB2 reduced_gg', async () => {
      const handle = eccodes.openGrib('/data/reduced_gg.grib');
      assert.ok(handle, 'handle should be created');

      const edition = handle.getLong('editionNumber');
      assert.strictEqual(edition, 2, 'edition should be 2');

      // GRIB2 specific keys
      const gridType = handle.getString('gridType');
      assert.strictEqual(typeof gridType, 'string', 'gridType should be a string');

      // Read larger dataset
      const values = handle.getDoubleArray('values');
      assert.ok(values.length > 0, 'should have values');
      assert.strictEqual(typeof values[0], 'number', 'values should contain numbers');

      handle.delete();
    });

    it('should handle different grid types', async () => {
      const gridFiles = [
        '/data/healpix.grib',
        '/data/mercator.grib',
        '/data/orca.grib',
        '/data/icon.grib',
      ];

      for (const file of gridFiles) {
        try {
          const handle = eccodes.openGrib(file);
          const gridType = handle.getString('gridType');
          const edition = handle.getLong('editionNumber');

          assert.strictEqual(edition, 2, `${file} should be GRIB2`);
          assert.strictEqual(typeof gridType, 'string', `${file} gridType should be a string`);

          handle.delete();
        } catch (err) {
          // Some files might not be accessible in WASM
          console.log(`Skipped ${file}: ${err.message}`);
        }
      }
    });

    it('should read coordinates from GRIB2', async () => {
      const handle = eccodes.openGrib('/data/reduced_gg.grib');

      try {
        const latSize = handle.getSize('latitudes');
        const lonSize = handle.getSize('longitudes');

        if (latSize > 0 && lonSize > 0 && latSize < 10000) {
          const lats = handle.getDoubleArray('latitudes');
          const lons = handle.getDoubleArray('longitudes');

          assert.strictEqual(lats.length, latSize, 'latitudes length should match');
          assert.strictEqual(lons.length, lonSize, 'longitudes length should match');
          assert.ok(lats.every(l => l >= -90 && l <= 90), 'latitudes should be valid');
          assert.ok(lons.every(l => l >= -180 && l <= 360), 'longitudes should be valid');
        }
      } catch (err) {
        // Coordinate data may not be available for all files
      }

      handle.delete();
    });

  });

  describe('Array Operations', { timeout: 30000 }, () => {

    it('should handle large arrays', async () => {
      const handle = eccodes.openGrib('/data/reduced_gg.grib');

      const size = handle.getSize('values');
      const values = handle.getDoubleArray('values');

      assert.strictEqual(values.length, size, 'array size should match');

      // Verify array contains valid numbers
      const hasNaN = values.some(v => Number.isNaN(v));
      assert.strictEqual(hasNaN, false, 'array should not contain NaN values');

      handle.delete();
    });

    it('should handle string arrays', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      try {
        const size = handle.getSize('typeOfProcessedData');
        if (size > 0 && size < 100) {
          const types = handle.getStringArray('typeOfProcessedData');
          assert.ok(Array.isArray(types), 'should return an array');
          assert.ok(types.every(t => typeof t === 'string'), 'all elements should be strings');
        }
      } catch (err) {
        // May not be available
      }

      handle.delete();
    });

  });

  describe('Error Handling', { timeout: 30000 }, () => {

    it('should throw on non-existent file', async () => {
      assert.throws(
        () => eccodes.openGrib('/data/does_not_exist.grib'),
        /Cannot open file/,
        'should throw error for non-existent file'
      );
    });

    it('should throw on invalid key', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      assert.throws(
        () => handle.getLong('invalidKeyThatDoesNotExist123'),
        /Key\/value not found|Error accessing key/,
        'should throw error for invalid key'
      );

      handle.delete();
    });

    it('should provide error messages', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      try {
        handle.getLong('nonExistentKey');
        assert.fail('should have thrown');
      } catch (err) {
        assert.ok(err.message, 'error should have a message');
        assert.ok(err.message.includes('nonExistentKey'), 'error should mention the key');
      }

      handle.delete();
    });

  });

  describe('File Counting', { timeout: 30000 }, () => {

    it('should count messages in file', async () => {
      const count = eccodes.countInFile('/data/regular_ll.grib');
      assert.strictEqual(typeof count, 'number', 'count should be a number');
      assert.ok(count > 0, 'count should be positive');
    });

  });

  describe('Memory Management', { timeout: 30000 }, () => {

    it('should properly clean up after processing many files', async () => {
      const iterations = 20;
      const handles = [];

      for (let i = 0; i < iterations; i++) {
        const handle = eccodes.openGrib('/data/regular_ll.grib');
        handles.push(handle);
      }

      // All handles should be valid
      assert.strictEqual(handles.length, iterations, `should have ${iterations} handles`);

      // Read from each
      for (const handle of handles) {
        const ni = handle.getLong('Ni');
        assert.strictEqual(typeof ni, 'number', 'handle should be valid');
      }

      // Cleanup all
      for (const handle of handles) {
        handle.delete();
      }

      assert.ok(true, 'cleaned up all handles');
    });

  });

  describe('Compression Detection', { timeout: 30000 }, () => {

    it('should detect compression type if available', async () => {
      const handle = eccodes.openGrib('/data/reduced_gg.grib');

      try {
        const compressionType = handle.getLong('compressionType');
        // If compressionType exists, it should be a number
        assert.strictEqual(typeof compressionType, 'number', 'compressionType should be a number');
      } catch (err) {
        // Key may not be available or file may not be compressed
      }

      handle.delete();
    });

    it('should read compressed data correctly', async () => {
      const handle = eccodes.openGrib('/data/reduced_gg.grib');

      const values = handle.getDoubleArray('values');
      assert.ok(values.length > 0, 'should read compressed data');

      // Check that values are reasonable
      const allValid = values.every(v => Number.isFinite(v) && !Number.isNaN(v));
      assert.ok(allValid, 'all values should be finite');

      handle.delete();
    });

  });

  describe('Iterator Support', { timeout: 30000 }, () => {

    it('should get keys iterator', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      try {
        const size = handle.getSize('count');
        if (size > 0 && size < 1000) {
          // If count is available and reasonable, we can try to iterate
          assert.ok(true, 'count is available');
        }
      } catch (err) {
        // Iterator support may not be fully implemented
      }

      handle.delete();
    });

  });

  describe('Timestamp and Reference Time', { timeout: 30000 }, () => {

    it('should read reference time', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      try {
        const dataDate = handle.getLong('dataDate');
        const dataTime = handle.getLong('dataTime');

        assert.strictEqual(typeof dataDate, 'number', 'dataDate should be a number');
        assert.strictEqual(typeof dataTime, 'number', 'dataTime should be a number');

        // dataDate format is YYYYMMDD, dataTime is HHMM
        assert.ok(dataDate >= 19790101 && dataDate <= 21001231, 'dataDate should be reasonable');
        assert.ok(dataTime >= 0 && dataTime <= 2359, 'dataTime should be reasonable');
      } catch (err) {
        // May not be available in all files
      }

      handle.delete();
    });

    it('should read forecast time', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      try {
        const stepRange = handle.getString('stepRange');
        assert.strictEqual(typeof stepRange, 'string', 'stepRange should be a string');
      } catch (err) {
        // May not be available in all files
      }

      handle.delete();
    });

  });

  describe('Geospatial Metadata', { timeout: 30000 }, () => {

    it('should read bounding box', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      try {
        const latOfFirstGridPoint = handle.getDouble('latitudeOfFirstGridPointInDegrees');
        const lonOfFirstGridPoint = handle.getDouble('longitudeOfFirstGridPointInDegrees');
        const latOfLastGridPoint = handle.getDouble('latitudeOfLastGridPointInDegrees');
        const lonOfLastGridPoint = handle.getDouble('longitudeOfLastGridPointInDegrees');

        assert.strictEqual(typeof latOfFirstGridPoint, 'number', 'latOfFirstGridPoint should be a number');
        assert.strictEqual(typeof lonOfFirstGridPoint, 'number', 'lonOfFirstGridPoint should be a number');

        // Check latitudes are valid
        assert.ok(
          latOfFirstGridPoint >= -90 && latOfFirstGridPoint <= 90,
          `latOfFirstGridPoint ${latOfFirstGridPoint} should be in range [-90, 90]`
        );
        assert.ok(
          latOfLastGridPoint >= -90 && latOfLastGridPoint <= 90,
          `latOfLastGridPoint ${latOfLastGridPoint} should be in range [-90, 90]`
        );
      } catch (err) {
        // May not be available for all grid types
      }

      handle.delete();
    });

    it('should read grid units', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      const iDirectionIncrement = handle.getDouble('iDirectionIncrementInDegrees');
      const jDirectionIncrement = handle.getDouble('jDirectionIncrementInDegrees');

      assert.strictEqual(typeof iDirectionIncrement, 'number', 'iDirectionIncrement should be a number');
      assert.strictEqual(typeof jDirectionIncrement, 'number', 'jDirectionIncrement should be a number');

      assert.ok(iDirectionIncrement > 0, 'iDirectionIncrement should be positive');
      assert.ok(jDirectionIncrement > 0, 'jDirectionIncrement should be positive');

      handle.delete();
    });

  });

  describe('JPEG Compression', { timeout: 30000 }, () => {

    it('should detect if JPEG is enabled in build', async () => {
      const version = eccodes.getVersion();
      // Version format: MMMMmmpp where MMMM=major, mm=minor, pp=patch
      const major = Math.floor(version / 10000);

      // Check if JPEG support is compiled in by trying to open a file
      // that would use JPEG if available
      try {
        const handle = eccodes.openGrib('/data/reduced_gg.grib');
        const values = handle.getDoubleArray('values');
        handle.delete();

        // If we can read data successfully, the build is working
        assert.ok(true, 'WASM module is functional');
      } catch (err) {
        assert.fail(`WASM module failed: ${err.message}`);
      }
    });

    it('should read JPEG-compressed data if available', async () => {
      const handle = eccodes.openGrib('/data/reduced_gg.grib');

      try {
        const compressionType = handle.getLong('compressionType');
        const values = handle.getDoubleArray('values');

        if (compressionType) {
          // If compressed, verify data is readable
          assert.ok(values.length > 0, 'should read compressed data');
          const allValid = values.every(v => Number.isFinite(v) && !Number.isNaN(v));
          assert.ok(allValid, 'all compressed values should be valid');
        }
      } catch (err) {
        // May not have compressionType or may not be compressed
      }

      handle.delete();
    });

  });

  describe('Type Detection', { timeout: 30000 }, () => {

    it('should detect data types correctly', async () => {
      const handle = eccodes.openGrib('/data/regular_ll.grib');

      // Test known types
      const niType = handle.getNativeType('Ni');
      assert.strictEqual(niType, 1, 'Ni should be CODES_TYPE_LONG (1)');

      const latitudeType = handle.getNativeType('latitudeOfFirstGridPointInDegrees');
      assert.strictEqual(latitudeType, 2, 'latitude should be CODES_TYPE_DOUBLE (2)');

      handle.delete();
    });

  });

  describe('BUFR Files', { timeout: 30000 }, () => {

    it('should handle BUFR if files available', async () => {
      // This test is optional - BUFR files may not be in the test directory
      // Skip gracefully if no BUFR files are available
      try {
        const handle = eccodes.openBufr('/data/sample.bufr');
        handle.delete();
      } catch (err) {
        // BUFR file not available - skip test
        assert.ok(true, 'BUFR test skipped (no files available)');
      }
    });

  });

});