# eccodes-wasm File Organization

This document shows the file organization created during this session.

## Overview

Files have been organized in the current eccodes repository as follows:

```
eccodes/                          # Current repository (ECMWF's eccodes)
│
├── wasm/                         # WASM build configuration
│   ├── build_wasm.py             # Main build script
│   ├── eccodes_wrapper.c         # C bindings
│   ├── eccodes.js                # High-level JS API
│   ├── package.json              # NPM package config (wasm dir)
│   ├── README.md                 # WASM-specific docs
│   ├── QUICKSTART.md             # Quick start guide
│   ├── RUST_WASM.md              # Rust+wasm-bindgen alternative
│   ├── .gitignore                # WASM-specific gitignore
│   ├── example/
│   │   └── usage.js              # Usage example
│   └── test/
│       ├── basic.js              # Basic tests
│       └── jpeg.js               # JPEG tests
│
├── scripts/                      # Setup scripts
│   ├── setup.sh                  # Git submodule setup
│   ├── download.sh               # Release tarball download
│   └── prepublish-check.js       # Pre-publish validation
│
├── docs/wasm/                    # Documentation
│   ├── README.md                 # WASM README
│   ├── QUICKSTART.md             # (copy from wasm/)
│   ├── ECCODES_WASM_REPO_PLAN.md # Repository plan
│   ├── FRESH_REPO_SETUP.md       # Fresh repo setup guide
│   ├── MIGRATION_GUIDE.md        # Migration from eccodes/
│   ├── PUBLISHING.md              # OIDC publishing guide
│   ├── PUBLISHING_OIDC_SUMMARY.md # OIDC changes summary
│   ├── REPOSITORY_STRUCTURE.md   # Complete structure docs
│   └── SETUP_SUMMARY.md          # Session summary
│
├── .github/workflows/            # CI/CD
│   ├── build.yml                 # Build and test workflow
│   └── publish.yml               # OIDC publishing workflow
│
├── Makefile                      # Build targets (for eccodes-wasm)
│
├── package.json                  # NPM package config (root)
│                                 # @meri-imperiumi/eccodes-wasm
│
├── ECCODES_VERSION               # Pinned ecCodes version for CI builds
│
├── README_WASM.md                # WASM repository README (for new repo)
│
├── init-repo.sh                  # Initialize new eccodes-wasm repository
│
└── .gitmodules                   # Git submodule config (for new repo)
```

## Files Created This Session

### WASM Build Configuration
- `wasm/build_wasm.py` - Main build script with JPEG/AEC support
- `wasm/eccodes_wrapper.c` - C wrapper with EMSCRIPTEN_KEEPALIVE functions
- `wasm/eccodes.js` - High-level JavaScript API wrapper

### Scripts
- `scripts/setup.sh` - Setup ecCodes as git submodule
- `scripts/download.sh` - Download release tarball
- `scripts/prepublish-check.js` - Validate build before publish

### CI/CD
- `.github/workflows/build.yml` - Build, test, and report
- `.github/workflows/publish.yml` - OIDC-based NPM publishing

### Documentation
- `docs/wasm/README.md` - WASM documentation
- `docs/wasm/QUICKSTART.md` - Quick start guide
- `docs/wasm/RUST_WASM.md` - Rust+wasm-bindgen alternative
- `docs/wasm/ECCODES_WASM_REPO_PLAN.md` - Original plan
- `docs/wasm/FRESH_REPO_SETUP.md` - Fresh repository setup
- `docs/wasm/MIGRATION_GUIDE.md` - Migration from eccodes/
- `docs/wasm/PUBLISHING.md` - OIDC publishing guide
- `docs/wasm/PUBLISHING_OIDC_SUMMARY.md` - OIDC changes
- `docs/wasm/REPOSITORY_STRUCTURE.md` - Structure documentation
- `docs/wasm/SETUP_SUMMARY.md` - Session summary

### New Repository Files
- `Makefile` - Build targets for eccodes-wasm
- `package.json` - NPM package (@meri-imperiumi/eccodes-wasm)
- `README_WASM.md` - Main README for new repo
- `init-repo.sh` - Initialize fresh eccodes-wasm repository
- `.gitmodules` - Git submodule configuration

## Next Steps

### Option A: Use init-repo.sh to Create Fresh Repository

```bash
./init-repo.sh eccodes-wasm
cd eccodes-wasm
# wasm/ files are already copied
make setup TAG=2.49.0
make build-jpg
gh repo create meri-imperiumi/eccodes-wasm --public --source=. --push
```

### Option B: Manually Create New Repository

1. Create new repository on GitHub
2. Copy the following files:
   - `wasm/`
   - `scripts/`
   - `docs/wasm/`
   - `.github/workflows/build.yml`
   - `.github/workflows/publish.yml`
   - `Makefile`
   - `package.json`
   - `README_WASM.md` → `README.md`
   - `LICENSE`
   - `.gitignore`
   - `.gitmodules`
   - `init-repo.sh`

3. Initialize git and push

### Option C: Keep as eccodes Subdirectory

Leave files as-is in eccodes/ for reference and later extraction.

## Note on Files in eccodes/ Repository

The files created in this session are in the ECMWF eccodes repository. This is intentional for:
- Reference during development
- Easy access to ecCodes source for builds
- Future extraction to separate repository

The eccodes maintainers may or may not want these WASM files in the main repository. If they don't, use `init-repo.sh` to create a separate repository.

## Key Features Implemented

- ✅ JPEG support via OpenJPEG
- ✅ AEC compression via libaec
- ✅ OIDC-based NPM publishing (no tokens)
- ✅ Package: `@meri-imperiumi/eccodes-wasm`
- ✅ GitHub Actions CI/CD
- ✅ Git submodule or release tarball support
- ✅ Fresh repository setup script