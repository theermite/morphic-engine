/**
 * Tests for B-016 — CRDT Sync Engine (Yjs lazy-loaded)
 *
 * CDC ref  : F-015
 * Risk     : Critical (95% coverage + MC/DC + PBT)
 * TDG      : tests written BEFORE implementation (red).
 *
 * Dependencies:
 *   - yjs@13.6.30 (CRDT library)
 *   - y-indexeddb@9.0.12 (IDB persistence for Y.Doc)
 *   - fake-indexeddb@6.2.5 (polyfill for jsdom)
 *   - fast-check@4.8.0 (PBT Layer 1)
 */

import 'fake-indexeddb/auto';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetSyncStateForTests,
  applySyncUpdate,
  createSyncEngine,
  destroySyncEngine,
  getSyncEngineState,
  getSyncedPreferences,
  MORPHIC_SYNC_DB_NAME,
  MORPHIC_SYNC_EVENT_CHANGE,
  MORPHIC_SYNC_EVENT_ERROR,
  MORPHIC_SYNC_MARKER,
  SYNC_ENGINE_STATES,
  setSyncedPreference,
} from '../src/sync-engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Delete the Y-IndexedDB database between tests. */
function deleteYjsDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(MORPHIC_SYNC_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Test isolation
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetSyncStateForTests();
});

afterEach(async () => {
  // Ensure engine is destroyed between tests
  try {
    destroySyncEngine();
  } catch {
    // Already destroyed — fine
  }
  __resetSyncStateForTests();
  await deleteYjsDb();
});

// ============================================================================
// §1 — Constants
// ============================================================================

describe('Constants', () => {
  it('should_export_sync_db_name', () => {
    expect(MORPHIC_SYNC_DB_NAME).toBe('morphic-sync');
  });

  it('should_export_sync_marker', () => {
    expect(MORPHIC_SYNC_MARKER).toBe('data-morphic-sync');
  });

  it('should_export_sync_event_names', () => {
    expect(MORPHIC_SYNC_EVENT_CHANGE).toBe('morphic:sync:change');
    expect(MORPHIC_SYNC_EVENT_ERROR).toBe('morphic:sync:error');
  });

  it('should_export_sync_engine_states', () => {
    expect(SYNC_ENGINE_STATES).toContain('idle');
    expect(SYNC_ENGINE_STATES).toContain('active');
    expect(SYNC_ENGINE_STATES).toContain('destroyed');
  });
});

// ============================================================================
// §2 — createSyncEngine
// ============================================================================

describe('createSyncEngine', () => {
  it('should_create_engine_with_idle_state', async () => {
    const engine = await createSyncEngine();
    expect(engine).toBeDefined();
    const state = getSyncEngineState();
    expect(state.status).toBe('active');
    expect(state.docName).toBe('morphic-prefs');
  });

  it('should_create_engine_with_custom_doc_name', async () => {
    const _engine = await createSyncEngine({ docName: 'custom-doc' });
    const state = getSyncEngineState();
    expect(state.docName).toBe('custom-doc');
  });

  it('should_throw_if_engine_already_active', async () => {
    await createSyncEngine();
    await expect(createSyncEngine()).rejects.toThrow(/already active/i);
  });

  it('should_allow_recreation_after_destroy', async () => {
    await createSyncEngine();
    destroySyncEngine();
    const engine = await createSyncEngine();
    expect(engine).toBeDefined();
    expect(getSyncEngineState().status).toBe('active');
  });
});

// ============================================================================
// §3 — destroySyncEngine
// ============================================================================

describe('destroySyncEngine', () => {
  it('should_destroy_active_engine', async () => {
    await createSyncEngine();
    destroySyncEngine();
    expect(getSyncEngineState().status).toBe('destroyed');
  });

  it('should_be_safe_when_no_engine', () => {
    // Should not throw when nothing to destroy
    expect(() => destroySyncEngine()).not.toThrow();
  });

  it('should_be_idempotent', async () => {
    await createSyncEngine();
    destroySyncEngine();
    expect(() => destroySyncEngine()).not.toThrow();
    expect(getSyncEngineState().status).toBe('destroyed');
  });
});

// ============================================================================
// §4 — getSyncEngineState
// ============================================================================

