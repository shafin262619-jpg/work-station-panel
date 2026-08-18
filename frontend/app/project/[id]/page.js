import ProjectShell from '@/components/project/ProjectShell';

export default async function ProjectOverviewPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="overview">
      <div className="card">
        <p className="page__empty">
          Overview placeholder — project summary lands in a later chunk.
        </p>
      </div>
    </ProjectShell>
  );
}
