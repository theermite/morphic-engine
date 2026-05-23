/**
 * Effect-TS wrappers around the WASM crypto bridge.
 *
 * CDC ref : F-018 (Effect-TS résilience — wrap wasm-bridge async)
 * Brick   : B-019
 * Risk    : Sensitive (90% coverage)
 *
 * Two surfaces:
 *   - `getCryptoBackend()` is total — the core orchestrator already swallows
 *     wasm load failures and falls back to the JS backend. The Effect signature
 *     therefore carries `never` as the error channel.
 *   - `loadWasmBackend()` is partial — it explicitly fails when WASM is
 *     unavailable. The Effect signature carries `CryptoError` so callers can
 *     `Effect.catchTag('CryptoError', …)` to provide telemetry / fallback.
 *
 * Defensive assertions (PET §5):
 *   1. `getCryptoBackend` uses `Effect.promise` — the contract guarantees no
 *      thrown error reaches the catch handler (verified in core wasm-bridge
 *      via `loadWasmBackend().catch(() => jsBackend)`).
 *   2. `loadWasmBackend` uses `Effect.tryPromise` — any thrown value becomes
 *      a typed `CryptoError({operation: 'load-wasm', cause})`.
 */

import { Effect } from 'effect';

import {
  type CryptoBackend,
  getCryptoBackend as getCryptoBackendCore,
  loadWasmBackend as loadWasmBackendCore,
} from '../wasm-bridge.js';
import { CryptoError } from './errors.js';

/**
 * Effect-wrapped {@link getCryptoBackendCore}. Total — never fails because the
 * core orchestrator falls back to the JS backend on any wasm load issue.
 */
export const getCryptoBackend = (): Effect.Effect<CryptoBackend, never> =>
  Effect.promise(() => getCryptoBackendCore());

/**
 * Effect-wrapped {@link loadWasmBackendCore}. Partial — fails with a
 * `CryptoError({operation: 'load-wasm'})` when WASM cannot be loaded or the
 * smoke check rejects the backend.
 */
export const loadWasmBackend = (): Effect.Effect<CryptoBackend, CryptoError> =>
  Effect.tryPromise({
    try: () => loadWasmBackendCore(),
    catch: (cause) => new CryptoError({ operation: 'load-wasm', cause }),
  });
