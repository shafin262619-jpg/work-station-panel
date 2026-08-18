import ProjectShell from '@/components/project/ProjectShell';

export default async function ProjectCodingPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="coding">
      <div className="card">
        <p className="page__empty">
          Coding placeholder — coding workflow lands in a later chunk.
        </p>
      </div>
    </ProjectShell>
  );
}
