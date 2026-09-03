/**
 * CRDT Sync Engine — Yjs lazy-loaded
 *
 * CDC ref : F-015 (CRDT Yjs lazy-loaded ~50KB séparé)
 * Brick   : B-016
 * Risk    : Critical (95% coverage + MC/DC + PBT)
 *
 * Architecture:
 *   - Y.Doc represents preferences as a CRDT Y.Map
 *   - y-indexeddb persists Y.Doc locally (survives refresh)
 *   - Lazy-loaded: Yjs is only imported when createSyncEngine() is called
 *   - WebSocket provider prepared but NOT connected (B-017 = relay)
 *   - 0 KB overhead if sync opt-out (dynamic import)
 *
 * Defensive assertions (PET §5, ≥2 per critical function):
 *   1. createSyncEngine: throws if engine already active (no double init)
 *   2. setSyncedPreference: key must be non-empty string
 *   3. setSyncedPreference: value must be string (not null/undefined/number)
 *   4. applySyncUpdate: update must be Uint8Array
 *   5. all mutators: engine must be active (not idle or destroyed)
 */

import { openSyncPersistence } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** IndexedDB database name used by y-indexeddb for CRDT persistence. */
export const MORPHIC_SYNC_DB_NAME = 'morphic-sync' as const;

/** DOM marker attribute for sync status. */
export const MORPHIC_SYNC_MARKER = 'data-morphic-sync' as const;

/** Custom event name: preference changed via CRDT merge. */
export const MORPHIC_SYNC_EVENT_CHANGE = 'morphic:sync:change' as const;

/** Custom event name: sync error occurred. */
export const MORPHIC_SYNC_EVENT_ERROR = 'morphic:sync:error' as const;

/** Possible sync engine states. */
export const SYNC_ENGINE_STATES = ['idle', 'active', 'destroyed'] as const;

/** Sync engine status type. */
export type SyncEngineStatus = (typeof SYNC_ENGINE_STATES)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for creating the sync engine. */
export interface SyncEngineOptions {
  /** Name of the Y.Doc / IDB store. Defaults to 'morphic-prefs'. */
  docName?: string;
}

/** Public state of the sync engine. */
export interface SyncEngineState {
  /** Current lifecycle status. */
  status: SyncEngineStatus;
  /** Name of the active Y.Doc, or null if not active. */
  docName: string | null;
  /** Number of keys in the preference map. */
  keyCount: number;
}

/** Public interface of a created sync engine. */
export interface SyncEngine {
  /** Encode the full document state as a Uint8Array (for sending to peers). */
  encodeStateAsUpdate(): Uint8Array;
}

// ---------------------------------------------------------------------------
// Module state (singleton)
// ---------------------------------------------------------------------------

let currentStatus: SyncEngineStatus = 'idle';
let currentDocName: string | null = null;

// Yjs types stored as `any` to avoid importing Yjs at module level.
// They are populated only when createSyncEngine() is called.
// biome-ignore lint/suspicious/noExplicitAny: Yjs types unavailable without static import
let ydoc: any = null;
// biome-ignore lint/suspicious/noExplicitAny: Y.Map type unavailable without static import
let ymap: any = null;
// biome-ignore lint/suspicious/noExplicitAny: IndexeddbPersistence type unavailable without static import
let idbProvider: any = null;

// ---------------------------------------------------------------------------
// createSyncEngine
// ---------------------------------------------------------------------------

/**
 * Create the CRDT sync engine.
 *
 * Lazy-loads Yjs and y-indexeddb via dynamic import (0 KB if never called).
 * Initializes a Y.Doc with a Y.Map('prefs') and persists via y-indexeddb.
 *
 * Defensive assertions:
 *   1. Throws if engine is already active (no double init)
 *
 * @throws Error if engine already active
 */
export async function createSyncEngine(options?: SyncEngineOptions): Promise<SyncEngine> {
  // Defensive assertion #1 — no double init
  if (currentStatus === 'active') {
    throw new Error('Sync engine already active. Call destroySyncEngine() first.');
  }

  const docName = options?.docName ?? 'morphic-prefs';

  // Lazy-load Yjs and y-indexeddb (0 KB if never called)
  const Y = await import('yjs');

  // Capture applyUpdate for later use in applySyncUpdate()
  applyUpdateFn = Y.applyUpdate;
  encodeStateAsUpdateFn = Y.encodeStateAsUpdate;

  ydoc = new Y.Doc();
  ymap = ydoc.getMap('prefs');

  // Persist Y.Doc to IndexedDB -- when the host allows it.
  //
  // This constructor opens a database, and `whenSynced` rejects when the open
  // fails: a privileged window, a sandboxed frame, private browsing, a spent
  // quota. Unguarded, both took down a public function of this engine, and two
  // rounds of site-by-site fixes had left exactly this call untouched because
  // nobody had visited it.
  //
  // A host that refuses storage still gets a working sync engine -- in memory.
  // It simply does not remember across reloads, which is a smaller loss than
  // the whole feature throwing.
  idbProvider = await openSyncPersistence(MORPHIC_SYNC_DB_NAME, ydoc);

  currentStatus = 'active';
  currentDocName = docName;

  return {
    encodeStateAsUpdate(): Uint8Array {
      return encodeStateAsUpdateFn(ydoc);
    },
  };
}

