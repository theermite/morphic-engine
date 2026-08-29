/**
 * Viewport-collision placement for <MorphicButton>'s modal (B-030f).
 *
 * CDC ref : F-036. License : AGPL-3.0-or-later.
 *
 * The modal used to always anchor right+below the trigger via CSS alone.
 * Near a screen edge that pushes most of it off-screen (Jay 2026-08-29,
 * screenshot showing the panel clipped). Flips side/edge only when the
 * default placement would not fit, measured against the trigger's own
 * bounding rect — never worse than the previous default.
 */

export const MODAL_GAP_PX = 8;
export const MODAL_MAX_WIDTH_PX = 520;
export const MODAL_MAX_HEIGHT_RATIO = 0.78;

export type ModalPlacement = { horizontal: 'left' | 'right'; vertical: 'above' | 'below' };

export function computePlacement(trigger: HTMLElement): ModalPlacement {
  const rect = trigger.getBoundingClientRect();
  const modalWidth = Math.min(MODAL_MAX_WIDTH_PX, window.innerWidth - 16);
  const modalMaxHeight = window.innerHeight * MODAL_MAX_HEIGHT_RATIO;

  const horizontal: ModalPlacement['horizontal'] =
    rect.right - modalWidth < MODAL_GAP_PX ? 'left' : 'right';

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const vertical: ModalPlacement['vertical'] =
    spaceBelow < modalMaxHeight + MODAL_GAP_PX && spaceAbove >= modalMaxHeight + MODAL_GAP_PX
      ? 'above'
      : 'below';

  return { horizontal, vertical };
}
