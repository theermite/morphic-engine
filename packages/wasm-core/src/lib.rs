//! Morphic WASM Core — Rust to WASM critical paths.
//!
//! CDC ref: F-017 (Tri-layer Rust to WASM critical)
//! Brick: B-018
//! Risk: Critical (95% coverage + proptest + parity TS<->WASM)
//!
//! Provides NaCl-compatible primitives (Curve25519 + XSalsa20 + Poly1305)
//! via the `crypto_box` crate (RustCrypto, pure Rust, audit-friendly).
//!
//! All inputs/outputs cross the WASM boundary as byte slices. TS side
//! handles base64 encoding for storage/transport.
//!
//! Defensive assertions (PET section 5, >=2 per critical function):
//!   1. encrypt_box / decrypt_box: key lengths checked (32 bytes)
//!   2. encrypt_box / decrypt_box: nonce length checked (24 bytes)
//!   3. decrypt_box: authentication failure surfaced as Err (no silent corruption)
//!   4. generate_keypair: uses OsRng (browser Web Crypto via getrandom js feature)

use crypto_box::{
    aead::{Aead, AeadCore, OsRng},
    Nonce, PublicKey, SalsaBox, SecretKey,
};
use wasm_bindgen::prelude::*;

const KEY_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 24;

/// Result type for a generated key pair, exposed to JS as a struct with
/// `publicKey` and `secretKey` getters returning Uint8Array.
#[wasm_bindgen]
pub struct WasmKeyPair {
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
}

#[wasm_bindgen]
impl WasmKeyPair {
    #[wasm_bindgen(getter, js_name = publicKey)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter, js_name = secretKey)]
    pub fn secret_key(&self) -> Vec<u8> {
        self.secret_key.clone()
    }
}

/// Generate a Curve25519 key pair using the system CSPRNG
/// (Web Crypto API in browser via `getrandom` js feature).
#[wasm_bindgen(js_name = wasmGenerateKeypair)]
pub fn wasm_generate_keypair() -> WasmKeyPair {
    let secret = SecretKey::generate(&mut OsRng);
    let public = secret.public_key();
    WasmKeyPair {
        public_key: public.as_bytes().to_vec(),
        secret_key: secret.to_bytes().to_vec(),
    }
}

/// Generate `len` random bytes using the system CSPRNG.
#[wasm_bindgen(js_name = wasmRandomBytes)]
pub fn wasm_random_bytes(len: usize) -> Vec<u8> {
    use rand_core::RngCore;
    let mut buf = vec![0u8; len];
    OsRng.fill_bytes(&mut buf);
    buf
}

/// Sample a fresh nonce using the construction's recommended generator.
#[wasm_bindgen(js_name = wasmGenerateNonce)]
pub fn wasm_generate_nonce() -> Vec<u8> {
    SalsaBox::generate_nonce(&mut OsRng).to_vec()
}

/// Encrypt `plaintext` using NaCl box (Curve25519 + XSalsa20Poly1305).
///
/// Inputs:
///   - plaintext: arbitrary bytes
///   - recipient_pk: 32 bytes (Curve25519 public key)
///   - sender_sk: 32 bytes (Curve25519 secret key)
///   - nonce: 24 bytes (must be unique per (sender, recipient) pair)
///
/// Output: ciphertext bytes (includes 16-byte Poly1305 tag).
#[wasm_bindgen(js_name = wasmEncryptBox)]
pub fn wasm_encrypt_box(
    plaintext: &[u8],
    recipient_pk: &[u8],
    sender_sk: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, JsError> {
    let (pk, sk, nonce) = validate_box_inputs(recipient_pk, sender_sk, nonce)?;
    let salsa_box = SalsaBox::new(&pk, &sk);
    salsa_box
        .encrypt(&nonce, plaintext)
        .map_err(|_| JsError::new("wasm_encrypt_box: encryption failure"))
}

/// Decrypt `ciphertext` using NaCl box.open.
///
/// Inputs:
///   - ciphertext: bytes produced by `wasm_encrypt_box` (or any NaCl-compatible
///     box implementation, including tweetnacl-js)
///   - nonce: 24 bytes used at encryption time
///   - sender_pk: 32 bytes (peer's public key)
///   - recipient_sk: 32 bytes (our secret key)
///
/// Returns the plaintext, or Err on any authentication failure (wrong key,
/// tampered ciphertext, wrong nonce, truncated input).
#[wasm_bindgen(js_name = wasmDecryptBox)]
pub fn wasm_decrypt_box(
    ciphertext: &[u8],
    nonce: &[u8],
    sender_pk: &[u8],
    recipient_sk: &[u8],
) -> Result<Vec<u8>, JsError> {
    let (pk, sk, nonce) = validate_box_inputs(sender_pk, recipient_sk, nonce)?;
    let salsa_box = SalsaBox::new(&pk, &sk);
    salsa_box
        .decrypt(&nonce, ciphertext)
        .map_err(|_| JsError::new("wasm_decrypt_box: authentication failure"))
}

/// Validate the three byte-slice inputs common to encrypt/decrypt and parse
/// them into typed values. Pulls all length checks into one place so the
/// defensive assertions are easy to audit.
fn validate_box_inputs(
    pk_bytes: &[u8],
    sk_bytes: &[u8],
    nonce_bytes: &[u8],
) -> Result<(PublicKey, SecretKey, Nonce), JsError> {
    if pk_bytes.len() != KEY_LENGTH {
        return Err(JsError::new(&format!(
            "public key must be {KEY_LENGTH} bytes, got {}",
            pk_bytes.len()
        )));
    }
    if sk_bytes.len() != KEY_LENGTH {
        return Err(JsError::new(&format!(
            "secret key must be {KEY_LENGTH} bytes, got {}",
            sk_bytes.len()
        )));
    }
    if nonce_bytes.len() != NONCE_LENGTH {
        return Err(JsError::new(&format!(
            "nonce must be {NONCE_LENGTH} bytes, got {}",
            nonce_bytes.len()
        )));
    }
    let pk_array: [u8; KEY_LENGTH] = pk_bytes.try_into().expect("len checked above");
    let sk_array: [u8; KEY_LENGTH] = sk_bytes.try_into().expect("len checked above");
    let pk = PublicKey::from(pk_array);
    let sk = SecretKey::from(sk_array);
    let nonce = *Nonce::from_slice(nonce_bytes);
    Ok((pk, sk, nonce))
}
