/**
 * @morphic/engine — Shinkofa Morphic Adaptation Engine
 *
 * Framework-agnostic core engine. Drop-in universal adapter for
 * presentation, navigation, ergonomics, and accessibility based on
 * the user's holistic profile.
 *
 * Specification: docs/CDC.md + docs/PET.md.
 * License: AGPL-3.0-or-later.
 */

export const VERSION = '2.0.0-alpha.0' as const;

export {
  CLICK_DELAY_MAX,
  CLICK_DELAY_MIN,
  type ClickDelayOptions,
  type ClickDelayState,
  clearClickDelay,
  getClickDelay,
  getClickDelayState,
  MORPHIC_CLICK_DELAY_MARKER,
  setClickDelay,
  validateClickDelay,
} from './click-delay.js';
export {
  __resetCognitiveStateForTests,
  getDecisionPointsCap,
  MORPHIC_DECISION_POINTS_CAP_DEFAULT,
  MORPHIC_DECISION_POINTS_CAP_MAX,
  setDecisionPointsCap,
  validateDecisionPoints,
} from './cognitive.js';
export {
  COMMAND_PALETTE_DEFAULT_TRIGGER,
  type Command,
  type CommandPaletteOptions,
  type CommandPaletteState,
  closeCommandPalette,
  detectOS,
  disableCommandPalette,
  enableCommandPalette,
  getCommandPaletteState,
  MORPHIC_COMMAND_PALETTE_DEFAULT_Z_INDEX,
  MORPHIC_COMMAND_PALETTE_MARKER,
  MORPHIC_COMMAND_PALETTE_TAG,
  matchesCombo,
  type OS,
  openCommandPalette,
  type ParsedCombo,
  parseCombo,
} from './command-palette.js';
export {
  type ContrastChoice,
  getContrast,
  type ResolvedContrast,
  resolveAutoContrast,
  setContrast,
} from './contrast.js';
export {
  COLOR_VISION_TYPES,
  type ColorVisionCorrection,
  type ColorVisionType,
  clearColorVisionCorrection,
  computeDaltonizationMatrix,
  daltonize,
  delinearizeSrgb,
  getColorVisionCorrection,
  linearizeSrgb,
  MORPHIC_DALTONIZE_DEFAULT_SEVERITY,
  MORPHIC_DALTONIZE_FILTER_ID,
  setColorVisionCorrection,
} from './daltonization.js';
export {
  type DensityChoice,
  getDensity,
  type ResolvedDensity,
  resolveAutoDensity,
  setDensity,
} from './density.js';
export {
  clearDwellClick,
  DWELL_CLICK_DELAY_MAX,
  DWELL_CLICK_DELAY_MIN,
  DWELL_CLICK_RADIUS_DEFAULT,
  type DwellClickOptions,
  type DwellClickState,
  getDwellClick,
  getDwellClickState,
  MORPHIC_DWELL_CLICK_MARKER,
  MORPHIC_DWELL_CLICK_PROGRESS_CLASS,
  setDwellClick,
  validateDwellDelay,
} from './dwell-click.js';
export {
  __resetIdleDetectionStateForTests,
  clearIdleDetection,
  getIdleDetectionState,
  IDLE_TIMEOUT_DEFAULT,
  IDLE_TIMEOUT_MAX,
  IDLE_TIMEOUT_MIN,
  type IdleDetectionOptions,
  type IdleDetectionState,
  isIdle,
  MORPHIC_IDLE_EVENT_PAUSE,
  MORPHIC_IDLE_EVENT_RESUME,
  MORPHIC_IDLE_MARKER,
  setIdleDetection,
} from './idle-detection.js';
export {
  MORPHIC_STORAGE_KEY,
  type MorphicPrefs,
  morphicInit,
  readPrefs,
} from './init.js';
export {
  defineMorphicProvider,
  MORPHIC_PROVIDER_TAG,
  MorphicProvider,
} from './morphic-provider.js';
export {
  getMotion,
  type MotionChoice,
  type ResolvedMotion,
  resolveAutoMotion,
  setMotion,
} from './motion.js';
export {
  __resetOnboardingStateForTests,
  canCollectIdentity,
  completeStep,
  getOnboardingState,
  MORPHIC_ONBOARDING_EVENT_COMPLETE,
  MORPHIC_ONBOARDING_EVENT_STEP_COMPLETE,
  MORPHIC_ONBOARDING_MARKER,
  ONBOARDING_STEPS,
  type OnboardingState,
  type OnboardingStep,
  resetOnboarding,
  skipStep,
  startOnboarding,
} from './onboarding.js';
export {
  __resetPomodoroStateForTests,
  getPomodoroState,
  MORPHIC_POMODORO_CYCLES_DEFAULT,
  MORPHIC_POMODORO_EVENT_BREAK_END,
  MORPHIC_POMODORO_EVENT_BREAK_START,
  MORPHIC_POMODORO_EVENT_SESSION_COMPLETE,
  MORPHIC_POMODORO_EVENT_TICK,
  MORPHIC_POMODORO_EVENT_WORK_END,
  MORPHIC_POMODORO_LONG_BREAK_DEFAULT,
  MORPHIC_POMODORO_MARKER,
  MORPHIC_POMODORO_SHORT_BREAK_DEFAULT,
  MORPHIC_POMODORO_TICK_MS,
  MORPHIC_POMODORO_WORK_DEFAULT,
  POMODORO_PHASES,
  type PomodoroOptions,
  type PomodoroPhase,
  type PomodoroState,
  pausePomodoro,
  resumePomodoro,
  skipPhase,
  startPomodoro,
  stopPomodoro,
} from './pomodoro.js';
export {
  applyReadingFocus,
  clearReadingFocus,
  getReadingFocus,
  MORPHIC_READING_FOCUS_MARKER,
  MORPHIC_READING_FOCUS_RATIOS,
  READING_FOCUS_INTENSITIES,
  type ReadingFocusIntensity,
  type ReadingFocusOptions,
  setReadingFocus,
} from './reading-focus.js';
export {
  clearReadingGuide,
  getReadingGuide,
  MORPHIC_READING_GUIDE_DEFAULT_BAND_HEIGHT,
  MORPHIC_READING_GUIDE_DEFAULT_RULER_WIDTH,
  MORPHIC_READING_GUIDE_DEFAULT_Z_INDEX,
  MORPHIC_READING_GUIDE_MARKER,
  READING_GUIDE_MODES,
  type ReadingGuideMode,
  type ReadingGuideOptions,
  setReadingGuide,
} from './reading-guide.js';
export {
  __resetRecoveryStateForTests,
  enterRecoveryMode,
  exitRecoveryMode,
  getRecoveryState,
  isRecoveryActive,
  MORPHIC_RECOVERY_EVENT_ENTER,
  MORPHIC_RECOVERY_EVENT_EXIT,
  MORPHIC_RECOVERY_MARKER,
  RECOVERY_PROFILE_DEFAULT,
  type RecoveryModeOptions,
  type RecoveryModeState,
  type RecoveryPrefsSnapshot,
  type RecoveryProfile,
} from './recovery-mode.js';
export {
  getTheme,
  type ResolvedTheme,
  resolveAutoTheme,
  setTheme,
  type ThemeChoice,
} from './theme.js';
export {
  CONTRASTS,
  type Contrast,
  ContrastSchema,
  DENSITIES,
  type Density,
  DensitySchema,
  type DtcgToken,
  FONT_SIZES,
  type FontSize,
  FontSizeSchema,
  MOTIONS,
  type MorphicPrefs as MorphicPrefsValidated,
  MorphicPrefsSchema,
  type Motion,
  MotionSchema,
  morphicTokens,
  safeValidatePrefs,
  THEMES,
  type Theme,
  ThemeSchema,
} from './tokens.js';
export {
  clearTremorFilter,
  type FilteredPosition,
  getDiagnostics,
  getTremorFilter,
  getTremorFilterState,
  MORPHIC_TREMOR_FILTER_MARKER,
  movingAverage,
  setTremorFilter,
  TREMOR_FILTER_WINDOW_DEFAULT,
  TREMOR_FILTER_WINDOW_MAX,
  TREMOR_FILTER_WINDOW_MIN,
  type TremorFilterOptions,
  type TremorFilterState,
  validateWindowSize,
} from './tremor-filter.js';
export {
  type FontSizeChoice,
  getFontSize,
  type ResolvedFontSize,
  resolveAutoFontSize,
  setFontSize,
} from './typography.js';
export {
  disableWaiSymbols,
  enableWaiSymbols,
  getWaiSymbolsState,
  MORPHIC_WAI_SYMBOLS_DEFAULT_Z_INDEX,
  MORPHIC_WAI_SYMBOLS_MARKER,
  MORPHIC_WAI_SYMBOLS_ORIGINAL_TEXT_ATTR,
  parseBciIndices,
  type SymbolResolution,
  type SymbolResolver,
  WAI_SYMBOL_ATTRIBUTE,
  WAI_SYMBOLS_MODES,
  type WaiSymbolsMode,
  type WaiSymbolsOptions,
  type WaiSymbolsState,
} from './wai-symbols.js';
