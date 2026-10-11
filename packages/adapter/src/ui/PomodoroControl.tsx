'use client';

/**
 * Pomodoro row for <MorphicButton> — extracted to its own file so
 * MorphicButton.tsx stays under the 500-line ceiling (Quality.md).
 *
 * CDC ref : F-036. Brick : B-030j. License : AGPL-3.0-or-later.
 *
 * Shows only the actions valid for the current phase (idle → just "start";
 * active → pause/resume, skip, stop) rather than every button always
 * enabled — matches the button's existing closed-choice-chip pattern.
 */

import {
  enablePomodoroStrip,
  getPomodoroState,
  getPomodoroStripState,
  MORPHIC_POMODORO_EVENT_BREAK_END,
  MORPHIC_POMODORO_EVENT_BREAK_START,
  MORPHIC_POMODORO_EVENT_SESSION_COMPLETE,
  MORPHIC_POMODORO_EVENT_TICK,
  MORPHIC_POMODORO_EVENT_WORK_END,
  MORPHIC_POMODORO_SHORT_BREAK_DEFAULT,
  MORPHIC_POMODORO_WORK_DEFAULT,
  type PomodoroPhase,
  pausePomodoro,
  resumePomodoro,
  skipPhase,
  startPomodoro,
  stopPomodoro,
} from '@theermite/morphic-engine';
import { useEffect, useId, useState } from 'react';
import { Chip, Row } from './primitives.js';

export interface PomodoroControlLabels {
  label: string;
  start: string;
  pause: string;
  resume: string;
  skip: string;
  stop: string;
  workMinutes: string;
  breakMinutes: string;
  phaseWork: string;
  phaseShortBreak: string;
  phaseLongBreak: string;
  paused: string;
}

/**
 * Turn the page progress strip on, unless the host already did: re-enabling
 * would replace the host's own options (height, colours). Without this, no
 * site ever showed the strip (Jay 2026-10-11, « on n'a aucune visibilité »).
 */
export function ensurePomodoroStrip(): void {
  if (getPomodoroStripState() === null) enablePomodoroStrip();
}

/** « 18:42 » — minutes may exceed 59 for long sessions, seconds never do. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function phaseLabel(t: PomodoroControlLabels, phase: Exclude<PomodoroPhase, 'idle'>): string {
  if (phase === 'work') return t.phaseWork;
  return phase === 'short-break' ? t.phaseShortBreak : t.phaseLongBreak;
}

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

const REFRESH_EVENTS = [
  MORPHIC_POMODORO_EVENT_TICK,
  MORPHIC_POMODORO_EVENT_WORK_END,
  MORPHIC_POMODORO_EVENT_BREAK_START,
  MORPHIC_POMODORO_EVENT_BREAK_END,
  MORPHIC_POMODORO_EVENT_SESSION_COMPLETE,
];

export function PomodoroControl(props: { labels: PomodoroControlLabels }): React.JSX.Element {
  const { labels: t } = props;
  const [state, setState] = useState(() => getPomodoroState());
  const [workMinutes, setWorkMinutes] = useState(MORPHIC_POMODORO_WORK_DEFAULT / 60_000);
  const [breakMinutes, setBreakMinutes] = useState(MORPHIC_POMODORO_SHORT_BREAK_DEFAULT / 60_000);
  const workInputId = useId();
  const breakInputId = useId();

  useEffect(() => {
    const refresh = () => setState(getPomodoroState());
    refresh();
    for (const name of REFRESH_EVENTS) document.addEventListener(name, refresh);
    return () => {
      for (const name of REFRESH_EVENTS) document.removeEventListener(name, refresh);
    };
  }, []);

  // Not every transition dispatches an event (startPomodoro/skipPhase/
  // stopPomodoro don't) — refresh straight from each action's own return
  // value so the row never waits on an event that may not come.
  const isIdle = state.phase === 'idle';

  return (
    <Row label={t.label} variant="actions">
      {isIdle && (
        <>
          <label className="morphic-mb-duration-field" htmlFor={workInputId}>
            {t.workMinutes}
            <input
              id={workInputId}
              type="number"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={workMinutes}
              onChange={(e) => setWorkMinutes(clampMinutes(Number(e.target.value)))}
            />
          </label>
          <label className="morphic-mb-duration-field" htmlFor={breakInputId}>
            {t.breakMinutes}
            <input
              id={breakInputId}
              type="number"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(clampMinutes(Number(e.target.value)))}
            />
          </label>
          <Chip
            label={t.start}
            active={false}
            onClick={() => {
              setState(
                startPomodoro({
                  workMs: workMinutes * 60_000,
                  shortBreakMs: breakMinutes * 60_000,
                }),
              );
              ensurePomodoroStrip();
            }}
          />
        </>
      )}
      {state.phase !== 'idle' && (
        <span className="morphic-mb-timer" role="timer">
          {phaseLabel(t, state.phase)} · {formatRemaining(state.remainingMs)}
          {state.paused && ` · ${t.paused}`}
        </span>
      )}
      {!isIdle && !state.paused && (
        <Chip label={t.pause} active={false} onClick={() => setState(pausePomodoro())} />
      )}
      {!isIdle && state.paused && (
        <Chip label={t.resume} active={false} onClick={() => setState(resumePomodoro())} />
      )}
      {!isIdle && <Chip label={t.skip} active={false} onClick={() => setState(skipPhase())} />}
      {!isIdle && <Chip label={t.stop} active={false} onClick={() => setState(stopPomodoro())} />}
    </Row>
  );
}
