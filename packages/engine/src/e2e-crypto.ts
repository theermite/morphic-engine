/**
 * E2E Encryption — NaCl box (curve25519-xsalsa20-poly1305)
 *
 * CDC ref : F-016 (Sync E2E chiffré NaCl `box` opt-in)
 * Brick   : B-017
 * Risk    : Critical (95% coverage + MC/DC + PBT + mutation 75%)
 *
 * Architecture:
 *   - Zero-knowledge: the relay server NEVER decrypts preferences
 *   - NaCl `box` = authenticated encryption (Curve25519 + XSalsa20 + Poly1305)
 *   - Random nonce per message (24 bytes) — no replay
 *   - Key pair = Curve25519 (32 bytes public, 32 bytes secret)
 *   - Future: migrate to Rust WASM (B-017a) for performance on large payloads
 *
 * Defensive assertions (PET §5, ≥2 per critical function):
 *   1. encryptPayload: all inputs must be Uint8Array of correct length
 *   2. encryptPayload: nonce is random (nacl.randomBytes)
 *   3. decryptPayload: payload must have ciphertext + nonce
 *   4. decryptPayload: null result from nacl.box.open = tampered data
 *   5. importPublicKey: decoded key must be exactly 32 bytes
 */

import nacl from 'tweetnacl';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** DOM marker attribute for crypto status. */
export const MORPHIC_CRYPTO_MARKER = 'data-morphic-crypto' as const;

/** Encryption protocol version (for future migrations). */
export const MORPHIC_CRYPTO_VERSION = 1 as const;

/** NaCl nonce length in bytes. */
export const MORPHIC_NONCE_LENGTH = 24 as const;

/** NaCl public/secret key length in bytes. */
const KEY_LENGTH = 32;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A Curve25519 key pair for NaCl box encryption. */
export interface MorphicKeyPair {
  /** 32-byte Curve25519 public key. */
  publicKey: Uint8Array;
  /** 32-byte Curve25519 secret key. */
  secretKey: Uint8Array;
}

/** Encrypted payload ready for relay. */
export interface EncryptedPayload {
  /** Encrypted data (NaCl box output). */
  ciphertext: Uint8Array;
  /** 24-byte random nonce used for this encryption. */
  nonce: Uint8Array;
  /** Protocol version for future-proofing. */
  version: number;
}

// ---------------------------------------------------------------------------
// generateKeyPair
// ---------------------------------------------------------------------------

/**
 * Generate a new Curve25519 key pair for NaCl box encryption.
 */
export function generateKeyPair(): MorphicKeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
  };
}

// ---------------------------------------------------------------------------
// exportPublicKey / importPublicKey
// ---------------------------------------------------------------------------

/**
 * Export a public key as base64 string (for sharing/storage).
 */
export function exportPublicKey(publicKey: Uint8Array): string {
  return uint8ToBase64(publicKey);
}

/**
 * Import a public key from base64 string.
 *
 * Defensive assertions:
 *   5. Decoded key must be exactly 32 bytes
 *
 * @throws TypeError if base64 is invalid or key length is wrong
 */
export function importPublicKey(base64: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = base64ToUint8(base64);
  } catch {
    throw new TypeError('importPublicKey: invalid base64 string');
  }

  if (bytes.length !== KEY_LENGTH) {
    throw new TypeError(`importPublicKey: key must be 32 bytes, got ${bytes.length}`);
  }

  return bytes;
}

// ---------------------------------------------------------------------------
// encryptPayload
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext payload using NaCl box.
 *
 * Defensive assertions:
 *   1. All inputs must be Uint8Array of correct length
 *   2. Nonce is random (nacl.randomBytes)
 *
 * @throws TypeError if inputs are invalid
 */
export function encryptPayload(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): EncryptedPayload {
  // Defensive assertion #1 — input validation
  assertUint8Array(plaintext, 'plaintext');
  assertUint8Array(recipientPublicKey, 'recipientPublicKey');
  assertUint8Array(senderSecretKey, 'senderSecretKey');
  assertKeyLength(recipientPublicKey, 'recipientPublicKey');
  assertKeyLength(senderSecretKey, 'senderSecretKey');

  // Defensive assertion #2 — random nonce (no replay)
  const nonce = nacl.randomBytes(MORPHIC_NONCE_LENGTH);

  const ciphertext = nacl.box(plaintext, nonce, recipientPublicKey, senderSecretKey);

  return {
    ciphertext,
    nonce,
    version: MORPHIC_CRYPTO_VERSION,
  };
}

// ---------------------------------------------------------------------------
// decryptPayload
// ---------------------------------------------------------------------------

/**
 * Decrypt a payload using NaCl box.open.
 *
 * Defensive assertions:
 *   3. Payload must have ciphertext + nonce
 *   4. null from nacl.box.open = tampered/wrong key
 *
 * @throws TypeError if payload structure is invalid
 * @throws Error if decryption fails (wrong key or tampered data)
 */
export function decryptPayload(
  payload: EncryptedPayload,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): Uint8Array {
  // Defensive assertion #3 — payload structure
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('decryptPayload: payload must be an EncryptedPayload object');
  }
  if (!(payload.ciphertext instanceof Uint8Array)) {
    throw new TypeError('decryptPayload: payload.ciphertext must be a Uint8Array');
  }
  if (!(payload.nonce instanceof Uint8Array)) {
    throw new TypeError('decryptPayload: payload.nonce must be a Uint8Array');
  }

  assertUint8Array(senderPublicKey, 'senderPublicKey');
  assertUint8Array(recipientSecretKey, 'recipientSecretKey');
  assertKeyLength(senderPublicKey, 'senderPublicKey');
  assertKeyLength(recipientSecretKey, 'recipientSecretKey');

  // Defensive assertion #4 — null = tampered or wrong key
  const result = nacl.box.open(
    payload.ciphertext,
    payload.nonce,
    senderPublicKey,
    recipientSecretKey,
  );

  if (result === null) {
    throw new Error('decryptPayload: decryption failed — wrong key or tampered data');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

/**
 * Reset module state for test isolation.
 * @internal — test-only, prefixed `__` per convention.
 */
export function __resetCryptoStateForTests(): void {
  // No module state to reset — all functions are stateless.
  // Exists for API consistency with other modules.
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertUint8Array(value: unknown, name: string): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(
      `${name} must be a Uint8Array, got ${value === null ? 'null' : typeof value}`,
    );
  }
}

function assertKeyLength(key: Uint8Array, name: string): void {
  if (key.length !== KEY_LENGTH) {
    throw new TypeError(`${name} must be 32 bytes, got ${key.length}`);
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
