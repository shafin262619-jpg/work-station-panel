'use client';

import Link from 'next/link';
import { formatTimestamp } from './time';

const PHASES = ['Plan', 'Coding', 'Support', 'Checker'];

function phaseClass(phase) {
  return PHASES.includes(phase) ? `badge badge--${phase.toLowerCase()}` : 'badge';
}

export default function ProjectCard({ project, onTogglePin }) {
  const { id, name, current_phase = 'Plan', updated_at, pinned } = project;
  return (
    <li className="project-card" data-testid={`project-${id}`}>
      <Link className="project-card__link" href={`/project/${id}`}>
        <span className="project-card__name">{name}</span>
        <span className="project-card__meta">
          <span className={phaseClass(current_phase)}>{current_phase}</span>
          <span className="project-card__updated">Updated {formatTimestamp(updated_at)}</span>
        </span>
      </Link>
      <button
        type="button"
        className={`pin-btn${pinned ? ' pin-btn--active' : ''}`}
        aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
        aria-pressed={pinned}
        onClick={() => onTogglePin(project)}
      >
        {pinned ? 'Unpin' : 'Pin'}
      </button>
    </li>
  );
}
