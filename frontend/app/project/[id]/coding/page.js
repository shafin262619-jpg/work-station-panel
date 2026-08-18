import ProjectShell from '@/components/project/ProjectShell';
import NoteArea from '@/components/project/NoteArea';

export default async function ProjectCodingPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="coding">
      <NoteArea projectId={id} tab="coding" label="Coding note" />
    </ProjectShell>
  );
}
