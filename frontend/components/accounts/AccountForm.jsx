'use client';

import { useState } from 'react';

const ACCOUNT_TYPES = ['monkey', 'claude'];
const ACCOUNT_STATUSES = ['available', 'limit_reached'];

// Add/edit form for an account. `initial` is empty for a new account or the
// existing row for editing; onSubmit receives the trimmed field values.
export default function AccountForm({ initial = {}, onSubmit, onCancel, submitting = false }) {
  const [type, setType] = useState(initial.type || 'monkey');
  const [label, setLabel] = useState(initial.label || '');
  const [loginLink, setLoginLink] = useState(initial.login_link || '');
  const [status, setStatus] = useState(initial.status || 'available');
  const [note, setNote] = useState(initial.note || '');
  const [error, setError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (!ACCOUNT_TYPES.includes(type)) {
      setError('Type must be monkey or claude');
      return;
    }
    if (!ACCOUNT_STATUSES.includes(status)) {
      setError('Status must be available or limit_reached');
      return;
    }
    setError(null);
    onSubmit({
      type,
      label: label.trim(),
      login_link: loginLink.trim() || null,
      status,
      note: note.trim() || null,
    });
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <div className="account-form__grid">
        <label className="account-form__field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="account-form__field">
          <span>Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Monkey 1"
          />
        </label>

        <label className="account-form__field account-form__field--wide">
          <span>Login link</span>
          <input
            value={loginLink}
            onChange={(e) => setLoginLink(e.target.value)}
            placeholder="https://…"
          />
        </label>

        <label className="account-form__field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="account-form__field account-form__field--wide">
          <span>Note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows="3"
          />
        </label>
      </div>

      {error && (
        <p className="account-form__error" role="alert">
          {error}
        </p>
      )}

      <div className="account-form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial.id ? 'Save changes' : 'Add account'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
