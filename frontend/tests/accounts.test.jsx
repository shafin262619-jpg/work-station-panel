import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import AccountsPage from '../app/accounts/page';
import AccountsList from '../components/accounts/AccountsList';
import AccountMiniWidget from '../components/accounts/AccountMiniWidget';
import { sortAccounts } from '../components/accounts/accountUtils';

function makeAccount(overrides = {}) {
  return {
    id: 1,
    type: 'monkey',
    label: 'Monkey 1',
    login_link: null,
    status: 'available',
    note: null,
    last_used_project: null,
    last_used_at: null,
    ...overrides,
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('sortAccounts', () => {
  it('puts available accounts before limit_reached, then sorts by label', () => {
    const sorted = sortAccounts([
      makeAccount({ id: 1, label: 'Zulu', status: 'available' }),
      makeAccount({ id: 2, label: 'Alpha', status: 'limit_reached' }),
      makeAccount({ id: 3, label: 'Bravo', status: 'available' }),
    ]);
    expect(sorted.map((a) => a.label)).toEqual(['Bravo', 'Zulu', 'Alpha']);
  });

  it('does not mutate the input array', () => {
    const input = [
      makeAccount({ id: 1, status: 'limit_reached' }),
      makeAccount({ id: 2, status: 'available' }),
    ];
    const sorted = sortAccounts(input);
    expect(sorted).not.toBe(input);
    expect(input[0].status).toBe('limit_reached');
  });
});

describe('Route /accounts — AccountsList', () => {
  it('renders heading, Reset All and Add Account, and lists fetched accounts', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({
          data: [
            makeAccount({ id: 1, label: 'Monkey A', status: 'available' }),
            makeAccount({ id: 2, type: 'claude', label: 'Claude B', status: 'limit_reached' }),
          ],
        })
      )
    );
    render(<AccountsPage />);
    expect(screen.getByRole('heading', { name: 'AI Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Account' })).toBeInTheDocument();
    expect(await screen.findByText('Monkey A')).toBeInTheDocument();
    expect(screen.getByText('Claude B')).toBeInTheDocument();
  });

  it('renders accounts in available-first order', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({
          data: [
            makeAccount({ id: 1, label: 'Claude 1', status: 'limit_reached' }),
            makeAccount({ id: 2, label: 'Monkey 1', status: 'available' }),
          ],
        })
      )
    );
    render(<AccountsList />);
    await screen.findByText('Monkey 1');
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Monkey 1')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Claude 1')).toBeInTheDocument();
  });

  it('shows an empty-state placeholder when there are no accounts', async () => {
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse({ data: [] })));
    render(<AccountsList />);
    expect(await screen.findByText(/No accounts yet/i)).toBeInTheDocument();
  });

  it('toggles status via the manual toggle button', async () => {
    let accounts = [makeAccount({ id: 1, label: 'Alpha', status: 'available' })];
    global.fetch = jest.fn((url, options = {}) => {
      if (options.method === 'PUT' && url === '/api/accounts/1') {
        accounts = accounts.map((a) =>
          a.id === 1 ? { ...a, status: 'limit_reached' } : a
        );
        return Promise.resolve(jsonResponse(accounts[0]));
      }
      return Promise.resolve(jsonResponse({ data: accounts }));
    });
    render(<AccountsList />);

    const toggle = await screen.findByRole('button', { name: 'Mark Alpha as limit reached' });
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Mark Alpha as available' })
      ).toBeInTheDocument()
    );
    expect(screen.getByText('Limit Reached')).toBeInTheDocument();
  });

  it('resets every account to available via the Reset All button', async () => {
    let accounts = [
      makeAccount({ id: 1, label: 'A', status: 'limit_reached' }),
      makeAccount({ id: 2, label: 'B', status: 'limit_reached' }),
    ];
    global.fetch = jest.fn((url, options = {}) => {
      if (options.method === 'POST' && url === '/api/accounts/reset-all') {
        accounts = accounts.map((a) => ({ ...a, status: 'available' }));
        return Promise.resolve(jsonResponse({ data: accounts }));
      }
      return Promise.resolve(jsonResponse({ data: accounts }));
    });
    render(<AccountsList />);
    await screen.findByText('A');

    fireEvent.click(screen.getByRole('button', { name: 'Reset All' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mark A as limit reached' })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Mark B as limit reached' })).toBeInTheDocument();
  });

  it('adds a new account through the form', async () => {
    const accounts = [];
    global.fetch = jest.fn((url, options = {}) => {
      if (options.method === 'POST' && url === '/api/accounts') {
        const created = makeAccount({ id: 1, ...JSON.parse(options.body) });
        accounts.push(created);
        return Promise.resolve(jsonResponse(created, 201));
      }
      return Promise.resolve(jsonResponse({ data: accounts }));
    });
    render(<AccountsList />);
    await screen.findByText(/No accounts yet/i);

    fireEvent.click(screen.getByRole('button', { name: '+ Add Account' }));
    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Monkey 2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(screen.getByText('Monkey 2')).toBeInTheDocument());
    const postCall = global.fetch.mock.calls.find(
      ([, opts]) => opts && opts.method === 'POST'
    );
    expect(postCall[0]).toBe('/api/accounts');
    expect(JSON.parse(postCall[1].body).label).toBe('Monkey 2');
  });

  it('edits an existing account through the form', async () => {
    let accounts = [makeAccount({ id: 5, label: 'Old Label' })];
    global.fetch = jest.fn((url, options = {}) => {
      if (options.method === 'PUT' && url === '/api/accounts/5') {
        accounts = accounts.map((a) => ({ ...a, ...JSON.parse(options.body) }));
        return Promise.resolve(jsonResponse(accounts[0]));
      }
      return Promise.resolve(jsonResponse({ data: accounts }));
    });
    render(<AccountsList />);
    await screen.findByText('Old Label');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const labelInput = await screen.findByLabelText('Label');
    fireEvent.change(labelInput, { target: { value: 'New Label' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('New Label')).toBeInTheDocument());
    expect(screen.queryByText('Old Label')).not.toBeInTheDocument();
    const putCall = global.fetch.mock.calls.find(
      ([, opts]) => opts && opts.method === 'PUT'
    );
    expect(putCall[0]).toBe('/api/accounts/5');
    expect(JSON.parse(putCall[1].body).label).toBe('New Label');
  });

  it('deletes an account', async () => {
    let accounts = [makeAccount({ id: 9, label: 'Doomed' })];
    global.fetch = jest.fn((url, options = {}) => {
      if (options.method === 'DELETE' && url === '/api/accounts/9') {
        accounts = accounts.filter((a) => a.id !== 9);
        return Promise.resolve(jsonResponse(null, 204));
      }
      return Promise.resolve(jsonResponse({ data: accounts }));
    });
    render(<AccountsList />);
    await screen.findByText('Doomed');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.getByText(/No accounts yet/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('Doomed')).not.toBeInTheDocument();
  });
});

