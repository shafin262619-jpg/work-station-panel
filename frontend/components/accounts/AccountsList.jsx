'use client';

import { useCallback, useEffect, useState } from 'react';
import AccountForm from './AccountForm';
import { sortAccounts } from './accountUtils';
import { formatTimestamp } from '../projects/time';

export default function AccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setAccounts(sortAccounts(Array.isArray(data.data) ? data.data : []));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleStatus(account) {
    const next = account.status === 'available' ? 'limit_reached' : 'available';
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const updated = await res.json();
      setAccounts((prev) =>
        sortAccounts(prev.map((a) => (a.id === updated.id ? updated : a)))
      );
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to update account status');
    }
  }

  async function handleResetAll() {
    setBusy(true);
    try {
      const res = await fetch('/api/accounts/reset-all', { method: 'POST' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setAccounts(sortAccounts(Array.isArray(data.data) ? data.data : []));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to reset accounts');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(fields) {
    setBusy(true);
    try {
      const url = editing ? `/api/accounts/${editing.id}` : '/api/accounts';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const saved = await res.json();
      setAccounts((prev) => {
        const list = editing
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [...prev, saved];
        return sortAccounts(list);
      });
      setShowForm(false);
      setEditing(null);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to save account');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(account) {
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to delete account');
    } finally {
      setBusy(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(account) {
    setEditing(account);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <section className="page">
      <header className="accounts-header">
        <h1 className="page__title">AI Accounts</h1>
        <div className="accounts-header__actions">
          <button
            type="button"
            className="btn"
            onClick={handleResetAll}
            disabled={busy || loading}
          >
            {busy ? 'Working…' : 'Reset All'}
          </button>
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            + Add Account
          </button>
        </div>
      </header>

      {error && (
        <p className="accounts-error" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <div className="card account-form-card">
          <h2 className="account-form-card__title">
            {editing ? `Edit ${editing.label}` : 'Add Account'}
          </h2>
          <AccountForm
            key={editing ? editing.id : 'new'}
            initial={editing || {}}
            onSubmit={handleSave}
            onCancel={closeForm}
            submitting={busy}
          />
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="page__empty">Loading accounts…</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card">
          <p className="page__empty">
            No accounts yet. Add your first Monkey/Claude account.
          </p>
        </div>
      ) : (
        <div className="card accounts-table-wrap">
          <table className="accounts-table">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Label</th>
                <th scope="col">Login Link</th>
                <th scope="col">Status</th>
                <th scope="col">Last used on</th>
                <th scope="col">Last used at</th>
                <th scope="col">Note</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} data-testid={`account-row-${account.id}`}>
                  <td className="accounts-table__type">{account.type}</td>
                  <td className="accounts-table__label">{account.label}</td>
                  <td>
                    {account.login_link ? (
                      <a
                        className="accounts-table__link"
                        href={account.login_link}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="accounts-table__muted">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle status-toggle--${account.status}`}
                      aria-pressed={account.status === 'available'}
                      aria-label={`Mark ${account.label} as ${
                        account.status === 'available' ? 'limit reached' : 'available'
                      }`}
                      onClick={() => handleToggleStatus(account)}
                      disabled={busy}
                    >
                      <span
                        className={`status-dot status-dot--${account.status}`}
                        aria-hidden="true"
                      />
                      <span>{account.status === 'available' ? 'Available' : 'Limit Reached'}</span>
                    </button>
                  </td>
                  <td>{account.last_used_project || '—'}</td>
                  <td className="accounts-table__mono">
                    {formatTimestamp(account.last_used_at)}
                  </td>
                  <td className="accounts-table__note">{account.note || '—'}</td>
                  <td className="accounts-table__actions">
                    <button
                      type="button"
                      className="row-btn"
                      onClick={() => openEdit(account)}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="row-btn row-btn--danger"
                      onClick={() => handleDelete(account)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
