/**
 * C wrapper for ecCodes WebAssembly bindings
 *
 * This file provides a thin wrapper around key ecCodes functions
 * that will be exposed to JavaScript via Emscripten.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <emscripten.h>

#include "eccodes.h"

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

EMSCRIPTEN_KEEPALIVE
codes_handle* codes_handle_new_from_file(const char* path, ProductKind product_kind) {
    FILE* f = fopen(path, "rb");
    if (!f) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE, "Cannot open file: %s", path);
        return NULL;
    }

    codes_handle* h = codes_handle_new_from_file(0, f, product_kind);
    if (!h) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE, "Failed to create handle from file: %s", path);
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
int codes_get_long(codes_handle* h, const char* key, long* value) {
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
int codes_get_double(codes_handle* h, const char* key, double* value) {
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
int codes_get_string(codes_handle* h, const char* key, char* value, size_t* length) {
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
int codes_get_size(codes_handle* h, const char* key, size_t* size) {
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
int codes_get_double_array(codes_handle* h, const char* key, double* values, size_t* length) {
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
int codes_get_native_type(codes_handle* h, const char* key, int* type) {
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
int codes_is_missing(codes_handle* h, const char* key) {
    if (!h || !key) {
        set_error("NULL argument");
        return 1;
    }
    return codes_is_missing(h, key);
}

// Get string value - allocates memory that must be freed
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

// Get double array - allocates memory that must be freed
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
int codes_count_in_file(const char* path) {
    int err = 0;
    int count = codes_count_in_filename(path, &err);
    if (err != 0) {
        snprintf(g_error_buffer, ERROR_BUFFER_SIZE,
                 "Failed to count messages in file '%s': error %d", path, err);
        return -1;
    }
    return count;
}

// Initialize context with definitions path
EMSCRIPTEN_KEEPALIVE
int codes_context_set_definitions_path(codes_context* c, const char* path) {
    if (!c || !path) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    return codes_context_set_definitions_path(c, path);
}

EMSCRIPTEN_KEEPALIVE
int codes_context_set_samples_path(codes_context* c, const char* path) {
    if (!c || !path) {
        set_error("NULL argument");
        return CODES_INVALID_ARGUMENT;
    }
    return codes_context_set_samples_path(c, path);
}

EMSCRIPTEN_KEEPALIVE
codes_context* codes_context_get_default_wrapper() {
    return codes_context_get_default();
}