// Control: everything here LOOKS like the defect and reaches nothing.
//
// A guard that flags this is a guard someone eventually switches off, and it
// takes the real detection with it. `localStorageRaw` was flagged by a first
// version; a type import and a string key were never doors at all.
import type { IDBPDatabase } from 'idb';

/** The key under which the theme is stored — a word, not a door. */
export const THEME_KEY = 'localStorage:morphic-theme';

export function describe(localStorageRaw: string | null, db: IDBPDatabase | null): string {
  // Reads like `localStorage.getItem`, is a comment, reaches nothing.
  const indexedDBRaw = db === null ? 'none' : 'open';
  return `${localStorageRaw ?? 'empty'}/${indexedDBRaw}`;
}
