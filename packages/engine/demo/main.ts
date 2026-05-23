/**
 * Morphic Engine — Demo wiring
 *
 * Not part of the published package. Local dev tool only.
 * Imports the engine source directly (no build step needed via vite dev).
 */

import {
  // Init + provider
  morphicInit,
  readPrefs,
  defineMorphicProvider,

  // Sensory axes
  setTheme,
  getTheme,
  setMotion,
  getMotion,
  setDensity,
  getDensity,
  setFontSize,
  getFontSize,
  setContrast,
  getContrast,

  // Cognitive
  setDecisionPointsCap,
  getDecisionPointsCap,

  // Onboarding
  startOnboarding,
  completeStep,
  skipStep,
  getOnboardingState,
  canCollectIdentity,
  resetOnboarding,

  // Daltonization
  setColorVisionCorrection,
  clearColorVisionCorrection,
  getColorVisionCorrection,

  // Reading focus
  setReadingFocus,
  clearReadingFocus,
  getReadingFocus,

  // Reading guide
  setReadingGuide,
  clearReadingGuide,
  getReadingGuide,

  // WAI Symbols (host-provided resolver)
  enableWaiSymbols,
  disableWaiSymbols,
  getWaiSymbolsState,

  // Command palette
  enableCommandPalette,
  disableCommandPalette,
  openCommandPalette,
  getCommandPaletteState,

  // Click delay
  setClickDelay,
  clearClickDelay,
  getClickDelayState,

  // Dwell click
  setDwellClick,
  clearDwellClick,
  getDwellClickState,

  // Tremor filter
  setTremorFilter,
  clearTremorFilter,
  getTremorFilterState,

  // Recovery
  enterRecoveryMode,
  exitRecoveryMode,
  getRecoveryState,

  // Idle
  setIdleDetection,
  clearIdleDetection,
  getIdleDetectionState,

  // Pomodoro
  startPomodoro,
  pausePomodoro,
  resumePomodoro,
  skipPhase,
  stopPomodoro,
  getPomodoroState,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

defineMorphicProvider();
morphicInit();

// ---------------------------------------------------------------------------
// CSS var → data attribute mirror
//
// The engine writes --morphic-{density,font-size,contrast,motion} as CSS
// custom properties. Our demo CSS uses [data-morphic-*] attribute selectors
// for legibility. Mirror the vars to attributes after init and after each
// set-call so the selectors actually match.
// ---------------------------------------------------------------------------

const MIRRORED_VARS: Array<[cssVar: string, attr: string]> = [
  ['--morphic-density', 'data-morphic-density'],
  ['--morphic-font-size', 'data-morphic-font-size'],
  ['--morphic-contrast', 'data-morphic-contrast'],
  ['--morphic-motion', 'data-morphic-motion'],
];

function syncVarsToAttrs(): void {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  for (const [cssVar, attr] of MIRRORED_VARS) {
    const value = style.getPropertyValue(cssVar).trim();
    if (value) root.setAttribute(attr, value);
  }
}

syncVarsToAttrs();

// ---------------------------------------------------------------------------
// State display helpers
// ---------------------------------------------------------------------------

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

function show(id: string, value: unknown): void {
  $(id).textContent = JSON.stringify(value, null, 2);
}

function markActive(axis: string, value: string): void {
  document.querySelectorAll(`[data-axis="${axis}"] button`).forEach((b) => {
    b.classList.toggle('active', (b as HTMLElement).dataset.value === value);
  });
}

// ---------------------------------------------------------------------------
// Events log (global)
// ---------------------------------------------------------------------------

const log = $('events-log');
function logEvent(name: string, detail: unknown): void {
  const div = document.createElement('div');
  div.className = 'ev';
  const ts = new Date().toLocaleTimeString();
  div.textContent = `[${ts}] ${name} → ${JSON.stringify(detail)}`;
  log.insertBefore(div, log.firstChild);
  while (log.childNodes.length > 50) log.removeChild(log.lastChild!);
}

[
  'morphic:onboarding:step-complete',
  'morphic:onboarding:complete',
  'morphic:energy:recovery-enter',
  'morphic:energy:recovery-exit',
  'morphic:energy:pause-suggested',
  'morphic:energy:resume',
  'morphic:energy:pomodoro-tick',
  'morphic:energy:work-end',
  'morphic:energy:break-start',
  'morphic:energy:break-end',
  'morphic:energy:session-complete',
  'morphic-pointermove',
].forEach((name) => {
  document.addEventListener(name, (e) => logEvent(name, (e as CustomEvent).detail ?? null));
});

document.getElementById('clear-events')?.addEventListener('click', () => {
  log.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Sensory axes — uniform wiring
// ---------------------------------------------------------------------------

interface AxisWiring {
  axis: string;
  set: (v: string) => void;
  get: () => unknown;
  stateId: string;
}

const sensoryAxes: AxisWiring[] = [
  { axis: 'theme', set: (v) => setTheme(v as Parameters<typeof setTheme>[0]), get: getTheme, stateId: 'state-theme' },
  { axis: 'motion', set: (v) => setMotion(v as Parameters<typeof setMotion>[0]), get: getMotion, stateId: 'state-motion' },
  { axis: 'density', set: (v) => setDensity(v as Parameters<typeof setDensity>[0]), get: getDensity, stateId: 'state-density' },
  { axis: 'fontSize', set: (v) => setFontSize(v as Parameters<typeof setFontSize>[0]), get: getFontSize, stateId: 'state-font-size' },
  { axis: 'contrast', set: (v) => setContrast(v as Parameters<typeof setContrast>[0]), get: getContrast, stateId: 'state-contrast' },
];

for (const a of sensoryAxes) {
  document.querySelectorAll(`[data-axis="${a.axis}"] button`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = (btn as HTMLElement).dataset.value!;
      try {
        a.set(value);
        markActive(a.axis, value);
        syncVarsToAttrs();
      } catch (e) {
        logEvent(`error/${a.axis}`, { value, error: String(e) });
      }
      show(a.stateId, a.get());
    });
  });
  show(a.stateId, a.get());
}

