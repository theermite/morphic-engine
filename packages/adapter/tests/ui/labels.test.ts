/**
 * Tests for mergeLabels — FR defaults + one-level deep override merge.
 *
 * CDC ref : F-036. Brick : B-030a.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS, mergeLabels } from '../../src/ui/labels.js';

describe('mergeLabels', () => {
  it('returns the FR defaults when no overrides are given', () => {
    expect(mergeLabels()).toBe(DEFAULT_LABELS);
  });

  it('overrides a top-level string while keeping the rest', () => {
    const r = mergeLabels({ triggerAria: 'Open' });
    expect(r.triggerAria).toBe('Open');
    expect(r.title).toBe(DEFAULT_LABELS.title);
  });

  it('merges a nested option group key-by-key', () => {
    const r = mergeLabels({ theme: { dark: 'Night' } });
    expect(r.theme.dark).toBe('Night');
    expect(r.theme.light).toBe(DEFAULT_LABELS.theme.light);
    expect(r.theme.sepia).toBe(DEFAULT_LABELS.theme.sepia);
  });

  it('skips keys whose override value is undefined', () => {
    const r = mergeLabels({ title: undefined });
    expect(r.title).toBe(DEFAULT_LABELS.title);
  });
});
