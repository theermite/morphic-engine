package com.theermite.morphic.theme

import com.theermite.morphic.axes.Contrast
import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.FontSize
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.SystemSignals
import com.theermite.morphic.axes.Theme
import com.theermite.morphic.state.MorphicState

/**
 * Pure resolution logic behind the A-4 Compose layer.
 *
 * Everything the @Composable `MorphicProvider` needs to decide lives here as
 * non-Composable functions, so it is measured by Kover (PET-Android §5.bis):
 * the Composable only gathers platform primitives and calls in.
 */

/** Resolved (no-`AUTO`) snapshot of every axis, delivered to the host UI. */
public data class ResolvedMorphic(
    val theme: Theme,
    val motion: Motion,
    val contrast: Contrast,
    val density: Density,
    val fontSize: FontSize,
)

/**
 * Build [SystemSignals] from raw platform values.
 *
 * Reduced motion mirrors the Android convention: an animator duration scale of
 * `0` means the user disabled animations system-wide. Keeping this a pure
 * function (primitives in, value object out) makes it JVM-testable without an
 * emulator.
 */
public fun systemSignals(
    isSystemDark: Boolean,
    animatorDurationScale: Float,
    isHighContrast: Boolean,
): SystemSignals = SystemSignals(
    darkMode = isSystemDark,
    reduceMotion = animatorDurationScale == 0f,
    highContrast = isHighContrast,
)

/** Resolve all five axes at once against the given system signals. */
public fun MorphicState.resolveAll(signals: SystemSignals): ResolvedMorphic = ResolvedMorphic(
    theme = resolvedTheme(signals),
    motion = resolvedMotion(signals),
    contrast = resolvedContrast(signals),
    density = resolvedDensity(signals),
    fontSize = resolvedFontSize(signals),
)

/**
 * Whether the Material 3 baseline should use the dark color scheme.
 *
 * Only a resolved `DARK` theme is dark. `LIGHT`, `HIGH_CONTRAST` and `SEPIA`
 * use the light baseline and let the host overlay their palette via the
 * resolved value it reads from `LocalMorphic`. `AUTO` is resolved upstream and
 * never reaches here, but maps to light defensively.
 */
public fun useDarkColorScheme(theme: Theme): Boolean = theme == Theme.DARK
