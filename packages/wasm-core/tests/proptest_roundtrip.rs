//! Property-based tests for NaCl box round-trip (B-018 / F-017).
//!
//! Anti-Circular Layer 1 (Quality.md): formal properties + fault injection.
//! Targets: 95% line coverage on crypto path, 1000+ encrypt/decrypt round-trips.
//!
//! These tests run on the host (cargo test), not wasm32 — they exercise the
//! same `crypto_box::SalsaBox` instance that lib.rs wraps. The wasm wrapper
//! adds only length validation + JsError mapping; the cryptographic core is
//! the RustCrypto implementation tested here.

use crypto_box::{
    aead::{Aead, AeadCore, OsRng},
    Nonce, PublicKey, SalsaBox, SecretKey,
};
use proptest::prelude::*;

const KEY_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 24;
const POLY1305_TAG_LENGTH: usize = 16;

/// Helper: produce a (sender_sk, sender_pk, recipient_sk, recipient_pk, nonce)
/// tuple from deterministic seeds, suitable for proptest shrinking.
fn keypair_from_seed(seed: [u8; 32]) -> (SecretKey, PublicKey) {
    let sk = SecretKey::from(seed);
    let pk = sk.public_key();
    (sk, pk)
}

proptest! {
    // 1024 cases per property (proptest default = 256). Crypto paths warrant
    // the extra coverage; the proptest! block raises ALL properties below.
    #![proptest_config(ProptestConfig {
        cases: 1024,
        max_shrink_iters: 500,
        ..ProptestConfig::default()
    })]

    /// Round-trip property: decrypt(encrypt(m)) == m for any plaintext.
    #[test]
    fn prop_box_roundtrip_identity(
        sender_seed in any::<[u8; 32]>(),
        recipient_seed in any::<[u8; 32]>(),
        plaintext in proptest::collection::vec(any::<u8>(), 0..=4096),
    ) {
        let (sender_sk, _sender_pk) = keypair_from_seed(sender_seed);
        let (recipient_sk, recipient_pk) = keypair_from_seed(recipient_seed);
        let sender_pk = sender_sk.public_key();

        let nonce = SalsaBox::generate_nonce(&mut OsRng);

        // Sender encrypts to recipient
        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let ciphertext = sender_box.encrypt(&nonce, plaintext.as_slice())
            .expect("encrypt must not fail for valid inputs");

        // Recipient decrypts from sender
        let recipient_box = SalsaBox::new(&sender_pk, &recipient_sk);
        let decrypted = recipient_box.decrypt(&nonce, ciphertext.as_slice())
            .expect("decrypt must succeed for valid ciphertext+keys+nonce");

        prop_assert_eq!(decrypted, plaintext);
    }

    /// Tampering property: any single-bit flip in ciphertext must cause auth failure.
    /// Poly1305 guarantees this with probability 1 - 2^-128.
    #[test]
    fn prop_box_tamper_detection(
        sender_seed in any::<[u8; 32]>(),
        recipient_seed in any::<[u8; 32]>(),
        plaintext in proptest::collection::vec(any::<u8>(), 1..=512),
        tamper_index in any::<usize>(),
        tamper_bit in 0u8..8,
    ) {
        let (sender_sk, _) = keypair_from_seed(sender_seed);
        let (recipient_sk, recipient_pk) = keypair_from_seed(recipient_seed);
        let sender_pk = sender_sk.public_key();

        let nonce = SalsaBox::generate_nonce(&mut OsRng);
        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let mut ciphertext = sender_box.encrypt(&nonce, plaintext.as_slice())
            .expect("encrypt must not fail");

        // Flip one bit somewhere in the ciphertext
        let idx = tamper_index % ciphertext.len();
        ciphertext[idx] ^= 1u8 << tamper_bit;

        let recipient_box = SalsaBox::new(&sender_pk, &recipient_sk);
        let result = recipient_box.decrypt(&nonce, ciphertext.as_slice());

        prop_assert!(
            result.is_err(),
            "tampered ciphertext must fail authentication (byte {} bit {})",
            idx, tamper_bit
        );
    }

    /// Wrong-nonce property: decrypting with a different nonce must fail.
    #[test]
    fn prop_box_wrong_nonce_fails(
        sender_seed in any::<[u8; 32]>(),
        recipient_seed in any::<[u8; 32]>(),
        plaintext in proptest::collection::vec(any::<u8>(), 1..=256),
    ) {
        let (sender_sk, _) = keypair_from_seed(sender_seed);
        let (recipient_sk, recipient_pk) = keypair_from_seed(recipient_seed);
        let sender_pk = sender_sk.public_key();

        let nonce_a = SalsaBox::generate_nonce(&mut OsRng);
        let nonce_b = SalsaBox::generate_nonce(&mut OsRng);
        prop_assume!(nonce_a != nonce_b);

        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let ciphertext = sender_box.encrypt(&nonce_a, plaintext.as_slice())
            .expect("encrypt must not fail");

        let recipient_box = SalsaBox::new(&sender_pk, &recipient_sk);
        let result = recipient_box.decrypt(&nonce_b, ciphertext.as_slice());
        prop_assert!(result.is_err(), "decryption with wrong nonce must fail");
    }

    /// Wrong-key property: decrypting with an unrelated key pair must fail.
    #[test]
    fn prop_box_wrong_key_fails(
        sender_seed in any::<[u8; 32]>(),
        recipient_seed in any::<[u8; 32]>(),
        attacker_seed in any::<[u8; 32]>(),
        plaintext in proptest::collection::vec(any::<u8>(), 1..=256),
    ) {
        prop_assume!(attacker_seed != recipient_seed);

        let (sender_sk, _) = keypair_from_seed(sender_seed);
        let (recipient_sk, recipient_pk) = keypair_from_seed(recipient_seed);
        let (attacker_sk, _) = keypair_from_seed(attacker_seed);
        let sender_pk = sender_sk.public_key();

        let nonce = SalsaBox::generate_nonce(&mut OsRng);
        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let ciphertext = sender_box.encrypt(&nonce, plaintext.as_slice())
            .expect("encrypt must not fail");

        // Attacker uses their own SK instead of recipient's
        let attacker_box = SalsaBox::new(&sender_pk, &attacker_sk);
        let result = attacker_box.decrypt(&nonce, ciphertext.as_slice());
        prop_assert!(result.is_err(), "decryption with attacker key must fail");

        // Same plaintext re-encrypted by the attacker would not be the same
        // bytes as the original (different shared secret).
        prop_assume!(!ciphertext.is_empty());

        // Recipient with correct key still succeeds (sanity check inside the
        // negative property — ensures the only failure cause is the wrong key).
        let recipient_box = SalsaBox::new(&sender_pk, &recipient_sk);
        let decrypted = recipient_box.decrypt(&nonce, ciphertext.as_slice())
            .expect("legitimate recipient must decrypt successfully");
        prop_assert_eq!(decrypted, plaintext);
    }
}

