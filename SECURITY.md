# Security policy

## Reporting a vulnerability

Please report security issues **privately** through GitHub:
[Report a vulnerability](https://github.com/theermite/morphic-engine/security/advisories/new)
(Security tab → *Report a vulnerability*). Do not open a public issue for a
vulnerability.

Include what you can: the affected package and version, a description, and steps or a
proof of concept to reproduce. You will get an acknowledgement, and a fix will be
released as a new beta of the affected packages.

## Supported versions

The project is in beta. Only the latest published version of each package receives
fixes:

| Package | Supported |
|---|---|
| `@theermite/morphic-engine` | latest `2.0.0-beta.x` |
| `@theermite/morphic-adapter` | latest `2.0.0-beta.x` |
| `@theermite/morphic-wasm-core` | latest `2.0.0-alpha.x` |

## Scope worth knowing

- Preferences are stored on the user's device; the engine makes no network call. For
  hosts that sync them, end-to-end encryption primitives are provided (NaCl box:
  Curve25519, XSalsa20, Poly1305).
- Stored preferences are read defensively: unknown keys are ignored and prototype
  pollution through `__proto__` is guarded and tested.
- The engine never fetches remote code and has no telemetry.
