// Bait: `typeof localStorage` in an EXPRESSION — the original production bug.
//
// This is the shape that broke the pomodoro button in the Shinkofa browser on
// 2026-08-31: on a privileged window the getter throws when read, so the line
// written to protect the call is the line that crashes.
//
// It sits here because the fix of 2026-09-03 taught the guard to ignore the
// same words in a TYPE. That relaxation must never reach this form, and a bait
// is the only way to know it has not.
export function hasStore(): boolean {
  return typeof localStorage !== 'undefined';
}
