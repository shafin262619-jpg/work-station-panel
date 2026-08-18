'use client';

import { useEffect, useRef, useState } from 'react';
import AccountMiniWidget from '@/components/accounts/AccountMiniWidget';
import { formatTimestamp } from '@/components/projects/time';
import NoteArea from './NoteArea';

// Pure helper used by the "Copy Summary" button: combines every support-log
// entry with the Plan tab's prompt_guide_file into a single plain-text
// handover summary ready to paste into a new Claude chat. No AI call here —
// this is just deterministic concatenation (manual mode; group G will add the
// Gemini-based smart generation when AI Helping is ON).
export function buildHandoverSummary(logs, promptGuideFile) {
  const lines = [];
  lines.push('Work Station Panel — Support Claude Handover Summary');
  lines.push('');

  lines.push('--- Prompt <-> Brief Log ---');
  if (!Array.isArray(logs) || logs.length === 0) {
    lines.push('(no support log entries yet)');
  } else {
    logs.forEach((entry, index) => {
      lines.push(`[Entry ${index + 1}]`);
      lines.push(`Prompt: ${entry && entry.prompt ? entry.prompt : ''}`);
      lines.push(`Brief: ${entry && entry.brief ? entry.brief : '(no brief)'}`);
      lines.push(`Timestamp: ${entry && entry.timestamp ? entry.timestamp : '—'}`);
      lines.push('');
    });
  }

  lines.push('--- Monkey Prompt & Guide File ---');
  const guide =
    promptGuideFile && typeof promptGuideFile === 'string'
      ? promptGuideFile.trim()
      : '';
  lines.push(guide ? guide : '(none)');

  return lines.join('\n');
}

// Writes text to the clipboard, falling back to a hidden textarea + execCommand
// when the async Clipboard API is unavailable (e.g. older browsers / jsdom).
export function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) resolve();
      else reject(new Error('Clipboard write failed'));
    } catch (err) {
      reject(err);
    }
  });
}

