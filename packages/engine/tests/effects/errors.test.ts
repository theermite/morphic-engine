/**
 * Tests — effects/errors.ts
 *
 * CDC ref : F-018 (Effect-TS résilience — structured errors)
 * Brick   : B-019
 * Risk    : Sensitive (90% coverage)
 *
 * Scope: validate that each tagged error
 *   1. has the correct `_tag` discriminant (Data.TaggedError contract)
 *   2. carries the operation + cause fields verbatim
 *   3. is matchable via Effect's typed-error machinery
 */

import { Cause, Effect, Exit } from 'effect';
import { describe, expect, it } from 'vitest';
import { CryptoError, StorageError } from '../../src/effects/errors.js';

describe('StorageError', () => {
  it('has _tag = "StorageError"', () => {
    const err = new StorageError({ operation: 'load', cause: new Error('boom') });
    expect(err._tag).toBe('StorageError');
  });

  it('carries operation and cause verbatim', () => {
    const cause = new Error('idb closed');
    const err = new StorageError({ operation: 'persist', cause });
    expect(err.operation).toBe('persist');
    expect(err.cause).toBe(cause);
  });

  it('is propagated as a Failure in Effect runtime', async () => {
    const program = Effect.fail(new StorageError({ operation: 'open', cause: 'no-idb' }));
    const exit = await Effect.runPromiseExit(program);
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      expect(failure._tag).toBe('Some');
      if (failure._tag === 'Some') {
        expect(failure.value._tag).toBe('StorageError');
        expect((failure.value as StorageError).operation).toBe('open');
      }
    }
  });
});

describe('CryptoError', () => {
  it('has _tag = "CryptoError"', () => {
    const err = new CryptoError({ operation: 'load-wasm', cause: new Error('boom') });
    expect(err._tag).toBe('CryptoError');
  });

  it('carries operation and cause verbatim', () => {
    const cause = new Error('wasm 404');
    const err = new CryptoError({ operation: 'load-wasm', cause });
    expect(err.operation).toBe('load-wasm');
    expect(err.cause).toBe(cause);
  });

  it('is distinct from StorageError under discriminated union match', () => {
    const errs: ReadonlyArray<StorageError | CryptoError> = [
      new StorageError({ operation: 'load', cause: null }),
      new CryptoError({ operation: 'load-wasm', cause: null }),
    ];
    const tags = errs.map((e) => e._tag);
    expect(tags).toEqual(['StorageError', 'CryptoError']);
  });
});