describe('AccountMiniWidget', () => {
  it('renders the compact account list with available accounts first', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({
          data: [
            makeAccount({ id: 1, type: 'claude', label: 'Claude 1', status: 'limit_reached' }),
            makeAccount({ id: 2, label: 'Monkey 1', status: 'available' }),
          ],
        })
      )
    );
    render(<AccountMiniWidget title="My Accounts" />);
    expect(await screen.findByText('Monkey 1')).toBeInTheDocument();
    expect(screen.getByText('My Accounts')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Monkey 1')).toBeInTheDocument();
    expect(within(items[1]).getByText('Claude 1')).toBeInTheDocument();
  });

  it('renders an empty state when there are no accounts', async () => {
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse({ data: [] })));
    render(<AccountMiniWidget />);
    expect(await screen.findByText(/No accounts yet/i)).toBeInTheDocument();
  });

  it('fires onSelect when an account row is clicked', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({
          data: [makeAccount({ id: 2, label: 'Monkey 1', status: 'available' })],
        })
      )
    );
    const onSelect = jest.fn();
    render(<AccountMiniWidget onSelect={onSelect} />);
    const row = await screen.findByRole('button', { name: /Monkey 1/i });
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, label: 'Monkey 1' })
    );
  });

  it('filters the list to a single account type via filterType', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({
          data: [
            makeAccount({ id: 1, type: 'claude', label: 'Claude 1', status: 'available' }),
            makeAccount({ id: 2, label: 'Monkey 1', status: 'available' }),
          ],
        })
      )
    );
    render(<AccountMiniWidget filterType="monkey" />);
    expect(await screen.findByText('Monkey 1')).toBeInTheDocument();
    expect(screen.queryByText('Claude 1')).not.toBeInTheDocument();
  });

  it('marks the active account row via activeId', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({
          data: [
            makeAccount({ id: 1, label: 'Monkey 1', status: 'available' }),
            makeAccount({ id: 2, label: 'Monkey 2', status: 'available' }),
          ],
        })
      )
    );
    render(<AccountMiniWidget activeId={1} onSelect={() => {}} />);
    const active = await screen.findByRole('button', { name: /Monkey 1/i });
    const inactive = screen.getByRole('button', { name: /Monkey 2/i });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(inactive).toHaveAttribute('aria-pressed', 'false');
  });
});