export default function SupportTab({ projectId }) {
  const [project, setProject] = useState(null);
  const [support, setSupport] = useState({ active_claude_account_id: null });
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [promptGuideFile, setPromptGuideFile] = useState('');
  const [status, setStatus] = useState('loading');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [logError, setLogError] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle');
  const [promptDraft, setPromptDraft] = useState('');
  const [briefDraft, setBriefDraft] = useState('');
  const historyRef = useRef(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      try {
        const [projectRes, supportRes, accountsRes, logsRes, planRes] =
          await Promise.all([
            fetch(`/api/projects/${projectId}`),
            fetch(`/api/projects/${projectId}/support`),
            fetch('/api/accounts'),
            fetch(`/api/projects/${projectId}/support-logs?order=asc`),
            fetch(`/api/projects/${projectId}/plan`),
          ]);
        if (!projectRes.ok) throw new Error('Failed to load project');
        const projectData = await projectRes.json();
        const supportData = supportRes.ok ? await supportRes.json() : {};
        const accountsData = accountsRes.ok ? (await accountsRes.json()).data : [];
        const logsData = logsRes.ok ? (await logsRes.json()).data : [];
        const planData = planRes.ok ? await planRes.json() : {};
        if (cancelled) return;
        setProject(projectData);
        setSupport({
          active_claude_account_id: supportData.active_claude_account_id ?? null,
        });
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        setLogs(Array.isArray(logsData) ? logsData : []);
        setPromptGuideFile(planData.prompt_guide_file || '');
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

  // Oldest-first history, so keep the newest entry in view on load and after
  // every add.
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const activeAccount =
    accounts.find((account) => account.id === support.active_claude_account_id) ||
    null;

  async function handleSelectAccount(account) {
    setSavingAccount(true);
    setAccountError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/support`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_claude_account_id: account.id }),
      });
      if (!res.ok) throw new Error('Failed to save support data');
      const row = await res.json();
      setSupport({ active_claude_account_id: row.active_claude_account_id ?? null });
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

  async function handleAddLog() {
    const prompt = promptDraft.trim();
    if (!prompt) return;
    setSavingLog(true);
    setLogError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/support-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          brief: briefDraft.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save log entry');
      const entry = await res.json();
      setLogs((prev) => [...prev, entry]);
      setPromptDraft('');
      setBriefDraft('');
    } catch {
      setLogError('Failed to save log entry.');
    } finally {
      setSavingLog(false);
    }
  }

  async function handleCopySummary() {
    const text = buildHandoverSummary(logs, promptGuideFile);
    try {
      await copyTextToClipboard(text);
      setCopyStatus('copied');
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
    }
  }

  if (status === 'loading') {
    return <p className="page__empty">Loading support tab…</p>;
  }
  if (status === 'error') {
    return (
      <p className="page__empty" role="alert">
        Could not load the support tab.
      </p>
    );
  }

  return (
    <div className="support-tab">
      <div className="card support-account">
        <h2 className="support-tab__title">Active Claude Account</h2>
        <p className="support-account__current" data-testid="active-claude-account">
          Current:{' '}
          {activeAccount ? (
            <strong>{activeAccount.label}</strong>
          ) : (
            'None selected yet'
          )}
        </p>
        <AccountMiniWidget
          title="Select Claude Account"
          filterType="claude"
          activeId={support.active_claude_account_id}
          onSelect={handleSelectAccount}
        />
        {savingAccount && <p className="note-area__status">Saving…</p>}
        {accountError && (
          <p className="note-area__error" role="alert">
            {accountError}
          </p>
        )}
      </div>

      <div className="card support-log">
        <h2 className="support-tab__title">Prompt ↔ Brief Log</h2>
        <p className="support-log__desc">
          Every entry: [prompt given to Monkey] → [Monkey brief/response] →
          timestamp. The history scrolls; new entries are added below.
        </p>

        <div
          className="support-log__history"
          ref={historyRef}
          data-testid="support-log-history"
        >
          {logs.length === 0 ? (
            <p className="support-log__empty">No log entries yet.</p>
          ) : (
            <ol className="support-log__list">
              {logs.map((entry) => (
                <li key={entry.id} className="support-log-entry">
                  <div className="support-log-entry__prompt">
                    [{entry.prompt}]
                  </div>
                  <div className="support-log-entry__arrow">→</div>
                  <div className="support-log-entry__brief">
                    [{entry.brief || '(no brief)'}]
                  </div>
                  <div className="support-log-entry__time">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="support-log__form">
          <label htmlFor="support-prompt">Prompt given to Monkey</label>
          <textarea
            id="support-prompt"
            className="note-area__input"
            rows={4}
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            placeholder="What you told Monkey…"
            aria-label="Prompt given to Monkey"
          />
          <label htmlFor="support-brief">Monkey brief / response</label>
          <textarea
            id="support-brief"
            className="note-area__input"
            rows={4}
            value={briefDraft}
            onChange={(e) => setBriefDraft(e.target.value)}
            placeholder="Paste Monkey's brief/response text here…"
            aria-label="Monkey brief / response"
          />
          <div className="support-log__actions">
            <button
              type="button"
              className="btn"
              onClick={handleAddLog}
              disabled={savingLog || !promptDraft.trim()}
            >
              {savingLog ? 'Saving…' : 'Add Entry'}
            </button>
          </div>
          {logError && (
            <p className="note-area__error" role="alert">
              {logError}
            </p>
          )}
        </div>
      </div>

      <div className="card support-handover">
        <h2 className="support-tab__title">Handover Note</h2>
        <p className="support-handover__desc">
          Copies this tab's full support log plus the Plan tab's Monkey Prompt &
          Guide File as a plain-text summary — paste it into the new Claude
          chat. (Manual mode: no AI call, just concatenation.)
        </p>
        <div className="support-handover__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleCopySummary}
            data-testid="copy-summary"
          >
            Copy Summary
          </button>
          {copyStatus === 'copied' && (
            <p className="note-area__status" data-testid="copy-status">
              Copied to clipboard
            </p>
          )}
          {copyStatus === 'error' && (
            <p className="note-area__error" role="alert">
              Could not copy to clipboard.
            </p>
          )}
        </div>
      </div>

      <NoteArea projectId={projectId} tab="support" label="Support Claude note" />
    </div>
  );
}
