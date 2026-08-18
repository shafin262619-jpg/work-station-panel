// Formats an ISO timestamp as a deterministic, UTC-based "YYYY-MM-DD HH:MM"
// string so cards render a stable, testable "last updated" value.
export function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
