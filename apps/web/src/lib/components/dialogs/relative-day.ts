// apps/web/src/lib/components/dialogs/relative-day.ts
/** The calendar day of `d` in `timeZone`, as a UTC midnight timestamp. */
function dayIn(d: Date, timeZone: string): number {
  const [y, m, day] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-').map(Number);
  return Date.UTC(y!, m! - 1, day!);
}

/** "Today", "Yesterday", "3 days ago", "Last week", "2 weeks ago", "Last month", "3 months ago": calendar days in `timeZone`. */
export function relativeDay(iso: string | null, now: Date, timeZone: string): string {
  if (!iso) return '';
  const d = Math.round((dayIn(now, timeZone) - dayIn(new Date(iso), timeZone)) / 86_400_000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'Last week';
  if (d < 28) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 60) return 'Last month';
  return `${Math.floor(d / 30)} months ago`;
}
