/**
 * Effect-TS structured errors — Layer 3 resilience contract.
 *
 * CDC ref : F-018 (Effect-TS résilience — algebraic effects, structured errors)
 * Brick   : B-019
 * Risk    : Sensitive (90% coverage)
 *
 * Each domain has its own `Data.TaggedError` so callers can pattern-match on
 * the `_tag` discriminant via `Effect.catchTag` / `Effect.catchTags` without
 * losing type information. The `operation` field narrows further (e.g. a
 * StorageError carries which storage call failed: load / persist / clear …).
 *
 * Why TaggedError (not plain `Error`):
 *   - Effect's `Effect.Effect<A, E>` requires `E` to be discriminable for
 *     `catchTag` / `catchTags` to type-check.
 *   - `instanceof` checks survive across realms inconsistently; `_tag`
 *     does not.
 *   - The same shape is used by all Effect-TS ecosystems (Schema, Stream,
 *     Layer …) — staying within the canon keeps interop free.
 *
 * Defensive note (PET §5):
 *   We never lose the original `cause` — even when the underlying error is
 *   an arbitrary `unknown` thrown value, it is captured verbatim so that
 *   downstream telemetry (B-022) can reconstruct the chain.
 */

import { Data } from 'effect';

/**
 * Storage subsystem failure.
 *
 * `operation` distinguishes which call failed so callers can match precisely
 * (e.g. retry on `load` but escalate on `migrate`).
 */
export class StorageError extends Data.TaggedError('StorageError')<{
  readonly operation: 'load' | 'persist' | 'clear' | 'migrate' | 'open' | 'status';
  readonly cause: unknown;
}> {}

/**
 * Crypto subsystem failure.
 *
 * Note that `getCryptoBackend()` (the orchestrator) is total — it falls back
 * to the JS backend on any wasm load issue. Only the explicit
 * `loadWasmBackend()` path can produce a `CryptoError`.
 */
export class CryptoError extends Data.TaggedError('CryptoError')<{
  readonly operation: 'load-backend' | 'load-wasm' | 'load-js';
  readonly cause: unknown;
}> {}
