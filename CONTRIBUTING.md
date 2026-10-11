# Contributing

Thank you for your interest. Issues and pull requests are welcome, in English or in
French.

## Before you start

- **Bugs**: open an issue with the package and version, what you expected, what
  happened, and the smallest page or snippet that reproduces it.
- **Security issues**: never in a public issue — see [SECURITY.md](SECURITY.md).
- **New adaptations or larger changes**: open an issue first, so we can agree on the
  approach before you spend time on code.

## Development

Requires Node 22 or later and pnpm.

```bash
pnpm install
pnpm run lint                              # Biome — must report 0 errors
pnpm -F @theermite/morphic-engine test     # Vitest
pnpm -F @theermite/morphic-adapter test
pnpm -r run build
```

The Android port in `android/` is a separate Gradle build; see
[`android/README.md`](android/README.md).

## What a change needs

- **Tests first.** A behaviour change comes with a test that fails without it.
- **Accessibility is the product.** Keyboard access, visible focus, screen-reader names,
  `prefers-reduced-motion`, and contrast of at least 4.5:1 for text are requirements,
  not extras. Never convey a state by colour alone.
- **Privacy by default.** No network call, no telemetry, nothing stored outside the
  user's device unless the host explicitly enables sync.
- **No breaking change to public exports** without discussion: several sites depend on
  the published packages.
- Conventional commit messages (`feat:`, `fix:`, `docs:`, …).

## License

By contributing, you agree that your contribution is licensed under the license of the
package you change (see the [README](README.md#license)).
