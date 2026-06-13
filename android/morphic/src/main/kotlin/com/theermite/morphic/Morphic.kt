package com.theermite.morphic

/**
 * Entry surface of the Morphic Android adaptation module.
 *
 * A-0 scaffold: pure-Kotlin only. No Compose, no DataStore yet — those land in
 * their own bricks (A-3 persistence, A-4 provider). The logic layer is kept as
 * plain Kotlin on purpose: coverage tools (Kover) cannot measure compiler-
 * generated `@Composable` code, so all measurable logic stays non-Composable.
 * See docs/PET-Android.md §5.bis.
 */
public object Morphic {
    /** Semantic version of the Android module. Mirrors the package version. */
    public const val VERSION: String = "0.1.0"
}
