# eccodes-wasm

WebAssembly (WASM) build of ECMWF ecCodes for Node.js and browsers.

**NPM Package**: `@meri-imperiumi/eccodes-wasm`

This repository packages the [ecCodes](https://github.com/ecmwf/eccodes) C library as WebAssembly, providing JavaScript bindings for decoding GRIB and BUFR files.

## Repository Structure

```
eccodes-wasm/
├── eccodes/               # ecCodes source (git submodule or extracted)
├── deps/                  # External dependencies (OpenJPEG, libaec)
├── wasm/                  # WASM build setup
│   ├── build_wasm.py      # Main build script
│   ├── eccodes_wrapper.c  # C wrapper
│   ├── eccodes.js         # High-level JS API
│   ├── package.json       # NPM package
│   └── ...
├── scripts/               # Helper scripts
│   ├── setup.sh          # Clone/update ecCodes
│   ├── download.sh       # Download release tarball
│   └── test.sh           # Run tests
├── .gitmodules           # Git submodule config
├── Makefile              # Convenience build targets
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Emscripten 3.1+ (`brew install emscripten` on macOS)
- CMake 3.20+

### Setup

**Option 1: Using Git Submodule (recommended for development)**
```bash
git clone https://github.com/yourusername/eccodes-wasm.git
cd eccodes-wasm
./scripts/setup.sh --tag 2.49.0    # or --branch develop
```

**Option 2: Using Release Tarball (recommended for production)**
```bash
git clone https://github.com/yourusername/eccodes-wasm.git
cd eccodes-wasm
./scripts/download.sh --version 2.49.0
```

### Build

```bash
# Basic build (AEC compression only)
make build

# Build with JPEG support (longer build, ~15-20 min)
make build-jpg

# Release build (optimized)
make build-jpg RELEASE=1
```

### Usage

```bash
npm install
npm test
```

```javascript
const { createEccodes } = require('@meri-imperiumi/eccodes-wasm');

const eccodes = await createEccodes();
eccodes.mountFilesystem('.');

const handle = eccodes.openGrib('data/sample.grib');
console.log('name:', handle.getString('name'));
console.log('values:', handle.getDoubleArray('values'));
handle.delete();
```

## Build Options

| Option | Flag | Description |
|--------|------|-------------|
| Release | `--release` | Optimized build with `-O3` |
| JPEG | `--enable-jpg` | Build with OpenJPEG support |
| AEC | `--disable-aec` | Disable AEC compression |
| Output | `--output-dir` | Custom output directory |

## Compression Support

| Codec | Default | Build Time | Notes |
|-------|---------|------------|-------|
| AEC | ✅ Yes | +2-3 min | Adaptive Entropy Coding |
| JPEG | ❌ No | +8-10 min | Use `--enable-jpg` |
| PNG | ❌ No | - | Not yet supported |

## Development

### Update ecCodes Version

```bash
# Using git submodule
./scripts/setup.sh --tag 2.50.0

# Using release tarball
./scripts/download.sh --version 2.50.0
```

### Clean Build

```bash
make clean
make build-jpg
```

## License

Apache License 2.0 - See LICENSE file

### Source Licenses

- ecCodes: [Apache 2.0](https://github.com/ecmwf/eccodes/blob/master/LICENSE)
- OpenJPEG: [BSD 2-Clause](https://github.com/uclouvain/openjpeg/blob/master/LICENSE)
- libaec: [BSD 2-Clause](https://gitlab.dkrz.de/k202009/libaec/-/blob/master/COPYING)