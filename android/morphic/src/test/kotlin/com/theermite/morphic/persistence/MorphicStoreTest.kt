package com.theermite.morphic.persistence

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.theermite.morphic.axes.Contrast
import com.theermite.morphic.axes.Density
import com.theermite.morphic.axes.FontSize
import com.theermite.morphic.axes.Motion
import com.theermite.morphic.axes.Theme
import com.theermite.morphic.state.MorphicState
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

/**
 * A-3 DataStore persistence tests (TDG). Written before [MorphicStore] exists.
 *
 * The DataStore is built over a real temp file on the JVM (no emulator), so the
 * whole persistence layer stays Kover-measurable like A-1/A-2. Each test owns a
 * fresh [TemporaryFolder], so a literal file name never clashes across tests.
 *
 * Named per Quality.md convention: should_[action]_when_[condition].
 */
class MorphicStoreTest {
    @get:Rule
    val tmp = TemporaryFolder()

    /** A DataStore over a fresh, not-yet-existing file in the test's temp folder. */
    private fun TestScope.dataStore(name: String = "morphic.preferences_pb"): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(scope = backgroundScope) { File(tmp.root, name) }

    @Test
    fun should_default_every_axis_to_auto_when_store_is_empty() = runTest {
        val store = MorphicStore(dataStore())

        val loaded = store.load()

        assertEquals(Theme.AUTO, loaded.getTheme())
        assertEquals(Motion.AUTO, loaded.getMotion())
        assertEquals(Contrast.AUTO, loaded.getContrast())
        assertEquals(Density.AUTO, loaded.getDensity())
        assertEquals(FontSize.AUTO, loaded.getFontSize())
    }

    @Test
    fun should_round_trip_all_axes_when_saved_then_loaded() = runTest {
        val store = MorphicStore(dataStore())
        val state = MorphicState()
        state.setTheme("sepia")
        state.setMotion("reduced")
        state.setContrast("more")
        state.setDensity("spacious")
        state.setFontSize("lg")

        store.save(state)
        val loaded = store.load()

        assertEquals(Theme.SEPIA, loaded.getTheme())
        assertEquals(Motion.REDUCED, loaded.getMotion())
        assertEquals(Contrast.MORE, loaded.getContrast())
        assertEquals(Density.SPACIOUS, loaded.getDensity())
        assertEquals(FontSize.LG, loaded.getFontSize())
    }

    @Test
    fun should_fall_back_to_default_when_stored_value_is_corrupt() = runTest {
        val ds = dataStore()
        // A foreign process / older schema wrote a value the enum cannot parse.
        ds.edit { it[stringPreferencesKey("theme")] = "violet" }
        val store = MorphicStore(ds)

        val loaded = store.load()

        // Corruption is tolerated: the axis silently falls back to its default.
        assertEquals(Theme.AUTO, loaded.getTheme())
    }

    @Test
    fun should_keep_valid_axes_and_default_the_missing_ones_when_partial() = runTest {
        val ds = dataStore()
        ds.edit {
            it[stringPreferencesKey("theme")] = "dark"
            it[stringPreferencesKey("motion")] = "none"
            // contrast / density / fontSize keys are absent on purpose.
        }
        val store = MorphicStore(ds)

        val loaded = store.load()

        assertEquals(Theme.DARK, loaded.getTheme())
        assertEquals(Motion.NONE, loaded.getMotion())
        assertEquals(Contrast.AUTO, loaded.getContrast())
        assertEquals(Density.AUTO, loaded.getDensity())
        assertEquals(FontSize.AUTO, loaded.getFontSize())
    }

    @Test
    fun should_overwrite_previous_choice_when_saved_again() = runTest {
        val store = MorphicStore(dataStore())
        val first = MorphicState().apply { setTheme("light") }
        val second = MorphicState().apply { setTheme("dark") }

        store.save(first)
        store.save(second)
        val loaded = store.load()

        assertEquals(Theme.DARK, loaded.getTheme())
    }
}
