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

