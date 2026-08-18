import ProjectTabs from './ProjectTabs';

export default function ProjectShell({ projectId, activeTab, children }) {
  return (
    <section className="page">
      <header className="project-shell__header">
        <h1 className="project-shell__title">Project #{projectId}</h1>
      </header>
      <ProjectTabs projectId={projectId} activeTab={activeTab} />
      <div className="project-shell__content">{children}</div>
    </section>
  );
}
