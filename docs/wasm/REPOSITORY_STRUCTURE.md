# eccodes-wasm Repository Structure

This document describes the new eccodes-wasm repository structure, which is separate from the upstream eccodes C library.

## Why Separate Repository?

The WASM packaging should be in its own repository because:

1. **Upstream concerns** - ECMWF may not want to maintain WASM-specific build code in the main eccodes repo
2. **Packaging scope** - WASM build involves third-party dependencies and is packaging/middleware, not core library
3. **Release cycles** - Separate releases for WASM packages can be managed independently
4. **Clear responsibility** - Packaging issues are separate from library bugs

## Repository Structure

```
eccodes-wasm/
├── eccodes/                  # ecCodes source (git submodule or extracted)
│   ├── CMakeLists.txt
│   ├── VERSION
│   ├── src/
│   ├── definitions/
│   └── ...
├── wasm/                     # WASM build configuration
│   ├── build_wasm.py         # Main build script (Python)
│   ├── eccodes_wrapper.c     # C bindings with EMSCRIPTEN_KEEPALIVE
│   ├── eccodes.js            # High-level JavaScript API
│   ├── package.json          # NPM package (for wasm/ subdir)
│   ├── README.md             # WASM-specific docs
│   ├── QUICKSTART.md         # Quick start guide
│   ├── RUST_WASM.md          # Rust+wasm-bindgen alternative
│   ├── example/              # Usage examples
│   │   └── usage.js
│   └── test/                 # Tests
│       ├── basic.js
│       └── jpeg.js
├── scripts/                  # Helper scripts
│   ├── setup.sh              # Setup ecCodes as git submodule
│   ├── download.sh           # Download release tarball
│   └── test.sh               # Run tests
├── packages/                 # Downloaded release tarballs (gitignored)
├── build/                    # Build output (gitignored)
│   ├── build/                # CMake build dirs
│   ├── install/              # CMake install dirs
│   └── eccodes/              # Final WASM output
│       ├── eccodes.js        # Generated Emscripten glue
│       ├── eccodes.wasm      # WASM binary
│       ├── index.js          # High-level API (copied)
│       └── resources/        # Definitions/samples
├── Makefile                  # Convenience build targets
├── package.json              # NPM package config
├── .gitignore                # Git ignore patterns
├── .gitmodules               # Git submodule configuration
├── README.md                 # Main repository README
├── LICENSE                   # Apache 2.0
├── MIGRATION_GUIDE.md        # Guide to migrate from eccodes/
└── CONTRIBUTING.md           # Contribution guidelines
```

## Getting ecCodes Source

### Option 1: Git Submodule (Recommended for Development)

```bash
./scripts/setup.sh --tag 2.49.0

# This:
# 1. Adds https://github.com/ecmwf/eccodes.git as git submodule
# 2. Checks out the specified tag
# 3. Initializes and updates submodules
```

**Pros:**
- Easy to update to new versions
- Git tracks specific commits
- Can contribute back to ecCodes

**Cons:**
- Requires full git history download
- Larger repository size
- Must manage submodule separately

### Option 2: Release Tarball (Recommended for Production)

```bash
./scripts/download.sh --version 2.49.0

# This:
# 1. Downloads from confluence.ecmwf.int
# 2. Extracts to ./eccodes/
# 3. Verifies the package
```

**Pros:**
- Smaller download
- Official releases only
- Better for reproducibility

**Cons:**
- Manual updates needed
- Can't easily contribute patches

## Build Process

```
1. Check prerequisites (Emscripten, CMake)
2. Verify ecCodes source exists
3. Clone/build dependencies (OpenJPEG, libaec)
4. Configure ecCodes with CMake (emcmake)
5. Build ecCodes (emcmake cmake --build)
6. Install ecCodes (cmake --install)
7. Build WASM module (emcc)
8. Copy to final output location
```

## Makefile Targets

```bash
# Setup
make setup TAG=2.49.0        # Setup git submodule
make download VERSION=2.49.0 # Download release

# Build
make build                   # Debug, AEC only
make build-jpg               # Debug, AEC + JPEG
make release                 # Release, AEC + JPEG

# Testing
make test                    # Run tests
make example                 # Run example

# Maintenance
make clean                   # Clean build artifacts
make deep-clean              # Remove everything including deps
make update-eccodes          # Update git submodule
make show-version            # Show ecCodes version
```

