package com.theermite.morphic.theme

import com.theermite.morphic.axes.Contrast
import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.FontSize
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.Theme
import com.theermite.morphic.state.MorphicState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A-4 pure-logic tests (TDG). These cover everything the @Composable layer
 * delegates to, so the Composable itself can stay thin and unmeasured
 * (PET-Android §5.bis). No Compose runtime is touched here — plain JVM.
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class MorphicResolutionTest {
    @Test
    fun should_flag_reduce_motion_when_animator_scale_is_zero() {
        val signals = systemSignals(isSystemDark = false, animatorDurationScale = 0f, isHighContrast = false)
        assertTrue(signals.reduceMotion)
    }

    @Test
    fun should_not_flag_reduce_motion_when_animator_scale_is_positive() {
        val signals = systemSignals(isSystemDark = false, animatorDurationScale = 1f, isHighContrast = false)
        assertFalse(signals.reduceMotion)
    }

    @Test
    fun should_pass_dark_and_high_contrast_through_to_signals() {
        val signals = systemSignals(isSystemDark = true, animatorDurationScale = 1f, isHighContrast = true)
        assertTrue(signals.darkMode)
        assertTrue(signals.highContrast)
    }

    @Test
    fun should_resolve_all_axes_from_auto_with_dark_signals() {
        val state = MorphicState() // every axis AUTO
        val signals = systemSignals(isSystemDark = true, animatorDurationScale = 1f, isHighContrast = false)

        val resolved = state.resolveAll(signals)

        assertEquals(Theme.DARK, resolved.theme)
        assertEquals(Motion.FULL, resolved.motion)
        assertEquals(Contrast.NO_PREFERENCE, resolved.contrast)
        assertEquals(Density.COMFORTABLE, resolved.density)
        assertEquals(FontSize.MD, resolved.fontSize)
    }

    @Test
    fun should_keep_concrete_axes_and_ignore_signals_when_resolving_all() {
        val state = MorphicState().apply {
            setTheme("light")
            setMotion("none")
            setContrast("more")
            setDensity("compact")
            setFontSize("xl")
        }
        // Dark/high-contrast signals must be ignored once the user picked concrete values.
        val signals = systemSignals(isSystemDark = true, animatorDurationScale = 0f, isHighContrast = true)

        val resolved = state.resolveAll(signals)

        assertEquals(Theme.LIGHT, resolved.theme)
        assertEquals(Motion.NONE, resolved.motion)
        assertEquals(Contrast.MORE, resolved.contrast)
        assertEquals(Density.COMPACT, resolved.density)
        assertEquals(FontSize.XL, resolved.fontSize)
    }

    @Test
    fun should_use_dark_scheme_only_for_dark_theme() {
        assertTrue(useDarkColorScheme(Theme.DARK))
        assertFalse(useDarkColorScheme(Theme.LIGHT))
        assertFalse(useDarkColorScheme(Theme.HIGH_CONTRAST))
        assertFalse(useDarkColorScheme(Theme.SEPIA))
        assertFalse(useDarkColorScheme(Theme.AUTO))
    }
}
