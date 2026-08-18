import ProjectShell from '@/components/project/ProjectShell';
import NoteArea from '@/components/project/NoteArea';

export default async function ProjectPlanPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="plan">
      <NoteArea projectId={id} tab="plan" label="Plan note" />
    </ProjectShell>
  );
}
