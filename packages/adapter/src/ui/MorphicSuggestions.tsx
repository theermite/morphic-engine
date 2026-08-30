'use client';

/**
 * <MorphicSuggestions> — holistic-profile axis suggestions panel.
 *
 * CDC ref : F-037 (Profil holistique). Brick : B-037. License : AGPL-3.0-or-later.
 *
 * The host supplies an already-banded {@link ProfileHints} object (derived
 * from its own validated instrument — HSP/ASRS/GAD-style — never computed
 * here, see CDC F-037). This component only turns the pure interpreter's
 * output into an interactive, dismissible list: each suggestion carries its
 * plain-language reason, and nothing is ever applied without an explicit
 * click (Dignity §c — informed consent, free will preserved).
 */

import {
  type AxisSuggestion,
  enterRecoveryMode,
  type ProfileHints,
  setDensity,
  setMotion,
  startPomodoro,
  suggestAxesFromProfileHints,
} from '@theermite/morphic-engine';
import { useMemo, useState } from 'react';

export interface MorphicSuggestionsLabels {
  accept: string;
  dismiss: string;
}

export const DEFAULT_SUGGESTIONS_LABELS: MorphicSuggestionsLabels = {
  accept: 'Appliquer',
  dismiss: 'Ignorer',
};

export interface MorphicSuggestionsProps {
  /** Already-banded holistic profile, supplied by the host. */
  hints: ProfileHints;
  /** Override the FR default accept/dismiss labels (i18n). */
  labels?: Partial<MorphicSuggestionsLabels>;
  /** Extra class on the root list. */
  className?: string;
}

function suggestionKey(s: AxisSuggestion): string {
  return `${s.sourceTrait}-${s.axis}`;
}

function applySuggestion(s: AxisSuggestion): void {
  switch (s.axis) {
    case 'motion':
      setMotion(s.suggestedValue as Parameters<typeof setMotion>[0]);
      return;
    case 'density':
      setDensity(s.suggestedValue as Parameters<typeof setDensity>[0]);
      return;
    case 'pomodoroEngine':
      startPomodoro();
      return;
    case 'recoveryMode':
      enterRecoveryMode();
  }
}

export function MorphicSuggestions(props: MorphicSuggestionsProps): React.JSX.Element | null {
  const { hints, className } = props;
  const labels = { ...DEFAULT_SUGGESTIONS_LABELS, ...props.labels };

  const { sensorySensitivity, attentionPattern, emotionalLoad } = hints;
  const suggestions = useMemo(
    () => suggestAxesFromProfileHints({ sensorySensitivity, attentionPattern, emotionalLoad }),
    [sensorySensitivity, attentionPattern, emotionalLoad],
  );
  const [resolved, setResolved] = useState<ReadonlySet<string>>(new Set());

  const visible = suggestions.filter((s) => !resolved.has(suggestionKey(s)));
  if (visible.length === 0) return null;

  function resolve(key: string): void {
    setResolved((prev) => new Set(prev).add(key));
  }

  return (
    <ul className={`morphic-suggestions${className ? ` ${className}` : ''}`}>
      {visible.map((s) => {
        const key = suggestionKey(s);
        return (
          <li key={key} className="morphic-suggestions-item">
            <p className="morphic-suggestions-reason">{s.reason}</p>
            <div className="morphic-suggestions-actions">
              <button
                type="button"
                onClick={() => {
                  applySuggestion(s);
                  resolve(key);
                }}
              >
                {labels.accept}
              </button>
              <button type="button" onClick={() => resolve(key)}>
                {labels.dismiss}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
