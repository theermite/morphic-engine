package com.theermite.morphic.onboarding

import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.Theme
import com.theermite.morphic.state.MorphicState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A-5 onboarding tests (TDG). Sensoriel-AVANT-identité state machine + the
 * Dignity §a BLOCKING guard `canCollectIdentity()`.
 *
 * Critical 95% (Kover) + MC/DC on the guard. Pure Kotlin, no Android framework
 * (the Composable screen is validated in a real app, not here). Mirror of the
 * web `packages/engine/src/onboarding.ts`.
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class OnboardingTest {
    private fun newOnboarding(morphic: MorphicState = MorphicState()) = MorphicOnboarding(morphic)

    // --- MC/DC on the guard (pure function, all 4 combinations) -------------

    @Test
    fun should_allow_identity_when_started_and_completed() {
        val state = OnboardingState(
            started = true,
            completed = true,
            currentStep = null,
            completedSteps = OnboardingStep.ORDER,
        )
        assertTrue(canCollectIdentity(state))
    }

    @Test
    fun should_block_identity_when_started_but_not_completed() {
        val state = OnboardingState(
            started = true,
            completed = false,
            currentStep = OnboardingStep.THEME,
            completedSteps = emptyList(),
        )
        assertFalse(canCollectIdentity(state))
    }

    @Test
    fun should_block_identity_when_completed_but_not_started() {
        // FT — unreachable through the machine, but the boolean still gates.
        // MC/DC: `started` independently flips the outcome vs the TT case.
        val state = OnboardingState(
            started = false,
            completed = true,
            currentStep = null,
            completedSteps = emptyList(),
        )
        assertFalse(canCollectIdentity(state))
    }

    @Test
    fun should_block_identity_when_neither_started_nor_completed() {
        val state = OnboardingState(
            started = false,
            completed = false,
            currentStep = null,
            completedSteps = emptyList(),
        )
        assertFalse(canCollectIdentity(state))
    }

    // --- State machine ------------------------------------------------------

    @Test
    fun should_be_idle_when_freshly_created() {
        val state = newOnboarding().getState()
        assertFalse(state.started)
        assertFalse(state.completed)
        assertNull(state.currentStep)
        assertTrue(state.completedSteps.isEmpty())
    }

    @Test
    fun should_point_to_theme_when_started() {
        val state = newOnboarding().start()
        assertTrue(state.started)
        assertEquals(OnboardingStep.THEME, state.currentStep)
    }

    @Test
    fun should_not_reset_progress_when_start_called_twice() {
        val onboarding = newOnboarding()
        onboarding.start()
        onboarding.completeStep(OnboardingStep.THEME, "dark")
        // Re-entering must not wipe the completed step.
        val state = onboarding.start()
        assertEquals(OnboardingStep.MOTION, state.currentStep)
        assertEquals(listOf(OnboardingStep.THEME), state.completedSteps)
    }

    @Test
    fun should_block_identity_until_all_three_steps_done() {
        val onboarding = newOnboarding()
        onboarding.start()
        assertFalse(onboarding.canCollectIdentity())
        onboarding.completeStep(OnboardingStep.THEME, "dark")
        assertFalse(onboarding.canCollectIdentity())
        onboarding.completeStep(OnboardingStep.MOTION, "reduced")
        assertFalse(onboarding.canCollectIdentity())
        onboarding.completeStep(OnboardingStep.DENSITY, "compact")
        assertTrue(onboarding.canCollectIdentity())
    }

    @Test
    fun should_mark_completed_when_three_steps_done_in_order() {
        val onboarding = newOnboarding()
        onboarding.start()
        onboarding.completeStep(OnboardingStep.THEME, "light")
        onboarding.completeStep(OnboardingStep.MOTION, "full")
        val state = onboarding.completeStep(OnboardingStep.DENSITY, "spacious")
        assertTrue(state.completed)
        assertNull(state.currentStep)
        assertEquals(OnboardingStep.ORDER, state.completedSteps)
    }

    @Test
    fun should_write_choices_into_morphic_state_when_completed() {
        val morphic = MorphicState()
        val onboarding = newOnboarding(morphic)
        onboarding.start()
        onboarding.completeStep(OnboardingStep.THEME, "sepia")
        assertEquals(Theme.SEPIA, morphic.getTheme())
        onboarding.completeStep(OnboardingStep.MOTION, "none")
        assertEquals(Motion.NONE, morphic.getMotion())
        onboarding.completeStep(OnboardingStep.DENSITY, "compact")
        assertEquals(Density.COMPACT, morphic.getDensity())
    }

    // --- Order + lifecycle guards (snapshot-stable on failure) --------------

    @Test
    fun should_throw_when_complete_before_start() {
        assertThrows(IllegalStateException::class.java) {
            newOnboarding().completeStep(OnboardingStep.THEME, "dark")
        }
    }

    @Test
    fun should_throw_when_step_out_of_order() {
        val onboarding = newOnboarding()
        onboarding.start()
        assertThrows(IllegalStateException::class.java) {
            onboarding.completeStep(OnboardingStep.MOTION, "reduced")
        }
    }

    @Test
    fun should_throw_when_complete_after_all_done() {
        val onboarding = newOnboarding()
        onboarding.start()
        onboarding.completeStep(OnboardingStep.THEME, "dark")
        onboarding.completeStep(OnboardingStep.MOTION, "reduced")
        onboarding.completeStep(OnboardingStep.DENSITY, "compact")
        assertThrows(IllegalStateException::class.java) {
            onboarding.completeStep(OnboardingStep.THEME, "light")
        }
    }

    @Test
    fun should_reject_invalid_value_and_keep_state_unchanged() {
        val morphic = MorphicState()
        val onboarding = newOnboarding(morphic)
        onboarding.start()
        assertThrows(IllegalArgumentException::class.java) {
            onboarding.completeStep(OnboardingStep.THEME, "violet")
        }
        // Neither the machine nor the axis moved.
        assertEquals(OnboardingStep.THEME, onboarding.getState().currentStep)
        assertTrue(onboarding.getState().completedSteps.isEmpty())
        assertEquals(Theme.AUTO, morphic.getTheme())
    }

    // --- Skip ---------------------------------------------------------------

    @Test
    fun should_apply_documented_default_when_step_skipped() {
        val morphic = MorphicState()
        val onboarding = newOnboarding(morphic)
        onboarding.start()
        onboarding.skipStep(OnboardingStep.THEME)
        assertEquals(Theme.AUTO, morphic.getTheme())
        onboarding.skipStep(OnboardingStep.MOTION)
        assertEquals(Motion.AUTO, morphic.getMotion())
        val state = onboarding.skipStep(OnboardingStep.DENSITY)
        assertEquals(Density.COMFORTABLE, morphic.getDensity())
        assertTrue(state.completed)
    }

    @Test
    fun should_throw_when_skip_out_of_order() {
        val onboarding = newOnboarding()
        onboarding.start()
        assertThrows(IllegalStateException::class.java) {
            onboarding.skipStep(OnboardingStep.DENSITY)
        }
    }

    @Test
    fun should_throw_when_skip_before_start() {
        assertThrows(IllegalStateException::class.java) {
            newOnboarding().skipStep(OnboardingStep.THEME)
        }
    }

    // --- Reset (RGPD-friendly: ceremony resets, choices survive) ------------

    @Test
    fun should_reset_to_idle_but_keep_axis_choices() {
        val morphic = MorphicState()
        val onboarding = newOnboarding(morphic)
        onboarding.start()
        onboarding.completeStep(OnboardingStep.THEME, "dark")
        val state = onboarding.reset()
        assertFalse(state.started)
        assertFalse(state.completed)
        assertNull(state.currentStep)
        assertTrue(state.completedSteps.isEmpty())
        // The autonomous choice survives the reset.
        assertEquals(Theme.DARK, morphic.getTheme())
    }

    @Test
    fun should_allow_re_onboarding_after_reset() {
        val onboarding = newOnboarding()
        onboarding.start()
        onboarding.completeStep(OnboardingStep.THEME, "dark")
        onboarding.reset()
        val state = onboarding.start()
        assertTrue(state.started)
        assertEquals(OnboardingStep.THEME, state.currentStep)
    }

    @Test
    fun should_expose_step_keys_for_host_rendering() {
        assertEquals("theme", OnboardingStep.THEME.key)
        assertEquals("motion", OnboardingStep.MOTION.key)
        assertEquals("density", OnboardingStep.DENSITY.key)
        assertEquals(listOf(OnboardingStep.THEME, OnboardingStep.MOTION, OnboardingStep.DENSITY), OnboardingStep.ORDER)
    }
}
