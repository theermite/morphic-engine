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
  __resetPomodoroStateForTests,
  clearReadingFocus,
  getColorVisionCorrection,
  getPomodoroState,
  getReadingFocus,
  getReadingGuide,
  isRecoveryActive,
  MORPHIC_SKIP_ATTR,
  setReadingFocus,
} from '@theermite/morphic-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { MorphicProvider } from '../../src/index.js';
import { MorphicButton } from '../../src/ui/index.js';

afterEach(() => {
  __resetPomodoroStateForTests();
});

function renderButton(props?: Parameters<typeof MorphicButton>[0]) {
  return render(
    <MorphicProvider>
      <MorphicButton {...props} />
    </MorphicProvider>,
  );
}

/** Opens the dialog only: categories keep their default open/closed state. */
function openDialog(): void {
  fireEvent.click(screen.getByRole('button', { name: /personnaliser l'affichage/i }));
}

/** Opens the dialog and expands every category, so each choice is reachable. */
function openModal(): void {
  openDialog();
  for (const toggle of document.querySelectorAll('.morphic-mb-cat-toggle')) {
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
  }
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

  it('recovery mode "on" enters recovery through the engine', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Activer', exact: true }));
    });
    expect(isRecoveryActive()).toBe(true);
  });

  it('recovery mode "off" exits recovery through the engine', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Activer', exact: true }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Désactiver', exact: true }));
    });
    expect(isRecoveryActive()).toBe(false);
  });

  it('shows only "Démarrer" while pomodoro is idle', () => {
    renderButton();
    openModal();
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
  });

  it('starting pomodoro through the button reaches work phase in the engine', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    expect(getPomodoroState().phase).toBe('work');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('pause then resume through the button round-trips the paused flag', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    });
    expect(getPomodoroState().paused).toBe(true);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    });
    expect(getPomodoroState().paused).toBe(false);
  });

  it('stop through the button returns to idle', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));
    });
    expect(getPomodoroState().phase).toBe('idle');
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeInTheDocument();
  });

  it('defaults the duration inputs to 25/5 minutes and starts with those values', () => {
    renderButton();
    openModal();
    expect(screen.getByLabelText('Session (min)')).toHaveValue(25);
    expect(screen.getByLabelText('Pause (min)')).toHaveValue(5);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    expect(getPomodoroState().remainingMs).toBe(25 * 60_000);
  });

  it('starts a session using the durations entered before clicking Démarrer', () => {
    renderButton();
    openModal();
    fireEvent.change(screen.getByLabelText('Session (min)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Pause (min)'), { target: { value: '2' } });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    expect(getPomodoroState().remainingMs).toBe(1 * 60_000);
  });

  it('hides the duration inputs once a session is running', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    expect(screen.queryByLabelText('Session (min)')).not.toBeInTheDocument();
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

  it('stops a running pomodoro (Jay 2026-08-29: "réinitialiser" = repartir à zéro)', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    });
    expect(getPomodoroState().phase).toBe('work');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }));
    });

    expect(getPomodoroState().phase).toBe('idle');
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeInTheDocument();
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

describe('MorphicButton — row order (grouped by category, Jay 2026-10-11)', () => {
  it('renders the always-visible rows category by category: view, text, reading, energy', () => {
    renderButton();
    openModal();
    const labels = Array.from(document.querySelectorAll('.morphic-mb-row-label')).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual([
      'Thème',
      'Animation',
      'Correction daltonisme',
      'Police',
      'Taille',
      'Densité',
      'Focus texte',
      'Bande',
      'Règle',
      'Mode récupération',
      'Cycle Pomodoro',
    ]);
  });
});

