# eccodes-wasm Setup Summary

This is a complete plan for creating a separate `eccodes-wasm` repository to package ecCodes as WebAssembly.

## What Was Created

### Core Repository Files

| File | Purpose |
|------|---------|
| `README.md` | Main repository README |
| `LICENSE` | Apache 2.0 license |
| `.gitignore` | Git ignore patterns |
| `.gitmodules` | Git submodule config |
| `package.json` | NPM package config |
| `Makefile` | Build targets |
| `MIGRATION_GUIDE.md` | Guide to move code from eccodes/ |
| `REPOSITORY_STRUCTURE.md` | Repository structure documentation |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup.sh` | Setup ecCodes as git submodule |
| `scripts/download.sh` | Download release tarball |

### WASM Build Files (unchanged from eccodes/)

| File | Purpose |
|------|---------|
| `wasm/build_wasm.py` | Main build script (updated for new structure) |
| `wasm/eccodes_wrapper.c` | C bindings |
| `wasm/eccodes.js` | High-level JS API |
| `wasm/package.json` | NPM package (for wasm/ subdir) |
| `wasm/README.md` | WASM-specific docs |
| `wasm/QUICKSTART.md` | Quick start guide |
| `wasm/RUST_WASM.md` | Rust+wasm-bindgen alternative |
| `wasm/example/usage.js` | Usage example |
| `wasm/test/basic.js` | Basic tests |
| `wasm/test/jpeg.js` | JPEG test |

## Quick Start

```bash
# 1. Create new GitHub repository
gh repo create eccodes-wasm --public --clone
cd eccodes-wasm

# 2. Copy files created in this session
# (copy all files listed above)

# 3. Setup ecCodes source
make setup TAG=2.49.0
# OR
make download VERSION=2.49.0

# 4. Build
make build-jpg

# 5. Test
make test
```

## Key Changes from eccodes/ Repository

### 1. Source Location

**Old (in eccodes/):**
```python
source_dir = Path(args.source_dir).resolve()  # Default: ".."
```

**New (in eccodes-wasm/):**
```python
source_dir = (repo_root / args.source_dir).resolve()  # Default: "eccodes"
```

### 2. Output Location

**Old:**
```python
output_dir = Path(args.output_dir).resolve()  # Default: "build/wasm"
```

**New:**
```python
output_dir = (repo_root / args.output_dir).resolve()  # Default: "build"
```

### 3. ecCodes Source Verification

Added `check_eccodes_source()` function that:
- Checks if `eccodes/` directory exists
- Validates required files (`CMakeLists.txt`, `VERSION`)
- Provides helpful error messages with setup instructions

### 4. Wrapper Output Location

Updated to copy `eccodes.js` as `index.js` to match NPM conventions:
```python
js_wrapper = script_dir / "eccodes.js"
if js_wrapper.exists():
    shutil.copy(js_wrapper, final_output / "index.js")
```

## Migration Steps

### Step 1: Create New Repository

```bash
gh repo create eccodes-wasm --public --clone
cd eccodes-wasm
```

### Step 2: Copy Files

From the current eccodes repository:
```bash
# Copy wasm directory
cp -r /path/to/eccodes/wasm .

# Make scripts executable
chmod +x scripts/setup.sh scripts/download.sh wasm/build_wasm.py
```

From this planning session:
```bash
# Copy new repository files
cp README.md LICENSE .gitignore package.json Makefile .gitmodules .
cp MIGRATION_GUIDE.md REPOSITORY_STRUCTURE.md .

# Copy scripts
mkdir -p scripts
cp setup.sh download.sh scripts/
chmod +x scripts/*.sh
```

### Step 3: Setup ecCodes Source

```bash
# Option A: Git submodule (recommended)
make setup TAG=2.49.0

# Edit .gitmodules to set desired version:
# [submodule "eccodes"]
#   path = eccodes
#   url = https://github.com/ecmwf/eccodes.git
#   branch = 2.49.0

# Option B: Release tarball
make download VERSION=2.49.0
```

### Step 4: Initial Build

```bash
make build-jpg
```

Expected output:
```
Emscripten found: 3.1.xx
ecCodes source found: 2.49.0
Building libaec for WASM...
Building OpenJPEG for WASM...
Configuring ecCodes 2.49.0 with Emscripten...
Building ecCodes 2.49.0...
Installing ecCodes...
Creating WASM module...
Copied eccodes.js to build/eccodes/eccodes.js
Copied eccodes.wasm to build/eccodes/eccodes.wasm
Copied index.js to build/eccodes/index.js

✓ WASM build complete!
  ecCodes version: 2.49.0
  Output: build/eccodes
  Features: JPG=True, AEC=True
```

### Step 5: Test

```bash
make test
```

### Step 6: Commit

```bash
git add .
git commit -m "Initial eccodes-wasm setup"
git push origin main
```

### Step 7: Setup CI/CD

Create `.github/workflows/build.yml`:
```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - uses: mymindsetup/setup-emscripten@v2
        with:
          version: 3.1.58

      - name: Build
        run: make build-jpg

      - name: Test
        run: make test
```

## File Summary

### Files to Copy from eccodes/

```
wasm/
├── build_wasm.py        (modified)
├── eccodes_wrapper.c    (unchanged)
├── eccodes.js           (unchanged)
├── package.json         (unchanged)
├── README.md            (unchanged)
├── QUICKSTART.md        (unchanged)
├── RUST_WASM.md         (unchanged)
├── example/             (unchanged)
└── test/                (unchanged)
```

### Files Created (New)

```
.
├── README.md                    (main repo README)
├── LICENSE                      (Apache 2.0)
├── .gitignore                   (gitignore patterns)
├── .gitmodules                  (submodule config)
├── package.json                 (NPM config)
├── Makefile                     (build targets)
├── MIGRATION_GUIDE.md           (migration guide)
├── REPOSITORY_STRUCTURE.md      (structure docs)
├── scripts/
│   ├── setup.sh                (submodule setup)
│   └── download.sh             (download releases)
└── ECCODES_WASM_REPO_PLAN.md   (this plan)
```

## NPM Publishing

Once the repository is set up:

```bash
# Build release
make release

# Update version
npm version 2.49.0

# Publish
npm publish --access public
```

Published as: `@eccodes/wasm`

## Next Steps

1. ✅ Review all created files
2. ⏳ Create GitHub repository
3. ⏳ Copy files to new repository
4. ⏳ Setup ecCodes source (submodule or tarball)
5. ⏳ Run initial build
6. ⏳ Test build output
7. ⏳ Setup CI/CD
8. ⏳ Publish to NPM
9. ⏳ Update documentation
10. ⏳ Cleanup eccodes/ repository

## Questions?

- **Why separate repo?** See README.md rationale
- **Submodule vs tarball?** Use submodules for dev, tarballs for releases
- **JPEG support?** Use `--enable-jpg` flag
- **Build times?** ~5-20 min depending on options