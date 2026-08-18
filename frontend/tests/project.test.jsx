import { render, screen } from '@testing-library/react';
import ProjectOverviewPage from '../app/project/[id]/page';
import ProjectPlanPage from '../app/project/[id]/plan/page';
import ProjectCodingPage from '../app/project/[id]/coding/page';
import ProjectSupportPage from '../app/project/[id]/support/page';
import ProjectCheckerPage from '../app/project/[id]/checker/page';

const TAB_LABELS = ['Overview', 'Plan', 'Coding', 'Support Claude', 'Checker Claude'];

async function renderPage(PageComponent, id = '42') {
  const element = await PageComponent({ params: Promise.resolve({ id }) });
  render(element);
}

describe('Route /project/[id] — Project shell', () => {
  it('renders the project shell title', async () => {
    await renderPage(ProjectOverviewPage, '7');
    expect(screen.getByRole('heading', { name: 'Project #7' })).toBeInTheDocument();
  });

  it('renders all 5 tabs as links on the overview route', async () => {
    await renderPage(ProjectOverviewPage);
    for (const label of TAB_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('overview tab is active on /project/[id]', async () => {
    await renderPage(ProjectOverviewPage);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Plan' })).not.toHaveAttribute('aria-current');
  });

  it('tab links point to the correct routes', async () => {
    await renderPage(ProjectOverviewPage, '99');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/project/99');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/project/99/plan');
    expect(screen.getByRole('link', { name: 'Coding' })).toHaveAttribute('href', '/project/99/coding');
    expect(screen.getByRole('link', { name: 'Support Claude' })).toHaveAttribute('href', '/project/99/support');
    expect(screen.getByRole('link', { name: 'Checker Claude' })).toHaveAttribute('href', '/project/99/checker');
  });
});

describe('Route /project/[id] tab sub-routes', () => {
  it('Plan route renders the shell and activates the Plan tab', async () => {
    await renderPage(ProjectPlanPage);
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
  });

  it('Coding route activates the Coding tab', async () => {
    await renderPage(ProjectCodingPage);
    expect(screen.getByRole('link', { name: 'Coding' })).toHaveAttribute('aria-current', 'page');
  });

  it('Support Claude route activates the Support tab', async () => {
    await renderPage(ProjectSupportPage);
    expect(screen.getByRole('link', { name: 'Support Claude' })).toHaveAttribute('aria-current', 'page');
  });

  it('Checker Claude route activates the Checker tab', async () => {
    await renderPage(ProjectCheckerPage);
    expect(screen.getByRole('link', { name: 'Checker Claude' })).toHaveAttribute('aria-current', 'page');
  });
});
