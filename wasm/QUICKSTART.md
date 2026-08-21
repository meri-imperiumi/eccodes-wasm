# ecCodes WebAssembly Build for Node.js

This directory contains a complete setup for building ecCodes as WebAssembly for Node.js.

## Quick Start

### Prerequisites

Install Emscripten:

```bash
# macOS
brew install emscripten

# Or download from: https://emscripten.org/docs/getting_started/downloads.html

# Verify installation
emcc --version
```

### Build

```bash
# Basic build (no compression support) - fastest (~5-10 min)
make -f Makefile.wasm build

# Build with JPEG support - ~10-20 min
make -f Makefile.wasm build-jpg

# Or directly with Python
cd wasm
python build_wasm.py --release --enable-jpg

# Debug build
python build_wasm.py

# Build with AEC only (default)
python build_wasm.py

# Build with both JPEG and AEC
python build_wasm.py --release --enable-jpg

# Minimal build (no compression)
python build_wasm.py --disable-aec
```

### Use in Node.js

```javascript
const { createEccodes } = require('./wasm/eccodes.js');

async function main() {
    const eccodes = await createEccodes('./wasm/build/wasm/eccodes/eccodes.js');

    // Get version
    console.log('ecCodes version:', eccodes.getVersion());

    // Mount filesystem to access files
    eccodes.mountFilesystem('.');

    // Open a GRIB file
    const handle = eccodes.openGrib('/path/to/file.grib');

    // Read values
    console.log('Ni:', handle.getLong('Ni'));
    console.log('name:', handle.getString('name'));
    console.log('units:', handle.getString('units'));

    // Get array values
    const values = handle.getDoubleArray('values');
    console.log(`Array length: ${values.length}`);

    // Cleanup
    handle.delete();
}

main().catch(console.error);
```

## File Structure

```
wasm/
├── build_wasm.py          # Main build script
├── eccodes_wrapper.c      # C wrapper with EMSCRIPTEN_KEEPALIVE functions
├── eccodes.js             # High-level JavaScript wrapper
├── package.json           # NPM package configuration
├── README.md              # Detailed documentation
├── RUST_WASM.md          # Alternative Rust+wasm-bindgen approach
├── example/
│   └── usage.js          # Usage example
└── test/
    └── basic.js          # Basic tests

build/wasm/
└── eccodes/
    ├── eccodes.js        # Generated Emscripten glue
    ├── eccodes.wasm      # WASM binary
    └── resources/        # Definitions/samples (if not memfs)
```

## API Overview

### Eccodes Class

```javascript
const eccodes = await createEccodes('./path/to/eccodes.js');

// Version info
eccodes.getVersion();

// Filesystem
eccodes.mountFilesystem(root);          // Mount Node.js FS
eccodes.writeFile(path, data);           // Write to virtual FS
eccodes.readFile(path);                  // Read from virtual FS

// Configuration
eccodes.setDefinitionsPath(path);
eccodes.setSamplesPath(path);

// Open files
const handle = eccodes.openGrib(path);   // Open GRIB
const handle = eccodes.openBufr(path);   // Open BUFR
const count = eccodes.countInFile(path); // Count messages
```

### CodesHandle Class

```javascript
// Get scalar values
handle.getLong(key);      // Get i64
handle.getDouble(key);    // Get f64
handle.getString(key);    // Get string

// Get array values
handle.getSize(key);              // Get array length
handle.getDoubleArray(key);       // Get double[]

// Metadata
handle.getNativeType(key);        // Get type (CODES_TYPE_LONG, etc.)
handle.isMissing(key);            // Check if missing

// Operations
handle.clone();                   // Clone handle
handle.delete();                  // Free resources
```

## Build Options

```bash
# Release build (optimized, smaller)
python build_wasm.py --release

# Debug build (larger, with symbols)
python build_wasm.py

# Custom output directory
python build_wasm.py --output-dir /path/to/output
```

## CMake Configuration

The build script configures ecCodes with these settings:

```cmake
-DENABLE_TESTS=OFF
-DENABLE_EXAMPLES=OFF
-DENABLE_FORTRAN=OFF
-DENABLE_PYTHON=OFF
-DENABLE_BUILD_TOOLS=OFF
-DENABLE_PRODUCT_GRIB=ON
-DENABLE_PRODUCT_BUFR=ON
-DENABLE_GEOGRAPHY=ON
-DENABLE_AEC=OFF          # Disabled - compilation issues
-DENABLE_JPG=OFF          # Disabled - external dependency
-DENABLE_PNG=OFF          # Disabled - external dependency
-DENABLE_NETCDF=OFF
-DENABLE_MEMFS=ON         # Embed definitions/samples
```

## Limitations

1. **Compression**: AEC, JPEG, PNG are currently disabled due to build issues
2. **Memory**: Default max 256MB (configurable in `build_wasm.py`)
3. **File I/O**: Requires mounting Node.js filesystem to Emscripten's virtual FS
4. **Blocking**: Some operations may block the Node.js event loop

## Alternative: Rust + wasm-bindgen

See `RUST_WASM.md` for an alternative approach using Rust and `wasm-bindgen`. This provides:
- Type-safe bindings
- Better API ergonomics
- Leverages existing Rust FFI

However, it has:
- Larger binary size
- More complex build
- Requires cross-compiling C dependencies for wasm32

## Troubleshooting

### Emscripten not found

```bash
# macOS
brew install emscripten

# Or activate emsdk env
source /path/to/emsdk/emsdk_env.sh
```

### Build fails with CMake errors

Ensure you have CMake installed and that ecCodes source is valid:
```bash
cmake --version
```

### Module loading errors

Make sure you're using Node.js 18+ and the paths to `.js` and `.wasm` files are correct.

### File access errors

Remember to mount the filesystem before accessing files:
```javascript
eccodes.mountFilesystem('.');
const handle = eccodes.openGrib('/data/file.grib');
```

## Running Tests

```bash
make -f Makefile.wasm test
```

## Running Example

```bash
make -f Makefile.wasm example
```

## Resources

- [ecCodes Documentation](https://confluence.ecmwf.int/display/ECC/ecCodes+Home)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)