import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';

describe('@morphic/engine — bootstrap smoke', () => {
  it('should export VERSION matching 2.0.0-beta.3', () => {
    expect(VERSION).toBe('2.0.0-beta.3');
  });

  it('should be a frozen string constant (compile-time guarantee)', () => {
    // Type-level check: VERSION is 'as const' so TypeScript narrows to literal
    const v: '2.0.0-beta.3' = VERSION;
    expect(typeof v).toBe('string');
  });
});
