# eccodes-wasm Makefile
#
# Targets:
#   setup         - Setup ecCodes as git submodule
#   download      - Download release tarball
#   build         - Build WASM (debug)
#   build-jpg     - Build WASM with JPEG support
#   release       - Build release WASM with JPEG
#   clean         - Clean build artifacts
#   deep-clean    - Remove everything including dependencies
#   test          - Run tests
#   example       - Run example
#   publish       - Publish to NPM (requires OIDC setup)

.PHONY: help setup download build build-jpg release clean deep-clean test example publish

# Default target
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
	@echo "Variables:"
	@echo "  TAG, VERSION                - ecCodes version"
	@echo "  RELEASE=1                   - Build release (optimized)"
	@echo "  OUTPUT_DIR                  - Custom output directory"

# Setup
setup:
	@./scripts/setup.sh $(if $(TAG),--tag $(TAG),$(if $(BRANCH),--branch $(BRANCH)))

download:
	@./scripts/download.sh $(if $(VERSION),--version $(VERSION),)

# Build targets
build:
	@python3 wasm/build_wasm.py

build-jpg:
	@python3 wasm/build_wasm.py --enable-jpg

release:
	@python3 wasm/build_wasm.py --release --enable-jpg

# Clean
clean:
	rm -rf build

deep-clean: clean
	rm -rf packages eccodes

# Test
test:
	@echo "Running tests..."
	@if [ -d "build/eccodes" ]; then \
		node --test test/basic.mjs test/e2e.mjs; \
	else \
		echo "Error: Build not found. Run 'make build-jpg' first."; \
		exit 1; \
	fi

test-e2e:
	@echo "Running E2E tests..."
	@if [ -d "build/eccodes" ]; then \
		npm run test:e2e; \
	else \
		echo "Error: Build not found. Run 'make build-jpg' first."; \
		exit 1; \
	fi

# Example
example:
	@echo "Running example..."
	@if [ -d "build/eccodes" ]; then \
		node wasm/example/usage.js; \
	else \
		echo "Error: Build not found. Run 'make build-jpg' first."; \
		exit 1; \
	fi

# Development helpers
update-eccodes:
	@if [ -d "eccodes/.git" ]; then \
		cd eccodes && git pull && cd ..; \
	else \
		echo "Error: ecCodes is not a git submodule."; \
		echo "Run 'make setup' to setup as submodule."; \
		exit 1; \
	fi

show-version:
	@if [ -f "eccodes/VERSION" ]; then \
		echo "ecCodes version: $$(cat eccodes/VERSION)"; \
	else \
		echo "Error: ecCodes not found. Run 'make setup' or 'make download'."; \
	fi

# CI targets (requires VERSION variable)
ci-setup:
	@echo "CI Setup..."
	@./scripts/download.sh --version ${VERSION}

ci-build:
	@echo "CI Build..."
	@python3 wasm/build_wasm.py --release --enable-jpg

ci-test:
	@echo "CI Test..."
	@node --test test/basic.mjs test/e2e.mjs

# Publish
publish:
	@echo "Publishing to NPM via OIDC..."
	@make release
	@npm run version
	@echo ""
	@echo "To publish via CI, create and push a git tag:"
	@echo "  git tag v2.49.0 && git push origin v2.49.0"
	@echo ""
	@echo "To publish manually, create an OIDC token:"
	@echo "  npm token create --ci"
	@echo "  npm config set //registry.npmjs.org/:_authToken <token>"
	@echo "  npm publish --access public"