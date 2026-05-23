/**
 * Vitest setup — React Testing Library hooks.
 *
 * - Adds @testing-library/jest-dom matchers (toBeInTheDocument, etc.).
 * - Cleans up the DOM between tests automatically.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Reset morphic state between tests
  document.documentElement.removeAttribute('data-morphic-theme');
  document.documentElement.removeAttribute('data-morphic-font-family');
  for (const prop of [
    '--morphic-theme',
    '--morphic-motion',
    '--morphic-contrast',
    '--morphic-font-size',
    '--morphic-font-family',
  ]) {
    document.documentElement.style.removeProperty(prop);
  }
  localStorage.clear();
});
