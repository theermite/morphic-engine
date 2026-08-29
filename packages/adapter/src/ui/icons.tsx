/**
 * Inline SVG icons for <MorphicButton> — no icon-library dependency.
 *
 * CDC ref : F-036. Brick : B-030a. License : AGPL-3.0-or-later.
 */

export function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4v5h5M20 20v-5h-5M19 9a8 8 0 0 0-14-3M5 15a8 8 0 0 0 14 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
