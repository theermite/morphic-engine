# @theermite/morphic-wasm-core

Chemins critiques Rust → WebAssembly pour le Morphic Adaptation Engine.

**Version** : `2.0.0-alpha.0` (non publié sur npm — consommé en interne par le moteur)  
**Statut** : Livré. Primitives NaCl box opérationnelles.

## Ce que ce package fournit

Chiffrement authentifié compatible NaCl (Curve25519 + XSalsa20 + Poly1305) via le crate [`crypto_box`](https://crates.io/crates/crypto_box) (RustCrypto, Rust pur, audité). Les ciphertexts produits sont byte-identiques à `tweetnacl.box` — les deux côtés sont interopérables.

API exportée (TypeScript via `wasm-bindgen`) :

| Fonction | Retourne | Rôle |
|----------|----------|------|
| `wasmGenerateKeypair()` | `WasmKeyPair` (publicKey + secretKey) | Paire Curve25519 via OsRng (Web Crypto en navigateur) |
| `wasmGenerateNonce()` | `Uint8Array` (24 octets) | Nonce XSalsa20 aléatoire |
| `wasmRandomBytes(len)` | `Uint8Array` | Octets CSPRNG |
| `wasmEncryptBox(plaintext, recipientPk, senderSk, nonce)` | `Uint8Array` | Ciphertext authentifié (plaintext + tag Poly1305 16 octets) |
| `wasmDecryptBox(ciphertext, nonce, senderPk, recipientSk)` | `Uint8Array` | Plaintext, ou `JsError` si l'authentification échoue |

## Build

```bash
pnpm --filter @theermite/morphic-wasm-core build           # target web
pnpm --filter @theermite/morphic-wasm-core build:bundler   # target bundler (Vite/webpack)
```

La sortie se trouve dans `pkg/` (ESM + `.d.ts` + `.wasm` brut, ~58 KB). Le bundle est chargé **de façon paresseuse** par `packages/engine/src/wasm-bridge.ts` — les projets qui n'ont pas besoin du chiffrement WASM ne paient pas le coût en taille.

## Tests

```bash
pnpm --filter @theermite/morphic-wasm-core test   # tests cargo natifs
```

9 tests au total :

- **4 tests property-based** × 1024 cas (= 4096 cycles encrypt/decrypt) couvrant : identité round-trip, détection de bit-flip (Poly1305), rejet de mauvais nonce, rejet de mauvaise clé
- **5 fixtures déterministes** : longueurs clé/nonce, overhead du tag, plaintext vide, ciphertext tronqué

## Assertions défensives (PET §5)

| Fonction | Assertions |
|----------|------------|
| `wasm_encrypt_box` / `wasm_decrypt_box` | longueurs de clé = 32 octets ; longueur de nonce = 24 octets |
| `wasm_decrypt_box` | échecs d'authentification exposés en `Err` (pas de corruption silencieuse) |
| `wasm_generate_keypair` | utilise `OsRng` (Web Crypto via feature `getrandom js` en navigateur) |

Les vérifications de longueur sont centralisées dans un helper `validate_box_inputs` pour concentrer la surface d'audit.

## Note sur wasm-opt

`wasm-opt` est désactivé intentionnellement. La version bundlée est trop ancienne pour supporter les opérations `bulk-memory` émises par rustc depuis la version 1.82. Tous les navigateurs modernes (Chrome ≥ 75, Firefox ≥ 79, Safari ≥ 15) supportent `bulk-memory` nativement.

## Pourquoi Rust → WASM plutôt que tweetnacl-js

- **Maintenance** : `tweetnacl-js` n'est plus maintenu depuis 2020. `crypto_box` fait partie de l'écosystème RustCrypto activement maintenu.
- **Surface d'audit** : Rust pur, pas de legacy JS. Arbre de dépendances plus petit.
- **Performance** : le chiffrement WASM est ~2–5× plus rapide que JS pour des charges soutenues.
- **Déterminisme** : même binaire sur Node, Deno et navigateurs — pas de variance entre moteurs JS sur un chemin critique.

## License

AGPL-3.0-or-later. Voir la racine du repo.
