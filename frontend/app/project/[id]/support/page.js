import ProjectShell from '@/components/project/ProjectShell';

export default async function ProjectSupportPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="support">
      <div className="card">
        <p className="page__empty">
          Support Claude placeholder — support workflow lands in a later chunk.
        </p>
      </div>
    </ProjectShell>
  );
}
