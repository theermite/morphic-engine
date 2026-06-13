package com.theermite.morphic

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * A-0 smoke test (TDG). Proves the Android subtree compiles, the test harness
 * runs, and coverage (Kover) has measurable pure-Kotlin code to track.
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class MorphicTest {
    @Test
    fun should_expose_module_version_when_scaffold_is_built() {
        assertEquals("0.1.0", Morphic.VERSION)
    }
}
