'use client';

import { useEffect, useState } from 'react';
import { sortAccounts } from './accountUtils';

// Reusable, compact account-status widget. Fetches its own data and lists
// available accounts first. Wired into the Coding / Support Claude tabs in
// group D; `onSelect` is optional for picking an account there.
export default function AccountMiniWidget({ title = 'AI Accounts', onSelect }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/accounts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setAccounts(Array.isArray(data && data.data) ? data.data : []);
        }
      })
      .catch(() => {
        /* keep the empty list on fetch failure */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = sortAccounts(accounts);

  return (
    <section className="mini-widget" aria-label={title}>
      <h3 className="mini-widget__title">{title}</h3>
      {loading ? (
        <p className="mini-widget__empty">Loading accounts…</p>
      ) : sorted.length === 0 ? (
        <p className="mini-widget__empty">No accounts yet.</p>
      ) : (
        <ul className="mini-widget__list">
          {sorted.map((account) => {
            const content = (
              <>
                <span
                  className={`status-dot status-dot--${account.status}`}
                  aria-hidden="true"
                />
                <span className="mini-widget__label">{account.label}</span>
                <span className="mini-widget__type">{account.type}</span>
              </>
            );
            return (
              <li
                key={account.id}
                className={`mini-widget__row mini-widget__row--${account.status}`}
              >
                {onSelect ? (
                  <button
                    type="button"
                    className="mini-widget__btn"
                    onClick={() => onSelect(account)}
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
