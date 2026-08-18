import ProjectShell from '@/components/project/ProjectShell';

export default async function ProjectPlanPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="plan">
      <div className="card">
        <p className="page__empty">
          Plan placeholder — planning workflow lands in a later chunk.
        </p>
      </div>
    </ProjectShell>
  );
}
