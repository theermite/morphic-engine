/**
 * @theermite/morphic-engine — profile interpreter (B-032, F-037).
 *
 * Maps {@link ProfileHints} to axis SUGGESTIONS. This module never applies
 * a suggestion — it only computes a pure, deterministic list the host
 * shows to the user, with a plain-language reason attached to each one.
 * Free will stays intact (Dignity §c, CDC AP-011): the user reviews and
 * decides, the engine never mutates state on their behalf.
 *
 * Rule set (2026-08-29, agreed with Jay — evidence-based dimension first,
 * see `Shinkofa-Browser/docs/Archetypes-Modeles-Interaction.md` §3):
 * only the `high` band triggers a suggestion per trait. `low`/`medium`
 * stay silent — the interpreter offers no opinion when it isn't
 * confident, rather than guessing at a lighter-touch heuristic.
 *
 * Multiple high traits ALWAYS surface together (never a single dominant
 * trait alone) — a holistic profile is a weighting, not a box (Kakusei
 * principle, confirmed 2026-08-23 in the same document).
 *
 * License: AGPL-3.0-or-later.
 */

import type { ProfileHints } from './profile-hints.js';
import { validateProfileHints } from './profile-hints.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An axis name this interpreter knows how to suggest a value for. */
export type SuggestibleAxis = 'motion' | 'density' | 'pomodoroEngine' | 'recoveryMode';

/**
 * A single, non-binding suggestion. Carries its own justification so a
 * host UI can show the "why" alongside the "what" (Dignity §C — informed
 * consent, never a silent switch).
 */
export interface AxisSuggestion {
  readonly axis: SuggestibleAxis;
  readonly suggestedValue: string;
  readonly reason: string;
  readonly sourceTrait: keyof ProfileHints;
  readonly sourceLevel: 'high';
}

// ---------------------------------------------------------------------------
// Rule table — pure data, one entry per (trait, axis) pair
// ---------------------------------------------------------------------------

interface Rule {
  readonly trait: keyof ProfileHints;
  readonly axis: SuggestibleAxis;
  readonly suggestedValue: string;
  readonly reason: string;
}

const RULES: readonly Rule[] = [
  {
    trait: 'sensorySensitivity',
    axis: 'motion',
    suggestedValue: 'reduced',
    reason:
      'Sensibilité sensorielle élevée — moins de mouvement à l’écran réduit la surcharge visuelle.',
  },
  {
    trait: 'sensorySensitivity',
    axis: 'density',
    suggestedValue: 'spacious',
    reason:
      'Sensibilité sensorielle élevée — plus d’espace entre les éléments réduit l’encombrement visuel.',
  },
  {
    trait: 'attentionPattern',
    axis: 'pomodoroEngine',
    suggestedValue: 'enabled',
    reason: 'Attention variable — des cycles travail/pause cadencés aident à maintenir le rythme.',
  },
  {
    trait: 'emotionalLoad',
    axis: 'recoveryMode',
    suggestedValue: 'recommended',
    reason:
      'Charge émotionnelle élevée — un accès facile à une interface simplifiée aide à récupérer.',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes axis suggestions from a profile hints object. Pure function:
 * no DOM access, no storage read/write, no axis mutation. The same
 * input always yields the same (deep-equal) output.
 *
 * @throws {TypeError} If `hints` is not a plain object (delegated to
 *   {@link validateProfileHints}).
 * @throws {RangeError} If `hints` fails schema validation (delegated to
 *   {@link validateProfileHints}).
 */
export function suggestAxesFromProfileHints(hints: ProfileHints): readonly AxisSuggestion[] {
  const validated = validateProfileHints(hints);

  const suggestions: AxisSuggestion[] = [];
  for (const rule of RULES) {
    if (validated[rule.trait] !== 'high') continue;
    suggestions.push({
      axis: rule.axis,
      suggestedValue: rule.suggestedValue,
      reason: rule.reason,
      sourceTrait: rule.trait,
      sourceLevel: 'high',
    });
  }

  return suggestions;
}
