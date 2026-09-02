/**
 * Axe Reading Focus — typographic guide for saccade fixation.
 *
 * CDC ref : F-026 (Axe lecture : Reading Focus toggle + intensité)
 * Brick   : B-102
 * Risk    : Standard (80% coverage).
 *
 * Naming note :
 *   "Reading Focus" — NOT "Bionic Reading", which is a registered US trademark
 *   (#5557651, BRCG Casutt GmbH) with documented takedowns (TorpedoRead 2022).
 *   The typographic technique itself (bolding the first N letters of each word
 *   to guide eye saccades) is not patentable. We use the technique under its
 *   neutral descriptive name.
 *
 * Scientific framing :
 *   Evidence is mixed. Multiple 2022-2025 studies (Readwise n=2000, Snell 2024,
 *   Možina et al. 2025) found no significant effect on reading speed. A single
 *   2025 study reports +25% retention over 6 months, awaiting replication. Many
 *   ADHD/dyslexic users report subjective focus benefit. This is shipped as a
 *   user-preference feature, OFF by default, opt-in.
 *
 * Spec :
 *   - `applyReadingFocus(text, ratio)` — pure helper. Wraps the first
 *     `ceil(word.length * ratio)` letters of every letter-run with `<b>`.
 *     Escapes HTML to prevent injection.
 *   - `setReadingFocus(intensity, { target })` — applies to a DOM element
 *     (defaults to document.body). Walks TEXT_NODE descendants, transforms each.
 *     Skips SCRIPT, STYLE, NOSCRIPT, TEXTAREA, INPUT. Idempotent.
 *   - `getReadingFocus()` — reads back the persisted intensity.
 *   - `clearReadingFocus({ target })` — unwraps our `<b data-morphic-reading-focus>`
 *     markers and removes storage sub-key. Preserves user's own <b> tags.
 *
 * Defensive contracts :
 *   - Invalid intensity / ratio throws TypeError (poka-yoke via closed enum).
 *   - localStorage failures (private mode, quota) do NOT throw — DOM still updated.
 *   - SSR-safe : setReadingFocus / clearReadingFocus no-op when document is absent.
 */

import { MORPHIC_STORAGE_KEY } from './init.js';
import { safeStorage } from './storage-access.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Closed enum of reading focus intensities (poka-yoke). */
export const READING_FOCUS_INTENSITIES = ['low', 'medium', 'high'] as const;

/** Map from intensity to fixation ratio. */
export const MORPHIC_READING_FOCUS_RATIOS = {
  low: 0.3,
  medium: 0.4,
  high: 0.5,
} as const;

/** DOM attribute used both as target marker and as <b> tag marker. */
export const MORPHIC_READING_FOCUS_MARKER = 'data-morphic-reading-focus' as const;

/** localStorage sub-key under MORPHIC_STORAGE_KEY for the persisted intensity. */
const STORAGE_SUBKEY = 'readingFocus' as const;

/** Tag names whose text content must NOT be transformed. */
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReadingFocusIntensity = (typeof READING_FOCUS_INTENSITIES)[number];

export interface ReadingFocusOptions {
  /** DOM element to transform. Defaults to `document.body`. */
  target?: Element;
}

// ---------------------------------------------------------------------------
// Validation (closed enum + numeric guards)
// ---------------------------------------------------------------------------

function isValidIntensity(value: unknown): value is ReadingFocusIntensity {
  return (
    typeof value === 'string' && (READING_FOCUS_INTENSITIES as readonly string[]).includes(value)
  );
}