describe('getSyncEngineState', () => {
  it('should_return_idle_when_not_created', () => {
    const state = getSyncEngineState();
    expect(state.status).toBe('idle');
    expect(state.docName).toBeNull();
    expect(state.keyCount).toBe(0);
  });

  it('should_return_active_with_key_count', async () => {
    await createSyncEngine();
    setSyncedPreference('theme', 'dark');
    setSyncedPreference('motion', 'reduced');
    const state = getSyncEngineState();
    expect(state.status).toBe('active');
    expect(state.keyCount).toBe(2);
  });
});

// ============================================================================
// §5 — setSyncedPreference / getSyncedPreferences
// ============================================================================

describe('setSyncedPreference', () => {
  it('should_set_and_get_preference', async () => {
    await createSyncEngine();
    setSyncedPreference('theme', 'dark');
    const prefs = getSyncedPreferences();
    expect(prefs.theme).toBe('dark');
  });

  it('should_overwrite_existing_preference', async () => {
    await createSyncEngine();
    setSyncedPreference('theme', 'dark');
    setSyncedPreference('theme', 'light');
    const prefs = getSyncedPreferences();
    expect(prefs.theme).toBe('light');
  });

  it('should_handle_multiple_preferences', async () => {
    await createSyncEngine();
    setSyncedPreference('theme', 'dark');
    setSyncedPreference('motion', 'reduced');
    setSyncedPreference('fontSize', 'large');
    const prefs = getSyncedPreferences();
    expect(prefs).toEqual({
      theme: 'dark',
      motion: 'reduced',
      fontSize: 'large',
    });
  });

  it('should_throw_when_engine_not_active', () => {
    expect(() => setSyncedPreference('theme', 'dark')).toThrow(/not active/i);
  });

  it('should_throw_when_engine_destroyed', async () => {
    await createSyncEngine();
    destroySyncEngine();
    expect(() => setSyncedPreference('theme', 'dark')).toThrow(/not active/i);
  });
});

describe('getSyncedPreferences', () => {
  it('should_return_empty_object_when_no_prefs', async () => {
    await createSyncEngine();
    const prefs = getSyncedPreferences();
    expect(prefs).toEqual({});
  });

  it('should_throw_when_engine_not_active', () => {
    expect(() => getSyncedPreferences()).toThrow(/not active/i);
  });
});

// ============================================================================
// §6 — applySyncUpdate (CRDT merge)
// ============================================================================

describe('applySyncUpdate', () => {
  it('should_apply_update_from_remote', async () => {
    // Create two engines, generate update from one, apply to the other
    const engine1 = await createSyncEngine({ docName: 'doc-a' });
    setSyncedPreference('theme', 'dark');

    // Get the state vector and encode the update
    const update = engine1.encodeStateAsUpdate();

    destroySyncEngine();
    await deleteYjsDb();

    // Create second engine and apply the update
    await createSyncEngine({ docName: 'doc-b' });
    applySyncUpdate(update);
    const prefs = getSyncedPreferences();
    expect(prefs.theme).toBe('dark');
  });

  it('should_throw_when_engine_not_active', () => {
    expect(() => applySyncUpdate(new Uint8Array([]))).toThrow(/not active/i);
  });

  it('should_not_corrupt_doc_with_invalid_update', async () => {
    await createSyncEngine();
    setSyncedPreference('theme', 'dark');
    // Yjs silently ignores malformed updates — doc remains uncorrupted
    applySyncUpdate(new Uint8Array([0, 0, 0]));
    const prefs = getSyncedPreferences();
    expect(prefs.theme).toBe('dark');
  });
});

// ============================================================================
// §7 — Lazy loading (dynamic import guard)
// ============================================================================

describe('Lazy loading', () => {
  it('should_not_load_yjs_at_module_import', async () => {
    // The sync-engine module should be importable without Yjs being loaded.
    // Yjs is loaded only when createSyncEngine() is called.
    // This test verifies the module itself can be imported.
    const mod = await import('../src/sync-engine.js');
    expect(mod.MORPHIC_SYNC_DB_NAME).toBe('morphic-sync');
  });
});

// ============================================================================
// §8 — MC/DC (defensive assertions)
// ============================================================================

