// Bait: a dynamic import. It starts with `const`, or with `await`, never with
// `import` -- and this is the form the gatekeeper itself uses for `y-indexeddb`,
// which is why that library was missing from the derived list entirely.
export async function persist(doc: unknown): Promise<unknown> {
  const { IndexeddbPersistence } = await import('y-indexeddb');
  return new IndexeddbPersistence('morphic-sync', doc as never);
}
