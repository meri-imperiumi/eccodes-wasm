/**
 * High-level JavaScript wrapper for ecCodes WebAssembly
 *
 * Provides a cleaner API over the low-level Emscripten bindings.
 */

class EccodesError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'EccodesError';
        this.code = code;
    }
}

class CodesHandle {
    constructor(eccodesModule, handle, productKind) {
        this._module = eccodesModule;
        this._handle = handle;
        this._productKind = productKind;
    }

    /**
     * Convert a JS string to a UTF8 string on the WASM heap.
     * Returns a BigInt pointer (required for wasm64 function calls).
     * On wasm64, Emscripten doesn't auto-marshal strings, so we do it manually.
     */
    _strToPtr(str) {
        const ptr = this._module.stringToNewUTF8(str);
        if (!ptr) {
            throw new EccodesError('Failed to allocate string on WASM heap', -1);
        }
        // wasm64 requires BigInt for pointer arguments
        return BigInt(ptr);
    }

    /**
     * Allocate memory on the WASM heap. Returns a BigInt pointer.
     */
    _malloc(size) {
        return BigInt(this._module._malloc(size));
    }

    /**
     * Free memory on the WASM heap. Accepts BigInt or number pointer.
     */
    _free(ptr) {
        this._module._free(ptr);
    }

    /**
     * Read a value from WASM memory at the given pointer.
     * Handles wasm64 BigInt pointers correctly.
     */
    _getValue(ptr, type) {
        const p = Number(ptr);
        const mod = this._module;
        switch (type) {
            case 'i8': return mod.HEAP8[p];
            case 'i16': return mod.HEAP16[p / 2];
            case 'i32': return mod.HEAP32[p / 4];
            case 'i64': return mod.HEAP64[p / 8];
            case 'float': return mod.HEAPF32[p / 4];
            case 'double': return mod.HEAPF64[p / 8];
            default: throw new EccodesError(`Invalid type: ${type}`, -1);
        }
    }