// ---------------------------------------------------------------------------
// Cognitive cap (B-012)
// ---------------------------------------------------------------------------

$('cap-set').addEventListener('click', () => {
  const v = Number((($('cap-input') as HTMLInputElement).value));
  try {
    setDecisionPointsCap(v);
  } catch (e) {
    logEvent('error/cap', String(e));
  }
  show('state-cap', { cap: getDecisionPointsCap() });
});
show('state-cap', { cap: getDecisionPointsCap() });

// ---------------------------------------------------------------------------
// Onboarding (B-013)
// ---------------------------------------------------------------------------

function refreshOnboarding(): void {
  show('state-onboarding', getOnboardingState());
  $('state-canCollect').textContent = `canCollectIdentity(): ${canCollectIdentity()}`;
}

$('onb-start').addEventListener('click', () => { startOnboarding(); refreshOnboarding(); });
$('onb-reset').addEventListener('click', () => { resetOnboarding(); refreshOnboarding(); });

const onbActions: Array<[string, () => unknown]> = [
  ['onb-theme-dark', () => completeStep('theme', 'dark')],
  ['onb-motion-reduced', () => completeStep('motion', 'reduced')],
  ['onb-density-spacious', () => completeStep('density', 'spacious')],
  ['onb-skip-theme', () => skipStep('theme')],
  ['onb-skip-motion', () => skipStep('motion')],
  ['onb-skip-density', () => skipStep('density')],
];
for (const [id, fn] of onbActions) {
  $(id).addEventListener('click', () => {
    try { fn(); } catch (e) { logEvent('error/onboarding', String(e)); }
    syncVarsToAttrs();
    refreshOnboarding();
    for (const a of sensoryAxes) show(a.stateId, a.get());
  });
}
refreshOnboarding();

// ---------------------------------------------------------------------------
// Daltonization (B-101)
// ---------------------------------------------------------------------------

$('cvd-set').addEventListener('click', () => {
  const type = ($('cvd-type') as HTMLSelectElement).value as Parameters<typeof setColorVisionCorrection>[0];
  const severity = Number(($('cvd-severity') as HTMLInputElement).value);
  try { setColorVisionCorrection(type, severity); }
  catch (e) { logEvent('error/cvd', String(e)); }
  show('state-cvd', getColorVisionCorrection());
});
$('cvd-clear').addEventListener('click', () => {
  clearColorVisionCorrection();
  show('state-cvd', getColorVisionCorrection());
});
show('state-cvd', getColorVisionCorrection());

// ---------------------------------------------------------------------------
// Reading Focus (B-102)
// ---------------------------------------------------------------------------

document.querySelectorAll('[data-axis="readingFocus"] button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = (btn as HTMLElement).dataset.value!;
    try {
      if (value === 'off') clearReadingFocus();
      else setReadingFocus(value as Parameters<typeof setReadingFocus>[0]);
    } catch (e) { logEvent('error/reading-focus', String(e)); }
    show('state-reading-focus', getReadingFocus());
    markActive('readingFocus', value);
  });
});
show('state-reading-focus', getReadingFocus());

// ---------------------------------------------------------------------------
// Reading Guide (B-103)
// ---------------------------------------------------------------------------

