// Bait: a static import spread over several lines.
// No single line both starts with `import` and carries its `from`, so the
// line-by-line guard read past it without a word. Proven by review, 2026-09-03.
//
// The formatter would join these lines back together and disarm the bait
// without a word, so the shape is pinned here AND asserted by the guard.
// biome-ignore format: the several lines ARE the defect being reproduced
import {
  openDB,
} from 'idb';

export async function reopen(): Promise<unknown> {
  return openDB('morphic', 1);
}
