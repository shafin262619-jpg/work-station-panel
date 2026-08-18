import ProjectShell from '@/components/project/ProjectShell';
import NoteArea from '@/components/project/NoteArea';

export default async function ProjectCheckerPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="checker">
      <NoteArea projectId={id} tab="checker" label="Checker Claude note" />
    </ProjectShell>
  );
}
