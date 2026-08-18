import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SupportTab, {
  buildHandoverSummary,
  copyTextToClipboard,
} from '../components/project/SupportTab';

const PROJECT = {
  id: 42,
  name: 'Alpha',
  created_at: '2026-08-01T00:00:00.000Z',
  current_phase: 'Support',
  github_link: '',
  pinned: 0,
};

const CLAUDE_ACCOUNTS = [
  { id: 1, type: 'claude', label: 'Claude 1', status: 'available' },
  { id: 2, type: 'claude', label: 'Claude 2', status: 'limit_reached' },
];

const MONKEY_ACCOUNT = { id: 9, type: 'monkey', label: 'Monkey 1', status: 'available' };

const LOGS = [
  {
    id: 10,
    project_id: 42,
    prompt: 'First prompt',
    brief: 'First brief',
    timestamp: '2026-08-18T05:00:00.000Z',
  },
  {
    id: 11,
    project_id: 42,
    prompt: 'Second prompt',
    brief: 'Second brief',
    timestamp: '2026-08-18T06:00:00.000Z',
  },
];

const PLAN = {
  project_id: 42,
  prompt_guide_file: 'Guide file content for Monkey',
  basic_plan: 'bp',
};

function setupFetch({
  project = PROJECT,
  support = { active_claude_account_id: null },
  logs = LOGS,
  plan = PLAN,
  accountError = false,
} = {}) {
  const state = {
    support,
    logs,
    markedUsed: [],
    logEntries: logs,
    plan,
  };
  const fetchMock = jest.fn((url, options = {}) => {
    const u = String(url);
    const method = options.method || 'GET';
    if (method === 'GET' && u === '/api/projects/42') {
      return Promise.resolve({ ok: true, json: async () => project });
    }
    if (method === 'GET' && u === '/api/projects/42/support') {
      return Promise.resolve({ ok: true, json: async () => state.support });
    }
    if (method === 'GET' && u === '/api/accounts') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [...CLAUDE_ACCOUNTS, MONKEY_ACCOUNT] }),
      });
    }
    if (method === 'GET' && u === '/api/projects/42/support-logs?order=asc') {
      return Promise.resolve({ ok: true, json: async () => ({ data: state.logs }) });
    }
    if (method === 'GET' && u === '/api/projects/42/plan') {
      return Promise.resolve({ ok: true, json: async () => state.plan });
    }
    if (method === 'PUT' && u === '/api/projects/42/support') {
      state.support = { ...state.support, ...JSON.parse(options.body) };
      return Promise.resolve({ ok: true, json: async () => state.support });
    }
    if (method === 'POST' && /\/api\/accounts\/\d+\/mark-used$/.test(u)) {
      if (accountError) return Promise.resolve({ ok: false });
      state.markedUsed.push(JSON.parse(options.body));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    if (method === 'POST' && u === '/api/projects/42/support-logs') {
      const body = JSON.parse(options.body);
      const entry = {
        id: 100 + state.logEntries.length,
        project_id: 42,
        prompt: body.prompt,
        brief: body.brief,
        timestamp: '2026-08-18T09:00:00.000Z',
      };
      state.logEntries = [...state.logEntries, entry];
      return Promise.resolve({ ok: true, json: async () => entry });
    }
    if (method === 'GET' && u.startsWith('/api/notes?category=')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
  });
  global.fetch = fetchMock;
  return { fetchMock, state };
}

