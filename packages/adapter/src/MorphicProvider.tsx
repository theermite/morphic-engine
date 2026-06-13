/**
 * <MorphicProvider> — React adapter for @theermite/morphic-engine.
 *
 * CDC ref : F-020 (Démo theermite.com intégration drop-in) — adapter brick.
 * Brick   : B-021a.
 * Risk    : Standard (80% coverage).
 *
 * Responsibilities:
 *   - Run morphicInit() once on first client mount (head-read still recommended
 *     in <head> for zero-flash; this is the fallback for client-only mounts).
 *   - Expose a context with a "tick" counter that per-axis hooks subscribe to.
 *     Each setter call from a hook bumps the tick, causing all consumers to
 *     re-read the engine getters and reflect the new axis state.
 *
 * SSR contract:
 *   - The provider does NOT touch the DOM during render — only inside useEffect.
 *   - The engine functions are themselves SSR-safe (typeof document checks).
 */

'use client';

import { morphicInit } from '@theermite/morphic-engine';
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface MorphicContextValue {
  /** Monotonic counter — bumped after every setter to trigger re-renders. */
  readonly tick: number;
  /** Bump the tick (called by per-axis hook setters). */
  readonly bump: () => void;
}

export const MorphicContext = createContext<MorphicContextValue | null>(null);

export interface MorphicProviderProps {
  readonly children: ReactNode;
}

export function MorphicProvider({ children }: MorphicProviderProps): ReactNode {
  const [tick, setTick] = useState(0);

  // Run morphicInit on first client mount. Safe to run multiple times
  // (idempotent — engine just re-reads localStorage / media queries).
  useEffect(() => {
    morphicInit();
    // After init, bump once so any hooks that mounted before init see the
    // freshly-read DOM state.
    setTick((t) => t + 1);
  }, []);

  const bump = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const value = useMemo<MorphicContextValue>(() => ({ tick, bump }), [tick, bump]);

  return <MorphicContext.Provider value={value}>{children}</MorphicContext.Provider>;
}