document.querySelectorAll('[data-guide]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = (btn as HTMLElement).dataset.guide!;
    try {
      if (mode === 'clear') clearReadingGuide();
      else setReadingGuide(mode as Parameters<typeof setReadingGuide>[0]);
    } catch (e) { logEvent('error/reading-guide', String(e)); }
    show('state-reading-guide', getReadingGuide());
  });
});
show('state-reading-guide', getReadingGuide());

// ---------------------------------------------------------------------------
// WAI Symbols (B-104) — mock resolver
// ---------------------------------------------------------------------------

function mockSymbol(bci: number) {
  const map: Record<number, string> = { 14885: '🍎', 13166: '💧' };
  const ch = map[bci] ?? '?';
  return {
    src: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><text y='20' font-size='20'>${ch}</text></svg>`,
    )}`,
    label: `BCI-${bci}`,
  };
}

$('wai-enable').addEventListener('click', () => {
  try { enableWaiSymbols({ mode: 'before', resolver: mockSymbol }); }
  catch (e) { logEvent('error/wai', String(e)); }
  show('state-wai', getWaiSymbolsState());
});
$('wai-disable').addEventListener('click', () => {
  disableWaiSymbols();
  show('state-wai', getWaiSymbolsState());
});
show('state-wai', getWaiSymbolsState());

// ---------------------------------------------------------------------------
// Command Palette (B-105)
// ---------------------------------------------------------------------------

$('cp-enable').addEventListener('click', () => {
  try {
    enableCommandPalette({
      commands: [
        { id: 'dark', title: 'Set theme: dark', action: () => setTheme('dark') },
        { id: 'light', title: 'Set theme: light', action: () => setTheme('light') },
        { id: 'sepia', title: 'Set theme: sepia', action: () => setTheme('sepia') },
        { id: 'recovery', title: 'Enter recovery mode', action: () => enterRecoveryMode() },
        { id: 'exit-recovery', title: 'Exit recovery mode', action: () => exitRecoveryMode() },
      ],
    });
  } catch (e) { logEvent('error/cp', String(e)); }
  show('state-cp', getCommandPaletteState());
});
$('cp-disable').addEventListener('click', () => {
  disableCommandPalette();
  show('state-cp', getCommandPaletteState());
});
$('cp-open').addEventListener('click', () => {
  openCommandPalette();
  show('state-cp', getCommandPaletteState());
});
show('state-cp', getCommandPaletteState());

// ---------------------------------------------------------------------------
// Click Delay (B-106)
// ---------------------------------------------------------------------------

$('click-delay-set').addEventListener('click', () => {
  const ms = Number(($('click-delay-ms') as HTMLInputElement).value);
  try { setClickDelay({ delayMs: ms }); }
  catch (e) { logEvent('error/click-delay', String(e)); }
  show('state-click-delay', getClickDelayState());
});
$('click-delay-clear').addEventListener('click', () => {
  clearClickDelay();
  show('state-click-delay', getClickDelayState());
});
show('state-click-delay', getClickDelayState());

// ---------------------------------------------------------------------------
// Dwell Click (B-107)
// ---------------------------------------------------------------------------

$('dwell-set').addEventListener('click', () => {
  const ms = Number(($('dwell-ms') as HTMLInputElement).value);
  try { setDwellClick({ delayMs: ms }); }
  catch (e) { logEvent('error/dwell', String(e)); }
  show('state-dwell', getDwellClickState());
});
$('dwell-clear').addEventListener('click', () => {
  clearDwellClick();
  show('state-dwell', getDwellClickState());
});
show('state-dwell', getDwellClickState());

// ---------------------------------------------------------------------------
// Tremor Filter (B-108)
// ---------------------------------------------------------------------------

$('tremor-set').addEventListener('click', () => {
  const w = Number(($('tremor-window') as HTMLInputElement).value);
  try { setTremorFilter({ windowSize: w }); }
  catch (e) { logEvent('error/tremor', String(e)); }
  show('state-tremor', getTremorFilterState());
});
$('tremor-clear').addEventListener('click', () => {
  clearTremorFilter();
  show('state-tremor', getTremorFilterState());
});
show('state-tremor', getTremorFilterState());

// ---------------------------------------------------------------------------
// Recovery (B-109)
// ---------------------------------------------------------------------------

function refreshRecovery(): void {
  syncVarsToAttrs();
  show('state-recovery', getRecoveryState());
  for (const a of sensoryAxes) show(a.stateId, a.get());
  show('state-cap', { cap: getDecisionPointsCap() });
}

$('recovery-enter').addEventListener('click', () => {
  try { enterRecoveryMode(); } catch (e) { logEvent('error/recovery', String(e)); }
  refreshRecovery();
});
$('recovery-exit').addEventListener('click', () => {
  try { exitRecoveryMode(); } catch (e) { logEvent('error/recovery', String(e)); }
  refreshRecovery();
});
show('state-recovery', getRecoveryState());