function mockClipboard() {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

describe('buildHandoverSummary', () => {
  it('concatenates every log entry with the prompt_guide_file', () => {
    const text = buildHandoverSummary(LOGS, 'Guide file content for Monkey');
    expect(text).toContain('First prompt');
    expect(text).toContain('First brief');
    expect(text).toContain('Second prompt');
    expect(text).toContain('Second brief');
    expect(text).toContain('Guide file content for Monkey');
    expect(text).toContain('[Entry 1]');
    expect(text).toContain('[Entry 2]');
  });

  it('handles an empty log and missing guide file', () => {
    const text = buildHandoverSummary([], null);
    expect(text).toContain('(no support log entries yet)');
    expect(text).toContain('(none)');
  });
});

describe('SupportTab — prompt ↔ brief log', () => {
  it('renders every history entry with prompt, brief and timestamp', async () => {
    setupFetch();
    render(<SupportTab projectId={42} />);
    expect(await screen.findByText('[First prompt]')).toBeInTheDocument();
    expect(screen.getByText('[First brief]')).toBeInTheDocument();
    expect(screen.getByText('[Second prompt]')).toBeInTheDocument();
    expect(screen.getByText('[Second brief]')).toBeInTheDocument();
    expect(screen.getByText('2026-08-18 05:00')).toBeInTheDocument();
    expect(screen.getByText('2026-08-18 06:00')).toBeInTheDocument();
  });

  it('shows the empty state when there are no log entries', async () => {
    setupFetch({ logs: [] });
    render(<SupportTab projectId={42} />);
    expect(await screen.findByText('No log entries yet.')).toBeInTheDocument();
  });

  it('adds a new entry via POST /support-logs and renders it', async () => {
    const { fetchMock } = setupFetch();
    render(<SupportTab projectId={42} />);

    const promptInput = await screen.findByLabelText('Prompt given to Monkey');
    fireEvent.change(promptInput, { target: { value: 'Third prompt' } });
    const briefInput = screen.getByLabelText('Monkey brief / response');
    fireEvent.change(briefInput, { target: { value: 'Third brief' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Entry' }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          opts && opts.method === 'POST' && String(url) === '/api/projects/42/support-logs'
      );
      expect(postCall).toBeTruthy();
      expect(JSON.parse(postCall[1].body)).toEqual({
        prompt: 'Third prompt',
        brief: 'Third brief',
      });
    });
    expect(await screen.findByText('[Third prompt]')).toBeInTheDocument();
    expect(screen.getByText('[Third brief]')).toBeInTheDocument();
  });
});

describe('SupportTab — active Claude account', () => {
  it('lists only claude-type accounts in the widget', async () => {
    setupFetch();
    render(<SupportTab projectId={42} />);
    expect(await screen.findByRole('button', { name: /Claude 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Claude 2/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Monkey 1/i })).not.toBeInTheDocument();
  });

  it('shows "None selected yet" before any account is chosen', async () => {
    setupFetch();
    render(<SupportTab projectId={42} />);
    expect(await screen.findByTestId('active-claude-account')).toHaveTextContent(
      'None selected yet'
    );
  });

  it('shows the saved account as the current one', async () => {
    setupFetch({ support: { active_claude_account_id: 2 } });
    render(<SupportTab projectId={42} />);
    expect(await screen.findByTestId('active-claude-account')).toHaveTextContent(
      'Claude 2'
    );
  });

  it('saves the selection via PUT /support and calls mark-used with the project name', async () => {
    const { fetchMock, state } = setupFetch();
    render(<SupportTab projectId={42} />);

    fireEvent.click(await screen.findByRole('button', { name: /Claude 1/i }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([, opts]) => opts && opts.method === 'PUT'
      );
      expect(putCall).toBeTruthy();
      expect(putCall[0]).toBe('/api/projects/42/support');
      expect(JSON.parse(putCall[1].body)).toEqual({ active_claude_account_id: 1 });
    });
    await waitFor(() => {
      expect(state.markedUsed).toEqual([{ last_used_project: 'Alpha' }]);
    });
    expect(await screen.findByTestId('active-claude-account')).toHaveTextContent(
      'Claude 1'
    );
  });
});

describe('SupportTab — copy summary button', () => {
  it('copies the full log plus the prompt_guide_file to the clipboard', async () => {
    setupFetch();
    const writeText = mockClipboard();
    render(<SupportTab projectId={42} />);

    fireEvent.click(await screen.findByTestId('copy-summary'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('First prompt');
    expect(copied).toContain('First brief');
    expect(copied).toContain('Second prompt');
    expect(copied).toContain('Second brief');
    expect(copied).toContain('Guide file content for Monkey');
    expect(await screen.findByTestId('copy-status')).toHaveTextContent(
      'Copied to clipboard'
    );
  });

  it('still includes the guide file when the log is empty', async () => {
    setupFetch({ logs: [] });
    const writeText = mockClipboard();
    render(<SupportTab projectId={42} />);

    fireEvent.click(await screen.findByTestId('copy-summary'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0][0]).toContain('Guide file content for Monkey');
  });
});

describe('copyTextToClipboard', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = mockClipboard();
    await copyTextToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
  });
});
