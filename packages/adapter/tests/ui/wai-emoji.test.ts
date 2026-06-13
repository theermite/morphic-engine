/**
 * Tests for the default WAI-symbols emoji resolver.
 *
 * CDC ref : F-036. Brick : B-030a.
 *
 * jsdom has no real 2D canvas, so the rendering path is exercised by stubbing
 * getContext + toDataURL. The null paths (unknown index, missing context) are
 * tested without stubs.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultWaiResolver } from '../../src/ui/wai-emoji.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('defaultWaiResolver', () => {
  it('returns null for an index outside the table', () => {
    expect(defaultWaiResolver(999)).toBeNull();
  });

  it('returns null when no 2D context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(defaultWaiResolver(1)).toBeNull();
  });

  it('returns a data-URL src + alt when canvas renders', () => {
    const fakeCtx = {
      font: '',
      textAlign: '',
      textBaseline: '',
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,AAAA',
    );

    const res = defaultWaiResolver(1);
    expect(res).not.toBeNull();
    expect(res?.src).toBe('data:image/png;base64,AAAA');
    expect(res?.alt).toBe('maison');
    expect(fakeCtx.fillText).toHaveBeenCalledWith('🏠', 16, 16);
  });

  it('returns null when canvas renders an empty data URL', () => {
    const fakeCtx = { fillText: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('');
    expect(defaultWaiResolver(2)).toBeNull();
  });
});
