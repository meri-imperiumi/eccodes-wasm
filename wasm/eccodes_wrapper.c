/**
 * C wrapper for ecCodes WebAssembly bindings
 *
 * This file provides a thin wrapper around key ecCodes functions
 * that will be exposed to JavaScript via Emscripten.
 *
 * All wrapper functions are prefixed with `wasm_` to avoid conflicts
 * with the actual ecCodes API functions.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <emscripten.h>

#include "eccodes.h"

#ifdef __cplusplus
extern "C" {
#endif

// Error buffer for last error message
#define ERROR_BUFFER_SIZE 1024
static char g_error_buffer[ERROR_BUFFER_SIZE] = {0};

// Set error message
static void set_error(const char* message) {
    strncpy(g_error_buffer, message, ERROR_BUFFER_SIZE - 1);
    g_error_buffer[ERROR_BUFFER_SIZE - 1] = '\0';
}

EMSCRIPTEN_KEEPALIVE
const char* codes_get_last_error() {
    return g_error_buffer;
}

EMSCRIPTEN_KEEPALIVE
int codes_get_version() {
    return codes_get_api_version();
}

// File iterator: walk every message of a multi-message GRIB/BUFR file without
// re-opening it. NULL returned by wasm_iterator_next signals end-of-file.
typedef struct {
    FILE* f;
    codes_context* ctx;
} wasm_file_iterator_t;

EMSCRIPTEN_KEEPALIVE
wasm_file_iterator_t* wasm_iterator_new(const char* path) {
    FILE* f = fopen(path, "rb");
    if (!f) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE, "Cannot open file: %s", path);
        return NULL;
    }
    wasm_file_iterator_t* it = (wasm_file_iterator_t*)malloc(sizeof(wasm_file_iterator_t));
    if (!it) {
        fclose(f);
        set_error("Failed to allocate file iterator");
        return NULL;
    }
    it->f = f;
    it->ctx = codes_context_get_default();
    return it;
}

// Returns the next message handle, or NULL at end of file / on error.
EMSCRIPTEN_KEEPALIVE
codes_handle* wasm_iterator_next(wasm_file_iterator_t* it, int product_kind) {
    if (!it || !it->f) {
        set_error("NULL iterator");
        return NULL;
    }
    int err = 0;
    codes_handle* h = codes_handle_new_from_file(it->ctx, it->f, (ProductKind)product_kind, &err);
    if (h) return h;
    // NULL: EOF (err == 0) or error (err != 0). Close the file either way.
    if (err != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_handle_new_from_file failed: %s",
                 codes_get_error_message(err));
    }
    fclose(it->f);
    it->f = NULL;
    return NULL;
}

EMSCRIPTEN_KEEPALIVE
void wasm_iterator_free(wasm_file_iterator_t* it) {
    if (!it) return;
    if (it->f) fclose(it->f);
    free(it);
}

// Open a GRIB/BUFR file and return the first message handle.
// product_kind: PRODUCT_GRIB or PRODUCT_BUFR
EMSCRIPTEN_KEEPALIVE
codes_handle* wasm_handle_new_from_file(const char* path, int product_kind) {
    FILE* f = fopen(path, "rb");
    if (!f) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE, "Cannot open file: %s", path);
        return NULL;
    }

    int err = 0;
    codes_handle* h = codes_handle_new_from_file(0, f, (ProductKind)product_kind, &err);
    if (err != CODES_SUCCESS || !h) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "Failed to create handle from file '%s': %s",
                 path, codes_get_error_message(err));
        fclose(f);
        return NULL;
    }

    fclose(f);
    return h;
}

EMSCRIPTEN_KEEPALIVE
int codes_handle_delete_wrapper(codes_handle* h) {
    if (!h) {
        set_error("NULL handle");
        return CODES_INVALID_ARGUMENT;
    }
    return codes_handle_delete(h);
}

EMSCRIPTEN_KEEPALIVE
int codes_get_long_wrapper(codes_handle* h, const char* key, long* value) {
    if (!h || !key || !value) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    int ret = codes_get_long(h, key, value);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_get_long failed for key '%s': %s",
                 key, codes_get_error_message(ret));
    }
    return ret;
}

EMSCRIPTEN_KEEPALIVE
int codes_get_double_wrapper(codes_handle* h, const char* key, double* value) {
    if (!h || !key || !value) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    int ret = codes_get_double(h, key, value);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_get_double failed for key '%s': %s",
                 key, codes_get_error_message(ret));
    }
    return ret;
}

EMSCRIPTEN_KEEPALIVE
int codes_get_string_wrapper(codes_handle* h, const char* key, char* value, size_t* length) {
    if (!h || !key || !value || !length) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    int ret = codes_get_string(h, key, value, length);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_get_string failed for key '%s': %s",
                 key, codes_get_error_message(ret));
    }
    return ret;
}

EMSCRIPTEN_KEEPALIVE
int codes_get_size_wrapper(codes_handle* h, const char* key, size_t* size) {
    if (!h || !key || !size) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    int ret = codes_get_size(h, key, size);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_get_size failed for key '%s': %s",
                 key, codes_get_error_message(ret));
    }
    return ret;
}

EMSCRIPTEN_KEEPALIVE
int codes_get_double_array_wrapper(codes_handle* h, const char* key, double* values, size_t* length) {
    if (!h || !key || !values || !length) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    int ret = codes_get_double_array(h, key, values, length);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_get_double_array failed for key '%s': %s",
                 key, codes_get_error_message(ret));
    }
    return ret;
}

EMSCRIPTEN_KEEPALIVE
int codes_get_native_type_wrapper(codes_handle* h, const char* key, int* type) {
    if (!h || !key || !type) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    int ret = codes_get_native_type(h, key, type);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_get_native_type failed for key '%s': %s",
                 key, codes_get_error_message(ret));
    }
    return ret;
}

EMSCRIPTEN_KEEPALIVE
int codes_is_missing_wrapper(codes_handle* h, const char* key) {
    if (!h || !key) {
        set_error("NULL argument");
        return 1;
    }
    int err = 0;
    int result = codes_is_missing(h, key, &err);
    if (err != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "codes_is_missing failed for key '%s': %s",
                 key, codes_get_error_message(err));
    }
    return result;
}

// Get string value - allocates memory that must be freed with codes_free_string
EMSCRIPTEN_KEEPALIVE
char* codes_get_string_alloc(codes_handle* h, const char* key) {
    if (!h || !key) {
        set_error("NULL argument");
        return NULL;
    }

    size_t length = 0;
    int ret = codes_get_length(h, key, &length);
    if (ret != CODES_SUCCESS || length == 0) {
        // Try getting size first
        ret = codes_get_size(h, key, &length);
        if (ret != CODES_SUCCESS) {
            snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                     "Failed to get length for key '%s'", key);
            return NULL;
        }
    }

    // Allocate buffer (extra space for null terminator)
    char* buffer = (char*)malloc(length + 1);
    if (!buffer) {
        set_error("Failed to allocate memory for string");
        return NULL;
    }

    size_t actual_length = length + 1;
    ret = codes_get_string(h, key, buffer, &actual_length);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "Failed to get string for key '%s': %s",
                 key, codes_get_error_message(ret));
        free(buffer);
        return NULL;
    }

    return buffer;
}

EMSCRIPTEN_KEEPALIVE
void codes_free_string(char* str) {
    free(str);
}

// Get double array - allocates memory that must be freed with codes_free_array
EMSCRIPTEN_KEEPALIVE
double* codes_get_double_array_alloc(codes_handle* h, const char* key, size_t* length) {
    if (!h || !key || !length) {
        set_error("NULL argument");
        return NULL;
    }

    int ret = codes_get_size(h, key, length);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "Failed to get size for key '%s'", key);
        return NULL;
    }

    if (*length == 0) {
        set_error("Array size is 0");
        return NULL;
    }

    double* values = (double*)malloc(*length * sizeof(double));
    if (!values) {
        set_error("Failed to allocate memory for array");
        return NULL;
    }

    ret = codes_get_double_array(h, key, values, length);
    if (ret != CODES_SUCCESS) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "Failed to get array for key '%s': %s",
                 key, codes_get_error_message(ret));
        free(values);
        return NULL;
    }

    return values;
}

EMSCRIPTEN_KEEPALIVE
void codes_free_array(void* ptr) {
    free(ptr);
}

// Count messages in file
EMSCRIPTEN_KEEPALIVE
int codes_count_in_file_wrapper(const char* path) {
    FILE* f = fopen(path, "rb");
    if (!f) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE, "Cannot open file: %s", path);
        return -1;
    }
    int n = 0;
    int err = codes_count_in_file(0, f, &n);
    fclose(f);
    if (err != 0) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "Failed to count messages in file '%s': error %d", path, err);
        return -1;
    }
    return n;
}

// Clone a handle
EMSCRIPTEN_KEEPALIVE
codes_handle* codes_handle_clone_wrapper(codes_handle* h) {
    if (!h) {
        set_error("NULL handle");
        return NULL;
    }
    codes_handle* cloned = codes_handle_clone(h);
    if (!cloned) {
        set_error("Failed to clone handle");
        return NULL;
    }
    return cloned;
}

// Initialize context with definitions path
EMSCRIPTEN_KEEPALIVE
void codes_context_set_definitions_path_wrapper(codes_context* c, const char* path) {
    if (!c || !path) {
        set_error("NULL argument");
        return;
    }
    codes_context_set_definitions_path(c, path);
}

EMSCRIPTEN_KEEPALIVE
void codes_context_set_samples_path_wrapper(codes_context* c, const char* path) {
    if (!c || !path) {
        set_error("NULL argument");
        return;
    }
    codes_context_set_samples_path(c, path);
}

EMSCRIPTEN_KEEPALIVE
codes_context* codes_context_get_default_wrapper() {
    return codes_context_get_default();
}

#ifdef __cplusplus
}
#endif