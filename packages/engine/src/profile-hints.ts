/**
 * @theermite/morphic-engine — profile hints (B-031, F-037).
 *
 * Bridge between a host app's holistic profile (e.g. Michi's questionnaire,
 * validated screening instruments such as HSP/ASRS/GAD scores) and the
 * engine's morphic axes.
 *
 * Boundary (Confidentiality + scope): the engine NEVER receives raw
 * clinical scores or birth data. The host computes and buckets its own
 * data into these hints BEFORE calling the engine — the engine only
 * ever sees a 3-band closed enum per trait.
 *
 * Free will (Dignity §c, CDC AP-011 — never infer silently): every field
 * is independently optional. An empty object is a valid profile (zero
 * hints supplied). Nothing here applies an axis on its own; a later,
 * separate brick maps these hints to axis SUGGESTIONS the user reviews.
 *
 * Scope of this brick: schema + validation only.
 *
 * License: AGPL-3.0-or-later.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum constants — source of truth
// ---------------------------------------------------------------------------

/** Closed 3-band scale used by every trait in {@link ProfileHints}. */
export const SENSITIVITY_LEVELS = ['low', 'medium', 'high'] as const;

export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

const SensitivityLevelSchema = z.enum(SENSITIVITY_LEVELS);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * Optional, evidence-derived traits a host app may supply to help the
 * engine tailor its axis suggestions. Every field is independently
 * optional — an empty object `{}` is a valid profile (zero hints).
 */
export interface ProfileHints {
  /** Sensory sensitivity band (e.g. derived from an HSP-style score). */
  readonly sensorySensitivity?: SensitivityLevel;
  /** Attention/energy variability band (e.g. derived from an ASRS-style score). */
  readonly attentionPattern?: SensitivityLevel;
  /** Emotional load / overwhelm-risk band (e.g. derived from a GAD-style score). */
  readonly emotionalLoad?: SensitivityLevel;
}

/** Zod schema for {@link ProfileHints} — `.strict()` rejects unknown keys. */
export const ProfileHintsSchema = z
  .object({
    sensorySensitivity: SensitivityLevelSchema.optional(),
    attentionPattern: SensitivityLevelSchema.optional(),
    emotionalLoad: SensitivityLevelSchema.optional(),
  })
  .strict();

const ALLOWED_KEYS = ['sensorySensitivity', 'attentionPattern', 'emotionalLoad'];

// ---------------------------------------------------------------------------
// Validation — pure
// ---------------------------------------------------------------------------

/**
 * Explicit own-key allowlist check, run BEFORE Zod. `.strict()` alone is not
 * enough: a `__proto__` own key (created via a computed/string key, e.g.
 * `{ ...x, ['__proto__']: y }`) is silently dropped by Zod's key iteration
 * instead of being flagged — found by an independent review 2026-08-30
 * (fast-check counterexample `["__proto__"]`), confirmed in isolation:
 * `z.object({}).strict().safeParse({['__proto__']: 1})` returns `success:
 * true, data: {}` instead of an error. `Object.keys` sees the real own
 * property Zod misses.
 */
function assertKnownKeys(input: Record<string, unknown>, context: string): void {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.includes(key)) {
      throw new RangeError(`${context}: unrecognised key "${key}"`);
    }
  }
}

/**
 * Parses and validates a candidate profile hints object.
 *
 * Defensive assertion #1: rejects anything that isn't a plain object
 * (null, array, primitive) with a {@link TypeError}.
 * Defensive assertion #2: rejects an unknown key (including `__proto__`,
 * checked explicitly — see {@link assertKnownKeys}) or an out-of-enum
 * value with a {@link RangeError} (closed-shape guard).
 *
 * @throws {TypeError} If `input` is not a plain object.
 * @throws {RangeError} If a field holds an invalid value or an
 *   unrecognised key is present.
 */
export function validateProfileHints(input: unknown): ProfileHints {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`profile-hints: input must be a plain object, got ${typeof input}`);
  }

  assertKnownKeys(input as Record<string, unknown>, 'profile-hints');

  const result = ProfileHintsSchema.safeParse(input);
  if (!result.success) {
    throw new RangeError(`profile-hints: invalid profile — ${result.error.message}`);
  }

  return result.data;
}

/**
 * Returns `true` when `input` is a valid {@link ProfileHints} object.
 * Never throws — safe boolean guard (mirrors `validateClickDelay`).
 */
export function isValidProfileHints(input: unknown): input is ProfileHints {
  try {
    validateProfileHints(input);
    return true;
  } catch {
    return false;
  }
}
