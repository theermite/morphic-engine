/**
 * Tests for useMorphic hooks — per-axis React hooks.
 *
 * CDC ref : F-020 (Démo theermite.com intégration drop-in) — adapter brick.
 * Brick   : B-021a.
 * Risk    : Standard (80% coverage).
 *
 * Scope:
 *   - useMorphicTheme returns [choice, setter] and updates DOM on setter call.
 *   - Same contract for motion / contrast / density / fontSize / fontFamily.
 *   - useMorphic() returns the aggregated read-only snapshot.
 *   - Hooks throw a helpful error when used outside <MorphicProvider>.
 */

import { act, render, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  MorphicProvider,
  useMorphic,
  useMorphicContrast,
  useMorphicDensity,
  useMorphicFontFamily,
  useMorphicFontSize,
  useMorphicMotion,
  useMorphicTheme,
} from '../src/index.js';

function wrapper({ children }: PropsWithChildren) {
  return <MorphicProvider>{children}</MorphicProvider>;
}

describe('useMorphicTheme', () => {
  it('returns null on first render when nothing persisted', () => {
    const { result } = renderHook(() => useMorphicTheme(), { wrapper });
    const [choice] = result.current;
    expect(choice).toBeNull();
  });

  it('updates DOM + state when setter is called', () => {
    const { result } = renderHook(() => useMorphicTheme(), { wrapper });
    act(() => {
      const [, setTheme] = result.current;
      setTheme('dark');
    });
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('dark');
    const [choice] = result.current;
    expect(choice).toBe('dark');
  });
});

describe('useMorphicMotion', () => {
  it('exposes a setter that updates --morphic-motion', () => {
    const { result } = renderHook(() => useMorphicMotion(), { wrapper });
    act(() => {
      const [, setMotion] = result.current;
      setMotion('reduced');
    });
    expect(document.documentElement.style.getPropertyValue('--morphic-motion')).toBe('reduced');
  });
});

describe('useMorphicContrast', () => {
  it('exposes a setter that updates --morphic-contrast', () => {
    const { result } = renderHook(() => useMorphicContrast(), { wrapper });
    act(() => {
      const [, setContrast] = result.current;
      setContrast('more');
    });
    expect(document.documentElement.style.getPropertyValue('--morphic-contrast')).toBe('more');
  });
});

describe('useMorphicDensity', () => {
  it('exposes a setter that updates --morphic-density', () => {
    const { result } = renderHook(() => useMorphicDensity(), { wrapper });
    act(() => {
      const [, setDensity] = result.current;
      setDensity('compact');
    });
    expect(document.documentElement.style.getPropertyValue('--morphic-density')).toBe('compact');
  });
});

describe('useMorphicFontSize', () => {
  it('exposes a setter that updates --morphic-font-size', () => {
    const { result } = renderHook(() => useMorphicFontSize(), { wrapper });
    act(() => {
      const [, setFontSize] = result.current;
      setFontSize('lg');
    });
    expect(document.documentElement.style.getPropertyValue('--morphic-font-size')).toBe('lg');
  });
});

describe('useMorphicFontFamily', () => {
  it('exposes a setter that updates data-morphic-font-family', () => {
    const { result } = renderHook(() => useMorphicFontFamily(), { wrapper });
    act(() => {
      const [, setFontFamily] = result.current;
      setFontFamily('atkinson');
    });
    expect(document.documentElement.getAttribute('data-morphic-font-family')).toBe('atkinson');
  });
});

describe('useMorphic (aggregate)', () => {
  it('returns null axes before any setter call', () => {
    const { result } = renderHook(() => useMorphic(), { wrapper });
    expect(result.current.theme).toBeNull();
    expect(result.current.motion).toBeNull();
    expect(result.current.fontFamily).toBeNull();
  });

  it('reflects updates from per-axis setters', () => {
    function Probe() {
      const snapshot = useMorphic();
      const [, setTheme] = useMorphicTheme();
      return (
        <div>
          <span data-testid="theme">{snapshot.theme ?? 'none'}</span>
          <button type="button" onClick={() => setTheme('sepia')}>
            go
          </button>
        </div>
      );
    }
    render(
      <MorphicProvider>
        <Probe />
      </MorphicProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('none');
    act(() => {
      screen.getByText('go').click();
    });
    expect(screen.getByTestId('theme').textContent).toBe('sepia');
  });

  it('throws a helpful error when used outside <MorphicProvider>', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useMorphic())).toThrow(/MorphicProvider/);
    errSpy.mockRestore();
  });
});