/// Deterministic fixtures (non-proptest) for boundary conditions and
/// constants the wasm boundary depends on.
#[cfg(test)]
mod fixtures {
    use super::*;

    #[test]
    fn key_length_is_32() {
        assert_eq!(KEY_LENGTH, 32);
        let sk = SecretKey::generate(&mut OsRng);
        assert_eq!(sk.to_bytes().len(), 32);
        assert_eq!(sk.public_key().as_bytes().len(), 32);
    }

    #[test]
    fn nonce_length_is_24() {
        assert_eq!(NONCE_LENGTH, 24);
        let nonce: Nonce = SalsaBox::generate_nonce(&mut OsRng);
        assert_eq!(nonce.len(), 24);
    }

    #[test]
    fn ciphertext_has_poly1305_tag_overhead() {
        let sender_sk = SecretKey::generate(&mut OsRng);
        let recipient_sk = SecretKey::generate(&mut OsRng);
        let recipient_pk = recipient_sk.public_key();

        let nonce = SalsaBox::generate_nonce(&mut OsRng);
        let plaintext = b"hello morphic";
        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let ciphertext = sender_box.encrypt(&nonce, plaintext.as_ref()).unwrap();

        // NaCl box = XSalsa20Poly1305 over Curve25519 shared secret.
        // Ciphertext = encrypted plaintext + 16-byte Poly1305 tag.
        assert_eq!(ciphertext.len(), plaintext.len() + POLY1305_TAG_LENGTH);
    }

    #[test]
    fn empty_plaintext_roundtrip() {
        let sender_sk = SecretKey::generate(&mut OsRng);
        let recipient_sk = SecretKey::generate(&mut OsRng);
        let sender_pk = sender_sk.public_key();
        let recipient_pk = recipient_sk.public_key();

        let nonce = SalsaBox::generate_nonce(&mut OsRng);
        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let ciphertext = sender_box.encrypt(&nonce, b"".as_ref()).unwrap();
        assert_eq!(ciphertext.len(), POLY1305_TAG_LENGTH);

        let recipient_box = SalsaBox::new(&sender_pk, &recipient_sk);
        let decrypted = recipient_box.decrypt(&nonce, ciphertext.as_slice()).unwrap();
        assert_eq!(decrypted, b"");
    }

    #[test]
    fn truncated_ciphertext_fails() {
        let sender_sk = SecretKey::generate(&mut OsRng);
        let recipient_sk = SecretKey::generate(&mut OsRng);
        let sender_pk = sender_sk.public_key();
        let recipient_pk = recipient_sk.public_key();

        let nonce = SalsaBox::generate_nonce(&mut OsRng);
        let sender_box = SalsaBox::new(&recipient_pk, &sender_sk);
        let ciphertext = sender_box.encrypt(&nonce, b"plaintext".as_ref()).unwrap();

        let truncated = &ciphertext[..ciphertext.len() - 1];
        let recipient_box = SalsaBox::new(&sender_pk, &recipient_sk);
        let result = recipient_box.decrypt(&nonce, truncated);
        assert!(result.is_err(), "truncated ciphertext must fail auth");
    }
}
