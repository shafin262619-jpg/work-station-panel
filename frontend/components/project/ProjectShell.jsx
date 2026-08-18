'use client';

import { useEffect, useState } from 'react';
import ProjectTabs from './ProjectTabs';

export default function ProjectShell({ projectId, activeTab, children }) {
  const [name, setName] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((project) => {
        if (!cancelled && project) setName(project.name);
      })
      .catch(() => {
        /* keep the fallback title on fetch failure */
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <section className="page">
      <header className="project-shell__header">
        <h1 className="project-shell__title">{name || `Project #${projectId}`}</h1>
      </header>
      <ProjectTabs projectId={projectId} activeTab={activeTab} />
      <div className="project-shell__content">{children}</div>
    </section>
  );
}
