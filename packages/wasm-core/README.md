# @morphic/wasm-core

Rust → WebAssembly critical paths for the Morphic Adaptation Engine.

**Status**: B-018 (live). NaCl box primitives shipped.
CDC ref: F-017 (Tri-layer Rust→WASM critical).

## What it provides

NaCl-compatible authenticated encryption (Curve25519 + XSalsa20 + Poly1305)
via the audited [`crypto_box`](https://crates.io/crates/crypto_box) crate
(RustCrypto, pure Rust). Output is byte-identical to `tweetnacl.box`, so
ciphertexts produced by either side are interchangeable.

Exported API (TypeScript via `wasm-bindgen`):

| Function | Returns | Purpose |
|----------|---------|---------|
| `wasmGenerateKeypair()` | `WasmKeyPair` (publicKey + secretKey) | Curve25519 key pair via OsRng (Web Crypto in browser) |
| `wasmGenerateNonce()` | `Uint8Array` (24 bytes) | Random XSalsa20 nonce |
| `wasmRandomBytes(len)` | `Uint8Array` | CSPRNG bytes |
| `wasmEncryptBox(plaintext, recipientPk, senderSk, nonce)` | `Uint8Array` | Authenticated ciphertext (plaintext + 16-byte Poly1305 tag) |
| `wasmDecryptBox(ciphertext, nonce, senderPk, recipientSk)` | `Uint8Array` | Plaintext, or throws `JsError` on auth failure |

## Build

```bash
pnpm --filter @morphic/wasm-core build           # target web
pnpm --filter @morphic/wasm-core build:bundler   # target bundler (Vite/webpack)
```

Output lands in `pkg/` (ESM + `.d.ts` + raw `.wasm`, ~58 KB). The bundle
is loaded **lazily** by `packages/engine/src/wasm-bridge.ts` so projects
that don't need WASM crypto pay 0 KB.

## Tests

```bash
pnpm --filter @morphic/wasm-core test            # native cargo tests
```

Runs 9 tests, including 4 property-based tests × 1024 cases (= 4096
encrypt/decrypt round-trips) covering:

- Round-trip identity (`decrypt(encrypt(m)) == m`)
- Bit-flip tamper detection (Poly1305 catches every alteration)
- Wrong-nonce rejection
- Wrong-key rejection (with a positive sanity check inside)

Plus 5 deterministic fixtures (key/nonce lengths, tag overhead, empty
plaintext, truncated ciphertext).

## Why Rust → WASM (vs staying on tweetnacl-js)

- **Maintenance**: `tweetnacl-js` is unmaintained since 2020. `crypto_box`
  is part of the actively-maintained RustCrypto ecosystem.
- **Audit surface**: pure-Rust, no JS legacy. Smaller dependency tree.
- **Performance**: WASM crypto ~2-5× faster than JS for sustained workloads
  (large message batches, many keypairs).
- **Determinism**: same binary across Node, Deno, browsers — no engine
  variance on a critical path.

## Defensive assertions (PET §5)

| Function | Assertions |
|----------|-----------|
| `wasm_encrypt_box` / `wasm_decrypt_box` | key lengths = 32 bytes; nonce length = 24 bytes |
| `wasm_decrypt_box` | authentication failures surface as `Err` (no silent corruption) |
| `wasm_generate_keypair` | uses `OsRng` (browser Web Crypto via `getrandom` js feature) |

Length checks pulled into a single `validate_box_inputs` helper to keep
the audit trail concentrated.

## License

AGPL-3.0-or-later (matches the rest of the Morphic Engine).
