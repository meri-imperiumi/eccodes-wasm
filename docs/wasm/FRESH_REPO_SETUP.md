# Fresh eccodes-wasm Repository Setup

## Overview

Instead of modifying the existing `eccodes` repository, we create a completely new repository with fresh git history. The ecCodes source is brought in either via:

1. **Git submodule** - Recommended for development
2. **Release tarball** - Recommended for production

## Quick Start

### 1. Run the initialization script

```bash
./init-repo.sh eccodes-wasm
```

This creates a new directory with:
- Clean git history
- All necessary files
- GitHub Actions workflows
- NPM publishing setup with OIDC

### 2. Copy WASM files

The script creates the structure but you need to copy the WASM files:

```bash
cd eccodes-wasm

# If wasm/ exists in current directory
cp -r ../wasm/* wasm/

# Or from the eccodes repository
cp -r /path/to/eccodes/wasm/* wasm/
```

### 3. Setup ecCodes source

**Option A: Git Submodule**
```bash
make setup TAG=2.49.0
```

**Option B: Release Tarball**
```bash
make download VERSION=2.49.0
```

### 4. Build

```bash
make build-jpg
```

### 5. Push to GitHub

```bash
gh repo create meri-imperiumi/eccodes-wasm --public --source=. --push
```

## Repository Structure

```
eccodes-wasm/                    # Fresh git history
├── eccodes/                     # ecCodes source (submodule OR extracted)
├── wasm/                        # WASM build configuration
│   ├── build_wasm.py
│   ├── eccodes_wrapper.c
│   ├── eccodes.js
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── RUST_WASM.md
│   ├── package.json
│   ├── example/
│   └── test/
├── scripts/                     # Helper scripts
│   ├── setup.sh                # Git submodule setup
│   ├── download.sh             # Release tarball download
│   ├── prepublish-check.js     # Pre-publish validation
│   └── version.js              # Version sync
├── .github/workflows/          # CI/CD
│   ├── build.yml              # Build and test
│   └── publish.yml            # Publish to NPM via OIDC
├── Makefile                    # Build targets
├── package.json                # NPM package config
├── README.md                   # Main README
├── LICENSE                     # Apache 2.0
├── .gitignore                  # Git ignore
├── .gitmodules                 # Git submodule config
└── init-repo.sh               # This script
```

## Files Created by init-repo.sh

| File | Purpose |
|------|---------|
| `README.md` | Main repository documentation |
| `LICENSE` | Apache 2.0 license |
| `.gitignore` | Git ignore patterns |
| `.gitmodules` | Git submodule configuration |
| `package.json` | NPM package (`@meri-imperiumi/eccodes-wasm`) |
| `Makefile` | Build targets |
| `scripts/setup.sh` | Git submodule setup |
| `scripts/download.sh` | Release tarball download |
| `scripts/prepublish-check.js` | Pre-publish validation |
| `scripts/version.js` | Version sync |
| `.github/workflows/build.yml` | CI/CD build workflow |
| `.github/workflows/publish.yml` | OIDC publishing workflow |

## Files to Copy Manually

From the eccodes repository:

```bash
cp -r /path/to/eccodes/wasm/* eccodes-wasm/wasm/
```

Required files:
- `wasm/build_wasm.py`
- `wasm/eccodes_wrapper.c`
- `wasm/eccodes.js`
- `wasm/package.json`
- `wasm/README.md`
- `wasm/QUICKSTART.md`
- `wasm/RUST_WASM.md`
- `wasm/example/usage.js`
- `wasm/test/basic.js`
- `wasm/test/jpeg.js`

## Git History

The new repository has completely fresh git history:

```bash
cd eccodes-wasm
git log

# Output:
# commit <hash> (HEAD -> main)
# Author: Your Name <your.email@example.com>
# Date: <timestamp>
#
#     Initial commit: eccodes-wasm setup with OIDC publishing
```

## ecCodes Source Options

### Option 1: Git Submodule (Recommended for Development)

**Pros:**
- Easy version switching
- Can contribute patches back
- Git tracks exact commit

