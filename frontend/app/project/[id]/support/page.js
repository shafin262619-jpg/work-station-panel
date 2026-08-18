import ProjectShell from '@/components/project/ProjectShell';
import NoteArea from '@/components/project/NoteArea';

export default async function ProjectSupportPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="support">
      <NoteArea projectId={id} tab="support" label="Support Claude note" />
    </ProjectShell>
  );
}
