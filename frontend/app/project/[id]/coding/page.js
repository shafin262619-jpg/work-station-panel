import ProjectShell from '@/components/project/ProjectShell';
import CodingTab from '@/components/project/CodingTab';

export default async function ProjectCodingPage({ params }) {
  const { id } = await params;
  return (
    <ProjectShell projectId={id} activeTab="coding">
      <CodingTab projectId={id} />
    </ProjectShell>
  );
}
