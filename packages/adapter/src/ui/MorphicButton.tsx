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

import { stopPomodoro } from '@theermite/morphic-engine';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontFamily,
  useMorphicFontSize,
  useMorphicMotion,
  useMorphicTheme,
} from '../useMorphic.js';
import {
  CATEGORY_AXES,
  contrastLabel,
  describeChanges,
  FONT_STACKS,
  themeLabel,
} from './categories.js';
import {
  AccessibilityIcon,
  CloseIcon,
  EnergyIcon,
  ReadingIcon,
  ResetIcon,
  TextIcon,
  ViewIcon,
} from './icons.js';
import { mergeLabels } from './labels.js';
import { PomodoroControl } from './PomodoroControl.js';
import { computePlacement, type ModalPlacement } from './placement.js';
import { Category, Chip, Row } from './primitives.js';
import {
  ALL_AXES,
  DEFAULT_VISIBLE_AXES,
  type MorphicAxisKey,
  type MorphicButtonProps,
  type MorphicCategoryKey,
} from './types.js';
import { useEngineAxes } from './useEngineAxes.js';
import { defaultWaiResolver } from './wai-emoji.js';

const CATEGORY_ICONS: Record<MorphicCategoryKey, React.JSX.Element> = {
  view: <ViewIcon />,
  text: <TextIcon />,
  reading: <ReadingIcon />,
  energy: <EnergyIcon />,
};

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
  // Bumped on reset to force <PomodoroControl> to remount and re-read idle
  // state — stopPomodoro() doesn't dispatch an event the control listens for.
  const [pomodoroResetKey, setPomodoroResetKey] = useState(0);
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

  const {
    rf,
    band,
    ruler,
    wai,
    colorVision,
    recovery,
    handleRf,
    handleBand,
    handleRuler,
    handleWai,
    handleColorVision,
    handleRecovery,
  } = useEngineAxes(open, waiResolver);

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
    stopPomodoro();
    setPomodoroResetKey((k) => k + 1);
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

  const [openCats, setOpenCats] = useState<Record<MorphicCategoryKey, boolean>>({
    view: true,
    text: false,
    reading: false,
    energy: false,
  });
  const toggleCat = (key: MorphicCategoryKey) => setOpenCats((c) => ({ ...c, [key]: !c[key] }));

  // Opening the fold also opens the categories it adds rows to, otherwise the
  // click would reveal nothing visible.
  const toggleAdvanced = () => {
    const next = !showAdvanced;
    setShowAdvanced(next);
    if (next) {
      setOpenCats((c) => ({
        ...c,
        view: c.view || has('contrast'),
        reading: c.reading || has('waiSymbols'),
      }));
    }
  };

  // A never-chosen axis (null) or one following the system (`auto`) shows its
  // default as selected: a bar with nothing selected reads as broken.
  const shown = <T extends string>(value: T | null, def: T): T =>
    value === null || (value === 'auto' && def !== 'auto') ? def : value;

  const changes = describeChanges(
    {
      theme,
      motion,
      contrast,
      fontFamily,
      fontSize,
      density,
      colorVision,
      readingFocus: rf,
      band,
      ruler,
      wai,
      recovery,
    },
    t,
    has,
  );
  const adapted = Object.values(changes).some((list) => list.length > 0);

  const categoryProps = (key: MorphicCategoryKey) => ({
    id: key,
    title: t.categories[key],
    summary: changes[key].length > 0 ? changes[key].join(' · ') : t.categoryDefault,
    icon: CATEGORY_ICONS[key],
    open: openCats[key],
    onToggle: () => toggleCat(key),
  });
  const hasCategory = (key: MorphicCategoryKey) => CATEGORY_AXES[key].some(has);

  return (
    <div
      className={`morphic-mb${props.className ? ` ${props.className}` : ''}`}
      style={props.style}
      // The engine never rewrites this subtree (reading focus wraps words in
      // <b>): React must keep owning the panel's text nodes. Written literally,
      // not imported, so an older engine simply ignores it instead of failing
      // the host's build. Kept equal to MORPHIC_SKIP_ATTR by a test.
      data-morphic-skip=""
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
        <AccessibilityIcon />
        {adapted && <span className="morphic-mb-dot" aria-hidden="true" />}
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
            {hasCategory('view') && (
              <Category {...categoryProps('view')}>
                {has('theme') && (
                  <Row label={t.rows.theme} variant="tiles">
                    {(['dark', 'light', 'auto', 'sepia', 'high-contrast'] as const).map((v) => (
                      <Chip
                        key={v}
                        label={themeLabel(t, v)}
                        active={shown(theme, 'auto') === v}
                        onClick={() => setTheme(v)}
                      >
                        <span className={`morphic-mb-swatch morphic-mb-swatch--${v}`} />
                        <span>{themeLabel(t, v)}</span>
                      </Chip>
                    ))}
                  </Row>
                )}
                {has('motion') && (
                  <Row label={t.rows.motion}>
                    {(['full', 'reduced', 'none'] as const).map((v) => (
                      <Chip
                        key={v}
                        label={t.motion[v]}
                        active={shown(motion, 'full') === v}
                        onClick={() => setMotion(v)}
                      />
                    ))}
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
                {showAdvanced && has('contrast') && (
                  <Row label={t.rows.contrast}>
                    {(['no-preference', 'more', 'less'] as const).map((v) => (
                      <Chip
                        key={v}
                        label={contrastLabel(t, v)}
                        active={shown(contrast, 'no-preference') === v}
                        onClick={() => setContrast(v)}
                      />
                    ))}
                  </Row>
                )}
              </Category>
            )}

            {hasCategory('text') && (
              <Category {...categoryProps('text')}>
                {has('fontFamily') && (
                  <Row label={t.rows.font}>
                    {(['system', 'serif', 'atkinson', 'dyslexic'] as const).map((v) => (
                      <Chip
                        key={v}
                        label={t.fontFamily[v]}
                        active={shown(fontFamily, 'system') === v}
                        onClick={() => setFontFamily(v)}
                        style={{ fontFamily: FONT_STACKS[v] }}
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
                        active={shown(fontSize, 'md') === v}
                        onClick={() => setFontSize(v)}
                      >
                        <span className={`morphic-mb-size morphic-mb-size--${v}`}>A</span>
                      </Chip>
                    ))}
                  </Row>
                )}
                {has('density') && (
                  <Row label={t.rows.density}>
                    {(['compact', 'comfortable', 'spacious'] as const).map((v) => (
                      <Chip
                        key={v}
                        label={t.density[v]}
                        active={shown(density, 'comfortable') === v}
                        onClick={() => setDensity(v)}
                      />
                    ))}
                  </Row>
                )}
              </Category>
            )}

            {hasCategory('reading') && (
              <Category {...categoryProps('reading')}>
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
                    <Chip
                      label={t.readingRuler.on}
                      active={ruler}
                      onClick={() => handleRuler(true)}
                    />
                  </Row>
                )}
                {showAdvanced && has('waiSymbols') && (
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
                )}
              </Category>
            )}

            {hasCategory('energy') && (
              <Category {...categoryProps('energy')}>
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
                  <PomodoroControl
                    key={pomodoroResetKey}
                    labels={{ label: t.rows.pomodoro, ...t.pomodoro }}
                  />
                )}
              </Category>
            )}

            {foldedAxesPresent && (
              <button
                type="button"
                className="morphic-mb-advanced-toggle"
                aria-expanded={showAdvanced}
                onClick={toggleAdvanced}
              >
                {showAdvanced ? t.advancedToggle.less : t.advancedToggle.more}
              </button>
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
