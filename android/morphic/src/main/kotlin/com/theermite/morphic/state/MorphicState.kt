package com.theermite.morphic.state

import com.theermite.morphic.axes.Contrast
import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.FontSize
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.SystemSignals
import com.theermite.morphic.axes.Theme

/**
 * In-memory holder of the user's morphic choices (A-2).
 *
 * Mirrors the web set/get API (theme.ts, motion.ts, …) but without persistence:
 * DataStore backing lands in A-3, Compose delivery in A-4. Every axis defaults
 * to `AUTO` until the user picks a concrete value.
 *
 * Two boundaries:
 *  - `setX(String)` validates against the closed enum and throws on the unknown
 *    (poka-yoke, mirrors the web setX TypeError). The host never stores junk.
 *  - `resolvedX(SystemSignals)` returns the concrete value to apply, resolving
 *    `AUTO` from the supplied system signals.
 *
 * Pure Kotlin, no Android framework — fully measurable by Kover.
 */
public class MorphicState {
    private var theme: Theme = Theme.AUTO
    private var motion: Motion = Motion.AUTO
    private var contrast: Contrast = Contrast.AUTO
    private var density: Density = Density.AUTO
    private var fontSize: FontSize = FontSize.AUTO

    // --- Theme --------------------------------------------------------------

    public fun setTheme(value: String): Theme {
        theme = requireChoice(Theme.fromValue(value), value, "theme")
        return theme
    }

    public fun getTheme(): Theme = theme

    public fun resolvedTheme(signals: SystemSignals): Theme = theme.resolve(signals)

    // --- Motion -------------------------------------------------------------

    public fun setMotion(value: String): Motion {
        motion = requireChoice(Motion.fromValue(value), value, "motion")
        return motion
    }

    public fun getMotion(): Motion = motion

    public fun resolvedMotion(signals: SystemSignals): Motion = motion.resolve(signals)

    // --- Contrast -----------------------------------------------------------

    public fun setContrast(value: String): Contrast {
        contrast = requireChoice(Contrast.fromValue(value), value, "contrast")
        return contrast
    }

    public fun getContrast(): Contrast = contrast

    public fun resolvedContrast(signals: SystemSignals): Contrast = contrast.resolve(signals)

    // --- Density ------------------------------------------------------------

    public fun setDensity(value: String): Density {
        density = requireChoice(Density.fromValue(value), value, "density")
        return density
    }

    public fun getDensity(): Density = density

    public fun resolvedDensity(signals: SystemSignals): Density = density.resolve(signals)

    // --- FontSize -----------------------------------------------------------

    public fun setFontSize(value: String): FontSize {
        fontSize = requireChoice(FontSize.fromValue(value), value, "fontSize")
        return fontSize
    }

    public fun getFontSize(): FontSize = fontSize

    public fun resolvedFontSize(signals: SystemSignals): FontSize = fontSize.resolve(signals)

    private companion object {
        /** Reject an unparsed (null) choice with a clear, closed-enum message. */
        private fun <T : Any> requireChoice(choice: T?, value: String, axis: String): T =
            choice ?: throw IllegalArgumentException(
                "MorphicState.$axis: unknown value \"$value\".",
            )
    }
}