describe('MorphicButton — default-visible vs "plus d\'adaptations" fold', () => {
  it('shows the core axes without needing the fold', () => {
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

describe('MorphicButton — categories (Jay 2026-10-11)', () => {
  const toggle = (name: string) => screen.getByRole('button', { name });

  it('opens with "Vue" expanded and the other categories collapsed', () => {
    renderButton();
    openDialog();
    expect(toggle('Vue')).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['Texte', 'Lecture', 'Énergie']) {
      expect(toggle(name)).toHaveAttribute('aria-expanded', 'false');
    }
    expect(screen.getByRole('button', { name: 'Sépia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OpenDyslexic' })).not.toBeInTheDocument();
  });

  it('expands and collapses a category from its title', () => {
    renderButton();
    openDialog();
    fireEvent.click(toggle('Texte'));
    expect(toggle('Texte')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'OpenDyslexic' })).toBeInTheDocument();
    fireEvent.click(toggle('Texte'));
    expect(screen.queryByRole('button', { name: 'OpenDyslexic' })).not.toBeInTheDocument();
  });

  it('summarises what differs from the defaults, as the toggle description', () => {
    renderButton();
    openDialog();
    expect(toggle('Vue')).toHaveAccessibleDescription('Par défaut');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sépia' }));
    });
    expect(toggle('Vue')).toHaveAccessibleDescription('Thème : Sépia');
  });

  it('names a boolean setting by its row when it is on', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'On' }));
    });
    expect(toggle('Lecture')).toHaveAccessibleDescription('Règle');
  });

  it('renders only the categories that hold at least one requested axis', () => {
    renderButton({ axes: ['theme'] });
    openDialog();
    expect(document.querySelectorAll('.morphic-mb-cat-toggle')).toHaveLength(1);
    expect(toggle('Vue')).toBeInTheDocument();
  });

  it('opening the fold also expands the categories that hold folded axes', () => {
    renderButton();
    openDialog();
    fireEvent.click(toggle('Vue'));
    fireEvent.click(screen.getByRole('button', { name: "Plus d'adaptations" }));
    expect(screen.getByRole('button', { name: 'Élevé' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avant' })).toBeInTheDocument();
  });
});

describe('MorphicButton — choices show their effect (Jay 2026-10-11)', () => {
  it('marks the active choice with a check, not only with colour', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sépia' }));
    });
    const sepia = screen.getByRole('button', { name: 'Sépia' });
    expect(sepia).toHaveAttribute('aria-pressed', 'true');
    expect(sepia.querySelector('.morphic-mb-check')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Clair' }).querySelector('.morphic-mb-check'),
    ).toBeNull();
  });

  it('gives each theme choice a colour swatch', () => {
    renderButton();
    openModal();
    for (const [name, value] of [
      ['Sombre', 'dark'],
      ['Clair', 'light'],
      ['Auto', 'auto'],
      ['Sépia', 'sepia'],
      ['Contraste+', 'high-contrast'],
    ] as const) {
      expect(
        screen.getByRole('button', { name }).querySelector(`.morphic-mb-swatch--${value}`),
      ).not.toBeNull();
    }
  });

  it('writes each font choice in its own font', () => {
    renderButton();
    openModal();
    expect(screen.getByRole('button', { name: 'OpenDyslexic' }).style.fontFamily).toContain(
      'OpenDyslexic',
    );
    expect(screen.getByRole('button', { name: 'Serif' }).style.fontFamily).toContain('Georgia');
  });

  it('shows sizes as growing letters while keeping their label as accessible name', () => {
    renderButton();
    openModal();
    const xl = screen.getByRole('button', { name: 'XL' });
    expect(xl.textContent).toBe('A');
    expect(xl.querySelector('.morphic-mb-size--xl')).not.toBeNull();
  });
});

describe('MorphicButton — trigger shows when the page is adapted (Jay 2026-10-11)', () => {
  const dot = () => document.querySelector('.morphic-mb-trigger .morphic-mb-dot');

  it('shows no dot for a fresh visitor', () => {
    renderButton();
    expect(dot()).toBeNull();
  });

  it('shows the dot once a setting differs from its default, and drops it on reset', () => {
    renderButton();
    openDialog();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sépia' }));
    });
    expect(dot()).not.toBeNull();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }));
    });
    expect(dot()).toBeNull();
  });

  it('reads engine-only settings at mount, before the panel is ever opened', () => {
    setReadingFocus('medium');
    renderButton();
    expect(dot()).not.toBeNull();
    clearReadingFocus();
  });
});

describe('MorphicButton — the engine never rewrites the panel (found 2026-10-11)', () => {
  it('marks its root with the engine opt-out attribute', () => {
    renderButton();
    expect(document.querySelector('.morphic-mb')?.hasAttribute(MORPHIC_SKIP_ATTR)).toBe(true);
  });

  it('keeps updating its own text after reading focus is switched on', () => {
    renderButton();
    openModal();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Moyen' }));
    });
    expect(document.querySelector('.morphic-mb b[data-morphic-reading-focus]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Lecture' })).toHaveAccessibleDescription(
      'Focus texte : Moyen',
    );
    clearReadingFocus();
  });
});

describe('MorphicButton — a never-chosen setting shows its default as selected', () => {
  it('marks Auto, Complète, Système, M, Confort and Défaut for a fresh visitor', () => {
    renderButton();
    openModal();
    fireEvent.click(screen.getByRole('button', { name: "Plus d'adaptations" }));
    for (const name of ['Auto', 'Complète', 'Système', 'M', 'Confort', 'Défaut']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    }
  });
});
