// Bait: the name written as text instead of as a word.
//
// `obj['localStorage']` reaches exactly the same store as `obj.localStorage`,
// and the parser saw nothing: it visited identifiers only, and this name lives
// in a string. Found by the review of 2026-09-03, proven by running it against
// a real module of `src/` -- the guard stayed green.
//
// The linter would rewrite this into a dot access and disarm the bait without
// a word, so the shape is pinned here AND asserted by the guard.
export function remember(value: string): void {
  const host = globalThis as unknown as Record<string, Storage>;
  // biome-ignore lint/complexity/useLiteralKeys: the brackets ARE the defect being reproduced
  host['localStorage'].setItem('morphic-theme', value);
}
