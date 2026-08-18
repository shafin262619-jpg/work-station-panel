'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatTimestamp } from '@/components/projects/time';

const TAB_SHORTCUTS = [
  { href: 'plan', label: 'Plan', description: '4-section planning workflow' },
  { href: 'coding', label: 'Coding', description: 'Coding workflow & checklist' },
  { href: 'support', label: 'Support Claude', description: 'Prompt ↔ brief log' },
  { href: 'checker', label: 'Checker Claude', description: 'Issue checklist & review' },
];

export default function OverviewTab({ projectId }) {
  const [project, setProject] = useState(null);
  const [githubLink, setGithubLink] = useState('');
  const [status, setStatus] = useState('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to load project');
        const projectData = await res.json();
        if (!cancelled) {
          setProject(projectData);
          setGithubLink(projectData.github_link || '');
          setStatus('idle');
        }
      } catch {
        if (!cancelled) setStatus('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleSaveLink() {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_link: githubLink.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setProject(updated);
      setGithubLink(updated.github_link || '');
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  if (loading) return <p className="page__empty">Loading project…</p>;
  if (!project) {
    return (
      <p className="page__empty" role="alert">
        Could not load this project.
      </p>
    );
  }

  const phase = project.current_phase || 'Plan';

  return (
    <div className="overview">
      <div className="card overview__details">
        <dl className="overview__list">
          <div className="overview__row">
            <dt>Name</dt>
            <dd>{project.name}</dd>
          </div>
          <div className="overview__row">
            <dt>Created</dt>
            <dd>{formatTimestamp(project.created_at)}</dd>
          </div>
          <div className="overview__row">
            <dt>Current phase</dt>
            <dd>
              <span className={`badge badge--${phase.toLowerCase()}`}>{phase}</span>
            </dd>
          </div>
        </dl>

        <div className="overview__link">
          <label htmlFor="github-link">GitHub link</label>
          <div className="overview__link-row">
            <input
              id="github-link"
              type="text"
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
              placeholder="https://github.com/org/repo"
            />
            <button type="button" className="btn" onClick={handleSaveLink}>
              Save link
            </button>
          </div>
          {status === 'saved' && <p className="note-area__status">Link saved</p>}
          {status === 'error' && (
            <p className="note-area__error" role="alert">
              Failed to save link.
            </p>
          )}
        </div>
      </div>

      <h2 className="projects-section__title">Tabs</h2>
      <ul className="overview__shortcuts">
        {TAB_SHORTCUTS.map((tab) => (
          <li key={tab.href}>
            <Link
              className="card overview__shortcut"
              href={`/project/${projectId}/${tab.href}`}
            >
              <span className="overview__shortcut-label">{tab.label}</span>
              <span className="overview__shortcut-desc">{tab.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
