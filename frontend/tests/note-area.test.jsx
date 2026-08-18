import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NoteArea, { categoryFor } from '../components/project/NoteArea';

function setupFetch({ notes = [] } = {}) {
  const fetchMock = jest.fn((url, options = {}) => {
    const u = String(url);
    if (u === '/api/notes' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      return Promise.resolve({ ok: true, json: async () => ({ id: 1, ...body }) });
    }
    if (u.startsWith('/api/notes/') && options.method === 'PUT') {
      const id = u.split('/').pop();
      const body = JSON.parse(options.body);
      return Promise.resolve({ ok: true, json: async () => ({ id: Number(id), ...body }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: notes }) });
  });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('NoteArea', () => {
  it('loads an existing note into the textarea', async () => {
    setupFetch({
      notes: [{ id: 7, title: 'Plan note', content: 'saved plan text', category: 'project:5:plan' }],
    });
    render(<NoteArea projectId={5} tab="plan" label="Plan note" />);
    expect(await screen.findByDisplayValue('saved plan text')).toBeInTheDocument();
  });

  it('starts empty when no note exists', async () => {
    setupFetch({ notes: [] });
    render(<NoteArea projectId={5} tab="plan" label="Plan note" />);
    expect(await screen.findByLabelText('Plan note')).toHaveValue('');
  });

  it('creates a new note via POST on first save', async () => {
    const fetchMock = setupFetch({ notes: [] });
    render(<NoteArea projectId={5} tab="plan" label="Plan note" />);
    const textarea = await screen.findByLabelText('Plan note');
    fireEvent.change(textarea, { target: { value: 'new note text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'POST');
      expect(postCall).toBeTruthy();
      expect(postCall[0]).toBe('/api/notes');
      expect(JSON.parse(postCall[1].body)).toMatchObject({
        title: 'Plan note',
        content: 'new note text',
        category: 'project:5:plan',
      });
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('updates an existing note via PUT', async () => {
    const fetchMock = setupFetch({
      notes: [{ id: 7, title: 'Plan note', content: 'old', category: 'project:5:plan' }],
    });
    render(<NoteArea projectId={5} tab="plan" label="Plan note" />);
    const textarea = await screen.findByDisplayValue('old');
    fireEvent.change(textarea, { target: { value: 'updated text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, opts]) => opts && opts.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall[0]).toBe('/api/notes/7');
      expect(JSON.parse(putCall[1].body).content).toBe('updated text');
    });
  });
});

describe('categoryFor', () => {
  it('namespaces a per-project, per-tab category', () => {
    expect(categoryFor(5, 'plan')).toBe('project:5:plan');
    expect(categoryFor(12, 'checker')).toBe('project:12:checker');
  });
});
