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

import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  getColorVisionCorrection,
  getReadingFocus,
  getReadingGuide,
} from '@theermite/morphic-engine';
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
    fireEvent.click(screen.getByRole('button', { name: "Plus d'adaptations" }));
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

  it('reading guide band routes through the engine', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Ligne' }));
    });
    expect(getReadingGuide()).toEqual({ band: 'line', ruler: false });
  });

  it('ruler cumulates with the band (mask + ruler both active)', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Masque' }));
      fireEvent.click(screen.getByRole('button', { name: 'On' }));
    });
    expect(getReadingGuide()).toEqual({ band: 'mask', ruler: true });
  });

  it('WAI symbols toggle does not throw and marks the chip active', () => {
    renderButton();
    openModal();
    fireEvent.click(screen.getByRole('button', { name: "Plus d'adaptations" }));
    const before = screen.getByRole('button', { name: 'Avant' });
    act(() => {
      fireEvent.click(before);
    });
    expect(before).toHaveAttribute('aria-pressed', 'true');
  });

  it('color vision correction sets type + severity through the engine, without opening any fold', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Deutéranopie' }));
    });
    expect(getColorVisionCorrection()).toEqual({ type: 'deutan', severity: 1 });
  });

  it('color vision "off" clears the correction', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Protanopie' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Désactivée' }));
    });
    expect(getColorVisionCorrection()).toBeNull();
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
    expect(getReadingGuide()).toEqual({ band: null, ruler: false });
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

describe('MorphicButton — modal placement (viewport collision)', () => {
  function mockTriggerRect(rect: Partial<DOMRect>): void {
    const full: DOMRect = {
      x: 0,
      y: 0,
      width: 44,
      height: 44,
      top: 0,
      left: 0,
      right: 44,
      bottom: 44,
      toJSON: () => ({}),
      ...rect,
    };
    HTMLElement.prototype.getBoundingClientRect = () => full;
  }

  function setViewport(width: number, height: number): void {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  }

  it('anchors right + below when there is room on all sides (default)', () => {
    setViewport(1200, 900);
    mockTriggerRect({ left: 600, right: 644, top: 100, bottom: 144 });
    renderButton();
    openModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('morphic-mb-modal--right');
    expect(dialog).toHaveClass('morphic-mb-modal--below');
  });

  it('flips to left-anchored when the trigger sits near the left edge', () => {
    setViewport(1200, 900);
    // right edge at 60px: 60 - 520 (modal width) < 8 → not enough room to extend leftward from the right edge.
    mockTriggerRect({ left: 16, right: 60, top: 100, bottom: 144 });
    renderButton();
    openModal();
    expect(screen.getByRole('dialog')).toHaveClass('morphic-mb-modal--left');
  });

  it('flips to above-anchored when the trigger sits near the bottom edge', () => {
    setViewport(1200, 400);
    // bottom at 380 in an 400px-tall viewport: only 20px below, not enough for the modal.
    mockTriggerRect({ left: 600, right: 644, top: 336, bottom: 380 });
    renderButton();
    openModal();
    expect(screen.getByRole('dialog')).toHaveClass('morphic-mb-modal--above');
  });

  it('stays below when there is not enough room above either (never worse than the default)', () => {
    setViewport(1200, 300);
    mockTriggerRect({ left: 600, right: 644, top: 10, bottom: 54 });
    renderButton();
    openModal();
    expect(screen.getByRole('dialog')).toHaveClass('morphic-mb-modal--below');
  });
});

describe('MorphicButton — default-visible vs "plus d\'adaptations" fold', () => {
  it('shows the core axes without needing to expand anything', () => {
    renderButton();
    openModal();
    expect(screen.getByRole('button', { name: 'Sombre' })).toBeInTheDocument(); // theme
    expect(screen.getByRole('button', { name: 'OpenDyslexic' })).toBeInTheDocument(); // fontFamily
    expect(screen.getByRole('button', { name: 'Léger' })).toBeInTheDocument(); // readingFocus
  });

  it('hides contrast and WAI symbols behind the fold by default', () => {
    renderButton();
    openModal();
    expect(screen.queryByRole('button', { name: 'Élevé' })).not.toBeInTheDocument(); // contrast
    expect(screen.queryByRole('button', { name: 'Avant' })).not.toBeInTheDocument(); // wai
  });

  it('reveals the folded axes on toggle, and can hide them again', () => {
    renderButton();
    openModal();
    const toggle = screen.getByRole('button', { name: "Plus d'adaptations" });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Élevé' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Moins d'adaptations" })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: "Moins d'adaptations" }));
    expect(screen.queryByRole('button', { name: 'Élevé' })).not.toBeInTheDocument();
  });

  it('does not render the toggle at all when every folded axis is excluded via `axes`', () => {
    renderButton({ axes: ['theme', 'motion'] });
    openModal();
    expect(screen.queryByRole('button', { name: /plus d'adaptations/i })).not.toBeInTheDocument();
  });
});
