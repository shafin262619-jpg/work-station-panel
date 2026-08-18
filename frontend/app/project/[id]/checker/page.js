import ProjectShell from '@/components/project/ProjectShell';

export default async function ProjectCheckerPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="checker">
      <div className="card">
        <p className="page__empty">
          Checker Claude placeholder — review workflow lands in a later chunk.
        </p>
      </div>
    </ProjectShell>
  );
}
