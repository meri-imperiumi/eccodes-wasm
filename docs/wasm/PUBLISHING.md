# Publishing Guide

This guide explains how to publish `@meri-imperiumi/eccodes-wasm` to NPM using OIDC (OpenID Connect).

## Prerequisites

1. **NPM Organization** - You must have the `@meri-imperiumi` scope set up on npmjs.com
2. **GitHub Repository** - Write access to meri-imperiumi/eccodes-wasm
3. **OIDC Setup** - Configure npm for OIDC publishing (one-time setup)

## One-Time OIDC Setup

### 1. Configure npm OIDC

Go to the npm organization settings and set up OIDC:

1. Visit: https://www.npmjs.com/settings/meri-imperiumi/organizations
2. Go to "Publishing" or "Integrations"
3. Add GitHub Actions as an OIDC publisher
4. Or use npm CLI:

```bash
npm token create --ci
```

And follow the prompts to configure OIDC.

### 2. Verify GitHub Actions Permissions

The workflow must have `id-token: write` permission (already configured in `.github/workflows/publish.yml`):

```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read
```

## Automated Publishing

### Via Git Tag (Recommended)

```bash
# Tag and push (triggers automated build and publish)
# The tag sets the NPM version; CI builds against the
# ecCodes version pinned in the ECCODES_VERSION file
git tag v2.48.2
git push origin v2.48.2
```

The GitHub Actions workflow will:
1. Clone ecCodes at the version pinned in `ECCODES_VERSION`
2. Build the WASM module with all features
3. Run tests
4. Publish to NPM as `@meri-imperiumi/eccodes-wasm@2.48.2`
5. Create a GitHub release

### Via Workflow Dispatch

1. Go to Actions → Publish to NPM
2. Click "Run workflow"
3. Enter the NPM package version (e.g., `2.48.2`)
4. Click "Run workflow"

## Manual Publishing

### Local Build

```bash
# Setup ecCodes source
make download VERSION=2.49.0

# Build release
make release

# Test
make test

# Set the package version (independent of the ecCodes version)
npm version 2.48.2 --no-git-tag-version

# Publish (requires npm login with OIDC token)
npm publish --access public
```

### Manual Login with OIDC

If publishing manually from your machine:

```bash
# Generate an OIDC token
npm token create --ci

# This creates a token with OIDC capabilities
# Use it with:
npm config set //registry.npmjs.org/:_authToken <token>

# Then publish
npm publish --access public
```

## Version Management

### Version Decoupling

The NPM package version and the ecCodes version are decoupled:

- **ecCodes version**: pinned in the `ECCODES_VERSION` file — CI builds
  against this version. Bump it in a commit when upgrading ecCodes.
- **NPM version**: set by the release tag (`v2.48.2` → `@meri-imperiumi/eccodes-wasm@2.48.2`)
  or the workflow dispatch input.

This allows releasing packaging-only fixes (e.g., `2.48.2`, `2.48.3`, …)
without an ecCodes upgrade.

### Upgrading ecCodes

```bash
# 1. Update the pin
echo 2.50.0 > ECCODES_VERSION

# 2. Update your local checkout
make setup TAG=2.50.0   # or: make download VERSION=2.50.0

# 3. Commit both together, build, test, and release
make release && make test
```

### Releasing Packaging-Only Changes

For changes to the wrapper, packaging, or CI that don't touch ecCodes:

```bash
# Bump the NPM version and tag it
git tag v2.48.2
git push origin v2.48.2
```

## Publish Checklist

Before publishing, ensure:

- [ ] ecCodes source is at correct version (`make show-version`, matches `ECCODES_VERSION`)
- [ ] Build succeeds (`make release`)
- [ ] Tests pass (`make test`)
- [ ] Prepublish check passes (`node scripts/prepublish-check.js`)
- [ ] `ECCODES_VERSION` pin is up to date
- [ ] `package.json` files field is correct
- [ ] README is up to date
- [ ] CHANGELOG.md is updated (if applicable)

## Post-Publish Verification

```bash
# Install from NPM
npm install @meri-imperiumi/eccodes-wasm

# Test in a new project
node -e "
const { createEccodes } = require('@meri-imperiumi/eccodes-wasm');
createEccodes().then(e => {
  console.log('✓ Loaded @meri-imperiumi/eccodes-wasm');
  console.log('  Version:', e.getVersion());
});
"
```

