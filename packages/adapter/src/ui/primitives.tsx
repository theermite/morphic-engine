/**
 * Presentational primitives shared by <MorphicButton>'s sections.
 *
 * CDC ref : F-036. Brick : B-030a. License : AGPL-3.0-or-later.
 */

import { type CSSProperties, type ReactNode, useId } from 'react';
import { CheckIcon, ChevronIcon } from './icons.js';

/**
 * One choice. The active one carries a check mark as well as its colour, so it
 * reads without perceiving colour (Jay 2026-10-11). `children` replaces the
 * visible text (a swatch, a sized letter) while `label` stays the accessible
 * name — what a screen reader says and what `labels` overrides.
 */
export function Chip(props: {
  label: string;
  active: boolean;
  onClick: () => void;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const visual = props.children !== undefined;
  return (
    <button
      type="button"
      className={`morphic-mb-chip${props.active ? ' is-active' : ''}`}
      aria-pressed={props.active}
      aria-label={visual ? props.label : undefined}
      style={props.style}
      onClick={props.onClick}
    >
      {props.active && (
        <span className="morphic-mb-check">
          <CheckIcon />
        </span>
      )}
      {visual ? props.children : props.label}
    </button>
  );
}

/**
 * A labelled setting. `choices` draws the options as one segmented bar (a
 * single pick), `tiles` as larger tiles (themes), `actions` as plain buttons
 * with inputs (pomodoro), where nothing is "selected".
 */
export function Row(props: {
  label: string;
  children: ReactNode;
  variant?: 'choices' | 'tiles' | 'actions';
}) {
  const variant = props.variant ?? 'choices';
  // A fieldset named by its legend: a screen reader announces the setting's
  // name when focus enters its choices.
  return (
    <fieldset className="morphic-mb-row">
      <legend className="morphic-mb-row-label">{props.label}</legend>
      <div className={`morphic-mb-chips morphic-mb-chips--${variant}`}>{props.children}</div>
    </fieldset>
  );
}

/**
 * A collapsible category (WAI-ARIA accordion: a heading holding a button).
 * The button is named by the title alone; the summary of what differs from
 * the defaults is its description, so it is read without polluting the name.
 * Collapsed content stays mounted (`hidden`), so a running control keeps its
 * state when its category closes.
 */
export function Category(props: {
  id: string;
  title: string;
  summary: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const summaryId = `${uid}-summary`;
  const contentId = `${uid}-content`;
  return (
    <section className={`morphic-mb-cat morphic-mb-cat--${props.id}`}>
      <h3 className="morphic-mb-cat-heading">
        <button
          type="button"
          className="morphic-mb-cat-toggle"
          aria-expanded={props.open}
          aria-controls={contentId}
          aria-labelledby={titleId}
          aria-describedby={summaryId}
          onClick={props.onToggle}
        >
          <span className="morphic-mb-cat-icon">{props.icon}</span>
          <span className="morphic-mb-cat-text">
            <span className="morphic-mb-cat-title" id={titleId}>
              {props.title}
            </span>
            <span className="morphic-mb-cat-summary" id={summaryId}>
              {props.summary}
            </span>
          </span>
          <span className="morphic-mb-chevron">
            <ChevronIcon />
          </span>
        </button>
      </h3>
      <div className="morphic-mb-cat-content" id={contentId} hidden={!props.open}>
        {props.children}
      </div>
    </section>
  );
}
