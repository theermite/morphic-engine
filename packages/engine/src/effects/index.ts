/**
 * Public entry — `@morphic/engine/effects`.
 *
 * CDC ref : F-018 (Effect-TS résilience — opt-in subpath)
 * Brick   : B-019
 *
 * Consumers reach this via the subpath export declared in
 * `packages/engine/package.json`:
 *
 *     import { Storage, Crypto, StorageError } from '@morphic/engine/effects';
 *
 * Core consumers (`import { … } from '@morphic/engine'`) pay 0 KB of Effect-TS
 * bundle weight — `effect` is a peerDependency (optional) here, never imported
 * from the core layer.
 *
 * Two namespaces avoid name collisions between Storage and Crypto wrappers
 * that share generic names (e.g. `loadX`). Errors are flat re-exported so
 * `Effect.catchTag('StorageError', …)` stays ergonomic.
 */

export * as Crypto from './crypto.js';
export * from './errors.js';
export * as Storage from './storage.js';
