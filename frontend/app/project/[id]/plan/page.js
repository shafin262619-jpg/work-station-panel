import ProjectShell from '@/components/project/ProjectShell';
import PlanTab from '@/components/project/PlanTab';

export default async function ProjectPlanPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="plan">
      <PlanTab projectId={id} />
    </ProjectShell>
  );
}
