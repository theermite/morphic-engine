/**
 * WASM Crypto Bridge — async loader for @morphic/wasm-core with TS fallback.
 *
 * CDC ref : F-017 (Tri-layer Rust→WASM critical paths)
 * Brick   : B-018
 * Risk    : Critical (95% coverage + parity TS↔WASM)
 *
 * Architecture:
 *   - The WASM module is loaded LAZILY via `import('@morphic/wasm-core')`.
 *   - If the load succeeds, callers get the high-performance Rust backend.
 *   - If the load fails (no WebAssembly, missing pkg/, bundler omitted it,
 *     hostile environment), callers fall back to `tweetnacl` automatically.
 *   - Result: zero bundle weight when WASM is not used, zero breakage when
 *     WASM is not available.
 *
 * Defensive assertions (PET §5, ≥2 per critical function):
 *   1. loadCryptoBackend: caches the resolved backend (idempotent across calls)
 *   2. loadCryptoBackend: any thrown error during WASM init falls back to JS
 *   3. Both backends honor the same byte layout (parity property tested in
 *      tests/wasm-bridge.test.ts) — Rust output decryptable by tweetnacl and
 *      vice versa.
 */

import nacl from 'tweetnacl';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CryptoBackendKind = 'wasm' | 'js';

export interface CryptoBackend {
  readonly kind: CryptoBackendKind;
  generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array };
  generateNonce(): Uint8Array;
  encryptBox(
    plaintext: Uint8Array,
    recipientPk: Uint8Array,
    senderSk: Uint8Array,
    nonce: Uint8Array,
  ): Uint8Array;
  decryptBox(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    senderPk: Uint8Array,
    recipientSk: Uint8Array,
  ): Uint8Array;
}

// ---------------------------------------------------------------------------
// JS backend (tweetnacl) — always available, sync, ~30 KB gzipped
// ---------------------------------------------------------------------------

const jsBackend: CryptoBackend = {
  kind: 'js',
  generateKeyPair() {
    const kp = nacl.box.keyPair();
    return { publicKey: kp.publicKey, secretKey: kp.secretKey };
  },
  generateNonce() {
    return nacl.randomBytes(nacl.box.nonceLength);
  },
  encryptBox(plaintext, recipientPk, senderSk, nonce) {
    return nacl.box(plaintext, nonce, recipientPk, senderSk);
  },
  decryptBox(ciphertext, nonce, senderPk, recipientSk) {
    const result = nacl.box.open(ciphertext, nonce, senderPk, recipientSk);
    if (result === null) {
      throw new Error('decryptBox: authentication failure (js backend)');
    }
    return result;
  },
};

// ---------------------------------------------------------------------------
// WASM backend — lazy-loaded, ~58 KB, ~2-5x faster on sustained workloads
// ---------------------------------------------------------------------------

interface WasmModule {
  default: (init?: unknown) => Promise<unknown>;
  wasmGenerateKeypair: () => { publicKey: Uint8Array; secretKey: Uint8Array };
  wasmGenerateNonce: () => Uint8Array;
  wasmEncryptBox: (
    plaintext: Uint8Array,
    recipientPk: Uint8Array,
    senderSk: Uint8Array,
    nonce: Uint8Array,
  ) => Uint8Array;
  wasmDecryptBox: (
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    senderPk: Uint8Array,
    recipientSk: Uint8Array,
  ) => Uint8Array;
}

function makeWasmBackend(mod: WasmModule): CryptoBackend {
  return {
    kind: 'wasm',
    generateKeyPair() {
      const kp = mod.wasmGenerateKeypair();
      // Copy out of the WASM-owned memory views so callers can free the
      // keypair object without holding dangling references.
      return {
        publicKey: new Uint8Array(kp.publicKey),
        secretKey: new Uint8Array(kp.secretKey),
      };
    },
    generateNonce() {
      return new Uint8Array(mod.wasmGenerateNonce());
    },
    encryptBox(plaintext, recipientPk, senderSk, nonce) {
      return new Uint8Array(
        mod.wasmEncryptBox(plaintext, recipientPk, senderSk, nonce),
      );
    },
    decryptBox(ciphertext, nonce, senderPk, recipientSk) {
      // wasm-bindgen surfaces `Err(JsError)` as a thrown Error — let it
      // propagate; callers expect a thrown failure on authentication errors,
      // matching the JS backend contract.
      return new Uint8Array(
        mod.wasmDecryptBox(ciphertext, nonce, senderPk, recipientSk),
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Loader — idempotent, lazy, fallback on any failure
// ---------------------------------------------------------------------------

let backendPromise: Promise<CryptoBackend> | null = null;

/**
 * Resolve a crypto backend. Returns the WASM-backed implementation when
 * `@morphic/wasm-core` is available and successfully initialized; otherwise
 * returns the tweetnacl-backed implementation.
 *
 * Subsequent calls return the same promise (and therefore the same backend
 * instance) — the WASM module is loaded at most once per process.
 *
 * Failures during dynamic import or initialization are SWALLOWED on purpose:
 * the bridge contract is "best available", not "WASM or nothing". For tests
 * that need to assert WASM-only behavior, use `loadWasmBackend()` directly.
 */
export function getCryptoBackend(): Promise<CryptoBackend> {
  if (backendPromise === null) {
    backendPromise = loadWasmBackend()
      .catch(() => jsBackend);
  }
  return backendPromise;
}

/**
 * Force-load the WASM backend. Throws if @morphic/wasm-core cannot be
 * loaded or initialized. Used by tests and by callers that explicitly want
 * to fail loudly when WASM is unavailable (e.g., to log a perf warning).
 */
export async function loadWasmBackend(): Promise<CryptoBackend> {
  // The string is built dynamically so bundlers without the wasm package
  // installed don't fail at build time — the import is opt-in.
  const specifier = '@morphic/wasm-core';
  const mod = (await import(/* @vite-ignore */ specifier)) as WasmModule;
  // wasm-pack's `--target web` requires explicit init (async fetch of the
  // .wasm file). On `--target bundler` or Node, init is automatic, but
  // calling it is harmless.
  if (typeof mod.default === 'function') {
    try {
      await mod.default();
    } catch {
      // Already initialized, or environment doesn't need explicit init.
      // Verified by trying a no-op call below.
    }
  }
  // Smoke check: backend is usable
  const probe = mod.wasmGenerateNonce();
  if (!(probe instanceof Uint8Array) || probe.length !== 24) {
    throw new Error('wasm-bridge: backend smoke check failed');
  }
  return makeWasmBackend(mod);
}

/**
 * Force the in-process backend cache to a specific value. Test-only.
 * Pass `null` to clear the cache and re-trigger lazy load on next call.
 */
export function __setBackendForTesting(backend: CryptoBackend | null): void {
  backendPromise = backend === null ? null : Promise.resolve(backend);
}

/** Returns the always-available JS backend without touching the cache. */
export function getJsBackend(): CryptoBackend {
  return jsBackend;
}
