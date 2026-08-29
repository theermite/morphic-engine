/**
 * French default labels for <MorphicButton> + a one-level deep merge helper.
 *
 * CDC ref : F-036. Brick : B-030a. License : AGPL-3.0-or-later.
 *
 * FR is the source of truth (Conventions.md). Consumers override any subset
 * via the `labels` prop — e.g. wiring @shinkofa/i18n keys in a host app.
 */

import type { MorphicButtonLabels, PartialLabels } from './types.js';

export const DEFAULT_LABELS: MorphicButtonLabels = {
  triggerAria: "Personnaliser l'affichage",
  title: 'Accessibilité morphique',
  closeAria: 'Fermer',
  reset: 'Réinitialiser',
  resetAria: 'Réinitialiser toutes les préférences',
  footnote: 'Préférences sauvegardées localement',
  sections: { text: 'Texte', display: 'Affichage', reading: 'Lecture', visual: 'Aide visuelle' },
  rows: {
    font: 'Police',
    size: 'Taille',
    theme: 'Thème',
    motion: 'Animation',
    density: 'Densité',
    contrast: 'Contraste',
    readingFocus: 'Focus texte',
    readingGuide: 'Bande',
    readingRuler: 'Règle',
    wai: 'Symboles WAI',
    colorVision: 'Correction daltonisme',
    recoveryMode: 'Mode récupération',
  },
  fontFamily: { system: 'Système', serif: 'Serif', atkinson: 'Atkinson', dyslexic: 'OpenDyslexic' },
  fontSize: { sm: 'S', md: 'M', lg: 'L', xl: 'XL' },
  theme: {
    dark: 'Sombre',
    light: 'Clair',
    auto: 'Auto',
    sepia: 'Sépia',
    highContrast: 'Contraste+',
  },
  motion: { full: 'Complète', reduced: 'Réduite', none: 'Aucune' },
  density: { compact: 'Compact', comfortable: 'Confort', spacious: 'Aéré' },
  contrast: { noPreference: 'Défaut', more: 'Élevé', less: 'Faible' },
  readingFocus: { off: 'Off', low: 'Léger', medium: 'Moyen', high: 'Fort' },
  readingGuide: { off: 'Off', line: 'Ligne', mask: 'Masque' },
  readingRuler: { off: 'Off', on: 'On' },
  wai: { off: 'Off', before: 'Avant', after: 'Après' },
  colorVision: {
    off: 'Désactivée',
    protan: 'Protanopie',
    deutan: 'Deutéranopie',
    tritan: 'Tritanopie',
  },
  recoveryMode: { on: 'Activer', off: 'Désactiver' },
  advancedToggle: { more: "Plus d'adaptations", less: "Moins d'adaptations" },
};

/**
 * Merge user overrides onto the FR defaults. Nested option groups (e.g.
 * `theme`) are merged key-by-key so a partial group keeps the other defaults.
 */
export function mergeLabels(overrides?: PartialLabels): MorphicButtonLabels {
  if (!overrides) return DEFAULT_LABELS;
  const out = { ...DEFAULT_LABELS } as MorphicButtonLabels;
  for (const key of Object.keys(overrides) as (keyof MorphicButtonLabels)[]) {
    const base = DEFAULT_LABELS[key];
    const over = overrides[key];
    if (over === undefined) continue;
    out[key] =
      typeof base === 'object' && base !== null && typeof over === 'object'
        ? // biome-ignore lint/suspicious/noExplicitAny: one-level structural merge of known shapes
          ({ ...(base as any), ...(over as any) } as never)
        : (over as never);
  }
  return out;
}