// ---------------------------------------------------------------------------
// Idle (B-110)
// ---------------------------------------------------------------------------

$('idle-set').addEventListener('click', () => {
  const ms = Number(($('idle-ms') as HTMLInputElement).value);
  try { setIdleDetection({ idleMs: ms }); }
  catch (e) { logEvent('error/idle', String(e)); }
  show('state-idle', getIdleDetectionState());
});
$('idle-clear').addEventListener('click', () => {
  clearIdleDetection();
  show('state-idle', getIdleDetectionState());
});
show('state-idle', getIdleDetectionState());

// ---------------------------------------------------------------------------
// Pomodoro (B-111)
// ---------------------------------------------------------------------------

function refreshPomo(): void { show('state-pomo', getPomodoroState()); }

$('pomo-start').addEventListener('click', () => {
  try { startPomodoro(); } catch (e) { logEvent('error/pomo', String(e)); }
  refreshPomo();
});
$('pomo-pause').addEventListener('click', () => { pausePomodoro(); refreshPomo(); });
$('pomo-resume').addEventListener('click', () => { resumePomodoro(); refreshPomo(); });
$('pomo-skip').addEventListener('click', () => { skipPhase(); refreshPomo(); });
$('pomo-stop').addEventListener('click', () => { stopPomodoro(); refreshPomo(); });

document.addEventListener('morphic:energy:pomodoro-tick', refreshPomo);
document.addEventListener('morphic:energy:work-end', refreshPomo);
document.addEventListener('morphic:energy:break-start', refreshPomo);
document.addEventListener('morphic:energy:break-end', refreshPomo);
document.addEventListener('morphic:energy:session-complete', refreshPomo);
refreshPomo();

// ---------------------------------------------------------------------------
// Boot log
// ---------------------------------------------------------------------------

const initial = readPrefs();
logEvent('boot/prefs', initial);

// ---------------------------------------------------------------------------
// Visual scenarios
// ---------------------------------------------------------------------------

// Click-delay target: shows pointerdown → click latency.
const clickTarget = document.getElementById('click-test-target');
const clickReadout = document.getElementById('click-test-readout');
if (clickTarget && clickReadout) {
  let downAt = 0;
  clickTarget.addEventListener('pointerdown', () => {
    downAt = performance.now();
    clickReadout.textContent = 'pointerdown… en attente du click';
  });
  clickTarget.addEventListener('click', () => {
    const latency = performance.now() - downAt;
    clickReadout.textContent = `click reçu après ${latency.toFixed(0)} ms (configured: ${getClickDelayState()?.delayMs ?? 0} ms)`;
  });
}

// Dwell-click target: pointer immobile → synthetic click after N ms.
const dwellTarget = document.getElementById('dwell-test-target');
const dwellReadout = document.getElementById('dwell-test-readout');
if (dwellTarget && dwellReadout) {
  dwellTarget.addEventListener('click', () => {
    const ts = new Date().toLocaleTimeString();
    dwellReadout.textContent = `[${ts}] click synthétique reçu (dwellMs: ${getDwellClickState()?.delayMs ?? 0})`;
  });
}

// Tremor visualizer: draw raw pointermove (red) vs filtered (green).
const tremorCanvas = document.getElementById('tremor-canvas') as HTMLCanvasElement | null;
if (tremorCanvas) {
  const ctx = tremorCanvas.getContext('2d');
  if (ctx) {
    const W = tremorCanvas.width;
    const H = tremorCanvas.height;
    const rawPts: Array<{ x: number; y: number }> = [];
    const filteredPts: Array<{ x: number; y: number }> = [];
    const MAX_PTS = 80;

    function redraw(): void {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // raw = red
      ctx.lineWidth = 1;
      ctx.beginPath();
      rawPts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)'; // filtered = green
      ctx.lineWidth = 2;
      ctx.beginPath();
      filteredPts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    tremorCanvas.addEventListener('pointermove', (e) => {
      const rect = tremorCanvas.getBoundingClientRect();
      rawPts.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (rawPts.length > MAX_PTS) rawPts.shift();
      redraw();
    });

    document.addEventListener('morphic-pointermove', (e) => {
      const rect = tremorCanvas.getBoundingClientRect();
      const detail = (e as CustomEvent).detail as { x: number; y: number };
      filteredPts.push({ x: detail.x - rect.left, y: detail.y - rect.top });
      if (filteredPts.length > MAX_PTS) filteredPts.shift();
      redraw();
    });

    const clearBtn = document.getElementById('tremor-canvas-clear');
    clearBtn?.addEventListener('click', () => {
      rawPts.length = 0;
      filteredPts.length = 0;
      redraw();
    });
  }
}
