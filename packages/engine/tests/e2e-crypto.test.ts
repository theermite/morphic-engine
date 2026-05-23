/**
 * Tests for B-017 — E2E Encryption (NaCl box)
 *
 * CDC ref  : F-016
 * Risk     : Critical (95% coverage + MC/DC + PBT + mutation 75%)
 * TDG      : tests written BEFORE implementation (red).
 *
 * Dependencies:
 *   - tweetnacl@1.0.3 (NaCl box: curve25519-xsalsa20-poly1305)
 *   - fast-check@4.8.0 (PBT Layer 1)
 */

import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetCryptoStateForTests,
  decryptPayload,
  type EncryptedPayload,
  encryptPayload,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
  MORPHIC_CRYPTO_MARKER,
  MORPHIC_CRYPTO_VERSION,
  MORPHIC_NONCE_LENGTH,
} from '../src/e2e-crypto.js';

// ---------------------------------------------------------------------------
// Test isolation
// ---------------------------------------------------------------------------

afterEach(() => {
  __resetCryptoStateForTests();
});

// ============================================================================
// §1 — Constants
// ============================================================================

describe('Constants', () => {
  it('should_export_crypto_marker', () => {
    expect(MORPHIC_CRYPTO_MARKER).toBe('data-morphic-crypto');
  });

  it('should_export_crypto_version', () => {
    expect(MORPHIC_CRYPTO_VERSION).toBe(1);
  });

  it('should_export_nonce_length', () => {
    expect(MORPHIC_NONCE_LENGTH).toBe(24);
  });
});

// ============================================================================
// §2 — generateKeyPair
// ============================================================================

describe('generateKeyPair', () => {
  it('should_generate_valid_keypair', () => {
    const kp = generateKeyPair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(32);
  });

  it('should_generate_different_keypairs', () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    expect(kp1.publicKey).not.toEqual(kp2.publicKey);
    expect(kp1.secretKey).not.toEqual(kp2.secretKey);
  });
});

// ============================================================================
// §3 — exportPublicKey / importPublicKey
// ============================================================================

describe('exportPublicKey / importPublicKey', () => {
  it('should_roundtrip_public_key_base64', () => {
    const kp = generateKeyPair();
    const exported = exportPublicKey(kp.publicKey);
    expect(typeof exported).toBe('string');
    expect(exported.length).toBeGreaterThan(0);

    const imported = importPublicKey(exported);
    expect(imported).toEqual(kp.publicKey);
  });

  it('should_throw_on_invalid_base64', () => {
    expect(() => importPublicKey('not-valid-base64!!!')).toThrow(/invalid/i);
  });

  it('should_throw_on_wrong_length_key', () => {
    // Valid base64 but wrong key length (16 bytes instead of 32)
    const short = btoa(String.fromCharCode(...new Uint8Array(16)));
    expect(() => importPublicKey(short)).toThrow(/32 bytes/i);
  });
});

// ============================================================================
// §4 — encryptPayload / decryptPayload
// ============================================================================

describe('encryptPayload / decryptPayload', () => {
  it('should_encrypt_and_decrypt_roundtrip', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const plaintext = new Uint8Array([1, 2, 3, 4, 5]);

    const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
    expect(encrypted.nonce).toBeInstanceOf(Uint8Array);
    expect(encrypted.nonce.length).toBe(24);
    expect(encrypted.version).toBe(MORPHIC_CRYPTO_VERSION);

    const decrypted = decryptPayload(encrypted, alice.publicKey, bob.secretKey);
    expect(decrypted).toEqual(plaintext);
  });

  it('should_fail_decryption_with_wrong_key', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const mallory = generateKeyPair();
    const plaintext = new Uint8Array([1, 2, 3]);

    const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    expect(() => decryptPayload(encrypted, alice.publicKey, mallory.secretKey)).toThrow(
      /decryption failed/i,
    );
  });

  it('should_fail_decryption_with_tampered_ciphertext', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const plaintext = new Uint8Array([1, 2, 3]);

    const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    encrypted.ciphertext[0] ^= 0xff;
    expect(() => decryptPayload(encrypted, alice.publicKey, bob.secretKey)).toThrow(
      /decryption failed/i,
    );
  });

  it('should_fail_decryption_with_tampered_nonce', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const plaintext = new Uint8Array([1, 2, 3]);

    const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    encrypted.nonce[0] ^= 0xff;
    expect(() => decryptPayload(encrypted, alice.publicKey, bob.secretKey)).toThrow(
      /decryption failed/i,
    );
  });

  it('should_produce_different_ciphertexts_for_same_plaintext', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const plaintext = new Uint8Array([1, 2, 3]);

    const enc1 = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    const enc2 = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    expect(enc1.nonce).not.toEqual(enc2.nonce);
    expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);
  });

  it('should_handle_empty_plaintext', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const plaintext = new Uint8Array(0);

    const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = decryptPayload(encrypted, alice.publicKey, bob.secretKey);
    expect(decrypted).toEqual(plaintext);
  });
});

