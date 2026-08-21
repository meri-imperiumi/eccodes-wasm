# Migration Guide: eccodes → eccodes-wasm

This guide explains how to move the WASM build setup from the eccodes repository to a separate eccodes-wasm repository.

## Overview

The WASM build doesn't belong in the upstream eccodes repository because:
1. ECMWF may not want to maintain WASM-specific code
2. The build process involves third-party dependencies (OpenJPEG, libaec)
3. It's packaging/middleware, not core library functionality
4. Separate releases are easier to manage

## Step 1: Create New Repository

```bash
# Create the new repository on GitHub first
gh repo create eccodes-wasm --public --clone
cd eccodes-wasm
```

## Step 2: Copy Files

From the eccodes repository, copy these files:

```bash
# Copy the wasm directory
cp -r /path/to/eccodes/wasm .

# Copy the Makefile (or create new one)
cp /path/to/eccodes/Makefile.wasm ./Makefile

# Copy the main README (use new one instead)
# cp /path/to/eccodes/README.md ./README.md  # Don't copy - use new README
```

## Step 3: Add New Files

```bash
# Add setup scripts
chmod +x scripts/setup.sh scripts/download.sh

# Add Makefile (created for this repo)
# Add README.md (created for this repo)
# Add .gitignore
# Add .gitmodules (for git submodule approach)
# Add LICENSE (Apache 2.0 to match ecCodes)
# Add package.json (for NPM publishing)
```

## Step 4: Setup ecCodes Source

**Option A: Git Submodule (Recommended)**

```bash
make setup TAG=2.49.0

# This will:
# 1. Add https://github.com/ecmwf/eccodes.git as submodule
# 2. Checkout the specified tag
# 3. Initialize and update submodules

# Edit .gitmodules to set your desired branch/tag
```

**Option B: Release Tarball**

```bash
make download VERSION=2.49.0

# This will:
# 1. Download from confluence.ecmwf.int
# 2. Extract to ./eccodes/
# 3. Verify the package
```

## Step 5: Build

```bash
# Test the build works
make build-jpg

# Should output to ./build/eccodes/
# - eccodes.js
# - eccodes.wasm
# - index.js (copied from wasm/eccodes.js)
# - resources/ (if not using memfs)
```

## Step 6: Test

```bash
# Run basic tests
make test

# Run example
make example
```

## Step 7: Version Management

### Tagged Releases

```bash
# Update to new ecCodes version
make setup TAG=2.50.0

# Clean build
make clean
make release

# Commit the version change
git add eccodes
git commit -m "Update ecCodes to 2.50.0"
git tag v2.50.0
git push --tags
```

### Development Branch

```bash
# Track develop branch
make setup BRANCH=develop

# Update to latest
make update-eccodes
make build-jpg
```

## Step 8: CI/CD Setup

### GitHub Actions

```yaml
name: Build WASM

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Install Emscripten
        uses: mymindsetup/setup-emscripten@v2
        with:
          version: 3.1.58

      - name: Install CMake
        uses: jwlawson/actions-setup-cmake@v2

      - name: Download ecCodes
        run: make ci-setup VERSION=${{ github.ref_name }}

      - name: Build
        run: make ci-build

      - name: Test
        run: make ci-test

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: eccodes-wasm
          path: build/eccodes/
```

## Step 9: NPM Publishing

```bash
# Update package.json version
npm version 2.49.0

# Build release
make release

# Publish to NPM
npm publish --access public
```

## Step 10: Cleanup

Remove files from the eccodes repository:

```bash
cd /path/to/eccodes

# Remove WASM-specific files
rm -rf wasm/
rm -f Makefile.wasm
```

## File Mapping

| eccodes/ | eccodes-wasm/ | Notes |
|----------|---------------|-------|
| `wasm/` | `wasm/` | Direct copy |
| `Makefile.wasm` | `Makefile` | Updated for new structure |
| - | `scripts/setup.sh` | New |
| - | `scripts/download.sh` | New |
| - | `scripts/test.sh` | New |
| - | `README.md` | New repository README |
| - | `package.json` | NPM package config |
| - | `.gitignore` | Repository-specific |
| - | `.gitmodules` | Git submodule config |
| - | `LICENSE` | Apache 2.0 |
| - | `CONTRIBUTING.md` | New |

## Notes

1. **Submodule vs Tarball**: Use submodules for development, tarballs for releases
2. **Build artifacts**: `build/` is in `.gitignore`, not committed
3. **Dependencies**: OpenJPEG and libaec are built automatically by `build_wasm.py`
4. **Resources**: With `-DENABLE_MEMFS=ON`, resources are embedded in the WASM binary

## Related Files

- `wasm/build_wasm.py` - Main build script (updated source path)
- `wasm/eccodes_wrapper.c` - C bindings (unchanged)
- `wasm/eccodes.js` - High-level JS API (unchanged)
- `wasm/package.json` - Moved to root as main `package.json`

## Verification Checklist

- [ ] Repository created on GitHub
- [ ] Files copied from eccodes/
- [ ] ecCodes source setup (submodule or tarball)
- [ ] `make build-jpg` succeeds
- [ ] `make test` passes
- [ ] `make example` runs
- [ ] `.gitignore` configured
- [ ] `README.md` complete
- [ ] `LICENSE` added
- [ ] CI/CD configured
- [ ] NPM publishing tested