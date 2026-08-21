# Rust + wasm-bindgen Alternative

This document describes an alternative approach using Rust and `wasm-bindgen` to build ecCodes for WebAssembly.

## Overview

Instead of compiling C directly with Emscripten, you can:
1. Build the C library as a static library for `wasm32-unknown-unknown`
2. Create a Rust crate with `wasm-bindgen` wrappers
3. Compile Rust to WASM and generate JavaScript bindings

## Advantages

- **Type-safe bindings** - Rust provides memory safety
- **Better API ergonomics** - Use Rust's type system
- **Leverages existing Rust FFI** - Uses `eccodes-sys` crate
- **Modern tooling** - `wasm-pack`, `wasm-bindgen` are actively maintained

## Challenges

- **C build for wasm32** - Need to cross-compile C dependencies
- **eckit-sys dependency** - Needs wasm32 support or stubs
- **Larger binary size** - Rust runtime adds overhead
- **Limited libc** - WASM has limited stdio support

## Setup

### 1. Install wasm32 target

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### 2. Create a new crate

```bash
cd rust/crates
cargo new --lib eccodes-wasm
```

### 3. Update Cargo.toml

```toml
[package]
name = "eccodes-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
eccodes-sys = { path = "../eccodes-sys", default-features = false, features = ["vendored"] }
wasm-bindgen = "0.2"
js-sys = "0.3"

[features]
default = ["product-grib", "product-bufr"]
product-grib = ["eccodes-sys/product-grib"]
product-bufr = ["eccodes-sys/product-bufr"]
```

### 4. Create lib.rs

```rust
use wasm_bindgen::prelude::*;
use eccodes_sys::*;

#[wasm_bindgen]
pub struct Eccodes {
    context: *mut codes_context,
}

#[wasm_bindgen]
impl Eccodes {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<Eccodes, JsError> {
        let context = unsafe { codes_context_get_default() };
        if context.is_null() {
            return Err(JsError::new("Failed to get default context"));
        }
        Ok(Eccodes { context })
    }

    #[wasm_bindgen]
    pub fn get_version(&self) -> i32 {
        unsafe { codes_get_api_version() }
    }
}

#[wasm_bindgen]
pub struct GribHandle {
    handle: *mut codes_handle,
}

#[wasm_bindgen]
impl GribHandle {
    #[wasm_bindgen]
    pub fn get_long(&self, key: &str) -> Result<i64, JsError> {
        let mut value: libc::c_long = 0;
        let c_key = std::ffi::CString::new(key)?;

        let ret = unsafe { codes_get_long(self.handle, c_key.as_ptr(), &mut value) };

        if ret != 0 {
            return Err(JsError::new(&format!("Failed to get key: {}", key)));
        }

        Ok(value as i64)
    }

    #[wasm_bindgen]
    pub fn get_double(&self, key: &str) -> Result<f64, JsError> {
        let mut value: libc::c_double = 0.0;
        let c_key = std::ffi::CString::new(key)?;

        let ret = unsafe { codes_get_double(self.handle, c_key.as_ptr(), &mut value) };

        if ret != 0 {
            return Err(JsError::new(&format!("Failed to get key: {}", key)));
        }

        Ok(value)
    }

    #[wasm_bindgen]
    pub fn get_string(&self, key: &str) -> Result<String, JsError> {
        let c_key = std::ffi::CString::new(key)?;
        let mut length = 1024;

        let mut buffer = vec![0u8; length];
        let ret = unsafe {
            codes_get_string(
                self.handle,
                c_key.as_ptr(),
                buffer.as_mut_ptr() as *mut libc::c_char,
                &mut length,
            )
        };

        if ret != 0 {
            return Err(JsError::new(&format!("Failed to get key: {}", key)));
        }

        let null_pos = buffer.iter().position(|&x| x == 0).unwrap_or(length);
        Ok(String::from_utf8_lossy(&buffer[..null_pos]).to_string())
    }

    pub fn delete(&mut self) {
        if !self.handle.is_null() {
            unsafe {
                codes_handle_delete(self.handle);
            }
            self.handle = std::ptr::null_mut();
        }
    }
}

impl Drop for GribHandle {
    fn drop(&mut self) {
        self.delete();
    }
}
```

### 5. Build for Node.js

```bash
wasm-pack build --target nodejs
```

This creates:
- `pkg/eccodes_wasm.js` - JavaScript bindings
- `pkg/eccodes_wasm_bg.wasm` - WASM binary
- `pkg/eccodes_wasm_bg.js` - WASM glue

### 6. Use in Node.js

```javascript
const { Eccodes } = require('./pkg/eccodes_wasm.js');

async function main() {
    const eccodes = new Eccodes();
    console.log('Version:', eccodes.get_version());
}

main();
```

## File I/O Considerations

WASM has limited filesystem access. For file operations:

### Option 1: Emscripten Filesystem with Rust

```toml
[dependencies.web-sys]
version = "0.3"
features = [
  "Window",
  "Worker",
  "WorkerGlobalScope",
]
```

### Option 2: Pass data directly

```rust
#[wasm_bindgen]
pub fn open_from_buffer(data: &[u8]) -> Result<GribHandle, JsError> {
    let handle = unsafe {
        codes_handle_new_from_message_copy(
            std::ptr::null_mut(),
            data.as_ptr(),
            data.len(),
        )
    };

    if handle.is_null() {
        return Err(JsError::new("Failed to create handle from buffer"));
    }

    Ok(GribHandle { handle })
}
```

## C Build Configuration

For the C dependencies, you'll need a `.cargo/config.toml`:

```toml
[target.wasm32-unknown-unknown]
ar = "llvm-ar"
linker = "rust-lld"

[target.wasm32-unknown-unknown.dependencies]
libc = { git = "https://github.com/rust-lang/libc", features = ["wasi"] }
```

## Comparison: Emscripten vs Rust+wasm-bindgen

| Aspect | Emscripten | Rust + wasm-bindgen |
|--------|-----------|---------------------|
| Build complexity | Medium | High (C+Rust) |
| Binary size | Smaller | Larger (Rust runtime) |
| Type safety | C only | Rust + JS |
| API ergonomics | Requires manual wrapper | wasm-bindgen generates |
| File I/O | Built-in FS support | Requires web-sys or custom |
| C dependencies | Direct compile | Need static lib for wasm32 |
| Maintenance | Single build chain | Two build chains |

## Recommendation

For **minimal setup and smaller binaries**, use the **Emscripten approach** (`build_wasm.py`).

For **type-safe, idiomatic JS API** and if you're already using Rust, use the **Rust + wasm-bindgen approach**.

The Emscripten approach is recommended for getting started quickly.