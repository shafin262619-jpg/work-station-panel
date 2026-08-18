import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProjectOverviewPage from '../app/project/[id]/page';
import ProjectPlanPage from '../app/project/[id]/plan/page';
import ProjectCodingPage from '../app/project/[id]/coding/page';
import ProjectSupportPage from '../app/project/[id]/support/page';
import ProjectCheckerPage from '../app/project/[id]/checker/page';

const TAB_LABELS = ['Overview', 'Plan', 'Coding', 'Support Claude', 'Checker Claude'];

function makeProject(overrides = {}) {
  return {
    id: 42,
    name: 'Alpha',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
    current_phase: 'Plan',
    github_link: 'https://github.com/org/alpha',
    pinned: 0,
    ...overrides,
  };
}

function setupFetch(project = makeProject()) {
  const fetchMock = jest.fn((url, options = {}) => {
    const u = String(url);
    if (u.startsWith('/api/projects/')) {
      if (options.method === 'PUT') {
        const body = JSON.parse(options.body);
        return Promise.resolve({ ok: true, json: async () => ({ ...project, ...body }) });
      }
      return Promise.resolve({ ok: true, json: async () => project });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
  });
  global.fetch = fetchMock;
  return fetchMock;
}

async function renderPage(PageComponent, id = '42') {
  const element = await PageComponent({ params: Promise.resolve({ id }) });
  render(element);
}

describe('Route /project/[id] — Project shell', () => {
  beforeEach(() => {
    setupFetch();
  });

  it('renders the project name in the shell title', async () => {
    await renderPage(ProjectOverviewPage, '7');
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
  });

  it('renders all 5 tabs as links on the overview route', async () => {
    await renderPage(ProjectOverviewPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    for (const label of TAB_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('overview tab is active on /project/[id]', async () => {
    await renderPage(ProjectOverviewPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Plan' })).not.toHaveAttribute('aria-current');
  });

  it('tab links point to the correct routes', async () => {
    await renderPage(ProjectOverviewPage, '99');
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/project/99');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/project/99/plan');
    expect(screen.getByRole('link', { name: 'Coding' })).toHaveAttribute('href', '/project/99/coding');
    expect(screen.getByRole('link', { name: 'Support Claude' })).toHaveAttribute('href', '/project/99/support');
    expect(screen.getByRole('link', { name: 'Checker Claude' })).toHaveAttribute('href', '/project/99/checker');
  });
});

describe('Overview tab', () => {
  it('shows name, created date and current phase badge', async () => {
    setupFetch(makeProject({ current_phase: 'Coding' }));
    await renderPage(ProjectOverviewPage);
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByText('2026-08-01 00:00')).toBeInTheDocument();
    expect(document.querySelector('.badge--coding')).toHaveTextContent('Coding');
  });

  it('loads the saved github link into the input', async () => {
    setupFetch(makeProject({ github_link: 'https://github.com/org/alpha' }));
    await renderPage(ProjectOverviewPage);
    const input = await screen.findByLabelText('GitHub link');
    expect(input).toHaveValue('https://github.com/org/alpha');
  });

  it('saves an edited github link via PUT', async () => {
    const fetchMock = setupFetch(makeProject({ github_link: 'https://github.com/org/alpha' }));
    await renderPage(ProjectOverviewPage);
    const input = await screen.findByLabelText('GitHub link');
    fireEvent.change(input, { target: { value: 'https://github.com/org/beta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall[0]).toBe('/api/projects/42');
      expect(JSON.parse(putCall[1].body).github_link).toBe('https://github.com/org/beta');
    });
    expect(await screen.findByText('Link saved')).toBeInTheDocument();
  });

  it('renders shortcut cards linking to the 4 tab routes', async () => {
    await renderPage(ProjectOverviewPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: /4-section planning workflow/ })).toHaveAttribute(
      'href',
      '/project/42/plan'
    );
    expect(screen.getByRole('link', { name: /Coding workflow/ })).toHaveAttribute(
      'href',
      '/project/42/coding'
    );
    expect(screen.getByRole('link', { name: /Prompt ↔ brief log/ })).toHaveAttribute(
      'href',
      '/project/42/support'
    );
    expect(screen.getByRole('link', { name: /Issue checklist/ })).toHaveAttribute(
      'href',
      '/project/42/checker'
    );
  });
});

describe('Route /project/[id] tab sub-routes', () => {
  beforeEach(() => {
    setupFetch();
  });

  it('Plan route renders the shell, activates the Plan tab and shows a note area', async () => {
    await renderPage(ProjectPlanPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Plan note')).toBeInTheDocument();
  });

  it('Coding route activates the Coding tab', async () => {
    await renderPage(ProjectCodingPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: 'Coding' })).toHaveAttribute('aria-current', 'page');
  });

  it('Support Claude route activates the Support tab', async () => {
    await renderPage(ProjectSupportPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: 'Support Claude' })).toHaveAttribute('aria-current', 'page');
  });

  it('Checker Claude route activates the Checker tab', async () => {
    await renderPage(ProjectCheckerPage);
    await screen.findByRole('heading', { name: 'Alpha' });
    expect(screen.getByRole('link', { name: 'Checker Claude' })).toHaveAttribute('aria-current', 'page');
  });
});