## Rollback (if needed)

```bash
# Unpublish a specific version
npm unpublish @meri-imperiumi/eccodes-wasm@2.49.0

# Deprecate a version (keeps it available but warns users)
npm deprecate @meri-imperiumi/eccodes-wasm@2.49.0 "Critical bug in JPEG support"

# Deprecate all versions < X
npm deprecate @meri-imperiumi/eccodes-wasm@<2.50.0 "Please upgrade to 2.50.0 or later"
```

## CI/CD Pipelines

### Build Workflow (`.github/workflows/build.yml`)

Triggers on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual dispatch

Builds and tests all configurations:
- Basic (AEC only)
- With JPEG (AEC + JPEG)
- Release builds

### Publish Workflow (`.github/workflows/publish.yml`)

Triggers on:
- Git tags starting with `v` (tag name sets the NPM version)
- Manual dispatch with NPM version input

**Two Jobs:**

1. **build**: Clones ecCodes (pinned in `ECCODES_VERSION`), builds WASM, runs tests
2. **publish-npm**: Syncs the NPM version from the tag/input and publishes to NPM using OIDC

**OIDC Flow:**
```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read

steps:
  - uses: actions/setup-node@v4
    with:
      registry-url: https://registry.npmjs.org/  # Triggers OIDC

  - run: npm publish  # Uses OIDC token automatically
```

## Troubleshooting

### "403 Forbidden" on publish (in CI)

1. Check OIDC is configured for your npm organization
2. Verify `id-token: write` permission in workflow
3. Ensure `registry-url` is set in `actions/setup-node@v4`

### "403 Forbidden" on publish (local)

```bash
# You're not logged in
npm whoami

# Login with OIDC token
npm token create --ci
npm config set //registry.npmjs.org/:_authToken <token>
```

### "Missing build artifacts" error

```bash
# The prepublish check failed
# Rebuild the release
make clean
make release
```

### "E404: Package not found" after publish

Wait a few minutes for NPM CDN propagation. Try:
```bash
# Clear NPM cache
npm cache clean --force

# Install with force
npm install @meri-imperiumi/eccodes-wasm --force
```

### OIDC Not Working

1. **Check npm OIDC setup**:
   ```bash
   npm token list
   ```

2. **Verify GitHub Actions has OIDC permission**:
   ```yaml
   permissions:
     id-token: write
   ```

3. **Check registry-url in setup-node**:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       registry-url: https://registry.npmjs.org/
   ```

## Files Published

From `package.json` files field:

```json
{
  "files": [
    "index.js",
    "build/eccodes/eccodes.js",
    "build/eccodes/eccodes.wasm",
    "build/eccodes/resources",
    "README.md",
    "LICENSE"
  ]
}
```

Total published size: ~10-15 MB

## Package Name

**Full package name**: `@meri-imperiumi/eccodes-wasm`

- Scope: `@meri-imperiumi`
- Package: `eccodes-wasm`
- Clarifies this is the WebAssembly build of ecCodes

### Scope Permissions

Only members of the `@meri-imperiumi` organization can publish:
1. Add users to the organization on npmjs.com
2. Grant "Developer" or "Maintainer" role

## Monitoring

### Check Published Versions

```bash
npm view @meri-imperiumi/eccodes-wasm versions
npm view @meri-imperiumi/eccodes-wasm@latest
```

### Download Stats

```bash
npm view @meri-imperiumi/eccodes-wasm
# Look for "downloads" in output
```

Or use: https://npm-stat.com/

## Security

### OIDC Benefits

- No static tokens in GitHub Secrets
- Tokens are ephemeral and auto-rotated
- Fine-grained permissions via npm organization settings
- Audit trail in npm and GitHub

### Package Lock

For end users:
```bash
npm install @meri-imperiumi/eccodes-wasm
npm shrinkwrap  # Creates npm-shrinkwrap.json for reproducible installs
```

### Security Audit

```bash
npm audit @meri-imperiumi/eccodes-wasm
```

## References

- [npm OIDC Documentation](https://docs.npmjs.com/guides/token-based-connection#oidc)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-cloud-providers)
- [signalk-history-sqlite publish.yml](../signalk-history-sqlite/.github/workflows/publish.yml) - Example OIDC setup