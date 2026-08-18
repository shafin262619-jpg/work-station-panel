'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCard from './ProjectCard';

const NEW_PROJECT_NAME = 'Untitled Project';

// Sort pinned projects first, then the rest — each group by recency
// (updated_at, falling back to created_at). "pinned first, then recently active".
export function sortProjects(projects) {
  const byRecency = (a, b) => {
    const ta = a.updated_at || a.created_at || '';
    const tb = b.updated_at || b.created_at || '';
    return tb.localeCompare(ta);
  };
  const pinned = projects.filter((p) => p.pinned).sort(byRecency);
  const rest = projects.filter((p) => !p.pinned).sort(byRecency);
  return { pinned, rest };
}

export default function ProjectsHome() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setProjects(Array.isArray(data.data) ? data.data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load projects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: NEW_PROJECT_NAME }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch (e) {
      setError(e.message || 'Failed to create project');
      setCreating(false);
    }
  }

  async function handleTogglePin(project) {
    const next = !project.pinned;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const updated = await res.json();
      setProjects((prev) =>
        prev.map((p) =>
          p.id === updated.id
            ? { ...p, pinned: updated.pinned, updated_at: updated.updated_at }
            : p
        )
      );
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to update project');
    }
  }

  const { pinned, rest } = useMemo(() => sortProjects(projects), [projects]);

  return (
    <section className="page">
      <header className="projects-home__header">
        <h1 className="page__title">Projects</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? 'Creating…' : '+ New Project'}
        </button>
      </header>

      {error && (
        <p className="projects-home__error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="page__empty">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="card">
          <p className="page__empty">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="projects-section" aria-label="Pinned projects">
              <h2 className="projects-section__title">Pinned</h2>
              <ul className="projects-list">
                {pinned.map((project) => (
                  <ProjectCard key={project.id} project={project} onTogglePin={handleTogglePin} />
                ))}
              </ul>
            </section>
          )}

          <section className="projects-section" aria-label="Recently active projects">
            <h2 className="projects-section__title">Recently Active</h2>
            {rest.length === 0 ? (
              <p className="page__empty">No other projects.</p>
            ) : (
              <ul className="projects-list">
                {rest.map((project) => (
                  <ProjectCard key={project.id} project={project} onTogglePin={handleTogglePin} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