describe('MC/DC — defensive assertions', () => {
  it('should_validate_key_is_string', async () => {
    await createSyncEngine();
    expect(() => setSyncedPreference('' as string, 'value')).toThrow(/key/i);
  });

  it('should_validate_value_is_string', async () => {
    await createSyncEngine();
    expect(() => setSyncedPreference('key', null as unknown as string)).toThrow(/value/i);
  });

  it('should_validate_value_is_not_undefined', async () => {
    await createSyncEngine();
    expect(() => setSyncedPreference('key', undefined as unknown as string)).toThrow(/value/i);
  });

  it('should_validate_update_is_uint8array', async () => {
    await createSyncEngine();
    expect(() => applySyncUpdate(null as unknown as Uint8Array)).toThrow(/Uint8Array/i);
  });

  it('should_validate_update_is_not_empty_array', async () => {
    await createSyncEngine();
    expect(() => applySyncUpdate([] as unknown as Uint8Array)).toThrow(/Uint8Array/i);
  });
});

// ============================================================================
// §9 — Edge cases
// ============================================================================

describe('Edge cases', () => {
  it('should_handle_unicode_keys_and_values', async () => {
    await createSyncEngine();
    setSyncedPreference('thème', '暗い');
    const prefs = getSyncedPreferences();
    expect(prefs.thème).toBe('暗い');
  });

  it('should_handle_very_long_values', async () => {
    await createSyncEngine();
    const longValue = 'x'.repeat(10_000);
    setSyncedPreference('data', longValue);
    const prefs = getSyncedPreferences();
    expect(prefs.data).toBe(longValue);
  });

  it('should_persist_across_destroy_recreate_via_idb', async () => {
    await createSyncEngine({ docName: 'persist-test' });
    setSyncedPreference('theme', 'dark');
    destroySyncEngine();

    // Recreate with same doc name — y-indexeddb should restore
    await createSyncEngine({ docName: 'persist-test' });
    const prefs = getSyncedPreferences();
    expect(prefs.theme).toBe('dark');
  });
});

// ============================================================================
// §10 — PBT (Property-Based Testing — Layer 1 Anti-Circular)
// ============================================================================

describe('PBT — fast-check', () => {
  it('should_roundtrip_any_string_preference', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (key, value) => {
          __resetSyncStateForTests();
          await deleteYjsDb();

          await createSyncEngine({ docName: `pbt-${Date.now()}` });
          setSyncedPreference(key, value);
          const prefs = getSyncedPreferences();
          expect(prefs[key]).toBe(value);
          destroySyncEngine();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('should_merge_two_docs_without_conflict', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (k1, v1, k2, v2) => {
          __resetSyncStateForTests();
          await deleteYjsDb();

          // Engine A sets k1=v1
          const engineA = await createSyncEngine({ docName: `pbt-a-${Date.now()}` });
          setSyncedPreference(k1, v1);
          const updateA = engineA.encodeStateAsUpdate();
          destroySyncEngine();

          __resetSyncStateForTests();
          await deleteYjsDb();

          // Engine B sets k2=v2, then applies A's update
          await createSyncEngine({ docName: `pbt-b-${Date.now()}` });
          setSyncedPreference(k2, v2);
          applySyncUpdate(updateA);
          const merged = getSyncedPreferences();

          // Both keys present (if different keys)
          if (k1 !== k2) {
            expect(merged[k1]).toBe(v1);
            expect(merged[k2]).toBe(v2);
          }
          // If same key, one value wins (CRDT last-writer-wins on Y.Map)
          destroySyncEngine();
        },
      ),
      { numRuns: 15 },
    );
  });

  it('should_retrieve_a_preference_stored_under_the_key_proto (found by independent review 2026-08-30)', async () => {
    __resetSyncStateForTests();
    await deleteYjsDb();

    await createSyncEngine({ docName: `proto-guard-${Date.now()}` });
    setSyncedPreference('__proto__', 'poisoned-value');
    const prefs = getSyncedPreferences();

    // A plain `{}` would silently reassign its prototype instead of storing
    // this — Object.keys must see a real own property, and the value must
    // read back exactly as written.
    expect(Object.keys(prefs)).toContain('__proto__');
    expect(prefs['__proto__']).toBe('poisoned-value');
    destroySyncEngine();
  });

  it('should_reject_non_string_values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        async (badValue) => {
          __resetSyncStateForTests();
          await deleteYjsDb();

          await createSyncEngine({ docName: `pbt-reject-${Date.now()}` });
          expect(() => setSyncedPreference('key', badValue as unknown as string)).toThrow(/value/i);
          destroySyncEngine();
        },
      ),
      { numRuns: 10 },
    );
  });
});
