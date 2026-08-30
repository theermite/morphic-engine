/**
 * @theermite/morphic-engine — Human Design profile hints (B-033, F-037 ext.).
 *
 * Opt-in "resonance language" layer (Jay, 2026-08-23, decision documented
 * in `Shinkofa-Browser/docs/Archetypes-Modeles-Interaction.md` §2):
 * Human Design has no peer-reviewed confirmation. The engine treats it as
 * a system the user chooses because it speaks to them — never as a
 * mechanism that decides on its own. This module accepts and validates a
 * profile value; it never infers, computes, or requires one.
 *
 * Scope of this brick: schema + validation ONLY, deliberately. The
 * companion browser document that maps Human Design lines to concrete
 * interface cues is itself still an open working draft ("conception en
 * cours — rien n'est fermé, hypothèse de travail, à tester"). Half of
 * the six lines (2, 3, 4, 6) map to content/social/navigation concerns
 * outside this generic engine's axes (theme/motion/density/motor/
 * energy/cognitive), not to an accessibility adaptation. Building an
 * interpreter now would freeze an unstabilized hypothesis inside a
 * public package. Deferred until the browser team's mapping settles.
 *
 * A "profile" combines two of the six Human Design lines (conscious +
 * unconscious). Only 12 combinations exist — not all 36 pairs are valid.
 *
 * License: AGPL-3.0-or-later OR MPL-2.0 (see packages/engine/LICENSE).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum constants — source of truth
// ---------------------------------------------------------------------------

/**
 * The 12 valid Human Design profiles (conscious line / unconscious line).
 *
 * [VEILLE] Human Design profile system verified 2026-08-29 via
 * thehumandesignsystem.com/learn, humancharts.com/human-design/profile,
 * hdmatrix.pro/en/profiles — lines do not combine freely; this is the
 * complete, fixed set of twelve harmonious profiles.
 */
export const HUMAN_DESIGN_PROFILES = [
  '1/3',
  '1/4',
  '2/4',
  '2/5',
  '3/5',
  '3/6',
  '4/6',
  '4/1',
  '5/1',
  '5/2',
  '6/2',
  '6/3',
] as const;

export type HumanDesignProfile = (typeof HUMAN_DESIGN_PROFILES)[number];

const HumanDesignProfileSchema = z.enum(HUMAN_DESIGN_PROFILES);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * Optional Human Design hint a host app may supply. Opt-in: an empty
 * object is a valid, complete hint set (the person chose not to share
 * or does not use this system).
 */
export interface HumanDesignHints {
  readonly profile?: HumanDesignProfile;
}

/** Zod schema for {@link HumanDesignHints} — `.strict()` rejects unknown keys. */
export const HumanDesignHintsSchema = z
  .object({
    profile: HumanDesignProfileSchema.optional(),
  })
  .strict();

const ALLOWED_KEYS = ['profile'];

// ---------------------------------------------------------------------------
// Validation — pure
// ---------------------------------------------------------------------------

/**
 * Explicit own-key allowlist check, run BEFORE Zod. `.strict()` alone is not
 * enough: a `__proto__` own key (created via a computed/string key, e.g.
 * `{ ...x, ['__proto__']: y }`) is silently dropped by Zod's key iteration
 * instead of being flagged — same defect class found in profile-hints.ts by
 * an independent review 2026-08-30. `Object.keys` sees the real own
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
 * Parses and validates a candidate Human Design hints object.
 *
 * @throws {TypeError} If `input` is not a plain object.
 * @throws {RangeError} If `profile` is present but not one of the 12
 *   valid combinations, or an unrecognised key is present (including
 *   `__proto__`, checked explicitly — see {@link assertKnownKeys}).
 */
export function validateHumanDesignHints(input: unknown): HumanDesignHints {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`human-design-profile: input must be a plain object, got ${typeof input}`);
  }

  assertKnownKeys(input as Record<string, unknown>, 'human-design-profile');

  const result = HumanDesignHintsSchema.safeParse(input);
  if (!result.success) {
    throw new RangeError(`human-design-profile: invalid hints — ${result.error.message}`);
  }

  return result.data;
}

/**
 * Returns `true` when `input` is a valid {@link HumanDesignHints} object.
 * Never throws — safe boolean guard (mirrors `isValidProfileHints`).
 */
export function isValidHumanDesignHints(input: unknown): input is HumanDesignHints {
  try {
    validateHumanDesignHints(input);
    return true;
  } catch {
    return false;
  }
}
