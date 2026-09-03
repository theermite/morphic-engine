// Bait: the original defect, reaching the global with a member call.
export function remember(value: string): void {
  localStorage.setItem('morphic-theme', value);
}
