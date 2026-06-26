# @theermite/morphic-wasm-core

Rust → WebAssembly critical paths for the Morphic Adaptation Engine.

**Version**: `2.0.0-alpha.0` (not published to npm — consumed internally by the engine)  
**Status**: Shipped. NaCl box primitives operational.

## What it provides

NaCl-compatible authenticated encryption (Curve25519 + XSalsa20 + Poly1305) via the audited [`crypto_box`](https://crates.io/crates/crypto_box) crate (RustCrypto, pure Rust). Output is byte-identical to `tweetnacl.box`, so ciphertexts produced by either side are interchangeable.

Exported API (TypeScript via `wasm-bindgen`):

| Function | Returns | Purpose |
|----------|---------|---------|
| `wasmGenerateKeypair()` | `WasmKeyPair` (publicKey + secretKey) | Curve25519 key pair via OsRng (Web Crypto in browser) |
| `wasmGenerateNonce()` | `Uint8Array` (24 bytes) | Random XSalsa20 nonce |
| `wasmRandomBytes(len)` | `Uint8Array` | CSPRNG bytes |
| `wasmEncryptBox(plaintext, recipientPk, senderSk, nonce)` | `Uint8Array` | Authenticated ciphertext (plaintext + 16-byte Poly1305 tag) |
| `wasmDecryptBox(ciphertext, nonce, senderPk, recipientSk)` | `Uint8Array` | Plaintext, or throws `JsError` on authentication failure |

## Build

```bash
pnpm --filter @theermite/morphic-wasm-core build           # target web
pnpm --filter @theermite/morphic-wasm-core build:bundler   # target bundler (Vite/webpack)
```

Output lands in `pkg/` (ESM + `.d.ts` + raw `.wasm`, ~58 KB). The bundle is loaded **lazily** by `packages/engine/src/wasm-bridge.ts` — projects that don't need WASM crypto pay 0 KB.

## Tests

```bash
pnpm --filter @theermite/morphic-wasm-core test   # native cargo tests
```

9 tests total:

- **4 property-based tests** × 1024 cases (= 4096 encrypt/decrypt round-trips) covering: round-trip identity, bit-flip tamper detection (Poly1305), wrong-nonce rejection, wrong-key rejection
- **5 deterministic fixtures**: key/nonce lengths, tag overhead, empty plaintext, truncated ciphertext

## Defensive assertions (PET §5)

| Function | Assertions |
|----------|------------|
| `wasm_encrypt_box` / `wasm_decrypt_box` | key lengths = 32 bytes; nonce length = 24 bytes |
| `wasm_decrypt_box` | authentication failures surface as `Err` (no silent corruption) |
| `wasm_generate_keypair` | uses `OsRng` (browser Web Crypto via `getrandom` js feature) |

Length checks are centralised in a single `validate_box_inputs` helper to keep the audit trail concentrated.

## Note on wasm-opt

`wasm-opt` is intentionally disabled. The bundled version is too old to support `bulk-memory` operations emitted by rustc since 1.82. All modern browsers (Chrome ≥ 75, Firefox ≥ 79, Safari ≥ 15) support `bulk-memory` natively.

## Why Rust → WASM instead of tweetnacl-js

- **Maintenance**: `tweetnacl-js` has been unmaintained since 2020. `crypto_box` is part of the actively-maintained RustCrypto ecosystem.
- **Audit surface**: pure Rust, no JS legacy. Smaller dependency tree.
- **Performance**: WASM crypto is ~2–5× faster than JS for sustained workloads.
- **Determinism**: same binary across Node, Deno, and browsers — no engine variance on a critical path.

## License

AGPL-3.0-or-later. See repo root.