## Direct Build Commands

```bash
# Using the Python script directly
python wasm/build_wasm.py
python wasm/build_wasm.py --release --enable-jpg
python wasm/build_wasm.py --disable-aec

# Using NPM
npm run build
npm run build:jpg
npm run build:release
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMCC_DEBUG` | Emscripten debug output | unset |
| `CMAKE_BUILD_PARALLEL_LEVEL` | CMake parallel jobs | cpu count |
| `EMCC_CFLAGS` | Extra Emscripten C flags | unset |
| `EMCC_LDFLAGS` | Extra Emscripten link flags | unset |

## Compression Support

| Codec | Flag | Library | Version | Status |
|-------|------|---------|---------|--------|
| AEC | Default | libaec | 1.1.4 | ✅ |
| JPEG | --enable-jpg | OpenJPEG | 2.5.2 | ✅ |
| PNG | - | libpng | - | ⏳ |

## Output Files

```
build/eccodes/
├── eccodes.js          # ~100 KB - Emscripten glue
├── eccodes.wasm        # ~5-10 MB - Main WASM binary
├── index.js            # ~8 KB - High-level API
└── resources/          # Optional (if memfs disabled)
    ├── definitions/
    └── samples/
```

## Version Bumping

```bash
# Update ecCodes
make setup TAG=2.50.0

# Update NPM package
npm version 2.50.0

# Build release
make release

# Commit and tag
git add eccodes package.json
git commit -m "Release 2.50.0"
git tag v2.50.0
git push origin main --tags

# Publish to NPM
npm publish --access public
```

## Testing

### Unit Tests

```bash
make test
# or
node wasm/test/basic.js
```

### Integration Tests

```bash
make example
# or
node wasm/example/usage.js
```

### Manual Testing

```bash
node -e "
const { createEccodes } = require('./build/eccodes/index.js');
createEccodes().then(e => {
  console.log('Version:', e.getVersion());
  console.log('✓ Module loaded');
});
"
```

## CI/CD

### GitHub Actions

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - uses: mymindsetup/setup-emscripten@v2
      - uses: jwlawson/actions-setup-cmake@v2

      - name: Download ecCodes
        run: make ci-setup VERSION=2.49.0

      - name: Build
        run: make ci-build

      - name: Test
        run: make ci-test

      - name: Upload
        uses: actions/upload-artifact@v4
        with:
          name: eccodes-wasm
          path: build/eccodes/
```

## NPM Publishing

The package is published as `@eccodes/wasm`:

```bash
# From root directory
npm publish --access public
```

Package contents (from `package.json`):
- `index.js`
- `build/eccodes/eccodes.js`
- `build/eccodes/eccodes.wasm`
- `build/eccodes/resources/`
- `README.md`
- `LICENSE`

## File Locations in New Structure

| Old (in eccodes/) | New (in eccodes-wasm/) |
|-------------------|------------------------|
| `wasm/build_wasm.py` | `wasm/build_wasm.py` (same) |
| `wasm/eccodes_wrapper.c` | `wasm/eccodes_wrapper.c` (same) |
| `wasm/eccodes.js` | `wasm/eccodes.js` (same) |
| `wasm/package.json` | `package.json` (moved to root) |
| `Makefile.wasm` | `Makefile` (renamed, updated) |
| `wasm/README.md` | `wasm/README.md` (kept as WASM docs) |
| `wasm/QUICKSTART.md` | `wasm/QUICKSTART.md` (same) |
| `wasm/example/` | `wasm/example/` (same) |
| `wasm/test/` | `wasm/test/` (same) |
| - | `scripts/setup.sh` (new) |
| - | `scripts/download.sh` (new) |
| - | `scripts/test.sh` (new) |
| - | `README.md` (new, main repo README) |
| - | `.gitignore` (new) |
| - | `.gitmodules` (new) |
| - | `LICENSE` (new) |
| - | `MIGRATION_GUIDE.md` (new) |
| - | `CONTRIBUTING.md` (new) |
| `../` (ecCodes source) | `eccodes/` (submodule or extracted) |