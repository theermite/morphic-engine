// Control: the storage names used where they reach nothing at all.
//
// `typeof localStorage` in a TYPE is a question asked of the compiler, erased
// before anything runs -- exactly like an `import type`. The same words in an
// EXPRESSION evaluate the getter and can throw, so that form stays forbidden.
//
// Found by the review of 2026-09-03: the guard flagged this file's shape and
// would have blocked a perfectly ordinary commit. A guard in the way is a
// guard someone switches off, and it takes the real detection with it.
type StorageLike = typeof localStorage;
type DatabaseLike = typeof indexedDB;

export interface HostCapabilities {
  readonly store: StorageLike | null;
  readonly databases: DatabaseLike | null;
}

export function describeHost(capabilities: HostCapabilities): string {
  return capabilities.store === null ? 'no store' : 'store available';
}
