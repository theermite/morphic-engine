package com.theermite.morphic.state

import com.theermite.morphic.axes.Contrast
import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.FontSize
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.SystemSignals
import com.theermite.morphic.axes.Theme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/**
 * A-2 in-memory state tests (TDG). The holder mirrors the web set/get API
 * (theme.ts/motion.ts/...) without persistence — DataStore backing lands in A-3.
 * Pure Kotlin, Kover-measurable.
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class MorphicStateTest {
    @Test
    fun should_default_every_axis_to_auto_when_freshly_created() {
        val state = MorphicState()
        assertEquals(Theme.AUTO, state.getTheme())
        assertEquals(Motion.AUTO, state.getMotion())
        assertEquals(Contrast.AUTO, state.getContrast())
        assertEquals(Density.AUTO, state.getDensity())
        assertEquals(FontSize.AUTO, state.getFontSize())
    }

    @Test
    fun should_store_and_return_choice_when_set_with_valid_value() {
        val state = MorphicState()
        assertEquals(Theme.DARK, state.setTheme("dark"))
        assertEquals(Theme.DARK, state.getTheme())
    }

    @Test
    fun should_reject_unknown_value_when_set() {
        val state = MorphicState()
        assertThrows(IllegalArgumentException::class.java) { state.setTheme("violet") }
        assertThrows(IllegalArgumentException::class.java) { state.setMotion("") }
        assertThrows(IllegalArgumentException::class.java) { state.setFontSize("xxl") }
    }

    @Test
    fun should_keep_other_axes_untouched_when_one_axis_is_set() {
        val state = MorphicState()
        state.setTheme("sepia")
        // Motion stays at its default — setting theme must not bleed across axes.
        assertEquals(Motion.AUTO, state.getMotion())
        assertEquals(Theme.SEPIA, state.getTheme())
    }

    @Test
    fun should_resolve_with_system_signals_when_choice_is_auto() {
        val state = MorphicState()
        val dark = SystemSignals(darkMode = true)
        assertEquals(Theme.DARK, state.resolvedTheme(dark))
        assertEquals(Motion.FULL, state.resolvedMotion(SystemSignals(reduceMotion = false)))
        assertEquals(Contrast.NO_PREFERENCE, state.resolvedContrast(SystemSignals(highContrast = false)))
        assertEquals(Density.COMFORTABLE, state.resolvedDensity(dark))
        assertEquals(FontSize.MD, state.resolvedFontSize(dark))
    }

    @Test
    fun should_resolve_to_concrete_choice_when_not_auto() {
        val state = MorphicState()
        state.setTheme("light")
        // darkMode signal must be ignored once the user picked a concrete theme.
        assertEquals(Theme.LIGHT, state.resolvedTheme(SystemSignals(darkMode = true)))
    }

    @Test
    fun should_accept_every_axis_setter_when_value_is_valid() {
        val state = MorphicState()
        assertEquals(Motion.REDUCED, state.setMotion("reduced"))
        assertEquals(Contrast.MORE, state.setContrast("more"))
        assertEquals(Density.SPACIOUS, state.setDensity("spacious"))
        assertEquals(FontSize.LG, state.setFontSize("lg"))
    }
}