// ---------------------------------------------------------------------------
// destroySyncEngine
// ---------------------------------------------------------------------------

/**
 * Destroy the sync engine and release resources.
 * Safe to call when no engine exists or already destroyed.
 */
export function destroySyncEngine(): void {
  if (idbProvider) {
    idbProvider.destroy();
    idbProvider = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
  ymap = null;
  currentStatus = 'destroyed';
  currentDocName = null;
}

// ---------------------------------------------------------------------------
// getSyncEngineState
// ---------------------------------------------------------------------------

/**
 * Get the current sync engine state.
 */
export function getSyncEngineState(): SyncEngineState {
  return {
    status: currentStatus,
    docName: currentDocName,
    keyCount: ymap ? ymap.size : 0,
  };
}

// ---------------------------------------------------------------------------
// setSyncedPreference
// ---------------------------------------------------------------------------

/**
 * Set a preference in the CRDT Y.Map.
 *
 * Defensive assertions:
 *   2. key must be non-empty string
 *   3. value must be string (not null/undefined/number/boolean)
 *
 * @throws Error if engine not active
 * @throws TypeError if key is empty or value is not a string
 */
export function setSyncedPreference(key: string, value: string): void {
  assertActive();

  // Defensive assertion #2 — key validation
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError(
      `setSyncedPreference: key must be a non-empty string, got ${typeof key === 'string' ? '""' : typeof key}`,
    );
  }

  // Defensive assertion #3 — value validation
  if (typeof value !== 'string') {
    throw new TypeError(
      `setSyncedPreference: value must be a string, got ${value === null ? 'null' : typeof value}`,
    );
  }

  ymap.set(key, value);
}

// ---------------------------------------------------------------------------
// getSyncedPreferences
// ---------------------------------------------------------------------------

/**
 * Get all synced preferences as a plain object.
 *
 * @throws Error if engine not active
 */
export function getSyncedPreferences(): Record<string, string> {
  assertActive();

  // Object.create(null) — a plain `{}` has no own "__proto__" property; the
  // key is instead intercepted by Object.prototype's inherited __proto__
  // accessor setter, silently reassigning the object's prototype instead of
  // storing the value (found by independent review 2026-08-30, same defect
  // class as profile-hints.ts/human-design-profile.ts's key check, but here
  // it strikes on WRITE via bracket assignment, not on Zod's key iteration).
  // A null-prototype object has no such setter, so the assignment below is
  // always a real own-property set regardless of the key name.
  const result: Record<string, string> = Object.create(null);
  for (const [key, value] of ymap.entries()) {
    if (typeof value === 'string') {
      result[key as string] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// applySyncUpdate
// ---------------------------------------------------------------------------

/**
 * Apply a CRDT update received from a remote peer.
 *
 * Defensive assertion:
 *   4. update must be Uint8Array
 *
 * @throws Error if engine not active
 * @throws TypeError if update is not Uint8Array
 */
export function applySyncUpdate(update: Uint8Array): void {
  assertActive();

  // Defensive assertion #4 — update type validation
  if (!(update instanceof Uint8Array)) {
    throw new TypeError(`applySyncUpdate: update must be a Uint8Array, got ${typeof update}`);
  }

  // Dynamic import already loaded Yjs at createSyncEngine time.
  // We need Y.applyUpdate — access it via the doc's constructor module.
  // Since we can't re-import synchronously, we use ydoc's internal method.
  // Yjs exposes applyUpdate on the module — but we loaded it dynamically.
  // Store reference at creation time instead.
  applyUpdateFn(ydoc, update);
}

// Function references captured during createSyncEngine's dynamic import
// biome-ignore lint/suspicious/noExplicitAny: Y.Doc type unavailable without static import
let applyUpdateFn: (doc: any, update: Uint8Array) => void = () => {
  throw new Error('Yjs not loaded');
};
// biome-ignore lint/suspicious/noExplicitAny: Y.Doc type unavailable without static import
let encodeStateAsUpdateFn: (doc: any) => Uint8Array = () => {
  throw new Error('Yjs not loaded');
};

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

/**
 * Reset module state for test isolation.
 * @internal — test-only, prefixed `__` per convention.
 */
export function __resetSyncStateForTests(): void {
  ydoc = null;
  ymap = null;
  idbProvider = null;
  currentStatus = 'idle';
  currentDocName = null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertActive(): void {
  if (currentStatus !== 'active' || !ymap) {
    throw new Error('Sync engine not active. Call createSyncEngine() first.');
  }
}
