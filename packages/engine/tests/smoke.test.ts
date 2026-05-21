import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';

describe('@morphic/engine — bootstrap smoke', () => {
  it('should export VERSION matching 2.0.0-alpha.0', () => {
    expect(VERSION).toBe('2.0.0-alpha.0');
  });

  it('should be a frozen string constant (compile-time guarantee)', () => {
    // Type-level check: VERSION is 'as const' so TypeScript narrows to literal
    const v: '2.0.0-alpha.0' = VERSION;
    expect(typeof v).toBe('string');
  });
});
