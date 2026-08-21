#!/usr/bin/env python3
"""
Build script for compiling ecCodes to WebAssembly using Emscripten.

Usage:
    python build_wasm.py [--release] [--output-dir PATH] [--enable-jpg] [--disable-aec]

This script expects to be run from the eccodes-wasm repository root, with ecCodes
source in ./eccodes (either git submodule or extracted release).
"""

import argparse
import os
import subprocess
import shutil
import sys
from pathlib import Path


def run_command(cmd, cwd=None, env=None):
    """Run a command and return True if successful."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env, check=False)
    if result.returncode != 0:
        print(f"Command failed with code {result.returncode}")
        sys.exit(1)
    return True


def run_command_capture(cmd, cwd=None, env=None):
    """Run a command, capturing output. Returns (success, stdout, stderr)."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        print(f"Command failed with code {result.returncode}")
        if result.stdout:
            print("--- stdout ---")
            print(result.stdout[-3000:])  # last 3000 chars
        if result.stderr:
            print("--- stderr ---")
            print(result.stderr[-3000:])
        sys.exit(1)
    return True, result.stdout, result.stderr


def check_emscripten():
    """Check if emcc is available."""
    try:
        result = subprocess.run(
            ["emcc", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"Emscripten found: {result.stdout.split()[0]}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: emcc not found. Please install Emscripten:")
        print("  - macOS: brew install emscripten")
        print("  - Or download from: https://emscripten.org/docs/getting_started/downloads.html")
        sys.exit(1)


def check_eccodes_source(source_dir):
    """Check if ecCodes source directory is valid."""
    if not source_dir.exists():
        print(f"Error: ecCodes source directory not found: {source_dir}")
        print("")
        print("To setup ecCodes source:")
        print("  Option 1 (git submodule):")
        print("    ./scripts/setup.sh --tag 2.49.0")
        print("")
        print("  Option 2 (release tarball):")
        print("    ./scripts/download.sh --version 2.49.0")
        sys.exit(1)

    required_files = ["CMakeLists.txt", "VERSION"]
    for f in required_files:
        if not (source_dir / f).exists():
            print(f"Error: Invalid ecCodes source directory (missing {f}): {source_dir}")
            sys.exit(1)

    version_file = source_dir / "VERSION"
    version = version_file.read_text().strip()
    print(f"ecCodes source found: {version}")
    return version


def git_clone(repo_url, tag, dest_dir):
    """Clone a git repository at a specific tag"""
    if dest_dir.exists():
        print(f"Using existing checkout: {dest_dir}")
        return dest_dir

    print(f"Cloning {repo_url} at {tag}...")
    run_command(["git", "clone", "--depth", "1", "--branch", tag, repo_url, str(dest_dir)])
    return dest_dir


def build_openjpeg(src_dir, build_dir, install_dir, arch_cmake_flags=None):
    """Build OpenJPEG with Emscripten"""
    OPENJPEG_REPO = "https://github.com/uclouvain/openjpeg.git"
    OPENJPEG_TAG = "v2.5.2"  # Latest stable version

    print("\nBuilding OpenJPEG for WASM...")

    openjpeg_src = git_clone(OPENJPEG_REPO, OPENJPEG_TAG, src_dir / "openjpeg")
    openjpeg_build_dir = build_dir / "openjpeg"
    openjpeg_install_dir = install_dir / "openjpeg"

    openjpeg_build_dir.mkdir(parents=True, exist_ok=True)
    openjpeg_install_dir.mkdir(parents=True, exist_ok=True)

    # Configure with Emscripten
    cmake_args = [
        "emcmake", "cmake",
        "-S", str(openjpeg_src),
        "-B", str(openjpeg_build_dir),
        f"-DCMAKE_INSTALL_PREFIX={openjpeg_install_dir}",
        "-DCMAKE_BUILD_TYPE=Release",
        "-DBUILD_DOC=OFF",
        "-DBUILD_TESTING=OFF",
        "-DBUILD_EXAMPLES=OFF",
        "-DBUILD_CODEC=OFF",  # We only need the library
        "-DBUILD_SHARED_LIBS=OFF",
    ] + (arch_cmake_flags or [])
    run_command(cmake_args)

    # Build (use cmake directly; emcmake only needed for configure)
    build_args = [
        "cmake",
        "--build", str(openjpeg_build_dir),
        "--parallel", str(os.cpu_count() or 4),
    ]
    run_command(build_args)

    # Install
    install_args = [
        "cmake",
        "--install", str(openjpeg_build_dir),
    ]
    run_command(install_args)

    print(f"OpenJPEG installed to: {openjpeg_install_dir}")
    return openjpeg_install_dir


def build_libaec(src_dir, build_dir, install_dir, arch_cmake_flags=None):
    """Build libaec (Adaptive Entropy Coding) with Emscripten"""
    AEC_REPO = "https://github.com/MathisRosenhauer/libaec.git"
    AEC_TAG = "v1.1.4"

    print("\nBuilding libaec for WASM...")

    aec_src = git_clone(AEC_REPO, AEC_TAG, src_dir / "libaec")
    aec_build_dir = build_dir / "libaec"
    aec_install_dir = install_dir / "libaec"

    aec_build_dir.mkdir(parents=True, exist_ok=True)
    aec_install_dir.mkdir(parents=True, exist_ok=True)

    # Configure with Emscripten
    cmake_args = [
        "emcmake", "cmake",
        "-S", str(aec_src),
        "-B", str(aec_build_dir),
        f"-DCMAKE_INSTALL_PREFIX={aec_install_dir}",
        "-DCMAKE_BUILD_TYPE=Release",
        "-DBUILD_SHARED_LIBS=OFF",
        "-DBUILD_TESTING=OFF",
    ] + (arch_cmake_flags or [])
    run_command(cmake_args)

    # Build only the aec static library (not tests/tools)
    build_args = [
        "cmake",
        "--build", str(aec_build_dir),
        "--target", "aec-static", "sz-static",
        "--parallel", str(os.cpu_count() or 4),
    ]
    run_command(build_args)

    # Install
    install_args = [
        "cmake",
        "--install", str(aec_build_dir),
    ]
    run_command(install_args)

    print(f"libaec installed to: {aec_install_dir}")
    return aec_install_dir


def main():
    parser = argparse.ArgumentParser(description="Build ecCodes for WebAssembly")
    parser.add_argument("--release", action="store_true", help="Release build (optimizations)")
    parser.add_argument("--output-dir", type=str, default="build", help="Output directory")
    parser.add_argument("--source-dir", type=str, default="eccodes", help="ecCodes source directory")
    parser.add_argument("--enable-jpg", action="store_true", help="Enable JPEG support via OpenJPEG")
    parser.add_argument("--disable-aec", action="store_true", help="Disable AEC compression")
    parser.add_argument("--wasm64", action="store_true", default=True, help="Build for wasm64 (64-bit pointers, default)")
    parser.add_argument("--wasm32", action="store_true", help="Build for wasm32 (32-bit pointers)")
    args = parser.parse_args()

    # Determine target bitness
    if args.wasm32:
        target_bits = 32
        arch_flag = []
    else:
        target_bits = 64
        arch_flag = ["-m64"]

    # Find repository root and wasm directory
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent

    source_dir = (repo_root / args.source_dir).resolve()
    output_dir = (repo_root / args.output_dir).resolve()
    build_dir = output_dir / "build"
    install_dir = output_dir / "install"

    # Enable/disable flags
    enable_jpg = args.enable_jpg
    enable_aec = not args.disable_aec

    # Set compiler flags for target bitness
    if target_bits == 64:
        os.environ["CFLAGS"] = os.environ.get("CFLAGS", "") + " -m64"
        os.environ["CXXFLAGS"] = os.environ.get("CXXFLAGS", "") + " -m64"
        arch_cmake_flags = ["-DCMAKE_C_FLAGS=-m64", "-DCMAKE_CXX_FLAGS=-m64"]
        print("Building for wasm64 (64-bit pointers)")
    else:
        arch_cmake_flags = []
        print("Building for wasm32 (32-bit pointers)")

    # Check emscripten
    check_emscripten()

    # Check ecCodes source
    ecodes_version = check_eccodes_source(source_dir)

    # Create directories
    build_dir.mkdir(parents=True, exist_ok=True)
    install_dir.mkdir(parents=True, exist_ok=True)
    src_dir = build_dir / "src"
    src_dir.mkdir(exist_ok=True)

    # Build dependencies
    openjpeg_install_dir = None
    aec_install_dir = None

    if enable_jpg:
        openjpeg_install_dir = build_openjpeg(src_dir, build_dir, install_dir, arch_cmake_flags)

    if enable_aec:
        aec_install_dir = build_libaec(src_dir, build_dir, install_dir, arch_cmake_flags)

    # CMake configuration with CMAKE_PREFIX_PATH for dependencies
    cmake_prefix_path = str(install_dir)
    if openjpeg_install_dir:
        cmake_prefix_path += f";{openjpeg_install_dir}"
    if aec_install_dir:
        cmake_prefix_path += f";{aec_install_dir}"

    # Explicit package config dirs for find_package
    package_dir_args = []
    if openjpeg_install_dir:
        opj_dir = openjpeg_install_dir / "lib" / "cmake" / "openjpeg-2.5"
        package_dir_args.append(f"-Dopenjpeg_DIR={opj_dir}")
    if aec_install_dir:
        aec_dir = aec_install_dir / "lib" / "cmake" / "libaec"
        package_dir_args.append(f"-Dlibaec_DIR={aec_dir}")

    print(f"\nCMAKE_PREFIX_PATH: {cmake_prefix_path}")

    # CMake configuration
    cmake_args = [
        "emcmake", "cmake",
        "-S", str(source_dir),
        "-B", str(build_dir),
        f"-DCMAKE_INSTALL_PREFIX={install_dir}",
        "-DCMAKE_BUILD_TYPE=" + ("Release" if args.release else "Debug"),
        "-DENABLE_TESTS=OFF",
        "-DENABLE_EXAMPLES=OFF",
        "-DENABLE_FORTRAN=OFF",
        "-DENABLE_PYTHON=OFF",
        "-DENABLE_BUILD_TOOLS=OFF",
        # Features
        "-DENABLE_PRODUCT_GRIB=ON",
        "-DENABLE_PRODUCT_BUFR=ON",
        "-DENABLE_GEOGRAPHY=ON",
        f"-DENABLE_AEC={'ON' if enable_aec else 'OFF'}",
        f"-DENABLE_JPG={'ON' if enable_jpg else 'OFF'}",
        "-DENABLE_PNG=OFF",
        "-DENABLE_NETCDF=OFF",
        "-DENABLE_MEMFS=ON",
        "-DDISABLE_OS_CHECK=ON",
        "-DIEEE_LE=1",
        "-DBUILD_SHARED_LIBS=OFF",
        "-DENABLE_USE_SHARED_LIB_AEC=OFF",
        f"-DCMAKE_PREFIX_PATH={cmake_prefix_path}",
    ] + package_dir_args + arch_cmake_flags

    print(f"\nConfiguring ecCodes {ecodes_version} with Emscripten...")
    run_command(cmake_args)

    # Build (use cmake directly; emcmake only needed for configure)
    print(f"\nBuilding ecCodes {ecodes_version}...")
    build_args = [
        "cmake",
        "--build", str(build_dir),
        "--target", "eccodes",
        "--parallel", str(os.cpu_count() or 4),
    ]
    run_command(build_args)

    # Install - skip if it fails (we use the build dir directly)
    print("\nInstalling ecCodes...")
    install_args = [
        "cmake",
        "--install", str(build_dir),
    ]
    install_result = subprocess.run(install_args, check=False)
    if install_result.returncode != 0:
        print(f"Warning: install step failed (code {install_result.returncode}), using build directory directly")
        # Create a manual install layout
        import glob
        install_dir.mkdir(parents=True, exist_ok=True)
        # Copy headers
        src_include = source_dir / "src" / "eccodes"
        build_include = build_dir / "src" / "eccodes"
        inc_dest = install_dir / "include"
        inc_dest.mkdir(parents=True, exist_ok=True)
        for h in ["eccodes.h", "grib_api.h", "eccodes_windef.h"]:
            for inc_path in [build_include, src_include]:
                src_h = inc_path / h
                if src_h.exists():
                    shutil.copy2(src_h, inc_dest / h)
                    break
        # Copy generated headers from build
        for h in ["eccodes_version.h", "eccodes_config.h", "eccodes_ecbuild_config.h"]:
            for inc_path in [build_dir / "src" / "eccodes", build_dir, build_dir / "src"]:
                src_h = inc_path / h
                if src_h.exists():
                    shutil.copy2(src_h, inc_dest / h)
                    break
        # Copy libraries from build dir
        lib_dest = install_dir / "lib"
        lib_dest.mkdir(parents=True, exist_ok=True)
        for libfile in glob.glob(str(build_dir / "lib" / "libeccodes*")):
            shutil.copy2(libfile, lib_dest / Path(libfile).name)
        for libfile in glob.glob(str(build_dir / "lib" / "libeccodes_memfs*")):
            shutil.copy2(libfile, lib_dest / Path(libfile).name)
        print(f"Manual install to: {install_dir}")

    # Now build the WASM library with bindings
    wasm_build_dir = build_dir / "wasm_module"
    wasm_build_dir.mkdir(exist_ok=True)

    # Collect libraries to link (static libraries)
    link_libs = [f"-L{install_dir}/lib", f"-L{build_dir / 'lib'}"]
    # eccodes static libs - use -Wl,--whole-archive to ensure all accessor builders and definitions are included
    # (static registration objects would otherwise be dropped as dead code)
    link_libs.append("-Wl,--whole-archive")
    for libname in ["eccodes", "eccodes_memfs"]:
        libfile_a = install_dir / "lib" / f"lib{libname}.a"
        libfile_b = build_dir / "lib" / f"lib{libname}.a"
        if libfile_a.exists():
            link_libs.append(f"{libfile_a}")
        elif libfile_b.exists():
            link_libs.append(f"{libfile_b}")
        else:
            link_libs.append(f"-l{libname}")
    link_libs.append("-Wl,--no-whole-archive")
    if openjpeg_install_dir:
        libfile = openjpeg_install_dir / "lib" / "libopenjp2.a"
        if libfile.exists():
            link_libs.append(f"{libfile}")
        else:
            link_libs.extend([f"-L{openjpeg_install_dir}/lib", "-lopenjp2"])
    if aec_install_dir:
        libfile = aec_install_dir / "lib" / "libaec.a"
        if libfile.exists():
            link_libs.append(f"{libfile}")
        else:
            link_libs.extend([f"-L{aec_install_dir}/lib", "-laec"])

    # Also add include paths
    include_paths = [f"-I{install_dir}/include"]
    if openjpeg_install_dir:
        include_paths.append(f"-I{openjpeg_install_dir}/include")
    if aec_install_dir:
        include_paths.append(f"-I{aec_install_dir}/include")

    # Functions to export from the WASM module
    exported_functions = [
        '_codes_get_last_error',
        '_codes_get_version',
        '_wasm_handle_new_from_file',
        '_codes_handle_delete_wrapper',
        '_codes_get_long_wrapper',
        '_codes_get_double_wrapper',
        '_codes_get_string_wrapper',
        '_codes_get_size_wrapper',
        '_codes_get_double_array_wrapper',
        '_codes_get_native_type_wrapper',
        '_codes_is_missing_wrapper',
        '_codes_get_string_alloc',
        '_codes_free_string',
        '_codes_get_double_array_alloc',
        '_codes_free_array',
        '_codes_count_in_file_wrapper',
        '_codes_handle_clone_wrapper',
        '_codes_context_set_definitions_path_wrapper',
        '_codes_context_set_samples_path_wrapper',
        '_codes_context_get_default_wrapper',
        '_codes_memfs_exists',
        '_malloc',
        '_free',
    ]
    export_list = "[" + ",".join(f"'{f}'" for f in exported_functions) + "]"

    # Link ecCodes as a shared library and create WASM module
    print("\nCreating WASM module...")
    wasm_args = [
        "em++",
        "-o", str(wasm_build_dir / "eccodes.js"),
    ] + arch_flag + [
        "-s", "WASM=1",
        "-s", "MODULARIZE=1",
        "-s", "EXPORT_NAME=\"createEccodes\"",
        "-s", f"EXPORTED_FUNCTIONS={export_list}",
        "-s", "EXPORTED_RUNTIME_METHODS=['cwrap','FS','getValue','UTF8ToString','stringToNewUTF8','allocateUTF8','writeArrayToMemory','HEAP8','HEAP16','HEAP32','HEAP64','HEAPU8','HEAPU16','HEAPU32','HEAPU64','HEAPF32','HEAPF64']",
        "-s", "ALLOW_MEMORY_GROWTH=1",
        "-s", "MAXIMUM_MEMORY=512MB",
        "-s", "INITIAL_MEMORY=64MB",
        "-s", "STACK_SIZE=1MB",
        "-s", "FORCE_FILESYSTEM=1",
        "-s", "NO_DISABLE_EXCEPTION_CATCHING=1",
        "-lnodefs.js",
        "-lc++",
    ] + include_paths + link_libs + [
        str(script_dir / "eccodes_wrapper.c"),
    ]

    if args.release:
        wasm_args.extend([
            "-O3",
            "-s", "MINIFY_HTML=1",
        ])

    run_command(wasm_args)

    # Copy to final output
    final_output = output_dir / "eccodes"
    final_output.mkdir(exist_ok=True)

    for ext in [".js", ".wasm"]:
        src = wasm_build_dir / f"eccodes{ext}"
        dst = final_output / f"eccodes{ext}"
        if src.exists():
            shutil.copy(src, dst)
            print(f"Copied {src.name} to {dst}")

    # Copy resources if memfs is not enabled
    memfs_share = install_dir / "share" / "eccodes"
    resources_dest = final_output / "resources"
    if memfs_share.exists():
        shutil.copytree(memfs_share, resources_dest, dirs_exist_ok=True)
        print(f"Copied resources to {resources_dest}")

    # Copy high-level JS wrapper
    js_wrapper = script_dir / "eccodes.js"
    if js_wrapper.exists():
        shutil.copy(js_wrapper, final_output / "index.js")
        print(f"Copied index.js to {final_output}")

    print(f"\n✓ WASM build complete!")
    print(f"  ecCodes version: {ecodes_version}")
    print(f"  Output: {final_output}")
    print(f"  Files: eccodes.js, eccodes.wasm, index.js")
    if resources_dest.exists():
        print(f"  Resources: {resources_dest}")
    print(f"  Features: JPG={enable_jpg}, AEC={enable_aec}")
    print("")
    print(f"To test:")
    print(f"  node -e \"const eccodes = require('{final_output}/index.js'); eccodes.createEccodes().then(e => console.log('Version:', e.getVersion()))\"")


if __name__ == "__main__":
    main()