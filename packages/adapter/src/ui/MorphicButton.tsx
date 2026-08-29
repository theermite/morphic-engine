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
  type ColorVisionCorrection,
  type ColorVisionType,
  clearColorVisionCorrection,
  clearReadingFocus,
  clearReadingGuide,
  disableWaiSymbols,
  enableWaiSymbols,
  enterRecoveryMode,
  exitRecoveryMode,
  getColorVisionCorrection,
  getReadingFocus,
  getReadingGuide,
  isRecoveryActive,
  type ReadingBand,
  type ReadingFocusIntensity,
  setColorVisionCorrection,
  setReadingFocus,
  setReadingGuide,
} from '@theermite/morphic-engine';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontFamily,
  useMorphicFontSize,
  useMorphicMotion,
  useMorphicTheme,
} from '../useMorphic.js';
import { CloseIcon, PaletteIcon, ResetIcon } from './icons.js';
import { mergeLabels } from './labels.js';
import { PomodoroControl } from './PomodoroControl.js';
import { computePlacement, type ModalPlacement } from './placement.js';
import { Chip, Row, SectionTitle } from './primitives.js';
import {
  ALL_AXES,
  DEFAULT_VISIBLE_AXES,
  type MorphicAxisKey,
  type MorphicButtonProps,
} from './types.js';
import { defaultWaiResolver } from './wai-emoji.js';

type WaiMode = 'before' | 'after';

// --- Component --------------------------------------------------------------

export function MorphicButton(props: MorphicButtonProps): React.JSX.Element {
  const { labels: labelOverrides, axes = ALL_AXES, waiResolver = defaultWaiResolver } = props;
  const t = useMemo(() => mergeLabels(labelOverrides), [labelOverrides]);
  const has = useCallback((a: MorphicAxisKey) => axes.includes(a), [axes]);
  const foldedAxesPresent = useMemo(
    () => axes.some((a) => !DEFAULT_VISIBLE_AXES.includes(a)),
    [axes],
  );

  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<ModalPlacement>({
    horizontal: 'right',
    vertical: 'below',
  });

  // Measure before paint so the modal never flashes at the wrong edge then jumps.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    setPlacement(computePlacement(triggerRef.current));
  }, [open]);

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
  const [colorVision, setColorVisionState] = useState<ColorVisionCorrection | null>(null);
  const [recovery, setRecovery] = useState<boolean>(false);

  // Sync engine-only axes (reading focus/guide/color-vision/recovery) into local state on open.
  useEffect(() => {
    if (!open) return;
    setRf(getReadingFocus());
    const guide = getReadingGuide();
    setBand(guide.band);
    setRuler(guide.ruler);
    setColorVisionState(getColorVisionCorrection());
    setRecovery(isRecoveryActive());
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

  const handleColorVision = useCallback((v: ColorVisionType | null) => {
    if (v === null) {
      clearColorVisionCorrection();
      setColorVisionState(null);
    } else {
      const next = setColorVisionCorrection(v);
      setColorVisionState(next);
    }
  }, []);

  const handleRecovery = useCallback((on: boolean) => {
    if (on) enterRecoveryMode();
    else exitRecoveryMode();
    setRecovery(on);
  }, []);

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
    handleColorVision(null);
    handleRecovery(false);
  }, [
    setTheme,
    setFontFamily,
    setFontSize,
    setMotion,
    setDensity,
    setContrast,
    handleRf,
    handleColorVision,
    handleRecovery,
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
        ref={triggerRef}
        className="morphic-mb-trigger"
        aria-label={t.triggerAria}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
      >
        <PaletteIcon />
      </button>

      {open && (
        <div
          className={`morphic-mb-modal morphic-mb-modal--${placement.horizontal} morphic-mb-modal--${placement.vertical}`}
          ref={modalRef}
          role="dialog"
          aria-label={t.title}
        >
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

            {(has('theme') || has('motion') || has('density')) && (
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

            {has('colorVision') && (
              <Row label={t.rows.colorVision}>
                <Chip
                  label={t.colorVision.off}
                  active={colorVision === null}
                  onClick={() => handleColorVision(null)}
                />
                {(['protan', 'deutan', 'tritan'] as const).map((v) => (
                  <Chip
                    key={v}
                    label={t.colorVision[v]}
                    active={colorVision?.type === v}
                    onClick={() => handleColorVision(v)}
                  />
                ))}
              </Row>
            )}

            {has('recoveryMode') && (
              <Row label={t.rows.recoveryMode}>
                <Chip
                  label={t.recoveryMode.off}
                  active={!recovery}
                  onClick={() => handleRecovery(false)}
                />
                <Chip
                  label={t.recoveryMode.on}
                  active={recovery}
                  onClick={() => handleRecovery(true)}
                />
              </Row>
            )}

            {has('pomodoro') && (
              <PomodoroControl labels={{ label: t.rows.pomodoro, ...t.pomodoro }} />
            )}

            {foldedAxesPresent && (
              <button
                type="button"
                className="morphic-mb-advanced-toggle"
                aria-expanded={showAdvanced}
                onClick={() => setShowAdvanced((p) => !p)}
              >
                {showAdvanced ? t.advancedToggle.less : t.advancedToggle.more}
              </button>
            )}

            {showAdvanced && has('contrast') && (
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

            {showAdvanced && has('waiSymbols') && (
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
