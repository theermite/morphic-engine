/**
 * Tests for <MorphicProvider> — React adapter mount + init contract.
 *
 * CDC ref : F-020 (Démo theermite.com intégration drop-in) — adapter brick.
 * Brick   : B-021a.
 * Risk    : Standard (80% coverage).
 *
 * Scope:
 *   - Mounts children unchanged (transparent wrapper).
 *   - Calls morphicInit() once on first client mount → DOM data-morphic-theme set.
 *   - SSR-safe: provider does not throw on import (engine guards already cover).
 *   - Provides MorphicContext to descendants (children can read via useMorphic).
 */

import { MORPHIC_STORAGE_KEY } from '@morphic/engine';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MorphicProvider } from '../src/index.js';

describe('<MorphicProvider>', () => {
  it('renders children unchanged (transparent wrapper)', () => {
    render(
      <MorphicProvider>
        <p data-testid="child">hello</p>
      </MorphicProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('runs morphicInit on mount — DOM data-morphic-theme is set', () => {
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBeNull();
    render(
      <MorphicProvider>
        <span>x</span>
      </MorphicProvider>,
    );
    expect(document.documentElement.getAttribute('data-morphic-theme')).not.toBeNull();
  });

  it('reads existing localStorage preferences on mount', () => {
    localStorage.setItem(MORPHIC_STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    render(
      <MorphicProvider>
        <span>x</span>
      </MorphicProvider>,
    );
    expect(document.documentElement.getAttribute('data-morphic-theme')).toBe('dark');
  });

  it('does not throw when mounted multiple times (idempotent)', () => {
    expect(() => {
      render(
        <MorphicProvider>
          <span>a</span>
        </MorphicProvider>,
      );
      render(
        <MorphicProvider>
          <span>b</span>
        </MorphicProvider>,
      );
    }).not.toThrow();
  });
});
