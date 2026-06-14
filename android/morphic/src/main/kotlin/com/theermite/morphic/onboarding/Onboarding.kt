package com.theermite.morphic.onboarding

import com.theermite.morphic.state.MorphicState

/**
 * Sensoriel-AVANT-identité onboarding — pure Kotlin state machine + identity
 * guard (A-5).
 *
 * Mirrors the web `packages/engine/src/onboarding.ts`. Three ordered sensoriel
 * steps (theme → motion → density); identity collection stays forbidden until
 * all three are done. That ordering is the Dignity §a BLOCKING contract: the
 * platform proves it respects the user's comfort BEFORE asking who they are.
 *
 * No Android framework here on purpose — fully measurable by Kover (Critical
 * 95% + MC/DC on the guard). The accessible Compose screen lives next door in
 * [MorphicOnboardingScreen] and is validated in a real app (PET-Android §5.bis).
 */

/** Ordered sensoriel step (closed enum, poka-yoke). `key` mirrors the web step name. */
public enum class OnboardingStep(public val key: String) {
    THEME("theme"),
    MOTION("motion"),
    DENSITY("density"),
    ;

    public companion object {
        /** Canonical order the machine walks through. */
        public val ORDER: List<OnboardingStep> = listOf(THEME, MOTION, DENSITY)
    }
}

/** Immutable snapshot of the onboarding flow. */
public data class OnboardingState(
    /** True once the user has entered the flow. */
    val started: Boolean,
    /** True once all three steps are done (completed or skipped). */
    val completed: Boolean,
    /** Step waiting for input, or null when idle/done. */
    val currentStep: OnboardingStep?,
    /** Steps resolved so far, in order. */
    val completedSteps: List<OnboardingStep>,
)

/**
 * Dignity §a BLOCKING guard — true if AND ONLY IF the user has entered the flow
 * AND finished all three sensoriel steps. Host apps MUST gate any
 * identity-collection UI behind this.
 *
 * Pure function so the MC/DC truth table is testable directly:
 *  - started=T, completed=T → true  (done)
 *  - started=T, completed=F → false (in progress — `completed` flips it)
 *  - started=F, completed=T → false (machine-unreachable — `started` flips it)
 *  - started=F, completed=F → false (idle)
 */
public fun canCollectIdentity(state: OnboardingState): Boolean =
    state.started && state.completed

/**
 * Drives the onboarding flow and writes each resolved choice into [morphic]
 * (parity with the web onboarding, which writes user choices to the prefs).
 *
 * In-memory only: the chosen axis values persist through `MorphicStore` (A-3,
 * host-driven); persisting the "onboarding done" marker is a host concern and
 * out of scope here — same layered split as A-2/A-3.
 */
public class MorphicOnboarding(private val morphic: MorphicState) {
    private var state: OnboardingState = idle()

    /** Current snapshot (in-memory). */
    public fun getState(): OnboardingState = state

    /** Enter the flow. Idempotent: re-entering never wipes progress. */
    public fun start(): OnboardingState {
        if (!state.started) {
            state = OnboardingState(
                started = true,
                completed = false,
                currentStep = OnboardingStep.THEME,
                completedSteps = emptyList(),
            )
        }
        return state
    }

    /**
     * Resolve the current step with a user-chosen value.
     *
     * @throws IllegalStateException if not started, already done, or out of order.
     * @throws IllegalArgumentException if the value is not a valid axis choice
     *   (raised by [MorphicState]); the machine is NOT advanced in that case.
     */
    public fun completeStep(step: OnboardingStep, value: String): OnboardingState =
        advance(step) { apply(step, value) }

    /**
     * Resolve the current step with its documented default
     * (theme=auto, motion=auto, density=comfortable).
     *
     * @throws IllegalStateException if not started, already done, or out of order.
     */
    public fun skipStep(step: OnboardingStep): OnboardingState =
        advance(step) { apply(step, DEFAULTS.getValue(step)) }

    /** Dignity §a guard for the live machine — see the pure [canCollectIdentity]. */
    public fun canCollectIdentity(): Boolean = canCollectIdentity(state)

    /**
     * Reset the ceremony to idle. The user's axis choices in [morphic] are
     * preserved — they reflect autonomous decisions, not the ceremony
     * (RGPD-friendly, parity with web `resetOnboarding`).
     */
    public fun reset(): OnboardingState {
        state = idle()
        return state
    }

    /** Shared guard-then-mutate path. Checks run BEFORE [write] so a failed write leaves state intact. */
    private fun advance(step: OnboardingStep, write: () -> Unit): OnboardingState {
        check(state.started) { "onboarding: not started — call start() first" }
        check(!state.completed) {
            "onboarding: already completed, cannot advance \"${step.key}\""
        }
        check(state.currentStep == step) {
            "onboarding: out of order — expected \"${state.currentStep?.key}\", got \"${step.key}\""
        }
        write()
        val done = state.completedSteps + step
        val allDone = done.size == OnboardingStep.ORDER.size
        state = OnboardingState(
            started = true,
            completed = allDone,
            currentStep = if (allDone) null else OnboardingStep.ORDER[done.size],
            completedSteps = done,
        )
        return state
    }

    private fun apply(step: OnboardingStep, value: String) {
        when (step) {
            OnboardingStep.THEME -> morphic.setTheme(value)
            OnboardingStep.MOTION -> morphic.setMotion(value)
            OnboardingStep.DENSITY -> morphic.setDensity(value)
        }
    }

    private companion object {
        private val DEFAULTS: Map<OnboardingStep, String> = mapOf(
            OnboardingStep.THEME to "auto",
            OnboardingStep.MOTION to "auto",
            OnboardingStep.DENSITY to "comfortable",
        )

        private fun idle(): OnboardingState =
            OnboardingState(started = false, completed = false, currentStep = null, completedSteps = emptyList())
    }
}
