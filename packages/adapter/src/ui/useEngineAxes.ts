/**
 * State of the axes that live only in the engine (reading focus, reading
 * guide, WAI symbols, colour-vision correction, recovery mode) and their
 * handlers, for <MorphicButton>.
 *
 * CDC ref : F-036. License : AGPL-3.0-or-later.
 *
 * Unlike theme/font/size, these have no React hook of their own, so the button
 * mirrors them locally and re-reads the engine at mount and on every open.
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
  type SymbolResolver,
  setColorVisionCorrection,
  setReadingFocus,
  setReadingGuide,
} from '@theermite/morphic-engine';
import { useCallback, useEffect, useState } from 'react';

export type WaiMode = 'before' | 'after';

export function useEngineAxes(open: boolean, waiResolver: SymbolResolver) {
  const [rf, setRf] = useState<ReadingFocusIntensity | null>(null);
  const [band, setBand] = useState<ReadingBand | null>(null);
  const [ruler, setRuler] = useState<boolean>(false);
  const [wai, setWai] = useState<WaiMode | null>(null);
  const [colorVision, setColorVisionState] = useState<ColorVisionCorrection | null>(null);
  const [recovery, setRecovery] = useState<boolean>(false);

  // Sync engine-only axes (reading focus/guide/color-vision/recovery) into local
  // state at mount and on every open: the trigger's "adapted" dot needs them
  // before the panel has ever been opened.
  const syncEngineAxes = useCallback(() => {
    setRf(getReadingFocus());
    const guide = getReadingGuide();
    setBand(guide.band);
    setRuler(guide.ruler);
    setColorVisionState(getColorVisionCorrection());
    setRecovery(isRecoveryActive());
  }, []);
  useEffect(() => {
    syncEngineAxes();
  }, [syncEngineAxes]);
  useEffect(() => {
    if (open) syncEngineAxes();
  }, [open, syncEngineAxes]);

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

  return {
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
  };
}
