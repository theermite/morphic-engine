/**
 * Tests for target.ts — Scope target API for morphic adaptation.
 *
 * CDC ref : B-021g (Lab scoping — adaptation can target a sub-container).
 * Brick   : B-021g
 * Risk    : Standard 80% (defensive API surface, no critical-path data).
 *
 * Spec :
 *   - `getTarget()` returns `document.documentElement` by default.
 *   - `setTarget(element)` overrides the target.
 *   - `setTarget(null)` resets to the default.
 *   - `__resetTargetForTests()` clears module state for test isolation.
 *   - Throws on invalid input (non-Element, non-null).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetTargetForTests, getTarget, setTarget } from '../src/target.js';

beforeEach(() => {
  __resetTargetForTests();
});

afterEach(() => {
  __resetTargetForTests();
});

// ---------------------------------------------------------------------------
// getTarget — default behaviour
// ---------------------------------------------------------------------------

describe('getTarget — default', () => {
  it('returns document.documentElement when no target has been set', () => {
    expect(getTarget()).toBe(document.documentElement);
  });

  it('returns document.documentElement after __resetTargetForTests', () => {
    const div = document.createElement('div');
    setTarget(div);
    __resetTargetForTests();
    expect(getTarget()).toBe(document.documentElement);
  });
});

// ---------------------------------------------------------------------------
// setTarget — override
// ---------------------------------------------------------------------------

describe('setTarget — override', () => {
  it('changes the target to the provided element', () => {
    const div = document.createElement('div');
    setTarget(div);
    expect(getTarget()).toBe(div);
  });

  it('accepts any Element subclass', () => {
    const section = document.createElement('section');
    setTarget(section);
    expect(getTarget()).toBe(section);
  });

  it('accepts an element attached to the DOM', () => {
    const div = document.createElement('div');
    div.id = 'morphic-target';
    document.body.appendChild(div);
    setTarget(div);
    expect(getTarget()).toBe(div);
    document.body.removeChild(div);
  });

  it('overwrites a previously set target', () => {
    const div1 = document.createElement('div');
    const div2 = document.createElement('div');
    setTarget(div1);
    setTarget(div2);
    expect(getTarget()).toBe(div2);
  });
});

// ---------------------------------------------------------------------------
// setTarget(null) — reset to default
// ---------------------------------------------------------------------------

describe('setTarget(null) — reset', () => {
  it('restores document.documentElement as the default target', () => {
    const div = document.createElement('div');
    setTarget(div);
    setTarget(null);
    expect(getTarget()).toBe(document.documentElement);
  });

  it('is safe to call when no target has been set', () => {
    expect(() => setTarget(null)).not.toThrow();
    expect(getTarget()).toBe(document.documentElement);
  });
});

// ---------------------------------------------------------------------------
// Defensive contracts (poka-yoke)
// ---------------------------------------------------------------------------

describe('setTarget — invalid input', () => {
  it.each([
    ['string', 'div'],
    ['number', 42],
    ['boolean', true],
    ['object', {}],
    ['array', []],
    ['undefined', undefined],
  ] as const)('throws TypeError on %s input', (_label, value) => {
    expect(() => setTarget(value as unknown as Element)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Beyonce Rule — getTarget() result is stable until setTarget changes it
// ---------------------------------------------------------------------------

describe('getTarget — stability', () => {
  it('returns the same reference on successive calls', () => {
    const div = document.createElement('div');
    setTarget(div);
    expect(getTarget()).toBe(getTarget());
  });

  it('returns documentElement reference consistently when no target set', () => {
    expect(getTarget()).toBe(getTarget());
    expect(getTarget()).toBe(document.documentElement);
  });
});
