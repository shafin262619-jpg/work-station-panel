import ProjectShell from '@/components/project/ProjectShell';
import OverviewTab from '@/components/project/OverviewTab';

export default async function ProjectOverviewPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="overview">
      <OverviewTab projectId={id} />
    </ProjectShell>
  );
}
