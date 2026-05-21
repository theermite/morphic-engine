# morphic-engine (適応)

> Shinkofa Morphic Adaptation Module — framework-agnostic drop-in universal engine.
> v2.0.0 (alpha). Replaces `@shinkofa/morphic-engine` v1.0.0.

The visible digital that adapts to who you are — not the other way around.

## License

AGPL-3.0-or-later. See `LICENSE`.

## Status

Conception P0 terminée 2026-05-21. Implémentation B-001 → B-NN en cours.
Specification : voir `docs/CDC.md` (intention) + `docs/PET.md` (exécution).

## Architecture

| Package | Role |
|---------|------|
| `@morphic/engine` | Core framework-agnostic engine (TypeScript) |
| `@morphic/wasm-core` | Rust → WASM critical paths (deferred to B-005) |
| `@morphic/adapter` | Host adapters (vanilla, React, Astro — B-008+) |

## Quick start (developer)

```bash
pnpm install
pnpm -F @morphic/engine test
pnpm -F @morphic/engine build
```

## Funding

NLNet NGI0 Commons — dépôt cible avant 2026-06-01.
