/**
 * Tests for <MorphicSuggestions> — holistic-profile axis suggestions panel.
 *
 * CDC ref : F-037 (Profil holistique). Brick : B-037.
 * Risk    : Standard (80% floor, target ≥90% — public reusable UI).
 *
 * Contract under test:
 *   - The host supplies already-banded ProfileHints (never computed here —
 *     see CDC F-037: the engine/adapter never derives raw instrument scores).
 *   - Zero suggestions (no `high` trait) → renders nothing.
 *   - Each suggestion shows its plain-language reason and two explicit
 *     actions — nothing is ever applied without a click (Dignity §c).
 *   - "Appliquer" routes through the real engine setter/action for that
 *     axis ; "Ignorer" removes the suggestion without touching engine state.
 *   - Once resolved (applied or dismissed), a suggestion disappears from
 *     the list ; once all are resolved, the component renders nothing.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  __resetPomodoroStateForTests,
  __resetRecoveryStateForTests,
  getDensity,
  getMotion,
  getPomodoroState,
  isRecoveryActive,
} from '@theermite/morphic-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { MorphicSuggestions } from '../../src/ui/MorphicSuggestions.js';

afterEach(() => {
  __resetPomodoroStateForTests();
  __resetRecoveryStateForTests();
});

describe('MorphicSuggestions / empty state', () => {
  it('should render nothing when no trait is high', () => {
    const { container } = render(<MorphicSuggestions hints={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when every trait is low or medium', () => {
    const { container } = render(
      <MorphicSuggestions hints={{ sensorySensitivity: 'low', attentionPattern: 'medium' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('MorphicSuggestions / rendering suggestions', () => {
  it('should show the reason text for a single high trait', () => {
    render(<MorphicSuggestions hints={{ attentionPattern: 'high' }} />);
    expect(
      screen.getByText(/Attention variable — des cycles travail\/pause cadencés/),
    ).toBeInTheDocument();
  });

  it('should show one suggestion per (trait, axis) pair when a trait maps to two axes', () => {
    render(<MorphicSuggestions hints={{ sensorySensitivity: 'high' }} />);
    // sensorySensitivity=high maps to BOTH motion and density (profile-interpreter.ts).
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('should show suggestions for multiple high traits together', () => {
    render(
      <MorphicSuggestions
        hints={{ sensorySensitivity: 'high', attentionPattern: 'high', emotionalLoad: 'high' }}
      />,
    );
    // 2 (sensorySensitivity) + 1 (attentionPattern) + 1 (emotionalLoad) = 4.
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});

describe('MorphicSuggestions / accepting a suggestion applies the real engine axis', () => {
  it('should call setMotion(reduced) and remove the row when accepting the motion suggestion', () => {
    render(<MorphicSuggestions hints={{ sensorySensitivity: 'high' }} />);
    const [acceptMotion] = screen.getAllByRole('button', { name: 'Appliquer' });
    act(() => {
      fireEvent.click(acceptMotion as HTMLElement);
    });
    expect(getMotion()).toBe('reduced');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('should call setDensity(spacious) when accepting the density suggestion', () => {
    render(<MorphicSuggestions hints={{ sensorySensitivity: 'high' }} />);
    const buttons = screen.getAllByRole('button', { name: 'Appliquer' });
    act(() => {
      fireEvent.click(buttons[1] as HTMLElement);
    });
    expect(getDensity()).toBe('spacious');
  });

  it('should start a pomodoro session when accepting the pomodoroEngine suggestion', () => {
    render(<MorphicSuggestions hints={{ attentionPattern: 'high' }} />);
    const accept = screen.getByRole('button', { name: 'Appliquer' });
    act(() => {
      fireEvent.click(accept);
    });
    expect(getPomodoroState().phase).not.toBe('idle');
  });

  it('should enter recovery mode when accepting the recoveryMode suggestion', () => {
    render(<MorphicSuggestions hints={{ emotionalLoad: 'high' }} />);
    const accept = screen.getByRole('button', { name: 'Appliquer' });
    act(() => {
      fireEvent.click(accept);
    });
    expect(isRecoveryActive()).toBe(true);
  });
});

describe('MorphicSuggestions / dismissing a suggestion', () => {
  it('should remove the row without touching engine state when dismissed', () => {
    render(<MorphicSuggestions hints={{ attentionPattern: 'high' }} />);
    const dismiss = screen.getByRole('button', { name: 'Ignorer' });
    act(() => {
      fireEvent.click(dismiss);
    });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(getPomodoroState().phase).toBe('idle');
  });

  it('should render nothing once every suggestion has been resolved', () => {
    const { container } = render(<MorphicSuggestions hints={{ attentionPattern: 'high' }} />);
    const dismiss = screen.getByRole('button', { name: 'Ignorer' });
    act(() => {
      fireEvent.click(dismiss);
    });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('MorphicSuggestions / labels override', () => {
  it('should use overridden accept/dismiss labels', () => {
    render(
      <MorphicSuggestions
        hints={{ attentionPattern: 'high' }}
        labels={{ accept: 'Oui', dismiss: 'Non' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Oui' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Non' })).toBeInTheDocument();
  });
});
