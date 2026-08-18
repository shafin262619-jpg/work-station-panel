import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CodingTab from '../components/project/CodingTab';

const PROJECT = {
  id: 42,
  name: 'Alpha',
  created_at: '2026-08-01T00:00:00.000Z',
  current_phase: 'Plan',
  github_link: 'https://github.com/org/alpha',
  pinned: 0,
};

const MONKEY_ACCOUNTS = [
  { id: 1, type: 'monkey', label: 'Monkey 1', status: 'available' },
  { id: 2, type: 'monkey', label: 'Monkey 2', status: 'limit_reached' },
];

const CLAUDE_ACCOUNT = { id: 3, type: 'claude', label: 'Claude 1', status: 'available' };

function setupFetch({ project = PROJECT, coding = {} } = {}) {
  const state = { coding, markedUsed: [] };
  const fetchMock = jest.fn((url, options = {}) => {
    const u = String(url);
    const method = options.method || 'GET';
    if (method === 'GET' && u === '/api/projects/42') {
      return Promise.resolve({ ok: true, json: async () => project });
    }
    if (method === 'GET' && u === '/api/projects/42/coding') {
      return Promise.resolve({ ok: true, json: async () => state.coding });
    }
    if (method === 'GET' && u === '/api/accounts') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [...MONKEY_ACCOUNTS, CLAUDE_ACCOUNT] }),
      });
    }
    if (method === 'PUT' && u === '/api/projects/42/coding') {
      state.coding = { ...state.coding, ...JSON.parse(options.body) };
      return Promise.resolve({ ok: true, json: async () => state.coding });
    }
    if (method === 'POST' && /\/api\/accounts\/\d+\/mark-used$/.test(u)) {
      state.markedUsed.push(JSON.parse(options.body));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
  });
  global.fetch = fetchMock;
  return { fetchMock, state };
}

describe('CodingTab — GitHub repo link', () => {
  it('shows the project github link as a clickable link', async () => {
    setupFetch();
    render(<CodingTab projectId={42} />);
    const link = await screen.findByRole('link', { name: 'https://github.com/org/alpha' });
    expect(link).toHaveAttribute('href', 'https://github.com/org/alpha');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a hint when no github link is set', async () => {
    setupFetch({ project: { ...PROJECT, github_link: '' } });
    render(<CodingTab projectId={42} />);
    expect(await screen.findByText(/No GitHub link yet/i)).toBeInTheDocument();
  });
});

describe('CodingTab — active monkey account', () => {
  it('lists only monkey-type accounts in the widget', async () => {
    setupFetch();
    render(<CodingTab projectId={42} />);
    expect(await screen.findByRole('button', { name: /Monkey 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Monkey 2/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Claude 1/i })).not.toBeInTheDocument();
  });

  it('shows "None selected yet" before any account is chosen', async () => {
    setupFetch();
    render(<CodingTab projectId={42} />);
    expect(await screen.findByTestId('active-account')).toHaveTextContent('None selected yet');
  });

  it('shows the saved account as the current one', async () => {
    setupFetch({ coding: { active_monkey_account_id: 2 } });
    render(<CodingTab projectId={42} />);
    expect(await screen.findByTestId('active-account')).toHaveTextContent('Monkey 2');
  });

  it('saves the selection via PUT /coding and calls mark-used with the project name', async () => {
    const { fetchMock } = setupFetch();
    render(<CodingTab projectId={42} />);

    fireEvent.click(await screen.findByRole('button', { name: /Monkey 1/i }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall[0]).toBe('/api/projects/42/coding');
      expect(JSON.parse(putCall[1].body)).toEqual({ active_monkey_account_id: 1 });
    });
    await waitFor(() => {
      const markCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'POST');
      expect(markCall).toBeTruthy();
      expect(markCall[0]).toBe('/api/accounts/1/mark-used');
      expect(JSON.parse(markCall[1].body)).toEqual({ last_used_project: 'Alpha' });
    });
    expect(await screen.findByTestId('active-account')).toHaveTextContent('Monkey 1');
  });
});

describe('CodingTab — todo checklist', () => {
  it('adds a todo via PUT /coding', async () => {
    const { fetchMock } = setupFetch();
    render(<CodingTab projectId={42} />);

    const input = await screen.findByLabelText('New todo');
    fireEvent.change(input, { target: { value: 'write the handler' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(JSON.parse(putCall[1].body).todo_list).toEqual([
        { id: 1, text: 'write the handler', done: false },
      ]);
    });
    expect(await screen.findByText('write the handler')).toBeInTheDocument();
  });

  it('loads existing todos and toggles one done via PUT', async () => {
    const { fetchMock } = setupFetch({
      coding: { todo_list: [{ id: 1, text: 'step one', done: false }] },
    });
    render(<CodingTab projectId={42} />);

    const checkbox = await screen.findByLabelText('Mark "step one" done');
    fireEvent.click(checkbox);

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
      expect(JSON.parse(putCall[1].body).todo_list).toEqual([
        { id: 1, text: 'step one', done: true },
      ]);
    });
    expect(screen.getByLabelText('Mark "step one" open')).toBeInTheDocument();
  });

  it('deletes a todo via PUT /coding', async () => {
    const { fetchMock } = setupFetch({
      coding: { todo_list: [{ id: 1, text: 'temp', done: false }] },
    });
    render(<CodingTab projectId={42} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete "temp"' }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
      expect(JSON.parse(putCall[1].body).todo_list).toEqual([]);
    });
    expect(await screen.findByText('No todos yet.')).toBeInTheDocument();
  });
});

describe('CodingTab — notes area', () => {
  it('renders the coding note area', async () => {
    setupFetch();
    render(<CodingTab projectId={42} />);
    expect(await screen.findByLabelText('Coding note')).toBeInTheDocument();
  });
});
