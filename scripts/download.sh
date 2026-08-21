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