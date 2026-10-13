// apps/web/src/lib/when.ts
/**
 * Times as the card surfaces print them: en-GB, 24-hour, in the viewer's zone. `tz` is for tests
 * and the harness; the app passes nothing and gets the browser's zone.
 */
function parts(iso: string, tz: string | undefined, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', ...opts });
  return Object.fromEntries(f.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}
const dayKey = (iso: string, tz?: string): string => {
  const p = parts(iso, tz, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
};
export function clockHM(iso: string, tz?: string): string {
  const p = parts(iso, tz, { hour: '2-digit', minute: '2-digit' });
  return `${p.hour}:${p.minute}`;
}
export function clockHMS(iso: string, tz?: string): string {
  const p = parts(iso, tz, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${p.hour}:${p.minute}:${p.second}`;
}
export function dayMonth(iso: string, tz?: string): string {
  const p = parts(iso, tz, { day: 'numeric', month: 'short' });
  return `${p.day} ${p.month}`;
}
export function dayMonthLong(iso: string, tz?: string): string {
  const p = parts(iso, tz, { day: 'numeric', month: 'long' });
  return `${p.day} ${p.month}`;
}
export function weekdayDayMonth(iso: string, tz?: string): string {
  const p = parts(iso, tz, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${p.weekday} ${p.day} ${p.month}`;
}
/** "Today, 12:48" on the viewer's own day, else "Thu 8 Oct, 19:41". */
export function whenLabel(iso: string, now: Date, tz?: string): string {
  const hm = clockHM(iso, tz);
  return dayKey(iso, tz) === dayKey(now.toISOString(), tz) ? `Today, ${hm}` : `${weekdayDayMonth(iso, tz)}, ${hm}`;
}
/** "Thursday 8 October, 19:41". */
export function whenLabelLong(iso: string, tz?: string): string {
  const p = parts(iso, tz, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${p.weekday} ${p.day} ${p.month}, ${clockHM(iso, tz)}`;
}