function isValidRatio(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1;
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  // Order matters : & must be replaced first.
  return s
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

// ---------------------------------------------------------------------------
// applyReadingFocus — pure helper
// ---------------------------------------------------------------------------

/**
 * Wrap the first `ceil(word.length * ratio)` letters of every letter-run with `<b>`.
 *
 * Input is HTML-escaped first to prevent injection when the result is set via
 * innerHTML by the caller (setReadingFocus does exactly that). The function
 * does NOT call innerHTML itself — it returns a string.
 *
 * @throws {TypeError} when `text` is not a string or `ratio` is out of (0, 1].
 */
export function applyReadingFocus(text: string, ratio: number): string {
  // Defensive assertion #1 — input type.
  if (typeof text !== 'string') {
    throw new TypeError(`applyReadingFocus: expected string text, got ${typeof text}.`);
  }

  // Defensive assertion #2 — ratio domain.
  if (!isValidRatio(ratio)) {
    throw new TypeError(
      `applyReadingFocus: ratio must be a finite number in (0, 1], got ${String(ratio)}.`,
    );
  }

  if (text.length === 0) return '';

  // Tokenize ALTERNATING : letter-runs vs everything else. Escape each
  // segment AFTER tokenization, otherwise the HTML escape sequences
  // themselves (e.g. "amp" inside "&amp;") would be matched as letter-runs.
  let out = '';
  let lastIndex = 0;
  const re = /\p{L}+/gu;
  let m: RegExpExecArray | null = re.exec(text);
  while (m !== null) {
    const before = text.slice(lastIndex, m.index);
    if (before.length > 0) out += escapeHtml(before);
    const word = m[0];
    const fixationLen = Math.ceil(word.length * ratio);
    out += `<b>${escapeHtml(word.slice(0, fixationLen))}</b>${escapeHtml(word.slice(fixationLen))}`;
    lastIndex = m.index + word.length;
    m = re.exec(text);
  }
  const tail = text.slice(lastIndex);
  if (tail.length > 0) out += escapeHtml(tail);
  return out;
}

// ---------------------------------------------------------------------------
// Storage helpers (never throw)
// ---------------------------------------------------------------------------

function readStorageObject(): Record<string, unknown> {
  try {
    const raw = safeStorage.get(MORPHIC_STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorageObject(obj: Record<string, unknown>): void {
  try {
    safeStorage.set(MORPHIC_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage unavailable (private mode, quota) — DOM update wins.
  }
}

function persistIntensity(intensity: ReadingFocusIntensity): void {
  const obj = readStorageObject();
  obj[STORAGE_SUBKEY] = intensity;
  writeStorageObject(obj);
}

function unpersistIntensity(): void {
  const obj = readStorageObject();
  if (STORAGE_SUBKEY in obj) {
    delete obj[STORAGE_SUBKEY];
    writeStorageObject(obj);
  }
}

// ---------------------------------------------------------------------------
// DOM walker — apply transformation to text nodes under target
// ---------------------------------------------------------------------------

function shouldSkipAncestor(node: Node): boolean {
  let cur: Node | null = node.parentNode;
  while (cur !== null && cur.nodeType === Node.ELEMENT_NODE) {
    const el = cur as Element;
    if (SKIPPED_TAGS.has(el.tagName)) return true;
    // Skip if already inside one of our markers (idempotency guard for nested walks).
    if (el.tagName === 'B' && el.hasAttribute(MORPHIC_READING_FOCUS_MARKER)) return true;
    cur = cur.parentNode;
  }
  return false;
}

function transformTextNode(textNode: Text, ratio: number): void {
  const text = textNode.data;
  // Skip whitespace-only nodes : no letter-run, nothing to bold.
  if (!/\p{L}/u.test(text)) return;

  const html = applyReadingFocus(text, ratio);
  // Re-inject as DOM. The <b> tags we add are marked so clearReadingFocus
  // can unwrap them without disturbing user-authored <b>.
  const wrapper = textNode.ownerDocument.createElement('span');
  wrapper.innerHTML = html;
  // Mark each <b> we just produced.
  for (const b of Array.from(wrapper.querySelectorAll('b'))) {
    b.setAttribute(MORPHIC_READING_FOCUS_MARKER, '');
  }
  // Replace the text node by its children (without the wrapper span).
  const parent = textNode.parentNode;
  if (parent === null) return;
  while (wrapper.firstChild !== null) {
    parent.insertBefore(wrapper.firstChild, textNode);
  }
  parent.removeChild(textNode);
}

function collectTextNodes(root: Element): Text[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipAncestor(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const out: Text[] = [];
  let cur = walker.nextNode();
  while (cur !== null) {
    out.push(cur as Text);
    cur = walker.nextNode();
  }
  return out;
}

// ---------------------------------------------------------------------------
// unwrapMarkers — strip our <b data-morphic-reading-focus> tags
// ---------------------------------------------------------------------------

function unwrapMarkers(root: Element): void {
  const markers = Array.from(root.querySelectorAll(`b[${MORPHIC_READING_FOCUS_MARKER}]`));
  for (const b of markers) {
    const parent = b.parentNode;
    if (parent === null) continue;
    while (b.firstChild !== null) {
      parent.insertBefore(b.firstChild, b);
    }
    parent.removeChild(b);
  }
  // Coalesce adjacent text nodes that resulted from the unwrap.
  root.normalize();
}

// ---------------------------------------------------------------------------
// setReadingFocus — public API
// ---------------------------------------------------------------------------

/**
 * Apply reading focus typography to a DOM subtree and persist the choice.
 *
 * - Validates `intensity` against the closed enum (throws on invalid input).
 * - Walks TEXT_NODE descendants of `options.target` (defaults to `document.body`).
 * - Wraps each word's prefix in `<b data-morphic-reading-focus>`.
 * - Skips SCRIPT/STYLE/NOSCRIPT/TEXTAREA/INPUT/CODE/PRE subtrees.
 * - Idempotent : calling twice with the same intensity is a no-op (visually).
 *   Calling with a different intensity first clears then re-applies.
 * - Persists the user's choice under MORPHIC_STORAGE_KEY → readingFocus.
 *
 * @throws {TypeError} when `intensity` is not in the closed enum.
 */
export function setReadingFocus(
  intensity: ReadingFocusIntensity,
  options: ReadingFocusOptions = {},
): void {
  if (!isValidIntensity(intensity)) {
    throw new TypeError(
      `setReadingFocus: invalid intensity. Expected one of ${READING_FOCUS_INTENSITIES.join(', ')}, got ${String(intensity)}.`,
    );
  }

  // SSR guard.
  if (typeof document === 'undefined') {
    persistIntensity(intensity);
    return;
  }

  const target = options.target ?? document.body;
  const ratio = MORPHIC_READING_FOCUS_RATIOS[intensity];

  // Idempotency : clear previous markers on this target first.
  unwrapMarkers(target);

  // Walk and transform.
  const textNodes = collectTextNodes(target);
  for (const node of textNodes) {
    transformTextNode(node, ratio);
  }

  target.setAttribute(MORPHIC_READING_FOCUS_MARKER, intensity);
  persistIntensity(intensity);
}

// ---------------------------------------------------------------------------
// getReadingFocus — read persisted intensity
// ---------------------------------------------------------------------------

/**
 * Read back the user's persisted reading focus intensity.
 *
 * Returns the stored intensity, or `null` when:
 *   - localStorage is unavailable.
 *   - No entry exists.
 *   - Entry is not valid JSON or not a plain object.
 *   - Sub-key is missing or not in the closed enum.
 */
export function getReadingFocus(): ReadingFocusIntensity | null {
  const obj = readStorageObject();
  const value = obj[STORAGE_SUBKEY];
  return isValidIntensity(value) ? value : null;
}

// ---------------------------------------------------------------------------
// clearReadingFocus — remove DOM transformation and persistence
// ---------------------------------------------------------------------------

/**
 * Remove the reading focus transformation from a DOM subtree and from storage.
 *
 * - Unwraps every `<b data-morphic-reading-focus>` under `options.target`
 *   (defaults to `document.body`). User's own `<b>` tags are preserved.
 * - Removes the `data-morphic-reading-focus` attribute from the target.
 * - Removes the `readingFocus` sub-key from MORPHIC_STORAGE_KEY (preserves
 *   other axes).
 * - Safe to call on a non-marked target (no-op).
 */
export function clearReadingFocus(options: ReadingFocusOptions = {}): void {
  if (typeof document !== 'undefined') {
    const target = options.target ?? document.body;
    unwrapMarkers(target);
    target.removeAttribute(MORPHIC_READING_FOCUS_MARKER);
  }
  unpersistIntensity();
}
