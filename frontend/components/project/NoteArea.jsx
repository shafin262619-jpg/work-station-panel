'use client';

import { useEffect, useState } from 'react';

// Notes are global (category-scoped), so a project's per-tab note is
// namespaced with a "project:<id>:<tab>" category. The note content is a
// placeholder in this chunk; real per-tab features land in groups C/D/E.
export function categoryFor(projectId, tab) {
  return `project:${projectId}:${tab}`;
}

export default function NoteArea({ projectId, tab, label }) {
  const [value, setValue] = useState('');
  const [noteId, setNoteId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      try {
        const category = categoryFor(projectId, tab);
        const res = await fetch(`/api/notes?category=${encodeURIComponent(category)}`);
        if (!res.ok) throw new Error('Failed to load note');
        const data = await res.json();
        if (cancelled) return;
        const notes = Array.isArray(data.data) ? data.data : [];
        const note = notes[0];
        if (note) {
          setValue(note.content || '');
          setNoteId(note.id);
        } else {
          setValue('');
          setNoteId(null);
        }
        setStatus('idle');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, tab]);

  async function handleSave() {
    setSaving(true);
    try {
      if (noteId) {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value }),
        });
        if (!res.ok) throw new Error('Failed to save note');
        await res.json();
      } else {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: label,
            content: value,
            category: categoryFor(projectId, tab),
          }),
        });
        if (!res.ok) throw new Error('Failed to save note');
        const created = await res.json();
        setNoteId(created.id);
      }
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card note-area">
      <div className="note-area__header">
        <h2 className="note-area__title">{label}</h2>
        <button type="button" className="btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <textarea
        className="note-area__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write a note…"
        rows={10}
        aria-label={label}
      />
      {status === 'saved' && <p className="note-area__status">Saved</p>}
      {status === 'error' && (
        <p className="note-area__error" role="alert">
          Failed to save or load note.
        </p>
      )}
    </div>
  );
}
