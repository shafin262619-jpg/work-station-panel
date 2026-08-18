import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import HomePage from '../app/page';
import { sortProjects } from '../components/projects/ProjectsHome';
import { formatTimestamp } from '../components/projects/time';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeProject(overrides = {}) {
  return {
    id: 1,
    name: 'Alpha',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
    current_phase: 'Plan',
    github_link: null,
    pinned: 0,
    ...overrides,
  };
}

function setupFetch(projects) {
  const fetchMock = jest.fn((url, options = {}) => {
    if (options.method === 'PUT') {
      const id = Number(url.split('/').pop());
      const project = projects.find((p) => p.id === id);
      const body = JSON.parse(options.body);
      const updated = { ...project, pinned: body.pinned };
      return Promise.resolve({ ok: true, json: async () => updated });
    }
    if (options.method === 'POST') {
      const created = makeProject({ id: 99, name: 'Untitled Project' });
      return Promise.resolve({ ok: true, json: async () => created });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: projects }) });
  });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('Route / — Projects home', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the Projects heading and the New Project button', async () => {
    setupFetch([makeProject()]);
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New Project' })).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/projects'));
  });

  it('shows an empty-state placeholder when there are no projects', async () => {
    setupFetch([]);
    render(<HomePage />);
    expect(await screen.findByText(/No projects yet/i)).toBeInTheDocument();
  });

  it('renders cards with name, phase badge, updated time and project link', async () => {
    setupFetch([
      makeProject({
        name: 'Alpha',
        current_phase: 'Coding',
        updated_at: '2026-08-10T03:30:00.000Z',
      }),
    ]);
    render(<HomePage />);
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Coding')).toBeInTheDocument();
    expect(screen.getByText('Updated 2026-08-10 03:30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveAttribute('href', '/project/1');
  });

  it('creates a new project and redirects to /project/[id]', async () => {
    const fetchMock = setupFetch([makeProject()]);
    render(<HomePage />);
    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: '+ New Project' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/project/99'));
    const postCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'POST');
    expect(postCall).toBeTruthy();
    expect(postCall[0]).toBe('/api/projects');
    expect(JSON.parse(postCall[1].body).name).toBe('Untitled Project');
  });

  it('toggles pin/unpin and moves the project into the Pinned section', async () => {
    setupFetch([
      makeProject({ id: 1, name: 'Alpha' }),
      makeProject({ id: 2, name: 'Beta' }),
    ]);
    render(<HomePage />);
    await screen.findByText('Alpha');

    const recentSection = screen.getByLabelText('Recently active projects');
    expect(within(recentSection).getByText('Alpha')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pin Alpha' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Pinned projects')).toBeInTheDocument()
    );
    const putCall = global.fetch.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
    expect(putCall).toBeTruthy();
    expect(putCall[0]).toBe('/api/projects/1');
    expect(JSON.parse(putCall[1].body).pinned).toBe(true);

    const pinnedSection = screen.getByLabelText('Pinned projects');
    expect(within(pinnedSection).getByText('Alpha')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Recently active projects')).queryByText('Alpha')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unpin Alpha' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pin Alpha' })).toBeInTheDocument()
    );
  });

  it('sorts pinned first, then remaining projects by recency', async () => {
    setupFetch([
      makeProject({ id: 3, name: 'Gamma', updated_at: '2026-08-12T00:00:00.000Z', pinned: 1 }),
      makeProject({ id: 1, name: 'Alpha', updated_at: '2026-08-10T00:00:00.000Z' }),
      makeProject({ id: 2, name: 'Beta', updated_at: '2026-08-11T00:00:00.000Z' }),
    ]);
    render(<HomePage />);
    await screen.findByText('Gamma');

    const names = Array.from(document.querySelectorAll('.project-card__name')).map(
      (el) => el.textContent
    );
    expect(names).toEqual(['Gamma', 'Beta', 'Alpha']);
  });
});

describe('sortProjects', () => {
  it('groups pinned first and sorts each group by updated_at desc', () => {
    const projects = [
      { id: 1, name: 'A', updated_at: '2026-08-10T00:00:00.000Z', pinned: 0 },
      { id: 2, name: 'B', updated_at: '2026-08-12T00:00:00.000Z', pinned: 1 },
      { id: 3, name: 'C', updated_at: '2026-08-11T00:00:00.000Z', pinned: 0 },
      { id: 4, name: 'D', updated_at: '2026-08-13T00:00:00.000Z', pinned: 1 },
    ];
    const { pinned, rest } = sortProjects(projects);
    expect(pinned.map((p) => p.id)).toEqual([4, 2]);
    expect(rest.map((p) => p.id)).toEqual([3, 1]);
  });

  it('falls back to created_at when updated_at is missing', () => {
    const projects = [
      { id: 1, name: 'A', created_at: '2026-08-10T00:00:00.000Z', updated_at: null, pinned: 0 },
      { id: 2, name: 'B', created_at: '2026-08-12T00:00:00.000Z', updated_at: null, pinned: 0 },
    ];
    const { rest } = sortProjects(projects);
    expect(rest.map((p) => p.id)).toEqual([2, 1]);
  });
});

describe('formatTimestamp', () => {
  it('formats an ISO timestamp deterministically', () => {
    expect(formatTimestamp('2026-08-10T03:30:00.000Z')).toBe('2026-08-10 03:30');
  });

  it('handles missing or invalid input', () => {
    expect(formatTimestamp(null)).toBe('—');
    expect(formatTimestamp('nonsense')).toBe('—');
  });
});
