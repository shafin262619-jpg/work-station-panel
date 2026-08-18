'use client';

import { useEffect, useState } from 'react';
import AccountMiniWidget from '@/components/accounts/AccountMiniWidget';
import NoteArea from './NoteArea';

// Normalizes whatever is stored in coding_data.todo_list into a checklist of
// { id, text, done } items so the UI can render/toggle/delete robustly even
// when the stored list was written as plain strings.
function normalizeTodos(list) {
  if (!Array.isArray(list)) return [];
  let next = 1;
  return list.map((item) => {
    if (item && typeof item === 'object' && typeof item.text === 'string') {
      const id = Number.isFinite(item.id) ? item.id : next;
      next = Math.max(next, id + 1);
      return { id, text: item.text, done: Boolean(item.done) };
    }
    const id = next;
    next += 1;
    return { id, text: String(item), done: false };
  });
}

function nextTodoId(items) {
  return items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

export default function CodingTab({ projectId }) {
  const [project, setProject] = useState(null);
  const [coding, setCoding] = useState({ active_monkey_account_id: null, todo_list: [] });
  const [accounts, setAccounts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [accountError, setAccountError] = useState('');
  const [todoError, setTodoError] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingTodo, setSavingTodo] = useState(false);
  const [todoDraft, setTodoDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      try {
        const [projectRes, codingRes, accountsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/coding`),
          fetch('/api/accounts'),
        ]);
        if (!projectRes.ok) throw new Error('Failed to load project');
        const projectData = await projectRes.json();
        const codingData = codingRes.ok ? await codingRes.json() : {};
        const accountsData = accountsRes.ok ? (await accountsRes.json()).data : [];
        if (cancelled) return;
        setProject(projectData);
        setCoding({
          active_monkey_account_id: codingData.active_monkey_account_id ?? null,
          todo_list: normalizeTodos(codingData.todo_list),
        });
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        setStatus('idle');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const activeAccount =
    accounts.find((a) => a.id === coding.active_monkey_account_id) || null;

  async function saveCoding(payload) {
    const res = await fetch(`/api/projects/${projectId}/coding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save coding data');
    const row = await res.json();
    return {
      active_monkey_account_id: row.active_monkey_account_id ?? null,
      todo_list: normalizeTodos(row.todo_list),
    };
  }

  async function handleSelectAccount(account) {
    setSavingAccount(true);
    setAccountError('');
    try {
      const next = await saveCoding({ active_monkey_account_id: account.id });
      setCoding(next);
      // Mark the account as used in this project (B1: updates
      // last_used_project / last_used_at).
      if (project && project.name) {
        const markRes = await fetch(`/api/accounts/${account.id}/mark-used`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_used_project: project.name }),
        });
        if (!markRes.ok) throw new Error('Failed to mark account as used');
      }
    } catch {
      setAccountError('Failed to select account.');
    } finally {
      setSavingAccount(false);
    }
  }

  async function persistTodos(nextTodos) {
    const row = await saveCoding({ todo_list: nextTodos });
    setCoding(row);
  }

  async function handleAddTodo() {
    const text = todoDraft.trim();
    if (!text) return;
    setSavingTodo(true);
    setTodoError('');
    try {
      const next = [
        ...coding.todo_list,
        { id: nextTodoId(coding.todo_list), text, done: false },
      ];
      await persistTodos(next);
      setTodoDraft('');
    } catch {
      setTodoError('Failed to save todo.');
    } finally {
      setSavingTodo(false);
    }
  }

  async function handleToggleTodo(id) {
    setTodoError('');
    try {
      const next = coding.todo_list.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      );
      await persistTodos(next);
    } catch {
      setTodoError('Failed to update todo.');
    }
  }

  async function handleDeleteTodo(id) {
    setTodoError('');
    try {
      const next = coding.todo_list.filter((todo) => todo.id !== id);
      await persistTodos(next);
    } catch {
      setTodoError('Failed to delete todo.');
    }
  }

  if (status === 'loading') return <p className="page__empty">Loading coding tab…</p>;
  if (status === 'error') {
    return (
      <p className="page__empty" role="alert">
        Could not load the coding tab.
      </p>
    );
  }

  const githubLink = project && project.github_link ? project.github_link : '';

  return (
    <div className="coding-tab">
      <div className="card coding-repo">
        <h2 className="coding-tab__title">GitHub Repo</h2>
        {githubLink ? (
          <p className="coding-repo__link">
            <a href={githubLink} target="_blank" rel="noreferrer">
              {githubLink}
            </a>
          </p>
        ) : (
          <p className="coding-repo__hint">
            No GitHub link yet — set it once in the Overview tab.
          </p>
        )}
      </div>

      <div className="card coding-account">
        <h2 className="coding-tab__title">Active Monkey Account</h2>
        <p className="coding-account__current" data-testid="active-account">
          Current:{' '}
          {activeAccount ? (
            <strong>{activeAccount.label}</strong>
          ) : (
            'None selected yet'
          )}
        </p>
        <AccountMiniWidget
          title="Select Monkey Account"
          filterType="monkey"
          activeId={coding.active_monkey_account_id}
          onSelect={handleSelectAccount}
        />
        {savingAccount && <p className="note-area__status">Saving…</p>}
        {accountError && (
          <p className="note-area__error" role="alert">
            {accountError}
          </p>
        )}
      </div>

      <div className="card coding-todos">
        <h2 className="coding-tab__title">Todo Checklist</h2>
        <div className="coding-todos__add">
          <input
            aria-label="New todo"
            type="text"
            value={todoDraft}
            onChange={(e) => setTodoDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTodo();
            }}
            placeholder="Add a coding step…"
          />
          <button
            type="button"
            className="btn"
            onClick={handleAddTodo}
            disabled={savingTodo || !todoDraft.trim()}
          >
            Add
          </button>
        </div>

        {coding.todo_list.length === 0 ? (
          <p className="coding-todos__empty">No todos yet.</p>
        ) : (
          <ul className="coding-todos__list">
            {coding.todo_list.map((todo) => (
              <li
                key={todo.id}
                className={`coding-todo coding-todo--${todo.done ? 'done' : 'open'}`}
              >
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => handleToggleTodo(todo.id)}
                  aria-label={`Mark "${todo.text}" ${todo.done ? 'open' : 'done'}`}
                />
                <span className="coding-todo__text">{todo.text}</span>
                <button
                  type="button"
                  className="row-btn row-btn--danger"
                  onClick={() => handleDeleteTodo(todo.id)}
                  aria-label={`Delete "${todo.text}"`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        {todoError && (
          <p className="note-area__error" role="alert">
            {todoError}
          </p>
        )}
      </div>

      <NoteArea projectId={projectId} tab="coding" label="Coding note" />
    </div>
  );
}
