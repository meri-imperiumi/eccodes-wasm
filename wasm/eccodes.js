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
     * Get a long value for a key
     */
    getLong(key) {
        const valuePtr = this._module._malloc(8);
        try {
            const ret = this._module._codes_get_long(this._handle, key, valuePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return this._module.getValue(valuePtr, 'i64');
        } finally {
            this._module._free(valuePtr);
        }
    }

    /**
     * Get a double value for a key
     */
    getDouble(key) {
        const valuePtr = this._module._malloc(8);
        try {
            const ret = this._module._codes_get_double(this._handle, key, valuePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return this._module.getValue(valuePtr, 'double');
        } finally {
            this._module._free(valuePtr);
        }
    }

    /**
     * Get a string value for a key
     */
    getString(key) {
        const strPtr = this._module._codes_get_string_alloc(this._handle, key);
        if (!strPtr) {
            throw new EccodesError(this._getError(key), -1);
        }

        try {
            const str = this._module.UTF8ToString(strPtr);
            return str;
        } finally {
            this._module._codes_free_string(strPtr);
        }
    }

    /**
     * Get an array of doubles for a key
     */
    getDoubleArray(key) {
        const sizePtr = this._module._malloc(8);
        try {
            const ret = this._module._codes_get_double_array_alloc(this._handle, key, sizePtr);
            if (!ret) {
                throw new EccodesError(this._getError(key), -1);
            }

            const size = this._module.getValue(sizePtr, 'i64');
            const values = [];
            for (let i = 0; i < size; i++) {
                values.push(this._module.getValue(ret + (i * 8), 'double'));
            }

            this._module._codes_free_array(ret);
            return values;
        } finally {
            this._module._free(sizePtr);
        }
    }

    /**
     * Get the size of an array for a key
     */
    getSize(key) {
        const sizePtr = this._module._malloc(8);
        try {
            const ret = this._module._codes_get_size(this._handle, key, sizePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return this._module.getValue(sizePtr, 'i64');
        } finally {
            this._module._free(sizePtr);
        }
    }

    /**
     * Get the native type of a key
     */
    getNativeType(key) {
        const typePtr = this._module._malloc(4);
        try {
            const ret = this._module._codes_get_native_type(this._handle, key, typePtr);
            if (ret !== 0) {
                throw new EccodesError(this._getError(key), ret);
            }
            return this._module.getValue(typePtr, 'i32');
        } finally {
            this._module._free(typePtr);
        }
    }

    /**
     * Check if a key is missing
     */
    isMissing(key) {
        return this._module._codes_is_missing(this._handle, key) !== 0;
    }

    /**
     * Clone this handle
     */
    clone() {
        const clonedHandle = this._module._codes_handle_clone(this._handle);
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
        const lastError = this._module.UTF8ToString(
            this._module._codes_get_last_error()
        );
        return lastError || `Error accessing key '${key}'`;
    }
}

class Eccodes {
    constructor(module) {
        this._module = module;
        this._context = this._module._codes_context_get_default_wrapper();
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
        const ret = this._module._codes_context_set_definitions_path(this._context, path);
        if (ret !== 0) {
            throw new EccodesError('Failed to set definitions path', ret);
        }
    }

    /**
     * Set the samples path
     */
    setSamplesPath(path) {
        const ret = this._module._codes_context_set_samples_path(this._context, path);
        if (ret !== 0) {
            throw new EccodesError('Failed to set samples path', ret);
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
        const handle = this._module._codes_handle_new_from_file(path, productKind);
        if (!handle) {
            const lastError = this._module.UTF8ToString(
                this._module._codes_get_last_error()
            );
            throw new EccodesError(lastError || `Failed to open file: ${path}`, -1);
        }
        return new CodesHandle(this._module, handle, productKind);
    }

    /**
     * Count messages in a file
     */
    countInFile(path) {
        const count = this._module._codes_count_in_file(path);
        if (count < 0) {
            const lastError = this._module.UTF8ToString(
                this._module._codes_get_last_error()
            );
            throw new EccodesError(lastError || `Failed to count messages in: ${path}`, -1);
        }
        return count;
    }

    /**
     * Mount Node.js filesystem to Emscripten's virtual filesystem
     */
    mountFilesystem(root = '.') {
        const FS = this._module.FS;
        if (!FS) {
            throw new EccodesError('Filesystem not available in WASM module', -1);
        }

        // Create mount point
        FS.mkdir('/data', 0o777);

        // Mount Node.js filesystem
        const fs = require('fs');
        FS.mount(fs, { root: root }, '/data');
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

    if (typeof moduleOrPath === 'string') {
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