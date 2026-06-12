'use client';

/**
 * <MorphicButton> — publishable drop-in accessibility control.
 *
 * CDC ref : F-036 (Bouton morphique publiable drop-in).
 * Brick   : B-030a.
 * License : AGPL-3.0-or-later.
 *
 * Every axis routes through the ENGINE (hooks + functions). The theme uses
 * `useMorphicTheme` → `morphic-prefs`, NOT a host-specific parallel key. This
 * is the single source of truth that removes the "sepia fantôme" duplication.
 * Self-styled (see morphic-button.css), zero host-framework coupling.
 */

import {
  clearReadingFocus,
  clearReadingGuide,
  disableWaiSymbols,
  enableWaiSymbols,
  getReadingFocus,
  getReadingGuide,
  type ReadingBand,
  type ReadingFocusIntensity,
  setReadingFocus,
  setReadingGuide,
} from '@morphic/engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontFamily,
  useMorphicFontSize,
  useMorphicMotion,
  useMorphicTheme,
} from '../useMorphic.js';
import { mergeLabels } from './labels.js';
import { ALL_AXES, type MorphicAxisKey, type MorphicButtonProps } from './types.js';
import { defaultWaiResolver } from './wai-emoji.js';

type WaiMode = 'before' | 'after';

// --- Inline icons (no icon-library dependency) -----------------------------

function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4v5h5M20 20v-5h-5M19 9a8 8 0 0 0-14-3M5 15a8 8 0 0 0 14 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Presentational primitives ---------------------------------------------

function Chip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`morphic-mb-chip${props.active ? ' is-active' : ''}`}
      aria-pressed={props.active}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="morphic-mb-row">
      <span className="morphic-mb-row-label">{props.label}</span>
      <div className="morphic-mb-chips">{props.children}</div>
    </div>
  );
}

function SectionTitle(props: { children: React.ReactNode }) {
  return <p className="morphic-mb-section">{props.children}</p>;
}

// --- Component --------------------------------------------------------------

