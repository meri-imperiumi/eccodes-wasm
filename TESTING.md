# Testing

## Running Tests

### Prerequisites

Before running tests, you must build the WASM module:

```bash
make build-jpg
```

### Run All Tests

```bash
# Run with node:test (Node.js 20+)
node --test

# Or using npm
npm test
```

### E2E Tests

End-to-end tests use real GRIB files from the ecCodes repository:

```bash
# Run E2E tests
npm run test:e2e

# Or directly
node --test test/e2e.mjs
```

### Basic Tests

Tests that don't require external files:

```bash
npm run test:basic

# Or directly
node --test test/basic.mjs
```

## Test Coverage

The E2E tests cover:

- ✅ Module initialization
- ✅ Version detection
- ✅ Filesystem mounting
- ✅ GRIB1 file reading
- ✅ GRIB2 file reading
- ✅ Different grid types (regular, reduced, mercator, healpix, etc.)
- ✅ Metadata extraction
- ✅ Data array reading
- ✅ Coordinate reading
- ✅ Memory management and cleanup
- ✅ Handle cloning
- ✅ Error handling
- ✅ Compression detection
- ✅ Array operations
- ✅ Timestamp/reference time reading
- ✅ Geospatial metadata

## Test Files

- `test/basic.mjs` - Basic module loading and initialization tests
- `test/e2e.mjs` - End-to-end tests with real GRIB files
- `test/run.mjs` - Test runner script with build checking

## Adding Tests

To add new tests:

1. Create test files in `test/` with `.mjs` extension
2. Use `node:test` and `node:assert`
3. Run with `node --test` or `npm test`

## Test Files Used

E2E tests use GRIB files from:
- `../eccodes/tests/grib_to_gridspec/*.grib` - Various grid types
- Both GRIB1 and GRIB2 formats
- Different compression types (when available)

## Memory Management Tests

Tests verify that:
- Handles can be properly deleted
- Multiple handles can be managed
- No memory leaks occur during repeated operations
- Arrays are properly freed

## JPEG Compression Tests

Tests check:
- JPEG-encoded files can be opened
- Compressed data can be read
- Values are correctly decompressed
- Error handling for unsupported compression

## Running Specific Tests

```bash
# Run specific test file
node --test test/e2e.mjs

# Run tests with verbose output
node --test --verbose

# Run with timeout
node --test --timeout=60000
```