    /**
     * Get a long value for a key
     */
    getLong(key) {
        const valuePtr = this._malloc(8);
        const keyPtr = this._strToPtr(key);
        try {
            const ret = this._module._codes_get_long_wrapper(this._handle, keyPtr, valuePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return Number(this._getValue(valuePtr, 'i64'));
        } finally {
            this._free(valuePtr);
            this._free(keyPtr);
        }
    }

    /**
     * Get a double value for a key
     */
    getDouble(key) {
        const valuePtr = this._malloc(8);
        const keyPtr = this._strToPtr(key);
        try {
            const ret = this._module._codes_get_double_wrapper(this._handle, keyPtr, valuePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return this._getValue(valuePtr, 'double');
        } finally {
            this._free(valuePtr);
            this._free(keyPtr);
        }
    }

    /**
     * Get a string value for a key
     */
    getString(key) {
        const keyPtr = this._strToPtr(key);
        const strPtr = this._module._codes_get_string_alloc(this._handle, keyPtr);
        this._free(keyPtr);
        if (!strPtr) {
            throw new EccodesError(this._getError(key), -1);
        }

        try {
            const str = this._module.UTF8ToString(Number(strPtr));
            return str;
        } finally {
            this._module._codes_free_string(strPtr);
        }
    }

    /**
     * Get an array of doubles for a key
     */
    getDoubleArray(key) {
        const sizePtr = this._malloc(8);
        const keyPtr = this._strToPtr(key);
        try {
            const ret = this._module._codes_get_double_array_alloc(this._handle, keyPtr, sizePtr);
            if (!ret) {
                throw new EccodesError(this._getError(key), -1);
            }

            const size = Number(this._getValue(sizePtr, 'i64'));
            const values = [];
            for (let i = 0; i < size; i++) {
                values.push(this._getValue(ret + BigInt(i * 8), 'double'));
            }

            this._module._codes_free_array(ret);
            return values;
        } finally {
            this._free(sizePtr);
            this._free(keyPtr);
        }
    }

    /**
     * Get the size of an array for a key
     */
    getSize(key) {
        const sizePtr = this._malloc(8);
        const keyPtr = this._strToPtr(key);
        try {
            const ret = this._module._codes_get_size_wrapper(this._handle, keyPtr, sizePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return Number(this._getValue(sizePtr, 'i64'));
        } finally {
            this._free(sizePtr);
            this._free(keyPtr);
        }
    }

    /**
     * Get the native type of a key
     */
    getNativeType(key) {
        const typePtr = this._malloc(4);
        const keyPtr = this._strToPtr(key);
        try {
            const ret = this._module._codes_get_native_type_wrapper(this._handle, keyPtr, typePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return this._getValue(typePtr, 'i32');
        } finally {
            this._free(typePtr);
            this._free(keyPtr);
        }
    }

    /**
     * Check if a key is missing
     */
    isMissing(key) {
        const keyPtr = this._strToPtr(key);
        try {
            return this._module._codes_is_missing_wrapper(this._handle, keyPtr) !== 0;
        } finally {
            this._free(keyPtr);
        }
    }

    /**
     * Clone this handle
     */
    clone() {
        const clonedHandle = this._module._codes_handle_clone_wrapper(this._handle);
        if (!clonedHandle) {
            throw new EccodesError('Failed to clone handle', -1);
        }
        return new CodesHandle(this._module, clonedHandle, this._productKind);
    }

    /**
     * Delete the handle
     */
    delete() {
        if (this._handle) {
            this._module._codes_handle_delete_wrapper(this._handle);
            this._handle = null;
        }
    }

    /**
     * Get the last error message
     */
    _getError(key) {
        const lastError = this._module.UTF8ToString(Number(
            this._module._codes_get_last_error()));
        return lastError || `Error accessing key '${key}'`;
    }
}

class Eccodes {
    constructor(module) {
        this._module = module;
        this._context = this._module._codes_context_get_default_wrapper();
    }

    /**
     * Convert a JS string to a UTF8 string on the WASM heap.
     * Returns a BigInt pointer (required for wasm64 function calls).
     */
    _strToPtr(str) {
        const ptr = this._module.stringToNewUTF8(str);
        if (!ptr) {
            throw new EccodesError('Failed to allocate string on WASM heap', -1);
        }
        return BigInt(ptr);
    }

    /**
     * Allocate memory on the WASM heap. Returns a BigInt pointer.
     */
    _malloc(size) {
        return BigInt(this._module._malloc(size));
    }

    /**
     * Free memory on the WASM heap.
     */
    _free(ptr) {
        this._module._free(ptr);
    }

    /**
     * Read a value from WASM memory at the given pointer.
     * Handles wasm64 BigInt pointers correctly (Emscripten's getValue has issues with BigInt).
     */
    _getValue(ptr, type) {
        const p = Number(ptr);
        const mod = this._module;
        switch (type) {
            case 'i8': return mod.HEAP8[p];
            case 'i16': return mod.HEAP16[p / 2];
            case 'i32': return mod.HEAP32[p / 4];
            case 'i64': return mod.HEAP64[p / 8];
            case 'float': return mod.HEAPF32[p / 4];
            case 'double': return mod.HEAPF64[p / 8];
            default: throw new EccodesError(`Invalid type for _getValue: ${type}`, -1);
        }
    }

    /**
     * Get the ecCodes API version
     */
    getVersion() {
        return this._module._codes_get_version();
    }

    /**
     * Set the definitions path
     */
    setDefinitionsPath(path) {
        const pathPtr = this._strToPtr(path);
        try {
            this._module._codes_context_set_definitions_path_wrapper(this._context, pathPtr);
        } finally {
            this._free(pathPtr);
        }
    }

    /**
     * Set the samples path
     */
    setSamplesPath(path) {
        const pathPtr = this._strToPtr(path);
        try {
            this._module._codes_context_set_samples_path_wrapper(this._context, pathPtr);
        } finally {
            this._free(pathPtr);
        }
    }

    /**
     * Open a GRIB file
     */
    openGrib(path) {
        return this.openFile(path, 0); // PRODUCT_GRIB = 0
    }

    /**
     * Open a BUFR file
     */
    openBufr(path) {
        return this.openFile(path, 1); // PRODUCT_BUFR = 1
    }

    /**
     * Open a file with specified product kind
     */
    openFile(path, productKind = 0) {
        // Allocate the path string on the WASM heap (wasm64 requires manual string marshaling)
        const pathPtr = this._strToPtr(path);
        try {
            const handle = this._module._wasm_handle_new_from_file(pathPtr, productKind);
            if (!handle) {
                const lastError = this._module.UTF8ToString(Number(
                    this._module._codes_get_last_error()));
                throw new EccodesError(lastError || `Failed to open file: ${path}`, -1);
            }
            return new CodesHandle(this._module, handle, productKind);
        } finally {
            this._free(pathPtr);
        }
    }

    /**
     * Count messages in a file
     */
    countInFile(path) {
        const pathPtr = this._strToPtr(path);
        try {
            const count = this._module._codes_count_in_file_wrapper(pathPtr);
            if (count < 0) {
                const lastError = this._module.UTF8ToString(Number(
                    this._module._codes_get_last_error()));
                throw new EccodesError(lastError || `Failed to count messages in: ${path}`, -1);
            }
            return count;
        } finally {
            this._free(pathPtr);
        }
    }

    /**
     * Mount Node.js filesystem to Emscripten's virtual filesystem
     */
    mountFilesystem(root = '.') {
        const FS = this._module.FS;
        if (!FS) {
            throw new EccodesError('Filesystem not available in WASM module', -1);
        }

        // Create mount point if it doesn't exist
        try {
            FS.mkdir('/data', 0o777);
        } catch (e) {
            // Directory already exists
        }

        // Mount Node.js filesystem using NODEFS backend
        FS.mount(this._module.FS.filesystems.NODEFS, { root: root }, '/data');
    }

    /**
     * Write a file to the virtual filesystem
     */
    writeFile(path, data) {
        const FS = this._module.FS;
        if (!FS) {
            throw new EccodesError('Filesystem not available in WASM module', -1);
        }

        if (typeof data === 'string') {
            FS.writeFile(path, data);
        } else if (Buffer.isBuffer(data)) {
            FS.writeFile(path, new Uint8Array(data));
        } else if (data instanceof Uint8Array) {
            FS.writeFile(path, data);
        } else {
            throw new EccodesError('Unsupported data type', -1);
        }
    }

    /**
     * Read a file from the virtual filesystem
     */
    readFile(path) {
        const FS = this._module.FS;
        if (!FS) {
            throw new EccodesError('Filesystem not available in WASM module', -1);
        }

        return FS.readFile(path);
    }
}

/**
 * Create an Eccodes instance from the WASM module
 */
async function createEccodes(moduleOrPath, options = {}) {
    let module;

    if (moduleOrPath === undefined) {
        // Default to the built WASM module location
        const path = require('path');
        // Try several common locations
        const candidates = [
            path.join(__dirname, '..', 'build', 'eccodes', 'eccodes.js'),  // from wasm/ to repo root build
            path.join(__dirname, 'eccodes.js'),  // same dir as wrapper (when in build/eccodes)
        ];
        let loaded = false;
        for (const candidate of candidates) {
            try {
                const mod = require(candidate);
                const createModule = mod.default || mod;
                if (typeof createModule === 'function') {
                    module = await createModule(options);
                    loaded = true;
                    break;
                }
            } catch (e) {
                // Try next candidate
            }
        }
        if (!loaded) {
            throw new EccodesError(
                `Failed to load WASM module. ` +
                `Pass the module path explicitly: createEccodes('/path/to/eccodes.js').`, -1
            );
        }
    } else if (typeof moduleOrPath === 'string') {
        // Load from path
        const createModule = require(moduleOrPath);
        module = await createModule(options);
    } else if (typeof moduleOrPath === 'function') {
        // Module creator function
        module = await moduleOrPath(options);
    } else {
        // Already initialized module
        module = moduleOrPath;
    }

    return new Eccodes(module);
}

module.exports = { Eccodes, CodesHandle, EccodesError, createEccodes };