export function MorphicButton(props: MorphicButtonProps): React.JSX.Element {
  const { labels: labelOverrides, axes = ALL_AXES, waiResolver = defaultWaiResolver } = props;
  const t = useMemo(() => mergeLabels(labelOverrides), [labelOverrides]);
  const has = useCallback((a: MorphicAxisKey) => axes.includes(a), [axes]);

  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useMorphicTheme();
  const [fontFamily, setFontFamily] = useMorphicFontFamily();
  const [fontSize, setFontSize] = useMorphicFontSize();
  const [motion, setMotion] = useMorphicMotion();
  const [density, setDensity] = useMorphicDensity();
  const [contrast, setContrast] = useMorphicContrast();

  const [rf, setRf] = useState<ReadingFocusIntensity | null>(null);
  const [band, setBand] = useState<ReadingBand | null>(null);
  const [ruler, setRuler] = useState<boolean>(false);
  const [wai, setWai] = useState<WaiMode | null>(null);

  // Sync engine-only axes (reading focus/guide) into local state on open.
  useEffect(() => {
    if (!open) return;
    setRf(getReadingFocus());
    const guide = getReadingGuide();
    setBand(guide.band);
    setRuler(guide.ruler);
  }, [open]);

  // Escape + outside click close the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [open]);

  const handleRf = useCallback((v: ReadingFocusIntensity | null) => {
    if (v === null) clearReadingFocus();
    else setReadingFocus(v);
    setRf(v);
  }, []);

  const handleBand = useCallback((v: ReadingBand | null) => {
    if (v === null) clearReadingGuide('band');
    else setReadingGuide(v);
    setBand(v);
  }, []);

  const handleRuler = useCallback((on: boolean) => {
    if (on) setReadingGuide('ruler');
    else clearReadingGuide('ruler');
    setRuler(on);
  }, []);

  const handleWai = useCallback(
    (v: WaiMode | null) => {
      if (v === null) disableWaiSymbols();
      else enableWaiSymbols({ mode: v, resolver: waiResolver });
      setWai(v);
    },
    [waiResolver],
  );

  const handleReset = useCallback(() => {
    setTheme('auto');
    setFontFamily('system');
    setFontSize('md');
    setMotion('full');
    setDensity('comfortable');
    setContrast('no-preference');
    handleRf(null);
    handleBand(null);
    handleRuler(false);
    handleWai(null);
  }, [
    setTheme,
    setFontFamily,
    setFontSize,
    setMotion,
    setDensity,
    setContrast,
    handleRf,
    handleBand,
    handleRuler,
    handleWai,
  ]);

  return (
    <div
      className={`morphic-mb${props.className ? ` ${props.className}` : ''}`}
      style={props.style}
    >
      <button
        type="button"
        className="morphic-mb-trigger"
        aria-label={t.triggerAria}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
      >
        <PaletteIcon />
      </button>

      {open && (
        <div className="morphic-mb-modal" ref={modalRef} role="dialog" aria-label={t.title}>
          <div className="morphic-mb-head">
            <span className="morphic-mb-title">{t.title}</span>
            <button
              type="button"
              className="morphic-mb-close"
              aria-label={t.closeAria}
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="morphic-mb-body">
            {(has('fontFamily') || has('fontSize')) && (
              <SectionTitle>{t.sections.text}</SectionTitle>
            )}
            {has('fontFamily') && (
              <Row label={t.rows.font}>
                {(['system', 'serif', 'atkinson', 'dyslexic'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.fontFamily[v]}
                    active={fontFamily === v}
                    onClick={() => setFontFamily(v)}
                  />
                ))}
              </Row>
            )}
            {has('fontSize') && (
              <Row label={t.rows.size}>
                {(['sm', 'md', 'lg', 'xl'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.fontSize[v]}
                    active={fontSize === v}
                    onClick={() => setFontSize(v)}
                  />
                ))}
              </Row>
            )}

            {(has('theme') || has('motion') || has('density') || has('contrast')) && (
              <SectionTitle>{t.sections.display}</SectionTitle>
            )}
            {has('theme') && (
              <Row label={t.rows.theme}>
                {(['dark', 'light', 'auto', 'sepia', 'high-contrast'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={v === 'high-contrast' ? t.theme.highContrast : t.theme[v]}
                    active={theme === v}
                    onClick={() => setTheme(v)}
                  />
                ))}
              </Row>
            )}
            {has('motion') && (
              <Row label={t.rows.motion}>
                {(['full', 'reduced', 'none'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.motion[v]}
                    active={motion === v}
                    onClick={() => setMotion(v)}
                  />
                ))}
              </Row>
            )}
            {has('density') && (
              <Row label={t.rows.density}>
                {(['compact', 'comfortable', 'spacious'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.density[v]}
                    active={density === v}
                    onClick={() => setDensity(v)}
                  />
                ))}
              </Row>
            )}
            {has('contrast') && (
              <Row label={t.rows.contrast}>
                {(['no-preference', 'more', 'less'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={
                      v === 'no-preference'
                        ? t.contrast.noPreference
                        : t.contrast[v as 'more' | 'less']
                    }
                    active={contrast === v}
                    onClick={() => setContrast(v)}
                  />
                ))}
              </Row>
            )}

            {(has('readingFocus') || has('readingGuide')) && (
              <SectionTitle>{t.sections.reading}</SectionTitle>
            )}
            {has('readingFocus') && (
              <Row label={t.rows.readingFocus}>
                <Chip
                  label={t.readingFocus.off}
                  active={rf === null}
                  onClick={() => handleRf(null)}
                />
                {(['low', 'medium', 'high'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.readingFocus[v]}
                    active={rf === v}
                    onClick={() => handleRf(v)}
                  />
                ))}
              </Row>
            )}
            {has('readingGuide') && (
              <Row label={t.rows.readingGuide}>
                <Chip
                  label={t.readingGuide.off}
                  active={band === null}
                  onClick={() => handleBand(null)}
                />
                {(['line', 'mask'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.readingGuide[v]}
                    active={band === v}
                    onClick={() => handleBand(v)}
                  />
                ))}
              </Row>
            )}
            {has('readingGuide') && (
              <Row label={t.rows.readingRuler}>
                <Chip
                  label={t.readingRuler.off}
                  active={!ruler}
                  onClick={() => handleRuler(false)}
                />
                <Chip label={t.readingRuler.on} active={ruler} onClick={() => handleRuler(true)} />
              </Row>
            )}

            {has('waiSymbols') && (
              <>
                <SectionTitle>{t.sections.visual}</SectionTitle>
                <Row label={t.rows.wai}>
                  <Chip label={t.wai.off} active={wai === null} onClick={() => handleWai(null)} />
                  {(['before', 'after'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={t.wai[v]}
                      active={wai === v}
                      onClick={() => handleWai(v)}
                    />
                  ))}
                </Row>
              </>
            )}
          </div>

          <div className="morphic-mb-foot">
            <span className="morphic-mb-note">{t.footnote}</span>
            <button
              type="button"
              className="morphic-mb-reset"
              aria-label={t.resetAria}
              onClick={handleReset}
            >
              <ResetIcon />
              {t.reset}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
