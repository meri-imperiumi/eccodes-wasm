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