package com.theermite.morphic.axes

/**
 * Morphic sensory axes — pure Kotlin logic (A-2).
 *
 * Mirrors the web axes (B-007→B-011: theme, motion, contrast, density,
 * fontSize). Each axis is a closed enum carrying the DTCG token string (kept in
 * lockstep with the generated [com.theermite.morphic.tokens.MorphicTokens] via
 * AxesTest), plus an `AUTO` member that resolves at runtime.
 *
 * No Android framework here on purpose: the system state needed to resolve
 * `AUTO` is passed in as [SystemSignals], so this layer stays pure and fully
 * measurable by Kover. Reading the real system state (dark mode, reduced
 * motion, contrast) belongs to the Compose layer (A-4). See PET-Android §5.bis.
 */

/**
 * System-level accessibility signals used to resolve `AUTO` choices.
 *
 * Defaults are the safe, least-surprising fallbacks (light, full motion, normal
 * contrast) so a caller that cannot read a given signal still gets a sane value.
 */
public data class SystemSignals(
    val darkMode: Boolean = false,
    val reduceMotion: Boolean = false,
    val highContrast: Boolean = false,
)

/** Visual theme axis. `AUTO` follows the system dark-mode signal. */
public enum class Theme(public val value: String) {
    LIGHT("light"),
    DARK("dark"),
    AUTO("auto"),
    HIGH_CONTRAST("high-contrast"),
    SEPIA("sepia"),
    ;

    /** Concrete theme to apply: `AUTO` → dark/light from the system, else self. */
    public fun resolve(signals: SystemSignals): Theme =
        if (this == AUTO) {
            if (signals.darkMode) DARK else LIGHT
        } else {
            this
        }

    public companion object {
        /** Parse a token string to a member, or null when unknown (poka-yoke). */
        public fun fromValue(value: String): Theme? = entries.firstOrNull { it.value == value }
    }
}

/** Motion preference axis. `AUTO` follows the system reduced-motion signal. */
public enum class Motion(public val value: String) {
    FULL("full"),
    REDUCED("reduced"),
    NONE("none"),
    AUTO("auto"),
    ;

    /** Concrete motion to apply: `AUTO` → reduced/full from the system, else self. */
    public fun resolve(signals: SystemSignals): Motion =
        if (this == AUTO) {
            if (signals.reduceMotion) REDUCED else FULL
        } else {
            this
        }

    public companion object {
        public fun fromValue(value: String): Motion? = entries.firstOrNull { it.value == value }
    }
}

/**
 * Contrast preference axis. `AUTO` follows the system high-contrast signal.
 *
 * Android exposes no graded "less contrast" system signal (unlike the web
 * `prefers-contrast: less`), so `AUTO` maps to MORE or NO_PREFERENCE only.
 */
public enum class Contrast(public val value: String) {
    NO_PREFERENCE("no-preference"),
    MORE("more"),
    LESS("less"),
    CUSTOM("custom"),
    AUTO("auto"),
    ;

    /** Concrete contrast to apply: `AUTO` → more/no-preference, else self. */
    public fun resolve(signals: SystemSignals): Contrast =
        if (this == AUTO) {
            if (signals.highContrast) MORE else NO_PREFERENCE
        } else {
            this
        }

    public companion object {
        public fun fromValue(value: String): Contrast? = entries.firstOrNull { it.value == value }
    }
}

/**
 * Information-density axis. No system density signal exists, so `AUTO` resolves
 * to the safe default COMFORTABLE (mirrors web resolveAutoDensity).
 */
public enum class Density(public val value: String) {
    COMPACT("compact"),
    COMFORTABLE("comfortable"),
    SPACIOUS("spacious"),
    AUTO("auto"),
    ;

    /** Concrete density to apply: `AUTO` → COMFORTABLE, else self. */
    public fun resolve(
        @Suppress("UNUSED_PARAMETER") signals: SystemSignals,
    ): Density = if (this == AUTO) COMFORTABLE else this

    public companion object {
        public fun fromValue(value: String): Density? = entries.firstOrNull { it.value == value }
    }
}

/**
 * Base font-size axis. No system font-size signal exists, so `AUTO` resolves to
 * the safe default MD (16px equivalent; mirrors web resolveAutoFontSize).
 */
public enum class FontSize(public val value: String) {
    SM("sm"),
    MD("md"),
    LG("lg"),
    XL("xl"),
    AUTO("auto"),
    ;

    /** Concrete font-size to apply: `AUTO` → MD, else self. */
    public fun resolve(
        @Suppress("UNUSED_PARAMETER") signals: SystemSignals,
    ): FontSize = if (this == AUTO) MD else this

    public companion object {
        public fun fromValue(value: String): FontSize? = entries.firstOrNull { it.value == value }
    }
}