**Cons:**
- Larger clone size
- Requires `git submodule` commands

**Setup:**
```bash
make setup TAG=2.49.0

# Or from .gitmodules:
git submodule update --init --recursive
```

**Update:**
```bash
cd eccodes
git checkout 2.50.0
cd ..
git add eccodes
git commit -m "Update ecCodes to 2.50.0"
```

### Option 2: Release Tarball (Recommended for Production)

**Pros:**
- Smaller repository size
- Official releases only
- No git history bloat

**Cons:**
- Manual updates
- Can't easily patch

**Setup:**
```bash
make download VERSION=2.49.0

# Or:
./scripts/download.sh --version 2.49.0
```

**Update:**
```bash
make download VERSION=2.50.0 --clean
```

## Build Commands

```bash
make              # Show help
make build         # Debug, AEC only
make build-jpg     # Debug, AEC + JPEG
make release       # Release, AEC + JPEG
make test          # Run tests
make example       # Run example
make clean         # Clean build artifacts
make deep-clean    # Remove everything including deps
make show-version  # Show ecCodes version
```

## Publishing

### Automated (Recommended)

```bash
# Create tag and push
git tag v2.49.0
git push origin v2.49.0

# GitHub Actions handles the rest:
# - Builds WASM
# - Runs tests
# - Publishes to NPM via OIDC
# - Creates GitHub release
```

### Manual

```bash
make release
npm run version
npm token create --ci
npm config set //registry.npmjs.org/:_authToken <token>
npm publish --access public
```

## GitHub Repository Setup

### Create Repository

```bash
# Using GitHub CLI
gh repo create meri-imperiumi/eccodes-wasm --public --source=. --push

# Or manually:
# 1. Create repository on GitHub
# 2. Add remote
git remote add origin https://github.com/meri-imperiumi/eccodes-wasm.git
# 3. Push
git push -u origin main
```

### Configure OIDC for NPM

1. Visit: https://www.npmjs.com/settings/meri-imperiumi/organizations
2. Go to "Publishing" or "Integrations"
3. Add GitHub Actions as OIDC publisher

### Update .gitmodules (if using submodules)

Edit `.gitmodules` to set desired version:
```gitmodules
[submodule "eccodes"]
  path = eccodes
  url = https://github.com/ecmwf/eccodes.git
  branch = 2.49.0
```

## Troubleshooting

### wasm/ directory is empty

The init script creates the directory structure but doesn't copy files:

```bash
# Copy from current eccodes repo
cp -r ../wasm/* eccodes-wasm/wasm/

# Or from eccodes repository
cp -r /path/to/eccodes/wasm/* eccodes-wasm/wasm/
```

### ecCodes not found

```bash
# Setup ecCodes source
make setup TAG=2.49.0
# OR
make download VERSION=2.49.0
```

### Build fails with Emscripten not found

```bash
# Install Emscripten
brew install emscripten  # macOS
# or download from https://emscripten.org/

# Verify
emcc --version
```

### Submodule not initialized

```bash
git submodule update --init --recursive
```

## Verification

```bash
cd eccodes-wasm

# Check git history
git log --oneline

# Check structure
ls -la

# Check ecCodes source
ls eccodes/  # or make setup/download first

# Check scripts
ls scripts/

# Try building
make build-jpg
```

## Next Steps

1. ✅ Run `./init-repo.sh eccodes-wasm`
2. ⏳ Copy `wasm/` files from eccodes repository
3. ⏳ Setup ecCodes source (`make setup` or `make download`)
4. ⏳ Build and test (`make build-jpg && make test`)
5. ⏳ Push to GitHub (`gh repo create ...`)
6. ⏳ Configure NPM OIDC publishing
7. ⏳ Create initial release tag
8. ⏳ Verify NPM package

## Related Files

- `PUBLISHING.md` - NPM publishing guide
- `REPOSITORY_STRUCTURE.md` - Structure documentation
- `MIGRATION_GUIDE.md` - Migration from eccodes repo