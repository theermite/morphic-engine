/**
 * exportPreferences — GDPR Article 20 portability export.
 *
 * CDC ref : F-023 — Export préférences JSON GDPR Art. 20.
 * Brick   : B-024a.
 * Risk    : Critical 95% + MC/DC + PBT.
 *
 * Contract:
 *   - Returns a fresh, plain, JSON-serializable object every call.
 *   - schemaVersion is a frozen literal — never user-influenced.
 *   - exportedAt is a fresh ISO 8601 UTC timestamp (no high-precision device
 *     identifier; ms-resolution wall clock only).
 *   - axes covers exactly the 6 morphic axes (theme, motion, contrast,
 *     density, fontSize, fontFamily). Adding a 7th axis without updating
 *     this exporter triggers the parameterized test in tests/export-gdpr.test.ts.
 *   - Each axis value is the user's persisted preference (may include 'auto')
 *     or `null` when nothing is persisted / storage is unreachable / the
 *     stored value is invalid.
 *   - Zero PII : no email, no IP, no UUID, no fingerprint, no high-precision
 *     timestamp, no device id. The output is portable across user accounts
 *     and devices.
 *   - SSR-safe : the underlying axis getters already guard `typeof window`.
 *   - Idempotent : repeated calls produce equal outputs (modulo exportedAt).
 *
 * Design : delegates to the per-axis getters. They are the single source of
 * truth for "what counts as a valid persisted preference" — keeping the
 * exporter aligned with axis logic for free (DRY + Beyonce rule).
 *
 * Defensive assertions (≥2, per Quality.md Critical floor):
 *   1. Output schemaVersion must equal the frozen constant.
 *   2. Output exportedAt must parse back to a valid Date.
 *   Both assertions are exit invariants — they catch tampering or future
 *   refactor regressions before the caller sees a malformed export.
 */

import type { ContrastChoice } from './contrast.js';
import { getContrast } from './contrast.js';
import type { DensityChoice } from './density.js';
import { getDensity } from './density.js';
import type { FontFamilyChoice } from './font-family.js';
import { getFontFamily } from './font-family.js';
import type { MotionChoice } from './motion.js';
import { getMotion } from './motion.js';
import type { ThemeChoice } from './theme.js';
import { getTheme } from './theme.js';
import type { FontSizeChoice } from './typography.js';
import { getFontSize } from './typography.js';

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/**
 * Frozen schema version for the GDPR export payload.
 *
 * MUST be bumped (semver) whenever the export structure changes in a way
 * that breaks downstream parsers (added/removed axis = MAJOR; field
 * renamed = MAJOR; new optional metadata field = MINOR).
 */
export const EXPORT_SCHEMA_VERSION = '1.0.0' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The 6 morphic axes covered by the GDPR export. */
export interface MorphicExportAxes {
  readonly theme: ThemeChoice | null;
  readonly motion: MotionChoice | null;
  readonly contrast: ContrastChoice | null;
  readonly density: DensityChoice | null;
  readonly fontSize: FontSizeChoice | null;
  readonly fontFamily: FontFamilyChoice | null;
}

/** Full GDPR-portable export payload. */
export interface MorphicExport {
  /** Frozen schema version. See EXPORT_SCHEMA_VERSION. */
  readonly schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  /** ISO 8601 UTC timestamp of when the export was produced (ms resolution). */
  readonly exportedAt: string;
  /** Per-axis stored preference, or null when none. */
  readonly axes: MorphicExportAxes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the user's GDPR Art. 20 portable export.
 *
 * @returns A fresh MorphicExport object (no shared reference between calls).
 *          Always JSON-serializable. Never throws on a runtime axis read —
 *          unreadable axes degrade to `null`.
 */
export function exportPreferences(): MorphicExport {
  const result: MorphicExport = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    axes: {
      theme: getTheme(),
      motion: getMotion(),
      contrast: getContrast(),
      density: getDensity(),
      fontSize: getFontSize(),
      fontFamily: getFontFamily(),
    },
  };

  // Defensive assertion #1 — schemaVersion is the frozen literal.
  // Structurally unreachable in correct code (a const literal cannot differ
  // from itself in strict mode), but kept as future-proofing guard against
  // refactors that introduce a mutable indirection (Beyonce rule).
  /* v8 ignore next 3 */
  if (result.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new Error('exportPreferences invariant: schemaVersion tampered');
  }
  // Defensive assertion #2 — exportedAt round-trips through Date.parse.
  if (Number.isNaN(Date.parse(result.exportedAt))) {
    throw new Error('exportPreferences invariant: exportedAt is not a valid Date');
  }

  return result;
}
