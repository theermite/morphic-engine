# morphic-android

Native Android target of the Shinkofa Morphic Adaptation module (Kotlin / Jetpack
Compose). Intention: `../docs/CDC.md` §4.4. Execution journal: `../docs/PET-Android.md`.

This is a **separate Gradle build**, isolated from the repo's pnpm/TypeScript
workspace. The two coexist in one repo but never share a build.

## A-0 scaffold (current)

Pure-Kotlin library skeleton + one unit test + coverage (Kover) + CI. No Compose,
no DataStore yet — they arrive in their own bricks (see PET §6 roadmap).

## Build & test

```bash
cd android
gradle wrapper --gradle-version 9.1.0   # first time only — generates the wrapper jar
./gradlew :morphic:testDebugUnitTest     # unit tests
./gradlew :morphic:koverHtmlReport       # coverage report
```

Opening `android/` in Android Studio generates the Gradle wrapper jar automatically.

## Where it gets proven

- **CI** (`.github/workflows/android.yml`) builds, lints, tests and reports coverage
  on every push touching `android/**` — the automated proof.
- **Local machine** (with the Android SDK) drops the library into a real app for
  human validation. The VPS that authors this code has no Android toolchain by design.

## Versions (verified 2026-06-13)

AGP 9.0.1 · Gradle 9.1.0 · JDK 21 · compileSdk 35 · minSdk 24 · Kover 0.9.8.
Pinned in `gradle/libs.versions.toml`. Kotlin is supplied by AGP 9 (built-in).
