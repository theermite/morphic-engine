package com.theermite.morphic.axes

import com.theermite.morphic.tokens.MorphicTokens
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * A-2 axis-logic tests (TDG). Mirror of the web axes (B-007→B-011): closed-enum
 * validation + `auto` resolution. Pure Kotlin, no Android framework — fully
 * measurable by Kover (PET-Android §5.bis).
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class AxesTest {
    // --- A-1 ↔ A-2 parity: every generated token value parses to an enum -----

    @Test
    fun should_parse_every_theme_token_when_from_value() {
        for (value in MorphicTokens.Theme.all) {
            assertEquals(value, Theme.fromValue(value)?.value)
        }
    }

    @Test
    fun should_parse_every_motion_token_when_from_value() {
        for (value in MorphicTokens.Motion.all) {
            assertEquals(value, Motion.fromValue(value)?.value)
        }
    }

    @Test
    fun should_parse_every_contrast_token_when_from_value() {
        for (value in MorphicTokens.Contrast.all) {
            assertEquals(value, Contrast.fromValue(value)?.value)
        }
    }

    @Test
    fun should_parse_every_density_token_when_from_value() {
        for (value in MorphicTokens.Density.all) {
            assertEquals(value, Density.fromValue(value)?.value)
        }
    }

    @Test
    fun should_parse_every_font_size_token_when_from_value() {
        for (value in MorphicTokens.FontSize.all) {
            assertEquals(value, FontSize.fromValue(value)?.value)
        }
    }

    // --- Closed enum rejects the unknown (poka-yoke) ------------------------

    @Test
    fun should_return_null_when_from_value_is_unknown() {
        assertNull(Theme.fromValue("violet"))
        assertNull(Motion.fromValue(""))
        assertNull(Contrast.fromValue("MORE"))
        assertNull(Density.fromValue("tight"))
        assertNull(FontSize.fromValue("xxl"))
    }

    // --- auto resolution driven by system signals ---------------------------

    @Test
    fun should_resolve_auto_theme_to_dark_when_system_is_dark() {
        assertEquals(Theme.DARK, Theme.AUTO.resolve(SystemSignals(darkMode = true)))
        assertEquals(Theme.LIGHT, Theme.AUTO.resolve(SystemSignals(darkMode = false)))
    }

    @Test
    fun should_resolve_auto_motion_to_reduced_when_system_reduces_motion() {
        assertEquals(Motion.REDUCED, Motion.AUTO.resolve(SystemSignals(reduceMotion = true)))
        assertEquals(Motion.FULL, Motion.AUTO.resolve(SystemSignals(reduceMotion = false)))
    }

    @Test
    fun should_resolve_auto_contrast_to_more_when_system_wants_high_contrast() {
        assertEquals(Contrast.MORE, Contrast.AUTO.resolve(SystemSignals(highContrast = true)))
        assertEquals(
            Contrast.NO_PREFERENCE,
            Contrast.AUTO.resolve(SystemSignals(highContrast = false)),
        )
    }

    @Test
    fun should_resolve_auto_density_to_comfortable_default() {
        // No system density signal exists — safe default mirrors web resolveAutoDensity.
        assertEquals(Density.COMFORTABLE, Density.AUTO.resolve(SystemSignals()))
        assertEquals(Density.COMFORTABLE, Density.AUTO.resolve(SystemSignals(darkMode = true)))
    }

    @Test
    fun should_resolve_auto_font_size_to_md_default() {
        // No system font-size signal exists — safe default mirrors web resolveAutoFontSize.
        assertEquals(FontSize.MD, FontSize.AUTO.resolve(SystemSignals()))
    }

    @Test
    fun should_return_self_when_resolving_a_concrete_choice() {
        assertEquals(Theme.SEPIA, Theme.SEPIA.resolve(SystemSignals(darkMode = true)))
        assertEquals(Motion.NONE, Motion.NONE.resolve(SystemSignals(reduceMotion = true)))
        assertEquals(Contrast.CUSTOM, Contrast.CUSTOM.resolve(SystemSignals(highContrast = true)))
        assertEquals(Density.SPACIOUS, Density.SPACIOUS.resolve(SystemSignals()))
        assertEquals(FontSize.XL, FontSize.XL.resolve(SystemSignals()))
    }

    @Test
    fun should_carry_the_expected_string_value_per_member() {
        assertEquals("high-contrast", Theme.HIGH_CONTRAST.value)
        assertEquals("no-preference", Contrast.NO_PREFERENCE.value)
        assertEquals("auto", Motion.AUTO.value)
    }
}
