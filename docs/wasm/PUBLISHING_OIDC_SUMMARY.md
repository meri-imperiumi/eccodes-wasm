# NPM Publishing Setup - Summary

## Changes Made for OIDC Publishing

### 1. Removed Token-Based Auth

**Deleted:**
- `.npmrc` file (contained `NODE_AUTH_TOKEN` reference)

### 2. Updated GitHub Actions Workflow

**File**: `.github/workflows/publish.yml`

**Key changes:**
```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read
  # No: NODE_AUTH_TOKEN secret

steps:
  - uses: actions/setup-node@v4
    with:
      registry-url: https://registry.npmjs.org/  # Triggers OIDC
      # No: NODE_AUTH_TOKEN env var

  - run: npm publish  # OIDC token used automatically
```

### 3. Updated .gitignore

Removed `.npmrc` from exclusion (no longer needed)

### 4. Updated Documentation

**File**: `PUBLISHING.md`
- Removed all references to `NPM_TOKEN` secret
- Added OIDC setup instructions
- Updated troubleshooting section for OIDC
- Added OIDC benefits section

### 5. Updated Makefile

Added `publish` target that explains OIDC publishing:
```bash
make publish
```

Shows both CI and manual publishing methods.

## How OIDC Publishing Works

### In GitHub Actions (Recommended)

```yaml
permissions:
  id-token: write  # 1. Enable OIDC

steps:
  - uses: actions/setup-node@v4
    with:
      registry-url: https://registry.npmjs.org/  # 2. Configure registry

  - run: npm publish  # 3. OIDC token auto-used
```

**Flow:**
1. GitHub generates an OIDC token for the workflow
2. `actions/setup-node@v4` exchanges it for an npm token
3. `npm publish` uses the token automatically
4. Token is ephemeral and auto-expires

### Manual Publishing

```bash
# 1. Create OIDC token
npm token create --ci

# 2. Configure npm (if needed)
npm config set //registry.npmjs.org/:_authToken <token>

# 3. Publish
npm publish --access public
```

## One-Time Setup

### 1. Configure npm Organization

1. Visit: https://www.npmjs.com/settings/meri-imperiumi/organizations
2. Navigate to "Publishing" or "Integrations"
3. Add GitHub Actions as an OIDC publisher

Or via CLI:
```bash
npm token create --ci
```

### 2. Verify GitHub Settings

The workflow already has correct permissions:
```yaml
permissions:
  id-token: write  # ✓
  contents: read
```

## Publishing Process

### Automated (Recommended)

```bash
# Create and push tag
git tag v2.49.0
git push origin v2.49.0

# GitHub Actions handles the rest:
# 1. Downloads ecCodes
# 2. Builds WASM
# 3. Runs tests
# 4. Publishes via OIDC
# 5. Creates GitHub release
```

### Manual

```bash
# Build and test
make release
make test

# Sync version
npm run version

# Create OIDC token and publish
npm token create --ci
npm config set //registry.npmjs.org/:_authToken <token>
npm publish --access public
```

## Package Name

**Full package name**: `@meri-imperiumi/eccodes-wasm`

Published as: `@meri-imperiumi/eccodes-wasm@<version>`

Example: `npm install @meri-imperiumi/eccodes-wasm@2.49.0`

## Benefits of OIDC

| Token-Based | OIDC |
|------------|------|
| Static token in secrets | Ephemeral tokens |
| Manual rotation | Auto-rotation |
| Risk of leakage | GitHub-validated |
| Long-lived | Short-lived |
| Manual revocation | Auto-expires |

## Verification

After publishing:

```bash
# Verify package exists
npm view @meri-imperiumi/eccodes-wasm

# View versions
npm view @meri-imperiumi/eccodes-wasm versions

# Install and test
npm install @meri-imperiumi/eccodes-wasm
node -e "
const { createEccodes } = require('@meri-imperiumi/eccodes-wasm');
createEccodes().then(e => console.log('Version:', e.getVersion()));
"
```

## References

- Example: `../signalk-history-sqlite/.github/workflows/publish.yml`
- npm OIDC: https://docs.npmjs.com/guides/token-based-connection#oidc
- GitHub OIDC: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-cloud-providers

## Files Modified

| File | Changes |
|------|---------|
| `.github/workflows/publish.yml` | OIDC permissions, registry-url, no token env |
| `.gitignore` | Removed `.npmrc` |
| `PUBLISHING.md` | Complete OIDC documentation |
| `Makefile` | Added `publish` target |
| `package.json` | Added `publish` script |
| `.npmrc` | Deleted (token-based auth) |