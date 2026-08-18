// Sorts accounts so 'available' always comes first, then 'limit_reached'.
// Within each group, order by label for a stable list. Used by both the
// /accounts page and the reusable mini-widget (single source of truth).
export function sortAccounts(accounts) {
  return [...accounts].sort((a, b) => {
    const sa = a.status === 'available' ? 0 : 1;
    const sb = b.status === 'available' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return (a.label || '').localeCompare(b.label || '');
  });
}
