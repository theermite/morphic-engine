/**
 * Target — scope element for morphic adaptation.
 *
 * CDC ref : B-021g (Lab scoping — adaptation can target a sub-container so
 *           consumers can run the engine on a preview <div> instead of
 *           polluting `<html>` globally).
 * Brick   : B-021g.
 * Risk    : Standard (80% coverage).
 *
 * Spec :
 *   - `getTarget()` returns the active scope element.
 *   - Default scope is `document.documentElement` (preserves backward compat).
 *   - `setTarget(element)` overrides the default with the provided element.
 *   - `setTarget(null)` resets to the default `document.documentElement`.
 *   - `__resetTargetForTests()` clears module state for test isolation.
 *
 * Constraints :
 *   - `morphicInit()` (head-read, sync) MUST stay hardcoded on
 *     `document.documentElement` — it runs BEFORE any user JS can call
 *     `setTarget`. Only the runtime axes (theme/contrast/density/motion/
 *     typography/font-family) honour the target.
 *   - Element-scoped adaptation can't drive `rem` units (the browser binds
 *     `rem` to `<html>` only). Consumers using element-scoped font-size must
 *     use `em` in the scoped content.
 *
 * Defensive contracts :
 *   - Non-Element + non-null input throws TypeError (poka-yoke).
 *   - Module state is process-local and not persisted.
 */

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Currently active target. `null` means: fall back to `document.documentElement`. */
let currentTarget: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Return the active morphic target.
 *
 * Returns `document.documentElement` by default, or the element previously
 * passed to `setTarget`. The return type is `HTMLElement` so callers can use
 * `.style.setProperty()` (CSS inline style API).
 */
export function getTarget(): HTMLElement {
  return currentTarget ?? document.documentElement;
}

/**
 * Set the morphic target element.
 *
 * Pass an `HTMLElement` to scope adaptation to that subtree. Pass `null` to
 * reset to the default `document.documentElement`. Non-HTML elements (SVG,
 * plain Element) are rejected — runtime axes write inline CSS via `.style`
 * which is HTML-only.
 *
 * @throws {TypeError} when the argument is neither an HTMLElement nor null.
 */
export function setTarget(element: HTMLElement | null): void {
  if (element === null) {
    currentTarget = null;
    return;
  }
  if (typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) {
    throw new TypeError(
      `setTarget: expected an HTMLElement or null, got ${typeof element === 'object' ? Object.prototype.toString.call(element) : typeof element}.`,
    );
  }
  currentTarget = element;
}

// ---------------------------------------------------------------------------
// Test helper (internal — not part of the public API)
// ---------------------------------------------------------------------------

/**
 * Reset module state. Tests only — not part of the public API.
 *
 * The leading `__` marks intent: do not use in application code.
 */
export function __resetTargetForTests(): void {
  currentTarget = null;
}
