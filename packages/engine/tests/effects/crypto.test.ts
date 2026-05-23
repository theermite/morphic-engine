/**
 * Tests — effects/crypto.ts
 *
 * CDC ref : F-018 (Effect-TS résilience — wrapper async crypto bridge)
 * Brick   : B-019
 * Risk    : Sensitive (90% coverage)
 *
 * Scope:
 *   - `getCryptoBackend()` always succeeds (core falls back to JS on any
 *     error) — Effect signature: `Effect.Effect<CryptoBackend, never>`
 *   - `loadWasmBackend()` can fail; failure is typed as CryptoError
 *   - The resolved backend exposes the contract used by callers
 */

import { Cause, Effect, Exit } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as Crypto from '../../src/effects/crypto.js';
import { CryptoError } from '../../src/effects/errors.js';
import { __setBackendForTesting } from '../../src/wasm-bridge.js';

afterEach(() => {
  __setBackendForTesting(null);
  vi.doUnmock('@morphic/wasm-core');
});

describe('Crypto.getCryptoBackend', () => {
  it('resolves to the JS backend when WASM is unavailable', async () => {
    __setBackendForTesting(null);
    vi.doMock('@morphic/wasm-core', () => {
      throw new Error('not present');
    });

    const backend = await Effect.runPromise(Crypto.getCryptoBackend());
    expect(backend.kind).toBe('js');
  });

  it('honors a test-injected backend', async () => {
    __setBackendForTesting({
      kind: 'wasm',
      generateKeyPair: () => ({
        publicKey: new Uint8Array(32),
        secretKey: new Uint8Array(32),
      }),
      generateNonce: () => new Uint8Array(24),
      encryptBox: () => new Uint8Array([0xab]),
      decryptBox: () => new Uint8Array([0xcd]),
    });

    const backend = await Effect.runPromise(Crypto.getCryptoBackend());
    expect(backend.kind).toBe('wasm');
  });
});

describe('Crypto.loadWasmBackend — typed failure', () => {
  it('converts a thrown load error into CryptoError(load-wasm)', async () => {
    vi.doMock('@morphic/wasm-core', () => {
      throw new Error('simulated load failure');
    });

    const exit = await Effect.runPromiseExit(Crypto.loadWasmBackend());
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe('Some');
      if (failure._tag === 'Some') {
        expect(failure.value).toBeInstanceOf(CryptoError);
        expect((failure.value as CryptoError).operation).toBe('load-wasm');
      }
    }
  });

  it('converts a failed smoke check into CryptoError(load-wasm)', async () => {
    vi.doMock('@morphic/wasm-core', () => ({
      default: async () => undefined,
      wasmGenerateKeypair: () => ({
        publicKey: new Uint8Array(32),
        secretKey: new Uint8Array(32),
      }),
      // Smoke check requires 24-byte nonce — return 8 to fail it.
      wasmGenerateNonce: () => new Uint8Array(8),
      wasmEncryptBox: () => new Uint8Array(),
      wasmDecryptBox: () => new Uint8Array(),
    }));

    const exit = await Effect.runPromiseExit(Crypto.loadWasmBackend());
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe('Some');
      if (failure._tag === 'Some') {
        expect(failure.value).toBeInstanceOf(CryptoError);
        expect((failure.value as CryptoError).operation).toBe('load-wasm');
      }
    }
  });
});
