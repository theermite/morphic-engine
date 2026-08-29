/**
 * Presentational primitives shared by <MorphicButton>'s sections.
 *
 * CDC ref : F-036. Brick : B-030a. License : AGPL-3.0-or-later.
 */

export function Chip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`morphic-mb-chip${props.active ? ' is-active' : ''}`}
      aria-pressed={props.active}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

export function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="morphic-mb-row">
      <span className="morphic-mb-row-label">{props.label}</span>
      <div className="morphic-mb-chips">{props.children}</div>
    </div>
  );
}

export function SectionTitle(props: { children: React.ReactNode }) {
  return <p className="morphic-mb-section">{props.children}</p>;
}