// ============================================================================
// §5 — MC/DC (defensive assertions)
// ============================================================================

describe('MC/DC — defensive assertions', () => {
  it('should_throw_on_null_plaintext', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    expect(() =>
      encryptPayload(null as unknown as Uint8Array, bob.publicKey, alice.secretKey),
    ).toThrow(/plaintext.*Uint8Array/i);
  });

  it('should_throw_on_null_recipient_key', () => {
    const alice = generateKeyPair();
    expect(() =>
      encryptPayload(new Uint8Array([1]), null as unknown as Uint8Array, alice.secretKey),
    ).toThrow(/recipientPublicKey.*Uint8Array/i);
  });

  it('should_throw_on_null_sender_secret', () => {
    const bob = generateKeyPair();
    expect(() =>
      encryptPayload(new Uint8Array([1]), bob.publicKey, null as unknown as Uint8Array),
    ).toThrow(/senderSecretKey.*Uint8Array/i);
  });

  it('should_throw_on_wrong_length_recipient_key', () => {
    const alice = generateKeyPair();
    expect(() => encryptPayload(new Uint8Array([1]), new Uint8Array(16), alice.secretKey)).toThrow(
      /32 bytes/i,
    );
  });

  it('should_throw_on_wrong_length_sender_secret', () => {
    const bob = generateKeyPair();
    expect(() => encryptPayload(new Uint8Array([1]), bob.publicKey, new Uint8Array(16))).toThrow(
      /32 bytes/i,
    );
  });

  it('should_throw_decrypt_on_null_encrypted', () => {
    const kp = generateKeyPair();
    expect(() =>
      decryptPayload(null as unknown as EncryptedPayload, kp.publicKey, kp.secretKey),
    ).toThrow(/payload/i);
  });

  it('should_throw_decrypt_on_missing_ciphertext', () => {
    const kp = generateKeyPair();
    const bad = { nonce: new Uint8Array(24), version: 1 } as unknown as EncryptedPayload;
    expect(() => decryptPayload(bad, kp.publicKey, kp.secretKey)).toThrow(/ciphertext/i);
  });

  it('should_throw_decrypt_on_missing_nonce', () => {
    const kp = generateKeyPair();
    const bad = { ciphertext: new Uint8Array(32), version: 1 } as unknown as EncryptedPayload;
    expect(() => decryptPayload(bad, kp.publicKey, kp.secretKey)).toThrow(/nonce/i);
  });
});

// ============================================================================
// §6 — Edge cases
// ============================================================================

describe('Edge cases', () => {
  it('should_handle_large_plaintext', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const large = new Uint8Array(100_000);
    large.fill(42);

    const encrypted = encryptPayload(large, bob.publicKey, alice.secretKey);
    const decrypted = decryptPayload(encrypted, alice.publicKey, bob.secretKey);
    expect(decrypted).toEqual(large);
  });

  it('should_export_key_as_valid_base64', () => {
    const kp = generateKeyPair();
    const exported = exportPublicKey(kp.publicKey);
    expect(exported).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

// ============================================================================
// §7 — PBT (Property-Based Testing — Layer 1 Anti-Circular)
// ============================================================================

describe('PBT — fast-check', () => {
  it('should_roundtrip_any_plaintext', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 1000 }), (plaintext) => {
        const alice = generateKeyPair();
        const bob = generateKeyPair();
        const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
        const decrypted = decryptPayload(encrypted, alice.publicKey, bob.secretKey);
        expect(decrypted).toEqual(plaintext);
      }),
      { numRuns: 30 },
    );
  });

  it('should_always_produce_unique_nonces', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 100 }), (plaintext) => {
        const alice = generateKeyPair();
        const bob = generateKeyPair();
        const enc1 = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
        const enc2 = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
        const match = enc1.nonce.every((b, i) => b === enc2.nonce[i]);
        expect(match).toBe(false);
      }),
      { numRuns: 20 },
    );
  });

  it('should_fail_decryption_with_wrong_keypair', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 100 }), (plaintext) => {
        const alice = generateKeyPair();
        const bob = generateKeyPair();
        const mallory = generateKeyPair();
        const encrypted = encryptPayload(plaintext, bob.publicKey, alice.secretKey);
        expect(() => decryptPayload(encrypted, alice.publicKey, mallory.secretKey)).toThrow(
          /decryption failed/i,
        );
      }),
      { numRuns: 20 },
    );
  });

  it('should_roundtrip_public_key_export_import', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const kp = generateKeyPair();
        const exported = exportPublicKey(kp.publicKey);
        const imported = importPublicKey(exported);
        expect(imported).toEqual(kp.publicKey);
      }),
      { numRuns: 20 },
    );
  });
});
