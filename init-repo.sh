#!/bin/bash
# init-repo.sh - Initialize a new eccodes-wasm repository with fresh git history

set -e

REPO_NAME="${1:-eccodes-wasm}"
REPO_DIR="$PWD/$REPO_NAME"

if [ -d "$REPO_DIR" ]; then
    echo "Error: Directory $REPO_DIR already exists"
    exit 1
fi

echo "Creating new eccodes-wasm repository: $REPO_DIR"

# Create directory structure
mkdir -p "$REPO_DIR"/{wasm/{example,test},scripts,.github/workflows}

echo "✓ Created directory structure"

# Copy WASM files (from current eccodes repo)
echo "Copying WASM files..."
cp -r wasm/* "$REPO_DIR/wasm/" 2>/dev/null || {
    echo "Warning: wasm/ directory not found in current location"
    echo "You'll need to copy the wasm/ directory manually"
}

# Copy scripts (from current session)
cat > "$REPO_DIR/scripts/setup.sh" << 'SETUP_SH_EOF'
#!/bin/bash
# setup.sh - Setup ecCodes as a git submodule

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
ECCODES_DIR="${REPO_ROOT}/eccodes"

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Setup ecCodes as a git submodule.

Options:
  --tag TAG        Use specific version tag (e.g., 2.49.0)
  --branch BRANCH  Use specific branch (e.g., develop, master)
  --help           Show this help message

Examples:
  $0 --tag 2.49.0
  $0 --branch develop

EOF
    exit 1
}

TAG=""
BRANCH="master"

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            TAG="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository. Run from eccodes-wasm root."
    exit 1
fi

# Remove existing directory if it exists but isn't a git submodule
if [ -d "$ECCODES_DIR" ] && [ ! -f "$ECCODES_DIR/.git" ]; then
    echo "Removing existing eccodes directory..."
    rm -rf "$ECCODES_DIR"
fi

# Add submodule
echo "Adding ecCodes as git submodule..."
if [ -n "$TAG" ]; then
    git submodule add -b "$TAG" https://github.com/ecmwf/eccodes.git eccodes
    echo "✓ Checked out tag: $TAG"
elif [ -n "$BRANCH" ]; then
    git submodule add -b "$BRANCH" https://github.com/ecmwf/eccodes.git eccodes
    echo "✓ Checked out branch: $BRANCH"
else
    git submodule add https://github.com/ecmwf/eccodes.git eccodes
    echo "✓ Checked out default branch"
fi

# Initialize and update
git submodule update --init --recursive

echo ""
echo "✓ ecCodes submodule setup complete!"
echo "  Location: $ECCODES_DIR"
echo ""
echo "To build:"
echo "  make build"
echo ""
echo "To update to latest:"
echo "  cd eccodes && git pull && cd .."
echo ""
SETUP_SH_EOF
chmod +x "$REPO_DIR/scripts/setup.sh"

cat > "$REPO_DIR/scripts/download.sh" << 'DOWNLOAD_SH_EOF'
#!/bin/bash
# download.sh - Download and extract ecCodes release tarball

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
ECCODES_DIR="${REPO_ROOT}/eccodes"
PACKAGES_DIR="${REPO_ROOT}/packages"

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Download and extract ecCodes release tarball.

Options:
  --version VERSION   Version to download (e.g., 2.49.0)
  --url URL           Custom download URL
  --clean             Remove existing eccodes directory first
  --help              Show this help message

Examples:
  $0 --version 2.49.0
  $0 --version 2.49.0 --clean

EOF
    exit 1
}

VERSION=""
CUSTOM_URL=""
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --url)
            CUSTOM_URL="$2"
            shift 2
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Version is required
if [ -z "$VERSION" ] && [ -z "$CUSTOM_URL" ]; then
    echo "Error: --version is required"
    usage
fi

# Create packages directory
mkdir -p "$PACKAGES_DIR"

# Determine download URL
if [ -n "$CUSTOM_URL" ]; then
    URL="$CUSTOM_URL"
    FILENAME=$(basename "$URL")
else
    FILENAME="eccodes-${VERSION}-Source.tar.gz"
    URL="https://confluence.ecmwf.int/download/attachments/45757960/${FILENAME}?api=v2"
fi

PACKAGE_PATH="${PACKAGES_DIR}/${FILENAME}"

# Download
if [ -f "$PACKAGE_PATH" ]; then
    echo "Using cached package: $PACKAGE_PATH"
else
    echo "Downloading from: $URL"
    curl -L -o "$PACKAGE_PATH" "$URL"
    echo "✓ Downloaded to: $PACKAGE_PATH"
fi

# Clean existing directory if requested
if [ "$CLEAN" = true ] && [ -d "$ECCODES_DIR" ]; then
    echo "Removing existing eccodes directory..."
    rm -rf "$ECCODES_DIR"
fi

# Extract
if [ -d "$ECCODES_DIR" ]; then
    echo "eccodes directory already exists. Use --clean to replace."
else
    echo "Extracting to $ECCODES_DIR..."
    mkdir -p "$ECCODES_DIR"
    tar -xzf "$PACKAGE_PATH" -C "$REPO_ROOT" --strip-components=1
    echo "✓ Extracted to: $ECCODES_DIR"
fi

# Verify
if [ ! -f "$ECCODES_DIR/CMakeLists.txt" ] || [ ! -f "$ECCODES_DIR/VERSION" ]; then
    echo "Error: Extraction failed or invalid package"
    exit 1
fi

# Show version
ACTUAL_VERSION=$(cat "$ECCODES_DIR/VERSION" 2>/dev/null || echo "unknown")
echo ""
echo "✓ ecCodes setup complete!"
echo "  Location: $ECCODES_DIR"
echo "  Version: $ACTUAL_VERSION"
echo ""
echo "To build:"
echo "  make build"
echo ""
DOWNLOAD_SH_EOF
chmod +x "$REPO_DIR/scripts/download.sh"

cat > "$REPO_DIR/scripts/prepublish-check.js" << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build', 'eccodes');

const requiredFiles = ['eccodes.js', 'eccodes.wasm', 'index.js'];

console.log('Checking WASM build for NPM publish...');

const missing = [];
for (const file of requiredFiles) {
  const filePath = path.join(BUILD_DIR, file);
  if (!fs.existsSync(filePath)) {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error('❌ Missing build artifacts:');
  missing.forEach(f => console.error(`   - ${f}`));
  console.error('');
  console.error('Please run: make release');
  process.exit(1);
}

const wasmPath = path.join(BUILD_DIR, 'eccodes.wasm');
const wasmStats = fs.statSync(wasmPath);
const wasmSizeMB = (wasmStats.size / 1024 / 1024).toFixed(2);

console.log('✓ All required files present');
console.log(`  eccodes.wasm: ${wasmSizeMB} MB`);
console.log('');
console.log('Ready to publish to NPM');
process.exit(0);
EOF
chmod +x "$REPO_DIR/scripts/prepublish-check.js"

echo "✓ Created scripts"

# Create main files
cat > "$REPO_DIR/README.md" << 'EOF'
# eccodes-wasm

WebAssembly (WASM) build of [ECMWF ecCodes](https://github.com/ecmwf/eccodes) for Node.js and browsers.

**Package**: `@meri-imperiumi/eccodes-wasm`

Decode GRIB and BUFR meteorological data files in JavaScript using the same library trusted by weather services worldwide.

## Installation

```bash
npm install @meri-imperiumi/eccodes-wasm
```

## Quick Start

```javascript
const { createEccodes } = require('@meri-imperiumi/eccodes-wasm');

const eccodes = await createEccodes();
eccodes.mountFilesystem('.');

const handle = eccodes.openGrib('sample.grib');
console.log('Name:', handle.getString('name'));
console.log('Values:', handle.getDoubleArray('values'));
handle.delete();
```

## Documentation

- [Publishing Guide](./PUBLISHING.md)
- [Repository Structure](./REPOSITORY_STRUCTURE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

## License

Apache License 2.0

### Third-Party Licenses

- **ecCodes**: [Apache 2.0](https://github.com/ecmwf/eccodes/blob/master/LICENSE) - ECMWF
- **OpenJPEG**: [BSD 2-Clause](https://github.com/uclouvain/openjpeg/blob/master/LICENSE) - uCLouvain
- **libaec**: [BSD 2-Clause](https://gitlab.dkrz.de/k202009/libaec/-/blob/master/COPYING) - DKRZ
EOF

cat > "$REPO_DIR/LICENSE" << 'EOF'
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
EOF

echo "✓ Created README and LICENSE"

# Create GitHub Actions workflows
cat > "$REPO_DIR/.github/workflows/build.yml" << 'EOF'
name: Build WASM

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  build:
    name: Build (${{ matrix.feature }}${{ matrix.release && ' (release)' || '' }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        feature: [basic, jpg]
        release: [false, true]
        exclude:
          - feature: basic
            release: true

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Emscripten
        uses: mymindsetup/setup-emscripten@v2
        with:
          version: '3.1.58'

      - name: Install CMake
        uses: jwlawson/actions-setup-cmake@v2
        with:
          cmake-version: '3.27.x'

      - name: Setup ecCodes
        run: make download VERSION=2.49.0

      - name: Build
        run: |
          if [ "${{ matrix.feature }}" = "jpg" ]; then
            if [ "${{ matrix.release }}" = "true" ]; then
              make release
            else
              make build-jpg
            fi
          else
            make build
          fi

      - name: Test
        run: make test

      - name: Check Build
        run: node scripts/prepublish-check.js

      - name: Get WASM size
        run: |
          echo "Build configuration: ${{ matrix.feature }}${{ matrix.release && ' release' || '' }}"
          ls -lh build/eccodes/eccodes.wasm
          wc -c < build/eccodes/eccodes.wasm

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: eccodes-wasm-${{ matrix.feature }}${{ matrix.release && '-release' || '' }}
          path: build/eccodes/
          retention-days: 7
EOF

cat > "$REPO_DIR/.github/workflows/publish.yml" << 'EOF'
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'NPM package version to publish (e.g., 2.48.2); ecCodes version is pinned in the ECCODES_VERSION file'
        required: true
        type: string

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          package-manager-cache: false

      - name: Install Emscripten
        uses: mymindsetup/setup-emscripten@v2
        with:
          version: '3.1.58'

      - name: Install CMake
        uses: jwlawson/actions-setup-cmake@v2
        with:
          cmake-version: '3.27.x'

      - name: Setup ecCodes
        run: make setup TAG=$(cat ECCODES_VERSION)

      - name: Build Release
        run: make release

      - name: Run Tests
        run: make test

      - name: Pre-publish Check
        run: node scripts/prepublish-check.js

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-build
          path: build/eccodes/
          retention-days: 1

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: https://registry.npmjs.org/
          package-manager-cache: false

      - name: Sync package version
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            VERSION="${GITHUB_REF_NAME#v}"
          fi
          npm version $VERSION --no-git-tag-version --allow-same-version

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: release-build
          path: build/eccodes

      - name: Publish to NPM
        run: |
          echo "Publishing @meri-imperiumi/eccodes-wasm@$(node -p "require('./package.json').version")"
          npm publish

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            build/eccodes/eccodes.js
            build/eccodes/eccodes.wasm
          generate_release_notes: true
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
EOF

echo "✓ Created GitHub Actions workflows"

# Create .gitignore
cat > "$REPO_DIR/.gitignore" << 'EOF'
# Build outputs
build/
*.wasm
!build/wasm/eccodes/eccodes.wasm

# Packages
packages/
*.tar.gz
*.tar.bz2

# ecCodes source (when not using git submodule)
/eccodes/

# Node modules
node_modules/
package-lock.json

# Test output
test/output/

# Python cache
__pycache__/
*.pyc
.pytest_cache/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# Emscripten cache
.emscripten_cache/

# CMake
CMakeCache.txt
CMakeFiles/
cmake_install.cmake
Makefile
*.cmake
!CMakeLists.txt
EOF

echo "✓ Created .gitignore"

# Create .gitmodules
cat > "$REPO_DIR/.gitmodules" << 'EOF'
[submodule "eccodes"]
  path = eccodes
  url = https://github.com/ecmwf/eccodes.git
  branch = 2.49.0
EOF

echo "✓ Created .gitmodules"

# Create package.json
cat > "$REPO_DIR/package.json" << 'EOF'
{
  "name": "@meri-imperiumi/eccodes-wasm",
  "version": "2.49.0",
  "description": "WebAssembly (WASM) build of ECMWF ecCodes for Node.js and browsers - decode GRIB and BUFR files in JavaScript",
  "main": "index.js",
  "type": "commonjs",
  "scripts": {
    "build": "make build",
    "build:jpg": "make build-jpg",
    "build:release": "make release",
    "test": "make test",
    "example": "make example",
    "clean": "make clean",
    "clean:all": "make deep-clean",
    "setup": "make setup",
    "download": "make download",
    "prepublishOnly": "node scripts/prepublish-check.js"
  },
  "keywords": [
    "eccodes",
    "eccodes-wasm",
    "grib",
    "bufr",
    "wasm",
    "webassembly",
    "meteorological",
    "weather",
    "gridded-data",
    "ecmwf"
  ],
  "author": "ECMWF",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/meri-imperiumi/eccodes-wasm.git"
  },
  "homepage": "https://github.com/meri-imperiumi/eccodes-wasm#readme",
  "bugs": {
    "url": "https://github.com/meri-imperiumi/eccodes-wasm/issues"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "index.js",
    "build/eccodes/eccodes.js",
    "build/eccodes/eccodes.wasm",
    "build/eccodes/resources",
    "README.md",
    "LICENSE"
  ],
  "dependencies": {},
  "devDependencies": {},
  "os": [
    "darwin",
    "linux"
  ],
  "cpu": [
    "x64",
    "arm64"
  ]
}
EOF

echo "✓ Created package.json"

# Create Makefile
cat > "$REPO_DIR/Makefile" << 'EOF'
.PHONY: help setup download build build-jpg release clean deep-clean test example publish

# Pinned ecCodes version (single source of truth; also used by CI workflows)
ECCODES_VERSION ?= $(shell cat ECCODES_VERSION 2>/dev/null)

help:
	@echo "eccodes-wasm Build System"
	@echo ""
	@echo "Setup:"
	@echo "  make setup TAG=2.49.0       - Setup ecCodes as git submodule"
	@echo "  make download VERSION=2.49.0 - Download release tarball"
	@echo ""
	@echo "Build:"
	@echo "  make build                  - Build WASM (debug, AEC only)"
	@echo "  make build-jpg              - Build WASM (debug, with JPEG)"
	@echo "  make release                - Build WASM (release, with JPEG)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean                  - Clean build artifacts"
	@echo "  make deep-clean             - Remove everything including deps"
	@echo "  make test                   - Run tests"
	@echo "  make example                - Run example"
	@echo ""
	@echo "Publishing:"
	@echo "  make publish                - Publish to NPM (via OIDC)"
	@echo ""
	@echo "Variables:"
	@echo "  TAG, VERSION                - ecCodes version"
	@echo "  RELEASE=1                   - Build release (optimized)"
	@echo "  OUTPUT_DIR                  - Custom output directory"

setup:
	@./scripts/setup.sh $(if $(TAG),--tag $(TAG),$(if $(BRANCH),--branch $(BRANCH),--tag $(ECCODES_VERSION)))

download:
	@./scripts/download.sh $(if $(VERSION),--version $(VERSION),--version $(ECCODES_VERSION))

build:
	@python wasm/build_wasm.py

build-jpg:
	@python wasm/build_wasm.py --enable-jpg

release:
	@python wasm/build_wasm.py --release --enable-jpg

clean:
	rm -rf build

deep-clean: clean
	rm -rf packages eccodes

test:
	@echo "Running tests..."
	@if [ -d "build/eccodes" ]; then \
		node wasm/test/basic.js; \
	else \
		echo "Error: Build not found. Run 'make build-jpg' first."; \
		exit 1; \
	fi

example:
	@echo "Running example..."
	@if [ -d "build/eccodes" ]; then \
		node wasm/example/usage.js; \
	else \
		echo "Error: Build not found. Run 'make build-jpg' first."; \
		exit 1; \
	fi

publish:
	@echo "Publishing to NPM via OIDC..."
	@make release
	@npm publish --access public
	@echo ""
	@echo "To publish via CI, create and push a git tag:"
	@echo "  git tag v2.49.0 && git push origin v2.49.0"
	@echo ""
	@echo "To publish manually, create an OIDC token:"
	@echo "  npm token create --ci"
	@echo "  npm config set //registry.npmjs.org/:_authToken <token>"
	@echo "  npm publish --access public"

show-version:
	@if [ -f "eccodes/VERSION" ]; then \
		echo "ecCodes version: $$(cat eccodes/VERSION)"; \
	else \
		echo "Error: ecCodes not found. Run 'make setup' or 'make download'."; \
	fi
EOF

echo "✓ Created Makefile"

# Create ECCODES_VERSION pin (ecCodes version CI builds against)
printf '2.49.0\n' > "$REPO_DIR/ECCODES_VERSION"
echo "✓ Created ECCODES_VERSION"

# Initialize git repository
cd "$REPO_DIR"
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

echo "✓ Initialized git repository"

# Create initial commit
git add .
git commit -m "Initial commit: eccodes-wasm setup with OIDC publishing

- WASM build configuration for ecCodes
- Support for AEC and JPEG compression
- NPM package: @meri-imperiumi/eccodes-wasm
- GitHub Actions for CI/CD and publishing
- OIDC-based NPM publishing (no tokens)
"

echo "✓ Created initial commit"

cd - > /dev/null

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✓ eccodes-wasm repository created successfully!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Location: $REPO_DIR"
echo ""
echo "Next steps:"
echo "  cd $REPO_DIR"
echo ""
echo "  # Option 1: Git submodule (recommended for development)"
echo "  make setup TAG=2.49.0"
echo ""
echo "  # Option 2: Release tarball (recommended for production)"
echo "  make download VERSION=2.49.0"
echo ""
echo "  # Build"
echo "  make build-jpg"
echo ""
echo "  # Test"
echo "  make test"
echo ""
echo "  # Push to GitHub"
echo "  gh repo create meri-imperiumi/eccodes-wasm --public --source=. --push"
echo ""
echo "Note: You need to copy the wasm/ directory from eccodes repository:"
echo "  cp -r /path/to/eccodes/wasm/* $REPO_DIR/wasm/"
echo ""
echo "Or initialize with wasm files if available in current directory:"
echo "  cp -r wasm/* $REPO_DIR/wasm/"
echo ""