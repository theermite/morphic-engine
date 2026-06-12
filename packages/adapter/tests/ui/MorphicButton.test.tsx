/**
 * Tests for <MorphicButton> — publishable drop-in accessibility control.
 *
 * CDC ref : F-036 (Bouton morphique publiable drop-in).
 * Brick   : B-030a.
 * Risk    : Standard (80% floor, target ≥90% — public reusable UI).
 *
 * Contract under test:
 *   - Every axis routes through the ENGINE setters (theme via setTheme →
 *     `morphic-prefs`, NEVER a parallel `ermite-theme` key). This is the
 *     root-cause fix for the "sepia fantôme" duplication.
 *   - Modal open/close (click, Escape, outside click) + ARIA dialog role.
 *   - Reset returns every axis to its documented default.
 *   - Empty storage (fresh visitor) does not crash and shows defaults.
 *   - `labels` prop overrides FR defaults; `axes` prop limits sections.
 */

import { getReadingFocus, getReadingGuide } from '@morphic/engine';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MorphicProvider } from '../../src/index.js';
import { MorphicButton } from '../../src/ui/index.js';

function renderButton(props?: Parameters<typeof MorphicButton>[0]) {
  return render(
    <MorphicProvider>
      <MorphicButton {...props} />
    </MorphicProvider>,
  );
}

function openModal(): void {
  fireEvent.click(screen.getByRole('button', { name: /personnaliser l'affichage/i }));
}

const root = () => document.documentElement;

describe('MorphicButton — trigger + modal', () => {
  it('renders a trigger button collapsed by default', () => {
    renderButton();
    const trigger = screen.getByRole('button', { name: /personnaliser l'affichage/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog on trigger click', () => {
    renderButton();
    openModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /personnaliser l'affichage/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('closes the dialog on Escape', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the dialog on outside click', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MorphicButton — axes route through engine (single source of truth)', () => {
  it('theme writes data-morphic-theme + morphic-prefs, NEVER ermite-theme', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sombre' }));
    });
    expect(root().getAttribute('data-morphic-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem('morphic-prefs') ?? '{}').theme).toBe('dark');
    expect(localStorage.getItem('ermite-theme')).toBeNull();
  });

  it('sepia theme persists through the engine only', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sépia' }));
    });
    expect(root().getAttribute('data-morphic-theme')).toBe('sepia');
    expect(localStorage.getItem('ermite-theme')).toBeNull();
  });

  it('font family sets data-morphic-font-family', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'OpenDyslexic' }));
    });
    expect(root().getAttribute('data-morphic-font-family')).toBe('dyslexic');
  });

  it('font size sets --morphic-font-size', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'L' }));
    });
    expect(root().style.getPropertyValue('--morphic-font-size')).toBe('lg');
  });

  it('motion sets --morphic-motion', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Réduite' }));
    });
    expect(root().style.getPropertyValue('--morphic-motion')).toBe('reduced');
  });

  it('density sets --morphic-density', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Aéré' }));
    });
    expect(root().style.getPropertyValue('--morphic-density')).toBe('spacious');
  });

  it('contrast sets data-morphic-contrast', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Élevé' }));
    });
    expect(root().getAttribute('data-morphic-contrast')).toBe('more');
  });

  it('reading focus routes through the engine', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Moyen' }));
    });
    expect(getReadingFocus()).toBe('medium');
  });

  it('reading guide routes through the engine', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Ligne' }));
    });
    expect(getReadingGuide()).toBe('line');
  });

  it('WAI symbols toggle does not throw and marks the chip active', () => {
    renderButton();
    openModal();
    const before = screen.getByRole('button', { name: 'Avant' });
    act(() => {
      fireEvent.click(before);
    });
    expect(before).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MorphicButton — reset', () => {
  it('returns every axis to its documented default', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sépia' }));
      fireEvent.click(screen.getByRole('button', { name: 'OpenDyslexic' }));
      fireEvent.click(screen.getByRole('button', { name: 'XL' }));
      fireEvent.click(screen.getByRole('button', { name: 'Moyen' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }));
    });
    // setTheme('auto') stores the 'auto' CHOICE but applies the RESOLVED theme
    // (light/dark) to the DOM — assert the persisted choice, not the attribute.
    expect(JSON.parse(localStorage.getItem('morphic-prefs') ?? '{}').theme).toBe('auto');
    expect(root().getAttribute('data-morphic-font-family')).toBe('system');
    expect(root().style.getPropertyValue('--morphic-font-size')).toBe('md');
    expect(root().style.getPropertyValue('--morphic-motion')).toBe('full');
    expect(root().style.getPropertyValue('--morphic-density')).toBe('comfortable');
    expect(root().getAttribute('data-morphic-contrast')).toBe('no-preference');
    expect(getReadingFocus()).toBeNull();
    expect(getReadingGuide()).toBeNull();
  });
});

describe('MorphicButton — fresh visitor (empty storage)', () => {
  it('renders without crashing and stores nothing until a choice is made', () => {
    renderButton();
    openModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(localStorage.getItem('morphic-prefs')).toBeNull();
  });
});

describe('MorphicButton — customization props', () => {
  it('labels prop overrides FR defaults', () => {
    renderButton({ labels: { triggerAria: 'Open settings', title: 'Display options' } });
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(screen.getByText('Display options')).toBeInTheDocument();
  });

  it('axes prop limits which sections render', () => {
    renderButton({ axes: ['theme'] });
    openModal();
    expect(screen.getByRole('button', { name: 'Sombre' })).toBeInTheDocument();
    // Font family section is excluded → its chip is absent.
    expect(screen.queryByRole('button', { name: 'OpenDyslexic' })).not.toBeInTheDocument();
  });
});
