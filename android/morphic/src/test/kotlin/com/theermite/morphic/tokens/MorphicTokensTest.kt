package com.theermite.morphic.tokens

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A-1 parity test (TDG). Proves the generated MorphicTokens.kt carries the exact
 * morphic axis values from the shared DTCG source (packages/engine/src/tokens.ts).
 * Any drift between the source and the committed Kotlin file fails here in CI.
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class MorphicTokensTest {
    @Test
    fun should_expose_all_theme_values_when_generated_from_source() {
        assertEquals(
            listOf("light", "dark", "auto", "high-contrast", "sepia"),
            MorphicTokens.Theme.all,
        )
    }

    @Test
    fun should_expose_all_motion_values_when_generated_from_source() {
        assertEquals(listOf("full", "reduced", "none"), MorphicTokens.Motion.all)
    }

    @Test
    fun should_expose_all_contrast_values_when_generated_from_source() {
        assertEquals(
            listOf("no-preference", "more", "less", "custom"),
            MorphicTokens.Contrast.all,
        )
    }

    @Test
    fun should_expose_all_density_values_when_generated_from_source() {
        assertEquals(
            listOf("compact", "comfortable", "spacious"),
            MorphicTokens.Density.all,
        )
    }

    @Test
    fun should_expose_all_font_size_values_when_generated_from_source() {
        assertEquals(listOf("sm", "md", "lg", "xl"), MorphicTokens.FontSize.all)
    }

    @Test
    fun should_expose_all_font_family_values_when_generated_from_source() {
        assertEquals(
            listOf("system", "serif", "atkinson", "dyslexic"),
            MorphicTokens.FontFamily.all,
        )
    }

    @Test
    fun should_map_const_to_its_string_value_when_referenced() {
        assertEquals("high-contrast", MorphicTokens.Theme.HIGH_CONTRAST)
        assertEquals("reduced", MorphicTokens.Motion.REDUCED)
    }

    @Test
    fun should_have_no_duplicate_values_within_an_axis() {
        val theme = MorphicTokens.Theme.all
        assertTrue(theme.size == theme.distinct().size)
    }
}
