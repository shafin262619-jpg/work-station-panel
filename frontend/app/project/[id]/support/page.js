import ProjectShell from '@/components/project/ProjectShell';
import SupportTab from '@/components/project/SupportTab';

export default async function ProjectSupportPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="support">
      <SupportTab projectId={id} />
    </ProjectShell>
  );
}
