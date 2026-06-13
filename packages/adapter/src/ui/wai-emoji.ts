/**
 * Default WAI-symbols resolver — maps BCI indices to Unicode-emoji pictograms.
 *
 * CDC ref : F-036. Brick : B-030a. License : AGPL-3.0-or-later.
 *
 * Why emoji (not ARASAAC/remote SVG) : "ce qui FONCTIONNE PARTOUT" (Jay,
 * 2026-06-03). Zero network, zero CORS, zero external asset. Hosts that want
 * a richer pictogram set pass their own `waiResolver`.
 */

import type { SymbolResolution, SymbolResolver } from '@theermite/morphic-engine';

/** BCI index → emoji + FR alt text. Mirrors the demo set (10 common concepts). */
const EMOJI_TABLE: Readonly<Record<number, { emoji: string; alt: string }>> = {
  1: { emoji: '🏠', alt: 'maison' },
  2: { emoji: '🍞', alt: 'nourriture' },
  3: { emoji: '🚶', alt: 'marche' },
  4: { emoji: '📖', alt: 'lecture' },
  5: { emoji: '💧', alt: 'eau' },
  6: { emoji: '😴', alt: 'sommeil' },
  7: { emoji: '🎮', alt: 'jeu' },
  8: { emoji: '👫', alt: 'ami' },
  9: { emoji: '😊', alt: 'heureux' },
  10: { emoji: '🎵', alt: 'musique' },
};

/** Render one emoji to a 32×32 PNG data URL. Returns '' when canvas is absent. */
function emojiToPng(emoji: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 16, 16);
  return canvas.toDataURL('image/png');
}

/** Default resolver: emoji pictograms rendered to data URLs (no network). */
export const defaultWaiResolver: SymbolResolver = (bciIndex: number): SymbolResolution | null => {
  const entry = EMOJI_TABLE[bciIndex];
  if (!entry) return null;
  const src = emojiToPng(entry.emoji);
  if (!src) return null;
  return { src, alt: entry.alt };
};
