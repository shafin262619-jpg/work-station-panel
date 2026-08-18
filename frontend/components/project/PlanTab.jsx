'use client';

import { useEffect, useState } from 'react';
import { formatTimestamp } from '@/components/projects/time';

// The four Plan sub-sections. Each maps to one plan_data field that carries
// its own updated_at timestamp (chunk C1), so the UI can show per-section
// "last saved" markers. The Master Data Collector Log additionally holds the
// tool link, which shares the log's timestamp.
const SECTIONS = [
  {
    field: 'basic_plan',
    timestampField: 'basic_plan_updated_at',
    title: 'Basic Plan',
    description: 'Initial idea notes for the project',
  },
  {
    field: 'data_collector_log',
    timestampField: 'data_collector_log_updated_at',
    title: 'Master Data Collector Log',
    description: 'What the Master Data Collector was told & which data was collected',
    toolLink: true,
  },
  {
    field: 'final_plan',
    timestampField: 'final_plan_updated_at',
    title: 'Final Master Plan',
    description: 'Paste the final plan for reference',
  },
  {
    field: 'prompt_guide_file',
    timestampField: 'prompt_guide_file_updated_at',
    title: 'Monkey Prompt & Guide File',
    description: 'Final prompt list & guide to hand to Monkey',
  },
];

function PlanSection({ projectId, section, value, toolLinkValue, timestamp, onSaved }) {
  const [draft, setDraft] = useState(value ?? '');
  const [linkDraft, setLinkDraft] = useState(toolLinkValue ?? '');
  const [saving, setSaving] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    setDraft(value ?? '');
    setLinkDraft(toolLinkValue ?? '');
  }, [value, toolLinkValue]);

  async function patch(field, payloadValue) {
    const res = await fetch(`/api/projects/${projectId}/plan/${field}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: payloadValue }),
    });
    if (!res.ok) throw new Error('Failed to save');
    return res.json();
  }

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    try {
      const row = await patch(section.field, draft);
      onSaved(row);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLink() {
    setSavingLink(true);
    setStatus('idle');
    try {
      const row = await patch('data_collector_tool_link', linkDraft.trim());
      onSaved(row);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSavingLink(false);
    }
  }

  const showLink = section.toolLink === true;

  return (
    <div className="card plan-section">
      <div className="plan-section__header">
        <div>
          <h2 className="plan-section__title">{section.title}</h2>
          <p className="plan-section__desc">{section.description}</p>
        </div>
        <div className="plan-section__meta">
          <p className="plan-section__timestamp" data-testid={`timestamp-${section.field}`}>
            {timestamp ? `Saved ${formatTimestamp(timestamp)}` : 'Not saved yet'}
          </p>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={saving}
            data-testid={`save-${section.field}`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <textarea
        className="note-area__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`${section.title}…`}
        rows={8}
        aria-label={section.title}
      />

      {showLink && (
        <div className="plan-section__link">
          <label htmlFor={`tool-link-${section.field}`}>Tool link</label>
          <div className="plan-section__link-row">
            <input
              id={`tool-link-${section.field}`}
              type="text"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              placeholder="https://docs.google.com/…"
            />
            <button
              type="button"
              className="btn"
              onClick={handleSaveLink}
              disabled={savingLink}
              data-testid={`save-${section.field}-link`}
            >
              {savingLink ? 'Saving…' : 'Save link'}
            </button>
          </div>
        </div>
      )}

      {status === 'saved' && <p className="note-area__status">Saved</p>}
      {status === 'error' && (
        <p className="note-area__error" role="alert">
          Failed to save {section.title}.
        </p>
      )}
    </div>
  );
}

export default function PlanTab({ projectId }) {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      try {
        const res = await fetch(`/api/projects/${projectId}/plan`);
        if (res.status === 404) {
          if (!cancelled) {
            setPlan({});
            setStatus('idle');
          }
          return;
        }
        if (!res.ok) throw new Error('Failed to load plan');
        const data = await res.json();
        if (!cancelled) {
          setPlan(data);
          setStatus('idle');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (status === 'loading') return <p className="page__empty">Loading plan…</p>;
  if (status === 'error') {
    return (
      <p className="page__empty" role="alert">
        Could not load the plan data.
      </p>
    );
  }

  const row = plan || {};

  return (
    <div className="plan-tab">
      {SECTIONS.map((section) => (
        <PlanSection
          key={section.field}
          projectId={projectId}
          section={section}
          value={row[section.field]}
          toolLinkValue={row.data_collector_tool_link}
          timestamp={row[section.timestampField]}
          onSaved={setPlan}
        />
      ))}
    </div>
  );
}
