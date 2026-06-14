package com.theermite.morphic.theme

import android.provider.Settings
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import com.theermite.morphic.state.MorphicState

/**
 * Resolved morphic choices for the current composition. Read it from any
 * descendant of [MorphicProvider]:
 *
 * ```
 * val morphic = LocalMorphic.current
 * if (morphic.motion == Motion.FULL) { /* animate */ }
 * ```
 *
 * Accessing it outside a [MorphicProvider] is a programming error, not a silent
 * default — hence the throwing initializer.
 */
public val LocalMorphic: ProvidableCompositionLocal<ResolvedMorphic> =
    staticCompositionLocalOf {
        error("LocalMorphic accessed outside MorphicProvider — wrap your UI in MorphicProvider { ... }.")
    }

/**
 * Deliver the user's resolved sensory choices to the host UI and orchestrate
 * the Material 3 baseline (light/dark) from them.
 *
 * Thin by design (PET-Android §5.bis): it only reads platform signals, resolves
 * via the pure A-2/A-4 logic ([resolveAll], [systemSignals], [useDarkColorScheme]),
 * and provides the result. No business logic lives here, so it carries no
 * coverage floor — it is validated in a real host app. The host reads
 * [LocalMorphic] to apply font size, density and contrast, which the engine
 * deliberately does not hard-code (parity with the headless web API: the host
 * owns the rendered numbers).
 */
@Composable
public fun MorphicProvider(
    state: MorphicState,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    // `getFloat(..., default)` returns the default instead of throwing when the
    // setting is absent, so no SettingNotFoundException handling is needed.
    val animatorScale = Settings.Global.getFloat(
        context.contentResolver,
        Settings.Global.ANIMATOR_DURATION_SCALE,
        1f,
    )
    // Android exposes no public high-contrast query (cf. A-2 contrast divergence),
    // so the *system* high-contrast signal stays false. The user's explicit
    // contrast choice still flows through `resolveAll` unchanged.
    val signals = systemSignals(
        isSystemDark = isSystemInDarkTheme(),
        animatorDurationScale = animatorScale,
        isHighContrast = false,
    )
    val resolved = state.resolveAll(signals)
    CompositionLocalProvider(LocalMorphic provides resolved) {
        MaterialTheme(
            colorScheme = if (useDarkColorScheme(resolved.theme)) darkColorScheme() else lightColorScheme(),
            content = content,
        )
    }
}
