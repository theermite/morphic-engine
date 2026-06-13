package com.theermite.morphic.persistence

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.theermite.morphic.axes.Contrast
import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.FontSize
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.Theme
import com.theermite.morphic.state.MorphicState
import kotlinx.coroutines.flow.first

/**
 * DataStore-backed persistence for the user's morphic choices (A-3).
 *
 * Saves and restores the five sensory axes between sessions. Mirrors the web
 * persistence contract (idb-storage.ts): a snapshot of every axis is written as
 * one token string per key, and a missing or corrupt key falls back to the
 * axis default rather than throwing.
 *
 * The [DataStore] is injected, not created here. That keeps this layer pure
 * Kotlin — testable on the JVM over a temp file, no Android Context, no
 * emulator — so it stays measurable by Kover like A-1/A-2. The Android wiring
 * (a Context-bound DataStore) belongs to the host app / the A-4 Compose layer.
 *
 * Contract:
 *  - [save] writes the literal choice of each axis (including `auto`).
 *  - [load] rebuilds a [MorphicState] through A-2's validated setters: a key
 *    that is absent OR holds an unparseable value leaves that axis at its
 *    `AUTO` default. Corruption is tolerated, never propagated.
 */
public class MorphicStore(private val dataStore: DataStore<Preferences>) {

    /** Persist a snapshot of every axis. Overwrites any previous snapshot. */
    public suspend fun save(state: MorphicState) {
        dataStore.edit { prefs ->
            prefs[THEME_KEY] = state.getTheme().value
            prefs[MOTION_KEY] = state.getMotion().value
            prefs[CONTRAST_KEY] = state.getContrast().value
            prefs[DENSITY_KEY] = state.getDensity().value
            prefs[FONT_SIZE_KEY] = state.getFontSize().value
        }
    }

    /**
     * Rebuild the saved state. For each axis: apply the persisted value only
     * when it parses to a known member (the `fromValue != null` guard), so an
     * absent or corrupt key leaves that axis at its `AUTO` default — the A-2
     * setter is never reached with an invalid value, hence never throws.
     */
    public suspend fun load(): MorphicState {
        val prefs = dataStore.data.first()
        return MorphicState().apply {
            prefs[THEME_KEY]?.let { if (Theme.fromValue(it) != null) setTheme(it) }
            prefs[MOTION_KEY]?.let { if (Motion.fromValue(it) != null) setMotion(it) }
            prefs[CONTRAST_KEY]?.let { if (Contrast.fromValue(it) != null) setContrast(it) }
            prefs[DENSITY_KEY]?.let { if (Density.fromValue(it) != null) setDensity(it) }
            prefs[FONT_SIZE_KEY]?.let { if (FontSize.fromValue(it) != null) setFontSize(it) }
        }
    }

    private companion object {
        private val THEME_KEY = stringPreferencesKey("theme")
        private val MOTION_KEY = stringPreferencesKey("motion")
        private val CONTRAST_KEY = stringPreferencesKey("contrast")
        private val DENSITY_KEY = stringPreferencesKey("density")
        private val FONT_SIZE_KEY = stringPreferencesKey("fontSize")
    }
}
