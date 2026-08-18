import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import PlanTab from '../components/project/PlanTab';

function makePlan(overrides = {}) {
  return {
    id: 1,
    project_id: 42,
    basic_plan: 'bp text',
    basic_plan_updated_at: '2026-08-18T05:00:00.000Z',
    data_collector_log: 'log text',
    data_collector_log_updated_at: '2026-08-18T06:00:00.000Z',
    data_collector_tool_link: 'https://tool.example',
    final_plan: 'fp text',
    final_plan_updated_at: '2026-08-18T07:00:00.000Z',
    prompt_guide_file: 'pg text',
    prompt_guide_file_updated_at: '2026-08-18T08:00:00.000Z',
    created_at: '2026-08-18T04:00:00.000Z',
    updated_at: '2026-08-18T08:00:00.000Z',
    ...overrides,
  };
}

function setupFetch(plan = makePlan(), { notFound = false } = {}) {
  const fetchMock = jest.fn((url, options = {}) => {
    const u = String(url);
    if (options.method === 'PATCH') {
      const field = u.split('/').pop();
      const value = JSON.parse(options.body).value;
      const updated = { ...plan };
      if (field === 'data_collector_tool_link') {
        updated[field] = value;
        updated.data_collector_log_updated_at = '2026-08-18T09:00:00.000Z';
      } else {
        updated[field] = value;
        updated[`${field}_updated_at`] = '2026-08-18T09:00:00.000Z';
      }
      return Promise.resolve({ ok: true, json: async () => updated });
    }
    if (u.match(/\/plan$/)) {
      if (notFound) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => plan });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
  });
  global.fetch = fetchMock;
  return fetchMock;
}

const SECTION_TITLES = [
  'Basic Plan',
  'Master Data Collector Log',
  'Final Master Plan',
  'Monkey Prompt & Guide File',
];

describe('PlanTab — 4 sub-sections load/save', () => {
  it('renders all 4 sub-section textareas with saved values', async () => {
    setupFetch();
    render(<PlanTab projectId={42} />);

    expect(await screen.findByLabelText('Basic Plan')).toHaveValue('bp text');
    expect(screen.getByLabelText('Master Data Collector Log')).toHaveValue('log text');
    expect(screen.getByLabelText('Final Master Plan')).toHaveValue('fp text');
    expect(screen.getByLabelText('Monkey Prompt & Guide File')).toHaveValue('pg text');
    expect(screen.getByLabelText('Tool link')).toHaveValue('https://tool.example');
  });

  it('shows the per-field saved timestamp for every section', async () => {
    setupFetch();
    render(<PlanTab projectId={42} />);

    expect(await screen.findByText('Saved 2026-08-18 05:00')).toBeInTheDocument();
    expect(screen.getByText('Saved 2026-08-18 06:00')).toBeInTheDocument();
    expect(screen.getByText('Saved 2026-08-18 07:00')).toBeInTheDocument();
    expect(screen.getByText('Saved 2026-08-18 08:00')).toBeInTheDocument();
  });

  it('shows "Not saved yet" when a field has no timestamp', async () => {
    setupFetch(makePlan({ basic_plan_updated_at: null, basic_plan: null }));
    render(<PlanTab projectId={42} />);

    const section = await screen.findByTestId('timestamp-basic_plan');
    expect(section).toHaveTextContent('Not saved yet');
  });

  it('starts with empty sections when no plan row exists (404)', async () => {
    setupFetch(makePlan(), { notFound: true });
    render(<PlanTab projectId={42} />);

    expect(await screen.findByLabelText('Basic Plan')).toHaveValue('');
    expect(screen.getByLabelText('Master Data Collector Log')).toHaveValue('');
    expect(screen.getByLabelText('Final Master Plan')).toHaveValue('');
    expect(screen.getByLabelText('Monkey Prompt & Guide File')).toHaveValue('');
  });

  it('saves one field via PATCH and updates only that section timestamp', async () => {
    const fetchMock = setupFetch();
    render(<PlanTab projectId={42} />);

    const textarea = await screen.findByLabelText('Basic Plan');
    fireEvent.change(textarea, { target: { value: 'updated bp' } });
    fireEvent.click(screen.getByTestId('save-basic_plan'));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(patchCall[0]).toBe('/api/projects/42/plan/basic_plan');
      expect(JSON.parse(patchCall[1].body)).toEqual({ value: 'updated bp' });
    });

    const section = screen.getByTestId('timestamp-basic_plan');
    expect(await within(section).findByText('Saved 2026-08-18 09:00')).toBeInTheDocument();
  });

  it('saves the tool link via PATCH (shares the log timestamp)', async () => {
    const fetchMock = setupFetch();
    render(<PlanTab projectId={42} />);

    const input = await screen.findByLabelText('Tool link');
    fireEvent.change(input, { target: { value: '  https://tool.new  ' } });
    fireEvent.click(screen.getByTestId('save-data_collector_log-link'));

    await waitFor(() => {
      const linkCall = fetchMock.mock.calls.find(
        ([, opts]) => opts && opts.method === 'PATCH' && String(opts.body).includes('tool.new')
      );
      expect(linkCall).toBeTruthy();
      expect(linkCall[0]).toBe('/api/projects/42/plan/data_collector_tool_link');
      expect(JSON.parse(linkCall[1].body)).toEqual({ value: 'https://tool.new' });
    });

    const section = screen.getByTestId('timestamp-data_collector_log');
    expect(await within(section).findByText('Saved 2026-08-18 09:00')).toBeInTheDocument();
  });

  it('renders each section title', async () => {
    setupFetch();
    render(<PlanTab projectId={42} />);
    await screen.findByLabelText('Basic Plan');
    for (const title of SECTION_TITLES) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });
});
